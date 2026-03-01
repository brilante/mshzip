# mshzip

**Fixed-chunk deduplication + entropy compression utility (monorepo)**

A tool that removes duplicates using SHA-256 hash-based deduplication on data with repetitive patterns, then applies gzip entropy compression.
It shares the MSH1 binary format, and the Node.js and Python implementations are 100% cross-compatible.

```
Input 100MB (repetitive pattern) →  1.4KB (100.0% compression, 694 MB/s)
Input  50MB (log file)           →  9.0MB ( 82.0% compression,  56 MB/s)
Input  50MB (JSON)               →  7.4MB ( 85.1% compression,  57 MB/s)
```

---

## Implementations

| Implementation | Language | Dependencies | Tests |
|----------------|----------|-------------|-------|
| **[nodejs/](nodejs/)** | Node.js 18+ | dotenv | 221 PASS |
| **[python/](python/)** | Python 3.10+ | None (stdlib only) | 253 PASS |

Both implementations use the same MSH1 binary format. Files compressed with Node.js can be decompressed with Python and vice versa.

---

## Quick Start

### Node.js

```bash
cd nodejs
npm install

# Pack/Unpack
node cli.js pack -i data.bin -o data.msh
node cli.js unpack -i data.msh -o data.bin

# File info
node cli.js info -i data.msh

# Parallel processing
node cli.js multi pack *.log --out-dir ./compressed --workers 4

# Streaming (stdin/stdout)
cat data.bin | node cli.js pack -i - -o - > data.msh
node cli.js unpack -i data.msh -o - | sha256sum

# Benchmark
npm test
```

### Python (uv)

```bash
cd python
uv sync

# Pack/Unpack
uv run mshzip pack -i data.bin -o data.msh
uv run mshzip unpack -i data.msh -o data.bin

# File info
uv run mshzip info -i data.msh

# Parallel processing
uv run mshzip multi pack file1.bin file2.bin --out-dir ./compressed --workers 4

# Streaming (stdin/stdout)
cat data.bin | uv run mshzip pack -i - -o - > data.msh

# Tests
uv run pytest
```

### Python (pip)

```bash
cd python
pip install -e .

mshzip pack -i data.bin -o data.msh
mshzip unpack -i data.msh -o data.bin
```

---

## CLI Options

```
mshzip pack -i <input> -o <output> [options]
  -i <path>         Input file (- = stdin)
  -o <path>         Output file (- = stdout)
  --chunk <N|auto>  Chunk size (bytes) or auto (default: auto)
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
const { pack, unpack } = require('./lib');

// Simple API
const compressed = pack(Buffer.from('hello world'.repeat(100)));
const restored = unpack(compressed);

// With options
const compressed2 = pack(data, {
  chunkSize: 256,     // auto | 8~16MB
  frameLimit: 64 * 1024 * 1024,
  codec: 'gzip',      // gzip | none
  crc: true
});
```

```javascript
// Streaming API
const { PackStream, UnpackStream } = require('./lib');
const { pipeline } = require('stream/promises');

const ps = new PackStream({ chunkSize: 128, codec: 'gzip' });
await pipeline(
  fs.createReadStream('data.bin'),
  ps,
  fs.createWriteStream('data.msh')
);
console.log(ps.stats);
// { bytesIn, bytesOut, frameCount, dictSize, chunkSize }
```

```javascript
// Parallel processing API
const { WorkerPool } = require('./lib/parallel');

const pool = new WorkerPool(4);
await pool.init();
const results = await pool.runAll([
  { type: 'pack', inputPath: 'a.bin', outputPath: 'a.msh' },
  { type: 'pack', inputPath: 'b.bin', outputPath: 'b.msh' },
]);
pool.destroy();
```

### Python

```python
import mshzip

# Simple API
compressed = mshzip.pack(b'hello world' * 100)
restored = mshzip.unpack(compressed)

# With options
compressed2 = mshzip.pack(data,
    chunk_size=256,     # 'auto' | 8~16MB
    frame_limit=64 * 1024 * 1024,
    codec='gzip',       # 'gzip' | 'none'
    crc=True
)
```

```python
# Streaming API
from mshzip import PackStream, UnpackStream, pack_stream

ps = PackStream(chunk_size=256)
for frame in ps.feed(data_chunk):
    output.write(frame)
for frame in ps.flush():
    output.write(frame)
print(ps.stats)
# {'bytes_in', 'bytes_out', 'frame_count', 'dict_size', 'chunk_size'}

# File I/O convenience function
with open('input.bin', 'rb') as inp, open('output.msh', 'wb') as out:
    stats = pack_stream(inp, out, chunk_size=256, codec='gzip')
```

