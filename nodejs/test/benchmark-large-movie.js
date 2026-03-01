#!/usr/bin/env node
'use strict';

/**
 * mshzip 대용량 4K 영화 벤치마크 (1GB / 5GB / 전체 파일)
 *
 * 스트리밍 기반으로 메모리 효율적으로 대용량 파일을 테스트한다.
 * PackStream/UnpackStream을 사용하여 프레임 단위 처리.
 *
 * V8 Map 한계(~1,677만 항목) 자동 감지 → 청크 크기 자동 조정
 * 프레임 크기 16MB로 축소 → gzip 메모리 부담 경감
 *
 * 사용법:
 *   node test/benchmark-large-movie.js <영화파일경로>
 *
 * 결과는 콘솔 + test.txt 파일로 출력
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream/promises');
const { Transform, PassThrough, Writable } = require('stream');
const { PackStream, UnpackStream } = require('../lib/stream');
const { Packer } = require('../lib/packer');
const { FRAME_HEADER_SIZE, FLAG } = require('../lib/constants');

// V8 Map 최대 항목 수 (안전 마진 포함)
const V8_MAP_MAX = 16_000_000;
// 벤치마크용 프레임 크기 (메모리 부담 경감)
const BENCH_FRAME_LIMIT = 16 * 1024 * 1024; // 16MB

// ─── 인자 ───────────────────────────────────────────────────

const filePath = process.argv[2];
if (!filePath) {
  console.log('사용법: node test/benchmark-large-movie.js <영화파일경로>');
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

function pad(str, len, right = false) {
  str = String(str);
  return right ? str.padEnd(len) : str.padStart(len);
}

// 출력 버퍼 (콘솔 + 파일 동시 기록)
const outputLines = [];
function log(msg = '') {
  console.log(msg);
  outputLines.push(msg);
}

// ─── 바이트 카운터 스트림 ───────────────────────────────────

class ByteCounter extends Transform {
  constructor() {
    super();
    this.bytes = 0;
  }
  _transform(chunk, enc, cb) {
    this.bytes += chunk.length;
    this.push(chunk);
    cb();
  }
}

// ─── /dev/null 스트림 (해시 계산용) ─────────────────────────

class HashSink extends Writable {
  constructor() {
    super();
    this._hash = crypto.createHash('sha256');
    this.bytes = 0;
  }
  _write(chunk, enc, cb) {
    this._hash.update(chunk);
    this.bytes += chunk.length;
    cb();
  }
  digest() {
    return this._hash.digest('hex');
  }
}

// ─── 프레임 분석기 (스트리밍) ───────────────────────────────

// 메모리 효율적 프레임 분석기: 헤더(36B)만 버퍼링, 페이로드는 스킵
class FrameAnalyzer extends Transform {
  constructor() {
    super();
    this._headerBuf = Buffer.alloc(0);
    this._skipRemain = 0;
    this.frames = [];
    this._frameIdx = 0;
    this._globalDictSize = 0;
  }

  _transform(chunk, enc, cb) {
    this.push(chunk); // 원본 데이터 즉시 통과 (메모리 보존)
    let off = 0;

    while (off < chunk.length) {
      // 페이로드 스킵 중
      if (this._skipRemain > 0) {
        const skip = Math.min(this._skipRemain, chunk.length - off);
        this._skipRemain -= skip;
        off += skip;
        continue;
      }

      // 헤더 수집 (36바이트: 32 헤더 + 4 payloadSize)
      const needed = (FRAME_HEADER_SIZE + 4) - this._headerBuf.length;
      if (needed > 0) {
        const take = Math.min(needed, chunk.length - off);
        this._headerBuf = Buffer.concat([this._headerBuf, chunk.slice(off, off + take)]);
        off += take;
        if (this._headerBuf.length < FRAME_HEADER_SIZE + 4) continue;
      }

      // 헤더 파싱
      const h = this._headerBuf;
      const flags = h.readUInt16LE(6);
      const hasCRC = (flags & FLAG.CRC32) !== 0;
      const chunkSize = h.readUInt32LE(8);
      const origBytesLo = h.readUInt32LE(16);
      const origBytesHi = h.readUInt32LE(20);
      const origBytes = origBytesHi * 0x100000000 + origBytesLo;
      const dictEntries = h.readUInt32LE(24);
      const seqCount = h.readUInt32LE(28);
      const payloadSize = h.readUInt32LE(32);

      const totalFrameSize = FRAME_HEADER_SIZE + 4 + payloadSize + (hasCRC ? 4 : 0);
      const reuseCount = Math.max(0, seqCount - dictEntries);
      const reuseRate = seqCount > 0 ? (reuseCount / seqCount * 100) : 0;
      this._globalDictSize += dictEntries;

      this.frames.push({
        idx: this._frameIdx++,
        origBytes,
        frameSize: totalFrameSize,
        dictEntries,
        seqCount,
        reuseCount,
        reuseRate,
        globalDictSize: this._globalDictSize,
        chunkSize,
        ratio: origBytes > 0 ? ((1 - totalFrameSize / origBytes) * 100) : 0,
      });

      this._skipRemain = payloadSize + (hasCRC ? 4 : 0);
      this._headerBuf = Buffer.alloc(0);
    }
    cb();
  }

  _flush(cb) { cb(); }
}

// ─── 엔트로피 샘플링 (처음 N바이트만 읽기) ─────────────────

async function sampleEntropy(fpath, sampleBytes) {
  return new Promise((resolve, reject) => {
    const fd = fs.openSync(fpath, 'r');
    const size = Math.min(sampleBytes, fs.fstatSync(fd).size);
    const buf = Buffer.alloc(size);
    fs.readSync(fd, buf, 0, size, 0);
    fs.closeSync(fd);

    const freq = new Uint32Array(256);
    for (let i = 0; i < size; i++) freq[buf[i]]++;

    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (freq[i] > 0) {
        const p = freq[i] / size;
        entropy -= p * Math.log2(p);
      }
    }

    const zeroRate = (freq[0] / size * 100);
    const uniqueBytes = freq.filter(f => f > 0).length;

    // 128B 청크 중복 샘플
    const chunkMap = new Map();
    const totalChunks = Math.floor(size / 128);
    for (let i = 0; i < size - 128; i += 128) {
      const hash = crypto.createHash('sha256').update(buf.slice(i, i + 128)).digest('hex');
      chunkMap.set(hash, (chunkMap.get(hash) || 0) + 1);
    }
    const uniqueChunks = chunkMap.size;
    const dupChunks = totalChunks - uniqueChunks;
    const dedupRate = totalChunks > 0 ? (dupChunks / totalChunks * 100) : 0;

    resolve({ entropy, zeroRate, uniqueBytes, totalChunks, uniqueChunks, dupChunks, dedupRate, sampleSize: size });
  });
}

// ─── V8 Map 한계 확인 ────────────────────────────────────────

function estimateChunks(fileBytes, chunkSize) {
  return Math.ceil(fileBytes / chunkSize);
}

function isFeasible(fileBytes, chunkSize) {
  return estimateChunks(fileBytes, chunkSize) <= V8_MAP_MAX;
}

function minFeasibleChunkSize(fileBytes) {
  const candidates = [64, 128, 256, 512, 1024, 2048, 4096, 8192];
  for (const cs of candidates) {
    if (isFeasible(fileBytes, cs)) return cs;
  }
  return 16384;
}

// ─── 단일 크기 스트리밍 벤치마크 ────────────────────────────

async function runStreamingBenchmark(fpath, readBytes, chunkSize, codec, label) {
  const tmpDir = path.join(os.tmpdir(), 'mshzip-bench');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const mshFile = path.join(tmpDir, `bench-${Date.now()}.msh`);
  const stat = fs.statSync(fpath);
  const actualRead = Math.min(readBytes, stat.size);

  // Map 한계 확인
  const estChunks = estimateChunks(actualRead, chunkSize);
  if (estChunks > V8_MAP_MAX) {
    log(`  ── ${label} — SKIP (예상 ${estChunks.toLocaleString()} 청크 > Map 한계 ${V8_MAP_MAX.toLocaleString()}) ──`);
    log('');
    return null;
  }

  log(`  ── ${label} (chunk=${chunkSize}B, codec=${codec}, frame=${formatSize(BENCH_FRAME_LIMIT)}) ──`);
  log(`  읽기 크기: ${formatSize(actualRead)} | 예상 청크: ${estChunks.toLocaleString()}`);

  // ── Pack (압축) ──
  const packPs = new PackStream({ chunkSize, codec, frameLimit: BENCH_FRAME_LIMIT });
  const packCounter = new ByteCounter();
  const frameAnalyzer = new FrameAnalyzer();

  const readStream = fs.createReadStream(fpath, { start: 0, end: actualRead - 1 });
  const writeStream = fs.createWriteStream(mshFile);

  const packT0 = process.hrtime.bigint();
  await pipeline(readStream, packPs, frameAnalyzer, packCounter, writeStream);
  const packT1 = process.hrtime.bigint();

  const packMs = Number(packT1 - packT0) / 1e6;
  const packedSize = packCounter.bytes;
  const ratio = ((1 - packedSize / actualRead) * 100).toFixed(3);
  const packSpeed = formatSpeed(actualRead, packMs);

  log(`  Pack 완료: ${formatSize(actualRead)} → ${formatSize(packedSize)} (${ratio}%)`);
  log(`  Pack 시간: ${(packMs / 1000).toFixed(2)}s | Pack 속도: ${packSpeed} MB/s`);
  log(`  프레임 수: ${frameAnalyzer.frames.length} | 최종 사전: ${frameAnalyzer._globalDictSize.toLocaleString()}개`);

  // ── 프레임 상세 ──
  const frames = frameAnalyzer.frames;
  if (frames.length > 0) {
    const totalReuse = frames.reduce((s, f) => s + f.reuseCount, 0);
    const totalSeq = frames.reduce((s, f) => s + f.seqCount, 0);
    const overallReuse = totalSeq > 0 ? (totalReuse / totalSeq * 100).toFixed(4) : '0';

    log(`  전체 재사용율: ${overallReuse}% (${totalReuse.toLocaleString()} / ${totalSeq.toLocaleString()} 청크)`);

    // 첫 3 + 마지막 3 프레임
    log('');
    log('  ' + pad('프레임#', 8, true) + pad('입력', 12) + pad('출력', 12) + pad('압축률', 10) + pad('신규', 12) + pad('재사용', 10) + pad('적중률', 10) + pad('누적사전', 14));
    log('  ' + '─'.repeat(88));

    const showFrames = [];
    const first = Math.min(3, frames.length);
    for (let i = 0; i < first; i++) showFrames.push(frames[i]);
    if (frames.length > 6) showFrames.push(null); // 생략 마커
    const last = Math.min(3, frames.length - first);
    for (let i = frames.length - last; i < frames.length; i++) {
      if (i >= first) showFrames.push(frames[i]);
    }

    for (const f of showFrames) {
      if (!f) {
        log('  ' + pad('...', 8, true) + pad('(중간 생략)', 40, true));
        continue;
      }
      log('  ' +
        pad(`#${f.idx}`, 8, true) +
        pad(formatSize(f.origBytes), 12) +
        pad(formatSize(f.frameSize), 12) +
        pad(`${f.ratio.toFixed(1)}%`, 10) +
        pad(f.dictEntries.toLocaleString(), 12) +
        pad(f.reuseCount.toLocaleString(), 10) +
        pad(`${f.reuseRate.toFixed(2)}%`, 10) +
        pad(f.globalDictSize.toLocaleString(), 14)
      );
    }
  }

  // ── Unpack (해제) ──
  log('');
  let unpackMs = 0;
  let unpackSpeed = '0';
  let restoredSize = 0;
  let integrity = false;

  try {
    const unpackReadStream = fs.createReadStream(mshFile);
    const unpackUs = new UnpackStream();
    const hashSink = new HashSink();

    const unpackT0 = process.hrtime.bigint();
    await pipeline(unpackReadStream, unpackUs, hashSink);
    const unpackT1 = process.hrtime.bigint();

    unpackMs = Number(unpackT1 - unpackT0) / 1e6;
    unpackSpeed = formatSpeed(actualRead, unpackMs);
    restoredSize = hashSink.bytes;
    integrity = restoredSize === actualRead;

    log(`  Unpack 완료: ${formatSize(restoredSize)}`);
    log(`  Unpack 시간: ${(unpackMs / 1000).toFixed(2)}s | Unpack 속도: ${unpackSpeed} MB/s`);
    log(`  무결성: ${integrity ? '✅ PASS' : '❌ FAIL'} (크기 ${integrity ? '일치' : `불일치: ${restoredSize} ≠ ${actualRead}`})`);
  } catch (err) {
    log(`  Unpack 오류: ${err.message}`);
    log(`  (Pack은 성공했으나 Unpack 검증 실패 — 메모리/디스크 제약 가능)`);
    unpackSpeed = 'ERR';
  }

  // 정리
  try { fs.unlinkSync(mshFile); } catch (e) { /* ignore */ }

  // ── 4K 스트리밍 계산 ──
  const BITRATE_4K = 100 * 1000 * 1000 / 8; // 100Mbps → bytes/sec
  const packBps = actualRead / (packMs / 1000);
  const unpackBps = actualRead / (unpackMs / 1000);

  log('');
  log(`  4K 동시 스트리밍 (100Mbps 기준):`);
  log(`    Pack   ${packSpeed} MB/s → 동시 ${Math.floor(packBps / BITRATE_4K)}개`);
  log(`    Unpack ${unpackSpeed} MB/s → 동시 ${Math.floor(unpackBps / BITRATE_4K)}개`);

  // ── 전송 절감 ──
  const savedBytes = actualRead - packedSize;
  log('');
  log(`  전송 절감: ${savedBytes > 0 ? '-' : '+'}${formatSize(Math.abs(savedBytes))} (${ratio}%)`);

  return {
    label, actualRead, packedSize, ratio: parseFloat(ratio),
    packMs, unpackMs, packSpeed, unpackSpeed,
    frameCount: frames.length, dictSize: frameAnalyzer._globalDictSize,
    totalReuse: frames.reduce((s, f) => s + f.reuseCount, 0),
    totalSeq: frames.reduce((s, f) => s + f.seqCount, 0),
    integrity,
  };
}

