/**
 * API Client - ESM Singleton
 * Phase 3.1: 프론트엔드 모듈화
 *
 * @version 1.0.0
 * @date 2026-01-23
 *
 * 사용법:
 *   import { apiClient, ENDPOINTS } from '/js/modules/core/api-client.js';
 *   const data = await apiClient.get(ENDPOINTS.AUTH_CHECK);
 *
 * 마이그레이션:
 *   - 기존: window.MyMind3.APIClient
 *   - 신규: import { apiClient } from '...'
 */

/**
 * API 엔드포인트 상수
 */
export const ENDPOINTS = {
  // 크레딧 관련
  CREDITS_BALANCE: '/api/credits/balance',
  CREDITS_VALIDATE: '/api/credits/validate',
  CREDITS_DEDUCT: '/api/credits/deduct',
  CREDITS_PURCHASE: '/api/credits/purchase',
  CREDITS_SUBSCRIBE: '/api/credits/subscribe',
  CREDITS_UPGRADE: '/api/credits/upgrade',
  CREDITS_CANCEL: '/api/credits/cancel-subscription',
  CREDITS_MODELS: '/api/credits/models',
  CREDITS_USAGE_HISTORY: '/api/credits/usage-history',

  // 환율 관련
  EXCHANGE_RATES: '/api/exchange/rates',
  EXCHANGE_CONVERT: '/api/exchange/convert',

  // AI 관련
  AI_CHAT: '/api/ai/chat',
  AI_MODELS: '/api/ai/models',

  // 인증 관련
  AUTH_CHECK: '/api/auth/check',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_LOGOUT: '/api/auth/logout',

  // 마인드맵 관련
  MINDMAP_LIST: '/api/mindmap/list',
  MINDMAP_SAVE: '/api/mindmap/save',
  MINDMAP_LOAD: '/api/mindmap/load'
};

/**
 * API Client 싱글톤 클래스
 */
class APIClient {
  constructor() {
    this.baseUrl = '';
    this.defaultHeaders = {
      'Content-Type': 'application/json'
    };
  }

  /**
   * CSRF 헤더 가져오기
   * @returns {Promise<Object>} CSRF 헤더
   */
  async getCsrfHeaders() {
    if (typeof window !== 'undefined' && window.csrfUtils) {
      return await window.csrfUtils.getCsrfHeaders();
    }
    return {};
  }

  /**
   * 기본 요청 메서드
   * @param {string} url - API URL
   * @param {Object} options - fetch 옵션
   * @returns {Promise<Object>} 응답 데이터
   */
  async request(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();

    // POST, PUT, DELETE, PATCH 요청에 CSRF 토큰 추가
    let csrfHeaders = {};
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      csrfHeaders = await this.getCsrfHeaders();
    }

    const fetchOptions = {
      method,
      credentials: 'include',
      headers: {
        ...this.defaultHeaders,
        ...csrfHeaders,
        ...options.headers
      }
    };

    if (options.body) {
      fetchOptions.body = typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);
    }

    try {
      const response = await fetch(`${this.baseUrl}${url}`, fetchOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`[APIClient] Request failed: ${url}`, error);
      throw error;
    }
  }

  /**
   * GET 요청
   * @param {string} url - API URL
   * @param {Object} params - 쿼리 파라미터
   * @returns {Promise<Object>}
   */
  async get(url, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const fullUrl = queryString ? `${url}?${queryString}` : url;
    return this.request(fullUrl, { method: 'GET' });
  }

  /**
   * POST 요청
   * @param {string} url - API URL
   * @param {Object} body - 요청 바디
   * @returns {Promise<Object>}
   */
  async post(url, body = {}) {
    return this.request(url, { method: 'POST', body });
  }

  /**
   * PUT 요청
   * @param {string} url - API URL
   * @param {Object} body - 요청 바디
   * @returns {Promise<Object>}
   */
  async put(url, body = {}) {
    return this.request(url, { method: 'PUT', body });
  }

  /**
   * DELETE 요청
   * @param {string} url - API URL
   * @returns {Promise<Object>}
   */
  async delete(url) {
    return this.request(url, { method: 'DELETE' });
  }

  // ===========================
  // 편의 메서드 (자주 사용하는 API)
  // ===========================

  /**
   * 인증 상태 확인
   */
  async checkAuth() {
    return this.get(ENDPOINTS.AUTH_CHECK);
  }

  /**
   * 크레딧 잔액 조회
   */
  async getCreditsBalance() {
    return this.get(ENDPOINTS.CREDITS_BALANCE);
  }

  /**
   * AI 채팅 요청
   * @param {Object} payload - 채팅 요청 데이터
   */
  async aiChat(payload) {
    return this.post(ENDPOINTS.AI_CHAT, payload);
  }

  /**
   * 마인드맵 목록 조회
   */
  async getMindmapList() {
    return this.get(ENDPOINTS.MINDMAP_LIST);
  }
}

// 싱글톤 인스턴스
export const apiClient = new APIClient();

// 전역 호환성 (과도기, 향후 제거 예정)
if (typeof window !== 'undefined') {
  window.MyMind3 = window.MyMind3 || {};
  window.MyMind3.APIClientESM = apiClient;
}

export default apiClient;