```python
# Parallel processing API
from mshzip.parallel import WorkerPool, Task

pool = WorkerPool(num_workers=4)
results = pool.run_all([
    Task(type='pack', input_path='a.bin', output_path='a.msh'),
    Task(type='unpack', input_path='b.msh', output_path='b.bin'),
])
pool.shutdown()
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Fixed-chunk Dedup** | SHA-256 hash-based deduplication |
| **Auto Chunk Detection** | Analyzes input data to automatically select optimal chunk size (8~4096B) |
| **Streaming** | Node.js: Transform Stream / Python: Generator-based |
| **Parallel Processing** | Node.js: Worker Threads / Python: ProcessPoolExecutor |
| **Frame-based** | Dictionary accumulates across frames, 64-bit support (4GB+ files) |
| **CRC32** | Optional per-frame integrity verification |
| **Cross-compatible** | Node.js <-> Python MSH1 files 100% compatible |
| **CLI** | 4 commands: pack / unpack / info / multi (identical across both implementations) |
| **stdin/stdout** | Pipe-friendly with `-i -` / `-o -` |

---

## Compression Algorithm

### Pack

```
Input data
  |
1. Auto chunk size detection (in auto mode, 1MB sampling)
   Candidates: [32, 64, 128, 256, 512, 1024, 2048, 4096]B
   Cost = (unique chunks x chunk size) + (total chunks x varint bytes)
   -> Select chunk size with minimum cost
  |
2. Split into fixed-size chunks (last chunk padded with 0x00)
  |
3. SHA-256 hash each chunk -> deduplication
   - New chunk -> add to dictionary (assign global index)
   - Existing chunk -> reference existing index
  |
4. Frame generation (split at frameLimit, default 64MB)
   - Dictionary section: new chunks in this frame
   - Sequence section: varint-encoded index array
  |
5. gzip compress payload (level=1, speed-optimized)
  |
6. Frame: Header(32B) + PayloadSize(4B) + Compressed Payload [+ CRC32(4B)]
  |
Output MSH1 file
```

### Unpack

```
MSH1 file
  |
1. Verify magic number 'MSH1'
2. Parse frame header (32B)
3. gzip decompress payload
4. Extract new chunks from dictionary section -> accumulate in global dictionary
5. Decode varint sequence section -> index array
6. Look up dictionary by index -> reassemble original chunks in order
7. Trim by origBytes (remove padding)
  |
Original data
```

### Compression Example

```
640B input (chunkSize=128B)
  -> 5 chunks: [A, B, A, A, C]  (A repeated 3 times)
  -> Dictionary: 3 x 128B = 384B (only A, B, C stored)
  -> Sequence: [0, 1, 0, 0, 2] -> 5 bytes (varint)
  -> gzip compressed output

100MB repetitive pattern
  -> 781,250 chunks with ~10 unique
  -> Dictionary: 1,280B + Sequence: ~781KB -> gzip -> ~1.4KB
  -> 99.9999% compression!
