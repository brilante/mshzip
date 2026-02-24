/**
 * i18n-init.js - 다국어 초기화 유틸리티 모듈
 *
 * 언어 파일 동적 로드, 언어 설정 관리, 번역 키 조회 등
 * 다국어 관련 핵심 기능을 제공합니다.
 */
(function() {
  'use strict';

  /**
   * 언어 파일을 동적으로 로드합니다.
   * 이미 로드된 언어는 다시 로드하지 않습니다.
   *
   * @param {string} lang - 로드할 언어 코드 (예: 'ko', 'en', 'zh-CN')
   * @returns {Promise<void>} - 로드 완료 시 resolve
   */
  function loadLanguageFile(lang) {
    return new Promise((resolve, reject) => {
      // 언어 코드에서 하이픈 제거하여 변수명 생성 (예: zh-CN -> zhCN)
      const langVarName = lang.replace(/-/g, '');

      // 이미 로드된 경우 바로 resolve
      if (window[`i18n_${langVarName}`]) {
        resolve();
        return;
      }

      // 스크립트 태그 생성하여 동적 로드
      const script = document.createElement('script');
      script.src = `/js/i18n/${lang}.js`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${lang}.js`));
      document.head.appendChild(script);
    });
  }

  /**
   * 현재 설정된 언어를 가져옵니다.
   * localStorage에 저장된 설정을 확인하며, 없으면 기본값 'ko' 반환
   *
   * @returns {string} - 현재 언어 코드
   */
  function getCurrentLanguage() {
    const settings = JSON.parse(localStorage.getItem('mymind3_settings') || '{}');
    return settings.appLanguage || 'ko';
  }

  /**
   * 언어 설정을 변경합니다.
   * localStorage의 mymind3_settings에 저장됩니다.
   *
   * @param {string} lang - 설정할 언어 코드
   */
  function setLanguage(lang) {
    const settings = JSON.parse(localStorage.getItem('mymind3_settings') || '{}');
    settings.appLanguage = lang;
    localStorage.setItem('mymind3_settings', JSON.stringify(settings));
  }

  /**
   * 다국어 시스템을 초기화합니다.
   * 현재 언어 파일과 폴백용 영어 파일을 로드하고
   * window.i18n 객체를 구성합니다.
   *
   * @returns {Promise<string>} - 초기화된 언어 코드
   */
  async function initI18n() {
    const currentLang = getCurrentLanguage();

    // 현재 언어 파일 로드
    await loadLanguageFile(currentLang);

    // 폴백용 영어 로드 (현재 언어가 영어가 아닌 경우)
    if (currentLang !== 'en') {
      try {
        await loadLanguageFile('en');
      } catch (e) {
        console.warn('[i18n] English fallback failed:', e);
      }
    }

    // 현재 언어 데이터를 window.i18n에 적용
    // 영어를 베이스로 하고 현재 언어로 덮어쓰기
    const langVarName = currentLang.replace(/-/g, '');
    if (window[`i18n_${langVarName}`]) {
      window.i18n = { ...window.i18n_en, ...window[`i18n_${langVarName}`] };
    } else {
      window.i18n = window.i18n_en || {};
    }

    // DOM이 준비된 경우 data-i18n 속성 적용
    if (document.readyState !== 'loading') {
      applyI18n();
    } else {
      document.addEventListener('DOMContentLoaded', () => applyI18n());
    }

    // 단위 환경설정 비동기 로드 (로딩 차단 없이)
    if (window.MyMind3?.Intl?.loadUnitPreferences) {
      window.MyMind3.Intl.loadUnitPreferences(currentLang).catch(() => {});
    }

    console.log(`[i18n] Initialized with language: ${currentLang}`);
    return currentLang;
  }

  /**
   * 번역 키로 번역된 텍스트를 조회합니다.
   * 키가 없으면 폴백 값 또는 키 자체를 반환합니다.
   *
   * @param {string} key - 번역 키
   * @param {string} fallback - 폴백 텍스트 (선택사항)
   * @returns {string} - 번역된 텍스트
   */
  function t(key, fallback = '') {
    return window.i18n?.[key] || fallback || key;
  }

  /**
   * DOM의 data-i18n 속성을 기반으로 번역을 적용합니다.
   * - data-i18n: textContent 변환
   * - data-i18n-placeholder: placeholder 변환
   * - data-i18n-title: title 변환
   * - data-i18n-content: content 속성 변환 (meta 태그용)
   *
   * @param {Element} root - 검색 시작 요소 (기본: document)
   */
  function applyI18n(root) {
    const container = root || document;

    // textContent 변환
    container.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translated = t(key);
      if (translated && translated !== key) {
        el.textContent = translated;
      }
    });

    // placeholder 변환
    container.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const translated = t(key);
      if (translated && translated !== key) {
        el.placeholder = translated;
      }
    });

    // title 변환
    container.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const translated = t(key);
      if (translated && translated !== key) {
        el.title = translated;
      }
    });

    // meta content 변환
    container.querySelectorAll('[data-i18n-content]').forEach(el => {
      const key = el.getAttribute('data-i18n-content');
      const translated = t(key);
      if (translated && translated !== key) {
        el.setAttribute('content', translated);
      }
    });
  }

  /**
   * DOM의 data-fmt-* 속성을 기반으로 숫자/통화/날짜 포맷을 재적용합니다.
   * - data-fmt-number: 숫자 포맷 (원본값은 data-raw-value)
   * - data-fmt-currency="USD": 통화 포맷
   * - data-fmt-date: 날짜 포맷
   * 또한 unitsChanged 이벤트를 발행하여 JS 컴포넌트의 재렌더링을 트리거합니다.
   *
   * @param {Element} root - 검색 시작 요소 (기본: document)
   */
  function applyUnits(root) {
    const intl = window.MyMind3?.Intl;
    if (!intl) return;

    const container = root || document;

    // data-fmt-number: 숫자 포맷
    container.querySelectorAll('[data-fmt-number]').forEach(el => {
      const raw = el.getAttribute('data-raw-value') || el.textContent;
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        el.setAttribute('data-raw-value', raw);
        el.textContent = intl.formatNumber(num);
      }
    });

    // data-fmt-currency: 통화 포맷
    container.querySelectorAll('[data-fmt-currency]').forEach(el => {
      const raw = el.getAttribute('data-raw-value') || el.textContent;
      const num = parseFloat(raw);
      const currency = el.getAttribute('data-fmt-currency') || 'USD';
      if (!isNaN(num)) {
        el.setAttribute('data-raw-value', raw);
        el.textContent = intl.formatCurrency ? intl.formatCurrency(num, currency) : intl.formatNumber(num);
      }
    });

    // data-fmt-date: 날짜 포맷
    container.querySelectorAll('[data-fmt-date]').forEach(el => {
      const raw = el.getAttribute('data-raw-value') || el.textContent;
      if (raw && intl.formatDate) {
        el.setAttribute('data-raw-value', raw);
        el.textContent = intl.formatDate(raw);
      }
    });

    // JS 컴포넌트 재렌더링 이벤트 발행
    window.dispatchEvent(new CustomEvent('unitsChanged'));
  }

  /**
   * 언어를 변경하고 UI를 갱신합니다.
   *
   * @param {string} lang - 변경할 언어 코드
   * @returns {Promise<void>}
   */
  async function changeLanguage(lang) {
    setLanguage(lang);
    await loadLanguageFile(lang);

    const langVarName = lang.replace(/-/g, '');
    if (window[`i18n_${langVarName}`]) {
      window.i18n = { ...window.i18n_en, ...window[`i18n_${langVarName}`] };
    }

    applyI18n();
    applyUnits();

    // 단위 환경설정 갱신 (언어 변경 시)
    if (window.MyMind3?.Intl?.loadUnitPreferences) {
      window.MyMind3.Intl.loadUnitPreferences(lang).then(() => {
        applyUnits(); // 서버 데이터 로드 후 재적용
      }).catch(() => {});
    }

    // 언어 변경 이벤트 발행
    if (window.MyMind3?.Intl?.dispatchLanguageChange) {
      window.MyMind3.Intl.dispatchLanguageChange(lang);
    }
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));

    console.log(`[i18n] Language changed to: ${lang}`);
  }

  // window 객체에 함수들 노출
  window.loadLanguageFile = loadLanguageFile;
  window.getCurrentLanguage = getCurrentLanguage;
  window.setLanguage = setLanguage;
  window.initI18n = initI18n;
  window.t = t;
  window.applyI18n = applyI18n;
  window.applyUnits = applyUnits;
  window.changeLanguage = changeLanguage;

  console.log('[Module] i18n-init.js loaded');
})();
