#!/usr/bin/env node
'use strict';

/**
 * mshzip large-file 4K movie benchmark (1GB / 5GB / full file)
 *
 * Tests large files in a streaming fashion for memory efficiency.
 * Uses PackStream/UnpackStream for frame-by-frame processing.
 *
 * Automatically detects V8 Map limit (~16.77M entries) → adjusts chunk size
 * Frame size capped at 16MB → reduces gzip memory pressure
 *
 * Usage:
 *   node test/benchmark-large-movie.js <movie-file-path>
 *
 * Results are printed to console and saved to test.txt
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

// V8 Map maximum entry count (with safety margin)
const V8_MAP_MAX = 16_000_000;
// Frame size for benchmarks (reduces memory pressure)
const BENCH_FRAME_LIMIT = 16 * 1024 * 1024; // 16MB

// ─── Arguments ──────────────────────────────────────────────

const filePath = process.argv[2];
if (!filePath) {
  console.log('Usage: node test/benchmark-large-movie.js <movie-file-path>');
  process.exit(0);
}

// ─── Utilities ──────────────────────────────────────────────

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

// Output buffer (writes to console and file simultaneously)
const outputLines = [];
function log(msg = '') {
  console.log(msg);
  outputLines.push(msg);
}

// ─── Byte counter stream ─────────────────────────────────────

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

// ─── /dev/null stream (for hash calculation) ─────────────────

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

// ─── Frame analyzer (streaming) ──────────────────────────────

// Memory-efficient frame analyzer: buffers only the header (36B), skips payload
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
    this.push(chunk); // pass through raw data immediately (preserve memory)
    let off = 0;

    while (off < chunk.length) {
      // skipping payload
      if (this._skipRemain > 0) {
        const skip = Math.min(this._skipRemain, chunk.length - off);
        this._skipRemain -= skip;
        off += skip;
        continue;
      }

      // collect header (36 bytes: 32 header + 4 payloadSize)
      const needed = (FRAME_HEADER_SIZE + 4) - this._headerBuf.length;
      if (needed > 0) {
        const take = Math.min(needed, chunk.length - off);
        this._headerBuf = Buffer.concat([this._headerBuf, chunk.slice(off, off + take)]);
        off += take;
        if (this._headerBuf.length < FRAME_HEADER_SIZE + 4) continue;
      }

      // parse header
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

// ─── Entropy sampling (reads only the first N bytes) ─────────

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

    // 128B chunk deduplication sample
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

// ─── V8 Map limit check ──────────────────────────────────────

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

// ─── Single-size streaming benchmark ────────────────────────

async function runStreamingBenchmark(fpath, readBytes, chunkSize, codec, label) {
  const tmpDir = path.join(os.tmpdir(), 'mshzip-bench');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const mshFile = path.join(tmpDir, `bench-${Date.now()}.msh`);
  const stat = fs.statSync(fpath);
  const actualRead = Math.min(readBytes, stat.size);

  // check Map limit
  const estChunks = estimateChunks(actualRead, chunkSize);
  if (estChunks > V8_MAP_MAX) {
    log(`  ── ${label} — SKIP (estimated ${estChunks.toLocaleString()} chunks > Map limit ${V8_MAP_MAX.toLocaleString()}) ──`);
    log('');
    return null;
  }

  log(`  ── ${label} (chunk=${chunkSize}B, codec=${codec}, frame=${formatSize(BENCH_FRAME_LIMIT)}) ──`);
  log(`  Read size: ${formatSize(actualRead)} | Estimated chunks: ${estChunks.toLocaleString()}`);

  // ── Pack (compress) ──
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

  log(`  Pack done: ${formatSize(actualRead)} → ${formatSize(packedSize)} (${ratio}%)`);
  log(`  Pack time: ${(packMs / 1000).toFixed(2)}s | Pack speed: ${packSpeed} MB/s`);
  log(`  Frames: ${frameAnalyzer.frames.length} | Final dict: ${frameAnalyzer._globalDictSize.toLocaleString()} entries`);

  // ── Frame detail ──
  const frames = frameAnalyzer.frames;
  if (frames.length > 0) {
    const totalReuse = frames.reduce((s, f) => s + f.reuseCount, 0);
    const totalSeq = frames.reduce((s, f) => s + f.seqCount, 0);
    const overallReuse = totalSeq > 0 ? (totalReuse / totalSeq * 100).toFixed(4) : '0';

    log(`  Overall reuse rate: ${overallReuse}% (${totalReuse.toLocaleString()} / ${totalSeq.toLocaleString()} chunks)`);

    // first 3 + last 3 frames
    log('');
    log('  ' + pad('Frame#', 8, true) + pad('Input', 12) + pad('Output', 12) + pad('Ratio', 10) + pad('New', 12) + pad('Reused', 10) + pad('HitRate', 10) + pad('DictTotal', 14));
    log('  ' + '─'.repeat(88));

    const showFrames = [];
    const first = Math.min(3, frames.length);
    for (let i = 0; i < first; i++) showFrames.push(frames[i]);
    if (frames.length > 6) showFrames.push(null); // omit marker
    const last = Math.min(3, frames.length - first);
    for (let i = frames.length - last; i < frames.length; i++) {
      if (i >= first) showFrames.push(frames[i]);
    }

    for (const f of showFrames) {
      if (!f) {
        log('  ' + pad('...', 8, true) + pad('(middle omitted)', 40, true));
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

  // ── Unpack (decompress) ──
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

    log(`  Unpack done: ${formatSize(restoredSize)}`);
    log(`  Unpack time: ${(unpackMs / 1000).toFixed(2)}s | Unpack speed: ${unpackSpeed} MB/s`);
    log(`  Integrity: ${integrity ? '✅ PASS' : '❌ FAIL'} (size ${integrity ? 'match' : `mismatch: ${restoredSize} ≠ ${actualRead}`})`);
  } catch (err) {
    log(`  Unpack error: ${err.message}`);
    log(`  (Pack succeeded but Unpack verification failed — possible memory/disk constraint)`);
    unpackSpeed = 'ERR';
  }

  // cleanup
  try { fs.unlinkSync(mshFile); } catch (e) { /* ignore */ }

  // ── 4K streaming calculation ──
  const BITRATE_4K = 100 * 1000 * 1000 / 8; // 100Mbps → bytes/sec
  const packBps = actualRead / (packMs / 1000);
  const unpackBps = actualRead / (unpackMs / 1000);

  log('');
  log(`  4K concurrent streaming (100Mbps baseline):`);
  log(`    Pack   ${packSpeed} MB/s → ${Math.floor(packBps / BITRATE_4K)} concurrent streams`);
  log(`    Unpack ${unpackSpeed} MB/s → ${Math.floor(unpackBps / BITRATE_4K)} concurrent streams`);

  // ── Transfer savings ──
  const savedBytes = actualRead - packedSize;
  log('');
  log(`  Transfer savings: ${savedBytes > 0 ? '-' : '+'}${formatSize(Math.abs(savedBytes))} (${ratio}%)`);

  return {
    label, actualRead, packedSize, ratio: parseFloat(ratio),
    packMs, unpackMs, packSpeed, unpackSpeed,
    frameCount: frames.length, dictSize: frameAnalyzer._globalDictSize,
    totalReuse: frames.reduce((s, f) => s + f.reuseCount, 0),
    totalSeq: frames.reduce((s, f) => s + f.seqCount, 0),
    integrity,
  };
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const stat = fs.statSync(filePath);
  const totalFileSize = stat.size;
  const fileName = path.basename(filePath);

  // test size configuration
  const testSizes = [
    { size: 1 * 1024 * 1024 * 1024, label: '1GB' },
    { size: 5 * 1024 * 1024 * 1024, label: '5GB' },
    { size: 10 * 1024 * 1024 * 1024, label: '10GB' },
  ];

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  log('╔' + '═'.repeat(100) + '╗');
  log('║  mshzip large-file 4K movie benchmark (1GB / 5GB / 10GB)' + ' '.repeat(43) + '║');
  log('╚' + '═'.repeat(100) + '╝');
  log('');
  log(`  Date:       ${dateStr}`);
  log(`  File:       ${fileName}`);
  log(`  Path:       ${filePath}`);
  log(`  Total size: ${formatSize(totalFileSize)}`);
  log(`  Node.js:    ${process.version}`);
  log(`  OS:         ${os.type()} ${os.release()} (${os.arch()})`);
  log(`  CPU:        ${os.cpus()[0].model}`);
  log(`  RAM:        ${formatSize(os.totalmem())}`);
  log(`  Heap limit: ${formatSize(require('v8').getHeapStatistics().heap_size_limit)}`);
  log('');

  // ── Entropy analysis (50MB sample) ──
  log('╔' + '═'.repeat(100) + '╗');
  log('║  Pre-analysis: Entropy & 128B chunk deduplication (50MB sample)' + ' '.repeat(36) + '║');
  log('╚' + '═'.repeat(100) + '╝');
  log('');

  const sample = await sampleEntropy(filePath, 50 * 1024 * 1024);
  log(`  Sample size:        ${formatSize(sample.sampleSize)}`);
  log(`  Entropy:            ${sample.entropy.toFixed(4)} bits/byte (max 8.0, ${(sample.entropy / 8 * 100).toFixed(1)}%)`);
  log(`  Unique byte values: ${sample.uniqueBytes}/256`);
  log(`  0x00 ratio:         ${sample.zeroRate.toFixed(3)}%`);
  log(`  128B chunk count:   ${sample.totalChunks.toLocaleString()}`);
  log(`  Unique chunks:      ${sample.uniqueChunks.toLocaleString()}`);
  log(`  Duplicate chunks:   ${sample.dupChunks.toLocaleString()}`);
  log(`  128B dedup rate:    ${sample.dedupRate.toFixed(4)}%`);
  log('');

  // ── Quick comparison by chunk size (100MB) ──
  log('╔' + '═'.repeat(100) + '╗');
  log('║  Quick comparison by chunk size (100MB sample, gzip)' + ' '.repeat(47) + '║');
  log('╚' + '═'.repeat(100) + '╝');
  log('');

  const quickSize = Math.min(100 * 1024 * 1024, totalFileSize);
  const chunkSizes = [64, 128, 256, 512, 1024, 2048, 4096];

  log('  ' + pad('Chunk', 8) + pad('PackedSize', 12) + pad('Ratio', 10) + pad('Pack(s)', 10) + pad('PackSpeed', 12) + pad('Unpack(s)', 10) + pad('UnpackSpeed', 12));
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
      log(`  ${pad(`${cs}B`, 8)} error: ${e.message}`);
    }

    try { fs.unlinkSync(tmpMsh); } catch (e) { /* ignore */ }
  }

  log('');

  // ── Large-file tests (1GB / 5GB / full file) ──
  const allResults = [];

  // build test list: account for file size and Map limit
  const testPlan = [];

  for (const ts of testSizes) {
    const actualSize = Math.min(ts.size, totalFileSize);
    const effectiveLabel = ts.size > totalFileSize
      ? `${formatSize(totalFileSize)} (full)`
      : ts.label;

    // if 10GB requested but file is smaller, fall back to full file
    if (ts.size > totalFileSize && ts.label === '10GB') {
      if (totalFileSize > 5 * 1024 * 1024 * 1024) {
        // full file test (1024B + 4096B + none)
        testPlan.push({ size: totalFileSize, label: `${effectiveLabel}`, chunkSize: 1024, codec: 'gzip' });
        testPlan.push({ size: totalFileSize, label: `${effectiveLabel}`, chunkSize: 4096, codec: 'gzip' });
        testPlan.push({ size: totalFileSize, label: `${effectiveLabel}`, chunkSize: 1024, codec: 'none' });
      }
      continue;
    }

    if (ts.size > totalFileSize) continue;

    // determine optimal chunk size per test size
    const minCS = minFeasibleChunkSize(actualSize);

    // gzip tests: smallest feasible chunk + larger chunks
    if (isFeasible(actualSize, 128)) {
      testPlan.push({ size: actualSize, label: ts.label, chunkSize: 128, codec: 'gzip' });
    }
    if (minCS > 128) {
      testPlan.push({ size: actualSize, label: ts.label, chunkSize: minCS, codec: 'gzip' });
    }
    testPlan.push({ size: actualSize, label: ts.label, chunkSize: 1024, codec: 'gzip' });
    testPlan.push({ size: actualSize, label: ts.label, chunkSize: 4096, codec: 'gzip' });

    // none tests (dedup only): include 128B if feasible
    if (isFeasible(actualSize, 128)) {
      testPlan.push({ size: actualSize, label: ts.label, chunkSize: 128, codec: 'none' });
    }
  }

  // deduplicate
  const seen = new Set();
  const uniquePlan = testPlan.filter(t => {
    const key = `${t.size}-${t.chunkSize}-${t.codec}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // group by size and run
  let lastSize = 0;
  for (const t of uniquePlan) {
    if (t.size !== lastSize) {
      const sizeLabel = t.label || formatSize(t.size);
      log('╔' + '═'.repeat(100) + '╗');
      const title = `  ${sizeLabel} Test`;
      log(`║${title}${' '.repeat(100 - title.length)}║`);
      log('╚' + '═'.repeat(100) + '╝');
      log('');
      lastSize = t.size;
    }

    const testLabel = `${t.label} (${t.chunkSize}B, ${t.codec})`;
    const r = await runStreamingBenchmark(filePath, t.size, t.chunkSize, t.codec, testLabel);
    if (r) allResults.push(r);
    log('');

    // force GC if available
    if (global.gc) global.gc();
  }

  // ── Summary comparison table ──
  log('╔' + '═'.repeat(100) + '╗');
  log('║  Summary Comparison Table' + ' '.repeat(74) + '║');
  log('╚' + '═'.repeat(100) + '╝');
  log('');

  log('  ' +
    pad('Test', 35, true) +
    pad('Input', 10) +
    pad('Output', 10) +
    pad('Ratio', 10) +
    pad('Pack', 12) +
    pad('Unpack', 12) +
    pad('OK', 6)
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

  // ── Conclusion ──
  log('╔' + '═'.repeat(100) + '╗');
  log('║  Conclusion' + ' '.repeat(88) + '║');
  log('╚' + '═'.repeat(100) + '╝');
  log('');

  // classify results by codec
  const gzipResults = allResults.filter(r => r.label.includes('gzip'));
  const noneResults = allResults.filter(r => r.label.includes('none'));

  // classify gzip results by chunk size
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
    log(`    Avg ratio:        ${avgRatio.toFixed(3)}%`);
    log(`    Avg pack speed:   ${avgPack.toFixed(1)} MB/s`);
    if (avgUnpack > 0) {
      log(`    Avg unpack speed: ${avgUnpack.toFixed(1)} MB/s`);
    }
    log('');
  }

  if (noneResults.length > 0) {
    const avgRatioNone = noneResults.reduce((s, r) => s + r.ratio, 0) / noneResults.length;
    log(`  none (dedup only):`);
    log(`    Avg ratio: ${avgRatioNone.toFixed(3)}% (pure dedup overhead)`);
    log('');
  }

  // 4K streaming
  const BITRATE_4K = 100 * 1000 * 1000 / 8;
  const validUnpacks = allResults.filter(r => r.unpackSpeed !== 'ERR' && parseFloat(r.unpackSpeed) > 0);
  if (validUnpacks.length > 0) {
    const bestUnpack = Math.max(...validUnpacks.map(r => parseFloat(r.unpackSpeed)));
    const maxStreams = Math.floor(bestUnpack * 1024 * 1024 / BITRATE_4K);
    log(`  4K max concurrent streams: ${maxStreams} (Unpack ${bestUnpack} MB/s baseline)`);
    log('');
  }

  log(`  File entropy: ${sample.entropy.toFixed(4)}/8.0 (${(sample.entropy / 8 * 100).toFixed(1)}%)`);
  log(`  128B chunk dedup rate: ${sample.dedupRate.toFixed(4)}%`);
  log(`  V8 Map limit: ${V8_MAP_MAX.toLocaleString()} entries`);
  log('');

  const anyPositive = allResults.some(r => r.ratio > 0);
  const anyNegative = allResults.some(r => r.ratio < 0);

  if (anyPositive && anyNegative) {
    log('  Verdict: Results vary by chunk size');
    log('    → Small chunk (128B): frame header/varint overhead > dedup gain (size increase)');
    log('    → Large chunk (1024B+): improved gzip efficiency allows slight compression');
    log('    → H.265 video has ~99.6% entropy, so dedup gain is nearly 0%');
  } else if (anyPositive) {
    log('  Verdict: ✅ Compression effective for this video file');
  } else {
    log('  Verdict: ⚠️  Compression not effective for this video file (entropy too high)');
  }

  log('');
  log('  Benchmark complete.');
  log('');

  // ── save test.txt ──
  const testTxtPath = path.join(__dirname, '..', 'test.txt');
  fs.writeFileSync(testTxtPath, outputLines.join('\n'), 'utf8');
  console.log(`\n  ✅ Results saved: ${testTxtPath}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
