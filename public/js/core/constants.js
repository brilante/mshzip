// MyMind3 Constants
// v7.1 (2026-01-05): API에서 패키지 정보 동적 로드
// - 페이지 로드 시 /api/packages에서 패키지 정보 조회
// - 폴백: API 실패 시 하드코딩 값 사용
window.MyMind3 = window.MyMind3 || {};

// 패키지 로드 상태 추적
window.MyMind3._packagesLoaded = false;
window.MyMind3._packagesLoading = false;

window.MyMind3.Constants = {
    // Application Info
    APP_NAME: 'MyMind3',
    VERSION: '3.0.0',

    // API Endpoints
    API: {
        BASE: '/api',
        MINDMAP: '/api/mindmap',
        AI: '/api/ai',
        FILES: '/api/files',
        TRASH: '/api/trash'
    },

    // UI Constants
    UI: {
        ANIMATION_DURATION: 300,
        DEBOUNCE_DELAY: 500,
        AUTOSAVE_DELAY: 2000,
        TOAST_DURATION: 3000
    },

    // Mind Map Constants
    MINDMAP: {
        NODE: {
            MIN_WIDTH: 100,
            MAX_WIDTH: 400,
            MIN_HEIGHT: 40,
            MAX_HEIGHT: 200,
            PADDING: 12,
            BORDER_RADIUS: 8
        },
        CONNECTION: {
            STROKE_WIDTH: 2,
            SELECTED_STROKE_WIDTH: 3,
            ARROW_SIZE: 8
        },
        CANVAS: {
            MIN_ZOOM: 0.1,
            MAX_ZOOM: 5.0,
            ZOOM_STEP: 0.1,
            PAN_SPEED: 1.0
        },
        COLORS: {
            PRIMARY: '#007bff',
            SECONDARY: '#6c757d',
            SUCCESS: '#28a745',
            WARNING: '#ffc107',
            DANGER: '#dc3545',
            INFO: '#17a2b8',
            LIGHT: '#f8f9fa',
            DARK: '#343a40'
        }
    },

    // Editor Constants
    EDITOR: {
        TOOLBAR_HEIGHT: 40,
        MIN_HEIGHT: 200,
        MAX_HEIGHT: 600
    },

    // File Constants
    FILE: {
        MAX_SIZE: 50 * 1024 * 1024, // 50MB
        ALLOWED_TYPES: ['json', 'html', 'md', 'txt', 'xml', 'csv'],
        EXPORT_FORMATS: ['json', 'html', 'markdown', 'xml', 'csv', 'png', 'svg', 'pdf']
    },

    // AI Constants
    AI: {
        MAX_TOKENS: 4000,
        TEMPERATURE: 0.7,
        MODELS: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
    },

    // Credit System Constants (크레딧 시스템 상수)
    // v8.5: 실제 마크업율은 서버 creditCalculator.js MARKUP_RATE=1.166 (마크업 6% × VAT 10%)
    CREDITS: {
        PER_USD: 100000,               // $1 = 100,000 크레딧/사용량 (v5.0)
        CREDIT_PER_USD: 100000,        // 1달러당 크레딧 수 (v5.0: 100,000)
        VAT_RATE: 0.10,                // 부가세 10%
        MARKUP_RATE: 1.166,            // 마크업 6% × VAT 10% = 1.06 × 1.10 (복리)
        // @deprecated v8.5 - 미사용. MARKUP_RATE(1.166)가 실제 적용값
        USAGE_MARGIN: 0.20,
        MARGIN_MULTIPLIER: 1.2,
        SUBSCRIPTION_EXPIRE_DAYS: 30,  // 구독 사용량: 1개월 (소멸형)
        CREDIT_EXPIRE_DAYS: 365,       // 단독 크레딧: 1년
        FREE_SIGNUP_CREDITS: 10000     // 신규 가입 혜택 10,000 사용량
    },

    // Subscription Packages (구독 패키지)
    // v7.0 (2026-01-05) 변경:
    // - 가격 대폭 인하: 라이트 $3.30, 스탠다드 $11.00, 프로 $22.00
    // - 멕스 상품 추가: $44.00 (헤비 유저/기업용)
    // - 보너스율: 라이트 9%, 스탠다드 7%, 프로 5%, 멕스 3%
    // v6.5 (2025-12-19) 재설계:
    // - $1 = 100,000 사용량/크레딧
    // - 보너스율 역전: 라이트 9%, 스탠다드 7%, 프로 5% (저가 패키지 우대)
    // - 구독 유효기간: 1개월 (소멸형)
    // - 마진 20%는 API 사용 시 적용
    PACKAGES: {
        'lite': {
            name: 'Lite',
            displayName: '라이트',
            basePrice: 3.30,           // 기본가 $3.30 (v7.0 변경)
            priceUSD: 3.63,            // 결제금액 = $3.30 × 1.1 (VAT 포함)
            baseUsage: 330000,         // 기본 사용량 = $3.30 × 100,000
            bonusRate: 0.09,           // v6.5: 보너스 9% (저가 패키지 우대)
            bonusUsage: 29700,         // 보너스 사용량 = 330,000 × 0.09
            totalUsage: 359700,        // 총 사용량 = 330,000 + 29,700
            expireDays: 30,            // 1개월 소멸형
            autopayBonusRate: 0.09,    // v8.7: 전 패키지 동일 9%
            target: '개인/취미'
        },
        'standard': {
            name: 'Standard',
            displayName: '스탠다드',
            basePrice: 11.00,          // 기본가 $11.00 (v7.0 변경)
            priceUSD: 12.10,           // 결제금액 = $11.00 × 1.1 (VAT 포함)
            baseUsage: 1100000,        // 기본 사용량 = $11.00 × 100,000
            bonusRate: 0.07,           // v6.5: 보너스 7%
            bonusUsage: 77000,         // 보너스 사용량 = 1,100,000 × 0.07
            totalUsage: 1177000,       // 총 사용량 = 1,100,000 + 77,000
            expireDays: 30,            // 1개월 소멸형
            autopayBonusRate: 0.09,    // v8.7: 전 패키지 동일 9%
            target: '일반 사용자'
        },
        'pro': {
            name: 'Pro',
            displayName: '프로',
            basePrice: 22.00,          // 기본가 $22.00 (v7.0 변경)
            priceUSD: 24.20,           // 결제금액 = $22.00 × 1.1 (VAT 포함)
            baseUsage: 2200000,        // 기본 사용량 = $22.00 × 100,000
            bonusRate: 0.05,           // v6.5: 보너스 5%
            bonusUsage: 110000,        // 보너스 사용량 = 2,200,000 × 0.05
            totalUsage: 2310000,       // 총 사용량 = 2,200,000 + 110,000
            expireDays: 30,            // 1개월 소멸형
            autopayBonusRate: 0.09,    // v8.7: 전 패키지 동일 9%
            target: '헤비 유저'
        },
        'max': {
            name: 'Max',
            displayName: '멕스',
            basePrice: 44.00,          // 기본가 $44.00 (v7.0 신규)
            priceUSD: 48.40,           // 결제금액 = $44.00 × 1.1 (VAT 포함)
            baseUsage: 4400000,        // 기본 사용량 = $44.00 × 100,000
            bonusRate: 0.03,           // v7.0: 보너스 3% (고가 패키지)
            bonusUsage: 132000,        // 보너스 사용량 = 4,400,000 × 0.03
            totalUsage: 4532000,       // 총 사용량 = 4,400,000 + 132,000
            expireDays: 30,            // 1개월 소멸형
            autopayBonusRate: 0.09,    // v8.7: 전 패키지 동일 9%
            target: '헤비 유저/기업'
        }
    },

    // 기존 패키지 ID 매핑 (하위 호환성)
    PACKAGE_ID_MAP: {
        'plus10': 'lite',
        'plus30': 'standard',
        'plus60': 'pro',
        'plus90': 'max'  // v7.0: 멕스 추가
    },

    // Currency Information (통화 정보)
    CURRENCIES: {
        USD: { symbol: '$', name: 'US Dollar', isInteger: false },
        KRW: { symbol: '₩', name: 'Korean Won', isInteger: true },
        JPY: { symbol: '¥', name: 'Japanese Yen', isInteger: true },
        EUR: { symbol: '€', name: 'Euro', isInteger: false },
        GBP: { symbol: '£', name: 'British Pound', isInteger: false },
        CNY: { symbol: '¥', name: 'Chinese Yuan', isInteger: false }
    },

    // Credit Tiers (단독 구매 20단계) - Phase 3 (v6.2)
    // v6.2: 10단계 → 20단계 확장 ($3~$100)
    // v7.2: 마진율 15% 고정 (perDollar = 100000 / 0.95 = 105,263)
    CREDIT_TIERS: [
        { tier: 1,  amount: 3,   vat: 0.30,  payment: 3.30,   margin: 0.15, perDollar: 105263, total: 315789 },
        { tier: 2,  amount: 5,   vat: 0.50,  payment: 5.50,   margin: 0.15, perDollar: 105263, total: 526315 },
        { tier: 3,  amount: 8,   vat: 0.80,  payment: 8.80,   margin: 0.15, perDollar: 105263, total: 842104 },
        { tier: 4,  amount: 10,  vat: 1.00,  payment: 11.00,  margin: 0.15, perDollar: 105263, total: 1052630 },
        { tier: 5,  amount: 15,  vat: 1.50,  payment: 16.50,  margin: 0.15, perDollar: 105263, total: 1578945 },
        { tier: 6,  amount: 20,  vat: 2.00,  payment: 22.00,  margin: 0.15, perDollar: 105263, total: 2105260 },
        { tier: 7,  amount: 25,  vat: 2.50,  payment: 27.50,  margin: 0.15, perDollar: 105263, total: 2631575 },
        { tier: 8,  amount: 30,  vat: 3.00,  payment: 33.00,  margin: 0.15, perDollar: 105263, total: 3157890 },
        { tier: 9,  amount: 35,  vat: 3.50,  payment: 38.50,  margin: 0.15, perDollar: 105263, total: 3684205 },
        { tier: 10, amount: 40,  vat: 4.00,  payment: 44.00,  margin: 0.15, perDollar: 105263, total: 4210520 },
        { tier: 11, amount: 45,  vat: 4.50,  payment: 49.50,  margin: 0.15, perDollar: 105263, total: 4736835 },
        { tier: 12, amount: 50,  vat: 5.00,  payment: 55.00,  margin: 0.15, perDollar: 105263, total: 5263150 },
        { tier: 13, amount: 55,  vat: 5.50,  payment: 60.50,  margin: 0.15, perDollar: 105263, total: 5789465 },
        { tier: 14, amount: 60,  vat: 6.00,  payment: 66.00,  margin: 0.15, perDollar: 105263, total: 6315780 },
        { tier: 15, amount: 65,  vat: 6.50,  payment: 71.50,  margin: 0.15, perDollar: 105263, total: 6842095 },
        { tier: 16, amount: 70,  vat: 7.00,  payment: 77.00,  margin: 0.15, perDollar: 105263, total: 7368410 },
        { tier: 17, amount: 75,  vat: 7.50,  payment: 82.50,  margin: 0.15, perDollar: 105263, total: 7894725 },
        { tier: 18, amount: 80,  vat: 8.00,  payment: 88.00,  margin: 0.15, perDollar: 105263, total: 8421040 },
        { tier: 19, amount: 90,  vat: 9.00,  payment: 99.00,  margin: 0.15, perDollar: 105263, total: 9473670 },
        { tier: 20, amount: 100, vat: 10.00, payment: 110.00, margin: 0.15, perDollar: 105263, total: 10526300 }
    ],

    // AI Services (AI 서비스 목록)
    AI_SERVICES: ['gpt', 'grok', 'claude', 'gemini', 'local'],

    // Storage Keys
    STORAGE: {
        THEME: 'mymind3_theme',
        SETTINGS: 'mymind3_settings',
        RECENT_FILES: 'mymind3_recent_files',
        WORKSPACE: 'mymind3_workspace',
        AI_SETTINGS: 'mymind3_ai_settings'
    },

    // Events
    EVENTS: {
        NODE_SELECTED: 'node:selected',
        NODE_DESELECTED: 'node:deselected',
        NODE_CREATED: 'node:created',
        NODE_UPDATED: 'node:updated',
        NODE_DELETED: 'node:deleted',
        CONNECTION_CREATED: 'connection:created',
        CONNECTION_DELETED: 'connection:deleted',
        MINDMAP_LOADED: 'mindmap:loaded',
        MINDMAP_SAVED: 'mindmap:saved',
        THEME_CHANGED: 'theme:changed',
        AI_RESPONSE: 'ai:response',
        ERROR_OCCURRED: 'error:occurred'
    },

    // Keyboard Shortcuts
    SHORTCUTS: {
        NEW_NODE: 'KeyN',
        DELETE: 'Delete',
        SAVE: 'KeyS',
        UNDO: 'KeyZ',
        REDO: 'KeyY',
        COPY: 'KeyC',
        PASTE: 'KeyV',
        SELECT_ALL: 'KeyA',
        ZOOM_IN: 'Equal',
        ZOOM_OUT: 'Minus',
        CENTER: 'KeyC'
    },

    // Themes
    THEMES: {
        DEFAULT: 'default',
        DARK: 'dark',
        HIGH_CONTRAST: 'high-contrast'
    },

    // Validation Rules
    VALIDATION: {
        PROJECT_NAME: {
            MIN_LENGTH: 1,
            MAX_LENGTH: 100,
            PATTERN: /^[a-zA-Z0-9\s\-_]+$/
        },
        NODE_TEXT: {
            MAX_LENGTH: 1000
        },
        DESCRIPTION: {
            MAX_LENGTH: 5000
        }
    }
};

