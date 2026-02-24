/**
 * ============================================
 * Phase 2-1: 날짜/숫자/통화 형식 현지화 유틸리티
 * ============================================
 *
 * Intl API를 활용한 다국어 지원 포맷팅 함수
 * - Intl.DateTimeFormat: 날짜 현지화
 * - Intl.NumberFormat: 숫자 현지화
 * - Intl.NumberFormat (currency): 통화 현지화
 */

/**
 * 현재 설정된 언어 가져오기
 * @returns {string} 현재 언어 코드 (예: 'ko', 'en', 'ar')
 */
function getCurrentLanguage() {
  try {
    const settings = JSON.parse(localStorage.getItem('mymind3_settings') || '{}');
    return settings.appLanguage || 'ko';
  } catch (error) {
    console.error('[MyMind3 Intl] Failed to get current language:', error);
    return 'ko'; // 기본값
  }
}

/**
 * 날짜를 현지화된 형식으로 포맷팅
 * @param {Date|string|number} date - 포맷팅할 날짜 (Date 객체, ISO 문자열, 타임스탬프)
 * @param {Object} options - Intl.DateTimeFormat 옵션
 * @param {string} options.dateStyle - 날짜 스타일 ('full', 'long', 'medium', 'short')
 * @param {string} options.timeStyle - 시간 스타일 ('full', 'long', 'medium', 'short')
 * @param {string} options.year - 연도 표시 ('numeric', '2-digit')
 * @param {string} options.month - 월 표시 ('numeric', '2-digit', 'long', 'short', 'narrow')
 * @param {string} options.day - 일 표시 ('numeric', '2-digit')
 * @param {string} options.hour - 시간 표시 ('numeric', '2-digit')
 * @param {string} options.minute - 분 표시 ('numeric', '2-digit')
 * @param {string} options.second - 초 표시 ('numeric', '2-digit')
 * @param {string} locale - 언어 코드 (기본값: 현재 설정 언어)
 * @returns {string} 현지화된 날짜 문자열
 *
 * @example
 * formatDate(new Date(), { dateStyle: 'long' })
 * // 한국어: 2025년 10월 17일
 * // 영어: October 17, 2025
 * // 아랍어: ١٧ أكتوبر ٢٠٢٥
 *
 * formatDate(new Date(), { dateStyle: 'short', timeStyle: 'short' })
 * // 한국어: 25. 10. 17. 오전 10:30
 * // 영어: 10/17/25, 10:30 AM
 */
function formatDate(date, options = {}, locale = null) {
  try {
    // 날짜 객체로 변환
    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) {
      console.error('[MyMind3 Intl] Invalid date:', date);
      return String(date);
    }

    // 현재 언어 또는 지정된 로케일 사용
    const currentLocale = locale || getCurrentLanguage();

    // 기본 옵션 설정
    const defaultOptions = {
      dateStyle: 'medium',
      ...options
    };

    // Intl.DateTimeFormat을 사용하여 포맷팅
    const formatter = new Intl.DateTimeFormat(currentLocale, defaultOptions);
    return formatter.format(dateObj);

  } catch (error) {
    console.error('[MyMind3 Intl] Date formatting error:', error);
    return String(date);
  }
}

/**
 * 숫자를 현지화된 형식으로 포맷팅
 * @param {number} number - 포맷팅할 숫자
 * @param {Object} options - Intl.NumberFormat 옵션
 * @param {string} options.style - 숫자 스타일 ('decimal', 'percent', 'unit')
 * @param {number} options.minimumFractionDigits - 최소 소수점 자리수
 * @param {number} options.maximumFractionDigits - 최대 소수점 자리수
 * @param {boolean} options.useGrouping - 천 단위 구분 기호 사용 여부
 * @param {string} locale - 언어 코드 (기본값: 현재 설정 언어)
 * @returns {string} 현지화된 숫자 문자열
 *
 * @example
 * formatNumber(1234567.89)
 * // 한국어: 1,234,567.89
 * // 아랍어: ١٬٢٣٤٬٥٦٧٫٨٩
 * // 독일어: 1.234.567,89
 *
 * formatNumber(0.75, { style: 'percent' })
 * // 한국어: 75%
 * // 영어: 75%
 */
