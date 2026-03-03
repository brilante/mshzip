'use strict';

/**
 * 다층 벤치마크 — Node.js
 * Layer 1: 데이터 유형, Layer 2: 크기, Layer 3: 차원, Layer 4: 모드, Layer 5: CRC
 * 결과를 SQLite DB에 저장
 */

const { Packer, Unpacker } = require('../nodejs/lib');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const DB_PATH = path.join(__dirname, 'results.db');

// ── 테스트 데이터 생성 ──

function generateText(size) {
  const words = 'The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet consectetur adipiscing elit. ';
  let buf = '';
  while (buf.length < size) buf += words;
  return Buffer.from(buf.slice(0, size), 'utf-8');
}

function generateBinary(size) {
  // 반복 패턴 센서 데이터 시뮬레이션 (16바이트 패턴 반복 + 약간의 변형)
  const pattern = Buffer.from([0x01, 0x02, 0x03, 0x04, 0xAA, 0xBB, 0xCC, 0xDD,
                                0x10, 0x20, 0x30, 0x40, 0x50, 0x60, 0x70, 0x80]);
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    buf[i] = (pattern[i % 16] + Math.floor(i / 256)) & 0xFF;
  }
  return buf;
}

function generateRandom(size) {
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i++) buf[i] = Math.floor(Math.random() * 256);
  return buf;
}

function generateMixed(size) {
  const half = Math.floor(size / 2);
  return Buffer.concat([generateText(half), generateRandom(size - half)]);
}

const DATA_GENERATORS = {
  text: generateText,
  binary: generateBinary,
  random: generateRandom,
  mixed: generateMixed,
};

// ── DB 설정 ──

function initDB() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS benchmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      data_type TEXT NOT NULL,
      data_size INTEGER NOT NULL,
      mode TEXT NOT NULL,
      dimensions INTEGER,
      crc INTEGER NOT NULL,
      compressed_size INTEGER NOT NULL,
      ratio REAL NOT NULL,
      pack_ms REAL NOT NULL,
      unpack_ms REAL NOT NULL,
      roundtrip_ok INTEGER NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_bench_mode ON benchmarks(mode);
    CREATE INDEX IF NOT EXISTS idx_bench_type ON benchmarks(data_type);
    CREATE INDEX IF NOT EXISTS idx_bench_size ON benchmarks(data_size);
  `);
  return db;
}

// ── 벤치마크 실행 ──

function runBenchmark(data, mode, dimensions, crc) {
  const opts = { crc };

  if (mode === 'coorddict') {
    opts.coordDict = true;
    opts.dimensions = dimensions;
  } else if (mode === 'bitdict') {
    opts.bitDepth = 8;
  }

  // Pack
  const packStart = performance.now();
  const packer = new Packer(opts);
  const compressed = packer.pack(data);
  const packMs = performance.now() - packStart;

  // Unpack
  const unpackStart = performance.now();
  const unpacker = new Unpacker();
  const restored = unpacker.unpack(compressed);
  const unpackMs = performance.now() - unpackStart;

  const roundtripOk = Buffer.compare(data, restored) === 0;
  const ratio = (1 - compressed.length / data.length) * 100;

  return {
    compressed_size: compressed.length,
    ratio: Math.round(ratio * 100) / 100,
    pack_ms: Math.round(packMs * 100) / 100,
    unpack_ms: Math.round(unpackMs * 100) / 100,
    roundtrip_ok: roundtripOk ? 1 : 0,
  };
}

// ── 메인 ──

function main() {
  const db = initDB();
  const insert = db.prepare(`
    INSERT INTO benchmarks (platform, data_type, data_size, mode, dimensions, crc,
                            compressed_size, ratio, pack_ms, unpack_ms, roundtrip_ok)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const DATA_TYPES = ['text', 'binary', 'random', 'mixed'];
  const SIZES = [256, 1024, 4096, 16384, 65536, 262144, 1048576];
  const DIMENSIONS = [2, 4, 8, 16, 32];
  const CRC_OPTIONS = [0, 1];

  let total = 0;
  let passed = 0;

  console.log('=== Node.js 다층 벤치마크 시작 ===');
  console.log(`CPU: ${os.cpus()[0].model}, Cores: ${os.cpus().length}`);
  console.log('');

  const insertMany = db.transaction((rows) => {
    for (const r of rows) insert.run(...r);
  });

  const rows = [];

  for (const dtype of DATA_TYPES) {
    for (const size of SIZES) {
      const data = DATA_GENERATORS[dtype](size);
      const sizeLabel = size >= 1048576 ? `${size / 1048576}MB` :
                        size >= 1024 ? `${size / 1024}KB` : `${size}B`;

      for (const crc of CRC_OPTIONS) {
        // Mode: normal
        try {
          const r = runBenchmark(data, 'normal', null, crc === 1);
          rows.push(['nodejs', dtype, size, 'normal', null, crc,
                     r.compressed_size, r.ratio, r.pack_ms, r.unpack_ms, r.roundtrip_ok]);
          total++;
          if (r.roundtrip_ok) passed++;
        } catch (e) {
          console.log(`  FAIL normal ${dtype}/${sizeLabel}/crc=${crc}: ${e.message}`);
          total++;
        }

        // Mode: bitdict
        try {
          const r = runBenchmark(data, 'bitdict', null, crc === 1);
          rows.push(['nodejs', dtype, size, 'bitdict', null, crc,
                     r.compressed_size, r.ratio, r.pack_ms, r.unpack_ms, r.roundtrip_ok]);
          total++;
          if (r.roundtrip_ok) passed++;
        } catch (e) {
          console.log(`  FAIL bitdict ${dtype}/${sizeLabel}/crc=${crc}: ${e.message}`);
          total++;
        }

        // Mode: coorddict (각 차원별)
        for (const D of DIMENSIONS) {
          try {
            const r = runBenchmark(data, 'coorddict', D, crc === 1);
            rows.push(['nodejs', dtype, size, 'coorddict', D, crc,
                       r.compressed_size, r.ratio, r.pack_ms, r.unpack_ms, r.roundtrip_ok]);
            total++;
            if (r.roundtrip_ok) passed++;
          } catch (e) {
            console.log(`  FAIL coorddict D=${D} ${dtype}/${sizeLabel}/crc=${crc}: ${e.message}`);
            total++;
          }
        }
      }

      process.stdout.write(`  ${dtype}/${sizeLabel} done\r`);
    }
    console.log(`[${dtype}] 완료`);
  }

  insertMany(rows);
  db.close();

  console.log('');
  console.log(`=== 완료: ${passed}/${total} PASS ===`);
  console.log(`DB: ${DB_PATH}`);
}

main();
