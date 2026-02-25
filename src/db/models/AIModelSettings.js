/**
 * AI 모델 설정 관리 모델
 * 서비스 및 모델별 활성화/비활성화 설정 관리
 * 환경별(local/development/production) 독립 설정 지원
 *
 * @module db/models/AIModelSettings
 * @created 2025-12-27
 * @updated 2025-12-30 - 환경별 설정 지원 추가
 * @updated 2025-12-31 - PostgreSQL 모드 직접 조회 지원 추가
 * @updated 2026-02-18 - db/index.js 통합 API 전환 (SQLite/PG 분기 제거)
 */

const db = require('..');

// 지원하는 환경 목록
const ENVIRONMENTS = ['local', 'development', 'production'];

// 환경 이름 매핑
const ENV_NAMES = {
  local: '로컬',
  development: '개발',
  production: '운영'
};

// 서비스 정보 (aiService.js와 동기화)
const AI_SERVICES = {
  gpt: { name: 'OpenAI (GPT)', icon: '' },
  grok: { name: 'xAI (Grok)', icon: '' },
  claude: { name: 'Anthropic (Claude)', icon: '' },
  gemini: { name: 'Google (Gemini)', icon: '' },
  local: { name: 'Local AI', icon: '' }
};

// 2026-01-09: AI_MODELS 상수 제거
// 모델 목록은 DB(ai_model_settings 테이블)에서만 관리
// 새 모델 추가는 관리자 페이지에서 수동으로 수행

// 모델별 최대 출력 토큰 (2025-12-30 업데이트, aimodel3.md 기준)
const MODEL_MAX_TOKENS = {
  // GPT-5.2 시리즈
  'gpt-5.2': 128000, 'gpt-5.2-pro': 128000, 'gpt-5.2-chat-latest': 128000,
  // GPT-5.1 시리즈
  'gpt-5.1': 128000, 'gpt-5.1-codex': 128000,
  // GPT-5 시리즈
  'gpt-5': 128000, 'gpt-5-pro': 128000, 'gpt-5-mini': 32768, 'gpt-5-nano': 16384,
  // o-시리즈 추론 모델
  'o3': 100000, 'o3-mini': 65536, 'o3-pro': 100000, 'o3-deep-research': 100000,
  'o4-mini': 65536, 'o4-mini-deep-research': 65536,
  // o1 시리즈
  'o1': 100000, 'o1-mini': 65536, 'o1-pro': 100000,
  // GPT-4.1 시리즈
  'gpt-4.1': 32768, 'gpt-4.1-mini': 16384, 'gpt-4.1-nano': 8192,
  // GPT-4o 시리즈
  'gpt-4o': 16384, 'gpt-4o-2024-05-13': 16384, 'gpt-4o-mini': 16384,
  // 기타
  'computer-use-preview': 16384, 'chatgpt-4o-latest': 16384,
  // 레거시
  'gpt-4-turbo': 4096, 'gpt-4-turbo-2024-04-09': 4096, 'gpt-3.5-turbo': 4096,
  // 이미지 생성
  'gpt-image-1': 4096, 'gpt-image-1-mini': 4096, 'gpt-image-1.5': 4096, 'dall-e-3': 4096,
  // Grok-4 시리즈
  'grok-4': 100000, 'grok-4-1-fast': 100000,
  // Grok-3 시리즈
  'grok-3': 131072, 'grok-3-mini': 131072,
  // Grok-2 시리즈
  'grok-2': 8192, 'grok-2-1212': 8192, 'grok-2-latest': 8192,
  'grok-2-vision-1212': 8192, 'grok-vision-beta': 8192,
  // Grok 코딩/이미지
  'grok-code-fast-1': 8192, 'grok-2-image-1212': 1024, 'grok-embedding-small': 8192,
  // Claude 4.5 시리즈
  'claude-opus-4-5': 64000, 'claude-sonnet-4-5': 64000, 'claude-haiku-4-5': 64000,
  // Claude 4 시리즈
  'claude-opus-4': 32000, 'claude-sonnet-4': 64000,
  // Claude 3.7 시리즈
  'claude-3-7-sonnet': 64000,
  // Claude 3.5 시리즈
  'claude-3-5-sonnet': 8192, 'claude-3-5-haiku': 8192,
  // Claude 3 시리즈
  'claude-3-opus': 4096, 'claude-3-haiku': 4096,
  // Gemini 3 시리즈
  'gemini-3-flash': 8192, 'gemini-3-pro': 8192,
  // Gemini 2.5 시리즈
  'gemini-2.5-pro': 64000, 'gemini-2.5-flash': 64000, 'gemini-2.5-flash-lite': 64000, 'gemini-2.5-flash-tts': 8192,
  // Gemini 2.0 시리즈
  'gemini-2.0-flash': 8192, 'gemini-2.0-flash-lite': 8192,
  // Gemini 1.5 시리즈
  'gemini-1.5-pro': 8192, 'gemini-1.5-flash': 8192,
  // Gemma 시리즈
  'gemma-3-27b': 8192, 'gemma-3-12b': 8192, 'gemma-3-4b': 8192, 'gemma-3-1b': 8192,
  // 이미지 생성
  'imagen-4': 4096,
  // Local 모델
  'llama3-70b': 32000, 'llama3-8b': 32000, 'codellama-34b': 32000, 'mistral-7b': 32000
};