function formatNumber(number, options = {}, locale = null) {
  try {
    // 숫자 유효성 검사
    const numValue = Number(number);
    if (isNaN(numValue)) {
      console.error('[MyMind3 Intl] Invalid number:', number);
      return String(number);
    }

    // 현재 언어 또는 지정된 로케일 사용
    const currentLocale = locale || getCurrentLanguage();

    // 기본 옵션 설정
    const defaultOptions = {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options
    };

    // Intl.NumberFormat을 사용하여 포맷팅
    const formatter = new Intl.NumberFormat(currentLocale, defaultOptions);
    return formatter.format(numValue);

  } catch (error) {
    console.error('[MyMind3 Intl] Number formatting error:', error);
    return String(number);
  }
}

/**
 * 통화를 현지화된 형식으로 포맷팅
 * @param {number} amount - 포맷팅할 금액
 * @param {string} currency - 통화 코드 (ISO 4217: 'USD', 'EUR', 'KRW', 'JPY' 등)
 * @param {Object} options - Intl.NumberFormat 추가 옵션
 * @param {string} options.currencyDisplay - 통화 표시 방식 ('symbol', 'code', 'name')
 * @param {number} options.minimumFractionDigits - 최소 소수점 자리수
 * @param {number} options.maximumFractionDigits - 최대 소수점 자리수
 * @param {string} locale - 언어 코드 (기본값: 현재 설정 언어)
 * @returns {string} 현지화된 통화 문자열
 *
 * @example
 * formatCurrency(1234.56, 'USD')
 * // 한국어: US$1,234.56
 * // 영어: $1,234.56
 * // 아랍어: US$ ١٬٢٣٤٫٥٦
 *
 * formatCurrency(1234.56, 'KRW')
 * // 한국어: ₩1,235
 * // 영어: ₩1,235
 *
 * formatCurrency(1234.56, 'EUR', { currencyDisplay: 'code' })
 * // 한국어: EUR 1,234.56
 * // 영어: EUR 1,234.56
 */
function formatCurrency(amount, currency = 'USD', options = {}, locale = null) {
  try {
    // 금액 유효성 검사
    const numValue = Number(amount);
    if (isNaN(numValue)) {
      console.error('[MyMind3 Intl] Invalid currency amount:', amount);
      return String(amount);
    }

    // 통화 코드 유효성 검사
    if (!currency || typeof currency !== 'string' || currency.length !== 3) {
      console.error('[MyMind3 Intl] Invalid currency code:', currency);
      return String(amount);
    }

    // 현재 언어 또는 지정된 로케일 사용
    const currentLocale = locale || getCurrentLanguage();

    // 기본 옵션 설정
    const defaultOptions = {
      style: 'currency',
      currency: currency.toUpperCase(),
      currencyDisplay: 'symbol',
      ...options
    };

    // Intl.NumberFormat을 사용하여 포맷팅
    const formatter = new Intl.NumberFormat(currentLocale, defaultOptions);
    return formatter.format(numValue);

  } catch (error) {
    console.error('[MyMind3 Intl] Currency formatting error:', error);
    return `${currency} ${amount}`;
  }
}

/**
 * 상대 시간을 현지화된 형식으로 포맷팅
 * @param {Date|string|number} date - 기준 날짜
 * @param {Date|string|number} baseDate - 비교 날짜 (기본값: 현재 시간)
 * @param {Object} options - Intl.RelativeTimeFormat 옵션
 * @param {string} options.style - 스타일 ('long', 'short', 'narrow')
 * @param {string} options.numeric - 숫자 표시 ('always', 'auto')
 * @param {string} locale - 언어 코드 (기본값: 현재 설정 언어)
 * @returns {string} 현지화된 상대 시간 문자열
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 3600000)) // 1시간 전
 * // 한국어: 1시간 전
 * // 영어: 1 hour ago
 * // 아랍어: قبل ساعة واحدة
 */
