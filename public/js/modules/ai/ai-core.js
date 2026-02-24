/**
 * ============================================
 * ai-core.js - AI 코어 모듈
 * ============================================
 * AI 모델 관리, 서비스 선택, 설정 동기화 등
 * 핵심 AI 기능을 담당하는 모듈
 * ============================================
 */

(function() {
  'use strict';

  // ============================================
  // AI 모델 및 서비스 상태 변수
  // ============================================

  // AI 서비스별 모델 목록 (서버에서 동적 로딩)
  let AI_MODELS = {};

  // 활성화된 서비스 목록 (DB 설정 기반)
  let ENABLED_SERVICES = [];

  // 모델 로딩 완료 플래그
  let modelsLoaded = false;

  // AI 모델 capabilities (서버 API에서 로드)
  let MODEL_CAPABILITIES = {};
  let MODEL_CAPABILITIES_LOADED = false;

  // ============================================
  // 타입 레이블 및 Fallback Capabilities
  // ============================================

  // 타입 한글 변환
  const TYPE_LABELS = {
    text: '텍스트',
    image: '이미지',
    video: '비디오',
    audio: '오디오',
    vector: '벡터',
    coordinates: '좌표'
  };

  // 나노바나나 스타일 아이콘 경로 (4배 크기 56px)
  const TYPE_ICON_PATHS = {
    text: '/images/ai-icons/types/type-text.svg',
    image: '/images/ai-icons/types/type-image.svg',
    video: '/images/ai-icons/types/type-video.svg',
    audio: '/images/ai-icons/types/type-audio.svg',
    vector: '/images/ai-icons/types/type-vector.svg',
    coordinates: '/images/ai-icons/types/type-coordinates.svg'
  };

  // AI 서비스 공식 아이콘 경로
  const AI_SERVICE_ICON_PATHS = {
    gpt: '/images/ai-icons/gpt-icon.png',
    grok: '/images/ai-icons/grok-icon.png',
    claude: '/images/ai-icons/claude-icon.png',
    gemini: '/images/ai-icons/gemini-icon.png',
    local: '/images/ai-icons/local-icon.png'
  };

  /**
   * AI 서비스 아이콘 업데이트
   * @param {string} service - 서비스명
   */
  function updateAIServiceIcon(service) {
    const iconElement = document.getElementById('aiServiceIcon');
    if (iconElement && AI_SERVICE_ICON_PATHS[service]) {
      iconElement.src = AI_SERVICE_ICON_PATHS[service];
      iconElement.alt = service.toUpperCase();
    }
  }

  /**
   * 타입 배열을 나노바나나 아이콘 HTML로 변환
   * @param {string[]} types - 타입 배열
   * @returns {string} 아이콘 HTML
   */
  function renderTypeIcons(types) {
    if (!types || !Array.isArray(types) || types.length === 0) {
      return '<img src="/images/ai-icons/types/type-text.svg" class="type-icon" alt="텍스트" title="텍스트">';
    }
    return types.map(type => {
      const iconPath = TYPE_ICON_PATHS[type] || TYPE_ICON_PATHS.text;
      const label = TYPE_LABELS[type] || type;
      return `<img src="${iconPath}" class="type-icon" alt="${label}" title="${label}">`;
    }).join('');
  }

  // Fallback: 서버 미응답 시 사용할 기본 capabilities
  const FALLBACK_CAPABILITIES = {
    // ========== GPT 모델 ==========
    'gpt-5.2': {
      input: ['text', 'image'],
      output: ['text'],
      description: '최신 프론티어 모델 (400K ctx)'
    },
    'gpt-5.2-pro': {
      input: ['text', 'image'],
      output: ['text'],
      description: '최고 정확도 버전 (400K ctx)'
    },
    'gpt-5.1': {
      input: ['text', 'image'],
      output: ['text'],
      description: '코딩/에이전트 특화 (128K ctx)'
    },
    'gpt-5.1-codex': {
      input: ['text'],
      output: ['text'],
      description: '코딩 특화 모델 (400K ctx)'
    },
    'gpt-5': {
      input: ['text', 'image'],
      output: ['text'],
      description: 'GPT-5 기본 모델 (400K ctx)'
    },
    'gpt-5-mini': {
      input: ['text', 'image'],
      output: ['text'],
      description: '비용 효율적 (400K ctx)'
    },
    'gpt-5-nano': {
      input: ['text'],
      output: ['text'],
      description: '초고속 저지연 (400K ctx)'
    },
    'o3-pro': {
      input: ['text'],
      output: ['text'],
      description: '고강도 추론 (200K ctx)'
    },
    'o4-mini': {
      input: ['text'],
      output: ['text'],
      description: '빠른 추론 (200K ctx)'
    },
    'gpt-4o': {
      input: ['text', 'image', 'audio'],
      output: ['text'],
      description: '멀티모달 (128K ctx)'
    },
    'gpt-4o-mini': {
      input: ['text', 'image'],
      output: ['text'],
      description: '경량 멀티모달 (128K ctx)'
    },

    // ========== Grok 모델 ==========
    'grok-2': {
      input: ['text'],
      output: ['text'],
      description: 'Grok 2 기본 모델'
    },
    'grok-2-vision': {
      input: ['text', 'image'],
      output: ['text'],
      description: '비전 지원 모델'
    },

    // ========== Claude 모델 ==========
    'claude-sonnet-4-5-20250929': {
      input: ['text', 'image'],
      output: ['text'],
      description: 'Claude 4.5 Sonnet (200K ctx)'
    },
    'claude-opus-4-5-20251101': {
      input: ['text', 'image'],
      output: ['text'],
      description: 'Claude 4.5 Opus 최고성능'
    },
    'claude-haiku-4-5-20251001': {
      input: ['text', 'image'],
      output: ['text'],
      description: 'Claude 4.5 Haiku 초고속'
    },

    // ========== Gemini 모델 ==========
    'gemini-3-flash-preview': {
      input: ['text', 'image', 'video', 'audio'],
      output: ['text'],
      description: '최신 멀티모달, 빠른 응답'
    },
    'gemini-3-pro-preview': {
      input: ['text', 'image', 'video', 'audio'],
      output: ['text'],
      description: '고성능 추론, 복잡한 작업'
    },
    'gemini-2.5-flash': {
      input: ['text', 'image', 'video', 'audio'],
      output: ['text'],
      description: '안정적 범용 모델'
    },
    'gemini-2.5-pro': {
      input: ['text', 'image', 'video', 'audio'],
      output: ['text'],
      description: '고성능 Pro 모델'
    },
    'gemini-2.5-flash-lite': {
      input: ['text', 'image'],
      output: ['text'],
      description: '경량, 최저비용'
    },
    'gemini-2.0-flash': {
      input: ['text', 'image', 'video', 'audio'],
      output: ['text'],
      description: '레거시 안정 버전'
    },
    // 이미지 생성
    'gemini-2.5-flash-image': {
      input: ['text', 'image'],
      output: ['text', 'image'],
      description: 'Nano Banana, 빠른 이미지 생성'
    },
    'gemini-3-pro-image-preview': {
      input: ['text', 'image'],
      output: ['text', 'image'],
      description: 'Nano Banana Pro, 4K 고품질'
    },
    'imagen-4.0-fast-generate-001': {
      input: ['text'],
      output: ['image'],
      description: 'Imagen 4 Fast'
    },
    'imagen-4.0-generate-001': {
      input: ['text'],
      output: ['image'],
      description: 'Imagen 4 고품질'
    },
    // 비디오 생성
    'veo-3.1-fast-generate-preview': {
      input: ['text', 'image'],
      output: ['video'],
      description: 'Veo 3.1 Fast, 빠른 비디오'
    },
    'veo-3.1-generate-preview': {
      input: ['text', 'image'],
      output: ['video'],
      description: 'Veo 3.1 고품질 비디오'
    },
    // 오디오/음성
    'lyria-realtime-exp': {
      input: ['text'],
      output: ['audio'],
      description: '실시간 음악 생성'
    },
    'gemini-2.5-flash-native-audio-dialog': {
      input: ['text', 'audio'],
      output: ['text', 'audio'],
      description: 'Live API 양방향 대화'
    },
    'gemini-2.5-flash-tts': {
      input: ['text'],
      output: ['audio'],
      description: 'TTS 음성 합성'
    },
    // 임베딩
    'gemini-embedding-001': {
      input: ['text'],
      output: ['vector'],
      description: '텍스트 벡터화'
    },
    // 로보틱스
    'gemini-robotics-er-1.5-preview': {
      input: ['text', 'image', 'video'],
      output: ['text', 'coordinates'],
      description: '객체 추적, 경로 계획'
    },
    // Gemma
    'gemma-3-1b': {
      input: ['text'],
      output: ['text'],
      description: '1B 초경량 오픈소스'
    },
    'gemma-3-4b': {
      input: ['text'],
      output: ['text'],
      description: '4B 경량 오픈소스'
    },
    'gemma-3-12b': {
      input: ['text'],
      output: ['text'],
      description: '12B 중형 오픈소스'
    },
    'gemma-3-27b': {
      input: ['text'],
      output: ['text'],
      description: '27B 대형 오픈소스'
    }
  };

  // input/output 배열에서 inputIcons/outputIcons 자동 생성 (SVG 아이콘)
  for (const caps of Object.values(FALLBACK_CAPABILITIES)) {
    caps.inputIcons = renderTypeIcons(caps.input);
    caps.outputIcons = renderTypeIcons(caps.output);
  }

  // Fallback을 기본값으로 설정
  MODEL_CAPABILITIES = { ...FALLBACK_CAPABILITIES };

  // ============================================
  // API 키 관련 함수
  // ============================================

  /**
   * Settings 페이지에서 저장한 API 키 불러오기
   * @returns {Object} 서비스별 API 키 객체
   */
  function loadApiKeysFromSettings() {
    try {
      const keys = JSON.parse(localStorage.getItem('mymind3_api_keys') || '{}');
      return {
        gpt: keys.gpt || '',
        grok: keys.grok || '',
        claude: keys.claude || '',
        gemini: keys.gemini || '',
        local: 'no-key-required'
      };
    } catch (error) {
      console.error('[API Keys] Failed to load from settings:', error);
      return {
        gpt: '',
        grok: '',
        claude: '',
        gemini: '',
        local: 'no-key-required'
      };
    }
  }

  /**
   * localStorage에서 AI 설정 로드
   * @returns {Object} { service, model }
   */
  function loadAISettingsFromStorage() {
    try {
      const saved = localStorage.getItem('mymind3_ai_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        const defaultService = settings.defaultService || 'gpt';
        const defaultModel = settings.services?.[defaultService]?.model || 'gpt-5-mini';
        return { service: defaultService, model: defaultModel };
      }
    } catch (e) {
      console.warn('[AI Settings] Failed to load from localStorage:', e);
    }
    return { service: 'gpt', model: 'gpt-5-mini' };
  }

  /**
   * 로컬 API 키 헬스 체크
   * 저장된 API 키들의 유효성을 서버를 통해 검증
   * @returns {Promise<{valid: string[], invalid: Object[]}>}
   */
  async function verifyLocalApiKeys() {
    const apiKeys = loadApiKeysFromSettings();
    const results = { valid: [], invalid: [] };
    const servicesToCheck = [];

    // 검증할 서비스 목록 (키가 있는 것만)
    for (const [service, key] of Object.entries(apiKeys)) {
      if (key && key !== 'no-key-required' && service !== 'local') {
        servicesToCheck.push({ service, key });
      }
    }

    if (servicesToCheck.length === 0) {
      console.log('[API Keys] 검증할 로컬 API 키가 없습니다.');
      return results;
    }

    console.log('[API Keys] 로컬 API 키 검증 시작:', servicesToCheck.map(s => s.service));

    // 병렬로 검증
    const verifyPromises = servicesToCheck.map(async ({ service, key }) => {
      try {
        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};

        const response = await fetch('/api/ai/verify-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include',
          body: JSON.stringify({ service, apiKey: key })
        });

        const data = await response.json();

        if (data.success && data.valid) {
          results.valid.push(service);
          console.log(`[API Keys] ${service.toUpperCase()} API 키 유효`);
        } else {
          results.invalid.push({ service, message: data.message || '유효하지 않은 키' });
          console.warn(`[API Keys] ${service.toUpperCase()} API 키 무효:`, data.message);
        }
      } catch (error) {
        console.error(`[API Keys] ${service.toUpperCase()} 검증 실패:`, error);
        results.invalid.push({ service, message: error.message });
      }
    });

    await Promise.all(verifyPromises);

    // 무효한 키가 있으면 알림
    if (results.invalid.length > 0) {
      const messages = results.invalid.map(i => `• ${i.service.toUpperCase()}: ${i.message}`).join('\n');

      // 알럿 표시
      setTimeout(() => {
        alert(
          (window.i18n?.alertInvalidApiKeys || '일부 API 키가 유효하지 않습니다.') +
          `\n\n${messages}\n\n` +
          (window.i18n?.alertInvalidApiKeysHint || 'Settings에서 API 키를 확인해주세요.')
        );
      }, 1000);
    }

    return results;
  }

  // ============================================
  // 모델 로딩 함수
  // ============================================

  /**
   * 서버에서 모델 목록 로딩 (DB의 활성화된 모델만 반환)
   * @returns {Promise<boolean>} 로딩 성공 여부
   */
  async function loadModelsFromServer() {
    try {
      console.log('[Models] Loading models from server...');
      // ApiCache 사용 (중복 호출 방지)
      const response = window.ApiCache
        ? await window.ApiCache.fetch('/api/credits/models')
        : await fetch('/api/credits/models');
      if (!response.ok) throw new Error('Failed to fetch models');

      const data = await response.json();
      if (data.success && data.data && data.data.models) {
        const serverModels = data.data.models;
        AI_MODELS = {};

        // 서버 응답을 AI_MODELS 형식으로 변환
        Object.keys(serverModels).forEach(service => {
          AI_MODELS[service] = serverModels[service].map(model => ({
            value: model.model,
            label: model.displayName,
            default: model.isDefault
          }));
        });

        // 활성화된 서비스 목록 업데이트
        if (data.data.enabledServices && data.data.enabledServices.length > 0) {
          ENABLED_SERVICES = data.data.enabledServices;
          console.log('[Models] Enabled services:', ENABLED_SERVICES);

          // 서비스 선택 콤보박스 필터링
          filterServiceSelect();
        } else {
          console.warn('[Models] No enabled services from server');
          ENABLED_SERVICES = Object.keys(AI_MODELS);
        }

        modelsLoaded = true;
        console.log('[Models] Loaded from server:', Object.keys(AI_MODELS), 'Total models:', data.data.count);

        return true;
      }
    } catch (error) {
      console.error('[Models] Failed to load from server:', error.message);
      modelsLoaded = true; // 로딩 시도 완료 플래그 설정
    }
    return false;
  }

  /**
   * 서비스 선택 콤보박스에서 비활성화된 서비스 숨기기
   */
  function filterServiceSelect() {
    const aiServiceSelect = document.getElementById('aiServiceSelect');
    if (!aiServiceSelect) return;

    const options = aiServiceSelect.querySelectorAll('option');
    let firstEnabledService = null;

    options.forEach(option => {
      const isEnabled = ENABLED_SERVICES.includes(option.value);
      option.style.display = isEnabled ? '' : 'none';
      option.disabled = !isEnabled;

      if (isEnabled && !firstEnabledService) {
        firstEnabledService = option.value;
      }
    });

    // 현재 선택된 서비스가 비활성화된 경우, 첫 번째 활성화된 서비스로 변경
    if (!ENABLED_SERVICES.includes(aiServiceSelect.value)) {
      if (firstEnabledService) {
        aiServiceSelect.value = firstEnabledService;
        if (window.MyMindAI) {
          window.MyMindAI.currentService = firstEnabledService;
        }
        updateModelOptions(firstEnabledService);
        console.log('[Models] Switched to enabled service:', firstEnabledService);
      }
    }
  }

  /**
   * 서버에서 AI 모델 capabilities 로드
   */
  async function loadModelCapabilities() {
    try {
      // ApiCache 사용 (중복 호출 방지)
      const response = window.ApiCache
        ? await window.ApiCache.fetch('/api/ai/capabilities')
        : await fetch('/api/ai/capabilities');
      const result = await response.json();
      if (result.success && result.data) {
        // 서비스별 데이터를 flat 구조로 변환
        const flatCaps = {};
        for (const [service, models] of Object.entries(result.data)) {
          for (const [modelName, caps] of Object.entries(models)) {
            flatCaps[modelName] = caps;
          }
        }
        MODEL_CAPABILITIES = flatCaps;
        MODEL_CAPABILITIES_LOADED = true;
        console.log('[ModelCapabilities] 서버에서 로드 완료:', Object.keys(flatCaps).length, '개 모델');

        // 현재 선택된 모델의 capabilities UI 업데이트 (비동기 로드 완료 후)
        const currentService = window.MyMindAI?.currentService;
        const currentModel = window.MyMindAI?.currentModel;
        if (currentService && currentModel) {
          updateModelCapabilitiesUI(currentService, currentModel);
          console.log('[ModelCapabilities] UI 업데이트:', currentService, currentModel);
        }
      }
    } catch (error) {
      console.warn('[ModelCapabilities] 서버 로드 실패, fallback 사용:', error.message);
    }
  }

  // ============================================
  // UI 업데이트 함수
  // ============================================

  /**
   * 타입 배열을 한글 텍스트로 변환
   * @param {string[]} types - 타입 배열
   * @returns {string} 한글 텍스트
   */
  function getTypeText(types) {
    return types.map(t => TYPE_LABELS[t] || t).join(', ');
  }

  /**
   * 모델 기능 정보 UI 업데이트 (나노바나나 아이콘 버전)
   * @param {string} service - 서비스명
   * @param {string} modelValue - 모델명
   */
  function updateModelCapabilitiesUI(service, modelValue) {
    const capabilitiesBar = document.getElementById('modelCapabilitiesBar');
    const inputIcons = document.getElementById('modelInputIcons');
    const outputIcons = document.getElementById('modelOutputIcons');
    const description = document.getElementById('modelDescription');

    if (!capabilitiesBar) return;

    // 통합 MODEL_CAPABILITIES에서 조회
    const capabilities = MODEL_CAPABILITIES[modelValue];
    if (capabilities) {
      // 나노바나나 스타일 아이콘으로 렌더링 (innerHTML 사용)
      inputIcons.innerHTML = renderTypeIcons(capabilities.input);
      outputIcons.innerHTML = renderTypeIcons(capabilities.output);
      description.textContent = capabilities.description;
      // 마우스 호버 시 전체 툴팁 표시
      inputIcons.title = '입력 가능: ' + getTypeText(capabilities.input);
      outputIcons.title = '출력 가능: ' + getTypeText(capabilities.output);
      capabilitiesBar.style.display = 'block';
    } else {
      // 정의되지 않은 모델이면 기본값 (텍스트만) 표시
      inputIcons.innerHTML = renderTypeIcons(['text']);
      outputIcons.innerHTML = renderTypeIcons(['text']);
      inputIcons.title = '입력 가능: 텍스트';
      outputIcons.title = '출력 가능: 텍스트';
      description.textContent = '';
      capabilitiesBar.style.display = 'block';
    }
  }

  /**
   * AI 설정 동기화 함수 (응답 패널 → AI 설정)
   * @param {string} service - 서비스명
   * @param {string} model - 모델명
   */
  function syncToAISettings(service, model) {
    try {
      const savedSettings = localStorage.getItem('mymind3_ai_settings');
      const aiSettings = savedSettings ? JSON.parse(savedSettings) : {
        defaultService: 'gpt',
        multiAiEnabled: false,
        services: {}
      };

      // 기본 AI 서비스 업데이트
      aiSettings.defaultService = service;

      // 해당 서비스의 모델 업데이트
      if (!aiSettings.services) {
        aiSettings.services = {};
      }
      if (!aiSettings.services[service]) {
        aiSettings.services[service] = { enabled: true, model: model, paymentMethod: 'apikey' };
      } else {
        aiSettings.services[service].model = model;
      }

      localStorage.setItem('mymind3_ai_settings', JSON.stringify(aiSettings));
      console.log('[AI Sync] 설정 동기화 완료:', { service, model });

      // 탭바 즉시 업데이트
      if (typeof window.updateAITabsForMode === 'function') {
        window.updateAITabsForMode();
      }
    } catch (e) {
      console.warn('[AI Sync] 설정 동기화 실패:', e);
    }
  }

  /**
   * 모델 목록 업데이트
   * @param {string} service - 서비스명
   * @param {boolean} skipSave - 저장 스킵 여부
   */
  function updateModelOptions(service, skipSave = false) {
    const gptModelSelect = document.getElementById('gptModelSelect');
    if (!gptModelSelect) return;

    const models = AI_MODELS[service] || [];
    gptModelSelect.innerHTML = '';

    // 모델이 없으면 로딩 중 또는 없음 표시
    if (!models || models.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.disabled = true;
      option.selected = true;
      option.textContent = modelsLoaded ? '사용 가능한 모델 없음' : '모델 로딩중...';
      gptModelSelect.appendChild(option);
      console.log(`[Models] No models available for ${service}`);
      return;
    }

    // 현재 저장된 모델이 있는지 확인
    const savedModel = window.MyMindAI?.currentModel;
    const savedModelExists = savedModel && models.some(m => m.value === savedModel);
    let defaultModelValue = null;

    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.value;
      option.textContent = model.label;
      if (model.default) {
        defaultModelValue = model.value;
      }
      gptModelSelect.appendChild(option);
    });

    // 모델 선택 우선순위: 1. 저장된 모델(있으면), 2. default 모델, 3. 첫 번째 모델
    if (savedModelExists) {
      gptModelSelect.value = savedModel;
      console.log(`[Models] Keeping saved model: ${savedModel}`);
    } else if (defaultModelValue) {
      gptModelSelect.value = defaultModelValue;
      if (window.MyMindAI) {
        window.MyMindAI.currentModel = defaultModelValue;
      }
    } else if (models.length > 0) {
      gptModelSelect.value = models[0].value;
      if (window.MyMindAI) {
        window.MyMindAI.currentModel = models[0].value;
      }
    }

    console.log(`[Models] Updated models for ${service}:`, models.length, 'models');

    // 모델 기능 정보 UI 업데이트 (현재 선택된 모델 기준)
    const selectedModel = gptModelSelect.value || (models[0] && models[0].value);
    updateModelCapabilitiesUI(service, selectedModel);

    // Save preferences after updating model options (unless skipping)
    if (!skipSave) {
      saveUserPreferences();
      // AI 설정 동기화
      syncToAISettings(service, selectedModel);
    }
  }

  // ============================================
  // 사용자 설정 저장 함수
  // ============================================

  /**
   * Save user preferences to database
   */
  async function saveUserPreferences() {
    try {
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({
          aiService: window.MyMindAI?.currentService,
          aiModel: window.MyMindAI?.currentModel
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log('[Preferences] Saved:', result.preferences);
      } else {
        console.warn('[Preferences] Save failed:', result.error);
      }
    } catch (error) {
      console.error('[Preferences] Error saving:', error);
    }
  }

  // ============================================
  // MyMindAI 전역 객체 초기화
  // ============================================

  /**
   * MyMindAI 전역 객체 초기화 함수
   * @returns {Object} MyMindAI 객체
   */
  function initializeMyMindAI() {
    const initialAISettings = loadAISettingsFromStorage();

    // Global AI state with multi-service API key support
    const myMindAI = {
      apiKeys: loadApiKeysFromSettings(),
      currentService: initialAISettings.service,
      currentModel: initialAISettings.model,
      isProcessing: false,
      abortController: null,
      streamReader: null,
      multiSelectMode: false,
      defaultAIService: initialAISettings.service,
      activeTab: initialAISettings.service,
      attachedImage: null, // 첨부된 이미지 데이터 { base64, mimeType, fileName }
      getCurrentApiKey() {
        return this.apiKeys[this.currentService] || '';
      },
      // API 키 다시 불러오기 (Settings 변경 후 호출)
      reloadApiKeys() {
        this.apiKeys = loadApiKeysFromSettings();
        console.log('[API Keys] Reloaded from settings');
      },
      // 첨부 이미지 클리어
      clearAttachedImage() {
        this.attachedImage = null;
        const previewArea = document.getElementById('imagePreviewArea');
        const attachBtn = document.getElementById('imageAttachBtn');
        const fileInput = document.getElementById('imageAttachInput');
        if (previewArea) previewArea.style.display = 'none';
        if (attachBtn) attachBtn.classList.remove('has-image');
        if (fileInput) fileInput.value = '';
      }
    };

    return myMindAI;
  }

  // ============================================
  // Getter 함수들 (외부에서 상태 조회용)
  // ============================================

  function getAIModels() {
    return AI_MODELS;
  }

  function getEnabledServices() {
    return ENABLED_SERVICES;
  }

  function isModelsLoaded() {
    return modelsLoaded;
  }

  function getModelCapabilities() {
    return MODEL_CAPABILITIES;
  }

  function isModelCapabilitiesLoaded() {
    return MODEL_CAPABILITIES_LOADED;
  }

  function getTypeLabels() {
    return TYPE_LABELS;
  }

  function getFallbackCapabilities() {
    return FALLBACK_CAPABILITIES;
  }

  // ============================================
  // 전역 노출 (window 객체에 등록)
  // ============================================

  // AICore 네임스페이스로 묶어서 노출
  window.AICore = {
    // 상태 조회
    getAIModels,
    getEnabledServices,
    isModelsLoaded,
    getModelCapabilities,
    isModelCapabilitiesLoaded,
    getTypeLabels,
    getFallbackCapabilities,

    // API 키 관련
    loadApiKeysFromSettings,
    loadAISettingsFromStorage,
    verifyLocalApiKeys,

    // 모델 로딩
    loadModelsFromServer,
    loadModelCapabilities,
    filterServiceSelect,

    // UI 업데이트
    getTypeText,
    updateModelCapabilitiesUI,
    updateAIServiceIcon,
    syncToAISettings,
    updateModelOptions,

    // 사용자 설정
    saveUserPreferences,

    // MyMindAI 초기화
    initializeMyMindAI
  };

  // 개별 함수들도 전역 노출 (기존 코드 호환성)
  window.loadModelsFromServer = loadModelsFromServer;
  window.loadModelCapabilities = loadModelCapabilities;
  window.filterServiceSelect = filterServiceSelect;
  window.updateModelCapabilitiesUI = updateModelCapabilitiesUI;
  window.updateAIServiceIcon = updateAIServiceIcon;
  window.syncToAISettings = syncToAISettings;
  window.updateModelOptions = updateModelOptions;
  window.saveUserPreferences = saveUserPreferences;
  window.verifyLocalApiKeys = verifyLocalApiKeys;
  window.initializeMyMindAI = initializeMyMindAI;

  console.log('[AICore] AI 코어 모듈 로드 완료');
})();
