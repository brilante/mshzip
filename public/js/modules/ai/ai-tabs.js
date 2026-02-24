/**
 * ============================================
 * ai-tabs.js - AI 탭 UI 관리 모듈
 * ============================================
 * AI 서비스 탭 생성, 전환, 상태 업데이트 담당
 * ============================================
 */

(function() {
  'use strict';

  // AI 모델 표시명 변환 (짧은 형식)
  function getShortModelName(modelId) {
    if (!modelId) return '';

    // 모델 ID에서 표시용 짧은 이름 추출
    const modelMappings = {
      // GPT
      'gpt-5': 'GPT-5',
      'gpt-5-mini': 'GPT-5 Mini',
      'gpt-4.1': 'GPT-4.1',
      'gpt-4.1-mini': 'GPT-4.1 Mini',
      'gpt-4.1-nano': 'GPT-4.1 Nano',
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'o3': 'o3',
      'o3-mini': 'o3 Mini',
      // Grok
      'grok-4': 'Grok-4',
      'grok-3': 'Grok-3',
      'grok-2': 'Grok-2',
      'grok-2-mini': 'Grok-2 Mini',
      // Claude
      'claude-opus-4': 'Opus 4',
      'claude-sonnet-4': 'Sonnet 4',
      'claude-sonnet-4.5': 'Sonnet 4.5',
      'claude-haiku-4': 'Haiku 4',
      // Gemini
      'gemini-2.5-pro': '2.5 Pro',
      'gemini-2.5-flash': '2.5 Flash',
      'gemini-2.0-pro': '2.0 Pro',
      'gemini-2.0-flash': '2.0 Flash',
      // Local
      'local': 'Local'
    };

    return modelMappings[modelId] || modelId;
  }

  // 활성화된 AI 서비스 목록 가져오기
  function getEnabledAIServices() {
    const aiSettings = JSON.parse(localStorage.getItem('mymind3_ai_settings') || '{}');
    const defaultService = aiSettings.defaultService || 'gpt';
    const services = aiSettings.services || {};

    const enabledServices = [];
    const allServices = ['gpt', 'grok', 'claude', 'gemini', 'local'];

    allServices.forEach(service => {
      // 기본 서비스는 항상 활성화
      if (service === defaultService) {
        enabledServices.push({
          service: service,
          model: services[service]?.model || '',
          isDefault: true
        });
      } else if (services[service]?.enabled) {
        enabledServices.push({
          service: service,
          model: services[service]?.model || '',
          isDefault: false
        });
      }
    });

    // 기본 서비스를 맨 앞으로 정렬
    enabledServices.sort((a, b) => {
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return 0;
    });

    return enabledServices;
  }

  // AI 서비스 표시 이름
  function getAIDisplayName(service) {
    const names = {
      evaluate: window.i18n?.evaluate || '평가',
      gpt: 'GPT',
      grok: 'Grok',
      claude: 'Claude',
      gemini: 'Gemini',
      local: 'Local AI'
    };
    return names[service] || service.toUpperCase();
  }

  /**
   * 모드에 따라 AI 탭 표시 업데이트
   * - 단일 모드: 현재 선택된 AI 서비스 탭만 표시
   * - 다중 모드: 활성화된 모든 AI 서비스 탭 표시
   */
  function updateAITabsForMode() {
    const aiTabBar = document.getElementById('aiTabBar');
    if (!aiTabBar) return;

    const isMultiSelect = window.MyMindAI?.multiSelectMode === true;
    const enabledServices = getEnabledAIServices();
    const currentService = window.MyMindAI?.currentService || 'gpt';

    if (enabledServices.length === 0) {
      aiTabBar.innerHTML = '';
      return;
    }

    // 단일 모드: 현재 선택된 서비스만 포함, 다중 모드: 모든 활성화된 서비스 포함
    const servicesToShow = isMultiSelect
      ? enabledServices
      : enabledServices.filter(item => item.service === currentService);

    // 현재 서비스가 없으면 기본 서비스 추가
    if (servicesToShow.length === 0 && enabledServices.length > 0) {
      const defaultService = enabledServices.find(s => s.isDefault) || enabledServices[0];
      servicesToShow.push(defaultService);
    }

    // 다중선택 모드일 때 "평가" 탭을 가장 앞에 추가
    // 평가 탭은 기본 AI 서비스 설정과 연동됨
    let evaluateTabHTML = '';
    if (isMultiSelect) {
      const isEvaluateActive = currentService === 'evaluate';
      // 기본 AI 서비스 정보 가져오기
      const defaultAI = enabledServices.find(s => s.isDefault) || enabledServices[0];
      const defaultServiceName = defaultAI ? getAIDisplayName(defaultAI.service) : '';
      const defaultModelName = defaultAI ? getShortModelName(defaultAI.model) : '';
      // 평가(GPT5.2) 형식으로 표시
      const evaluateLabel = defaultModelName
        ? `${window.i18n?.evaluate || '평가'}(${defaultModelName})`
        : `${window.i18n?.evaluate || '평가'}(${defaultServiceName})`;
      evaluateTabHTML = `
        <div class="ai-tab ${isEvaluateActive ? 'active' : ''}" data-service="evaluate" data-default-service="${defaultAI?.service || 'gpt'}" data-default-model="${defaultAI?.model || ''}">
          <span class="tab-label">${evaluateLabel}</span>
          <span class="tab-status"></span>
        </div>
      `;
    }

    // 탭 HTML 생성 (아이콘 없이 서비스명과 모델명만 표시)
    const tabsHTML = servicesToShow.map(item => {
      const serviceName = getAIDisplayName(item.service);
      const modelName = getShortModelName(item.model);
      const isActive = item.service === currentService || item.isDefault;
      const tabLabel = modelName ? `${serviceName} (${modelName})` : serviceName;

      return `
        <div class="ai-tab ${isActive ? 'active' : ''}" data-service="${item.service}" ${item.isDefault ? 'data-default="true"' : ''}>
          <span class="tab-label">${tabLabel}</span>
          <span class="tab-status"></span>
        </div>
      `;
    }).join('');

    // 다중선택 모드: 평가 탭을 맨 앞에 배치
    aiTabBar.innerHTML = evaluateTabHTML + tabsHTML;

    // 탭 클릭 이벤트 다시 등록
    setupAITabListeners();

    // 현재 서비스의 응답 컨테이너 표시
    const activeService = servicesToShow.find(s => s.service === currentService)?.service ||
                         servicesToShow[0]?.service || 'gpt';
    switchAITab(activeService);

    console.log('[AI Tab] Updated tabs for mode:', isMultiSelect ? 'multi' : 'single', servicesToShow.map(s => s.service));
  }

  function updateAITabs() {
    // updateAITabsForMode로 위임 (호환성 유지)
    updateAITabsForMode();
  }

  // 기존 함수 유지 (호환성)
  function updateDefaultAITab() {
    updateAITabsForMode();
  }

  // 탭 클릭 이벤트 설정
  function setupAITabListeners() {
    const aiTabBar = document.getElementById('aiTabBar');
    if (!aiTabBar) return;

    const tabs = aiTabBar.querySelectorAll('.ai-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', function () {
        const service = this.dataset.service;
        switchAITab(service);
      });
    });
  }

  // AI 탭 전환
  function switchAITab(service) {
    const aiTabBar = document.getElementById('aiTabBar');
    if (!aiTabBar) return;

    // 탭 활성화 상태 변경
    const tabs = aiTabBar.querySelectorAll('.ai-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.service === service);
    });

    // 응답 컨테이너 표시/숨김
    const containers = document.querySelectorAll('.ai-response-container');
    containers.forEach(container => {
      container.style.display = container.dataset.service === service ? 'block' : 'none';
    });

    window.MyMindAI.activeTab = service;
    console.log('[AI Tab] Switched to:', service);
  }

  // 탭 상태 업데이트 (로딩, 성공, 에러)
  function updateAITabStatus(service, status) {
    const aiTabBar = document.getElementById('aiTabBar');
    if (!aiTabBar) return;

    const tab = aiTabBar.querySelector(`.ai-tab[data-service="${service}"]`);
    if (!tab) return;

    // 모든 상태 클래스 제거
    tab.classList.remove('loading', 'success', 'error');

    // 새 상태 클래스 추가
    if (status) {
      tab.classList.add(status);
    }
  }

  // 응답 컨테이너에 로딩 스피너 표시
  function showAILoadingSpinner(service) {
    const container = document.getElementById(`${service}Response`);
    if (!container) return;

    container.innerHTML = `
      <div class="ai-loading-spinner">
        <div class="spinner"></div>
        <span class="loading-text">${getAIDisplayName(service)} 응답 대기 중...</span>
      </div>
    `;
  }

  // 응답 컨테이너에 에러 메시지 표시
  function showAIErrorMessage(service, errorMessage) {
    const container = document.getElementById(`${service}Response`);
    if (!container) return;

    container.innerHTML = `
      <div class="ai-error-message">
        <div class="error-title">${getAIDisplayName(service)} 에러</div>
        <div class="error-detail">${errorMessage}</div>
      </div>
    `;
  }

  // 키보드 내비게이션 설정
  function setupKeyboardNavigation() {
    const serviceKeys = ['gpt', 'grok', 'claude', 'gemini', 'local'];

    document.addEventListener('keydown', function(e) {
      // Ctrl+1~5로 탭 전환 (다중 AI 모드일 때만)
      if (e.ctrlKey && !e.shiftKey && !e.altKey && window.MyMindAI?.multiSelectMode) {
        const keyNum = parseInt(e.key);
        if (keyNum >= 1 && keyNum <= 5) {
          e.preventDefault();
          const service = serviceKeys[keyNum - 1];
          const tab = document.querySelector(`.ai-tab[data-service="${service}"]`);
          if (tab) {
            switchAITab(service);
            tab.focus();
          }
        }
      }
    });

    // 탭에 tabindex 추가 (키보드 포커스 가능하게)
    const tabs = document.querySelectorAll('.ai-tab');
    tabs.forEach((tab, index) => {
      tab.setAttribute('tabindex', '0');
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', tab.classList.contains('active'));
      tab.setAttribute('data-shortcut', `Ctrl+${index + 1}`);

      // Enter/Space로 탭 선택
      tab.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          switchAITab(tab.dataset.service);
        }
        // 좌우 화살표로 탭 이동
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const allTabs = Array.from(document.querySelectorAll('.ai-tab'));
          const currentIndex = allTabs.indexOf(tab);
          let newIndex;
          if (e.key === 'ArrowRight') {
            newIndex = (currentIndex + 1) % allTabs.length;
          } else {
            newIndex = (currentIndex - 1 + allTabs.length) % allTabs.length;
          }
          allTabs[newIndex].focus();
          switchAITab(allTabs[newIndex].dataset.service);
        }
      });
    });

    // 탭 바에 ARIA 역할 추가
    const tabBar = document.getElementById('aiTabBar');
    if (tabBar) {
      tabBar.setAttribute('role', 'tablist');
      tabBar.setAttribute('aria-label', 'AI 서비스 탭');
    }
  }

  // 전역 함수 노출
  window.getShortModelName = getShortModelName;
  window.getEnabledAIServices = getEnabledAIServices;
  window.getAIDisplayName = getAIDisplayName;
  window.updateAITabsForMode = updateAITabsForMode;
  window.updateAITabs = updateAITabs;
  window.updateDefaultAITab = updateDefaultAITab;
  window.setupAITabListeners = setupAITabListeners;
  window.switchAITab = switchAITab;
  window.updateAITabStatus = updateAITabStatus;
  window.showAILoadingSpinner = showAILoadingSpinner;
  window.showAIErrorMessage = showAIErrorMessage;
  window.setupKeyboardNavigation = setupKeyboardNavigation;

  console.log('[Module] ai-tabs.js loaded');
})();
