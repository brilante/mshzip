'use strict';

/**
 * 환율/패키지 가격 API 스텁
 * 원본: src/api/exchange.js (DB 기반)
 * 스텁: FALLBACK_PACKAGES 상수 기반 정적 데이터 반환
 * @updated 2026-02-25
 */

const express = require('express');
const router = express.Router();

// =====================================================
// 패키지 데이터 (constants.js FALLBACK_PACKAGES와 동일)
// v7.0 (2026-01-05)
// =====================================================
const PACKAGES = {
  'lite': {
    package_type: 'lite',
    name: 'Lite',
    display_name: '라이트',
    base_price: 3.30,
    price_usd: 3.63,
    base_usage: 330000,
    bonus_rate: 0.09,
    bonus_usage: 29700,
    total_usage: 359700,
    expire_days: 30,
    target: '개인/취미',
    sort_order: 1,
    is_popular: 1
  },
  'standard': {
    package_type: 'standard',
    name: 'Standard',
    display_name: '스탠다드',
    base_price: 11.00,
    price_usd: 12.10,
    base_usage: 1100000,
    bonus_rate: 0.07,
    bonus_usage: 77000,
    total_usage: 1177000,
    expire_days: 30,
    target: '일반 사용자',
    sort_order: 2,
    is_popular: 0
  },
  'pro': {
    package_type: 'pro',
    name: 'Pro',
    display_name: '프로',
    base_price: 22.00,
    price_usd: 24.20,
    base_usage: 2200000,
    bonus_rate: 0.05,
    bonus_usage: 110000,
    total_usage: 2310000,
    expire_days: 30,
    target: '헤비 유저',
    sort_order: 3,
    is_popular: 0
  },
  'max': {
    package_type: 'max',
    name: 'Max',
    display_name: '멕스',
    base_price: 44.00,
    price_usd: 48.40,
    base_usage: 4400000,
    bonus_rate: 0.03,
    bonus_usage: 132000,
    total_usage: 4532000,
    expire_days: 30,
    target: '헤비 유저/기업',
    sort_order: 4,
    is_popular: 0
  }
};

// 환율 데이터 (스텁: USD 기준, 고정값)
const EXCHANGE_RATES = {
  'USD': { rate: 1, currency_name: 'US Dollar' },
  'KRW': { rate: 1450, currency_name: 'Korean Won' },
  'JPY': { rate: 155, currency_name: 'Japanese Yen' },
  'EUR': { rate: 0.92, currency_name: 'Euro' },
  'GBP': { rate: 0.79, currency_name: 'British Pound' },
  'CNY': { rate: 7.25, currency_name: 'Chinese Yuan' }
};

// 통화별 로케일 매핑
const LOCALE_MAP = {
  KRW: 'ko-KR',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
  EUR: 'de-DE',
  GBP: 'en-GB',
  USD: 'en-US'
};

/**
 * 가격 포맷팅 함수
 */
