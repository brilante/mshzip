'use strict';

/**
 * DictStore - 청크사이즈별 영구 딕셔너리 관리
 *
 * MSHD 파일 포맷:
 *   magic(4B 'MSHD') + version(2B) + chunkSize(4B) + entryCount(4B) = 14B 헤더
 *   [sha256_hash(32B) + chunk_data(chunkSize B)] × entryCount  (append-only)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  MSHD_MAGIC, MSHD_VERSION, MSHD_HEADER_SIZE, MSHD_HASH_SIZE,
} = require('./constants');

const DEFAULT_DICT_DIR = path.join(os.homedir(), '.mshzip');

class DictStore {
  /**
   * @param {Object} opts
   * @param {string} [opts.dictDir] - 딕셔너리 저장 디렉토리 (기본: ~/.mshzip/)
   * @param {number} [opts.maxDictSize] - 최대 딕셔너리 크기 (바이트, 기본: freemem × 0.8)
   */
  constructor(opts = {}) {
    this.dir = opts.dictDir || process.env.MSHZIP_DICT_DIR || DEFAULT_DICT_DIR;
    this.maxSize = opts.maxDictSize
      || (process.env.MSHZIP_MAX_DICT_SIZE
        ? parseInt(process.env.MSHZIP_MAX_DICT_SIZE, 10)
        : this._calcMaxSize());
  }

  /**
   * 유휴 메모리의 80% 계산
   */
  _calcMaxSize() {
    return Math.floor(os.freemem() * 0.8);
  }

  /**
   * 딕셔너리 파일 경로
   * @param {number} chunkSize
   * @returns {string}
   */
  path(chunkSize) {
    return path.join(this.dir, `dict-${chunkSize}.mshdict`);
  }

  /**
   * 디렉토리 보장
   */
  _ensureDir() {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  /**
   * 빈 딕셔너리 파일 초기화
   * @param {number} chunkSize
   */
  init(chunkSize) {
    this._ensureDir();
    const filePath = this.path(chunkSize);

    const header = Buffer.alloc(MSHD_HEADER_SIZE);
    let off = 0;
    MSHD_MAGIC.copy(header, off); off += 4;
    header.writeUInt16LE(MSHD_VERSION, off); off += 2;
    header.writeUInt32LE(chunkSize, off); off += 4;
    header.writeUInt32LE(0, off); // entryCount = 0

    fs.writeFileSync(filePath, header);
    return filePath;
  }

  /**
   * 딕셔너리 로드
   * @param {number} chunkSize
   * @returns {{ dictIndex: Map<string, number>, dictChunks: Buffer[], entryCount: number }}
   */
  load(chunkSize) {
    const filePath = this.path(chunkSize);

    if (!fs.existsSync(filePath)) {
      // 파일 없으면 빈 딕셔너리 반환
      return { dictIndex: new Map(), dictChunks: [], entryCount: 0 };
    }

    const buf = fs.readFileSync(filePath);

    // 헤더 검증
    if (buf.length < MSHD_HEADER_SIZE) {
      throw new Error(`MSHD 파일 손상: 헤더 크기 부족 (${buf.length} < ${MSHD_HEADER_SIZE})`);
    }

    const magic = buf.slice(0, 4);
    if (!magic.equals(MSHD_MAGIC)) {
      throw new Error(`MSHD 매직넘버 불일치: ${magic.toString()}`);
    }

    const version = buf.readUInt16LE(4);
    if (version !== MSHD_VERSION) {
      throw new Error(`MSHD 버전 불일치: ${version} (지원: ${MSHD_VERSION})`);
    }

    const fileChunkSize = buf.readUInt32LE(6);
    if (fileChunkSize !== chunkSize) {
      throw new Error(
        `MSHD chunkSize 불일치: 파일=${fileChunkSize}, 요청=${chunkSize}`
      );
    }

    const entryCount = buf.readUInt32LE(10);
    const entrySize = MSHD_HASH_SIZE + chunkSize;
    const expectedSize = MSHD_HEADER_SIZE + entryCount * entrySize;

    if (buf.length < expectedSize) {
      throw new Error(
        `MSHD 파일 손상: ${buf.length} < ${expectedSize} (${entryCount}개 엔트리 기대)`
      );
    }

    // 엔트리 파싱 → Map + Array
    const dictIndex = new Map();
    const dictChunks = [];
    let offset = MSHD_HEADER_SIZE;

    for (let i = 0; i < entryCount; i++) {
      const hash = buf.slice(offset, offset + MSHD_HASH_SIZE).toString('hex');
      offset += MSHD_HASH_SIZE;
      const chunk = buf.slice(offset, offset + chunkSize);
      offset += chunkSize;

      dictIndex.set(hash, i);
      dictChunks.push(chunk);
    }

    return { dictIndex, dictChunks, entryCount };
  }

  /**
   * 딕셔너리 저장 (append-only: 새 엔트리만 추가)
   * @param {number} chunkSize
   * @param {Map<string, number>} dictIndex - 전체 해시→인덱스
   * @param {Buffer[]} dictChunks - 전체 청크 배열
   * @param {number} prevCount - 이전 로드 시 엔트리 수 (이후만 append)
   */
  save(chunkSize, dictIndex, dictChunks, prevCount) {
    const newCount = dictChunks.length - prevCount;
    if (newCount <= 0) return; // 추가된 엔트리 없음

    this._ensureDir();
    const filePath = this.path(chunkSize);
    const entrySize = MSHD_HASH_SIZE + chunkSize;

    if (!fs.existsSync(filePath)) {
      // 파일 없으면 새로 생성
      const header = Buffer.alloc(MSHD_HEADER_SIZE);
      let off = 0;
      MSHD_MAGIC.copy(header, off); off += 4;
      header.writeUInt16LE(MSHD_VERSION, off); off += 2;
      header.writeUInt32LE(chunkSize, off); off += 4;
      header.writeUInt32LE(dictChunks.length, off);

      const entries = [];
      // dictIndex → hash 역방향 맵 필요
      const indexToHash = new Map();
      for (const [hash, idx] of dictIndex) {
        indexToHash.set(idx, hash);
      }
      for (let i = 0; i < dictChunks.length; i++) {
        const hashHex = indexToHash.get(i);
        entries.push(Buffer.from(hashHex, 'hex'));
        entries.push(dictChunks[i]);
      }

      fs.writeFileSync(filePath, Buffer.concat([header, ...entries]));
      return;
    }

    // 기존 파일에 append
    const fd = fs.openSync(filePath, 'r+');
    try {
      // entryCount 업데이트 (offset 10, 4B LE)
      const countBuf = Buffer.alloc(4);
      countBuf.writeUInt32LE(dictChunks.length, 0);
      fs.writeSync(fd, countBuf, 0, 4, 10);

      // 새 엔트리 append (파일 끝에)
      const appendBuf = Buffer.alloc(newCount * entrySize);
      const indexToHash = new Map();
      for (const [hash, idx] of dictIndex) {
        indexToHash.set(idx, hash);
      }
      let writeOff = 0;
      for (let i = prevCount; i < dictChunks.length; i++) {
        const hashHex = indexToHash.get(i);
        Buffer.from(hashHex, 'hex').copy(appendBuf, writeOff);
        writeOff += MSHD_HASH_SIZE;
        dictChunks[i].copy(appendBuf, writeOff);
        writeOff += chunkSize;
      }

      const fileEnd = MSHD_HEADER_SIZE + prevCount * entrySize;
      fs.writeSync(fd, appendBuf, 0, appendBuf.length, fileEnd);
    } finally {
      fs.closeSync(fd);
    }
  }

  /**
   * 딕셔너리 크기가 maxSize 초과 여부
   * @param {number} chunkSize
   * @returns {boolean}
   */
  isOverLimit(chunkSize) {
    const filePath = this.path(chunkSize);
    if (!fs.existsSync(filePath)) return false;

    try {
      const stat = fs.statSync(filePath);
      return stat.size > this.maxSize;
    } catch {
      return false;
    }
  }

  /**
   * 딕셔너리 정보 조회
   * @param {number} chunkSize
   * @returns {{ exists: boolean, path: string, size?: number, entryCount?: number, chunkSize?: number }}
   */
  info(chunkSize) {
    const filePath = this.path(chunkSize);
    const result = { exists: false, path: filePath };

    if (!fs.existsSync(filePath)) return result;

    try {
      const stat = fs.statSync(filePath);
      const buf = Buffer.alloc(MSHD_HEADER_SIZE);
      const fd = fs.openSync(filePath, 'r');
      fs.readSync(fd, buf, 0, MSHD_HEADER_SIZE, 0);
      fs.closeSync(fd);

      result.exists = true;
      result.size = stat.size;
      result.entryCount = buf.readUInt32LE(10);
      result.chunkSize = buf.readUInt32LE(6);
      result.maxSize = this.maxSize;
      result.overLimit = stat.size > this.maxSize;
    } catch {
      // 파일 읽기 실패 시 기본값
    }

    return result;
  }
}

module.exports = { DictStore };
