#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream/promises');
const { PackStream, UnpackStream } = require('./lib/stream');
const { PassThrough } = require('stream');
const {
  DEFAULT_CHUNK_SIZE, DEFAULT_FRAME_LIMIT, DEFAULT_CODEC,
  MIN_CHUNK_SIZE, MAX_CHUNK_SIZE,
} = require('./lib/constants');

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h') {
  printUsage();
  process.exit(0);
}

async function main() {
  switch (command) {
    case 'pack':
      await handlePack(args.slice(1));
      break;
    case 'unpack':
      await handleUnpack(args.slice(1));
      break;
    case 'info':
      handleInfo(args.slice(1));
      break;
    case 'multi':
      await handleMulti(args.slice(1));
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(2);
  }
}

main().catch(e => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});

function printUsage() {
  console.log(`
mshzip - Fixed-chunk dedup + entropy compression

Usage:
  mshzip pack   -i <input> -o <output> [options]
  mshzip unpack -i <input> -o <output>
  mshzip info   -i <file>
  mshzip multi  pack   <files...> --out-dir <dir> [--workers N] [options]
  mshzip multi  unpack <files...> --out-dir <dir> [--workers N]

pack options:
  -i <path>      Input file path (- for stdin)
  -o <path>      Output file path (- for stdout)
  --chunk <N|auto> Chunk size in bytes or auto (default: auto)
  --frame <N>    Max bytes per frame (default: ${DEFAULT_FRAME_LIMIT})
  --codec <type> Codec: gzip | none (default: ${DEFAULT_CODEC})
  --crc          Append CRC32 checksum
  --verbose      Verbose output

unpack options:
  -i <path>      Input .msh file path (- for stdin)
  -o <path>      Output file path (- for stdout)

multi options:
  --out-dir <dir>   Output directory (auto-created)
  --workers <N>     Number of workers (default: CPU core count)
  --chunk, --frame, --codec, --crc also available

info options:
  -i <path>      Display frame info of .msh file

Examples:
  mshzip pack -i data.bin -o data.msh --chunk 128 --codec gzip
  mshzip unpack -i data.msh -o data.bin
  mshzip pack -i - -o - --chunk 1024 < input.log > output.msh
  mshzip info -i data.msh
  mshzip multi pack f1.bin f2.log --out-dir ./compressed --workers 4
  mshzip multi unpack f1.msh f2.msh --out-dir ./restored
`);
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '-i': opts.input = argv[++i]; break;
      case '-o': opts.output = argv[++i]; break;
      case '--chunk': {
        const rawVal = argv[++i];
        opts.chunkSize = rawVal === 'auto' ? 'auto' : parseInt(rawVal, 10);
        break;
      }
      case '--frame': opts.frameLimit = parseInt(argv[++i], 10); break;
      case '--codec': opts.codec = argv[++i]; break;
      case '--crc': opts.crc = true; break;
      case '--verbose': opts.verbose = true; break;
    }
  }
  return opts;
}

/**
 * Stream-based pack
 */
async function handlePack(argv) {
  const opts = parseArgs(argv);

  if (!opts.input || !opts.output) {
    console.error('Error: -i and -o are required.');
    process.exit(2);
  }

  const chunkSize = opts.chunkSize !== undefined ? opts.chunkSize : DEFAULT_CHUNK_SIZE;
  if (chunkSize !== 'auto') {
    if (chunkSize < MIN_CHUNK_SIZE || chunkSize > MAX_CHUNK_SIZE) {
      console.error(`Error: --chunk range: ${MIN_CHUNK_SIZE}~${MAX_CHUNK_SIZE} or auto`);
      process.exit(2);
    }
  }

  const startTime = Date.now();

  const inputStream = opts.input === '-'
    ? process.stdin
    : fs.createReadStream(opts.input);
  const outputStream = opts.output === '-'
    ? process.stdout
    : fs.createWriteStream(opts.output);

  const ps = new PackStream({
    chunkSize,
    frameLimit: opts.frameLimit || DEFAULT_FRAME_LIMIT,
    codec: opts.codec || DEFAULT_CODEC,
    crc: !!opts.crc,
  });

  await pipeline(inputStream, ps, outputStream);

  const elapsed = Date.now() - startTime;
  const { bytesIn: origSize, bytesOut: compSize, dictSize, chunkSize: actualChunk } = ps.stats;

  if (opts.verbose || opts.output !== '-') {
    const ratio = origSize > 0 ? ((1 - compSize / origSize) * 100).toFixed(1) : '0.0';
    const speed = origSize > 0 ? ((origSize / 1024 / 1024) / (elapsed / 1000)).toFixed(1) : '0';
    const chunkLabel = chunkSize === 'auto' ? `${actualChunk}B (auto-detected)` : `${actualChunk}B`;

    console.error(`[pack done]`);
    console.error(`  Original: ${formatSize(origSize)}`);
    console.error(`  Compressed: ${formatSize(compSize)} (${ratio}% reduction)`);
    console.error(`  Chunk: ${chunkLabel}, Dict: ${dictSize} unique chunks`);
    console.error(`  Codec: ${opts.codec || DEFAULT_CODEC}`);
    console.error(`  Time: ${elapsed}ms (${speed} MB/s)`);
  }
}

