'use strict';

const crypto = require('crypto');
const zlib = require('zlib');
const {
  MAGIC, VERSION, CODEC, CODEC_NAME, FLAG,
  FRAME_HEADER_SIZE,
  DEFAULT_CHUNK_SIZE, DEFAULT_FRAME_LIMIT, DEFAULT_CODEC,
  MIN_CHUNK_SIZE, MAX_CHUNK_SIZE,
  AUTO_DETECT_CANDIDATES, AUTO_DETECT_SAMPLE_LIMIT, AUTO_FALLBACK_CHUNK_SIZE,
} = require('./constants');
const varint = require('./varint');

/**
 * Compress file/stream to MSH format (pack)
 *
 * Algorithm:
 * 1. Split input into fixed-size chunks of chunkSize bytes
 * 2. Hash each chunk and check for duplicates in the dictionary
 *    - First occurrence -> add to dictionary, assign new index
 *    - Already seen -> reference existing index
 * 3. Organize into frames (streaming support)
 *    - Each frame contains "newly encountered chunks" and "index sequence"
 * 4. Apply optional entropy compression (gzip/none)
 */

class Packer {
  /**
   * @param {Object} opts
   * @param {number} [opts.chunkSize=128] - Chunk size in bytes
   * @param {number} [opts.frameLimit=67108864] - Max input bytes per frame
   * @param {string} [opts.codec='gzip'] - 'gzip' | 'none'
   * @param {boolean} [opts.crc=false] - Whether to append CRC32 checksum
   */
  constructor(opts = {}) {
    const rawChunk = opts.chunkSize !== undefined ? opts.chunkSize : DEFAULT_CHUNK_SIZE;
    this._autoDetect = (rawChunk === 'auto');
    this.chunkSize = this._autoDetect ? AUTO_FALLBACK_CHUNK_SIZE : rawChunk;

    this.frameLimit = opts.frameLimit || DEFAULT_FRAME_LIMIT;
    this.codecName = opts.codec || DEFAULT_CODEC;
    this.codecId = CODEC_NAME[this.codecName];
    this.useCRC = !!opts.crc;

    if (!this._autoDetect) {
      if (this.chunkSize < MIN_CHUNK_SIZE || this.chunkSize > MAX_CHUNK_SIZE) {
        throw new Error(`Chunk size out of range: ${MIN_CHUNK_SIZE}~${MAX_CHUNK_SIZE}`);
      }
    }
    if (this.codecId === undefined) {
      throw new Error(`Unsupported codec: ${this.codecName}`);
    }

    // Global dictionary: hash -> global index
    this.dictIndex = new Map();
    // Global chunk array (index -> chunk data)
    this.dictChunks = [];
  }

  /**
   * Compress Buffer input to MSH format
   * @param {Buffer} input - Original data
   * @returns {Buffer} - Compressed MSH data
   */
  pack(input) {
    // auto mode: detect optimal chunk size on first call
    if (this._autoDetect && input.length > 0) {
      this.chunkSize = this._detectChunkSize(input);
      this._autoDetect = false;
    }

    const frames = [];
    let offset = 0;
    const totalLen = input.length;

    while (offset < totalLen) {
      const frameEnd = Math.min(offset + this.frameLimit, totalLen);
      const frame = this._buildFrame(input, offset, frameEnd);
      frames.push(frame);
      offset = frameEnd;
    }

    // Empty input also generates one empty frame
    if (frames.length === 0) {
      frames.push(this._buildFrame(input, 0, 0));
    }

    return Buffer.concat(frames);
  }

