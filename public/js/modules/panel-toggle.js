/**
 * 패널 토글 모듈
 * @module modules/panel-toggle
 * @description 3패널 레이아웃의 토글 버튼 기능
 */

/**
 * 패널 토글 설정
 */
function setupExactMyMind2Toggles() {
  const toggleSidebar = document.getElementById('toggleSidebar');
  const toggleContent = document.getElementById('toggleContent');
  const toggleResponse = document.getElementById('toggleResponse');

  const toggleSidebar2 = document.getElementById('toggleSidebar2');
  const toggleContent2 = document.getElementById('toggleContent2');
  const toggleResponse2 = document.getElementById('toggleResponse2');

  const toggleSidebar3 = document.getElementById('toggleSidebar3');
  const toggleContent3 = document.getElementById('toggleContent3');
  const toggleResponse3 = document.getElementById('toggleResponse3');

  if (toggleSidebar) {
    toggleSidebar.addEventListener('click', (e) => togglePanel('sidebar', e.currentTarget));
  }
  if (toggleContent) {
    toggleContent.addEventListener('click', (e) => togglePanel('content', e.currentTarget));
  }
  if (toggleResponse) {
    toggleResponse.addEventListener('click', (e) => togglePanel('llm-response', e.currentTarget));
  }
  if (toggleSidebar2) {
    toggleSidebar2.addEventListener('click', (e) => togglePanel('sidebar', e.currentTarget));
  }
  if (toggleContent2) {
    toggleContent2.addEventListener('click', (e) => togglePanel('content', e.currentTarget));
  }
  if (toggleResponse2) {
    toggleResponse2.addEventListener('click', (e) => togglePanel('llm-response', e.currentTarget));
  }
  if (toggleSidebar3) {
    toggleSidebar3.addEventListener('click', (e) => togglePanel('sidebar', e.currentTarget));
  }
  if (toggleContent3) {
    toggleContent3.addEventListener('click', (e) => togglePanel('content', e.currentTarget));
  }
  if (toggleResponse3) {
    toggleResponse3.addEventListener('click', (e) => togglePanel('llm-response', e.currentTarget));
  }
}

/**
 * 패널 토글
 * @param {string} panelName - 토글할 패널 이름 ('sidebar', 'content', 'llm-response')
 * @param {HTMLElement} clickedButton - 클릭된 버튼 요소
 */
function togglePanel(panelName, clickedButton) {
  const sidebar = document.querySelector('.sidebar');
  const content = document.querySelector('.content');
  const llmResponse = document.querySelector('.llm-response');

  if (!sidebar || !content || !llmResponse) return;

  // 현재 계산된 너비 가져오기
  const sidebarWidth = parseFloat(getComputedStyle(sidebar).width);
  const contentWidth = parseFloat(getComputedStyle(content).width);
  const llmResponseWidth = parseFloat(getComputedStyle(llmResponse).width);
  const containerWidth = document.querySelector('.main').offsetWidth;

  const sidebarPercent = (sidebarWidth / containerWidth) * 100;
  const contentPercent = (contentWidth / containerWidth) * 100;
  const llmResponsePercent = (llmResponseWidth / containerWidth) * 100;

  if (panelName === 'sidebar') {
    if (sidebarPercent < 10) {
      // 사이드바 복원
      sidebar.style.width = '34%';
      content.style.width = '33%';
      llmResponse.style.width = '33%';
      if (window.panelHiddenState) window.panelHiddenState.left = false;
    } else {
      // 사이드바 최소화
      sidebar.style.width = '0%';
      content.style.width = '50%';
      llmResponse.style.width = '50%';
      if (window.panelHiddenState) window.panelHiddenState.left = true;
    }
  } else if (panelName === 'content') {
    if (contentPercent < 10) {
      // 콘텐츠 복원
      sidebar.style.width = '34%';
      content.style.width = '33%';
      llmResponse.style.width = '33%';
      if (window.panelHiddenState) window.panelHiddenState.middle = false;
    } else {
      // 콘텐츠 최소화
      sidebar.style.width = '50%';
      content.style.width = '0%';
      llmResponse.style.width = '50%';
      if (window.panelHiddenState) window.panelHiddenState.middle = true;
    }
  } else if (panelName === 'llm-response') {
    if (llmResponsePercent < 10) {
      // LLM 응답 복원
      sidebar.style.width = '34%';
      content.style.width = '33%';
      llmResponse.style.width = '33%';
      if (window.panelHiddenState) window.panelHiddenState.right = false;
    } else {
      // LLM 응답 최소화
      sidebar.style.width = '50%';
      content.style.width = '50%';
      llmResponse.style.width = '0%';
      if (window.panelHiddenState) window.panelHiddenState.right = true;
    }
  }

  // 현재 상태 기반으로 모든 패널 버튼 업데이트
  updateToggleButtonColors();

  // 패널 토글 완료 후 에디터 프리뷰 영역 갱신
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
    if (window.MyMind3Editor && window.MyMind3Editor.refreshPreviewSize) {
      window.MyMind3Editor.refreshPreviewSize();
      console.log('[Panel Toggle] Preview size refreshed');
    }
  }, 50);
}

