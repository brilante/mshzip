/**
 * Simple Store - 경량 상태 관리 모듈
 * Phase 3.2: 상태 관리 개선
 *
 * @version 1.0.0
 * @date 2026-01-23
 *
 * 목적:
 *   window 전역 변수(window.currentMap, window.userSettings 등)를
 *   중앙화된 상태 관리로 대체
 *
 * 사용법:
 *   import { store, useStore } from '/js/modules/core/store.js';
 *
 *   // 상태 가져오기
 *   const user = store.get('user');
 *
 *   // 상태 설정
 *   store.set('user', { name: 'testUser' });
 *
 *   // 상태 변경 구독
 *   const unsubscribe = store.subscribe('user', (newValue, oldValue) => {
 *     console.log('User changed:', newValue);
 *   });
 *
 *   // 구독 해제
 *   unsubscribe();
 */

/**
 * Simple Store 클래스
 * Pub/Sub 패턴 기반 상태 관리
 */
class Store {
  constructor() {
    this._state = {};
    this._listeners = {};
    this._history = [];
    this._maxHistory = 50;
  }

  /**
   * 상태 가져오기
   * @param {string} key - 상태 키
   * @param {*} defaultValue - 기본값
   * @returns {*} 상태 값
   */
  get(key, defaultValue = null) {
    return this._state.hasOwnProperty(key) ? this._state[key] : defaultValue;
  }

  /**
   * 상태 설정
   * @param {string} key - 상태 키
   * @param {*} value - 상태 값
   * @returns {Store} 체이닝을 위한 this 반환
   */
  set(key, value) {
    const oldValue = this._state[key];

    // 값이 같으면 업데이트 안함
    if (oldValue === value) return this;

    // 히스토리 기록
    this._recordHistory(key, oldValue, value);

    // 상태 업데이트
    this._state[key] = value;

    // 구독자들에게 알림
    this._notify(key, value, oldValue);

    return this;
  }

  /**
   * 여러 상태 한번에 설정
   * @param {Object} updates - { key: value } 형태
   */
  setMany(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      this.set(key, value);
    });
    return this;
  }

  /**
   * 상태 삭제
   * @param {string} key - 상태 키
   */
  delete(key) {
    if (this._state.hasOwnProperty(key)) {
      const oldValue = this._state[key];
      delete this._state[key];
      this._notify(key, undefined, oldValue);
    }
    return this;
  }

  /**
   * 모든 상태 초기화
   */
  clear() {
    Object.keys(this._state).forEach(key => {
      this.delete(key);
    });
    return this;
  }

  /**
   * 상태 변경 구독
   * @param {string} key - 상태 키
   * @param {Function} callback - (newValue, oldValue) => void
   * @returns {Function} 구독 해제 함수
   */
  subscribe(key, callback) {
    if (!this._listeners[key]) {
      this._listeners[key] = new Set();
    }
    this._listeners[key].add(callback);

    // 구독 해제 함수 반환
    return () => {
      this._listeners[key].delete(callback);
      if (this._listeners[key].size === 0) {
        delete this._listeners[key];
      }
    };
  }

  /**
   * 전체 상태 변경 구독
   * @param {Function} callback - (key, newValue, oldValue) => void
   * @returns {Function} 구독 해제 함수
   */
  subscribeAll(callback) {
    return this.subscribe('*', callback);
  }

  /**
   * 구독자들에게 알림
   * @private
   */
  _notify(key, newValue, oldValue) {
    // 특정 키 구독자
    if (this._listeners[key]) {
      this._listeners[key].forEach(cb => {
        try {
          cb(newValue, oldValue);
        } catch (e) {
          console.error(`[Store] Listener error for '${key}':`, e);
        }
      });
    }

    // 전체 구독자
    if (this._listeners['*']) {
      this._listeners['*'].forEach(cb => {
        try {
          cb(key, newValue, oldValue);
        } catch (e) {
          console.error('[Store] Global listener error:', e);
        }
      });
    }
  }

  /**
   * 히스토리 기록
   * @private
   */
  _recordHistory(key, oldValue, newValue) {
    this._history.push({
      key,
      oldValue,
      newValue,
      timestamp: Date.now()
    });

    // 최대 히스토리 제한
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  /**
   * 히스토리 조회
   * @param {number} count - 조회할 개수
   * @returns {Array} 히스토리 배열
   */
  getHistory(count = 10) {
    return this._history.slice(-count);
  }

  /**
   * 전체 상태 스냅샷
   * @returns {Object} 현재 상태 복사본
   */
  getSnapshot() {
    return { ...this._state };
  }

  /**
   * 디버그용 상태 출력
   */
  debug() {
    console.log('[Store] Current State:', this._state);
    console.log('[Store] Listeners:', Object.keys(this._listeners));
    return this;
  }
}

// 싱글톤 인스턴스
export const store = new Store();

/**
 * React-like useStore 훅 (편의 함수)
 * @param {string} key - 상태 키
 * @param {*} defaultValue - 기본값
 * @returns {[*, Function]} [value, setValue]
 */
export function useStore(key, defaultValue = null) {
  const value = store.get(key, defaultValue);
  const setValue = (newValue) => store.set(key, newValue);
  return [value, setValue];
}

// 전역 호환성 (과도기)
if (typeof window !== 'undefined') {
  window.MyMind3 = window.MyMind3 || {};
  window.MyMind3.store = store;
}

export default store;
