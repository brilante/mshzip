'use strict';

/**
 * Reed-Solomon XOR 패리티 — 축 단위 복구
 *
 * 8개 데이터축을 1그룹으로 묶어 XOR 패리티축 1개 생성.
 * 그룹 내 1축 완전 손상 시 복구 가능.
 */

const DEFAULT_GROUP_SIZE = 8;

/**
 * 두 Buffer를 XOR
 * @param {Buffer} a
 * @param {Buffer} b
 * @returns {Buffer}
 */
function xorBuffers(a, b) {
  const len = Math.max(a.length, b.length);
  const result = Buffer.alloc(len, 0);
  for (let i = 0; i < len; i++) {
    result[i] = (a[i] || 0) ^ (b[i] || 0);
  }
  return result;
}

/**
 * RS 패리티축 생성
 * @param {Buffer[]} axes - Hamming 인코딩된 축 배열 (각 130B)
 * @param {number} [groupSize=8] - 그룹 크기
 * @returns {Buffer[]} 패리티축 배열
 */
function generateParity(axes, groupSize = DEFAULT_GROUP_SIZE) {
  const parityAxes = [];
  for (let g = 0; g * groupSize < axes.length; g++) {
    const start = g * groupSize;
    const end = Math.min(start + groupSize, axes.length);
    let parity = Buffer.alloc(axes[0].length, 0);
    for (let i = start; i < end; i++) {
      parity = xorBuffers(parity, axes[i]);
    }
    parityAxes.push(parity);
  }
  return parityAxes;
}

/**
 * RS 복구: 손상된 축 복원
 * @param {Buffer[]} dataAxes - 데이터축 배열 (Hamming 인코딩 상태)
 * @param {Buffer[]} parityAxes - 패리티축 배열
 * @param {boolean[]} damaged - 손상 여부 배열
 * @param {number} [groupSize=8] - 그룹 크기
 * @returns {Buffer[]} 복구된 축 배열
 */
function recover(dataAxes, parityAxes, damaged, groupSize = DEFAULT_GROUP_SIZE) {
  const recovered = dataAxes.map(a => Buffer.from(a));

  for (let g = 0; g * groupSize < dataAxes.length; g++) {
    const start = g * groupSize;
    const end = Math.min(start + groupSize, dataAxes.length);
    const failedIndices = [];

    for (let i = start; i < end; i++) {
      if (damaged[i]) failedIndices.push(i);
    }

    if (failedIndices.length === 0) continue;
    if (failedIndices.length > 1) {
      throw new Error(
        `RS 복구 불가: 그룹 ${g}에서 ${failedIndices.length}축 동시 손상`
      );
    }

    // 1축 복구: P XOR 나머지 정상축들 = 손상축
    const failedIdx = failedIndices[0];
    let restored = Buffer.from(parityAxes[g]);
    for (let i = start; i < end; i++) {
      if (i !== failedIdx) {
        restored = xorBuffers(restored, dataAxes[i]);
      }
    }
    recovered[failedIdx] = restored;
  }

  return recovered;
}

module.exports = {
  xorBuffers,
  generateParity,
  recover,
  DEFAULT_GROUP_SIZE,
};
