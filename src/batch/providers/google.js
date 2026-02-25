/**
 * Google Gemini 모델 목록 API 호출 모듈
 * GET https://generativelanguage.googleapis.com/v1beta/models
 *
 * 가격 정보 출처: https://ai.google.dev/pricing
 * 마지막 업데이트: 2026-01-07
 *
 * Fallback: MODEL_PRICING에 없는 모델은 aimodel/gemini-pricing.json에서 로드
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Fallback 가격 파일 경로
const FALLBACK_PRICING_PATH = path.join(__dirname, '..', '..', '..', 'aimodel', 'gemini-pricing.json');

// Fallback 가격 정보 캐시
let fallbackPricingCache = null;
let fallbackPricingLoaded = false;

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 30000;

// 포함할 모델 패턴
const INCLUDE_PATTERNS = [
  /^gemini-/
];

// 제외할 모델 패턴
const EXCLUDE_PATTERNS = [
  /embedding/i,
  /-vision$/i,
  /^text-/i,
  /aqa/i
];

/**
 * 모델별 가격 정보 (USD per 1M tokens)
 * 정규화된 모델명 기준
 */
const MODEL_PRICING = {
  // Gemini 3 시리즈 (Preview) (cachedInput: cached input per 1M tokens, 25% of input)
  'gemini-3-pro-preview': { input: 2.0, cachedInput: 0.5, output: 12.0, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-3-flash-preview': { input: 0.5, cachedInput: 0.125, output: 3.0, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-3-pro': { input: 2.0, cachedInput: 0.5, output: 12.0, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-3-flash': { input: 0.5, cachedInput: 0.125, output: 3.0, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-3-pro-image-preview': { input: 2.0, cachedInput: 0.5, output: 12.0, inputLimit: 1000000, outputLimit: 65536 },

  // Gemini 2.5 시리즈
  'gemini-2.5-pro': { input: 1.25, cachedInput: 0.3125, output: 10.0, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-2.5-pro-preview': { input: 1.25, cachedInput: 0.3125, output: 10.0, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-2.5-pro-preview-tts': { input: 1.25, cachedInput: 0.3125, output: 10.0, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-2.5-flash': { input: 0.3, cachedInput: 0.075, output: 2.5, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-2.5-flash-preview': { input: 0.3, cachedInput: 0.075, output: 2.5, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-2.5-flash-preview-tts': { input: 0.3, cachedInput: 0.075, output: 2.5, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-2.5-flash-preview-09-2025': { input: 0.3, cachedInput: 0.075, output: 2.5, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-2.5-flash-lite': { input: 0.10, cachedInput: 0.025, output: 0.40, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-2.5-flash-lite-preview': { input: 0.10, cachedInput: 0.025, output: 0.40, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-2.5-flash-lite-preview-09-2025': { input: 0.10, cachedInput: 0.025, output: 0.40, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-2.5-flash-image': { input: 0.3, cachedInput: 0.075, output: 2.5, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-2.5-flash-image-preview': { input: 0.3, cachedInput: 0.075, output: 2.5, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-2.5-computer-use-preview-10-2025': { input: 0.3, cachedInput: 0.075, output: 2.5, inputLimit: 1000000, outputLimit: 65536 },

  // Gemini 2.0 시리즈
  'gemini-2.0-pro': { input: 1.25, cachedInput: 0.3125, output: 5.0, inputLimit: 1000000, outputLimit: 8192 },
  'gemini-2.0-flash': { input: 0.1, cachedInput: 0.025, output: 0.4, inputLimit: 1000000, outputLimit: 8192 },
  'gemini-2.0-flash-exp': { input: 0.1, cachedInput: 0.025, output: 0.4, inputLimit: 1000000, outputLimit: 8192 },
  'gemini-2.0-flash-exp-image-generation': { input: 0.1, cachedInput: 0.025, output: 0.4, inputLimit: 1000000, outputLimit: 8192 },
  'gemini-2.0-flash-lite': { input: 0.075, cachedInput: 0.01875, output: 0.3, inputLimit: 1000000, outputLimit: 8192 },
  'gemini-2.0-flash-lite-preview': { input: 0.075, cachedInput: 0.01875, output: 0.3, inputLimit: 1000000, outputLimit: 8192 },
  'gemini-2.0-flash-lite-preview-02-05': { input: 0.075, cachedInput: 0.01875, output: 0.3, inputLimit: 1000000, outputLimit: 8192 },
  'gemini-2.0-flash-thinking': { input: 0.1, cachedInput: 0.025, output: 0.4, inputLimit: 1000000, outputLimit: 8192 },
  'gemini-2.0-flash-thinking-exp': { input: 0.1, cachedInput: 0.025, output: 0.4, inputLimit: 1000000, outputLimit: 8192 },

  // Gemini 1.5 시리즈 (레거시)
  'gemini-1.5-pro': { input: 1.25, cachedInput: 0.3125, output: 5.0, inputLimit: 2000000, outputLimit: 8192 },
  'gemini-1.5-flash': { input: 0.075, cachedInput: 0.01875, output: 0.3, inputLimit: 1000000, outputLimit: 8192 },
  'gemini-1.5-flash-8b': { input: 0.0375, cachedInput: 0.009375, output: 0.15, inputLimit: 1000000, outputLimit: 8192 },

  // Gemini 1.0 시리즈 (레거시)
  'gemini-1.0-pro': { input: 0.5, cachedInput: 0.125, output: 1.5, inputLimit: 32768, outputLimit: 8192 },
  'gemini-pro': { input: 0.5, cachedInput: 0.125, output: 1.5, inputLimit: 32768, outputLimit: 8192 },

  // Gemini 특수 모델 (Latest, Exp 등)
  'gemini-flash-latest': { input: 0.3, cachedInput: 0.075, output: 2.5, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-flash-lite-latest': { input: 0.10, cachedInput: 0.025, output: 0.40, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-pro-latest': { input: 1.25, cachedInput: 0.3125, output: 10.0, inputLimit: 1000000, outputLimit: 65536 },
  'gemini-exp-1206': { input: 0.1, cachedInput: 0.025, output: 0.4, inputLimit: 1000000, outputLimit: 8192 },

  // Gemini 특수 도메인 모델 (Preview, 가격 미정 - 기본값 사용)
  'gemini-robotics-er-1.5-preview': { input: 1.25, cachedInput: 0.3125, output: 5.0, inputLimit: 1000000, outputLimit: 8192 }
};

/**
 * 모델 별칭 매핑
 * API에서 반환되는 모델명 → 추가로 생성할 별칭 모델명
 * preview 버전이 있으면 base 버전도 같은 가격으로 추가
 */
const MODEL_ALIASES = {
  'gemini-3-pro-preview': 'gemini-3-pro',
  'gemini-3-flash-preview': 'gemini-3-flash'
};

/**
 * Fallback 가격 정보 로드
 * @returns {Object|null} Fallback 가격 정보
 */
function loadFallbackPricing() {
  if (fallbackPricingLoaded) {
    return fallbackPricingCache;
  }

  try {
    if (fs.existsSync(FALLBACK_PRICING_PATH)) {
      const content = fs.readFileSync(FALLBACK_PRICING_PATH, 'utf8');
      const data = JSON.parse(content);
      fallbackPricingCache = data.models || {};
      console.log(`[Gemini-Pricing] Fallback 가격 파일 로드 성공: ${Object.keys(fallbackPricingCache).length}개 모델`);
    } else {
      console.log('[Gemini-Pricing] Fallback 가격 파일 없음:', FALLBACK_PRICING_PATH);
      fallbackPricingCache = null;
    }
  } catch (e) {
    console.error(`[Gemini-Pricing] Fallback 가격 파일 로드 실패: ${e.message}`);
    fallbackPricingCache = null;
  }

  fallbackPricingLoaded = true;
  return fallbackPricingCache;
}

/**
 * Fallback에서 모델 가격 조회
 * @param {string} modelName - 정규화된 모델명
 * @returns {Object|null} 가격 정보 또는 null
 */
function getFallbackPricing(modelName) {
  const fallbackPricing = loadFallbackPricing();
  if (!fallbackPricing) return null;

  // 정확히 일치
  if (fallbackPricing[modelName]) {
    return fallbackPricing[modelName];
  }

  // 부분 일치 시도
  for (const [key, pricing] of Object.entries(fallbackPricing)) {
    if (modelName.startsWith(key)) {
      return pricing;
    }
  }

  return null;
}

/**
 * Fallback 가격 캐시 리로드
 */
function reloadFallbackPricing() {
  fallbackPricingLoaded = false;
  fallbackPricingCache = null;
  return loadFallbackPricing();
}

/**
 * 모델의 가격 정보 조회 (3단계)
 * 1. MODEL_PRICING에서 정확히 일치
 * 2. MODEL_PRICING에서 부분 일치
 * 3. Fallback 파일에서 조회
 * @param {string} modelName - 정규화된 모델명
 * @returns {Object|null} 가격 정보 또는 null
 */
function getPricing(modelName) {
  // 1단계: MODEL_PRICING에서 정확히 일치
  if (MODEL_PRICING[modelName]) {
    return MODEL_PRICING[modelName];
  }

  // 2단계: MODEL_PRICING에서 부분 일치 시도 (예: gemini-2.5-pro-001 -> gemini-2.5-pro)
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (modelName.startsWith(key)) {
      return pricing;
    }
  }

  // 3단계: Fallback 파일에서 조회
  const fallbackPrice = getFallbackPricing(modelName);
  if (fallbackPrice) {
    console.log(`[Gemini-Pricing] Fallback에서 가격 조회: ${modelName}`);
    return fallbackPrice;
  }

  return null;
}

/**
 * Google Gemini 모델 목록 조회
 * @returns {Promise<{success: boolean, models: Array, error?: string, responseTime: number}>}
 */
async function fetchModels() {
  const startTime = Date.now();
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      models: [],
      error: 'GEMINI_API_KEY or GOOGLE_API_KEY not configured',
      responseTime: 0
    };
  }

  return new Promise((resolve) => {
    const url = new URL(GEMINI_API_URL);
    url.searchParams.set('key', apiKey);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: TIMEOUT_MS
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;

        if (res.statusCode === 401 || res.statusCode === 403) {
          resolve({
            success: false,
            models: [],
            error: 'Unauthorized - Invalid API key',
            responseTime
          });
          return;
        }

        if (res.statusCode === 429) {
          resolve({
            success: false,
            models: [],
            error: 'Rate limited',
            responseTime
          });
          return;
        }

        if (res.statusCode !== 200) {
          resolve({
            success: false,
            models: [],
            error: `HTTP ${res.statusCode}`,
            responseTime
          });
          return;
        }

        try {
          const json = JSON.parse(data);
          const models = filterModels(json.models || []);
          resolve({
            success: true,
            models,
            responseTime
          });
        } catch (e) {
          resolve({
            success: false,
            models: [],
            error: `Parse error: ${e.message}`,
            responseTime
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({
        success: false,
        models: [],
        error: `Network error: ${e.message}`,
        responseTime: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        models: [],
        error: 'Request timeout',
        responseTime: TIMEOUT_MS
      });
    });

    req.end();
  });
}

/**
 * 모델 필터링
 * @param {Array} rawModels - API 응답의 모델 목록
 * @returns {Array} 필터링된 모델 목록 (가격 정보 포함, 별칭 모델 포함)
 */
function filterModels(rawModels) {
  const filteredModels = rawModels
    .filter((model) => {
      // name 형식: "models/gemini-2.5-pro"
      const name = model.name || '';
      const modelId = name.replace(/^models\//, '');

      // 포함 패턴 확인
      const included = INCLUDE_PATTERNS.some((pattern) => pattern.test(modelId));
      if (!included) return false;

      // 제외 패턴 확인
      const excluded = EXCLUDE_PATTERNS.some((pattern) => pattern.test(modelId));
      if (excluded) return false;

      // generateContent 지원 모델만 포함
      const methods = model.supportedGenerationMethods || [];
      if (!methods.includes('generateContent')) return false;

      return true;
    })
    .map((model) => {
      const apiModelId = (model.name || '').replace(/^models\//, '');
      const normalizedName = normalizeModelName(apiModelId);
      const pricing = getPricing(normalizedName);

      return {
        apiModelId,
        modelName: normalizedName,
        displayName: model.displayName || formatDisplayName(apiModelId),
        // API에서 제공하는 토큰 제한 (있으면 사용, 없으면 가격 정보에서)
        inputTokenLimit: model.inputTokenLimit || (pricing ? pricing.inputLimit : null),
        outputTokenLimit: model.outputTokenLimit || (pricing ? pricing.outputLimit : null),
        supportedMethods: model.supportedGenerationMethods
      };
    });

  // 별칭 모델 추가 (preview → base 버전)
  const aliasModels = [];
  for (const model of filteredModels) {
    const aliasName = MODEL_ALIASES[model.modelName];
    if (aliasName) {
      const aliasPricing = getPricing(aliasName);
      aliasModels.push({
        apiModelId: aliasName, // 별칭을 API ID로 사용
        modelName: aliasName,
        displayName: formatDisplayName(aliasName),
        inputTokenLimit: model.inputTokenLimit,
        outputTokenLimit: model.outputTokenLimit,
        supportedMethods: model.supportedMethods,
        isAlias: true // 별칭 모델 표시
      });
    }
  }

  return [...filteredModels, ...aliasModels];
}

/**
 * 모델 이름 정규화
 * @param {string} apiId - API 반환 모델 ID (prefix 제거됨)
 * @returns {string} 정규화된 모델 이름
 */
function normalizeModelName(apiId) {
  // 날짜/버전 접미사 제거: gemini-2.5-pro-001 -> gemini-2.5-pro
  return apiId.replace(/-\d{3}$/, '');
}

/**
 * 표시 이름 생성
 * @param {string} apiId - API 반환 모델 ID
 * @returns {string} 표시 이름
 */
function formatDisplayName(apiId) {
  const normalized = normalizeModelName(apiId);

  // 특수 케이스
  const displayMap = {
    'gemini-3-pro-preview': 'Gemini 3 Pro Preview',
    'gemini-3-flash-preview': 'Gemini 3 Flash Preview',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite'
  };

  if (displayMap[normalized]) {
    return displayMap[normalized];
  }

  // 일반 변환
  return normalized
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/Gemini/g, 'Gemini');
}

module.exports = {
  fetchModels,
  filterModels,
  normalizeModelName,
  getPricing,
  MODEL_PRICING,
  SERVICE_NAME: 'gemini',
  // Fallback 관련
  reloadFallbackPricing,
  getFallbackPricing
};
