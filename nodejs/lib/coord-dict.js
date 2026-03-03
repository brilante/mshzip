'use strict';

/**
 * CoordDict — 적응형 XD 좌표 사전
 *
 * 데이터를 D차원 좌표계로 변환, 축당 Hamming(1035,1024) ECC 적용.
 * D = CPU 코어 수에 자동 적응.
 */

const os = require('os');
const hamming = require('./hamming');
const rs = require('./reed-solomon');

const BITS_PER_AXIS = 1024;
const BYTES_PER_AXIS = 128;      // 1024 / 8
const HAMMING_BYTES = 130;        // ceil(1035 / 8)
const RS_GROUP_SIZE = 8;
const COORDDICT_EXTRA_HEADER_SIZE = 8;

class CoordDictPacker {
  /**
   * @param {Object} [opts]
   * @param {number} [opts.dimensions] - 차원 수 (기본: CPU 코어 수)
   */
  constructor(opts = {}) {
    this.dimensions = opts.dimensions || os.cpus().length;
    if (this.dimensions < 1) {
      throw new Error(`CoordDict dimensions must be >= 1, got ${this.dimensions}`);
    }
    this.chunkDataSize = this.dimensions * BYTES_PER_AXIS;
    this.rsAxes = Math.ceil(this.dimensions / RS_GROUP_SIZE);
    this.totalAxesPerChunk = this.dimensions + this.rsAxes;
    this.encodedChunkSize = this.totalAxesPerChunk * HAMMING_BYTES;
  }

  /**
   * 입력 데이터를 CoordDict 인코딩 (비압축)
   * @param {Buffer} input - 원본 데이터
   * @returns {{ encoded: Buffer, seqCount: number }}
   */
  encode(input) {
    // 청크 분할
    const chunks = [];
    for (let off = 0; off < input.length; off += this.chunkDataSize) {
      let chunk = input.slice(off, off + this.chunkDataSize);
      if (chunk.length < this.chunkDataSize) {
        const padded = Buffer.alloc(this.chunkDataSize, 0);
        chunk.copy(padded);
        chunk = padded;
      }
      chunks.push(chunk);
    }

    if (chunks.length === 0) {
      return { encoded: Buffer.alloc(0), seqCount: 0 };
    }

    const seqCount = chunks.length;

    // 각 청크 인코딩
    const encodedChunks = chunks.map(chunk => this.encodeChunk(chunk));

    return { encoded: Buffer.concat(encodedChunks), seqCount };
  }

  /**
   * 단일 청크 인코딩
   * @param {Buffer} chunk - D × 128바이트
   * @returns {Buffer} (D + R) × 130바이트
   */
  encodeChunk(chunk) {
    const D = this.dimensions;

    // D개 축으로 분배 (연속 슬라이스)
    const dataAxes = [];
    for (let i = 0; i < D; i++) {
      dataAxes.push(chunk.slice(i * BYTES_PER_AXIS, (i + 1) * BYTES_PER_AXIS));
    }

    // 각 축 Hamming 인코딩
    const hammingAxes = dataAxes.map(axis => hamming.encode(axis));

    // RS 패리티축 생성
    const parityAxes = rs.generateParity(hammingAxes, RS_GROUP_SIZE);

    // 모든 축 연결
    return Buffer.concat([...hammingAxes, ...parityAxes]);
  }
}

class CoordDictUnpacker {
  /**
   * CoordDict 디코딩
   * @param {Buffer} rawPayload - gzip 해제된 인코딩 데이터
   * @param {number} dimensions - D
   * @param {number} rsAxes - R
   * @param {number} seqCount - 총 청크 수
   * @param {number} origBytes - 원본 크기
   * @returns {Buffer} 원본 데이터
   */
  decode(rawPayload, dimensions, rsAxes, seqCount, origBytes) {
    const totalAxesPerChunk = dimensions + rsAxes;
    const encodedChunkSize = totalAxesPerChunk * HAMMING_BYTES;

    const restoredChunks = [];
    let offset = 0;

    for (let c = 0; c < seqCount; c++) {
      const encoded = rawPayload.slice(offset, offset + encodedChunkSize);
      offset += encodedChunkSize;

      restoredChunks.push(this.decodeChunk(encoded, dimensions, rsAxes));
    }

    const full = Buffer.concat(restoredChunks);
    return full.slice(0, origBytes);
  }

  /**
   * 단일 청크 디코딩
   * @param {Buffer} encodedChunk - (D + R) × 130바이트
   * @param {number} dimensions - D
   * @param {number} rsAxes - R
   * @returns {Buffer} D × 128바이트
   */
  decodeChunk(encodedChunk, dimensions, rsAxes) {
    const totalAxes = dimensions + rsAxes;

    // 축 분리
    const allAxes = [];
    for (let i = 0; i < totalAxes; i++) {
      allAxes.push(encodedChunk.slice(i * HAMMING_BYTES, (i + 1) * HAMMING_BYTES));
    }
    const dataAxes = allAxes.slice(0, dimensions);
    const parityAxes = allAxes.slice(dimensions);

    // Hamming 디코딩
    const decoded = [];
    const damaged = [];
    for (let i = 0; i < dimensions; i++) {
      const { data, corrected, uncorrectable } = hamming.decode(dataAxes[i]);
      decoded.push(data);
      damaged.push(uncorrectable);
    }

    // RS 복구 (손상 축이 있을 때)
    if (damaged.some(d => d)) {
      const recovered = rs.recover(dataAxes, parityAxes, damaged, RS_GROUP_SIZE);
      for (let i = 0; i < dimensions; i++) {
        if (damaged[i]) {
          const { data } = hamming.decode(recovered[i]);
          decoded[i] = data;
        }
      }
    }

    return Buffer.concat(decoded);
  }
}

module.exports = {
  CoordDictPacker,
  CoordDictUnpacker,
  BITS_PER_AXIS,
  BYTES_PER_AXIS,
  HAMMING_BYTES,
  RS_GROUP_SIZE,
  COORDDICT_EXTRA_HEADER_SIZE,
};
