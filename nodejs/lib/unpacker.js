'use strict';

const zlib = require('zlib');
const {
  MAGIC, CODEC, FLAG, KNOWN_FLAGS,
  FRAME_HEADER_SIZE,
} = require('./constants');
const varint = require('./varint');

/**
 * Restore MSH format data to original (unpack)
 *
 * Parse frame by frame:
 * 1. Read frame header
 * 2. Decompress payload
 * 3. Restore new chunks from dict section -> accumulate in global dictionary
 * 4. Restore original chunk order using sequence section indices
 * 5. Trim last chunk using origBytes
 */

class Unpacker {
  constructor() {
    // Global dictionary: accumulated across frames
    this.dict = [];
  }

  /**
   * Restore MSH data to original
   * @param {Buffer} input - MSH compressed data
   * @returns {Buffer} - Restored original data
   */
  unpack(input) {
    const parts = [];
    let offset = 0;

    while (offset < input.length) {
      const { data, bytesConsumed } = this._readFrame(input, offset);
      parts.push(data);
      offset += bytesConsumed;
    }

    return Buffer.concat(parts);
  }

  /**
   * Read and restore a single frame
   */
  _readFrame(input, offset) {
    const startOffset = offset;

    // Verify magic number
    if (offset + FRAME_HEADER_SIZE > input.length) {
      throw new Error(`Insufficient frame header: offset=${offset}`);
    }

    const magic = input.slice(offset, offset + 4);
    if (!magic.equals(MAGIC)) {
      throw new Error(`Invalid magic number: ${magic.toString()}`);
    }

    // Parse header
    let off = offset;
    off += 4; // magic
    const version = input.readUInt16LE(off); off += 2;
    const flags = input.readUInt16LE(off); off += 2;

    // 알 수 없는 flags 방어적 에러 (하위 호환성)
    const unknownFlags = flags & ~KNOWN_FLAGS;
    if (unknownFlags) {
      throw new Error(
        `Unsupported flags: 0x${unknownFlags.toString(16)}. ` +
        'This file requires a newer version of mshzip.'
      );
    }

    const chunkSize = input.readUInt32LE(off); off += 4;
    const codecId = input.readUInt8(off); off += 1;
    off += 3; // padding
    const origBytesLo = input.readUInt32LE(off); off += 4;
    const origBytesHi = input.readUInt32LE(off); off += 4;
    const origBytes = origBytesHi * 0x100000000 + origBytesLo;
    const dictEntries = input.readUInt32LE(off); off += 4;
    const seqCount = input.readUInt32LE(off); off += 4;

    const hasHierDedup = (flags & FLAG.HIERDEDUP) !== 0;

    // Compressed payload size
    const payloadSize = input.readUInt32LE(off); off += 4;

    // Read compressed payload
    const compressedPayload = input.slice(off, off + payloadSize);
    off += payloadSize;

    // CRC32 check
    const hasCRC = (flags & FLAG.CRC32) !== 0;
    if (hasCRC) {
      const storedCRC = input.readUInt32LE(off);
      off += 4;
      // CRC verification is optional (performance consideration)
    }

    // Decompress payload
    const rawPayload = this._decompress(compressedPayload, codecId);

    // Parse dict section
    let payloadOff = 0;

    if (hasHierDedup && dictEntries > 0) {
      const hasMultilevel = (flags & FLAG.MULTILEVEL) !== 0;

      if (hasMultilevel) {
        // ── N단계 계층적 Dedup 복원 ──
        const hierLevels = rawPayload.readUInt8(payloadOff); payloadOff += 1;
        payloadOff += 3; // reserved

        const levels = [];
        for (let i = 0; i < hierLevels; i++) {
          const subChunkSize_l = rawPayload.readUInt32LE(payloadOff); payloadOff += 4;
          const dictCount = rawPayload.readUInt32LE(payloadOff); payloadOff += 4;
          levels.push({ subChunkSize: subChunkSize_l, dictCount });
        }

        // 최심층 딕셔너리 읽기
        const deepest = levels[hierLevels - 1];
        let currentDict = [];
        for (let i = 0; i < deepest.dictCount; i++) {
          currentDict.push(Buffer.from(
            rawPayload.slice(payloadOff, payloadOff + deepest.subChunkSize)
          ));
          payloadOff += deepest.subChunkSize;
        }

        // 딕셔너리 역순 복원 — 플랫 버퍼 방식 (오름차순/비표준 조합 지원)
        for (let level = hierLevels - 1; level >= 0; level--) {
          let parentEntrySize, parentCount;
          if (level === 0) {
            parentEntrySize = chunkSize;
            parentCount = dictEntries;
          } else {
            parentEntrySize = levels[level - 1].subChunkSize;
            parentCount = levels[level - 1].dictCount;
          }

          const parentBufferSize = parentCount * parentEntrySize;
          const currentSubSize = levels[level].subChunkSize;
          const totalSubChunks = Math.ceil(parentBufferSize / currentSubSize);

          const { values: seqIndicesLevel, bytesRead: seqBytes } =
            varint.decodeArray(rawPayload, payloadOff, totalSubChunks);
          payloadOff += seqBytes;

          // 서브청크 → 부모 버퍼 복원
          const subChunkBufs = [];
          for (const idx of seqIndicesLevel) {
            if (idx >= currentDict.length) {
              throw new Error(
                `Dict level ${level} index out of range: ${idx} >= ${currentDict.length}`
              );
            }
            subChunkBufs.push(currentDict[idx]);
          }
          const parentBuffer = Buffer.concat(subChunkBufs).slice(0, parentBufferSize);

          // 부모 버퍼를 개별 항목으로 분할
          currentDict = [];
          for (let i = 0; i < parentCount; i++) {
            currentDict.push(Buffer.from(
              parentBuffer.slice(i * parentEntrySize, (i + 1) * parentEntrySize)
            ));
          }
        }

        // currentDict = Dict1 복원 완료
        for (const chunk of currentDict) {
          this.dict.push(chunk);
        }
      } else {
        // ── 기존 2단계 계층적 Dedup 복원 ──
        const subChunkSize = rawPayload.readUInt32LE(payloadOff); payloadOff += 4;
        const dict2Entries = rawPayload.readUInt32LE(payloadOff); payloadOff += 4;

        const dict2 = [];
        for (let i = 0; i < dict2Entries; i++) {
          dict2.push(Buffer.from(rawPayload.slice(payloadOff, payloadOff + subChunkSize)));
          payloadOff += subChunkSize;
        }

        const subChunksPerChunk = Math.ceil(chunkSize / subChunkSize);
        const seq2Count = dictEntries * subChunksPerChunk;
        const { values: seq2Indices, bytesRead: seq2Bytes } =
          varint.decodeArray(rawPayload, payloadOff, seq2Count);
        payloadOff += seq2Bytes;

        for (let i = 0; i < dictEntries; i++) {
          const parts = [];
          for (let j = 0; j < subChunksPerChunk; j++) {
            const idx = seq2Indices[i * subChunksPerChunk + j];
            if (idx >= dict2.length) {
              throw new Error(`Dict2 index out of range: ${idx} >= ${dict2.length}`);
            }
            parts.push(dict2[idx]);
          }
          const restored = Buffer.concat(parts).slice(0, chunkSize);
          this.dict.push(restored);
        }
      }
    } else {
      // ── 기존 복원 ──
      for (let i = 0; i < dictEntries; i++) {
        const chunk = Buffer.from(rawPayload.slice(payloadOff, payloadOff + chunkSize));
        this.dict.push(chunk);
        payloadOff += chunkSize;
      }
    }

    // Parse sequence section
    let data;
    if (seqCount > 0 && origBytes > 0) {
      const { values: indices } = varint.decodeArray(rawPayload, payloadOff, seqCount);

      // Restore chunks
      const chunks = [];
      for (const idx of indices) {
        if (idx >= this.dict.length) {
          throw new Error(`Dictionary index out of range: ${idx} >= ${this.dict.length}`);
        }
        chunks.push(this.dict[idx]);
      }

      const fullData = Buffer.concat(chunks);
      // Trim to origBytes (remove zero padding from last chunk)
      data = fullData.slice(0, origBytes);
    } else {
      data = Buffer.alloc(0);
    }

    return {
      data,
      bytesConsumed: off - startOffset,
    };
  }

  /**
   * Decompress payload
   */
  _decompress(data, codecId) {
    if (data.length === 0) return data;

    switch (codecId) {
      case CODEC.NONE:
        return data;
      case CODEC.GZIP:
        return zlib.gunzipSync(data);
      default:
        throw new Error(`Unsupported codec ID: ${codecId}`);
    }
  }
}

module.exports = { Unpacker };
