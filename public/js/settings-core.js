/* Settings Core JavaScript - MyMind3 */
/* 기본 설정, 언어, UI, 테마 관리 모듈 */

/**
 * 중요: settings.html 직접 접근 금지!
 *
 * 이 스크립트는 index.html에서 레이어 팝업으로 settings.html을 로드한 후
 * initSettingsAll() 함수가 호출되어야만 정상 작동합니다.
 *
 * 직접 URL 접근 (예: http://localhost:{PORT}/settings.html) 시:
 * - initSettingsAll()이 호출되지 않음
 * - 버튼 이벤트 리스너가 등록되지 않음
 * - 구독 버튼, 크레딧 구매 버튼 등이 작동하지 않음
 *
 * 올바른 접근 방법:
 * 1. index.html 접속 (http://localhost:{PORT}/)
 * 2. 설정 버튼 클릭 → Settings 레이어 팝업 표시
 * 3. 팝업에서 initSettingsAll() 자동 호출
 *
 * @see public/index.html - openSettingsPopup() 함수
 * @see CLAUDE.md - Settings 페이지 접근 방법
 */

(function () {
  'use strict';

  /**
   * 브라우저 언어 감지
   * @returns {string} 브라우저 언어 코드
   */
  function detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage || 'ko';

    // 브라우저 언어 코드를 우리가 지원하는 언어 코드로 매핑
    const langCode = browserLang.split('-')[0].toLowerCase();
    const fullLangCode = browserLang.toLowerCase();

    // 정확히 일치하는 언어가 있는지 확인 (예: zh-CN, zh-TW)
    const exactMatch = LANGUAGES.find(lang => lang.code.toLowerCase() === fullLangCode);
    if (exactMatch) {
      return exactMatch.code;
    }

    // 기본 언어 코드로 일치하는 언어 확인 (예: zh -> zh-CN)
    const partialMatch = LANGUAGES.find(lang => lang.code.toLowerCase().startsWith(langCode));
    if (partialMatch) {
      return partialMatch.code;
    }

    // 찾지 못하면 한국어 기본값
    return 'ko';
  }

  // 기본 설정값 (브라우저 언어 감지를 위해 아래에서 설정)
  let DEFAULT_SETTINGS;

  // 글로벌 언어 목록 (사용량 기반 정렬, 한국어 최상위) - 100+ 언어 지원
  // 정렬: 한국어 최상위 → usage 내림차순 → 같은 usage 내 알파벳 순
  const LANGUAGES = [
    // usage 10 - 상위 10개 언어 (JS 파일 생성 완료)
    { code: 'ko', name: 'Korean', nativeName: '한국어', usage: 10 },
    { code: 'en', name: 'English', nativeName: 'English', usage: 10 },
    { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', usage: 10 },
    { code: 'es', name: 'Spanish', nativeName: 'Español', usage: 10 },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', usage: 10 },
    { code: 'de', name: 'German', nativeName: 'Deutsch', usage: 10 },
    { code: 'fr', name: 'French', nativeName: 'Français', usage: 10 },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', usage: 10 },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', usage: 10 },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', usage: 10 },

    // usage 9 - 주요 글로벌 언어 (10억명+ 사용자)
    { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', usage: 9 },

    // usage 8 - 주요 국제 언어 (5억명+)
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', usage: 8 },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', usage: 8 },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', usage: 8 },

    // usage 7 - 주요 언어 (1억명+)
    { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', usage: 7 },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', usage: 7 },

    // usage 6 - 중요 언어 (5천만명+)
    { code: 'my', name: 'Burmese', nativeName: 'မြန်မာဘာသာ', usage: 6 },
    { code: 'fil', name: 'Filipino', nativeName: 'Filipino', usage: 6 },
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', usage: 6 },
    { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', usage: 6 },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी', usage: 6 },
    { code: 'fa', name: 'Persian', nativeName: 'فارسی', usage: 6 },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', usage: 6 },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', usage: 6 },
    { code: 'th', name: 'Thai', nativeName: 'ไทย', usage: 6 },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', usage: 6 },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو', usage: 6 },
    { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', usage: 6 },

    // usage 5 - 지역 주요 언어 (1천만명+)
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', usage: 5 },
    { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', usage: 5 },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', usage: 5 },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', usage: 5 },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', usage: 5 },
    { code: 'pl', name: 'Polish', nativeName: 'Polski', usage: 5 },
    { code: 'ro', name: 'Romanian', nativeName: 'Română', usage: 5 },
    { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', usage: 5 },
    { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', usage: 5 },

    // usage 4 - 지역 언어 (백만명+)
    { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', usage: 4 },
    { code: 'hy', name: 'Armenian', nativeName: 'Հdelays', usage: 4 },
    { code: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycan', usage: 4 },
    { code: 'bg', name: 'Bulgarian', nativeName: 'Български', usage: 4 },
    { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano', usage: 4 },
    { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', usage: 4 },
    { code: 'cs', name: 'Czech', nativeName: 'Čeština', usage: 4 },
    { code: 'da', name: 'Danish', nativeName: 'Dansk', usage: 4 },
    { code: 'fi', name: 'Finnish', nativeName: 'Suomi', usage: 4 },
    { code: 'ka', name: 'Georgian', nativeName: 'ქართული', usage: 4 },
    { code: 'ha', name: 'Hausa', nativeName: 'Hausa', usage: 4 },
    { code: 'he', name: 'Hebrew', nativeName: 'עברית', usage: 4 },
    { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', usage: 4 },
    { code: 'kk', name: 'Kazakh', nativeName: 'Қазақша', usage: 4 },
    { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', usage: 4 },
    { code: 'ku', name: 'Kurdish', nativeName: 'Kurdî', usage: 4 },
    { code: 'lo', name: 'Lao', nativeName: 'ລາວ', usage: 4 },
    { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', usage: 4 },
    { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', usage: 4 },
    { code: 'no', name: 'Norwegian', nativeName: 'Norsk', usage: 4 },
    { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', usage: 4 },
    { code: 'sr', name: 'Serbian', nativeName: 'Српски', usage: 4 },
    { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', usage: 4 },
    { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', usage: 4 },
    { code: 'su', name: 'Sundanese', nativeName: 'Basa Sunda', usage: 4 },
    { code: 'sv', name: 'Swedish', nativeName: 'Svenska', usage: 4 },
    { code: 'uz', name: 'Uzbek', nativeName: 'Oʻzbekcha', usage: 4 },
    { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', usage: 4 },

    // usage 3 - 소수 언어
    { code: 'af', name: 'Afrikaans', nativeName: 'Afrikaans', usage: 3 },
    { code: 'sq', name: 'Albanian', nativeName: 'Shqip', usage: 3 },
    { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', usage: 3 },
    { code: 'ay', name: 'Aymara', nativeName: 'Aymar aru', usage: 3 },
    { code: 'eu', name: 'Basque', nativeName: 'Euskara', usage: 3 },
    { code: 'be', name: 'Belarusian', nativeName: 'Беларуская', usage: 3 },
    { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', usage: 3 },
    { code: 'ca', name: 'Catalan', nativeName: 'Català', usage: 3 },
    { code: 'et', name: 'Estonian', nativeName: 'Eesti', usage: 3 },
    { code: 'gl', name: 'Galician', nativeName: 'Galego', usage: 3 },
    { code: 'gn', name: 'Guarani', nativeName: 'Avañe\'ẽ', usage: 3 },
    { code: 'hmn', name: 'Hmong', nativeName: 'Hmong', usage: 3 },
    { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', usage: 3 },
    { code: 'ig', name: 'Igbo', nativeName: 'Igbo', usage: 3 },
    { code: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча', usage: 3 },
    { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', usage: 3 },
    { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', usage: 3 },
    { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', usage: 3 },
    { code: 'mg', name: 'Malagasy', nativeName: 'Malagasy', usage: 3 },
    { code: 'mai', name: 'Maithili', nativeName: 'मैथिली', usage: 3 },
    { code: 'qu', name: 'Quechua', nativeName: 'Runasimi', usage: 3 },
    { code: 'sd', name: 'Sindhi', nativeName: 'سنڌي', usage: 3 },
    { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', usage: 3 },
    { code: 'so', name: 'Somali', nativeName: 'Soomaali', usage: 3 },
    { code: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', usage: 3 },
    { code: 'bo', name: 'Tibetan', nativeName: 'བོད་ཡིག', usage: 3 },
    { code: 'tk', name: 'Turkmen', nativeName: 'Türkmençe', usage: 3 },
    { code: 'ug', name: 'Uyghur', nativeName: 'ئۇيغۇرچە', usage: 3 },
    { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', usage: 3 },

    // usage 2 - 희소 언어
    { code: 'eo', name: 'Esperanto', nativeName: 'Esperanto', usage: 2 },
    { code: 'haw', name: 'Hawaiian', nativeName: 'ʻŌlelo Hawaiʻi', usage: 2 },
    { code: 'ga', name: 'Irish', nativeName: 'Gaeilge', usage: 2 },
    { code: 'la', name: 'Latin', nativeName: 'Latina', usage: 2 },
    { code: 'mt', name: 'Maltese', nativeName: 'Malti', usage: 2 },
    { code: 'mi', name: 'Maori', nativeName: 'Te Reo Māori', usage: 2 },
    { code: 'sm', name: 'Samoan', nativeName: 'Gagana Samoa', usage: 2 },
    { code: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', usage: 2 },
    { code: 'cy', name: 'Welsh', nativeName: 'Cymraeg', usage: 2 }
  ];

  // DEFAULT_SETTINGS 초기화 (브라우저 언어 감지 포함)
  DEFAULT_SETTINGS = {
    appTheme: 'light',
    autoSaveInterval: 30,
    defaultNodeExpanded: true,
    confirmDelete: true,
    agentSkillsEnabled: false,
    autoCreateEnabled: false,
    multiSelectEnabled: false,
    editorFontSize: '14',
    appLanguage: detectBrowserLanguage()
  };

  // 현재 설정값 (localStorage에서 로드)
  let currentSettings = { ...DEFAULT_SETTINGS };

  // 현재 표시 중인 언어 목록 (검색 필터용)
  let filteredLanguages = [...LANGUAGES];

  /**
   * 페이지 초기화
   */
  async function initializePage() {
    // 현재 사용자 표시
    displayCurrentUser();

    // 언어 목록 렌더링
    renderLanguageList();

    // 설정 값 로드 (DB + localStorage)
    await loadSettings();

    // 테마 적용 (저장된 설정 기반)
    applyTheme(currentSettings.appTheme || 'light');

    // 언어 적용
    applyLanguage();

    // 이벤트 리스너 등록
    setupEventListeners();

    // 크레딧 소멸 체크 (페이지 로드 시) - 두 번째 IIFE에서 정의된 함수
    // 함수가 존재하는 경우에만 호출 (두 번째 IIFE 로드 후)
    if (typeof window.checkAndExpireCredits === 'function') {
      window.checkAndExpireCredits();
    }
    if (typeof window.checkCreditExpirationWarning === 'function') {
      window.checkCreditExpirationWarning();
    }
  }

  /**
   * 현재 선택된 언어를 페이지에 적용
   */
  function applyLanguage() {
    const currentLang = currentSettings.appLanguage || 'ko';

    // ============================================
    // Phase 1-1: HTML lang 및 dir 속성 동적 변경
    // ============================================

    // HTML lang 속성 업데이트
    document.documentElement.setAttribute('lang', currentLang);

    // RTL (Right-to-Left) 언어 리스트
    const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];
    const isRTL = RTL_LANGUAGES.includes(currentLang);

    // HTML dir 속성 업데이트
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');

    console.log(`[MyMind3] Language: ${currentLang}, Direction: ${isRTL ? 'RTL' : 'LTR'}`);

    // ============================================

    // 언어 코드를 변수명으로 변환 (zh-CN -> zhCN)
    const langVarName = currentLang.replace(/-/g, '');
    let langObj = window[`i18n_${langVarName}`];

    // 언어 파일이 없으면 window.i18n 사용 (레이어 팝업에서 이미 설정됨)
    if (!langObj && window.i18n) {
      langObj = window.i18n;
      console.log(`[Settings] Using existing window.i18n for "${currentLang}"`);
    }

    // 언어 파일이 없으면 기본값(한국어) 사용
    if (!langObj) {
      console.warn(`Language file for "${currentLang}" not found. Using Korean as default.`);
      return;
    }

    // 현재 언어 객체를 window.i18n에 설정 (JavaScript에서 동적 텍스트 사용을 위해)
    window.i18n = langObj;

    // data-i18n 속성이 있는 모든 요소 찾기
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (langObj[key]) {
        // HTML 콘텐츠 지원 (예: <strong>1 year</strong>)
        el.innerHTML = langObj[key];
      }
    });

    // data-i18n-placeholder 속성 처리 (input placeholder)
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (langObj[key]) {
        el.placeholder = langObj[key];
      }
    });

    // data-i18n-title 속성 처리 (title 또는 data-tooltip 속성)
    const titleElements = document.querySelectorAll('[data-i18n-title]');
    titleElements.forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (langObj[key]) {
        // has-tooltip 클래스가 있으면 data-tooltip 사용 (CSS 커스텀 툴팁)
        // 그렇지 않으면 title 사용 (브라우저 기본 툴팁)
        if (el.classList.contains('has-tooltip')) {
          el.dataset.tooltip = langObj[key];
          // title 속성이 있으면 제거 (더블 툴팁 방지)
          if (el.hasAttribute('title')) {
            el.removeAttribute('title');
          }
        } else {
          el.title = langObj[key];
        }
      }
    });
  }

  /**
   * 현재 로그인한 사용자 표시
   */
  function displayCurrentUser() {
    const currentUserEl = document.getElementById('currentUser');
    const username = localStorage.getItem('username');

    if (username) {
      currentUserEl.innerHTML = mmIcon('user', 14) + ` ${username}`;
      currentUserEl.style.display = 'block';
    } else {
      currentUserEl.textContent = '';
      currentUserEl.style.display = 'none';
    }

    // 계정 섹션의 사용자 ID 및 이메일 표시
    loadAccountUserInfo();
  }

  /**
   * 계정 섹션에 사용자 정보 (ID, 이메일) 로드 및 표시
   */
  async function loadAccountUserInfo() {
    const accountUserIdEl = document.getElementById('accountUserId');
    const accountUserEmailEl = document.getElementById('accountUserEmail');

    // 요소가 없으면 리턴
    if (!accountUserIdEl && !accountUserEmailEl) {
      return;
    }

    try {
      // API에서 사용자 정보 가져오기
      const response = await fetch('/api/auth/user', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.user) {
          // 사용자 ID 표시
          if (accountUserIdEl) {
            accountUserIdEl.textContent = data.user.username || '-';
          }

          // 이메일 표시
          if (accountUserEmailEl) {
            accountUserEmailEl.textContent = data.user.email || '-';
          }

          console.log('[Settings] 사용자 정보 로드 완료:', data.user.username);
        } else {
          // 로그인하지 않은 경우
          if (accountUserIdEl) accountUserIdEl.textContent = '-';
          if (accountUserEmailEl) accountUserEmailEl.textContent = '-';
        }
      } else {
        // API 호출 실패 시 localStorage에서 가져오기 (fallback)
        const localUsername = localStorage.getItem('username');
        if (accountUserIdEl) {
          accountUserIdEl.textContent = localUsername || '-';
        }
        if (accountUserEmailEl) {
          accountUserEmailEl.textContent = '-';
        }
      }
    } catch (error) {
      console.error('[Settings] 사용자 정보 로드 실패:', error);

      // 에러 시 localStorage에서 가져오기 (fallback)
      const localUsername = localStorage.getItem('username');
      if (accountUserIdEl) {
        accountUserIdEl.textContent = localUsername || '-';
      }
      if (accountUserEmailEl) {
        accountUserEmailEl.textContent = '-';
      }
    }
  }

  /**
   * 이벤트 리스너 설정
   */
  function setupEventListeners() {
    // 메뉴 아이템 클릭
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', handleMenuClick);
    });

    // 자동 저장: 모든 입력 필드에 change 이벤트 추가
    const appTheme = document.getElementById('appTheme');
    const autoSaveInterval = document.getElementById('autoSaveInterval');
    const defaultNodeExpanded = document.getElementById('defaultNodeExpanded');
    const confirmDelete = document.getElementById('confirmDelete');
    const editorFontSize = document.getElementById('editorFontSize');
    const appLanguage = document.getElementById('appLanguage');

    if (appTheme) {
      appTheme.addEventListener('change', () => {
        autoSaveSettings();
        applyTheme(appTheme.value);
      });
    }
    if (autoSaveInterval) {
      // range slider의 실시간 값 표시 업데이트
      autoSaveInterval.addEventListener('input', updateAutoSaveIntervalDisplay);
      // 값 변경 완료 시 자동 저장
      autoSaveInterval.addEventListener('change', autoSaveSettings);
    }
    if (defaultNodeExpanded) {
      defaultNodeExpanded.addEventListener('change', autoSaveSettings);
    }
    if (confirmDelete) {
      confirmDelete.addEventListener('change', autoSaveSettings);
    }
    const agentSkillsEnabled = document.getElementById('agentSkillsEnabled');
    if (agentSkillsEnabled) {
      agentSkillsEnabled.addEventListener('change', () => {
        updateAgentSkillsMenuVisibility(agentSkillsEnabled.checked);
        autoSaveSettings();
      });
    }
    const settingsAutoCreate = document.getElementById('settingsAutoCreateEnabled');
    if (settingsAutoCreate) {
      settingsAutoCreate.addEventListener('change', () => {
        // 메인 페이지 체크박스도 즉시 동기화
        const mainCheckbox = document.getElementById('autoCreateNodeAI');
        if (mainCheckbox) mainCheckbox.checked = settingsAutoCreate.checked;
        autoSaveSettings();
      });
    }
    const settingsMultiSelect = document.getElementById('settingsMultiSelectEnabled');
    if (settingsMultiSelect) {
      settingsMultiSelect.addEventListener('change', () => {
        // 메인 페이지 체크박스도 즉시 동기화
        const mainCheckbox = document.getElementById('multiSelectAI');
        if (mainCheckbox) {
          mainCheckbox.checked = settingsMultiSelect.checked;
          // 다중선택 모드 전역 상태 업데이트
          if (window.MyMindAI) window.MyMindAI.multiSelectMode = settingsMultiSelect.checked;
          // 탭 UI 업데이트
          if (typeof updateAITabsForMode === 'function') updateAITabsForMode();
        }
        autoSaveSettings();
      });
    }
    if (editorFontSize) {
      // range slider의 실시간 값 표시 업데이트
      editorFontSize.addEventListener('input', updateFontSizeDisplay);
      // 값 변경 완료 시 자동 저장
      editorFontSize.addEventListener('change', autoSaveSettings);
    }
    if (appLanguage) {
      // 언어 변경 시 동적으로 언어 파일 로드 및 UI 갱신 (리로드 없음)
      appLanguage.addEventListener('change', async () => {
        const newLang = appLanguage.value;
        autoSaveSettings();

        try {
          // 새 언어 파일 동적 로드
          if (window.loadLanguageFile) {
            await window.loadLanguageFile(newLang);
          }

          // UI에 새 언어 적용
          if (window.applyLanguageToUI) {
            window.applyLanguageToUI();
          }

          // index.html의 applyLanguage도 호출 (부모 창에서 실행 중인 경우)
          if (window.parent && window.parent.applyLanguage) {
            window.parent.applyLanguage();
          }

          console.log(`[Settings] Language changed to: ${newLang}`);
        } catch (err) {
          console.error('[Settings] Failed to change language:', err);
          // 실패 시 폴백으로 페이지 리로드
          localStorage.setItem('mymind3_return_to_settings', 'basic');
          setTimeout(() => {
            window.location.reload();
          }, 100);
        }
      });
    }

    // 기본값 복원 버튼
    const resetBasicBtn = document.getElementById('resetBasicBtn');
    if (resetBasicBtn) {
      resetBasicBtn.addEventListener('click', handleResetSettings);
    }

    // 언어 검색 버튼
    const languageSearchBtn = document.getElementById('languageSearchBtn');
    if (languageSearchBtn) {
      languageSearchBtn.addEventListener('click', handleLanguageSearch);
    }

    // 언어 검색 입력 (Enter 키)
    const languageSearchInput = document.getElementById('languageSearch');
    if (languageSearchInput) {
      languageSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleLanguageSearch();
        }
      });
    }
  }

  /**
   * 메뉴 클릭 핸들러
   * @param {Event} event - 클릭 이벤트
   */
  function handleMenuClick(event) {
    const clickedItem = event.currentTarget;
    const menuName = clickedItem.getAttribute('data-menu');

    if (!menuName) return;
    // 환경 선택기 표시/숨김 업데이트
    if (window.SettingsEnv && typeof window.SettingsEnv.setCurrentMenu === 'function') {
      window.SettingsEnv.setCurrentMenu(menuName);
    }


    // 모든 메뉴 아이템에서 active 클래스 제거
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
    });

    // 클릭된 메뉴 아이템에 active 클래스 추가
    clickedItem.classList.add('active');

    // 모든 콘텐츠 섹션 숨기기
    const contentSections = document.querySelectorAll('.content-section');
    contentSections.forEach(section => {
      section.classList.remove('active');
    });

    // 해당 콘텐츠 섹션 표시
    const targetSection = document.getElementById(`content-${menuName}`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // 탭 전환 시 데이터 갱신
    if (menuName === 'payment') {
      // 결제 정보 탭: 크레딧 데이터 갱신
      if (typeof window.initSettingsPayment === 'function') {
        window.initSettingsPayment();
      }
    } else if (menuName === 'ai') {
      // AI 설정 탭: AI 설정 데이터 갱신
      if (typeof window.initSettingsAI === 'function') {
        window.initSettingsAI();
      }
    } else if (menuName === 'ai-model-admin') {
      // AI 모델 관리 탭: AI 모델 설정 데이터 갱신
      if (typeof window.initAIModelAdmin === 'function') {
        window.initAIModelAdmin();
      }
    } else if (menuName === 'model-sync-logs') {
      // 모델 동기화 로그 탭: 동기화 로그 데이터 로드
      if (typeof window.initModelSyncLogs === 'function') {
        window.initModelSyncLogs();
      }
    } else if (menuName === 'security') {
      // 보안 탭: 2FA 상태 데이터 갱신
      if (typeof window.loadTwoFactorStatus === 'function') {
        window.loadTwoFactorStatus();
      }
    } else if (menuName === 'agent-skills') {
      // Agent Skills 탭: TODO Node ID 데이터 갱신 + Access Keys 재로드 (상태 유지)
      if (typeof window.reloadTodoNodeId === 'function') {
        window.reloadTodoNodeId();
      }
      if (typeof window.reloadAccessKeys === 'function') {
        window.reloadAccessKeys();
      }
    }
  }

  /**
   * 언어 목록 렌더링
   * @param {Array} languages - 표시할 언어 목록 (기본: 전체 목록)
   */
  function renderLanguageList(languages = filteredLanguages) {
    const languageSelect = document.getElementById('appLanguage');

    if (!languageSelect) return;

    // 기존 옵션 제거
    languageSelect.innerHTML = '';

    // 언어 목록 추가
    languages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = `${lang.nativeName} (${lang.name})`;
      option.dataset.name = lang.name.toLowerCase();
      option.dataset.nativeName = lang.nativeName.toLowerCase();
      option.dataset.code = lang.code.toLowerCase();
      languageSelect.appendChild(option);
    });
  }

  /**
   * 언어 검색 핸들러 (Like 검색)
   */
  function handleLanguageSearch() {
    const searchInput = document.getElementById('languageSearch');

    if (!searchInput) return;

    const searchTerm = searchInput.value.trim().toLowerCase();

    // 검색어가 비어있으면 전체 목록 표시
    if (!searchTerm) {
      filteredLanguages = [...LANGUAGES];
      renderLanguageList();
      return;
    }

    // Like 검색: 이름, 네이티브 이름, 코드에서 검색
    filteredLanguages = LANGUAGES.filter(lang => {
      const matchName = lang.name.toLowerCase().includes(searchTerm);
      const matchNativeName = lang.nativeName.toLowerCase().includes(searchTerm);
      const matchCode = lang.code.toLowerCase().includes(searchTerm);

      return matchName || matchNativeName || matchCode;
    });

    // 검색 결과 렌더링
    renderLanguageList(filteredLanguages);

    // 검색 결과가 없으면 메시지 표시
    if (filteredLanguages.length === 0) {
      const languageSelect = document.getElementById('appLanguage');
      if (languageSelect) {
        const option = document.createElement('option');
        option.textContent = t('searchNoResults', '검색 결과가 없습니다');
        option.disabled = true;
        languageSelect.appendChild(option);
      }
    }
  }

  /**
   * 현재 선택된 언어 표시 업데이트
   */
  function updateCurrentLanguageDisplay() {
    const appLanguage = document.getElementById('appLanguage');
    const currentLanguageText = document.getElementById('currentLanguageText');

    if (appLanguage && currentLanguageText) {
      const selectedOption = appLanguage.options[appLanguage.selectedIndex];
      if (selectedOption) {
        currentLanguageText.textContent = selectedOption.textContent;
      }
    }
  }

  /**
   * 에디터 폰트 크기 값 표시 업데이트
   */
  function updateFontSizeDisplay() {
    const editorFontSize = document.getElementById('editorFontSize');
    const editorFontSizeValue = document.getElementById('editorFontSizeValue');

    if (editorFontSize && editorFontSizeValue) {
      editorFontSizeValue.textContent = editorFontSize.value + 'px';
    }
  }

  /**
   * 자동 저장 간격 값 표시 업데이트
   */
  function updateAutoSaveIntervalDisplay() {
    const autoSaveInterval = document.getElementById('autoSaveInterval');
    const autoSaveIntervalValue = document.getElementById('autoSaveIntervalValue');

    if (autoSaveInterval && autoSaveIntervalValue) {
      autoSaveIntervalValue.textContent = autoSaveInterval.value + t('secondsUnit', '초');
    }
  }

  /**
   * 설정 값 로드 (DB API 우선, localStorage 폴백)
   * 사용자가 설정 버튼 클릭 시 1회 호출되어 DB에서 모든 Basic Settings 로드
   */
  async function loadSettings() {
    try {
      // 1. localStorage에서 기본 설정 로드 (폴백용)
      const savedSettings = localStorage.getItem('mymind3_settings');
      if (savedSettings) {
        currentSettings = JSON.parse(savedSettings);
      } else {
        currentSettings = { ...DEFAULT_SETTINGS };
      }

      // 2. API에서 모든 Basic Settings 로드
      try {
        const response = await fetch('/api/user/settings', {
          credentials: 'include'
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // 모든 Basic Settings를 API 결과로 덮어쓰기
            if (result.data.theme) {
              currentSettings.appTheme = result.data.theme;
            }
            if (result.data.language) {
              currentSettings.appLanguage = result.data.language;
            }
            if (result.data.autoSaveInterval !== undefined) {
              currentSettings.autoSaveInterval = parseInt(result.data.autoSaveInterval, 10) || DEFAULT_SETTINGS.autoSaveInterval;
            }
            if (result.data.defaultNodeExpanded !== undefined) {
              currentSettings.defaultNodeExpanded = result.data.defaultNodeExpanded === 'true' || result.data.defaultNodeExpanded === true;
            }
            if (result.data.confirmDelete !== undefined) {
              currentSettings.confirmDelete = result.data.confirmDelete === 'true' || result.data.confirmDelete === true;
            }
            if (result.data.agentSkillsEnabled !== undefined) {
              currentSettings.agentSkillsEnabled = result.data.agentSkillsEnabled === 'true' || result.data.agentSkillsEnabled === true;
            }
            if (result.data.autoCreateEnabled !== undefined) {
              currentSettings.autoCreateEnabled = result.data.autoCreateEnabled === 'true' || result.data.autoCreateEnabled === true;
            }
            if (result.data.multiAiEnabled !== undefined) {
              currentSettings.multiSelectEnabled = result.data.multiAiEnabled === 'true' || result.data.multiAiEnabled === true;
            }
            if (result.data.editorFontSize !== undefined) {
              currentSettings.editorFontSize = result.data.editorFontSize;
            }
            console.log('[Settings] 사용자 설정 로드 완료 (source=' + result.source + '):', result.data);

            // localStorage 동기화 (오프라인 폴백용)
            localStorage.setItem('mymind3_settings', JSON.stringify(currentSettings));
          }
        }
      } catch (apiError) {
        console.warn('[Settings] 사용자 설정 API 로드 실패, localStorage 사용:', apiError);
      }

      // UI에 설정 값 적용
      applySettingsToUI();
    } catch (error) {
      console.error('설정 로드 실패:', error);
      currentSettings = { ...DEFAULT_SETTINGS };
      applySettingsToUI();
    }
  }

  /**
   * 모든 Basic Settings를 서버에 저장
   * 사용자가 설정 변경 시 즉시 DB에 반영
   * @param {Object} settings - 저장할 설정 객체
   */
  async function saveUserSettingsToServer(settings) {
    try {
      const body = {};

      // Basic Settings 매핑 (클라이언트 키 -> 서버 키)
      if (settings.appTheme !== undefined) body.theme = settings.appTheme;
      if (settings.appLanguage !== undefined) body.language = settings.appLanguage;
      if (settings.autoSaveInterval !== undefined) body.autoSaveInterval = String(settings.autoSaveInterval);
      if (settings.defaultNodeExpanded !== undefined) body.defaultNodeExpanded = String(settings.defaultNodeExpanded);
      if (settings.confirmDelete !== undefined) body.confirmDelete = String(settings.confirmDelete);
      if (settings.agentSkillsEnabled !== undefined) body.agentSkillsEnabled = String(settings.agentSkillsEnabled);
      if (settings.autoCreateEnabled !== undefined) body.autoCreateEnabled = String(settings.autoCreateEnabled);
      if (settings.multiSelectEnabled !== undefined) body.multiAiEnabled = String(settings.multiSelectEnabled);
      if (settings.editorFontSize !== undefined) body.editorFontSize = String(settings.editorFontSize);

      // 빈 객체면 저장 안 함
      if (Object.keys(body).length === 0) return;

      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (response.ok) {
        console.log('[Settings] Basic Settings 서버 저장 완료:', Object.keys(body));
        // 설정 변경 후 캐시 무효화
        if (window.ApiCache) {
          window.ApiCache.invalidatePattern('/api/user/settings');
        }
      }
    } catch (error) {
      console.warn('[Settings] Basic Settings 서버 저장 실패:', error);
    }
  }

  /**
   * Agent Skills 메뉴 표시/숨김
   * @param {boolean} enabled - Agent Skills 활성화 여부
   */
  function updateAgentSkillsMenuVisibility(enabled) {
    const navItem = document.getElementById('navAgentSkills');
    if (navItem) {
      navItem.style.display = enabled ? '' : 'none';
    }
  }

  /**
   * 설정 값을 UI에 적용
   */
  function applySettingsToUI() {
    // 테마 설정
    const appTheme = document.getElementById('appTheme');
    if (appTheme) {
      appTheme.value = currentSettings.appTheme || 'light';
    }

    // 자동 저장 간격
    const autoSaveInterval = document.getElementById('autoSaveInterval');
    if (autoSaveInterval) {
      autoSaveInterval.value = currentSettings.autoSaveInterval;
      // 값 표시도 업데이트
      updateAutoSaveIntervalDisplay();
    }

    // 새 노드 펼침 상태
    const defaultNodeExpanded = document.getElementById('defaultNodeExpanded');
    if (defaultNodeExpanded) {
      defaultNodeExpanded.checked = currentSettings.defaultNodeExpanded;
    }

    // 삭제 확인
    const confirmDelete = document.getElementById('confirmDelete');
    if (confirmDelete) {
      confirmDelete.checked = currentSettings.confirmDelete;
    }

    // Agent Skills 사용
    const agentSkillsEnabled = document.getElementById('agentSkillsEnabled');
    if (agentSkillsEnabled) {
      agentSkillsEnabled.checked = currentSettings.agentSkillsEnabled;
    }
    // Agent Skills 메뉴 표시/숨김
    updateAgentSkillsMenuVisibility(currentSettings.agentSkillsEnabled);

    // 노드 자동 만들기 (설정 페이지 토글 + 메인 페이지 체크박스)
    const settingsAutoCreate = document.getElementById('settingsAutoCreateEnabled');
    if (settingsAutoCreate) {
      settingsAutoCreate.checked = currentSettings.autoCreateEnabled;
    }
    const mainAutoCreate = document.getElementById('autoCreateNodeAI');
    if (mainAutoCreate) {
      mainAutoCreate.checked = currentSettings.autoCreateEnabled;
    }

    // 모델 다중 선택 (설정 페이지 토글 + 메인 페이지 체크박스)
    const settingsMultiSelect = document.getElementById('settingsMultiSelectEnabled');
    if (settingsMultiSelect) {
      settingsMultiSelect.checked = currentSettings.multiSelectEnabled;
    }
    const mainMultiSelect = document.getElementById('multiSelectAI');
    if (mainMultiSelect) {
      mainMultiSelect.checked = currentSettings.multiSelectEnabled;
      if (window.MyMindAI) window.MyMindAI.multiSelectMode = currentSettings.multiSelectEnabled;
    }

    // 에디터 폰트 크기
    const editorFontSize = document.getElementById('editorFontSize');
    if (editorFontSize) {
      editorFontSize.value = currentSettings.editorFontSize;
      // 값 표시도 업데이트
      updateFontSizeDisplay();
    }

    // 언어 설정
    const appLanguage = document.getElementById('appLanguage');
    if (appLanguage) {
      appLanguage.value = currentSettings.appLanguage || 'ko';
    }

    // 현재 언어 표시 업데이트
    updateCurrentLanguageDisplay();
  }

  // 설정 배치 저장용 디바운스 타이머 및 대기 큐
  let _settingsSaveTimer = null;
  let _pendingSettingsChanges = {};
  const SETTINGS_BATCH_DELAY = 800; // 800ms 디바운스

  /**
   * 자동 저장 핸들러 (디바운스 배치 저장)
   * 설정 변경 시 800ms 디바운스로 모아서 한 번에 서버에 전송
   */
  function autoSaveSettings() {
    try {
      // UI에서 현재 값 읽기
      const appThemeEl = document.getElementById('appTheme');
      const autoSaveIntervalEl = document.getElementById('autoSaveInterval');
      const defaultNodeExpandedEl = document.getElementById('defaultNodeExpanded');
      const confirmDeleteEl = document.getElementById('confirmDelete');
      const agentSkillsEnabledEl = document.getElementById('agentSkillsEnabled');
      const editorFontSizeEl = document.getElementById('editorFontSize');
      const appLanguageEl = document.getElementById('appLanguage');

      // 노드 자동 만들기 / 모델 다중 선택 (설정 페이지 또는 메인 페이지에서 읽기)
      const settingsAutoCreateEl = document.getElementById('settingsAutoCreateEnabled');
      const mainAutoCreateEl = document.getElementById('autoCreateNodeAI');
      const settingsMultiSelectEl = document.getElementById('settingsMultiSelectEnabled');
      const mainMultiSelectEl = document.getElementById('multiSelectAI');

      // 설정 객체 업데이트
      const newSettings = {
        appTheme: appThemeEl ? appThemeEl.value : 'light',
        autoSaveInterval: parseInt(autoSaveIntervalEl.value, 10) || 60,
        defaultNodeExpanded: defaultNodeExpandedEl.checked,
        confirmDelete: confirmDeleteEl.checked,
        agentSkillsEnabled: agentSkillsEnabledEl ? agentSkillsEnabledEl.checked : false,
        autoCreateEnabled: settingsAutoCreateEl ? settingsAutoCreateEl.checked : (mainAutoCreateEl ? mainAutoCreateEl.checked : false),
        multiSelectEnabled: settingsMultiSelectEl ? settingsMultiSelectEl.checked : (mainMultiSelectEl ? mainMultiSelectEl.checked : false),
        editorFontSize: editorFontSizeEl.value,
        appLanguage: appLanguageEl.value || 'ko'
      };

      // 변경된 키만 대기 큐에 추가
      for (const [key, value] of Object.entries(newSettings)) {
        if (currentSettings[key] !== value) {
          _pendingSettingsChanges[key] = value;
        }
      }

      currentSettings = newSettings;

      // localStorage에 즉시 저장 (오프라인 폴백용)
      localStorage.setItem('mymind3_settings', JSON.stringify(currentSettings));

      // 디바운스: 이전 타이머 취소 후 새로 설정
      if (_settingsSaveTimer) {
        clearTimeout(_settingsSaveTimer);
      }

      _settingsSaveTimer = setTimeout(() => {
        // 대기 중인 변경사항이 있으면 한 번에 전송
        if (Object.keys(_pendingSettingsChanges).length > 0) {
          console.log('[Settings] 배치 저장:', Object.keys(_pendingSettingsChanges).join(', '));
          saveUserSettingsToServer(currentSettings);
          _pendingSettingsChanges = {};
        }
        _settingsSaveTimer = null;
      }, SETTINGS_BATCH_DELAY);

      // 메인 페이지에서 설정 적용되도록 이벤트 발송
      window.dispatchEvent(new CustomEvent('settingsChanged', {
        detail: currentSettings
      }));
    } catch (error) {
      console.error('설정 자동 저장 실패:', error);
    }
  }

  /**
   * 설정 저장 핸들러
   */
  function handleSaveSettings() {
    try {
      // UI에서 현재 값 읽기
      const appTheme = document.getElementById('appTheme');
      const autoSaveInterval = document.getElementById('autoSaveInterval');
      const defaultNodeExpanded = document.getElementById('defaultNodeExpanded');
      const confirmDelete = document.getElementById('confirmDelete');
      const editorFontSize = document.getElementById('editorFontSize');
      const appLanguage = document.getElementById('appLanguage');

      // 설정 객체 업데이트
      currentSettings = {
        appTheme: appTheme ? appTheme.value : 'light',
        autoSaveInterval: parseInt(autoSaveInterval.value, 10) || 60,
        defaultNodeExpanded: defaultNodeExpanded.checked,
        confirmDelete: confirmDelete.checked,
        editorFontSize: editorFontSize.value,
        appLanguage: appLanguage.value || 'ko'
      };

      // localStorage에 저장
      localStorage.setItem('mymind3_settings', JSON.stringify(currentSettings));

      // 성공 메시지 표시
      showNotification(t('featureSettingsSaved', '설정이 저장되었습니다.'), 'success');

      // 메인 페이지에서 설정 적용되도록 이벤트 발송 (옵션)
      window.dispatchEvent(new CustomEvent('settingsChanged', {
        detail: currentSettings
      }));
    } catch (error) {
      console.error('설정 저장 실패:', error);
      showNotification(t('coreSaveError', '설정 저장에 실패했습니다.'), 'error');
    }
  }

  /**
   * 기본값 복원 핸들러
   */
  function handleResetSettings() {
    if (!confirm(t('coreResetConfirm', '모든 설정을 기본값으로 복원하시겠습니까?'))) {
      return;
    }

    try {
      // 기본 설정으로 복원 (브라우저 언어 감지 포함)
      currentSettings = {
        ...DEFAULT_SETTINGS,
        appLanguage: detectBrowserLanguage()
      };

      // UI에 적용
      applySettingsToUI();

      // localStorage에 저장
      localStorage.setItem('mymind3_settings', JSON.stringify(currentSettings));

      // 성공 메시지 표시
      showNotification(t('coreResetSuccess', '설정이 기본값으로 복원되었습니다.'), 'success');
    } catch (error) {
      console.error('설정 복원 실패:', error);
      showNotification(t('coreResetError', '설정 복원에 실패했습니다.'), 'error');
    }
  }

  /**
   * 테마 적용 함수
   * @param {string} theme - 적용할 테마 ('light' | 'dark')
   * @param {boolean} skipDbSave - DB 저장 스킵 여부 (autoSaveSettings에서 이미 저장하므로 true 전달)
   */
  function applyTheme(theme, skipDbSave = true) {
    const validTheme = (theme === 'dark') ? 'dark' : 'light';

    // 부모 창의 ThemeManager가 있으면 사용 (index.html에서 로드됨)
    if (window.parent && window.parent.ThemeManager) {
      // skipDbSave=true: Settings의 autoSaveSettings()에서 이미 DB 저장하므로 중복 방지
      window.parent.ThemeManager.setTheme(validTheme, skipDbSave);
      console.log('[Settings] ThemeManager를 통해 테마 적용:', validTheme);
      return;
    }

    // 현재 창의 ThemeManager가 있으면 사용
    if (window.ThemeManager) {
      window.ThemeManager.setTheme(validTheme, skipDbSave);
      console.log('[Settings] ThemeManager를 통해 테마 적용:', validTheme);
      return;
    }

    // ThemeManager가 없는 경우 직접 적용 (fallback)
    // 메인 페이지(부모)의 document에 테마 적용
    if (window.parent && window.parent.document) {
      window.parent.document.documentElement.setAttribute('data-theme', validTheme);
      window.parent.document.body.setAttribute('data-theme', validTheme);
    }

    // 현재 document에도 테마 적용
    document.documentElement.setAttribute('data-theme', validTheme);
    document.body.setAttribute('data-theme', validTheme);

    // localStorage에 테마 저장 (ThemeManager와 동일한 키 사용)
    localStorage.setItem('mymind3-theme', validTheme);

    // 테마 변경 이벤트 발송
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: validTheme } }));
    if (window.parent && window.parent !== window) {
      window.parent.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: validTheme } }));
    }

    console.log('[Settings] 직접 테마 적용:', validTheme);
  }

  /**
   * 알림 메시지 표시
   * @param {string} message - 표시할 메시지
   * @param {string} type - 메시지 타입 ('success' | 'error' | 'info')
   */
  function showNotification(message, type = 'info') {
    // 기존 알림이 있으면 제거
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // 알림 요소 생성
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    // 스타일 적용
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '16px 24px',
      backgroundColor: type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3',
      color: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontSize: '14px',
      fontWeight: '500',
      zIndex: '10000',
      animation: 'slideInRight 0.3s ease-out',
      opacity: '0',
      transform: 'translateX(400px)'
    });

    // 페이지에 추가
    document.body.appendChild(notification);

    // 애니메이션 시작
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
      notification.style.transition = 'all 0.3s ease-out';
    }, 10);

    // 3초 후 자동 제거
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(400px)';

      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  /**
   * 설정 값 가져오기 (외부에서 사용 가능)
   * @returns {Object} 현재 설정값
   */
  function getSettings() {
    return { ...currentSettings };
  }

  /**
   * 특정 설정 값 가져오기
   * @param {string} key - 설정 키
   * @returns {*} 설정 값
   */
  function getSetting(key) {
    return currentSettings[key];
  }

  /**
   * 대기 중인 설정 변경사항 즉시 전송 (팝업 닫기 전 호출)
   */
  function flushPendingSettings() {
    if (_settingsSaveTimer) {
      clearTimeout(_settingsSaveTimer);
      _settingsSaveTimer = null;
    }
    if (Object.keys(_pendingSettingsChanges).length > 0) {
      console.log('[Settings] flush 배치 저장:', Object.keys(_pendingSettingsChanges).join(', '));
      saveUserSettingsToServer(currentSettings);
      _pendingSettingsChanges = {};
    }
  }

  // 페이지 이탈 시 대기 중인 변경사항 즉시 전송
  window.addEventListener('beforeunload', flushPendingSettings);

  // 전역 객체에 노출 (다른 스크립트에서 접근 가능)
  window.MyMind3Settings = {
    getSettings,
    getSetting,
    flushPendingSettings,
    DEFAULT_SETTINGS
  };

  // 페이지 로드 완료 시 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
  } else {
    // 레이어 팝업에서 로드된 경우 초기화 지연
    if (!window.settingsInitialized) {
      initializePage();
    }
  }

  // 외부에서 호출 가능한 초기화 함수 (레이어 팝업용)
  window.initSettings = function() {
    window.settingsInitialized = true;
    return initializePage();
  };

  // 레이어 팝업 콘텐츠에 대해 이벤트 리스너만 재설정하는 함수
  window.initSettingsEventListeners = function() {
    setupEventListeners();
    console.log('[Settings] 이벤트 리스너 재설정 완료');
  };

  // 모든 동적 콘텐츠 생성 후 다국어 재적용 (initSettingsAll에서 호출)
  window.applyLanguageToSettings = function() {
    applyLanguage();
    console.log('[Settings] 다국어 번역 재적용 완료');
  };

  console.log('[Settings] settings-core.js IIFE 완료, window.initSettings:', typeof window.initSettings);
})();