function formatRelativeTime(date, baseDate = new Date(), options = {}, locale = null) {
  try {
    // 날짜 객체로 변환
    const dateObj = date instanceof Date ? date : new Date(date);
    const baseDateObj = baseDate instanceof Date ? baseDate : new Date(baseDate);

    if (isNaN(dateObj.getTime()) || isNaN(baseDateObj.getTime())) {
      console.error('[MyMind3 Intl] Invalid date for relative time:', date, baseDate);
      return String(date);
    }

    // 현재 언어 또는 지정된 로케일 사용
    const currentLocale = locale || getCurrentLanguage();

    // 시간 차이 계산 (밀리초)
    const diffMs = dateObj.getTime() - baseDateObj.getTime();

    // 시간 단위별 차이 계산
    const diffSeconds = Math.round(diffMs / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);
    const diffMonths = Math.round(diffDays / 30);
    const diffYears = Math.round(diffDays / 365);

    // 기본 옵션 설정
    const defaultOptions = {
      style: 'long',
      numeric: 'auto',
      ...options
    };

    // Intl.RelativeTimeFormat을 사용하여 포맷팅
    const formatter = new Intl.RelativeTimeFormat(currentLocale, defaultOptions);

    // 적절한 단위 선택
    if (Math.abs(diffYears) >= 1) {
      return formatter.format(diffYears, 'year');
    } else if (Math.abs(diffMonths) >= 1) {
      return formatter.format(diffMonths, 'month');
    } else if (Math.abs(diffDays) >= 1) {
      return formatter.format(diffDays, 'day');
    } else if (Math.abs(diffHours) >= 1) {
      return formatter.format(diffHours, 'hour');
    } else if (Math.abs(diffMinutes) >= 1) {
      return formatter.format(diffMinutes, 'minute');
    } else {
      return formatter.format(diffSeconds, 'second');
    }

  } catch (error) {
    console.error('[MyMind3 Intl] Relative time formatting error:', error);
    return String(date);
  }
}

/**
 * 파일 크기를 현지화된 형식으로 포맷팅
 * @param {number} bytes - 바이트 단위 파일 크기
 * @param {Object} options - 포맷팅 옵션
 * @param {number} options.decimals - 소수점 자리수 (기본값: 2)
 * @param {string} locale - 언어 코드 (기본값: 현재 설정 언어)
 * @returns {string} 현지화된 파일 크기 문자열
 *
 * @example
 * formatFileSize(1234567)
 * // 한국어: 1.18 MB
 * // 영어: 1.18 MB
 * // 아랍어: ١٫١٨ MB
 */
function formatFileSize(bytes, options = {}, locale = null) {
  try {
    const numBytes = Number(bytes);
    if (isNaN(numBytes) || numBytes < 0) {
      console.error('[MyMind3 Intl] Invalid file size:', bytes);
      return String(bytes);
    }

    const decimals = options.decimals || 2;
    const currentLocale = locale || getCurrentLanguage();

    if (numBytes === 0) {
      return '0 Bytes';
    }

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    const value = numBytes / Math.pow(k, i);

    // 숫자 부분만 현지화
    const formattedNumber = formatNumber(value, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }, currentLocale);

    return `${formattedNumber} ${sizes[i]}`;

  } catch (error) {
    console.error('[MyMind3 Intl] File size formatting error:', error);
    return String(bytes);
  }
}

/**
 * 언어 변경 이벤트 리스너 등록
 * 언어가 변경되면 자동으로 콜백 함수 실행
 * @param {Function} callback - 언어 변경 시 실행할 함수
 */
function onLanguageChange(callback) {
  if (typeof callback !== 'function') {
    console.error('[MyMind3 Intl] onLanguageChange requires a function');
    return;
  }

  // localStorage 변경 감지
  window.addEventListener('storage', (event) => {
    if (event.key === 'mymind3_settings') {
      try {
        const newSettings = JSON.parse(event.newValue || '{}');
        const oldSettings = JSON.parse(event.oldValue || '{}');

        if (newSettings.appLanguage !== oldSettings.appLanguage) {
          callback(newSettings.appLanguage, oldSettings.appLanguage);
        }
      } catch (error) {
        console.error('[MyMind3 Intl] Language change detection error:', error);
      }
    }
  });

  // 커스텀 이벤트 감지 (동일 탭 내 변경)
  window.addEventListener('mymind3-language-change', (event) => {
    callback(event.detail.newLang, event.detail.oldLang);
  });
}

/**
 * 언어 변경 이벤트 발생
 * @param {string} newLang - 새로운 언어 코드
 * @param {string} oldLang - 이전 언어 코드
 */
function dispatchLanguageChange(newLang, oldLang) {
  const event = new CustomEvent('mymind3-language-change', {
    detail: { newLang, oldLang }
  });
  window.dispatchEvent(event);
}

// ============================================
// Phase 1: 단위 국제화 (Unit Internationalization)
// ============================================

/**
 * 로케일별 기본 단위 매핑
 * 서버 API(/api/i18n/units)에서 로드 전 클라이언트 폴백으로 사용
 */
