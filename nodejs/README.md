# msh-zip

**Fixed-chunk deduplication + entropy compression utility**

Eliminates duplicate chunks via SHA-256 hashing, then applies gzip entropy compression.
Outputs the MSH1 binary container format. Zero external dependencies.

```
100MB repeated pattern →  1.4KB (100.0% reduction, 694 MB/s)
 50MB log file         →  9.0MB ( 82.0% reduction,  56 MB/s)
 50MB JSON             →  7.4MB ( 85.1% reduction,  57 MB/s)
```

---

## Install

```bash
# Library
npm install msh-zip

# Global CLI
npm install -g msh-zip
```

---

## Quick Start

### Simple API

```javascript
const { pack, unpack } = require('msh-zip');

const data = Buffer.from('hello world'.repeat(1000));
const compressed = pack(data);
const restored = unpack(compressed);

console.log(data.equals(restored)); // true
console.log(compressed.length);     // ~46 bytes
```

### With Options

```javascript
const compressed = pack(data, {
  chunkSize: 256,              // 'auto' (default) | 8 ~ 16MB
  frameLimit: 64 * 1024 * 1024, // bytes per frame (default: 64MB)
  codec: 'gzip',               // 'gzip' (default) | 'none'
  crc: true                    // append CRC32 per frame
});
```

### Streaming API

```javascript
const { PackStream, UnpackStream } = require('msh-zip');
const { pipeline } = require('stream/promises');
const fs = require('fs');

// Compress
const ps = new PackStream({ chunkSize: 128, codec: 'gzip' });
await pipeline(
  fs.createReadStream('data.bin'),
  ps,
  fs.createWriteStream('data.msh')
);
console.log(ps.stats);
// { bytesIn, bytesOut, frameCount, dictSize, chunkSize }

// Decompress
await pipeline(
  fs.createReadStream('data.msh'),
  new UnpackStream(),
  fs.createWriteStream('restored.bin')
);
```

### Parallel Processing

```javascript
const { WorkerPool } = require('msh-zip/lib/parallel');

const pool = new WorkerPool(4);
await pool.init();
const results = await pool.runAll([
  { type: 'pack', inputPath: 'a.bin', outputPath: 'a.msh' },
  { type: 'pack', inputPath: 'b.bin', outputPath: 'b.msh' },
]);
pool.destroy();
```

---

## CLI

```bash
mshzip pack -i <input> -o <output> [options]
  -i <path>          Input file (- = stdin)
  -o <path>          Output file (- = stdout)
  --chunk <N|auto>   Chunk size in bytes or auto (default: auto)
  --frame <N>        Max bytes per frame (default: 64MB)
  --codec <type>     gzip | none (default: gzip)
  --crc              Append CRC32 checksum
  --verbose          Verbose output

mshzip unpack -i <input> -o <output>
mshzip info -i <file>
mshzip multi pack|unpack <files...> --out-dir <dir> [--workers N]
```

### Examples

```bash
# Compress / decompress
mshzip pack -i data.bin -o data.msh
mshzip unpack -i data.msh -o data.bin

# File info
mshzip info -i data.msh

# Parallel batch
mshzip multi pack *.log --out-dir ./compressed --workers 4

# Pipe (stdin/stdout)
cat data.bin | mshzip pack -i - -o - > data.msh
mshzip unpack -i data.msh -o - | sha256sum
```

---

## How It Works

### Compression (Pack)

```
Input data
  ↓
1. Auto-detect optimal chunk size (samples 1MB, tests 8 candidates)
  ↓
2. Split into fixed-size chunks (last chunk zero-padded)
  ↓
3. SHA-256 hash each chunk → deduplicate
   - New chunk → add to dictionary (assign global index)
   - Existing chunk → reuse existing index
  ↓
4. Build frame (split at frameLimit, default 64MB)
   - Dictionary section: new chunks for this frame
   - Sequence section: varint-encoded index array
  ↓
5. gzip compress payload (level=1, speed priority)
  ↓
6. Frame = Header(32B) + PayloadSize(4B) + Compressed payload [+ CRC32(4B)]
  ↓
Output MSH1 file
```

### Decompression (Unpack)

```
MSH1 file
  ↓
1. Validate magic number 'MSH1'
2. Parse frame header (32B)
3. Decompress payload (gzip)
4. Extract new chunks from dictionary section → accumulate to global dict
5. Decode sequence section (varint) → index array
6. Look up dictionary by index → reassemble original chunks in order
7. Trim to origBytes (remove padding)
  ↓
Original data
```

### Compression Example

```
640B input (chunkSize=128B)
  → 5 chunks: [A, B, A, A, C]  (A repeats 3 times)
  → Dictionary: 3 × 128B = 384B (only A, B, C stored)
  → Sequence: [0, 1, 0, 0, 2] → 5 bytes (varint)
  → gzip compressed output

100MB repeated pattern
  → 781,250 chunks, only ~10 unique
  → Dict: 1,280B + Seq: ~781KB → gzip → ~1.4KB
  → 99.9999% reduction!
```

---

## Performance

### Compression Ratio by Data Type

| Data Type | Ratio | Pack Speed | Notes |
|-----------|-------|------------|-------|
| Repeated pattern | ~95-100% | 200-694 MB/s | Most chunks are duplicates |
| Log files | ~82% | 56 MB/s | Timestamps vary, structure repeats |
| JSON documents | ~85% | 57 MB/s | Key names and structure repeat |
| Mixed text | ~40% | 100 MB/s | Partial duplication |
| All zeros | ~99% | 500+ MB/s | Perfect dedup |
| Random binary | -1~-2% | 50 MB/s | No duplicates, overhead only |
| Pre-compressed (mp4, zip, jpg) | -1~-2% | - | Dedup ineffective |

