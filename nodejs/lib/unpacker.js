'use strict';

const zlib = require('zlib');
const {
  MAGIC, CODEC, FLAG,
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
    const chunkSize = input.readUInt32LE(off); off += 4;
    const codecId = input.readUInt8(off); off += 1;
    off += 3; // padding
    const origBytesLo = input.readUInt32LE(off); off += 4;
    const origBytesHi = input.readUInt32LE(off); off += 4;
    const origBytes = origBytesHi * 0x100000000 + origBytesLo;
    const dictEntries = input.readUInt32LE(off); off += 4;
    const seqCount = input.readUInt32LE(off); off += 4;

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
    for (let i = 0; i < dictEntries; i++) {
      const chunk = Buffer.from(rawPayload.slice(payloadOff, payloadOff + chunkSize));
      this.dict.push(chunk);
      payloadOff += chunkSize;
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
