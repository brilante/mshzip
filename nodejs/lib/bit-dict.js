'use strict';

/**
 * BitDict - N비트 전수 사전 관리
 *
 * MSBD 파일 포맷 (12B 헤더):
 *   magic(4B 'MSBD') + version(2B) + bitDepth(2B) + reserved(4B)
 *
 * index = pattern value (수학적 항등) → 실제 엔트리 데이터 불필요
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const MSBD_MAGIC = Buffer.from('MSBD');
const MSBD_VERSION = 1;
const MSBD_HEADER_SIZE = 12;
const DEFAULT_DICT_DIR = path.join(os.homedir(), '.mshzip');

class BitDict {
  /**
   * @param {Object} [opts]
   * @param {string} [opts.dictDir] - 사전 디렉토리
   * @param {number} [opts.maxMemBytes] - 최대 메모리 (기본: freemem × 0.8)
   */
  constructor(opts = {}) {
    this.dir = opts.dictDir || process.env.MSHZIP_DICT_DIR || DEFAULT_DICT_DIR;
    this.maxMemBytes = opts.maxMemBytes || Math.floor(os.freemem() * 0.8);
  }

  /**
   * MSBD 파일 경로
   * @param {number} bitDepth
   * @returns {string}
   */
  path(bitDepth) {
    return path.join(this.dir, `bitdict-${bitDepth}.msbd`);
  }

  /**
   * MSBD 사전 파일 생성
   * @param {number} bitDepth - 비트 깊이 (1~32)
   * @returns {string} 생성된 파일 경로
   */
  generate(bitDepth) {
    if (bitDepth < 1 || bitDepth > 32) {
      throw new Error(`bitDepth out of range: 1~32, got ${bitDepth}`);
    }
    this._ensureDir();
    const filePath = this.path(bitDepth);
    const header = Buffer.alloc(MSBD_HEADER_SIZE, 0);
    MSBD_MAGIC.copy(header, 0);
    header.writeUInt16LE(MSBD_VERSION, 4);
    header.writeUInt16LE(bitDepth, 6);
    // reserved(4B) = 0 (이미 alloc으로 초기화)
    fs.writeFileSync(filePath, header);
    return filePath;
  }

  /**
   * 사전 로드 (없으면 자동 생성)
   * @param {number} bitDepth
   * @returns {number} 로드된 bitDepth
   */
  load(bitDepth) {
    const filePath = this.path(bitDepth);
    if (!fs.existsSync(filePath)) {
      this.generate(bitDepth);
      return bitDepth;
    }

    const buf = fs.readFileSync(filePath);
    if (buf.length < MSBD_HEADER_SIZE) {
      throw new Error(`MSBD 파일 손상: ${filePath}`);
    }
    if (!buf.slice(0, 4).equals(MSBD_MAGIC)) {
      throw new Error('MSBD 매직넘버 불일치');
    }
    const fileBitDepth = buf.readUInt16LE(6);
    if (fileBitDepth !== bitDepth) {
      throw new Error(`bitDepth 불일치: 파일=${fileBitDepth}, 요청=${bitDepth}`);
    }
    return bitDepth;
  }

  /**
   * N비트 전수 사전의 추정 메모리 (바이트)
   * @param {number} bitDepth
   * @returns {number}
   */
  estimateMemBytes(bitDepth) {
    return Math.pow(2, bitDepth) * 4;
  }

  /**
   * 시스템 메모리 초과 여부
   * @param {number} bitDepth
   * @returns {boolean}
   */
  isOverLimit(bitDepth) {
    return this.estimateMemBytes(bitDepth) >= this.maxMemBytes;
  }

  /**
   * 사전 정보 조회
   * @param {number} bitDepth
   * @returns {Object}
   */
  info(bitDepth) {
    const filePath = this.path(bitDepth);
    const result = {
      exists: false,
      path: filePath,
      bitDepth,
      patternCount: Math.pow(2, bitDepth),
      estimatedMemMB: +(this.estimateMemBytes(bitDepth) / 1024 / 1024).toFixed(1),
      isOverLimit: this.isOverLimit(bitDepth),
    };

    if (!fs.existsSync(filePath)) return result;

    try {
      const buf = Buffer.alloc(MSBD_HEADER_SIZE);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buf, 0, MSBD_HEADER_SIZE, 0);
      fs.closeSync(fd);
      result.exists = true;
    } catch { /* 읽기 실패 */ }

    return result;
  }

  /** @private */
  _ensureDir() {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }
}

module.exports = { BitDict, MSBD_MAGIC, MSBD_VERSION, MSBD_HEADER_SIZE };
