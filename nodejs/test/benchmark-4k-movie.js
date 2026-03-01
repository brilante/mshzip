#!/usr/bin/env node
'use strict';

/**
 * mshzip 4K Movie File Benchmark
 *
 * Measures compression effectiveness using real 4K movie files (.mp4, .mkv, .ts, .m2ts)
 * based on dictionary accumulation.
 *
 * Measurements:
 * - Pack/Unpack speed (MB/s)
 * - Compression ratio (dedup + gzip effect)
 * - Per-frame dictionary hit rate changes (accumulation effect visualization)
 * - Component-level analysis (video/audio/metadata patterns)
 * - Chunk size comparison (64B ~ 4096B)
 * - Comparison against random data
 *
 * Usage:
 *   node test/benchmark-4k-movie.js <movie-file-path> [options]
 *
 * Options:
 *   --max-size <MB>    Maximum read size (default: entire file)
 *   --chunk-test       Run chunk size comparison test
 *   --frame-analysis   Run per-frame dictionary accumulation analysis
 *   --all              Run all tests
 *
 * Examples:
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

// ─── Argument Parsing ────────────────────────────────────────

const args = process.argv.slice(2);
const filePath = args.find(a => !a.startsWith('--'));
const maxSizeMB = (() => {
  const idx = args.indexOf('--max-size');
  return idx !== -1 && args[idx + 1] ? parseInt(args[idx + 1], 10) : 0;
})();
const doChunkTest = args.includes('--chunk-test') || args.includes('--all');
const doFrameAnalysis = args.includes('--frame-analysis') || args.includes('--all');

if (!filePath) {
  console.log('Usage: node test/benchmark-4k-movie.js <movie-file-path> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --max-size <MB>    Maximum read size (default: entire file)');
  console.log('  --chunk-test       Chunk size comparison test');
  console.log('  --frame-analysis   Per-frame dictionary accumulation analysis');
  console.log('  --all              Run all tests');
  console.log('');
  console.log('Examples:');
  console.log('  node test/benchmark-4k-movie.js D:/Movies/sample-4k.mkv');
  console.log('  node test/benchmark-4k-movie.js D:/Movies/sample-4k.mp4 --max-size 500 --all');
  process.exit(0);
}

// ─── Utilities ───────────────────────────────────────────────

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

// ─── File Loading ────────────────────────────────────────────

function loadMovieFile(fpath, maxMB) {
  if (!fs.existsSync(fpath)) {
    console.error(`File not found: ${fpath}`);
    process.exit(1);
  }

  const stat = fs.statSync(fpath);
  const totalSize = stat.size;
  const readSize = maxMB > 0
    ? Math.min(maxMB * 1024 * 1024, totalSize)
    : totalSize;

  console.log('');
  console.log(`  File: ${path.basename(fpath)}`);
  console.log(`  Path: ${fpath}`);
  console.log(`  Total size: ${formatSize(totalSize)}`);
  if (maxMB > 0 && readSize < totalSize) {
    console.log(`  Read size: ${formatSize(readSize)} (--max-size ${maxMB}MB)`);
  }
  console.log(`  Extension: ${path.extname(fpath)}`);
  console.log('');

  // Read file into Buffer
  const fd = fs.openSync(fpath, 'r');
  const buf = Buffer.alloc(readSize);
  fs.readSync(fd, buf, 0, readSize, 0);
  fs.closeSync(fd);

  return { buf, totalSize, readSize };
}

// ─── 128B Chunk Deduplication Analysis ──────────────────────

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

  // Top 10 most repeated chunks
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

// ─── Part 1: Basic Compression Benchmark ─────────────────────

function runBasicBenchmark(data, label) {
  printBoxHeader(`Part 1: Basic Compression Benchmark — ${label}`);

  const chunkSize = 128;
  const origHash = sha256(data);

  console.log('');
  console.log(`  Input: ${formatSize(data.length)} | Chunk: ${chunkSize}B | SHA-256: ${origHash.slice(0, 16)}...`);
  console.log('');

  // 1) 128B chunk deduplication analysis (before compression)
  console.log('  [1] 128B Chunk Deduplication Analysis (before dedup)');
  printSeparator();
  const t0 = process.hrtime.bigint();
  const dupInfo = analyzeChunkDuplication(data, chunkSize);
  const analyzeMs = Number(process.hrtime.bigint() - t0) / 1e6;

  console.log(`  Total chunks:     ${dupInfo.totalChunks.toLocaleString()}`);
  console.log(`  Unique chunks:    ${dupInfo.uniqueChunks.toLocaleString()}`);
  console.log(`  Duplicate chunks: ${dupInfo.duplicateChunks.toLocaleString()}`);
  console.log(`  Dedup rate:       ${dupInfo.dedupRate}%`);
  console.log(`  Analysis time:    ${analyzeMs.toFixed(1)}ms`);

  if (dupInfo.topRepeated.length > 0) {
    console.log('');
    console.log('  Most repeated chunks (Top 10):');
    for (let i = 0; i < dupInfo.topRepeated.length; i++) {
      const [hash, info] = dupInfo.topRepeated[i];
      console.log(`    #${i + 1}: repeated ${info.count} times (first position: offset ${info.firstPos})`);
    }
  }

  // 2) Pack benchmark
  console.log('');
  console.log('  [2] Pack (Compression) Benchmark');
  printSeparator();

  const configs = [
    { codec: 'gzip', crc: false, label: 'gzip' },
    { codec: 'gzip', crc: true, label: 'gzip+CRC' },
    { codec: 'none', crc: false, label: 'none (dedup only)' },
  ];

  console.log(
    '  ' +
    'Codec'.padEnd(18) +
    'Original'.padStart(12) +
    'Compressed'.padStart(12) +
    'Ratio'.padStart(10) +
    'Pack(ms)'.padStart(12) +
    'Unpack(ms)'.padStart(12) +
    'Pack Speed'.padStart(12) +
    'Unpack Speed'.padStart(12) +
    'Integrity'.padStart(9)
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

  // 3) Comparison against random data
  console.log('');
  console.log('  [3] Comparison Against Random Data');
  printSeparator();

  const randomSize = Math.min(data.length, 10 * 1024 * 1024); // max 10MB for comparison
  const randomData = crypto.randomBytes(randomSize);
  const movieSlice = data.slice(0, randomSize);

  const randomPacked = pack(randomData, { chunkSize: 128, codec: 'gzip' });
  const moviePacked = pack(movieSlice, { chunkSize: 128, codec: 'gzip' });

  const randomRatio = ((1 - randomPacked.length / randomSize) * 100).toFixed(2);
  const movieRatio = ((1 - moviePacked.length / randomSize) * 100).toFixed(2);

  console.log(`  Comparison size: ${formatSize(randomSize)}`);
  console.log(`  Random data:     ${formatSize(randomPacked.length)} (${randomRatio}%)`);
  console.log(`  Movie data:      ${formatSize(moviePacked.length)} (${movieRatio}%)`);
  console.log(`  Difference:      ${(parseFloat(movieRatio) - parseFloat(randomRatio)).toFixed(2)}%p (movie compresses ${parseFloat(movieRatio) > parseFloat(randomRatio) ? 'better' : 'worse'})`);

  return results;
}

// ─── Part 2: Chunk Size Comparison ───────────────────────────

function runChunkSizeComparison(data, label) {
  printBoxHeader(`Part 2: Chunk Size Comparison — ${label}`);

  // Use partial data for large files
  const testSize = Math.min(data.length, 100 * 1024 * 1024); // max 100MB
  const testData = data.slice(0, testSize);

  const chunkSizes = [64, 128, 256, 512, 1024, 2048, 4096];

  console.log('');
  console.log(`  Test size: ${formatSize(testSize)}`);
  console.log('');
  console.log(
    '  ' +
    'Chunk'.padStart(8) +
    'Total Chunks'.padStart(14) +
    'Unique Chunks'.padStart(14) +
    'Dedup Rate'.padStart(10) +
    'Comp Size'.padStart(12) +
    'Ratio'.padStart(10) +
    'Pack(ms)'.padStart(12) +
    'Pack Speed'.padStart(12) +
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

  // Mermaid chart output
  console.log('');
  console.log('  [Mermaid Chart]');
  console.log('');
  console.log('```mermaid');
  console.log('xychart-beta');
  console.log(`  title "Compression Ratio by Chunk Size — ${label} (${formatSize(testSize)})"`);
  console.log(`  x-axis [${chartData.map(d => `"${d.chunkSize}B"`).join(', ')}]`);
  console.log('  y-axis "Compression Ratio (%)" -5 --> 15');
  console.log(`  bar [${chartData.map(d => d.ratio.toFixed(1)).join(', ')}]`);
  console.log('```');

  return chartData;
}

// ─── Part 3: Per-Frame Dictionary Accumulation Analysis ──────

function runFrameAccumulationAnalysis(data, label) {
  printBoxHeader(`Part 3: Per-Frame Dictionary Accumulation Analysis — ${label}`);

  const chunkSize = 128;
  const frameLimits = [
    { limit: 1 * 1024 * 1024, name: '1MB' },
    { limit: 4 * 1024 * 1024, name: '4MB' },
    { limit: 16 * 1024 * 1024, name: '16MB' },
    { limit: 64 * 1024 * 1024, name: '64MB' },
  ];

  // Analysis size (max 500MB)
  const testSize = Math.min(data.length, 500 * 1024 * 1024);
  const testData = data.slice(0, testSize);

  console.log('');
  console.log(`  Test size: ${formatSize(testSize)} | Chunk: ${chunkSize}B`);

  for (const fl of frameLimits) {
    console.log('');
    console.log(`  ── frameLimit: ${fl.name} ──`);
    console.log('');

    const packer = new Packer({
      chunkSize,
      frameLimit: fl.limit,
      codec: 'gzip',
    });

    // Manual frame build for per-frame detailed recording
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

    // Output: first 5 + last 5 frames (or all if fewer)
    const showCount = Math.min(frameStats.length, 10);
    const showFirst = Math.min(5, frameStats.length);
    const showLast = Math.min(5, frameStats.length - showFirst);

    console.log(
      '  ' +
      'Frame#'.padStart(8) +
      'Input'.padStart(10) +
      'Output'.padStart(10) +
      'Ratio'.padStart(8) +
      'Dict Size'.padStart(14) +
      'New Chunks'.padStart(12) +
      'Reused'.padStart(10) +
      'Hit Rate'.padStart(8)
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

    // First frames
    for (let i = 0; i < showFirst; i++) {
      printFrame(frameStats[i]);
    }

    if (frameStats.length > 10) {
      console.log('  ' + '    ... (middle omitted) ...'.padStart(40));
    }

    // Last frames
    if (frameStats.length > showFirst) {
      const startLast = Math.max(showFirst, frameStats.length - showLast);
      for (let i = startLast; i < frameStats.length; i++) {
        printFrame(frameStats[i]);
      }
    }

    printSeparator('─', 80);

    // Summary
    const totalInput = frameStats.reduce((s, f) => s + f.inputSize, 0);
    const totalOutput = frameStats.reduce((s, f) => s + f.outputSize, 0);
    const totalReuse = frameStats.reduce((s, f) => s + f.reuseCount, 0);
    const totalChunksAll = frameStats.reduce((s, f) => s + f.totalChunks, 0);
    const overallReuse = totalChunksAll > 0
      ? ((totalReuse / totalChunksAll) * 100).toFixed(2)
      : '0.00';
    const overallRatio = ((1 - totalOutput / totalInput) * 100).toFixed(2);

    // Dictionary accumulation effect: first frame vs last frame hit rate comparison
    const firstRate = frameStats[0].reuseRate;
    const lastRate = frameStats[frameStats.length - 1].reuseRate;

    console.log(`  Frame count:           ${frameStats.length}`);
    console.log(`  Total input:           ${formatSize(totalInput)}`);
    console.log(`  Total output:          ${formatSize(totalOutput)}`);
    console.log(`  Overall ratio:         ${overallRatio}%`);
    console.log(`  Overall chunk reuse:   ${overallReuse}% (${totalReuse.toLocaleString()} / ${totalChunksAll.toLocaleString()})`);
    console.log(`  Final dict size:       ${packer.dictChunks.length.toLocaleString()} unique chunks`);
    console.log(`  Accumulation effect:   First frame ${firstRate}% → Last frame ${lastRate}% (${lastRate > firstRate ? '▲' : '▼'}${Math.abs(lastRate - firstRate).toFixed(1)}%p)`);
    console.log(`  Processing time:       ${totalMs.toFixed(1)}ms (${formatSpeed(totalInput, totalMs)}MB/s)`);

    // Mermaid chart: per-frame hit rate change
    if (frameStats.length >= 4) {
      // Sampling (max 20 points)
      const maxPoints = 20;
      const step = Math.max(1, Math.floor(frameStats.length / maxPoints));
      const sampled = frameStats.filter((_, i) => i % step === 0 || i === frameStats.length - 1);
      // Deduplicate
      const seen = new Set();
      const uniqueSampled = sampled.filter(s => {
        if (seen.has(s.idx)) return false;
        seen.add(s.idx);
        return true;
      });

      console.log('');
      console.log('```mermaid');
      console.log('xychart-beta');
      console.log(`  title "Per-Frame Dictionary Hit Rate Change (frameLimit=${fl.name})"`);
      console.log(`  x-axis [${uniqueSampled.map(s => `"F${s.idx}"`).join(', ')}]`);
      console.log('  y-axis "Hit Rate (%)" 0 --> 100');
      console.log(`  line [${uniqueSampled.map(s => s.reuseRate.toFixed(1)).join(', ')}]`);
      console.log('```');
    }
  }
}

// ─── Part 4: Streaming Benchmark ─────────────────────────────

async function runStreamBenchmark(data, label) {
  printBoxHeader(`Part 4: Streaming (Transform Stream) Benchmark — ${label}`);

  // Streaming test size (max 200MB)
  const testSize = Math.min(data.length, 200 * 1024 * 1024);
  const testData = data.slice(0, testSize);
  const origHash = sha256(testData);

  console.log('');
  console.log(`  Test size: ${formatSize(testSize)}`);
  console.log('');

  const configs = [
    { chunkSize: 128, frameLimit: 16 * 1024 * 1024, label: '128B/16MB-frame' },
    { chunkSize: 128, frameLimit: 64 * 1024 * 1024, label: '128B/64MB-frame' },
    { chunkSize: 512, frameLimit: 64 * 1024 * 1024, label: '512B/64MB-frame' },
    { chunkSize: 1024, frameLimit: 64 * 1024 * 1024, label: '1024B/64MB-frame' },
  ];

  console.log(
    '  ' +
    'Config'.padEnd(22) +
    'Comp Size'.padStart(12) +
    'Ratio'.padStart(10) +
    'Pack(ms)'.padStart(12) +
    'Unpack(ms)'.padStart(12) +
    'Pack Speed'.padStart(12) +
    'Unpack Speed'.padStart(12) +
    'Integrity'.padStart(9)
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

// ─── Part 5: 4K Streaming Simulation ─────────────────────────

function run4kStreamSimulation(data, label) {
  printBoxHeader(`Part 5: 4K Streaming Simulation — ${label}`);

  const chunkSize = 128;

  // 4K stream baseline
  const BITRATE_4K_MBPS = 100; // Mbps
  const BITRATE_4K_BYTES = BITRATE_4K_MBPS * 1000 * 1000 / 8; // bytes/sec

  // Pack result
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

  // Extrapolation based on read size
  const fullFileSize = data.length;
  const fullPackedSize = packed.length;

  console.log('');
  console.log('  ── Measurement Results ──');
  console.log(`  Original:     ${formatSize(data.length)}`);
  console.log(`  Compressed:   ${formatSize(packed.length)}`);
  console.log(`  Ratio:        ${ratio}%`);
  console.log(`  Saved:        ${formatSize(Math.abs(savedBytes))} ${savedBytes > 0 ? 'reduction' : 'increase'}`);
  console.log(`  Pack Speed:   ${formatSpeed(data.length, packMs)} MB/s`);
  console.log(`  Unpack Speed: ${formatSpeed(data.length, unpackMs)} MB/s`);
  console.log('');

  console.log('  ── 4K Streaming Concurrent Playback Calculation ──');
  console.log(`  4K stream bitrate: ${BITRATE_4K_MBPS} Mbps (${formatSize(BITRATE_4K_BYTES)}/s)`);
  console.log('');

  const maxPackStreams = Math.floor(packBytesPerSec / BITRATE_4K_BYTES);
  const maxUnpackStreams = Math.floor(unpackBytesPerSec / BITRATE_4K_BYTES);

  console.log(`  Pack   throughput: ${formatSpeed(data.length, packMs)} MB/s → can handle ${maxPackStreams} concurrent streams`);
  console.log(`  Unpack throughput: ${formatSpeed(data.length, unpackMs)} MB/s → can handle ${maxUnpackStreams} concurrent streams`);
  console.log('');

  // Network transfer simulation
  console.log('  ── Transfer Time Comparison by Network ──');
  console.log('');
  const networks = [
    { name: '100Mbps', bps: 100 * 1000 * 1000 / 8 },
    { name: '1Gbps', bps: 1000 * 1000 * 1000 / 8 },
    { name: '10Gbps', bps: 10000 * 1000 * 1000 / 8 },
  ];

  console.log(
    '  ' +
    'Network'.padEnd(12) +
    'Original'.padStart(14) +
    'mshzip'.padStart(14) +
    'Time Saved'.padStart(14) +
    'Savings'.padStart(8)
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

// ─── Part 6: Byte Pattern Heatmap ────────────────────────────

function runBytePatternAnalysis(data, label) {
  printBoxHeader(`Part 6: Byte Pattern Analysis — ${label}`);

  const sampleSize = Math.min(data.length, 50 * 1024 * 1024);
  const sample = data.slice(0, sampleSize);

  console.log('');
  console.log(`  Analysis size: ${formatSize(sampleSize)}`);
  console.log('');

  // 1) Byte value distribution
  const byteFreq = new Uint32Array(256);
  for (let i = 0; i < sample.length; i++) {
    byteFreq[sample[i]]++;
  }

  // Entropy calculation
  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (byteFreq[i] > 0) {
      const p = byteFreq[i] / sampleSize;
      entropy -= p * Math.log2(p);
    }
  }

  // 0x00 byte ratio
  const zeroRate = ((byteFreq[0] / sampleSize) * 100).toFixed(2);

  // Unique byte value count
  const uniqueBytes = byteFreq.filter(f => f > 0).length;

  console.log(`  Entropy:           ${entropy.toFixed(4)} bits/byte (max 8.0)`);
  console.log(`  Entropy ratio:     ${(entropy / 8 * 100).toFixed(1)}% (higher = closer to random)`);
  console.log(`  Unique byte values: ${uniqueBytes}/256`);
  console.log(`  0x00 ratio:        ${zeroRate}%`);
  console.log('');

  // 2) Consecutive identical byte sequences (RLE potential)
  let runCount = 0;
  let totalRunLength = 0;
  let maxRun = 0;
  let i = 0;
  while (i < sample.length) {
    let runLen = 1;
    while (i + runLen < sample.length && sample[i + runLen] === sample[i]) {
      runLen++;
    }
    if (runLen >= 128) { // runs longer than chunk size
      runCount++;
      totalRunLength += runLen;
      if (runLen > maxRun) maxRun = runLen;
    }
    i += runLen;
  }

  console.log('  [Consecutive Identical Byte Sequences (128B or longer)]');
  console.log(`  Found:           ${runCount.toLocaleString()}`);
  console.log(`  Total length:    ${formatSize(totalRunLength)}`);
  console.log(`  Max length:      ${formatSize(maxRun)}`);
  console.log(`  Ratio of total:  ${((totalRunLength / sampleSize) * 100).toFixed(3)}%`);
  console.log('');

  // 3) Repeated 4-byte patterns (signature detection)
  console.log('  [Most Frequent 4-Byte Patterns Top 10]');
  const pattern4Map = new Map();
  const step4 = Math.max(1, Math.floor(sampleSize / 1000000)); // sampling
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
    console.log(`    0x${hex} (${bytes}): ${count.toLocaleString()} times`);
  }

  return { entropy, zeroRate: parseFloat(zeroRate), uniqueBytes };
}

// ─── Summary ─────────────────────────────────────────────────

function printSummary(data, basicResults) {
  printBoxHeader('Summary');

  const gzipResult = basicResults.find(r => r.codec === 'gzip');
  if (!gzipResult) return;

  console.log('');
  console.log(`  ┌───────────────────────────────────────────────┐`);
  console.log(`  │  Original size:  ${formatSize(data.length).padEnd(30)}│`);
  console.log(`  │  Compressed:     ${formatSize(gzipResult.packed).padEnd(30)}│`);
  console.log(`  │  Ratio:          ${(gzipResult.ratio + '%').padEnd(30)}│`);
  console.log(`  │  Pack speed:     ${(gzipResult.packSpeed + ' MB/s').padEnd(30)}│`);
  console.log(`  │  Unpack speed:   ${(gzipResult.unpackSpeed + ' MB/s').padEnd(30)}│`);
  console.log(`  │  Integrity:      ${(gzipResult.ok ? '✅ PASS' : '❌ FAIL').padEnd(30)}│`);
  console.log(`  └───────────────────────────────────────────────┘`);
  console.log('');

  if (gzipResult.ratio > 0) {
    console.log(`  ✅ Achieved ${gzipResult.ratio}% compression on movie data`);
    console.log(`     → Dictionary accumulation-based dedup is effective even on already-compressed data`);
  } else {
    console.log(`  ⚠️  ${Math.abs(gzipResult.ratio)}% overhead on movie data`);
    console.log(`     → Dedup effect does not offset frame header/sequence overhead`);
  }
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔' + '═'.repeat(110) + '╗');
  console.log('║  mshzip 4K Movie File Benchmark' + ' '.repeat(78) + '║');
  console.log('╚' + '═'.repeat(110) + '╝');

  // Load file
  const { buf, totalSize, readSize } = loadMovieFile(filePath, maxSizeMB);

  // Part 1: Basic benchmark
  const basicResults = runBasicBenchmark(buf, path.basename(filePath));

  // Part 2: Chunk size comparison (optional)
  if (doChunkTest) {
    runChunkSizeComparison(buf, path.basename(filePath));
  }

  // Part 3: Per-frame dictionary accumulation analysis (optional)
  if (doFrameAnalysis) {
    runFrameAccumulationAnalysis(buf, path.basename(filePath));
  }

  // Part 4: Streaming benchmark
  await runStreamBenchmark(buf, path.basename(filePath));

  // Part 5: 4K streaming simulation
  run4kStreamSimulation(buf, path.basename(filePath));

  // Part 6: Byte pattern analysis
  runBytePatternAnalysis(buf, path.basename(filePath));

  // Summary
  printSummary(buf, basicResults);

  console.log('');
  console.log('  Benchmark complete.');
  console.log('');
}

main().catch((err) => {
  console.error('Benchmark error:', err.message);
  process.exit(1);
});