/**
 * Stream-based unpack
 */
async function handleUnpack(argv) {
  const opts = parseArgs(argv);

  if (!opts.input || !opts.output) {
    console.error('Error: -i and -o are required.');
    process.exit(2);
  }

  const startTime = Date.now();

  const inputStream = opts.input === '-'
    ? process.stdin
    : fs.createReadStream(opts.input);
  const outputStream = opts.output === '-'
    ? process.stdout
    : fs.createWriteStream(opts.output);

  const us = new UnpackStream();
  await pipeline(inputStream, us, outputStream);

  const elapsed = Date.now() - startTime;
  const { bytesIn: compSize, bytesOut: origSize } = us.stats;

  if (opts.output !== '-') {
    const speed = origSize > 0 ? ((origSize / 1024 / 1024) / (elapsed / 1000)).toFixed(1) : '0';
    console.error(`[unpack done]`);
    console.error(`  Compressed: ${formatSize(compSize)}`);
    console.error(`  Restored: ${formatSize(origSize)}`);
    console.error(`  Time: ${elapsed}ms (${speed} MB/s)`);
  }
}

/**
 * Multi-file parallel processing
 */
async function handleMulti(argv) {
  const subCmd = argv[0]; // 'pack' | 'unpack'
  if (subCmd !== 'pack' && subCmd !== 'unpack') {
    console.error('Error: specify pack or unpack after multi.');
    process.exit(2);
  }

  const rest = argv.slice(1);
  const files = [];
  const opts = { workers: os.cpus().length };

  for (let i = 0; i < rest.length; i++) {
    switch (rest[i]) {
      case '--out-dir': opts.outDir = rest[++i]; break;
      case '--workers': opts.workers = parseInt(rest[++i], 10); break;
      case '--chunk': {
        const rawV = rest[++i];
        opts.chunkSize = rawV === 'auto' ? 'auto' : parseInt(rawV, 10);
        break;
      }
      case '--frame': opts.frameLimit = parseInt(rest[++i], 10); break;
      case '--codec': opts.codec = rest[++i]; break;
      case '--crc': opts.crc = true; break;
      case '--verbose': opts.verbose = true; break;
      default: files.push(rest[i]); break;
    }
  }

  if (files.length === 0) {
    console.error('Error: specify files to process.');
    process.exit(2);
  }
  if (!opts.outDir) {
    console.error('Error: --out-dir is required.');
    process.exit(2);
  }

  // Create output directory
  fs.mkdirSync(opts.outDir, { recursive: true });

  const { WorkerPool } = require('./lib/parallel');
  const pool = new WorkerPool(opts.workers);
  pool.init();

  // Build task list
  const tasks = files.map(f => {
    const basename = path.basename(f);
    const outName = subCmd === 'pack'
      ? basename + '.msh'
      : basename.replace(/\.msh$/, '') || basename + '.bin';
    return {
      type: subCmd,
      inputPath: path.resolve(f),
      outputPath: path.join(path.resolve(opts.outDir), outName),
      opts: {
        chunkSize: opts.chunkSize !== undefined ? opts.chunkSize : DEFAULT_CHUNK_SIZE,
        frameLimit: opts.frameLimit || DEFAULT_FRAME_LIMIT,
        codec: opts.codec || DEFAULT_CODEC,
        crc: !!opts.crc,
      },
    };
  });

  const startTime = Date.now();
  const results = await pool.runAll(tasks);
  await pool.destroy();

  const elapsed = Date.now() - startTime;
  let totalIn = 0, totalOut = 0;
  let passCount = 0, failCount = 0;

  console.error(`\n[multi ${subCmd} done] ${files.length} files, ${opts.workers} workers\n`);

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const fname = path.basename(files[i]);
    if (r.success) {
      passCount++;
      totalIn += r.stats.inputSize;
      totalOut += r.stats.outputSize;
      if (opts.verbose) {
        console.error(`  ✅ ${fname}: ${formatSize(r.stats.inputSize)} → ${formatSize(r.stats.outputSize)} (${r.stats.elapsed}ms)`);
      }
    } else {
      failCount++;
      console.error(`  ❌ ${fname}: ${r.error}`);
    }
  }

  const speed = totalIn > 0 ? ((totalIn / 1024 / 1024) / (elapsed / 1000)).toFixed(1) : '0';
  console.error(`\n  Total: ${formatSize(totalIn)} → ${formatSize(totalOut)}`);
  console.error(`  Pass: ${passCount}, Fail: ${failCount}`);
  console.error(`  Time: ${elapsed}ms (${speed} MB/s)`);
}

