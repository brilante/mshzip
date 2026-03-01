'use strict';

/**
 * unsigned varint (uvarint) encode/decode
 * - Same LEB128 encoding as protobuf
 * - Small indices use 1 byte, large indices are also efficiently encoded
 */

/**
 * Encode uint32 value as uvarint, return Buffer
 * @param {number} value - Non-negative integer
 * @returns {Buffer}
 */
function encode(value) {
  const bytes = [];
  while (value > 0x7F) {
    bytes.push((value & 0x7F) | 0x80);
    value >>>= 7;
  }
  bytes.push(value & 0x7F);
  return Buffer.from(bytes);
}

/**
 * Encode multiple uint32 values as consecutive uvarints
 * @param {number[]} values
 * @returns {Buffer}
 */
function encodeArray(values) {
  const parts = [];
  for (const v of values) {
    parts.push(encode(v));
  }
  return Buffer.concat(parts);
}

/**
 * Decode uvarint at offset in Buffer
 * @param {Buffer} buf
 * @param {number} offset
 * @returns {{ value: number, bytesRead: number }}
 */
function decode(buf, offset) {
  let value = 0;
  let shift = 0;
  let bytesRead = 0;

  while (offset < buf.length) {
    const b = buf[offset];
    value |= (b & 0x7F) << shift;
    offset++;
    bytesRead++;
    if ((b & 0x80) === 0) {
      return { value: value >>> 0, bytesRead };
    }
    shift += 7;
    if (shift > 35) {
      throw new Error('varint overflow: value too large');
    }
  }

  throw new Error('varint incomplete: insufficient data');
}

/**
 * Decode N consecutive uvarints from Buffer
 * @param {Buffer} buf
 * @param {number} offset
 * @param {number} count
 * @returns {{ values: number[], bytesRead: number }}
 */
function decodeArray(buf, offset, count) {
  const values = [];
  let totalRead = 0;

  for (let i = 0; i < count; i++) {
    const { value, bytesRead } = decode(buf, offset + totalRead);
    values.push(value);
    totalRead += bytesRead;
  }

  return { values, bytesRead: totalRead };
}

module.exports = { encode, encodeArray, decode, decodeArray };