const LOCALE_UNIT_MAP = {
  'ko': { temperature: 'celsius', distance: 'km', weight: 'kg', volume: 'L', speed: 'km/h', area: 'm2', time: '24h' },
  'en': { temperature: 'fahrenheit', distance: 'mi', weight: 'lb', volume: 'gal', speed: 'mph', area: 'ft2', time: '12h' },
  'zh-CN': { temperature: 'celsius', distance: 'km', weight: 'kg', volume: 'L', speed: 'km/h', area: 'm2', time: '24h' },
  'es': { temperature: 'celsius', distance: 'km', weight: 'kg', volume: 'L', speed: 'km/h', area: 'm2', time: '24h' },
  'hi': { temperature: 'celsius', distance: 'km', weight: 'kg', volume: 'L', speed: 'km/h', area: 'm2', time: '12h' },
  'ar': { temperature: 'celsius', distance: 'km', weight: 'kg', volume: 'L', speed: 'km/h', area: 'm2', time: '12h' },
  'pt': { temperature: 'celsius', distance: 'km', weight: 'kg', volume: 'L', speed: 'km/h', area: 'm2', time: '24h' },
  'fr': { temperature: 'celsius', distance: 'km', weight: 'kg', volume: 'L', speed: 'km/h', area: 'm2', time: '24h' },
  'ru': { temperature: 'celsius', distance: 'km', weight: 'kg', volume: 'L', speed: 'km/h', area: 'm2', time: '24h' },
  'ja': { temperature: 'celsius', distance: 'km', weight: 'kg', volume: 'L', speed: 'km/h', area: 'm2', time: '24h' },
  'de': { temperature: 'celsius', distance: 'km', weight: 'kg', volume: 'L', speed: 'km/h', area: 'm2', time: '24h' }
};

/**
 * 단위 변환 계수 (기준: 미터법)
 * fromMetric: 미터법 → 대상 단위 변환 시 곱할 값
 * toMetric: 대상 단위 → 미터법 변환 시 곱할 값
 */
const CONVERSION_FACTORS = {
  temperature: {
    celsius: { toMetric: (v) => v, fromMetric: (v) => v },
    fahrenheit: { toMetric: (v) => (v - 32) * 5 / 9, fromMetric: (v) => v * 9 / 5 + 32 }
  },
  distance: {
    km: { toMetric: 1, fromMetric: 1 },
    mi: { toMetric: 1.60934, fromMetric: 1 / 1.60934 },
    m: { toMetric: 0.001, fromMetric: 1000 },
    ft: { toMetric: 0.0003048, fromMetric: 3280.84 }
  },
  weight: {
    kg: { toMetric: 1, fromMetric: 1 },
    lb: { toMetric: 0.453592, fromMetric: 2.20462 },
    g: { toMetric: 0.001, fromMetric: 1000 },
    oz: { toMetric: 0.0283495, fromMetric: 35.274 }
  },
  volume: {
    L: { toMetric: 1, fromMetric: 1 },
    gal: { toMetric: 3.78541, fromMetric: 0.264172 },
    ml: { toMetric: 0.001, fromMetric: 1000 },
    'fl oz': { toMetric: 0.0295735, fromMetric: 33.814 }
  },
  speed: {
    'km/h': { toMetric: 1, fromMetric: 1 },
    mph: { toMetric: 1.60934, fromMetric: 1 / 1.60934 },
    'm/s': { toMetric: 3.6, fromMetric: 1 / 3.6 }
  },
  area: {
    m2: { toMetric: 1, fromMetric: 1 },
    ft2: { toMetric: 0.092903, fromMetric: 10.7639 },
    'pyeong': { toMetric: 3.30579, fromMetric: 1 / 3.30579 }
  }
};

/**
 * 단위 표시 이름 (i18n 키 매핑)
 */
const UNIT_LABELS = {
  temperature: { celsius: '°C', fahrenheit: '°F' },
  distance: { km: 'km', mi: 'mi', m: 'm', ft: 'ft' },
  weight: { kg: 'kg', lb: 'lb', g: 'g', oz: 'oz' },
  volume: { L: 'L', gal: 'gal', ml: 'ml', 'fl oz': 'fl oz' },
  speed: { 'km/h': 'km/h', mph: 'mph', 'm/s': 'm/s' },
  area: { m2: 'm\u00B2', ft2: 'ft\u00B2', pyeong: '\uD3C9' }
};