function handleInfo(argv) {
  const opts = parseArgs(argv);

  if (!opts.input) {
    console.error('Error: -i is required.');
    process.exit(2);
  }

  const { MAGIC, CODEC, FLAG, FRAME_HEADER_SIZE } = require('./lib/constants');
  const { CODEC_ID_TO_NAME } = require('./lib/constants');

  const input = fs.readFileSync(opts.input);
  let offset = 0;
  let frameNo = 0;
  let totalOrig = 0;

  console.log(`File: ${opts.input} (${formatSize(input.length)})`);
  console.log('─'.repeat(60));

  while (offset < input.length) {
    const magic = input.slice(offset, offset + 4);
    if (!magic.equals(MAGIC)) {
      console.error(`Frame ${frameNo}: invalid magic number at offset ${offset}`);
      break;
    }

    let off = offset;
    off += 4;
    const version = input.readUInt16LE(off); off += 2;
    const flags = input.readUInt16LE(off); off += 2;
    const chunkSize = input.readUInt32LE(off); off += 4;
    const codecId = input.readUInt8(off); off += 1;
    off += 3;
    const origLo = input.readUInt32LE(off); off += 4;
    const origHi = input.readUInt32LE(off); off += 4;
    const origBytes = origHi * 0x100000000 + origLo;
    const dictEntries = input.readUInt32LE(off); off += 4;
    const seqCount = input.readUInt32LE(off); off += 4;
    const payloadSize = input.readUInt32LE(off); off += 4;

    const hasCRC = (flags & FLAG.CRC32) !== 0;
    const frameSize = FRAME_HEADER_SIZE + 4 + payloadSize + (hasCRC ? 4 : 0);

    console.log(`Frame #${frameNo}:`);
    console.log(`  Version: ${version}, Codec: ${CODEC_ID_TO_NAME[codecId] || codecId}`);
    console.log(`  Chunk size: ${chunkSize}B`);
    console.log(`  Original bytes: ${formatSize(origBytes)}`);
    console.log(`  New dict entries: ${dictEntries}`);
    console.log(`  Sequence count: ${seqCount}`);
    console.log(`  Payload: ${formatSize(payloadSize)}`);
    console.log(`  CRC32: ${hasCRC ? 'yes' : 'no'}`);
    console.log(`  Frame size: ${formatSize(frameSize)}`);

    totalOrig += origBytes;
    offset += frameSize;
    frameNo++;
  }

  console.log('─'.repeat(60));
  console.log(`Total ${frameNo} frames, original total: ${formatSize(totalOrig)}`);
  console.log(`Compressed file size: ${formatSize(input.length)}`);
  if (totalOrig > 0) {
    console.log(`Compression ratio: ${((1 - input.length / totalOrig) * 100).toFixed(1)}%`);
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)}GB`;
}