```

---

## Performance

### Compression Ratio by Data Type

| Data Type | Ratio | Pack Speed | Notes |
|-----------|-------|------------|-------|
| Repetitive pattern | ~95-100% | 200-694 MB/s | Most chunks are duplicates |
| Log files | ~82% | 56 MB/s | Timestamp variation, structural repetition |
| JSON documents | ~85% | 57 MB/s | Key name and structural repetition |
| Mixed text | ~40% | 100 MB/s | Partial duplication |
| All 0x00 | ~99% | 500+ MB/s | Perfect duplication |
| Random binary | -1~-2% | 50 MB/s | No duplication, overhead only |
| Already compressed (mp4, zip, jpg) | -1~-2% | - | Virtually no dedup effect |

### Auto Chunk Detection Results

| Data Type | Auto-selected Size | Reason |
|-----------|-------------------|--------|
| 10B pattern repeat | 128B | Small pattern -> small chunk maximizes dedup |
| 256B pattern repeat | 256B | Pattern size match -> optimal 1:1 mapping |
| Log files | 256B | Log lines ~200B -> captures structural repetition |
| JSON documents | 512B | Repeats at JSON object granularity |
| Random binary | 2048B | Dedup impossible -> large chunks minimize sequence overhead |

---

## MSH1 Format

Detailed specification: [spec/FORMAT.md](spec/FORMAT.md)

### Frame Structure

```
+--------------------------------------------------------------------+
| Frame Header (32B)  | PayloadSize (4B)  | Payload  | CRC32 (4B)    |
+--------------------------------------------------------------------+
```

### Frame Header (32 bytes, Little-Endian)

| Offset | Size | Type | Field | Description |
|--------|------|------|-------|-------------|
| 0 | 4 | bytes | magic | `MSH1` (0x4D534831) |
| 4 | 2 | uint16 | version | Format version (current: 1) |
| 6 | 2 | uint16 | flags | Bit flags (0x0001 = CRC32) |
| 8 | 4 | uint32 | chunkSize | Chunk size (8B ~ 16MB) |
| 12 | 1 | uint8 | codecId | 0 = none, 1 = gzip |
| 13 | 3 | - | padding | Reserved (0x000000) |
| 16 | 4 | uint32 | origBytesLo | Original size lower 32 bits |
| 20 | 4 | uint32 | origBytesHi | Original size upper 32 bits |
| 24 | 4 | uint32 | dictEntries | New dictionary entries in frame |
| 28 | 4 | uint32 | seqCount | Sequence index count |

### Payload (after decompression)

```
[Dictionary section: dictEntries x chunkSize bytes] [Sequence section: seqCount uvarint values]
```

### Multi-frame

```
+----------+----------+-----+----------+
| Frame #0 | Frame #1 | ... | Frame #N |
+----------+----------+-----+----------+

- Each frame is split at frameLimit (default 64MB)
- Dictionary accumulates across frames (global dictionary)
- origBytesLo + origBytesHi for 64-bit original size support (4GB+)
```

---

## Project Structure

```
mshzip/
├── spec/                           # MSH1 format spec + cross-test vectors
│   ├── FORMAT.md                   # Binary format specification
│   ├── generate-vectors.js         # Generate test vectors with Node.js
│   └── test-vectors/               # .bin + .msh pairs (12)
│
├── nodejs/                         # Node.js implementation
│   ├── cli.js                      # CLI entry point (pack/unpack/info/multi)
│   ├── lib/                        # Core modules (7)
│   │   ├── index.js                # Module exports
│   │   ├── constants.js            # MSH1 constants/defaults
│   │   ├── packer.js               # Compression engine (SHA-256 dedup + frame assembly)
│   │   ├── unpacker.js             # Decompression engine (frame parsing + dict accumulation)
│   │   ├── stream.js               # Transform Stream (PackStream/UnpackStream)
│   │   ├── varint.js               # uvarint (LEB128) encoding/decoding
│   │   └── parallel.js             # Worker Thread pool (multi-file)
│   ├── test/                       # Benchmarks (221 PASS)
│   │   ├── benchmark.js            # Comprehensive tests (codec/chunk/stream/parallel)
│   │   ├── benchmark-4k-movie.js   # 4K video benchmark
│   │   └── benchmark-large-movie.js# Large file streaming benchmark
│   └── package.json
│
├── python/                         # Python implementation
│   ├── src/mshzip/                 # Core modules (8)
│   │   ├── __init__.py             # Public API exports
│   │   ├── constants.py            # MSH1 constants/defaults
│   │   ├── packer.py               # Compression engine
│   │   ├── unpacker.py             # Decompression engine
│   │   ├── stream.py               # Generator-based streaming
│   │   ├── varint.py               # uvarint (LEB128) encoding/decoding
│   │   ├── parallel.py             # ProcessPoolExecutor (multi-file)
│   │   └── cli.py                  # CLI entry point
│   ├── tests/                      # pytest (253 PASS)
│   │   ├── conftest.py             # 9 data generators + test constants
│   │   ├── test_varint.py          # varint encoding/decoding (30)
│   │   ├── test_packer.py          # Compression (16)
│   │   ├── test_unpacker.py        # Decompression (14)
│   │   ├── test_roundtrip.py       # pack->unpack roundtrip verification (131)
│   │   ├── test_compat.py          # Node.js cross-compatibility (32)
│   │   ├── test_stream.py          # Streaming API (16)
│   │   ├── test_cli.py             # CLI subprocess (7)
│   │   └── test_parallel.py        # Worker pool (7)
│   └── pyproject.toml              # uv/PyPI config (hatchling build)
│
└── .github/workflows/ci.yml        # CI: test (3 Python versions) + lint + docker
```

---

## Module Roles

| Module | Node.js | Python | Role |
|--------|---------|--------|------|
| **constants** | `lib/constants.js` | `src/mshzip/constants.py` | MSH1 magic number, header size, defaults, codec IDs |
| **varint** | `lib/varint.js` | `src/mshzip/varint.py` | LEB128 variable integer encoding/decoding |
| **packer** | `lib/packer.js` | `src/mshzip/packer.py` | Compression engine: SHA-256 dictionary, chunk splitting, frame assembly |
| **unpacker** | `lib/unpacker.js` | `src/mshzip/unpacker.py` | Decompression engine: frame parsing, dictionary accumulation, index->chunk restoration |
| **stream** | `lib/stream.js` | `src/mshzip/stream.py` | Streaming: Transform Stream / Generator |
| **parallel** | `lib/parallel.js` | `src/mshzip/parallel.py` | Parallel: Worker Threads / ProcessPoolExecutor |
| **cli** | `cli.js` | `src/mshzip/cli.py` | CLI: 4 commands - pack / unpack / info / multi |

---

## Cross-compatibility Verification

The `spec/test-vectors/` directory contains 12 test vectors generated with Node.js.

```bash
# Generate test vectors (Node.js)
cd spec && node generate-vectors.js