// 서버에서 로드한 단위 환경설정 캐시
let _unitPreferencesCache = null;

/**
 * 서버에서 단위 환경설정 로드
 * @param {string} langCode - 언어 코드 (생략 시 현재 언어)
 * @returns {Promise<Object>} 단위 환경설정 객체
 */
async function loadUnitPreferences(langCode = null) {
  const lang = langCode || getCurrentLanguage();
  try {
    const response = await fetch(`/api/i18n/units/${lang}`);
    const data = await response.json();
    if (data.success && data.preference) {
      _unitPreferencesCache = data.preference;
      return data.preference;
    }
  } catch (error) {
    console.warn('[MyMind3 Intl] 서버 단위 설정 로드 실패, 클라이언트 폴백 사용:', error);
  }
  // 폴백: 클라이언트 기본값
  _unitPreferencesCache = null;
  return null;
}

/**
 * 현재 로케일의 단위 환경설정 가져오기
 * @param {string} langCode - 언어 코드 (생략 시 현재 언어)
 * @returns {Object} 단위 환경설정 { temperature, distance, weight, volume, speed, area, time }
 */
function getUnitPreferences(langCode = null) {
  const lang = langCode || getCurrentLanguage();

  // 서버 캐시가 있고 같은 언어이면 사용
  if (_unitPreferencesCache && _unitPreferencesCache.lang_code === lang) {
    return {
      temperature: _unitPreferencesCache.temperature_unit,
      distance: _unitPreferencesCache.distance_unit,
      weight: _unitPreferencesCache.weight_unit,
      volume: _unitPreferencesCache.volume_unit,
      speed: _unitPreferencesCache.speed_unit,
      area: _unitPreferencesCache.area_unit,
      time: _unitPreferencesCache.time_format
    };
  }

  // 클라이언트 폴백
  return LOCALE_UNIT_MAP[lang] || LOCALE_UNIT_MAP['en'];
}

/**
 * 단위 변환
 * @param {number} value - 변환할 값
 * @param {string} category - 단위 카테고리 ('temperature', 'distance', 'weight', 'volume', 'speed', 'area')
 * @param {string} fromUnit - 원본 단위
 * @param {string} toUnit - 대상 단위
 * @returns {number} 변환된 값
 *
 * @example
 * convertUnit(100, 'temperature', 'celsius', 'fahrenheit') // 212
 * convertUnit(10, 'distance', 'km', 'mi') // 6.21371
 */
function convertUnit(value, category, fromUnit, toUnit) {
  if (fromUnit === toUnit) return value;

  const factors = CONVERSION_FACTORS[category];
  if (!factors) {
    console.error('[MyMind3 Intl] 알 수 없는 단위 카테고리:', category);
    return value;
  }

  const from = factors[fromUnit];
  const to = factors[toUnit];
  if (!from || !to) {
    console.error('[MyMind3 Intl] 알 수 없는 단위:', fromUnit, '->', toUnit);
    return value;
  }

  // 온도는 함수 기반 변환
  if (category === 'temperature') {
    const metricValue = typeof from.toMetric === 'function' ? from.toMetric(value) : value * from.toMetric;
    return typeof to.fromMetric === 'function' ? to.fromMetric(metricValue) : metricValue * to.fromMetric;
  }

  // 일반: 원본 → 미터법(기준) → 대상
  const metricValue = value * from.toMetric;
  return metricValue * to.fromMetric;
}

/**
 * 단위 포맷팅 (값 + 현지화된 단위 표시)
 * @param {number} value - 포맷팅할 값
 * @param {string} category - 단위 카테고리 ('temperature', 'distance', 'weight', 'volume', 'speed', 'area')
 * @param {Object} options - 옵션
 * @param {string} options.sourceUnit - 원본 단위 (기본: 미터법 기준)
 * @param {boolean} options.autoConvert - 로케일 단위로 자동 변환 (기본: true)
 * @param {number} options.decimals - 소수점 자리수 (기본: 카테고리별 기본값)
 * @param {string} locale - 언어 코드
 * @returns {string} 포맷팅된 값 + 단위 문자열
 *
 * @example
 * formatUnit(100, 'distance') // 한국: "100 km", 미국: "62.14 mi"
 * formatUnit(36.5, 'temperature', { sourceUnit: 'celsius' }) // 한국: "36.5°C", 미국: "97.7°F"
 * formatUnit(70, 'weight') // 한국: "70 kg", 미국: "154.32 lb"
 */