function formatPrice(amount, currency) {
  const locale = LOCALE_MAP[currency] || 'en-US';
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: ['KRW', 'JPY'].includes(currency) ? 0 : 2,
      maximumFractionDigits: ['KRW', 'JPY'].includes(currency) ? 0 : 2
    }).format(amount);
  } catch (e) {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * GET /api/exchange/rates
 * 모든 환율 조회
 */
router.get('/rates', (req, res) => {
  const rates = Object.entries(EXCHANGE_RATES).map(([code, data]) => ({
    currency_code: code,
    currency_name: data.currency_name,
    rate: data.rate,
    updated_at: new Date().toISOString()
  }));

  res.json({
    success: true,
    data: rates,
    base_currency: 'USD'
  });
});

/**
 * GET /api/exchange/rate/:currency
 * 특정 통화 환율 조회
 */
router.get('/rate/:currency', (req, res) => {
  const { currency } = req.params;
  const code = currency.toUpperCase();
  const rateData = EXCHANGE_RATES[code];

  if (!rateData) {
    return res.status(404).json({
      success: false,
      error: '해당 통화를 찾을 수 없습니다.'
    });
  }

  res.json({
    success: true,
    data: {
      currency_code: code,
      currency_name: rateData.currency_name,
      rate: rateData.rate,
      updated_at: new Date().toISOString()
    },
    base_currency: 'USD'
  });
});

/**
 * GET /api/exchange/packages
 * 구독 패키지 가격을 특정 통화로 변환하여 반환
 * 원본과 동일한 응답 형식
 */
router.get('/packages', (req, res) => {
  const { currency = 'USD' } = req.query;
  const code = currency.toUpperCase();

  // 환율 조회
  const rateData = EXCHANGE_RATES[code];
  if (!rateData) {
    return res.status(404).json({
      success: false,
      error: `${currency} 통화를 찾을 수 없습니다.`
    });
  }
  const rate = rateData.rate;

  // 패키지 이름 키 매핑
  const nameKeyMap = {
    'lite': 'subscriptionLite',
    'standard': 'subscriptionStandard',
    'pro': 'subscriptionPro',
    'max': 'subscriptionMax'
  };

  const userTypeKeyMap = {
    'lite': 'hobbyUser',
    'standard': 'regularUser',
    'pro': 'heavyUser',
    'max': 'enterpriseUser'
  };

  // 패키지 데이터 변환
  const packages = Object.values(PACKAGES)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(pkg => {
      const localPrice = pkg.price_usd * rate;

      return {
        id: pkg.package_type,
        name_key: nameKeyMap[pkg.package_type],
        base_price_usd: pkg.base_price,
        price_usd: pkg.price_usd,
        base_usage: pkg.base_usage,
        bonus_rate: pkg.bonus_rate,
        bonus_usage: pkg.bonus_usage,
        total_usage: pkg.total_usage,
        expire_days: pkg.expire_days,
        user_type_key: userTypeKeyMap[pkg.package_type],
        badge: pkg.is_popular ? 'popularBadge' : null,
        target: pkg.target,
        usage: {
          base: pkg.base_usage,
          bonus: pkg.bonus_usage,
          total: pkg.total_usage
        },
        credits: {
          paid: pkg.base_usage,
          bonus: pkg.bonus_usage,
          total: pkg.total_usage
        },
        price: formatPrice(localPrice, code),
        price_raw: Math.round(localPrice * 100) / 100
      };
    });

  res.json({
    success: true,
    data: {
      currency: code,
      rate: rate,
      updated_at: new Date().toISOString(),
      packages: packages
    }
  });
});

/**
 * POST /api/exchange/convert
 * 가격 변환 (USD -> 선택한 통화)
 */
router.post('/convert', (req, res) => {
  const { amount, from = 'USD', to } = req.body;

  if (!amount || !to) {
    return res.status(400).json({
      success: false,
      error: 'amount와 to 파라미터가 필요합니다.'
    });
  }

  const fromRate = EXCHANGE_RATES[from.toUpperCase()]?.rate || 1;
  const toRate = EXCHANGE_RATES[to.toUpperCase()]?.rate;

  if (!toRate) {
    return res.status(404).json({
      success: false,
      error: `${to} 통화를 찾을 수 없습니다.`
    });
  }

  const amountInUSD = amount / fromRate;
  const convertedAmount = amountInUSD * toRate;

  res.json({
    success: true,
    data: {
      original: { amount, currency: from },
      converted: {
        amount: Math.round(convertedAmount * 100) / 100,
        currency: to
      },
      rate: toRate / fromRate
    }
  });
});

/**
 * GET /api/exchange/last-update
 * 마지막 환율 업데이트 시간 조회
 */
router.get('/last-update', (req, res) => {
  res.json({
    success: true,
    data: {
      last_update: new Date().toISOString()
    }
  });
});

module.exports = router;
