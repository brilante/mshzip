/**
 * Settings 레이어 팝업 모듈
 *
 * 설정 페이지를 레이어 팝업으로 표시하는 기능을 제공합니다.
 * - 설정 페이지 동적 로드
 * - 팝업 열기/닫기
 * - 스크립트 동적 로드
 *
 * @module settings-popup
 */
(function() {
  'use strict';

  /**
   * 스크립트를 동적으로 로드합니다.
   *
   * @param {string} src - 스크립트 URL
   * @param {boolean} forceReload - 강제 재로드 여부
   * @returns {Promise} 로드 완료 Promise
   */
  function loadScript(src, forceReload = false) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing && !forceReload) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  /**
   * 캐시 버스팅을 적용하여 스크립트를 새로 로드합니다.
   * 타임스탬프를 쿼리 파라미터로 추가하여 브라우저 캐시를 우회합니다.
   *
   * @param {string} src - 스크립트 URL
   * @returns {Promise} 로드 완료 Promise
   */
  function loadScriptFresh(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      // 캐시 버스팅: 타임스탬프 추가
      script.src = src + (src.includes('?') ? '&' : '?') + '_t=' + Date.now();
      script.onload = () => {
        console.log('[loadScriptFresh] Loaded:', src);
        resolve();
      };
      script.onerror = (err) => {
        console.error('[loadScriptFresh] Failed:', src, err);
        reject(err);
      };
      document.body.appendChild(script);
    });
  }

  /**
   * Settings 레이어 팝업을 표시합니다.
   *
   * settings.html을 동적으로 로드하고 필요한 스크립트들을 순차적으로 로드합니다.
   * 언어 파일도 현재 설정에 맞게 로드됩니다.
   *
   * @param {string} hash - 초기 표시할 메뉴 해시 (예: '#ai', '#payment')
   * @returns {Promise<void>}
   */
  async function showSettingsLayerPopup(hash = '') {
    const overlay = document.getElementById('settingsLayerOverlay');
    const popup = document.getElementById('settingsLayerPopup');
    const content = document.getElementById('settingsLayerContent');

    if (overlay && popup && content) {
      // 로딩 상태 표시 (테마에 맞는 색상 적용)
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const loadingColor = isDark ? '#888888' : '#666666';
      const loadingBg = isDark ? '#111111' : '#ffffff';
      content.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100%; font-size:18px; color:${loadingColor}; background:${loadingBg};">로딩 중...</div>`;
      overlay.style.display = 'block';
      popup.style.display = 'block';
      document.body.style.overflow = 'hidden';

      try {
        // settings.html 가져오기
        const response = await fetch('/settings.html', { cache: 'no-store' });
        const html = await response.text();

        // HTML 파싱
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 스타일시트 로드 (중복 방지)
        const styleLinks = doc.querySelectorAll('link[rel="stylesheet"]');
        styleLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (href && !document.querySelector(`link[href="${href}"]`)) {
            const newLink = document.createElement('link');
            newLink.rel = 'stylesheet';
            newLink.href = href;
            document.head.appendChild(newLink);
          }
        });

        // body 콘텐츠 삽입
        const bodyContent = doc.body.innerHTML;
        content.innerHTML = bodyContent;

        // data-icon 속성 → SVG 아이콘 변환
        if (window.mmInitDataIcons) {
          window.mmInitDataIcons();
        }

        // 초기화 플래그 리셋
        window.settingsInitialized = false;

        // 현재 언어 설정 가져오기
        const settings = JSON.parse(localStorage.getItem('mymind3_settings') || '{}');
        const currentLang = settings.appLanguage || 'ko';

        // 언어 파일 로드 함수 정의 (없는 경우)
        if (!window.loadLanguageFile) {
          window.loadLanguageFile = function(lang) {
            return new Promise((resolve, reject) => {
              const langVarName = lang.replace(/-/g, '');
              if (window[`i18n_${langVarName}`]) {
                resolve();
                return;
              }
              const script = document.createElement('script');
              script.src = `/js/i18n/${lang}.js`;
              script.onload = () => resolve();
              script.onerror = () => reject(new Error(`Failed to load ${lang}.js`));
              document.head.appendChild(script);
            });
          };
        }

        // 언어 파일 로드
        await window.loadLanguageFile(currentLang);
        if (currentLang !== 'en') {
          await window.loadLanguageFile('en');
        }
        console.log(`[Settings Popup] Language loaded: ${currentLang}`);

        // Settings 관련 스크립트 로드 순서
        const settingsScriptOrder = [
          'settings-core.js',
          'settings-env.js',
          'settings-payment.js',
          'settings-ai.js',
          'settings-drive.js',
          'settings-feature.js',
          'settings-2fa.js',
          'settings-admin.js',
          'settings-tools.js',
          'settings-board-admin.js',
          'settings-board.js',
          'settings-access-keys.js',
          'settings.js'
        ];

        // 스크립트 재로드 필요 여부 확인
        const needsReload = typeof window.initSettingsPayment !== 'function';
        console.log('[Settings Popup] needsReload:', needsReload);

        if (needsReload) {
          // 스크립트 순차 로드 (직접 경로 사용)
          for (const scriptName of settingsScriptOrder) {
            const src = `/js/${scriptName}`;
            // 기존 스크립트 제거
            const existingScripts = document.querySelectorAll(`script[src*="${scriptName}"]`);
            existingScripts.forEach(s => s.remove());
            // 새로 로드
            await loadScriptFresh(src);
            console.log(`[Settings Popup] Loaded: ${scriptName}`);
          }
          // 스크립트 초기화 대기
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        console.log('[Settings Popup] initSettings:', typeof window.initSettings);
        console.log('[Settings Popup] initSettingsEventListeners:', typeof window.initSettingsEventListeners);

        // 네비게이션 아이템 이벤트 리스너 설정
        const navItems = content.querySelectorAll('.nav-item');
        navItems.forEach(item => {
          item.addEventListener('click', function(event) {
            const clickedItem = event.currentTarget;
            const menuName = clickedItem.getAttribute('data-menu');
            if (!menuName) return;

            // 환경 선택기 표시/숨김 업데이트
            if (window.SettingsEnv && typeof window.SettingsEnv.setCurrentMenu === 'function') {
              window.SettingsEnv.setCurrentMenu(menuName);
            }

            // 모든 nav-item에서 active 제거
            content.querySelectorAll('.nav-item').forEach(ni => ni.classList.remove('active'));
            clickedItem.classList.add('active');

            // 모든 content-section에서 active 제거
            content.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
            const targetSection = content.querySelector(`#content-${menuName}`);
            if (targetSection) {
              targetSection.classList.add('active');
            }

            // 탭 전환 시 데이터 초기화 (settings-core.js handleMenuClick과 동일)
            if (menuName === 'ai-model-admin' && typeof window.initAIModelAdmin === 'function') {
              window.initAIModelAdmin();
            } else if (menuName === 'payment' && typeof window.initSettingsPayment === 'function') {
              window.initSettingsPayment();
            } else if (menuName === 'ai' && typeof window.initSettingsAI === 'function') {
              window.initSettingsAI();
            } else if (menuName === 'model-sync-logs' && typeof window.initModelSyncLogs === 'function') {
              window.initModelSyncLogs();
            } else if (menuName === 'security' && typeof window.loadTwoFactorStatus === 'function') {
              window.loadTwoFactorStatus();
            } else if (menuName === 'agent-skills') {
              if (typeof window.reloadTodoNodeId === 'function') window.reloadTodoNodeId();
              if (typeof window.reloadAccessKeys === 'function') window.reloadAccessKeys();
            }
          });
        });
        console.log('[Settings Popup] nav-item 이벤트 리스너 설정 완료:', navItems.length);

        // Settings 초기화 함수 호출
        if (typeof window.initSettingsAll === 'function') {
          await window.initSettingsAll();
        } else if (typeof window.initSettings === 'function') {
          window.initSettings();
        }

        // 해시가 있으면 해당 메뉴로 이동
        if (hash) {
          let menuName = hash.replace('#', '');

          // 하위 섹션 매핑: drive → account 탭 내부
          const subSectionMap = { drive: 'account', backup: 'account' };
          const parentMenu = subSectionMap[menuName];
          if (parentMenu) {
            const parentItem = content.querySelector(`[data-menu="${parentMenu}"]`);
            if (parentItem) {
              parentItem.click();
              // 하위 섹션으로 스크롤
              setTimeout(() => {
                const section = content.querySelector(`#driveSettingsDetail, [id*="${menuName}"]`);
                if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 300);
            }
          } else {
            const menuItem = content.querySelector(`[data-menu="${menuName}"]`);
            if (menuItem) {
              menuItem.click();
            }
          }
        }

        // 테마 적용 (콘텐츠 로드 후 즉시 적용)
        if (window.ThemeManager && typeof window.ThemeManager.applySettingsDarkMode === 'function') {
          window.ThemeManager.applySettingsDarkMode();
          // 약간의 지연 후 다시 적용 (동적 콘텐츠용)
          setTimeout(() => window.ThemeManager.applySettingsDarkMode(), 100);
          setTimeout(() => window.ThemeManager.applySettingsDarkMode(), 300);
        }
        console.log('[Settings Popup] 테마 적용 완료');
      } catch (error) {
        console.error('Settings 로드 실패:', error);
        content.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; font-size:18px; color:#f44336;">' + (window.t ? window.t('settingsLoadFail', 'Settings 로드에 실패했습니다.') : 'Settings 로드에 실패했습니다.') + '</div>';
      }
    }
  }

  /**
   * Settings 레이어 팝업을 닫습니다.
   *
   * 팝업을 숨기고 콘텐츠를 초기화합니다.
   * AI API 키 재로드 및 사용자 표시 업데이트를 수행합니다.
   */
  function hideSettingsLayerPopup() {
    const overlay = document.getElementById('settingsLayerOverlay');
    const popup = document.getElementById('settingsLayerPopup');
    const content = document.getElementById('settingsLayerContent');

    if (overlay && popup && content) {
      overlay.style.display = 'none';
      popup.style.display = 'none';
      content.innerHTML = '';
      document.body.style.overflow = '';

      // AI API 키 재로드 (설정 변경 반영)
      if (window.MyMindAI && window.MyMindAI.reloadApiKeys) {
        window.MyMindAI.reloadApiKeys();
      }

      // 사용자 정보 표시 업데이트
      if (typeof updateUserDisplay === 'function') {
        updateUserDisplay();
      }
    }
  }

  /**
   * Settings 레이어 팝업의 이벤트 리스너를 설정합니다.
   *
   * - 오버레이 클릭 시 닫기
   * - 닫기 버튼 클릭 시 닫기
   * - ESC 키 입력 시 닫기
   */
  function setupSettingsLayerPopup() {
    const overlay = document.getElementById('settingsLayerOverlay');
    const closeBtn = document.getElementById('settingsLayerCloseBtn');

    // 오버레이 클릭 시 닫기
    if (overlay) {
      overlay.addEventListener('click', hideSettingsLayerPopup);
    }

    // 닫기 버튼 클릭 시 닫기
    if (closeBtn) {
      closeBtn.addEventListener('click', hideSettingsLayerPopup);
    }

    // ESC 키로 닫기
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const popup = document.getElementById('settingsLayerPopup');
        if (popup && popup.style.display === 'block') {
          hideSettingsLayerPopup();
        }
      }
    });
  }

  // 전역 객체에 함수 노출
  window.showSettingsLayerPopup = showSettingsLayerPopup;
  window.hideSettingsLayerPopup = hideSettingsLayerPopup;
  window.setupSettingsLayerPopup = setupSettingsLayerPopup;
  window.loadScript = loadScript;
  window.loadScriptFresh = loadScriptFresh;

  // 드라이브 연결 후 리다이렉트 감지 → 설정 팝업 자동 열기
  // OAuth 콜백이 /app?drive=connected&migrationJobId=X → /?drive=connected&migrationJobId=X 로 도달
  // settings-drive.js가 팝업 내에서 로드되면 URL 파라미터를 감지하여 AutoMigrationModal 표시
  const _urlParams = new URLSearchParams(window.location.search);
  if (_urlParams.get('drive') === 'connected' || _urlParams.get('drive') === 'error') {
    // DOM 로드 후 설정 팝업 자동 열기 (drive 탭)
    const openDriveSettings = () => {
      console.log('[Settings Popup] 드라이브 연결 감지 → 설정 팝업 자동 열기');
      showSettingsLayerPopup('#drive');
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(openDriveSettings, 500));
    } else {
      setTimeout(openDriveSettings, 500);
    }
  }

  console.log('[Module] settings-popup.js loaded');
})();
