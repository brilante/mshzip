'use strict';

/**
 * 비트 단위 읽기/쓰기 유틸리티 (MSB-first)
 *
 * 핵심: N비트 전수 사전에서 index = readBits(buf, i*N, N)
 */

/**
 * Buffer에서 N비트 읽기
 * @param {Buffer} buf - 소스 버퍼
 * @param {number} bitOffset - 시작 비트 오프셋 (0-based)
 * @param {number} n - 읽을 비트 수 (1~32)
 * @returns {number} 정수값 (0 ~ 2^N - 1)
 */
function readBits(buf, bitOffset, n) {
  if (n < 1 || n > 32) {
    throw new RangeError(`readBits: n must be 1~32, got ${n}`);
  }
  if (bitOffset + n > buf.length * 8) {
    throw new RangeError(
      `readBits: offset=${bitOffset}, n=${n}, bufBits=${buf.length * 8}`
    );
  }

  let value = 0;
  let remaining = n;
  let currentBit = bitOffset;

  while (remaining > 0) {
    const byteIdx = currentBit >>> 3;
    const bitInByte = currentBit & 7;
    const bitsAvail = 8 - bitInByte;
    const bitsToRead = Math.min(bitsAvail, remaining);
    const shift = bitsAvail - bitsToRead;
    const mask = (1 << bitsToRead) - 1;
    const bits = (buf[byteIdx] >>> shift) & mask;

    value = (value << bitsToRead) | bits;
    currentBit += bitsToRead;
    remaining -= bitsToRead;
  }

  return value >>> 0;
}

/**
 * Buffer에 N비트 쓰기
 * @param {Buffer} buf - 대상 버퍼
 * @param {number} bitOffset - 시작 비트 오프셋
 * @param {number} n - 쓸 비트 수 (1~32)
 * @param {number} value - 정수값
 */
function writeBits(buf, bitOffset, n, value) {
  if (n < 1 || n > 32) {
    throw new RangeError(`writeBits: n must be 1~32, got ${n}`);
  }
  if (bitOffset + n > buf.length * 8) {
    throw new RangeError(
      `writeBits: offset=${bitOffset}, n=${n}, bufBits=${buf.length * 8}`
    );
  }

  let remaining = n;
  let currentBit = bitOffset;

  while (remaining > 0) {
    const byteIdx = currentBit >>> 3;
    const bitInByte = currentBit & 7;
    const bitsAvail = 8 - bitInByte;
    const bitsToWrite = Math.min(bitsAvail, remaining);
    const shift = remaining - bitsToWrite;
    const mask = (1 << bitsToWrite) - 1;
    const bits = (value >>> shift) & mask;
    const byteShift = bitsAvail - bitsToWrite;
    const byteMask = ~(mask << byteShift) & 0xFF;

    buf[byteIdx] = (buf[byteIdx] & byteMask) | (bits << byteShift);
    currentBit += bitsToWrite;
    remaining -= bitsToWrite;
  }
}

/**
 * Buffer를 N비트씩 모두 읽어 인덱스 배열 반환
 * @param {Buffer} buf
 * @param {number} bitDepth
 * @returns {{ values: number[], totalBits: number }}
 */
function readAllChunks(buf, bitDepth) {
  const totalBits = buf.length * 8;
  const count = Math.floor(totalBits / bitDepth);
  const values = new Array(count);

  for (let i = 0; i < count; i++) {
    values[i] = readBits(buf, i * bitDepth, bitDepth);
  }

  return { values, totalBits };
}

/**
 * 인덱스 배열을 N비트씩 Buffer에 기록
 * @param {number[]} values
 * @param {number} bitDepth
 * @returns {Buffer}
 */
function writeAllChunks(values, bitDepth) {
  const totalBits = values.length * bitDepth;
  const byteCount = Math.ceil(totalBits / 8);
  const buf = Buffer.alloc(byteCount, 0);

  for (let i = 0; i < values.length; i++) {
    writeBits(buf, i * bitDepth, bitDepth, values[i]);
  }

  return buf;
}

module.exports = { readBits, writeBits, readAllChunks, writeAllChunks };