// 모델별 설명 (2025-12-30 업데이트, aimodel3.md 기준)
// 타입: [텍스트], [멀티모달], [추론], [코딩], [비전], [이미지생성], [오디오], [임베딩], [오픈소스], [레거시], [에이전트]
const MODEL_DESCRIPTIONS = {
  // GPT-5.2 시리즈
  'gpt-5.2': '[멀티모달] 최신 플래그십, 복잡한 추론 최적화 (1M ctx)',
  'gpt-5.2-pro': '[멀티모달] 최고 성능 프리미엄 (1M ctx)',
  'gpt-5.2-chat-latest': '[멀티모달] GPT-5.2 채팅 최신 (1M ctx)',
  // GPT-5.1 시리즈
  'gpt-5.1': '[멀티모달] 효율성 향상 (1M ctx)',
  'gpt-5.1-codex': '[코딩] 코딩 특화, 효율성 향상 (1M ctx)',
  // GPT-5 시리즈
  'gpt-5': '[멀티모달] 첫 GPT-5 시리즈 (256K ctx)',
  'gpt-5-pro': '[멀티모달] 전문가급 모델 (256K ctx)',
  'gpt-5-mini': '[멀티모달] 비용 효율적 (256K ctx)',
  'gpt-5-nano': '[멀티모달] 초경량, 빠른 응답 (256K ctx)',
  // o-시리즈 추론 모델
  'o3': '[추론] 최고 추론 능력, STEM/코딩 최강 (200K ctx)',
  'o3-mini': '[추론] 경량 추론 모델 (200K ctx)',
  'o3-pro': '[추론] 최대 성능, 연구용 (200K ctx)',
  'o3-deep-research': '[추론] 심층 연구용, 웹검색 통합 (200K ctx)',
  'o4-mini': '[추론] o3 대비 비용 효율적 (200K ctx)',
  'o4-mini-deep-research': '[추론] 차세대 연구용, 웹검색 통합 (200K ctx)',
  // o1 시리즈
  'o1': '[추론] 심층 추론 모델 (200K ctx)',
  'o1-mini': '[추론] 추론 경량화 (128K ctx)',
  'o1-pro': '[추론] o1 최고 성능 (200K ctx)',
  // GPT-4.1 시리즈
  'gpt-4.1': '[코딩] 코딩/지시따르기 최적화 (1M ctx)',
  'gpt-4.1-mini': '[텍스트] 4.1 경량화, 비용 효율적 (1M ctx)',
  'gpt-4.1-nano': '[텍스트] 초경량, 빠른 응답 (1M ctx)',
  // GPT-4o 시리즈
  'gpt-4o': '[멀티모달] 텍스트/이미지/오디오 통합 (128K ctx)',
  'gpt-4o-2024-05-13': '[멀티모달] GPT-4o 안정 버전 (128K ctx)',
  'gpt-4o-mini': '[멀티모달] 4o 경량화 (128K ctx)',
  // GPT-4 시리즈
  'gpt-4-32k': '[레거시] GPT-4 대용량 (32K ctx)',
  'gpt-4-1106-vision-preview': '[비전] GPT-4 Vision 미리보기',
  'gpt-4-1106-preview': '[레거시] GPT-4 Turbo 미리보기 (128K ctx)',
  'gpt-4-0613': '[레거시] GPT-4 안정 버전 (8K ctx)',
  'gpt-4-0314': '[레거시] GPT-4 초기 버전 (8K ctx)',
  'gpt-4-0125-preview': '[레거시] GPT-4 Turbo 개선판 (128K ctx)',
  // 기타
  'computer-use-preview': '[에이전트] 컴퓨터 GUI 자동화 (128K ctx)',
  'chatgpt-4o-latest': '[멀티모달] ChatGPT 최신 (128K ctx)',
  // 레거시
  'gpt-4-turbo': '[레거시] GPT-4 Turbo (128K ctx)',
  'gpt-4-turbo-2024-04-09': '[레거시] GPT-4 Turbo 스냅샷 (128K ctx)',
  'gpt-3.5-turbo': '[레거시] 경제적 모델 (16K ctx)',
  // 이미지 생성
  'gpt-image-1': '[이미지생성] 네이티브 이미지 생성',
  'gpt-image-1-mini': '[이미지생성] 80% 저렴, 비용 효율적',
  'gpt-image-1.5': '[이미지생성] 4배 빠름, 20% 저렴, 정밀 편집',
  'dall-e-3': '[이미지생성] 고품질 텍스트→이미지',
  'gpt-3.5-turbo-instruct': '[레거시] 지시형 모델 (4K ctx)',
  'gpt-3.5-turbo-16k-0613': '[레거시] 대용량 컨텍스트 (16K ctx)',
  'gpt-3.5-turbo-1106': '[레거시] 개선된 버전 (16K ctx)',
  'gpt-3.5-turbo-0613': '[레거시] 안정 버전 (4K ctx)',
  'gpt-3.5-turbo-0125': '[레거시] 최신 개선판 (16K ctx)',
  'gpt-3.5-0301': '[레거시] 초기 버전 (4K ctx)',
  // 레거시 완료 모델
  'davinci-002': '[레거시] GPT-3 대형 (4K ctx)',
  'babbage-002': '[레거시] GPT-3 경량 (4K ctx)',
  // Grok-4 시리즈
  'grok-4': '[멀티모달] 최신 플래그십 (256K ctx)',
  'grok-4-fast': '[에이전트] 에이전트 최적화, 고속 (2M ctx)',
  'grok-4-fast-reasoning': '[추론] 고속 추론 모델 (2M ctx)',
  'grok-4-fast-non-reasoning': '[텍스트] 고속 처리 모델 (2M ctx)',
  'grok-4-1-fast': '[에이전트] 에이전트 최적화 (2M ctx)',
  'grok-4-1-fast-reasoning': '[추론] 고속 추론 모델 v4.1 (2M ctx)',
  'grok-4-1-fast-non-reasoning': '[텍스트] 고속 처리 모델 v4.1 (2M ctx)',
  // Grok-3 시리즈
  'grok-3': '[텍스트] 추론/코딩 강화 (131K ctx)',
  'grok-3-mini': '[텍스트] 초경량, 최저 비용 (131K ctx)',
  // Grok-2 시리즈
  'grok-2': '[텍스트] xAI 고급 모델 (131K ctx)',
  'grok-2-1212': '[텍스트] Grok-2 안정 버전 (131K ctx)',
  'grok-2-latest': '[텍스트] Grok-2 최신 (131K ctx)',
  // Grok Vision
  'grok-2-vision': '[비전] 이미지 분석 지원 (32K ctx)',
  'grok-2-vision-1212': '[비전] 이미지 분석 지원 (32K ctx)',
  'grok-vision-beta': '[비전] Grok 비전 베타 (8K ctx)',
  // Grok 코딩/이미지
  'grok-code-fast-1': '[코딩] 에이전틱 코딩 최적화 (256K ctx)',
  'grok-2-image-1212': '[이미지생성] 텍스트→이미지 생성',
  'grok-embedding-small': '[임베딩] 텍스트 임베딩',
  // Claude 4.5 시리즈 (최신)
  'claude-opus-4-5': '[멀티모달] 최고 성능, 복잡한 분석 (200K ctx)',
  'claude-sonnet-4-5': '[멀티모달] 코딩 탁월, 균형잡힌 성능 (200K ctx)',
  'claude-haiku-4-5': '[멀티모달] 빠른 응답, 비용 효율 (200K ctx)',
  // Claude 4 시리즈
  'claude-opus-4': '[멀티모달] 복잡한 작업용 (200K ctx)',
  'claude-sonnet-4': '[멀티모달] 균형잡힌 성능 (200K ctx)',
  // Claude 3.7 시리즈
  'claude-3-7-sonnet': '[추론] 확장 사고 지원 (200K ctx)',
  // Claude 3.5 시리즈
  'claude-3-5-sonnet': '[멀티모달] 코딩/분석 우수 (200K ctx)',
  'claude-3-5-haiku': '[멀티모달] 빠른 응답, 저비용 (200K ctx)',
  // Claude 3 시리즈 (레거시)
  'claude-3-opus': '[레거시] 복잡한 작업용 (200K ctx)',
  'claude-3-haiku': '[레거시] 초고속, 저비용 (200K ctx)',
  // Gemini 3 시리즈 (최신)
  'gemini-3-flash': '[멀티모달] Gemini 3 고속 모델',
  'gemini-3-pro': '[멀티모달] 최신 플래그십 (1M ctx)',
  // Gemini 2.5 시리즈 (주력)
  'gemini-2.5-pro': '[멀티모달] adaptive thinking (1M ctx)',
  'gemini-2.5-flash': '[멀티모달] 적응형 사고 (1M ctx)',
  'gemini-2.5-flash-lite': '[텍스트] 초경량 (1M ctx)',
  'gemini-2.5-flash-tts': '[오디오] TTS 특화 (저지연)',
  // Gemini 2.0 시리즈
  'gemini-2.0-flash': '[에이전트] 에이전트 최적화 (1M ctx)',
  'gemini-2.0-flash-lite': '[텍스트] 초저비용 (1M ctx)',
  // Gemini 1.5 시리즈 (레거시)
  'gemini-1.5-pro': '[레거시] 장문 컨텍스트 (2M ctx)',
  'gemini-1.5-flash': '[레거시] 빠른 처리 (1M ctx)',
  // Gemini 이미지 생성 (나노바나나)
  'gemini-2.5-flash-image': '[이미지생성] Nano Banana - 고속 이미지 생성',
  'gemini-2.5-flash-image-preview': '[이미지생성] Nano Banana Preview',
  'gemini-3-pro-image-preview': '[이미지생성] Nano Banana Pro - 고품질 이미지, Thinking 모드',
  // Gemma 시리즈 (오픈소스)
  'gemma-3-27b': '[오픈소스] 고성능 (128K ctx)',
  'gemma-3-12b': '[오픈소스] 중간 크기 (128K ctx)',
  'gemma-3-4b': '[오픈소스] 경량 (128K ctx)',
  'gemma-3-1b': '[오픈소스] 초경량, 엣지 디바이스용 (32K ctx)',
  // 이미지 생성
  'imagen-4': '[이미지생성] 고품질 텍스트→이미지',
  // Local 모델
  'llama3-70b': '[오픈소스] Meta 대형 모델 (8K ctx)',
  'llama3-8b': '[오픈소스] Meta 경량 모델 (8K ctx)',
  'llama-2-70b': '[오픈소스] Llama 2 대형 (4K ctx)',
  'codellama-34b': '[코딩] 코드 특화 (16K ctx)',
  'mistral-7b': '[오픈소스] Mistral 경량 (32K ctx)',
  'gpt-oss-20b': '[오픈소스] 오픈소스 GPT (4K ctx)'
};

