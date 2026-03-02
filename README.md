# mshzip

[![npm](https://img.shields.io/npm/v/msh-zip)](https://www.npmjs.com/package/msh-zip)
[![PyPI](https://img.shields.io/pypi/v/mshzip)](https://pypi.org/project/mshzip/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue)](https://www.python.org/)

**Fixed-chunk SHA-256 deduplication + gzip entropy compression.**
Node.js and Python share the MSH1 binary format — 100% cross-compatible.

> 1,874 benchmark tests passed (530 unit + 1,344 integration)

---

## When to Use mshzip

mshzip excels at compressing data with **repeated patterns beyond gzip's 32 KB sliding window**. If your data contains duplicate chunks anywhere in the file — not just within a 32 KB neighborhood — mshzip will find and eliminate them.

### Decision Guide

| Your Data | Use mshzip? | Expected Compression | Network Speedup |
|-----------|:-----------:|:--------------------:|:---------------:|
| Server logs, CSV exports | **Yes** | **89%** | **8x** at 10 Mbps |
| Config copies, templates | **Yes** | **100%** | **143x** at 10 Mbps |
| JSON datasets, repeated schemas | **Yes** | **85%+** | **5x** at 50 Mbps |
| Cross-platform data pipelines | **Yes** | Node.js ↔ Python identical output | — |
| Random / encrypted binary | No | -0.8% (slight expansion) | Slower than raw |
| Already compressed (mp4, zip, jpg) | No | -1~2% overhead | Slower than raw |
| 1 Gbps+ LAN transfers | No | CPU cost > network savings | < 1x |

### Bandwidth Guide (20 MB log data, measured)

| Bandwidth | mshzip Total | Raw Transfer | Speedup | Verdict |
|----------:|:------------:|:------------:|:-------:|---------|
| 10 Mbps | 2.1 s | 16.8 s | **8.0x** | Highly effective |
| 50 Mbps | 611 ms | 3.4 s | **5.5x** | Effective |
| 100 Mbps | 425 ms | 1.7 s | **4.0x** | Effective |
| 1 Gbps | 256 ms | 168 ms | 0.65x | Not recommended |

> All numbers from 1,344 automated benchmarks across 54 algorithm combinations, 4 data types, and 3 file sizes. See [Benchmarks](#benchmarks) for full results.

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

```javascript
const { pack, unpack } = require('msh-zip');

// Compress
const compressed = pack(Buffer.from(data));
// Decompress
const original = unpack(compressed);

// With options
const compressed2 = pack(data, {
  chunkSize: 256,   // 'auto' | 8 ~ 16MB (default: 'auto')
  codec: 'gzip',    // 'gzip' | 'none'
  crc: true,        // CRC32 integrity check
});
```

### Python

```python
import mshzip

# Compress
compressed = mshzip.pack(data)
# Decompress
original = mshzip.unpack(compressed)

# With options
compressed2 = mshzip.pack(data,
    chunk_size=256,   # 'auto' | 8 ~ 16MB (default: 'auto')
    codec='gzip',     # 'gzip' | 'none'
    crc=True,         # CRC32 integrity check
)
```

### CLI

```bash
# Node.js
node cli.js pack -i data.bin -o data.msh
node cli.js unpack -i data.msh -o data.bin
node cli.js info -i data.msh

# Python
mshzip pack -i data.bin -o data.msh
mshzip unpack -i data.msh -o data.bin
mshzip info -i data.msh

# Parallel batch
mshzip multi pack *.log --out-dir ./compressed --workers 4

# Streaming (stdin/stdout)
cat data.bin | mshzip pack -i - -o - > data.msh
```

### CLI Options

```
mshzip pack -i <input> -o <output> [options]
  --chunk <N|auto>  Chunk size in bytes (default: auto)
  --frame <N>       Max bytes per frame (default: 64MB)
  --codec <type>    gzip | none (default: gzip)
  --crc             Enable CRC32 checksum
  --verbose         Verbose output

mshzip unpack -i <input> -o <output>
mshzip info -i <file>
mshzip multi pack|unpack <files...> --out-dir <dir> [--workers N]
```

---

## Benchmarks

### Compression by Data Type

Measured with `chunkSize=256` (optimal), gzip codec.

| Data Type | 1 MB | 5 MB | 20 MB | Ratio | Speed |
|-----------|-----:|-----:|------:|:-----:|------:|
| Repeated patterns | 128 B | 202 B | 470 B | **100%** | 187 MB/s |
| Shared sub-patterns | 211 B | 288 B | 556 B | **100%** | 193 MB/s |
| Server logs | 118 KB | 579 KB | 2.2 MB | **89%** | 111 MB/s |
| Random binary | 1.01 MB | 5.04 MB | 20.2 MB | -0.8% | 42 MB/s |

> 648 benchmark tests (Section 20). Ratio = `(1 - compressed/original) × 100`.

### Network Transfer: mshzip + Send vs Raw Send

Total time = pack + network transfer + unpack. Measured on 20 MB data.

**Log Data (89% compression):**

| | 10 Mbps | 50 Mbps | 100 Mbps | 1 Gbps |
|-|--------:|--------:|---------:|-------:|
| Raw | 16.8 s | 3.4 s | 1.7 s | 168 ms |
| mshzip | **2.1 s** | **611 ms** | **425 ms** | 256 ms |
| Speedup | **8.0x** | **5.5x** | **4.0x** | 0.65x |

**Repeated Patterns (100% compression):**

| | 10 Mbps | 50 Mbps | 100 Mbps | 1 Gbps |
|-|--------:|--------:|---------:|-------:|
| Raw | 16.8 s | 3.4 s | 1.7 s | 168 ms |
| mshzip | **118 ms** | **117 ms** | **117 ms** | **117 ms** |
| Speedup | **143x** | **29x** | **14x** | **1.4x** |

> 2,592 network simulation results (648 tests × 4 bandwidths).

### Why flat Dedup Wins Over Hierarchical Dedup

We tested 54 algorithm combinations across 1,344 benchmarks: 4 flat, 14 two-level, and 36 three-level hierarchical dedup configurations.

**Result: flat(256) wins every category.**

| Metric | flat (1-level) | 2-level | 3-level |
|--------|:---------:|:-------:|:-------:|
| Log compression ratio | **86.5%** | 83.1% | 79.9% |
| Log pack speed | **54 MB/s** | 12 MB/s | 6 MB/s |
| Repeat compression | 100% | 100% | 100% |
| Tests run | 48 | 168 | 432 |

Hierarchical dedup introduces multi-level dictionary overhead (headers + sub-chunk indices) that exceeds the savings from sub-chunk deduplication. The simpler single-level approach produces smaller output at higher speed.

### How It Compares

| Tool | Approach | Repeated Data | General Data | Dedup |
|------|----------|:------------:|:------------:|:-----:|
| **mshzip** | Chunk dedup + gzip | **89~100%** | 55% | **Global** |
| gzip | Sliding window (32 KB) | 60% | **55%** | Local only |
| zstd | Dictionary + window | 70% | **65%** | Local only |
| rsync | File-level delta | N/A | N/A | File-level |

mshzip wins on repetitive data because it deduplicates across the **entire file**, not just within a 32 KB window.

---

## API

### Node.js

```javascript
const { pack, unpack } = require('msh-zip');

// Buffer API
const compressed = pack(buffer, options?);
const original = unpack(compressed);

// Streaming API
const { PackStream, UnpackStream } = require('msh-zip');
const { pipeline } = require('stream/promises');

const ps = new PackStream({ chunkSize: 256, codec: 'gzip' });
await pipeline(inputStream, ps, outputStream);
console.log(ps.stats);  // { bytesIn, bytesOut, frameCount, dictSize, chunkSize }

// Parallel API
const { WorkerPool } = require('msh-zip/lib/parallel');
const pool = new WorkerPool(4);
await pool.init();
await pool.runAll([
  { type: 'pack', inputPath: 'a.bin', outputPath: 'a.msh' },
  { type: 'unpack', inputPath: 'b.msh', outputPath: 'b.bin' },
]);
pool.destroy();
```

### Python

```python
import mshzip

# Buffer API
compressed = mshzip.pack(data, chunk_size=256, codec='gzip', crc=False)
original = mshzip.unpack(compressed)

# Streaming API
from mshzip import PackStream

ps = PackStream(chunk_size=256)
for frame in ps.feed(data_chunk):
    output.write(frame)
for frame in ps.flush():
    output.write(frame)

# File I/O
from mshzip import pack_stream
stats = pack_stream(input_file, output_file, chunk_size=256)

# Parallel API
from mshzip.parallel import WorkerPool, Task
pool = WorkerPool(num_workers=4)
pool.run_all([
    Task(type='pack', input_path='a.bin', output_path='a.msh'),
])
pool.shutdown()
```

### Options

| Option | Node.js | Python | Default | Description |
|--------|---------|--------|:-------:|-------------|
| Chunk size | `chunkSize` | `chunk_size` | `'auto'` | Bytes per chunk (8 ~ 16 MB) |
| Frame limit | `frameLimit` | `frame_limit` | 64 MB | Max input bytes per frame |
| Codec | `codec` | `codec` | `'gzip'` | `'gzip'` or `'none'` |
| CRC32 | `crc` | `crc` | `false` | Per-frame integrity check |

> Auto chunk detection samples the first 1 MB and selects the size that minimizes `(unique_chunks × chunk_size) + (total_chunks × varint_bytes)`.

---

## How It Works

```
Input data
  |
  +-- 1. Auto chunk size detection (1 MB sampling)
  |     Candidates: [32, 64, 128, 256, 512, 1024, 2048, 4096] bytes
  |     Select: minimum cost = (unique × chunk_size) + (total × varint_bytes)
  |
  +-- 2. Split into fixed-size chunks (last chunk zero-padded)
  |
  +-- 3. SHA-256 hash each chunk -> deduplicate
  |     New chunk     -> add to dictionary (assign global index)
  |     Duplicate     -> reference existing index
  |
  +-- 4. Frame assembly (split at frameLimit, default 64 MB)
  |     Dictionary section: new unique chunks
  |     Sequence section:   LEB128 varint index array
  |
  +-- 5. gzip compress payload (level 1, speed-optimized)
  |
  +-- 6. Output: Header (32 B) + PayloadSize (4 B) + Payload [+ CRC32 (4 B)]
```

### Example

```
640 B input (chunkSize = 128)
  -> 5 chunks: [A, B, A, A, C]  (A appears 3 times)
  -> Dictionary: 3 unique x 128 B = 384 B
  -> Sequence: [0, 1, 0, 0, 2] = 5 bytes (varint)
  -> gzip -> compressed output

20 MB repetitive data (chunkSize = 256)
  -> 81,920 chunks, ~2 unique
  -> Dictionary: 512 B + Sequence: ~82 KB -> gzip -> 470 B
  -> 100% compression ratio
```

---

## MSH1 Binary Format

Full specification: [spec/FORMAT.md](spec/FORMAT.md)

### Frame Layout

```
+------------------+---------------+---------------------+------------+
| Frame Header 32B | PayloadSize 4B| Compressed Payload  | CRC32 4B   |
+------------------+---------------+---------------------+------------+
```

### Frame Header (32 bytes, Little-Endian)

| Offset | Size | Field | Description |
|:------:|:----:|-------|-------------|
| 0 | 4 | magic | `MSH1` (0x4D534831) |
| 4 | 2 | version | Format version (1) |
| 6 | 2 | flags | Bit flags (0x0001 = CRC32) |
| 8 | 4 | chunkSize | Chunk size in bytes (8 B ~ 16 MB) |
| 12 | 1 | codecId | 0 = none, 1 = gzip |
| 13 | 3 | reserved | 0x000000 |
| 16 | 8 | origBytes | Original data size (uint64) |
| 24 | 4 | dictEntries | New dictionary entries in this frame |
| 28 | 4 | seqCount | Sequence index count |

### Payload (after decompression)

```
[Dictionary: dictEntries x chunkSize bytes] [Sequence: seqCount x LEB128 varint]
```

### Multi-Frame

```
+----------+----------+-----+----------+
| Frame #0 | Frame #1 | ... | Frame #N |
+----------+----------+-----+----------+
```

- Split at `frameLimit` (default 64 MB input per frame)
- Dictionary accumulates across frames
- 64-bit `origBytes` supports files > 4 GB

---

## Cross-Compatibility

Node.js and Python produce **byte-identical** MSH1 files. The `spec/test-vectors/` directory contains 12 test vectors for verification.

```bash
# Node.js compress -> Python decompress
node cli.js pack -i data.bin -o data.msh
mshzip unpack -i data.msh -o restored.bin

# Python compress -> Node.js decompress
mshzip pack -i data.bin -o data.msh
node cli.js unpack -i data.msh -o restored.bin
```

| Vector | Original | MSH | Purpose |
|--------|:--------:|:---:|---------|
| empty | 0 B | 36 B | Empty input edge case |
| single-byte | 1 B | 60 B | Minimal input |
| boundary-127/128/129 | 127~129 B | 61~64 B | Chunk boundary edge cases |
| small-repeat | 1 KB | 323 B | Repetitive pattern dedup |
| multi-frame | 512 B | 499 B | Multi-frame with small frames |
| crc32 | 300 B | 85 B | CRC32 verification |
| codec-none | 420 B | 552 B | Uncompressed codec |
| large-chunk | 8 KB | 91 B | Large chunk (4096 B) |
| text-data | 1.3 KB | 96 B | Text data compression |
| binary-random | 2 KB | 2.1 KB | Random binary overhead check |

---

## Project Structure

```
mshzip/
+-- spec/                    # MSH1 format spec + 12 test vectors
+-- nodejs/                  # Node.js implementation
|   +-- cli.js               # CLI: pack / unpack / info / multi
|   +-- lib/
|   |   +-- index.js         # Public API exports
|   |   +-- packer.js        # SHA-256 dedup + frame assembly
|   |   +-- unpacker.js      # Frame parsing + reconstruction
|   |   +-- stream.js        # PackStream / UnpackStream
|   |   +-- parallel.js      # Worker Thread pool
|   |   +-- varint.js        # LEB128 unsigned varint
|   |   +-- constants.js     # MSH1 constants
|   +-- test/benchmark.js    # 253 tests
|   +-- package.json
|
+-- python/                  # Python implementation
|   +-- src/mshzip/
|   |   +-- __init__.py      # Public API exports
|   |   +-- packer.py        # SHA-256 dedup + frame assembly
|   |   +-- unpacker.py      # Frame parsing + reconstruction
|   |   +-- stream.py        # Generator-based streaming
|   |   +-- parallel.py      # ProcessPoolExecutor pool
|   |   +-- varint.py        # LEB128 unsigned varint
|   |   +-- constants.py     # MSH1 constants
|   |   +-- cli.py           # CLI entry point
|   +-- tests/               # 253 pytest tests
|   +-- pyproject.toml
```

---

## Defaults

| Constant | Value | Description |
|----------|:-----:|-------------|
| `DEFAULT_CHUNK_SIZE` | auto | Auto detection (fallback: 128 B) |
| `DEFAULT_FRAME_LIMIT` | 64 MB | Max input bytes per frame |
| `DEFAULT_CODEC` | gzip | gzip level 1 (speed-optimized) |
| `MIN_CHUNK_SIZE` | 8 B | Minimum chunk size |
| `MAX_CHUNK_SIZE` | 16 MB | Maximum chunk size |

---

## Limitations

1. **Dictionary memory** — Random data with many unique chunks: memory approaches original size
2. **Pre-compressed data** — mp4, zip, jpg produce -1~2% overhead (slight expansion)
3. **Codecs** — Only gzip (level 1) and none; no zstd or lz4
4. **No cross-file dictionary** — Each file has an independent dictionary in parallel mode
5. **High-speed networks** — At 1 Gbps+, CPU pack/unpack time exceeds network transfer savings

---

## License

MIT
