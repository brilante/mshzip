/**
 * API Key Manager
 * REFACTOR-014: API Key 저장 방식 개선
 *
 * 보안 정책:
 * - API Key는 메모리에만 저장 (브라우저 새로고침 시 삭제)
 * - localStorage/sessionStorage 사용 금지
 * - 서버로 API Key 전송 금지 (클라이언트에서 직접 각 AI 서비스 API 호출)
 */

window.MyMind3 = window.MyMind3 || {};
window.MyMind3.APIKeyManager = (function() {
  'use strict';

  // 메모리에만 저장 (새로고침 시 삭제)
  const _keys = new Map();

  // 지원하는 AI 서비스 목록
  const SUPPORTED_SERVICES = ['gpt', 'claude', 'gemini', 'grok', 'local'];

  /**
   * API Key 저장
   * @param {string} service - 서비스명 (gpt, claude, gemini, grok, local)
   * @param {string} key - API Key
   * @returns {boolean} 저장 성공 여부
   */
  function setKey(service, key) {
    if (!service || !SUPPORTED_SERVICES.includes(service)) {
      console.warn('[APIKeyManager] 지원하지 않는 서비스:', service);
      return false;
    }

    if (!key || key.trim() === '') {
      _keys.delete(service);
      console.log(`[APIKeyManager] ${service} API Key 삭제됨`);
      return true;
    }

    _keys.set(service, key.trim());
    console.log(`[APIKeyManager] ${service} API Key 저장됨 (길이: ${key.length})`);
    return true;
  }

  /**
   * API Key 조회
   * @param {string} service - 서비스명
   * @returns {string|null} API Key
   */
  function getKey(service) {
    return _keys.get(service) || null;
  }

  /**
   * API Key 존재 여부
   * @param {string} service - 서비스명
   * @returns {boolean}
   */
  function hasKey(service) {
    const key = _keys.get(service);
    return key !== undefined && key !== null && key.length > 0;
  }

  /**
   * 특정 서비스 키 삭제
   * @param {string} service - 서비스명
   */
  function removeKey(service) {
    _keys.delete(service);
    console.log(`[APIKeyManager] ${service} API Key 삭제됨`);
  }

  /**
   * 모든 키 삭제
   */
  function clearAll() {
    _keys.clear();
    console.log('[APIKeyManager] 모든 API Key 삭제됨');
  }

  /**
   * 키 마스킹 (표시용)
   * @param {string} service - 서비스명
   * @returns {string} 마스킹된 키 문자열
   */
  function getMaskedKey(service) {
    const key = getKey(service);
    if (!key) return '';
    if (key.length <= 8) return '****' + key.substring(key.length - 4);
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  }

  /**
   * 저장된 서비스 목록 조회
   * @returns {string[]} 키가 저장된 서비스 목록
   */
  function getStoredServices() {
    return Array.from(_keys.keys());
  }

  /**
   * API Key 유효성 기본 검사
   * @param {string} service - 서비스명
   * @param {string} key - API Key
   * @returns {Object} { valid: boolean, message: string }
   */
  function validateKeyFormat(service, key) {
    if (!key || key.trim() === '') {
      return { valid: false, message: 'API Key가 비어있습니다.' };
    }

    const trimmedKey = key.trim();

    // 서비스별 기본 형식 검사
    switch (service) {
      case 'gpt':
        if (!trimmedKey.startsWith('sk-')) {
          return { valid: false, message: 'OpenAI API Key는 "sk-"로 시작해야 합니다.' };
        }
        break;
      case 'claude':
        if (!trimmedKey.startsWith('sk-ant-')) {
          return { valid: false, message: 'Anthropic API Key는 "sk-ant-"로 시작해야 합니다.' };
        }
        break;
      case 'grok':
        if (!trimmedKey.startsWith('xai-')) {
          return { valid: false, message: 'xAI API Key는 "xai-"로 시작해야 합니다.' };
        }
        break;
      case 'gemini':
        if (trimmedKey.length < 20) {
          return { valid: false, message: 'Gemini API Key가 너무 짧습니다.' };
        }
        break;
      case 'local':
        // Local AI는 URL 형식
        if (!trimmedKey.startsWith('http://') && !trimmedKey.startsWith('https://')) {
          return { valid: false, message: 'Local AI URL은 http:// 또는 https://로 시작해야 합니다.' };
        }
        break;
    }

    return { valid: true, message: 'API Key 형식이 유효합니다.' };
  }

  /**
   * 디버깅용 상태 출력
   */
  function debug() {
    console.log('[APIKeyManager Debug]');
    console.log('  저장된 서비스:', getStoredServices());
    SUPPORTED_SERVICES.forEach(service => {
      console.log(`  ${service}: ${hasKey(service) ? getMaskedKey(service) : '(없음)'}`);
    });
  }

  // Public API
  return {
    setKey,
    getKey,
    hasKey,
    removeKey,
    clearAll,
    getMaskedKey,
    getStoredServices,
    validateKeyFormat,
    debug,
    SUPPORTED_SERVICES
  };
})();
