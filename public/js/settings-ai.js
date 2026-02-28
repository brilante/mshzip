// =====================================================
// AI 설정 페이지 로직
// =====================================================
(function() {
  'use strict';

  // i18n 숫자/날짜 포맷 헬퍼
  function _fmtN(n, opts) { const i = window.MyMind3?.Intl; return i ? i.formatNumber(n, opts) : Number(n).toLocaleString(); }
  function _fmtD(d, opts) { const i = window.MyMind3?.Intl; return i ? i.formatDate(d, opts) : new Date(d).toLocaleString(); }

  // AI 서비스 목록
  const AI_SERVICES = ['gpt', 'grok', 'claude', 'gemini', 'local'];

  // 노드재구성에서 사용하는 서비스 (local 제외)
  const TREE_GEN_SERVICES = ['gpt', 'grok', 'claude', 'gemini'];

  // 서비스별 라벨 (콤보박스 동적 생성용)
  const SERVICE_LABELS = {
    gpt: { short: 'GPT', full: 'GPT (OpenAI)' },
    grok: { short: 'Grok', full: 'Grok (xAI)' },
    claude: { short: 'Claude', full: 'Claude (Anthropic)' },
    gemini: { short: 'Gemini', full: 'Gemini (Google)' },
    local: { short: 'Local AI', full: 'Local AI (LM Studio)' }
  };

  // 로컬 스토리지 키
  const STORAGE_KEYS = {
    AI_SETTINGS: 'mymind3_ai_settings',
    API_KEYS: 'mymind3_api_keys'  // API 키는 별도 저장 (보안)
  };

  // 기본 AI 설정 (2025년 12월 기준)
  const DEFAULT_AI_SETTINGS = {
    defaultService: 'gpt',  // 기본 AI 서비스
    multiAiEnabled: false,
    paymentCurrency: 'USD',
    // 주 AI (Primary AI) - 분석/판단/평가용
    treeGenService: 'gpt',  // 새노드 만들기 주 AI 서비스
    treeGenModel: 'gpt-4o-mini',  // 새노드 만들기 주 AI 모델
    // 보조 AI (Secondary AI) - 콘텐츠 생성용 (v3)
    treeGenSecondaryService: 'gpt',  // 새노드 만들기 보조 AI 서비스
    treeGenSecondaryModel: 'gpt-4o-mini',  // 새노드 만들기 보조 AI 모델
    services: {
      gpt: { enabled: true, model: 'gpt-4o-mini', paymentMethod: 'apikey' },
      grok: { enabled: false, model: 'grok-2', paymentMethod: 'apikey' },
      claude: { enabled: false, model: 'claude-3-5-sonnet-20241022', paymentMethod: 'apikey' },
      gemini: { enabled: false, model: 'gemini-1.5-flash', paymentMethod: 'apikey' },
      local: { enabled: false, model: 'llama3-8b', paymentMethod: 'free' }
    }
  };

  // 새노드 만들기 AI 모델 목록 (서버에서 동적으로 업데이트됨)
  let TREE_GEN_MODELS = {
    gpt: [
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'o1', label: 'o1 (추론)' },
      { value: 'o1-mini', label: 'o1-mini (추론)' },
      { value: 'o1-preview', label: 'o1-preview (추론)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ],
    grok: [
      { value: 'grok-2', label: 'Grok-2' },
      { value: 'grok-2-latest', label: 'Grok-2 Latest' },
      { value: 'grok-2-1212', label: 'Grok-2 1212' },
      { value: 'grok-2-vision-1212', label: 'Grok-2 Vision' }
    ],
    claude: [
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
    ],
    gemini: [
      { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash' },
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' }
    ]
  };

  // 현재 AI 설정
  let currentAISettings = { ...DEFAULT_AI_SETTINGS };

  // DB에서 로드한 서비스별 모델값 보존 (초기화 경쟁 조건 방지)
  let _loadedServiceModels = {};

  // 초기화 중복 실행 방지 플래그
  let _aiInitInProgress = false;

  // 모델 목록 캐시
  let modelListCache = null;

  // 프리페치된 공유 데이터 (중복 API 호출 방지)
  let _prefetchedData = null;

  /**
   * 설정 페이지 진입 시 필요한 데이터를 병렬로 프리페치
   * models, balance, ai-services를 한 번에 로드
   */
  async function prefetchSettingsData() {
    if (_prefetchedData) return _prefetchedData;

    const fetcher = window.ApiCache ? window.ApiCache.fetch.bind(window.ApiCache) : fetch;
    const [modelsResp, balanceResp, servicesResp] = await Promise.allSettled([
      fetcher('/api/credits/models'),
      fetcher('/api/credits/balance'),
      fetcher('/api/credits/ai-services')
    ]);

    _prefetchedData = {
      models: modelsResp.status === 'fulfilled' && modelsResp.value.ok
        ? await modelsResp.value.json() : null,
      balance: balanceResp.status === 'fulfilled' && balanceResp.value.ok
        ? await balanceResp.value.json() : null,
      services: servicesResp.status === 'fulfilled' && servicesResp.value.ok
        ? await servicesResp.value.json() : null
    };

    return _prefetchedData;
  }

  /**
   * 이미지 생성 전용 모델인지 확인 (텍스트 생성 불가)
   * 노드재구성에서 이미지 전용 모델은 사용할 수 없음
   * @param {string} modelName - 모델명
   * @returns {boolean} 이미지 전용 모델 여부
   */
  function isImageOnlyModel(modelName) {
    if (!modelName) return false;
    const name = modelName.toLowerCase();
    // 이미지 생성 전용 모델 패턴
    return name.includes('image') ||  // gpt-image-*, gemini-*-image*, grok-*-image*
           name.startsWith('dall-e') ||  // dall-e-3
           name.startsWith('imagen');     // imagen-4
  }

  /**
   * 서버에서 AI 모델 목록을 로드하여 TREE_GEN_MODELS 업데이트 (v3)
   * response.ok 체크 및 에러 핸들링 강화
   */
  async function loadTreeGenModelsFromServer() {
    try {
      // ApiCache 사용 (중복 호출 방지)
      const response = window.ApiCache
        ? await window.ApiCache.fetch('/api/credits/models')
        : await fetch('/api/credits/models');

      // response.ok 체크 추가
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 모델 목록 로드 실패`);
      }

      const data = await response.json();

      if (data.success && data.data && data.data.models) {
        const modelsData = data.data.models;
        const serverModels = {};

        if (Array.isArray(modelsData)) {
          // 배열 형식: 모델을 서비스별로 그룹화
          for (const model of modelsData) {
            const service = model.ai_service;
            if (!serverModels[service]) {
              serverModels[service] = [];
            }
            serverModels[service].push({
              value: model.model_name,
              label: model.display_name || model.model_name
            });
          }
        } else if (typeof modelsData === 'object') {
          // 객체 형식 (서비스별 그룹화된 형태)
          for (const service of Object.keys(modelsData)) {
            if (!serverModels[service]) {
              serverModels[service] = [];
            }
            const serviceModels = modelsData[service];
            if (Array.isArray(serviceModels)) {
              for (const model of serviceModels) {
                serverModels[service].push({
                  // API 응답: model, displayName (camelCase)
                  value: model.model || model.value || model.model_name,
                  label: model.displayName || model.label || model.display_name || model.model
                });
              }
            }
          }
        }

        // 서버 모델로 TREE_GEN_MODELS 업데이트
        if (Object.keys(serverModels).length > 0) {
          TREE_GEN_MODELS = serverModels;
          console.log('[AI Settings] 서버에서 모델 목록 로드 완료:', Object.keys(serverModels));
        }
      }
    } catch (error) {
      console.warn('[AI Settings] 서버에서 모델 목록 로드 실패, 기본값 사용:', error.message);
    }
  }

  // API Key 검증 상태 (서비스별)
  const apiKeyVerified = {
    gpt: false,
    grok: false,
    claude: false,
    gemini: false,
    local: true  // Local AI는 API Key 불필요
  };

  // 사용자 크레딧 잔액
  let userCreditBalance = 0;

  // 서버 타임존 (서버에서 가져옴)
  let serverTimezone = null;

  /**
   * 결제 방식 자동 결정
   * API Key가 유효하면 apikey, 아니면 credit 사용
   * @param {string} service - AI 서비스 이름
   * @returns {string} - 'apikey' 또는 'credit'
   */
  function getPaymentMethod(service) {
    // API Key가 검증되어 있으면 apikey 사용
    if (apiKeyVerified[service]) {
      return 'apikey';
    }
    // API Key가 없거나 검증되지 않았으면 credit 사용
    return 'credit';
  }

  /**
   * 서비스 결제 방식 상태 업데이트
   * @param {string} service - AI 서비스 이름
   */
  function updatePaymentOptionState(service) {
    if (!currentAISettings.services[service]) {
      currentAISettings.services[service] = {};
    }
    // 결제 방식 자동 결정
    currentAISettings.services[service].paymentMethod = getPaymentMethod(service);
  }

  /**
   * 모든 서비스의 결제 옵션 상태 업데이트
   */
  function updateAllPaymentOptionStates() {
    ['gpt', 'grok', 'claude', 'gemini'].forEach(service => {
      updatePaymentOptionState(service);
    });
  }

  /**
   * 사용자 크레딧 잔액 로드
   * - 서버 API에서 먼저 시도
   * - 실패 시 localStorage (테스트 구독 데이터)에서 로드
   */
  async function loadUserCreditBalance() {
    let loadedFromServer = false;

    try {
      // ApiCache 사용 (중복 호출 방지)
      const response = window.ApiCache
        ? await window.ApiCache.fetch('/api/credits/balance')
        : await fetch('/api/credits/balance');
      if (response.ok) {
        const result = await response.json();
        // API 응답: { success, data: { credits: { total, free, service, paid } } }
        if (result.success && result.data && result.data.credits) {
          userCreditBalance = result.data.credits.total || 0;
          loadedFromServer = true;
          console.log('[AI Settings] 서버에서 크레딧 잔액 로드:', userCreditBalance);
        }
      }
    } catch (error) {
      console.warn('[AI Settings] 서버 크레딧 API 호출 실패:', error);
    }

    // 서버에서 로드 실패 시 localStorage (테스트 구독 데이터)에서 로드
    if (!loadedFromServer) {
      try {
        const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
        if (subscription.credits && subscription.credits.total > 0) {
          userCreditBalance = subscription.credits.total;
          console.log('[AI Settings] localStorage에서 크레딧 잔액 로드:', userCreditBalance);
        } else {
          userCreditBalance = 0;
        }
      } catch (e) {
        userCreditBalance = 0;
      }
    }

    updateAllPaymentOptionStates();
  }

  /**
   * AI 설정 초기화
   */
  async function initAISettings() {
    // 동시 초기화 방지 (삼중 호출 경쟁 조건 해결)
    if (_aiInitInProgress) {
      console.log('[AI Settings] 초기화 진행 중, 중복 호출 스킵');
      return;
    }
    _aiInitInProgress = true;

    try {
      // 저장된 설정 로드 (DB API 우선)
      await loadAISettings();

      // 모델 목록 로드
      await loadModelList();

      // UI에 설정 적용
      applyAISettingsToUI();

      // 이벤트 리스너 등록
      setupAIEventListeners();

      // 크레딧 잔액 로드
      loadCreditBalance();

      // 사용자 크레딧 잔액 로드 (결제 옵션 상태 업데이트용)
      await loadUserCreditBalance();

      // 사용량 통계 로드
      loadUsageStats();

      // Phase 6: 사용 내역 모달 이벤트 리스너 설정
      setupUsageHistoryModalListeners();

      // 초기 결제 옵션 상태 업데이트
      updateAllPaymentOptionStates();

      // DB에서 AI 서비스 상태 로드 및 버튼 이벤트 설정
      await loadAIServiceStatusFromDB();
      setupAIServiceStatusButtons();
    } finally {
      _aiInitInProgress = false;
    }
  }

  /**
   * DB에서 AI 서비스 활성화 상태 로드
   */
  async function loadAIServiceStatusFromDB() {
    try {
      // ApiCache 사용 (중복 호출 방지)
      const response = window.ApiCache
        ? await window.ApiCache.fetch('/api/credits/ai-services')
        : await fetch('/api/credits/ai-services');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.services) {
          const services = result.data.services;
          // 각 서비스별 상태 버튼 및 카드 상태 업데이트
          for (const [service, info] of Object.entries(services)) {
            updateServiceStatusButton(service, info.enabled);
            updateServiceCardState(service, info.enabled);
          }
          // 기본 AI 설정 콤보박스 옵션 업데이트
          updateDefaultServiceOptions();
          updateTreeGenServiceOptions();
          console.log('[AI Settings] DB에서 서비스 상태 로드:', services);
        }
      }
    } catch (error) {
      console.error('[AI Settings] DB 서비스 상태 로드 실패:', error);
    }
  }

  /**
   * 서비스 상태 버튼 UI 업데이트
   */
  function updateServiceStatusButton(service, enabled) {
    const btn = document.getElementById(`${service}StatusBtn`);
    if (btn) {
      btn.dataset.enabled = enabled ? 'true' : 'false';
      const statusText = btn.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = enabled ? t('statusEnabled', '사용') : t('statusDisabled', '미사용');
      }
    }
  }

  /**
   * AI 서비스 모델 콤보박스 업데이트
   * @param {string} service - AI 서비스 이름 (gpt, grok, claude, gemini, local)
   * @param {boolean} enabled - 사용 여부
   */
  async function updateServiceModelSelect(service, enabled) {
    const select = document.getElementById(`${service}Model`);
    if (!select) return;

    if (enabled) {
      // 사용: 모델 목록 채우기
      let serviceModels = [];

      // 먼저 캐시에서 찾기
      if (modelListCache) {
        serviceModels = modelListCache.filter(m => m.ai_service === service);
      }

      // 캐시에 없으면 서버에서 가져오기
      if (serviceModels.length === 0) {
        try {
          // ApiCache 사용 (중복 호출 방지)
          const response = window.ApiCache
            ? await window.ApiCache.fetch('/api/credits/models')
            : await fetch('/api/credits/models');
          if (response.ok) {
            const json = await response.json();
            if (json.success && json.data && json.data.models && json.data.models[service]) {
              // API 응답 필드명(camelCase)을 내부 필드명(snake_case)으로 변환
              serviceModels = json.data.models[service].map(m => ({
                ai_service: service,
                model_name: m.model || m.model_name,
                display_name: m.displayName || m.display_name,
                is_default: m.isDefault ? 1 : (m.is_default || 0),
                cost_per_1m_input: m.costInput || m.cost_per_1m_input,
                cost_per_1m_output: m.costOutput || m.cost_per_1m_output,
                credits_per_1m_input: m.creditsInput || m.credits_per_1m_input,
                credits_per_1m_output: m.creditsOutput || m.credits_per_1m_output
              }));
              // 캐시 업데이트
              if (!modelListCache) {
                modelListCache = [];
              }
              // 기존 서비스 모델 제거 후 새로 추가
              modelListCache = modelListCache.filter(m => m.ai_service !== service);
              modelListCache.push(...serviceModels);
            }
          }
        } catch (error) {
          console.error(`[AI Settings] ${service} 모델 로드 실패:`, error);
        }
      }

      select.innerHTML = '';
      serviceModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.model_name;
        option.textContent = model.display_name || model.model_name;
        if (model.is_default) option.selected = true;
        select.appendChild(option);
      });

      // 사용자 저장 모델 복원 (DB 로드값 우선, is_default보다 우선)
      const savedModel = _loadedServiceModels[service] || currentAISettings.services[service]?.model;
      if (savedModel) {
        const hasOption = Array.from(select.options).some(o => o.value === savedModel);
        if (hasOption) {
          select.value = savedModel;
          // currentAISettings도 동기화 (자동 저장 시 올바른 값 보장)
          if (currentAISettings.services[service]) {
            currentAISettings.services[service].model = savedModel;
          }
        }
      }

      autoResizeSelect(select);
    } else {
      // 미사용: 모델 목록 비우기
      select.innerHTML = '';
    }
    console.log(`[AI Settings] ${service} 모델 목록 ${enabled ? '채움' : '비움'}`);
  }

  /**
   * 서비스 활성화 여부 확인
   */
  function isServiceEnabled(service) {
    const statusBtn = document.getElementById(`${service}StatusBtn`);
    return statusBtn ? statusBtn.dataset.enabled === 'true' : true;
  }

  /**
   * 활성화된 서비스 목록 반환
   */
  function getEnabledServices(serviceList) {
    return (serviceList || AI_SERVICES).filter(isServiceEnabled);
  }

  /**
   * 기본 AI 서비스 콤보박스 옵션 업데이트 (활성화된 서비스만 표시)
   */
  function updateDefaultServiceOptions() {
    const select = document.getElementById('defaultAIService');
    if (!select) return;

    const currentValue = select.value;
    const enabledServices = getEnabledServices();

    select.innerHTML = '';

    // 활성 서비스 0개 엣지 케이스
    if (enabledServices.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = t('noEnabledService', '활성화된 AI 서비스 없음');
      option.disabled = true;
      option.selected = true;
      select.appendChild(option);
      return;
    }

    enabledServices.forEach(service => {
      const option = document.createElement('option');
      option.value = service;
      option.textContent = SERVICE_LABELS[service]?.full || service;
      select.appendChild(option);
    });

    // 이전 선택이 유효하면 유지, 아니면 첫 번째 활성 서비스로 변경
    if (enabledServices.includes(currentValue)) {
      select.value = currentValue;
    } else if (enabledServices.length > 0) {
      select.value = enabledServices[0];
      currentAISettings.defaultService = enabledServices[0];
      saveAISettings();
    }
  }

  /**
   * 서비스 콤보박스를 활성화된 서비스만으로 재구성하는 공통 함수
   * @param {HTMLElement} select - 대상 select 요소
   * @param {string[]} serviceList - 후보 서비스 목록
   * @param {string} labelType - 라벨 타입 ('short' 또는 'full')
   * @returns {{ currentValue: string, enabledServices: string[] }}
   */
  function rebuildServiceCombo(select, serviceList, labelType) {
    const currentValue = select.value;
    const enabledServices = getEnabledServices(serviceList);

    select.innerHTML = '';

    // 활성 서비스 0개 엣지 케이스
    if (enabledServices.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = t('noEnabledService', '활성화된 AI 서비스 없음');
      option.disabled = true;
      option.selected = true;
      select.appendChild(option);
      return { currentValue, enabledServices };
    }

    enabledServices.forEach(service => {
      const option = document.createElement('option');
      option.value = service;
      option.textContent = SERVICE_LABELS[service]?.[labelType] || service;
      select.appendChild(option);
    });

    return { currentValue, enabledServices };
  }

  /**
   * 새노드 만들기 AI 서비스 콤보박스 옵션 업데이트 (활성화된 서비스만 표시)
   * v3: 주AI, 보조AI 모두 처리
   */
  function updateTreeGenServiceOptions() {
    // 주 AI (Primary AI)
    const treeGenServiceSelect = document.getElementById('treeGenService');
    if (treeGenServiceSelect) {
      const { currentValue, enabledServices } = rebuildServiceCombo(treeGenServiceSelect, TREE_GEN_SERVICES, 'short');

      if (enabledServices.includes(currentValue)) {
        treeGenServiceSelect.value = currentValue;
      } else if (enabledServices.length > 0) {
        treeGenServiceSelect.value = enabledServices[0];
        currentAISettings.treeGenService = enabledServices[0];
        populateTreeGenModelSelect(enabledServices[0]);
        saveAISettings();
      }
    }

    // 보조 AI (Secondary AI) - v3 추가
    const secondaryServiceSelect = document.getElementById('treeGenSecondaryService');
    if (secondaryServiceSelect) {
      const { currentValue, enabledServices } = rebuildServiceCombo(secondaryServiceSelect, TREE_GEN_SERVICES, 'short');

      if (enabledServices.includes(currentValue)) {
        secondaryServiceSelect.value = currentValue;
      } else if (enabledServices.length > 0) {
        secondaryServiceSelect.value = enabledServices[0];
        currentAISettings.treeGenSecondaryService = enabledServices[0];
        const secondaryModelSelect = document.getElementById('treeGenSecondaryModel');
        populateTreeGenModelSelect(enabledServices[0], '', secondaryModelSelect);
        saveAISettings();
      }
    }
  }

  /**
   * AI 서비스 카드 내 설정 요소 활성화/비활성화
   * @param {string} service - AI 서비스 이름
   * @param {boolean} enabled - 사용 여부
   */
  function updateServiceCardState(service, enabled) {
    const card = document.querySelector(`.ai-service-card[data-service="${service}"]`);
    if (!card) return;

    // 다중 사용 토글 스위치 (오른쪽 상단)
    const multiToggle = document.getElementById(`${service}Enabled`);
    if (multiToggle) {
      multiToggle.disabled = !enabled;
      // 미사용으로 변경 시 다중 선택도 자동으로 해제
      if (!enabled && multiToggle.checked) {
        multiToggle.checked = false;
        // 변경 이벤트 발생시켜서 다른 로직도 동기화
        multiToggle.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const toggleSwitch = multiToggle.closest('.toggle-switch');
      if (toggleSwitch) {
        toggleSwitch.style.opacity = enabled ? '1' : '0.5';
        toggleSwitch.style.pointerEvents = enabled ? 'auto' : 'none';
      }
    }

    // API KEY / URL 입력란
    const apiKeyInput = card.querySelector('input[type="text"], input[type="password"]');
    if (apiKeyInput) {
      apiKeyInput.disabled = !enabled;
      apiKeyInput.style.opacity = enabled ? '1' : '0.5';
    }

    // API Key 검증 / 연결 테스트 버튼
    const verifyBtn = card.querySelector('.btn-verify-key');
    if (verifyBtn) {
      verifyBtn.disabled = !enabled;
      verifyBtn.style.opacity = enabled ? '1' : '0.5';
    }

    // 기본 모델 콤보박스
    const modelSelect = document.getElementById(`${service}Model`);
    if (modelSelect) {
      modelSelect.disabled = !enabled;
      modelSelect.style.opacity = enabled ? '1' : '0.5';
    }

    // 카드 전체 스타일
    card.style.opacity = enabled ? '1' : '0.7';
  }

  /**
   * AI 서비스 상태 버튼 이벤트 리스너 설정
   */
  function setupAIServiceStatusButtons() {
    const statusButtons = document.querySelectorAll('.ai-service-status-btn');
    statusButtons.forEach(btn => {
      btn.addEventListener('click', async function() {
        const service = this.dataset.service;
        const currentEnabled = this.dataset.enabled === 'true';
        const newEnabled = !currentEnabled;

        // 버튼 비활성화 (중복 클릭 방지)
        this.disabled = true;
        this.style.opacity = '0.6';

        try {
          const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
          const response = await fetch(`/api/credits/ai-services/${service}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...csrfHeaders
            },
            credentials: 'include',
            body: JSON.stringify({ enabled: newEnabled })
          });

          const result = await response.json();

          if (result.success) {
            // UI 업데이트
            updateServiceStatusButton(service, newEnabled);
            // 모델 콤보박스 업데이트
            await updateServiceModelSelect(service, newEnabled);
            // 서비스 카드 상태 업데이트
            updateServiceCardState(service, newEnabled);
            // 기본 AI 설정 콤보박스 업데이트
            updateDefaultServiceOptions();
            updateTreeGenServiceOptions();
            console.log(`[AI Settings] ${service} 서비스 상태 변경: ${newEnabled ? '사용' : '미사용'}`);
          } else {
            // 에러 메시지 표시
            alert(result.error || result.message || t('aiStatusChangeFailed', '상태 변경 실패'));
          }
        } catch (error) {
          console.error('[AI Settings] 서비스 상태 변경 실패:', error);
          alert(t('aiStatusChangeError', '서비스 상태 변경 중 오류가 발생했습니다.'));
        } finally {
          // 버튼 다시 활성화
          this.disabled = false;
          this.style.opacity = '1';
        }
      });
    });
  }

  /**
   * 저장된 AI 설정 로드 (DB API 우선, localStorage 폴백)
   * 사용자가 설정 페이지 열 때 1회 호출되어 DB에서 AI Settings 로드
   */
  async function loadAISettings() {
    try {
      // 1. localStorage에서 기본 설정 로드 (폴백용)
      const saved = localStorage.getItem(STORAGE_KEYS.AI_SETTINGS);
      if (saved) {
        currentAISettings = { ...DEFAULT_AI_SETTINGS, ...JSON.parse(saved) };
      } else {
        currentAISettings = { ...DEFAULT_AI_SETTINGS };
      }

      // 2. API에서 AI Settings 로드
      try {
        const response = await fetch('/api/user/settings', {
          credentials: 'include'
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // AI Settings를 API 결과로 덮어쓰기
            if (result.data.defaultService) {
              currentAISettings.defaultService = result.data.defaultService;
            }
            if (result.data.multiAiEnabled !== undefined) {
              currentAISettings.multiAiEnabled = result.data.multiAiEnabled === 'true' || result.data.multiAiEnabled === true;
            }
            if (result.data.paymentCurrency) {
              currentAISettings.paymentCurrency = result.data.paymentCurrency;
            }
            if (result.data.treeGenService) {
              currentAISettings.treeGenService = result.data.treeGenService;
            }
            if (result.data.treeGenModel) {
              currentAISettings.treeGenModel = result.data.treeGenModel;
            }
            if (result.data.treeGenSecondaryService) {
              currentAISettings.treeGenSecondaryService = result.data.treeGenSecondaryService;
            }
            if (result.data.treeGenSecondaryModel) {
              currentAISettings.treeGenSecondaryModel = result.data.treeGenSecondaryModel;
            }
            // services (aiServices) - JSON 문자열로 저장된 경우 파싱
            if (result.data.aiServices) {
              try {
                const services = typeof result.data.aiServices === 'string'
                  ? JSON.parse(result.data.aiServices)
                  : result.data.aiServices;
                currentAISettings.services = { ...DEFAULT_AI_SETTINGS.services, ...services };
              } catch (e) {
                console.warn('[AI Settings] aiServices 파싱 실패:', e);
              }
            }
            // DB에서 로드한 서비스별 모델값 보존 (초기화 경쟁 조건 방지)
            _loadedServiceModels = {};
            for (const [svc, info] of Object.entries(currentAISettings.services)) {
              if (info && info.model) {
                _loadedServiceModels[svc] = info.model;
              }
            }

            console.log('[AI Settings] DB에서 설정 로드 완료 (source=' + result.source + ')');

            // localStorage 동기화 (오프라인 폴백용)
            localStorage.setItem(STORAGE_KEYS.AI_SETTINGS, JSON.stringify(currentAISettings));
          }
        }
      } catch (apiError) {
        console.warn('[AI Settings] API 로드 실패, localStorage 사용:', apiError);
      }
    } catch (error) {
      console.error('AI 설정 로드 실패:', error);
      currentAISettings = { ...DEFAULT_AI_SETTINGS };
    }
  }

  /**
   * AI 설정 저장 (localStorage + DB API)
   * 사용자가 설정 변경 시 즉시 서버 API를 통해 DB에 반영
   */
  async function saveAISettings() {
    try {
      // 초기화 중에는 DB 로드값으로 서비스 모델 복원 (경쟁 조건 방지)
      if (_aiInitInProgress && Object.keys(_loadedServiceModels).length > 0) {
        for (const [svc, model] of Object.entries(_loadedServiceModels)) {
          if (currentAISettings.services[svc] && currentAISettings.services[svc].model !== model) {
            console.log(`[AI Settings] 초기화 중 모델 복원: ${svc} ${currentAISettings.services[svc].model} → ${model}`);
            currentAISettings.services[svc].model = model;
          }
        }
      }

      // localStorage에 저장 (오프라인 폴백용)
      localStorage.setItem(STORAGE_KEYS.AI_SETTINGS, JSON.stringify(currentAISettings));

      // DB에 저장 (API 호출)
      try {
        const body = {
          defaultService: currentAISettings.defaultService,
          multiAiEnabled: String(currentAISettings.multiAiEnabled),
          paymentCurrency: currentAISettings.paymentCurrency,
          treeGenService: currentAISettings.treeGenService,
          treeGenModel: currentAISettings.treeGenModel,
          treeGenSecondaryService: currentAISettings.treeGenSecondaryService,
          treeGenSecondaryModel: currentAISettings.treeGenSecondaryModel,
          aiServices: JSON.stringify(currentAISettings.services)
        };

        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
        const response = await fetch('/api/user/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include',
          body: JSON.stringify(body)
        });

        if (response.ok) {
          console.log('[AI Settings] DB 저장 완료:', Object.keys(body));
        }
      } catch (apiError) {
        console.warn('[AI Settings] DB 저장 실패:', apiError);
      }

      console.log('[AI Settings] 설정 저장됨:', currentAISettings);
    } catch (error) {
      console.error('AI 설정 저장 실패:', error);
    }
  }

  /**
   * API 키 저장 (로컬에만 저장, 서버 전송 안함)
   */
  function saveAPIKey(service, apiKey) {
    try {
      const keys = JSON.parse(localStorage.getItem(STORAGE_KEYS.API_KEYS) || '{}');
      keys[service] = apiKey;
      localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(keys));
      console.log(`[AI Settings] ${service} API 키 저장됨`);
    } catch (error) {
      console.error('API 키 저장 실패:', error);
    }
  }

  /**
   * API 키 로드
   */
  function getAPIKey(service) {
    try {
      const keys = JSON.parse(localStorage.getItem(STORAGE_KEYS.API_KEYS) || '{}');
      return keys[service] || '';
    } catch (error) {
      return '';
    }
  }

  /**
   * 서버에서 모델 목록 로드
   */
  async function loadModelList() {
    try {
      // ApiCache 사용 (중복 호출 방지)
      const response = window.ApiCache
        ? await window.ApiCache.fetch('/api/credits/models')
        : await fetch('/api/credits/models');
      if (response.ok) {
        const json = await response.json();
        // API 응답 구조: { success: true, data: { models: { gpt: [...], claude: [...], ... } } }
        if (json.success && json.data && json.data.models) {
          // 서비스별 객체를 평면 배열로 변환
          const modelsObj = json.data.models;
          const flatModels = [];
          for (const service of Object.keys(modelsObj)) {
            if (Array.isArray(modelsObj[service])) {
              // API 응답 필드명(camelCase)을 내부 필드명(snake_case)으로 변환
              const transformedModels = modelsObj[service].map(m => ({
                ai_service: service,
                model_name: m.model || m.model_name,
                display_name: m.displayName || m.display_name,
                is_default: m.isDefault ? 1 : (m.is_default || 0),
                cost_per_1m_input: m.costInput || m.cost_per_1m_input,
                cost_per_1m_output: m.costOutput || m.cost_per_1m_output,
                credits_per_1m_input: m.creditsInput || m.credits_per_1m_input,
                credits_per_1m_output: m.creditsOutput || m.credits_per_1m_output
              }));
              flatModels.push(...transformedModels);
            }
          }
          modelListCache = flatModels;
        } else {
          modelListCache = getDefaultModels();
        }
        populateModelSelects();
      }
    } catch (error) {
      console.error('모델 목록 로드 실패:', error);
      // 기본 모델 목록 사용
      modelListCache = getDefaultModels();
      populateModelSelects();
    }
  }

  /**
   * 기본 모델 목록 (서버 연결 실패 시)
   * 실제 서비스 모델만 포함 (2024-12 기준)
   */
  function getDefaultModels() {
    return [
      // GPT (OpenAI) - 실제 서비스 모델
      { ai_service: 'gpt', model_name: 'gpt-4o', display_name: 'GPT-4o', is_default: 1 },
      { ai_service: 'gpt', model_name: 'gpt-4o-mini', display_name: 'GPT-4o Mini', is_default: 0 },
      { ai_service: 'gpt', model_name: 'o1', display_name: 'o1 (추론)', is_default: 0 },
      { ai_service: 'gpt', model_name: 'o1-mini', display_name: 'o1-mini (추론)', is_default: 0 },
      { ai_service: 'gpt', model_name: 'o1-preview', display_name: 'o1-preview (추론)', is_default: 0 },
      { ai_service: 'gpt', model_name: 'gpt-4-turbo', display_name: 'GPT-4 Turbo', is_default: 0 },
      { ai_service: 'gpt', model_name: 'gpt-4', display_name: 'GPT-4', is_default: 0 },
      { ai_service: 'gpt', model_name: 'gpt-3.5-turbo', display_name: 'GPT-3.5 Turbo', is_default: 0 },
      // Grok (xAI)
      { ai_service: 'grok', model_name: 'grok-2', display_name: 'Grok-2', is_default: 1 },
      { ai_service: 'grok', model_name: 'grok-2-latest', display_name: 'Grok-2 Latest', is_default: 0 },
      { ai_service: 'grok', model_name: 'grok-2-1212', display_name: 'Grok-2 1212', is_default: 0 },
      { ai_service: 'grok', model_name: 'grok-2-vision-1212', display_name: 'Grok-2 Vision', is_default: 0 },
      // Claude (Anthropic) - 실제 API 모델명
      { ai_service: 'claude', model_name: 'claude-3-5-sonnet-20241022', display_name: 'Claude 3.5 Sonnet', is_default: 1 },
      { ai_service: 'claude', model_name: 'claude-3-5-haiku-20241022', display_name: 'Claude 3.5 Haiku', is_default: 0 },
      { ai_service: 'claude', model_name: 'claude-3-opus-20240229', display_name: 'Claude 3 Opus', is_default: 0 },
      { ai_service: 'claude', model_name: 'claude-3-sonnet-20240229', display_name: 'Claude 3 Sonnet', is_default: 0 },
      { ai_service: 'claude', model_name: 'claude-3-haiku-20240307', display_name: 'Claude 3 Haiku', is_default: 0 },
      // Gemini (Google) - 실제 서비스 모델
      { ai_service: 'gemini', model_name: 'gemini-2.0-flash-exp', display_name: 'Gemini 2.0 Flash', is_default: 0 },
      { ai_service: 'gemini', model_name: 'gemini-1.5-pro', display_name: 'Gemini 1.5 Pro', is_default: 1 },
      { ai_service: 'gemini', model_name: 'gemini-1.5-flash', display_name: 'Gemini 1.5 Flash', is_default: 0 },
      // Local
      { ai_service: 'local', model_name: 'llama3-8b', display_name: 'Llama 3 8B', is_default: 1 },
      { ai_service: 'local', model_name: 'llama3-70b', display_name: 'Llama 3 70B', is_default: 0 },
      { ai_service: 'local', model_name: 'mistral-7b', display_name: 'Mistral 7B', is_default: 0 }
    ];
  }

  /**
   * 모델 셀렉트 박스 채우기
   */
  function populateModelSelects() {
    if (!modelListCache) return;

    AI_SERVICES.forEach(service => {
      const select = document.getElementById(`${service}Model`);
      if (!select) return;

      // 기존 옵션 제거
      select.innerHTML = '';

      // currentAISettings 기반으로 활성화 상태 확인 (HTML data-enabled 대신)
      const serviceSettings = currentAISettings.services[service];
      const isEnabled = serviceSettings ? serviceSettings.enabled : false;

      // 미사용 상태면 모델 목록 비우기
      if (!isEnabled) {
        return;
      }

      // 해당 서비스의 모델만 필터링
      const serviceModels = modelListCache.filter(m => m.ai_service === service);

      // 가장 긴 모델명 찾기
      let maxLength = 0;
      serviceModels.forEach(model => {
        const displayText = model.display_name || model.model_name;
        if (displayText.length > maxLength) {
          maxLength = displayText.length;
        }
      });

      serviceModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.model_name;
        option.textContent = model.display_name || model.model_name;
        if (model.is_default) option.selected = true;
        select.appendChild(option);
      });

      // 사용자 저장 모델 복원 (DB 로드값 우선, is_default보다 우선)
      const savedModel = _loadedServiceModels[service] || serviceSettings?.model;
      if (savedModel) {
        const hasOption = Array.from(select.options).some(o => o.value === savedModel);
        if (hasOption) {
          select.value = savedModel;
          // currentAISettings도 동기화 (자동 저장 시 올바른 값 보장)
          if (serviceSettings) {
            serviceSettings.model = savedModel;
          }
        }
      }

      // 셀렉트 박스 너비를 최대 텍스트 길이에 맞게 조절
      autoResizeSelect(select);
    });
  }

  /**
   * 셀렉트 박스 너비를 내용에 맞게 자동 조절
   */
  function autoResizeSelect(select) {
    if (!select || select.options.length === 0) return;

    // 임시 span 요소로 텍스트 너비 측정
    const tempSpan = document.createElement('span');
    tempSpan.style.cssText = 'position: absolute; visibility: hidden; white-space: nowrap; font-size: 14px;';
    document.body.appendChild(tempSpan);

    // 가장 긴 옵션의 너비 찾기
    let maxWidth = 0;
    for (let i = 0; i < select.options.length; i++) {
      tempSpan.textContent = select.options[i].textContent;
      const width = tempSpan.offsetWidth;
      if (width > maxWidth) {
        maxWidth = width;
      }
    }

    document.body.removeChild(tempSpan);

    // 패딩 및 드롭다운 화살표 여백 추가 (약 50px)
    const finalWidth = maxWidth + 50;

    // 최소 너비 180px, 최대 너비 400px
    select.style.width = Math.max(180, Math.min(400, finalWidth)) + 'px';
  }

  /**
   * 크레딧 잔액 로드
   */
  async function loadCreditBalance() {
    try {
      // ApiCache 사용 (중복 호출 방지)
      const response = window.ApiCache
        ? await window.ApiCache.fetch('/api/credits/balance')
        : await fetch('/api/credits/balance');
      if (response.ok) {
        const data = await response.json();
        updateCreditBalanceUI(data);
      }
    } catch (error) {
      console.error('크레딧 잔액 로드 실패:', error);
    }
  }

  /**
   * 크레딧 잔액 UI 업데이트
   * @param {Object} data - API 응답 데이터 (data.credits 또는 직접 credits 객체)
   */
  function updateCreditBalanceUI(data) {
    const totalEl = document.getElementById('totalCredits');
    const freeEl = document.getElementById('freeCredits');
    const serviceEl = document.getElementById('serviceCredits');
    const paidEl = document.getElementById('paidCredits');

    // API 응답 구조에 맞게 크레딧 값 추출
    // 구조 1: { data: { credits: { free, service, paid, total } } }
    // 구조 2: { credits: { free, service, paid, total } }
    // 구조 3: { free_credits, service_credits, paid_credits, total_credits } (레거시)
    let credits;
    if (data?.data?.credits) {
      credits = data.data.credits;
    } else if (data?.credits) {
      credits = data.credits;
    } else {
      // 레거시 flat 구조
      credits = {
        total: data.total_credits || 0,
        free: data.free_credits || 0,
        service: data.service_credits || 0,
        paid: data.paid_credits || 0
      };
    }

    if (totalEl) totalEl.textContent = _fmtN(Math.round(credits.total || 0));
    if (freeEl) freeEl.textContent = _fmtN(Math.round(credits.free || 0));
    if (serviceEl) serviceEl.textContent = _fmtN(Math.round(credits.service || 0));
    if (paidEl) paidEl.textContent = _fmtN(Math.round(credits.paid || 0));

    console.log('[Settings] 크레딧 잔액 UI 업데이트:', credits);
  }

  /**
   * API Key 검증 - 클라이언트에서 직접 검증 (보안: 서버로 API Key 전송 금지)
   * @param {string} service - AI 서비스 이름 (gpt, grok, claude, gemini, local)
   *
   * 보안 정책:
   * - API Key는 localStorage에만 저장
   * - 서버로 API Key를 절대 전송하지 않음
   * - 클라이언트에서 직접 각 AI 서비스 API를 호출하여 검증
   */
  async function verifyApiKey(service) {
    const verifyBtn = document.getElementById(`${service}VerifyBtn`);
    const apiKeyInput = document.getElementById(`${service}ApiKey`);
    const localUrlInput = document.getElementById('localUrl');

    // local 서비스는 URL을 확인
    const valueToVerify = service === 'local' ? (localUrlInput?.value || '') : (apiKeyInput?.value || '');

    if (!valueToVerify) {
      if (verifyBtn) {
        verifyBtn.classList.remove('success', 'verifying');
        verifyBtn.classList.add('error');
        verifyBtn.textContent = 'fail';
      }
      return false;
    }

    // 버튼 상태 업데이트 - 검증 중
    if (verifyBtn) {
      verifyBtn.classList.remove('success', 'error');
      verifyBtn.classList.add('verifying');
      verifyBtn.textContent = t('aiVerifying', '검증중...');
    }

    try {
      // 클라이언트에서 직접 API 검증 (서버로 API Key 전송하지 않음)
      const isValid = await verifyApiKeyDirectly(service, valueToVerify);

      if (isValid) {
        // 검증 성공 - OK 표시
        if (verifyBtn) {
          verifyBtn.classList.remove('verifying');
          verifyBtn.classList.add('success');
          verifyBtn.textContent = 'OK';
        }

        // API Key 저장 및 검증 상태 업데이트
        if (service === 'local') {
          if (!currentAISettings.services.local) {
            currentAISettings.services.local = {};
          }
          currentAISettings.services.local.url = valueToVerify;
          currentAISettings.services.local.verified = true;
        } else {
          saveAPIKey(service, valueToVerify);
          if (!currentAISettings.services[service]) {
            currentAISettings.services[service] = {};
          }
          currentAISettings.services[service].verified = true;
        }
        // 검증 상태 업데이트
        apiKeyVerified[service] = true;
        updatePaymentOptionState(service);
        saveAISettings();
        console.log(`[AI Settings] ${service} API Key 검증 성공 - 자동 저장됨`);
        return true;
      } else {
        // 검증 실패 - fail 표시
        if (verifyBtn) {
          verifyBtn.classList.remove('verifying');
          verifyBtn.classList.add('error');
          verifyBtn.textContent = 'fail';
        }

        if (!currentAISettings.services[service]) {
          currentAISettings.services[service] = {};
        }
        currentAISettings.services[service].verified = false;
        // 검증 상태 업데이트
        apiKeyVerified[service] = false;
        updatePaymentOptionState(service);
        saveAISettings();
        console.log(`[AI Settings] ${service} API Key 검증 실패 - 자동 저장됨`);
        return false;
      }
    } catch (error) {
      console.error('API Key 검증 오류:', error);
      if (verifyBtn) {
        verifyBtn.classList.remove('verifying');
        verifyBtn.classList.add('error');
        verifyBtn.textContent = 'fail';
      }
      // 실패 상태도 저장
      if (!currentAISettings.services[service]) {
        currentAISettings.services[service] = {};
      }
      currentAISettings.services[service].verified = false;
      apiKeyVerified[service] = false;
      saveAISettings();
      return false;
    }
  }

  /**
   * API Key 검증 (서버 프록시 경유)
   * 보안: 클라이언트에서 외부 API 직접 호출 금지 → 서버 /api/ai/verify-key 사용
   * @param {string} service - AI 서비스 이름
   * @param {string} apiKey - 검증할 API Key
   * @returns {Promise<boolean>} - 유효성 여부
   */
  async function verifyApiKeyDirectly(service, apiKey) {
    try {
      console.log(`[API Key 검증] 서버 프록시로 ${service} 키 검증 시작...`);

      if (!apiKey || apiKey.length < 10) {
        console.log('[API Key 검증] 키가 너무 짧음');
        return false;
      }

      // 보안: 서버 /api/ai/verify-key 엔드포인트를 통해 검증
      // 클라이언트에서 외부 AI API 직접 호출 시 API 키가 브라우저 네트워크에 노출됨
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
      const response = await fetch('/api/ai/verify-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders
        },
        body: JSON.stringify({ service: service.toLowerCase(), apiKey })
      });

      if (!response.ok) {
        console.error(`[API Key 검증] 서버 응답 오류: ${response.status}`);
        return false;
      }

      const result = await response.json();
      const isValid = result.success && result.valid;
      console.log(`[API Key 검증] ${service}: ${isValid ? '유효' : '무효'}`);
      return isValid;
    } catch (error) {
      console.error(`[API Key 검증] ${service} 검증 실패:`, error);
      return false;
    }
  }

  /**
   * 사용량 통계 로드
   */
  async function loadUsageStats() {
    try {
      // ApiCache 사용 (중복 호출 방지)
      const response = window.ApiCache
        ? await window.ApiCache.fetch('/api/credits/usage-history?limit=100')
        : await fetch('/api/credits/usage-history?limit=100');
      if (response.ok) {
        const data = await response.json();
        updateUsageStatsUI(data);
      }
    } catch (error) {
      console.error('사용량 통계 로드 실패:', error);
    }
  }

  /**
   * 사용량 통계 UI 업데이트
   */
  function updateUsageStatsUI(data) {
    const history = data.history || [];

    // 이번 달 통계 계산
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let monthlyCredits = 0;
    let monthlyRequests = 0;

    history.forEach(item => {
      const itemDate = new Date(item.created_at);
      if (itemDate >= monthStart) {
        monthlyCredits += item.credits_deducted || 0;
        monthlyRequests++;
      }
    });

    const creditsValueEl = document.getElementById('monthlyCreditsUsed');
    const requestsValueEl = document.getElementById('monthlyRequests');

    if (creditsValueEl) creditsValueEl.textContent = _fmtN(monthlyCredits);
    if (requestsValueEl) requestsValueEl.textContent = _fmtN(monthlyRequests);
  }

  /**
   * AI 설정을 UI에 적용
   */
  function applyAISettingsToUI() {
    // 기본 AI 서비스 선택
    const defaultServiceSelect = document.getElementById('defaultAIService');
    if (defaultServiceSelect) {
      defaultServiceSelect.value = currentAISettings.defaultService || 'gpt';
    }

    // 다중 AI 토글
    const multiAiToggle = document.getElementById('multiAIEnabled');
    if (multiAiToggle) multiAiToggle.checked = currentAISettings.multiAiEnabled;

    // 결제 통화 (구독 중 통화 고정 상태면 덮어쓰기 방지)
    const currencySelect = document.getElementById('paymentCurrency');
    if (currencySelect && !currencySelect.disabled) {
      currencySelect.value = currentAISettings.paymentCurrency || 'USD';
    }

    // 각 AI 서비스 카드 설정
    AI_SERVICES.forEach(service => {
      const serviceSettings = currentAISettings.services[service] || {};
      const isDefaultService = (currentAISettings.defaultService === service);

      // 활성화 토글
      const enableToggle = document.getElementById(`${service}Enabled`);
      if (enableToggle) {
        // 기본 AI 서비스인 경우 항상 활성화되어야 함
        if (isDefaultService) {
          enableToggle.checked = true;
          enableToggle.disabled = true;  // 비활성화 방지
          // 설정에도 반영
          if (!currentAISettings.services[service]) {
            currentAISettings.services[service] = {};
          }
          currentAISettings.services[service].enabled = true;
        } else {
          enableToggle.checked = serviceSettings.enabled;
          enableToggle.disabled = false;  // 토글 가능
        }
        updateCardEnabledState(service, enableToggle.checked, isDefaultService);
        updateServiceStatusButton(service, enableToggle.checked);
      }

      // 모델 선택
      const modelSelect = document.getElementById(`${service}Model`);
      if (modelSelect && serviceSettings.model) {
        modelSelect.value = serviceSettings.model;
      }

      // API 키 (로컬 스토리지에서)
      const apiKeyInput = document.getElementById(`${service}ApiKey`);
      if (apiKeyInput) {
        const savedKey = getAPIKey(service);
        if (savedKey) {
          apiKeyInput.value = savedKey;
        }
      }

      // 저장된 검증 상태 로드
      if (serviceSettings.verified !== undefined) {
        apiKeyVerified[service] = serviceSettings.verified;
      }
    });

    // 서버에서 모델 목록 로드 후 새노드 만들기 AI 설정 적용 (v3)
    loadTreeGenModelsFromServer().then(() => {
      applyTreeGenSettingsToUI();
    });
  }

  /**
   * AI 설정 토스트 메시지 표시
   * @param {string} message - 표시할 메시지
   * @param {string} type - 메시지 타입 ('success' | 'error' | 'warning' | 'info')
   */
  function showAIToast(message, type = 'info') {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.ai-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // 토스트 요소 생성
    const toast = document.createElement('div');
    toast.className = `ai-toast ai-toast-${type}`;

    // 타입별 아이콘 (mmIcon SVG)
    const icons = {
      success: mmIcon('check-circle', 16),
      error: mmIcon('x-circle', 16),
      warning: mmIcon('alert-triangle', 16),
      info: mmIcon('info', 16)
    };

    // 타입별 색상
    const colors = {
      success: '#4CAF50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196F3'
    };

    toast.innerHTML = `<span class="ai-toast-icon">${icons[type] || icons.info}</span><span class="ai-toast-message">${message}</span>`;

    // 스타일 적용
    Object.assign(toast.style, {
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%) translateY(-100px)',
      padding: '12px 24px',
      backgroundColor: colors[type] || colors.info,
      color: '#ffffff',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      fontSize: '14px',
      fontWeight: '500',
      zIndex: '10001',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      opacity: '0',
      transition: 'all 0.3s ease-out'
    });

    // 페이지에 추가
    document.body.appendChild(toast);

    // 애니메이션 시작
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    // 3초 후 자동 제거
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-100px)';

      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }

  /**
   * 카드 활성화 상태 업데이트
   * @param {string} service - AI 서비스 이름
   * @param {boolean} enabled - 활성화 여부
   * @param {boolean} isDefault - 기본 AI 서비스 여부
   */
  function updateCardEnabledState(service, enabled, isDefault = false) {
    const card = document.querySelector(`.ai-service-card[data-service="${service}"]`);
    if (!card) return;

    if (enabled) {
      card.classList.add('enabled');
    } else {
      card.classList.remove('enabled');
    }

    // 기본 AI 서비스 표시
    if (isDefault) {
      card.classList.add('default-service');
    } else {
      card.classList.remove('default-service');
    }

    // AI 이름 옆에 기본 서비스 배지 추가
    const aiNameEl = card.querySelector('.ai-name');
    if (aiNameEl) {
      // 기존 배지 제거
      const existingBadge = aiNameEl.querySelector('.default-badge');
      if (existingBadge) {
        existingBadge.remove();
      }

      // 기본 AI 서비스인 경우 배지 추가
      if (isDefault) {
        const badge = document.createElement('span');
        badge.className = 'default-badge';
        badge.textContent = t('aiDefaultBadge', '기본');
        badge.style.cssText = 'margin-left: 8px; background: #007bff; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; vertical-align: middle;';
        aiNameEl.appendChild(badge);
      }
    }
  }

  /**
   * 이벤트 리스너 설정
   */
  // === REFACTOR-007: setupAIEventListeners 분해 ===

  /**
   * 기본 AI 서비스 선택 이벤트 설정
   */
  function setupDefaultServiceListener() {
    const defaultServiceSelect = document.getElementById('defaultAIService');
    if (!defaultServiceSelect) return;

    defaultServiceSelect.addEventListener('change', (e) => {
      const newDefaultService = e.target.value;
      const oldDefaultService = currentAISettings.defaultService;

      // 설정 업데이트
      currentAISettings.defaultService = newDefaultService;

      // 기존 기본 AI 서비스 비활성화
      if (oldDefaultService && currentAISettings.services[oldDefaultService]) {
        currentAISettings.services[oldDefaultService].enabled = false;
      }

      // 새 기본 서비스 활성화
      if (!currentAISettings.services[newDefaultService]) {
        currentAISettings.services[newDefaultService] = {};
      }
      currentAISettings.services[newDefaultService].enabled = true;

      // UI 업데이트: 모든 서비스의 토글 상태 재적용
      AI_SERVICES.forEach(service => {
        const isDefaultService = (newDefaultService === service);
        const isOldDefaultService = (oldDefaultService === service);
        const enableToggle = document.getElementById(`${service}Enabled`);

        if (enableToggle) {
          if (isDefaultService) {
            enableToggle.checked = true;
            enableToggle.disabled = true;
          } else if (isOldDefaultService) {
            enableToggle.checked = false;
            enableToggle.disabled = false;
          } else {
            enableToggle.disabled = false;
          }
          updateCardEnabledState(service, enableToggle.checked, isDefaultService);
          updateServiceStatusButton(service, enableToggle.checked);
        }
      });

      saveAISettings();
      console.log(`[AI Settings] 기본 AI 서비스 변경: ${oldDefaultService} → ${newDefaultService}`);
    });
  }

  /**
   * 다중 AI 토글 이벤트 설정
   */
  function setupMultiAIToggleListener() {
    const multiAiToggle = document.getElementById('multiAIEnabled');
    if (!multiAiToggle) return;

    multiAiToggle.addEventListener('change', (e) => {
      currentAISettings.multiAiEnabled = e.target.checked;

      if (!e.target.checked) {
        let disabledCount = 0;
        AI_SERVICES.forEach(service => {
          const isDefaultService = (currentAISettings.defaultService === service);
          if (!isDefaultService && currentAISettings.services[service]?.enabled) {
            currentAISettings.services[service].enabled = false;
            disabledCount++;
            const enableToggle = document.getElementById(`${service}Enabled`);
            if (enableToggle) {
              enableToggle.checked = false;
            }
            updateCardEnabledState(service, false, false);
            updateServiceStatusButton(service, false);
          }
        });

        if (disabledCount > 0) {
          showAIToast(t('aiMultiModeDisabled', `다중 AI 모드가 비활성화되어 ${disabledCount}개의 AI가 비활성화되었습니다.`), 'info');
        }
        console.log(`[AI Settings] 다중 AI 모드 OFF - ${disabledCount}개 AI 비활성화`);
      } else {
        showAIToast(t('aiMultiModeEnabled', '다중 AI 모드가 활성화되었습니다. 여러 AI를 동시에 사용할 수 있습니다.'), 'success');
        console.log('[AI Settings] 다중 AI 모드 ON');
      }

      saveAISettings();
    });
  }

  /**
   * 결제 통화 선택 이벤트 설정
   */
  function setupCurrencyListener() {
    const currencySelect = document.getElementById('paymentCurrency');
    if (!currencySelect) return;

    currencySelect.addEventListener('change', async (e) => {
      currentAISettings.paymentCurrency = e.target.value;
      saveAISettings();
      await updateSubscriptionPackagePrices(e.target.value);
    });
  }

  /**
   * 개별 AI 서비스 이벤트 설정
   * @param {string} service - AI 서비스 이름
   */
  function setupServiceEventListeners(service) {
    // 활성화 토글
    const enableToggle = document.getElementById(`${service}Enabled`);
    if (enableToggle) {
      enableToggle.addEventListener('change', (e) => {
        const isDefaultService = (currentAISettings.defaultService === service);

        if (isDefaultService && !e.target.checked) {
          e.target.checked = true;
          console.warn(`[AI Settings] ${service}는 기본 AI 서비스이므로 비활성화할 수 없습니다.`);
          return;
        }

        if (!currentAISettings.multiAiEnabled && !isDefaultService && e.target.checked) {
          e.target.checked = false;
          showAIToast(t('aiMultiModeRequired', '다중 AI 사용을 먼저 활성화해주세요.'), 'warning');
          console.warn(`[AI Settings] 다중 AI 모드가 비활성화되어 ${service}를 활성화할 수 없습니다.`);
          return;
        }

        if (!currentAISettings.services[service]) {
          currentAISettings.services[service] = {};
        }
        currentAISettings.services[service].enabled = e.target.checked;
        updateCardEnabledState(service, e.target.checked, isDefaultService);
        updateServiceStatusButton(service, e.target.checked);
        updateServiceModelSelect(service, e.target.checked);
        saveAISettings();
      });
    }

    // 모델 선택
    const modelSelect = document.getElementById(`${service}Model`);
    if (modelSelect) {
      modelSelect.addEventListener('change', (e) => {
        if (!currentAISettings.services[service]) {
          currentAISettings.services[service] = {};
        }
        currentAISettings.services[service].model = e.target.value;
        saveAISettings();

        // 메인 화면의 다중선택 탭 업데이트 (설정이 레이어 팝업으로 열린 경우)
        if (typeof window.updateAITabs === 'function') {
          window.updateAITabs();
        }
      });
    }

    // API 키 (blur 시 저장 - 검증은 버튼 클릭 시만)
    const apiKeyInput = document.getElementById(`${service}ApiKey`);
    if (apiKeyInput) {
      apiKeyInput.addEventListener('blur', async (e) => {
        const apiKey = e.target.value.trim();
        saveAPIKey(service, apiKey);
        // blur 시 자동 검증 제거 - 버튼 클릭 시 검증 결과가 OK/fail로 표시됨
      });
    }

    // API 키 검증 버튼
    const verifyBtn = document.getElementById(`${service}VerifyBtn`);
    if (verifyBtn) {
      verifyBtn.addEventListener('click', () => verifyApiKey(service));
    }
  }

  /**
   * Local AI URL 이벤트 설정
   */
  function setupLocalAIUrlListener() {
    const localUrlInput = document.getElementById('localUrl');
    if (!localUrlInput) return;

    localUrlInput.addEventListener('blur', (e) => {
      if (!currentAISettings.services.local) {
        currentAISettings.services.local = {};
      }
      currentAISettings.services.local.url = e.target.value;
      saveAISettings();
    });
  }

  /**
   * 사용 내역 버튼 이벤트 설정
   */
  function setupUsageHistoryListener() {
    const viewUsageBtn = document.getElementById('viewUsageBtn');
    if (viewUsageBtn) {
      viewUsageBtn.addEventListener('click', showUsageHistoryModal);
    }
  }

  /**
   * 노드재구성 AI 모델 셀렉트 박스 채우기
   * 이미지 전용 모델은 제외됨 (텍스트 생성 불가)
   * @param {string} service - 선택된 AI 서비스
   * @param {string} selectedModel - 선택할 모델 (없으면 첫번째 모델 선택)
   * @param {HTMLElement} targetSelect - 대상 select 요소 (없으면 주 AI 모델 select)
   */
  function populateTreeGenModelSelect(service, selectedModel = '', targetSelect = null) {
    const modelSelect = targetSelect || document.getElementById('treeGenModel');
    if (!modelSelect) return;

    const allModels = TREE_GEN_MODELS[service] || TREE_GEN_MODELS.gpt;
    // 이미지 전용 모델 제외 (노드재구성은 텍스트 생성 목적)
    const models = allModels.filter(model => !isImageOnlyModel(model.value));

    if (models.length < allModels.length) {
      console.log(`[AI Settings] 노드재구성: 이미지 전용 모델 ${allModels.length - models.length}개 제외`);
    }

    modelSelect.innerHTML = '';

    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.value;
      option.textContent = model.label;

      if (model.value === selectedModel) {
        option.selected = true;
      }
      modelSelect.appendChild(option);
    });

    // selectedModel이 없거나 목록에 없으면 첫번째 옵션 선택 및 localStorage 업데이트 (v3 동기화)
    if (!selectedModel || !models.find(m => m.value === selectedModel)) {
      modelSelect.selectedIndex = 0;
      // localStorage 값도 업데이트
      const newModel = modelSelect.value;
      if (newModel) {
        if (targetSelect && targetSelect.id === 'treeGenSecondaryModel') {
          currentAISettings.treeGenSecondaryModel = newModel;
          console.log(`[AI Settings] 보조AI 모델이 목록에 없어서 업데이트: ${selectedModel} -> ${newModel}`);
        } else {
          currentAISettings.treeGenModel = newModel;
          console.log(`[AI Settings] 주AI 모델이 목록에 없어서 업데이트: ${selectedModel} -> ${newModel}`);
        }
        saveAISettings();
      }
    }
  }

  /**
   * 새노드 만들기 AI 설정을 UI에 적용
   */
  function applyTreeGenSettingsToUI() {
    // 주 AI (Primary AI)
    const serviceSelect = document.getElementById('treeGenService');
    const modelSelect = document.getElementById('treeGenModel');

    if (serviceSelect && modelSelect) {
      const service = currentAISettings.treeGenService || 'gpt';
      const model = currentAISettings.treeGenModel || 'gpt-4o-mini';
      serviceSelect.value = service;
      populateTreeGenModelSelect(service, model);
    }

    // 보조 AI (Secondary AI) - v3
    const secondaryServiceSelect = document.getElementById('treeGenSecondaryService');
    const secondaryModelSelect = document.getElementById('treeGenSecondaryModel');

    if (secondaryServiceSelect && secondaryModelSelect) {
      const secondaryService = currentAISettings.treeGenSecondaryService || 'gpt';
      const secondaryModel = currentAISettings.treeGenSecondaryModel || 'gpt-4o-mini';
      secondaryServiceSelect.value = secondaryService;
      populateTreeGenModelSelect(secondaryService, secondaryModel, secondaryModelSelect);
    }
  }

  /**
   * 새노드 만들기 AI 이벤트 리스너 설정
   */
  function setupTreeGenAIListener() {
    // 주 AI (Primary AI) 이벤트
    const serviceSelect = document.getElementById('treeGenService');
    const modelSelect = document.getElementById('treeGenModel');

    if (serviceSelect && modelSelect) {
      // 서비스 변경 시 모델 목록 업데이트
      serviceSelect.addEventListener('change', (e) => {
        const newService = e.target.value;
        currentAISettings.treeGenService = newService;

        // 모델 목록 업데이트 (첫번째 모델 자동 선택)
        populateTreeGenModelSelect(newService);

        // 선택된 모델 저장
        currentAISettings.treeGenModel = modelSelect.value;

        saveAISettings();
        console.log(`[AI Settings] 새노드 만들기 주 AI 서비스 변경: ${newService}`);
      });

      // 모델 변경 시 설정 저장
      modelSelect.addEventListener('change', (e) => {
        currentAISettings.treeGenModel = e.target.value;
        saveAISettings();
        console.log(`[AI Settings] 새노드 만들기 주 AI 모델 변경: ${e.target.value}`);
      });
    }

    // 보조 AI (Secondary AI) 이벤트 - v3
    const secondaryServiceSelect = document.getElementById('treeGenSecondaryService');
    const secondaryModelSelect = document.getElementById('treeGenSecondaryModel');

    if (secondaryServiceSelect && secondaryModelSelect) {
      // 서비스 변경 시 모델 목록 업데이트
      secondaryServiceSelect.addEventListener('change', (e) => {
        const newService = e.target.value;
        currentAISettings.treeGenSecondaryService = newService;

        // 모델 목록 업데이트 (첫번째 모델 자동 선택)
        populateTreeGenModelSelect(newService, '', secondaryModelSelect);

        // 선택된 모델 저장
        currentAISettings.treeGenSecondaryModel = secondaryModelSelect.value;

        saveAISettings();
        console.log(`[AI Settings] 새노드 만들기 보조 AI 서비스 변경: ${newService}`);
      });

      // 모델 변경 시 설정 저장
      secondaryModelSelect.addEventListener('change', (e) => {
        currentAISettings.treeGenSecondaryModel = e.target.value;
        saveAISettings();
        console.log(`[AI Settings] 새노드 만들기 보조 AI 모델 변경: ${e.target.value}`);
      });
    }
  }

  /**
   * AI 설정 이벤트 리스너 설정 (메인 함수)
   * REFACTOR-007: 분해된 함수들을 호출
   */
  function setupAIEventListeners() {
    setupDefaultServiceListener();
    setupMultiAIToggleListener();
    setupCurrencyListener();
    setupTreeGenAIListener();  // 새노드 만들기 AI 설정

    // 각 AI 서비스별 이벤트 설정
    AI_SERVICES.forEach(service => {
      setupServiceEventListeners(service);
    });

    setupLocalAIUrlListener();
    setupUsageHistoryListener();
  }

  // Phase 6: 사용 내역 모달 상태
  let usageHistoryOffset = 0;
  const USAGE_HISTORY_LIMIT = 20;

  /**
   * 사용 내역 모달 표시
   */
  async function showUsageHistoryModal() {
    const modal = document.getElementById('usageHistoryModal');
    if (!modal) {
      console.error('사용 내역 모달을 찾을 수 없습니다.');
      return;
    }

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

    // 초기화
    usageHistoryOffset = 0;
    document.getElementById('usageTableBody').innerHTML = '';
    document.getElementById('usageRecordCount').textContent = t('usageRecordCountZero', '0개의 기록');
    document.getElementById('loadMoreUsage').style.display = 'none';

    // 서버 타임존 로드 (아직 로드 안된 경우)
    if (!serverTimezone) {
      await loadServerTimezone();
    }

    // 현재 크레딧 로드
    await loadUsageModalCredit();

    // 데이터 로드
    await loadUsageHistory();
  }

  /**
   * 서버 타임존 정보 로드
   */
  async function loadServerTimezone() {
    try {
      const response = await fetch('/api/server-info', {
        credentials: 'include'
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.timezone) {
          serverTimezone = result.data.timezone;
          console.log('[Settings] 서버 타임존 로드됨:', serverTimezone);
        }
      }
    } catch (error) {
      console.warn('[Settings] 서버 타임존 로드 실패, 로컬 타임존 사용:', error);
      serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
  }

  /**
   * 사용 내역 모달 현재 크레딧 로드
   */
  async function loadUsageModalCredit() {
    try {
      // ApiCache 사용 (중복 호출 방지)
      const response = window.ApiCache
        ? await window.ApiCache.fetch('/api/credits/balance')
        : await fetch('/api/credits/balance', { credentials: 'include' });

      if (response.ok) {
        const result = await response.json();
        const credits = result?.data?.credits || {};
        const currentCredit = credits.total || 0;
        const freeCredits = credits.free || 0;
        const serviceCredits = credits.service || 0;
        const paidCredits = credits.paid || 0;
        const subscriptionStatus = result?.data?.subscription?.status;

        // 크레딧 잔액 설정 (구독 상태와 무관하게 실제 잔액 사용)
        window._usageModalCurrentCredit = currentCredit;
        window._usageModalSubscriptionCancelled = false;

        // 모달 내 크레딧 요약 표시 업데이트
        const totalEl = document.getElementById('usageModalTotalCredits');
        const freeEl = document.getElementById('usageModalFreeCredits');
        const serviceEl = document.getElementById('usageModalServiceCredits');
        const paidEl = document.getElementById('usageModalPaidCredits');

        if (totalEl) totalEl.textContent = formatInteger(currentCredit);
        if (freeEl) freeEl.textContent = formatInteger(freeCredits);
        if (serviceEl) serviceEl.textContent = formatInteger(serviceCredits);
        if (paidEl) paidEl.textContent = formatInteger(paidCredits);
      }
    } catch (error) {
      console.error('[Usage Modal] Failed to load credit:', error);
      window._usageModalCurrentCredit = 0;
      window._usageModalSubscriptionCancelled = true;

      // 에러 시에도 0으로 표시
      const totalEl = document.getElementById('usageModalTotalCredits');
      const freeEl = document.getElementById('usageModalFreeCredits');
      const serviceEl = document.getElementById('usageModalServiceCredits');
      const paidEl = document.getElementById('usageModalPaidCredits');

      if (totalEl) totalEl.textContent = '0';
      if (freeEl) freeEl.textContent = '0';
      if (serviceEl) serviceEl.textContent = '0';
      if (paidEl) paidEl.textContent = '0';
    }
  }

  /**
   * 사용 내역 모달 닫기
   */
  function closeUsageHistoryModal() {
    const modal = document.getElementById('usageHistoryModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * 사용 내역 데이터 로드
   */
  async function loadUsageHistory() {
    const loadingSpinner = document.getElementById('usageLoadingSpinner');
    const noDataDiv = document.getElementById('usageNoData');
    const tableBody = document.getElementById('usageTableBody');
    const loadMoreBtn = document.getElementById('loadMoreUsage');

    loadingSpinner.style.display = 'flex';
    noDataDiv.style.display = 'none';

    try {
      // 서버 API는 page 파라미터 사용 (offset이 아닌 page 기반)
      const currentPage = Math.floor(usageHistoryOffset / USAGE_HISTORY_LIMIT) + 1;
      const response = await fetch(`/api/credits/usage-history?limit=${USAGE_HISTORY_LIMIT}&page=${currentPage}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('사용 내역을 불러올 수 없습니다.');
      }

      const result = await response.json();
      // 서버 응답: { success, data: { history: [...], pagination: {...} } }
      const historyData = result.data?.history || result.data || [];
      const pagination = result.data?.pagination;
      const summary = result.summary;
      const items = Array.isArray(historyData) ? historyData : [];

      // 총크레딧 계산 (현재크레딧 + 총사용크레딧)
      if (summary && usageHistoryOffset === 0) {
        const totalCreditsUsed = summary.totalCreditsUsed || 0;
        const currentCredit = window._usageModalCurrentCredit || 0;
        const totalCredit = currentCredit + totalCreditsUsed;

        // 총크레딧 저장 (테이블 행에서 현재크레딧 계산 시 사용)
        window._usageModalTotalCredit = totalCredit;
        // 누적 사용량 초기화
        window._usageModalCumulativeUsed = 0;
      }

      // 테이블 데이터 추가
      if (items.length > 0) {
        items.forEach(item => {
          const row = createUsageTableRow(item);
          tableBody.appendChild(row);
        });

        usageHistoryOffset += items.length;
        document.getElementById('usageRecordCount').textContent = t('usageRecordCount', '{count}개의 기록').replace('{count}', usageHistoryOffset);

        // 더 보기 버튼 (pagination 기반 또는 hasMore 폴백)
        const hasMore = pagination
          ? (pagination.page < pagination.totalPages)
          : (result.hasMore || false);
        loadMoreBtn.style.display = hasMore ? 'block' : 'none';
      } else if (usageHistoryOffset === 0) {
        noDataDiv.style.display = 'flex';
      }

    } catch (error) {
      console.error('사용 내역 로드 실패:', error);
      if (usageHistoryOffset === 0) {
        noDataDiv.style.display = 'flex';
        noDataDiv.querySelector('span').textContent = t('aiUsageLoadFailed', '데이터를 불러올 수 없습니다');
      }
    } finally {
      loadingSpinner.style.display = 'none';
    }
  }

  /**
   * 사용 내역 테이블 행 생성 (개선된 컬럼 구조)
   * 컬럼: 상태 | 일시 | 타입 | 상세내용 | 토큰 | 변동량 | 잔액
   */
  function createUsageTableRow(item) {
    const row = document.createElement('tr');

    // 서버 API 필드명 호환 (서버: ai_service/model_name/credits_deducted/input_tokens/output_tokens)
    const service = item.ai_service || item.service || '';
    const model = item.model_name || item.model || '';
    // parseFloat: PostgreSQL은 NUMERIC 컬럼을 문자열로 반환 → 산술 연산 시 문자열 연결 방지
    const creditsDeducted = parseFloat(item.credits_deducted || item.credits_used || 0);
    const inputTokens = parseInt(item.input_tokens || item.request_tokens || 0, 10);
    const outputTokens = parseInt(item.output_tokens || item.response_tokens || 0, 10);

    // 구매 로그인지 사용 로그인지 확인
    const isPurchaseLog = item.log_type === 'purchase';

    // 상태 텍스트
    let statusText, statusClass;
    if (isPurchaseLog) {
      statusText = item.status === 'completed' ? t('statusCompleted', '완료') : (item.status === 'pending' ? t('statusPending', '대기') : t('aiStatusFailed', '실패'));
      statusClass = item.status === 'completed' ? 'status-success' : (item.status === 'pending' ? 'status-pending' : 'status-failed');
    } else {
      statusText = item.status === 'success' ? t('statusCompleted', '완료') : t('aiStatusFailed', '실패');
      statusClass = item.status === 'success' ? 'status-success' : 'status-failed';
    }

    // 날짜 포맷팅 - 서버에서 이미 포맷된 문자열일 수 있음
    let dateTimeStr = item.created_at || '';
    if (dateTimeStr) {
      const date = new Date(dateTimeStr);
      // 유효한 ISO 날짜인 경우만 재포맷팅
      if (!isNaN(date.getTime()) && (dateTimeStr.includes('T') || dateTimeStr.includes('-'))) {
        const dateFormatOptions = {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        };
        dateTimeStr = _fmtD(date, dateFormatOptions);
      }
      // 서버에서 이미 포맷된 경우 (예: "02. 07. 오후 10:14") 그대로 사용
    }

    // 타입 및 상세내용 결정
    let typeIcon, typeText, typeBadgeClass, detailsText;

    if (isPurchaseLog) {
      // 구매 로그 타입 분류
      const purchaseType = item.service; // subscription, subscription_upgrade, credit_only, cancellation
      switch (purchaseType) {
        case 'subscription':
          typeIcon = mmIcon('package', 14);
          typeText = t('typeSubscription', '구독');
          typeBadgeClass = 'type-subscription';
          detailsText = getPackageDisplayName(item.model);
          break;
        case 'subscription_upgrade':
          typeIcon = mmIcon('arrow-up', 14);
          typeText = t('aiTypeUpgrade', '업그레이드');
          typeBadgeClass = 'type-upgrade';
          detailsText = getPackageDisplayName(item.model);
          break;
        case 'credit_only':
          typeIcon = mmIcon('diamond', 14);
          typeText = t('typeCreditPurchase', '크레딧 구매');
          typeBadgeClass = 'type-credit-purchase';
          detailsText = item.model ? `$${item.model}` : '-';
          break;
        case 'cancellation':
          typeIcon = mmIcon('x-circle', 14);
          typeText = t('typeCancellation', '취소');
          typeBadgeClass = 'type-cancellation';
          detailsText = t('aiSubscriptionCancel', '구독 취소');
          break;
        default:
          typeIcon = mmIcon('clipboard', 16);
          typeText = purchaseType || t('aiTypeOther', '기타');
          typeBadgeClass = 'type-other';
          detailsText = item.model || '-';
      }
    } else {
      // AI 사용 로그
      typeIcon = mmIcon('robot', 16);
      typeText = 'AI 사용';
      typeBadgeClass = 'type-ai-usage';
      // 상세내용: AI서비스 + 모델명 (호환 필드 사용)
      const serviceName = getServiceDisplayName(service);
      const modelDisplayName = model || '';
      detailsText = modelDisplayName ? `${serviceName} (${modelDisplayName})` : serviceName;
    }

    // 크레딧 계산 (호환 필드 사용)
    const creditsUsed = creditsDeducted;
    const creditsGranted = parseFloat(item.credits_granted || 0);
    let currentCreditAtTime;

    if (window._usageModalSubscriptionCancelled) {
      currentCreditAtTime = 0;
    } else {
      currentCreditAtTime = (window._usageModalCurrentCredit || 0) + (window._usageModalCumulativeUsed || 0);
    }

    // 누적 계산
    if (isPurchaseLog) {
      window._usageModalCumulativeUsed = (window._usageModalCumulativeUsed || 0) - creditsGranted;
    } else {
      window._usageModalCumulativeUsed = (window._usageModalCumulativeUsed || 0) + creditsUsed;
    }

    // 변동량 계산 및 표시
    let changeAmount, changeDisplay, changeClass;

    if (isPurchaseLog) {
      changeAmount = creditsGranted;
    } else {
      changeAmount = -creditsUsed; // AI 사용은 차감이므로 음수
    }

    let changeStyle = '';
    if (changeAmount > 0) {
      // 증가: 파란색
      changeDisplay = `+${formatNumber(changeAmount)}`;
      changeClass = 'change-positive';
      changeStyle = 'color: #2196F3; font-weight: 600;';
    } else if (changeAmount < 0) {
      // 감소: 빨간색
      changeDisplay = formatNumber(changeAmount);
      changeClass = 'change-negative';
      changeStyle = 'color: #f44336; font-weight: 600;';
    } else {
      // 변동 없음: 일반 색상
      changeDisplay = '0';
      changeClass = 'change-neutral';
      changeStyle = '';
    }

    // 토큰 표시 (AI 사용만) - 입력/출력 형식
    let tokensDisplay;
    if (isPurchaseLog) {
      tokensDisplay = '-';
    } else {
      tokensDisplay = `${formatInteger(inputTokens)} / ${formatInteger(outputTokens)}`;
    }

    // 크레딧 표시 (변동량 → 크레딧으로 변경)
    let creditsDisplay;
    if (isPurchaseLog) {
      // 구매 로그: 충전된 크레딧 (양수, 파란색)
      creditsDisplay = `<span style="color: #2196F3; font-weight: 600;">+${formatNumber(creditsGranted)}</span>`;
    } else {
      // AI 사용 로그: 차감된 크레딧 (음수, 빨간색)
      creditsDisplay = `<span style="color: #f44336; font-weight: 600;">-${formatNumber(creditsUsed)}</span>`;
    }

    row.innerHTML = `
      <td><span class="status-text ${statusClass}">${statusText}</span></td>
      <td>${dateTimeStr}</td>
      <td><span class="type-badge ${typeBadgeClass}">${typeIcon} ${typeText}</span></td>
      <td class="details-cell">${detailsText}</td>
      <td>${tokensDisplay}</td>
      <td>${creditsDisplay}</td>
      <td>${formatNumber(currentCreditAtTime)}</td>
    `;

    return row;
  }

  /**
   * 패키지 표시명 가져오기
   */
  function getPackageDisplayName(packageType) {
    const packageNames = {
      'only': 'Only',
      'plus10': 'Standard (Plus10)',
      'plus30': 'Best (Plus30)',
      'plus60': 'Pro (Plus60)'
    };
    return packageNames[packageType] || packageType || '-';
  }

  /**
   * 서비스 표시명 가져오기
   */
  function getServiceDisplayName(service) {
    const names = {
      'gpt': 'GPT',
      'claude': 'Claude',
      'gemini': 'Gemini',
      'grok': 'Grok',
      'local': 'Local'
    };
    return names[service] || service || '-';
  }

  /**
   * 구매 유형 표시명 가져오기
   * @param {string} purchaseType - 구매 유형 (subscription, credit_only, bonus)
   * @param {string} packageType - 패키지 유형 (only, plus10, plus30, plus60 등)
   */
  function getPurchaseTypeDisplayName(purchaseType, packageType) {
    // 패키지명 매핑
    const packageNames = {
      'only': 'Only',
      'plus10': t('subscriptionLite', '일반'),
      'plus30': t('subscriptionStandard', '베스트'),
      'plus60': t('subscriptionPro', '프로'),
      'credit_10': '10$',
      'credit_30': '30$',
      'credit_60': '60$'
    };

    // 구매 유형 기본명
    const typeNames = {
      'subscription': t('typeSubscription', '구독'),
      'subscription_upgrade': t('aiTypeSubscriptionUpgrade', '구독 업그레이드'),
      'credit_only': t('typeCreditPurchase', '크레딧 구매'),
      'cancellation': t('aiSubscriptionCancel', '구독 취소'),
      'bonus': t('bonusCreditsShort', '보너스')
    };

    const typeName = typeNames[purchaseType] || purchaseType || t('credits', '크레딧');
    const pkgName = packageNames[packageType] || '';

    // 패키지명이 있으면 결합
    if (pkgName) {
      return `${typeName} ${pkgName}`;
    }
    return typeName;
  }

  /**
   * 숫자 포맷팅 (천 단위 콤마)
   */
  function formatNumber(num) {
    // v8.1: 소수점 5자리 지원 (USD 기반 크레딧)
    if (typeof num !== 'number') num = Number(num) || 0;
    const fixed = num.toFixed(5);
    const [intPart, decPart] = fixed.split('.');
    const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decPart ? formatted + '.' + decPart : formatted;
  }

  /**
   * 정수 포맷팅 (천 단위 콤마, 소수점 없음) - 토큰 표시용
   */
  function formatInteger(num) {
    if (typeof num !== 'number') num = Math.round(Number(num) || 0);
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * 사용 내역 모달 이벤트 리스너 설정
   */
  function setupUsageHistoryModalListeners() {
    // 내역 보기 버튼
    const viewBtn = document.getElementById('viewUsageHistoryBtn');
    if (viewBtn) {
      viewBtn.addEventListener('click', showUsageHistoryModal);
    }

    // 모달 닫기 버튼
    const closeBtn = document.getElementById('closeUsageModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeUsageHistoryModal);
    }

    // 모달 외부 클릭 시 닫기
    const modal = document.getElementById('usageHistoryModal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          closeUsageHistoryModal();
        }
      });
    }

    // 더 보기 버튼
    const loadMoreBtn = document.getElementById('loadMoreUsage');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', loadUsageHistory);
    }

    // ESC 키로 닫기
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        const modal = document.getElementById('usageHistoryModal');
        if (modal && modal.style.display === 'flex') {
          closeUsageHistoryModal();
        }
      }
    });
  }

  /**
   * AI 설정 가져오기 (외부에서 사용)
   */
  function getAISettings() {
    return { ...currentAISettings };
  }

  /**
   * 특정 서비스의 API 키 가져오기 (외부에서 사용)
   */
  function getServiceAPIKey(service) {
    return getAPIKey(service);
  }

  /**
   * 구독 패키지 가격을 선택한 통화로 업데이트
   * @param {string} currency - 통화 코드 (USD, KRW, JPY 등)
   */
  async function updateSubscriptionPackagePrices(currency) {
    try {
      console.log(`[Settings] 구독 패키지 가격 업데이트: ${currency}`);

      // 서버에서 환율 적용된 패키지 정보 가져오기
      const response = await fetch(`/api/exchange/packages?currency=${currency}`);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || t('aiPackageInfoFailed', '패키지 정보 조회 실패'));
      }

      const { packages, rate, updated_at } = result.data || {};
      console.log(`[Settings] 환율: 1 USD = ${rate} ${currency}, 업데이트: ${updated_at}`);

      // 패키지 카드 업데이트
      if (Array.isArray(packages)) { packages.forEach(pkg => {
        updatePackageCardPrice(pkg);
      }); } else { console.warn("[Settings] packages가 배열이 아닙니다:", packages); }

      // 환율 정보 표시 업데이트
      updateCurrencyInfo(currency, rate, updated_at);

      // 크레딧 단독 구매 섹션 통화 업데이트
      updateCreditPurchaseCurrency(currency, rate);

    } catch (error) {
      console.error('[Settings] 구독 패키지 가격 업데이트 실패:', error);
    }
  }

  /**
   * 개별 패키지 카드 가격 및 크레딧 업데이트
   * @param {Object} pkg - 패키지 정보 (API 응답 구조)
   *   - pkg.price: 통화 변환된 가격 문자열 (예: "₩18,000")
   *   - pkg.price_raw: 통화 변환된 가격 숫자 (예: 18000)
   *   - pkg.credits: { free, paid, bonus, total } 크레딧 정보
   *   - pkg.bonus: 보너스율 (%) (예: 3, 5, 7)
   */
  function updatePackageCardPrice(pkg) {
    // 패키지 ID에 따른 라디오 버튼 매핑
    // v5.0 (2025-12-11): 신규 패키지 ID (lite, standard, pro) 지원
    const idMap = {
      'only': 'sub-only',
      'lite': 'sub-lite',           // v5.0: plus10 → lite
      'standard': 'sub-standard',   // v5.0: plus30 → standard
      'pro': 'sub-pro',             // v5.0: plus60 → pro
      'max': 'sub-max',             // v7.0: plus90 → max
      // 하위 호환성: 기존 ID도 유지
      'plus10': 'sub-lite',
      'plus30': 'sub-standard',
      'plus60': 'sub-pro',
      'plus90': 'sub-max'
    };

    const radioId = idMap[pkg.id];
    if (!radioId) return;

    const radio = document.getElementById(radioId);
    if (!radio) return;

    const card = radio.closest('.package-card');
    if (!card) return;

    // 가격 표시 업데이트
    const priceEl = card.querySelector('.package-price');
    if (priceEl) {
      // 소수점이 있으면 표시, 없으면 정수로 표시
      const priceText = pkg.price;
      priceEl.innerHTML = `${priceText}<small data-i18n="perMonth">/월</small>`;
    }

    // v5.0 (2025-12-11): 기본 사용량, 보너스 사용량, 합계 표시
    if (pkg.credits && typeof pkg.credits === 'object') {
      // 기본 사용량 (paid = base_usage)
      const baseEl = card.querySelector('.credit-value-base');
      if (baseEl) {
        baseEl.textContent = _fmtN(pkg.credits.paid || 0);
      }

      // 보너스 사용량
      const bonusEl = card.querySelector('.credit-value-bonus');
      if (bonusEl) {
        bonusEl.textContent = _fmtN(pkg.credits.bonus || 0);
      }

      // 보너스율 표시 (API에서 bonus_rate 제공 시)
      const bonusRateEl = card.querySelector('.bonus-rate');
      if (bonusRateEl && pkg.bonus_rate !== undefined) {
        bonusRateEl.textContent = Math.round(pkg.bonus_rate * 100);
      }

      // 총 사용량
      const totalEl = card.querySelector('.credit-value-total');
      if (totalEl) {
        totalEl.textContent = _fmtN(pkg.credits.total || 0);
      }
    }

    // 라디오 버튼 값 업데이트 (결제 시 사용)
    radio.value = pkg.price_raw;

    // 패키지 타입을 data 속성으로 저장 (환율 변환된 값과 무관하게 패키지 식별)
    radio.dataset.packageType = pkg.id;
  }

  /**
   * 환율 정보 표시 업데이트
   * @param {string} currency - 통화 코드
   * @param {number} rate - 환율
   * @param {string} updatedAt - 마지막 업데이트 시간
   */
  function updateCurrencyInfo(currency, rate, updatedAt) {
    const currencyInfo = document.querySelector('.currency-info p');
    if (currencyInfo) {
      const updateTime = _fmtD(updatedAt, { dateStyle: 'short', timeStyle: 'short' });

      if (currency === 'USD') {
        currencyInfo.innerHTML = mmIcon('lightbulb', 14) + ' 환율은 서버에서 실시간으로 관리됩니다. 기준 통화: USD';
      } else {
        currencyInfo.innerHTML = mmIcon('lightbulb', 14) + ` 환율: 1 USD = ${_fmtN(rate)} ${currency} (${updateTime} 업데이트)`;
      }
    }
  }

  /**
   * 크레딧 단독 구매 섹션의 통화 업데이트
   * @param {string} currency - 통화 코드 (USD, KRW, JPY 등)
   * @param {number} rate - 환율 (USD 기준)
   */
  function updateCreditPurchaseCurrency(currency, rate) {
    // 통화 기호 매핑
    const currencySymbols = {
      'USD': '$',
      'KRW': '₩',
      'JPY': '¥',
      'EUR': '€',
      'GBP': '£',
      'CNY': '¥'
    };

    // 정수 통화 (소수점 없음)
    const integerCurrencies = ['KRW', 'JPY'];
    const isIntegerCurrency = integerCurrencies.includes(currency);

    // 통화별 입력 제한 (min, max, step, 기본값)
    // 소수점 통화: step=0.01, 정수 통화: step=1
    // defaultValue는 USD $10 환산값 (소수점 2자리)
    const defaultUSD10 = isIntegerCurrency ? Math.round(10 * (rate || 1)) : Math.round(10 * (rate || 1) * 100) / 100;
    const maxAmount = isIntegerCurrency ? Math.round(1000 * (rate || 1)) : Math.round(1000 * (rate || 1) * 100) / 100;

    const currencyLimits = {
      'USD': { min: 0.01, max: 1000, step: 0.01, defaultValue: 10.00 },
      'KRW': { min: 1, max: maxAmount, step: 1, defaultValue: defaultUSD10 },
      'JPY': { min: 1, max: maxAmount, step: 1, defaultValue: defaultUSD10 },
      'EUR': { min: 0.01, max: maxAmount, step: 0.01, defaultValue: defaultUSD10 },
      'GBP': { min: 0.01, max: maxAmount, step: 0.01, defaultValue: defaultUSD10 },
      'CNY': { min: 0.01, max: maxAmount, step: 0.01, defaultValue: defaultUSD10 }
    };

    const symbol = currencySymbols[currency] || currency + ' ';
    const limits = currencyLimits[currency] || currencyLimits['USD'];

    // 라벨 업데이트 (구매 금액 (USD) → 구매 금액 (KRW) 등)
    const currencyLabel = document.getElementById('creditPurchaseCurrencyLabel');
    if (currencyLabel) {
      currencyLabel.textContent = currency;
    }

    // 미리보기 라벨도 업데이트
    const previewCurrencyLabel = document.getElementById('previewCurrencyLabel');
    if (previewCurrencyLabel) {
      previewCurrencyLabel.textContent = currency;
    }

    // 통화 접두어 업데이트 ($ → ₩ 등)
    const currencyPrefix = document.getElementById('creditPurchaseCurrencyPrefix');
    if (currencyPrefix) {
      currencyPrefix.textContent = symbol;
    }

    // 입력 필드의 min/max/step/value 업데이트
    const creditAmountInput = document.getElementById('creditAmount');
    if (creditAmountInput) {
      creditAmountInput.min = limits.min;
      creditAmountInput.max = limits.max;
      creditAmountInput.step = limits.step;
      // 현재 값이 새 범위를 벗어나면 기본값으로 설정
      const currentValue = parseFloat(creditAmountInput.value) || 0;
      if (currentValue < limits.min || currentValue > limits.max) {
        creditAmountInput.value = isIntegerCurrency ? limits.defaultValue : limits.defaultValue.toFixed(2);
      }
    }

    // 현재 환율 저장 (금액 계산용)
    window.currentCreditPurchaseRate = rate || 1;
    window.currentCreditPurchaseCurrency = currency;

    // 빠른 선택 프리셋 라벨 업데이트 (USD 기준 $1, $10, $30, $60을 현재 통화로 환산)
    // 보너스 기준 금액($10, $30, $60)은 역환산 시 기준 미달이면 보정
    // USD는 기준 통화이므로 보정 불필요
    const presetAmounts = [1, 10, 30, 60];
    const bonusThresholds = [10, 30, 60]; // 보너스 기준 금액들 (USD)
    let defaultPresetAmount = null; // $10 환산 금액 (기본 선택용)
    let minPresetAmount = null; // $1 환산 금액 (최소 주문용)
    presetAmounts.forEach((usdAmount) => {
      const presetLabel = document.getElementById(`preset${usdAmount}`);
      const presetRadio = document.querySelector(`input[name="quickAmount"][data-usd="${usdAmount}"]`);
      if (presetLabel && presetRadio) {
        let localAmount;
        let displayAmount;
        const isBonusThreshold = bonusThresholds.includes(usdAmount);

        if (isIntegerCurrency) {
          // 정수 통화 (KRW, JPY)
          localAmount = Math.round(usdAmount * (rate || 1));
          // 보너스 기준 금액이고 USD가 아닌 경우 보정 확인
          if (isBonusThreshold && currency !== 'USD') {
            // 역환산해서 기준 미달이면 1씩 증가시켜 기준 충족하는 최소값 찾기
            let reversedUsd = localAmount / rate;
            // 부동소수점 오차를 고려하여 약간의 여유를 둔 비교 (1e-9)
            while (reversedUsd < usdAmount - 1e-9) {
              localAmount = localAmount + 1;
              reversedUsd = localAmount / rate;
            }
          }
          displayAmount = _fmtN(localAmount);
        } else {
          // 소수점 통화 (EUR, GBP, CNY)
          localAmount = Math.round(usdAmount * (rate || 1) * 100) / 100;
          // USD가 아닌 경우에만 보정 확인
          if (isBonusThreshold && currency !== 'USD') {
            // 역환산해서 기준 미달이면 0.01씩 증가시켜 기준 충족하는 최소값 찾기
            let reversedUsd = localAmount / rate;
            // 부동소수점 오차를 고려하여 약간의 여유를 둔 비교 (1e-9)
            while (reversedUsd < usdAmount - 1e-9) {
              localAmount = Math.round((localAmount + 0.01) * 100) / 100;
              reversedUsd = localAmount / rate;
            }
          }
          displayAmount = localAmount.toFixed(2);
        }
        presetLabel.textContent = `${symbol}${displayAmount}`;
        presetRadio.value = localAmount;
        // $1 프리셋 금액 저장 (최소 주문 금액)
        if (usdAmount === 1) {
          minPresetAmount = localAmount;
          // 최소 주문 금액을 전역에 저장
          window.minCreditPurchaseAmount = localAmount;
        }
        // $10 프리셋 금액 저장 (기본 선택)
        if (usdAmount === 10) {
          defaultPresetAmount = localAmount;
        }
      }
    });

    // 입력 필드에 $10 프리셋 금액 설정 및 해당 라디오 버튼 선택 (기본 선택은 $10)
    if (defaultPresetAmount !== null && creditAmountInput) {
      creditAmountInput.value = isIntegerCurrency ? defaultPresetAmount : defaultPresetAmount.toFixed(2);
      const defaultRadio = document.querySelector('input[name="quickAmount"][data-usd="10"]');
      if (defaultRadio) {
        defaultRadio.checked = true;
        // 초기화 시에도 환율 변환 로직 사용 (구독 패키지와 일관성 유지)
        // selectedPresetUSD를 null로 설정하여 환율 기반 계산 사용
        window.selectedPresetUSD = null;
      }
    }

    console.log(`[Settings] 크레딧 구매 통화 업데이트: ${currency} (환율: ${rate}, min: ${limits.min}, max: ${limits.max}, step: ${limits.step})`);

    // 통화 변경 시 크레딧 미리보기도 즉시 업데이트 (전역 함수 호출)
    if (typeof window.updateCreditPreview === 'function') {
      window.updateCreditPreview();
    }
  }

  /**
   * 페이지 초기화 시 현재 통화 설정에 따른 가격 로드
   */
  async function initSubscriptionPrices() {
    const currencySelect = document.getElementById('paymentCurrency');
    if (currencySelect) {
      const currentCurrency = currencySelect.value || 'USD';
      await updateSubscriptionPackagePrices(currentCurrency);
    }
  }

  // 전역 객체에 노출
  window.MyMind3AISettings = {
    getAISettings,
    getServiceAPIKey,
    loadCreditBalance,
    loadUsageStats,
    updateSubscriptionPackagePrices,
    updateAllPaymentOptionStates,
    loadUserCreditBalance,
    // 직접 userCreditBalance 설정 함수
    setUserCreditBalance: function(balance) {
      userCreditBalance = balance;
    }
  };

  // AI 설정 초기화 함수 (외부 호출용)
  async function initAllAISettings() {
    await initAISettings();
    await initSubscriptionPrices();
  }

  // 외부에서 호출 가능한 AI 설정 초기화 함수 (레이어 팝업용)
  // 주의: 자체 초기화(DOMContentLoaded)를 제거함 - initSettingsAll()이 처리
  // settings-popup.js → initSettingsAll() → initSettingsAI() 경로만 사용
  window.initSettingsAI = initAllAISettings;
})();