### Auto Chunk Size Detection

| Data Type | Auto-selected | Reason |
|-----------|---------------|--------|
| 10B pattern repeat | 128B | Small pattern → small chunk maximizes dedup |
| 256B pattern repeat | 256B | Matches pattern size → optimal 1:1 mapping |
| Log files | 256B | Log line ~200B → captures structural repetition |
| JSON documents | 512B | JSON object-level repetition |
| Random binary | 2048B | No dedup possible → larger chunks minimize seq overhead |

---

## MSH1 Format

### Frame Structure

```
┌──────────────────────────────────────────────────────────────────┐
│ Frame Header (32B)  │ PayloadSize (4B)  │ Payload  │ CRC32 (4B) │
└──────────────────────────────────────────────────────────────────┘
```

### Frame Header (32 bytes, Little-Endian)

| Offset | Size | Type | Field | Description |
|--------|------|------|-------|-------------|
| 0 | 4 | bytes | magic | `MSH1` (0x4D534831) |
| 4 | 2 | uint16 | version | Format version (currently: 1) |
| 6 | 2 | uint16 | flags | Bit flags (0x0001 = CRC32) |
| 8 | 4 | uint32 | chunkSize | Chunk size (8B ~ 16MB) |
| 12 | 1 | uint8 | codecId | 0 = none, 1 = gzip |
| 13 | 3 | - | padding | Reserved (0x000000) |
| 16 | 4 | uint32 | origBytesLo | Original size lower 32 bits |
| 20 | 4 | uint32 | origBytesHi | Original size upper 32 bits |
| 24 | 4 | uint32 | dictEntries | New dictionary entries in this frame |
| 28 | 4 | uint32 | seqCount | Sequence index count |

### Payload (after decompression)

```
[Dictionary section: dictEntries × chunkSize bytes] [Sequence section: seqCount uvarint values]
```

### Multi-frame

```
┌──────────┬──────────┬─────┬──────────┐
│ Frame #0 │ Frame #1 │ ... │ Frame #N │
└──────────┴──────────┴─────┴──────────┘

- Frames split at frameLimit (default 64MB)
- Dictionary accumulates across frames (global dictionary)
- origBytesLo + origBytesHi supports 64-bit original size (4GB+)
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Fixed-chunk Dedup** | SHA-256 hash-based duplicate elimination |
| **Auto Chunk Detection** | Analyzes input to auto-select optimal chunk size (8~4096B) |
| **Streaming** | Node.js Transform Stream (PackStream / UnpackStream) |
| **Parallel Processing** | Worker Thread pool for multi-file batch operations |
| **Frame-based** | Dictionary accumulates across frames, 64-bit support (4GB+) |
| **CRC32** | Optional per-frame integrity verification |
| **Cross-compatible** | MSH1 files 100% compatible with Python mshzip |
| **CLI** | pack / unpack / info / multi — 4 commands |
| **stdin/stdout** | Pipe-friendly with `-i -` / `-o -` |

---

## Defaults

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_CHUNK_SIZE` | `'auto'` | Auto-detect (fallback: 128B) |
| `DEFAULT_FRAME_LIMIT` | 64MB | Max input bytes per frame |
| `DEFAULT_CODEC` | `'gzip'` | gzip level=1 (speed priority) |
| `MIN_CHUNK_SIZE` | 8B | Minimum chunk size |
| `MAX_CHUNK_SIZE` | 16MB | Maximum chunk size |

---

## Module Structure

| Module | File | Role |
|--------|------|------|
| **constants** | `lib/constants.js` | MSH1 magic, header size, defaults, codec IDs |
| **varint** | `lib/varint.js` | LEB128 variable-length integer encode/decode |
| **packer** | `lib/packer.js` | Compression engine: SHA-256 dict, chunking, frame assembly |
| **unpacker** | `lib/unpacker.js` | Decompression engine: frame parsing, dict accumulation |
| **stream** | `lib/stream.js` | Transform Stream (PackStream / UnpackStream) |
| **parallel** | `lib/parallel.js` | Worker Thread pool (multi-file) |
| **cli** | `cli.js` | CLI entry point (pack / unpack / info / multi) |

---

## Limitations

1. **Dictionary memory**: With highly unique chunks (random data), dict size approaches original
2. **Pre-compressed data**: mp4, zip, jpg etc. see no dedup benefit (-1~-2%)
3. **Codecs**: Only gzip (level=1) and none supported
4. **No cross-file dict sharing**: Each file gets an independent dictionary in parallel mode
5. **V8 Map limit**: ~16.77M chunks max before needing larger chunk size (5GB+ files)
6. **Auto-detect overhead**: ~16ms (1MB sample × 8 candidates) — negligible in most cases

---

## Cross-compatibility

MSH1 files are 100% interoperable between Node.js and Python implementations.

```bash
# Node.js compress → Python decompress
node cli.js pack -i data.bin -o data.msh
python -m mshzip unpack -i data.msh -o restored.bin

# Python compress → Node.js decompress
python -m mshzip pack -i data.bin -o data.msh
node cli.js unpack -i data.msh -o restored.bin
```

Python package: [mshzip on PyPI](https://pypi.org/project/mshzip/)

---

## License

MIT