/**
 * 토글 버튼 색상 업데이트
 */
function updateToggleButtonColors() {
  const sidebar = document.querySelector('.sidebar');
  const content = document.querySelector('.content');
  const llmResponse = document.querySelector('.llm-response');

  if (!sidebar || !content || !llmResponse) {
    console.warn('Panel elements not found');
    return;
  }

  const containerWidth = document.querySelector('.main').offsetWidth;

  const sidebarWidth = parseFloat(getComputedStyle(sidebar).width);
  const contentWidth = parseFloat(getComputedStyle(content).width);
  const llmResponseWidth = parseFloat(getComputedStyle(llmResponse).width);

  const sidebarVisible = (sidebarWidth / containerWidth) > 0.1;
  const contentVisible = (contentWidth / containerWidth) > 0.1;
  const llmResponseVisible = (llmResponseWidth / containerWidth) > 0.1;

  // 모든 토글 버튼 가져오기
  const sidebarButtons = [
    document.getElementById('toggleSidebar'),
    document.getElementById('toggleSidebar2'),
    document.getElementById('toggleSidebar3')
  ];
  const contentButtons = [
    document.getElementById('toggleContent'),
    document.getElementById('toggleContent2'),
    document.getElementById('toggleContent3')
  ];
  const responseButtons = [
    document.getElementById('toggleResponse'),
    document.getElementById('toggleResponse2'),
    document.getElementById('toggleResponse3')
  ];

  // 사이드바 컨트롤 버튼 업데이트 - CSS 클래스 기반
  sidebarButtons.forEach(btn => {
    if (btn) {
      // 인라인 스타일 제거 (CSS 스타일 사용)
      btn.style.removeProperty('background-color');
      btn.style.removeProperty('color');
      // 패널 숨김 상태 클래스 토글
      btn.classList.toggle('panel-hidden', !sidebarVisible);
    }
  });

  // 콘텐츠 컨트롤 버튼 업데이트 - CSS 클래스 기반
  contentButtons.forEach(btn => {
    if (btn) {
      btn.style.removeProperty('background-color');
      btn.style.removeProperty('color');
      btn.classList.toggle('panel-hidden', !contentVisible);
    }
  });

  // 응답 패널 컨트롤 버튼 업데이트 - CSS 클래스 기반
  responseButtons.forEach(btn => {
    if (btn) {
      btn.style.removeProperty('background-color');
      btn.style.removeProperty('color');
      btn.classList.toggle('panel-hidden', !llmResponseVisible);
    }
  });
}

// 전역 접근 가능하도록 등록
window.setupExactMyMind2Toggles = setupExactMyMind2Toggles;
window.togglePanel = togglePanel;
window.updateToggleButtonColors = updateToggleButtonColors;

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setupExactMyMind2Toggles, togglePanel, updateToggleButtonColors };
}
