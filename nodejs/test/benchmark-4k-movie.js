#!/usr/bin/env node
'use strict';

/**
 * mshzip 4K 영화 파일 벤치마크
 *
 * 실제 4K 영화 파일(.mp4, .mkv, .ts, .m2ts)을 사용하여
 * 사전 누적(dictionary accumulation) 기반 압축 효과를 측정한다.
 *
 * 측정 항목:
 * - Pack/Unpack 속도 (MB/s)
 * - 압축률 (dedup + gzip 효과)
 * - 프레임별 사전 적중률 변화 (누적 효과 시각화)
 * - 구성 요소별 분석 (영상/오디오/메타데이터 패턴)
 * - 청크 크기별 비교 (64B ~ 4096B)
 * - 랜덤 데이터 대비 비교
 *
 * 사용법:
 *   node test/benchmark-4k-movie.js <영화파일경로> [옵션]
 *
 * 옵션:
 *   --max-size <MB>    최대 읽기 크기 (기본: 전체 파일)
 *   --chunk-test       청크 크기별 비교 테스트 실행
 *   --frame-analysis   프레임별 사전 누적 분석 실행
 *   --all              모든 테스트 실행
 *
 * 예시:
 *   node test/benchmark-4k-movie.js D:/Movies/sample-4k.mkv
 *   node test/benchmark-4k-movie.js D:/Movies/sample-4k.mp4 --max-size 500 --all
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Packer } = require('../lib/packer');
const { Unpacker } = require('../lib/unpacker');
const { pack, unpack } = require('../lib');
const { PackStream, UnpackStream } = require('../lib/stream');
const { pipeline } = require('stream/promises');
const { PassThrough } = require('stream');

// ─── 인자 파싱 ──────────────────────────────────────────────

const args = process.argv.slice(2);
const filePath = args.find(a => !a.startsWith('--'));
const maxSizeMB = (() => {
  const idx = args.indexOf('--max-size');
  return idx !== -1 && args[idx + 1] ? parseInt(args[idx + 1], 10) : 0;
})();
const doChunkTest = args.includes('--chunk-test') || args.includes('--all');
const doFrameAnalysis = args.includes('--frame-analysis') || args.includes('--all');

if (!filePath) {
  console.log('사용법: node test/benchmark-4k-movie.js <영화파일경로> [옵션]');
  console.log('');
  console.log('옵션:');
  console.log('  --max-size <MB>    최대 읽기 크기 (기본: 전체 파일)');
  console.log('  --chunk-test       청크 크기별 비교 테스트');
  console.log('  --frame-analysis   프레임별 사전 누적 분석');
  console.log('  --all              모든 테스트 실행');
  console.log('');
  console.log('예시:');
  console.log('  node test/benchmark-4k-movie.js D:/Movies/sample-4k.mkv');
  console.log('  node test/benchmark-4k-movie.js D:/Movies/sample-4k.mp4 --max-size 500 --all');
  process.exit(0);
}

// ─── 유틸리티 ───────────────────────────────────────────────

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

function formatSpeed(bytes, ms) {
  if (ms <= 0) return '∞';
  return ((bytes / 1024 / 1024) / (ms / 1000)).toFixed(1);
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function printSeparator(char = '─', len = 110) {
  console.log('  ' + char.repeat(len));
}

function printBoxHeader(title) {
  const inner = 108;
  const pad = inner - title.length;
  console.log('');
  console.log('╔' + '═'.repeat(inner + 2) + '╗');
  console.log('║  ' + title + ' '.repeat(Math.max(0, pad)) + '║');
  console.log('╚' + '═'.repeat(inner + 2) + '╝');
}

// ─── 파일 읽기 ──────────────────────────────────────────────

function loadMovieFile(fpath, maxMB) {
  if (!fs.existsSync(fpath)) {
    console.error(`파일을 찾을 수 없습니다: ${fpath}`);
    process.exit(1);
  }

  const stat = fs.statSync(fpath);
  const totalSize = stat.size;
  const readSize = maxMB > 0
    ? Math.min(maxMB * 1024 * 1024, totalSize)
    : totalSize;

  console.log('');
  console.log(`  파일: ${path.basename(fpath)}`);
  console.log(`  경로: ${fpath}`);
  console.log(`  전체 크기: ${formatSize(totalSize)}`);
  if (maxMB > 0 && readSize < totalSize) {
    console.log(`  읽기 크기: ${formatSize(readSize)} (--max-size ${maxMB}MB)`);
  }
  console.log(`  확장자: ${path.extname(fpath)}`);
  console.log('');

  // 파일을 Buffer로 읽기
  const fd = fs.openSync(fpath, 'r');
  const buf = Buffer.alloc(readSize);
  fs.readSync(fd, buf, 0, readSize, 0);
  fs.closeSync(fd);

  return { buf, totalSize, readSize };
}

// ─── 128B 청크 중복 분석 ────────────────────────────────────

function analyzeChunkDuplication(data, chunkSize) {
  const hashMap = new Map(); // hash → { count, firstPos }
  const totalChunks = Math.ceil(data.length / chunkSize);
  let duplicateChunks = 0;

  for (let i = 0; i < data.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, data.length);
    let chunk = data.slice(i, end);
    if (chunk.length < chunkSize) {
      const padded = Buffer.alloc(chunkSize, 0);
      chunk.copy(padded);
      chunk = padded;
    }

    const hash = crypto.createHash('sha256').update(chunk).digest('hex');
    const existing = hashMap.get(hash);
    if (existing) {
      existing.count++;
      duplicateChunks++;
    } else {
      hashMap.set(hash, { count: 1, firstPos: i });
    }
  }

  const uniqueChunks = hashMap.size;
  const dedupRate = totalChunks > 0
    ? ((1 - uniqueChunks / totalChunks) * 100).toFixed(2)
    : '0.00';

  // 가장 많이 반복된 청크 Top 10
  const topRepeated = [...hashMap.entries()]
    .filter(([, v]) => v.count > 1)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  return {
    totalChunks,
    uniqueChunks,
    duplicateChunks,
    dedupRate: parseFloat(dedupRate),
    topRepeated,
  };
}

// ─── 파트 1: 기본 압축 벤치마크 ─────────────────────────────

function runBasicBenchmark(data, label) {
  printBoxHeader(`파트 1: 기본 압축 벤치마크 — ${label}`);

  const chunkSize = 128;
  const origHash = sha256(data);

  console.log('');
  console.log(`  입력: ${formatSize(data.length)} | 청크: ${chunkSize}B | SHA-256: ${origHash.slice(0, 16)}...`);
  console.log('');

  // 1) 128B 청크 중복 분석 (사전 압축)
  console.log('  [1] 128B 청크 중복 분석 (사전 dedup 전)');
  printSeparator();
  const t0 = process.hrtime.bigint();
  const dupInfo = analyzeChunkDuplication(data, chunkSize);
  const analyzeMs = Number(process.hrtime.bigint() - t0) / 1e6;

  console.log(`  전체 청크 수:   ${dupInfo.totalChunks.toLocaleString()}`);
  console.log(`  고유 청크 수:   ${dupInfo.uniqueChunks.toLocaleString()}`);
  console.log(`  중복 청크 수:   ${dupInfo.duplicateChunks.toLocaleString()}`);
  console.log(`  중복 제거율:    ${dupInfo.dedupRate}%`);
  console.log(`  분석 시간:      ${analyzeMs.toFixed(1)}ms`);

  if (dupInfo.topRepeated.length > 0) {
    console.log('');
    console.log('  가장 많이 반복된 청크 (Top 10):');
    for (let i = 0; i < dupInfo.topRepeated.length; i++) {
      const [hash, info] = dupInfo.topRepeated[i];
      console.log(`    #${i + 1}: ${info.count}회 반복 (첫 위치: offset ${info.firstPos})`);
    }
  }

  // 2) Pack 벤치마크
  console.log('');
  console.log('  [2] Pack (압축) 벤치마크');
  printSeparator();

  const configs = [
    { codec: 'gzip', crc: false, label: 'gzip' },
    { codec: 'gzip', crc: true, label: 'gzip+CRC' },
    { codec: 'none', crc: false, label: 'none (dedup만)' },
  ];

  console.log(
    '  ' +
    '코덱'.padEnd(18) +
    '원본'.padStart(12) +
    '압축'.padStart(12) +
    '압축률'.padStart(10) +
    'Pack(ms)'.padStart(12) +
    'Unpack(ms)'.padStart(12) +
    'Pack속도'.padStart(12) +
    'Unpack속도'.padStart(12) +
    '무결성'.padStart(6)
  );
  printSeparator();

  const results = [];

  for (const cfg of configs) {
    const packStart = process.hrtime.bigint();
    const packed = pack(data, { chunkSize, codec: cfg.codec, crc: cfg.crc });
    const packEnd = process.hrtime.bigint();

    const unpackStart = process.hrtime.bigint();
    const restored = unpack(packed);
    const unpackEnd = process.hrtime.bigint();

    const packMs = Number(packEnd - packStart) / 1e6;
    const unpackMs = Number(unpackEnd - unpackStart) / 1e6;
    const ratio = ((1 - packed.length / data.length) * 100).toFixed(2);
    const ok = sha256(restored) === origHash && restored.length === data.length;
    const packSpeed = formatSpeed(data.length, packMs);
    const unpackSpeed = formatSpeed(data.length, unpackMs);

    console.log(
      '  ' +
      cfg.label.padEnd(18) +
      formatSize(data.length).padStart(12) +
      formatSize(packed.length).padStart(12) +
      `${ratio}%`.padStart(10) +
      `${packMs.toFixed(1)}`.padStart(12) +
      `${unpackMs.toFixed(1)}`.padStart(12) +
      `${packSpeed}MB/s`.padStart(12) +
      `${unpackSpeed}MB/s`.padStart(12) +
      (ok ? '   ✅' : '   ❌')
    );

    results.push({
      codec: cfg.label, packed: packed.length,
      ratio: parseFloat(ratio), packMs, unpackMs,
      packSpeed, unpackSpeed, ok,
    });
  }

  // 3) 랜덤 데이터 대비 비교
  console.log('');
  console.log('  [3] 랜덤 데이터 대비 비교');
  printSeparator();

  const randomSize = Math.min(data.length, 10 * 1024 * 1024); // 비교용 최대 10MB
  const randomData = crypto.randomBytes(randomSize);
  const movieSlice = data.slice(0, randomSize);

  const randomPacked = pack(randomData, { chunkSize: 128, codec: 'gzip' });
  const moviePacked = pack(movieSlice, { chunkSize: 128, codec: 'gzip' });

  const randomRatio = ((1 - randomPacked.length / randomSize) * 100).toFixed(2);
  const movieRatio = ((1 - moviePacked.length / randomSize) * 100).toFixed(2);

  console.log(`  비교 크기: ${formatSize(randomSize)}`);
  console.log(`  랜덤 데이터: ${formatSize(randomPacked.length)} (${randomRatio}%)`);
  console.log(`  영화 데이터: ${formatSize(moviePacked.length)} (${movieRatio}%)`);
  console.log(`  차이:        ${(parseFloat(movieRatio) - parseFloat(randomRatio)).toFixed(2)}%p (영화가 ${parseFloat(movieRatio) > parseFloat(randomRatio) ? '더 잘' : '덜'} 압축됨)`);

  return results;
}

// ─── 파트 2: 청크 크기별 비교 ───────────────────────────────

function runChunkSizeComparison(data, label) {
  printBoxHeader(`파트 2: 청크 크기별 비교 — ${label}`);

  // 대용량 파일이면 일부만 사용
  const testSize = Math.min(data.length, 100 * 1024 * 1024); // 최대 100MB
  const testData = data.slice(0, testSize);

  const chunkSizes = [64, 128, 256, 512, 1024, 2048, 4096];

  console.log('');
  console.log(`  테스트 크기: ${formatSize(testSize)}`);
  console.log('');
  console.log(
    '  ' +
    '청크'.padStart(8) +
    '전체청크수'.padStart(14) +
    '고유청크수'.padStart(14) +
    '중복률'.padStart(10) +
    '압축크기'.padStart(12) +
    '압축률'.padStart(10) +
    'Pack(ms)'.padStart(12) +
    'Pack속도'.padStart(12) +
    'Unpack(ms)'.padStart(12)
  );
  printSeparator();

  const chartData = [];

  for (const cs of chunkSizes) {
    const packer = new Packer({ chunkSize: cs, codec: 'gzip' });

    const t0 = process.hrtime.bigint();
    const packed = packer.pack(testData);
    const t1 = process.hrtime.bigint();

    const unpacker = new Unpacker();
    const restored = unpacker.unpack(packed);
    const t2 = process.hrtime.bigint();

    const packMs = Number(t1 - t0) / 1e6;
    const unpackMs = Number(t2 - t1) / 1e6;

    const totalChunks = Math.ceil(testSize / cs);
    const uniqueChunks = packer.dictChunks.length;
    const dedupRate = ((1 - uniqueChunks / totalChunks) * 100).toFixed(2);
    const ratio = ((1 - packed.length / testSize) * 100).toFixed(2);
    const packSpeed = formatSpeed(testSize, packMs);
    const ok = restored.length === testData.length;

    console.log(
      '  ' +
      `${cs}B`.padStart(8) +
      totalChunks.toLocaleString().padStart(14) +
      uniqueChunks.toLocaleString().padStart(14) +
      `${dedupRate}%`.padStart(10) +
      formatSize(packed.length).padStart(12) +
      `${ratio}%`.padStart(10) +
      `${packMs.toFixed(1)}`.padStart(12) +
      `${packSpeed}MB/s`.padStart(12) +
      `${unpackMs.toFixed(1)}`.padStart(12) +
      (ok ? '' : '  ❌')
    );

    chartData.push({
      chunkSize: cs,
      dedupRate: parseFloat(dedupRate),
      ratio: parseFloat(ratio),
    });
  }

  // Mermaid 차트 출력
  console.log('');
  console.log('  [Mermaid 차트]');
  console.log('');
  console.log('```mermaid');
  console.log('xychart-beta');
  console.log(`  title "청크 크기별 압축률 — ${label} (${formatSize(testSize)})"`);
  console.log(`  x-axis [${chartData.map(d => `"${d.chunkSize}B"`).join(', ')}]`);
  console.log('  y-axis "압축률 (%)" -5 --> 15');
  console.log(`  bar [${chartData.map(d => d.ratio.toFixed(1)).join(', ')}]`);
  console.log('```');

  return chartData;
}

// ─── 파트 3: 프레임별 사전 누적 분석 ────────────────────────

function runFrameAccumulationAnalysis(data, label) {
  printBoxHeader(`파트 3: 프레임별 사전 누적 분석 — ${label}`);

  const chunkSize = 128;
  const frameLimits = [
    { limit: 1 * 1024 * 1024, name: '1MB' },
    { limit: 4 * 1024 * 1024, name: '4MB' },
    { limit: 16 * 1024 * 1024, name: '16MB' },
    { limit: 64 * 1024 * 1024, name: '64MB' },
  ];

  // 분석 대상 크기 (최대 500MB)
  const testSize = Math.min(data.length, 500 * 1024 * 1024);
  const testData = data.slice(0, testSize);

  console.log('');
  console.log(`  테스트 크기: ${formatSize(testSize)} | 청크: ${chunkSize}B`);

  for (const fl of frameLimits) {
    console.log('');
    console.log(`  ── frameLimit: ${fl.name} ──`);
    console.log('');

    const packer = new Packer({
      chunkSize,
      frameLimit: fl.limit,
      codec: 'gzip',
    });

    // 프레임별 상세 기록을 위해 수동 프레임 빌드
    const frameStats = [];
    let offset = 0;
    let frameIdx = 0;
    let prevDictSize = 0;
    const totalT0 = process.hrtime.bigint();

    while (offset < testSize) {
      const frameEnd = Math.min(offset + fl.limit, testSize);
      const dictSizeBefore = packer.dictChunks.length;

      const frame = packer._buildFrame(testData, offset, frameEnd);

      const dictSizeAfter = packer.dictChunks.length;
      const newEntries = dictSizeAfter - dictSizeBefore;
      const frameInputSize = frameEnd - offset;
      const totalChunksInFrame = Math.ceil(frameInputSize / chunkSize);
      const reuseCount = totalChunksInFrame - newEntries;
      const reuseRate = totalChunksInFrame > 0
        ? ((reuseCount / totalChunksInFrame) * 100).toFixed(1)
        : '0.0';

      frameStats.push({
        idx: frameIdx,
        inputSize: frameInputSize,
        outputSize: frame.length,
        dictSizeBefore,
        dictSizeAfter,
        newEntries,
        reuseCount,
        reuseRate: parseFloat(reuseRate),
        totalChunks: totalChunksInFrame,
      });

      offset = frameEnd;
      frameIdx++;
      prevDictSize = dictSizeAfter;
    }

    const totalMs = Number(process.hrtime.bigint() - totalT0) / 1e6;

    // 출력: 처음 5 + 마지막 5 프레임 (또는 전부)
    const showCount = Math.min(frameStats.length, 10);
    const showFirst = Math.min(5, frameStats.length);
    const showLast = Math.min(5, frameStats.length - showFirst);

    console.log(
      '  ' +
      '프레임#'.padStart(8) +
      '입력'.padStart(10) +
      '출력'.padStart(10) +
      '압축률'.padStart(8) +
      '사전크기'.padStart(14) +
      '신규청크'.padStart(12) +
      '재사용'.padStart(10) +
      '적중률'.padStart(8)
    );
    printSeparator('─', 80);

    const printFrame = (fs) => {
      const ratio = ((1 - fs.outputSize / fs.inputSize) * 100).toFixed(1);
      console.log(
        '  ' +
        `#${fs.idx}`.padStart(8) +
        formatSize(fs.inputSize).padStart(10) +
        formatSize(fs.outputSize).padStart(10) +
        `${ratio}%`.padStart(8) +
        fs.dictSizeAfter.toLocaleString().padStart(14) +
        fs.newEntries.toLocaleString().padStart(12) +
        fs.reuseCount.toLocaleString().padStart(10) +
        `${fs.reuseRate}%`.padStart(8)
      );
    };

    // 처음 프레임들
    for (let i = 0; i < showFirst; i++) {
      printFrame(frameStats[i]);
    }

    if (frameStats.length > 10) {
      console.log('  ' + '    ... (중간 생략) ...'.padStart(40));
    }

    // 마지막 프레임들
    if (frameStats.length > showFirst) {
      const startLast = Math.max(showFirst, frameStats.length - showLast);
      for (let i = startLast; i < frameStats.length; i++) {
        printFrame(frameStats[i]);
      }
    }

    printSeparator('─', 80);

    // 요약
    const totalInput = frameStats.reduce((s, f) => s + f.inputSize, 0);
    const totalOutput = frameStats.reduce((s, f) => s + f.outputSize, 0);
    const totalReuse = frameStats.reduce((s, f) => s + f.reuseCount, 0);
    const totalChunksAll = frameStats.reduce((s, f) => s + f.totalChunks, 0);
    const overallReuse = totalChunksAll > 0
      ? ((totalReuse / totalChunksAll) * 100).toFixed(2)
      : '0.00';
    const overallRatio = ((1 - totalOutput / totalInput) * 100).toFixed(2);

    // 사전 누적 효과: 첫 프레임 vs 마지막 프레임 적중률 비교
    const firstRate = frameStats[0].reuseRate;
    const lastRate = frameStats[frameStats.length - 1].reuseRate;

    console.log(`  프레임 수:        ${frameStats.length}`);
    console.log(`  전체 입력:        ${formatSize(totalInput)}`);
    console.log(`  전체 출력:        ${formatSize(totalOutput)}`);
    console.log(`  전체 압축률:      ${overallRatio}%`);
    console.log(`  전체 청크 재사용: ${overallReuse}% (${totalReuse.toLocaleString()} / ${totalChunksAll.toLocaleString()})`);
    console.log(`  최종 사전 크기:   ${packer.dictChunks.length.toLocaleString()}개 고유 청크`);
    console.log(`  사전 누적 효과:   첫 프레임 ${firstRate}% → 마지막 프레임 ${lastRate}% (${lastRate > firstRate ? '▲' : '▼'}${Math.abs(lastRate - firstRate).toFixed(1)}%p)`);
    console.log(`  처리 시간:        ${totalMs.toFixed(1)}ms (${formatSpeed(totalInput, totalMs)}MB/s)`);

    // Mermaid 차트: 프레임별 적중률 변화
    if (frameStats.length >= 4) {
      // 샘플링 (최대 20개 포인트)
      const maxPoints = 20;
      const step = Math.max(1, Math.floor(frameStats.length / maxPoints));
      const sampled = frameStats.filter((_, i) => i % step === 0 || i === frameStats.length - 1);
      // 중복 제거
      const seen = new Set();
      const uniqueSampled = sampled.filter(s => {
        if (seen.has(s.idx)) return false;
        seen.add(s.idx);
        return true;
      });

      console.log('');
      console.log('```mermaid');
      console.log('xychart-beta');
      console.log(`  title "프레임별 사전 적중률 변화 (frameLimit=${fl.name})"`);
      console.log(`  x-axis [${uniqueSampled.map(s => `"F${s.idx}"`).join(', ')}]`);
      console.log('  y-axis "적중률 (%)" 0 --> 100');
      console.log(`  line [${uniqueSampled.map(s => s.reuseRate.toFixed(1)).join(', ')}]`);
      console.log('```');
    }
  }
}

// ─── 파트 4: 스트리밍 벤치마크 ──────────────────────────────

async function runStreamBenchmark(data, label) {
  printBoxHeader(`파트 4: 스트리밍(Transform Stream) 벤치마크 — ${label}`);

  // 스트리밍 테스트 크기 (최대 200MB)
  const testSize = Math.min(data.length, 200 * 1024 * 1024);
  const testData = data.slice(0, testSize);
  const origHash = sha256(testData);

  console.log('');
  console.log(`  테스트 크기: ${formatSize(testSize)}`);
  console.log('');

  const configs = [
    { chunkSize: 128, frameLimit: 16 * 1024 * 1024, label: '128B/16MB프레임' },
    { chunkSize: 128, frameLimit: 64 * 1024 * 1024, label: '128B/64MB프레임' },
    { chunkSize: 512, frameLimit: 64 * 1024 * 1024, label: '512B/64MB프레임' },
    { chunkSize: 1024, frameLimit: 64 * 1024 * 1024, label: '1024B/64MB프레임' },
  ];

  console.log(
    '  ' +
    '구성'.padEnd(22) +
    '압축크기'.padStart(12) +
    '압축률'.padStart(10) +
    'Pack(ms)'.padStart(12) +
    'Unpack(ms)'.padStart(12) +
    'Pack속도'.padStart(12) +
    'Unpack속도'.padStart(12) +
    '무결성'.padStart(6)
  );
  printSeparator();

  for (const cfg of configs) {
    // Pack
    const ps = new PackStream({
      chunkSize: cfg.chunkSize,
      frameLimit: cfg.frameLimit,
      codec: 'gzip',
    });
    const packChunks = [];
    ps.on('data', (chunk) => packChunks.push(chunk));

    const packInput = new PassThrough();
    const packT0 = process.hrtime.bigint();
    const packPromise = pipeline(packInput, ps);
    packInput.end(testData);
    await packPromise;
    const packT1 = process.hrtime.bigint();

    const packed = Buffer.concat(packChunks);

    // Unpack
    const us = new UnpackStream();
    const unpackChunks = [];
    us.on('data', (chunk) => unpackChunks.push(chunk));

    const unpackInput = new PassThrough();
    const unpackT0 = process.hrtime.bigint();
    const unpackPromise = pipeline(unpackInput, us);
    unpackInput.end(packed);
    await unpackPromise;
    const unpackT1 = process.hrtime.bigint();

    const restored = Buffer.concat(unpackChunks);

    const packMs = Number(packT1 - packT0) / 1e6;
    const unpackMs = Number(unpackT1 - unpackT0) / 1e6;
    const ratio = ((1 - packed.length / testSize) * 100).toFixed(2);
    const ok = sha256(restored) === origHash && restored.length === testSize;

    console.log(
      '  ' +
      cfg.label.padEnd(22) +
      formatSize(packed.length).padStart(12) +
      `${ratio}%`.padStart(10) +
      `${packMs.toFixed(1)}`.padStart(12) +
      `${unpackMs.toFixed(1)}`.padStart(12) +
      `${formatSpeed(testSize, packMs)}MB/s`.padStart(12) +
      `${formatSpeed(testSize, unpackMs)}MB/s`.padStart(12) +
      (ok ? '   ✅' : '   ❌')
    );
  }
}

// ─── 파트 5: 4K 스트리밍 시뮬레이션 ─────────────────────────

function run4kStreamSimulation(data, label) {
  printBoxHeader(`파트 5: 4K 스트리밍 시뮬레이션 — ${label}`);

  const chunkSize = 128;

  // 4K 스트림 기준값
  const BITRATE_4K_MBPS = 100; // Mbps
  const BITRATE_4K_BYTES = BITRATE_4K_MBPS * 1000 * 1000 / 8; // bytes/sec

  // Pack 결과
  const t0 = process.hrtime.bigint();
  const packed = pack(data, { chunkSize, codec: 'gzip' });
  const t1 = process.hrtime.bigint();
  const restored = unpack(packed);
  const t2 = process.hrtime.bigint();

  const packMs = Number(t1 - t0) / 1e6;
  const unpackMs = Number(t2 - t1) / 1e6;
  const packBytesPerSec = (data.length / (packMs / 1000));
  const unpackBytesPerSec = (data.length / (unpackMs / 1000));

  const ratio = ((1 - packed.length / data.length) * 100).toFixed(2);
  const savedBytes = data.length - packed.length;

  // 전체 파일 외삽
  const fullFileSize = data.length; // 이미 읽은 크기 기준
  const fullPackedSize = packed.length;

  console.log('');
  console.log('  ── 측정 결과 ──');
  console.log(`  원본:         ${formatSize(data.length)}`);
  console.log(`  압축:         ${formatSize(packed.length)}`);
  console.log(`  압축률:       ${ratio}%`);
  console.log(`  절감:         ${formatSize(Math.abs(savedBytes))} ${savedBytes > 0 ? '감소' : '증가'}`);
  console.log(`  Pack 속도:    ${formatSpeed(data.length, packMs)} MB/s`);
  console.log(`  Unpack 속도:  ${formatSpeed(data.length, unpackMs)} MB/s`);
  console.log('');

  console.log('  ── 4K 스트리밍 동시 재생 계산 ──');
  console.log(`  4K 스트림 비트레이트: ${BITRATE_4K_MBPS} Mbps (${formatSize(BITRATE_4K_BYTES)}/s)`);
  console.log('');

  const maxPackStreams = Math.floor(packBytesPerSec / BITRATE_4K_BYTES);
  const maxUnpackStreams = Math.floor(unpackBytesPerSec / BITRATE_4K_BYTES);

  console.log(`  Pack   스루풋: ${formatSpeed(data.length, packMs)} MB/s → 동시 ${maxPackStreams}개 스트림 처리 가능`);
  console.log(`  Unpack 스루풋: ${formatSpeed(data.length, unpackMs)} MB/s → 동시 ${maxUnpackStreams}개 스트림 처리 가능`);
  console.log('');

  // 네트워크별 전송 시뮬레이션
  console.log('  ── 네트워크별 전송 시간 비교 ──');
  console.log('');
  const networks = [
    { name: '100Mbps', bps: 100 * 1000 * 1000 / 8 },
    { name: '1Gbps', bps: 1000 * 1000 * 1000 / 8 },
    { name: '10Gbps', bps: 10000 * 1000 * 1000 / 8 },
  ];

  console.log(
    '  ' +
    '네트워크'.padEnd(12) +
    '원본 전송'.padStart(14) +
    'mshzip 전송'.padStart(14) +
    '절감 시간'.padStart(14) +
    '절감률'.padStart(8)
  );
  printSeparator('─', 62);

  for (const net of networks) {
    const origTime = data.length / net.bps;
    const compTime = packed.length / net.bps;
    const savedTime = origTime - compTime;
    const savedPct = ((savedTime / origTime) * 100).toFixed(1);

    console.log(
      '  ' +
      net.name.padEnd(12) +
      `${origTime.toFixed(1)}s`.padStart(14) +
      `${compTime.toFixed(1)}s`.padStart(14) +
      `${savedTime > 0 ? '-' : '+'}${Math.abs(savedTime).toFixed(1)}s`.padStart(14) +
      `${savedPct}%`.padStart(8)
    );
  }
}

// ─── 파트 6: 바이트 패턴 히트맵 ─────────────────────────────

function runBytePatternAnalysis(data, label) {
  printBoxHeader(`파트 6: 바이트 패턴 분석 — ${label}`);

  const sampleSize = Math.min(data.length, 50 * 1024 * 1024);
  const sample = data.slice(0, sampleSize);

  console.log('');
  console.log(`  분석 크기: ${formatSize(sampleSize)}`);
  console.log('');

  // 1) 바이트 값 분포
  const byteFreq = new Uint32Array(256);
  for (let i = 0; i < sample.length; i++) {
    byteFreq[sample[i]]++;
  }

  // 엔트로피 계산
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (byteFreq[i] > 0) {
      const p = byteFreq[i] / sampleSize;
      entropy -= p * Math.log2(p);
    }
  }

  // 0x00 바이트 비율
  const zeroRate = ((byteFreq[0] / sampleSize) * 100).toFixed(2);

  // 고유 바이트 값 수
  const uniqueBytes = byteFreq.filter(f => f > 0).length;

  console.log(`  엔트로피:        ${entropy.toFixed(4)} bits/byte (최대 8.0)`);
  console.log(`  엔트로피 비율:   ${(entropy / 8 * 100).toFixed(1)}% (높을수록 랜덤에 가까움)`);
  console.log(`  고유 바이트 값:  ${uniqueBytes}/256`);
  console.log(`  0x00 비율:       ${zeroRate}%`);
  console.log('');

  // 2) 연속 동일 바이트 시퀀스 (RLE 잠재력)
  let runCount = 0;
  let totalRunLength = 0;
  let maxRun = 0;
  let i = 0;
  while (i < sample.length) {
    let runLen = 1;
    while (i + runLen < sample.length && sample[i + runLen] === sample[i]) {
      runLen++;
    }
    if (runLen >= 128) { // 청크 크기 이상의 연속
      runCount++;
      totalRunLength += runLen;
      if (runLen > maxRun) maxRun = runLen;
    }
    i += runLen;
  }

  console.log('  [연속 동일 바이트 시퀀스 (128B 이상)]');
  console.log(`  발견 횟수:       ${runCount.toLocaleString()}`);
  console.log(`  총 길이:         ${formatSize(totalRunLength)}`);
  console.log(`  최대 길이:       ${formatSize(maxRun)}`);
  console.log(`  전체 대비:       ${((totalRunLength / sampleSize) * 100).toFixed(3)}%`);
  console.log('');

  // 3) 반복 4바이트 패턴 (시그니처 탐지)
  console.log('  [자주 등장하는 4바이트 패턴 Top 10]');
  const pattern4Map = new Map();
  const step4 = Math.max(1, Math.floor(sampleSize / 1000000)); // 샘플링
  for (let j = 0; j < sampleSize - 4; j += step4) {
    const key = sample.readUInt32LE(j);
    pattern4Map.set(key, (pattern4Map.get(key) || 0) + 1);
  }

  const top4 = [...pattern4Map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  for (const [val, count] of top4) {
    const hex = val.toString(16).padStart(8, '0').toUpperCase();
    const bytes = hex.match(/.{2}/g).join(' ');
    console.log(`    0x${hex} (${bytes}): ${count.toLocaleString()}회`);
  }

  return { entropy, zeroRate: parseFloat(zeroRate), uniqueBytes };
}

// ─── 종합 결과 ──────────────────────────────────────────────

function printSummary(data, basicResults) {
  printBoxHeader('종합 결과');

  const gzipResult = basicResults.find(r => r.codec === 'gzip');
  if (!gzipResult) return;

  console.log('');
  console.log(`  ┌───────────────────────────────────────────────┐`);
  console.log(`  │  원본 크기:     ${formatSize(data.length).padEnd(30)}│`);
  console.log(`  │  압축 크기:     ${formatSize(gzipResult.packed).padEnd(30)}│`);
  console.log(`  │  압축률:        ${(gzipResult.ratio + '%').padEnd(30)}│`);
  console.log(`  │  Pack 속도:     ${(gzipResult.packSpeed + ' MB/s').padEnd(30)}│`);
  console.log(`  │  Unpack 속도:   ${(gzipResult.unpackSpeed + ' MB/s').padEnd(30)}│`);
  console.log(`  │  무결성:        ${(gzipResult.ok ? '✅ PASS' : '❌ FAIL').padEnd(30)}│`);
  console.log(`  └───────────────────────────────────────────────┘`);
  console.log('');

  if (gzipResult.ratio > 0) {
    console.log(`  ✅ 영화 데이터에서 ${gzipResult.ratio}% 압축 달성`);
    console.log(`     → 사전 누적 기반 dedup이 이미 압축된 데이터에서도 효과 있음`);
  } else {
    console.log(`  ⚠️  영화 데이터에서 ${Math.abs(gzipResult.ratio)}% 오버헤드 발생`);
    console.log(`     → dedup 효과가 프레임 헤더/시퀀스 오버헤드를 상쇄하지 못함`);
  }
}

// ─── 메인 실행 ──────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔' + '═'.repeat(110) + '╗');
  console.log('║  mshzip 4K 영화 파일 벤치마크' + ' '.repeat(80) + '║');
  console.log('╚' + '═'.repeat(110) + '╝');

  // 파일 읽기
  const { buf, totalSize, readSize } = loadMovieFile(filePath, maxSizeMB);

  // 파트 1: 기본 벤치마크
  const basicResults = runBasicBenchmark(buf, path.basename(filePath));

  // 파트 2: 청크 크기별 비교 (옵션)
  if (doChunkTest) {
    runChunkSizeComparison(buf, path.basename(filePath));
  }

  // 파트 3: 프레임별 사전 누적 분석 (옵션)
  if (doFrameAnalysis) {
    runFrameAccumulationAnalysis(buf, path.basename(filePath));
  }

  // 파트 4: 스트리밍 벤치마크
  await runStreamBenchmark(buf, path.basename(filePath));

  // 파트 5: 4K 스트리밍 시뮬레이션
  run4kStreamSimulation(buf, path.basename(filePath));

  // 파트 6: 바이트 패턴 분석
  runBytePatternAnalysis(buf, path.basename(filePath));

  // 종합
  printSummary(buf, basicResults);

  console.log('');
  console.log('  벤치마크 완료.');
  console.log('');
}

main().catch((err) => {
  console.error('벤치마크 오류:', err.message);
  process.exit(1);
});
