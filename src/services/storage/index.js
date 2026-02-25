'use strict';

/**
 * StorageService - 저장소 추상화 계층
 * 참고: mymind3 본체의 StorageService와 동일 구조
 *
 * 사용자별로 적절한 저장소 프로바이더를 선택하여 제공
 * - 기본: LocalStorageProvider (로컬 파일 시스템)
 * - 확장: GCS, S3 등 (프로바이더 등록 방식)
 */

const LocalStorageProvider = require('./localProvider');
const logger = require('../../utils/logger');

class StorageService {
  constructor() {
    this.providers = {
      local: new LocalStorageProvider()
    };
    this.defaultProvider = this.providers.local;
    this._providerCache = new Map();
  }

  /**
   * 사용자별 저장소 프로바이더 결정
   * @param {string} userId - 사용자 ID
   * @returns {Promise<LocalStorageProvider>} - 저장소 프로바이더
   */
  async getProvider(userId) {
    // 캐시 조회 (60초 TTL)
    const cacheKey = String(userId);
    const cached = this._providerCache.get(cacheKey);
    if (cached && (Date.now() - cached.ts < 60000)) {
      return cached.provider;
    }

    // 기본 → 로컬 저장소
    this._providerCache.set(cacheKey, { provider: this.defaultProvider, ts: Date.now() });
    return this.defaultProvider;
  }

  /**
   * 프로바이더 등록
   * @param {string} type - 프로바이더 타입 (local, gcs 등)
   * @param {Object} provider - 프로바이더 인스턴스
   */
  registerProvider(type, provider) {
    this.providers[type] = provider;
  }

  // =====================================================
  // 프록시 메서드들 - 사용자별 프로바이더를 자동 선택
  // =====================================================

  async saveFile(userId, filePath, content) {
    const provider = await this.getProvider(userId);
    return provider.saveFile(userId, filePath, content);
  }

  async loadFile(userId, filePath, options = {}) {
    const provider = await this.getProvider(userId);
    return provider.loadFile(userId, filePath, options);
  }

  async deleteFile(userId, filePath) {
    const provider = await this.getProvider(userId);
    return provider.deleteFile(userId, filePath);
  }

  async listFiles(userId, directory = '') {
    const provider = await this.getProvider(userId);
    return provider.listFiles(userId, directory);
  }

  async exists(userId, filePath) {
    const provider = await this.getProvider(userId);
    return provider.exists(userId, filePath);
  }

  async getUsage(userId) {
    const provider = await this.getProvider(userId);
    return provider.getUsage(userId);
  }

  async deleteDirectory(userId, directory) {
    const provider = await this.getProvider(userId);
    return provider.deleteDirectory(userId, directory);
  }

  async copy(userId, sourcePath, targetPath) {
    const provider = await this.getProvider(userId);
    return provider.copy(userId, sourcePath, targetPath);
  }

  async move(userId, sourcePath, targetPath) {
    const provider = await this.getProvider(userId);
    return provider.move(userId, sourcePath, targetPath);
  }

  async readFilePartial(userId, filePath, bytes = 512) {
    const provider = await this.getProvider(userId);
    if (typeof provider.readFilePartial === 'function') {
      return provider.readFilePartial(userId, filePath, bytes);
    }
    const content = await provider.loadFile(userId, filePath);
    return content.slice(0, bytes);
  }

  async getFileInfo(userId, filePath) {
    const provider = await this.getProvider(userId);
    if (typeof provider.getFileInfo === 'function') {
      return provider.getFileInfo(userId, filePath);
    }
    throw new Error('getFileInfo not supported by this provider');
  }

  /**
   * 현재 사용자의 프로바이더 타입 확인
   * @param {string} userId - 사용자 ID
   * @returns {Promise<string>} - 프로바이더 타입 (local, gcs 등)
   */
  async getProviderType(userId) {
    const provider = await this.getProvider(userId);
    if (provider === this.providers.local) return 'local';
    return 'unknown';
  }
}

// 싱글톤 인스턴스 내보내기
module.exports = new StorageService();
