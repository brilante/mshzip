// =====================================================
// 결제 페이지 로직 v5.1 (Phase 5-2 모듈화)
// =====================================================
(function() {
  'use strict';

  // i18n 안전 래퍼: i18n-init.js가 defer로 로드되어 아직 없을 수 있음
  function t(key, fallback) { return (typeof window.t === 'function') ? window.t(key, fallback) : (fallback || key); }
  // i18n 숫자 포맷 헬퍼
  function _fmtN(n, opts) { const i = window.MyMind3?.Intl; return i ? i.formatNumber(n, opts) : Number(n).toLocaleString(); }

  // =====================================================
  // Phase 5-2: 모듈에서 상수 로드 (하위 호환성 유지)
  // 모듈이 로드되어 있으면 모듈 사용, 아니면 로컬 정의
  // =====================================================

  // 상수 모듈에서 가져오기 (로드되어 있으면)
  const PC = window.PaymentConstants || {};
  const CU = window.CurrencyUtils || {};
  const PKG = window.PackageCalc || {};

  // 크레딧 가격 시스템 상수 v7.0 (모듈 폴백)
  const USAGE_PER_USD = PC.USAGE_PER_USD || 100000;  // $1 = 100,000 사용량
  const VAT_RATE = PC.VAT_RATE || 0.10;  // 부가가치세 10%

  // v7.1 구독 패키지 정의 - MyMind3.Constants.PACKAGES에서 가져옴
  // 단일 진실 소스: public/js/core/constants.js (API에서 동적 로드)
  // Phase 5-2: 모듈에서 상수 로드 (하위 호환성 유지)

  // 폴백 값 정의 (모듈에서 로드 또는 로컬 정의)
  const FALLBACK_PACKAGES = PC.FALLBACK_PACKAGES || {
    'lite': { name: t('paymentPkgLite', '라이트'), priceUSD: 3.63, baseUsage: 330000, bonusRate: 0.09, bonusUsage: 29700, totalUsage: 359700, expireDays: 30, autopayBonusRate: 0.09 },
    'standard': { name: t('paymentPkgStandard', '스탠다드'), priceUSD: 12.10, baseUsage: 1100000, bonusRate: 0.07, bonusUsage: 77000, totalUsage: 1177000, expireDays: 30, autopayBonusRate: 0.09 },
    'pro': { name: t('paymentPkgPro', '프로'), priceUSD: 24.20, baseUsage: 2200000, bonusRate: 0.05, bonusUsage: 110000, totalUsage: 2310000, expireDays: 30, autopayBonusRate: 0.09 },
    'max': { name: t('paymentPkgMax', '멕스'), priceUSD: 48.40, baseUsage: 4400000, bonusRate: 0.03, bonusUsage: 132000, totalUsage: 4532000, expireDays: 30, autopayBonusRate: 0.09 }
  };

  // 패키지 정의 getter 함수 (모듈 우선 사용)
  const getPackageDefinitions = PKG.getPackageDefinitions || function() {
    return (window.MyMind3 && window.MyMind3.Constants && window.MyMind3.Constants.PACKAGES)
      ? window.MyMind3.Constants.PACKAGES
      : FALLBACK_PACKAGES;
  };

  // 하위 호환성: PACKAGE_DEFINITIONS 변수도 유지
  let PACKAGE_DEFINITIONS = getPackageDefinitions();

  // 기존 패키지 ID 매핑 (모듈에서 로드 또는 로컬 정의)
  const PACKAGE_ID_MAP = PC.PACKAGE_ID_MAP || {
    'plus10': 'lite',
    'plus30': 'standard',
    'plus60': 'pro',
    'plus90': 'max'
  };

  // 패키지 정보 계산 함수 (v5.0)
  function calculatePackageInfo(packageType) {
    // 기존 ID를 신규 ID로 변환
    const mappedType = PACKAGE_ID_MAP[packageType] || packageType;
    const def = PACKAGE_DEFINITIONS[mappedType];
    if (!def) return null;

    return {
      price: def.priceUSD,
      priceUSD: def.priceUSD,
      baseUsage: def.baseUsage,
      bonusRate: def.bonusRate,
      bonusUsage: def.bonusUsage,
      totalUsage: def.totalUsage,
      autopayBonusRate: def.autopayBonusRate ?? 0,
      // 하위 호환성
      paidCredits: def.baseUsage,
      totalCredits: def.totalUsage,
      name: def.name,
      expireDays: def.expireDays
    };
  }

  // 구독 패키지 정보 (v7.0) - 초기화 시 재계산됨
  let SUBSCRIPTION_PACKAGES = {
    'lite': calculatePackageInfo('lite'),
    'standard': calculatePackageInfo('standard'),
    'pro': calculatePackageInfo('pro'),
    'max': calculatePackageInfo('max')  // v7.0: 멕스 추가
  };

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
    console.log('[Settings] 패키지 정보 새로고침 완료');
  }

  // 패키지 레벨 정의 (업그레이드 판단용)
  const PACKAGE_LEVELS = {
    'lite': 1,
    'standard': 2,
    'pro': 3,
    'max': 4  // v7.0: 멕스 추가
  };

  // 가격 값을 패키지 타입으로 변환하는 매핑 (v7.0 가격)
  const PRICE_TO_PACKAGE_TYPE = {
    '3.63': 'lite',
    '12.10': 'standard',
    '24.20': 'pro',
    '48.40': 'max'  // v7.0: 멕스 추가
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

  /**
   * USD 가격을 지정된 통화로 환산
   * @param {number} usdPrice - USD 가격
   * @param {string} currency - 대상 통화 코드
   * @param {number} exchangeRate - 환율 (1 USD = x 통화)
   * @returns {string} 포맷된 가격 문자열
   */
  function formatPriceInCurrency(usdPrice, currency = 'USD', exchangeRate = 1) {
    const info = CURRENCY_INFO[currency] || CURRENCY_INFO['USD'];
    const convertedPrice = usdPrice * exchangeRate;
    const formattedNumber = convertedPrice.toFixed(info.decimals);

    // 천단위 구분자 적용
    const parts = formattedNumber.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const numberStr = parts.join('.');

    return info.prefix ? `${info.symbol}${numberStr}` : `${numberStr}${info.symbol}`;
  }

  /**
   * 잔액/사용량 포맷팅 (Phase 7)
   * v5.0: 큰 숫자를 읽기 쉬운 형태로 표시
   *
   * 규칙:
   * - 1,000,000 이상: X.XXM (예: 1,019,700 → 1.02M)
   * - 1,000 이상: X.XK (예: 100,000 → 100K)
   * - 1,000 미만: 원본 숫자
   *
   * @param {number} balance - 잔액/사용량
   * @param {boolean} showFull - true면 전체 숫자도 함께 표시
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
    return _fmtN(num);
  }

  /**
   * 잔액 상세 포맷팅 (전체 숫자 + 축약형)
   * @param {number} balance - 잔액
   * @returns {string} 예: "1,019,700 (1.02M)"
   */
  function formatBalanceDetail(balance) {
    if (balance == null || isNaN(balance)) return '0';

    const num = Math.floor(balance);
    const full = _fmtN(num);

    if (num >= 1000000) {
      const short = (num / 1000000).toFixed(2) + 'M';
      return `${full} (${short})`;
    } else if (num >= 10000) {
      const short = (num / 1000).toFixed(0) + 'K';
      return `${full} (${short})`;
    }
    return full;
  }

  // formatBalance를 전역으로 노출 (다른 모듈에서 사용 가능)
  window.formatBalance = formatBalance;
  window.formatBalanceDetail = formatBalanceDetail;

  /**
   * 패키지 카드의 사용량 값을 동적 업데이트
   *
   * v5.0 (2025-12-11) 재설계:
   * - 기본 사용량 = 기본가 × 100,000
   * - 보너스 사용량 = 기본 사용량 × 보너스율
   * - 총 사용량 = 기본 사용량 + 보너스 사용량
   *
   * @param {string} currency - 통화 코드 (기본: USD)
   * @param {number} exchangeRate - 환율 (기본: 1)
   */
  function updatePackageCreditsFromConstants(currency = 'USD', exchangeRate = 1) {
    const packageCards = document.querySelectorAll('input[name="subscription"][data-package-type]');

    packageCards.forEach(input => {
      const packageType = input.dataset.packageType;
      // v5.0: 기존 ID를 신규 ID로 매핑
      const mappedType = PACKAGE_ID_MAP[packageType] || packageType;
      const def = PACKAGE_DEFINITIONS[mappedType];

      if (!def) {
        console.warn(`[Settings] updatePackageCreditsFromConstants - 패키지 정보 없음: ${packageType}`);
        return;
      }

      // 부모 카드에서 사용량 값 요소 찾기
      const card = input.closest('.package-card');
      if (!card) return;

      // v5.0: 기본 사용량, 총 사용량 사용
      const baseUsage = def.baseUsage;
      const bonusUsage = def.bonusUsage;
      const bonusRate = def.bonusRate;
      const totalUsage = def.totalUsage;

      // HTML 요소 업데이트
      const baseEl = card.querySelector('.credit-value-base');
      const bonusEl = card.querySelector('.credit-value-bonus');
      const bonusRateEl = card.querySelector('.bonus-rate');
      const totalEl = card.querySelector('.credit-value-total');
      const autopayBonusEl = card.querySelector('.credit-value-autopay-bonus');
      const autopayBonusLine = card.querySelector('.credit-line.autopay-bonus');

      if (baseEl) baseEl.textContent = _fmtN(baseUsage);
      if (bonusEl) bonusEl.textContent = _fmtN(bonusUsage);
      // v6.5: 보너스율 동적 업데이트 (9%, 7%, 5%)
      if (bonusRateEl) bonusRateEl.textContent = Math.round(bonusRate * 100);

      // v8.6: 패키지별 차등 autopay 보너스 (적자 방지)
      const autopayCheckbox = document.getElementById('autopayCheckbox');
      const isAutopayEnabled = autopayCheckbox && autopayCheckbox.checked;
      const autopayBonusRate = def.autopayBonusRate ?? 0;
      const autopayBonus = isAutopayEnabled ? Math.floor(baseUsage * autopayBonusRate) : 0;
      const finalTotal = totalUsage + autopayBonus;

      if (autopayBonusEl) autopayBonusEl.textContent = _fmtN(autopayBonus);
      if (autopayBonusLine) {
        autopayBonusLine.style.display = isAutopayEnabled ? 'flex' : 'none';
      }
      if (totalEl) totalEl.textContent = _fmtN(finalTotal);

      console.log(`[Settings] 패키지 크레딧 업데이트: ${packageType}`, {
        currency,
        priceUSD: def.priceUSD,
        baseUsage: baseUsage,
        bonusRate: bonusRate,
        bonusUsage: bonusUsage,
        autopayBonus: autopayBonus,
        totalUsage: finalTotal
      });
    });
  }

  /**
   * 패키지 카드의 가격을 SUBSCRIPTION_PACKAGES 상수와 환율을 기반으로 동적 업데이트
   * @param {string} currency - 통화 코드 (기본: USD)
   * @param {number} exchangeRate - 환율 (기본: 1)
   */
  function updatePackagePricesFromConstants(currency = 'USD', exchangeRate = 1) {
    const packageCards = document.querySelectorAll('input[name="subscription"][data-package-type]');

    packageCards.forEach(input => {
      const packageType = input.dataset.packageType;
      const packageInfo = SUBSCRIPTION_PACKAGES[packageType];

      if (!packageInfo) {
        console.warn(`[Settings] updatePackagePricesFromConstants - 패키지 정보 없음: ${packageType}`);
        return;
      }

      // 부모 카드에서 가격 요소 찾기
      const card = input.closest('.package-card');
      if (!card) return;

      // 가격 요소 업데이트
      const priceEl = card.querySelector('.package-price');
      if (priceEl) {
        const formattedPrice = formatPriceInCurrency(packageInfo.priceUSD, currency, exchangeRate);
        // 기존 /월 텍스트 유지
        const smallEl = priceEl.querySelector('small');
        const perMonthText = smallEl ? smallEl.outerHTML : '<small>/월</small>';
        priceEl.innerHTML = `${formattedPrice}${perMonthText}`;
      }

      // input value도 USD 기준 가격으로 업데이트 (결제 시 USD 기준 사용)
      input.value = packageInfo.priceUSD.toFixed(2);

      console.log(`[Settings] 패키지 가격 업데이트: ${packageType}`, {
        priceUSD: packageInfo.priceUSD,
        currency: currency,
        exchangeRate: exchangeRate,
        convertedPrice: packageInfo.priceUSD * exchangeRate
      });
    });
  }

  /**
   * 크레딧과 가격을 모두 동적 업데이트하는 통합 함수
   * @param {string} currency - 통화 코드 (기본: USD)
   * @param {number} exchangeRate - 환율 (기본: 1)
   */
  function updateAllPackageValuesFromConstants(currency = 'USD', exchangeRate = 1) {
    // 환율 정보를 크레딧 계산에도 전달 (크레딧 단독 구매와 일관성 유지)
    updatePackageCreditsFromConstants(currency, exchangeRate);
    updatePackagePricesFromConstants(currency, exchangeRate);
  }

  // 통화 변경 이벤트 리스너 등록 여부 플래그
  let paymentCurrencyListenerInitialized = false;

  /**
   * 결제 통화 변경 이벤트 리스너 설정
   * 통화가 변경되면 패키지 가격과 크레딧을 즉시 업데이트
   */
  function setupPaymentCurrencyChangeListener() {
    const currencySelect = document.getElementById('paymentCurrency');
    if (!currencySelect) {
      console.warn('[Settings] paymentCurrency 셀렉트 박스를 찾을 수 없습니다.');
      return;
    }

    // 이미 리스너가 등록되어 있으면 중복 등록 방지
    if (paymentCurrencyListenerInitialized) {
      console.log('[Settings] 통화 변경 리스너가 이미 등록되어 있습니다.');
      return;
    }

    currencySelect.addEventListener('change', async function(e) {
      const newCurrency = e.target.value;
      console.log(`[Settings-Payment] 통화 변경 감지: ${newCurrency}`);

      // 환율 가져오기
      let exchangeRate = 1;
      try {
        const response = await fetch(`/api/exchange/rate/${newCurrency}`);
        if (response.ok) {
          const data = await response.json();
          // API 응답 형식: { success: true, data: { rate: 7.077939, ... } }
          exchangeRate = data.data?.rate || data.rate || 1;
          console.log(`[Settings-Payment] 환율 로드: ${newCurrency} = ${exchangeRate}`);
        }
      } catch (error) {
        console.warn('[Settings-Payment] 환율 로드 실패, 기본값 1 사용:', error);
      }

      // 패키지 크레딧만 업데이트 (가격은 settings-ai.js의 통화 변경 리스너에서 API로 업데이트됨)
      updatePackageCreditsFromConstants(newCurrency, exchangeRate);

      // 크레딧 구매 그리드 통화 업데이트 (10단계 시스템)
      window.currentCreditPurchaseCurrency = newCurrency;
      window.currentCreditPurchaseRate = exchangeRate;
      updateTierGridCurrency(newCurrency, exchangeRate);

      // 크레딧 미리보기도 업데이트
      if (typeof updateCreditPreview === 'function') {
        updateCreditPreview();
      }

      console.log(`[Settings-Payment] 패키지 크레딧 및 크레딧 구매 그리드 갱신 완료: ${newCurrency}`);
    });

    paymentCurrencyListenerInitialized = true;
    console.log('[Settings-Payment] 통화 변경 이벤트 리스너 등록 완료');
  }

  /**
   * 패키지 선택 가능 여부 확인
   * @param {string} targetPackage - 선택하려는 패키지
   * @param {string} currentPackage - 현재 구독 중인 패키지
   * @param {string} subscriptionStatus - 구독 상태 ('active', 'cancelled', 'inactive')
   * @returns {object} { enabled: boolean, reason: string, action: string }
   */
  function isPackageSelectable(targetPackage, currentPackage, subscriptionStatus) {
    // 미구독/만료/취소 상태: 모든 패키지 선택 가능 (취소 = 아무것도 구매하지 않은 상태)
    if (subscriptionStatus === 'inactive' || subscriptionStatus === 'cancelled' || subscriptionStatus === 'canceled' || !currentPackage) {
      return { enabled: true, reason: null, action: 'subscribe' };
    }

    const targetLevel = PACKAGE_LEVELS[targetPackage];
    const currentLevel = PACKAGE_LEVELS[currentPackage];

    // 활성 구독 상태만 특별 처리
    if (subscriptionStatus === 'active') {
      if (targetLevel < currentLevel) {
        // 하위 패키지 선택 불가 - 구독 취소 후 재가입 필요
        return {
          enabled: false,
          reason: t('paymentDowngradeBlocked', '하위 패키지는 구독 취소 후 재가입 필요'),
          action: 'blocked'
        };
      }
      if (targetLevel === currentLevel) {
        return {
          enabled: false,
          reason: t('paymentCurrentPackage', '현재 구독 중인 패키지입니다'),
          action: 'current'
        };
      }
      return { enabled: true, reason: t('paymentUpgradeAvailable', '업그레이드 가능'), action: 'upgrade' };
    }

    return { enabled: true, reason: null, action: 'subscribe' };
  }

  // 결제 통화 가져오기 (세 번째 IIFE의 currentAISettings 대신 localStorage 사용)
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

  // ========== 업그레이드 통화 처리 함수 (2025-11-29 추가) ==========

  // 통화별 이름 매핑
  const CURRENCY_NAMES = {
    'USD': t('paymentCurrencyUSD', '미국 달러 ($)'),
    'KRW': t('paymentCurrencyKRW', '한국 원 (₩)'),
    'JPY': t('paymentCurrencyJPY', '일본 엔 (¥)'),
    'EUR': t('paymentCurrencyEUR', '유로 (€)'),
    'GBP': t('paymentCurrencyGBP', '영국 파운드 (£)'),
    'CNY': t('paymentCurrencyCNY', '중국 위안 (¥)')
  };

  /**
   * 기존 구독의 결제 통화 조회
   * @returns {string|null} 기존 구독 통화 (JPY, KRW, USD 등) 또는 null (신규 구독)
   */
  function getOriginalSubscriptionCurrency() {
    const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');

    // 구독 중이 아니면 null 반환
    if (!subscription.isSubscribed) {
      return null;
    }

    // paymentHistory에서 가장 최근 subscription 타입 결제 찾기
    const history = subscription.paymentHistory || [];
    const lastSubscription = history.find(h => h.type === 'subscription');

    if (lastSubscription && lastSubscription.currency) {
      return lastSubscription.currency;
    }

    // 폴백: 기본 USD
    return 'USD';
  }

  /**
   * 다중 통화 결제 안내 모달 표시
   * 기존 구독과 다른 통화로 결제 시 안내 메시지 표시
   * @param {Object} options - 통화 정보
   * @returns {Promise<string>} 'current' (현재 선택 통화로 진행), 'original' (기존 통화로 변경), 'cancel' (취소)
   */
  function showCurrencyChangeConfirmModal(options) {
    return new Promise((resolve) => {
      // 기존 모달이 있으면 제거
      const existingModal = document.querySelector('.currency-change-modal');
      if (existingModal) {
        existingModal.remove();
      }

      const modal = document.createElement('div');
      modal.className = 'currency-change-modal';
      modal.innerHTML = `
        <div class="currency-change-modal-content">
          <div class="currency-modal-header">
            <span class="currency-warning-icon">${mmIcon('dollar-sign', 16)}</span>
            <h3>다중 통화 결제 안내</h3>
          </div>
          <div class="currency-modal-body">
            <p><strong>현재 선택한 통화:</strong> ${options.currentCurrencyName}</p>
            <p><strong>기존 구독 결제 통화:</strong> ${options.originalCurrencyName}</p>
            <hr>
            <p class="currency-info-text">
              기존 구독과 다른 통화로 업그레이드할 수 있습니다.<br>
              <small>• 모든 결제 금액은 USD 기준으로 계산됩니다.</small><br>
              <small>• 환불 시 각 결제의 원래 통화로 환불됩니다.</small>
            </p>
            <p style="margin-top: 12px;"><strong>어떻게 진행하시겠습니까?</strong></p>
          </div>
          <div class="currency-modal-footer" style="flex-direction: column; gap: 8px;">
            <button class="currency-btn-confirm" id="proceedCurrentCurrency" style="width: 100%;">
              ${options.currentCurrencyName}로 결제 진행
            </button>
            <button class="currency-btn-secondary" id="changeToOriginalCurrency" style="width: 100%; background: #f0f0f0; color: #333;">
              ${options.originalCurrencyName}로 변경 후 진행
            </button>
            <button class="currency-btn-cancel" id="cancelCurrencyChange" style="width: 100%;">
              취소
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // 버튼 이벤트 바인딩
      document.getElementById('proceedCurrentCurrency').addEventListener('click', () => {
        modal.remove();
        resolve('current');  // 현재 선택 통화로 진행
      });

      document.getElementById('changeToOriginalCurrency').addEventListener('click', () => {
        modal.remove();
        resolve('original');  // 기존 통화로 변경
      });

      document.getElementById('cancelCurrencyChange').addEventListener('click', () => {
        modal.remove();
        resolve('cancel'); // 취소
      });

      // 모달 외부 클릭 시 취소
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.remove();
          resolve('cancel');
        }
      });
    });
  }

  /**
   * 업그레이드 시 통화 검사 및 사용자 승인 요청 (다중 통화 결제 지원)
   * @returns {Promise<boolean>} true: 승인됨, false: 취소됨
   */
  async function validateAndApplyUpgradeCurrency() {
    const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');

    // 신규 구독이면 통화 제한 없음
    if (!subscription.isSubscribed) {
      return true;
    }

    // 기존 구독 통화 조회
    const originalCurrency = getOriginalSubscriptionCurrency();
    const currentCurrency = getPaymentCurrency(); // 현재 선택된 통화

    // 통화가 동일하면 바로 진행
    if (!originalCurrency || originalCurrency === currentCurrency) {
      return true;
    }

    // 통화가 다르면 사용자에게 선택 요청 (다중 통화 결제 허용)
    const userChoice = await showCurrencyChangeConfirmModal({
      currentCurrency: currentCurrency,
      originalCurrency: originalCurrency,
      currentCurrencyName: CURRENCY_NAMES[currentCurrency] || currentCurrency,
      originalCurrencyName: CURRENCY_NAMES[originalCurrency] || originalCurrency
    });

    if (userChoice === 'current') {
      // 현재 선택한 통화로 결제 진행 (다중 통화 결제)
      console.log('[Settings] 다중 통화 결제 진행:', {
        originalCurrency,
        currentCurrency,
        message: '기존 구독과 다른 통화로 업그레이드'
      });
      showToast('info', `${CURRENCY_NAMES[currentCurrency] || currentCurrency}${t('paymentProceedWith', '로 결제를 진행합니다.')}`);
      return true;
    } else if (userChoice === 'original') {
      // 기존 구독 통화로 변경 후 진행
      const currencySelect = document.getElementById('paymentCurrency');
      if (currencySelect) {
        currencySelect.value = originalCurrency;
        currencySelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 패키지 가격 업데이트를 위해 약간의 대기
      await new Promise(r => setTimeout(r, 500));

      showToast('info', `${t('paymentCurrencyChanged', '결제 통화가')} ${CURRENCY_NAMES[originalCurrency] || originalCurrency}${t('paymentCurrencyChangedTo', '로 변경되었습니다.')}`);
      return true;
    } else {
      // 사용자가 취소함
      showToast('warning', t('paymentUpgradeCancelled', '업그레이드가 취소되었습니다.'));
      return false;
    }
  }

  // ========== 업그레이드 통화 처리 함수 끝 ==========

  // 보너스 비율 - 2025-12-10: 크레딧 단독 구매 보너스 제거
  // 크레딧 단독 구매 시 보너스 없음 (구독 패키지에서만 보너스 적용)
  function getBonusRate(amount) {
    // 크레딧 단독 구매는 보너스 없음
    return 0;
  }

  // 크레딧 단독 구매 계산 (v4.1: 크레딧은 기본가 기준, VAT는 결제금액에만 포함)
  // 2025-12-11: 수정 - VAT 금액은 크레딧 미발급
  // 예: $60 입력 → $66 (VAT 포함) 결제 → 60,000 크레딧 (기본가 기준)
  function calculateCredits(baseAmount) {
    const VAT_RATE = 0.10;  // 부가가치세 10%
    const CREDIT_PER_USD = 1000;  // 1 USD = 1,000 크레딧

    // VAT 10% 추가한 최종 결제 금액 계산
    const vatAmount = baseAmount * VAT_RATE;
    const totalAmount = baseAmount + vatAmount;  // 기본가 + VAT = 결제금액

    // 크레딧은 기본가 기준 (VAT 제외)
    const totalCredits = Math.round(baseAmount * CREDIT_PER_USD);

    return {
      base: totalCredits,           // 총 크레딧 (기본가 기준)
      bonusRate: 0,
      bonus: 0,
      total: totalCredits,
      // VAT 정보 추가 (UI 표시용)
      baseAmount: baseAmount,       // 기본 금액 (입력값)
      vatAmount: vatAmount,         // VAT 금액 (크레딧 미발급)
      totalAmount: totalAmount      // 최종 결제 금액 (VAT 포함)
    };
  }

  // ========================================
  // REFACTOR-008: updateCreditPreview 분해
  // ========================================

  /**
   * 입력된 로컬 금액 가져오기
   * @returns {number} 로컬 통화 금액
   */
  function getLocalAmountInput() {
    const amountInput = document.getElementById('creditAmount');
    return amountInput ? parseFloat(amountInput.value) || 0 : 0;
  }

  /**
   * 현재 통화 정보 가져오기
   * @returns {Object} { currency, rate }
   */
  function getCurrencyInfo() {
    return {
      currency: window.currentCreditPurchaseCurrency || 'USD',
      rate: window.currentCreditPurchaseRate || 1
    };
  }

  /**
   * 로컬 금액을 USD로 변환
   * @param {number} localAmount - 로컬 통화 금액
   * @param {string} currency - 통화 코드
   * @param {number} rate - 환율
   * @returns {number} USD 금액
   */
  function calculateUSDFromLocal(localAmount, currency, rate) {
    // 프리셋 버튼 선택 시: 원래 USD 금액 사용 (환율 변환 오차 방지)
    if (window.selectedPresetUSD !== null && window.selectedPresetUSD !== undefined) {
      return window.selectedPresetUSD;
    }
    // 직접 입력 시: 환율로 USD 계산
    return currency === 'USD' ? localAmount : localAmount / rate;
  }

  /**
   * 금액을 통화 형식으로 포맷
   * @param {number} amount - 금액
   * @param {string} currency - 통화 코드
   * @returns {string} 포맷된 금액 문자열
   */
  function formatCurrencyAmount(amount, currency) {
    const currencySymbols = {
      'USD': '$', 'KRW': '₩', 'JPY': '¥',
      'EUR': '€', 'GBP': '£', 'CNY': '¥'
    };
    const symbol = currencySymbols[currency] || currency + ' ';
    const integerCurrencies = ['KRW', 'JPY'];

    if (integerCurrencies.includes(currency)) {
      return symbol + _fmtN(Math.round(amount));
    }
    return symbol + amount.toFixed(2);
  }

  /**
   * 크레딧 미리보기 UI 요소 업데이트
   * @param {Object} calc - 크레딧 계산 결과 { base, bonus, total, bonusRate, totalAmount }
   * @param {number} localAmount - 로컬 통화 금액 (기본가)
   * @param {string} currency - 통화 코드
   * @param {number} rate - 환율
   */
  function updateCreditDisplayElements(calc, localAmount, currency, rate = 1) {
    const purchaseAmountDisplayEl = document.getElementById('purchaseAmountDisplay');
    const baseEl = document.getElementById('baseCredits');
    const bonusRateEl = document.getElementById('bonusRate');
    const bonusEl = document.getElementById('bonusCredits');
    const totalEl = document.getElementById('totalCredits');

    // 2025-12-10: VAT 포함 최종 금액 표시 (기본가 + VAT 10%)
    // calc.totalAmount는 USD 기준, 이를 로컬 통화로 변환하여 표시
    if (purchaseAmountDisplayEl) {
      const localTotalAmount = currency === 'USD'
        ? calc.totalAmount
        : Math.round(calc.totalAmount * rate * 100) / 100;
      purchaseAmountDisplayEl.textContent = formatCurrencyAmount(localTotalAmount, currency);
    }
    if (baseEl) baseEl.textContent = _fmtN(calc.base);
    if (bonusRateEl) bonusRateEl.textContent = calc.bonusRate;
    if (bonusEl) bonusEl.textContent = '+' + _fmtN(calc.bonus);
    if (totalEl) totalEl.textContent = _fmtN(calc.total);
  }

  /**
   * 최소 주문 금액 검증 및 버튼 상태 업데이트
   * @param {number} localAmount - 로컬 통화 금액
   * @param {string} currency - 통화 코드
   * @param {number} rate - 환율
   */
  function validateMinimumOrder(localAmount, currency, rate) {
    const purchaseBtn = document.getElementById('purchaseCreditsBtn');
    if (!purchaseBtn) return;

    const minAmount = window.minCreditPurchaseAmount || (currency === 'USD' ? 3 : Math.round(3 * rate));
    const wasAboveMin = !purchaseBtn.disabled;

    if (localAmount < minAmount) {
      purchaseBtn.disabled = true;
      purchaseBtn.classList.add('btn-disabled');
      if (wasAboveMin) {
        showMinAmountToast();
      }
    } else {
      purchaseBtn.disabled = false;
      purchaseBtn.classList.remove('btn-disabled');
    }
  }

  /**
   * 크레딧 미리보기 업데이트 (메인 함수)
   * REFACTOR-008: 분해된 함수들을 호출
   * 2025-12-10: VAT 10% 포함 최종 금액 표시
   */
  function updateCreditPreview() {
    const localAmount = getLocalAmountInput();
    if (localAmount === 0 && !document.getElementById('creditAmount')) return;

    const { currency, rate } = getCurrencyInfo();
    const usdAmount = calculateUSDFromLocal(localAmount, currency, rate);
    const calc = calculateCredits(usdAmount);

    // rate 전달하여 VAT 포함 금액을 로컬 통화로 변환
    updateCreditDisplayElements(calc, localAmount, currency, rate);
    validateMinimumOrder(localAmount, currency, rate);
  }

  /**
   * 최소 주문 금액 미달 토스트 메시지 표시
   */
  function showMinAmountToast() {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.min-amount-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'min-amount-toast';
    // 다국어 지원
    const message = window.i18n?.minOrderAmountMsg || t('paymentMinOrderAmount', '최소주문 금액이하 입니다');
    toast.textContent = message;
    document.body.appendChild(toast);

    // 3초 후 자동 제거
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // 구독 패키지 선택 이벤트
  function initSubscriptionPackages() {
    const packageCards = document.querySelectorAll('.package-card');

    packageCards.forEach((card, idx) => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.addEventListener('change', () => {
          // 모든 카드에서 selected 제거
          packageCards.forEach(c => c.classList.remove('selected'));
          // 선택된 카드에 selected 추가
          if (radio.checked) {
            card.classList.add('selected');
          }
          // 구독 버튼 상태 업데이트 (업그레이드/신규 구독 여부에 따라)
          const userInfoData = JSON.parse(localStorage.getItem('userInfo') || '{}');
          const subscriptionData = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
          // mymind3_subscription.subscriptionStatus를 우선 사용 (취소 시 userInfo 미갱신 방지)
          let subscriptionStatus = subscriptionData.subscriptionStatus || userInfoData.subscriptionStatus;
          if (!subscriptionStatus) {
            subscriptionStatus = (subscriptionData.isSubscribed && subscriptionData.subscriptionType) ? 'active' : 'inactive';
          }
          updateSubscribeButtonText(subscriptionStatus);
        });

        // 패키지 카드 클릭 이벤트
        card.addEventListener('click', (e) => {
          // 비활성화된 패키지 클릭 시 안내
          if (card.classList.contains('package-disabled') || card.classList.contains('package-current')) {
            e.preventDefault();
            e.stopPropagation();

            // 비활성화 사유 표시
            const reason = card.dataset.disabledReason;
            if (reason) {
              showPackageDisabledToast(reason);
            }
            return;
          }

          // 활성화된 카드 클릭 시 라디오 버튼 선택
          // (라벨 클릭이 아닌 카드 영역 클릭 시에도 작동하도록)
          // 이미 선택된 패키지를 다시 클릭해도 UI가 업데이트되도록 항상 이벤트 발생
          const wasChecked = radio.checked;
          radio.checked = true;
          // change 이벤트 수동 발생 (이미 선택된 경우에도 UI 갱신을 위해)
          radio.dispatchEvent(new Event('change', { bubbles: true }));

          // 이미 선택된 패키지 재클릭 시 시각적 피드백
          if (wasChecked) {
            card.classList.add('package-pulse');
            setTimeout(() => card.classList.remove('package-pulse'), 300);
          }
        });
      }
    });

    // 패키지 UI 상태 업데이트
    updatePackageSelectionUI();
  }

  /**
   * 패키지 비활성화 안내 토스트 표시
   * @param {string} reason - 비활성화 사유
   */
  function showPackageDisabledToast(reason) {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.package-disabled-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'package-disabled-toast';
    toast.textContent = reason;
    document.body.appendChild(toast);

    // 3초 후 자동 제거
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * 패키지 선택 UI 상태 업데이트
   * 현재 구독 상태에 따라 패키지 카드 활성화/비활성화
   */
  function updatePackageSelectionUI() {
    const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
    const currentPackage = subscription.subscriptionType || null;
    // subscriptionStatus가 없지만 isSubscribed가 true면 'active'로 처리
    let subscriptionStatus = subscription.subscriptionStatus;
    if (!subscriptionStatus) {
      subscriptionStatus = (subscription.isSubscribed && subscription.subscriptionType) ? 'active' : 'inactive';
    }

    const packageCards = document.querySelectorAll('.package-card');

    packageCards.forEach(card => {
      const radio = card.querySelector('input[type="radio"]');
      if (!radio) return;

      // 환율 변환된 값 대신 data-package-type 속성 사용
      const targetPackage = radio.dataset.packageType || PRICE_TO_PACKAGE_TYPE[radio.value];

      // 패키지 선택 가능 여부 확인
      const selectability = isPackageSelectable(targetPackage, currentPackage, subscriptionStatus);

      // 기존 상태 클래스 제거
      card.classList.remove('package-disabled', 'package-current', 'package-upgrade');
      delete card.dataset.disabledReason;

      // 기존 뱃지 제거
      const existingBadge = card.querySelector('.package-status-badge');
      if (existingBadge) {
        existingBadge.remove();
      }

      if (!selectability.enabled) {
        // 비활성화
        card.classList.add('package-disabled');
        radio.disabled = true;
        card.dataset.disabledReason = selectability.reason;

        // 현재 구독 중인 패키지인 경우
        if (selectability.action === 'current') {
          card.classList.add('package-current');
          addPackageStatusBadge(card, t('paymentCurrentSubscription', '현재 구독 중'), 'current');
        } else if (selectability.action === 'blocked') {
          addPackageStatusBadge(card, t('paymentNotSelectable', '선택 불가'), 'blocked');
        }
      } else {
        // 활성화
        radio.disabled = false;

        // 업그레이드 표시
        if (selectability.action === 'upgrade') {
          card.classList.add('package-upgrade');
          addPackageStatusBadge(card, t('upgradeBtn', '업그레이드'), 'upgrade');
        }
      }
    });

    // 구독 버튼 텍스트 업데이트
    updateSubscribeButtonText(subscriptionStatus);

    // 기본 패키지 선택 로직
    // - 미구독(inactive): plus10(구독일반) 기본 선택
    // - 구독 중(active): 현재 패키지의 바로 상위 패키지 선택
    selectDefaultPackage(currentPackage, subscriptionStatus);
  }

  /**
   * 기본 패키지 선택
   * @param {string|null} currentPackage - 현재 구독 중인 패키지 타입
   * @param {string} subscriptionStatus - 구독 상태 (active/inactive/canceled)
   */
  function selectDefaultPackage(currentPackage, subscriptionStatus) {
    // 패키지 순서 배열 (하위 → 상위)
    const packageOrder = ['lite', 'standard', 'pro', 'max'];

    let targetPackage;

    if (subscriptionStatus === 'inactive' || subscriptionStatus === 'cancelled' || subscriptionStatus === 'canceled' || !currentPackage) {
      // 미구독/취소 상태: lite 기본 선택
      targetPackage = 'lite';
    } else if (subscriptionStatus === 'active') {
      // 구독 중: 현재 패키지의 바로 상위 패키지 선택
      const currentIndex = packageOrder.indexOf(currentPackage);
      if (currentIndex === -1 || currentIndex >= packageOrder.length - 1) {
        // 현재 패키지가 최상위(max)이면 max 유지 (더 이상 상위 없음)
        targetPackage = currentPackage || 'lite';
      } else {
        // 바로 상위 패키지 선택
        targetPackage = packageOrder[currentIndex + 1];
      }
    } else {
      // 기타: lite 기본 선택
      targetPackage = 'lite';
    }

    // 해당 패키지의 라디오 버튼 선택 및 UI 업데이트
    const targetRadio = document.querySelector(`input[name="subscription"][data-package-type="${targetPackage}"]`);
    if (targetRadio && !targetRadio.disabled) {
      targetRadio.checked = true;
      const card = targetRadio.closest('.package-card');
      if (card) {
        // 모든 카드에서 selected 제거
        document.querySelectorAll('.package-card').forEach(c => c.classList.remove('selected'));
        // 선택된 카드에 selected 추가
        card.classList.add('selected');
      }
      // change 이벤트 발생시켜 버튼 텍스트 등 업데이트
      targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`[Settings] 기본 패키지 선택: ${targetPackage}`);
    } else if (targetRadio?.disabled) {
      // 대상 패키지가 비활성화된 경우, 선택 가능한 다음 상위 패키지 선택
      const targetIndex = packageOrder.indexOf(targetPackage);
      for (let i = targetIndex + 1; i < packageOrder.length; i++) {
        const fallbackRadio = document.querySelector(`input[name="subscription"][data-package-type="${packageOrder[i]}"]`);
        if (fallbackRadio && !fallbackRadio.disabled) {
          fallbackRadio.checked = true;
          const card = fallbackRadio.closest('.package-card');
          if (card) {
            document.querySelectorAll('.package-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
          }
          fallbackRadio.dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`[Settings] 대체 패키지 선택: ${packageOrder[i]} (${targetPackage} 비활성화)`);
          return;
        }
      }
      // 상위 패키지도 없으면 하위 패키지에서 선택 가능한 것 찾기
      for (let i = targetIndex - 1; i >= 0; i--) {
        const fallbackRadio = document.querySelector(`input[name="subscription"][data-package-type="${packageOrder[i]}"]`);
        if (fallbackRadio && !fallbackRadio.disabled) {
          fallbackRadio.checked = true;
          const card = fallbackRadio.closest('.package-card');
          if (card) {
            document.querySelectorAll('.package-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
          }
          fallbackRadio.dispatchEvent(new Event('change', { bubbles: true }));
          console.log(`[Settings] 대체 패키지 선택(하위): ${packageOrder[i]} (${targetPackage} 비활성화)`);
          return;
        }
      }
    }
  }

  /**
   * 패키지 상태 뱃지 추가
   * @param {HTMLElement} card - 패키지 카드 요소
   * @param {string} text - 뱃지 텍스트
   * @param {string} type - 뱃지 타입 (current, blocked, upgrade)
   */
  function addPackageStatusBadge(card, text, type) {
    const badge = document.createElement('div');
    badge.className = `package-status-badge badge-${type}`;
    badge.textContent = text;
    card.appendChild(badge);
  }

  /**
   * 구독 버튼 텍스트 업데이트
   * @param {string} subscriptionStatus - 구독 상태
   */
  function updateSubscribeButtonText(subscriptionStatus) {
    const subscribeBtn = document.getElementById('subscribeBtn');
    const cancelSubscriptionBtn = document.getElementById('cancelSubscriptionBtn');
    if (!subscribeBtn) return;

    const selectedPackage = document.querySelector('input[name="subscription"]:checked');
    if (!selectedPackage) return;

    const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
    const currentPackage = subscription.subscriptionType || null;
    // 환율 변환된 값 대신 data-package-type 속성 사용 (환율과 무관하게 패키지 식별)
    const targetPackage = selectedPackage.dataset.packageType || PRICE_TO_PACKAGE_TYPE[selectedPackage.value];

    // 구독 상태 재확인
    // 명시적으로 취소/비활성 상태가 전달되면 해당 상태 우선 사용 (stale localStorage 무시)
    const isCancelledOrInactive = subscriptionStatus === 'cancelled' || subscriptionStatus === 'canceled' || subscriptionStatus === 'inactive';
    const isActive = !isCancelledOrInactive && subscription.isSubscribed && subscription.subscriptionType;
    const effectiveStatus = isCancelledOrInactive ? subscriptionStatus : (isActive ? 'active' : subscriptionStatus);

    const selectability = isPackageSelectable(targetPackage, currentPackage, effectiveStatus);

    // 구독 중 상태에서는 항상 '업그레이드' 표시 (선택된 패키지가 활성화된 경우)
    const i18n = window.i18n || {};
    if (isActive && selectability.enabled) {
      subscribeBtn.textContent = i18n.upgradeBtn || '업그레이드';
      subscribeBtn.disabled = false;
    } else if (selectability.action === 'upgrade') {
      subscribeBtn.textContent = i18n.upgradeBtn || '업그레이드';
      subscribeBtn.disabled = false;
    } else if (selectability.action === 'subscribe') {
      subscribeBtn.textContent = i18n.subscribeStartBtn || '구독 시작';
      subscribeBtn.disabled = false;
    } else {
      subscribeBtn.textContent = i18n.changeSubscriptionBtn || '구독';
      subscribeBtn.disabled = true;
    }

    // 구독 취소 버튼 텍스트 업데이트 (현재 구독 중인 상품명 표시)
    // 2025-12-10: only 삭제
    if (cancelSubscriptionBtn && isActive && currentPackage) {
      const cancelText = i18n.cancelSubscriptionBtn || '구독취소';
      cancelSubscriptionBtn.textContent = cancelText;
    }
  }

  // 결제 버튼 이벤트
  // 중복 초기화 방지 플래그
  let paymentButtonsInitialized = false;

  function initPaymentButtons() {
    // 이미 초기화된 경우 스킵 (중복 이벤트 리스너 방지)
    if (paymentButtonsInitialized) {
      console.log('[Settings] initPaymentButtons 이미 초기화됨, 스킵');
      return;
    }

    const subscribeBtn = document.getElementById('subscribeBtn');
    const purchaseBtn = document.getElementById('purchaseCreditsBtn');
    const viewHistoryBtn = document.getElementById('viewHistoryBtn');
    const manageCardBtn = document.getElementById('manageCardBtn');

    if (subscribeBtn) {
      subscribeBtn.addEventListener('click', () => {
        // v6.5: 확인 모달 없이 바로 결제 진행
        processSubscription();
      });
    }

    if (purchaseBtn) {
      purchaseBtn.addEventListener('click', () => {
        showCreditPurchaseModal();
      });
    }

    if (viewHistoryBtn) {
      viewHistoryBtn.addEventListener('click', () => {
        showPaymentHistoryModal();
      });
    }

    // 결제 내역 모달 초기화
    initPaymentHistoryModal();

    if (manageCardBtn) {
      manageCardBtn.addEventListener('click', () => {
        alert(t('paymentCardManageLater', '카드 관리 기능은 추후 연동 예정입니다.'));
      });
    }

    // v7.3: 자동결제 체크박스 이벤트 리스너
    const autopayCheckbox = document.getElementById('autopayCheckbox');
    if (autopayCheckbox) {
      const wrapper = autopayCheckbox.closest('.autopay-checkbox-wrapper');
      autopayCheckbox.addEventListener('change', async () => {
        console.log('[Settings] 자동결제 체크박스 변경:', autopayCheckbox.checked);
        // wrapper에 checked 클래스 토글 (블링블링 효과용)
        if (wrapper) {
          wrapper.classList.toggle('checked', autopayCheckbox.checked);
        }
        // 모든 패키지의 크레딧 정보 업데이트 (autopay 보너스 반영)
        updatePackageCreditsFromConstants();

        // v7.5: 자동결제 설정 DB에 즉시 저장 (CSRF 토큰 포함)
        try {
          const response = await window.csrfUtils.secureFetch('/api/credits/set-auto-renewal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: autopayCheckbox.checked })
          });
          const result = await response.json();
          if (result.success) {
            console.log('[Settings] 자동결제 설정 저장 완료:', autopayCheckbox.checked);
          } else {
            console.error('[Settings] 자동결제 설정 저장 실패:', result.error);
          }
        } catch (error) {
          console.error('[Settings] 자동결제 설정 저장 오류:', error);
        }
      });
    }

    // v6.5: 구독 확인 모달 제거됨 - 바로 결제 진행

    // v7.x: 크레딧 취소 버튼 이벤트 리스너
    const cancelPaidCreditsBtn = document.getElementById('cancelPaidCreditsBtn');
    if (cancelPaidCreditsBtn) {
      cancelPaidCreditsBtn.addEventListener('click', () => {
        showCancelPaidCreditsModal();
      });
    }

    paymentButtonsInitialized = true;
    console.log('[Settings] initPaymentButtons 초기화 완료');
  }

  /**
   * 일반 크레딧 취소 버튼 표시/숨김
   * @param {number} paidCredits - 일반 크레딧 잔액
   */
  function updateCancelPaidCreditsButton(paidCredits) {
    const cancelBtn = document.getElementById('cancelPaidCreditsBtn');
    if (cancelBtn) {
      if (paidCredits > 0) {
        cancelBtn.style.display = 'block';
        cancelBtn.textContent = t('creditCancelBtn', '크레딧 취소 ({amount}C)').replace('{amount}', _fmtN(paidCredits));
      } else {
        cancelBtn.style.display = 'none';
      }
    }
  }

  /**
   * 크레딧 취소 모달 표시
   */
  async function showCancelPaidCreditsModal() {
    try {
      // 현재 크레딧 잔액 조회
      const response = await window.csrfUtils.secureFetch('/api/credits/balance');
      const data = await response.json();

      if (!data.success) {
        alert(t('paymentCreditLoadFailed', '크레딧 정보를 불러올 수 없습니다.'));
        return;
      }

      const paidCredits = data.data?.credits?.paid || 0;
      if (paidCredits <= 0) {
        alert(t('paymentNoPaidCredits', '취소할 일반 크레딧이 없습니다.'));
        return;
      }

      // 취소 확인
      const confirmed = confirm(
        `${t('paymentCreditCancel', '크레딧 취소')}\n\n` +
        `${t('paymentCreditsToCancel', '취소할 크레딧')}: ${_fmtN(paidCredits)} ${t('credits', '크레딧')}\n\n` +
        `${t('paymentWarning', '주의사항')}:\n` +
        `• ${t('paymentCancelNote1', '유료 구매 크레딧이 모두 취소됩니다')}\n` +
        `• ${t('paymentCancelNote2', '환불은 별도 처리됩니다')}\n` +
        `• ${t('paymentCancelNote3', '이 작업은 되돌릴 수 없습니다')}\n\n` +
        `${t('paymentConfirmCancel', '정말 취소하시겠습니까?')}`
      );

      if (!confirmed) return;

      // 크레딧 취소 API 호출
      const cancelResponse = await window.csrfUtils.secureFetch('/api/credits/cancel-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: paidCredits })
      });

      const cancelResult = await cancelResponse.json();

      if (cancelResult.success) {
        alert(`${t('paymentCreditCancelComplete', '크레딧 취소 완료')}\n\n${t('paymentCancelledCredits', '취소된 크레딧')}: ${_fmtN(paidCredits)}\n\n${t('paymentRefundInProgress', '환불 절차가 진행됩니다.')}`);
        // 크레딧 잔액 새로고침 - 페이지 리로드로 전체 갱신
        window.location.reload();
      } else {
        alert(`${t('paymentCreditCancelFailed', '크레딧 취소 실패')}\n\n${cancelResult.error || t('unknownError', '알 수 없는 오류가 발생했습니다.')}`);
      }
    } catch (error) {
      console.error('[Settings] 크레딧 취소 오류:', error);
      alert(t('paymentCreditCancelError', '크레딧 취소 중 오류가 발생했습니다.'));
    }
  }

  // 구독 확인 모달 표시 (async 함수로 변경 - 업그레이드 통화 검증 지원)
  async function showSubscriptionConfirmModal() {
    // 취소 횟수 제한 체크 (개발자 제외) - 신규 구독도 제한
    if (isCancellationLimitExceeded()) {
      showCancellationLimitAlert();
      return;
    }

    const selectedPackage = document.querySelector('input[name="subscription"]:checked');
    if (!selectedPackage) {
      alert(t('paymentSelectPackage', '구독 패키지를 선택해주세요.'));
      return;
    }

    // 환율 변환된 값 대신 data-package-type 속성 사용 (환율과 무관하게 패키지 식별)
    const packageType = selectedPackage.dataset.packageType || PRICE_TO_PACKAGE_TYPE[selectedPackage.value];
    const packageInfo = SUBSCRIPTION_PACKAGES[packageType];
    if (!packageInfo) {
      console.error('[Settings] 패키지 정보를 찾을 수 없습니다:', packageType, selectedPackage.value);
      return;
    }

    // 현재 구독 상태 확인하여 업그레이드인지 판단
    const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const currentPackage = subscription.subscriptionType || null;
    const subscriptionStatus = userInfo.subscriptionStatus || 'inactive';

    const selectability = isPackageSelectable(packageType, currentPackage, subscriptionStatus);

    // 업그레이드인 경우 통화 검증 및 사용자 승인 요청
    if (selectability.action === 'upgrade') {
      const approved = await validateAndApplyUpgradeCurrency();
      if (!approved) {
        return; // 사용자가 취소함 → 모달 표시 안함
      }
    }

    // 총 크레딧 계산 - 선택된 패키지 카드에서 실제 표시되는 값 사용
    // (환율 변환된 값이 패키지 카드에 표시되므로 그 값을 그대로 사용)
    // 2025-12-10: 무료 크레딧 제거됨
    let totalCredits = packageInfo.serviceCredits; // 기본값 (USD 기준, serviceCredits = baseCredits + bonusCredits)

    // 선택된 패키지 카드에서 실제 표시되는 합계 크레딧 가져오기
    const selectedCard = selectedPackage.closest('.package-card');
    if (selectedCard) {
      const totalEl = selectedCard.querySelector('.credit-value-total');
      if (totalEl && totalEl.textContent) {
        // 숫자만 추출 (예: "2,600,769" → 2600769)
        const displayedTotal = parseInt(totalEl.textContent.replace(/[^\d]/g, ''), 10);
        if (!isNaN(displayedTotal) && displayedTotal > 0) {
          totalCredits = displayedTotal;
        }
      }
    }

    // 모달에 정보 표시
    const confirmPackageName = document.getElementById('confirmPackageName');
    const confirmCredits = document.getElementById('confirmCredits');
    const confirmPeriod = document.getElementById('confirmPeriod');

    if (confirmPackageName) confirmPackageName.textContent = packageInfo.name;
    if (confirmCredits) confirmCredits.textContent = _fmtN(totalCredits) + ' 크레딧';
    if (confirmPeriod) confirmPeriod.textContent = t('oneMonth', '1개월');

    // 업그레이드 가격 정보 표시/숨김 처리
    const upgradePaymentInfo = document.getElementById('upgradePaymentInfo');
    if (upgradePaymentInfo) {
      if (selectability.action === 'upgrade' && currentPackage) {
        // v8.4: 업그레이드 비례 정산 정보를 서버에서 가져오기
        const currentPackageInfo = SUBSCRIPTION_PACKAGES[currentPackage];
        if (currentPackageInfo) {
          const aiSettings = JSON.parse(localStorage.getItem('mymind3_ai_settings') || '{}');
          const newCurrency = aiSettings.paymentCurrency || 'USD';
          const currencySymbols = { USD: '$', KRW: '₩', JPY: '¥', EUR: '€', GBP: '£', CNY: '¥' };
          const formatPrice = (price, curr) => {
            const sym = currencySymbols[curr] || curr + ' ';
            if (curr === 'KRW' || curr === 'JPY') return sym + _fmtN(Math.round(price));
            return sym + price.toFixed(2);
          };

          // 서버에서 비례 정산 미리보기 조회
          try {
            const previewRes = await fetch(`/api/credits/upgrade-preview?new_package=${packageType}&currency=${newCurrency}`, {
              credentials: 'include'
            });
            const previewData = await previewRes.json();

            if (previewData.success) {
              const p = previewData.data;
              const upgradeCurrentPackage = document.getElementById('upgradeCurrentPackage');
              const upgradeCurrentPrice = document.getElementById('upgradeCurrentPrice');
              const upgradeNewPackage = document.getElementById('upgradeNewPackage');
              const upgradeNewPrice = document.getElementById('upgradeNewPrice');
              const upgradeDifferenceDesc = document.getElementById('upgradeDifferenceDesc');
              const upgradeDifferencePrice = document.getElementById('upgradeDifferencePrice');

              if (upgradeCurrentPackage) upgradeCurrentPackage.textContent = currentPackageInfo.name;
              if (upgradeNewPackage) upgradeNewPackage.textContent = packageInfo.name;

              // 비례 정산 정보 표시
              if (upgradeCurrentPrice) {
                upgradeCurrentPrice.textContent = `${formatPrice(p.remainingValue, 'USD')} (${p.remainingDays}일분)`;
              }
              if (upgradeNewPrice) {
                upgradeNewPrice.textContent = formatPrice(p.newPriceUSD, 'USD');
              }
              if (upgradeDifferenceDesc) {
                upgradeDifferenceDesc.textContent = `비례 정산 차액 (${p.usedDays}일 사용, ${p.remainingDays}일 잔여)`;
              }
              if (upgradeDifferencePrice) {
                if (newCurrency === 'USD') {
                  upgradeDifferencePrice.textContent = formatPrice(p.upgradeCharge, 'USD');
                } else {
                  upgradeDifferencePrice.textContent = `${formatPrice(p.upgradeChargeLocal, newCurrency)} (${formatPrice(p.upgradeCharge, 'USD')})`;
                }
              }

              // 크레딧 정보 업데이트
              if (confirmCredits) {
                confirmCredits.textContent = _fmtN(p.newCredits) + ' 크레딧 (비례 정산)';
              }

              upgradePaymentInfo.style.display = 'block';
              console.log('[Settings] 업그레이드 비례 정산:', p);
            } else {
              upgradePaymentInfo.style.display = 'none';
            }
          } catch (err) {
            console.error('[Settings] 업그레이드 미리보기 실패:', err);
            upgradePaymentInfo.style.display = 'none';
          }
        } else {
          upgradePaymentInfo.style.display = 'none';
        }
      } else {
        // 신규 구독인 경우: 업그레이드 정보 숨김
        upgradePaymentInfo.style.display = 'none';
      }
    }

    // 모달 표시
    const modal = document.getElementById('subscriptionConfirmModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  // 구독 확인 모달 이벤트 초기화
  // 중복 초기화 방지 플래그
  let subscriptionModalInitialized = false;

  function initSubscriptionModal() {
    // 이미 초기화된 경우 스킵 (중복 이벤트 리스너 방지)
    if (subscriptionModalInitialized) {
      console.log('[Settings] initSubscriptionModal 이미 초기화됨, 스킵');
      return;
    }

    const modal = document.getElementById('subscriptionConfirmModal');
    const closeBtn = document.getElementById('closeSubscriptionModal');
    const cancelBtn = document.getElementById('cancelSubscribeModalBtn');
    const confirmBtn = document.getElementById('confirmSubscriptionBtn');

    // 닫기 버튼
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    // 취소 버튼
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    // 확인 버튼 (Stripe 또는 테스트 결제 처리)
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        processSubscription();
      });
    }

    // 모달 외부 클릭 시 닫기
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }

    // 구독 취소 모달 초기화
    initCancelSubscriptionModal();

    // 크레딧 구매 모달 초기화
    initCreditPurchaseModal();

    subscriptionModalInitialized = true;
    console.log('[Settings] initSubscriptionModal 초기화 완료');
  }

  // ========== Phase 3: 10단계 크레딧 구매 시스템 (v5.0) ==========

  // 선택된 단계 저장
  // v7.1: 기본값 단계 6 ($20)
  let selectedTier = 6;

  /**
   * 슬라이더 기반 크레딧 구매 초기화
   */
  function initCreditTierGrid() {
    const tierSlider = document.getElementById('tierSlider');
    if (!tierSlider) {
      console.log('[Settings] 슬라이더 요소 없음, 스킵');
      return;
    }

    // v7.1: 20단계 틱마크 생성
    initSliderTicks();

    // 슬라이더 변경 이벤트
    tierSlider.addEventListener('input', (e) => {
      const tier = parseInt(e.target.value, 10);
      updateSliderDisplay(tier);
      // 슬라이더는 항상 $3 이상이므로 버튼 활성화
      setPurchaseButtonEnabled(true);
    });

    // 구매 버튼 이벤트 (더블클릭 방지: 즉시 disabled 설정)
    const purchaseBtn = document.getElementById('purchaseTierBtn');
    if (purchaseBtn) {
      purchaseBtn.addEventListener('click', () => {
        // selectedTier: 슬라이더 선택, pendingTierPurchase.tier==='custom': 수기 입력($100 초과)
        const hasSelection = selectedTier || window.pendingTierPurchase?.tier === 'custom';
        if (hasSelection && !purchaseBtn.disabled) {
          purchaseBtn.disabled = true;
          purchaseTierCredits(selectedTier || 'custom');
        }
      });
    }

    // 수기 입력 이벤트
    initManualAmountInput();

    // 현재 설정된 통화로 슬라이더 초기화
    // 통화 셀렉트 박스의 change 이벤트를 트리거하여 환율 로드 및 UI 업데이트
    const currencySelect = document.getElementById('paymentCurrency');
    if (currencySelect && currencySelect.value) {
      // 약간의 지연 후 change 이벤트 트리거 (DOM 준비 보장)
      setTimeout(() => {
        currencySelect.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`[Settings] 슬라이더 초기 통화 트리거: ${currencySelect.value}`);
      }, 100);
    } else {
      // 셀렉트 박스가 없으면 직접 초기화
      initSliderWithCurrentCurrency();
    }

    console.log('[Settings] 슬라이더 기반 크레딧 구매 초기화 완료');
  }

  /**
   * 현재 통화로 슬라이더 초기화
   * - API에서 환율 가져와서 적용
   */
  async function initSliderWithCurrentCurrency() {
    const currency = getPaymentCurrency() || 'USD';

    if (currency === 'USD') {
      // USD는 환율 변환 불필요
      window.currentCreditPurchaseCurrency = 'USD';
      window.currentCreditPurchaseRate = 1;
      // USD도 명시적으로 UI 업데이트 (HTML 기본값과 동기화)
      updateTierGridCurrency('USD', 1);
      updateSliderDisplay(6);
      return;
    }

    try {
      // API에서 환율 가져오기
      const response = await fetch(`/api/exchange/rate/${currency}`);
      if (response.ok) {
        const data = await response.json();
        const rate = data.rate || 1;

        // 전역 변수에 저장
        window.currentCreditPurchaseCurrency = currency;
        window.currentCreditPurchaseRate = rate;

        // 슬라이더 및 UI 업데이트
        updateTierGridCurrency(currency, rate);
        updateSliderDisplay(6);

        console.log(`[Settings] 슬라이더 초기 통화 적용: ${currency} (환율: ${rate})`);
      } else {
        // 실패 시 USD로 폴백
        window.currentCreditPurchaseCurrency = 'USD';
        window.currentCreditPurchaseRate = 1;
        updateTierGridCurrency('USD', 1);
        updateSliderDisplay(6);
      }
    } catch (error) {
      console.error('[Settings] 환율 조회 실패:', error);
      window.currentCreditPurchaseCurrency = 'USD';
      window.currentCreditPurchaseRate = 1;
      updateTierGridCurrency('USD', 1);
      updateSliderDisplay(6);
    }
  }

  /**
   * v7.1: 20단계 슬라이더 틱마크 생성
   * - 각 단계 위치에 작은 틱마크 표시
   * - 5단계마다 major 틱마크
   */
  function initSliderTicks() {
    const ticksContainer = document.getElementById('tierSliderTicks');
    if (!ticksContainer) return;

    // 기존 틱마크 제거
    ticksContainer.innerHTML = '';

    // 20개 틱마크 생성
    for (let i = 1; i <= 20; i++) {
      const tick = document.createElement('div');
      tick.className = 'tick' + (i % 5 === 0 || i === 1 ? ' major' : '');
      ticksContainer.appendChild(tick);
    }
  }

  /**
   * 수기 입력 초기화
   * - 슬라이더와 동기화
   * - 최소 $3 이상 (v6.1: 신용카드 수수료 고려)
   * - v7.2: 마진 15% 고정
   */
  function initManualAmountInput() {
    const manualInput = document.getElementById('manualAmountInput');

    if (!manualInput) {
      console.log('[Settings] 수기 입력 요소 없음, 스킵');
      return;
    }

    // 입력 중 실시간 버튼 상태 검증 및 포맷팅
    manualInput.addEventListener('input', (e) => {
      // 숫자만 허용 (구분자 제외)
      const cursorPos = e.target.selectionStart;
      const oldLength = e.target.value.length;

      // 숫자와 소수점만 추출
      let rawValue = e.target.value.replace(/[^\d.]/g, '');
      // 소수점이 여러 개면 첫 번째만 유지
      const parts = rawValue.split('.');
      if (parts.length > 2) {
        rawValue = parts[0] + '.' + parts.slice(1).join('');
      }

      // 포맷팅 적용
      const numValue = parseFloat(rawValue) || 0;
      const currency = window.currentCreditPurchaseCurrency || 'USD';

      if (numValue > 0) {
        e.target.value = formatAmountWithSeparator(numValue, currency);
      } else {
        e.target.value = rawValue;
      }

      // 커서 위치 조정
      const newLength = e.target.value.length;
      const diff = newLength - oldLength;
      e.target.setSelectionRange(cursorPos + diff, cursorPos + diff);

      validatePurchaseAmount();
    });

    // 입력 값 변경 시 즉시 적용 (blur 또는 Enter)
    manualInput.addEventListener('change', () => {
      applyManualAmount();
    });

    // 엔터 키로 적용
    manualInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        manualInput.blur();  // blur 이벤트 트리거
      }
    });

    console.log('[Settings] 수기 입력 초기화 완료');
  }

  /**
   * 구매 버튼 활성화/비활성화
   * @param {boolean} enabled - 활성화 여부
   */
  function setPurchaseButtonEnabled(enabled) {
    const purchaseBtn = document.getElementById('purchaseTierBtn');
    if (purchaseBtn) {
      purchaseBtn.disabled = !enabled;
      if (enabled) {
        purchaseBtn.classList.remove('btn-disabled');
      } else {
        purchaseBtn.classList.add('btn-disabled');
      }
    }
  }

  /**
   * 구매 금액 유효성 검증 (실시간)
   * - USD 기준 $3 이상이면 버튼 활성화 (v6.1: 신용카드 수수료 고려)
   * - $3 미만이면 버튼 비활성화
   */
  function validatePurchaseAmount() {
    const manualInput = document.getElementById('manualAmountInput');
    if (!manualInput) return;

    // 포맷팅된 값에서 숫자 추출
    const inputAmount = parseFormattedAmount(manualInput.value);

    // 통화 정보
    const currency = window.currentCreditPurchaseCurrency || getPaymentCurrency() || 'USD';
    const rate = window.currentCreditPurchaseRate || 1;

    // 현지 통화 → USD 변환
    const amountUSD = currency === 'USD' ? inputAmount : inputAmount / rate;

    // USD 기준 $3 이상이면 활성화 (v6.1)
    const isValid = !isNaN(inputAmount) && amountUSD >= 3;
    setPurchaseButtonEnabled(isValid);
  }

  /**
   * 수기 입력 금액 적용
   * - 화면 표시: 항상 결제 통화로만 표시
   * - 내부 검증: USD 기준으로 최소 금액($3) 검증 (v6.1)
   */
  function applyManualAmount() {
    const manualInput = document.getElementById('manualAmountInput');
    if (!manualInput) return;

    // 포맷팅된 값에서 숫자 추출
    const inputAmount = parseFormattedAmount(manualInput.value);

    // 통화 정보
    const currency = window.currentCreditPurchaseCurrency || getPaymentCurrency() || 'USD';
    const rate = window.currentCreditPurchaseRate || 1;
    const symbol = getCurrencySymbol(currency);

    // 현지 통화 → USD 변환 (내부 검증용)
    const amountUSD = currency === 'USD' ? inputAmount : inputAmount / rate;

    // 유효성 검사: USD 기준 $3 이상인지 확인 (v6.1)
    if (isNaN(inputAmount) || amountUSD < 3) {
      // $3 미만: 구매 버튼 비활성화
      setPurchaseButtonEnabled(false);
      return;
    }

    // $3 이상: 구매 버튼 활성화
    setPurchaseButtonEnabled(true);

    // USD 기준으로 단계 또는 커스텀 계산
    if (amountUSD <= 100) {
      // $3~$100: 기존 단계에 매핑 (USD 기준)
      const tierAmounts = [3, 5, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 100];  // v6.2: 20단계
      let matchedTier = 1;

      for (let i = 0; i < tierAmounts.length; i++) {
        if (amountUSD >= tierAmounts[i]) {
          matchedTier = i + 1;
        }
      }

      // 슬라이더 값 업데이트
      const tierSlider = document.getElementById('tierSlider');
      if (tierSlider) {
        tierSlider.value = matchedTier;
      }
      updateSliderDisplay(matchedTier);

      console.log(`[Settings] 수기 입력 ${symbol}${_fmtN(inputAmount)} → 단계 ${matchedTier} 적용`);
    } else {
      // $100 초과: 커스텀 계산 (v7.2: 마진 15% 고정, USD 기준)
      updateCustomAmountDisplay(amountUSD);
      console.log(`[Settings] 수기 입력 ${symbol}${_fmtN(inputAmount)} (마진 15% 고정) 적용`);
    }
  }

  /**
   * 커스텀 금액 표시 업데이트 ($100 초과)
   * v7.2: 마진율 15% 고정
   * @param {number} amount - USD 금액
   */
  function updateCustomAmountDisplay(amount) {
    // v7.2: 마진 15% 고정
    const margin = 0.15;
    const perDollar = Math.round(100000 / (0.80 + margin));  // $1당 크레딧 = 105,263
    const totalCredits = Math.round(amount * perDollar);
    const vatAmount = amount * 0.10;
    const paymentAmount = amount + vatAmount;  // VAT 포함 결제금액

    // 통화 정보
    const currency = window.currentCreditPurchaseCurrency || getPaymentCurrency() || 'USD';
    const rate = window.currentCreditPurchaseRate || 1;
    const symbol = getCurrencySymbol(currency);

    // 환율 적용 금액 계산
    const localPayment = currency === 'USD'
      ? paymentAmount
      : Math.round(paymentAmount * rate * 100) / 100;

    // UI 업데이트
    const sliderAmount = document.getElementById('sliderAmount');
    const sliderCredits = document.getElementById('sliderCredits');
    const sliderPayment = document.getElementById('sliderPayment');
    const sliderMargin = document.getElementById('sliderMargin');
    const sliderBonus = document.getElementById('sliderBonus');
    const sliderBonusContainer = document.getElementById('sliderBonusContainer');

    // 통화에 맞게 금액 표시
    const localAmount = currency === 'USD'
      ? amount
      : Math.round(amount * rate);

    if (sliderAmount) {
      if (currency === 'USD') {
        sliderAmount.textContent = `${symbol}${amount}`;
      } else {
        sliderAmount.textContent = `${symbol}${_fmtN(localAmount)}`;
      }
    }
    if (sliderCredits) sliderCredits.textContent = _fmtN(totalCredits);
    if (sliderPayment) {
      if (currency === 'USD') {
        sliderPayment.textContent = symbol + localPayment.toFixed(2);
      } else {
        sliderPayment.textContent = symbol + _fmtN(Math.round(localPayment));
      }
    }
    if (sliderMargin) sliderMargin.textContent = `${(margin * 100).toFixed(1)}%`;

    // v6.5: 크레딧 단독 구매는 보너스 없음 - UI 숨김
    if (sliderBonusContainer) sliderBonusContainer.style.display = 'none';

    // 슬라이더는 비활성화 (커스텀 금액이므로)
    const tierSlider = document.getElementById('tierSlider');
    if (tierSlider) {
      tierSlider.value = 10;  // 시각적으로 최대값 표시
    }

    // 임시 저장 (구매 시 사용) - 커스텀 금액용
    selectedTier = null;  // 기존 단계 선택 초기화
    window.pendingTierPurchase = {
      tier: 'custom',
      customAmount: amount,
      tierInfo: {
        amount: amount,
        vat: vatAmount,
        payment: paymentAmount,
        margin: margin,
        perDollar: perDollar,
        total: totalCredits
      },
      currency: currency,
      rate: rate,
      localPayment: localPayment
    };

    console.log('[Settings] 커스텀 금액 표시:', { amount, totalCredits, paymentAmount, margin });
  }

  /**
   * 슬라이더 표시 업데이트
   * @param {number} tier - 선택된 단계 (1-10)
   */
  function updateSliderDisplay(tier) {
    selectedTier = tier;

    // 단계 정보 가져오기
    const tierInfo = window.MyMind3?.Constants?.getTierInfo(tier);
    if (!tierInfo) {
      console.error('[Settings] 단계 정보를 찾을 수 없음:', tier);
      return;
    }

    // 통화 정보
    const currency = window.currentCreditPurchaseCurrency || getPaymentCurrency() || 'USD';
    const rate = window.currentCreditPurchaseRate || 1;
    const symbol = getCurrencySymbol(currency);

    // 환율 적용 금액 계산
    const localPayment = currency === 'USD'
      ? tierInfo.payment
      : Math.round(tierInfo.payment * rate * 100) / 100;

    // UI 업데이트
    const sliderAmount = document.getElementById('sliderAmount');
    const sliderCredits = document.getElementById('sliderCredits');
    const sliderPayment = document.getElementById('sliderPayment');
    const sliderMargin = document.getElementById('sliderMargin');
    const sliderBonus = document.getElementById('sliderBonus');
    const sliderBonusContainer = document.getElementById('sliderBonusContainer');

    // 통화에 맞게 금액 계산
    const localAmount = currency === 'USD'
      ? tierInfo.amount
      : Math.round(tierInfo.amount * rate);

    if (sliderAmount) {
      if (currency === 'USD') {
        sliderAmount.textContent = `${symbol}${tierInfo.amount}`;
      } else {
        sliderAmount.textContent = `${symbol}${_fmtN(localAmount)}`;
      }
    }
    if (sliderCredits) sliderCredits.textContent = _fmtN(tierInfo.total);

    // 직접 입력 필드에 금액 동기화 (통화 기준, 천 단위 구분자 포함)
    const manualInput = document.getElementById('manualAmountInput');
    if (manualInput) {
      manualInput.value = formatAmountWithSeparator(localAmount, currency);
    }
    if (sliderPayment) {
      if (currency === 'USD') {
        sliderPayment.textContent = symbol + localPayment.toFixed(2);
      } else {
        sliderPayment.textContent = symbol + _fmtN(Math.round(localPayment));
      }
    }
    if (sliderMargin) sliderMargin.textContent = `${(tierInfo.margin * 100).toFixed(1)}%`;

    // v6.5: 크레딧 단독 구매는 보너스 없음 - UI 숨김
    if (sliderBonusContainer) {
      sliderBonusContainer.style.display = 'none';
    }

    // 임시 저장 (구매 시 사용)
    window.pendingTierPurchase = {
      tier: tier,
      tierInfo: tierInfo,
      currency: currency,
      rate: rate,
      localPayment: localPayment
    };

    console.log('[Settings] 슬라이더 단계 변경:', tier, tierInfo);
  }

  /**
   * v6.9: 크레딧 단독 구매 처리
   * - Stripe Checkout으로 리다이렉트
   * @param {number} tier - 선택된 단계 (1-20)
   */
  let _creditPurchaseInProgress = false;
  async function purchaseTierCredits(tier) {
    // 재진입 방지 (더블클릭/중복 호출 차단)
    if (_creditPurchaseInProgress) {
      console.warn('[Settings] 크레딧 구매 이미 진행 중, 중복 요청 무시');
      return;
    }
    _creditPurchaseInProgress = true;

    // 버튼 요소 미리 저장
    const purchaseBtn = document.getElementById('purchaseTierBtn');
    const originalText = purchaseBtn?.textContent || t('paymentCreditPurchase', '크레딧 구매');

    try {
      // 구매 정보 확인
      const pending = window.pendingTierPurchase;
      if (!pending) {
        showToast('error', t('paymentSelectCredits', '구매할 크레딧을 선택해주세요.'));
        return;
      }

      // 로그인 확인 (세션 기반 - window.currentUserId에 저장됨)
      // auth-check.js에서 인증 성공 시 window.currentUserId에 저장
      const isLoggedIn = !!window.currentUserId;

      if (!isLoggedIn) {
        showToast('error', t('paymentLoginRequired', '로그인이 필요합니다. 페이지를 새로고침 해주세요.'));
        return;
      }

      // 구매 금액 계산 (USD 기준)
      let purchaseAmountUSD;
      if (pending.tier === 'custom') {
        purchaseAmountUSD = pending.customAmount;
      } else {
        purchaseAmountUSD = pending.tierInfo.amount;
      }

      // 최소 금액 검증 ($3 이상)
      if (purchaseAmountUSD < 3) {
        showToast('error', t('paymentMinPurchaseAmount', '최소 구매 금액은 $3입니다.'));
        return;
      }

      // 버튼 로딩 상태
      if (purchaseBtn) {
        purchaseBtn.textContent = t('preparingPayment', '결제 준비 중...');
        purchaseBtn.disabled = true;
      }

      // 통화 정보
      const currency = pending.currency || getPaymentCurrency() || 'USD';

      console.log('[Settings] 크레딧 구매 요청:', {
        tier: pending.tier,
        purchaseAmountUSD,
        currency,
        totalCredits: pending.tierInfo?.total
      });

      // 서버에 Checkout 세션 생성 요청
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch('/api/credits/create-credit-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({
          amount: purchaseAmountUSD,
          currency: currency
        })
      });

      const data = await response.json();

      if (data.success && data.url) {
        console.log('[Stripe] Credit Checkout URL:', data.url);
        // 결제 진행 플래그 저장 (메인 화면 크레딧 즉시 반영용)
        sessionStorage.setItem('paymentJustCompleted', Date.now().toString());
        // Stripe Checkout 페이지로 리다이렉트
        window.location.href = data.url;
      } else {
        throw new Error(data.error || t('paymentSessionCreateFailed', '결제 세션 생성에 실패했습니다.'));
      }

    } catch (error) {
      console.error('[Settings] 크레딧 구매 실패:', error);
      showToast('error', t('paymentStartFailed', '결제 시작 실패: ') + error.message);

      // 버튼 복구
      if (purchaseBtn) {
        purchaseBtn.textContent = originalText;
        purchaseBtn.disabled = false;
      }
      _creditPurchaseInProgress = false;
    }
  }

  /**
   * 슬라이더 통화 업데이트
   * @param {string} currency - 통화 코드
   * @param {number} rate - 환율
   */
  function updateSliderCurrency(currency, rate) {
    if (selectedTier) {
      updateSliderDisplay(selectedTier);
    }
  }

  /**
   * 단계 선택 (레거시 호환)
   * @param {number} tier - 선택된 단계 (1-10)
   * @param {HTMLElement} cardElement - 카드 DOM 요소 (미사용)
   */
  function selectTier(tier, cardElement) {
    const tierSlider = document.getElementById('tierSlider');
    if (tierSlider) {
      tierSlider.value = tier;
      updateSliderDisplay(tier);
    }
  }

  /**
   * 통화 기호 가져오기
   * @param {string} currency - 통화 코드
   * @returns {string} 통화 기호
   */
  function getCurrencySymbol(currency) {
    const symbols = {
      'USD': '$',
      'KRW': '₩',
      'JPY': '¥',
      'EUR': '€',
      'GBP': '£',
      'CNY': '¥'
    };
    return symbols[currency] || currency + ' ';
  }

  /**
   * 통화별 로케일 가져오기
   * @param {string} currency - 통화 코드
   * @returns {string} 로케일 코드
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
   * 숫자를 통화 형식으로 포맷팅 (천 단위 구분자 포함)
   * @param {number} amount - 금액
   * @param {string} currency - 통화 코드
   * @returns {string} 포맷팅된 금액 문자열
   */
  function formatAmountWithSeparator(amount, currency) {
    if (isNaN(amount)) return '';
    const locale = getCurrencyLocale(currency);
    // 정수면 소수점 없이, 소수면 최대 2자리
    const isInteger = Number.isInteger(amount);
    return amount.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: isInteger ? 0 : 2
    });
  }

  /**
   * 포맷팅된 문자열에서 숫자만 추출
   * @param {string} formattedValue - 포맷팅된 문자열 (예: "1,234,567")
   * @returns {number} 숫자 값
   */
  function parseFormattedAmount(formattedValue) {
    if (!formattedValue) return 0;
    // 모든 구분자(쉼표, 마침표, 공백) 제거 후 숫자만 추출
    // 단, 소수점은 유지해야 함 - 통화에 따라 다름
    // 간단하게: 숫자와 마침표만 남기고 제거
    const cleaned = formattedValue.replace(/[^\d.]/g, '');
    return parseFloat(cleaned) || 0;
  }

  /**
   * 슬라이더 통화 업데이트 (10단계 그리드 -> 슬라이더로 변경됨)
   * @param {string} currency - 통화 코드
   * @param {number} rate - 환율
   */
  function updateTierGridCurrency(currency, rate) {
    window.currentCreditPurchaseCurrency = currency;
    window.currentCreditPurchaseRate = rate;

    const symbol = getCurrencySymbol(currency);

    // 1. 입력 필드 통화 기호 업데이트
    const inputPrefix = document.getElementById('amountInputPrefix');
    if (inputPrefix) {
      inputPrefix.textContent = symbol;
    }

    // 2. 슬라이더 라벨 업데이트
    updateSliderLabels(currency, rate);

    // 3. 힌트 텍스트 업데이트
    updateAmountHint(currency, rate);

    // 4. 선택된 단계 표시 업데이트
    if (selectedTier) {
      updateSliderDisplay(selectedTier);
    } else if (window.pendingTierPurchase?.tier === 'custom') {
      // 커스텀 금액인 경우 재계산
      const customAmount = window.pendingTierPurchase.customAmount;
      updateCustomAmountDisplay(customAmount);
    }

    console.log(`[Settings] 크레딧 구매 통화 변경: ${currency} (환율: ${rate})`);
  }

  /**
   * 슬라이더 라벨 통화 업데이트
   * v7.2: 20단계 슬라이더 전체 라벨 표시
   * 단계별 금액: [3, 5, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 100]
   * @param {string} currency - 통화 코드
   * @param {number} rate - 환율
   */
  function updateSliderLabels(currency, rate) {
    const labelsContainer = document.getElementById('tierSliderLabels');
    if (!labelsContainer) return;

    const symbol = getCurrencySymbol(currency);
    // v7.2: 20개 전체 라벨 금액
    const labelAmounts = [3, 5, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 100];

    // 동적으로 라벨 span 생성 (HTML 하드코딩 제거, 통화에 맞게 렌더링)
    labelsContainer.innerHTML = '';
    labelAmounts.forEach(usdAmount => {
      const localAmount = currency === 'USD'
        ? usdAmount
        : Math.round(usdAmount * rate);
      const span = document.createElement('span');
      span.textContent = `${symbol}${_fmtN(localAmount)}`;
      labelsContainer.appendChild(span);
    });
  }

  /**
   * 금액 입력 힌트 텍스트 업데이트
   * @param {string} currency - 통화 코드
   * @param {number} rate - 환율
   */
  function updateAmountHint(currency, rate) {
    const hintElement = document.getElementById('amountInputHint');
    if (!hintElement) return;

    const symbol = getCurrencySymbol(currency);
    const minAmount = currency === 'USD' ? 3 : Math.round(3 * rate);
    const maxAmount = currency === 'USD' ? 100 : Math.round(100 * rate);

    hintElement.textContent = `최소 ${symbol}${_fmtN(minAmount)} 이상, ${symbol}${_fmtN(maxAmount)} 초과 시 마진 15% 고정`;
  }

  // updateTierGridCurrency를 전역으로 노출 (통화 변경 시 외부에서 호출 가능)
  window.updateTierGridCurrency = updateTierGridCurrency;

  // ============================================
  // 직접 입력 구매 기능
  // ============================================

  // 직접 입력 구매 정보 저장
  let pendingCustomPurchase = null;

  /**
   * 직접 입력 금액에 대한 마진율 계산
   * v7.2: 마진율 15% 고정
   * @param {number} amountUSD - USD 금액
   * @returns {number} 마진율 (0.15)
   */
  function calculateMarginRate(amountUSD) {
    // v7.2: 모든 금액에 대해 15% 고정 마진율 적용
    return 0.15;
  }

  /**
   * 직접 입력 금액에 대한 크레딧 계산
   * - VAT 10%는 원가에 추가되지만 크레딧 발급 대상 아님
   * - 크레딧 = 원가 × 100,000 / (1 - 마진율)... 아님
   * - 실제 공식: perDollar = 100,000 / (0.8 + margin), credits = 원가 × perDollar
   * @param {number} amountUSD - USD 원가 금액
   * @returns {object} 계산 결과
   */
  function calculateCustomCredits(amountUSD) {
    const CREDITS_PER_USD = 100000;  // $1 = 100,000 크레딧
    const VAT_RATE = 0.10;  // VAT 10%
    const BASE_FACTOR = 0.80;  // 기준 인자

    // 마진율 계산
    const marginRate = calculateMarginRate(amountUSD);

    // $1당 크레딧 계산 (기존 CREDIT_TIERS와 일치하는 공식)
    // perDollar = 기본 크레딧 / (0.8 + 마진율)
    // v7.2: 마진 15% 고정: 100,000 / (0.8 + 0.15) = 105,263
    // v6.3: 반올림으로 변경 (사용자 손해 최소화)
    const perDollar = Math.round(CREDITS_PER_USD / (BASE_FACTOR + marginRate));

    // 총 크레딧 = 원가 × $1당 크레딧
    // v6.3: 반올림으로 변경 (소수점 발생 시 반올림)
    const totalCredits = Math.round(amountUSD * perDollar);

    // VAT 계산 (크레딧 발급 대상 아님)
    const vatAmount = amountUSD * VAT_RATE;

    // 결제 금액 = 원가 + VAT
    const paymentUSD = amountUSD + vatAmount;

    return {
      baseAmount: amountUSD,           // 원가 (USD)
      vatAmount: vatAmount,            // VAT (USD)
      paymentUSD: paymentUSD,          // 결제 금액 (USD)
      marginRate: marginRate,          // 적용 마진율
      marginPercent: (marginRate * 100).toFixed(1) + '%',  // 마진율 표시
      perDollar: perDollar,            // $1당 크레딧
      totalCredits: totalCredits       // 총 크레딧
    };
  }

  /**
   * 직접 입력 UI 업데이트
   * @param {object} calcResult - calculateCustomCredits 결과
   */
  function updateCustomAmountUI(calcResult) {
    const currency = window.currentCreditPurchaseCurrency || 'USD';
    const rate = window.currentCreditPurchaseRate || 1;
    const symbol = getCurrencySymbol(currency);

    // 결제 금액 (통화 변환)
    const localPayment = currency === 'USD'
      ? calcResult.paymentUSD
      : calcResult.paymentUSD * rate;

    // UI 요소 업데이트
    const baseAmountEl = document.getElementById('customBaseAmount');
    const vatAmountEl = document.getElementById('customVatAmount');
    const paymentAmountEl = document.getElementById('customPaymentAmount');
    const marginRateEl = document.getElementById('customMarginRate');
    const creditsAmountEl = document.getElementById('customCreditsAmount');
    const perDollarEl = document.getElementById('customPerDollar');
    const currencyLabelEl = document.getElementById('customCurrencyLabel');
    const resultEl = document.getElementById('customAmountResult');
    const purchaseBtn = document.getElementById('purchaseCustomBtn');

    if (baseAmountEl) baseAmountEl.textContent = '$' + calcResult.baseAmount.toFixed(2);
    if (vatAmountEl) vatAmountEl.textContent = '$' + calcResult.vatAmount.toFixed(2);
    if (paymentAmountEl) {
      if (currency === 'USD') {
        paymentAmountEl.textContent = symbol + calcResult.paymentUSD.toFixed(2);
      } else {
        paymentAmountEl.textContent = symbol + _fmtN(Math.round(localPayment));
      }
    }
    if (marginRateEl) marginRateEl.textContent = calcResult.marginPercent;
    if (creditsAmountEl) creditsAmountEl.textContent = _fmtN(calcResult.totalCredits) + ' 크레딧';
    if (perDollarEl) perDollarEl.textContent = _fmtN(calcResult.perDollar);
    if (currencyLabelEl) currencyLabelEl.textContent = currency;
    if (resultEl) resultEl.style.display = 'block';
    if (purchaseBtn) purchaseBtn.disabled = false;

    // 구매 정보 저장
    pendingCustomPurchase = {
      ...calcResult,
      currency: currency,
      rate: rate,
      localPayment: localPayment
    };

    console.log('[Settings] 직접 입력 계산 완료:', pendingCustomPurchase);
  }

  /**
   * 직접 입력 구매 초기화
   */
  function initCustomAmountPurchase() {
    const calcBtn = document.getElementById('calcCustomAmountBtn');
    const inputEl = document.getElementById('customAmountInput');
    const purchaseBtn = document.getElementById('purchaseCustomBtn');

    if (!calcBtn || !inputEl) {
      console.log('[Settings] 직접 입력 UI 요소 없음');
      return;
    }

    // 계산 버튼 클릭
    calcBtn.addEventListener('click', () => {
      const amountUSD = parseFloat(inputEl.value);

      // 최소 금액 검증 (v6.1: 최소 $3)
      if (isNaN(amountUSD) || amountUSD < 3) {
        showToast('error', t('paymentMinAmount3', '최소 $3 이상 입력해주세요.'));
        return;
      }

      // 최대 금액 제한 (선택사항)
      if (amountUSD > 10000) {
        showToast('error', t('paymentMaxAmount', '최대 $10,000까지 입력 가능합니다.'));
        return;
      }

      // 계산 및 UI 업데이트
      const result = calculateCustomCredits(amountUSD);
      updateCustomAmountUI(result);
    });

    // Enter 키로 계산
    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        calcBtn.click();
      }
    });

    // 구매 버튼 클릭
    if (purchaseBtn) {
      purchaseBtn.addEventListener('click', () => {
        if (!pendingCustomPurchase) {
          showToast('error', t('paymentEnterAmountFirst', '먼저 금액을 입력하고 계산 버튼을 클릭해주세요.'));
          return;
        }
        showCustomPurchaseModal();
      });
    }

    console.log('[Settings] 직접 입력 구매 초기화 완료');
  }

  /**
   * 직접 입력 구매 모달 표시
   */
  function showCustomPurchaseModal() {
    if (!pendingCustomPurchase) return;

    const currency = pendingCustomPurchase.currency;
    const symbol = getCurrencySymbol(currency);

    // 기존 크레딧 구매 모달 재사용
    const confirmAmount = document.getElementById('confirmPurchaseAmount');
    const confirmBase = document.getElementById('confirmBaseCredits');
    const confirmRate = document.getElementById('confirmBonusRate');
    const confirmBonus = document.getElementById('confirmBonusCredits');
    const confirmTotal = document.getElementById('confirmTotalCredits');

    if (confirmAmount) {
      if (currency === 'USD') {
        confirmAmount.textContent = symbol + pendingCustomPurchase.paymentUSD.toFixed(2);
      } else {
        confirmAmount.textContent = symbol + _fmtN(Math.round(pendingCustomPurchase.localPayment));
      }
    }

    if (confirmBase) {
      // 직접 입력은 보너스 개념이 없으므로 총 크레딧을 기본으로
      confirmBase.textContent = _fmtN(pendingCustomPurchase.totalCredits);
    }

    if (confirmRate) {
      // 마진율 표시 (보너스율 대신)
      confirmRate.textContent = t('paymentMargin', '마진') + ' ' + pendingCustomPurchase.marginPercent;
    }

    if (confirmBonus) {
      confirmBonus.textContent = '-';  // 보너스 없음
    }

    if (confirmTotal) {
      confirmTotal.textContent = _fmtN(pendingCustomPurchase.totalCredits);
    }

    // 모달 표시
    const modal = document.getElementById('creditPurchaseModal');
    if (modal) {
      modal.style.display = 'flex';
      // 직접 입력 구매임을 표시
      window.isCustomPurchase = true;
    }
  }

  // 직접 입력 구매 함수를 전역으로 노출
  window.calculateCustomCredits = calculateCustomCredits;
  window.calculateMarginRate = calculateMarginRate;
  window.initCustomAmountPurchase = initCustomAmountPurchase;

  // Phase 5: 구독 환불 계산 함수를 전역으로 노출
  window.calculateSubscriptionRefund = calculateSubscriptionRefund;
  window.formatSubscriptionRefundInfo = formatSubscriptionRefundInfo;

  // 크레딧 구매 모달 표시 (10단계 버전)
  function showCreditPurchaseModal() {
    // 10단계에서 단계가 선택되지 않은 경우
    if (!selectedTier || !window.pendingTierPurchase) {
      showToast('error', t('paymentSelectTier', '구매할 단계를 선택해주세요.'));
      return;
    }

    const purchase = window.pendingTierPurchase;
    const tierInfo = purchase.tierInfo;
    const currency = purchase.currency;
    const rate = purchase.rate;
    const symbol = getCurrencySymbol(currency);

    // 모달에 정보 표시
    const confirmAmount = document.getElementById('confirmPurchaseAmount');
    const confirmBase = document.getElementById('confirmBaseCredits');
    const confirmRate = document.getElementById('confirmBonusRate');
    const confirmBonus = document.getElementById('confirmBonusCredits');
    const confirmTotal = document.getElementById('confirmTotalCredits');

    if (confirmAmount) {
      if (currency === 'USD') {
        confirmAmount.textContent = symbol + purchase.localPayment.toFixed(2);
      } else {
        confirmAmount.textContent = symbol + _fmtN(purchase.localPayment);
      }
    }
    if (confirmBase) confirmBase.textContent = _fmtN(tierInfo.total);
    if (confirmRate) confirmRate.textContent = Math.round((1 - tierInfo.margin) * 100) + '% 효율';
    // v6.5: 크레딧 단독 구매는 보너스 없음 - HTML에서 이미 숨김 처리됨
    if (confirmBonus) {
      confirmBonus.textContent = '-';  // 보너스 없음 표시
    }
    if (confirmTotal) confirmTotal.textContent = _fmtN(tierInfo.total);

    // 임시 저장 (확인 버튼에서 사용)
    window.pendingCreditPurchase = {
      tier: selectedTier,
      amount: tierInfo.payment,          // USD 기준 VAT 포함 금액
      localAmount: purchase.localPayment, // 로컬 통화 금액
      currency: currency,
      rate: rate,
      totalCredits: tierInfo.total,
      baseCredits: tierInfo.total,
      bonusCredits: 0,
      bonusRate: 0
    };

    // 모달 표시
    const modal = document.getElementById('creditPurchaseModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  // 크레딧 구매 모달 닫기
  function closeCreditPurchaseModal() {
    const modal = document.getElementById('creditPurchaseModal');
    if (modal) {
      modal.style.display = 'none';
    }
    window.pendingCreditPurchase = null;
  }

  // 크레딧 구매 모달 이벤트 초기화
  // 중복 초기화 방지 플래그
  let creditPurchaseModalInitialized = false;

  function initCreditPurchaseModal() {
    // 이미 초기화된 경우 스킵 (중복 이벤트 리스너 방지)
    if (creditPurchaseModalInitialized) {
      console.log('[Settings] initCreditPurchaseModal 이미 초기화됨, 스킵');
      return;
    }

    const modal = document.getElementById('creditPurchaseModal');
    const closeBtn = document.getElementById('closeCreditPurchaseModal');
    const cancelBtn = document.getElementById('cancelCreditPurchaseBtn');
    const confirmBtn = document.getElementById('confirmCreditPurchaseBtn');

    // 닫기 버튼
    if (closeBtn) {
      closeBtn.addEventListener('click', closeCreditPurchaseModal);
    }

    // 취소 버튼
    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeCreditPurchaseModal);
    }

    // 결제 확인 버튼
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        processTestCreditPurchase();
      });
    }

    // 모달 외부 클릭 시 닫기
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeCreditPurchaseModal();
        }
      });
    }

    creditPurchaseModalInitialized = true;
    console.log('[Settings] initCreditPurchaseModal 초기화 완료');
  }

  // 크레딧 구매 처리 (서버 API 연동) - Phase 3: 10단계 API 사용
  async function processTestCreditPurchase() {
    const purchase = window.pendingCreditPurchase;
    if (!purchase) {
      showToast('error', t('paymentPurchaseInfoNotFound', '구매 정보를 찾을 수 없습니다.'));
      return;
    }

    // 구매 버튼 비활성화 (중복 클릭 방지)
    const confirmBtn = document.getElementById('confirmCreditPurchaseBtn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = t('paymentProcessing', '처리 중...');
    }

    try {
      // userId 가져오기
      const userId = localStorage.getItem('userId');

      // 10단계 구매인지 확인
      const isTierPurchase = purchase.tier !== undefined;

      let response, result;
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};

      if (isTierPurchase) {
        // Phase 3: 10단계 구매 API 호출
        response = await fetch('/api/credits/purchase-tier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include',
          body: JSON.stringify({
            userId: userId,
            tier: purchase.tier,
            currency: purchase.currency,
            exchangeRate: purchase.rate,
            paymentMethod: 'test'
          })
        });
      } else {
        // 기존 자유 금액 구매 API (하위 호환성)
        response = await fetch('/api/credits/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include',
          body: JSON.stringify({
            userId: userId,
            amount: purchase.amount,
            localAmount: purchase.localAmount,
            currency: purchase.currency,
            exchangeRate: purchase.rate,
            credits: purchase.totalCredits,
            bonusRate: purchase.bonusRate,
            bonusCredits: purchase.bonusCredits,
            paymentMethod: 'test'
          })
        });
      }

      result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || t('paymentProcessFailed', '결제 처리 실패'));
      }

      // 2. 서버 응답 데이터로 localStorage 업데이트
      updateLocalStorageCreditsPurchase({
        ...purchase,
        transactionId: result.data.transactionId,
        purchasedCredits: result.data.purchasedCredits || purchase.totalCredits
      });

      // 3. UI 갱신
      updateCreditDisplayAfterPurchase();

      // 4. 성공 메시지
      const creditsReceived = result.data.purchasedCredits || purchase.totalCredits;
      showToast('success', `${_fmtN(creditsReceived)} ${t('paymentCreditsCharged', '크레딧이 충전되었습니다!')}`);

      // 5. 모달 닫기
      closeCreditPurchaseModal();

      // 6. 선택 초기화 (10단계)
      if (isTierPurchase) {
        selectedTier = null;
        window.pendingTierPurchase = null;
        // 단계 카드 선택 해제
        const allCards = document.querySelectorAll('.tier-card');
        allCards.forEach(card => card.classList.remove('selected'));
        // 선택 정보 숨기기
        const infoSection = document.getElementById('selectedTierInfo');
        if (infoSection) infoSection.style.display = 'none';
        // 구매 버튼 비활성화
        const purchaseBtn = document.getElementById('purchaseCreditsBtn');
        if (purchaseBtn) purchaseBtn.disabled = true;
      }

      console.log('[Settings] 크레딧 구매 완료:', result.data);

    } catch (error) {
      console.error('크레딧 구매 처리 오류:', error);
      showToast('error', error.message || t('paymentProcessError', '결제 처리 중 오류가 발생했습니다.'));
    } finally {
      // 버튼 상태 복원
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = t('purchaseBtn', '결제하기');
      }
    }
  }

  // localStorage 크레딧 업데이트 (구매)
  function updateLocalStorageCreditsPurchase(purchaseInfo) {
    const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');

    // 기존 크레딧 정보
    const currentCredits = subscription.credits || { free: 0, service: 0, paid: 0, total: 0 };
    const currentPaidCredits = currentCredits.paid || 0;
    const newPaidCredits = currentPaidCredits + purchaseInfo.totalCredits;

    // 새 총 크레딧 계산
    const newTotal = (currentCredits.free || 0) + (currentCredits.service || 0) + newPaidCredits;

    // 결제 내역 추가 (서버에서 받은 transactionId 우선 사용)
    const transactionId = purchaseInfo.transactionId || ('TEST_' + Date.now());
    const currency = purchaseInfo.currency || getPaymentCurrency();
    const purchaseRecord = {
      date: new Date().toISOString(),
      type: 'credit_purchase',
      usdAmount: purchaseInfo.amount,           // USD 기준 금액 (환불 추적용 필수 - pay.md 섹션 17 참조)
      amount: purchaseInfo.amount,              // USD 기준 금액 (하위 호환성 유지)
      localAmount: purchaseInfo.localAmount,    // 로컬 통화 금액
      currency: currency,                       // 결제 통화
      exchangeRate: purchaseInfo.rate,          // 환율
      exchangeRateDate: new Date().toISOString(), // 환율 적용 일시 (환불 추적용)
      credits: purchaseInfo.totalCredits,
      baseCredits: purchaseInfo.baseCredits,
      bonusRate: purchaseInfo.bonusRate,
      bonusCredits: purchaseInfo.bonusCredits,
      status: 'completed',
      transactionId: transactionId
    };

    // 업데이트된 구독 정보
    const updatedSubscription = {
      ...subscription,
      credits: {
        ...currentCredits,
        paid: newPaidCredits,
        total: newTotal
      },
      paymentHistory: [
        purchaseRecord,
        ...(subscription.paymentHistory || [])
      ]
    };

    localStorage.setItem('mymind3_subscription', JSON.stringify(updatedSubscription));

    console.log('[크레딧 구매] 완료:', {
      amount: purchaseInfo.amount,
      baseCredits: purchaseInfo.baseCredits,
      bonusCredits: purchaseInfo.bonusCredits,
      totalCredits: purchaseInfo.totalCredits,
      newPaidCredits,
      newTotal,
      transactionId
    });
  }

  // 크레딧 표시 업데이트 (구매 후)
  function updateCreditDisplayAfterPurchase() {
    const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
    const credits = subscription.credits || {};

    // 크레딧 표시 요소 업데이트
    const totalCreditsEl = document.getElementById('totalCredits');
    const freeCreditsEl = document.getElementById('freeCredits');
    const serviceCreditsEl = document.getElementById('serviceCredits');
    const paidCreditsEl = document.getElementById('paidCredits');

    if (totalCreditsEl) totalCreditsEl.textContent = _fmtN(credits.total || 0);
    if (freeCreditsEl) freeCreditsEl.textContent = _fmtN(credits.free || 0);
    if (serviceCreditsEl) serviceCreditsEl.textContent = _fmtN(credits.service || 0);
    if (paidCreditsEl) paidCreditsEl.textContent = _fmtN(credits.paid || 0);

    // v7.x: 크레딧 취소 버튼 표시 업데이트
    updateCancelPaidCreditsButton(credits.paid || 0);
  }

  // 개발자 권한 확인
  const DEVELOPER_IDS = ['brilante33', 'admin', 'developer'];

  function isDeveloper() {
    const userId = localStorage.getItem('userId') || '';
    const userRole = localStorage.getItem('mymind3_user_role') || '';
    return DEVELOPER_IDS.includes(userId.toLowerCase()) ||
           userRole === 'admin' ||
           userRole === 'developer';
  }

  // 최근 30일간 취소 횟수 계산
  function getCancellationCountLast30Days() {
    const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
    const history = subscription.paymentHistory || [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const cancellations = history.filter(item => {
      if (item.type !== 'cancellation') return false;
      const itemDate = new Date(item.date);
      return itemDate >= thirtyDaysAgo;
    });

    return cancellations.length;
  }

  // 가장 오래된 취소 날짜 + 30일 계산 (제한 해제일)
  function getLimitReleaseDate() {
    const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
    const history = subscription.paymentHistory || [];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const cancellations = history
      .filter(item => {
        if (item.type !== 'cancellation') return false;
        const itemDate = new Date(item.date);
        return itemDate >= thirtyDaysAgo;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (cancellations.length === 0) return null;

    // 가장 오래된 취소 날짜 + 30일
    const oldestCancellation = new Date(cancellations[0].date);
    oldestCancellation.setDate(oldestCancellation.getDate() + 30);
    return oldestCancellation.toISOString().split('T')[0];
  }

  // 취소 제한 초과 여부 확인
  function isCancellationLimitExceeded() {
    if (isDeveloper()) return false; // 개발자는 제한 없음
    return getCancellationCountLast30Days() >= 7;
  }

  // ========== 크레딧 자동 소멸 시스템 (2025-11-26 추가) ==========

  // 크레딧 소멸 체크 및 처리
  // 2025-12-10: 무료 크레딧 제거됨, 서비스 크레딧만 소멸 체크
  function checkAndExpireCredits() {
    const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
    if (!subscription.isSubscribed || !subscription.credits) return;

    const now = new Date();
    let creditsChanged = false;
    let expiredCredits = {
      service: 0
    };

    // 유료서비스(보너스) 크레딧 소멸 체크 (구독 갱신일로부터 30일 후)
    if (subscription.credits.serviceCreditsGrantedDate) {
      const serviceGrantedDate = new Date(subscription.credits.serviceCreditsGrantedDate);
      const serviceExpireDate = new Date(serviceGrantedDate);
      serviceExpireDate.setDate(serviceExpireDate.getDate() + 30);

      if (now >= serviceExpireDate && subscription.credits.service > 0) {
        expiredCredits.service = subscription.credits.service;
        subscription.credits.service = 0;
        creditsChanged = true;
        console.log(`[크레딧 소멸] 유료서비스 크레딧 ${expiredCredits.service}개 소멸 (만료일: ${serviceExpireDate.toISOString().split('T')[0]})`);
      }
    }

    // 변경사항이 있으면 저장
    if (creditsChanged) {
      localStorage.setItem('mymind3_subscription', JSON.stringify(subscription));

      // 소멸 알림 표시
      showCreditExpiredAlert(expiredCredits);
    }
  }

  // 크레딧 소멸 예정 알림 체크 (7일 전 알림)
  // 2025-12-10: 무료 크레딧 제거됨, 서비스 크레딧만 소멸 예정 체크
  function checkCreditExpirationWarning() {
    const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
    if (!subscription.isSubscribed || !subscription.credits) return;

    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    let warnings = [];

    // 유료서비스(보너스) 크레딧 소멸 예정 체크
    if (subscription.credits.serviceCreditsGrantedDate && subscription.credits.service > 0) {
      const serviceGrantedDate = new Date(subscription.credits.serviceCreditsGrantedDate);
      const serviceExpireDate = new Date(serviceGrantedDate);
      serviceExpireDate.setDate(serviceExpireDate.getDate() + 30);

      if (serviceExpireDate <= sevenDaysFromNow && serviceExpireDate > now) {
        warnings.push({
          type: 'service',
          amount: subscription.credits.service,
          expireDate: serviceExpireDate.toISOString().split('T')[0]
        });
      }
    }

    // 경고 표시 (세션당 한 번만)
    if (warnings.length > 0) {
      const warningShownKey = `mymind3_credit_warning_${new Date().toISOString().split('T')[0]}`;
      if (!sessionStorage.getItem(warningShownKey)) {
        showCreditExpirationWarning(warnings);
        sessionStorage.setItem(warningShownKey, 'true');
      }
    }
  }

  // 크레딧 소멸 완료 알림
  // 2025-12-10: 무료 크레딧 제거됨
  function showCreditExpiredAlert(expiredCredits) {
    const currentLang = localStorage.getItem('appLanguage') || 'ko';
    const total = expiredCredits.service || 0;
    if (total === 0) return;

    let message = '';
    if (currentLang === 'ko') {
      message = `크레딧 소멸 알림\n\n`;
      if (expiredCredits.service > 0) {
        message += `• 보너스 크레딧 ${_fmtN(expiredCredits.service)}개가 소멸되었습니다.\n`;
      }
    } else {
      message = `Credit Expiration Notice\n\n`;
      if (expiredCredits.service > 0) {
        message += `• ${_fmtN(expiredCredits.service)} bonus credits have expired.\n`;
      }
    }

    alert(message);
  }

  // 크레딧 소멸 예정 경고
  // 2025-12-10: 무료 크레딧 제거됨, 서비스(보너스) 크레딧만 표시
  function showCreditExpirationWarning(warnings) {
    const currentLang = localStorage.getItem('appLanguage') || 'ko';

    let message = '';
    if (currentLang === 'ko') {
      message = `${t('paymentCreditExpirationNotice', '크레딧 소멸 예정 알림')}\n\n`;
      warnings.forEach(w => {
        const typeName = t('paymentBonus', '보너스');  // 서비스 크레딧만 남음
        message += `• ${typeName} ${t('credits', '크레딧')} ${_fmtN(w.amount)}${t('paymentWillExpireOn', '개가')} ${w.expireDate}${t('paymentExpireDate', '에 소멸됩니다.')} \n`;
      });
      message += `\n${t('paymentUseBefore', '소멸 전에 사용해 주세요!')}`;
    } else {
      message = `Credit Expiration Warning\n\n`;
      warnings.forEach(w => {
        const typeName = 'Bonus';  // 서비스 크레딧만 남음
        message += `• ${_fmtN(w.amount)} ${typeName} credits will expire on ${w.expireDate}.\n`;
      });
      message += `\nPlease use them before expiration!`;
    }

    alert(message);
  }

  // 크레딧 소멸일 계산 (표시용)
  // 2025-12-10: 무료 크레딧 제거됨, 서비스(보너스) 크레딧만 계산
  function getCreditsExpirationInfo() {
    const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
    if (!subscription.isSubscribed || !subscription.credits) return null;

    const result = {};

    // 유료서비스(보너스) 크레딧 소멸일
    if (subscription.credits.serviceCreditsGrantedDate && subscription.credits.service > 0) {
      const serviceGrantedDate = new Date(subscription.credits.serviceCreditsGrantedDate);
      const serviceExpireDate = new Date(serviceGrantedDate);
      serviceExpireDate.setDate(serviceExpireDate.getDate() + 30);
      result.serviceExpireDate = serviceExpireDate.toISOString().split('T')[0];
      result.serviceAmount = subscription.credits.service;
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  // ========== 크레딧 자동 소멸 시스템 끝 ==========

  // 취소 제한 알림 표시
  function showCancellationLimitAlert() {
    const currentLang = localStorage.getItem('appLanguage') || 'ko';
    const i18nData = window[`i18n_${currentLang.replace('-', '')}`] || window.i18n_ko;

    const count = getCancellationCountLast30Days();
    const releaseDate = getLimitReleaseDate();

    const title = i18nData?.cancelLimitTitle || '구독 제한';
    const exceeded = i18nData?.cancelLimitExceeded || '최근 30일간 구독 취소 횟수(7회)를 초과했습니다.';
    const blocked = i18nData?.cancelLimitSubscribeBlocked || '30일 후에 구독이 가능합니다.';
    const releaseDateLabel = i18nData?.cancelLimitReleaseDate || '제한 해제일';
    const currentCountLabel = i18nData?.cancelLimitCurrentCount || '현재 취소 횟수';
    const maxLabel = i18nData?.cancelLimitMax || '7회';

    alert(`${title}\n\n${exceeded}\n${blocked}\n\n${currentCountLabel}: ${count}/${maxLabel}\n${releaseDateLabel}: ${releaseDate}`);
  }

  // 결제 내역 모달 초기화
  // 중복 초기화 방지 플래그
  let paymentHistoryModalInitialized = false;

  function initPaymentHistoryModal() {
    // 이미 초기화된 경우 스킵 (중복 이벤트 리스너 방지)
    if (paymentHistoryModalInitialized) {
      console.log('[Settings] initPaymentHistoryModal 이미 초기화됨, 스킵');
      return;
    }

    const modal = document.getElementById('paymentHistoryModal');
    const closeBtn = document.getElementById('closePaymentHistoryModal');
    const closeModalBtn = document.getElementById('closePaymentHistoryModalBtn');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }

    paymentHistoryModalInitialized = true;
    console.log('[Settings] initPaymentHistoryModal 초기화 완료');
  }

  // 결제 내역 모달 표시
  function showPaymentHistoryModal() {
    const modal = document.getElementById('paymentHistoryModal');
    if (!modal) return;

    // 모달을 body에 직접 추가하여 레이어 팝업 위에 표시되도록 함
    if (modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }

    // 모달 스타일 강제 설정 (레이어 팝업 위에 표시)
    modal.style.cssText = `
      display: flex !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background-color: rgba(0, 0, 0, 0.5) !important;
      z-index: 100001 !important;
      justify-content: center !important;
      align-items: center !important;
    `;

    // 데이터 로드 및 표시
    loadPaymentHistory();
  }

  // 결제 내역 로드 및 표시 (서버 API에서 가져옴)
  async function loadPaymentHistory() {
    const tbody = document.getElementById('paymentHistoryTableBody');
    const noHistory = document.getElementById('noPaymentHistory');

    // 로딩 표시
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">${t('loadingText', '로딩 중...')}</td></tr>`;
    }

    try {
      // 서버 API에서 결제 내역 조회
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
      // ApiCache 사용 (중복 호출 방지)
      const response = window.ApiCache
        ? await window.ApiCache.fetch('/api/credits/balance')
        : await fetch('/api/credits/balance', { credentials: 'include' });
      const data = await response.json();

      let history = [];
      if (data.success && data.data?.paymentHistory) {
        history = data.data.paymentHistory;
      }

      // 서버 API가 취소 기록 포함하여 반환 (payment_status IN 'completed', 'cancelled')
      // localStorage 병합 로직 제거 - 중복 방지 (2026-01-20 버그 수정)

      // 요약 정보 업데이트
      const subscriptions = history.filter(h => h.type === 'subscription' || h.type === 'test_subscription' || h.type === 'subscription_upgrade');
      const cancellations = history.filter(h => h.type === 'cancellation');

      // 서버 데이터 기준 최근 30일 취소 계산 (localStorage 의존 제거)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const last30DaysCancels = cancellations.filter(h => new Date(h.date) >= thirtyDaysAgo).length;

      // localStorage paymentHistory를 서버 데이터로 동기화 (다른 함수들도 정확한 데이터 사용)
      try {
        const sub = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
        sub.paymentHistory = history;
        localStorage.setItem('mymind3_subscription', JSON.stringify(sub));
      } catch (e) { /* localStorage 동기화 실패 무시 */ }

      document.getElementById('totalSubscriptions').textContent = subscriptions.length;
      document.getElementById('totalCancellations').textContent = cancellations.length;
      document.getElementById('last30DaysCancellations').innerHTML = `${last30DaysCancels}<span style="font-size: 14px;">/7</span>`;

      renderPaymentHistoryTable(history);
    } catch (error) {
      console.error('[loadPaymentHistory] 서버 조회 실패, localStorage 사용:', error);
      // 서버 조회 실패 시 localStorage fallback
      const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
      const history = subscription.paymentHistory || [];

      const subscriptions = history.filter(h => h.type === 'subscription' || h.type === 'test_subscription' || h.type === 'subscription_upgrade');
      const cancellations = history.filter(h => h.type === 'cancellation');
      const last30DaysCancels = getCancellationCountLast30Days();

      document.getElementById('totalSubscriptions').textContent = subscriptions.length;
      document.getElementById('totalCancellations').textContent = cancellations.length;
      document.getElementById('last30DaysCancellations').innerHTML = `${last30DaysCancels}<span style="font-size: 14px;">/7</span>`;

      renderPaymentHistoryTable(history);
    }
  }

  // 결제 내역 테이블 렌더링
  function renderPaymentHistoryTable(history) {
    const tbody = document.getElementById('paymentHistoryTableBody');
    const noHistory = document.getElementById('noPaymentHistory');

    if (history.length === 0) {
      tbody.innerHTML = '';
      noHistory.style.display = 'block';
      return;
    }

    noHistory.style.display = 'none';

    const currentLang = localStorage.getItem('appLanguage') || 'ko';
    const i18nData = window[`i18n_${currentLang.replace('-', '')}`] || window.i18n_ko;

    // 날짜 기준 내림차순 정렬
    const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

    tbody.innerHTML = sortedHistory.map(item => {
      const typeLabel = getPaymentTypeLabel(item.type, item.packageType || item.package, i18nData);
      const typeColor = getPaymentTypeColor(item.type);
      // package, packageType, previousPackage 모두 체크
      // 크레딧 구매의 경우 amount 필드로 구매 금액 표시
      let packageName;
      if (['credit_purchase', 'credit_only', 'credit_tier'].includes(item.type) && item.amount) {
        packageName = `$${Number(item.amount).toFixed(2)}`;
      } else {
        packageName = item.package ? getPackageName(item.package, i18nData) :
                            item.packageType ? getPackageName(item.packageType, i18nData) :
                            item.previousPackage ? getPackageName(item.previousPackage, i18nData) : '-';
      }
      const credits = getCreditsDisplay(item);
      const statusLabel = getStatusLabel(item.status, i18nData);
      const statusColor = getStatusColor(item.status);
      // 날짜/시간 포맷팅 (년-월-일 시:분:초)
      const formattedDate = formatDateTime(item.date);
      // 통화 표시 (다중 통화 결제 지원)
      const currency = item.currency || 'USD';
      // 다중 통화 결제인 경우 아이콘 표시
      const isMultiCurrency = item.isMultiCurrencyPayment && item.previousPaymentCurrency !== currency;
      const currencyDisplay = isMultiCurrency
        ? `<span title="이전 결제: ${item.previousPaymentCurrency}">${mmIcon('dollar-sign', 14)} ${currency}</span>`
        : currency;

      // 인보이스/영수증 버튼 (결제 완료/취소 시 표시)
      const canSendReceipt = ['subscription', 'test_subscription', 'credit_purchase', 'credit_only', 'credit_tier', 'subscription_upgrade'].includes(item.type) && item.status === 'completed';
      const isCancellation = item.type === 'cancellation' || item.status === 'cancelled';

      let actionButtons;
      if (canSendReceipt) {
        // 결제 완료: 인보이스+영수증 통합 버튼
        actionButtons = `
          <button class="documents-btn" onclick="sendDocumentsEmail('${item.transactionId || ''}', '${item.date}', '${item.package || item.packageType || ''}', ${item.amount || 0}, '${currency}', ${item.credits || item.totalCredits || 0}, '${item.status}')"
            title="${t('paymentSendInvoiceReceipt', '인보이스 및 영수증 이메일 발송')}" style="padding: 4px 10px; font-size: 11px; cursor: pointer; border: 1px solid #6366f1; background: linear-gradient(135deg, #f8f7ff 0%, #f0fdf4 100%); color: #6366f1; border-radius: 4px; white-space: nowrap;">
            ${mmIcon('file', 14)} ${t('paymentInvoiceReceipt', '인보이스/영수증')}
          </button>
        `;
      } else if (isCancellation) {
        // 취소: 취소 인보이스+영수증 통합 버튼
        const refundAmount = item.refundAmount || 0;
        const usedCredits = item.usedCredits || item.revokedCredits?.total || ((item.revokedCredits?.free || 0) + (item.revokedCredits?.paid || 0)) || 0;
        const cancellationFee = item.cancellationFee || 0;
        actionButtons = `
          <button class="cancellation-btn" onclick="sendCancellationEmail('${item.transactionId || ''}', '${item.date}', '${item.cancelDate || item.date}', '${item.package || item.packageType || item.previousPackage || ''}', ${item.originalAmount || item.amount || 0}, ${refundAmount}, ${usedCredits}, ${cancellationFee}, '${currency}')"
            title="${t('paymentSendCancelInvoice', '취소 인보이스 및 영수증 이메일 발송')}" style="padding: 4px 10px; font-size: 11px; cursor: pointer; border: 1px solid #e74c3c; background: linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%); color: #e74c3c; border-radius: 4px; white-space: nowrap;">
            ${mmIcon('file', 14)} ${t('paymentInvoiceReceipt', '인보이스/영수증')}
          </button>
        `;
      } else {
        actionButtons = '<span style="color: #999; font-size: 11px;">-</span>';
      }

      return `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 10px; white-space: nowrap;">${formattedDate}</td>
          <td style="padding: 10px;"><span style="color: ${typeColor}; font-weight: bold;">${typeLabel}</span></td>
          <td style="padding: 10px;">${packageName}</td>
          <td style="padding: 10px; text-align: center;">${currencyDisplay}</td>
          <td style="padding: 10px; text-align: right;">${credits}</td>
          <td style="padding: 10px; text-align: center;"><span style="color: ${statusColor};">${statusLabel}</span></td>
          <td style="padding: 10px; text-align: center;">${actionButtons}</td>
        </tr>
      `;
    }).join('');
  }

  // 결제 유형 라벨
  function getPaymentTypeLabel(type, packageType, i18n) {
    // 취소 유형 세분화: 구독취소 vs 일반취소
    if (type === 'cancellation') {
      // package_type이 credit_cancel이면 일반 크레딧 취소
      if (packageType === 'credit_cancel') {
        return i18n?.typeCreditCancellation || '일반취소';
      }
      // 그 외(lite, standard, pro 등)는 구독 취소
      return i18n?.typeSubscriptionCancellation || '구독취소';
    }

    const labels = {
      'subscription': i18n?.typeSubscription || '구독',
      'test_subscription': i18n?.typeTestSubscription || '테스트 구독',
      'subscription_upgrade': i18n?.typeSubscriptionUpgrade || '업그레이드',
      'credit_purchase': i18n?.typeCreditPurchase || '크레딧 구매',
      'credit_only': i18n?.typeCreditOnly || '일반',
      'credit_tier': i18n?.typeCreditTier || '일반',
      'refund': i18n?.typeRefund || '환불'
    };
    return labels[type] || type;
  }

  // 결제 유형 색상
  function getPaymentTypeColor(type) {
    const colors = {
      'subscription': '#2196F3',
      'test_subscription': '#9C27B0',
      'subscription_upgrade': '#00BCD4',  // 청록색 (업그레이드)
      'cancellation': '#e74c3c',
      'credit_purchase': '#4CAF50',
      'credit_only': '#4CAF50',  // 일반 크레딧 구매 (녹색)
      'credit_tier': '#4CAF50',  // 일반 크레딧 구매 (녹색)
      'refund': '#FF9800'
    };
    return colors[type] || '#666';
  }

  // 패키지 이름 (v5.0: 신규/기존 ID 모두 지원)
  function getPackageName(packageType, i18n) {
    const names = {
      // v5.0 신규 ID
      'lite': i18n?.subscriptionLite || '라이트',
      'standard': i18n?.subscriptionStandard || '스탠다드',
      'pro': i18n?.subscriptionPro || '프로',
      // 기존 ID (하위 호환성)
      'plus10': i18n?.subscriptionLite || '라이트',
      'plus30': i18n?.subscriptionStandard || '스탠다드',
      'plus60': i18n?.subscriptionPro || '프로'
    };
    return names[packageType] || packageType || '-';
  }

  // 크레딧 표시
  function getCreditsDisplay(item) {
    if (item.type === 'cancellation') {
      // 회수 크레딧: revokedCredits 우선, 없으면 credits 필드 사용 (음수이면 절대값)
      let revoked = item.revokedCredits?.total || ((item.revokedCredits?.free || 0) + (item.revokedCredits?.paid || 0));
      if (!revoked && item.credits) {
        revoked = Math.abs(item.credits);
      }
      return `<span style="color: #e74c3c;">-${_fmtN(revoked)}</span>`;
    }
    // credits 또는 totalCredits 필드 체크 (0도 유효한 값으로 처리)
    const creditAmount = item.credits ?? item.totalCredits ?? null;
    if (creditAmount !== null && creditAmount !== undefined) {
      if (creditAmount === 0) {
        return `<span style="color: #888;">0</span>`;  // 0 크레딧
      }
      return `<span style="color: #4CAF50;">+${_fmtN(creditAmount)}</span>`;
    }
    return '-';
  }

  // 상태 라벨
  function getStatusLabel(status, i18n) {
    const labels = {
      'completed': i18n?.statusCompleted || '완료',
      'active': i18n?.statusActive || '활성',
      'cancelled': i18n?.statusCancelled || '취소',
      'pending': i18n?.statusPending || '대기 중',
      'refunded': i18n?.statusRefunded || '환불됨'
    };
    return labels[status] || status;
  }

  // 날짜/시간 포맷팅 (년-월-일 시:분:초)
  function formatDateTime(dateString) {
    if (!dateString) return '-';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return dateString;
    }
  }

  // 상태 색상
  function getStatusColor(status) {
    const colors = {
      'completed': '#4CAF50',
      'active': '#2196F3',
      'cancelled': '#e74c3c',
      'pending': '#FF9800',
      'refunded': '#9C27B0'
    };
    return colors[status] || '#666';
  }

  // 구독 취소 모달 초기화
  // 중복 초기화 방지 플래그
  let cancelSubscriptionModalInitialized = false;

  function initCancelSubscriptionModal() {
    // 이미 초기화된 경우 스킵 (중복 이벤트 리스너 방지)
    if (cancelSubscriptionModalInitialized) {
      console.log('[Settings] initCancelSubscriptionModal 이미 초기화됨, 스킵');
      return;
    }

    const cancelModal = document.getElementById('cancelSubscriptionModal');
    const closeCancelBtn = document.getElementById('closeCancelModal');
    const closeCancelModalBtn = document.getElementById('closeCancelModalBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const cancelInput = document.getElementById('cancelConfirmInput');
    const cancelKeywordSpan = document.getElementById('cancelKeyword');
    const cancelInputHint = document.getElementById('cancelInputHint');

    // 구독취소 버튼 클릭 시 모달 표시
    const cancelSubscriptionBtn = document.getElementById('cancelSubscriptionBtn');
    if (cancelSubscriptionBtn) {
      cancelSubscriptionBtn.addEventListener('click', () => {
        showCancelSubscriptionModal();
      });
    }

    // 닫기 버튼들
    if (closeCancelBtn) {
      closeCancelBtn.addEventListener('click', () => {
        cancelModal.style.display = 'none';
        resetCancelModal();
      });
    }

    if (closeCancelModalBtn) {
      closeCancelModalBtn.addEventListener('click', () => {
        cancelModal.style.display = 'none';
        resetCancelModal();
      });
    }

    // 입력 필드 검증 함수 (재사용 가능) - DOM을 직접 조회하여 참조 문제 해결
    function validateCancelInput() {
      const inputEl = document.getElementById('cancelConfirmInput');
      const btnEl = document.getElementById('confirmCancelBtn');
      const hintEl = document.getElementById('cancelInputHint');

      if (!inputEl) return;

      const currentLang = localStorage.getItem('appLanguage') || 'ko';
      const i18nData = window[`i18n_${currentLang.replace('-', '')}`] || window.i18n_ko;
      const expectedKeyword = i18nData?.cancelKeyword || '구독취소';

      const inputValue = inputEl.value.trim();
      const isMatch = inputValue === expectedKeyword;

      console.log('[Cancel Modal] 입력값:', inputValue, '| 예상:', expectedKeyword, '| 일치:', isMatch);

      if (btnEl) {
        btnEl.disabled = !isMatch;
        console.log('[Cancel Modal] 버튼 disabled:', btnEl.disabled);
      }

      if (hintEl) {
        hintEl.style.display = (inputValue.length > 0 && !isMatch) ? 'block' : 'none';
      }
    }

    // 전역에서 접근 가능하도록 검증 함수 노출 (이벤트 리스너보다 먼저 등록)
    window.validateCancelSubscriptionInput = validateCancelInput;

    // 입력 필드 감지 - 여러 이벤트 타입 지원 (input, keyup, change, paste)
    if (cancelInput) {
      ['input', 'keyup', 'change', 'paste'].forEach(eventType => {
        cancelInput.addEventListener(eventType, validateCancelInput);
      });
    }

    // 취소 확인 버튼
    if (confirmCancelBtn) {
      confirmCancelBtn.addEventListener('click', () => {
        processCancelSubscription();
      });
    }

    // 모달 외부 클릭 시 닫기
    if (cancelModal) {
      cancelModal.addEventListener('click', (e) => {
        if (e.target === cancelModal) {
          cancelModal.style.display = 'none';
          resetCancelModal();
        }
      });
    }

    cancelSubscriptionModalInitialized = true;
    console.log('[Settings] initCancelSubscriptionModal 초기화 완료');
  }

  // 구독 취소 모달 표시
  async function showCancelSubscriptionModal() {
    // 현재 구독 상태 확인
    const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');

    if (!subscription.isSubscribed) {
      const currentLang = localStorage.getItem('appLanguage') || 'ko';
      const i18nData = window[`i18n_${currentLang.replace('-', '')}`] || window.i18n_ko;
      alert(i18nData?.notSubscribedMsg || '현재 구독 중이 아닙니다.');
      return;
    }

    // 취소 횟수 제한 체크 (개발자 제외)
    if (isCancellationLimitExceeded()) {
      showCancellationLimitAlert();
      return;
    }

    // 현재 언어의 키워드로 업데이트
    const currentLang = localStorage.getItem('appLanguage') || 'ko';
    const i18nData = window[`i18n_${currentLang.replace('-', '')}`] || window.i18n_ko;
    const cancelKeywordSpan = document.getElementById('cancelKeyword');
    if (cancelKeywordSpan) {
      cancelKeywordSpan.textContent = i18nData?.cancelKeyword || '구독취소';
    }

    const cancelModal = document.getElementById('cancelSubscriptionModal');
    if (cancelModal) {
      cancelModal.style.display = 'flex';
    }

    // 입력 필드 초기화 및 검증 상태 업데이트
    const cancelInput = document.getElementById('cancelConfirmInput');
    if (cancelInput) {
      cancelInput.value = '';
      cancelInput.focus();
    }

    // 검증 함수 호출 (버튼 상태 초기화)
    if (typeof window.validateCancelSubscriptionInput === 'function') {
      window.validateCancelSubscriptionInput();
    }

    // 환불 정보 미리보기 로드
    await loadRefundPreview();
  }

  /**
   * Phase 5: 환불 정보 미리보기 로드
   * 구독 취소 모달에서 예상 환불 금액을 표시
   */
  async function loadRefundPreview() {
    const previewInfo = document.getElementById('refundPreviewInfo');
    const previewLoading = document.getElementById('refundPreviewLoading');
    const previewError = document.getElementById('refundPreviewError');

    // 초기 상태 설정
    if (previewInfo) previewInfo.style.display = 'none';
    if (previewLoading) previewLoading.style.display = 'block';
    if (previewError) previewError.style.display = 'none';

    try {
      // 환불 정보 계산
      const refundInfo = await calculateSubscriptionRefund();
      console.log('[Settings] 환불 정보:', refundInfo);

      if (!refundInfo.success) {
        // 에러 표시
        if (previewLoading) previewLoading.style.display = 'none';
        if (previewError) {
          previewError.style.display = 'block';
          previewError.querySelector('span').textContent =
            refundInfo.error || t('paymentRefundInfoUnavailable', '환불 정보를 가져올 수 없습니다.');
        }
        return;
      }

      // 통화 정보 가져오기
      const currency = window.currentCreditPurchaseCurrency || getPaymentCurrency() || 'USD';

      // 포맷팅된 환불 정보
      const formatted = formatSubscriptionRefundInfo(refundInfo, currency);

      // UI 업데이트
      const packageNameEl = document.getElementById('refundPackageName');
      const usagePeriodEl = document.getElementById('refundUsagePeriod');
      const remainingDaysEl = document.getElementById('refundRemainingDays');
      const estimatedAmountEl = document.getElementById('refundEstimatedAmount');

      if (packageNameEl) packageNameEl.textContent = formatted.package;
      if (usagePeriodEl) usagePeriodEl.textContent = formatted.usage;
      if (remainingDaysEl) remainingDaysEl.textContent = formatted.remaining;
      if (estimatedAmountEl) {
        estimatedAmountEl.textContent = formatted.refundAmount;
        // USD 기준 금액도 표시 (다른 통화인 경우)
        if (currency !== 'USD') {
          estimatedAmountEl.innerHTML = `${formatted.refundAmount} <span style="font-size: 12px; font-weight: 400;">(${formatted.refundAmountUSD})</span>`;
        }
      }

      // 정보 표시, 로딩 숨김
      if (previewLoading) previewLoading.style.display = 'none';
      if (previewInfo) previewInfo.style.display = 'block';

    } catch (error) {
      console.error('[Settings] 환불 정보 로드 실패:', error);
      if (previewLoading) previewLoading.style.display = 'none';
      if (previewError) {
        previewError.style.display = 'block';
        previewError.querySelector('span').textContent = t('paymentRefundInfoUnavailable', '환불 정보를 가져올 수 없습니다.');
      }
    }
  }

  // 구독 취소 모달 리셋
  function resetCancelModal() {
    const cancelInput = document.getElementById('cancelConfirmInput');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');
    const cancelInputHint = document.getElementById('cancelInputHint');

    if (cancelInput) cancelInput.value = '';
    if (confirmCancelBtn) confirmCancelBtn.disabled = true;
    if (cancelInputHint) cancelInputHint.style.display = 'none';

    // 환불 미리보기 정보 리셋
    const previewInfo = document.getElementById('refundPreviewInfo');
    const previewLoading = document.getElementById('refundPreviewLoading');
    const previewError = document.getElementById('refundPreviewError');

    if (previewInfo) previewInfo.style.display = 'none';
    if (previewLoading) previewLoading.style.display = 'none';
    if (previewError) previewError.style.display = 'none';
  }

  // ============================================================
  // 구독 버튼 상태 업데이트
  // 현재 구독 상태에 따라 버튼 표시/숨김 처리
  // 버튼 순서: 구독시작/업그레이드, 구독취소
  // ============================================================
  function updateSubscriptionButtonStates() {
    const subscribeBtn = document.getElementById('subscribeBtn');
    const cancelSubscriptionBtn = document.getElementById('cancelSubscriptionBtn');

    // 서버에서 구독 상태 가져오기 (balance API 사용)
    // ApiCache 사용 (중복 호출 방지)
    (window.ApiCache ? window.ApiCache.fetch('/api/credits/balance') : fetch('/api/credits/balance'))
      .then(res => res.json())
      .then(data => {
        if (!data.success) {
          console.log('[Settings] 구독 상태 조회 실패:', data.error);
          return;
        }

        // balance API 응답 구조: data.data.subscription.{status, package}
        const subscription = data.data?.subscription || {};
        const subscriptionStatus = subscription.status || 'inactive';
        const subscriptionPackage = subscription.package || null;

        const isActive = subscriptionStatus === 'active';
        const isCancelled = subscriptionStatus === 'cancelled';

        console.log('[Settings] 구독 상태:', {
          subscriptionStatus,
          subscriptionPackage,
          isActive,
          isCancelled
        });

        // 1. 구독 시작/업그레이드 버튼
        // 취소 상태 = 미구독 상태와 동일 (재구독 개념 없음)
        const i18n = window.i18n || {};
        if (subscribeBtn) {
          if (isActive) {
            subscribeBtn.textContent = i18n.upgradeBtn || '업그레이드';
            subscribeBtn.setAttribute('data-i18n', 'upgradeBtn');
          } else {
            // inactive, cancelled 모두 "구독 시작"
            subscribeBtn.textContent = i18n.subscribeStartBtn || '구독 시작';
            subscribeBtn.setAttribute('data-i18n', 'subscribeStartBtn');
          }
        }

        // 2. 구독 취소 버튼: 활성 구독인 경우에만 표시
        // 버튼 텍스트에 현재 구독 상품명 표시
        // 2025-12-10: only 삭제
        if (cancelSubscriptionBtn) {
          if (isActive) {
            cancelSubscriptionBtn.style.display = 'inline-block';
            // 구독취소 버튼 텍스트 설정
            const cancelText = i18n.cancelSubscriptionBtn || '구독취소';
            cancelSubscriptionBtn.textContent = cancelText;
          } else {
            cancelSubscriptionBtn.style.display = 'none';
          }
        }
      })
      .catch(err => {
        console.error('[Settings] 구독 상태 조회 오류:', err);
      });
  }

  // 성공 토스트 표시
  function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.className = 'subscription-toast success-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${mmIcon('check-circle', 16)}</span>
        <div class="toast-text">
          <strong>${message}</strong>
        </div>
      </div>
    `;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
      border: 1px solid #22c55e;
      border-radius: 12px;
      padding: 16px 24px;
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ============================================================
  // 환불 추적 헬퍼 함수들 (pay.md 섹션 17 참조)
  // ============================================================

  /**
   * 결제 히스토리에서 원본 결제 정보를 수집
   * 구독, 업그레이드, 크레딧 구매 중 환불 가능한 결제만 추출
   * @param {Array} paymentHistory - 결제 히스토리 배열
   * @returns {Array} - 환불 가능한 원본 결제 목록
   */
  function collectOriginalPayments(paymentHistory) {
    if (!Array.isArray(paymentHistory)) return [];

    // 환불 가능한 결제 유형
    const refundableTypes = ['subscription', 'subscription_upgrade', 'credit_purchase'];

    return paymentHistory
      .filter(item => refundableTypes.includes(item.type))
      .map(item => ({
        date: item.date,
        type: item.type,
        usdAmount: item.usdAmount || item.amount || 0,  // USD 기준 금액
        localAmount: item.localAmount || null,           // 로컬 통화 금액
        currency: item.currency || 'USD',                // 결제 통화
        exchangeRate: item.exchangeRate || 1,            // 결제 시점 환율
        exchangeRateDate: item.exchangeRateDate || null, // 환율 적용 일시
        credits: item.credits || 0,                      // 지급된 크레딧
        package: item.package || null,                   // 구독 패키지
        transactionId: item.transactionId || null        // 거래 ID
      }));
  }

  /**
   * 총 결제 금액 계산 (USD 기준)
   * @param {Array} originalPayments - collectOriginalPayments()로 수집된 결제 목록
   * @returns {number} - USD 기준 총 결제 금액
   */
  function calculateTotalPaidUSD(originalPayments) {
    if (!Array.isArray(originalPayments)) return 0;
    return originalPayments.reduce((sum, payment) => sum + (payment.usdAmount || 0), 0);
  }

  /**
   * 환불 금액 계산 (정책에 따라)
   * @param {Array} originalPayments - 원본 결제 목록
   * @param {string} policy - 환불 정책 ('no_refund', 'full_refund_original_currency', 'prorated_refund', 'full_refund_usd')
   * @param {number} usedDays - 사용 일수 (prorated 계산용)
   * @param {number} totalDays - 총 구독 일수 (prorated 계산용)
   * @returns {Object} - 환불 정보 { totalUSD, byPayment: [...] }
   */
  function calculateRefundAmount(originalPayments, policy = 'no_refund', usedDays = 0, totalDays = 30) {
    if (policy === 'no_refund' || !Array.isArray(originalPayments)) {
      return { totalUSD: 0, byPayment: [] };
    }

    const totalPaidUSD = calculateTotalPaidUSD(originalPayments);

    if (policy === 'full_refund_usd') {
      return {
        totalUSD: totalPaidUSD,
        byPayment: originalPayments.map(p => ({
          ...p,
          refundUSD: p.usdAmount || 0,
          refundLocal: p.localAmount || null,
          refundCurrency: p.currency || 'USD'
        }))
      };
    }

    if (policy === 'full_refund_original_currency') {
      return {
        totalUSD: totalPaidUSD,
        byPayment: originalPayments.map(p => ({
          ...p,
          refundUSD: p.usdAmount || 0,
          refundLocal: p.localAmount,
          refundCurrency: p.currency,
          refundAtOriginalRate: true  // 원래 결제 시점 환율로 환불
        }))
      };
    }

    if (policy === 'prorated_refund') {
      const unusedRatio = Math.max(0, (totalDays - usedDays) / totalDays);
      const proratedTotalUSD = totalPaidUSD * unusedRatio;

      return {
        totalUSD: Math.round(proratedTotalUSD * 100) / 100,
        unusedRatio: unusedRatio,
        usedDays: usedDays,
        totalDays: totalDays,
        byPayment: originalPayments.map(p => ({
          ...p,
          refundUSD: Math.round((p.usdAmount || 0) * unusedRatio * 100) / 100,
          refundLocal: p.localAmount ? Math.round(p.localAmount * unusedRatio * 100) / 100 : null,
          refundCurrency: p.currency
        }))
      };
    }

    return { totalUSD: 0, byPayment: [] };
  }

  /**
   * Phase 5: 구독 환불 계산
   *
   * 구독 취소 시 환불 금액을 계산합니다.
   * - 서버 API(/api/credits/refund-preview)를 호출하여 정확한 계산
   * - 오프라인 fallback: 로컬 데이터로 예상 금액 계산
   *
   * 환불 공식:
   * - 환불액 = (상품 가격 ÷ 30) × 남은 일수
   * - 서비스 크레딧(free_credits)과 구독 크레딧(service_credits)은 환불 시 소멸
   * - 일반 크레딧(paid_credits)은 취소 후에도 유지
   *
   * @param {Object} options - 옵션
   * @param {boolean} options.useServerAPI - 서버 API 사용 여부 (기본: true)
   * @param {Object} options.localSubscription - 로컬 구독 데이터 (서버 미사용 시)
   * @returns {Promise<Object>} - 환불 계산 결과
   *   {
   *     success: boolean,
   *     package: string,          // 구독 패키지 (plus10, plus30, plus60)
   *     startDate: string,        // 구독 시작일 (YYYY-MM-DD)
   *     endDate: string,          // 구독 종료일 (YYYY-MM-DD)
   *     originalAmount: number,   // 원래 결제 금액 (USD)
   *     usedDays: number,         // 사용한 일수
   *     totalDays: number,        // 총 구독 일수 (보통 30일)
   *     remainingDays: number,    // 남은 일수
   *     usedPercent: number,      // 사용 비율 (%)
   *     dailyRate: number,        // 일당 요금 (USD)
   *     refundAmount: number,     // 환불 예상 금액 (USD)
   *     creditBalance: Object,    // 현재 크레딧 잔액 {free, service, paid, total}
   *     creditsToRevoke: Object,  // 소멸될 크레딧 {free, service, total}
   *     creditsToKeep: Object,    // 유지될 크레딧 {paid}
   *     note: string              // 환불 관련 안내
   *   }
   */
  async function calculateSubscriptionRefund(options = {}) {
    const {
      useServerAPI = true,
      localSubscription = null
    } = options;

    // 서버 API 사용 (권장)
    if (useServerAPI) {
      try {
        const response = await fetch('/api/credits/refund-preview', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });

        const result = await response.json();

        if (response.ok && result.success) {
          const refund = result.refund;
          return {
            success: true,
            source: 'server',
            package: refund.package,
            startDate: refund.startDate,
            endDate: refund.endDate,
            originalAmount: refund.originalAmount,
            usedDays: refund.usedDays,
            totalDays: refund.totalDays,
            remainingDays: refund.remainingDays,
            usedPercent: refund.usedPercent,
            dailyRate: Math.round((refund.originalAmount / refund.totalDays) * 100) / 100,
            refundAmount: refund.refundAmount,
            creditBalance: refund.creditBalance,
            creditsToRevoke: {
              free: refund.creditBalance.free,
              service: refund.creditBalance.service,
              total: refund.creditBalance.free + refund.creditBalance.service
            },
            creditsToKeep: {
              paid: refund.creditBalance.paid
            },
            note: refund.note || t('paymentRefundNote', '환불 시 구독 크레딧은 소멸되며, 일반 크레딧은 유지됩니다.')
          };
        }

        // 서버 오류 시 로컬 fallback
        console.warn('[Settings] 서버 환불 계산 실패, 로컬 fallback:', result.error);
      } catch (error) {
        console.warn('[Settings] 서버 환불 API 호출 실패, 로컬 fallback:', error);
      }
    }

    // 로컬 데이터로 계산 (fallback)
    const subscription = localSubscription ||
      JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');

    // 구독 상태 확인
    if (!subscription.isSubscribed || subscription.subscriptionStatus !== 'active') {
      return {
        success: false,
        error: t('paymentNoActiveSubscription', '활성화된 구독이 없습니다.'),
        currentStatus: subscription.subscriptionStatus || 'inactive'
      };
    }

    // 날짜 계산
    const startDate = new Date(subscription.startDate || subscription.subscriptionStartDate);
    const endDate = new Date(subscription.endDate || subscription.subscriptionEndDate);
    const today = new Date();

    // 유효하지 않은 날짜 처리
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return {
        success: false,
        error: t('paymentInvalidDateInfo', '구독 날짜 정보가 유효하지 않습니다.')
      };
    }

    // 일수 계산
    const totalDays = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    const usedDays = Math.max(0, Math.ceil((today - startDate) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.max(0, totalDays - usedDays);

    // 패키지 가격 조회
    const packageType = subscription.subscriptionType || subscription.package;
    const PACKAGE_PRICES = {
      'plus10': 11,   // $10 + VAT
      'plus30': 33,   // $30 + VAT
      'plus60': 66    // $60 + VAT
    };
    const originalAmount = PACKAGE_PRICES[packageType] || 0;

    // 환불 금액 계산 (비례 환불)
    const dailyRate = originalAmount / totalDays;
    const refundAmount = Math.round(dailyRate * remainingDays * 100) / 100;

    // 사용 비율
    const usedPercent = Math.round((usedDays / totalDays) * 100);

    // 크레딧 잔액
    const credits = subscription.credits || {};
    const freeCredits = credits.free || 0;
    const serviceCredits = credits.service || 0;
    const paidCredits = credits.paid || 0;

    return {
      success: true,
      source: 'local',
      package: packageType,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      originalAmount: originalAmount,
      usedDays: usedDays,
      totalDays: totalDays,
      remainingDays: remainingDays,
      usedPercent: usedPercent,
      dailyRate: Math.round(dailyRate * 100) / 100,
      refundAmount: refundAmount,
      creditBalance: {
        free: freeCredits,
        service: serviceCredits,
        paid: paidCredits,
        total: freeCredits + serviceCredits + paidCredits
      },
      creditsToRevoke: {
        free: freeCredits,
        service: serviceCredits,
        total: freeCredits + serviceCredits
      },
      creditsToKeep: {
        paid: paidCredits
      },
      note: t('paymentRefundNote', '환불 시 구독 크레딧은 소멸되며, 일반 크레딧은 유지됩니다.')
    };
  }

  /**
   * Phase 5: 환불 정보를 사용자에게 표시하기 위한 포맷팅
   * @param {Object} refundInfo - calculateSubscriptionRefund() 반환값
   * @param {string} currency - 표시 통화 (기본: USD)
   * @returns {Object} - 포맷된 환불 정보
   */
  function formatSubscriptionRefundInfo(refundInfo, currency = 'USD') {
    if (!refundInfo.success) {
      return {
        success: false,
        error: refundInfo.error
      };
    }

    const currencySymbol = {
      'USD': '$',
      'KRW': '₩',
      'JPY': '¥',
      'EUR': '€',
      'GBP': '£',
      'CNY': '¥'
    }[currency] || '$';

    // 환율 적용 (필요시)
    const exchangeRate = window.currentExchangeRate || 1;
    const localRefundAmount = currency === 'USD'
      ? refundInfo.refundAmount
      : Math.round(refundInfo.refundAmount * exchangeRate * 100) / 100;

    const i18n = window.i18n || {};
    const daysUsed = i18n.daysUsed || '일 사용';
    const daysOf = i18n.daysOf || '일 중';
    const daysRemaining = i18n.daysRemaining || '일 남음';
    const creditsRevoked = i18n.creditsRevoked || '크레딧 소멸';
    const creditsKept = i18n.creditsKept || '크레딧 유지';

    return {
      success: true,
      package: {
        'plus10': i18n.subscriptionLite || '구독일반',
        'plus30': i18n.subscriptionStandard || '구독베스트',
        'plus60': i18n.subscriptionPro || '구독프로'
      }[refundInfo.package] || refundInfo.package,
      period: `${refundInfo.startDate} ~ ${refundInfo.endDate}`,
      usage: `${refundInfo.usedDays}${daysUsed} / ${refundInfo.totalDays}${daysOf} (${refundInfo.usedPercent}%)`,
      remaining: `${refundInfo.remainingDays}${daysRemaining}`,
      refundAmount: `${currencySymbol}${_fmtN(localRefundAmount)}`,
      refundAmountUSD: `$${refundInfo.refundAmount.toFixed(2)}`,
      creditSummary: {
        toRevoke: `${_fmtN(refundInfo.creditsToRevoke.total || 0)} ${creditsRevoked}`,
        toKeep: `${_fmtN(refundInfo.creditsToKeep.paid || 0)} ${creditsKept}`
      },
      note: refundInfo.note
    };
  }

  // ============================================================
  // 구독 취소 처리 (문서: subscription-cancellation.md 참조)
  // 취소 시 구독 상태를 'cancelled'로 변경
  // Stripe 환불 정책에 따라 환불 처리
  // 서버 API 응답 기반으로 처리 (localStorage 의존성 최소화)
  async function processCancelSubscription() {
    const currentLang = localStorage.getItem('appLanguage') || 'ko';
    const i18nData = window[`i18n_${currentLang.replace('-', '')}`] || window.i18n_ko;

    // 비례 환불 정책 (고정)
    const refundPolicy = 'prorated';

    console.log('[Settings] 구독 취소 처리 시작, 환불 정책: prorated (비례 환불)');

    // 백엔드 API 호출 (서버에서 구독 상태 확인 및 취소/환불 처리)
    try {
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
      const response = await fetch('/api/credits/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders
        },
        credentials: 'include',
        body: JSON.stringify({
          reason: 'user_requested',
          refundPolicy: refundPolicy
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('[Settings] 구독 취소 API 오류:', result);
        // 에러 메시지 표시
        const errorMessage = result.error || i18nData?.cancelSubscriptionError || '구독 취소에 실패했습니다.';
        showErrorToast(errorMessage);
        return;
      }

      console.log('[Settings] 구독 취소 API 성공:', result);

      // 서버 응답 데이터
      const { data } = result;
      const endDate = data.endDate || t('unknownError', '알 수 없음');
      const remainingCredits = data.remainingCredits || { free: 0, service: 0, paid: 0, total: 0 };
      const revokedCredits = data.revokedCredits || { free: 0, paid: 0, total: 0 };
      const originalCurrency = data.originalCurrency || 'USD';

      // localStorage 업데이트 (서버 응답 기반)
      const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
      const todayDateTime = new Date().toISOString();
      const existingHistory = subscription.paymentHistory || [];

      const cancelledSubscription = {
        ...subscription,
        isSubscribed: false,  // 비례 환불로 즉시 구독 종료
        subscriptionStatus: 'cancelled',
        autoRenewal: false,
        credits: {
          free: remainingCredits.free,
          service: remainingCredits.service,
          paid: remainingCredits.paid,
          total: remainingCredits.total
        },
        lastCancellationDate: todayDateTime.split('T')[0],
        cancellationRequestDate: todayDateTime,
        paymentHistory: [
          {
            date: todayDateTime,
            type: 'cancellation',
            previousPackage: data.previousPackage || subscription.subscriptionType,
            status: 'cancelled',
            currency: originalCurrency,
            revokedCredits: revokedCredits,
            effectiveEndDate: endDate,
            creditsAtCancellation: remainingCredits,
            note: data.note || t('paymentProratedCancel', '비례 환불 구독 취소 - 즉시 종료')
          },
          ...existingHistory
        ]
      };

      localStorage.setItem('mymind3_subscription', JSON.stringify(cancelledSubscription));

      // userInfo도 동기화 (구독 상태 비동기화 방지)
      const currentUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      currentUserInfo.subscriptionStatus = 'cancelled';
      localStorage.setItem('userInfo', JSON.stringify(currentUserInfo));

      // 모달 닫기
      const cancelModal = document.getElementById('cancelSubscriptionModal');
      if (cancelModal) {
        cancelModal.style.display = 'none';
      }
      resetCancelModal();

      // 환불 정보 확인
      const refundInfo = data.refund;

      // 성공 메시지 (환불 여부에 따라 다르게)
      let successMessage;
      if (refundInfo && refundInfo.refunded) {
        const refundAmount = refundInfo.amount.toFixed(2);
        const refundCurrency = (refundInfo.currency || 'usd').toUpperCase();
        successMessage = i18nData?.cancelSuccessWithRefund
          || `구독이 취소되고 ${refundAmount} ${refundCurrency}가 환불 처리되었습니다. 환불 금액은 3-5 영업일 내에 원래 결제 수단으로 반환됩니다.`;
      } else {
        successMessage = i18nData?.cancelSuccessWithEndDate
          || `구독이 취소되었습니다. ${endDate}까지 서비스를 이용하실 수 있습니다.`;
      }
      showCancelSuccessToast(successMessage, remainingCredits, endDate, refundInfo);

      // ApiCache 무효화 (크레딧 잔액 캐시 갱신)
      if (window.ApiCache) {
        window.ApiCache.invalidate('/api/credits/balance');
      }

      // 헤더 크레딧 표시 갱신 (메인 페이지의 전역 함수)
      if (window.updateCreditBalanceUI) {
        window.updateCreditBalanceUI(remainingCredits);
      }

      // UI 업데이트
      updateCreditDisplay();
      updateSubscriptionButtonStates();
      // 패키지 카드 상태 업데이트 (회색조 제거, 선택 가능하게)
      updatePackageSelectionUI();

      // AI 설정 결제 옵션 상태 업데이트
      if (window.MyMind3AISettings) {
        window.MyMind3AISettings.setUserCreditBalance(remainingCredits.total);
        window.MyMind3AISettings.updateAllPaymentOptionStates();
      }

      console.log('[Settings] 구독 취소 완료:', cancelledSubscription);

    } catch (error) {
      console.error('[Settings] 구독 취소 API 호출 실패:', error);
      const errorMessage = i18nData?.networkError || '네트워크 오류가 발생했습니다. 다시 시도해주세요.';
      showErrorToast(errorMessage);
    }
  }

  // 에러 토스트 표시
  function showErrorToast(message) {
    const toast = document.createElement('div');
    toast.className = 'subscription-toast error-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${mmIcon('x-circle', 16)}</span>
        <div class="toast-text">
          <strong>${message}</strong>
        </div>
      </div>
    `;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      border: 1px solid #ef4444;
      border-radius: 12px;
      padding: 16px 24px;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // 구독 취소 성공 토스트
  // currentCredits: 유지되는 크레딧 정보, endDate: 서비스 종료일, refundInfo: 환불 정보
  function showCancelSuccessToast(message, currentCredits, endDate, refundInfo = null) {
    const totalCredits = (currentCredits.free || 0) + (currentCredits.service || 0) + (currentCredits.paid || 0);
    const hasRefund = refundInfo && refundInfo.refunded;
    const toast = document.createElement('div');
    toast.className = 'subscription-toast cancel-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${hasRefund ? mmIcon('dollar-sign', 16) : mmIcon('calendar', 16)}</span>
        <div class="toast-text">
          <strong>${message}</strong>
          ${hasRefund
            ? `<span style="color: #4CAF50;">환불: $${refundInfo.amount.toFixed(2)} ${(refundInfo.currency || 'usd').toUpperCase()}</span>`
            : `<span>현재 크레딧: ${_fmtN(totalCredits)}C (종료일까지 유지)</span>`
          }
          ${!hasRefund && endDate ? `<span style="font-size: 12px; opacity: 0.8;">서비스 종료일: ${endDate}</span>` : ''}
        </div>
      </div>
    `;

    // 스타일 추가 (주황색 계열로 변경 - 취소지만 서비스는 유지됨을 표시)
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 1px solid #f59e0b;
      border-radius: 12px;
      padding: 16px 24px;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 4000);  // 4초로 늘림 (정보가 더 많아서)
  }

  // ========== Stripe Checkout 결제 처리 ==========

  /**
   * Stripe Checkout을 통한 실제 결제 처리
   * @returns {Promise<void>}
   */
  async function processStripeCheckout() {
    try {
      // v6.5: 검증은 processSubscription()에서 이미 수행됨
      const selectedPackage = document.querySelector('input[name="subscription"]:checked');
      if (!selectedPackage) {
        showToast('error', t('paymentSelectPackage', '패키지를 선택해주세요.'));
        return;
      }

      const packageType = selectedPackage.dataset.packageType || PRICE_TO_PACKAGE_TYPE[selectedPackage.value];
      const packageInfo = SUBSCRIPTION_PACKAGES[packageType];
      const i18n = window.i18n || {};
      if (!packageInfo) {
        showToast('error', i18n.invalidPackageError || '유효하지 않은 패키지입니다.');
        return;
      }

      // v6.5: 로딩 표시 - 메인 구독 버튼 사용
      const subscribeBtn = document.getElementById('subscribeBtn');
      const originalText = subscribeBtn?.textContent || i18n.subscribeStartBtn || '구독 시작';
      if (subscribeBtn) {
        subscribeBtn.textContent = i18n.preparingPayment || '결제 준비 중...';
        subscribeBtn.disabled = true;
      }

      // 현재 선택된 통화
      const currency = getPaymentCurrency();

      // v7.4: 자동결제 체크박스 상태 확인
      const autopayCheckbox = document.getElementById('autopayCheckbox');
      const isAutopay = autopayCheckbox && autopayCheckbox.checked;

      console.log('[Stripe] Checkout 세션 생성 요청:', { packageType, currency, isAutopay });

      // CSRF 헤더 확인
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};

      // v8.4: 업그레이드 여부 확인 → 업그레이드면 비례 정산 API 호출
      const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const currentPackage = subscription.subscriptionType || null;
      const subscriptionStatus = subscription.subscriptionStatus || userInfo.subscriptionStatus || 'inactive';
      const selectability = isPackageSelectable(packageType, currentPackage, subscriptionStatus);
      const isUpgrade = selectability.action === 'upgrade';

      let requestBody, apiUrl;
      if (isUpgrade) {
        // 업그레이드: 비례 정산 체크아웃 API
        apiUrl = '/api/credits/create-upgrade-checkout';
        requestBody = {
          new_package: packageType,
          currency: currency
        };
        console.log('[Stripe] 업그레이드 Checkout 요청:', requestBody);
      } else {
        // 신규 구독: 기존 체크아웃 API
        apiUrl = '/api/credits/create-checkout';
        requestBody = {
          package_type: packageType,
          currency: currency,
          is_autopay: isAutopay  // v7.4: 자동결제 보너스 +9% 적용 여부
        };
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      // API 응답 구조: { success: true, data: { sessionId, url } }
      const checkoutUrl = data.data?.url || data.url;
      if (data.success && checkoutUrl) {
        console.log('[Stripe] Checkout URL:', checkoutUrl);
        // 결제 진행 플래그 저장 (메인 화면 크레딧 즉시 반영용)
        sessionStorage.setItem('paymentJustCompleted', Date.now().toString());
        // Stripe Checkout 페이지로 리다이렉트
        window.location.href = checkoutUrl;
      } else {
        throw new Error(data.error || data.message || t('paymentSessionCreateFailed', '결제 세션 생성에 실패했습니다.'));
      }

    } catch (error) {
      console.error('[Stripe] Checkout 실패:', error);
      showToast('error', t('paymentStartFailed', '결제 시작 실패: ') + error.message);

      // v6.5: 버튼 복구 - 메인 구독 버튼 사용
      const subscribeBtn = document.getElementById('subscribeBtn');
      const i18nRestore = window.i18n || {};
      if (subscribeBtn) {
        subscribeBtn.textContent = i18nRestore.subscribeStartBtn || '구독 시작';
        subscribeBtn.disabled = false;
      }
    }
  }

  /**
   * 결제 모드 선택 (Stripe 또는 테스트)
   * v6.5: 확인 모달 제거 - 바로 결제 진행
   */
  let _subscriptionInProgress = false;
  async function processSubscription() {
    // 재진입 방지 (더블클릭/중복 호출 차단)
    if (_subscriptionInProgress) {
      console.warn('[Settings] 구독 결제 이미 진행 중, 중복 요청 무시');
      return;
    }
    _subscriptionInProgress = true;

    try {
      // 1. 취소 횟수 제한 체크 (개발자 제외)
      if (isCancellationLimitExceeded()) {
        showCancellationLimitAlert();
        return;
      }

      // 2. 패키지 선택 검증
      const selectedPackage = document.querySelector('input[name="subscription"]:checked');
      if (!selectedPackage) {
        showToast('error', t('paymentSelectSubscription', '구독 패키지를 선택해주세요.'));
        return;
      }

      // 3. 패키지 정보 검증
      const packageType = selectedPackage.dataset.packageType || PRICE_TO_PACKAGE_TYPE[selectedPackage.value];
      const packageInfo = SUBSCRIPTION_PACKAGES[packageType];
      if (!packageInfo) {
        showToast('error', t('paymentInvalidPackage', '유효하지 않은 패키지입니다.'));
        return;
      }

      // 4. 업그레이드인 경우 통화 검증
      const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const currentPackage = subscription.subscriptionType || null;
      // mymind3_subscription.subscriptionStatus를 우선 사용 (취소 시 userInfo 미갱신 방지)
      const subscriptionStatus = subscription.subscriptionStatus || userInfo.subscriptionStatus || 'inactive';
      const selectability = isPackageSelectable(packageType, currentPackage, subscriptionStatus);

      if (selectability.action === 'upgrade') {
        const approved = await validateAndApplyUpgradeCurrency();
        if (!approved) {
          return; // 사용자가 취소함
        }
      }

      // 5. Stripe 결제 모드 사용 여부 (환경 변수나 설정으로 제어 가능)
      const useStripe = window.STRIPE_ENABLED !== false;  // 기본값: true

      if (useStripe) {
        await processStripeCheckout();
      } else {
        await processTestSubscription();
      }
    } finally {
      // 성공 시 페이지 리다이렉트되므로 여기 도달 = 실패/취소
      _subscriptionInProgress = false;
    }
  }

  // 테스트 구독 처리
  async function processTestSubscription() {
    try {
      const selectedPackage = document.querySelector('input[name="subscription"]:checked');
      if (!selectedPackage) return;

      // 환율 변환된 값 대신 data-package-type 속성 사용 (환율과 무관하게 패키지 식별)
      const packageType = selectedPackage.dataset.packageType || PRICE_TO_PACKAGE_TYPE[selectedPackage.value];
      const packageInfo = SUBSCRIPTION_PACKAGES[packageType];
      if (!packageInfo) {
        console.error('[Settings] processTestSubscription - 패키지 정보를 찾을 수 없습니다:', packageType);
        return;
      }

    // 총 크레딧 계산 (2025-12-10: 무료 크레딧 제거됨, serviceCredits만 사용)
    const serviceCredits = packageInfo.serviceCredits;
    const totalCredits = serviceCredits;  // baseCredits + bonusCredits

    // 현재 날짜
    const today = new Date();
    const startDateTime = today.toISOString();  // 전체 ISO 문자열 (시간 포함)
    const startDate = startDateTime.split('T')[0];  // 날짜만 (구독 기간용)
    const endDate = new Date(today.setMonth(today.getMonth() + 1)).toISOString().split('T')[0];

    // 기존 구독 정보 가져오기
    const existingSubscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
    const existingHistory = existingSubscription.paymentHistory || [];
    const previousPackageType = existingSubscription.subscriptionType || null;
    const previousPackageInfo = previousPackageType ? SUBSCRIPTION_PACKAGES[previousPackageType] : null;

    // 업그레이드 여부 확인
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const subscriptionStatus = userInfo.subscriptionStatus || 'inactive';
    const selectability = isPackageSelectable(packageType, previousPackageType, subscriptionStatus);
    const isUpgrade = selectability.action === 'upgrade';

    // ========== 서버 API 호출 (DB 크레딧 업데이트) ==========
    const userId = localStorage.getItem('userId') || 'guest';
    // 통화 정보를 API 호출 전에 가져옴 (DB에 저장하기 위해)
    const apiCurrency = getPaymentCurrency();
    const apiExchangeRates = window.exchangeRates || {};
    const apiExchangeRate = apiExchangeRates[apiCurrency] || 1;
    console.log('[processTestSubscription] 서버 API 호출:', { userId, packageType, isUpgrade, currency: apiCurrency, exchangeRate: apiExchangeRate });

    try {
      let response;
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
      if (isUpgrade) {
        // 업그레이드인 경우: /api/credits/upgrade API 호출
        console.log('[processTestSubscription] 업그레이드 API 호출:', { new_package: packageType, currency: apiCurrency });
        response = await fetch('/api/credits/upgrade', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...csrfHeaders
          },
          credentials: 'include',
          body: JSON.stringify({
            new_package: packageType,
            userId: userId,
            currency: apiCurrency,
            exchange_rate: apiExchangeRate
          })
        });
      } else {
        // 신규 구독인 경우: /api/credits/subscribe API 호출
        response = await fetch('/api/credits/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...csrfHeaders
          },
          credentials: 'include',
          body: JSON.stringify({
            package_type: packageType,
            userId: userId,
            currency: apiCurrency,
            exchange_rate: apiExchangeRate
          })
        });
      }

      const result = await response.json();
      console.log('[processTestSubscription] 서버 응답:', result);

      if (!result.success) {
        console.error('[processTestSubscription] 서버 API 실패:', result.error);
        // 서버 실패해도 localStorage는 업데이트 (오프라인 지원)
      }
    } catch (apiError) {
      console.error('[processTestSubscription] 서버 API 호출 에러:', apiError.message);
      // 서버 에러 시에도 localStorage 업데이트는 진행
    }
    // ========== 서버 API 호출 끝 ==========

    // 결제 내역 생성 (업그레이드/신규 모두 1개씩만 추가, 기존 내역은 유지)
    const newPaymentRecords = [];
    const currency = getPaymentCurrency();
    // 환율 정보 가져오기 (환불 추적용 - pay.md 섹션 17 참조)
    const exchangeRates = window.exchangeRates || {};
    const exchangeRate = exchangeRates[currency] || 1;

    // 이전 구독의 통화 정보 조회 (다중 통화 결제 지원)
    const previousSubscriptionCurrency = getOriginalSubscriptionCurrency();
    const previousPayment = existingHistory.find(h => h.type === 'subscription' || h.type === 'subscription_upgrade');

    if (isUpgrade && previousPackageInfo) {
      // 업그레이드인 경우: 차액 결제 내역 1개만 추가 (기존 내역은 existingHistory에 이미 있음)
      // 부동소수점 오차 방지를 위해 소수점 2자리 반올림
      const priceDifference = Math.round((packageInfo.price - previousPackageInfo.price) * 100) / 100;

      // 크레딧 차이 계산 (서비스 크레딧 차이만 - 무료 크레딧은 이미 지급됨)
      // 문서 섹션 16.6 참조: plus10 → plus30 = 1,515,000C (2,273,000 - 758,000)
      const creditDifference = packageInfo.serviceCredits - previousPackageInfo.serviceCredits;

      // 다중 통화 결제 여부 확인
      const isMultiCurrencyPayment = previousSubscriptionCurrency && previousSubscriptionCurrency !== currency;

      newPaymentRecords.push({
        date: startDateTime,
        type: 'subscription_upgrade',
        package: packageType,
        usdAmount: priceDifference,  // USD 기준 금액 (환불 추적용 필수)
        amount: priceDifference,  // 차액만 결제 (반올림됨) - 하위 호환성 유지
        localAmount: Math.round(priceDifference * exchangeRate * 100) / 100,  // 로컬 통화 금액
        originalAmount: packageInfo.price,  // 원래 가격 (참고용)
        currency: currency,
        exchangeRate: exchangeRate,  // 결제 시점 환율
        exchangeRateDate: new Date().toISOString(),  // 환율 적용 일시
        credits: creditDifference,  // 크레딧 차이 (추가 발급분)
        totalCreditsAfter: totalCredits,  // 업그레이드 후 새 패키지의 총 크레딧 (참고용)
        status: 'test_completed',
        description: `${previousPackageInfo.name} → ${packageInfo.name} 업그레이드`,
        previousPackage: previousPackageType,
        previousAmount: previousPackageInfo.price,
        previousCredits: previousPackageInfo.serviceCredits,  // 이전 패키지 크레딧 (참고용, 2025-12-10: 무료크레딧 제거)
        // 다중 통화 결제 정보 (환불 추적용)
        isMultiCurrencyPayment: isMultiCurrencyPayment,
        previousPaymentCurrency: previousSubscriptionCurrency || currency,
        previousPaymentExchangeRate: previousPayment?.exchangeRate || 1,
        previousPaymentLocalAmount: previousPayment?.localAmount || previousPackageInfo.price
      });

      console.log('[processTestSubscription] 업그레이드 결제 내역 생성:', {
        previousPackage: previousPackageType,
        previousPrice: previousPackageInfo.price,
        previousServiceCredits: previousPackageInfo.serviceCredits,
        newPackage: packageType,
        newPrice: packageInfo.price,
        newServiceCredits: packageInfo.serviceCredits,
        priceDifference,
        creditDifference,  // 추가된 크레딧 차이 로그
        // 다중 통화 결제 정보
        isMultiCurrencyPayment,
        currentCurrency: currency,
        previousCurrency: previousSubscriptionCurrency
      });
    } else {
      // 신규 구독인 경우: 1개의 결제 내역 생성
      newPaymentRecords.push({
        date: startDateTime,
        type: 'subscription',
        package: packageType,
        usdAmount: packageInfo.price,  // USD 기준 금액 (환불 추적용 필수)
        amount: packageInfo.price,  // 하위 호환성 유지
        localAmount: Math.round(packageInfo.price * exchangeRate * 100) / 100,  // 로컬 통화 금액
        currency: currency,
        exchangeRate: exchangeRate,  // 결제 시점 환율
        exchangeRateDate: new Date().toISOString(),  // 환율 적용 일시
        credits: totalCredits,
        status: 'test_completed'
      });
    }

    // 크레딧 계산 (업그레이드/신규 구분)
    let creditsData;
    let displayCredits;  // 성공 메시지에 표시할 크레딧

    if (isUpgrade && previousPackageInfo) {
      // 업그레이드: 기존 크레딧에 차액분 추가
      // 서버에서는 service_credits = service_credits + creditDifference 처리
      const existingService = existingSubscription.credits?.service || 0;
      const creditDifference = packageInfo.serviceCredits - previousPackageInfo.serviceCredits;
      const newServiceCredits = existingService + creditDifference;

      // 2025-12-10: 무료 크레딧 제거됨
      creditsData = {
        free: 0,  // 무료 크레딧 제거
        service: newServiceCredits,  // 기존 + 추가 (서버와 동일하게)
        paid: existingSubscription.credits?.paid || 0,
        total: newServiceCredits + (existingSubscription.credits?.paid || 0),
        serviceCreditsGrantedDate: startDate  // 업그레이드 날짜로 갱신 (추가 지급)
      };
      displayCredits = creditDifference;  // 추가된 크레딧만 표시

      console.log('[processTestSubscription] 업그레이드 크레딧 계산:', {
        existingService,
        creditDifference,
        newServiceCredits,
        total: creditsData.total
      });
    } else {
      // 신규 구독: 새 패키지 크레딧으로 초기화
      // 2025-12-10: 무료 크레딧 제거됨
      creditsData = {
        free: 0,  // 무료 크레딧 제거
        service: serviceCredits,
        paid: existingSubscription.credits?.paid || 0,
        total: totalCredits + (existingSubscription.credits?.paid || 0),
        serviceCreditsGrantedDate: startDate
      };
      displayCredits = totalCredits;
    }

    // 새 구독 정보 저장 (localStorage)
    const subscriptionData = {
      isSubscribed: true,
      subscriptionStatus: 'active',  // 구독 상태 명시 (누락 버그 수정)
      subscriptionType: packageType,
      subscriptionStartDate: startDate,
      subscriptionEndDate: endDate,
      credits: creditsData,
      lastPaymentDate: startDate,
      paymentHistory: [
        ...newPaymentRecords,
        ...existingHistory
      ]
    };

    localStorage.setItem('mymind3_subscription', JSON.stringify(subscriptionData));

    // userInfo에도 구독 상태 업데이트
    const updatedUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    updatedUserInfo.subscriptionStatus = 'active';
    updatedUserInfo.subscriptionType = packageType;
    localStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));

    // 모달 닫기
    const modal = document.getElementById('subscriptionConfirmModal');
    if (modal) {
      modal.style.display = 'none';
    }

    // 성공 메시지 표시 (업그레이드 시 추가 크레딧만 표시, 신규 시 전체 크레딧)
    if (isUpgrade) {
      showSubscriptionUpgradeToast(previousPackageInfo.name, packageInfo.name, displayCredits);
    } else {
      showSubscriptionSuccessToast(packageInfo.name, displayCredits);
    }

    // 크레딧 구매 섹션 업데이트
    updateCreditPurchaseAccess();

    // 페이지 크레딧 정보 업데이트 (있다면)
    updateCreditDisplay();

    // 패키지 카드 상태 갱신 (업그레이드 후 하위 패키지 비활성화)
    updatePackageSelectionUI();

    // 결제 정보 탭 크레딧 UI 갱신
    await loadPaymentCreditBalance();

    // AI 설정 결제 옵션 상태 업데이트 (크레딧 버튼 활성화)
    // 세 번째 IIFE의 전역 함수 호출 (IIFE 간 스코프 분리로 인한 전역 호출 필요)
    const newCreditBalance = creditsData.total;  // 계산된 총 크레딧 사용
    if (window.MyMind3AISettings) {
      window.MyMind3AISettings.setUserCreditBalance(newCreditBalance);
      window.MyMind3AISettings.updateAllPaymentOptionStates();
    }

    // 메인 화면 크레딧 UI 즉시 업데이트
    // index.html의 getCreditBalance와 updateCreditBalanceUI 함수 호출
    if (typeof window.getCreditBalance === 'function' && typeof window.updateCreditBalanceUI === 'function') {
      try {
        const balance = await window.getCreditBalance();
        if (balance && balance.credits) {
          window.updateCreditBalanceUI(balance.credits);
          console.log('[processTestSubscription] 메인 화면 크레딧 UI 업데이트 완료:', balance.credits);
        }
      } catch (e) {
        console.warn('[processTestSubscription] 메인 화면 크레딧 UI 업데이트 실패:', e);
      }
    } else {
      console.log('[processTestSubscription] 메인 화면 크레딧 함수 없음 - 커스텀 이벤트 발생');
      // 커스텀 이벤트로 메인 화면에 알림
      window.dispatchEvent(new CustomEvent('creditBalanceUpdated', {
        detail: { credits: { total: newCreditBalance } }
      }));
    }
    } catch (error) {
      console.error('[processTestSubscription] 에러:', error.message);
    }
  }

  // 구독 성공 토스트 메시지
  function showSubscriptionSuccessToast(packageName, credits) {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.subscription-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // 새 토스트 생성
    const toast = document.createElement('div');
    toast.className = 'subscription-toast';
    toast.innerHTML = `
      <div class="toast-icon">${mmIcon('check-circle', 24)}</div>
      <div class="toast-content">
        <div class="toast-title">구독이 활성화되었습니다!</div>
        <div class="toast-desc">${packageName} - ${_fmtN(credits)} 크레딧 지급</div>
      </div>
    `;

    // 스타일 적용
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 10000;
      animation: toastSlideIn 0.3s ease-out;
    `;

    // 스타일시트에 애니메이션 추가
    if (!document.querySelector('#toast-animation-style')) {
      const style = document.createElement('style');
      style.id = 'toast-animation-style';
      style.textContent = `
        @keyframes toastSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastSlideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        .subscription-toast .toast-icon { font-size: 24px; }
        .subscription-toast .toast-title { font-weight: 600; font-size: 14px; }
        .subscription-toast .toast-desc { font-size: 12px; opacity: 0.9; margin-top: 4px; }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // 3초 후 자동 제거
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // 구독 업그레이드 토스트 메시지
  function showSubscriptionUpgradeToast(fromPackage, toPackage, addedCredits) {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.subscription-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // 새 토스트 생성
    const toast = document.createElement('div');
    toast.className = 'subscription-toast';
    toast.innerHTML = `
      <div class="toast-icon">${mmIcon('arrow-up', 20)}</div>
      <div class="toast-content">
        <div class="toast-title">구독이 업그레이드되었습니다!</div>
        <div class="toast-desc">${fromPackage} → ${toPackage}</div>
        <div class="toast-desc">+${_fmtN(addedCredits)} 크레딧 추가 지급</div>
      </div>
    `;

    // 스타일 적용 (업그레이드는 파란색 그라디언트)
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 10000;
      animation: toastSlideIn 0.3s ease-out;
    `;

    // 스타일시트에 애니메이션 추가 (이미 있으면 스킵)
    if (!document.querySelector('#toast-animation-style')) {
      const style = document.createElement('style');
      style.id = 'toast-animation-style';
      style.textContent = `
        @keyframes toastSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastSlideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        .subscription-toast .toast-icon { font-size: 24px; }
        .subscription-toast .toast-title { font-weight: 600; font-size: 14px; }
        .subscription-toast .toast-desc { font-size: 12px; opacity: 0.9; margin-top: 4px; }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // 4초 후 자동 제거 (업그레이드는 정보가 더 많아서 조금 더 오래 표시)
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // 크레딧 표시 업데이트 (페이지에 크레딧 정보가 있다면)
  function updateCreditDisplay() {
    const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
    if (!subscription.credits) return;

    // 크레딧 잔액 표시 요소가 있다면 업데이트
    const creditBalanceEl = document.getElementById('creditBalance');
    if (creditBalanceEl) {
      creditBalanceEl.textContent = _fmtN(subscription.credits.total);
    }
  }

  // 로그인 상태 확인 (2025-12-10 수정: 구독자 → 로그인 사용자)
  // Settings 페이지는 로그인 후에만 접근 가능하므로 항상 크레딧 구매 가능
  function checkSubscriberStatus() {
    // 구독 정보 확인 (mymind3_subscription에서 읽기)
    const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');

    let subscriptionStatus = subscription.subscriptionStatus;

    // subscriptionStatus가 없지만 isSubscribed가 true면 'active'로 처리
    if (!subscriptionStatus && subscription.isSubscribed && subscription.subscriptionType) {
      subscriptionStatus = 'active';
    }

    // 구독 상품 구매한 경우 (active 또는 cancelled 상태)
    const isSubscriber = subscriptionStatus === 'active' || subscriptionStatus === 'cancelled';

    // 2025-12-10: 크레딧 단독 구매는 로그인만 하면 가능하도록 변경
    // Settings 페이지는 레이어 팝업으로 로그인 후에만 접근 가능하므로 항상 true
    // userId가 localStorage에 없을 수 있으므로 userInfo나 세션 쿠키로 확인
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const hasUserInfo = Object.keys(userInfo).length > 0;
    const hasUserId = !!localStorage.getItem('userId');
    // Settings 페이지 접근 자체가 로그인이 필요하므로, userInfo가 있거나 Settings 페이지에 있으면 로그인된 것
    const isLoggedIn = hasUserId || hasUserInfo || document.getElementById('creditPurchaseSection') !== null;

    return {
      isSubscriber,
      canPurchaseCredits: isLoggedIn  // 구독자 → 로그인 사용자로 변경
    };
  }

  // 크레딧 구매 섹션 활성화/비활성화
  // Settings 페이지는 로그인 후에만 접근 가능하므로 구독 상태만 확인
  function updateCreditPurchaseAccess() {
    const status = checkSubscriberStatus();
    const notice = document.getElementById('subscriberNotice');
    const form = document.getElementById('creditPurchaseForm');
    const amountInput = document.getElementById('creditAmount');
    const purchaseBtn = document.getElementById('purchaseCreditsBtn');

    if (status.canPurchaseCredits) {
      // 구독자: 활성화
      if (notice) notice.classList.add('hidden');
      if (form) form.classList.remove('disabled');
      if (amountInput) amountInput.disabled = false;
      if (purchaseBtn) purchaseBtn.disabled = false;
    } else {
      // 비구독자: 비활성화 (구독 안내 메시지 표시)
      if (notice) notice.classList.remove('hidden');
      if (form) form.classList.add('disabled');
      if (amountInput) amountInput.disabled = true;
      if (purchaseBtn) purchaseBtn.disabled = true;
    }
  }

  // 크레딧 잔액 로드
  async function loadPaymentCreditBalance() {
    try {
      console.log('[Payment] Loading credit balance...');
      // ApiCache 사용 (중복 호출 방지)
      const response = window.ApiCache
        ? await window.ApiCache.fetch('/api/credits/balance')
        : await fetch('/api/credits/balance', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        console.log('[Payment] API response:', data);
        updatePaymentCreditUI(data);
      } else {
        console.error('[Payment] API error:', response.status);
      }
    } catch (error) {
      console.error('[Payment] 크레딧 잔액 로드 실패:', error);
    }
  }

  // 결제 페이지 크레딧 UI 업데이트 (v6.7)
  function updatePaymentCreditUI(response) {
    // API 응답 구조: { success, data: { credits, daily, expiry, subscription, lastChargeDate } }
    const credits = response?.data?.credits || {};
    const daily = response?.data?.daily || {};
    const expiry = response?.data?.expiry || {};
    const subscription = response?.data?.subscription || {};
    const lastChargeDate = response?.data?.lastChargeDate;

    console.log('[Payment] Updating credit UI (v6.7):', { credits, daily, subscription, expiry });

    // 섹션 요소들
    const subscriptionSection = document.getElementById('subscriptionCreditsSection');
    const paidSection = document.getElementById('paidCreditsSection');
    const noCreditsSection = document.getElementById('noCreditsSection');

    // 구독 크레딧 섹션
    if (subscriptionSection) {
      if (daily.isSubscription && credits.service > 0) {
        subscriptionSection.style.display = 'block';

        // 라벨에 상품명 추가
        const label = document.getElementById('subscriptionCreditsLabel');
        if (label) {
          const packageName = subscription.packageName || subscription.package || (window.i18n?.subscription || '구독');
          label.textContent = `${window.i18n?.subscriptionCredits || '구독 크레딧'} (${packageName})`;
        }

        // 이번달 남은 크레딧
        const monthlyEl = document.getElementById('monthlyRemainingCredits');
        if (monthlyEl) {
          monthlyEl.textContent = _fmtN(credits.service) + ' ' + (window.i18n?.credits || '크레딧');
        }

        // 오늘 사용 가능
        const dailyEl = document.getElementById('dailyRemainingCredits');
        if (dailyEl) {
          dailyEl.textContent = _fmtN(daily.dailyRemaining || 0) + ' ' + (window.i18n?.credits || '크레딧');
        }

        // 만료일
        const expiryEl = document.getElementById('subscriptionExpiryDate');
        if (expiryEl) {
          expiryEl.textContent = expiry.serviceCredits || subscription.endDate || '-';
        }
      } else {
        subscriptionSection.style.display = 'none';
      }
    }

    // 일반 크레딧 섹션 (단독 구매)
    if (paidSection) {
      if (credits.paid > 0) {
        paidSection.style.display = 'block';

        // 보유 크레딧
        const balanceEl = document.getElementById('paidCreditsBalance');
        if (balanceEl) {
          balanceEl.textContent = _fmtN(credits.paid) + ' ' + (window.i18n?.credits || '크레딧');
        }

        // 만료일
        const expiryEl = document.getElementById('paidExpiryDate');
        if (expiryEl) {
          expiryEl.textContent = expiry.paidCredits || '-';
        }
      } else {
        paidSection.style.display = 'none';
      }
    }

    // v7.x: 크레딧 취소 버튼 표시 업데이트
    updateCancelPaidCreditsButton(credits.paid || 0);

    // 크레딧 없음 메시지
    if (noCreditsSection) {
      const hasNoCredits = credits.total <= 0;
      noCreditsSection.style.display = hasNoCredits ? 'block' : 'none';
    }

    // 총 잔액
    const totalBalance = document.querySelector('.credit-balance');
    if (totalBalance) {
      const total = credits.total || 0;
      totalBalance.textContent = _fmtN(total) + ' ' + (window.i18n?.credits || '크레딧');
    }

    // 마지막 충전일
    const lastChargeDateEl = document.querySelector('.last-charge-date');
    if (lastChargeDateEl) {
      lastChargeDateEl.textContent = lastChargeDate || '-';
    }

  }

  // 초기화
  /**
   * 서버 데이터와 localStorage 동기화
   * - 결제 완료 후 페이지 이동 시 localStorage가 비어있을 수 있음
   * - 설정 페이지 로드 시 서버에서 최신 데이터를 가져와 동기화
   */
  async function syncSubscriptionFromServer() {
    try {
      const userId = localStorage.getItem('userId') || 'guest';
      const response = await fetch(`/api/credits/balance?userId=${userId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn('[syncSubscription] 서버 응답 실패:', response.status);
        return;
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        console.warn('[syncSubscription] 데이터 없음');
        return;
      }

      const serverData = result.data;
      console.log('[syncSubscription] 서버 데이터:', serverData);

      // v7.5: 자동결제 설정 체크박스 초기화
      const autopayCheckbox = document.getElementById('autopayCheckbox');
      if (autopayCheckbox && serverData.subscription) {
        const autoRenewal = serverData.subscription.autoRenewal === true;
        const isActive = serverData.subscription.status === 'active';
        autopayCheckbox.checked = autoRenewal;
        const wrapper = autopayCheckbox.closest('.autopay-checkbox-wrapper');
        if (wrapper) {
          wrapper.classList.toggle('checked', autoRenewal);
        }

        // v7.6: 구독 중 + 자동결제 ON인 경우 체크박스 비활성화 (9% 보너스 받은 상태)
        // 구독 취소 없이는 자동결제를 해제할 수 없음
        if (isActive && autoRenewal) {
          autopayCheckbox.disabled = true;
          if (wrapper) {
            wrapper.classList.add('locked');
            wrapper.title = t('paymentAutopayLocked', '구독 중에는 자동결제를 해제할 수 없습니다. 구독 취소 후 변경 가능합니다.');
          }
          console.log('[syncSubscription] 자동결제 체크박스 비활성화 (구독 중 + 보너스 적용)');
        } else {
          autopayCheckbox.disabled = false;
          if (wrapper) {
            wrapper.classList.remove('locked');
            wrapper.title = '';
          }
        }
        console.log('[syncSubscription] 자동결제 체크박스 초기화:', autoRenewal, '비활성화:', isActive && autoRenewal);
      }

      // 현재 localStorage 데이터
      const existingSubscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
      const existingUserInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

      // 서버에서 구독이 활성화되어 있는데 localStorage가 비어있거나 다른 경우 동기화
      const serverStatus = serverData.subscription?.status || 'inactive';
      const serverPackage = serverData.subscription?.package;
      const localStatus = existingSubscription.subscriptionStatus;
      const localPackage = existingSubscription.subscriptionType;

      // v7.5: 상태 또는 패키지가 다르면 동기화 필요
      const needsSync = serverStatus === 'active' && (
        !localStatus ||
        localStatus !== 'active' ||
        localPackage !== serverPackage
      );

      if (needsSync) {
        console.log('[syncSubscription] 서버-로컬 동기화 필요: 서버=', serverStatus, serverPackage, ', 로컬=', localStatus, localPackage);

        // mymind3_subscription 업데이트
        const syncedSubscription = {
          ...existingSubscription,
          isSubscribed: true,
          subscriptionStatus: serverStatus,
          subscriptionType: serverData.subscription?.package,
          subscriptionStartDate: serverData.subscription?.startDate,
          subscriptionEndDate: serverData.subscription?.endDate,
          credits: {
            free: serverData.credits?.free || 0,
            service: serverData.credits?.service || 0,
            paid: serverData.credits?.paid || 0,
            total: serverData.credits?.total || 0
          },
          // 서버에서 받은 결제 내역으로 업데이트 (기존 내역과 병합)
          paymentHistory: serverData.paymentHistory || existingSubscription.paymentHistory || []
        };

        localStorage.setItem('mymind3_subscription', JSON.stringify(syncedSubscription));
        console.log('[syncSubscription] mymind3_subscription 동기화 완료:', syncedSubscription);

        // userInfo 업데이트
        const syncedUserInfo = {
          ...existingUserInfo,
          subscriptionStatus: serverStatus,
          subscriptionType: serverData.subscription?.package
        };
        localStorage.setItem('userInfo', JSON.stringify(syncedUserInfo));
        console.log('[syncSubscription] userInfo 동기화 완료:', syncedUserInfo);
      } else if ((serverStatus === 'inactive' || serverStatus === 'cancelled' || serverStatus === 'canceled') &&
                 (existingSubscription.isSubscribed || existingUserInfo.subscriptionStatus === 'active' || existingSubscription.subscriptionType)) {
        // 서버에서 비활성/취소이지만 로컬에 활성 흔적이 남아있는 경우 (구독 만료/취소 등)
        console.log('[syncSubscription] 서버에서 구독 비활성/취소 확인, 로컬 데이터 업데이트:', serverStatus);
        existingSubscription.subscriptionStatus = serverStatus;
        existingSubscription.isSubscribed = false;
        localStorage.setItem('mymind3_subscription', JSON.stringify(existingSubscription));

        existingUserInfo.subscriptionStatus = serverStatus;
        localStorage.setItem('userInfo', JSON.stringify(existingUserInfo));
      }

    } catch (error) {
      console.error('[syncSubscription] 동기화 실패:', error);
    }
  }

  async function initPaymentPage() {
    // 레이어 팝업에서 AJAX로 로드 시 새 DOM 요소가 생성되므로 초기화 플래그 리셋
    // (이전 DOM 요소에 연결된 이벤트 리스너는 새 요소에 적용되지 않음)
    paymentButtonsInitialized = false;
    subscriptionModalInitialized = false;
    creditPurchaseModalInitialized = false;
    paymentHistoryModalInitialized = false;
    cancelSubscriptionModalInitialized = false;
    paymentCurrencyListenerInitialized = false;  // 통화 변경 리스너도 리셋

    // v7.1: API에서 패키지 정보 로드 대기
    if (window.MyMind3 && window.MyMind3.waitForPackages) {
      try {
        await window.MyMind3.waitForPackages();
        refreshPackageDefinitions();
      } catch (error) {
        console.warn('[Settings] 패키지 API 로드 실패, 폴백 값 사용:', error);
      }
    }

    // 서버 데이터와 localStorage 동기화 (결제 완료 후 페이지 이동 시 필요)
    await syncSubscriptionFromServer();

    // 현재 설정된 통화와 환율 가져오기
    const aiSettings = JSON.parse(localStorage.getItem('mymind3_ai_settings') || '{}');
    const currentCurrency = aiSettings.paymentCurrency || 'USD';
    let exchangeRate = 1;

    // 환율 API에서 환율 가져오기
    try {
      const response = await fetch(`/api/exchange/rate/${currentCurrency}`);
      if (response.ok) {
        const data = await response.json();
        // API 응답 형식: { success: true, data: { rate: 7.077939, ... } }
        exchangeRate = data.data?.rate || data.rate || 1;
        console.log(`[Settings] 환율 로드: ${currentCurrency} = ${exchangeRate}`);
      }
    } catch (error) {
      console.warn('[Settings] 환율 로드 실패, USD 기본값 사용:', error);
    }

    // 패키지 카드 크레딧만 업데이트 (가격은 settings-ai.js의 initSubscriptionPrices()에서 API로 설정됨)
    // initSettingsAI()가 initSettingsPayment() 이후에 호출되어 올바른 환율 적용된 가격을 API에서 가져옴
    updatePackageCreditsFromConstants(currentCurrency, exchangeRate);

    const creditAmountInput = document.getElementById('creditAmount');
    if (creditAmountInput) {
      creditAmountInput.addEventListener('input', function() {
        // 직접 입력 시 라디오 버튼 선택 해제
        const selectedRadio = document.querySelector('input[name="quickAmount"]:checked');
        if (selectedRadio) {
          selectedRadio.checked = false;
        }
        // 직접 입력 시 프리셋 USD 값 초기화 (환율 계산 사용)
        window.selectedPresetUSD = null;
        updateCreditPreview();
      });
      // 초기값 계산
      updateCreditPreview();
    }

    // 빠른 금액 선택 라디오 버튼 이벤트 리스너
    const quickAmountRadios = document.querySelectorAll('input[name="quickAmount"]');
    quickAmountRadios.forEach(radio => {
      radio.addEventListener('change', function() {
        if (this.checked && creditAmountInput) {
          creditAmountInput.value = this.value;
          // 프리셋 버튼 클릭 시에도 환율 변환 로직 사용 (구독 패키지와 일관성 유지)
          // selectedPresetUSD를 null로 설정하여 환율 기반 계산 사용
          window.selectedPresetUSD = null;
          updateCreditPreview();
        }
      });
    });

    // 통화 변경 이벤트 리스너 설정 (패키지 가격 실시간 갱신용)
    setupPaymentCurrencyChangeListener();

    initSubscriptionPackages();
    initSubscriptionModal();  // 구독 모달 초기화 (취소 모달 포함)
    initPaymentButtons();

    // Phase 3: 10단계 크레딧 그리드 초기화
    initCreditTierGrid();

    // Order #7: 직접 입력 구매 초기화
    initCustomAmountPurchase();

    // 구독 버튼 상태 업데이트 (서버 데이터 기반)
    updateSubscriptionButtonStates();

    // 구독자 상태에 따른 크레딧 구매 섹션 업데이트
    updateCreditPurchaseAccess();

    // 크레딧 잔액 로드
    await loadPaymentCreditBalance();

    // 결제 검증 알림 확인 및 표시
    checkPaymentVerificationAlerts();
  }

  /**
   * 결제 검증 알림 확인 및 토스트 표시
   * 미확인 알림이 있으면 사용자에게 토스트로 알림
   */
  async function checkPaymentVerificationAlerts() {
    try {
      const res = await fetch('/api/credits/payment-alerts', { credentials: 'include' });
      const data = await res.json();
      if (!data.success || !data.data || data.data.length === 0) return;

      data.data.forEach((alert, idx) => {
        setTimeout(() => showPaymentAlertToast(alert), idx * 500);
      });
    } catch (e) {
      console.warn('[Settings] 결제 알림 확인 실패:', e);
    }
  }

  /**
   * 결제 검증 알림을 토스트로 표시
   */
  function showPaymentAlertToast(alert) {
    const severity = alert.severity || 'warning';
    const colorMap = {
      info: { bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', icon: 'info' },
      warning: { bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', icon: 'alert-triangle' },
      error: { bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', icon: 'x-circle' },
      critical: { bg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)', icon: 'alert-octagon' },
    };
    const config = colorMap[severity] || colorMap.warning;

    const toast = document.createElement('div');
    toast.className = 'subscription-toast payment-alert-toast';
    toast.innerHTML = `
      <div class="toast-content" style="display:flex;align-items:flex-start;gap:10px;">
        <span class="toast-icon">${mmIcon(config.icon, 20)}</span>
        <div>
          <div class="toast-title" style="font-weight:600;font-size:13px;">${escapeForHtml(alert.title)}</div>
          ${alert.message ? '<div class="toast-desc" style="font-size:11px;opacity:0.9;margin-top:3px;">' + escapeForHtml(alert.message) + '</div>' : ''}
        </div>
        <button style="background:none;border:none;color:white;cursor:pointer;font-size:16px;opacity:0.7;margin-left:auto;" data-alert-id="${alert.id}">&times;</button>
      </div>
    `;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: ${config.bg};
      color: white;
      padding: 14px 18px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      max-width: 380px;
      animation: toastSlideIn 0.3s ease-out;
    `;

    // 토스트 애니메이션 스타일 보장
    if (!document.querySelector('#toast-animation-style')) {
      const style = document.createElement('style');
      style.id = 'toast-animation-style';
      style.textContent = `
        @keyframes toastSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes toastSlideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // 닫기 버튼
    const dismissBtn = toast.querySelector('button[data-alert-id]');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', async function() {
        try {
          await fetch('/api/credits/payment-alerts/' + this.dataset.alertId + '/acknowledge', {
            method: 'POST', credentials: 'include'
          });
        } catch (e) { /* 무시 */ }
        toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
      });
    }

    // 10초 후 자동 제거
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
      }
    }, 10000);
  }

  function escapeForHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 전역에서 접근 가능하도록 노출 (로그인 상태 변경 시 호출용)
  window.updateCreditPurchaseAccess = updateCreditPurchaseAccess;

  // 크레딧 관련 함수를 전역으로 노출 (외부 호출용)
  window.checkAndExpireCredits = checkAndExpireCredits;
  window.checkCreditExpirationWarning = checkCreditExpirationWarning;

  // 결제 페이지 초기화 함수를 전역으로 노출 (레이어 팝업용)
  window.initSettingsPayment = initPaymentPage;

  // 크레딧 미리보기 업데이트 함수를 전역으로 노출 (통화 변경 시 호출용)
  window.updateCreditPreview = updateCreditPreview;

  // =====================================================
  // 인보이스/영수증 이메일 발송 함수 (2026-01-20)
  // =====================================================

  /**
   * 인보이스 이메일 발송
   * @param {string} transactionId - 결제 트랜잭션 ID
   * @param {string} date - 결제일
   * @param {string} packageType - 패키지 타입
   * @param {number} amount - 결제 금액
   * @param {string} currency - 통화
   * @param {number} credits - 크레딧
   * @param {string} status - 상태
   */
  async function sendInvoiceEmailFn(transactionId, date, packageType, amount, currency, credits, status) {
    try {
      // 버튼 비활성화 및 로딩 표시
      const btn = event.target.closest('button');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = t('paymentSending', '발송 중...');

      // CSRF 토큰 가져오기
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};

      const response = await fetch('/api/credits/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({
          transactionId,
          date,
          packageType,
          amount,
          currency,
          credits,
          status
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`${t('paymentInvoiceSent', '인보이스가 이메일로 발송되었습니다.')}\n\n${t('paymentInvoiceNumber', '인보이스 번호')}: ${data.invoiceNumber}`);
      } else {
        alert(`${t('paymentInvoiceSendFailed', '인보이스 발송 실패')}: ${data.error || data.message}`);
      }

      // 버튼 복원
      btn.disabled = false;
      btn.innerHTML = originalText;
    } catch (error) {
      console.error('[Invoice] 발송 실패:', error);
      alert(t('paymentInvoiceSendError', '인보이스 발송 중 오류가 발생했습니다.'));

      // 버튼 복원
      const btn = event.target.closest('button');
      btn.disabled = false;
      btn.innerHTML = mmIcon('file', 14) + ' ' + t('paymentInvoice', '인보이스');
    }
  }

  /**
   * 영수증 이메일 발송
   * @param {string} transactionId - 결제 트랜잭션 ID
   * @param {string} date - 결제일
   * @param {string} packageType - 패키지 타입
   * @param {number} amount - 결제 금액
   * @param {string} currency - 통화
   * @param {number} credits - 크레딧
   */
  async function sendReceiptEmailFn(transactionId, date, packageType, amount, currency, credits) {
    try {
      // 버튼 비활성화 및 로딩 표시
      const btn = event.target.closest('button');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = t('paymentSending', '발송 중...');

      // CSRF 토큰 가져오기
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};

      const response = await fetch('/api/credits/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({
          transactionId,
          date,
          packageType,
          amount,
          currency,
          credits
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`${t('paymentReceiptSent', '영수증이 이메일로 발송되었습니다.')}\n\n${t('paymentReceiptNumber', '영수증 번호')}: ${data.receiptNumber}`);
      } else {
        alert(`${t('paymentReceiptSendFailed', '영수증 발송 실패')}: ${data.error || data.message}`);
      }

      // 버튼 복원
      btn.disabled = false;
      btn.innerHTML = originalText;
    } catch (error) {
      console.error('[Receipt] 발송 실패:', error);
      alert(t('paymentReceiptSendError', '영수증 발송 중 오류가 발생했습니다.'));

      // 버튼 복원
      const btn = event.target.closest('button');
      btn.disabled = false;
      btn.innerHTML = mmIcon('file', 14) + ' ' + t('paymentReceipt', '영수증');
    }
  }

  /**
   * 인보이스+영수증 통합 이메일 발송
   * @param {string} transactionId - 결제 트랜잭션 ID
   * @param {string} date - 결제일
   * @param {string} packageType - 패키지 타입
   * @param {number} amount - 결제 금액
   * @param {string} currency - 통화
   * @param {number} credits - 크레딧
   * @param {string} status - 상태
   */
  async function sendDocumentsEmailFn(transactionId, date, packageType, amount, currency, credits, status) {
    try {
      // 버튼 비활성화 및 로딩 표시
      const btn = event.target.closest('button');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = t('paymentSending', '발송 중...');

      // CSRF 토큰 가져오기
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};

      const response = await fetch('/api/credits/send-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({
          transactionId,
          date,
          packageType,
          amount,
          currency,
          credits,
          status
        })
      });

      const data = await response.json();

      if (data.success) {
        if (typeof window.showToast === 'function') {
          window.showToast(mmIcon('check-circle', 14) + ` ${t('paymentDocsSentComplete', '인보이스/영수증 발송 완료')} (${data.invoiceNumber})`, 'success', 4000);
        }
      } else {
        if (typeof window.showToast === 'function') {
          window.showToast(mmIcon('x-circle', 14) + ` ${t('paymentDocsSendFailed', '발송 실패')}: ${data.error || data.message}`, 'error', 4000);
        }
      }

      // 버튼 복원
      btn.disabled = false;
      btn.innerHTML = originalText;
    } catch (error) {
      console.error('[Documents] 발송 실패:', error);
      if (typeof window.showToast === 'function') {
        window.showToast(mmIcon('x-circle', 14) + ' ' + t('paymentDocsSendError', '인보이스/영수증 발송 중 오류가 발생했습니다.'), 'error', 4000);
      }

      // 버튼 복원
      const btn = event.target.closest('button');
      btn.disabled = false;
      btn.innerHTML = mmIcon('file', 14) + ' ' + t('paymentInvoiceReceipt', '인보이스/영수증');
    }
  }

  /**
   * 취소 인보이스+영수증 이메일 발송
   * @param {string} transactionId - 결제 트랜잭션 ID
   * @param {string} date - 원래 결제일
   * @param {string} cancelDate - 취소일
   * @param {string} packageType - 패키지 타입
   * @param {number} originalAmount - 원래 결제 금액
   * @param {number} refundAmount - 환불 금액
   * @param {number} usedCredits - 사용한 크레딧
   * @param {number} cancellationFee - PG사 취소 수수료
   * @param {string} currency - 통화
   */
  async function sendCancellationEmailFn(transactionId, date, cancelDate, packageType, originalAmount, refundAmount, usedCredits, cancellationFee, currency) {
    try {
      // 버튼 비활성화 및 로딩 표시
      const btn = event.target.closest('button');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = t('paymentSending', '발송 중...');

      // CSRF 토큰 가져오기
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};

      const response = await fetch('/api/credits/send-cancellation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({
          transactionId,
          date,
          cancelDate,
          packageType,
          originalAmount,
          refundAmount,
          usedCredits,
          cancellationFee,
          currency
        })
      });

      const data = await response.json();

      if (data.success) {
        if (typeof window.showToast === 'function') {
          window.showToast(mmIcon('check-circle', 14) + ` ${t('paymentCancelDocsSentComplete', '취소 인보이스/영수증 발송 완료')} (${data.invoiceNumber})`, 'success', 4000);
        }
      } else {
        if (typeof window.showToast === 'function') {
          window.showToast(mmIcon('x-circle', 14) + ` ${t('paymentDocsSendFailed', '발송 실패')}: ${data.error || data.message}`, 'error', 4000);
        }
      }

      // 버튼 복원
      btn.disabled = false;
      btn.innerHTML = originalText;
    } catch (error) {
      console.error('[Cancellation] 발송 실패:', error);
      if (typeof window.showToast === 'function') {
        window.showToast(mmIcon('x-circle', 14) + ' ' + t('paymentCancelDocsSendError', '취소 인보이스/영수증 발송 중 오류가 발생했습니다.'), 'error', 4000);
      }

      // 버튼 복원
      const btn = event.target.closest('button');
      btn.disabled = false;
      btn.innerHTML = mmIcon('file', 14) + ' ' + t('paymentInvoiceReceipt', '인보이스/영수증');
    }
  }

  // 인보이스/영수증 발송 함수 전역 노출
  window.sendInvoiceEmail = sendInvoiceEmailFn;
  window.sendReceiptEmail = sendReceiptEmailFn;
  window.sendDocumentsEmail = sendDocumentsEmailFn;
  window.sendCancellationEmail = sendCancellationEmailFn;

  // 자동 초기화 제거 - initSettingsAll()에서만 호출
  // 레이어 팝업에서 AJAX로 settings.html 로드 후 initSettingsAll()이 호출됨
  // 직접 settings.html 접근 시에도 window.initSettingsAll() 호출 필요
})();
