/* Settings Feature JavaScript - MyMind3 */
/* 기능 설정 관리 모듈 (환경별 PPT/PDF 설정) */
/* 2026-01-05: DB 저장 방식으로 변경 */

(function() {
  'use strict';

  // i18n 안전 래퍼: i18n-init.js가 defer로 로드되어 아직 없을 수 있음
  function t(key, fallback) { return (typeof window.t === 'function') ? window.t(key, fallback) : (fallback || key); }

  // 기본 설정값
  const DEFAULT_FEATURE_SETTINGS = {
    local: {
      enableNodeRestructure: true,
      enablePpt: true,
      enablePdf: true
    },
    development: {
      enableNodeRestructure: true,
      enablePpt: true,
      enablePdf: true
    },
    production: {
      enableNodeRestructure: true,
      enablePpt: true,
      enablePdf: true
    }
  };

  // 환경 이름 매핑 (프론트엔드 ↔ 백엔드)
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

  // 환경 이름 (표시용)
  const ENV_NAMES = {
    local: t('envLocal', '로컬'),
    dev: t('envDevelopment', '개발'),
    prod: t('envProduction', '운영'),
    development: t('envDevelopment', '개발'),
    production: t('envProduction', '운영')
  };

  // 서버에서 감지된 환경 (NODE_ENV 기반: local/development/production)
  let serverEnvironment = 'local';

  /**
   * 현재 선택된 환경 가져오기 (전역 SettingsEnv 사용)
   * @returns {string} local/dev/prod
   */
  function getCurrentEnv() {
    return window.SettingsEnv ? window.SettingsEnv.getCurrentEnv() : 'local';
  }

  // 현재 설정값 (환경별, 백엔드 형식: local/development/production)
  let featureSettings = JSON.parse(JSON.stringify(DEFAULT_FEATURE_SETTINGS));

  // 로딩 상태
  let isLoading = false;

  /**
   * 기능 설정 초기화
   */
  async function initFeatureSettings() {
    console.log('[FeatureSettings] 초기화 시작');

    // DB에서 설정 로드 (serverEnv도 함께 받음)
    await loadFeatureSettingsFromDB();

    // 서버 환경 기반으로 현재 환경 감지
    detectCurrentEnvironment();

    // UI 이벤트 바인딩
    bindFeatureSettingsEvents();

    // UI 업데이트
    updateFeatureSettingsUI();

    console.log('[FeatureSettings] 초기화 완료');
  }

  /**
   * 현재 환경 자동 감지 (서버 NODE_ENV 기반)
   * 서버에서 받은 serverEnvironment를 전역 SettingsEnv에 설정
   */
  function detectCurrentEnvironment() {
    // 전역 SettingsEnv에 서버 환경 설정
    if (window.SettingsEnv) {
      window.SettingsEnv.setServerEnv(serverEnvironment);
    }

    console.log(`[FeatureSettings] 현재 환경 감지: ${getCurrentEnv()} (서버 환경: ${serverEnvironment})`);
  }

  /**
   * DB에서 설정 로드
   */
  async function loadFeatureSettingsFromDB() {
    try {
      isLoading = true;
      const response = await fetch('/api/admin/feature-settings', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // 백엔드 형식 그대로 저장
          featureSettings = {
            local: result.data.local || DEFAULT_FEATURE_SETTINGS.local,
            development: result.data.development || DEFAULT_FEATURE_SETTINGS.development,
            production: result.data.production || DEFAULT_FEATURE_SETTINGS.production
          };

          // 서버 환경 저장 (NODE_ENV 기반)
          if (result.serverEnv) {
            serverEnvironment = result.serverEnv;
            console.log(`[FeatureSettings] 서버 환경: ${serverEnvironment}`);
          }

          console.log('[FeatureSettings] DB에서 설정 로드 완료:', featureSettings);
        }
      } else if (response.status === 401 || response.status === 403) {
        // 관리자 인증 필요 - localStorage에서 임시 로드
        loadFeatureSettingsFromLocalStorage();
      } else {
        console.warn('[FeatureSettings] DB 로드 실패, localStorage 사용');
        loadFeatureSettingsFromLocalStorage();
      }
    } catch (error) {
      console.error('[FeatureSettings] DB 로드 오류:', error);
      loadFeatureSettingsFromLocalStorage();
    } finally {
      isLoading = false;
    }
  }

  /**
   * localStorage에서 설정 로드 (폴백)
   */
  function loadFeatureSettingsFromLocalStorage() {
    try {
      const saved = localStorage.getItem('mymind3_feature_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        // 프론트엔드 형식(local/dev/prod)을 백엔드 형식으로 변환
        featureSettings = {
          local: parsed.local || DEFAULT_FEATURE_SETTINGS.local,
          development: parsed.dev || parsed.development || DEFAULT_FEATURE_SETTINGS.development,
          production: parsed.prod || parsed.production || DEFAULT_FEATURE_SETTINGS.production
        };
        console.log('[FeatureSettings] localStorage에서 설정 로드:', featureSettings);
      }
    } catch (error) {
      console.error('[FeatureSettings] localStorage 로드 실패:', error);
      featureSettings = JSON.parse(JSON.stringify(DEFAULT_FEATURE_SETTINGS));
    }
  }

  /**
   * DB에 설정 저장
   */
  async function saveFeatureSettingsToDB() {
    try {
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
      const response = await fetch('/api/admin/feature-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({ allSettings: featureSettings })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[FeatureSettings] DB 저장 완료:', result);
        // 메인 페이지에서 admin 인증 없이도 설정을 읽을 수 있도록 localStorage에도 동기화
        saveFeatureSettingsToLocalStorage();
        return true;
      } else if (response.status === 401 || response.status === 403) {
        console.warn('[FeatureSettings] 관리자 인증 필요, localStorage에 저장');
        return saveFeatureSettingsToLocalStorage();
      } else {
        console.error('[FeatureSettings] DB 저장 실패');
        return saveFeatureSettingsToLocalStorage();
      }
    } catch (error) {
      console.error('[FeatureSettings] DB 저장 오류:', error);
      return saveFeatureSettingsToLocalStorage();
    }
  }

  /**
   * localStorage에 설정 저장 (폴백)
   */
  function saveFeatureSettingsToLocalStorage() {
    try {
      // 백엔드 형식을 프론트엔드 형식으로 변환하여 저장
      const frontendFormat = {
        local: featureSettings.local,
        dev: featureSettings.development,
        prod: featureSettings.production
      };
      localStorage.setItem('mymind3_feature_settings', JSON.stringify(frontendFormat));
      console.log('[FeatureSettings] localStorage 저장 완료');
      return true;
    } catch (error) {
      console.error('[FeatureSettings] localStorage 저장 실패:', error);
      return false;
    }
  }

  /**
   * UI 이벤트 바인딩
   */
  function bindFeatureSettingsEvents() {
    // 전역 환경 변경 이벤트 구독
    document.addEventListener('envChanged', function(e) {
      console.log(`[FeatureSettings] 전역 환경 변경 감지: ${e.detail.env}`);
      updateFeatureSettingsUI();
    });

    // 노드재구성 체크박스 이벤트
    const nodeRestructureCheckbox = document.getElementById('enableNodeRestructureFeature');
    if (nodeRestructureCheckbox) {
      nodeRestructureCheckbox.addEventListener('change', function() {
        const backendEnv = ENV_MAP[getCurrentEnv()] || getCurrentEnv();
        featureSettings[backendEnv].enableNodeRestructure = this.checked;
        console.log(`[FeatureSettings] 노드재구성 설정 변경 (${backendEnv}): ${this.checked}`);
      });
    }

    // PPT 체크박스 이벤트
    const pptCheckbox = document.getElementById('enablePptFeature');
    if (pptCheckbox) {
      pptCheckbox.addEventListener('change', function() {
        const backendEnv = ENV_MAP[getCurrentEnv()] || getCurrentEnv();
        featureSettings[backendEnv].enablePpt = this.checked;
        console.log(`[FeatureSettings] PPT 설정 변경 (${backendEnv}): ${this.checked}`);
      });
    }

    // PDF 체크박스 이벤트
    const pdfCheckbox = document.getElementById('enablePdfFeature');
    if (pdfCheckbox) {
      pdfCheckbox.addEventListener('change', function() {
        const backendEnv = ENV_MAP[getCurrentEnv()] || getCurrentEnv();
        featureSettings[backendEnv].enablePdf = this.checked;
        console.log(`[FeatureSettings] PDF 설정 변경 (${backendEnv}): ${this.checked}`);
      });
    }

    // 저장 버튼 이벤트
    const saveBtn = document.getElementById('saveFeatureSettingsBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', handleSaveFeatureSettings);
    }
  }

  /**
   * 현재 환경에 맞게 UI 업데이트
   */
  function updateFeatureSettingsUI() {
    const currentEnvValue = getCurrentEnv();
    const backendEnv = ENV_MAP[currentEnvValue] || currentEnvValue;
    const settings = featureSettings[backendEnv] || DEFAULT_FEATURE_SETTINGS[backendEnv];

    // 노드재구성 체크박스 업데이트
    const nodeRestructureCheckbox = document.getElementById('enableNodeRestructureFeature');
    if (nodeRestructureCheckbox) {
      nodeRestructureCheckbox.checked = settings.enableNodeRestructure;
    }

    // PPT 체크박스 업데이트
    const pptCheckbox = document.getElementById('enablePptFeature');
    if (pptCheckbox) {
      pptCheckbox.checked = settings.enablePpt;
    }

    // PDF 체크박스 업데이트
    const pdfCheckbox = document.getElementById('enablePdfFeature');
    if (pdfCheckbox) {
      pdfCheckbox.checked = settings.enablePdf;
    }

    // 저장 상태 초기화
    const statusEl = document.getElementById('featureSettingsSaveStatus');
    if (statusEl) {
      statusEl.textContent = '';
    }
  }

  /**
   * 설정 저장 핸들러
   */
  async function handleSaveFeatureSettings() {
    const statusEl = document.getElementById('featureSettingsSaveStatus');
    const saveBtn = document.getElementById('saveFeatureSettingsBtn');

    // 현재 체크박스 상태를 설정에 반영
    const backendEnv = ENV_MAP[getCurrentEnv()] || getCurrentEnv();
    const nodeRestructureCheckbox = document.getElementById('enableNodeRestructureFeature');
    const pptCheckbox = document.getElementById('enablePptFeature');
    const pdfCheckbox = document.getElementById('enablePdfFeature');

    if (nodeRestructureCheckbox) {
      featureSettings[backendEnv].enableNodeRestructure = nodeRestructureCheckbox.checked;
    }
    if (pptCheckbox) {
      featureSettings[backendEnv].enablePpt = pptCheckbox.checked;
    }
    if (pdfCheckbox) {
      featureSettings[backendEnv].enablePdf = pdfCheckbox.checked;
    }

    // 버튼 비활성화
    if (saveBtn) saveBtn.disabled = true;
    if (statusEl) statusEl.textContent = t('saving', '저장 중...');

    // DB에 저장
    const success = await saveFeatureSettingsToDB();

    if (success) {
      if (statusEl) {
        statusEl.innerHTML = mmIcon('check-circle', 14) + ' ' + t('featureSettingsSaved', '저장되었습니다 (DB)');
        statusEl.classList.remove('error');
      }

      // 현재 환경이면 즉시 적용
      applyFeatureSettings();

      // 3초 후 상태 메시지 제거
      setTimeout(() => {
        if (statusEl) statusEl.textContent = '';
      }, 3000);
    } else {
      if (statusEl) {
        statusEl.innerHTML = mmIcon('x-circle', 14) + ' ' + t('featureSettingsSaveError', '저장 실패');
        statusEl.classList.add('error');
      }
    }

    // 버튼 활성화
    if (saveBtn) saveBtn.disabled = false;
  }

  /**
   * 현재 환경의 설정을 메인 페이지에 적용
   */
  // 비활성화된 버튼을 DOM에서 제거 후 복원할 수 있도록 저장
  const _removedElements = {};

  function applyFeatureSettings() {
    const currentPortEnv = getCurrentPortEnvironment();
    const backendEnv = ENV_MAP[currentPortEnv] || currentPortEnv;
    const settings = featureSettings[backendEnv] || DEFAULT_FEATURE_SETTINGS[backendEnv];

    console.log(`[FeatureSettings] 설정 적용 (${backendEnv}):`, settings);

    // 노드재구성 버튼 제거/복원
    _toggleFeatureElements(
      '#generateTreeBtn, [data-feature="nodeRestructure"]',
      'nodeRestructure',
      settings.enableNodeRestructure
    );

    // PPT 버튼 제거/복원
    _toggleFeatureElements(
      '.ppt-btn, #pptBtn, #pptNodeBtn, [data-feature="ppt"]',
      'ppt',
      settings.enablePpt
    );

    // PDF 버튼 제거/복원
    _toggleFeatureElements(
      '.pdf-btn, #pdfBtn, #pdfNodeBtn, [data-feature="pdf"]',
      'pdf',
      settings.enablePdf
    );

    // 전역 이벤트 발생 (다른 모듈에서 감지 가능)
    window.dispatchEvent(new CustomEvent('featureSettingsApplied', {
      detail: { env: backendEnv, settings }
    }));
  }

  /**
   * 기능 비활성화 시 DOM에서 요소 완전 제거, 활성화 시 복원
   */
  function _toggleFeatureElements(selector, featureKey, enabled) {
    if (enabled) {
      // 복원: 저장해둔 요소를 원래 위치에 되돌림
      const stored = _removedElements[featureKey];
      if (stored && stored.length > 0) {
        stored.forEach(({ element, parent, nextSibling }) => {
          if (parent && parent.isConnected) {
            if (nextSibling && nextSibling.isConnected) {
              parent.insertBefore(element, nextSibling);
            } else {
              parent.appendChild(element);
            }
          }
        });
        delete _removedElements[featureKey];
      }
    } else {
      // 제거: DOM에서 분리하고 위치 정보 저장
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0 && !_removedElements[featureKey]) {
        _removedElements[featureKey] = [];
        elements.forEach(el => {
          const parent = el.parentNode;
          const nextSibling = el.nextSibling;
          if (parent) {
            _removedElements[featureKey].push({ element: el, parent, nextSibling });
            parent.removeChild(el);
          }
        });
      }
    }
  }

  /**
   * 현재 서버 환경 반환 (NODE_ENV 기반)
   * 서버에서 받은 serverEnvironment 사용
   * @returns {string} 'local' | 'dev' | 'prod'
   */
  function getCurrentPortEnvironment() {
    // 서버 환경(backend 형식)을 프론트엔드 형식으로 변환
    return ENV_MAP_REVERSE[serverEnvironment] || 'local';
  }

  /**
   * 특정 환경의 기능 설정 가져오기
   * @param {string} env - 환경 ('local', 'dev', 'prod')
   * @returns {Object} 기능 설정
   */
  function getFeatureSettings(env) {
    if (env) {
      const backendEnv = ENV_MAP[env] || env;
      return featureSettings[backendEnv] || DEFAULT_FEATURE_SETTINGS[backendEnv];
    }
    const currentPortEnv = getCurrentPortEnvironment();
    const backendEnv = ENV_MAP[currentPortEnv] || currentPortEnv;
    return featureSettings[backendEnv];
  }

  /**
   * 특정 기능이 활성화되어 있는지 확인
   * @param {string} feature - 기능명 ('nodeRestructure', 'ppt', 'pdf')
   * @returns {boolean}
   */
  function isFeatureEnabled(feature) {
    const env = getCurrentPortEnvironment();
    const backendEnv = ENV_MAP[env] || env;
    const settings = featureSettings[backendEnv];

    if (feature === 'nodeRestructure') return settings.enableNodeRestructure;
    if (feature === 'ppt') return settings.enablePpt;
    if (feature === 'pdf') return settings.enablePdf;

    return true;
  }

  // 전역 함수 노출
  window.initFeatureSettings = initFeatureSettings;
  window.getFeatureSettings = getFeatureSettings;
  window.isFeatureEnabled = isFeatureEnabled;
  window.applyFeatureSettings = applyFeatureSettings;
  window.loadFeatureSettingsFromDB = loadFeatureSettingsFromDB;

  // DOMContentLoaded 시 자동 적용 (메인 페이지용)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async function() {
      await loadFeatureSettingsFromDB();
      applyFeatureSettings();
    });
  } else {
    // 이미 로드된 경우 즉시 실행
    loadFeatureSettingsFromDB().then(() => {
      applyFeatureSettings();
    });
  }

})();
