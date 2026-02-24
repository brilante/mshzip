/**
 * 전역 환경 상태 관리 모듈
 * Settings 헤더의 환경선택을 관리하고 모든 관리자 모듈에 적용
 *
 * @module settings-env
 * @created 2026-01-08
 */

(function() {
  'use strict';

  // 환경 이름 매핑 (기본값 - i18n 없을 때 폴백)
  const ENV_NAMES_DEFAULT = {
    local: '로컬',
    development: '개발',
    production: '운영'
  };

  // i18n 키 매핑
  const ENV_I18N_KEYS = {
    local: 'envLocal',
    development: 'envDevelopment',
    production: 'envProduction'
  };

  /**
   * 번역된 환경 이름 가져오기
   * @param {string} env - 환경 값 (local/development/production)
   * @returns {string} 번역된 환경 이름
   */
  function getEnvName(env) {
    var i18nKey = ENV_I18N_KEYS[env];
    if (window.i18n && i18nKey && window.i18n[i18nKey]) {
      return window.i18n[i18nKey];
    }
    return ENV_NAMES_DEFAULT[env] || env;
  }

  // 어드민 전용 메뉴 목록 (이 메뉴에서만 환경선택기 표시)
  const ADMIN_MENUS = ['feature-settings', 'admin', 'ai-model-admin', 'model-sync-logs', 'board-admin'];

  // UI 값과 백엔드 값 매핑
  const ENV_MAP = {
    local: 'local',
    dev: 'development',
    prod: 'production'
  };

  const ENV_MAP_REVERSE = {
    local: 'local',
    development: 'dev',
    production: 'prod'
  };

  // 전역 환경 상태
  window.SettingsEnv = {
    current: 'local',       // 현재 선택된 환경 (UI 값: local/dev/prod)
    server: 'local',        // 서버의 실제 환경 (백엔드 값: local/development/production)
    isAdmin: false,         // 관리자 인증 여부
    currentMenu: null,      // 현재 선택된 메뉴
    initialized: false,     // 초기화 완료 여부

    /**
     * 초기화
     */
    init: function() {
      if (this.initialized) return;

      // localStorage에서 이전 환경 복원
      var savedEnv = localStorage.getItem('adminSelectedEnv');
      if (savedEnv && ['local', 'dev', 'prod'].indexOf(savedEnv) !== -1) {
        this.current = savedEnv;
      }

      // 라디오 버튼 이벤트 설정
      this.setupRadioListeners();

      this.initialized = true;
      console.log('[SettingsEnv] 초기화 완료');
    },

    /**
     * 라디오 버튼 이벤트 리스너 설정
     */
    setupRadioListeners: function() {
      var self = this;
      var radios = document.querySelectorAll('input[name="globalEnv"]');
      radios.forEach(function(radio) {
        radio.addEventListener('change', function(e) {
          if (e.target.checked) {
            self.setEnvironment(e.target.value);
          }
        });
      });
    },

    /**
     * 환경 변경
     * @param {string} env - UI 환경 값 (local/dev/prod)
     */
    setEnvironment: function(env) {
      if (['local', 'dev', 'prod'].indexOf(env) === -1) {
        console.warn('[SettingsEnv] 유효하지 않은 환경:', env);
        return;
      }

      var prevEnv = this.current;
      this.current = env;

      // localStorage에 저장
      localStorage.setItem('adminSelectedEnv', env);

      // UI 업데이트
      this.updateRadioUI();

      // 환경 변경 이벤트 발행
      var backendEnv = ENV_MAP[env] || env;
      document.dispatchEvent(new CustomEvent('envChanged', {
        detail: {
          env: env,
          backendEnv: backendEnv,
          prevEnv: prevEnv
        }
      }));

      console.log('[SettingsEnv] 환경 변경: ' + prevEnv + ' -> ' + env + ' (backend: ' + backendEnv + ')');
    },

    /**
     * 서버 환경 설정
     * @param {string} serverEnv - 서버 환경 값 (local/development/production)
     */
    setServerEnv: function(serverEnv) {
      this.server = serverEnv;

      // UI 환경 값으로 변환
      var uiEnv = ENV_MAP_REVERSE[serverEnv] || 'local';

      // 서버 환경 배지 업데이트
      var badge = document.getElementById('globalServerEnvBadge');
      if (badge) {
        badge.textContent = getEnvName(serverEnv);
      }

      // 최초 로드 시 서버 환경으로 설정 (저장된 환경이 없는 경우)
      if (!localStorage.getItem('adminSelectedEnv')) {
        this.current = uiEnv;
        this.updateRadioUI();
      }

      console.log('[SettingsEnv] 서버 환경: ' + serverEnv);
    },

    /**
     * 관리자 상태 설정
     * @param {boolean} isAdminUser - 관리자 인증 여부
     */
    setAdminStatus: function(isAdminUser) {
      this.isAdmin = isAdminUser;
      this.updateHeaderVisibility();

      if (isAdminUser && !this.initialized) {
        this.init();
      }

      console.log('[SettingsEnv] 관리자 상태: ' + (isAdminUser ? '인증됨' : '미인증'));
    },

    /**
     * 현재 메뉴 설정 (메뉴 전환 시 호출)
     * @param {string} menuName - 메뉴 이름
     */
    setCurrentMenu: function(menuName) {
      this.currentMenu = menuName;
      this.updateHeaderVisibility();
      console.log('[SettingsEnv] 메뉴 변경: ' + menuName);
    },

    /**
     * 어드민 메뉴인지 확인
     * @param {string} menuName - 메뉴 이름
     * @returns {boolean}
     */
    isAdminMenu: function(menuName) {
      return ADMIN_MENUS.indexOf(menuName) !== -1;
    },

    /**
     * 헤더 환경선택 표시/숨김
     * 어드민 인증 + 어드민 메뉴 선택 시에만 표시
     */
    updateHeaderVisibility: function() {
      var selector = document.getElementById('globalEnvSelector');
      if (selector) {
        var shouldShow = this.isAdmin && this.isAdminMenu(this.currentMenu);
        selector.style.display = shouldShow ? 'flex' : 'none';
      }
    },

    /**
     * 라디오 버튼 UI 업데이트
     */
    updateRadioUI: function() {
      var radio = document.querySelector('input[name="globalEnv"][value="' + this.current + '"]');
      if (radio) {
        radio.checked = true;
      }

      // 서버 환경 표시 (● 마커)
      var self = this;
      var radioItems = document.querySelectorAll('#globalEnvSelector .env-radio-item');
      radioItems.forEach(function(item) {
        var input = item.querySelector('input');
        var isServerEnv = input && ENV_MAP[input.value] === self.server;
        item.classList.toggle('server-env', isServerEnv);
      });
    },

    /**
     * 현재 환경 반환 (UI 값)
     * @returns {string} local/dev/prod
     */
    getCurrentEnv: function() {
      return this.current;
    },

    /**
     * 현재 환경 반환 (백엔드 값)
     * @returns {string} local/development/production
     */
    getBackendEnv: function() {
      return ENV_MAP[this.current] || this.current;
    },

    /**
     * 서버 환경 반환
     * @returns {string} local/development/production
     */
    getServerEnv: function() {
      return this.server;
    }
  };

  console.log('[SettingsEnv] 모듈 로드됨');
})();