/**
 * 모델명으로 서비스 추론
 * @param {string} modelName - 모델명
 * @returns {string} 서비스명 (gpt/grok/claude/gemini/local)
 */
function getServiceFromModel(modelName) {
  const m = modelName.toLowerCase();
  // gpt 계열
  if (m.startsWith('gpt-') || m.startsWith('o1') || m.startsWith('o3') || m.startsWith('o4')
    || m.startsWith('chatgpt-') || m.startsWith('computer-use-')
    || m.startsWith('dall-e') || m.startsWith('gpt-image')
    || m.startsWith('davinci') || m.startsWith('babbage')) {
    return 'gpt';
  }
  if (m.startsWith('grok-')) return 'grok';
  if (m.startsWith('claude-')) return 'claude';
  if (m.startsWith('gemini-') || m.startsWith('gemma-') || m.startsWith('imagen')) return 'gemini';
  if (m.startsWith('llama') || m.startsWith('codellama') || m.startsWith('mistral') || m.startsWith('gpt-oss')) return 'local';
  return 'gpt'; // 기본값
}

/**
 * 모델명에서 displayName 자동 생성
 * @param {string} modelName - 모델명
 * @returns {string} displayName
 */
function generateDisplayName(modelName) {
  const brandMap = {
    'gpt-5.2': 'GPT-5.2', 'gpt-5.1': 'GPT-5.1', 'gpt-5': 'GPT-5',
    'gpt-4.1': 'GPT-4.1', 'gpt-4o': 'GPT-4o', 'gpt-4': 'GPT-4',
    'gpt-3.5': 'GPT-3.5', 'gpt-image-1.5': 'GPT Image 1.5',
    'gpt-image-1': 'GPT Image 1', 'gpt-oss': 'GPT OSS',
    'o4-mini': 'o4-mini', 'o3': 'o3', 'o1': 'o1',
    'computer-use-preview': 'Computer Use Preview',
    'chatgpt-4o-latest': 'ChatGPT-4o Latest',
    'dall-e-3': 'DALL-E 3',
    'claude-opus-4-6': 'Claude Opus 4.6', 'claude-sonnet-4-6': 'Claude Sonnet 4.6',
    'claude-opus-4-5': 'Claude Opus 4.5', 'claude-sonnet-4-5': 'Claude Sonnet 4.5',
    'claude-haiku-4-5': 'Claude Haiku 4.5',
    'claude-opus-4': 'Claude Opus 4', 'claude-sonnet-4': 'Claude Sonnet 4',
    'claude-3-7-sonnet': 'Claude 3.7 Sonnet',
    'claude-3-5-sonnet': 'Claude 3.5 Sonnet', 'claude-3-5-haiku': 'Claude 3.5 Haiku',
    'claude-3-opus': 'Claude 3 Opus', 'claude-3-haiku': 'Claude 3 Haiku',
    'grok-imagine': 'Grok Imagine',
    'grok-4-1-fast': 'Grok-4.1 Fast', 'grok-4': 'Grok-4',
    'grok-3': 'Grok-3', 'grok-3-mini': 'Grok-3 Mini',
    'grok-2': 'Grok-2', 'grok-2-latest': 'Grok-2 Latest',
    'grok-2-1212': 'Grok-2 (1212)', 'grok-2-vision-1212': 'Grok-2 Vision',
    'grok-2-image-1212': 'Grok-2 Image', 'grok-vision-beta': 'Grok Vision Beta',
    'grok-code-fast-1': 'Grok Code Fast', 'grok-embedding-small': 'Grok Embedding',
    'gemini-3.1-pro': 'Gemini 3.1 Pro',
    'gemini-3-flash': 'Gemini 3 Flash', 'gemini-3-pro': 'Gemini 3 Pro',
    'gemini-2.5-pro': 'Gemini 2.5 Pro', 'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite', 'gemini-2.5-flash-tts': 'Gemini 2.5 Flash TTS',
    'gemini-2.0-flash': 'Gemini 2.0 Flash', 'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite',
    'gemini-1.5-pro': 'Gemini 1.5 Pro', 'gemini-1.5-flash': 'Gemini 1.5 Flash',
    'gemma-3-27b': 'Gemma 3 27B', 'gemma-3-12b': 'Gemma 3 12B',
    'gemma-3-4b': 'Gemma 3 4B', 'gemma-3-1b': 'Gemma 3 1B',
    'imagen-4': 'Imagen 4',
    'llama3-70b': 'Llama 3 70B', 'llama3-8b': 'Llama 3 8B',
    'codellama-34b': 'CodeLlama 34B', 'mistral-7b': 'Mistral 7B'
  };

  // 가장 긴 prefix부터 매칭
  const sortedKeys = Object.keys(brandMap).sort((a, b) => b.length - a.length);
  for (const prefix of sortedKeys) {
    if (modelName.startsWith(prefix)) {
      const suffix = modelName.slice(prefix.length);
      if (!suffix) return brandMap[prefix];
      const formattedSuffix = suffix.replace(/^-/, ' ').replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
      return brandMap[prefix] + formattedSuffix;
    }
  }
  return modelName;
}

