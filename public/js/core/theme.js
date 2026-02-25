/**
 * Theme Manager
 * exactly.ai style - Monochromatic minimal
 * Created: 2025-12-18
 */

const ThemeManager = {
  STORAGE_KEY: 'mymind3-theme',

  /**
   * 테마 초기화
   */
  init() {
    // 저장된 테마 또는 시스템 설정에 따라 초기화
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');

    // 즉시 로컬 테마 적용 (DB 저장 스킵)
    this.setTheme(theme, true);
    this.bindEvents();
    this.watchSystemTheme();
    this.watchEditorChanges();
    this.watchSettingsPopup();

    // DB에서 사용자 설정 로드 (비동기)
    this.loadThemeFromDb();

    console.log(`[ThemeManager] 초기화 완료 - 현재 테마: ${theme}`);
  },

  /**
   * DB에서 테마 설정 로드
   */
  async loadThemeFromDb() {
    try {
      const response = await fetch('/api/user/settings', {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.theme) {
          // source가 'default'이면 사용자가 아직 DB에 저장한 적 없음 → localStorage 우선
          if (result.source === 'default') {
            console.log('[ThemeManager] DB에 저장된 테마 없음 → localStorage 유지');
            return;
          }

          const dbTheme = result.data.theme;
          const currentTheme = this.getTheme();

          // DB에 실제 저장된 테마가 현재 테마와 다르면 DB 테마로 변경
          if (dbTheme !== currentTheme) {
            console.log(`[ThemeManager] DB 테마로 동기화: ${currentTheme} → ${dbTheme}`);
            this.setTheme(dbTheme, true); // DB 저장 스킵 (이미 DB에 있음)
          }
        }
      }
    } catch (error) {
      // 로그인 안 된 상태 등에서 실패할 수 있음 - 무시
      console.log('[ThemeManager] DB 테마 로드 스킵 (미로그인 또는 오류)');
    }
  },

  /**
   * 에디터 DOM 변경 감지 및 다크모드 재적용
   */
  watchEditorChanges() {
    const currentTheme = () => document.documentElement.getAttribute('data-theme');

    // 프리뷰 콘텐츠에 다크모드 직접 적용
    const applyPreviewDarkMode = () => {
      if (currentTheme() !== 'dark') return;

      const previewContents = document.querySelectorAll('.toastui-editor-md-preview .toastui-editor-contents');
      previewContents.forEach(el => {
        el.style.setProperty('background-color', '#000000', 'important');
        el.style.setProperty('color', '#ffffff', 'important');
      });

      const previews = document.querySelectorAll('.toastui-editor-md-preview');
      previews.forEach(el => {
        el.style.setProperty('background-color', '#000000', 'important');
        el.style.setProperty('color', '#ffffff', 'important');
      });
    };

    // MutationObserver로 에디터 콘텐츠 변경 감지
    const observer = new MutationObserver((mutations) => {
      let shouldApply = false;
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' || mutation.type === 'subtree') {
          const target = mutation.target;
          if (target.classList && (
            target.classList.contains('toastui-editor-contents') ||
            target.classList.contains('toastui-editor-md-preview') ||
            target.closest('.toastui-editor-md-preview')
          )) {
            shouldApply = true;
          }
        }
      });
      if (shouldApply) {
        requestAnimationFrame(applyPreviewDarkMode);
      }
    });

    // 에디터 영역 감시 시작
    const startObserving = () => {
      const editorContainer = document.querySelector('.toastui-editor-defaultUI');
      if (editorContainer) {
        observer.observe(editorContainer, {
          childList: true,
          subtree: true,
          attributes: false
        });
        console.log('[ThemeManager] 에디터 DOM 변경 감시 시작');
      }
    };

    // 프리뷰 탭 클릭 이벤트 감지
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target.id === 'customTabPreview' ||
          target.classList.contains('tab-item') ||
          target.closest('#customTabPreview') ||
          target.closest('.tab-item')) {
        setTimeout(applyPreviewDarkMode, 100);
        setTimeout(applyPreviewDarkMode, 300);
        setTimeout(applyPreviewDarkMode, 500);
      }
    });

    // 노드 선택 이벤트 감지
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target.closest('.mindmap-node')) {
        setTimeout(applyPreviewDarkMode, 500);
        setTimeout(applyPreviewDarkMode, 1000);
        setTimeout(applyPreviewDarkMode, 2000);
      }
    });

    // DOM 로드 완료 후 감시 시작
    if (document.readyState === 'complete') {
      startObserving();
      applyPreviewDarkMode();
    } else {
      window.addEventListener('load', () => {
        startObserving();
        applyPreviewDarkMode();
      });
    }

    // 주기적으로 다크모드 확인 및 적용 (폴백)
    setInterval(applyPreviewDarkMode, 2000);
  },

  /**
   * 테마 설정
   * @param {string} theme - 'light' 또는 'dark'
   * @param {boolean} skipDbSave - DB 저장 스킵 여부 (Settings에서 호출 시 중복 저장 방지)
   */
  setTheme(theme, skipDbSave = false) {
    // 테마 값 화이트리스트 검증
    if (!['dark', 'light'].includes(theme)) {
      console.warn(`[ThemeManager] 유효하지 않은 테마: ${theme}`);
      theme = 'light';
    }

    // data-theme 속성 설정 (기존 CSS 호환)
    document.documentElement.setAttribute('data-theme', theme);

    // Tailwind CSS dark 클래스 토글 (Phase 8)
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // localStorage에 저장
    localStorage.setItem(this.STORAGE_KEY, theme);

    // 토글 아이콘 업데이트
    this.updateToggleIcon(theme);

    // 메타 테마 색상 업데이트 (모바일 브라우저용)
    this.updateMetaThemeColor(theme);

    // 인라인 스타일 오버라이드 (다크모드 강제 적용)
    this.applyInlineStyleOverrides(theme);

    // Settings 팝업 테마 적용
    this.applySettingsDarkMode();

    // Settings 팝업의 appTheme 셀렉트 동기화
    this.syncSettingsThemeSelect(theme);

    // DB에 저장 (skipDbSave가 false일 때만)
    if (!skipDbSave) {
      this.saveThemeToDb(theme);
    }

    // 커스텀 이벤트 발생
    window.dispatchEvent(new CustomEvent('themechange', {
      detail: { theme }
    }));
  },

  /**
   * Settings 팝업의 테마 셀렉트 동기화
   * @param {string} theme - 현재 테마
   */
  syncSettingsThemeSelect(theme) {
    const appThemeSelect = document.getElementById('appTheme');
    if (appThemeSelect && appThemeSelect.value !== theme) {
      appThemeSelect.value = theme;
      console.log(`[ThemeManager] Settings 테마 셀렉트 동기화: ${theme}`);
    }
  },

  /**
   * 테마를 DB에 저장
   * @param {string} theme - 저장할 테마
   */
  async saveThemeToDb(theme) {
    try {
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({ theme: theme })
      });

      if (response.ok) {
        console.log(`[ThemeManager] DB에 테마 저장 완료: ${theme}`);

        // localStorage의 mymind3_settings도 동기화
        try {
          const savedSettings = localStorage.getItem('mymind3_settings');
          if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            settings.appTheme = theme;
            localStorage.setItem('mymind3_settings', JSON.stringify(settings));
          }
        } catch (e) {
          // localStorage 동기화 실패해도 무시
        }
      }
    } catch (error) {
      console.warn('[ThemeManager] DB 테마 저장 실패:', error);
    }
  },

  /**
   * 인라인 스타일 오버라이드 (다크모드용)
   * @param {string} theme - 현재 테마
   */
  applyInlineStyleOverrides(theme) {
    const isDark = theme === 'dark';

    // 다크모드 색상 정의
    const darkColors = {
      bgBase: '#000000',
      bgSurface: '#0a0a0a',
      bgElevated: '#111111',
      bgHover: '#1a1a1a',
      borderDefault: '#2a2a2a',
      textPrimary: '#ffffff',
      textSecondary: '#888888',
      accentSuccess: '#22c55e',
      accentError: '#ef4444'
    };

    // AI 서비스/모델 선택 드롭다운
    const selects = document.querySelectorAll('#aiServiceSelect, #gptModelSelect, #grokModelSelect, #claudeModelSelect, #geminiModelSelect, #localModelSelect');
    selects.forEach(el => {
      if (el) {
        el.style.backgroundColor = isDark ? darkColors.bgElevated : '#fff';
        el.style.borderColor = isDark ? darkColors.borderDefault : '#ddd';
        el.style.color = isDark ? darkColors.textPrimary : '#000';
      }
    });

    // 사용자/크레딧 표시
    const userDisplay = document.getElementById('currentUserDisplay');
    if (userDisplay) {
      userDisplay.style.backgroundColor = isDark ? darkColors.bgElevated : 'rgb(232, 245, 233)';
      userDisplay.style.borderColor = isDark ? darkColors.borderDefault : 'rgb(76, 175, 80)';
      userDisplay.style.color = isDark ? darkColors.textPrimary : '#000';
    }

    // 크레딧 부분
    const creditPart = document.getElementById('creditPart');
    if (creditPart) {
      creditPart.style.color = isDark ? darkColors.accentSuccess : '#2e7d32';
    }

    // 로그아웃 버튼 - 모노크롬
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.style.backgroundColor = 'transparent';
      logoutBtn.style.borderColor = isDark ? '#3a3a3a' : '#d2d2d7';
      logoutBtn.style.color = isDark ? '#888888' : '#86868b';
    }

    // 기타 메뉴 버튼
    const etcMenuBtn = document.querySelector('.etc-menu-btn');
    if (etcMenuBtn) {
      etcMenuBtn.style.backgroundColor = isDark ? darkColors.bgElevated : '#fff';
      etcMenuBtn.style.borderColor = isDark ? darkColors.borderDefault : '#ddd';
      etcMenuBtn.style.color = isDark ? darkColors.textPrimary : '#000';
    }

    // 광고 영역
    const adContainers = document.querySelectorAll('.ad-container, [class*="advertisement"]');
    adContainers.forEach(el => {
      if (el) {
        el.style.backgroundColor = isDark ? darkColors.bgSurface : '';
        el.style.color = isDark ? darkColors.textSecondary : '';
      }
    });

    // TOAST UI Editor - 즉시 적용 및 지연 적용
    const applyEditorDarkMode = () => {
      // 에디터 콘텐츠 영역
      const editorContents = document.querySelectorAll('.toastui-editor-contents, .ProseMirror, .toastui-editor-ww-container, .toastui-editor-md-container');
      editorContents.forEach(el => {
        if (el) {
          el.style.backgroundColor = isDark ? darkColors.bgBase : '#fff';
          el.style.color = isDark ? darkColors.textPrimary : '#000';
        }
      });

      // 에디터 래퍼
      const editorWrappers = document.querySelectorAll('.toastui-editor, .toastui-editor-defaultUI');
      editorWrappers.forEach(el => {
        if (el) {
          el.style.backgroundColor = isDark ? darkColors.bgBase : '#fff';
        }
      });

      // 에디터 툴바
      const editorToolbar = document.querySelectorAll('.toastui-editor-toolbar, .toastui-editor-defaultUI-toolbar');
      editorToolbar.forEach(el => {
        if (el) {
          el.style.backgroundColor = isDark ? darkColors.bgElevated : '#fff';
        }
      });

      // 에디터 모드 스위치 (탭 바)
      const modeSwitch = document.querySelectorAll('.toastui-editor-mode-switch');
      modeSwitch.forEach(el => {
        if (el) {
          el.style.backgroundColor = isDark ? darkColors.bgSurface : '#f5f5f5';
        }
      });

      // 탭 아이템 (모든 .tab-item 선택) - setProperty로 !important 적용
      const tabItems = document.querySelectorAll('.tab-item');
      tabItems.forEach(el => {
        if (el) {
          const isActive = el.classList.contains('active');
          el.style.setProperty('background-color', isDark ? (isActive ? '#1a1a1a' : '#111111') : (isActive ? '#fff' : '#f5f5f5'), 'important');
          el.style.setProperty('color', isDark ? (isActive ? '#ffffff' : '#888888') : '#000', 'important');
          el.style.setProperty('border', 'none', 'important');
          el.style.setProperty('border-bottom', isDark ? (isActive ? '2px solid #3b82f6' : '2px solid transparent') : '', 'important');
        }
      });

      // 탭 컨테이너 - setProperty로 !important 적용
      const tabContainers = document.querySelectorAll('.toastui-editor-md-tab-container');
      tabContainers.forEach(el => {
        if (el) {
          el.style.setProperty('background-color', isDark ? '#0a0a0a' : '#fff', 'important');
          el.style.setProperty('border-bottom', isDark ? '1px solid #2a2a2a' : '', 'important');
        }
      });

      // 테이블 다크모드 적용
      const tables = document.querySelectorAll('.toastui-editor-contents table, .toastui-editor-md-preview table');
      tables.forEach(table => {
        if (table) {
          table.style.backgroundColor = isDark ? darkColors.bgSurface : '#fff';
          table.style.borderColor = isDark ? darkColors.borderDefault : '#ddd';
          table.style.color = isDark ? darkColors.textPrimary : '#000';
        }
      });

      // 테이블 헤더 (th) 다크모드 적용
      const ths = document.querySelectorAll('.toastui-editor-contents th, .toastui-editor-md-preview th');
      ths.forEach(th => {
        if (th) {
          th.style.backgroundColor = isDark ? darkColors.bgElevated : '#f5f5f5';
          th.style.borderColor = isDark ? darkColors.borderDefault : '#ddd';
          th.style.color = isDark ? darkColors.textPrimary : '#000';
        }
      });

      // 테이블 셀 (td) 다크모드 적용
      const tds = document.querySelectorAll('.toastui-editor-contents td, .toastui-editor-md-preview td');
      tds.forEach(td => {
        if (td) {
          td.style.backgroundColor = isDark ? darkColors.bgBase : '#fff';
          td.style.borderColor = isDark ? darkColors.borderDefault : '#ddd';
          td.style.color = isDark ? darkColors.textPrimary : '#000';
        }
      });

      // 프리뷰 영역 다크모드
      const previews = document.querySelectorAll('.toastui-editor-md-preview, .toastui-editor-md-preview-highlight');
      previews.forEach(preview => {
        if (preview) {
          preview.style.setProperty('background-color', isDark ? darkColors.bgBase : '#fff', 'important');
          preview.style.setProperty('color', isDark ? darkColors.textPrimary : '#000', 'important');

          // 프리뷰 내부 콘텐츠 영역
          const innerContents = preview.querySelectorAll('.toastui-editor-contents');
          innerContents.forEach(content => {
            content.style.setProperty('background-color', isDark ? darkColors.bgBase : '#fff', 'important');
            content.style.setProperty('color', isDark ? darkColors.textPrimary : '#333', 'important');
          });
        }
      });

      // 모든 .toastui-editor-contents에 다크모드 적용
      const allContents = document.querySelectorAll('.toastui-editor-contents');
      allContents.forEach(content => {
        content.style.setProperty('background-color', isDark ? darkColors.bgBase : '#fff', 'important');
        content.style.setProperty('color', isDark ? darkColors.textPrimary : '#333', 'important');
      });

      // 커스텀 프리뷰 컨테이너 다크모드 적용 (노드 내용 > 프리뷰)
      const customPreviewContainers = document.querySelectorAll('.custom-preview-container');
      customPreviewContainers.forEach(container => {
        if (container) {
          container.style.setProperty('background-color', isDark ? darkColors.bgBase : '#fff', 'important');
          container.style.setProperty('color', isDark ? darkColors.textPrimary : '#333', 'important');
        }
      });

      // 커스텀 에디터/프리뷰 탭 버튼
      const customTabBtns = document.querySelectorAll('.custom-tab-btn, #customTabWrite, #customTabPreview');
      customTabBtns.forEach(btn => {
        if (btn) {
          const isActive = btn.classList.contains('active');
          btn.style.setProperty('background-color', isDark ? (isActive ? '#1a1a1a' : '#111111') : (isActive ? '#fff' : '#f8f9fa'), 'important');
          btn.style.setProperty('color', isDark ? (isActive ? '#ffffff' : '#888888') : '#000', 'important');
          btn.style.setProperty('border', 'none', 'important');
          btn.style.setProperty('border-bottom', isDark ? (isActive ? '2px solid #3b82f6' : '2px solid transparent') : '', 'important');
        }
      });

      // 커스텀 탭 컨테이너 (부모 요소)
      const customTabWrite = document.getElementById('customTabWrite');
      if (customTabWrite && customTabWrite.parentElement) {
        customTabWrite.parentElement.style.setProperty('background-color', isDark ? '#0a0a0a' : '#f8f9fa', 'important');
      }
    };

    // 즉시 적용
    applyEditorDarkMode();
    // 지연 적용 (에디터 렌더링 후)
    setTimeout(applyEditorDarkMode, 100);
    setTimeout(applyEditorDarkMode, 500);

    // 폴더 불러오기/저장 팝업
    const loadFolderPopup = document.getElementById('loadFolderPopup');
    if (loadFolderPopup) {
      loadFolderPopup.style.backgroundColor = isDark ? darkColors.bgElevated : '#fff';
      loadFolderPopup.style.color = isDark ? darkColors.textPrimary : '#000';
      loadFolderPopup.style.borderColor = isDark ? darkColors.borderDefault : 'transparent';
    }

    const loadFolderCloseBtn = document.getElementById('loadFolderPopupCloseBtn');
    if (loadFolderCloseBtn) {
      loadFolderCloseBtn.style.color = isDark ? darkColors.textSecondary : '#000';
    }

    const loadFolderCancelBtn = document.getElementById('loadFolderCancelBtn');
    if (loadFolderCancelBtn) {
      loadFolderCancelBtn.style.backgroundColor = isDark ? darkColors.bgElevated : '#ccc';
      loadFolderCancelBtn.style.color = isDark ? darkColors.textPrimary : '#000';
      loadFolderCancelBtn.style.borderColor = isDark ? darkColors.borderDefault : 'transparent';
    }

    const loadFolderList = document.getElementById('loadFolderList');
    if (loadFolderList) {
      loadFolderList.style.color = isDark ? darkColors.textPrimary : '#000';
    }

    // 팝업 내 제목
    const loadFolderTitle = loadFolderPopup?.querySelector('[data-i18n="loadFolderTitle"]');
    if (loadFolderTitle) {
      loadFolderTitle.style.color = isDark ? darkColors.textPrimary : '#000';
    }

    // 다시읽기 버튼 (취소 버튼과 동일 스타일)
    const refreshBtn = document.getElementById('loadFolderRefreshBtn');
    if (refreshBtn) {
      refreshBtn.style.backgroundColor = isDark ? darkColors.bgElevated : '#ccc';
      refreshBtn.style.color = isDark ? darkColors.textPrimary : '#000';
      refreshBtn.style.borderColor = isDark ? darkColors.borderDefault : 'transparent';
    }

    // 저장 팝업도 동일하게 처리
    const saveFolderPopup = document.getElementById('saveFolderPopup');
    if (saveFolderPopup) {
      saveFolderPopup.style.backgroundColor = isDark ? darkColors.bgElevated : '#fff';
      saveFolderPopup.style.color = isDark ? darkColors.textPrimary : '#000';
    }

    // 로그인 팝업
    const loginPopup = document.getElementById('loginPopup');
    if (loginPopup) {
      loginPopup.style.backgroundColor = isDark ? darkColors.bgElevated : '#fff';
      loginPopup.style.color = isDark ? darkColors.textPrimary : '#000';
    }

    console.log(`[ThemeManager] 인라인 스타일 오버라이드 적용: ${theme}`);
  },

  /**
   * 토글 버튼 아이콘 업데이트
   * @param {string} theme - 현재 테마
   */
  updateToggleIcon(theme) {
    const icon = document.querySelector('.theme-icon');
    if (icon) {
      // 다크 모드: 해(sun) - 라이트 모드로 전환, 라이트 모드: 달(moon) - 다크 모드로 전환
      icon.innerHTML = theme === 'dark' ? mmIcon('sun', 14) : mmIcon('moon', 14);
    }

    // 버튼 타이틀 업데이트
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.title = theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환';
    }
  },

  /**
   * 메타 테마 색상 업데이트
   * @param {string} theme - 현재 테마
   */
  updateMetaThemeColor(theme) {
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    metaTheme.content = theme === 'dark' ? '#000000' : '#ffffff';
  },

  /**
   * 테마 토글
   */
  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = current === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
    console.log(`[ThemeManager] 테마 전환: ${current} → ${newTheme}`);
  },

  /**
   * 현재 테마 반환
   * @returns {string} 'light' 또는 'dark'
   */
  getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  },

  /**
   * 다크 모드 여부 확인
   * @returns {boolean}
   */
  isDark() {
    // data-theme 속성 또는 Tailwind dark 클래스 확인
    return this.getTheme() === 'dark' ||
           document.documentElement.classList.contains('dark');
  },

  /**
   * 이벤트 바인딩
   */
  bindEvents() {
    // 토글 버튼 클릭 이벤트
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.addEventListener('click', () => this.toggle());
    }

    // 키보드 단축키 (Ctrl/Cmd + Shift + D)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggle();
      }
    });
  },

  /**
   * 시스템 테마 변경 감지
   */
  watchSystemTheme() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    mediaQuery.addEventListener('change', (e) => {
      // 사용자가 수동으로 테마를 설정하지 않은 경우에만 자동 변경
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) {
        this.setTheme(e.matches ? 'dark' : 'light');
        console.log(`[ThemeManager] 시스템 테마 변경 감지: ${e.matches ? 'dark' : 'light'}`);
      }
    });
  },

  /**
   * 저장된 테마 설정 삭제 (시스템 테마 따르기)
   */
  resetToSystemTheme() {
    localStorage.removeItem(this.STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.setTheme(prefersDark ? 'dark' : 'light');
    console.log('[ThemeManager] 시스템 테마로 리셋');
  },

  /**
   * Settings 팝업 테마 적용 (다크/라이트 모두 처리)
   */
  applySettingsDarkMode() {
    const theme = document.documentElement.getAttribute('data-theme');
    const isDark = theme === 'dark';

    // Settings 팝업 내부 select 요소들
    const selects = document.querySelectorAll('#settingsLayerContent select, .settings-container select');
    selects.forEach(select => {
      if (isDark) {
        select.style.setProperty('background-color', '#1a1a1a', 'important');
        select.style.setProperty('border-color', '#3a3a3a', 'important');
        select.style.setProperty('color', '#ffffff', 'important');
      } else {
        select.style.removeProperty('background-color');
        select.style.removeProperty('border-color');
        select.style.removeProperty('color');
      }
    });

    // 언어 선택 목록
    const langSelects = document.querySelectorAll('.language-select, #appLanguage');
    langSelects.forEach(select => {
      if (isDark) {
        select.style.setProperty('background-color', '#1a1a1a', 'important');
        select.style.setProperty('color', '#ffffff', 'important');
      } else {
        select.style.removeProperty('background-color');
        select.style.removeProperty('color');
      }
    });

    // 현재 선택 언어 표시
    const currentLangDisplays = document.querySelectorAll('.current-language-display');
    currentLangDisplays.forEach(el => {
      if (isDark) {
        el.style.setProperty('background', 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)', 'important');
        el.style.setProperty('border-color', '#3a3a3a', 'important');
      } else {
        el.style.removeProperty('background');
        el.style.removeProperty('border-color');
      }
    });

    const currentLangLabels = document.querySelectorAll('.current-language-label');
    currentLangLabels.forEach(el => {
      if (isDark) {
        el.style.setProperty('color', '#888888', 'important');
      } else {
        el.style.removeProperty('color');
      }
    });

    const currentLangTexts = document.querySelectorAll('.current-language-text');
    currentLangTexts.forEach(el => {
      if (isDark) {
        el.style.setProperty('color', '#ffffff', 'important');
      } else {
        el.style.removeProperty('color');
      }
    });

    // 언어 검색 입력
    const langSearchInputs = document.querySelectorAll('.language-search-input');
    langSearchInputs.forEach(el => {
      if (isDark) {
        el.style.setProperty('background-color', '#1a1a1a', 'important');
        el.style.setProperty('border-color', '#3a3a3a', 'important');
        el.style.setProperty('color', '#ffffff', 'important');
      } else {
        el.style.removeProperty('background-color');
        el.style.removeProperty('border-color');
        el.style.removeProperty('color');
      }
    });

    const langSearchBtns = document.querySelectorAll('.language-search-btn');
    langSearchBtns.forEach(el => {
      if (isDark) {
        el.style.setProperty('background-color', '#2a2a2a', 'important');
        el.style.setProperty('border-color', '#3a3a3a', 'important');
        el.style.setProperty('color', '#ffffff', 'important');
      } else {
        el.style.removeProperty('background-color');
        el.style.removeProperty('border-color');
        el.style.removeProperty('color');
      }
    });

    // 설정 그룹 카드들
    const settingGroups = document.querySelectorAll('.setting-group');
    settingGroups.forEach(group => {
      if (isDark) {
        group.style.setProperty('background-color', '#111111', 'important');
        group.style.setProperty('border-color', '#2a2a2a', 'important');
      } else {
        group.style.removeProperty('background-color');
        group.style.removeProperty('border-color');
      }
    });

    // 디버그 로그 제거 (무한 루프 방지를 위해 로그 빈도 감소)
  },

  /**
   * Settings 팝업 다크모드 감시 시작
   */
  watchSettingsPopup() {
    // 중복 호출 방지용 플래그
    let isApplying = false;
    let pendingTimeout = null;

    const debouncedApply = () => {
      if (isApplying) return;
      if (pendingTimeout) clearTimeout(pendingTimeout);

      pendingTimeout = setTimeout(() => {
        isApplying = true;
        this.applySettingsDarkMode();
        // 500ms 후에 플래그 해제
        setTimeout(() => { isApplying = false; }, 500);
      }, 100);
    };

    // Settings 팝업이 열릴 때 다크모드 적용
    const observer = new MutationObserver((mutations) => {
      // 스타일 변경은 무시 (무한 루프 방지)
      const hasRelevantChange = mutations.some(mutation => {
        if (mutation.type !== 'childList') return false;
        // 새로운 요소가 추가된 경우만 처리
        return mutation.addedNodes.length > 0;
      });

      if (hasRelevantChange) {
        const settingsContent = document.getElementById('settingsLayerContent');
        if (settingsContent && settingsContent.children.length > 0) {
          debouncedApply();
        }
      }
    });

    const settingsContent = document.getElementById('settingsLayerContent');
    if (settingsContent) {
      // subtree: false로 변경하여 직계 자식만 감시
      observer.observe(settingsContent, { childList: true, subtree: false });
    }

    // 팝업 표시 시에도 적용
    const settingsPopup = document.getElementById('settingsLayerPopup');
    if (settingsPopup) {
      const displayObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
            const display = window.getComputedStyle(settingsPopup).display;
            if (display !== 'none') {
              debouncedApply();
            }
          }
        });
      });
      displayObserver.observe(settingsPopup, { attributes: true });
    }

    console.log('[ThemeManager] Settings 팝업 감시 시작');
  }
};

// 자동 초기화 (DOM 로드 완료 시)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
  // 이미 DOM이 로드된 경우 즉시 실행
  ThemeManager.init();
}

// 전역 객체로 노출
window.ThemeManager = ThemeManager;
