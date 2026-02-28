/**
 * 서버 사이드 국제화 유틸리티
 * Node.js Intl API 기반 날짜/숫자 포맷팅
 *
 * @module utils/intlServer
 */

const SERVER_TIMEZONE = 'Asia/Seoul';

/**
 * 날짜를 로케일에 맞게 포맷팅
 * @param {Date|string} date - 포맷할 날짜
 * @param {string} locale - 로케일 코드 (기본: 'ko-KR')
 * @param {Object} options - Intl.DateTimeFormat 옵션
 * @returns {string} 포맷된 날짜 문자열
 */
function formatDate(date, locale = 'ko-KR', options = {}) {
  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return String(date);

  // dateStyle/timeStyle는 개별 옵션(month, day 등)과 동시 사용 불가
  if (options.dateStyle || options.timeStyle) {
    return dateObj.toLocaleString(locale, {
      timeZone: SERVER_TIMEZONE,
      ...options
    });
  }

  const defaultOptions = {
    timeZone: SERVER_TIMEZONE,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };

  return dateObj.toLocaleString(locale, defaultOptions);
}

/**
 * 숫자를 로케일에 맞게 포맷팅
 * @param {number} value - 포맷할 숫자
 * @param {string} locale - 로케일 코드 (기본: 'ko-KR')
 * @param {Object} options - Intl.NumberFormat 옵션
 * @returns {string} 포맷된 숫자 문자열
 */
function formatNumber(value, locale = 'ko-KR', options = {}) {
  const num = Number(value);
  if (isNaN(num)) return String(value);

  const defaultOptions = {
    maximumFractionDigits: 0,
    ...options
  };

  return new Intl.NumberFormat(locale, defaultOptions).format(num);
}

/**
 * 통화를 로케일에 맞게 포맷팅
 * @param {number} amount - 금액
 * @param {string} currency - 통화 코드 (예: 'USD', 'KRW')
 * @param {string} locale - 로케일 코드
 * @returns {string} 포맷된 통화 문자열
 */
function formatCurrency(amount, currency = 'USD', locale = 'ko-KR') {
  const num = Number(amount);
  if (isNaN(num)) return String(amount);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(num);
}

module.exports = {
  formatDate,
  formatNumber,
  formatCurrency,
  SERVER_TIMEZONE
};
