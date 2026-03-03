# mshzip

[![npm](https://img.shields.io/npm/v/msh-zip)](https://www.npmjs.com/package/msh-zip)
[![PyPI](https://img.shields.io/pypi/v/mshzip)](https://pypi.org/project/mshzip/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue)](https://www.python.org/)

**Fixed-chunk SHA-256 deduplication + gzip entropy compression with ECC protection and C native acceleration.**
Node.js and Python share the MSH1 binary format — 100% cross-compatible.

> 3,596 tests passed (221 Node.js + 705 Python + 1,494 integration + 1,176 multi-layer benchmarks). 0 failures.

---

## Choosing the Right Mode

mshzip provides three operating modes. Each is optimized for different use cases:

| Mode | Purpose | Compression | Speed (1MB) | Data Safety |
|------|---------|:-----------:|:-----------:|:-----------:|
| **Normal** | Maximum compression | Best | 77ms | SHA-256 dedup |
| **BitDict** | Bit-level dedup | Good | 617ms | BitDict encoding |
| **CoordDict** | ECC error protection | -14% overhead | 36ms (Python-C) | Hamming SEC + RS recovery |

### Normal Mode — When Compression Matters Most

Use this for general-purpose compression. It always produces the smallest output.

```
Best for: log files, CSV, JSON, config files, templates, any repeated-pattern data
Avoid for: data requiring error correction guarantees
```

| Data Type | Compression Ratio (1MB) | Speed |
|-----------|:-----------------------:|:-----:|
| Text (logs, CSV) | **99.96%** | 78ms |
| Binary (structured) | **99.44%** | 78ms |
| Mixed (text+random) | **46.29%** | 78ms |
| Random | -0.07% (slight expansion) | 78ms |

### CoordDict Mode — When Data Integrity Is Critical

CoordDict adds **Hamming(1035,1024) single-bit error correction + Reed-Solomon XOR parity recovery** at the cost of ~14.3% size overhead. It does NOT improve compression — it adds ECC protection.

```
Best for: archival storage, unreliable media, satellite/radio links, data that must survive bit-rot
Avoid for: maximum compression, data that doesn't need ECC
```

**When to choose CoordDict over Normal:**

| Scenario | Normal | CoordDict | Winner |
|----------|:------:|:---------:|:------:|
| Network transfer over reliable TCP | 99.96% | 89.19% | Normal |
| Storage on aging HDD/SSD (bit-rot risk) | No ECC | **SEC + RS** | **CoordDict** |
| Satellite/radio link (noisy channel) | No ECC | **SEC + RS** | **CoordDict** |
| Long-term archival (5+ years) | No ECC | **SEC + RS** | **CoordDict** |
| USB/SD card transfer | No ECC | **SEC + RS** | **CoordDict** |
| LAN backup to NAS | 99.96% | 89.19% | Normal |

**CoordDict compression overhead by data type (1MB, D=8):**

| Data Type | Normal | CoordDict D=8 | Overhead |
|-----------|:------:|:-------------:|:--------:|
| Text | 99.96% | 90.99% | -8.97% |
| Binary | 99.44% | 74.32% | -25.12% |
| Mixed | 46.29% | 38.15% | -8.14% |
| Random | -0.07% | -14.30% | -14.23% |

> The 14.3% ECC overhead is a theoretical constant: Hamming(1035,1024) adds 11 parity bits per 1024 data bits (1.07%) + RS parity axes (12.5%) + gzip framing.

### BitDict Mode — Bit-Level Structural Analysis

BitDict decomposes data by bit planes for structural analysis. Slower and produces larger output than Normal mode.

```
Useful for: analyzing bit-level patterns, specialized encoding pipelines
Avoid for: general compression (Normal is always better)
```

---

## Optimal Dimensions for CoordDict

The `dimensions` parameter controls how many axes each data chunk is split into.

| Data Size | Optimal D | Why |
|----------:|:---------:|-----|
| < 1 KB | D=2 | Less padding waste on small data |
| 1-16 KB | D=4~8 | Balance between ECC and overhead |
| 64 KB+ | **D=8** | Best ratio with full ECC coverage |
| 256 KB+ | D=8 | Converged — D=16/32 offer marginal gain |

**Measured compression by dimensions (Node.js, >=64KB average):**

| D | Text | Binary | Mixed | Random |
|--:|:----:|:------:|:-----:|:------:|
| 2 | 83.70% | 73.48% | 13.69% | -52.44% |
| 4 | 83.85% | 73.96% | 27.16% | -27.04% |
| **8** | **89.19%** | **74.21%** | **36.23%** | **-14.34%** |
| 16 | 88.89% | 74.28% | 36.09% | -14.34% |
| 32 | 89.06% | 74.33% | 36.14% | -14.34% |

> D=8 is the sweet spot. D >= 8 converges to -14.3% ECC overhead on random data. Lower D has proportionally higher overhead due to RS parity axis ratio.

---

## Platform Performance Guide

### Three Platforms Compared (1,176 benchmark tests)

| Platform | Normal (1MB) | CoordDict D=8 (1MB) | Best For |
|----------|:------------:|:--------------------:|----------|
| **Node.js** | 78ms | 55ms | General use, fastest Normal mode |
| **Python** | 77ms | 1,968ms | Normal mode only (CoordDict too slow) |
| **Python-C** | 77ms | **36ms** | **CoordDict — fastest across all platforms** |

### Python C Native Acceleration

Python-C uses a compiled C library (`_ecc.c`) via ctypes to accelerate Hamming/RS bit operations. **OpenMP** enables intra-batch parallelism, and **ThreadPoolExecutor** provides chunk-level parallelism:

| Data Size | Python | Python-C | Speedup | vs Node.js |
|----------:|-------:|---------:|:-------:|:----------:|
| 1 KB | 1.83ms | 0.06ms | 31.9x | 2.0x faster |
| 16 KB | 29.82ms | 0.62ms | 48.1x | 1.5x faster |
| 64 KB | 120.82ms | 2.22ms | 54.5x | 1.6x faster |
| 256 KB | 492.13ms | 9.14ms | 53.9x | 1.7x faster |
| **1 MB** | **1,968ms** | **36ms** | **54.1x** | **1.5x faster** |

> Python-C CoordDict is **1.5x faster than Node.js** because C -O2 + OpenMP outperforms V8 JIT on tight bit-manipulation loops.

**Building the native library:**

```bash
cd python/src/mshzip
python build_native.py
# Auto-detects MSVC (Windows) or GCC/Clang (Linux/macOS)
# Produces _ecc.dll / _ecc.so / _ecc.dylib
# OpenMP enabled automatically (MSVC /openmp, GCC -fopenmp)
```

If the native library is not available, Python falls back to pure Python implementation automatically. Normal and BitDict modes are unaffected — only CoordDict benefits from C acceleration.

### Parallel Processing Architecture

```
Python CoordDict Parallel Pipeline:

  Data chunks (N)
       |
       +-- N >= 4 && C native? --YES--> ThreadPoolExecutor (max 8 workers)
       |                                    |
       |                                    +-- chunk_0 --> encode_batch (OpenMP parallel for)
       |                                    +-- chunk_1 --> encode_batch (OpenMP parallel for)
       |                                    +-- ...
       |                                    +-- chunk_N --> encode_batch (OpenMP parallel for)
       |
       +-- Otherwise ---------------------> Serial encoding (Python fallback)
```

| Layer | Technology | Granularity | When Active |
|-------|-----------|-------------|-------------|
| **L1: OpenMP** | `#pragma omp parallel for` in C | Axis-level (within batch) | C native + batch >= 4 axes |
| **L2: ThreadPoolExecutor** | Python concurrent.futures | Chunk-level (across chunks) | C native + chunks >= 4 |
| **Serial fallback** | Pure Python loop | Sequential | No C native, or small data |

> Node.js: worker_threads overhead (~100ms) >> chunk processing (~0.5ms) -> intentionally serial. File-level parallelism via `WorkerPool` instead.

### Which Platform to Choose

| Use Case | Recommended | Why |
|----------|:-----------:|-----|
| Web server compression | **Node.js** | Native ecosystem, async I/O |
| Data pipeline (Normal mode) | **Either** | Same speed (~77ms/MB) |
| CoordDict ECC archival | **Python-C** | 36ms vs 55ms (Node.js) vs 1,968ms (Python) |
| CI/CD without C compiler | **Node.js** | No build step needed |
| Cross-platform exchange | **Any** | 100% binary compatible MSH1 format |

---

## When to Use mshzip

mshzip excels at compressing data with **repeated patterns beyond gzip's 32 KB sliding window**. If your data contains duplicate chunks anywhere in the file — not just within a 32 KB neighborhood — mshzip will find and eliminate them.

With **DictStore**, mshzip also deduplicates **across files** — compress file A, then file B reuses the shared dictionary, achieving up to **99% reduction** on repeated data.

### Decision Guide

| Your Data | Use mshzip? | Mode | Expected Result |
|-----------|:-----------:|:----:|:---------------:|
| Server logs, CSV exports | **Yes** | Normal | **89% compression** |
| Config copies, templates | **Yes** | Normal | **100% compression** |
| Cross-file repeated data | **Yes** | Normal + DictStore | **99%+ (2nd pack)** |
| Archival on unreliable media | **Yes** | **CoordDict D=8** | **ECC + 89% compression** |
| Satellite/radio transmission | **Yes** | **CoordDict D=8** | **ECC protection** |
| Cross-platform data pipelines | **Yes** | Any | Node.js <-> Python identical |
| Random / encrypted binary | No | — | -0.8% (slight expansion) |
| Already compressed (mp4, zip, jpg) | No | — | -1~2% overhead |
| 1 Gbps+ LAN transfers | No | — | CPU cost > network savings |

### Bandwidth Guide

| Bandwidth | 1 MB Text (Normal) | Raw Transfer | Speedup | Verdict |
|----------:|:------------------:|:------------:|:-------:|---------|
| 10 Mbps | 82 ms | 839 ms | **10.2x** | Highly effective |
| 50 Mbps | 82 ms | 168 ms | **2.0x** | Effective |
| 100 Mbps | 83 ms | 84 ms | 1.0x | Break-even |
| 1 Gbps | 82 ms | 8 ms | 0.1x | Not recommended |

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

// Normal mode (default — maximum compression)
const compressed = pack(Buffer.from(data));
const original = unpack(compressed);

// CoordDict mode (ECC protection)
const protected = pack(data, { coordDict: true, dimensions: 8 });
const restored = unpack(protected);

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
```

### Python

```python
import mshzip

# Normal mode (default — maximum compression)
compressed = mshzip.pack(data)
original = mshzip.unpack(compressed)

# CoordDict mode (ECC protection) — with context manager
with mshzip.Packer(coord_dict=True, dimensions=8) as p:
    protected = p.pack(data)
restored = mshzip.unpack(protected)

# Simple API (auto resource cleanup)
protected = mshzip.pack(data, coord_dict=True, dimensions=8)
restored = mshzip.unpack(protected)

# Cross-file dedup with DictStore
store = mshzip.DictStore(dict_dir='./my-dicts')
comp1 = mshzip.pack(file_a, chunk_size=256, use_dict=True, dict_store=store)
comp2 = mshzip.pack(file_b, chunk_size=256, use_dict=True, dict_store=store)
```

### CLI

```bash
# Node.js
node cli.js pack -i data.bin -o data.msh
node cli.js unpack -i data.msh -o data.bin
node cli.js info -i data.msh

# CoordDict mode
node cli.js pack -i data.bin -o data.msh --coord-dict --dimensions 8
mshzip pack -i data.bin -o data.msh --coord-dict --dimensions 8

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
```

### CLI Options

```
mshzip pack -i <input> -o <output> [options]
  --chunk <N|auto>    Chunk size in bytes (default: auto)
  --frame <N>         Max bytes per frame (default: 64MB)
  --codec <type>      gzip | none (default: gzip)
  --crc               Enable CRC32 checksum
  --coord-dict        Enable CoordDict ECC mode
  --dimensions <N>    CoordDict dimensions (default: CPU cores, recommended: 8)
  --bit-depth <N>     Enable BitDict mode with N-bit depth
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

## Benchmarks (1,176 DB Records)

> All data from `benchmarks/results.db` — 4 data types x 7 sizes x 7 modes x 2 CRC x 3 platforms = **1,176 tests, 0 failures.**

### 1. Compression Ratio by Mode (1 MB, Node.js)

| Data Type | Original | Normal | BitDict | CoordDict D=8 |
|-----------|:--------:|:------:|:-------:|:-------------:|
| Text (logs, CSV) | 1,024 KB | **0.4 KB** (99.96%) | 7.6 KB (99.26%) | 92.2 KB (90.99%) |
| Binary (structured) | 1,024 KB | **5.7 KB** (99.44%) | 79.1 KB (92.27%) | 262.9 KB (74.32%) |
| Mixed (text+random) | 1,024 KB | **550 KB** (46.29%) | 617.9 KB (39.66%) | 633.4 KB (38.15%) |
| Random | 1,024 KB | 1,024.7 KB (-0.07%) | 1,227 KB (-19.83%) | 1,170.4 KB (-14.30%) |

### 2. Platform Speed Comparison (1 MB, pack ms)

| Mode | Node.js | Python | Python-C | Py/Py-C Speedup |
|------|--------:|-------:|---------:|:---------------:|
| Normal | 85.5 ms | 74.7 ms | 77.4 ms | 1.0x |
| BitDict | 205.2 ms | 610.3 ms | 616.6 ms | 1.0x |
| CoordDict D=2 | 61.0 ms | 1,980.3 ms | 49.4 ms | **40.1x** |
| CoordDict D=4 | 57.4 ms | 1,962.7 ms | 41.4 ms | **47.4x** |
| CoordDict D=8 | 54.9 ms | 1,967.5 ms | 36.3 ms | **54.1x** |
| CoordDict D=16 | 56.1 ms | 1,978.0 ms | 36.1 ms | **54.8x** |
| CoordDict D=32 | 54.5 ms | 1,967.9 ms | 34.2 ms | **57.5x** |

> Python vs Python-C compression ratio: 392/392 **PERFECT** — C acceleration produces bit-identical results.

### 3. Throughput (1 MB mixed data, MB/s)

| Platform | Normal pack | Normal unpack | CoordDict D=8 pack | CoordDict D=8 unpack |
|----------|:----------:|:------------:|:------------------:|:-------------------:|
| **Node.js** | 11.0 | 237.6 | 17.4 | 20.5 |
| **Python** | 11.0 | 63.4 | 0.5 | 0.5 |
| **Python-C** | 10.5 | 65.2 | **25.9** | **26.0** |

### 4. Size Scaling (Node.js, Normal mode, Ratio %)

| Size | Text | Binary | Mixed | Random |
|-----:|:----:|:------:|:-----:|:------:|
| 256 B | 43.4% | 69.5% | -15.6% | -23.4% |
| 1 KB | 84.9% | 86.3% | 31.3% | -5.9% |
| 4 KB | 95.6% | 90.5% | 44.3% | -1.5% |
| 16 KB | 98.3% | 92.9% | 45.1% | -0.4% |
| 64 KB | 99.5% | 93.2% | 46.9% | -0.1% |
| 256 KB | 99.9% | 98.1% | 47.0% | -0.1% |
| **1 MB** | **99.96%** | **99.4%** | **46.3%** | **-0.1%** |

### 5. Network Transfer Time (1 MB, pack + transfer + unpack)

**10 Mbps network** (raw: 838.9 ms)

| Data Type | Normal (total) | Savings | CoordDict D=8 (total) | Savings |
|-----------|:--------------:|:-------:|:---------------------:|:-------:|
| Text | **82.3 ms** | **90.2%** | 154.0 ms | 81.6% |
| Binary | **95.3 ms** | **88.6%** | 301.7 ms | 64.0% |
| Mixed | **547.8 ms** | **34.7%** | 627.6 ms | 25.2% |
| Random | 919.7 ms | -9.6% | 1,096.1 ms | -30.7% |

### 6. DictStore: Cross-File Dedup

| Data Type | No-Dict Size | 2nd Pack (Dict) | Reduction | Avg Gain |
|-----------|------------:|----------------:|:---------:|---------:|
| Repeated patterns | 149 B | 111 B | 25.5% | 20.9% |
| Shared sub-patterns | 229 B | 111 B | 51.5% | 45.5% |
| Server logs | 128 KB | 15 KB | **88.0%** | **90.7%** |
| Random binary | 1.04 MB | 15 KB | **98.6%** | **98.9%** |

### 7. How It Compares

| Tool | Approach | Repeated Data | General Data | ECC | Cross-File |
|------|----------|:------------:|:------------:|:---:|:----------:|
| **mshzip** | Chunk dedup + gzip | **89~100%** | 55% | **CoordDict** | **DictStore** |
| **mshzip CoordDict** | Dedup + ECC | 89% | 36% | **SEC + RS** | No |
| gzip | Sliding window (32 KB) | 60% | **55%** | No | No |
| zstd | Dictionary + window | 70% | **65%** | No | No |
| rsync | File-level delta | N/A | N/A | No | File-level |

---

## ECC Native Test Results (153 Tests)

> C native acceleration + OpenMP + ThreadPoolExecutor parallel processing verification.
> All data from `benchmarks/results.db` think6_tests table — **153/153 passed, 0 failures, 33.1s total.**

### Results by Section

| Section | Tests | Pass | Description | Avg Time |
|:--------|------:|-----:|-------------|:--------:|
| **A** C↔Python Identity | 18 | 18 | C native produces bit-identical results to pure Python | 38.1ms |
| **B** Boundary + Error Correction | 8 | 8 | All 1,035 single-bit positions corrected, 2-bit detected | 1.9ms |
| **C** Batch API | 11 | 11 | encode_batch/decode_batch vs single — identical for 1~10,000 axes | 2.0ms |
| **D** RS XOR Parity | 7 | 7 | Parity generation, single-axis recovery, group size variants | 0.9ms |
| **E** Fallback | 8 | 8 | Native ON/OFF switch, cross-mode roundtrip (C-pack → Py-unpack) | 22.9ms |
| **G** Edge Cases | 14 | 14 | 0B~5MB, exact boundaries (127/128/129B, 1023/1024/1025B), D=2~32 | 46.6ms |
| **H** Memory Stability | 9 | 9 | 1,000x encode/decode, tracemalloc < 10MB, executor lifecycle | 845.4ms |
| **I** Error Injection | 10 | 10 | 1-bit flip, axis damage → RS recovery, E2E pack-corrupt-unpack | 6.5ms |
| **J** OpenMP Parallelization | 15 | 15 | init_tables thread safety, batch correctness, NULL guards, throughput | 1.9ms |
| **K** ThreadPoolExecutor | 22 | 22 | Parallel/serial path switch, identity, unpacker parallel, dimensions | 54.1ms |
| **L** Lifecycle Management | 15 | 15 | close(), context manager, lazy executor init, shutdown speed | 10.0ms |
| **M** Concurrency Safety | 16 | 16 | 2~10 concurrent packers, GIL behavior, 1,000x stress, rotating dims | 1,387.9ms |

### Key Test Highlights

**B9 — Full 1,035-bit correction sweep:**
Every single-bit position in the Hamming(1035,1024) codeword (1,035 bits) was individually flipped and verified to be correctly restored. 1,035/1,035 corrected.

**B10 — 2-bit uncorrectable detection:**
SEC code detects 2-bit errors when syndrome > 1,035 (Hamming positions 12 XOR 1024 = 1036). Properly flagged as uncorrectable.

**I4/I5 — Axis damage + RS recovery:**
Corrupted axis with 2-bit error at Hamming positions 12 and 1024 (syndrome 1036 → uncorrectable). RS XOR parity reconstructed the original codeword, then Hamming decoded clean data. Full round-trip verified.

**K6/K7 — Parallel == Serial identity:**
64KB data encoded/decoded with both `_USE_NATIVE=True` (parallel ThreadPoolExecutor) and `_USE_NATIVE=False` (serial Python). Results are byte-identical.

**M14 — 1,000x stress test:**
1,000 consecutive pack/unpack cycles of 4KB CoordDict D=8. All roundtrips verified. Completed in 18.7 seconds.

**H4 — Memory stability:**
100x roundtrip of 64KB data with tracemalloc monitoring. Peak memory growth < 10MB — no memory leaks detected.

### Slowest Tests (Top 5)

| Test | Time | Section | Description |
|:-----|-----:|---------|-------------|
| M14 | 18,681ms | Stress | 1,000x roundtrip loop |
| H4 | 4,669ms | Memory | 100x roundtrip + tracemalloc |
| M17 | 2,010ms | Stress | 2-second continuous packing |
| H9 | 958ms | Memory | 100x executor create/destroy |
| H11 | 955ms | Memory | 100x context manager |

---

## CoordDict: ECC Error Protection

CoordDict wraps data in a coordinate dictionary with hardware-grade error correction:

- **Hamming(1035,1024) SEC**: Corrects any single-bit error per 128-byte block
- **Reed-Solomon XOR parity**: Recovers 1 completely lost axis per 8-axis group
- **OpenMP parallel batch**: C batch functions parallelize axis encoding/decoding
- **ThreadPoolExecutor**: Chunk-level parallel processing for multi-chunk data
- **Cross-platform**: Node.js and Python produce identical protected output

### How It Works

```
Input chunk (D x 128 bytes)
  |
  +-- Split into D axes (128 bytes each)
  |
  +-- Hamming encode each axis: 128B -> 130B (adds 11 parity bits)
  |     [OpenMP: parallel for across axes in batch]
  |
  +-- RS XOR parity: every 8 axes -> 1 parity axis
  |
  +-- Output: (D + ceil(D/8)) x 130 bytes
  |
  [ThreadPoolExecutor: parallel across chunks when >= 4 chunks]
  |
  Decode: Hamming corrects 1-bit errors -> RS recovers lost axes -> original data
```

### ECC Capability

| Error Type | Detection | Correction |
|------------|:---------:|:----------:|
| 1-bit error per axis | Yes | **Auto-corrected** |
| 1 axis completely lost (per 8-group) | Yes | **RS recovered** |
| 2-bit error (syndrome > 1035) | Detected as uncorrectable | Not correctable |
| 2+ axes lost (same group) | Detected | Not recoverable |

### Python C Native Build

CoordDict performance depends heavily on bit-manipulation speed. The C native library with OpenMP provides 54x acceleration:

```bash
# Build (auto-detects compiler + OpenMP support)
python python/src/mshzip/build_native.py

# Verify
python -c "from mshzip._ecc_native import is_available; print(is_available())"
# True
```

| Platform | Compiler | OpenMP |
|----------|----------|:------:|
| Windows | MSVC Build Tools 2022 (auto-detected via vswhere) | `/openmp` |
| Linux | gcc | `-fopenmp` |
| macOS | Xcode Command Line Tools (cc) | Conditional (Clang check) |

> Without the native library, Python CoordDict works but is ~54x slower. Normal and BitDict modes are unaffected.

### Resource Management

Python Packer/Unpacker support context managers for automatic ThreadPoolExecutor cleanup:

```python
# Context manager (recommended)
with mshzip.Packer(coord_dict=True, dimensions=8) as p:
    packed = p.pack(data)
# Executor automatically shutdown

# Manual lifecycle
p = mshzip.Packer(coord_dict=True, dimensions=8)
packed = p.pack(data)
p.close()  # Explicit cleanup

# Unpacker also supports context manager
with mshzip.Unpacker() as u:
    restored = u.unpack(packed)
```

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

const store = new DictStore({ dictDir: './my-dicts' });
const comp1 = pack(fileA, { chunkSize: 256, useDict: true, dictStore: store });
const comp2 = pack(fileB, { chunkSize: 256, useDict: true, dictStore: store });

const orig = unpack(comp2, { dictStore: store });
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
| Dict file > `maxDictSize` | Fallback to self-contained mode |
| `useDict: false` / `--no-dict` | Force self-contained mode |
| Unpack EXTERNAL_DICT without dict | Error with clear message |

---

## Test Coverage

| Section | Tests | Scope |
|:-------:|------:|-------|
| Unit tests (Node.js) | 221 | Packer, Unpacker, Varint, Stream, Parallel, CLI |
| Unit tests (Python) | 552 | Packer, Unpacker, Varint, Stream, Parallel, CLI, DictStore, BitDict |
| **ECC Native (Python)** | **153** | **C↔Python identity, batch, RS parity, fallback, edge cases, OpenMP, ThreadPoolExecutor, lifecycle, memory, error injection, concurrency (12 sections)** |
| Integration (Sec 17~19) | 696 | Hierarchical dedup (2/3/4-level, exhaustive) |
| Integration (Sec 20) | 648 | Network simulation (54 configs x 3 sizes x 4 bandwidths) |
| Integration (Sec 21) | 150 | DictStore: cross-file dedup, fallback, CRC+dict |
| Multi-layer (Sec 22) | 1,176 | Node.js + Python + Python-C (392 each) |
| **Total** | **3,596** | **All passed. 0 failures.** |

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

const ps = new PackStream({ chunkSize: 256, codec: 'gzip' });
await pipeline(inputStream, ps, outputStream);

// Parallel API
const { WorkerPool } = require('msh-zip/lib/parallel');
const pool = new WorkerPool(4);
await pool.init();
await pool.runAll([
  { type: 'pack', inputPath: 'a.bin', outputPath: 'a.msh' },
]);
pool.destroy();
```

### Python

```python
import mshzip

# Buffer API
compressed = mshzip.pack(data, chunk_size=256, codec='gzip', crc=False)
original = mshzip.unpack(compressed)

# Context manager API (auto resource cleanup)
with mshzip.Packer(coord_dict=True, dimensions=8) as p:
    packed = p.pack(data)
with mshzip.Unpacker() as u:
    restored = u.unpack(packed)

# Streaming API
from mshzip import PackStream

ps = PackStream(chunk_size=256)
for frame in ps.feed(data_chunk):
    output.write(frame)
for frame in ps.flush():
    output.write(frame)

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
| CoordDict | `coordDict` | `coord_dict` | `false` | Enable ECC protection |
| Dimensions | `dimensions` | `dimensions` | CPU cores | CoordDict axes (recommended: 8) |
| BitDict | `bitDepth` | `bit_depth` | `null` | Enable BitDict with N-bit depth |
| Hier dedup | `hierDedup` | `hier_dedup` | `'auto'` | `'auto'` / `true` / `false` |
| Sub-chunk | `subChunkSize` | `sub_chunk_size` | 32 | Sub-chunk size for hierarchical dedup |
| Use dict | `useDict` | `use_dict` | `false` | Enable persistent dictionary |
| Dict store | `dictStore` | `dict_store` | `null` | DictStore instance |
| Dict dir | `dictDir` | `dict_dir` | `~/.mshzip/` | Dictionary file directory |

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
  |     In external dict -> reference existing index
  |     New chunk         -> add to dictionary
  |     Duplicate         -> reference existing index
  |
  +-- 5. [CoordDict] Hamming(1035,1024) encode + RS XOR parity
  |     128B data -> 130B codeword (11 parity bits)
  |     D axes + ceil(D/8) parity axes per chunk
  |     [OpenMP batch + ThreadPoolExecutor chunk-level parallel]
  |
  +-- 6. Frame assembly (split at frameLimit, default 64 MB)
  |     Dictionary section: new unique chunks only
  |     Sequence section:   LEB128 varint index array
  |
  +-- 7. gzip compress payload (level 1, speed-optimized)
  |
  +-- 8. Output: Header (32 B) [+ baseDictCount (4 B)] + PayloadSize (4 B)
  |              + Payload [+ CRC32 (4 B)]
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
| 4 | 0x0010 | COORDDICT | CoordDict ECC mode |
| 5 | 0x0020 | BITDICT | BitDict mode |

---

## Cross-Compatibility

Node.js and Python produce **byte-identical** MSH1 files across all modes (Normal, CoordDict, BitDict). The `spec/test-vectors/` directory contains 12 test vectors for verification.

```bash
# Node.js compress -> Python decompress (any mode)
node cli.js pack -i data.bin -o data.msh --coord-dict --dimensions 8
mshzip unpack -i data.msh -o restored.bin

# Python compress -> Node.js decompress
mshzip pack -i data.bin -o data.msh --coord-dict --dimensions 8
node cli.js unpack -i data.msh -o restored.bin
```

---

## Project Structure

```
mshzip/
+-- spec/                    # MSH1 + MSHD format spec + 12 test vectors
+-- nodejs/                  # Node.js implementation
|   +-- cli.js               # CLI: pack / unpack / info / multi / dict-init / dict-info
|   +-- lib/
|   |   +-- index.js         # Public API exports
|   |   +-- packer.js        # SHA-256 dedup + frame assembly + DictStore
|   |   +-- unpacker.js      # Frame parsing + reconstruction
|   |   +-- dict-store.js    # Persistent MSHD dictionary
|   |   +-- coord-dict.js    # CoordDict encoder/decoder
|   |   +-- hamming.js       # Hamming(1035,1024) SEC
|   |   +-- reed-solomon.js  # RS XOR parity
|   |   +-- bit-dict.js      # BitDict encoder/decoder
|   |   +-- bit-reader.js    # Bit-level reader
|   |   +-- stream.js        # PackStream / UnpackStream
|   |   +-- parallel.js      # Worker Thread pool
|   |   +-- varint.js        # LEB128 unsigned varint
|   |   +-- constants.js     # MSH1 + MSHD constants
|   +-- test/benchmark.js    # 221 tests
|   +-- package.json
|
+-- python/                  # Python implementation
|   +-- src/mshzip/
|   |   +-- __init__.py      # Public API exports
|   |   +-- packer.py        # SHA-256 dedup + frame assembly + DictStore + context manager
|   |   +-- unpacker.py      # Frame parsing + reconstruction + context manager
|   |   +-- dict_store.py    # Persistent MSHD dictionary
|   |   +-- coord_dict.py    # CoordDict encoder/decoder + ThreadPoolExecutor parallel
|   |   +-- hamming.py       # Hamming(1035,1024) SEC (C-first + Python fallback)
|   |   +-- reed_solomon.py  # RS XOR parity (C-first + Python fallback)
|   |   +-- _ecc.c           # C native source (Hamming + RS + batch API + OpenMP)
|   |   +-- _ecc_native.py   # ctypes wrapper
|   |   +-- build_native.py  # Auto-build (MSVC/GCC/Clang + OpenMP flags)
|   |   +-- bit_dict.py      # BitDict encoder/decoder
|   |   +-- bit_reader.py    # Bit-level reader
|   |   +-- stream.py        # Generator-based streaming
|   |   +-- parallel.py      # ProcessPoolExecutor pool
|   |   +-- varint.py        # LEB128 unsigned varint
|   |   +-- constants.py     # MSH1 + MSHD constants
|   |   +-- cli.py           # CLI entry point
|   +-- tests/               # 705 pytest tests (552 core + 153 ECC native)
|   +-- pyproject.toml
|
+-- benchmarks/              # Multi-layer benchmarks
|   +-- bench-node.js        # Node.js 392 tests
|   +-- bench-python.py      # Python/Python-C 392 tests each
|   +-- analyze.js           # DB analysis (Q3~Q11)
|   +-- hamming_c.c          # C benchmark prototype
|   +-- results.db           # SQLite: 1,176 benchmarks + 153 ECC test results
|
+-- test/                    # Integration benchmarks (Sections 17~21)
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
| `DEFAULT_DIMENSIONS` | CPU cores | CoordDict dimensions (recommended: 8) |
| `MIN_CHUNKS_FOR_PARALLEL` | 4 | Minimum chunks for ThreadPoolExecutor activation |

---

## Limitations

1. **Dictionary memory** -- Random data with many unique chunks: memory approaches original size
2. **Pre-compressed data** -- mp4, zip, jpg produce -1~2% overhead (slight expansion)
3. **Codecs** -- Only gzip (level 1) and none; no zstd or lz4
4. **High-speed networks** -- At 1 Gbps+, CPU pack/unpack time exceeds network transfer savings
5. **DictStore concurrency** -- Single-process append-only; no concurrent write support
6. **CoordDict overhead** -- 14.3% ECC overhead on random data; only use when error protection is needed
7. **Python CoordDict without C** -- 54x slower without native library; build `_ecc.dll/.so` for production use
8. **Hamming SEC limitation** -- Single Error Correction only (no DED); 2-bit errors detected when syndrome > 1035 but not all 2-bit patterns

---

## License

MIT
