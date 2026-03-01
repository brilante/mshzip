#!/usr/bin/env node
'use strict';

/**
 * mshzip comprehensive benchmark test
 *
 * 100+ test cases:
 * - 7 data types x 7 sizes x 6 chunks x 2 codecs + CRC32 option
 * - Streaming (stdin/stdout) pipeline tests
 * - Multi-frame tests (frameLimit split)
 * - Edge cases (empty input, 1 byte, chunk boundary)
 * - pack->unpack round-trip integrity SHA-256 verification
 */

const crypto = require('crypto');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { pack, unpack, Packer, Unpacker } = require('../lib');

const CLI = path.join(__dirname, '..', 'cli.js');
const TMP_DIR = path.join(__dirname, '..', '.tmp-bench');

// ─── Data generators ──────────────────────────────────────────

function generateRepeatPattern(size) {
  const pattern = Buffer.from('mshzip compression test pattern data. '.repeat(10));
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i += pattern.length) {
    pattern.copy(buf, i, 0, Math.min(pattern.length, size - i));
  }
  return buf;
}

function generateRandom(size) {
  return crypto.randomBytes(size);
}

function generateZeroes(size) {
  return Buffer.alloc(size, 0);
}

function generateSingleByte(size) {
  return Buffer.alloc(size, 0x41); // 'A' repeat
}

function generateMixedText(size) {
  const words = [
    'hello', 'world', 'test', 'data', 'chunk', 'dedup',
    'compress', 'stream', 'frame', 'index', 'dictionary',
    'algorithm', 'binary', 'encode', 'decode', 'buffer',
  ];
  const parts = [];
  let total = 0;
  while (total < size) {
    const word = words[Math.floor(Math.random() * words.length)];
    const line = `${word} ${Math.random().toString(36).slice(2, 8)}\n`;
    parts.push(line);
    total += line.length;
  }
  return Buffer.from(parts.join('').slice(0, size));
}

function generateLogLike(size) {
  const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
  const modules = ['server', 'auth', 'db', 'api', 'cache'];
  const parts = [];
  let total = 0;
  let ts = Date.now();
  while (total < size) {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const mod = modules[Math.floor(Math.random() * modules.length)];
    const line = `[${new Date(ts).toISOString()}] ${level} [${mod}] Request processed id=${Math.floor(Math.random() * 10000)} duration=${Math.floor(Math.random() * 500)}ms\n`;
    parts.push(line);
    total += line.length;
    ts += Math.floor(Math.random() * 100);
  }
  return Buffer.from(parts.join('').slice(0, size));
}

function generateJsonLike(size) {
  const parts = [];
  let total = 0;
  let id = 1;
  while (total < size) {
    const obj = `{"id":${id},"name":"user_${id}","email":"user${id}@test.com","active":${id % 3 === 0},"score":${Math.floor(Math.random() * 100)}}\n`;
    parts.push(obj);
    total += obj.length;
    id++;
  }
  return Buffer.from(parts.join('').slice(0, size));
}

function generateCsvLike(size) {
  const parts = ['timestamp,level,module,message,duration\n'];
  let total = parts[0].length;
  let ts = Date.now();
  while (total < size) {
    const line = `${new Date(ts).toISOString()},INFO,api,request processed,${Math.floor(Math.random() * 500)}\n`;
    parts.push(line);
    total += line.length;
    ts += 1000;
  }
  return Buffer.from(parts.join('').slice(0, size));
}

function generateBinaryStruct(size) {
  // Struct repeat: 4-byte ID + 8-byte timestamp + 4-byte value = 16-byte unit
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i += 16) {
    const remain = Math.min(16, size - i);
    if (remain >= 4) buf.writeUInt32LE(Math.floor(i / 16) % 1000, i);
    if (remain >= 12) buf.writeDoubleBE(Date.now(), i + 4);
    if (remain >= 16) buf.writeUInt32LE(Math.floor(Math.random() * 10000), i + 12);
  }
  return buf;
}