// === Helper Functions (헬퍼 함수) ===

/**
 * 가격으로 패키지 찾기
 * @param {number|string} price - 결제 금액 (VAT 포함)
 * @returns {Object|null} 패키지 정보
 */
window.MyMind3.Constants.getPackageByPrice = function(price) {
    const priceNum = parseFloat(price);
    for (const [type, pkg] of Object.entries(this.PACKAGES)) {
        // priceUSD와 비교 (소수점 2자리 비교)
        if (Math.abs(pkg.priceUSD - priceNum) < 0.01) {
            return { type, ...pkg };
        }
    }
    return null;
};

/**
 * USD 금액을 크레딧으로 변환
 * @param {number} usdAmount - USD 금액
 * @returns {number} 크레딧
 */
window.MyMind3.Constants.calculateCredits = function(usdAmount) {
    return Math.floor(usdAmount * this.CREDITS.PER_USD);
};

/**
 * 패키지 타입으로 패키지 정보 가져오기
 * @param {string} packageType - 패키지 타입 (plus10, plus30, plus60)
 * @returns {Object|null} 패키지 정보
 */
window.MyMind3.Constants.getPackageByType = function(packageType) {
    return this.PACKAGES[packageType] || null;
};

/**
 * 통화 정보 가져오기
 * @param {string} currencyCode - 통화 코드 (USD, KRW 등)
 * @returns {Object|null} 통화 정보
 */
