/**
 * 통화 포맷팅 모듈
 * @module settings/currency
 * @description 통화 변환 및 포맷팅 유틸리티
 */
(function() {
  'use strict';

  // PaymentConstants가 로드되었는지 확인
  const getConstants = () => window.PaymentConstants || {};

  /**
   * 통화 기호 가져오기
   * @param {string} currency - 통화 코드
   * @returns {string} 통화 기호
   */
  function getCurrencySymbol(currency) {
    const CURRENCY_INFO = getConstants().CURRENCY_INFO || {
      'USD': { symbol: '$' },
      'KRW': { symbol: '₩' },
      'JPY': { symbol: '¥' },
      'EUR': { symbol: '€' },
      'GBP': { symbol: '£' },
      'CNY': { symbol: '¥' }
    };
    return CURRENCY_INFO[currency]?.symbol || currency + ' ';
  }

  /**
   * 통화별 로케일 가져오기
   * @param {string} currency - 통화 코드
   * @returns {string} 로케일 문자열
   */
  function getCurrencyLocale(currency) {
    const locales = {
      'USD': 'en-US',
      'KRW': 'ko-KR',
      'JPY': 'ja-JP',
      'EUR': 'de-DE',
      'GBP': 'en-GB',
      'CNY': 'zh-CN'
    };
    return locales[currency] || 'en-US';
  }

  /**
   * USD 가격을 지정된 통화로 환산
   * @param {number} usdPrice - USD 가격
   * @param {string} currency - 대상 통화 코드
   * @param {number} exchangeRate - 환율 (1 USD = x 통화)
   * @returns {string} 포맷된 가격 문자열
   */
  function formatPriceInCurrency(usdPrice, currency = 'USD', exchangeRate = 1) {
    const CURRENCY_INFO = getConstants().CURRENCY_INFO || {};
    const info = CURRENCY_INFO[currency] || { symbol: '$', decimals: 2, prefix: true };
    const convertedPrice = usdPrice * exchangeRate;
    const formattedNumber = convertedPrice.toFixed(info.decimals);

    // 천단위 구분자 적용
    const parts = formattedNumber.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const numberStr = parts.join('.');

    return info.prefix ? `${info.symbol}${numberStr}` : `${numberStr}${info.symbol}`;
  }

  /**
   * 잔액/사용량 포맷팅
   * - 1,000,000 이상: X.XXM
   * - 1,000 이상: X.XK
   * - 1,000 미만: 원본 숫자
   * @param {number} balance - 잔액/사용량
   * @returns {string} 포맷된 문자열
   */
  function formatBalance(balance) {
    if (balance == null || isNaN(balance)) return '0';

    const num = Math.floor(balance);

    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    const intl = window.MyMind3 && window.MyMind3.Intl;
    return intl ? intl.formatNumber(num, { maximumFractionDigits: 0 }) : num.toLocaleString();
  }

  /**
   * 잔액 상세 포맷팅 (전체 숫자 + 축약형)
   * @param {number} balance - 잔액
   * @returns {string} 예: "1,019,700 (1.02M)"
   */
  function formatBalanceDetail(balance) {
    if (balance == null || isNaN(balance)) return '0';

    const num = Math.floor(balance);
    const intl = window.MyMind3 && window.MyMind3.Intl;
    const full = intl ? intl.formatNumber(num, { maximumFractionDigits: 0 }) : num.toLocaleString();

    if (num >= 1000000) {
      const short = (num / 1000000).toFixed(2) + 'M';
      return `${full} (${short})`;
    } else if (num >= 10000) {
      const short = (num / 1000).toFixed(0) + 'K';
      return `${full} (${short})`;
    }
    return full;
  }

  /**
   * 금액을 통화 형식으로 포맷
   * @param {number} amount - 금액
   * @param {string} currency - 통화 코드
   * @returns {string} 포맷된 금액 문자열
   */
  function formatCurrencyAmount(amount, currency) {
    const symbol = getCurrencySymbol(currency);
    const integerCurrencies = ['KRW', 'JPY'];

    if (integerCurrencies.includes(currency)) {
      const intl = window.MyMind3 && window.MyMind3.Intl;
      const formatted = intl ? intl.formatNumber(Math.round(amount), { maximumFractionDigits: 0 }) : Math.round(amount).toLocaleString();
      return symbol + formatted;
    }
    return symbol + amount.toFixed(2);
  }

  /**
   * 숫자를 통화 형식으로 포맷팅 (천 단위 구분자 포함)
   * @param {number} amount - 금액
   * @param {string} currency - 통화 코드
   * @returns {string} 포맷팅된 금액 문자열
   */
  function formatAmountWithSeparator(amount, currency) {
    if (isNaN(amount)) return '';
    const locale = getCurrencyLocale(currency);
    const isInteger = Number.isInteger(amount);
    return amount.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: isInteger ? 0 : 2
    });
  }

  /**
   * 포맷팅된 문자열에서 숫자만 추출
   * @param {string} formattedValue - 포맷팅된 문자열
   * @returns {number} 숫자 값
   */
  function parseFormattedAmount(formattedValue) {
    if (!formattedValue) return 0;
    const cleaned = formattedValue.replace(/[^\d.]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * 결제 통화 가져오기 (localStorage에서)
   * @returns {string} 통화 코드
   */
  function getPaymentCurrency() {
    try {
      const saved = localStorage.getItem('mymind3_ai_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        return settings.paymentCurrency || 'USD';
      }
    } catch (e) {
      // 무시
    }
    return 'USD';
  }

  // 전역으로 노출
  window.CurrencyUtils = {
    getCurrencySymbol,
    getCurrencyLocale,
    formatPriceInCurrency,
    formatBalance,
    formatBalanceDetail,
    formatCurrencyAmount,
    formatAmountWithSeparator,
    parseFormattedAmount,
    getPaymentCurrency
  };

  // 기존 전역 함수 호환성 유지
  window.getCurrencySymbol = getCurrencySymbol;
  window.formatBalance = formatBalance;
  window.formatBalanceDetail = formatBalanceDetail;
  window.formatPriceInCurrency = formatPriceInCurrency;

  console.log('[CurrencyUtils] 통화 유틸리티 모듈 로드 완료');
})();