// ─── Utilities ───────────────────────────────────────────────

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`;
}

function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function cleanTmpDir() {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
}

// ─── Table output ────────────────────────────────────────────

function printHeader() {
  console.log(
    '  ' +
    '#'.padStart(4) +
    'Data type'.padEnd(22) +
    'Original'.padStart(10) +
    'Chunk'.padStart(8) +
    'Codec'.padStart(6) +
    'Compressed'.padStart(10) +
    'Ratio'.padStart(8) +
    'Pack'.padStart(9) +
    'Unpack'.padStart(9) +
    'Speed'.padStart(12) +
    'Result'.padStart(4)
  );
  console.log('  ' + '─'.repeat(100));
}

function printRow(idx, label, size, chunkSize, codec, compSize, ratio, packMs, unpackMs, speed, ok) {
  console.log(
    '  ' +
    String(idx).padStart(4) +
    label.padEnd(22) +
    formatSize(size).padStart(10) +
    `${chunkSize}B`.padStart(8) +
    codec.padStart(6) +
    formatSize(compSize).padStart(10) +
    `${ratio}%`.padStart(8) +
    `${packMs.toFixed(1)}ms`.padStart(9) +
    `${unpackMs.toFixed(1)}ms`.padStart(9) +
    `${speed}MB/s`.padStart(12) +
    (ok ? '  ✅' : '  ❌')
  );
}

// ═══════════════════════════════════════════════════════════════
// Part 1: Library API benchmark (100+)
// ═══════════════════════════════════════════════════════════════

function runLibraryBenchmark() {
  console.log('');
  console.log('╔' + '═'.repeat(100) + '╗');
  console.log('║  Part 1: Library API benchmark' + ' '.repeat(69) + '║');
  console.log('╚' + '═'.repeat(100) + '╝');

  const generators = [
    ['repeat', generateRepeatPattern],
    ['zeroes', generateZeroes],
    ['singlebyte', generateSingleByte],
    ['loglike', generateLogLike],
    ['JSON', generateJsonLike],
    ['CSV', generateCsvLike],
    ['mixedtext', generateMixedText],
    ['binstruct', generateBinaryStruct],
    ['random', generateRandom],
  ];

  const sizes = [
    ['1B', 1],
    ['7B', 7],
    ['64B', 64],
    ['512B', 512],
    ['1KB', 1024],
    ['4KB', 4096],
    ['10KB', 10240],
    ['64KB', 65536],
    ['100KB', 102400],
    ['256KB', 262144],
    ['512KB', 524288],
    ['1MB', 1048576],
    ['5MB', 5242880],
    ['10MB', 10485760],
    ['50MB', 52428800],
  ];

  const chunkSizes = [8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
  const codecs = ['gzip', 'none'];

  // Generate test matrix (100+)
  const tests = [];

  // 1. All data types x key sizes (128B chunk, gzip)
  for (const [gName, gFn] of generators) {
    for (const [sName, sSize] of sizes) {
      if (sSize < 8) continue; // Skip too small sizes from base set
      if (sSize > 10485760 && gName === 'random') continue; // Skip random 50MB (slow)
      tests.push([`${gName} ${sName}`, sSize, gFn, 128, 'gzip', false]);
    }
  }

  // 2. Chunk size variations (repeat 1MB)
  for (const cs of chunkSizes) {
    tests.push([`repeat 1MB`, 1048576, generateRepeatPattern, cs, 'gzip', false]);
  }

  // 3. Chunk size variations (loglike 1MB)
  for (const cs of [64, 128, 256, 512, 1024, 2048]) {
    tests.push([`loglike 1MB`, 1048576, generateLogLike, cs, 'gzip', false]);
  }

  // 4. Codec none comparison (main types 1MB)
  for (const [gName, gFn] of [['repeat', generateRepeatPattern], ['loglike', generateLogLike], ['random', generateRandom]]) {
    tests.push([`${gName} 1MB`, 1048576, gFn, 128, 'none', false]);
    tests.push([`${gName} 1MB`, 1048576, gFn, 1024, 'none', false]);
  }

  // 5. CRC32 enabled tests
  for (const [gName, gFn] of [['repeat', generateRepeatPattern], ['loglike', generateLogLike]]) {
    tests.push([`${gName} 1MB +CRC`, 1048576, gFn, 128, 'gzip', true]);
  }

  // 6. Large tests (50MB/100MB)
  tests.push(['repeat 50MB', 52428800, generateRepeatPattern, 1024, 'gzip', false]);
  tests.push(['repeat 100MB', 104857600, generateRepeatPattern, 1024, 'gzip', false]);
  tests.push(['loglike 50MB', 52428800, generateLogLike, 1024, 'gzip', false]);

  // 7. Edge cases
  tests.push(['empty 0B', 0, () => Buffer.alloc(0), 128, 'gzip', false]);
  tests.push(['1byte', 1, () => Buffer.from([0x42]), 8, 'gzip', false]);
  tests.push(['chunkbound 128B', 128, generateRepeatPattern, 128, 'gzip', false]);
  tests.push(['chunkbound 256B', 256, generateRepeatPattern, 128, 'gzip', false]);
  tests.push(['chunk-1 127B', 127, generateRepeatPattern, 128, 'gzip', false]);
  tests.push(['chunk+1 129B', 129, generateRepeatPattern, 128, 'gzip', false]);

  // Deduplicate (same combination)
  const seen = new Set();
  const uniqueTests = [];
  for (const t of tests) {
    const key = `${t[0]}|${t[1]}|${t[3]}|${t[4]}|${t[5]}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueTests.push(t);
    }
  }

  console.log(`\n  Total ${uniqueTests.length} tests\n`);
  printHeader();

  const results = [];
  let passCount = 0;
  let failCount = 0;

  for (let i = 0; i < uniqueTests.length; i++) {
    const [name, size, gen, chunkSize, codec, crc] = uniqueTests[i];
    const data = gen(size);
    const origHash = sha256(data);

    const t0 = process.hrtime.bigint();
    const packed = pack(data, { chunkSize, codec, crc });
    const t1 = process.hrtime.bigint();

    const restored = unpack(packed);
    const t2 = process.hrtime.bigint();

    const restoredHash = sha256(restored);
    const ok = origHash === restoredHash && data.length === restored.length;

    const packMs = Number(t1 - t0) / 1e6;
    const unpackMs = Number(t2 - t1) / 1e6;
    const ratio = size > 0 ? ((1 - packed.length / size) * 100).toFixed(1) : '0.0';
    const speed = size > 0 && packMs > 0 ? ((size / 1024 / 1024) / (packMs / 1000)).toFixed(1) : '∞';

    if (ok) passCount++; else failCount++;

    const label = `${name}(${chunkSize}B${crc ? ',crc' : ''})`;
    printRow(i + 1, label, size, chunkSize, codec, packed.length, ratio, packMs, unpackMs, speed, ok);

    results.push({
      name: label, codec, size, chunkSize, crc,
      compSize: packed.length, ratio: parseFloat(ratio),
      packMs, unpackMs, ok,
    });
  }

  console.log('  ' + '─'.repeat(100));
  console.log(`  Library result: ${passCount} PASS / ${failCount} FAIL (total ${uniqueTests.length})`);

  return { results, passCount, failCount };
}

// ═══════════════════════════════════════════════════════════════
// Part 2: Multi-frame test
// ═══════════════════════════════════════════════════════════════

function runMultiFrameTest() {
  console.log('');
  console.log('╔' + '═'.repeat(100) + '╗');
  console.log('║  Part 2: Multi-frame test (frameLimit split)' + ' '.repeat(54) + '║');
  console.log('╚' + '═'.repeat(100) + '╝');
  console.log('');

  const frameLimits = [
    1024,       // 1KB frame
    4096,       // 4KB frame
    65536,      // 64KB frame
    262144,     // 256KB frame
    1048576,    // 1MB frame
  ];

  const testData = generateLogLike(5242880); // 5MB log data
  const origHash = sha256(testData);

  console.log(`  Input data: ${formatSize(testData.length)} (loglike)`);
  console.log('');
  console.log(
    '  ' +
    'frameLimit'.padEnd(14) +
    'Frames'.padStart(8) +
    'Compressed'.padStart(10) +
    'Ratio'.padStart(8) +
    'Pack'.padStart(9) +
    'Unpack'.padStart(9) +
    'Integrity'.padStart(6)
  );
  console.log('  ' + '─'.repeat(62));

  let pass = 0;
  let fail = 0;

  for (const fl of frameLimits) {
    const packer = new Packer({ chunkSize: 256, frameLimit: fl, codec: 'gzip' });

    const t0 = process.hrtime.bigint();
    const packed = packer.pack(testData);
    const t1 = process.hrtime.bigint();

    const unpacker = new Unpacker();
    const restored = unpacker.unpack(packed);
    const t2 = process.hrtime.bigint();

    const ok = sha256(restored) === origHash && restored.length === testData.length;
    if (ok) pass++; else fail++;

    // Count frames
    let frameCount = 0;
    let off = 0;
    while (off < packed.length) {
      off += 4; // magic
      off += 2; // version
      const flags = packed.readUInt16LE(off); off += 2;
      off += 4; // chunkSize
      off += 1 + 3; // codec + pad
      off += 8; // origBytes
      off += 8; // dictEntries + seqCount
      const ps = packed.readUInt32LE(off); off += 4;
      off += ps;
      if (flags & 0x0001) off += 4; // CRC
      frameCount++;
    }

    const packMs = Number(t1 - t0) / 1e6;
    const unpackMs = Number(t2 - t1) / 1e6;
    const ratio = ((1 - packed.length / testData.length) * 100).toFixed(1);

    console.log(
      '  ' +
      formatSize(fl).padEnd(14) +
      `${frameCount}`.padStart(8) +
      formatSize(packed.length).padStart(10) +
      `${ratio}%`.padStart(8) +
      `${packMs.toFixed(1)}ms`.padStart(9) +
      `${unpackMs.toFixed(1)}ms`.padStart(9) +
      (ok ? '  ✅' : '  ❌')
    );
  }

  console.log('  ' + '─'.repeat(62));
  console.log(`  Multi-frame result: ${pass} PASS / ${fail} FAIL`);

  return { pass, fail };
}

// ═══════════════════════════════════════════════════════════════
// Part 3: Streaming (CLI stdin/stdout) test
// ═══════════════════════════════════════════════════════════════