function formatUnit(value, category, options = {}, locale = null) {
  try {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      console.error('[MyMind3 Intl] formatUnit: 유효하지 않은 값:', value);
      return String(value);
    }

    const lang = locale || getCurrentLanguage();
    const prefs = getUnitPreferences(lang);
    const targetUnit = prefs[category];

    if (!targetUnit) {
      console.error('[MyMind3 Intl] formatUnit: 알 수 없는 카테고리:', category);
      return String(value);
    }

    // 기본 소수점 자리수
    const defaultDecimals = { temperature: 1, distance: 2, weight: 2, volume: 2, speed: 1, area: 2 };
    const decimals = options.decimals !== undefined ? options.decimals : (defaultDecimals[category] || 2);

    // 미터법 기준 단위
    const metricDefaults = { temperature: 'celsius', distance: 'km', weight: 'kg', volume: 'L', speed: 'km/h', area: 'm2' };
    const sourceUnit = options.sourceUnit || metricDefaults[category];

    // 자동 변환
    let displayValue = numValue;
    let displayUnit = sourceUnit;

    if (options.autoConvert !== false && sourceUnit !== targetUnit) {
      displayValue = convertUnit(numValue, category, sourceUnit, targetUnit);
      displayUnit = targetUnit;
    }

    // 숫자 포맷팅
    const formattedNumber = formatNumber(displayValue, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    }, lang);

    // 단위 라벨
    const label = (UNIT_LABELS[category] && UNIT_LABELS[category][displayUnit]) || displayUnit;

    // 온도는 숫자와 단위 사이 공백 없음
    if (category === 'temperature') {
      return `${formattedNumber}${label}`;
    }

    return `${formattedNumber} ${label}`;
  } catch (error) {
    console.error('[MyMind3 Intl] formatUnit 오류:', error);
    return String(value);
  }
}

/**
 * 시간 포맷팅 (12시간/24시간 자동 선택)
 * @param {Date|string|number} date - 포맷팅할 시간
 * @param {Object} options - 옵션
 * @param {boolean} options.showSeconds - 초 표시 여부 (기본: false)
 * @param {string} locale - 언어 코드
 * @returns {string} 현지화된 시간 문자열
 *
 * @example
 * formatTime(new Date()) // 한국: "14:30", 미국: "2:30 PM"
 */
function formatTime(date, options = {}, locale = null) {
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.error('[MyMind3 Intl] formatTime: 유효하지 않은 날짜:', date);
      return String(date);
    }

    const lang = locale || getCurrentLanguage();
    const prefs = getUnitPreferences(lang);
    const is24h = prefs.time === '24h';

    const timeOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: !is24h
    };

    if (options.showSeconds) {
      timeOptions.second = '2-digit';
    }

    const formatter = new Intl.DateTimeFormat(lang, timeOptions);
    return formatter.format(dateObj);
  } catch (error) {
    console.error('[MyMind3 Intl] formatTime 오류:', error);
    return String(date);
  }
}

// ============================================
// Export functions (모듈 및 전역 스코프)
// ============================================

// 전역 네임스페이스에 추가
if (typeof window !== 'undefined') {
  window.MyMind3 = window.MyMind3 || {};
  window.MyMind3.Intl = {
    getCurrentLanguage,
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    formatFileSize,
    onLanguageChange,
    dispatchLanguageChange,
    // Phase 1: 단위 국제화
    LOCALE_UNIT_MAP,
    CONVERSION_FACTORS,
    UNIT_LABELS,
    loadUnitPreferences,
    getUnitPreferences,
    convertUnit,
    formatUnit,
    formatTime
  };

  console.log('[MyMind3 Intl] Internationalization utilities loaded successfully');
}

// ES6 모듈 export (필요 시)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getCurrentLanguage,
    formatDate,
    formatNumber,
    formatCurrency,
    formatRelativeTime,
    formatFileSize,
    onLanguageChange,
    dispatchLanguageChange,
    // Phase 1: 단위 국제화
    LOCALE_UNIT_MAP,
    CONVERSION_FACTORS,
    UNIT_LABELS,
    loadUnitPreferences,
    getUnitPreferences,
    convertUnit,
    formatUnit,
    formatTime
  };
}
