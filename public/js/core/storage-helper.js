// public/js/core/storage-helper.js
// REFACTOR-001: localStorage 접근을 중앙 관리하는 Helper 클래스

/**
 * localStorage 접근을 중앙 관리하는 Helper 클래스
 * @class StorageHelper
 */
window.MyMind3 = window.MyMind3 || {};
window.MyMind3.StorageHelper = (function() {
  'use strict';

  // 키 상수 정의
  const KEYS = {
    SUBSCRIPTION: 'mymind3_subscription',
    AI_SETTINGS: 'mymind3_ai_settings',
    USER_INFO: 'userInfo',
    USER_ID: 'userId',
    SETTINGS: 'mymind3_settings',
    CURRENT_FOLDER: 'currentFolder',
    APP_LANGUAGE: 'appLanguage',
    USER_ROLE: 'mymind3_user_role',
    PAYMENT_HISTORY: 'mymind3_payment_history'
  };

  /**
   * 안전한 JSON 파싱
   * @param {string} key - localStorage 키
   * @param {*} defaultValue - 기본값
   * @returns {*} 파싱된 값 또는 기본값
   */
  function get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.error('[StorageHelper] Read error:', key, e);
      return defaultValue;
    }
  }

  /**
   * 안전한 JSON 저장
   * @param {string} key - localStorage 키
   * @param {*} value - 저장할 값
   * @returns {boolean} 성공 여부
   */
  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('[StorageHelper] Write error:', key, e);
      return false;
    }
  }

  /**
   * 키 삭제
   * @param {string} key - localStorage 키
   */
  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('[StorageHelper] Remove error:', key, e);
    }
  }

  // === 구독 관련 헬퍼 ===
  function getSubscription() {
    return get(KEYS.SUBSCRIPTION, {});
  }

  function setSubscription(data) {
    return set(KEYS.SUBSCRIPTION, data);
  }

  function getCredits() {
    const subscription = getSubscription();
    return subscription.credits || { free: 0, service: 0, paid: 0 };
  }

  // === AI 설정 관련 헬퍼 ===
  function getAISettings() {
    return get(KEYS.AI_SETTINGS, {});
  }

  function setAISettings(data) {
    return set(KEYS.AI_SETTINGS, data);
  }

  // === 사용자 정보 관련 헬퍼 ===
  function getUserInfo() {
    return get(KEYS.USER_INFO, null);
  }

  function getUserId() {
    return get(KEYS.USER_ID, null);
  }

  // Public API
  return {
    KEYS: KEYS,
    get: get,
    set: set,
    remove: remove,
    // 구독
    getSubscription: getSubscription,
    setSubscription: setSubscription,
    getCredits: getCredits,
    // AI 설정
    getAISettings: getAISettings,
    setAISettings: setAISettings,
    // 사용자
    getUserInfo: getUserInfo,
    getUserId: getUserId
  };
})();