function runStreamingTest() {
  console.log('');
  console.log('╔' + '═'.repeat(100) + '╗');
  console.log('║  Part 3: Streaming test (CLI stdin/stdout pipeline)' + ' '.repeat(48) + '║');
  console.log('╚' + '═'.repeat(100) + '╝');
  console.log('');

  ensureTmpDir();

  const streamTests = [
    ['repeat 1KB', 1024, generateRepeatPattern, 128, 'gzip'],
    ['repeat 10KB', 10240, generateRepeatPattern, 128, 'gzip'],
    ['repeat 100KB', 102400, generateRepeatPattern, 256, 'gzip'],
    ['loglike 100KB', 102400, generateLogLike, 256, 'gzip'],
    ['repeat 1MB', 1048576, generateRepeatPattern, 128, 'gzip'],
    ['loglike 1MB', 1048576, generateLogLike, 128, 'gzip'],
    ['mixedtext 1MB', 1048576, generateMixedText, 256, 'gzip'],
    ['JSON 1MB', 1048576, generateJsonLike, 256, 'gzip'],
    ['random 1MB', 1048576, generateRandom, 1024, 'gzip'],
    ['repeat 5MB', 5242880, generateRepeatPattern, 512, 'gzip'],
    ['loglike 5MB', 5242880, generateLogLike, 512, 'gzip'],
    ['repeat 10MB', 10485760, generateRepeatPattern, 1024, 'gzip'],
    ['loglike 10MB', 10485760, generateLogLike, 1024, 'gzip'],
    // codec=none streaming
    ['repeat 1MB none', 1048576, generateRepeatPattern, 128, 'none'],
    ['loglike 1MB none', 1048576, generateLogLike, 1024, 'none'],
    // CRC32 streaming
    ['repeat 1MB +crc', 1048576, generateRepeatPattern, 128, 'gzip --crc'],
  ];

  console.log(
    '  ' +
    '#'.padStart(4) +
    'Test'.padEnd(22) +
    'Original'.padStart(10) +
    'Compressed'.padStart(10) +
    'Restored'.padStart(10) +
    'Ratio'.padStart(8) +
    'Pack'.padStart(9) +
    'Unpack'.padStart(9) +
    'Integrity'.padStart(6)
  );
  console.log('  ' + '─'.repeat(86));

  let pass = 0;
  let fail = 0;

  for (let i = 0; i < streamTests.length; i++) {
    const [name, size, gen, chunkSize, codecOpts] = streamTests[i];
    const data = gen(size);
    const origHash = sha256(data);

    const inputFile = path.join(TMP_DIR, `input_${i}.bin`);
    const mshFile = path.join(TMP_DIR, `output_${i}.msh`);
    const restoredFile = path.join(TMP_DIR, `restored_${i}.bin`);

    fs.writeFileSync(inputFile, data);

    try {
      // Method 1: file -> stdin -> pack -> stdout -> file
      const t0 = process.hrtime.bigint();
      execSync(
        `node "${CLI}" pack -i - -o - --chunk ${chunkSize} --codec ${codecOpts.split(' ')[0]}${codecOpts.includes('--crc') ? ' --crc' : ''} < "${inputFile}" > "${mshFile}"`,
        { timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] }
      );
      const t1 = process.hrtime.bigint();

      // Method 2: file -> stdin -> unpack -> stdout -> file
      execSync(
        `node "${CLI}" unpack -i - -o - < "${mshFile}" > "${restoredFile}"`,
        { timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] }
      );
      const t2 = process.hrtime.bigint();

      const restored = fs.readFileSync(restoredFile);
      const restoredHash = sha256(restored);
      const mshSize = fs.statSync(mshFile).size;
      const ok = origHash === restoredHash && data.length === restored.length;

      if (ok) pass++; else fail++;

      const packMs = Number(t1 - t0) / 1e6;
      const unpackMs = Number(t2 - t1) / 1e6;
      const ratio = size > 0 ? ((1 - mshSize / size) * 100).toFixed(1) : '0.0';

      console.log(
        '  ' +
        String(i + 1).padStart(4) +
        name.padEnd(22) +
        formatSize(size).padStart(10) +
        formatSize(mshSize).padStart(10) +
        formatSize(restored.length).padStart(10) +
        `${ratio}%`.padStart(8) +
        `${packMs.toFixed(0)}ms`.padStart(9) +
        `${unpackMs.toFixed(0)}ms`.padStart(9) +
        (ok ? '  ✅' : '  ❌')
      );
    } catch (e) {
      fail++;
      console.log(
        '  ' +
        String(i + 1).padStart(4) +
        name.padEnd(22) +
        formatSize(size).padStart(10) +
        'error'.padStart(10) +
        '-'.padStart(10) +
        '-'.padStart(8) +
        '-'.padStart(9) +
        '-'.padStart(9) +
        '  ❌'
      );
      console.error(`    Error: ${e.message.split('\n')[0]}`);
    }
  }

  // Method 3: Pipeline combination (pack | unpack direct connect)
  console.log('');
  console.log('  ── Direct pipeline (pack -o - | unpack -i -) ──');
  console.log('');

  const pipeTests = [
    ['repeat 1MB pipe', 1048576, generateRepeatPattern, 128],
    ['loglike 1MB pipe', 1048576, generateLogLike, 256],
    ['JSON 1MB pipe', 1048576, generateJsonLike, 256],
    ['repeat 5MB pipe', 5242880, generateRepeatPattern, 512],
    ['loglike 5MB pipe', 5242880, generateLogLike, 512],
  ];

  for (let i = 0; i < pipeTests.length; i++) {
    const [name, size, gen, chunkSize] = pipeTests[i];
    const data = gen(size);
    const origHash = sha256(data);

    const inputFile = path.join(TMP_DIR, `pipe_in_${i}.bin`);
    const outputFile = path.join(TMP_DIR, `pipe_out_${i}.bin`);

    fs.writeFileSync(inputFile, data);

    try {
      const t0 = process.hrtime.bigint();
      execSync(
        `node "${CLI}" pack -i "${inputFile}" -o - --chunk ${chunkSize} | node "${CLI}" unpack -i - -o "${outputFile}"`,
        { timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] }
      );
      const t1 = process.hrtime.bigint();

      const restored = fs.readFileSync(outputFile);
      const ok = sha256(restored) === origHash && restored.length === data.length;
      if (ok) pass++; else fail++;

      const totalMs = Number(t1 - t0) / 1e6;
      console.log(`  ${String(i + 1).padStart(4)} ${name.padEnd(25)} ${formatSize(size).padStart(8)} -> pipe -> ${formatSize(restored.length).padStart(8)}  ${totalMs.toFixed(0)}ms  ${ok ? '✅' : '❌'}`);
    } catch (e) {
      fail++;
      console.log(`  ${String(i + 1).padStart(4)} ${name.padEnd(25)} ${formatSize(size).padStart(8)} -> pipe -> error  ❌`);
      console.error(`    Error: ${e.message.split('\n')[0]}`);
    }
  }

  // CLI file mode test (comparison baseline)
  console.log('');
  console.log('  ── CLI file mode comparison ──');
  console.log('');

  const fileTests = [
    ['repeat 1MB file', 1048576, generateRepeatPattern, 128],
    ['loglike 1MB file', 1048576, generateLogLike, 256],
    ['repeat 10MB file', 10485760, generateRepeatPattern, 1024],
  ];

  for (let i = 0; i < fileTests.length; i++) {
    const [name, size, gen, chunkSize] = fileTests[i];
    const data = gen(size);
    const origHash = sha256(data);

    const inputFile = path.join(TMP_DIR, `file_in_${i}.bin`);
    const mshFile = path.join(TMP_DIR, `file_msh_${i}.msh`);
    const outputFile = path.join(TMP_DIR, `file_out_${i}.bin`);

    fs.writeFileSync(inputFile, data);

    try {
      const t0 = process.hrtime.bigint();
      execSync(
        `node "${CLI}" pack -i "${inputFile}" -o "${mshFile}" --chunk ${chunkSize}`,
        { timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] }
      );
      const t1 = process.hrtime.bigint();

      execSync(
        `node "${CLI}" unpack -i "${mshFile}" -o "${outputFile}"`,
        { timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] }
      );
      const t2 = process.hrtime.bigint();

      const restored = fs.readFileSync(outputFile);
      const mshSize = fs.statSync(mshFile).size;
      const ok = sha256(restored) === origHash && restored.length === data.length;
      if (ok) pass++; else fail++;

      const packMs = Number(t1 - t0) / 1e6;
      const unpackMs = Number(t2 - t1) / 1e6;
      const ratio = ((1 - mshSize / size) * 100).toFixed(1);
      console.log(`  ${String(i + 1).padStart(4)} ${name.padEnd(25)} ${formatSize(size).padStart(8)} → ${formatSize(mshSize).padStart(8)} (${ratio}%)  pack:${packMs.toFixed(0)}ms  unpack:${unpackMs.toFixed(0)}ms  ${ok ? '✅' : '❌'}`);
    } catch (e) {
      fail++;
      console.log(`  ${String(i + 1).padStart(4)} ${name.padEnd(25)} error  ❌`);
    }
  }

  cleanTmpDir();

  console.log('');
  console.log('  ' + '─'.repeat(86));
  console.log(`  Streaming result: ${pass} PASS / ${fail} FAIL`);

  return { pass, fail };
}

