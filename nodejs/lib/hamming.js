'use strict';

/**
 * Hamming(1035, 1024) — 단일 비트 오류 수정 코드 (SEC)
 *
 * 축당 1024 데이터 비트(128바이트) → 1035비트 코드워드(130바이트)
 * 패리티 비트 11개 (위치: 2^0 ~ 2^10 = 1, 2, 4, ..., 1024)
 */

const DATA_BITS = 1024;
const PARITY_BITS = 11;
const CODEWORD_BITS = 1035; // 1024 + 11
const CODEWORD_BYTES = 130; // ceil(1035/8)
const DATA_BYTES = 128;

// 사전 계산: 1~1035 중 2의 거듭제곱이 아닌 위치 1024개 (1-based)
const DATA_POSITIONS = computeDataPositions();

/**
 * 데이터 위치 사전 계산
 * @returns {number[]} 1024개 위치 배열
 */
function computeDataPositions() {
  const positions = [];
  for (let pos = 1; pos <= CODEWORD_BITS; pos++) {
    if ((pos & (pos - 1)) !== 0) { // 2의 거듭제곱이 아님
      positions.push(pos);
    }
  }
  return positions;
}

/**
 * 패리티 비트별 바이트 마스크 사전 계산 (성능 최적화)
 * 각 패리티 k에 대해, 어떤 바이트의 어떤 비트를 XOR 해야 하는지
 */
const PARITY_MASKS = (() => {
  const masks = new Array(PARITY_BITS);
  for (let k = 0; k < PARITY_BITS; k++) {
    const parityPos = 1 << k;
    // 바이트 인덱스 → 비트 마스크 맵핑
    const byteMap = new Map();
    for (let pos = 1; pos <= CODEWORD_BITS; pos++) {
      if (pos & parityPos) {
        const bitIdx = pos - 1; // 0-based
        const byteIdx = bitIdx >>> 3;
        const bitInByte = 7 - (bitIdx & 7); // MSB-first
        const current = byteMap.get(byteIdx) || 0;
        byteMap.set(byteIdx, current | (1 << bitInByte));
      }
    }
    masks[k] = Array.from(byteMap.entries()).map(([byteIdx, mask]) => ({ byteIdx, mask }));
  }
  return masks;
})();

// 바이트 popcount 테이블 (0~255)
const POPCOUNT_TABLE = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  let v = i;
  let c = 0;
  while (v) { c += v & 1; v >>>= 1; }
  POPCOUNT_TABLE[i] = c;
}

/**
 * 비트 읽기 (MSB-first, 0-based 인덱스)
 */
function getBit(buf, bitIdx) {
  const byteIdx = bitIdx >>> 3;
  const bitInByte = 7 - (bitIdx & 7);
  return (buf[byteIdx] >>> bitInByte) & 1;
}

/**
 * 비트 쓰기 (MSB-first, 0-based 인덱스)
 */
function setBit(buf, bitIdx, val) {
  const byteIdx = bitIdx >>> 3;
  const bitInByte = 7 - (bitIdx & 7);
  if (val) {
    buf[byteIdx] |= (1 << bitInByte);
  } else {
    buf[byteIdx] &= ~(1 << bitInByte);
  }
}

/**
 * 비트 반전 (MSB-first, 0-based 인덱스)
 */
function flipBit(buf, bitIdx) {
  const byteIdx = bitIdx >>> 3;
  const bitInByte = 7 - (bitIdx & 7);
  buf[byteIdx] ^= (1 << bitInByte);
}

/**
 * Hamming 인코딩: 128바이트 → 130바이트
 * @param {Buffer} data - 128바이트 데이터
 * @returns {Buffer} 130바이트 코드워드
 */
function encode(data) {
  if (data.length !== DATA_BYTES) {
    throw new Error(`Hamming encode: data must be ${DATA_BYTES} bytes, got ${data.length}`);
  }

  const codeword = Buffer.alloc(CODEWORD_BYTES, 0);

  // 1) 데이터 비트 배치
  for (let d = 0; d < DATA_BITS; d++) {
    const bit = getBit(data, d);
    if (bit) {
      setBit(codeword, DATA_POSITIONS[d] - 1, 1); // 1-based → 0-based
    }
  }

  // 2) 패리티 비트 계산 (사전 계산된 마스크 사용)
  for (let k = 0; k < PARITY_BITS; k++) {
    let parity = 0;
    for (const { byteIdx, mask } of PARITY_MASKS[k]) {
      parity ^= POPCOUNT_TABLE[codeword[byteIdx] & mask] & 1;
    }
    if (parity) {
      const parityPos = (1 << k) - 1; // 0-based
      setBit(codeword, parityPos, 1);
    }
  }

  return codeword;
}

/**
 * Hamming 디코딩: 130바이트 → { data: 128바이트, corrected, uncorrectable }
 * @param {Buffer} codeword - 130바이트 코드워드
 * @returns {{ data: Buffer, corrected: boolean, uncorrectable: boolean }}
 */
function decode(codeword) {
  if (codeword.length !== CODEWORD_BYTES) {
    throw new Error(`Hamming decode: codeword must be ${CODEWORD_BYTES} bytes, got ${codeword.length}`);
  }

  // 복사본 (수정 가능하게)
  const cw = Buffer.from(codeword);

  // 1) 11비트 신드롬 계산
  let syndrome = 0;
  for (let k = 0; k < PARITY_BITS; k++) {
    let parity = 0;
    for (const { byteIdx, mask } of PARITY_MASKS[k]) {
      parity ^= POPCOUNT_TABLE[cw[byteIdx] & mask] & 1;
    }
    if (parity) {
      syndrome |= (1 << k);
    }
  }

  let corrected = false;
  let uncorrectable = false;

  // 2) 오류 수정
  if (syndrome !== 0) {
    if (syndrome >= 1 && syndrome <= CODEWORD_BITS) {
      flipBit(cw, syndrome - 1); // 1-based → 0-based
      corrected = true;
    } else {
      uncorrectable = true;
    }
  }

  // 3) 데이터 비트 추출
  const data = Buffer.alloc(DATA_BYTES);
  for (let d = 0; d < DATA_BITS; d++) {
    const bit = getBit(cw, DATA_POSITIONS[d] - 1);
    if (bit) {
      setBit(data, d, 1);
    }
  }

  return { data, corrected, uncorrectable };
}

module.exports = {
  encode,
  decode,
  computeDataPositions,
  DATA_BITS,
  PARITY_BITS,
  CODEWORD_BITS,
  CODEWORD_BYTES,
  DATA_BYTES,
  DATA_POSITIONS,
};
