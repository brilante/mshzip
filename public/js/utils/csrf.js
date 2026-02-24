/**
 * CSRF 토큰 관리 유틸리티
 *
 * Double Submit Cookie 방식의 CSRF 보호를 위한 클라이언트 측 유틸리티
 *
 * @module utils/csrf
 * @created 2026-01-08
 */

(function() {
  'use strict';

  let csrfToken = null;

  /**
   * 서버에서 CSRF 토큰 가져오기
   * @returns {Promise<string>} CSRF 토큰
   */
  async function fetchCsrfToken() {
    try {
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const data = await response.json();
      csrfToken = data.csrfToken;
      return csrfToken;
    } catch (error) {
      console.error('[CSRF] 토큰 가져오기 실패:', error);
      throw error;
    }
  }

  /**
   * 캐시된 CSRF 토큰 반환 (없으면 서버에서 가져옴)
   * @returns {Promise<string>} CSRF 토큰
   */
  async function getCsrfToken() {
    if (!csrfToken) {
      await fetchCsrfToken();
    }
    return csrfToken;
  }

  /**
   * CSRF 토큰 캐시 초기화 (재로그인 등의 경우)
   */
  function clearCsrfToken() {
    csrfToken = null;
  }

  /**
   * CSRF 토큰이 포함된 fetch 헤더 반환
   * @returns {Promise<Object>} CSRF 토큰이 포함된 헤더 객체
   */
  async function getCsrfHeaders() {
    const token = await getCsrfToken();
    return {
      'x-csrf-token': token
    };
  }

  /**
   * CSRF 보호가 적용된 fetch 래퍼
   * POST, PUT, DELETE, PATCH 요청에 자동으로 CSRF 토큰 추가
   *
   * @param {string} url - 요청 URL
   * @param {Object} options - fetch 옵션
   * @returns {Promise<Response>} fetch 응답
   */
  async function secureFetch(url, options = {}) {
    const method = (options.method || 'GET').toUpperCase();

    // GET, HEAD, OPTIONS는 CSRF 보호 필요 없음
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return fetch(url, {
        ...options,
        credentials: 'include'
      });
    }

    // POST, PUT, DELETE, PATCH 요청에 CSRF 토큰 추가
    try {
      const csrfHeaders = await getCsrfHeaders();

      const mergedHeaders = {
        ...options.headers,
        ...csrfHeaders
      };

      const response = await fetch(url, {
        ...options,
        headers: mergedHeaders,
        credentials: 'include'
      });

      // CSRF 토큰 오류 시 토큰 갱신 후 재시도
      if (response.status === 403) {
        const errorData = await response.clone().json();
        if (errorData.error === 'CSRF token validation failed') {
          console.warn('[CSRF] 토큰 만료, 갱신 후 재시도...');
          clearCsrfToken();
          const newCsrfHeaders = await getCsrfHeaders();

          return fetch(url, {
            ...options,
            headers: {
              ...options.headers,
              ...newCsrfHeaders
            },
            credentials: 'include'
          });
        }
      }

      return response;
    } catch (error) {
      console.error('[CSRF] secureFetch 실패:', error);
      throw error;
    }
  }

  // 전역 객체로 내보내기
  window.csrfUtils = {
    fetchCsrfToken,
    getCsrfToken,
    clearCsrfToken,
    getCsrfHeaders,
    secureFetch
  };

  // 페이지 로드 시 CSRF 토큰 미리 가져오기
  document.addEventListener('DOMContentLoaded', function() {
    // 로그인 상태일 때만 CSRF 토큰 가져오기
    setTimeout(() => {
      if (document.cookie.includes('connect.sid')) {
        fetchCsrfToken().catch(() => {
          // 실패해도 무시 (첫 요청 시 다시 시도됨)
        });
      }
    }, 100);
  });
})();