  /**
   * Build frame for input range [start, end)
   */
  _buildFrame(input, start, end) {
    const origBytes = end - start;
    const newChunks = [];
    const seqIndices = [];
    const dictStartIdx = this.dictChunks.length;

    // Chunk splitting + dedup
    let pos = start;
    while (pos < end) {
      const chunkEnd = Math.min(pos + this.chunkSize, end);
      let chunk = input.slice(pos, chunkEnd);

      // Pad last chunk with zeros if smaller than chunkSize
      if (chunk.length < this.chunkSize) {
        const padded = Buffer.alloc(this.chunkSize, 0);
        chunk.copy(padded);
        chunk = padded;
      }

      // Check duplicates via hash (xxhash is faster but crypto.sha256 is sufficient)
      const hash = crypto.createHash('sha256').update(chunk).digest('hex');

      let idx = this.dictIndex.get(hash);
      if (idx === undefined) {
        idx = this.dictChunks.length;
        this.dictIndex.set(hash, idx);
        this.dictChunks.push(chunk);
        newChunks.push(chunk);
      }

      seqIndices.push(idx);
      pos = chunkEnd;
    }

    const dictEntriesInFrame = newChunks.length;
    const seqCount = seqIndices.length;

    // Payload layout: [dict section] + [sequence section]
    const dictSection = dictEntriesInFrame > 0
      ? Buffer.concat(newChunks)
      : Buffer.alloc(0);
    const seqSection = seqCount > 0
      ? varint.encodeArray(seqIndices)
      : Buffer.alloc(0);

    const rawPayload = Buffer.concat([dictSection, seqSection]);

    // Entropy compression
    const compressedPayload = this._compress(rawPayload);

    // Build frame header
    const flags = this.useCRC ? FLAG.CRC32 : 0;
    const header = Buffer.alloc(FRAME_HEADER_SIZE);
    let off = 0;

    MAGIC.copy(header, off); off += 4;
    header.writeUInt16LE(VERSION, off); off += 2;
    header.writeUInt16LE(flags, off); off += 2;
    header.writeUInt32LE(this.chunkSize, off); off += 4;
    header.writeUInt8(this.codecId, off); off += 1;
    off += 3; // padding
    // Store origBytes as 2 uint32s (uint64 substitute, supports >4GB)
    header.writeUInt32LE(origBytes & 0xFFFFFFFF, off); off += 4;
    header.writeUInt32LE(Math.floor(origBytes / 0x100000000), off); off += 4;
    header.writeUInt32LE(dictEntriesInFrame, off); off += 4;
    header.writeUInt32LE(seqCount, off); off += 4;

    // Compressed payload size (4 bytes)
    const payloadSizeBuf = Buffer.alloc(4);
    payloadSizeBuf.writeUInt32LE(compressedPayload.length, 0);

    const parts = [header, payloadSizeBuf, compressedPayload];

    // CRC32 (optional)
    if (this.useCRC) {
      const crc = this._crc32(Buffer.concat([header, payloadSizeBuf, compressedPayload]));
      const crcBuf = Buffer.alloc(4);
      crcBuf.writeUInt32LE(crc, 0);
      parts.push(crcBuf);
    }

    return Buffer.concat(parts);
  }

  /**
   * Compress payload
   */
  _compress(data) {
    if (data.length === 0) return data;

    switch (this.codecId) {
      case CODEC.NONE:
        return data;
      case CODEC.GZIP:
        return zlib.gzipSync(data, { level: 1 }); // speed priority
      default:
        return data;
    }
  }

  /**
   * Auto-detect optimal chunk size by sampling data
   * Metric: select size that minimizes estimated dict section + sequence section total
   * @param {Buffer} data - Original data
   * @returns {number} - Optimal chunk size
   */
  _detectChunkSize(data) {
    const sampleEnd = Math.min(data.length, AUTO_DETECT_SAMPLE_LIMIT);
    const sample = data.slice(0, sampleEnd);

    let bestCs = AUTO_FALLBACK_CHUNK_SIZE;
    let bestCost = Infinity;

    for (const cs of AUTO_DETECT_CANDIDATES) {
      if (cs > sampleEnd) continue;

      const hashes = new Set();
      let pos = 0;
      let totalChunks = 0;

      while (pos < sampleEnd) {
        const end = Math.min(pos + cs, sampleEnd);
        let chunk = sample.slice(pos, end);

        if (chunk.length < cs) {
          const padded = Buffer.alloc(cs, 0);
          chunk.copy(padded);
          chunk = padded;
        }

        const hash = crypto.createHash('sha256').update(chunk).digest('hex');
        hashes.add(hash);
        totalChunks++;
        pos += cs;
      }

      const uniqueCount = hashes.size;
      const dictCost = uniqueCount * cs;
      // Estimate varint byte count (LEB128: 7-bit units)
      const varintBytes = uniqueCount <= 127 ? 1 : uniqueCount <= 16383 ? 2 : 3;
      const seqCost = totalChunks * varintBytes;
      const totalCost = dictCost + seqCost;

      if (totalCost < bestCost) {
        bestCost = totalCost;
        bestCs = cs;
      }
    }

    return bestCs;
  }

  /**
   * Calculate CRC32
   */
  _crc32(data) {
    // Node.js zlib.crc32 available since v12.16+
    if (typeof zlib.crc32 === 'function') {
      return zlib.crc32(data);
    }
    // Fallback: simple CRC32 implementation
    return crc32Fallback(data);
  }
}

/**
 * CRC32 fallback implementation
 */
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
})();

function crc32Fallback(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

module.exports = { Packer };