# Run cross-compatibility tests in Python
cd python && uv run pytest tests/test_compat.py -v
```

### Test Vectors

| Vector | Original Size | MSH Size | Purpose |
|--------|--------------|----------|---------|
| empty | 0B | 36B | Empty input edge case |
| single-byte | 1B | 60B | Minimal input |
| boundary-127 | 127B | 62B | Chunk boundary -1 |
| boundary-128 | 128B | 61B | Exact chunk size |
| boundary-129 | 129B | 64B | Chunk boundary +1 |
| small-repeat | 1KB | 323B | Repetitive pattern dedup |
| multi-frame | 512B | 499B | Multi-frame (chunk=32, frame=128) |
| crc32 | 300B | 85B | CRC32 checksum enabled |
| codec-none | 420B | 552B | Uncompressed codec |
| large-chunk | 8KB | 91B | Large chunk size (4096B) |
| text-data | 1.3KB | 96B | Text data |
| binary-random | 2KB | 2.1KB | Random binary (overhead check) |

Verification items:
- Node.js .msh -> Python unpack (12 vectors)
- Python .msh -> Node.js unpack (12 vectors)
- Various chunk_size / codec / crc combinations bidirectional (8)

---

## Default Values

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_CHUNK_SIZE` | `auto` | Auto detection (fallback: 128B) |
| `DEFAULT_FRAME_LIMIT` | 64MB | Max input bytes per frame |
| `DEFAULT_CODEC` | `gzip` | gzip level=1 (speed-optimized) |
| `MIN_CHUNK_SIZE` | 8B | Minimum chunk size |
| `MAX_CHUNK_SIZE` | 16MB | Maximum chunk size |
| `AUTO_DETECT_SAMPLE_LIMIT` | 1MB | Sample size for auto detection |
| `AUTO_DETECT_STREAM_MIN` | 64KB | Minimum buffer for streaming detection |

---

## Publishing

### npm (Node.js)

```bash
cd nodejs
npm pack
# -> mshzip-1.0.0.tgz
```

### PyPI (Python)

```bash
cd python
uv build
# -> dist/mshzip-1.0.0.tar.gz + mshzip-1.0.0-py3-none-any.whl
```

---

## CI/CD

GitHub Actions pipeline (`.github/workflows/ci.yml`):

```
push/PR -> [parallel] Test (Python 3.12/3.13/3.14) + Lint (ruff)
                            | all pass
                    [main only] Docker build
```

---

## Limitations

1. **Dictionary memory**: For random data with many unique chunks, memory usage approaches original size
2. **Already compressed data**: mp4, zip, jpg, etc. have virtually no dedup effect (-1~-2%)
3. **Codecs**: Only gzip (level=1) and none are supported
4. **No cross-file dictionary sharing**: Each file uses an independent dictionary during parallel processing
5. **V8 Map limit**: In Node.js, chunk size auto-increase needed when exceeding ~16.77M chunks (5GB+ files)
6. **Auto detection overhead**: ~16ms (1MB sample x 8 candidates) — negligible in most cases

---

## License

MIT
