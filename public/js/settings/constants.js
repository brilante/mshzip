/**
 * 결제 시스템 상수 모듈
 * @module settings/constants
 * @description 크레딧 가격 시스템 상수 v7.0
 */
(function() {
  'use strict';

  const t = window.t || ((k, fb) => fb);

  // =====================================================
  // 크레딧 가격 시스템 상수 v7.0 (2026-01-05)
  // =====================================================
  const USAGE_PER_USD = 100000;  // $1 = 100,000 사용량
  const VAT_RATE = 0.10;  // 부가가치세 10%

  // 폴백 패키지 정의 (API 로드 전 또는 실패 시 사용)
  const FALLBACK_PACKAGES = {
    'lite': {
      name: t('packageLiteName', '라이트'),
      displayName: t('packageLiteDisplayName', '라이트'),
      basePrice: 3.30,
      priceUSD: 3.63,
      baseUsage: 330000,
      bonusRate: 0.09,
      bonusUsage: 29700,
      totalUsage: 359700,
      expireDays: 30,
      target: t('packageLiteTarget', '개인/취미')
    },
    'standard': {
      name: t('packageStandardName', '스탠다드'),
      displayName: t('packageStandardDisplayName', '스탠다드'),
      basePrice: 11.00,
      priceUSD: 12.10,
      baseUsage: 1100000,
      bonusRate: 0.07,
      bonusUsage: 77000,
      totalUsage: 1177000,
      expireDays: 30,
      target: t('packageStandardTarget', '일반 사용자')
    },
    'pro': {
      name: t('packageProName', '프로'),
      displayName: t('packageProDisplayName', '프로'),
      basePrice: 22.00,
      priceUSD: 24.20,
      baseUsage: 2200000,
      bonusRate: 0.05,
      bonusUsage: 110000,
      totalUsage: 2310000,
      expireDays: 30,
      target: t('packageProTarget', '헤비 유저')
    },
    'max': {
      name: t('packageMaxName', '멕스'),
      displayName: t('packageMaxDisplayName', '멕스'),
      basePrice: 44.00,
      priceUSD: 48.40,
      baseUsage: 4400000,
      bonusRate: 0.03,
      bonusUsage: 132000,
      totalUsage: 4532000,
      expireDays: 30,
      target: t('packageMaxTarget', '헤비 유저/기업')
    }
  };

  // 기존 패키지 ID 매핑 (하위 호환성)
  const PACKAGE_ID_MAP = {
    'plus10': 'lite',
    'plus30': 'standard',
    'plus60': 'pro',
    'plus90': 'max'
  };

  // 패키지 레벨 정의 (업그레이드 판단용)
  const PACKAGE_LEVELS = {
    'lite': 1,
    'standard': 2,
    'pro': 3,
    'max': 4
  };

  // 가격 값을 패키지 타입으로 변환하는 매핑 (v7.0 가격)
  const PRICE_TO_PACKAGE_TYPE = {
    '3.63': 'lite',
    '12.10': 'standard',
    '24.20': 'pro',
    '48.40': 'max'
  };

  // 통화별 기호 및 소수점 정보
  const CURRENCY_INFO = {
    'USD': { symbol: '$', decimals: 2, prefix: true },
    'KRW': { symbol: '₩', decimals: 0, prefix: true },
    'JPY': { symbol: '¥', decimals: 0, prefix: true },
    'EUR': { symbol: '€', decimals: 2, prefix: true },
    'GBP': { symbol: '£', decimals: 2, prefix: true },
    'CNY': { symbol: '¥', decimals: 2, prefix: true }
  };

  // 통화별 이름 매핑
  const CURRENCY_NAMES = {
    'USD': t('currencyUSD', '미국 달러 ($)'),
    'KRW': t('currencyKRW', '한국 원 (₩)'),
    'JPY': t('currencyJPY', '일본 엔 (¥)'),
    'EUR': t('currencyEUR', '유로 (€)'),
    'GBP': t('currencyGBP', '영국 파운드 (£)'),
    'CNY': t('currencyCNY', '중국 위안 (¥)')
  };

  // 전역으로 노출
  window.PaymentConstants = {
    USAGE_PER_USD,
    VAT_RATE,
    FALLBACK_PACKAGES,
    PACKAGE_ID_MAP,
    PACKAGE_LEVELS,
    PRICE_TO_PACKAGE_TYPE,
    CURRENCY_INFO,
    CURRENCY_NAMES
  };

  console.log('[PaymentConstants] 결제 상수 모듈 로드 완료');
})();
