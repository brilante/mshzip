# mshzip

[![npm](https://img.shields.io/npm/v/msh-zip)](https://www.npmjs.com/package/msh-zip)
[![PyPI](https://img.shields.io/pypi/v/mshzip)](https://pypi.org/project/mshzip/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue)](https://www.python.org/)

**Fixed-chunk SHA-256 deduplication + gzip entropy compression with persistent cross-file dictionary.**
Node.js and Python share the MSH1 binary format — 100% cross-compatible.

> 2,165 tests passed (521 unit + 1,494 integration benchmarks + 150 DictStore benchmarks). 0 failures.

---

## When to Use mshzip

mshzip excels at compressing data with **repeated patterns beyond gzip's 32 KB sliding window**. If your data contains duplicate chunks anywhere in the file — not just within a 32 KB neighborhood — mshzip will find and eliminate them.

With **DictStore**, mshzip also deduplicates **across files** — compress file A, then file B reuses the shared dictionary, achieving up to **99% reduction** on repeated data.

### Decision Guide

| Your Data | Use mshzip? | Expected Compression | Network Speedup |
|-----------|:-----------:|:--------------------:|:---------------:|
| Server logs, CSV exports | **Yes** | **89%** | **8x** at 10 Mbps |
| Config copies, templates | **Yes** | **100%** | **143x** at 10 Mbps |
| JSON datasets, repeated schemas | **Yes** | **85%+** | **5x** at 50 Mbps |
| Cross-file repeated data (with DictStore) | **Yes** | **99%+** (2nd pack) | Extreme |
| Cross-platform data pipelines | **Yes** | Node.js <-> Python identical output | -- |
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

> All numbers from 1,494 automated benchmarks across 5 sections. See [Benchmarks](#benchmarks) for full results.

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

// Cross-file dedup with DictStore
const { DictStore } = require('msh-zip');
const store = new DictStore({ dictDir: './my-dicts' });
const comp1 = pack(fileA, { chunkSize: 256, useDict: true, dictStore: store });
const comp2 = pack(fileB, { chunkSize: 256, useDict: true, dictStore: store });
// comp2 is much smaller — shared chunks already in dictionary
```

### Python

```python
import mshzip

# Compress
compressed = mshzip.pack(data)
# Decompress
original = mshzip.unpack(compressed)

# Cross-file dedup with DictStore
store = mshzip.DictStore(dict_dir='./my-dicts')
comp1 = mshzip.pack(file_a, chunk_size=256, use_dict=True, dict_store=store)
comp2 = mshzip.pack(file_b, chunk_size=256, use_dict=True, dict_store=store)
# comp2 is much smaller — shared chunks already in dictionary
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

# Dictionary management
mshzip dict-init --chunk 256
mshzip dict-info --chunk 256
mshzip pack -i data.bin -o data.msh --dict-dir ./dicts
mshzip pack -i data.bin -o data.msh --no-dict
```

### CLI Options

```
mshzip pack -i <input> -o <output> [options]
  --chunk <N|auto>    Chunk size in bytes (default: auto)
  --frame <N>         Max bytes per frame (default: 64MB)
  --codec <type>      gzip | none (default: gzip)
  --crc               Enable CRC32 checksum
  --hier-dedup <mode> Hierarchical dedup: auto|true|false (default: auto)
  --sub-chunk <N>     Sub-chunk size for hier-dedup (default: 32)
  --dict-dir <path>   Dictionary directory (default: ~/.mshzip/)
  --no-dict           Disable external dictionary
  --verbose           Verbose output

mshzip unpack -i <input> -o <output> [--dict-dir <path>]
mshzip info -i <file>
mshzip dict-init --chunk <N> [--dict-dir <path>]
mshzip dict-info --chunk <N> [--dict-dir <path>]
mshzip multi pack|unpack <files...> --out-dir <dir> [--workers N]
```

---

## Benchmarks

### Test Coverage Summary

| Section | Tests | Scope |
|:-------:|------:|-------|
| Unit tests (Node.js) | 221 | Packer, Unpacker, Varint, Stream, Parallel, CLI |
| Unit tests (Python) | 300 | Packer, Unpacker, Varint, Stream, Parallel, CLI, DictStore |
| Section 17 | 192 | 2/3/4-level hierarchical dedup combinations |
| Section 18 | 288 | 3-level exhaustive (36 configurations x 4 data x 2 sizes) |
| Section 19 | 216 | Comprehensive all-level (flat + 2L + 3L, 5 MB) |
| Section 20 | 648 | Network simulation (54 configs x 3 sizes x 4 bandwidths) |
| **Section 21** | **150** | **DictStore: cross-file dedup, fallback, CRC+dict, hier+dict** |
| **Total** | **2,015** | **All passed. 0 failures.** |

### Compression by Data Type

Measured with `chunkSize=256` (optimal), gzip codec.

| Data Type | 1 MB | 5 MB | 20 MB | Ratio | Speed |
|-----------|-----:|-----:|------:|:-----:|------:|
| Repeated patterns | 128 B | 202 B | 470 B | **100%** | 187 MB/s |
| Shared sub-patterns | 211 B | 288 B | 556 B | **100%** | 193 MB/s |
| Server logs | 118 KB | 579 KB | 2.2 MB | **89%** | 111 MB/s |
| Random binary | 1.01 MB | 5.04 MB | 20.2 MB | -0.8% | 42 MB/s |

> 648 benchmark tests (Section 20). Ratio = `(1 - compressed/original) x 100`.

### DictStore: Cross-File Dedup (Section 21)

Pack file A -> dictionary learns all chunks. Pack file A again -> 2nd pack uses dictionary, drastically smaller output.

**dict-cross gain over no-dict (1 MB data, measured):**

| Data Type | No-Dict Size | 2nd Pack (Dict) | Reduction | Avg Gain |
|-----------|------------:|----------------:|:---------:|---------:|
| Repeated patterns | 149 B | 111 B | 25.5% | 20.9% |
| Shared sub-patterns | 229 B | 111 B | 51.5% | 45.5% |
| Server logs | 128 KB | 15 KB | **88.0%** | **90.7%** |
| Random binary | 1.04 MB | 15 KB | **98.6%** | **98.9%** |

> 150 DictStore benchmarks across 10 categories. Random data shows extreme gain because all chunks are already stored in dictionary.

**dict-cross gain by data size (chunk=128, all data types average):**

| Data Size | Avg Gain |
|----------:|---------:|
| 1 KB | 65.8% |
| 10 KB | 71.1% |
| 100 KB | 70.2% |
| 500 KB | 67.6% |
| 1 MB | 65.9% |
| 5 MB | 57.5% |
| 10 MB | 53.7% |

**DictStore + Hierarchical Dedup gain:**

| Configuration | Avg Gain over no-dict |
|---------------|:---------------------:|
| 128 -> 64 + dict | 67.4% |
| 128 -> 32 + dict | 67.5% |
| 256 -> 128 + dict | 69.8% |
| 256 -> 64 + dict | 70.1% |

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

> 2,592 network simulation results (648 tests x 4 bandwidths).

### How It Compares

| Tool | Approach | Repeated Data | General Data | Cross-File Dedup |
|------|----------|:------------:|:------------:|:----------------:|
| **mshzip** | Chunk dedup + gzip | **89~100%** | 55% | **Yes (DictStore)** |
| gzip | Sliding window (32 KB) | 60% | **55%** | No |
| zstd | Dictionary + window | 70% | **65%** | No |
| rsync | File-level delta | N/A | N/A | File-level |

mshzip wins on repetitive data because it deduplicates across the **entire file**, not just within a 32 KB window. With DictStore, it extends deduplication **across multiple files**.

---

## DictStore: Persistent Cross-File Dictionary

DictStore saves chunk dictionaries to disk (`.mshdict` files), enabling deduplication across pack operations and across process restarts.

### How It Works

```
File A  -->  pack(useDict=true)  -->  dict-128.mshdict (chunks saved)
File B  -->  pack(useDict=true)  -->  shared chunks found in dict -> smaller output
File C  -->  pack(useDict=true)  -->  even more chunks found -> smallest output
```

### Node.js

```javascript
const { pack, unpack, DictStore } = require('msh-zip');

// Auto mode (default: ~/.mshzip/)
const store = new DictStore({ dictDir: './my-dicts' });
const comp1 = pack(fileA, { chunkSize: 256, useDict: true, dictStore: store });
const comp2 = pack(fileB, { chunkSize: 256, useDict: true, dictStore: store });

// Unpack (EXTERNAL_DICT frames auto-load dictionary)
const orig = unpack(comp2, { dictStore: store });

// Without dictionary (classic self-contained mode)
const comp = pack(data, { chunkSize: 256, useDict: false });
```

### Python

```python
import mshzip

store = mshzip.DictStore(dict_dir='./my-dicts')
comp1 = mshzip.pack(file_a, chunk_size=256, use_dict=True, dict_store=store)
comp2 = mshzip.pack(file_b, chunk_size=256, use_dict=True, dict_store=store)

orig = mshzip.unpack(comp2, dict_store=store)
```

### Resource Limits & Fallback

| Condition | Behavior |
|-----------|----------|
| Dict file not found | Auto-create empty dictionary |
| Dict file > `maxDictSize` | Fallback to self-contained mode (no EXTERNAL_DICT) |
| `useDict: false` / `--no-dict` | Force self-contained mode |
| Unpack EXTERNAL_DICT without dict | Error with clear message |
| Dict entries < baseDictCount | Error: dictionary version mismatch |

Default `maxDictSize` = 80% of system free memory. Configurable via constructor option or `MSHZIP_MAX_DICT_SIZE` environment variable.

---

## API

### Node.js

```javascript
const { pack, unpack, DictStore } = require('msh-zip');

// Buffer API
const compressed = pack(buffer, options?);
const original = unpack(compressed, options?);

// Streaming API
const { PackStream, UnpackStream } = require('msh-zip');
const { pipeline } = require('stream/promises');

const ps = new PackStream({ chunkSize: 256, codec: 'gzip', useDict: true, dictDir: './dicts' });
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
| Hier dedup | `hierDedup` | `hier_dedup` | `'auto'` | `'auto'` / `true` / `false` |
| Sub-chunk | `subChunkSize` | `sub_chunk_size` | 32 | Sub-chunk size for hierarchical dedup |
| Use dict | `useDict` | `use_dict` | `false` | Enable persistent dictionary |
| Dict store | `dictStore` | `dict_store` | `null` | DictStore instance |
| Dict dir | `dictDir` | `dict_dir` | `~/.mshzip/` | Dictionary file directory |

> Auto chunk detection samples the first 1 MB and selects the size that minimizes `(unique_chunks x chunk_size) + (total_chunks x varint_bytes)`.

---

## How It Works

```
Input data
  |
  +-- 1. Auto chunk size detection (1 MB sampling)
  |     Candidates: [32, 64, 128, 256, 512, 1024, 2048] bytes
  |     Select: minimum cost = (unique x chunk_size) + (total x varint_bytes)
  |
  +-- 2. Load external dictionary (if DictStore enabled)
  |     dict-{chunkSize}.mshdict -> Map<SHA-256, index>
  |
  +-- 3. Split into fixed-size chunks (last chunk zero-padded)
  |
  +-- 4. SHA-256 hash each chunk -> deduplicate
  |     In external dict -> reference existing index (no data in frame)
  |     New chunk         -> add to dictionary (assign global index)
  |     Duplicate         -> reference existing index
  |
  +-- 5. Frame assembly (split at frameLimit, default 64 MB)
  |     Dictionary section: new unique chunks only
  |     Sequence section:   LEB128 varint index array
  |
  +-- 6. gzip compress payload (level 1, speed-optimized)
  |
  +-- 7. Output: Header (32 B) [+ baseDictCount (4 B)] + PayloadSize (4 B)
  |              + Payload [+ CRC32 (4 B)]
  |
  +-- 8. Save new entries to external dictionary (if DictStore enabled)
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

Cross-file dedup (2nd pack of same 1 MB log data, DictStore)
  -> All chunks found in external dict
  -> Dictionary section: 0 new entries
  -> Sequence: index references only -> 15 KB (88% smaller than no-dict)
```

---

## MSH1 Binary Format

Full specification: [spec/FORMAT.md](spec/FORMAT.md)

### Frame Layout

```
+------------------+------------------+---------------+--------------------+----------+
| Frame Header 32B | baseDictCount 4B | PayloadSize 4B| Compressed Payload | CRC32 4B |
+------------------+------------------+---------------+--------------------+----------+
                   (optional)                                               (optional)
```

### Frame Header (32 bytes, Little-Endian)

| Offset | Size | Field | Description |
|:------:|:----:|-------|-------------|
| 0 | 4 | magic | `MSH1` (0x4D534831) |
| 4 | 2 | version | Format version (1) |
| 6 | 2 | flags | Bit flags (see below) |
| 8 | 4 | chunkSize | Chunk size in bytes (8 B ~ 16 MB) |
| 12 | 1 | codecId | 0 = none, 1 = gzip |
| 13 | 3 | reserved | 0x000000 |
| 16 | 8 | origBytes | Original data size (uint64) |
| 24 | 4 | dictEntries | New dictionary entries in this frame |
| 28 | 4 | seqCount | Sequence index count |

### Flags

| Bit | Value | Name | Description |
|:---:|:-----:|------|-------------|
| 0 | 0x0001 | CRC32 | Per-frame CRC32 checksum |
| 1 | 0x0002 | HIERDEDUP | Hierarchical sub-chunk dedup |
| 2 | 0x0004 | MULTILEVEL | 3+ level hierarchical dedup |
| 3 | 0x0008 | EXTERNAL_DICT | External dictionary reference |

### MSHD Dictionary Format

Persistent dictionary files (`.mshdict`):

```
MSHD (4B magic) + version (2B) + chunkSize (4B) + entryCount (4B) = 14B header
[sha256_hash (32B) + chunk_data (chunkSize B)] x entryCount  (append-only)
```

- Filename: `dict-{chunkSize}.mshdict` (e.g., `dict-128.mshdict`)
- Default location: `~/.mshzip/`
- Append-only: entries are never modified or deleted

### Payload (after decompression)

```
[Dictionary: dictEntries x chunkSize bytes] [Sequence: seqCount x LEB128 varint]
```

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
+-- spec/                    # MSH1 + MSHD format spec + 12 test vectors
+-- nodejs/                  # Node.js implementation
|   +-- cli.js               # CLI: pack / unpack / info / multi / dict-init / dict-info
|   +-- lib/
|   |   +-- index.js         # Public API exports
|   |   +-- packer.js        # SHA-256 dedup + frame assembly + DictStore integration
|   |   +-- unpacker.js      # Frame parsing + reconstruction + EXTERNAL_DICT support
|   |   +-- dict-store.js    # Persistent MSHD dictionary management
|   |   +-- stream.js        # PackStream / UnpackStream (dict-aware)
|   |   +-- parallel.js      # Worker Thread pool
|   |   +-- varint.js        # LEB128 unsigned varint
|   |   +-- constants.js     # MSH1 + MSHD constants
|   +-- test/benchmark.js    # 221 tests
|   +-- package.json
|
+-- python/                  # Python implementation
|   +-- src/mshzip/
|   |   +-- __init__.py      # Public API exports
|   |   +-- packer.py        # SHA-256 dedup + frame assembly + DictStore integration
|   |   +-- unpacker.py      # Frame parsing + reconstruction + EXTERNAL_DICT support
|   |   +-- dict_store.py    # Persistent MSHD dictionary management
|   |   +-- stream.py        # Generator-based streaming
|   |   +-- parallel.py      # ProcessPoolExecutor pool
|   |   +-- varint.py        # LEB128 unsigned varint
|   |   +-- constants.py     # MSH1 + MSHD constants
|   |   +-- cli.py           # CLI entry point
|   +-- tests/               # 300 pytest tests (including 47 DictStore tests)
|   +-- pyproject.toml
|
+-- test/                    # Integration benchmarks
|   +-- hier-dedup/          # Section 17~21 benchmark scripts
|   |   +-- bench-combinations.js       # Section 17: 2-level combos
|   |   +-- bench-multilevel.js         # Section 17: 3/4-level combos
|   |   +-- bench-3level-exhaustive.js  # Section 18: exhaustive 3-level
|   |   +-- bench-all-comprehensive.js  # Section 19: all-level 5MB
|   |   +-- bench-network-comprehensive.js  # Section 20: network simulation
|   |   +-- bench-dictstore.js          # Section 21: DictStore benchmarks
|   +-- db/
|       +-- schema.sql       # SQLite schema
|       +-- import-all.js    # Benchmark runner + DB import
|       +-- stats.js         # DB query tools
|       +-- benchmarks.db    # 1,494 benchmark records
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
| `DEFAULT_SUB_CHUNK_SIZE` | 32 B | Sub-chunk for hierarchical dedup |
| `MAX_DICT_SIZE` | 80% free mem | Maximum dictionary file size |

---

## Limitations

1. **Dictionary memory** -- Random data with many unique chunks: memory approaches original size
2. **Pre-compressed data** -- mp4, zip, jpg produce -1~2% overhead (slight expansion)
3. **Codecs** -- Only gzip (level 1) and none; no zstd or lz4
4. **High-speed networks** -- At 1 Gbps+, CPU pack/unpack time exceeds network transfer savings
5. **DictStore concurrency** -- Single-process append-only; no concurrent write support

---

## License

MIT
