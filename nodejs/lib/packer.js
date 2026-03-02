'use strict';

const crypto = require('crypto');
const zlib = require('zlib');
const {
  MAGIC, VERSION, CODEC, CODEC_NAME, FLAG,
  FRAME_HEADER_SIZE,
  DEFAULT_CHUNK_SIZE, DEFAULT_FRAME_LIMIT, DEFAULT_CODEC,
  DEFAULT_SUB_CHUNK_SIZE,
  MIN_CHUNK_SIZE, MAX_CHUNK_SIZE, MAX_HIER_LEVELS,
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
   * @param {string|boolean} [opts.hierDedup='auto'] - 계층적 Dedup: 'auto' | true | false
   * @param {number} [opts.subChunkSize=32] - 2차 청크 크기 (바이트)
   * @param {number[]} [opts.subChunkSizes] - N단계 서브청크 크기 배열 (예: [32, 8] → 3단계)
   */
  constructor(opts = {}) {
    const rawChunk = opts.chunkSize !== undefined ? opts.chunkSize : DEFAULT_CHUNK_SIZE;
    this._autoDetect = (rawChunk === 'auto');
    this.chunkSize = this._autoDetect ? AUTO_FALLBACK_CHUNK_SIZE : rawChunk;

    this.frameLimit = opts.frameLimit || DEFAULT_FRAME_LIMIT;
    this.codecName = opts.codec || DEFAULT_CODEC;
    this.codecId = CODEC_NAME[this.codecName];
    this.useCRC = !!opts.crc;

    // 계층적 Dedup 옵션
    this.hierDedup = opts.hierDedup !== undefined ? opts.hierDedup : 'auto';

    // N단계 지원: subChunkSizes 배열 또는 단일 subChunkSize
    if (opts.subChunkSizes && Array.isArray(opts.subChunkSizes)) {
      this.subChunkSizes = opts.subChunkSizes;
      this.subChunkSize = opts.subChunkSizes[0];
    } else {
      this.subChunkSize = opts.subChunkSize || DEFAULT_SUB_CHUNK_SIZE;
      this.subChunkSizes = [this.subChunkSize];
    }

    if (!this._autoDetect) {
      if (this.chunkSize < MIN_CHUNK_SIZE || this.chunkSize > MAX_CHUNK_SIZE) {
        throw new Error(`Chunk size out of range: ${MIN_CHUNK_SIZE}~${MAX_CHUNK_SIZE}`);
      }
    }
    if (this.codecId === undefined) {
      throw new Error(`Unsupported codec: ${this.codecName}`);
    }
    for (const scs of this.subChunkSizes) {
      if (scs < MIN_CHUNK_SIZE) {
        throw new Error(`Sub-chunk size too small: ${scs} (min: ${MIN_CHUNK_SIZE})`);
      }
    }
    if (this.subChunkSizes.length > MAX_HIER_LEVELS) {
      throw new Error(`Too many hier levels: ${this.subChunkSizes.length} (max: ${MAX_HIER_LEVELS})`);
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

    // Dict1 (1차 사전)
    const dict1 = dictEntriesInFrame > 0
      ? Buffer.concat(newChunks)
      : Buffer.alloc(0);

    // 계층적 Dedup 판단 및 적용
    let rawPayload;
    let useHier = false;
    let useMultilevel = false;

    if (dict1.length > 0 && this.hierDedup !== false) {
      const shouldApply = this.hierDedup === true
        || this._shouldApplyHierDedup(dict1, this.subChunkSize);

      if (shouldApply) {
        useHier = true;

        if (this.subChunkSizes.length === 1) {
          // ── 기존 2단계 형식 (하위 호환) ──
          const { dict2, seq2Indices, dict2Entries } =
            this._buildHierDict(dict1, this.subChunkSize);

          const hierHeader = Buffer.alloc(8);
          hierHeader.writeUInt32LE(this.subChunkSize, 0);
          hierHeader.writeUInt32LE(dict2Entries, 4);

          const seq2Section = varint.encodeArray(seq2Indices);
          const seq1Section = seqCount > 0
            ? varint.encodeArray(seqIndices)
            : Buffer.alloc(0);

          rawPayload = Buffer.concat([hierHeader, dict2, seq2Section, seq1Section]);
        } else {
          // ── N단계 (3단계 이상) ──
          useMultilevel = true;

          let currentDict = dict1;
          const allSeqs = [];
          const levelDescs = [];

          for (const subSize of this.subChunkSizes) {
            const { dict2, seq2Indices, dict2Entries } =
              this._buildHierDict(currentDict, subSize);
            allSeqs.push(seq2Indices);
            levelDescs.push({ subChunkSize: subSize, dictEntries: dict2Entries });
            currentDict = dict2;
          }

          // HierHeader: hierLevels(1B) + reserved(3B) + [subChunkSize(4B) + dictEntries(4B)] × levels
          const hierLevels = this.subChunkSizes.length;
          const headerSize = 4 + hierLevels * 8;
          const hierHeader = Buffer.alloc(headerSize);
          hierHeader.writeUInt8(hierLevels, 0);
          for (let i = 0; i < hierLevels; i++) {
            hierHeader.writeUInt32LE(levelDescs[i].subChunkSize, 4 + i * 8);
            hierHeader.writeUInt32LE(levelDescs[i].dictEntries, 4 + i * 8 + 4);
          }

          // Payload: [HierHeader][finalDict][seqN..seq2 역순][seq1]
          const payloadParts = [hierHeader, currentDict];
          for (let i = allSeqs.length - 1; i >= 0; i--) {
            payloadParts.push(varint.encodeArray(allSeqs[i]));
          }
          if (seqCount > 0) {
            payloadParts.push(varint.encodeArray(seqIndices));
          }

          rawPayload = Buffer.concat(payloadParts);
        }
      }
    }

    if (!useHier) {
      const seqSection = seqCount > 0
        ? varint.encodeArray(seqIndices)
        : Buffer.alloc(0);
      rawPayload = Buffer.concat([dict1, seqSection]);
    }

    // Entropy compression
    const compressedPayload = this._compress(rawPayload);

    // Build frame header
    const flags = (this.useCRC ? FLAG.CRC32 : 0)
      | (useHier ? FLAG.HIERDEDUP : 0)
      | (useMultilevel ? FLAG.MULTILEVEL : 0);
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
   * Dict1을 subChunkSize로 재분할하여 2차 중복 제거 수행 (프레임 로컬)
   * @param {Buffer} dict1 - 1차 사전 (newChunks concat)
   * @param {number} subChunkSize - 2차 청크 크기
   * @returns {{ dict2: Buffer, seq2Indices: number[], dict2Entries: number }}
   */
  _buildHierDict(dict1, subChunkSize) {
    const dict2Index = new Map();
    const dict2Chunks = [];
    const seq2Indices = [];

    let pos = 0;
    while (pos < dict1.length) {
      const subEnd = Math.min(pos + subChunkSize, dict1.length);
      let subChunk = dict1.slice(pos, subEnd);

      // 마지막 서브청크 패딩
      if (subChunk.length < subChunkSize) {
        const padded = Buffer.alloc(subChunkSize, 0);
        subChunk.copy(padded);
        subChunk = padded;
      }

      const hash = crypto.createHash('sha256').update(subChunk).digest('hex');

      let idx = dict2Index.get(hash);
      if (idx === undefined) {
        idx = dict2Chunks.length;
        dict2Index.set(hash, idx);
        dict2Chunks.push(subChunk);
      }

      seq2Indices.push(idx);
      pos = subEnd;
    }

    return {
      dict2: dict2Chunks.length > 0 ? Buffer.concat(dict2Chunks) : Buffer.alloc(0),
      seq2Indices,
      dict2Entries: dict2Chunks.length,
    };
  }

  /**
   * 2차 pass 적용 여부 자동 판단
   * 손익분기: dupRatio > varintBytes / subChunkSize (안전 마진 ×1.2)
   * @param {Buffer} dict1 - 1차 사전
   * @param {number} subChunkSize - 2차 청크 크기
   * @returns {boolean}
   */
  _shouldApplyHierDedup(dict1, subChunkSize) {
    // 최소 크기: 서브청크 4개 미만이면 의미 없음
    if (dict1.length < subChunkSize * 4) return false;

    // 샘플링 (최대 32KB)
    const sampleLimit = Math.min(dict1.length, 32 * 1024);
    const sample = dict1.slice(0, sampleLimit);
    const hashes = new Set();
    let totalSubChunks = 0;

    let pos = 0;
    while (pos < sample.length) {
      const subEnd = Math.min(pos + subChunkSize, sample.length);
      let subChunk = sample.slice(pos, subEnd);

      if (subChunk.length < subChunkSize) {
        const padded = Buffer.alloc(subChunkSize, 0);
        subChunk.copy(padded);
        subChunk = padded;
      }

      hashes.add(crypto.createHash('sha256').update(subChunk).digest('hex'));
      totalSubChunks++;
      pos = subEnd;
    }

    const dupRatio = 1 - (hashes.size / totalSubChunks);
    const avgVarint = hashes.size <= 127 ? 1 : hashes.size <= 16383 ? 2 : 3;
    const breakEven = avgVarint / subChunkSize;

    // 안전 마진 20%
    return dupRatio > breakEven * 1.2;
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
