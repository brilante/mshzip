/**
 * 패키지 계산 모듈
 * @module settings/package-calc
 * @description 구독 패키지 정보 계산 및 관리
 */
(function() {
  'use strict';

  const t = window.t || ((k, fb) => fb);

  // PaymentConstants가 로드되었는지 확인
  const getConstants = () => window.PaymentConstants || {};

  /**
   * 패키지 정의 getter 함수 - 항상 최신 값 반환
   * @returns {object} 패키지 정의 객체
   */
  function getPackageDefinitions() {
    const constants = getConstants();
    return (window.MyMind3 && window.MyMind3.Constants && window.MyMind3.Constants.PACKAGES)
      ? window.MyMind3.Constants.PACKAGES
      : constants.FALLBACK_PACKAGES || {};
  }

  // 패키지 정의 캐시
  let PACKAGE_DEFINITIONS = null;
  let SUBSCRIPTION_PACKAGES = null;

  /**
   * 패키지 정보 계산 함수
   * @param {string} packageType - 패키지 타입 (lite, standard, pro, max)
   * @returns {object|null} 패키지 정보 또는 null
   */
  function calculatePackageInfo(packageType) {
    const constants = getConstants();
    const PACKAGE_ID_MAP = constants.PACKAGE_ID_MAP || {};

    // 기존 ID를 신규 ID로 변환
    const mappedType = PACKAGE_ID_MAP[packageType] || packageType;
    const defs = getPackageDefinitions();
    const def = defs[mappedType];
    if (!def) return null;

    return {
      price: def.priceUSD,
      priceUSD: def.priceUSD,
      baseUsage: def.baseUsage,
      bonusRate: def.bonusRate,
      bonusUsage: def.bonusUsage,
      totalUsage: def.totalUsage,
      // 하위 호환성
      paidCredits: def.baseUsage,
      totalCredits: def.totalUsage,
      name: def.name,
      expireDays: def.expireDays
    };
  }

  /**
   * 패키지 정보 재계산 (API 로드 후 호출)
   */
  function refreshPackageDefinitions() {
    PACKAGE_DEFINITIONS = getPackageDefinitions();
    SUBSCRIPTION_PACKAGES = {
      'lite': calculatePackageInfo('lite'),
      'standard': calculatePackageInfo('standard'),
      'pro': calculatePackageInfo('pro'),
      'max': calculatePackageInfo('max')
    };
    console.log('[PackageCalc] 패키지 정보 새로고침 완료');
  }

  /**
   * 현재 패키지 정의 가져오기
   * @returns {object} 패키지 정의 객체
   */
  function getCurrentPackageDefinitions() {
    if (!PACKAGE_DEFINITIONS) {
      PACKAGE_DEFINITIONS = getPackageDefinitions();
    }
    return PACKAGE_DEFINITIONS;
  }

  /**
   * 현재 구독 패키지 정보 가져오기
   * @returns {object} 구독 패키지 정보 객체
   */
  function getSubscriptionPackages() {
    if (!SUBSCRIPTION_PACKAGES) {
      refreshPackageDefinitions();
    }
    return SUBSCRIPTION_PACKAGES;
  }

  /**
   * 패키지 선택 가능 여부 확인
   * @param {string} targetPackage - 선택하려는 패키지
   * @param {string} currentPackage - 현재 구독 중인 패키지
   * @param {string} subscriptionStatus - 구독 상태
   * @returns {object} { enabled: boolean, reason: string, action: string }
   */
  function isPackageSelectable(targetPackage, currentPackage, subscriptionStatus) {
    const constants = getConstants();
    const PACKAGE_LEVELS = constants.PACKAGE_LEVELS || {};

    // 미구독/만료/취소 상태: 모든 패키지 선택 가능 (취소 = 아무것도 구매하지 않은 상태)
    if (subscriptionStatus === 'inactive' || subscriptionStatus === 'cancelled' || !currentPackage) {
      return { enabled: true, reason: null, action: 'subscribe' };
    }

    const targetLevel = PACKAGE_LEVELS[targetPackage];
    const currentLevel = PACKAGE_LEVELS[currentPackage];

    // 활성 구독 상태만 특별 처리
    if (subscriptionStatus === 'active') {
      if (targetLevel < currentLevel) {
        return {
          enabled: false,
          reason: t('packageDowngradeReason', '하위 패키지는 구독 취소 후 재가입 필요'),
          action: 'blocked'
        };
      }
      if (targetLevel === currentLevel) {
        return {
          enabled: false,
          reason: t('packageCurrentReason', '현재 구독 중인 패키지입니다'),
          action: 'current'
        };
      }
      return { enabled: true, reason: t('packageUpgradeReason', '업그레이드 가능'), action: 'upgrade' };
    }

    return { enabled: true, reason: null, action: 'subscribe' };
  }

  // 초기 로드
  refreshPackageDefinitions();

  // 전역으로 노출
  window.PackageCalc = {
    getPackageDefinitions,
    calculatePackageInfo,
    refreshPackageDefinitions,
    getCurrentPackageDefinitions,
    getSubscriptionPackages,
    isPackageSelectable
  };

  // 기존 전역 함수 호환성 유지
  window.calculatePackageInfo = calculatePackageInfo;
  window.refreshPackageDefinitions = refreshPackageDefinitions;
  window.isPackageSelectable = isPackageSelectable;

  console.log('[PackageCalc] 패키지 계산 모듈 로드 완료');
})();
