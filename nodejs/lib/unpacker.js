'use strict';

const zlib = require('zlib');
const {
  MAGIC, CODEC, FLAG, KNOWN_FLAGS,
  FRAME_HEADER_SIZE,
  BITDICT_EXTRA_HEADER_SIZE,
  COORDDICT_EXTRA_HEADER_SIZE,
} = require('./constants');
const varint = require('./varint');
const { DictStore } = require('./dict-store');
const { writeAllChunks } = require('./bit-reader');

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
  /**
   * @param {Object} [opts]
   * @param {DictStore} [opts.dictStore] - 외부 딕셔너리 (DictStore 인스턴스)
   * @param {string} [opts.dictDir] - DictStore 디렉토리
   */
  constructor(opts = {}) {
    // Global dictionary: accumulated across frames
    this.dict = [];
    this._dictStore = opts.dictStore || null;
    this._dictDir = opts.dictDir || null;
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
    const hasExternalDict = (flags & FLAG.EXTERNAL_DICT) !== 0;
    const hasBitDict = (flags & FLAG.BITDICT) !== 0;
    const hasCoordDict = (flags & FLAG.COORDDICT) !== 0;

    // COORDDICT 상호 배타 검증
    if (hasCoordDict && (flags & (FLAG.BITDICT | FLAG.HIERDEDUP | FLAG.MULTILEVEL | FLAG.EXTERNAL_DICT))) {
      throw new Error('COORDDICT는 다른 모드와 동시 사용 불가');
    }

    // BITDICT와 HIERDEDUP/EXTERNAL_DICT 상호 배타 검증
    if (hasBitDict && (flags & (FLAG.HIERDEDUP | FLAG.EXTERNAL_DICT))) {
      throw new Error('BITDICT는 HIERDEDUP/EXTERNAL_DICT와 동시 사용 불가');
    }

    // COORDDICT: Extra Header 읽기
    let coordDimensions = 0, coordRsAxes = 0;
    if (hasCoordDict) {
      coordDimensions = input.readUInt16LE(off); off += 2; // dimensions
      off += 2; // bitsPerAxis (skip)
      off += 1; // hammingBits (skip)
      coordRsAxes = input.readUInt8(off); off += 1;        // rsAxes
      off += 2; // reserved
    }

    // BITDICT: bitDepth 읽기
    let bitDepth = 0;
    if (hasBitDict) {
      bitDepth = input.readUInt16LE(off); off += BITDICT_EXTRA_HEADER_SIZE;
    }

    // EXTERNAL_DICT: baseDictCount 읽기 + 외부 딕셔너리 로드
    let baseDictCount = 0;
    if (hasExternalDict) {
      baseDictCount = input.readUInt32LE(off); off += 4;
      this._loadExternalDict(chunkSize, baseDictCount);
    }

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

    // ── COORDDICT 모드 ──
    if (hasCoordDict) {
      let data;
      if (seqCount > 0 && origBytes > 0) {
        const { CoordDictUnpacker } = require('./coord-dict');
        const cdu = new CoordDictUnpacker();
        data = cdu.decode(rawPayload, coordDimensions, coordRsAxes, seqCount, origBytes);
      } else {
        data = Buffer.alloc(0);
      }
      return { data, bytesConsumed: off - startOffset };
    }

    // ── BITDICT 모드: 사전 섹션 없이 바로 시퀀스 복원 ──
    if (hasBitDict) {
      let data;
      if (seqCount > 0 && origBytes > 0) {
        const { values: indices } = varint.decodeArray(rawPayload, 0, seqCount);
        const restored = writeAllChunks(indices, bitDepth);
        data = restored.slice(0, origBytes);
      } else {
        data = Buffer.alloc(0);
      }
      return { data, bytesConsumed: off - startOffset };
    }

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
   * 외부 딕셔너리 로드 (EXTERNAL_DICT 프레임 처리 시)
   */
  _loadExternalDict(chunkSize, baseDictCount) {
    // 이미 dict에 충분한 엔트리가 있으면 스킵 (멀티프레임 시)
    if (this.dict.length >= baseDictCount) return;

    const store = this._dictStore || new DictStore({
      dictDir: this._dictDir,
    });

    const loaded = store.load(chunkSize);

    if (loaded.entryCount < baseDictCount) {
      throw new Error(
        `외부 딕셔너리 엔트리 부족: ${loaded.entryCount} < ${baseDictCount}. ` +
        `dict-${chunkSize}.mshdict 파일이 손상되었거나 버전이 불일치합니다.`
      );
    }

    // 외부 딕셔너리 엔트리를 dict에 로드
    this.dict = loaded.dictChunks.slice(0, baseDictCount);
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