window.MyMind3.Constants.getCurrencyInfo = function(currencyCode) {
    return this.CURRENCIES[currencyCode] || null;
};

/**
 * 단계 정보 가져오기 (Phase 3)
 * @param {number} tier - 단계 (1-10)
 * @returns {Object|null} 단계 정보
 */
window.MyMind3.Constants.getTierInfo = function(tier) {
    return this.CREDIT_TIERS.find(t => t.tier === tier) || null;
};

/**
 * 모든 단계 정보 가져오기 (Phase 3)
 * @returns {Array} 전체 단계 배열
 */
window.MyMind3.Constants.getAllTiers = function() {
    return this.CREDIT_TIERS;
};

/**
 * 단계별 추가 혜택 계산 (Phase 3)
 * @param {number} tier - 단계 (1-10)
 * @returns {Object} 혜택 정보
 */
window.MyMind3.Constants.getTierBenefit = function(tier) {
    const tierInfo = this.getTierInfo(tier);
    if (!tierInfo) return null;

    const baseTier = this.getTierInfo(1);
    const extraRate = ((tierInfo.perDollar - baseTier.perDollar) / baseTier.perDollar) * 100;

    return {
        tier: tier,
        perDollar: tierInfo.perDollar,
        extraRate: Math.round(extraRate * 10) / 10,
        message: extraRate > 0
            ? `단계 1 대비 +${Math.round(extraRate * 10) / 10}% 추가 크레딧`
            : '기본 마진 (20%)'
    };
};

