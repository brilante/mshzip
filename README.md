# mshzip

[![npm](https://img.shields.io/npm/v/msh-zip)](https://www.npmjs.com/package/msh-zip)
[![PyPI](https://img.shields.io/pypi/v/mshzip)](https://pypi.org/project/mshzip/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue)](https://www.python.org/)

**Fixed-chunk SHA-256 deduplication + gzip entropy compression.**
Node.js and Python share the MSH1 binary format — 100% cross-compatible.

> 530 tests passed (Node.js 253 + Python 253 + Stress 56)

---

## Why mshzip?

Standard compressors (gzip, zstd) use a sliding window (typically 32 KB) to find redundancy. Any repeated pattern beyond that window is invisible to them.

```
gzip:     Input ──→ Sliding window compression (32KB) ──→ Output
mshzip:   Input ──→ Fixed-chunk split ──→ SHA-256 global dedup ──→ gzip ──→ Output
```

mshzip deduplicates across the **entire file** before compressing. This two-stage approach captures repetition that sliding-window compressors miss entirely.

### mshzip vs gzip — Measured Compression

| Data Type | mshzip | gzip | Advantage |
|-----------|:------:|:----:|:---------:|
| Repeated patterns (config copies, templates) | **100%** | ~60% | **+40%** |
| CSV (same schema, many rows) | **88%** | ~70% | **+18%** |
| JSON (repeated key names) | **85%** | ~65% | **+20%** |
| Server logs (structured, timestamped) | **82%** | ~65% | **+17%** |
| Mixed text (HTML, source code) | 55% | ~50% | +5% |
| Random binary | -1.6% | -0.1% | No benefit |

### mshzip vs Alternatives

| Tool | Strength | Weakness | vs mshzip |
|------|----------|----------|-----------|
| **gzip** | Universal, everywhere | 32 KB window limit | mshzip +15~40% on repetitive data |
| **zstd** | Best ratio/speed balance | No deduplication | zstd wins general-purpose; mshzip wins on repetitive data |
| **rsync** | Network-level dedup | Both-side install, file-level | mshzip is single-file, app-level |
| **ZFS dedup** | Block-level dedup | Filesystem-bound, high RAM | mshzip is portable, app-level |

### When to Use

- Server logs, CSV exports, JSON datasets — backup or transfer
- Data pipelines with repeating schemas at high volume
- Cross-platform workflows needing the same format on Node.js and Python
- Bandwidth-constrained transfers (≤100 Mbps) of GB-scale data

### When NOT to Use

- Media files (mp4, jpg, mp3) — already compressed, -1~-2% overhead
- Encrypted or random binary — no patterns to deduplicate
- 10 Gbps+ LAN — CPU pack/unpack time exceeds raw transfer time

---

## Quick Start

### Install

```bash
# Node.js
npm install msh-zip

# Python
pip install mshzip
```

### Node.js

```bash
# Pack / Unpack
node cli.js pack -i data.bin -o data.msh
node cli.js unpack -i data.msh -o data.bin

# File info
node cli.js info -i data.msh

# Parallel processing
node cli.js multi pack *.log --out-dir ./compressed --workers 4

# Streaming (stdin/stdout)
cat data.bin | node cli.js pack -i - -o - > data.msh

# Run tests
npm test
```

### Python

```bash
# Pack / Unpack
mshzip pack -i data.bin -o data.msh
mshzip unpack -i data.msh -o data.bin

# File info
mshzip info -i data.msh

# Parallel processing
mshzip multi pack file1.bin file2.bin --out-dir ./compressed --workers 4

# Streaming (stdin/stdout)
cat data.bin | mshzip pack -i - -o - > data.msh

# Run tests
cd python && pytest
```

### CLI Options

```
mshzip pack -i <input> -o <output> [options]
  --chunk <N|auto>  Chunk size in bytes or auto (default: auto)
  --frame <N>       Max bytes per frame (default: 64MB)
  --codec <type>    gzip | none (default: gzip)
  --crc             Enable CRC32 checksum
  --verbose         Verbose output

mshzip unpack -i <input> -o <output>
mshzip info -i <file>
mshzip multi pack|unpack <files...> --out-dir <dir> [--workers N]
```

---

## API

### Node.js

```javascript
const { pack, unpack } = require('msh-zip');

// Simple
const compressed = pack(Buffer.from('hello world'.repeat(100)));
const restored = unpack(compressed);

// With options
const compressed2 = pack(data, {
  chunkSize: 256,     // 'auto' | 8 ~ 16MB
  frameLimit: 64 * 1024 * 1024,
  codec: 'gzip',      // 'gzip' | 'none'
  crc: true
});

// Streaming
const { PackStream, UnpackStream } = require('msh-zip');
const { pipeline } = require('stream/promises');

const ps = new PackStream({ chunkSize: 128, codec: 'gzip' });
await pipeline(fs.createReadStream('data.bin'), ps, fs.createWriteStream('data.msh'));
console.log(ps.stats);  // { bytesIn, bytesOut, frameCount, dictSize, chunkSize }

// Parallel
const { WorkerPool } = require('msh-zip/lib/parallel');
const pool = new WorkerPool(4);
await pool.init();
await pool.runAll([
  { type: 'pack', inputPath: 'a.bin', outputPath: 'a.msh' },
  { type: 'pack', inputPath: 'b.bin', outputPath: 'b.msh' },
]);
pool.destroy();
```

### Python

```python
import mshzip

# Simple
compressed = mshzip.pack(b'hello world' * 100)
restored = mshzip.unpack(compressed)

# With options
compressed2 = mshzip.pack(data,
    chunk_size=256,     # 'auto' | 8 ~ 16MB
    frame_limit=64 * 1024 * 1024,
    codec='gzip',       # 'gzip' | 'none'
    crc=True
)

# Streaming
from mshzip import PackStream, pack_stream

ps = PackStream(chunk_size=256)
for frame in ps.feed(data_chunk):
    output.write(frame)
for frame in ps.flush():
    output.write(frame)

# File I/O
with open('input.bin', 'rb') as inp, open('output.msh', 'wb') as out:
    stats = pack_stream(inp, out, chunk_size=256, codec='gzip')

# Parallel
from mshzip.parallel import WorkerPool, Task
pool = WorkerPool(num_workers=4)
pool.run_all([
    Task(type='pack', input_path='a.bin', output_path='a.msh'),
    Task(type='unpack', input_path='b.msh', output_path='b.bin'),
])
pool.shutdown()
```

---

## Benchmarks

### Compression by Data Type (50 MB, chunk=128B, gzip)

| Data Type | Output | Ratio | Pack Speed | Unpack Speed |
|-----------|-------:|------:|-----------:|-------------:|
| Repetitive pattern | 2.7 KB | **100.0%** | 95 MB/s | 1,276 MB/s |
| All zeros | 1.8 KB | **100.0%** | 98 MB/s | 2,119 MB/s |
| Single byte (0x42) | 1.8 KB | **100.0%** | 100 MB/s | 2,079 MB/s |
| CSV | 6.0 MB | **88.0%** | 61 MB/s | 286 MB/s |
| JSON | 7.4 MB | **85.1%** | 60 MB/s | 302 MB/s |
| Log files | 9.0 MB | **82.0%** | 56 MB/s | 274 MB/s |
| Binary struct | 15.9 MB | **68.2%** | 52 MB/s | 251 MB/s |
| Mixed text | 22.7 MB | **54.7%** | 44 MB/s | 228 MB/s |
| Random binary (10 MB) | 10.2 MB | -1.6% | 35 MB/s | 441 MB/s |

### Speed by Chunk Size (1 MB repeat, gzip)

| Chunk Size | Ratio | Pack Speed | Pack Time |
|-----------:|------:|-----------:|----------:|
| 4096 B | 99.9% | **1,177 MB/s** | 0.8 ms |
| 1024 B | 100.0% | 680 MB/s | 1.5 ms |
| 256 B | 100.0% | 215 MB/s | 4.6 ms |
| 128 B | 100.0% | 70 MB/s | 14.2 ms |
| 8 B | 99.9% | 6 MB/s | 156.0 ms |

### Large File Performance (gzip, chunk=1024B)

| Input | Output | Ratio | Pack Speed | Pack Time |
|------:|-------:|------:|-----------:|----------:|
| 100 MB (repeat) | 1,005 B | **100.0%** | **691 MB/s** | 145 ms |
| 50 MB (repeat) | 587 B | **100.0%** | **645 MB/s** | 78 ms |
| 50 MB (log) | 8.3 MB | **83.5%** | 189 MB/s | 264 ms |

### Transfer Time — Raw vs mshzip

> Formula: `mshzip total = pack time + (compressed size / network speed) + unpack time`

**1 GB Log File (84.8% compression)**

| Method | 10 Mbps | 100 Mbps | 1 Gbps |
|--------|--------:|--------:|-------:|
| Raw transfer | 14.3m | 1.4m | 8.6s |
| mshzip + transfer | 3.4m | 1.4m | 1.2m |
| Speedup | **4.2x** | ~1x | 0.11x |

**10 GB Repetitive Data (100% compression)**

| Method | 10 Mbps | 100 Mbps | 1 Gbps |
|--------|--------:|--------:|-------:|
| Raw transfer | 2.4h | 14.3m | 1.4m |
| mshzip + transfer | 1.4m | 1.4m | 1.4m |
| Speedup | **105x** | **10.6x** | **1.06x** |

### Streaming

```
Producer → PackStream → Network → UnpackStream → Consumer
           (frame-by-frame, no full-file buffering)
```

| Data | Streaming | Buffered | Notes |
|------|----------:|---------:|-------|
| Log 1 MB | 89 ms | 80 ms + send | ~1x (negligible overhead) |
| Log 10 MB | 318 ms | 172 ms + send | 50% already sent by pack end |
| Repeat 10 MB | 222 ms | 106 ms + send | Output ~330B, instant send |

### Parallel Multi-File

| Files | 1 Worker | 4 Workers | Speedup |
|------:|---------:|----------:|--------:|
| 4 x 1 MB | 73 ms | 40 ms | **1.8x** |
| 10 x 1 MB | — | 67 ms | **149 MB/s** |

---

## How It Works

### Pack

```
Input data
  │
  ├─ 1. Auto chunk size detection (1MB sampling)
  │     Candidates: [32, 64, 128, 256, 512, 1024, 2048, 4096]B
  │     Cost = (unique chunks × chunk size) + (total chunks × varint bytes)
  │     → Select minimum cost
  │
  ├─ 2. Split into fixed-size chunks (last chunk 0x00-padded)
  │
  ├─ 3. SHA-256 hash each chunk → deduplication
  │     New chunk     → add to dictionary (assign global index)
  │     Existing chunk → reference existing index
  │
  ├─ 4. Frame generation (split at frameLimit, default 64MB)
  │     Dictionary section: new chunks in this frame
  │     Sequence section:   varint-encoded index array
  │
  ├─ 5. gzip compress payload (level=1, speed-optimized)
  │
  └─ 6. Output: Header(32B) + PayloadSize(4B) + Payload [+ CRC32(4B)]
```

### Unpack

```
MSH1 file
  │
  ├─ 1. Verify magic number 'MSH1'
  ├─ 2. Parse frame header (32B)
  ├─ 3. gzip decompress payload
  ├─ 4. Extract dictionary chunks → accumulate in global dictionary
  ├─ 5. Decode varint sequence → index array
  ├─ 6. Index → chunk lookup → reassemble in order
  └─ 7. Trim by origBytes (remove padding)
```

### Example

```
640B input (chunkSize=128B)
  → 5 chunks: [A, B, A, A, C]  (A appears 3 times)
  → Dictionary: 3 unique × 128B = 384B
  → Sequence: [0, 1, 0, 0, 2] = 5 bytes (varint)
  → gzip → compressed output

100MB repetitive pattern
  → 781,250 chunks, ~10 unique
  → Dictionary: 1,280B + Sequence: ~781KB → gzip → ~1.4KB
  → 99.9999% compression
```

### Auto Chunk Detection

| Data Type | Auto-selected | Reason |
|-----------|:------------:|--------|
| 10B pattern repeat | 128B | Small pattern → small chunks maximize dedup |
| 256B pattern repeat | 256B | Pattern size match → optimal 1:1 mapping |
| Log files | 256B | Log lines ~200B → captures structural repetition |
| JSON documents | 512B | Repeats at JSON object granularity |
| Random binary | 2048B | Dedup impossible → large chunks minimize overhead |

---

## MSH1 Binary Format

Full specification: [spec/FORMAT.md](spec/FORMAT.md)

### Frame Layout

```
┌──────────────────┬───────────────┬─────────────────────┬────────────┐
│ Frame Header 32B │ PayloadSize 4B│ Compressed Payload   │ CRC32 4B   │
└──────────────────┴───────────────┴─────────────────────┴────────────┘
```

### Frame Header (32 bytes, Little-Endian)

| Offset | Size | Field | Description |
|:------:|:----:|-------|-------------|
| 0 | 4 | magic | `MSH1` (0x4D534831) |
| 4 | 2 | version | Format version (1) |
| 6 | 2 | flags | Bit flags (0x0001 = CRC32) |
| 8 | 4 | chunkSize | Chunk size (8B ~ 16MB) |
| 12 | 1 | codecId | 0 = none, 1 = gzip |
| 13 | 3 | padding | Reserved (0x000000) |
| 16 | 8 | origBytes | Original size (uint64, split Lo+Hi) |
| 24 | 4 | dictEntries | New dictionary entries in frame |
| 28 | 4 | seqCount | Sequence index count |

### Payload (after decompression)

```
[Dictionary: dictEntries × chunkSize bytes] [Sequence: seqCount × uvarint indices]
```

### Multi-frame

```
┌──────────┬──────────┬─────┬──────────┐
│ Frame #0 │ Frame #1 │ ... │ Frame #N │
└──────────┴──────────┴─────┴──────────┘
  • Split at frameLimit (default 64MB)
  • Dictionary accumulates across frames (global)
  • 64-bit origBytes supports 4GB+ files
```

---

## Cross-compatibility

Node.js and Python produce byte-identical MSH1 files. The `spec/test-vectors/` directory contains 12 test vectors for verification.

```bash
# Generate vectors (Node.js)
cd spec && node generate-vectors.js

# Verify (Python)
cd python && pytest tests/test_compat.py -v
```

| Vector | Original | MSH | Purpose |
|--------|:--------:|:---:|---------|
| empty | 0B | 36B | Empty input edge case |
| single-byte | 1B | 60B | Minimal input |
| boundary-127 / 128 / 129 | 127~129B | 61~64B | Chunk boundary ±1 |
| small-repeat | 1KB | 323B | Repetitive pattern dedup |
| multi-frame | 512B | 499B | Multi-frame (chunk=32, frame=128) |
| crc32 | 300B | 85B | CRC32 enabled |
| codec-none | 420B | 552B | Uncompressed codec |
| large-chunk | 8KB | 91B | Large chunk (4096B) |
| text-data | 1.3KB | 96B | Text data |
| binary-random | 2KB | 2.1KB | Random binary overhead check |

---

## Key Features

| Feature | Description |
|---------|-------------|
| **SHA-256 Dedup** | Fixed-chunk hash-based deduplication across entire file |
| **Auto Chunk Detection** | 1MB sampling → selects optimal chunk size (8~4096B) |
| **Streaming** | Node.js Transform Stream / Python Generator — frame-by-frame, constant memory |
| **Parallel Processing** | Node.js Worker Threads / Python ProcessPoolExecutor |
| **Multi-frame** | Dictionary accumulates across frames; 64-bit origBytes (4GB+ files) |
| **CRC32** | Optional per-frame integrity verification |
| **Cross-compatible** | Node.js ↔ Python MSH1 files 100% interchangeable |
| **CLI** | 4 commands: `pack` / `unpack` / `info` / `multi` (identical in both) |
| **Pipe-friendly** | stdin/stdout with `-i -` / `-o -` |

---

## Project Structure

```
mshzip/
├── spec/                           # MSH1 format spec + test vectors
│   ├── FORMAT.md
│   ├── generate-vectors.js
│   └── test-vectors/               # 12 .bin + .msh pairs
│
├── nodejs/                         # Node.js implementation
│   ├── cli.js                      # CLI (pack/unpack/info/multi)
│   ├── lib/                        # Core (7 modules)
│   │   ├── index.js                # Exports
│   │   ├── constants.js            # MSH1 constants
│   │   ├── packer.js               # SHA-256 dedup + frame assembly
│   │   ├── unpacker.js             # Frame parsing + dict accumulation
│   │   ├── stream.js               # PackStream / UnpackStream
│   │   ├── varint.js               # LEB128 uvarint
│   │   └── parallel.js             # Worker Thread pool
│   ├── test/benchmark.js           # 221 tests
│   └── package.json
│
├── python/                         # Python implementation
│   ├── src/mshzip/                 # Core (8 modules)
│   │   ├── __init__.py             # Public API
│   │   ├── constants.py            # MSH1 constants
│   │   ├── packer.py               # SHA-256 dedup + frame assembly
│   │   ├── unpacker.py             # Frame parsing + dict accumulation
│   │   ├── stream.py               # Generator-based streaming
│   │   ├── varint.py               # LEB128 uvarint
│   │   ├── parallel.py             # ProcessPoolExecutor
│   │   └── cli.py                  # CLI entry point
│   ├── tests/                      # 253 pytest tests
│   └── pyproject.toml
│
└── .github/workflows/ci.yml        # CI: test + lint + docker
```

### Module Roles

| Module | Node.js | Python | Role |
|--------|---------|--------|------|
| constants | `lib/constants.js` | `constants.py` | Magic, header size, defaults, codec IDs |
| varint | `lib/varint.js` | `varint.py` | LEB128 variable integer codec |
| packer | `lib/packer.js` | `packer.py` | SHA-256 dictionary, chunk split, frame assembly |
| unpacker | `lib/unpacker.js` | `unpacker.py` | Frame parse, dict accumulation, index→chunk |
| stream | `lib/stream.js` | `stream.py` | Transform Stream / Generator |
| parallel | `lib/parallel.js` | `parallel.py` | Worker Threads / ProcessPoolExecutor |
| cli | `cli.js` | `cli.py` | 4 commands: pack / unpack / info / multi |

---

## Defaults

| Constant | Value | Description |
|----------|:-----:|-------------|
| `DEFAULT_CHUNK_SIZE` | auto | Auto detection (fallback: 128B) |
| `DEFAULT_FRAME_LIMIT` | 64 MB | Max input bytes per frame |
| `DEFAULT_CODEC` | gzip | gzip level=1 (speed-optimized) |
| `MIN_CHUNK_SIZE` | 8 B | Minimum chunk size |
| `MAX_CHUNK_SIZE` | 16 MB | Maximum chunk size |

---

## Limitations

1. **Dictionary memory** — Random data with many unique chunks: memory ≈ original size
2. **Pre-compressed data** — mp4, zip, jpg: no dedup effect (-1~-2% overhead)
3. **Codecs** — Only gzip (level=1) and none
4. **No cross-file dictionary** — Each file has independent dictionary in parallel mode
5. **V8 Map limit** — Auto chunk-size increase needed past ~16.77M chunks (5GB+ in Node.js)

---

## Publishing

```bash
# npm
cd nodejs && npm pack          # → msh-zip-1.0.2.tgz

# PyPI
cd python && uv build          # → dist/mshzip-1.0.1.tar.gz
```

---

## License

MIT
