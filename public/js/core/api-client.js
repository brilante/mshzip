// public/js/core/api-client.js
// REFACTOR-002: API 호출을 중앙 관리하는 Client 클래스

/**
 * API 호출을 중앙 관리하는 Client 클래스
 * @class APIClient
 */
window.MyMind3 = window.MyMind3 || {};
window.MyMind3.APIClient = (function() {
  'use strict';

  // API 엔드포인트 정의
  const ENDPOINTS = {
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

    // 인증 관련
    AUTH_CHECK: '/api/auth/check',
    AUTH_LOGIN: '/api/auth/login',
    AUTH_LOGOUT: '/api/auth/logout'
  };

  /**
   * 기본 fetch 래퍼
   * @param {string} url - API URL
   * @param {Object} options - fetch 옵션
   * @returns {Promise<Object>} 응답 데이터
   */
  async function request(url, options = {}) {
    // POST, PUT, DELETE, PATCH 요청에 CSRF 토큰 추가
    const method = (options.method || 'GET').toUpperCase();
    let csrfHeaders = {};
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    }

    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...csrfHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('[APIClient] Request failed:', url, error);
      throw error;
    }
  }

  /**
   * GET 요청
   */
  async function get(endpoint, params = {}) {
    const url = new URL(endpoint, window.location.origin);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    return request(url.toString(), { method: 'GET' });
  }

  /**
   * POST 요청
   */
  async function post(endpoint, body = {}) {
    return request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // === 크레딧 API ===
  async function getCreditsBalance() {
    return get(ENDPOINTS.CREDITS_BALANCE);
  }

  async function validateCredits(aiService, modelName, estimatedTokens) {
    return post(ENDPOINTS.CREDITS_VALIDATE, {
      ai_service: aiService,
      model_name: modelName,
      estimated_tokens: estimatedTokens
    });
  }

  async function deductCredits(aiService, modelName, inputTokens, outputTokens) {
    return post(ENDPOINTS.CREDITS_DEDUCT, {
      ai_service: aiService,
      model_name: modelName,
      input_tokens: inputTokens,
      output_tokens: outputTokens
    });
  }

  async function purchaseCredits(amount, currency) {
    return post(ENDPOINTS.CREDITS_PURCHASE, { amount, currency });
  }

  async function getModels() {
    return get(ENDPOINTS.CREDITS_MODELS);
  }

  // === 환율 API ===
  async function getExchangeRates() {
    return get(ENDPOINTS.EXCHANGE_RATES);
  }

  // Public API
  return {
    ENDPOINTS: ENDPOINTS,
    request: request,
    get: get,
    post: post,
    // 크레딧
    getCreditsBalance: getCreditsBalance,
    validateCredits: validateCredits,
    deductCredits: deductCredits,
    purchaseCredits: purchaseCredits,
    getModels: getModels,
    // 환율
    getExchangeRates: getExchangeRates
  };
})();