// === API 기반 패키지 로드 함수 (v7.1) ===

/**
 * API에서 패키지 정보 로드
 * @returns {Promise<Object>} 로드된 패키지 정보
 */
window.MyMind3.loadPackagesFromAPI = async function() {
    // 이미 로딩 중이면 대기
    if (window.MyMind3._packagesLoading) {
        return new Promise((resolve) => {
            const checkLoaded = setInterval(() => {
                if (window.MyMind3._packagesLoaded) {
                    clearInterval(checkLoaded);
                    resolve(window.MyMind3.Constants.PACKAGES);
                }
            }, 50);
        });
    }

    // 이미 로드됐으면 바로 반환
    if (window.MyMind3._packagesLoaded) {
        return window.MyMind3.Constants.PACKAGES;
    }

    window.MyMind3._packagesLoading = true;

    try {
        const response = await fetch('/api/packages');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.packages && Object.keys(data.packages).length > 0) {
            // API 응답으로 PACKAGES 업데이트 (빈 응답은 무시)
            Object.keys(window.MyMind3.Constants.PACKAGES).forEach(key => {
                delete window.MyMind3.Constants.PACKAGES[key];
            });
            Object.assign(window.MyMind3.Constants.PACKAGES, data.packages);

            console.log('[Constants] 패키지 정보 API에서 로드됨:', Object.keys(data.packages).length, '개');
            window.MyMind3._packagesLoaded = true;
            return data.packages;
        }
        throw new Error('Invalid API response');
    } catch (error) {
        console.warn('[Constants] 패키지 API 로드 실패, 폴백 값 사용:', error.message);
        window.MyMind3._packagesLoaded = true; // 폴백 값으로 진행
        return window.MyMind3.Constants.PACKAGES;
    } finally {
        window.MyMind3._packagesLoading = false;
    }
};

/**
 * 패키지 정보가 로드될 때까지 대기
 * @returns {Promise<Object>} 패키지 정보
 */
window.MyMind3.waitForPackages = async function() {
    if (window.MyMind3._packagesLoaded) {
        return window.MyMind3.Constants.PACKAGES;
    }
    return window.MyMind3.loadPackagesFromAPI();
};

// 페이지 로드 시 자동으로 패키지 정보 로드
if (typeof document !== 'undefined') {
    // DOMContentLoaded 이벤트가 이미 발생했는지 확인
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            window.MyMind3.loadPackagesFromAPI().catch(err => {
                console.warn('[Constants] 초기 패키지 로드 실패:', err.message);
            });
        });
    } else {
        // 이미 DOM이 로드된 경우 바로 실행
        window.MyMind3.loadPackagesFromAPI().catch(err => {
            console.warn('[Constants] 초기 패키지 로드 실패:', err.message);
        });
    }
}

// Note: PACKAGES는 동적으로 업데이트되므로 freeze하지 않음
// 다른 상수들은 필요 시 개별적으로 freeze 가능