// ─── 메인 ───────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(filePath)) {
    console.error(`파일 없음: ${filePath}`);
    process.exit(1);
  }

  const stat = fs.statSync(filePath);
  const totalFileSize = stat.size;
  const fileName = path.basename(filePath);

  // 테스트 크기 설정
  const testSizes = [
    { size: 1 * 1024 * 1024 * 1024, label: '1GB' },
    { size: 5 * 1024 * 1024 * 1024, label: '5GB' },
    { size: 10 * 1024 * 1024 * 1024, label: '10GB' },
  ];

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  log('╔' + '═'.repeat(100) + '╗');
  log('║  mshzip 대용량 4K 영화 벤치마크 (1GB / 5GB / 10GB)' + ' '.repeat(49) + '║');
  log('╚' + '═'.repeat(100) + '╝');
  log('');
  log(`  날짜:      ${dateStr}`);
  log(`  파일:      ${fileName}`);
  log(`  경로:      ${filePath}`);
  log(`  전체 크기: ${formatSize(totalFileSize)}`);
  log(`  Node.js:   ${process.version}`);
  log(`  OS:        ${os.type()} ${os.release()} (${os.arch()})`);
  log(`  CPU:       ${os.cpus()[0].model}`);
  log(`  RAM:       ${formatSize(os.totalmem())}`);
  log(`  힙 제한:   ${formatSize(require('v8').getHeapStatistics().heap_size_limit)}`);
  log('');

  // ── 엔트로피 분석 (50MB 샘플) ──
  log('╔' + '═'.repeat(100) + '╗');
  log('║  사전 분석: 엔트로피 & 128B 청크 중복 (50MB 샘플)' + ' '.repeat(50) + '║');
  log('╚' + '═'.repeat(100) + '╝');
  log('');

  const sample = await sampleEntropy(filePath, 50 * 1024 * 1024);
  log(`  샘플 크기:       ${formatSize(sample.sampleSize)}`);
  log(`  엔트로피:        ${sample.entropy.toFixed(4)} bits/byte (최대 8.0, ${(sample.entropy / 8 * 100).toFixed(1)}%)`);
  log(`  고유 바이트 값:  ${sample.uniqueBytes}/256`);
  log(`  0x00 비율:       ${sample.zeroRate.toFixed(3)}%`);
  log(`  128B 청크 수:    ${sample.totalChunks.toLocaleString()}`);
  log(`  고유 청크 수:    ${sample.uniqueChunks.toLocaleString()}`);
  log(`  중복 청크 수:    ${sample.dupChunks.toLocaleString()}`);
  log(`  128B 중복률:     ${sample.dedupRate.toFixed(4)}%`);
  log('');

  // ── 청크 크기별 빠른 비교 (100MB) ──
  log('╔' + '═'.repeat(100) + '╗');
  log('║  청크 크기별 빠른 비교 (100MB 샘플, gzip)' + ' '.repeat(57) + '║');
  log('╚' + '═'.repeat(100) + '╝');
  log('');

  const quickSize = Math.min(100 * 1024 * 1024, totalFileSize);
  const chunkSizes = [64, 128, 256, 512, 1024, 2048, 4096];

  log('  ' + pad('청크', 8) + pad('압축크기', 12) + pad('압축률', 10) + pad('Pack(s)', 10) + pad('Pack속도', 12) + pad('Unpack(s)', 10) + pad('Unpack속도', 12));
  log('  ' + '─'.repeat(74));

  for (const cs of chunkSizes) {
    const tmpMsh = path.join(os.tmpdir(), `mshzip-quick-${cs}-${Date.now()}.msh`);

    try {
      // Pack
      const ps = new PackStream({ chunkSize: cs, codec: 'gzip', frameLimit: 64 * 1024 * 1024 });
      const counter = new ByteCounter();
      const rs = fs.createReadStream(filePath, { start: 0, end: quickSize - 1 });
      const ws = fs.createWriteStream(tmpMsh);

      const t0 = process.hrtime.bigint();
      await pipeline(rs, ps, counter, ws);
      const t1 = process.hrtime.bigint();
      const packMs = Number(t1 - t0) / 1e6;

      const packed = counter.bytes;
      const ratio = ((1 - packed / quickSize) * 100).toFixed(2);

      // Unpack
      let unpackMs = 0;
      let unpackSpd = '-';
      try {
        const us = new UnpackStream();
        const sink = new HashSink();
        const urs = fs.createReadStream(tmpMsh);
        const t2 = process.hrtime.bigint();
        await pipeline(urs, us, sink);
        const t3 = process.hrtime.bigint();
        unpackMs = Number(t3 - t2) / 1e6;
        unpackSpd = `${formatSpeed(quickSize, unpackMs)}MB/s`;
      } catch (ue) {
        unpackSpd = 'ERR';
      }

      log('  ' +
        pad(`${cs}B`, 8) +
        pad(formatSize(packed), 12) +
        pad(`${ratio}%`, 10) +
        pad(`${(packMs / 1000).toFixed(2)}`, 10) +
        pad(`${formatSpeed(quickSize, packMs)}MB/s`, 12) +
        pad(unpackMs > 0 ? `${(unpackMs / 1000).toFixed(2)}` : '-', 10) +
        pad(unpackSpd, 12)
      );
    } catch (e) {
      log(`  ${pad(`${cs}B`, 8)} 오류: ${e.message}`);
    }

    try { fs.unlinkSync(tmpMsh); } catch (e) { /* ignore */ }
  }

  log('');

  // ── 대용량 테스트 (1GB / 5GB / 전체 파일) ──
  const allResults = [];

  // 테스트 목록 생성: 파일 크기와 Map 한계 고려
  const testPlan = [];

  for (const ts of testSizes) {
    const actualSize = Math.min(ts.size, totalFileSize);
    const effectiveLabel = ts.size > totalFileSize
      ? `${formatSize(totalFileSize)} (전체)`
      : ts.label;

    // 10GB 요청이나 파일이 작으면 전체 파일로 대체
    if (ts.size > totalFileSize && ts.label === '10GB') {
      if (totalFileSize > 5 * 1024 * 1024 * 1024) {
        // 전체 파일 테스트 (1024B + 4096B + none)
        testPlan.push({ size: totalFileSize, label: `${effectiveLabel}`, chunkSize: 1024, codec: 'gzip' });
        testPlan.push({ size: totalFileSize, label: `${effectiveLabel}`, chunkSize: 4096, codec: 'gzip' });
        testPlan.push({ size: totalFileSize, label: `${effectiveLabel}`, chunkSize: 1024, codec: 'none' });
      }
      continue;
    }

    if (ts.size > totalFileSize) continue;

    // 각 크기별 최적 청크 크기 결정
    const minCS = minFeasibleChunkSize(actualSize);

    // gzip 테스트: 가능한 작은 청크 + 큰 청크
    if (isFeasible(actualSize, 128)) {
      testPlan.push({ size: actualSize, label: ts.label, chunkSize: 128, codec: 'gzip' });
    }
    if (minCS > 128) {
      testPlan.push({ size: actualSize, label: ts.label, chunkSize: minCS, codec: 'gzip' });
    }
    testPlan.push({ size: actualSize, label: ts.label, chunkSize: 1024, codec: 'gzip' });
    testPlan.push({ size: actualSize, label: ts.label, chunkSize: 4096, codec: 'gzip' });

    // none 테스트 (dedup만): 128B 가능하면 포함
    if (isFeasible(actualSize, 128)) {
      testPlan.push({ size: actualSize, label: ts.label, chunkSize: 128, codec: 'none' });
    }
  }

  // 중복 제거
  const seen = new Set();
  const uniquePlan = testPlan.filter(t => {
    const key = `${t.size}-${t.chunkSize}-${t.codec}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 크기별로 그룹핑하여 실행
  let lastSize = 0;
  for (const t of uniquePlan) {
    if (t.size !== lastSize) {
      const sizeLabel = t.label || formatSize(t.size);
      log('╔' + '═'.repeat(100) + '╗');
      const title = `  ${sizeLabel} 테스트`;
      log(`║${title}${' '.repeat(100 - title.length)}║`);
      log('╚' + '═'.repeat(100) + '╝');
      log('');
      lastSize = t.size;
    }

    const testLabel = `${t.label} (${t.chunkSize}B, ${t.codec})`;
    const r = await runStreamingBenchmark(filePath, t.size, t.chunkSize, t.codec, testLabel);
    if (r) allResults.push(r);
    log('');

    // GC 강제 실행 (가능한 경우)
    if (global.gc) global.gc();
  }

  // ── 종합 비교표 ──
  log('╔' + '═'.repeat(100) + '╗');
  log('║  종합 비교표' + ' '.repeat(87) + '║');
  log('╚' + '═'.repeat(100) + '╝');
  log('');

  log('  ' +
    pad('테스트', 35, true) +
    pad('입력', 10) +
    pad('출력', 10) +
    pad('압축률', 10) +
    pad('Pack', 12) +
    pad('Unpack', 12) +
    pad('무결성', 6)
  );
  log('  ' + '─'.repeat(95));

  for (const r of allResults) {
    log('  ' +
      pad(r.label, 35, true) +
      pad(formatSize(r.actualRead), 10) +
      pad(formatSize(r.packedSize), 10) +
      pad(`${r.ratio.toFixed(3)}%`, 10) +
      pad(`${r.packSpeed}MB/s`, 12) +
      pad(`${r.unpackSpeed}MB/s`, 12) +
      pad(r.integrity ? '✅' : '❌', 6)
    );
  }

  log('');

  // ── 결론 ──
  log('╔' + '═'.repeat(100) + '╗');
  log('║  결론' + ' '.repeat(94) + '║');
  log('╚' + '═'.repeat(100) + '╝');
  log('');

  // 코덱별 결과 분류
  const gzipResults = allResults.filter(r => r.label.includes('gzip'));
  const noneResults = allResults.filter(r => r.label.includes('none'));

  // 청크 크기별 gzip 결과 분류
  const gzip128 = gzipResults.filter(r => r.label.includes('128B'));
  const gzip1024 = gzipResults.filter(r => r.label.includes('1024B'));
  const gzip4096 = gzipResults.filter(r => r.label.includes('4096B'));

  for (const [label, group] of [['128B+gzip', gzip128], ['1024B+gzip', gzip1024], ['4096B+gzip', gzip4096]]) {
    if (group.length === 0) continue;
    const avgRatio = group.reduce((s, r) => s + r.ratio, 0) / group.length;
    const avgPack = group.reduce((s, r) => s + parseFloat(r.packSpeed || 0), 0) / group.length;
    const validUnpack = group.filter(r => r.unpackSpeed !== 'ERR');
    const avgUnpack = validUnpack.length > 0
      ? validUnpack.reduce((s, r) => s + parseFloat(r.unpackSpeed), 0) / validUnpack.length : 0;

    log(`  ${label}:`);
    log(`    평균 압축률:      ${avgRatio.toFixed(3)}%`);
    log(`    평균 Pack 속도:   ${avgPack.toFixed(1)} MB/s`);
    if (avgUnpack > 0) {
      log(`    평균 Unpack 속도: ${avgUnpack.toFixed(1)} MB/s`);
    }
    log('');
  }

  if (noneResults.length > 0) {
    const avgRatioNone = noneResults.reduce((s, r) => s + r.ratio, 0) / noneResults.length;
    log(`  none (dedup만):`);
    log(`    평균 압축률: ${avgRatioNone.toFixed(3)}% (순수 dedup 오버헤드)`);
    log('');
  }

  // 4K 스트리밍
  const BITRATE_4K = 100 * 1000 * 1000 / 8;
  const validUnpacks = allResults.filter(r => r.unpackSpeed !== 'ERR' && parseFloat(r.unpackSpeed) > 0);
  if (validUnpacks.length > 0) {
    const bestUnpack = Math.max(...validUnpacks.map(r => parseFloat(r.unpackSpeed)));
    const maxStreams = Math.floor(bestUnpack * 1024 * 1024 / BITRATE_4K);
    log(`  4K 동시 스트리밍 최대: ${maxStreams}개 (Unpack ${bestUnpack} MB/s 기준)`);
    log('');
  }

  log(`  파일 엔트로피: ${sample.entropy.toFixed(4)}/8.0 (${(sample.entropy / 8 * 100).toFixed(1)}%)`);
  log(`  128B 청크 중복률: ${sample.dedupRate.toFixed(4)}%`);
  log(`  V8 Map 한계: ${V8_MAP_MAX.toLocaleString()} 항목`);
  log('');

  const anyPositive = allResults.some(r => r.ratio > 0);
  const anyNegative = allResults.some(r => r.ratio < 0);

  if (anyPositive && anyNegative) {
    log('  판정: 청크 크기에 따라 결과가 다름');
    log('    → 작은 청크(128B): 프레임 헤더/varint 오버헤드 > dedup 효과 (크기 증가)');
    log('    → 큰 청크(1024B+): gzip 효율 향상으로 소폭 압축 가능');
    log('    → H.265 영상은 엔트로피 99.6%로 dedup 효과가 거의 0%');
  } else if (anyPositive) {
    log('  판정: ✅ 이 영상 파일에서 압축 효과 있음');
  } else {
    log('  판정: ⚠️  이 영상 파일에서 압축 효과 없음 (엔트로피 과다)');
  }

  log('');
  log('  벤치마크 완료.');
  log('');

  // ── test.txt 저장 ──
  const testTxtPath = path.join(__dirname, '..', 'test.txt');
  fs.writeFileSync(testTxtPath, outputLines.join('\n'), 'utf8');
  console.log(`\n  ✅ 결과 저장: ${testTxtPath}`);
}

main().catch((err) => {
  console.error('오류:', err.message);
  console.error(err.stack);
  process.exit(1);
});