// ═══════════════════════════════════════════════════════════════
// Part 4: info command test
// ═══════════════════════════════════════════════════════════════

function runInfoTest() {
  console.log('');
  console.log('╔' + '═'.repeat(100) + '╗');
  console.log('║  Part 4: info command test' + ' '.repeat(74) + '║');
  console.log('╚' + '═'.repeat(100) + '╝');
  console.log('');

  ensureTmpDir();

  let pass = 0;
  let fail = 0;

  // Single frame
  const data1 = generateRepeatPattern(102400);
  const packed1 = pack(data1, { chunkSize: 256 });
  const f1 = path.join(TMP_DIR, 'info_test1.msh');
  fs.writeFileSync(f1, packed1);

  try {
    const out = execSync(`node "${CLI}" info -i "${f1}"`, { encoding: 'utf-8', timeout: 10000 });
    const hasFrame = out.includes('Frame #0');
    const hasRatio = out.includes('Compression ratio');
    const ok = hasFrame && hasRatio;
    if (ok) pass++; else fail++;
    console.log(`  1. Single frame info: ${ok ? '✅' : '❌'}`);
    if (!ok) console.log(`     Output: ${out.slice(0, 200)}`);
  } catch (e) {
    fail++;
    console.log(`  1. Single frame info: ❌ (${e.message.split('\n')[0]})`);
  }

  // Multi frame
  const data2 = generateLogLike(524288);
  const packer2 = new Packer({ chunkSize: 128, frameLimit: 65536, codec: 'gzip' });
  const packed2 = packer2.pack(data2);
  const f2 = path.join(TMP_DIR, 'info_test2.msh');
  fs.writeFileSync(f2, packed2);

  try {
    const out = execSync(`node "${CLI}" info -i "${f2}"`, { encoding: 'utf-8', timeout: 10000 });
    const frameCount = (out.match(/Frame #/g) || []).length;
    const ok = frameCount > 1;
    if (ok) pass++; else fail++;
    console.log(`  2. Multi frame info (${frameCount} frames): ${ok ? '✅' : '❌'}`);
  } catch (e) {
    fail++;
    console.log(`  2. Multi frame info: ❌ (${e.message.split('\n')[0]})`);
  }

  // CRC32 included
  const data3 = generateRepeatPattern(10240);
  const packed3 = pack(data3, { chunkSize: 128, crc: true });
  const f3 = path.join(TMP_DIR, 'info_test3.msh');
  fs.writeFileSync(f3, packed3);

  try {
    const out = execSync(`node "${CLI}" info -i "${f3}"`, { encoding: 'utf-8', timeout: 10000 });
    const hasCrc = out.includes('yes');
    const ok = hasCrc;
    if (ok) pass++; else fail++;
    console.log(`  3. CRC32 info: ${ok ? '✅' : '❌'}`);
  } catch (e) {
    fail++;
    console.log(`  3. CRC32 info: ❌ (${e.message.split('\n')[0]})`);
  }

  cleanTmpDir();

  console.log('');
  console.log(`  info result: ${pass} PASS / ${fail} FAIL`);

  return { pass, fail };
}

// ═══════════════════════════════════════════════════════════════
// Part 5: Transform Stream test
// ═══════════════════════════════════════════════════════════════

function runTransformStreamTest() {
  console.log('');
  console.log('╔' + '═'.repeat(100) + '╗');
  console.log('║  Part 5: Transform Stream test (PackStream / UnpackStream)' + ' '.repeat(40) + '║');
  console.log('╚' + '═'.repeat(100) + '╝');
  console.log('');

  const { PackStream, UnpackStream } = require('../lib/stream');
  const { PassThrough } = require('stream');
  const { pipeline } = require('stream/promises');

  let pass = 0;
  let fail = 0;
  const tests = [];

  // Wrapper for synchronous execution (run Promise-based tests sequentially)
  function addTest(name, fn) {
    tests.push({ name, fn });
  }

  // Helper: round-trip Buffer through PackStream -> UnpackStream
  async function roundTrip(data, opts = {}) {
    const input = new PassThrough();
    const ps = new PackStream(opts);
    const us = new UnpackStream();
    const output = new PassThrough();
    const chunks = [];
    output.on('data', c => chunks.push(c));
    const done = pipeline(input, ps, us, output);
    input.end(data);
    await done;
    return { restored: Buffer.concat(chunks), packStats: ps.stats, unpackStats: us.stats };
  }

  // Helper: pass Buffer through PackStream only
  async function packOnly(data, opts = {}) {
    const input = new PassThrough();
    const ps = new PackStream(opts);
    const output = new PassThrough();
    const chunks = [];
    output.on('data', c => chunks.push(c));
    const done = pipeline(input, ps, output);
    input.end(data);
    await done;
    return { msh: Buffer.concat(chunks), stats: ps.stats };
  }

  // Helper: pass MSH Buffer through UnpackStream only
  async function unpackOnly(mshData) {
    const input = new PassThrough();
    const us = new UnpackStream();
    const output = new PassThrough();
    const chunks = [];
    output.on('data', c => chunks.push(c));
    const done = pipeline(input, us, output);
    input.end(mshData);
    await done;
    return { restored: Buffer.concat(chunks), stats: us.stats };
  }

  // ── Basic integrity tests ──

  addTest('PS-1B', async () => {
    const data = Buffer.from([0x42]);
    const { restored } = await roundTrip(data);
    return data.equals(restored);
  });

  addTest('PS-7B', async () => {
    const data = Buffer.from('ABCDEFG');
    const { restored } = await roundTrip(data);
    return data.equals(restored);
  });

  addTest('PS-128B (boundary)', async () => {
    const data = generateRepeatPattern(128);
    const { restored } = await roundTrip(data);
    return data.equals(restored);
  });

  addTest('PS-127B (boundary-1)', async () => {
    const data = generateRepeatPattern(127);
    const { restored } = await roundTrip(data);
    return data.equals(restored);
  });

  addTest('PS-129B (boundary+1)', async () => {
    const data = generateRepeatPattern(129);
    const { restored } = await roundTrip(data);
    return data.equals(restored);
  });

  addTest('PS-1KB repeat', async () => {
    const data = generateRepeatPattern(1024);
    const { restored } = await roundTrip(data);
    return data.equals(restored);
  });

  addTest('PS-64KB loglike', async () => {
    const data = generateLogLike(65536);
    const { restored } = await roundTrip(data);
    return data.equals(restored);
  });

  addTest('PS-1MB mixedtext', async () => {
    const data = generateMixedText(1048576);
    const { restored } = await roundTrip(data);
    return data.equals(restored);
  });

  addTest('PS-5MB JSON', async () => {
    const data = generateJsonLike(5242880);
    const { restored } = await roundTrip(data);
    return data.equals(restored);
  });

  addTest('PS-10MB repeat', async () => {
    const data = generateRepeatPattern(10485760);
    const { restored } = await roundTrip(data);
    return data.equals(restored);
  });

  addTest('PS-empty', async () => {
    const data = Buffer.alloc(0);
    const { msh } = await packOnly(data);
    const { restored } = await unpackOnly(msh);
    return data.equals(restored);
  });

  addTest('PS-codec-none 1MB', async () => {
    const data = generateRepeatPattern(1048576);
    const { restored } = await roundTrip(data, { codec: 'none' });
    return data.equals(restored);
  });

  addTest('PS-CRC32 1MB', async () => {
    const data = generateRepeatPattern(1048576);
    const { restored } = await roundTrip(data, { crc: true });
    return data.equals(restored);
  });

  addTest('PS-largechunk 4096B', async () => {
    const data = generateLogLike(1048576);
    const { restored } = await roundTrip(data, { chunkSize: 4096 });
    return data.equals(restored);
  });

  addTest('PS-smallchunk 8B', async () => {
    const data = generateRepeatPattern(10240);
    const { restored } = await roundTrip(data, { chunkSize: 8 });
    return data.equals(restored);
  });

  // ── Incomplete frame handling tests ──

  addTest('US-1byte-at-a-time', async () => {
    const data = generateRepeatPattern(1024);
    const { msh } = await packOnly(data);
    // Write 1 byte at a time to UnpackStream
    const us = new UnpackStream();
    const output = new PassThrough();
    const chunks = [];
    output.on('data', c => chunks.push(c));
    const done = pipeline(us, output);
    for (let i = 0; i < msh.length; i++) {
      us.write(msh.slice(i, i + 1));
    }
    us.end();
    await done;
    return data.equals(Buffer.concat(chunks));
  });

  addTest('US-header-split (20+rest)', async () => {
    const data = generateLogLike(2048);
    const { msh } = await packOnly(data);
    // Split into 20-byte chunks
    const us = new UnpackStream();
    const output = new PassThrough();
    const chunks = [];
    output.on('data', c => chunks.push(c));
    const done = pipeline(us, output);
    for (let i = 0; i < msh.length; i += 20) {
      us.write(msh.slice(i, Math.min(i + 20, msh.length)));
    }
    us.end();
    await done;
    return data.equals(Buffer.concat(chunks));
  });

  addTest('US-payload-3split', async () => {
    const data = generateCsvLike(4096);
    const { msh } = await packOnly(data);
    const third = Math.ceil(msh.length / 3);
    const us = new UnpackStream();
    const output = new PassThrough();
    const chunks = [];
    output.on('data', c => chunks.push(c));
    const done = pipeline(us, output);
    us.write(msh.slice(0, third));
    us.write(msh.slice(third, third * 2));
    us.write(msh.slice(third * 2));
    us.end();
    await done;
    return data.equals(Buffer.concat(chunks));
  });

  addTest('US-multiframe-singlechunk', async () => {
    const data = generateRepeatPattern(10240);
    const { msh } = await packOnly(data, { frameLimit: 2048 });
    // Write entire buffer at once
    const us = new UnpackStream();
    const output = new PassThrough();
    const chunks = [];
    output.on('data', c => chunks.push(c));
    const done = pipeline(us, output);
    us.write(msh);
    us.end();
    await done;
    return data.equals(Buffer.concat(chunks));
  });

  addTest('US-CRC-split', async () => {
    const data = generateRepeatPattern(1024);
    const { msh } = await packOnly(data, { crc: true });
    // Adjust split point so CRC is split at payload boundary
    const splitAt = msh.length - 2;
    const us = new UnpackStream();
    const output = new PassThrough();
    const chunks = [];
    output.on('data', c => chunks.push(c));
    const done = pipeline(us, output);
    us.write(msh.slice(0, splitAt));
    us.write(msh.slice(splitAt));
    us.end();
    await done;
    return data.equals(Buffer.concat(chunks));
  });

  addTest('US-invalid-magic error', async () => {
    const badData = Buffer.from('MSH2' + '\x00'.repeat(32));
    const us = new UnpackStream();
    const output = new PassThrough();
    try {
      const done = pipeline(us, output);
      us.write(badData);
      us.end();
      await done;
      return false; // Fail if no error
    } catch (err) {
      return err.message.includes('magic');
    }
  });

  // ── Pipeline integration tests ──

  addTest('PIPE-chain 1MB', async () => {
    const data = generateLogLike(1048576);
    const { restored } = await roundTrip(data, { chunkSize: 256 });
    return data.equals(restored);
  });

  addTest('PIPE-file-roundtrip 5MB', async () => {
    ensureTmpDir();
    const data = generateRepeatPattern(5242880);
    const inFile = path.join(TMP_DIR, 'st_in.bin');
    const mshFile = path.join(TMP_DIR, 'st_out.msh');
    const resFile = path.join(TMP_DIR, 'st_res.bin');
    fs.writeFileSync(inFile, data);

    const { packStream: packS, unpackStream: unpackS } = require('../lib/stream');
    await packS(fs.createReadStream(inFile), fs.createWriteStream(mshFile), { chunkSize: 512 });
    await unpackS(fs.createReadStream(mshFile), fs.createWriteStream(resFile));
    const restored = fs.readFileSync(resFile);
    cleanTmpDir();
    return data.equals(restored);
  });

  addTest('PIPE-multiframe stream', async () => {
    const data = generateLogLike(1048576);
    const { restored } = await roundTrip(data, { frameLimit: 65536, chunkSize: 128 });
    return data.equals(restored);
  });

  // ── Existing API compatibility tests ──

  addTest('COMPAT-same-output', async () => {
    const data = generateRepeatPattern(10240);
    const opts = { chunkSize: 128, codec: 'gzip', frameLimit: 64 * 1024 * 1024 };
    const libResult = pack(data, opts);
    const { msh } = await packOnly(data, opts);
    return libResult.equals(msh);
  });

  // ── Stats verification tests ──

  addTest('STATS-PackStream', async () => {
    const data = generateRepeatPattern(4096);
    const { packStats } = await roundTrip(data);
    return packStats.bytesIn === 4096 && packStats.bytesOut > 0 && packStats.frameCount > 0 && packStats.dictSize > 0;
  });

  addTest('STATS-UnpackStream', async () => {
    const data = generateRepeatPattern(4096);
    const { unpackStats } = await roundTrip(data);
    return unpackStats.bytesIn > 0 && unpackStats.bytesOut === 4096 && unpackStats.frameCount > 0;
  });

  addTest('STATS-framecount match', async () => {
    const data = generateLogLike(102400);
    const { packStats, unpackStats } = await roundTrip(data, { frameLimit: 16384 });
    return packStats.frameCount === unpackStats.frameCount && packStats.frameCount > 1;
  });

  // ── Execute ──

  return (async () => {
    for (const t of tests) {
      try {
        const ok = await t.fn();
        if (ok) { pass++; console.log(`  ✅ ${t.name}`); }
        else { fail++; console.log(`  ❌ ${t.name}`); }
      } catch (err) {
        fail++;
        console.log(`  ❌ ${t.name}: ${err.message.slice(0, 100)}`);
      }
    }

    console.log('');
    console.log(`  Transform Stream result: ${pass} PASS / ${fail} FAIL`);
    return { pass, fail };
  })();
}

// ═══════════════════════════════════════════════════════════════
// Part 6: Parallel processing test (WorkerPool)
// ═══════════════════════════════════════════════════════════════

function runParallelTest() {
  console.log('');
  console.log('╔' + '═'.repeat(100) + '╗');
  console.log('║  Part 6: Parallel processing test (WorkerPool + CLI multi)' + ' '.repeat(39) + '║');
  console.log('╚' + '═'.repeat(100) + '╝');
  console.log('');

  const { WorkerPool } = require('../lib/parallel');
  const os = require('os');

  let pass = 0;
  let fail = 0;
  const tests = [];

  function addTest(name, fn) {
    tests.push({ name, fn });
  }

  // ── WorkerPool basic operations ──

  addTest('WP-init+destroy', async () => {
    const pool = new WorkerPool(2);
    pool.init();
    const ok = pool._workers.length === 2;
    await pool.destroy();
    return ok;
  });

  addTest('WP-single pack', async () => {
    ensureTmpDir();
    const data = generateRepeatPattern(10000);
    const inF = path.join(TMP_DIR, 'wp_in.bin');
    const outF = path.join(TMP_DIR, 'wp_out.msh');
    fs.writeFileSync(inF, data);
    const pool = new WorkerPool(1);
    pool.init();
    const [r] = await pool.runAll([{ type: 'pack', inputPath: inF, outputPath: outF, opts: { chunkSize: 128 } }]);
    await pool.destroy();
    const ok = r.success && r.stats.inputSize === 10000 && r.stats.outputSize > 0;
    cleanTmpDir();
    return ok;
  });

  addTest('WP-single unpack', async () => {
    ensureTmpDir();
    const data = generateLogLike(5000);
    const packed = pack(data, { chunkSize: 128 });
    const mshF = path.join(TMP_DIR, 'wp_msh.msh');
    const outF = path.join(TMP_DIR, 'wp_res.bin');
    fs.writeFileSync(mshF, packed);
    const pool = new WorkerPool(1);
    pool.init();
    const [r] = await pool.runAll([{ type: 'unpack', inputPath: mshF, outputPath: outF }]);
    await pool.destroy();
    const restored = fs.readFileSync(outF);
    const ok = r.success && data.equals(restored);
    cleanTmpDir();
    return ok;
  });

  addTest('WP-roundtrip integrity', async () => {
    ensureTmpDir();
    const data = generateJsonLike(20000);
    const inF = path.join(TMP_DIR, 'wp_rt_in.bin');
    const mshF = path.join(TMP_DIR, 'wp_rt.msh');
    const resF = path.join(TMP_DIR, 'wp_rt_res.bin');
    fs.writeFileSync(inF, data);
    const pool = new WorkerPool(2);
    pool.init();
    await pool.runAll([{ type: 'pack', inputPath: inF, outputPath: mshF, opts: { chunkSize: 256 } }]);
    await pool.runAll([{ type: 'unpack', inputPath: mshF, outputPath: resF }]);
    await pool.destroy();
    const restored = fs.readFileSync(resF);
    cleanTmpDir();
    return data.equals(restored);
  });

  // ── Multi-file concurrent processing ──

  addTest('MP-4files concurrent pack', async () => {
    ensureTmpDir();
    const files = [];
    for (let i = 0; i < 4; i++) {
      const data = generateRepeatPattern(50000 + i * 10000);
      const f = path.join(TMP_DIR, `mp4_${i}.bin`);
      fs.writeFileSync(f, data);
      files.push({ data, path: f });
    }
    const pool = new WorkerPool(4);
    pool.init();
    const tasks = files.map((f, i) => ({
      type: 'pack',
      inputPath: f.path,
      outputPath: path.join(TMP_DIR, `mp4_${i}.msh`),
      opts: { chunkSize: 128 },
    }));
    const results = await pool.runAll(tasks);
    const allOk = results.every(r => r.success);
    // unpack verification
    const uTasks = files.map((f, i) => ({
      type: 'unpack',
      inputPath: path.join(TMP_DIR, `mp4_${i}.msh`),
      outputPath: path.join(TMP_DIR, `mp4_${i}.res`),
    }));
    const uResults = await pool.runAll(uTasks);
    await pool.destroy();
    const integrityOk = files.every((f, i) => {
      const restored = fs.readFileSync(path.join(TMP_DIR, `mp4_${i}.res`));
      return f.data.equals(restored);
    });
    cleanTmpDir();
    return allOk && uResults.every(r => r.success) && integrityOk;
  });

  addTest('MP-8files queuing (workers=2)', async () => {
    ensureTmpDir();
    const files = [];
    for (let i = 0; i < 8; i++) {
      const data = generateLogLike(10000 + i * 5000);
      const f = path.join(TMP_DIR, `mp8_${i}.bin`);
      fs.writeFileSync(f, data);
      files.push({ data, path: f });
    }
    const pool = new WorkerPool(2);
    pool.init();
    const tasks = files.map((f, i) => ({
      type: 'pack', inputPath: f.path,
      outputPath: path.join(TMP_DIR, `mp8_${i}.msh`),
      opts: { chunkSize: 128 },
    }));
    const results = await pool.runAll(tasks);
    await pool.destroy();
    const allOk = results.every(r => r.success);
    cleanTmpDir();
    return allOk && results.length === 8;
  });

  addTest('MP-mixed sizes', async () => {
    ensureTmpDir();
    const sizes = [1024, 10240, 51200, 102400, 524288, 1048576];
    const gens = [generateRepeatPattern, generateLogLike, generateJsonLike, generateCsvLike, generateMixedText, generateZeroes];
    const files = sizes.map((s, i) => {
      const data = gens[i](s);
      const f = path.join(TMP_DIR, `mix_${i}.bin`);
      fs.writeFileSync(f, data);
      return { data, path: f };
    });
    const pool = new WorkerPool(4);
    pool.init();
    const pTasks = files.map((f, i) => ({
      type: 'pack', inputPath: f.path,
      outputPath: path.join(TMP_DIR, `mix_${i}.msh`),
      opts: { chunkSize: 128 },
    }));
    const pResults = await pool.runAll(pTasks);
    const uTasks = files.map((_, i) => ({
      type: 'unpack',
      inputPath: path.join(TMP_DIR, `mix_${i}.msh`),
      outputPath: path.join(TMP_DIR, `mix_${i}.res`),
    }));
    const uResults = await pool.runAll(uTasks);
    await pool.destroy();
    const ok = pResults.every(r => r.success) && uResults.every(r => r.success)
      && files.every((f, i) => f.data.equals(fs.readFileSync(path.join(TMP_DIR, `mix_${i}.res`))));
    cleanTmpDir();
    return ok;
  });

  // ── Worker count performance comparison ──

  addTest('PERF-1W vs 4W compare', async () => {
    ensureTmpDir();
    const fileCount = 8;
    const files = [];
    for (let i = 0; i < fileCount; i++) {
      const data = generateLogLike(524288); // 512KB x 8 = 4MB total
      const f = path.join(TMP_DIR, `perf_${i}.bin`);
      fs.writeFileSync(f, data);
      files.push(f);
    }
    const makeTasks = () => files.map((f, i) => ({
      type: 'pack', inputPath: f,
      outputPath: path.join(TMP_DIR, `perf_${i}_out.msh`),
      opts: { chunkSize: 256 },
    }));

    // 1 worker
    const pool1 = new WorkerPool(1);
    pool1.init();
    const t0 = Date.now();
    await pool1.runAll(makeTasks());
    const time1 = Date.now() - t0;
    await pool1.destroy();

    // 4 workers
    const pool4 = new WorkerPool(4);
    pool4.init();
    const t1 = Date.now();
    await pool4.runAll(makeTasks());
    const time4 = Date.now() - t1;
    await pool4.destroy();

    cleanTmpDir();
    console.log(`       1W: ${time1}ms, 4W: ${time4}ms, ratio: ${(time1 / time4).toFixed(1)}x`);
    return true; // Only record performance comparison, integrity verified above
  });

  // ── Error handling ──

  addTest('ERR-missing-file', async () => {
    ensureTmpDir();
    const pool = new WorkerPool(1);
    pool.init();
    const [r] = await pool.runAll([{
      type: 'pack',
      inputPath: path.join(TMP_DIR, 'nonexistent.bin'),
      outputPath: path.join(TMP_DIR, 'err.msh'),
      opts: { chunkSize: 128 },
    }]);
    await pool.destroy();
    cleanTmpDir();
    return !r.success && r.error.length > 0;
  });

  addTest('ERR-corrupt MSH', async () => {
    ensureTmpDir();
    const badMsh = Buffer.from('MSH1' + '\x00'.repeat(100));
    const f = path.join(TMP_DIR, 'bad.msh');
    const out = path.join(TMP_DIR, 'bad.bin');
    fs.writeFileSync(f, badMsh);
    const pool = new WorkerPool(1);
    pool.init();
    const [r] = await pool.runAll([{ type: 'unpack', inputPath: f, outputPath: out }]);
    await pool.destroy();
    cleanTmpDir();
    return !r.success;
  });

  // ── Transfer efficiency simulation ──

  addTest('TX-throughput (10x1MB)', async () => {
    ensureTmpDir();
    const totalBytes = 10 * 1048576;
    const files = [];
    for (let i = 0; i < 10; i++) {
      const data = generateLogLike(1048576);
      const f = path.join(TMP_DIR, `tx_${i}.bin`);
      fs.writeFileSync(f, data);
      files.push(f);
    }
    const pool = new WorkerPool(4);
    pool.init();
    const tasks = files.map((f, i) => ({
      type: 'pack', inputPath: f,
      outputPath: path.join(TMP_DIR, `tx_${i}.msh`),
      opts: { chunkSize: 256 },
    }));
    const t0 = Date.now();
    const results = await pool.runAll(tasks);
    const elapsed = Date.now() - t0;
    await pool.destroy();
    const totalOut = results.reduce((s, r) => s + (r.success ? r.stats.outputSize : 0), 0);
    const speed = (totalBytes / 1024 / 1024) / (elapsed / 1000);
    const ratio = ((1 - totalOut / totalBytes) * 100).toFixed(1);
    console.log(`       Input: ${formatSize(totalBytes)}, Output: ${formatSize(totalOut)} (${ratio}%), ${speed.toFixed(1)} MB/s, ${elapsed}ms`);
    cleanTmpDir();
    return results.every(r => r.success);
  });

  // ── CLI multi command integration ──

  addTest('CLI-multi pack+unpack roundtrip', async () => {
    ensureTmpDir();
    const compDir = path.join(TMP_DIR, 'comp');
    const resDir = path.join(TMP_DIR, 'res');
    const files = [];
    for (let i = 0; i < 3; i++) {
      const data = generateRepeatPattern(50000 + i * 20000);
      const f = path.join(TMP_DIR, `cli_${i}.bin`);
      fs.writeFileSync(f, data);
      files.push({ data, path: f, name: `cli_${i}.bin` });
    }
    const fileArgs = files.map(f => `"${f.path}"`).join(' ');
    try {
      execSync(
        `node "${CLI}" multi pack ${fileArgs} --out-dir "${compDir}" --workers 2 --chunk 128`,
        { timeout: 30000, stdio: 'pipe' }
      );
      const mshFiles = files.map(f => `"${path.join(compDir, f.name + '.msh')}"`).join(' ');
      execSync(
        `node "${CLI}" multi unpack ${mshFiles} --out-dir "${resDir}" --workers 2`,
        { timeout: 30000, stdio: 'pipe' }
      );
      const allMatch = files.every(f => {
        const resName = f.name + '.msh'; // .msh removed during unpack
        const resPath = path.join(resDir, f.name);
        if (!fs.existsSync(resPath)) return false;
        return f.data.equals(fs.readFileSync(resPath));
      });
      cleanTmpDir();
      return allMatch;
    } catch (e) {
      cleanTmpDir();
      console.log(`       CLI error: ${e.message.split('\n')[0]}`);
      return false;
    }
  });

  addTest('CLI-multi no-args error', async () => {
    try {
      execSync(`node "${CLI}" multi pack --out-dir /tmp/x`, { timeout: 5000, stdio: 'pipe' });
      return false;
    } catch (e) {
      return e.status === 2;
    }
  });

  addTest('CLI-multi --out-dir auto-create', async () => {
    ensureTmpDir();
    const data = generateRepeatPattern(1000);
    const f = path.join(TMP_DIR, 'auto.bin');
    fs.writeFileSync(f, data);
    const autoDir = path.join(TMP_DIR, 'auto_created_dir');
    try {
      execSync(
        `node "${CLI}" multi pack "${f}" --out-dir "${autoDir}" --workers 1`,
        { timeout: 10000, stdio: 'pipe' }
      );
      const ok = fs.existsSync(path.join(autoDir, 'auto.bin.msh'));
      cleanTmpDir();
      return ok;
    } catch (e) {
      cleanTmpDir();
      return false;
    }
  });

  // ── Execute ──

  return (async () => {
    for (const t of tests) {
      try {
        const ok = await t.fn();
        if (ok) { pass++; console.log(`  ✅ ${t.name}`); }
        else { fail++; console.log(`  ❌ ${t.name}`); }
      } catch (err) {
        fail++;
        console.log(`  ❌ ${t.name}: ${err.message.slice(0, 100)}`);
      }
    }

    console.log('');
    console.log(`  Parallel processing result: ${pass} PASS / ${fail} FAIL`);
    return { pass, fail };
  })();
}

// ═══════════════════════════════════════════════════════════════
// Main execution
// ═══════════════════════════════════════════════════════════════

async function main() {
  const startTime = Date.now();

  console.log('');
  console.log('██╗   ██╗███████╗██╗  ██╗███████╗██╗██████╗ ');
  console.log('████╗ ████║██╔════╝██║  ██║╚══███╔╝██║██╔══██╗');
  console.log('██╔████╔██║███████╗███████║  ███╔╝ ██║██████╔╝');
  console.log('██║╚██╔╝██║╚════██║██╔══██║ ███╔╝  ██║██╔═══╝ ');
  console.log('██║ ╚═╝ ██║███████║██║  ██║███████╗██║██║     ');
  console.log('╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝     Comprehensive Benchmark');
  console.log('');

  const lib = runLibraryBenchmark();
  const mf = runMultiFrameTest();
  const stream = runStreamingTest();
  const info = runInfoTest();
  const transform = await runTransformStreamTest();
  const parallel = await runParallelTest();

  const totalPass = lib.passCount + mf.pass + stream.pass + info.pass + transform.pass + parallel.pass;
  const totalFail = lib.failCount + mf.fail + stream.fail + info.fail + transform.fail + parallel.fail;
  const totalTests = totalPass + totalFail;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('╔' + '═'.repeat(100) + '╗');
  console.log('║  Summary' + ' '.repeat(91) + '║');
  console.log('╠' + '═'.repeat(100) + '╣');
  console.log(`║  Part 1 - Library API      : ${String(lib.passCount).padStart(4)} PASS / ${String(lib.failCount).padStart(2)} FAIL (${lib.results.length})`.padEnd(101) + '║');
  console.log(`║  Part 2 - Multi-frame      : ${String(mf.pass).padStart(4)} PASS / ${String(mf.fail).padStart(2)} FAIL`.padEnd(101) + '║');
  console.log(`║  Part 3 - CLI Streaming    : ${String(stream.pass).padStart(4)} PASS / ${String(stream.fail).padStart(2)} FAIL`.padEnd(101) + '║');
  console.log(`║  Part 4 - info command     : ${String(info.pass).padStart(4)} PASS / ${String(info.fail).padStart(2)} FAIL`.padEnd(101) + '║');
  console.log(`║  Part 5 - Transform Stream : ${String(transform.pass).padStart(4)} PASS / ${String(transform.fail).padStart(2)} FAIL`.padEnd(101) + '║');
  console.log(`║  Part 6 - Parallel         : ${String(parallel.pass).padStart(4)} PASS / ${String(parallel.fail).padStart(2)} FAIL`.padEnd(101) + '║');
  console.log('╠' + '═'.repeat(100) + '╣');
  console.log(`║  Total: ${totalPass} PASS / ${totalFail} FAIL (${totalTests} tests, ${elapsed}s)`.padEnd(101) + '║');
  console.log('╚' + '═'.repeat(100) + '╝');

  // Mermaid charts
  generateMermaidCharts(lib.results);

  if (totalFail > 0) process.exit(1);
}

function generateMermaidCharts(results) {
  // Compression ratio comparison by data type (gzip 128B)
  const sizeComparison = results
    .filter(r => r.codec === 'gzip' && r.chunkSize === 128 && r.size >= 1024 && !r.crc)
    .filter(r => r.name.includes('1MB'));

  if (sizeComparison.length > 0) {
    console.log('\n── Mermaid: 1MB compression ratio by data type (gzip, 128B chunk) ──');
    console.log('```mermaid');
    console.log('xychart-beta');
    console.log('  title "1MB compression ratio by data type (gzip, chunk=128B)"');
    console.log('  x-axis [' + sizeComparison.map(r => `"${r.name.split('(')[0].trim()}"`).join(', ') + ']');
    console.log('  y-axis "Ratio (%)" -5 --> 100');
    console.log('  bar [' + sizeComparison.map(r => r.ratio.toFixed(1)).join(', ') + ']');
    console.log('```');
  }

  // Compression ratio by chunk size (repeat 1MB)
  const chunkComparison = results
    .filter(r => r.codec === 'gzip' && r.name.startsWith('repeat 1MB') && r.size === 1048576 && !r.crc);

  if (chunkComparison.length > 0) {
    console.log('\n── Mermaid: Pack time by chunk size (repeat 1MB, gzip) ──');
    console.log('```mermaid');
    console.log('xychart-beta');
    console.log('  title "Pack time by chunk size (repeat 1MB)"');
    console.log('  x-axis [' + chunkComparison.map(r => `"${r.chunkSize}B"`).join(', ') + ']');
    const maxT = Math.ceil(Math.max(...chunkComparison.map(r => r.packMs)));
    console.log(`  y-axis "Time (ms)" 0 --> ${maxT}`);
    console.log('  bar [' + chunkComparison.map(r => r.packMs.toFixed(1)).join(', ') + ']');
    console.log('```');
  }

  // Pack speed by size (repeat, gzip, 128B chunk)
  const speedComparison = results
    .filter(r => r.codec === 'gzip' && r.chunkSize === 128 && r.name.startsWith('repeat') && !r.crc && r.size >= 1024);

  if (speedComparison.length > 0) {
    console.log('\n── Mermaid: Pack speed by size (repeat, gzip, 128B) ──');
    console.log('```mermaid');
    console.log('xychart-beta');
    console.log('  title "Pack speed by size (repeat, gzip, chunk=128B)"');
    console.log('  x-axis [' + speedComparison.map(r => `"${formatSize(r.size)}"`).join(', ') + ']');
    const speeds = speedComparison.map(r => r.size > 0 && r.packMs > 0 ? (r.size / 1024 / 1024) / (r.packMs / 1000) : 0);
    const maxS = Math.ceil(Math.max(...speeds));
    console.log(`  y-axis "Speed (MB/s)" 0 --> ${maxS}`);
    console.log('  bar [' + speeds.map(s => s.toFixed(1)).join(', ') + ']');
    console.log('```');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