/**
 * 테이블 초기화 (없으면 생성)
 * 2025-12-30: 환경별 설정 지원을 위한 마이그레이션 포함
 * 2026-02-18: db/index.js 통합 API 전환 - async 단일 구현
 * 2026-02-25: DB 비어있을 때 MODEL_MAX_TOKENS 기반 자동 시드 복원
 */
async function initTables() {
  // 마이그레이션: autoindex 제거를 위한 테이블 재생성
  // PostgreSQL에서는 idx_*_unique 인덱스가 postgres-migrate.js에서 생성될 수 있으므로
  // autoindex로 오인하지 않도록 레거시 인덱스만 정리하고 테이블 DROP은 하지 않음
  try {
    const indexes = await db.all(
      "SELECT indexname as name FROM pg_indexes WHERE tablename = 'ai_service_settings' AND indexname LIKE 'idx_%_unique'",
      []
    );
    if (indexes.length > 0) {
      // 레거시 인덱스만 제거하고 테이블은 유지 (데이터 보존)
      // 주의: 기존 코드는 여기서 테이블을 DROP/재생성했으나, 이는 데이터 유실 원인이었음
      for (const idx of indexes) {
        try {
          await db.exec(`DROP INDEX IF EXISTS "${idx.name}"`);
          console.log(`[AIModelSettings] 레거시 인덱스 제거: ${idx.name}`);
        } catch (e) { /* 무시 */ }
      }
      // 통일된 인덱스 재생성
      try {
        await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_service_env ON ai_service_settings(service, environment)');
        await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_model_env ON ai_model_settings(service, model, environment)');
      } catch (e) { /* 이미 존재하면 무시 */ }
      console.log('[AIModelSettings] 인덱스 통일 완료 (데이터 보존)');
    }
  } catch (err) {
    console.log('[AIModelSettings] 마이그레이션 체크 중 오류 (무시):', err.message);
  }

  // 서비스 설정 테이블 (환경 컬럼 포함)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_service_settings (
      id SERIAL PRIMARY KEY,
      service TEXT NOT NULL,
      environment TEXT NOT NULL DEFAULT 'local',
      enabled INTEGER DEFAULT 1,
      default_model TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 모델 설정 테이블 (환경 컬럼 포함)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS ai_model_settings (
      id SERIAL PRIMARY KEY,
      service TEXT NOT NULL,
      model TEXT NOT NULL,
      environment TEXT NOT NULL DEFAULT 'local',
      enabled INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 마이그레이션: environment 컬럼이 없으면 추가
  try {
    const tableInfo = await db.all(
      "SELECT column_name as name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_service_settings'",
      []
    );
    const hasEnvColumn = tableInfo.some(col => col.name === 'environment');

    if (!hasEnvColumn) {
      console.log('[AIModelSettings] 마이그레이션: environment 컬럼 추가 중...');

      // 컬럼 추가
      await db.exec(`ALTER TABLE ai_service_settings ADD COLUMN environment TEXT DEFAULT 'local'`);
      await db.exec(`ALTER TABLE ai_model_settings ADD COLUMN environment TEXT DEFAULT 'local'`);

      // 기존 데이터를 local 환경으로 설정
      await db.exec(`UPDATE ai_service_settings SET environment = 'local' WHERE environment IS NULL`);
      await db.exec(`UPDATE ai_model_settings SET environment = 'local' WHERE environment IS NULL`);

      // 기존 데이터를 development, production 환경으로 복제
      const serviceRows = await db.all("SELECT service, enabled FROM ai_service_settings WHERE environment = 'local'", []);
      const modelRows = await db.all("SELECT service, model, enabled, sort_order FROM ai_model_settings WHERE environment = 'local'", []);

      await db.transaction(async (tx) => {
        for (const env of ['development', 'production']) {
          for (const row of serviceRows) {
            await tx.run(
              'INSERT INTO ai_service_settings (service, environment, enabled) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
              [row.service, env, row.enabled]
            );
          }
          for (const row of modelRows) {
            await tx.run(
              'INSERT INTO ai_model_settings (service, model, environment, enabled, sort_order) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
              [row.service, row.model, env, row.enabled, row.sort_order || 0]
            );
          }
        }
      });

      console.log('[AIModelSettings] 마이그레이션 완료: 기존 데이터를 3개 환경으로 복제');
    }
  } catch (err) {
    // 테이블이 새로 생성된 경우 마이그레이션 불필요
    console.log('[AIModelSettings] 마이그레이션 스킵 (새 테이블)');
  }

  // 기존 단일 컬럼 유니크 인덱스 제거 (환경별 설정을 위해)
  try {
    const indexes = await db.all(
      "SELECT indexname as name FROM pg_indexes WHERE tablename = 'ai_service_settings'",
      []
    );
    for (const idx of indexes) {
      // 환경 복합 인덱스가 아닌 경우 삭제
      if (idx.name && !idx.name.includes('_env') && !idx.name.endsWith('_pkey')) {
        try {
          await db.exec(`DROP INDEX IF EXISTS "${idx.name}"`);
          console.log(`[AIModelSettings] 기존 인덱스 삭제: ${idx.name}`);
        } catch (e) {
          // 무시
        }
      }
    }

    const modelIndexes = await db.all(
      "SELECT indexname as name FROM pg_indexes WHERE tablename = 'ai_model_settings'",
      []
    );
    for (const idx of modelIndexes) {
      if (idx.name && !idx.name.includes('_env') && !idx.name.endsWith('_pkey')) {
        try {
          await db.exec(`DROP INDEX IF EXISTS "${idx.name}"`);
          console.log(`[AIModelSettings] 기존 인덱스 삭제: ${idx.name}`);
        } catch (e) {
          // 무시
        }
      }
    }
  } catch (err) {
    console.log('[AIModelSettings] 기존 인덱스 정리 중 오류 (무시):', err.message);
  }

  // 마이그레이션: default_model 컬럼 추가 (기존 테이블 대응)
  try {
    const cols = await db.all(
      "SELECT column_name as name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ai_service_settings'",
      []
    );
    const hasDefaultModel = cols.some(c => c.name === 'default_model');
    if (!hasDefaultModel) {
      await db.exec('ALTER TABLE ai_service_settings ADD COLUMN default_model TEXT');
      console.log('[AIModelSettings] 마이그레이션: default_model 컬럼 추가 완료');
    }
  } catch (err) {
    console.log('[AIModelSettings] default_model 마이그레이션 스킵:', err.message);
  }

  // 환경별 유니크 인덱스 생성
  try {
    await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_service_env ON ai_service_settings(service, environment)');
    await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_model_env ON ai_model_settings(service, model, environment)');
  } catch (err) {
    // 인덱스가 이미 존재하면 무시
  }

  // 서비스 목록 초기화 (서비스는 고정된 5개뿐)
  await db.transaction(async (tx) => {
    for (const env of ENVIRONMENTS) {
      for (const service of Object.keys(AI_SERVICES)) {
        await tx.run(
          'INSERT INTO ai_service_settings (service, environment, enabled) VALUES (?, ?, 1) ON CONFLICT DO NOTHING',
          [service, env]
        );
      }
    }
  });

  // 2026-02-25: DB 비어있을 때 MODEL_MAX_TOKENS 기반 자동 시드
  try {
    const modelCount = await db.get('SELECT COUNT(*) as cnt FROM ai_model_settings', []);
    const cnt = parseInt(modelCount?.cnt || 0);

    if (cnt === 0) {
      console.log('[AIModelSettings] DB 비어있음 - MODEL_MAX_TOKENS 기반 자동 시드 시작');
      const modelNames = Object.keys(MODEL_MAX_TOKENS);
      let order = 0;

      await db.transaction(async (tx) => {
        for (const modelName of modelNames) {
          const service = getServiceFromModel(modelName);
          order++;
          for (const env of ENVIRONMENTS) {
            await tx.run(
              `INSERT INTO ai_model_settings (service, model, environment, enabled, sort_order, description)
               VALUES (?, ?, ?, 1, ?, ?)
               ON CONFLICT DO NOTHING`,
              [service, modelName, env, order, MODEL_DESCRIPTIONS[modelName] || '']
            );
          }
        }
      });

      const seededCount = await db.get('SELECT COUNT(*) as cnt FROM ai_model_settings', []);
      console.log(`[AIModelSettings] 자동 시드 완료: ${seededCount.cnt}개 행 (${modelNames.length}개 모델 x ${ENVIRONMENTS.length}개 환경)`);
    } else {
      console.log(`[AIModelSettings] 기존 모델 ${cnt}개 존재 - 시드 스킵`);
    }
  } catch (err) {
    console.log('[AIModelSettings] 자동 시드 중 오류:', err.message);
  }

  // 환경 간 모델 데이터 동기화
  // 한 환경에만 모델이 있고 다른 환경에 없으면 자동 복제
  try {
    // 모델이 가장 많은 환경을 소스로 선택
    const envCounts = await db.all(
      'SELECT environment, COUNT(*) as cnt FROM ai_model_settings GROUP BY environment ORDER BY cnt DESC',
      []
    );

    if (envCounts.length > 0) {
      const sourceEnv = envCounts[0].environment;
      const sourceCount = parseInt(envCounts[0].cnt);
      const existingEnvs = new Set(envCounts.map(e => e.environment));

      // 데이터가 없는 환경에 복제
      const missingEnvs = ENVIRONMENTS.filter(env => !existingEnvs.has(env));

      if (missingEnvs.length > 0 && sourceCount > 0) {
        const sourceModels = await db.all(
          'SELECT service, model, enabled, sort_order FROM ai_model_settings WHERE environment = ?',
          [sourceEnv]
        );

        await db.transaction(async (tx) => {
          for (const env of missingEnvs) {
            for (const row of sourceModels) {
              await tx.run(
                'INSERT INTO ai_model_settings (service, model, environment, enabled, sort_order) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING',
                [row.service, row.model, env, row.enabled, row.sort_order || 0]
              );
            }
          }
        });

        console.log(`[AIModelSettings] 환경 동기화: ${sourceEnv} → ${missingEnvs.join(', ')} (${sourceModels.length}개 모델 복제)`);
      }
    }
  } catch (err) {
    console.log('[AIModelSettings] 환경 간 모델 동기화 중 오류:', err.message);
  }

  console.log('[AIModelSettings] Tables initialized (model auto-insert disabled)');
}

/**
 * AI 서비스 설정 클래스
 * 2025-12-30: 환경별 설정 지원 추가
 * 2026-02-18: db/index.js 통합 API 전환
 */
class AIServiceSettings {
  /**
   * 모든 서비스 설정 조회 (특정 환경)
   * @param {string} environment - 환경 (local/development/production)
   */
  static async getAll(environment = 'local') {
    const rows = await db.all(
      'SELECT * FROM ai_service_settings WHERE environment = ? ORDER BY id',
      [environment]
    );

    const result = {};
    for (const row of rows) {
      result[row.service] = {
        enabled: row.enabled === 1,
        name: AI_SERVICES[row.service]?.name || row.service,
        icon: AI_SERVICES[row.service]?.icon || '',
        default_model: row.default_model || null
      };
    }

    // DB에 없는 서비스도 기본값으로 추가
    for (const [service, info] of Object.entries(AI_SERVICES)) {
      if (!result[service]) {
        result[service] = { enabled: true, name: info.name, icon: info.icon };
      }
    }

    return result;
  }

  /**
   * 특정 서비스 활성화 상태 조회
   * @param {string} service - 서비스명
   * @param {string} environment - 환경 (local/development/production)
   */
  static async isEnabled(service, environment = 'local') {
    const row = await db.get(
      'SELECT enabled FROM ai_service_settings WHERE service = ? AND environment = ?',
      [service, environment]
    );
    return row ? row.enabled === 1 : true; // 없으면 기본 활성화
  }

  /**
   * 서비스 활성화 상태 설정
   * @param {string} service - 서비스명
   * @param {boolean} enabled - 활성화 여부
   * @param {string} environment - 환경 (local/development/production)
   */
  static async setEnabled(service, enabled, environment = 'local') {
    return await db.run(
      `INSERT INTO ai_service_settings (service, environment, enabled, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(service, environment) DO UPDATE SET
         enabled = excluded.enabled,
         updated_at = CURRENT_TIMESTAMP`,
      [service, environment, enabled ? 1 : 0]
    );
  }

  /**
   * 여러 서비스 설정 일괄 저장
   * @param {Object} settings - 서비스별 설정 { service: boolean } 또는 { service: { enabled: boolean, default_model: string } }
   * @param {string} environment - 환경 (local/development/production)
   */
  static async saveAll(settings, environment = 'local') {
    let count = 0;

    await db.transaction(async (tx) => {
      for (const [service, value] of Object.entries(settings)) {
        // value가 boolean이면 enabled만, object면 enabled와 default_model 둘 다
        const enabled = typeof value === 'boolean' ? value : (value?.enabled ?? true);
        const defaultModel = typeof value === 'object' ? (value?.default_model || null) : null;
        await tx.run(
          `INSERT INTO ai_service_settings (service, environment, enabled, default_model, updated_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(service, environment) DO UPDATE SET
             enabled = excluded.enabled,
             default_model = COALESCE(excluded.default_model, ai_service_settings.default_model),
             updated_at = CURRENT_TIMESTAMP`,
          [service, environment, enabled ? 1 : 0, defaultModel]
        );
        count++;
      }
    });

    console.log(`[AIServiceSettings.saveAll] 저장 완료: ${count}개 서비스 [${environment}]`);
    return count;
  }
}

/**
 * AI 모델 설정 클래스
 * 2025-12-30: 환경별 설정 지원 추가
 * 2026-02-18: db/index.js 통합 API 전환
 */
class AIModelSettings {
  /**
   * 모든 모델 설정 조회 (서비스별 그룹화)
   * 모든 환경에서 동일한 모델 목록을 반환 (환경별로 enabled 상태만 다름)
   * @param {boolean} forAdmin - true면 원래 정의 순서로 반환, false면 sort_order 순으로 반환
   * @param {string} environment - 환경 (local/development/production)
   */
  static async getAll(forAdmin = false, environment = 'local') {
    // 1. 먼저 모든 환경에서 사용되는 모든 고유 모델 목록 수집
    const allUniqueModels = await db.all(
      'SELECT DISTINCT service, model FROM ai_model_settings',
      []
    );

    // 서비스별 고유 모델 맵 생성
    const uniqueModelsByService = {};
    for (const row of allUniqueModels) {
      if (!uniqueModelsByService[row.service]) {
        uniqueModelsByService[row.service] = new Set();
      }
      uniqueModelsByService[row.service].add(row.model);
    }

    // 2026-01-09: AI_MODELS 상수 참조 제거 - DB에서만 모델 관리

    // 2. 해당 환경의 설정 조회
    const envRows = await db.all(
      'SELECT * FROM ai_model_settings WHERE environment = ?',
      [environment]
    );

    // 환경별 설정을 맵으로 변환
    const envSettingsMap = {};
    for (const row of envRows) {
      const key = `${row.service}:${row.model}`;
      envSettingsMap[key] = {
        enabled: row.enabled === 1,
        sortOrder: row.sort_order || 0,
        description: row.description || ''
      };
    }

    // 3. 결과 생성 - 모든 환경에서 동일한 모델 목록, 환경별 enabled 상태
    const result = {};
    for (const [service, modelsSet] of Object.entries(uniqueModelsByService)) {
      result[service] = [];
      let defaultOrder = 0;
      for (const model of modelsSet) {
        const key = `${service}:${model}`;
        const envSetting = envSettingsMap[key];
        defaultOrder++;

        result[service].push({
          model,
          enabled: envSetting ? envSetting.enabled : true, // 없으면 기본 활성화
          maxTokens: MODEL_MAX_TOKENS[model] || 4096,
          description: envSetting?.description || MODEL_DESCRIPTIONS[model] || '',
          sortOrder: envSetting?.sortOrder ?? defaultOrder
        });
      }
    }

    // 관리자용: 모델명 기준 DESC 정렬 (sort_order 무시)
    if (forAdmin) {
      for (const [service, models] of Object.entries(result)) {
        result[service] = models.sort((a, b) => b.model.localeCompare(a.model));
      }
    } else {
      // 일반용: sort_order 순 정렬
      for (const [service, models] of Object.entries(result)) {
        result[service] = models.sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) {
            return a.sortOrder - b.sortOrder;
          }
          return a.model.localeCompare(b.model);
        });
      }
    }

    return result;
  }

  /**
   * 특정 서비스의 모델 목록 조회
   * @param {string} service - 서비스명
   * @param {string} environment - 환경 (local/development/production)
   */
  static async getByService(service, environment = 'local') {
    const rows = await db.all(
      'SELECT * FROM ai_model_settings WHERE service = ? AND environment = ? ORDER BY sort_order ASC, model ASC',
      [service, environment]
    );
    return rows.map(row => ({
      model: row.model,
      enabled: row.enabled === 1,
      maxTokens: MODEL_MAX_TOKENS[row.model] || 4096,
      sortOrder: row.sort_order || 0
    }));
  }

  /**
   * 특정 모델 활성화 상태 조회
   * @param {string} service - 서비스명
   * @param {string} model - 모델명
   * @param {string} environment - 환경 (local/development/production)
   */
  static async isEnabled(service, model, environment = 'local') {
    const row = await db.get(
      'SELECT enabled FROM ai_model_settings WHERE service = ? AND model = ? AND environment = ?',
      [service, model, environment]
    );
    // 2026-01-01: 설정이 없으면 비활성화 (관리자가 명시적으로 설정한 모델만 표시)
    return row ? row.enabled === 1 : false;
  }

  /**
   * 모델이 실제로 사용 가능한지 확인 (서비스 + 모델 모두 활성화)
   * @param {string} service - 서비스명
   * @param {string} model - 모델명
   * @param {string} environment - 환경 (local/development/production)
   */
  static async isAvailable(service, model, environment = 'local') {
    const serviceEnabled = await AIServiceSettings.isEnabled(service, environment);
    if (!serviceEnabled) {
      return false;
    }
    return await AIModelSettings.isEnabled(service, model, environment);
  }

  /**
   * 모델 활성화 상태 설정
   * @param {string} service - 서비스명
   * @param {string} model - 모델명
   * @param {boolean} enabled - 활성화 여부
   * @param {string} environment - 환경 (local/development/production)
   */
  static async setEnabled(service, model, enabled, environment = 'local') {
    return await db.run(
      `INSERT INTO ai_model_settings (service, model, environment, enabled, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(service, model, environment) DO UPDATE SET
         enabled = excluded.enabled,
         updated_at = CURRENT_TIMESTAMP`,
      [service, model, environment, enabled ? 1 : 0]
    );
  }

  /**
   * 여러 모델 설정 일괄 저장
   * @param {Object} modelSettings - 모델별 활성화 상태 { service: { model: boolean } }
   * @param {Object} sortOrders - 모델별 정렬 순서 { service: { model: number } } (옵션)
   * @param {string} environment - 환경 (local/development/production)
   */
  static async saveAll(modelSettings, sortOrders = null, environment = 'local') {
    let count = 0;

    await db.transaction(async (tx) => {
      for (const [service, models] of Object.entries(modelSettings)) {
        for (const [model, enabled] of Object.entries(models)) {
          const sortOrder = sortOrders?.[service]?.[model] ?? 0;
          await tx.run(
            `INSERT INTO ai_model_settings (service, model, environment, enabled, sort_order, updated_at)
             VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(service, model, environment) DO UPDATE SET
               enabled = excluded.enabled,
               sort_order = excluded.sort_order,
               updated_at = CURRENT_TIMESTAMP`,
            [service, model, environment, enabled ? 1 : 0, sortOrder]
          );
          count++;
        }
      }
    });

    console.log(`[AIModelSettings.saveAll] 저장 완료: ${count}개 모델 [${environment}]`);
    return count;
  }

  /**
   * 정렬 순서 중복 검증
   * @param {Object} sortOrders - { service: { model: number } }
   * @returns {Object} { valid: boolean, duplicates: [{ service, order, models }] }
   */
  static validateSortOrders(sortOrders) {
    const duplicates = [];

    for (const [service, models] of Object.entries(sortOrders)) {
      // 활성화된 모델의 순서만 검사 (0은 비활성화 또는 미설정)
      const orderMap = {};
      for (const [model, order] of Object.entries(models)) {
        if (order > 0) {
          if (!orderMap[order]) {
            orderMap[order] = [];
          }
          orderMap[order].push(model);
        }
      }

      // 중복 찾기
      for (const [order, modelList] of Object.entries(orderMap)) {
        if (modelList.length > 1) {
          duplicates.push({
            service,
            order: parseInt(order),
            models: modelList
          });
        }
      }
    }

    return {
      valid: duplicates.length === 0,
      duplicates
    };
  }

  /**
   * 모든 설정 초기화 (기본값으로 복원)
   * @param {string} environment - 환경 (local/development/production), null이면 모든 환경
   */
  static async resetAll(environment = null) {
    await db.transaction(async (tx) => {
      if (environment) {
        await tx.run(
          'UPDATE ai_service_settings SET enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE environment = ?',
          [environment]
        );
        await tx.run(
          'UPDATE ai_model_settings SET enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE environment = ?',
          [environment]
        );
        console.log(`[AIModelSettings] Settings reset to defaults for environment: ${environment}`);
      } else {
        await tx.run('UPDATE ai_service_settings SET enabled = 1, updated_at = CURRENT_TIMESTAMP', []);
        await tx.run('UPDATE ai_model_settings SET enabled = 1, updated_at = CURRENT_TIMESTAMP', []);
        console.log('[AIModelSettings] All settings reset to defaults (all environments)');
      }
    });
  }

  /**
   * 사용 가능한 모든 모델 목록 조회 (활성화된 서비스+모델만)
   * @param {string} environment - 환경 (local/development/production)
   */
  static async getEnabledModels(environment = 'local') {
    return await db.all(
      `SELECT m.service, m.model, m.sort_order
       FROM ai_model_settings m
       INNER JOIN ai_service_settings s ON m.service = s.service AND m.environment = s.environment
       WHERE m.enabled = 1 AND s.enabled = 1 AND m.environment = ?
       ORDER BY m.service, m.sort_order ASC, m.model ASC`,
      [environment]
    );
  }

  /**
   * 현재 서버 환경에 맞는 모델 목록 조회 (APP_ENV 기반)
   * @returns {Promise<Array>} 활성화된 모델 목록
   */
  static async getEnabledModelsForCurrentEnv() {
    const currentEnv = process.env.APP_ENV || 'local';
    return await AIModelSettings.getEnabledModels(currentEnv);
  }
}

// 모듈 로드 시 테이블 초기화 (비동기, 에러는 로그만)
initTables().catch(error => {
  console.error('[AIModelSettings] Failed to initialize tables:', error.message);
});

module.exports = {
  AIServiceSettings,
  AIModelSettings,
  AI_SERVICES,
  MODEL_MAX_TOKENS,
  MODEL_DESCRIPTIONS,
  ENVIRONMENTS,
  ENV_NAMES,
  getServiceFromModel,
  generateDisplayName,
  initTables
};
