/**
 * API 캐시 모듈
 * 중복 API 호출을 방지하고 성능을 최적화합니다.
 *
 * @version 1.0.0
 * @since 2026-01-17
 */
(function() {
  'use strict';

  // 캐시 저장소
  const cache = new Map();

  // 진행 중인 요청 (중복 요청 방지)
  const pendingRequests = new Map();

  // 기본 TTL (60초)
  const DEFAULT_TTL = 60000;

  // API별 TTL 설정 (밀리초)
  const API_TTL = {
    '/api/credits/models': 300000,      // 5분 (모델 목록은 자주 변경되지 않음)
    '/api/credits/balance': 120000,     // 2분 (차감 시 invalidate()로 갱신)
    '/api/credits/ai-services': 300000, // 5분 (AI 서비스 목록)
    '/api/credits/usage-history': 120000, // 2분 (사용 이력)
    '/api/user/settings': 60000,        // 1분
    '/api/ai/recommendations': 600000,  // 10분 (AI 추천은 거의 변경 안됨)
    '/api/ai/capabilities': 600000,     // 10분
    '/api/admin/feature-settings': 120000, // 2분
    '/api/auth/check': 60000,           // 1분 (세션 확인)
    '/api/packages': 300000,            // 5분
    '/api/config/info': 300000,         // 5분
    '/api/exchange/packages': 300000,   // 5분
    '/api/preferences': 60000,          // 1분
    '/api/mindmap/savelist': 30000      // 30초 (저장/삭제 시 invalidate)
  };

  /**
   * 캐시 키 생성
   * @param {string} url - API URL
   * @param {object} options - fetch 옵션
   * @returns {string} 캐시 키
   */
  function getCacheKey(url, options = {}) {
    // GET 요청만 캐시
    if (options.method && options.method !== 'GET') {
      return null;
    }
    return url;
  }

  /**
   * TTL 가져오기
   * @param {string} url - API URL
   * @returns {number} TTL (밀리초)
   */
  function getTTL(url) {
    // URL 패턴 매칭
    for (const pattern of Object.keys(API_TTL)) {
      if (url.startsWith(pattern) || url.includes(pattern)) {
        return API_TTL[pattern];
      }
    }
    return DEFAULT_TTL;
  }

  /**
   * 캐시된 데이터 가져오기
   * @param {string} key - 캐시 키
   * @returns {object|null} 캐시된 데이터 또는 null
   */
  function getFromCache(key) {
    if (!key) return null;

    const entry = cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // 만료됨
      cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * 캐시에 데이터 저장
   * @param {string} key - 캐시 키
   * @param {object} data - 저장할 데이터
   * @param {string} url - API URL (TTL 결정용)
   */
  function setToCache(key, data, url) {
    if (!key) return;

    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: getTTL(url)
    });
  }

  /**
   * 캐시된 fetch (GET 요청 전용)
   * @param {string} url - API URL
   * @param {object} options - fetch 옵션
   * @returns {Promise<Response>} fetch 응답
   */
  async function cachedFetch(url, options = {}) {
    const key = getCacheKey(url, options);

    // POST, PUT, DELETE 등은 캐시하지 않음
    if (!key) {
      return fetch(url, options);
    }

    // 캐시 확인
    const cachedData = getFromCache(key);
    if (cachedData) {
      console.log(`[ApiCache] Cache hit: ${url}`);
      // 캐시된 데이터를 Response 객체처럼 반환
      return {
        ok: true,
        status: 200,
        json: async () => cachedData,
        text: async () => JSON.stringify(cachedData),
        clone: () => ({ json: async () => cachedData })
      };
    }

    // 진행 중인 동일 요청이 있으면 대기 후 캐시에서 반환
    if (pendingRequests.has(key)) {
      console.log(`[ApiCache] Waiting for pending request: ${url}`);
      try {
        await pendingRequests.get(key);
        // 대기 완료 후 캐시에서 데이터 반환
        const cachedData = getFromCache(key);
        if (cachedData) {
          return {
            ok: true,
            status: 200,
            json: async () => cachedData,
            text: async () => JSON.stringify(cachedData),
            clone: () => ({ json: async () => cachedData })
          };
        }
      } catch (e) {
        // 원본 요청 실패 시 새로 요청
        console.warn(`[ApiCache] Pending request failed, retrying: ${url}`);
      }
    }

    // 새 요청 시작
    console.log(`[ApiCache] Fetching: ${url}`);
    const requestPromise = (async () => {
      try {
        const response = await fetch(url, options);

        if (response.ok) {
          // 응답을 클론하여 캐시 저장
          const cloned = response.clone();
          const data = await cloned.json();
          setToCache(key, data, url);
        }

        return response;
      } finally {
        // 요청 완료 후 pending에서 제거
        pendingRequests.delete(key);
      }
    })();

    pendingRequests.set(key, requestPromise);
    return requestPromise;
  }

  /**
   * 특정 캐시 무효화
   * @param {string} url - API URL
   */
  function invalidate(url) {
    const key = getCacheKey(url);
    if (key) {
      cache.delete(key);
      console.log(`[ApiCache] Invalidated: ${url}`);
    }
  }

  /**
   * 패턴에 맞는 캐시 무효화
   * @param {string} pattern - URL 패턴
   */
  function invalidatePattern(pattern) {
    let count = 0;
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      console.log(`[ApiCache] Invalidated ${count} entries matching: ${pattern}`);
    }
  }

  /**
   * 전체 캐시 클리어
   */
  function clearAll() {
    const size = cache.size;
    cache.clear();
    console.log(`[ApiCache] Cleared all ${size} entries`);
  }

  /**
   * 캐시 상태 확인 (디버깅용)
   * @returns {object} 캐시 상태
   */
  function getStats() {
    const now = Date.now();
    const entries = [];

    for (const [key, entry] of cache.entries()) {
      const remaining = entry.ttl - (now - entry.timestamp);
      entries.push({
        url: key,
        remainingTTL: Math.max(0, remaining),
        expired: remaining <= 0
      });
    }

    return {
      size: cache.size,
      pendingRequests: pendingRequests.size,
      entries
    };
  }

  /**
   * 데이터 직접 가져오기 (JSON 파싱 포함)
   * @param {string} url - API URL
   * @param {object} options - fetch 옵션
   * @returns {Promise<object>} JSON 데이터
   */
  async function getData(url, options = {}) {
    const response = await cachedFetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  /**
   * 여러 API 동시 호출 (캐시 활용)
   * @param {string[]} urls - API URL 배열
   * @returns {Promise<object[]>} 응답 배열
   */
  async function getMultiple(urls) {
    return Promise.all(urls.map(url => getData(url)));
  }

  // 전역 노출
  window.ApiCache = {
    fetch: cachedFetch,
    getData,
    getMultiple,
    invalidate,
    invalidatePattern,
    clearAll,
    getStats,
    // 직접 캐시 조작 (고급 사용)
    _cache: cache,
    _getTTL: getTTL
  };

  console.log('[ApiCache] API 캐시 모듈 로드 완료');
})();
