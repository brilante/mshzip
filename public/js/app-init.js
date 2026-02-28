    /**
     * ============================================
     * app-init.js - Phase 5-1 모듈화 적용
     * ============================================
     * 분리된 모듈: toast.js, environment.js, panel-resize.js,
     *             panel-toggle.js, editor-setup.js, keyboard.js
     * ============================================
     */

    // 토스트 알림 함수 (모듈에서 로드되지 않은 경우에만 정의)
    if (typeof window.showToast !== 'function') {
      function showToast(message, type = 'success', duration = 3000) {
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
          toast.classList.remove('show');
          setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
          }, 300);
        }, duration);
      }
      window.showToast = showToast;
    }

    // 환경 배지 로드 (모듈에서 로드되지 않은 경우에만 정의)
    if (typeof window.loadEnvironmentBadge !== 'function') {
      async function loadEnvironmentBadge() {
        try {
          // ApiCache 사용 (중복 호출 방지)
          const response = window.ApiCache
            ? await window.ApiCache.fetch('/api/config/info')
            : await fetch('/api/config/info');

          // response.ok 체크 추가
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: 환경 정보 로드 실패`);
          }

          const data = await response.json();

          if (data.success && data.config && data.config.environment) {
            const env = data.config.environment;
            const badge = document.getElementById('envBadge');

            if (badge) {
              const envConfig = {
                local: { text: '[로컬]', class: 'env-local' },
                development: { text: '[개발]', class: 'env-development' },
                production: { text: '[운영]', class: 'env-production' }
              };

              const config = envConfig[env] || envConfig.local;
              badge.textContent = config.text;
              badge.className = `env-badge ${config.class}`;
              badge.style.display = 'inline-block';

              console.log(`[Environment] 현재 환경: ${env}`);
            }
          }
        } catch (error) {
          console.error('[Environment] 환경 정보 로드 실패:', error);
        }
      }
      window.loadEnvironmentBadge = loadEnvironmentBadge;
    }

    document.addEventListener('DOMContentLoaded', function () {
      console.log('Initializing MyMind3 with EXACT MyMind2 Layout...');

      // 환경 배지 로드 (모듈 또는 로컬 함수 사용)
      if (typeof window.loadEnvironmentBadge === 'function') {
        window.loadEnvironmentBadge();
      }

      // 언어 변경 후 리로드된 경우 설정 페이지로 자동 이동
      const returnToSettings = localStorage.getItem('mymind3_return_to_settings');
      if (returnToSettings) {
        localStorage.removeItem('mymind3_return_to_settings');
        // 페이지 초기화 후 설정 팝업 열기
        setTimeout(() => {
          if (typeof showSettingsLayerPopup === 'function') {
            showSettingsLayerPopup('#basic');
          }
        }, 500);
      }

      // Initialize the application exactly like MyMind2
      if (window.MyMind3 && window.MyMind3.MindMapData) {
        window.MyMind3.MindMapData.initialize();
      }

      if (window.MyMind3 && window.MyMind3.NodeRenderer) {
        window.MyMind3.NodeRenderer.initialize();
        window.MyMind3.NodeRenderer.renderMindMap();
      }

      // Setup panel resizing (모듈 또는 로컬 함수 사용)
      if (typeof window.setupExactMyMind2Resizing === 'function') {
        window.setupExactMyMind2Resizing();
      }

      // Setup panel toggles (모듈 또는 로컬 함수 사용)
      if (typeof window.setupExactMyMind2Toggles === 'function') {
        window.setupExactMyMind2Toggles();
      }

      // Setup editor functionality (모듈 또는 로컬 함수 사용)
      if (typeof window.setupExactMyMind2Editor === 'function') {
        window.setupExactMyMind2Editor();
      }

      // Setup buttons exactly like MyMind2
      setupExactMyMind2Buttons();

      // Setup keyboard shortcuts (모듈 또는 로컬 함수 사용)
      if (typeof window.setupKeyboardShortcuts === 'function') {
        window.setupKeyboardShortcuts();
      }

      // Setup GPT AI functionality
      setupGPTFeatures();

      // 초기 버튼 상태 업데이트 (단일 RAF로 통합 - 불필요한 setTimeout 4개 제거)
      requestAnimationFrame(() => {
        if (typeof window.updateMainAddButtonState === 'function') {
          window.updateMainAddButtonState();
        }
        if (typeof window.updateSaveButtonState === 'function') {
          window.updateSaveButtonState();
        }
        if (typeof window.updateTreeGenButtonState === 'function') {
          window.updateTreeGenButtonState();
        }
        if (typeof window.updateResponsePanelButtonState === 'function') {
          window.updateResponsePanelButtonState();
        }
      });

      // Setup Settings layer popup
      setupSettingsLayerPopup();

      // 세션 확인은 auth-check.js에서 처리 (중복 호출 제거)
      // checkSession();

      console.log('MyMind3 with EXACT MyMind2 Layout initialized');
    });

    function setupExactMyMind2Resizing() {
      const leftPanel = document.getElementById('leftPanel');
      const middlePanel = document.getElementById('middlePanel');
      const rightPanel = document.getElementById('rightPanel');
      const divider1 = document.getElementById('divider1');
      const divider2 = document.getElementById('divider2');

      let isResizing = false;
      let currentDivider = null;
      let resizeStartX = 0;
      let resizeStartWidth = 0;
      let resizeNextStartWidth = 0;
      let resizeMinWidth = 0;

      window.panelHiddenState = {
        left: false,
        middle: false,
        right: false
      };

      function startResize(e, divider) {
        const totalWidth = document.body.offsetWidth;
        const leftWidth = leftPanel.offsetWidth;
        const middleWidth = middlePanel.offsetWidth;
        const rightWidth = rightPanel.offsetWidth;

        window.panelHiddenState.left = (leftWidth / totalWidth) < 0.05;
        window.panelHiddenState.middle = (middleWidth / totalWidth) < 0.05;
        window.panelHiddenState.right = (rightWidth / totalWidth) < 0.05;

        isResizing = true;
        currentDivider = divider;
        resizeStartX = e.clientX;
        resizeMinWidth = totalWidth * 0.1;

        if (window.panelHiddenState.middle) {
          resizeStartWidth = leftPanel.offsetWidth;
          resizeNextStartWidth = rightPanel.offsetWidth;
        } else {
          if (divider === divider1) {
            resizeStartWidth = leftPanel.offsetWidth;
            resizeNextStartWidth = middlePanel.offsetWidth;
          } else {
            resizeStartWidth = middlePanel.offsetWidth;
            resizeNextStartWidth = rightPanel.offsetWidth;
          }
        }

        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        divider.classList.add('active');
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
      }

      function resize(e) {
        if (!isResizing) return;
        const dx = e.clientX - resizeStartX;
        const totalWidth = document.body.offsetWidth;

        if (window.panelHiddenState.middle) {
          let newLeftWidth = Math.max(resizeMinWidth, resizeStartWidth + dx);
          let newRightWidth = Math.max(resizeMinWidth, resizeNextStartWidth - dx);
          if (newLeftWidth + newRightWidth > totalWidth) {
            newLeftWidth = totalWidth - resizeMinWidth;
            newRightWidth = resizeMinWidth;
          }
          leftPanel.style.width = newLeftWidth + 'px';
          rightPanel.style.width = newRightWidth + 'px';
        } else {
          if (currentDivider === divider1) {
            let newLeftWidth = Math.max(resizeMinWidth, resizeStartWidth + dx);
            let newMiddleWidth = Math.max(resizeMinWidth, resizeNextStartWidth - dx);
            if (newLeftWidth + newMiddleWidth > totalWidth - rightPanel.offsetWidth) {
              newLeftWidth = totalWidth - rightPanel.offsetWidth - resizeMinWidth;
              newMiddleWidth = resizeMinWidth;
            }
            leftPanel.style.width = newLeftWidth + 'px';
            middlePanel.style.width = newMiddleWidth + 'px';
          } else if (currentDivider === divider2) {
            let newMiddleWidth = Math.max(resizeMinWidth, resizeStartWidth + dx);
            let newRightWidth = Math.max(resizeMinWidth, resizeNextStartWidth - dx);
            if (newMiddleWidth + newRightWidth > totalWidth - leftPanel.offsetWidth) {
              newMiddleWidth = totalWidth - leftPanel.offsetWidth - resizeMinWidth;
              newRightWidth = resizeMinWidth;
            }
            middlePanel.style.width = newMiddleWidth + 'px';
            rightPanel.style.width = newRightWidth + 'px';
          }
        }
      }

      function stopResize() {
        isResizing = false;
        if (currentDivider) currentDivider.classList.remove('active');
        document.body.style.cursor = '';
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);

        // 패널 리사이즈 완료 후 에디터 프리뷰 영역 갱신
        setTimeout(() => {
          // Window resize 이벤트 트리거하여 TOAST UI Editor가 리사이즈 감지하도록 함
          window.dispatchEvent(new Event('resize'));

          // 프리뷰 탭이 활성화되어 있으면 커스텀 프리뷰 강제 갱신
          if (window.MyMind3Editor && window.MyMind3Editor.refreshPreviewSize) {
            window.MyMind3Editor.refreshPreviewSize();
            console.log('[Panel Resize] Preview size refreshed');
          }
        }, 50);
      }

      divider1.addEventListener('mousedown', (e) => startResize(e, divider1));
      divider2.addEventListener('mousedown', (e) => startResize(e, divider2));
    }

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

      toggleSidebar.addEventListener('click', (e) => {
        togglePanel('sidebar', e.currentTarget);
      });

      toggleContent.addEventListener('click', (e) => {
        togglePanel('content', e.currentTarget);
      });

      toggleResponse.addEventListener('click', (e) => {
        togglePanel('llm-response', e.currentTarget);
      });

      toggleSidebar2.addEventListener('click', (e) => {
        togglePanel('sidebar', e.currentTarget);
      });

      toggleContent2.addEventListener('click', (e) => {
        togglePanel('content', e.currentTarget);
      });

      toggleResponse2.addEventListener('click', (e) => {
        togglePanel('llm-response', e.currentTarget);
      });

      toggleSidebar3.addEventListener('click', (e) => {
        togglePanel('sidebar', e.currentTarget);
      });

      toggleContent3.addEventListener('click', (e) => {
        togglePanel('content', e.currentTarget);
      });

      toggleResponse3.addEventListener('click', (e) => {
        togglePanel('llm-response', e.currentTarget);
      });

      function togglePanel(panelName, clickedButton) {
        const sidebar = document.querySelector('.sidebar');
        const content = document.querySelector('.content');
        const llmResponse = document.querySelector('.llm-response');

        // Get current computed widths
        const sidebarWidth = parseFloat(getComputedStyle(sidebar).width);
        const contentWidth = parseFloat(getComputedStyle(content).width);
        const llmResponseWidth = parseFloat(getComputedStyle(llmResponse).width);
        const containerWidth = document.querySelector('.main').offsetWidth;

        const sidebarPercent = (sidebarWidth / containerWidth) * 100;
        const contentPercent = (contentWidth / containerWidth) * 100;
        const llmResponsePercent = (llmResponseWidth / containerWidth) * 100;

        if (panelName === 'sidebar') {
          if (sidebarPercent < 10) {
            // Restore sidebar
            sidebar.style.width = '34%';
            content.style.width = '33%';
            llmResponse.style.width = '33%';
            if (window.panelHiddenState) window.panelHiddenState.left = false;
          } else {
            // Minimize sidebar
            sidebar.style.width = '0%';
            content.style.width = '50%';
            llmResponse.style.width = '50%';
            if (window.panelHiddenState) window.panelHiddenState.left = true;
          }
        } else if (panelName === 'content') {
          if (contentPercent < 10) {
            // Restore content
            sidebar.style.width = '34%';
            content.style.width = '33%';
            llmResponse.style.width = '33%';
            if (window.panelHiddenState) window.panelHiddenState.middle = false;
          } else {
            // Minimize content
            sidebar.style.width = '50%';
            content.style.width = '0%';
            llmResponse.style.width = '50%';
            if (window.panelHiddenState) window.panelHiddenState.middle = true;
          }
        } else if (panelName === 'llm-response') {
          if (llmResponsePercent < 10) {
            // Restore llm-response
            sidebar.style.width = '34%';
            content.style.width = '33%';
            llmResponse.style.width = '33%';
            if (window.panelHiddenState) window.panelHiddenState.right = false;
          } else {
            // Minimize llm-response
            sidebar.style.width = '50%';
            content.style.width = '50%';
            llmResponse.style.width = '0%';
            if (window.panelHiddenState) window.panelHiddenState.right = true;
          }
        }

        // Update all panel buttons based on current state
        const finalSidebarWidth = parseFloat(getComputedStyle(sidebar).width);
        const finalContentWidth = parseFloat(getComputedStyle(content).width);
        const finalLlmResponseWidth = parseFloat(getComputedStyle(llmResponse).width);

        const sidebarVisible = (finalSidebarWidth / containerWidth) > 0.1;
        const contentVisible = (finalContentWidth / containerWidth) > 0.1;
        const llmResponseVisible = (finalLlmResponseWidth / containerWidth) > 0.1;

        // Update sidebar buttons
        const sidebarButtons = [
          document.getElementById('toggleSidebar'),
          document.getElementById('toggleSidebar2'),
          document.getElementById('toggleSidebar3')
        ];
        // CSS 클래스 기반으로 변경 - 인라인 스타일 제거
        sidebarButtons.forEach(btn => {
          if (btn) {
            btn.style.removeProperty('background-color');
            btn.style.removeProperty('color');
            btn.classList.toggle('panel-hidden', !sidebarVisible);
          }
        });

        // Update content buttons
        const contentButtons = [
          document.getElementById('toggleContent'),
          document.getElementById('toggleContent2'),
          document.getElementById('toggleContent3')
        ];
        contentButtons.forEach(btn => {
          if (btn) {
            btn.style.removeProperty('background-color');
            btn.style.removeProperty('color');
            btn.classList.toggle('panel-hidden', !contentVisible);
          }
        });

        // Update response buttons
        const responseButtons = [
          document.getElementById('toggleResponse'),
          document.getElementById('toggleResponse2'),
          document.getElementById('toggleResponse3')
        ];
        responseButtons.forEach(btn => {
          if (btn) {
            btn.style.removeProperty('background-color');
            btn.style.removeProperty('color');
            btn.classList.toggle('panel-hidden', !llmResponseVisible);
          }
        });

        // 패널 토글 완료 후 에디터 프리뷰 영역 갱신
        setTimeout(() => {
          // Window resize 이벤트 트리거하여 TOAST UI Editor가 리사이즈 감지하도록 함
          window.dispatchEvent(new Event('resize'));

          // 프리뷰 탭이 활성화되어 있으면 커스텀 프리뷰 강제 갱신
          if (window.MyMind3Editor && window.MyMind3Editor.refreshPreviewSize) {
            window.MyMind3Editor.refreshPreviewSize();
            console.log('[Panel Toggle] Preview size refreshed');
          }
        }, 50);
      }

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

        console.log('Panel states:', {
          sidebar: sidebarVisible ? 'visible' : 'hidden',
          content: contentVisible ? 'visible' : 'hidden',
          response: llmResponseVisible ? 'visible' : 'hidden'
        });

        // Get all toggle buttons
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

        // Update each button independently based on which panel it controls

        // CSS 클래스 기반으로 변경 - 인라인 스타일 제거
        sidebarButtons.forEach(btn => {
          if (btn) {
            btn.style.removeProperty('background-color');
            btn.style.removeProperty('color');
            btn.classList.toggle('panel-hidden', !sidebarVisible);
          }
        });

        // Content control buttons (control content panel)
        contentButtons.forEach(btn => {
          if (btn) {
            btn.style.removeProperty('background-color');
            btn.style.removeProperty('color');
            btn.classList.toggle('panel-hidden', !contentVisible);
          }
        });

        // Response control buttons (control response panel)
        responseButtons.forEach(btn => {
          if (btn) {
            btn.style.removeProperty('background-color');
            btn.style.removeProperty('color');
            btn.classList.toggle('panel-hidden', !llmResponseVisible);
          }
        });
      }
    }

    function setupExactMyMind2Editor() {
      // 버튼들이 제거되었으므로 편집 모드만 활성화
      const contentArea = document.getElementById('contentArea');
      const contentEditor = document.getElementById('contentEditor');
      const toastEditor = document.getElementById('toastEditor');

      // 기본적으로 TOAST 에디터만 표시
      if (contentArea) contentArea.style.display = 'none';
      if (contentEditor) contentEditor.style.display = 'none';
      if (toastEditor) toastEditor.style.display = 'block';
    }

    // Update Main Add Button State (루트 노드 1개 제한)
    function updateMainAddButtonState() {
      const addMainBtn = document.getElementById('addMainTitleBtn');
      if (!addMainBtn) return;

      const rootNodeCount = window.MyMind3?.MindMapData?.mindMapData?.length || 0;

      if (rootNodeCount >= 1) {
        // 루트 노드가 1개 이상 있으면 비활성화
        addMainBtn.disabled = true;
        addMainBtn.style.opacity = '0.5';
        addMainBtn.style.cursor = 'not-allowed';
        addMainBtn.title = t('appRootNodeLimit', '루트 노드는 1개만 생성할 수 있습니다');
      } else {
        // 루트 노드가 없으면 활성화
        addMainBtn.disabled = false;
        addMainBtn.style.opacity = '1';
        addMainBtn.style.cursor = 'pointer';
        addMainBtn.title = t('appAddMainNode', '메인 노드 추가');
      }

      console.log(`[updateMainAddButtonState] 루트 노드 수: ${rootNodeCount}, 버튼 상태: ${addMainBtn.disabled ? '비활성화' : '활성화'}`);
    }

    // Make function globally accessible
    window.updateMainAddButtonState = updateMainAddButtonState;

    // Update Save Button State (노드가 있으면 활성화)
    function updateSaveButtonState() {
      const saveBtn = document.getElementById('saveMapBtn');
      const hasNodes = window.MyMind3?.MindMapData?.mindMapData?.length > 0;

      if (saveBtn) {
        saveBtn.disabled = !hasNodes || !!window.MyMind3?.isReadOnly;
      }

      console.log(`[updateSaveButtonState] 노드 존재: ${hasNodes}, 저장 버튼 상태: ${hasNodes ? '활성화' : '비활성화'}`);
    }

    // Make function globally accessible (하위 호환성을 위해 두 이름 모두 등록)
    window.updateSaveButtonState = updateSaveButtonState;
    window.updateSaveImproveButtonState = updateSaveButtonState;

    // Update Response Panel Button State (루트 노드가 있을 때만 활성화)
    function updateResponsePanelButtonState() {
      const sendBtn = document.getElementById('sendPromptBtn');
      const clearBtn = document.getElementById('clearQaBtn');
      const attachBtn = document.getElementById('imageAttachBtn');
      const promptInput = document.getElementById('promptInput');

      const hasRootNode = window.MyMind3?.MindMapData?.mindMapData?.length > 0;

      if (sendBtn) sendBtn.disabled = !hasRootNode;
      if (clearBtn) clearBtn.disabled = !hasRootNode;
      if (attachBtn) attachBtn.disabled = !hasRootNode;
      if (promptInput) promptInput.disabled = !hasRootNode;

      console.log(`[updateResponsePanelButtonState] 루트 노드 존재: ${hasRootNode}, 응답 패널 버튼: ${hasRootNode ? '활성화' : '비활성화'}`);
    }

    window.updateResponsePanelButtonState = updateResponsePanelButtonState;

    // Update Tree Generation Button State (노드가 있고 저장된 상태일 때만 활성화)
    function updateTreeGenButtonState() {
      const treeGenBtn = document.getElementById('generateTreeBtn');
      const hasNodes = window.MyMind3?.MindMapData?.mindMapData?.length > 0;
      const currentFolder = window.MyMind3?.currentFolder || localStorage.getItem('currentFolder');
      const isSaved = hasNodes && currentFolder;

      if (treeGenBtn) {
        treeGenBtn.disabled = !isSaved;

        // 시각적 스타일 업데이트 - 모노크롬
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isSaved) {
          // 활성화 상태: 모노크롬 (테두리 강조)
          treeGenBtn.style.backgroundColor = 'transparent';
          treeGenBtn.style.borderColor = isDark ? '#ffffff' : '#1d1d1f';
          treeGenBtn.style.color = isDark ? '#ffffff' : '#1d1d1f';
          treeGenBtn.style.cursor = 'pointer';
          treeGenBtn.style.opacity = '1';
        } else {
          // 비활성화 상태: 모노크롬 (흐린 상태)
          treeGenBtn.style.backgroundColor = 'transparent';
          treeGenBtn.style.borderColor = isDark ? '#3a3a3a' : '#d2d2d7';
          treeGenBtn.style.color = isDark ? '#555555' : '#c0c0c0';
          treeGenBtn.style.cursor = 'not-allowed';
          treeGenBtn.style.opacity = '0.6';
        }
      }

      console.log(`[updateTreeGenButtonState] 노드 존재: ${hasNodes}, 저장됨: ${!!currentFolder}, 노드재구성 버튼: ${isSaved ? '활성화' : '비활성화'}`);
    }

    // Make function globally accessible
    window.updateTreeGenButtonState = updateTreeGenButtonState;

    function setupExactMyMind2Buttons() {
      // 파일 첨부 버튼 (attachFileBtn)은 node-attachments.js에서 처리됨

      // Auto save function
      window.autoSaveMindMap = async function () {
        if (!window.MyMind3 || !window.MyMind3.MindMapData) return;
        // 읽기 전용 모드 체크
        if (window.MyMind3.isReadOnly) return;

        const mindMapData = window.MyMind3.MindMapData.mindMapData;
        if (!mindMapData || mindMapData.length === 0) {
          console.log('No data to auto-save');
          return;
        }

        const folderName = window.MyMind3.currentFolder || localStorage.getItem('currentFolder');
        if (!folderName) {
          console.log('No currentFolder set, skipping auto-save');
          return;
        }
        const jsonData = window.MyMind3.MindMapData.getDataAsJson();
        const data = JSON.parse(jsonData);

        try {
          const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...csrfHeaders },
            credentials: 'include',
            body: JSON.stringify({ folderName, data })
          });

          const result = await response.json();
          if (result.success) {
            // 서버에서 중복 방지로 폴더명이 변경된 경우 동기화
            const actualFolder = result.actualFolder || folderName;
            if (actualFolder !== folderName) {
              console.log('Auto-save folder redirected:', folderName, '→', actualFolder);
              window.MyMind3.currentFolder = actualFolder;
              window.currentQAFolder = actualFolder;
              localStorage.setItem('currentFolder', actualFolder);
            }
            console.log('Auto-saved to:', actualFolder);

            // 저장 후 savelist 캐시 무효화
            if (window.ApiCache) {
              window.ApiCache.invalidate('/api/mindmap/savelist');
            }

            // 자동 저장 후 currentFolder 설정 (아직 설정되지 않은 경우)
            if (!window.MyMind3.currentFolder) {
              window.MyMind3.currentFolder = actualFolder;
              localStorage.setItem('currentFolder', actualFolder);
            }

            // 자동 저장 완료 후 노드재구성 버튼 상태 업데이트
            if (typeof window.updateTreeGenButtonState === 'function') {
              window.updateTreeGenButtonState();
            }
          } else {
            console.error('Auto-save failed:', result.error);
          }
        } catch (error) {
          console.error('Auto-save error:', error);
        }
      };

      // 커스텀 입력 모달 함수
      window.showInputModal = function(message, defaultValue = '') {
        return new Promise((resolve) => {
          const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
          const bg = isDark ? '#111111' : '#fff';
          const textColor = isDark ? '#ffffff' : '#333';
          const inputBg = isDark ? '#2a2a2a' : '#fff';
          const inputBorder = isDark ? '#3a3a3a' : '#ccc';
          const cancelBg = isDark ? '#333333' : '#ccc';
          const cancelColor = isDark ? '#ffffff' : '#333';
          const overlayBg = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';

          const overlay = document.createElement('div');
          overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:${overlayBg};z-index:9998;`;

          const modal = document.createElement('div');
          modal.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:${bg};padding:24px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:9999;min-width:350px;${isDark ? 'border:1px solid #2a2a2a;' : ''}`;
          modal.innerHTML = `
            <div style="font-size:16px;margin-bottom:16px;color:${textColor};">${message}</div>
            <input type="text" id="inputModalText" value="${defaultValue}" style="width:100%;padding:10px;border:1px solid ${inputBorder};border-radius:4px;font-size:14px;box-sizing:border-box;margin-bottom:16px;background:${inputBg};color:${textColor};">
            <div style="display:flex;gap:12px;justify-content:flex-end;">
              <button id="inputModalCancel" style="padding:10px 24px;background:${cancelBg};color:${cancelColor};border:none;border-radius:4px;cursor:pointer;">${window.i18n?.cancelBtn || '취소'}</button>
              <button id="inputModalOk" style="padding:10px 24px;background:#4a90d9;color:#fff;border:none;border-radius:4px;cursor:pointer;">${window.i18n?.confirmBtn || '확인'}</button>
            </div>`;

          document.body.appendChild(overlay);
          document.body.appendChild(modal);

          const input = document.getElementById('inputModalText');
          input.focus();
          input.select();

          const cleanup = () => { modal.remove(); overlay.remove(); };
          const submit = () => { cleanup(); resolve(input.value); };

          document.getElementById('inputModalOk').onclick = submit;
          document.getElementById('inputModalCancel').onclick = () => { cleanup(); resolve(null); };
          overlay.onclick = () => { cleanup(); resolve(null); };
          input.onkeydown = (e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { cleanup(); resolve(null); } };
        });
      };

      // 커스텀 확인 모달 함수
      window.showConfirmModal = function(message, confirmText = null, cancelText = null, isDanger = false) {
        confirmText = confirmText || (window.i18n?.confirmBtn || '확인');
        cancelText = cancelText || (window.i18n?.cancelBtn || '취소');
        return new Promise((resolve) => {
          const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
          const bg = isDark ? '#111111' : '#fff';
          const textColor = isDark ? '#ffffff' : '#333';
          const cancelBg = isDark ? '#333333' : '#ccc';
          const cancelColor = isDark ? '#ffffff' : '#333';
          const overlayBg = isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)';

          const overlay = document.createElement('div');
          overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:${overlayBg};z-index:9998;`;

          const modal = document.createElement('div');
          const confirmBtnColor = isDanger ? '#ff6b6b' : '#4a90d9';
          modal.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:${bg};padding:24px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:9999;min-width:320px;text-align:center;${isDark ? 'border:1px solid #2a2a2a;' : ''}`;
          modal.innerHTML = `
            <div style="font-size:16px;margin-bottom:20px;color:${textColor};white-space:pre-wrap;">${message}</div>
            <div style="display:flex;gap:12px;justify-content:center;">
              <button id="confirmModalCancel" style="padding:10px 24px;background:${cancelBg};color:${cancelColor};border:none;border-radius:4px;cursor:pointer;">${cancelText}</button>
              <button id="confirmModalOk" style="padding:10px 24px;background:${confirmBtnColor};color:#fff;border:none;border-radius:4px;cursor:pointer;">${confirmText}</button>
            </div>`;

          document.body.appendChild(overlay);
          document.body.appendChild(modal);

          const cleanup = () => { modal.remove(); overlay.remove(); };

          document.getElementById('confirmModalOk').onclick = () => { cleanup(); resolve(true); };
          document.getElementById('confirmModalCancel').onclick = () => { cleanup(); resolve(false); };
          overlay.onclick = () => { cleanup(); resolve(false); };
          document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') { cleanup(); resolve(false); document.removeEventListener('keydown', escHandler); }
          });
        });
      };

      // Add Main Title Button
      document.getElementById('addMainTitleBtn').addEventListener('click', async () => {
        // 루트 노드 1개 제한 체크
        const rootNodeCount = window.MyMind3?.MindMapData?.mindMapData?.length || 0;
        if (rootNodeCount >= 1) {
          if (typeof showToast === 'function') {
            showToast(window.i18n?.toastRootNodeLimit || '루트 노드는 1개만 생성할 수 있습니다.', 'warning');
          }
          return;
        }

        const title = await window.showInputModal(window.i18n?.inputMainTitle || '메인 타이틀을 입력하세요:');
        if (title && title.trim() && window.MyMind3 && window.MyMind3.MindMapData) {
          // Create root node
          const rootNode = window.MyMind3.MindMapData.createMainTitle(title.trim());

          if (rootNode) {
            // Set initial content with title + enter + enter
            const initialContent = `<h2>${title.trim()}</h2><p><br></p><p><br></p>`;
            rootNode.content = initialContent;

            console.log(`[addMainTitleBtn] Creating empty HTML file for root node ${rootNode.id}`);

            // 루트 노드의 빈 HTML 파일을 즉시 생성
            try {
              // 제목만 폴더명으로 사용
              const folderName = title.trim();

              const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch('/api/savenode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...csrfHeaders },
                credentials: 'include',
                body: JSON.stringify({
                  folder: folderName,
                  nodeId: rootNode.nodeId || String(rootNode.id),
                  content: initialContent,
                  nodeName: rootNode.title || ''  // 서버에서 title[nodeId].html 파일명에 사용
                })
              });

              if (response.ok) {
                console.log(`[addMainTitleBtn] Empty HTML file created for root node ${rootNode.id}`);

                // 폴더명을 전역 변수에 설정 (무조건 업데이트)
                window.currentQAFolder = folderName;
                if (!window.MyMind3) window.MyMind3 = {};
                window.MyMind3.currentFolder = folderName;
                localStorage.setItem('currentFolder', folderName);
                console.log(`[addMainTitleBtn] Current folder set to: ${folderName}`);

                // 노드재구성 버튼 상태 업데이트
                if (typeof window.updateTreeGenButtonState === 'function') {
                  window.updateTreeGenButtonState();
                }
              } else {
                console.warn(`[addMainTitleBtn] Failed to create HTML file for root node ${rootNode.id}`);
              }
            } catch (error) {
              console.error('[addMainTitleBtn] Error creating HTML file:', error);
            }

            // Update currentEditingNodeId before rendering
            window.MyMind3.MindMapData.currentEditingNodeId = rootNode.id;

            // Set Toast UI Editor content BEFORE rendering
            if (window.toastEditor && window.toastEditor.getEditor) {
              const editor = window.toastEditor.getEditor();
              if (editor) {
                editor.setHTML(initialContent);
                console.log('Pre-set Toast UI Editor with initial content for new root node');
              }
            }

            // Render the mind map
            window.MyMind3.NodeRenderer.renderMindMap();

            // Update main add button state after node creation
            updateMainAddButtonState();

            // Update save button state
            updateSaveButtonState();

            // 노드재구성 버튼 상태 업데이트 (HTML 파일 생성 실패 시에도 확인)
            if (typeof window.updateTreeGenButtonState === 'function') {
              window.updateTreeGenButtonState();
            }

            // 응답 패널 버튼 상태 업데이트 (전송, 삭제, 파일첨부)
            updateResponsePanelButtonState();

            // Select the node after rendering - FIX: selectNode 호출로 에디터 초기화
            setTimeout(() => {
              if (window.MyMind3.NodeRenderer && window.MyMind3.NodeRenderer.selectNode) {
                window.MyMind3.NodeRenderer.selectNode(rootNode.id);
                console.log(`[addMainTitleBtn] Node ${rootNode.id} auto-selected after creation`);
              } else {
                // 폴백: NodeRenderer가 없으면 기본 CSS 클래스만 추가
                const nodeElement = document.querySelector(`[data-id="${rootNode.id}"]`);
                if (nodeElement) {
                  document.querySelectorAll('.mindmap-node.selected').forEach(node => {
                    node.classList.remove('selected');
                  });
                  nodeElement.classList.add('selected');
                }
              }

              // Ensure content is still set after any automatic calls
              if (window.toastEditor && window.toastEditor.getEditor) {
                const editor = window.toastEditor.getEditor();
                if (editor) {
                  const currentContent = editor.getHTML();
                  if (!currentContent || currentContent === '<p><br></p>') {
                    editor.setHTML(initialContent);
                    console.log('Re-set Toast UI Editor with initial content');
                  }
                }
              }

              // Auto-save after creating main title
              if (window.autoSaveMindMap) {
                window.autoSaveMindMap();
              }
            }, 250);
          }
        }
      });

      // Save Button - 이미 로드된 마인드맵이면 팝업 없이 바로 저장
      document.getElementById('saveMapBtn').addEventListener('click', () => {
        if (!window.MyMind3Simple) return;
        const currentFolder = window.MyMind3?.currentFolder || localStorage.getItem('currentFolder');
        if (currentFolder && window.MyMind3Simple.saveMindmapSilently) {
          window.MyMind3Simple.saveMindmapSilently();
        } else if (window.MyMind3Simple.saveMindmap) {
          window.MyMind3Simple.saveMindmap();
        }
      });

      // Generate Tree Button (새 트리) - 기능설정으로 제거될 수 있어 null 체크
      const _generateTreeBtn = document.getElementById('generateTreeBtn');
      if (_generateTreeBtn) {
        _generateTreeBtn.addEventListener('click', async () => {
          if (typeof TreeGenerator !== 'undefined' && TreeGenerator.showModal) {
            await TreeGenerator.showModal();
          }
        });
      }

      // Save Folder Popup Buttons
      document.getElementById('saveFolderConfirmBtn').addEventListener('click', () => {
        if (window.MyMind3Simple && window.MyMind3Simple.confirmSaveToFolder) {
          window.MyMind3Simple.confirmSaveToFolder();
        }
      });

      document.getElementById('saveFolderCancelBtn').addEventListener('click', () => {
        if (window.MyMind3Simple && window.MyMind3Simple.hideSaveFolderPopup) {
          window.MyMind3Simple.hideSaveFolderPopup();
        }
      });

      document.getElementById('saveFolderPopupCloseBtn').addEventListener('click', () => {
        if (window.MyMind3Simple && window.MyMind3Simple.hideSaveFolderPopup) {
          window.MyMind3Simple.hideSaveFolderPopup();
        }
      });

      document.getElementById('saveFolderOverlay').addEventListener('click', () => {
        if (window.MyMind3Simple && window.MyMind3Simple.hideSaveFolderPopup) {
          window.MyMind3Simple.hideSaveFolderPopup();
        }
      });

      // Load popup event listeners
      document.getElementById('loadFolderPopupCloseBtn').addEventListener('click', () => {
        if (window.MyMind3Simple && window.MyMind3Simple.hideLoadFolderPopup) {
          window.MyMind3Simple.hideLoadFolderPopup();
        }
      });

      document.getElementById('loadFolderCancelBtn').addEventListener('click', () => {
        if (window.MyMind3Simple && window.MyMind3Simple.hideLoadFolderPopup) {
          window.MyMind3Simple.hideLoadFolderPopup();
        }
      });

      // 다시읽기 버튼 - 인덱스 강제 재구축
      const refreshBtn = document.getElementById('loadFolderRefreshBtn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
          if (window.MyMind3Simple && window.MyMind3Simple.showLoadFolderPopup) {
            window.MyMind3Simple.showLoadFolderPopup(true);
          }
        });
      }

      // 불러오기 팝업 오버레이 클릭 시 닫히지 않도록 이벤트 제거
      // document.getElementById('loadFolderOverlay').addEventListener('click', () => {
      //   if (window.MyMind3Simple && window.MyMind3Simple.hideLoadFolderPopup) {
      //     window.MyMind3Simple.hideLoadFolderPopup();
      //   }
      // });

      // Load Button
      document.getElementById('loadMapBtn').addEventListener('click', () => {
        if (window.MyMind3Simple && window.MyMind3Simple.openMindmap) {
          window.MyMind3Simple.openMindmap();
        }
      });

      // Reset Button
      document.getElementById('resetMapBtn').addEventListener('click', () => {
        window.location.reload();
      });

      // Send Prompt Button - removed old handler, using GPT AI functionality instead

      // Save Content Button
      document.getElementById('saveContentBtn').addEventListener('click', async () => {
        const currentNodeId = window.MyMind3?.MindMapData?.currentEditingNodeId;

        if (!currentNodeId || !window.MyMind3?.MindMapData) {
          showToast('No node selected or data not ready', 'warning', 2000);
          return;
        }

        let content = '';

        // Check if Toast UI Editor is active (MyMind3Editor.editor)
        if (window.MyMind3Editor && window.MyMind3Editor.editor && typeof window.MyMind3Editor.editor.getMarkdown === 'function') {
          content = window.MyMind3Editor.editor.getMarkdown();
        }
        // Fallback to textarea editor
        else {
          const editor = document.getElementById('contentEditor');
          content = editor ? editor.value : '';
        }

        // Allow saving empty content (removed trim check)
        // Users may want to clear content by saving an empty editor

        // Save to memory
        window.MyMind3.MindMapData.saveNodeContent(currentNodeId, content);

        // 폴더명: 저장된 값 > title 폴백
        const mindMapData = window.MyMind3.MindMapData.mindMapData;
        const rootNode = mindMapData && mindMapData.length > 0 ? mindMapData[0] : null;
        const folderName = window.MyMind3?.currentFolder
          || localStorage.getItem('currentFolder')
          || (rootNode?.title || 'Untitled');

        // Save to file
        try {
          // 현재 노드 정보 가져오기
          const currentNode = window.MyMind3?.MindMapData?.findNodeById(currentNodeId);

          const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch('/api/savenode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...csrfHeaders },
            credentials: 'include',
            body: JSON.stringify({
              folderName: folderName,
              nodeId: currentNode?.nodeId || currentNodeId,
              content: content,
              nodeName: currentNode?.title || ''  // 서버에서 title[nodeId].html 파일명에 사용
            })
          });

          const result = await response.json();

          if (!result.success) {
            showToast('Failed to save to file: ' + result.error, 'error', 3000);
          } else {
            showToast('Content saved successfully!', 'success', 2000);
          }
        } catch (error) {
          showToast('Error saving content: ' + error.message, 'error', 3000);
        }
      });
    }

    function setupKeyboardShortcuts() {
      document.addEventListener('keydown', function (e) {
        // Ctrl+D: Copy selected node
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
          e.preventDefault();
          const selectedNode = document.querySelector('.mindmap-node.selected');
          if (selectedNode) {
            const nodeId = parseInt(selectedNode.getAttribute('data-id'));
            window.MyMind3.NodeRenderer.copyNode(nodeId);
          }
        }

        // Delete key: Delete selected node (only if not in input/editor)
        if (e.key === 'Delete') {
          const activeElement = document.activeElement;
          const isInEditor = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true' ||
            activeElement.closest('#contentEditor') ||
            activeElement.closest('#promptInput')
          );

          // Only delete node if not in an input/editor field
          if (!isInEditor) {
            e.preventDefault();
            const selectedNode = document.querySelector('.mindmap-node.selected');
            if (selectedNode) {
              const nodeId = parseInt(selectedNode.getAttribute('data-id'));
              window.MyMind3.NodeRenderer.confirmDeleteNode(nodeId);
            }
          }
        }

        // Ctrl+S: Save content
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          // stopPropagation 제거 - 에디터에서 이미 preventDefault로 "~~~~" 차단함

          console.log('[KeyboardShortcuts] Ctrl+S pressed, saving content...');

          const currentNodeId = window.MyMind3?.MindMapData?.currentEditingNodeId;
          if (!currentNodeId || !window.MyMind3?.MindMapData) {
            showToast('No node selected or data not ready', 'warning', 2000);
            return;
          }

          let content = '';

          // Check if Toast UI Editor is active (MyMind3Editor.editor)
          if (window.MyMind3Editor && window.MyMind3Editor.editor && typeof window.MyMind3Editor.editor.getMarkdown === 'function') {
            content = window.MyMind3Editor.editor.getMarkdown();
          }
          // Fallback to textarea editor
          else {
            const editor = document.getElementById('contentEditor');
            content = editor ? editor.value : '';
          }

          // FIX: Remove "~~~~" (code fence marker) that appears when saving empty content
          // "~~~~" is a markdown code fence delimiter that shouldn't be saved alone
          content = content.replace(/^~~~~\s*$/gm, '');  // Remove lines with only "~~~~"
          content = content.trim();  // Remove leading/trailing whitespace

          // Allow saving empty content (removed trim check)
          // Users may want to clear content by saving an empty editor

          // Save to memory
          window.MyMind3.MindMapData.saveNodeContent(currentNodeId, content);

          // 폴더 ID 가져오기 (editor.js saveContent()와 동일한 방식)
          const currentFolder = window.currentQAFolder || window.MyMind3?.currentFolder || localStorage.getItem('currentFolder');
          if (!currentFolder) {
            showToast('No folder selected', 'warning', 2000);
            return;
          }

          // Save to file
          (async () => {
            // 현재 노드 정보 가져오기
            const currentNode = window.MyMind3?.MindMapData?.findNodeById(currentNodeId);
            const actualNodeId = currentNode?.nodeId || currentNodeId;

            // 에디터 캐시 즉시 업데이트 (노드 재클릭 시 최신 내용 표시)
            if (window.MyMind3Editor && window.MyMind3Editor.updateContentCache) {
              window.MyMind3Editor.updateContentCache(actualNodeId, content);
            }

            const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
            fetch('/api/savenode', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...csrfHeaders
              },
              credentials: 'include',
              body: JSON.stringify({
                folder: currentFolder,
                nodeId: actualNodeId,
                content: content,
                nodeName: currentNode?.title || ''  // 서버에서 title[nodeId].html 파일명에 사용
              })
            })
              .then(response => response.json())
            .then(data => {
              if (data.success) {
                // Ctrl+S 저장 성공 → 에디터 dirty 리셋 (자동저장 타이머 취소)
                if (window.MyMind3Editor?.markClean) window.MyMind3Editor.markClean();
                showToast('Content saved successfully!', 'success', 2000);
              } else {
                showToast(`Save failed: ${data.message}`, 'error', 3000);
              }
            })
            .catch(error => {
              console.error('Save error:', error);
              showToast('Save failed: Network error', 'error', 3000);
            });
          })();
        }

        // Insert: Add child to selected node
        if (e.key === 'Insert') {
          e.preventDefault();
          const selectedNode = document.querySelector('.mindmap-node.selected');
          if (selectedNode) {
            const nodeId = parseInt(selectedNode.getAttribute('data-id'));
            window.MyMind3.NodeRenderer.addChildNode(nodeId);
          }
        }

        // F2: Edit selected node title
        if (e.key === 'F2') {
          e.preventDefault();
          const selectedNode = document.querySelector('.mindmap-node.selected');
          if (selectedNode) {
            const nodeId = parseInt(selectedNode.getAttribute('data-id'));
            window.MyMind3.NodeRenderer.editNodeTitle(nodeId);
          }
        }
      });
    }

    // AI Service Model Definitions - 서버에서 동적 로딩 (DB 설정 기반)
    // 2025-12-27: 하드코딩 제거, 서버에서만 모델 목록 로드
    let AI_MODELS = {};

    // 활성화된 서비스 목록 (DB 설정 기반)
    let ENABLED_SERVICES = [];

    // 모델 로딩 완료 플래그
    let modelsLoaded = false;

    // Phase 2: 초기 로드 병렬 프리페치 (models + capabilities를 동시에 워밍)
    if (window.ApiCache) {
      Promise.allSettled([
        window.ApiCache.fetch('/api/credits/models'),
        window.ApiCache.fetch('/api/ai/capabilities'),
        window.ApiCache.fetch('/api/preferences')
      ]).then(() => {
        console.log('[Prefetch] 초기 API 프리페치 완료');
      });
    }

    // 서버에서 모델 목록 로딩 (DB의 활성화된 모델만 반환)
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

          // 모델 목록 업데이트는 setupGPTFeatures에서 preferences 로딩 후 수행
          // updateModelOptions은 아직 정의되지 않았으므로 여기서 호출하지 않음

          return true;
        }
      } catch (error) {
        console.error('[Models] Failed to load from server:', error.message);
        modelsLoaded = true; // 로딩 시도 완료 플래그 설정
      }
      return false;
    }

    // 서비스 선택 콤보박스에서 비활성화된 서비스 숨기기
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
          window.MyMindAI.currentService = firstEnabledService;
          updateModelOptions(firstEnabledService);
          console.log('[Models] Switched to enabled service:', firstEnabledService);
        }
      }
    }

    // GPT AI Features Setup
    async function setupGPTFeatures() {
      console.log('Setting up GPT features...');

      // 서버에서 모델 목록 로딩 먼저 시도
      await loadModelsFromServer();

      // Settings 페이지에서 저장한 API 키 불러오기 (mymind3_api_keys)
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

      // localStorage에서 AI 설정 로드
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
       * @returns {Promise<{valid: string[], invalid: string[]}>}
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
          const invalidServices = results.invalid.map(i => i.service.toUpperCase()).join(', ');
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

      // 전역에서 호출 가능하도록 등록
      window.verifyLocalApiKeys = verifyLocalApiKeys;

      const initialAISettings = loadAISettingsFromStorage();

      // Global AI state with multi-service API key support
      window.MyMindAI = {
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

      // Load saved API keys if exist
      Object.keys(window.MyMindAI.apiKeys).forEach(service => {
        if (window.MyMindAI.apiKeys[service] && service !== 'local') {
          console.log(`[API Keys] ${service.toUpperCase()} API Key loaded from Settings`);
        }
      });

      // Load user preferences from database (localStorage가 우선)
      try {
        // ApiCache 사용 (중복 호출 방지)
        const response = window.ApiCache
          ? await window.ApiCache.fetch('/api/preferences')
          : await fetch('/api/preferences', { method: 'GET', credentials: 'include' });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.preferences) {
            console.log('[Preferences] Loaded from database:', result.preferences);

            // localStorage AI 설정이 있으면 그것을 우선 사용
            const localSettings = localStorage.getItem('mymind3_ai_settings');
            if (localSettings) {
              const aiSettings = JSON.parse(localSettings);
              const localService = aiSettings.defaultService;
              const localModel = aiSettings.services?.[localService]?.model;

              if (localService && localModel) {
                // localStorage 값 사용 (응답 패널 → AI 설정 동기화의 결과)
                const isServiceEnabled = ENABLED_SERVICES.length === 0 || ENABLED_SERVICES.includes(localService);
                window.MyMindAI.currentService = isServiceEnabled ? localService : (ENABLED_SERVICES[0] || 'gpt');
                window.MyMindAI.currentModel = localModel;
                console.log('[Preferences] Using localStorage AI settings:', { service: localService, model: localModel });
              } else {
                // localStorage에 모델이 없으면 DB 값 사용
                const savedService = result.preferences.aiService || 'gpt';
                const savedModel = result.preferences.aiModel || '';
                const isServiceEnabled = ENABLED_SERVICES.length === 0 || ENABLED_SERVICES.includes(savedService);
                window.MyMindAI.currentService = isServiceEnabled ? savedService : (ENABLED_SERVICES[0] || 'gpt');
                window.MyMindAI.currentModel = savedModel;
              }
            } else {
              // localStorage가 없으면 DB 값 사용
              const savedService = result.preferences.aiService || 'gpt';
              const savedModel = result.preferences.aiModel || '';
              const isServiceEnabled = ENABLED_SERVICES.length === 0 || ENABLED_SERVICES.includes(savedService);
              window.MyMindAI.currentService = isServiceEnabled ? savedService : (ENABLED_SERVICES[0] || 'gpt');
              window.MyMindAI.currentModel = savedModel;
            }

            // Apply loaded preferences to UI
            const aiServiceSelect = document.getElementById('aiServiceSelect');
            if (aiServiceSelect) {
              aiServiceSelect.value = window.MyMindAI.currentService;
            }

            // 모델 목록 업데이트는 updateModelOptions 함수가 정의된 후 수행 (아래 참조)
          } else {
            console.log('[Preferences] ℹNo saved preferences, using defaults');
            // 기본값으로 첫 번째 활성화된 서비스 선택
            if (ENABLED_SERVICES.length > 0) {
              window.MyMindAI.currentService = ENABLED_SERVICES[0];
            }
          }
        } else {
          console.log('[Preferences] Failed to load preferences, using defaults');
        }
      } catch (error) {
        console.error('[Preferences] Error loading preferences:', error);
        console.log('[Preferences] Using default preferences');
      }

      // AI Service Selection Handler
      const aiServiceSelect = document.getElementById('aiServiceSelect');
      const gptModelSelect = document.getElementById('gptModelSelect');

      // Save user preferences to database
      async function saveUserPreferences() {
        try {
          const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
          const response = await fetch('/api/preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...csrfHeaders },
            credentials: 'include',
            body: JSON.stringify({
              aiService: window.MyMindAI.currentService,
              aiModel: window.MyMindAI.currentModel
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

      // AI 모델별 입력/출력 기능 정의
      // 타입 한글 변환
      const TYPE_LABELS = {
        text: t('appTypeText', '텍스트'),
        image: t('appTypeImage', '이미지'),
        video: t('appTypeVideo', '비디오'),
        audio: t('appTypeAudio', '오디오'),
        vector: t('appTypeVector', '벡터'),
        coordinates: t('appTypeCoords', '좌표')
      };

      // AI 모델 capabilities (서버 API에서 로드, 2026-01-07 리팩토링)
      let MODEL_CAPABILITIES = {};
      let MODEL_PRICING = {}; // 모델별 가격 정보 (2026-01-18 추가)
      let MODEL_CAPABILITIES_LOADED = false;

      // 서버에서 AI 모델 capabilities 로드
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
            // 이모지 아이콘을 SVG 아이콘으로 변환
            const emojiToSvg = {
              '': mmIcon('text', 14), '': mmIcon('image', 14),
              '': mmIcon('film', 14), '': mmIcon('volume-2', 14),
              '': mmIcon('music', 14), '': mmIcon('bar-chart', 14),
              '': mmIcon('map-pin', 14), '': mmIcon('file', 14)
            };
            for (const caps of Object.values(flatCaps)) {
              if (caps.inputIcons) {
                caps.inputIcons = caps.inputIcons.replace(/[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}]\uFE0F?/gu, m => emojiToSvg[m] || m);
              }
              if (caps.outputIcons) {
                caps.outputIcons = caps.outputIcons.replace(/[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}]\uFE0F?/gu, m => emojiToSvg[m] || m);
              }
            }
            MODEL_CAPABILITIES = flatCaps;
            MODEL_CAPABILITIES_LOADED = true;
            console.log('[ModelCapabilities] 서버에서 로드 완료:', Object.keys(flatCaps).length, '개 모델');

            // 가격 정보도 저장 (2026-01-18 추가)
            if (result.pricing) {
              const flatPricing = {};
              for (const [service, models] of Object.entries(result.pricing)) {
                for (const [modelName, price] of Object.entries(models)) {
                  flatPricing[modelName] = price;
                }
              }
              MODEL_PRICING = flatPricing;
              console.log('[ModelPricing] 가격 정보 로드 완료:', Object.keys(flatPricing).length, '개 모델');
            }

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

      // 페이지 로드 시 자동 호출 (DOMContentLoaded 핸들러에서 호출됨)
      // 즉시 로드는 아래 FALLBACK_CAPABILITIES 정의 후 수행

      // Fallback: 서버 미응답 시 사용할 기본 capabilities (2025-12-27 통합)
      const FALLBACK_CAPABILITIES = {
        // ========== GPT 모델 ==========
        'gpt-5.2': {
          input: ['text', 'image'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          outputIcons: mmIcon('text', 14),
          description: '최신 프론티어 모델 (400K ctx)'
        },
        'gpt-5.2-pro': {
          input: ['text', 'image'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          outputIcons: mmIcon('text', 14),
          description: '최고 정확도 버전 (400K ctx)'
        },
        'gpt-5.1': {
          input: ['text', 'image'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          outputIcons: mmIcon('text', 14),
          description: '코딩/에이전트 특화 (128K ctx)'
        },
        'gpt-5.1-codex': {
          input: ['text'],
          output: ['text'],
          inputIcons: mmIcon('text', 14),
          outputIcons: mmIcon('text', 14),
          description: '코딩 특화 모델 (400K ctx)'
        },
        'gpt-5': {
          input: ['text', 'image'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          outputIcons: mmIcon('text', 14),
          description: 'GPT-5 기본 모델 (400K ctx)'
        },
        'gpt-5-mini': {
          input: ['text', 'image'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          outputIcons: mmIcon('text', 14),
          description: '비용 효율적 (400K ctx)'
        },
        'gpt-5-nano': {
          input: ['text'],
          output: ['text'],
          inputIcons: mmIcon('text', 14),
          outputIcons: mmIcon('text', 14),
          description: '초고속 저지연 (400K ctx)'
        },
        'o3-pro': {
          input: ['text'],
          output: ['text'],
          inputIcons: mmIcon('text', 14),
          outputIcons: mmIcon('text', 14),
          description: '고강도 추론 (200K ctx)'
        },
        'o4-mini': {
          input: ['text'],
          output: ['text'],
          inputIcons: mmIcon('text', 14),
          outputIcons: mmIcon('text', 14),
          description: '빠른 추론 (200K ctx)'
        },
        'gpt-4o': {
          input: ['text', 'image', 'audio'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14) + mmIcon('volume-2', 14),
          outputIcons: mmIcon('text', 14),
          description: '멀티모달 (128K ctx)'
        },
        'gpt-4o-mini': {
          input: ['text', 'image'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          outputIcons: mmIcon('text', 14),
          description: '경량 멀티모달 (128K ctx)'
        },

        // ========== Grok 모델 ==========
        'grok-2': {
          input: ['text'],
          output: ['text'],
          inputIcons: mmIcon('text', 14),
          outputIcons: mmIcon('text', 14),
          description: 'Grok 2 기본 모델'
        },
        'grok-2-vision': {
          input: ['text', 'image'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          outputIcons: mmIcon('text', 14),
          description: '비전 지원 모델'
        },

        // ========== Claude 모델 ==========
        'claude-sonnet-4-5-20250929': {
          input: ['text', 'image'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          outputIcons: mmIcon('text', 14),
          description: 'Claude 4.5 Sonnet (200K ctx)'
        },
        'claude-opus-4-5-20251101': {
          input: ['text', 'image'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          outputIcons: mmIcon('text', 14),
          description: 'Claude 4.5 Opus 최고성능'
        },
        'claude-haiku-4-5-20251001': {
          input: ['text', 'image'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          outputIcons: mmIcon('text', 14),
          description: 'Claude 4.5 Haiku 초고속'
        },

        // ========== Gemini 모델 ==========
        'gemini-3-flash-preview': {
          input: ['text', 'image', 'video', 'audio'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14) + mmIcon('film', 14) + mmIcon('volume-2', 14),
          outputIcons: mmIcon('text', 14),
          description: '최신 멀티모달, 빠른 응답'
        },
        'gemini-3-pro-preview': {
          input: ['text', 'image', 'video', 'audio'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14) + mmIcon('film', 14) + mmIcon('volume-2', 14),
          outputIcons: mmIcon('text', 14),
          description: '고성능 추론, 복잡한 작업'
        },
        'gemini-2.5-flash': {
          input: ['text', 'image', 'video', 'audio'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14) + mmIcon('film', 14) + mmIcon('volume-2', 14),
          outputIcons: mmIcon('text', 14),
          description: '안정적 범용 모델'
        },
        'gemini-2.5-pro': {
          input: ['text', 'image', 'video', 'audio'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14) + mmIcon('film', 14) + mmIcon('volume-2', 14),
          outputIcons: mmIcon('text', 14),
          description: '고성능 Pro 모델'
        },
        'gemini-2.5-flash-lite': {
          input: ['text', 'image'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          outputIcons: mmIcon('text', 14),
          description: '경량, 최저비용'
        },
        'gemini-2.0-flash': {
          input: ['text', 'image', 'video', 'audio'],
          output: ['text'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14) + mmIcon('film', 14) + mmIcon('volume-2', 14),
          outputIcons: mmIcon('text', 14),
          description: '레거시 안정 버전'
        },
        // 이미지 생성
        'gemini-2.5-flash-image': {
          input: ['text', 'image'],
          output: ['text', 'image'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          outputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          description: 'Nano Banana, 빠른 이미지 생성'
        },
        'gemini-3-pro-image-preview': {
          input: ['text', 'image'],
          output: ['text', 'image'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          outputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          description: 'Nano Banana Pro, 4K 고품질'
        },
        'imagen-4.0-fast-generate-001': {
          input: ['text'],
          output: ['image'],
          inputIcons: mmIcon('text', 14),
          outputIcons: mmIcon('image', 14),
          description: 'Imagen 4 Fast'
        },
        'imagen-4.0-generate-001': {
          input: ['text'],
          output: ['image'],
          inputIcons: mmIcon('text', 14),
          outputIcons: mmIcon('image', 14),
          description: 'Imagen 4 고품질'
        },
        // 비디오 생성
        'veo-3.1-fast-generate-preview': {
          input: ['text', 'image'],
          output: ['video'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          outputIcons: mmIcon('film', 14),
          description: 'Veo 3.1 Fast, 빠른 비디오'
        },
        'veo-3.1-generate-preview': {
          input: ['text', 'image'],
          output: ['video'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14),
          outputIcons: mmIcon('film', 14),
          description: 'Veo 3.1 고품질 비디오'
        },
        // 오디오/음성
        'lyria-realtime-exp': {
          input: ['text'],
          output: ['audio'],
          inputIcons: mmIcon('text', 14),
          outputIcons: mmIcon('music', 14),
          description: '실시간 음악 생성'
        },
        'gemini-2.5-flash-native-audio-dialog': {
          input: ['text', 'audio'],
          output: ['text', 'audio'],
          inputIcons: mmIcon('text', 14) + mmIcon('volume-2', 14),
          outputIcons: mmIcon('text', 14) + mmIcon('volume-2', 14),
          description: 'Live API 양방향 대화'
        },
        'gemini-2.5-flash-tts': {
          input: ['text'],
          output: ['audio'],
          inputIcons: mmIcon('text', 14),
          outputIcons: mmIcon('volume-2', 14),
          description: 'TTS 음성 합성'
        },
        // 임베딩
        'gemini-embedding-001': {
          input: ['text'],
          output: ['vector'],
          inputIcons: mmIcon('text', 14),
          outputIcons: mmIcon('bar-chart-2', 14),
          description: '텍스트 벡터화'
        },
        // 로보틱스
        'gemini-robotics-er-1.5-preview': {
          input: ['text', 'image', 'video'],
          output: ['text', 'coordinates'],
          inputIcons: mmIcon('text', 14) + mmIcon('image', 14) + mmIcon('film', 14),
          outputIcons: mmIcon('text', 14) + mmIcon('map-pin', 14),
          description: '객체 추적, 경로 계획'
        },
        // Gemma
        'gemma-3-1b': {
          input: ['text'],
          output: ['text'],
          inputIcons: mmIcon('text', 14),
          outputIcons: mmIcon('text', 14),
          description: '1B 초경량 오픈소스'
        },
        'gemma-3-4b': {
          input: ['text'],
          output: ['text'],
          inputIcons: mmIcon('text', 14),
          outputIcons: mmIcon('text', 14),
          description: '4B 경량 오픈소스'
        },
        'gemma-3-12b': {
          input: ['text'],
          output: ['text'],
          inputIcons: mmIcon('text', 14),
          outputIcons: mmIcon('text', 14),
          description: '12B 중형 오픈소스'
        },
        'gemma-3-27b': {
          input: ['text'],
          output: ['text'],
          inputIcons: mmIcon('text', 14),
          outputIcons: mmIcon('text', 14),
          description: '27B 대형 오픈소스'
        }
      };

      // Fallback을 기본값으로 설정 후 서버에서 로드
      MODEL_CAPABILITIES = { ...FALLBACK_CAPABILITIES };
      loadModelCapabilities(); // 비동기로 서버에서 최신 데이터 로드

      // 타입 배열을 한글 텍스트로 변환
      function getTypeText(types) {
        return types.map(t => TYPE_LABELS[t] || t).join(', ');
      }

      // 모델 기능 정보 UI 업데이트 (2025-12-27: 모든 AI 서비스 지원)
      function updateModelCapabilitiesUI(service, modelValue) {
        const capabilitiesBar = document.getElementById('modelCapabilitiesBar');
        const inputIcons = document.getElementById('modelInputIcons');
        const outputIcons = document.getElementById('modelOutputIcons');
        const description = document.getElementById('modelDescription');
        const pricingEl = document.getElementById('modelPricing');

        if (!capabilitiesBar) return;

        // 통합 MODEL_CAPABILITIES에서 조회
        const capabilities = MODEL_CAPABILITIES[modelValue];
        if (capabilities) {
          inputIcons.innerHTML = capabilities.inputIcons;
          outputIcons.innerHTML = capabilities.outputIcons;
          description.textContent = capabilities.description;
          // 마우스 호버 시 툴팁 표시
          inputIcons.title = '입력 가능: ' + getTypeText(capabilities.input);
          outputIcons.title = '출력 가능: ' + getTypeText(capabilities.output);
          capabilitiesBar.style.display = 'block';
        } else {
          // 정의되지 않은 모델이면 기본값 표시
          inputIcons.innerHTML = mmIcon('text', 14);
          outputIcons.innerHTML = mmIcon('text', 14);
          inputIcons.title = '입력 가능: 텍스트';
          outputIcons.title = '출력 가능: 텍스트';
          description.textContent = '';
          capabilitiesBar.style.display = 'block';
        }

        // 가격 정보 업데이트 (2026-01-18 추가, 2026-02-22 캐시 가격 추가)
        if (pricingEl) {
          const pricing = MODEL_PRICING[modelValue];
          if (pricing && (pricing.inputCost || pricing.outputCost)) {
            const inputCost = pricing.inputCost || 0;
            const outputCost = pricing.outputCost || 0;
            const cachedCost = pricing.cachedCost || 0;
            const cachedStr = cachedCost > 0 ? ` / $${cachedCost}` : '';
            pricingEl.textContent = `↓$${inputCost} / ↑$${outputCost}${cachedStr}`;
            pricingEl.title = `1M 토큰당: 입력 $${inputCost} / 출력 $${outputCost}${cachedCost > 0 ? ' / 캐시 $' + cachedCost : ''}`;
          } else {
            pricingEl.textContent = '';
            pricingEl.title = '가격 정보 없음';
          }
        }
      }

      // AI 설정 동기화 함수 (응답 패널 → AI 설정)
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
          if (typeof updateAITabsForMode === 'function') {
            updateAITabsForMode();
          } else if (typeof window.updateAITabsForMode === 'function') {
            window.updateAITabsForMode();
          }
        } catch (e) {
          console.warn('[AI Sync] 설정 동기화 실패:', e);
        }
      }

      function updateModelOptions(service, skipSave = false) {
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
          // currentModel은 이미 설정되어 있으므로 변경하지 않음
          console.log(`[Models] Keeping saved model: ${savedModel}`);
        } else if (defaultModelValue) {
          gptModelSelect.value = defaultModelValue;
          window.MyMindAI.currentModel = defaultModelValue;
        } else if (models.length > 0) {
          gptModelSelect.value = models[0].value;
          window.MyMindAI.currentModel = models[0].value;
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

      if (aiServiceSelect) {
        aiServiceSelect.addEventListener('change', function () {
          window.MyMindAI.currentService = this.value;
          updateModelOptions(this.value);  // 내부에서 syncToAISettings 호출됨
          // 공식 아이콘 업데이트
          if (typeof updateAIServiceIcon === 'function') {
            updateAIServiceIcon(this.value);
          }
          console.log('AI service changed to:', this.value);
        });

        // 모델 로딩 완료 후 초기화
        if (modelsLoaded && AI_MODELS && Object.keys(AI_MODELS).length > 0) {
          const currentService = window.MyMindAI?.currentService || ENABLED_SERVICES[0] || 'gpt';

          // 서비스 콤보박스 값 설정
          if (aiServiceSelect.querySelector(`option[value="${currentService}"]`)) {
            aiServiceSelect.value = currentService;
            // 초기 공식 아이콘 설정
            if (typeof updateAIServiceIcon === 'function') {
              updateAIServiceIcon(currentService);
            }
            console.log('[Models] Applied saved service:', currentService);
          }

          updateModelOptions(currentService, true);

          // 저장된 모델이 있으면 선택
          const savedModel = window.MyMindAI?.currentModel;
          if (savedModel && gptModelSelect.querySelector(`option[value="${savedModel}"]`)) {
            gptModelSelect.value = savedModel;
            window.MyMindAI.currentModel = savedModel;
            console.log('[Models] Applied saved model:', savedModel);
          }
          console.log('[Models] Initial model setup complete');
        } else {
          console.log('[Models] Models not loaded, showing loading state');
        }
      }

      // GPT Model Selection
      if (gptModelSelect) {
        gptModelSelect.addEventListener('change', function () {
          window.MyMindAI.currentModel = this.value;
          console.log('Model changed to:', this.value);
          // 모델 기능 정보 UI 업데이트
          updateModelCapabilitiesUI(window.MyMindAI.currentService, this.value);
          // Save preferences when model changes
          saveUserPreferences();

          // AI 설정 동기화 (모델 변경)
          const currentService = window.MyMindAI?.currentService || aiServiceSelect?.value || 'gpt';
          syncToAISettings(currentService, this.value);
        });
      }

      // 다중 AI 선택 체크박스 이벤트
      const multiSelectAI = document.getElementById('multiSelectAI');
      const aiTabBar = document.getElementById('aiTabBar');

      if (multiSelectAI && aiTabBar) {
        // 탭 바 항상 표시 (단일/다중 모드 모두)
        aiTabBar.style.display = 'flex';

        // DB에서 설정 로드 (localStorage 폴백)
        try {
          const settingsResp = await fetch('/api/user/settings', { credentials: 'include' });
          if (settingsResp.ok) {
            const settingsResult = await settingsResp.json();
            if (settingsResult.success && settingsResult.data) {
              // 다중선택 모드 복원
              const multiEnabled = settingsResult.data.multiAiEnabled === 'true' || settingsResult.data.multiAiEnabled === true;
              if (multiEnabled) {
                multiSelectAI.checked = true;
                window.MyMindAI.multiSelectMode = true;
                console.log('[AI] Multi-select mode loaded from DB: enabled');
              }
              // 자동만들기 모드 복원
              const autoCreateCheckbox = document.getElementById('autoCreateNodeAI');
              const autoEnabled = settingsResult.data.autoCreateEnabled === 'true' || settingsResult.data.autoCreateEnabled === true;
              if (autoCreateCheckbox && autoEnabled) {
                autoCreateCheckbox.checked = true;
                console.log('[AI] Auto-create mode loaded from DB: enabled');
              }
            }
          }
        } catch (e) {
          // DB 실패 시 localStorage 폴백
          console.warn('[AI] DB 설정 로드 실패, localStorage 폴백:', e);
          const savedAISettings = localStorage.getItem('mymind3_ai_settings');
          if (savedAISettings) {
            try {
              const aiSettings = JSON.parse(savedAISettings);
              if (aiSettings.multiAiEnabled === true) {
                multiSelectAI.checked = true;
                window.MyMindAI.multiSelectMode = true;
              }
              const autoCreateCheckbox = document.getElementById('autoCreateNodeAI');
              if (autoCreateCheckbox && aiSettings.autoCreateEnabled) {
                autoCreateCheckbox.checked = true;
              }
            } catch (e2) {
              console.warn('[AI] localStorage 파싱 실패:', e2);
            }
          }
        }

        // 초기 탭 업데이트 (단일/다중 모드에 따라 탭 표시 조정)
        setTimeout(() => updateAITabsForMode(), 100);

        // 메인 페이지 토글 → DB 저장 + 설정 페이지 동기화 헬퍼
        async function saveToggleToServer(key, value) {
          try {
            const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
            await fetch('/api/user/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...csrfHeaders },
              credentials: 'include',
              body: JSON.stringify({ [key]: String(value) })
            });
            console.log('[AI] 설정 저장:', key, value);
            if (window.ApiCache) window.ApiCache.invalidatePattern('/api/user/settings');
          } catch (err) {
            console.warn('[AI] 설정 저장 실패:', err);
          }
          // localStorage 동기화 (폴백)
          try {
            const saved = localStorage.getItem('mymind3_ai_settings');
            const aiSettings = saved ? JSON.parse(saved) : {};
            if (key === 'multiAiEnabled') aiSettings.multiAiEnabled = value;
            if (key === 'autoCreateEnabled') aiSettings.autoCreateEnabled = value;
            localStorage.setItem('mymind3_ai_settings', JSON.stringify(aiSettings));
          } catch (e) { /* ignore */ }
        }

        multiSelectAI.addEventListener('change', function () {
          window.MyMindAI.multiSelectMode = this.checked;
          console.log('[AI] Multi-select mode:', this.checked ? 'enabled' : 'disabled');
          updateAITabsForMode();
          // DB에 저장
          saveToggleToServer('multiAiEnabled', this.checked);
          // 설정 페이지 토글 동기화
          const settingsEl = document.getElementById('settingsMultiSelectEnabled');
          if (settingsEl) settingsEl.checked = this.checked;
        });

        // 자동만들기 체크박스 이벤트
        const autoCreateCheckbox = document.getElementById('autoCreateNodeAI');
        if (autoCreateCheckbox) {
          autoCreateCheckbox.addEventListener('change', function () {
            console.log('[AI] Auto-create mode:', this.checked ? 'enabled' : 'disabled');
            // DB에 저장
            saveToggleToServer('autoCreateEnabled', this.checked);
            // 설정 페이지 토글 동기화
            const settingsEl = document.getElementById('settingsAutoCreateEnabled');
            if (settingsEl) settingsEl.checked = this.checked;
          });
        }

        // 설정 페이지에서 변경 시 메인 페이지 동기화 (settingsChanged 이벤트)
        window.addEventListener('settingsChanged', function (e) {
          if (e.detail) {
            if (e.detail.multiSelectEnabled !== undefined) {
              multiSelectAI.checked = e.detail.multiSelectEnabled;
              window.MyMindAI.multiSelectMode = e.detail.multiSelectEnabled;
              updateAITabsForMode();
            }
            if (e.detail.autoCreateEnabled !== undefined && autoCreateCheckbox) {
              autoCreateCheckbox.checked = e.detail.autoCreateEnabled;
            }
          }
        });

        // 탭 클릭 이벤트 설정
        setupAITabListeners();

        // Phase 7: 키보드 내비게이션 설정
        setupKeyboardNavigation();
      }

      // API Key Button - Settings 페이지로 이동 (팝업 제거됨)
      const apiKeyBtn = document.getElementById('apiKeyBtn');
      if (apiKeyBtn) {
        apiKeyBtn.addEventListener('click', () => {
          showSettingsLayerPopup('#ai');
        });
      }

      // Mindmap Icon Button (AI assistant for mind maps)
      const mindmapIconBtn = document.getElementById('mindmapIconBtn');
      if (mindmapIconBtn) {
        mindmapIconBtn.addEventListener('click', function () {
          const selectedNode = document.querySelector('.mindmap-node.selected');
          if (selectedNode) {
            suggestNodeExpansion(selectedNode);
          } else {
            alert(window.i18n?.alertSelectNode || '선택된 노드가 없습니다. 노드를 선택해주세요.');
          }
        });
      }

      // Enhanced Prompt Input and Send Button
      const promptInput = document.getElementById('promptInput');
      const sendPromptBtn = document.getElementById('sendPromptBtn');

      if (promptInput && sendPromptBtn) {
        // textarea 자동 높이 조절
        function autoResizePromptInput() {
          promptInput.style.height = 'auto';
          promptInput.style.height = Math.min(promptInput.scrollHeight, 150) + 'px';
        }
        promptInput.addEventListener('input', autoResizePromptInput);

        // value를 프로그래밍으로 변경할 때도 높이 리셋되도록 원본 setter 오버라이드
        const origValueDesc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        Object.defineProperty(promptInput, 'value', {
          get() { return origValueDesc.get.call(this); },
          set(v) {
            origValueDesc.set.call(this, v);
            autoResizePromptInput();
          }
        });

        // Enter = 전송, Shift+Enter = 줄바꿈
        promptInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAIMessage();
          }
        });

        sendPromptBtn.addEventListener('click', function () {
          if (window.MyMindAI.isProcessing) {
            // 처리중일 때 클릭하면 강제 중단
            cancelAIRequest();
          } else {
            // 처리중이 아닐 때는 메시지 전송
            sendAIMessage();
          }
        });

        // 이미지 첨부 버튼 이벤트 리스너
        console.log('[FileAttach:3579] 이미지 첨부 이벤트 리스너 초기화 시작');
        const imageAttachBtn = document.getElementById('imageAttachBtn');
        console.log('[FileAttach:3580] imageAttachBtn 요소 획득:', imageAttachBtn ? '성공' : '실패', imageAttachBtn);
        const imageAttachInput = document.getElementById('imageAttachInput');
        console.log('[FileAttach:3581] imageAttachInput 요소 획득:', imageAttachInput ? '성공' : '실패', imageAttachInput);
        const removeAttachedImage = document.getElementById('removeAttachedImage');
        console.log('[FileAttach:3582] removeAttachedImage 요소 획득:', removeAttachedImage ? '성공' : '실패', removeAttachedImage);

        console.log('[FileAttach:3583] imageAttachBtn && imageAttachInput 조건 검사:', !!(imageAttachBtn && imageAttachInput));
        if (imageAttachBtn && imageAttachInput) {
          console.log('[FileAttach:3584] 조건 통과 - 이벤트 리스너 등록 시작');
          // 첨부 버튼 클릭 시 파일 선택 다이얼로그 열기
          console.log('[FileAttach:3585] imageAttachBtn에 click 이벤트 리스너 등록');
          imageAttachBtn.addEventListener('click', () => {
            console.log('[FileAttach:3586] === 첨부 버튼 클릭됨 ===');
            console.log('[FileAttach:3587] imageAttachInput.click() 호출 전');
            imageAttachInput.click();
            console.log('[FileAttach:3588] imageAttachInput.click() 호출 후 - 파일 다이얼로그 열림');
          });
          console.log('[FileAttach:3589] imageAttachBtn click 이벤트 리스너 등록 완료');

          // 파일 선택 시 처리 (이미지, 비디오, 오디오 지원)
          console.log('[FileAttach:3590] imageAttachInput에 change 이벤트 리스너 등록');
          imageAttachInput.addEventListener('change', (e) => {
            console.log('[FileAttach:3591] === 파일 선택 change 이벤트 발생 ===');
            console.log('[FileAttach:3592] 이벤트 객체:', e);
            console.log('[FileAttach:3593] e.target.files:', e.target.files);
            console.log('[FileAttach:3594] e.target.files.length:', e.target.files.length);
            const file = e.target.files[0];
            console.log('[FileAttach:3595] 선택된 파일:', file);
            console.log('[FileAttach:3596] file 존재 여부:', !!file);
            if (file) {
              console.log('[FileAttach:3597] 파일 정보 - name:', file.name);
              console.log('[FileAttach:3598] 파일 정보 - type:', file.type);
              console.log('[FileAttach:3599] 파일 정보 - size:', file.size, 'bytes');
              console.log('[FileAttach:3600] 파일 정보 - lastModified:', file.lastModified);
              // 파일 타입 확인
              console.log('[FileAttach:3601] 파일 타입 확인 시작');
              const isImage = file.type.startsWith('image/');
              console.log('[FileAttach:3602] isImage (image/*로 시작):', isImage);
              const isVideo = file.type.startsWith('video/');
              console.log('[FileAttach:3603] isVideo (video/*로 시작):', isVideo);
              const isAudio = file.type.startsWith('audio/');
              console.log('[FileAttach:3604] isAudio (audio/*로 시작):', isAudio);

              // 텍스트/코드 파일 확인 (확장자 기반)
              const textExtensions = ['.md', '.txt', '.json', '.csv', '.xml', '.html', '.css', '.js', '.ts', '.py', '.java', '.c', '.cpp', '.h', '.yaml', '.yml'];
              const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
              const isText = textExtensions.includes(fileExt) || file.type.startsWith('text/');
              console.log('[FileAttach:3604-1] 파일 확장자:', fileExt);
              console.log('[FileAttach:3604-2] isText (텍스트/코드 파일):', isText);

              console.log('[FileAttach:3605] 허용된 파일 타입 체크: isImage || isVideo || isAudio || isText =', isImage || isVideo || isAudio || isText);
              if (!isImage && !isVideo && !isAudio && !isText) {
                console.log('[FileAttach:3606] 허용되지 않은 파일 타입! 경고 표시');
                alert(window.i18n?.alertFileTypeError || '이미지, 비디오, 오디오, 텍스트 파일만 첨부할 수 있습니다.');
                console.log('[FileAttach:3607] 함수 종료 (return)');
                return;
              }
              console.log('[FileAttach:3608] 파일 타입 검증 통과');

              // 파일 크기 체크 (이미지: 10MB, 비디오: 20MB, 오디오: 10MB, 텍스트: 5MB)
              console.log('[FileAttach:3609] 파일 크기 제한 계산 시작');
              const maxSize = isVideo ? 20 * 1024 * 1024 : (isText ? 5 * 1024 * 1024 : 10 * 1024 * 1024);
              console.log('[FileAttach:3610] maxSize 계산:', maxSize, 'bytes (', maxSize / 1024 / 1024, 'MB)');
              const maxSizeLabel = isVideo ? '20MB' : (isText ? '5MB' : '10MB');
              console.log('[FileAttach:3611] maxSizeLabel:', maxSizeLabel);
              console.log('[FileAttach:3612] 파일 크기 비교: file.size(', file.size, ') > maxSize(', maxSize, ') =', file.size > maxSize);
              if (file.size > maxSize) {
                console.log('[FileAttach:3613] 파일 크기 초과! 경고 표시');
                alert(`파일 크기는 ${maxSizeLabel} 이하여야 합니다.`);
                console.log('[FileAttach:3614] 함수 종료 (return)');
                return;
              }
              console.log('[FileAttach:3615] 파일 크기 검증 통과');

              // 파일을 Base64로 변환
              console.log('[FileAttach:3616] FileReader 생성 시작');
              const reader = new FileReader();
              console.log('[FileAttach:3617] FileReader 객체 생성 완료:', reader);
              console.log('[FileAttach:3618] reader.onload 콜백 함수 설정');
              reader.onload = (event) => {
                console.log('[FileAttach:3619] === FileReader onload 이벤트 발생 ===');
                console.log('[FileAttach:3620] 파일 읽기 완료');
                const base64Data = event.target.result;
                console.log('[FileAttach:3621] base64Data 길이:', base64Data?.length || 0);
                console.log('[FileAttach:3622] base64Data 시작 부분 (100자):', base64Data?.substring(0, 100));
                const mimeType = file.type;
                console.log('[FileAttach:3623] mimeType:', mimeType);

                // 파일 데이터 저장
                console.log('[FileAttach:3624] window.MyMindAI.attachedImage에 파일 데이터 저장 시작');
                console.log('[FileAttach:3625] window.MyMindAI 객체 존재:', !!window.MyMindAI);
                window.MyMindAI.attachedImage = {
                  base64: base64Data.split(',')[1], // data:xxx;base64, 부분 제거
                  mimeType: mimeType || 'text/plain',
                  fileName: file.name,
                  fileType: isImage ? 'image' : (isVideo ? 'video' : (isAudio ? 'audio' : 'text'))
                };
                console.log('[FileAttach:3626] window.MyMindAI.attachedImage 저장 완료');
                console.log('[FileAttach:3627] 저장된 데이터 - fileName:', window.MyMindAI.attachedImage.fileName);
                console.log('[FileAttach:3628] 저장된 데이터 - fileType:', window.MyMindAI.attachedImage.fileType);
                console.log('[FileAttach:3629] 저장된 데이터 - mimeType:', window.MyMindAI.attachedImage.mimeType);
                console.log('[FileAttach:3630] 저장된 데이터 - base64 길이:', window.MyMindAI.attachedImage.base64?.length || 0);

                // 미리보기 표시
                console.log('[FileAttach:3631] 미리보기 UI 요소 획득 시작');
                const previewArea = document.getElementById('imagePreviewArea');
                console.log('[FileAttach:3632] previewArea 획득:', previewArea ? '성공' : '실패');
                const previewImg = document.getElementById('attachedImagePreview');
                console.log('[FileAttach:3633] previewImg 획득:', previewImg ? '성공' : '실패');
                const imageName = document.getElementById('attachedImageName');
                console.log('[FileAttach:3634] imageName 획득:', imageName ? '성공' : '실패');

                // 파일 타입별 미리보기
                console.log('[FileAttach:3635] 파일 타입별 미리보기 처리 시작');
                if (isImage) {
                  console.log('[FileAttach:3636] 이미지 파일 - base64 데이터를 src에 설정');
                  previewImg.src = base64Data;
                  console.log('[FileAttach:3637] previewImg.src 설정 완료');
                  previewImg.style.display = 'block';
                  console.log('[FileAttach:3638] previewImg.style.display = block 설정 완료');
                } else if (isVideo) {
                  console.log('[FileAttach:3639] 비디오 파일 - 아이콘 SVG를 src에 설정');
                  // 비디오는 아이콘으로 표시
                  previewImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMTk3NmQyIj48cGF0aCBkPSJNMTcgMTAuNVY3YTEgMSAwIDAgMC0xLTFINGExIDEgMCAwIDAtMSAxdjEwYTEgMSAwIDAgMCAxIDFoMTJhMSAxIDAgMCAwIDEtMXYtMy41bDQgNHYtMTFsLTQgNHoiLz48L3N2Zz4=';
                  console.log('[FileAttach:3640] 비디오 아이콘 SVG 설정 완료');
                  previewImg.style.display = 'block';
                  console.log('[FileAttach:3641] previewImg.style.display = block 설정 완료');
                } else if (isAudio) {
                  console.log('[FileAttach:3642] 오디오 파일 - 아이콘 SVG를 src에 설정');
                  // 오디오는 아이콘으로 표시
                  previewImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjMTk3NmQyIj48cGF0aCBkPSJNMTIgM3Y5LjI4Yy0uNDctLjE3LS45Ny0uMjgtMS41LS4yOEMxMC4wMSAxMiA4IDEzLjM0IDggMTV2MC4yNUM4IDE2Ljc3IDkuNzkgMTggMTIgMThzNC0xLjIzIDQtMi43NVYzaC00ek0xNCAxOGMwLS41NS40NS0xIDEtMXMxIC40NSAxIDEtLjQ1IDEtMSAxLTEtLjQ1LTEtMXoiLz48cGF0aCBkPSJNMyA5djZoNGw1IDVWNEw3IDloLTR6Ii8+PC9zdmc+';
                  console.log('[FileAttach:3643] 오디오 아이콘 SVG 설정 완료');
                  previewImg.style.display = 'block';
                  console.log('[FileAttach:3644] previewImg.style.display = block 설정 완료');
                } else if (isText) {
                  console.log('[FileAttach:3644-1] 텍스트/코드 파일 - 아이콘 SVG를 src에 설정');
                  // 텍스트/코드 파일은 문서 아이콘으로 표시
                  previewImg.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjNGNhZjUwIj48cGF0aCBkPSJNMTQgMkg2Yy0xLjEgMC0xLjk5LjktMS45OSAyTDQgMjBjMCAxLjEuODkgMiAxLjk5IDJIMThjMS4xIDAgMi0uOSAyLTJWOGwtNi02em0yIDE2SDh2LTJoOHYyem0wLTRIOHYtMmg4djJ6bS0zLTVWMy41TDE4LjUgOUgxM3oiLz48L3N2Zz4=';
                  console.log('[FileAttach:3644-2] 텍스트 아이콘 SVG 설정 완료');
                  previewImg.style.display = 'block';
                  console.log('[FileAttach:3644-3] previewImg.style.display = block 설정 완료');
                }

                console.log('[FileAttach:3645] 파일명 표시 설정: ', file.name);
                imageName.textContent = file.name;
                console.log('[FileAttach:3646] imageName.textContent 설정 완료');
                previewArea.style.display = 'flex';
                console.log('[FileAttach:3647] previewArea.style.display = flex 설정 완료');
                imageAttachBtn.classList.add('has-image');
                console.log('[FileAttach:3648] imageAttachBtn에 has-image 클래스 추가 완료');

                const typeLabel = isImage ? 'Image' : (isVideo ? 'Video' : (isAudio ? 'Audio' : 'Text'));
                console.log('[FileAttach:3649] typeLabel:', typeLabel);
                console.log(`[FileAttach:3650] ${typeLabel} 첨부 완료:`, file.name, mimeType);
                console.log('[FileAttach:3651] === FileReader onload 처리 완료 ===');
              };
              console.log('[FileAttach:3652] reader.readAsDataURL() 호출 - 파일 읽기 시작');
              reader.readAsDataURL(file);
              console.log('[FileAttach:3653] reader.readAsDataURL() 호출 완료 (비동기 처리 중)');
            } else {
              console.log('[FileAttach:3654] 파일이 선택되지 않음 (file = null 또는 undefined)');
            }
            console.log('[FileAttach:3655] === change 이벤트 핸들러 종료 ===');
          });
          console.log('[FileAttach:3656] imageAttachInput change 이벤트 리스너 등록 완료');
        } else {
          console.log('[FileAttach:3657] 조건 실패 - imageAttachBtn 또는 imageAttachInput이 없음');
        }

        // 이미지 제거 버튼
        console.log('[FileAttach:3658] removeAttachedImage 요소 존재 여부:', !!removeAttachedImage);
        if (removeAttachedImage) {
          console.log('[FileAttach:3659] removeAttachedImage에 click 이벤트 리스너 등록');
          removeAttachedImage.addEventListener('click', () => {
            console.log('[FileAttach:3660] === 이미지 제거 버튼 클릭됨 ===');
            console.log('[FileAttach:3661] window.MyMindAI.clearAttachedImage() 호출');
            window.MyMindAI.clearAttachedImage();
            console.log('[FileAttach:3662] clearAttachedImage() 실행 완료');
            console.log('[FileAttach:3663] 이미지 제거 완료');
          });
          console.log('[FileAttach:3664] removeAttachedImage click 이벤트 리스너 등록 완료');
        } else {
          console.log('[FileAttach:3665] removeAttachedImage 요소가 없음');
        }
        console.log('[FileAttach:3666] === 이미지 첨부 이벤트 리스너 초기화 완료 ===');

        // ============================================
        // 드래그 앤 드롭 파일 첨부 기능
        // ============================================
        console.log('[DragDrop] 드래그 앤 드롭 이벤트 리스너 초기화 시작');
        const fileDropZone = document.getElementById('fileDropZone');
        const inputAreaDropTarget = document.getElementById('inputAreaDropTarget');

        // 드롭 영역들 (입력창 영역과 드롭존)
        const dropTargets = [fileDropZone, inputAreaDropTarget].filter(el => el);
        console.log('[DragDrop] 드롭 타겟 요소 수:', dropTargets.length);

        // 파일 처리 함수 (기존 change 이벤트와 동일한 로직)
        function handleDroppedFile(file) {
          console.log('[DragDrop] 드롭된 파일 처리 시작:', file.name);

          // 파일 타입 확인
          const isImage = file.type.startsWith('image/');
          const isVideo = file.type.startsWith('video/');
          const isAudio = file.type.startsWith('audio/');
          const textExtensions = ['.md', '.txt', '.json', '.csv', '.xml', '.html', '.css', '.js', '.ts', '.py', '.java', '.c', '.cpp', '.h', '.yaml', '.yml'];
          const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
          const isText = textExtensions.includes(fileExt) || file.type.startsWith('text/');

          if (!isImage && !isVideo && !isAudio && !isText) {
            console.log('[DragDrop] 허용되지 않은 파일 타입');
            alert(window.i18n?.alertFileTypeError || '이미지, 비디오, 오디오, 텍스트 파일만 첨부할 수 있습니다.');
            return;
          }

          // 파일 크기 체크
          const maxSize = isVideo ? 20 * 1024 * 1024 : (isText ? 5 * 1024 * 1024 : 10 * 1024 * 1024);
          const maxSizeLabel = isVideo ? '20MB' : (isText ? '5MB' : '10MB');
          if (file.size > maxSize) {
            console.log('[DragDrop] 파일 크기 초과');
            alert(`파일 크기는 ${maxSizeLabel} 이하여야 합니다.`);
            return;
          }

          // FileReader로 Base64 변환
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64Data = e.target.result;
            let mimeType = file.type;

            if (isText && !mimeType) {
              const extMimeMap = {
                '.md': 'text/markdown', '.txt': 'text/plain', '.json': 'application/json',
                '.csv': 'text/csv', '.xml': 'application/xml', '.html': 'text/html',
                '.css': 'text/css', '.js': 'text/javascript', '.ts': 'text/typescript',
                '.py': 'text/x-python', '.java': 'text/x-java', '.c': 'text/x-c',
                '.cpp': 'text/x-c++', '.h': 'text/x-c', '.yaml': 'text/yaml', '.yml': 'text/yaml'
              };
              mimeType = extMimeMap[fileExt] || 'text/plain';
            }

            // 첨부 데이터 저장
            window.MyMindAI.attachedImage = {
              base64: base64Data.split(',')[1],
              mimeType: mimeType || 'text/plain',
              fileName: file.name,
              fileType: isImage ? 'image' : (isVideo ? 'video' : (isAudio ? 'audio' : 'text'))
            };

            // UI 업데이트
            const previewArea = document.getElementById('imagePreviewArea');
            const previewImg = document.getElementById('attachedImagePreview');
            const fileNameSpan = document.getElementById('attachedImageName');
            const attachBtn = document.getElementById('imageAttachBtn');

            if (previewArea) previewArea.style.display = 'flex';
            if (fileNameSpan) fileNameSpan.textContent = file.name;
            if (attachBtn) attachBtn.classList.add('has-image');

            // 미리보기 이미지 설정
            if (previewImg) {
              if (isImage) {
                previewImg.src = base64Data;
              } else if (isVideo) {
                previewImg.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234a90d9"><path d="M8 5v14l11-7z"/></svg>');
              } else if (isAudio) {
                previewImg.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234a90d9"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>');
              } else {
                previewImg.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%234a90d9"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>');
              }
            }

            console.log('[DragDrop] 파일 첨부 완료:', file.name);
          };

          reader.readAsDataURL(file);
        }

        // 드래그 이벤트 핸들러
        let dragCounter = 0;

        // 전체 응답 패널에 대한 드래그 이벤트 (드롭존 표시용)
        const responsePanel = document.getElementById('rightPanel') || document.querySelector('.llm-response');
        if (responsePanel) {
          responsePanel.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter++;

            // 루트 노드 있는지 확인 (첨부 버튼 활성화 상태와 동일 조건)
            const hasRootNode = window.MyMind3?.MindMapData?.mindMapData?.length > 0;
            if (!hasRootNode) return;

            if (fileDropZone) {
              fileDropZone.classList.add('drag-active');
            }
            if (inputAreaDropTarget) {
              inputAreaDropTarget.classList.add('drag-over');
            }
            console.log('[DragDrop] 드래그 진입');
          });

          responsePanel.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter--;

            if (dragCounter === 0) {
              if (fileDropZone) {
                fileDropZone.classList.remove('drag-active', 'drag-over');
              }
              if (inputAreaDropTarget) {
                inputAreaDropTarget.classList.remove('drag-over');
              }
              console.log('[DragDrop] 드래그 이탈');
            }
          });

          responsePanel.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
          });

          responsePanel.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dragCounter = 0;

            // 스타일 제거
            if (fileDropZone) {
              fileDropZone.classList.remove('drag-active', 'drag-over');
            }
            if (inputAreaDropTarget) {
              inputAreaDropTarget.classList.remove('drag-over');
            }

            // 루트 노드 확인
            const hasRootNode = window.MyMind3?.MindMapData?.mindMapData?.length > 0;
            if (!hasRootNode) {
              console.log('[DragDrop] 루트 노드가 없어 파일 첨부 불가');
              return;
            }

            // 파일 처리
            const files = e.dataTransfer.files;
            if (files.length > 0) {
              console.log('[DragDrop] 드롭된 파일 수:', files.length);
              handleDroppedFile(files[0]); // 첫 번째 파일만 처리
            }
          });

          console.log('[DragDrop] 드래그 앤 드롭 이벤트 리스너 등록 완료');
        } else {
          console.log('[DragDrop] response-panel 요소를 찾을 수 없음');
        }
      }

      // Clear Q&A button event listener (독립적으로 등록)
      const clearQaBtn = document.getElementById('clearQaBtn');
      if (clearQaBtn) {
        clearQaBtn.addEventListener('click', function() {
          clearQA();
        });
      }

      // API Key 팝업 제거됨 - Settings 페이지에서 API 키 관리
    }

    // ============================================
    // 크레딧 관리 함수
    // ============================================

    // 크레딧 잔액 조회
    async function getCreditBalance() {
      try {
        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
        // ApiCache 사용 (중복 호출 방지)
        const response = window.ApiCache
          ? await window.ApiCache.fetch('/api/credits/balance')
          : await fetch('/api/credits/balance', { method: 'GET', credentials: 'include' });

        if (response.ok) {
          const data = await response.json();
          return data.data;
        }
      } catch (error) {
        console.error('[Credits] Failed to get balance:', error);
      }
      return null;
    }

    // 크레딧 차감
    async function deductCredits(service, model, tokens) {
      try {
        // 크레딧 모드 확인 (설정에서 가져옴)
        const savedSettings = localStorage.getItem('aiSettings');
        let creditMode = false;
        if (savedSettings) {
          try {
            const settings = JSON.parse(savedSettings);
            creditMode = settings.creditMode === true;
          } catch (e) {}
        }

        // 크레딧 모드가 아니면 차감하지 않음 (API Key 사용)
        if (!creditMode) {
          console.log('[Credits] Credit mode disabled, using API key');
          return { success: true, skipped: true };
        }

        // 토큰 수에 따른 크레딧 계산 (1K 토큰당 기본 1 크레딧)
        const creditsToDeduct = Math.ceil(tokens / 1000);

        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
        const response = await fetch('/api/credits/deduct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include',
          body: JSON.stringify({
            amount: creditsToDeduct,
            service,
            model,
            tokens
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[Credits] Deducted ${creditsToDeduct} credits for ${service}/${model}`);

          // 크레딧 차감 후 balance 캐시 무효화
          if (window.ApiCache) {
            window.ApiCache.invalidate('/api/credits/balance');
          }

          // 잔액 UI 업데이트
          updateCreditBalanceUI(data.data.remaining);

          return data;
        } else {
          const errorData = await response.json();
          console.error('[Credits] Deduction failed:', errorData.error);
          return { success: false, error: errorData.error };
        }
      } catch (error) {
        console.error('[Credits] Deduction error:', error);
        return { success: false, error: error.message };
      }
    }

    // 잔액 UI 업데이트
    function updateCreditBalanceUI(balance) {
      // 헤더의 크레딧 표시 업데이트
      // 형식: (크레딧C) - 크레딧과 C는 굵은 글씨, 쉼표 없음
      const creditPart = document.getElementById('creditPart');
      if (creditPart && balance !== undefined) {
        const total = balance.total !== undefined ? balance.total :
                     (balance.free || 0) + (balance.service || 0) + (balance.paid || 0);
        creditPart.innerHTML = total > 0 ? `(<b>${Math.floor(total)}C</b>)` : '';
      }
    }

    // 전역 함수 노출 (설정 페이지에서 구독 후 크레딧 업데이트용)
    window.getCreditBalance = getCreditBalance;
    window.updateCreditBalanceUI = updateCreditBalanceUI;

    // 크레딧 잔액 검증 (요청 전)
    async function validateCreditBalance(estimatedTokens) {
      const savedSettings = localStorage.getItem('aiSettings');
      let creditMode = false;
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          creditMode = settings.creditMode === true;
        } catch (e) {}
      }

      // 크레딧 모드가 아니면 검증 통과
      if (!creditMode) {
        return { valid: true, message: 'API Key mode' };
      }

      const balance = await getCreditBalance();
      if (!balance) {
        return { valid: false, message: t('appCreditInfoFailed', '크레딧 정보를 가져올 수 없습니다.') };
      }

      const requiredCredits = Math.ceil(estimatedTokens / 1000);
      const totalBalance = balance.credits.total;

      if (totalBalance < requiredCredits) {
        // Phase 7: 크레딧 부족 토스트 표시
        showCreditToast(`크레딧이 부족합니다. (필요: ${requiredCredits}, 잔액: ${totalBalance})`, 'error', 5000);
        return {
          valid: false,
          message: `크레딧이 부족합니다. 필요: ${requiredCredits}, 잔액: ${totalBalance}`,
          balance: totalBalance,
          required: requiredCredits
        };
      }

      // Phase 7: 크레딧 잔액 부족 경고 (잔액이 예상 소비의 2배 미만일 때)
      if (totalBalance < requiredCredits * 2) {
        showCreditToast(`크레딧 잔액이 부족해지고 있습니다. (잔액: ${totalBalance})`, 'warning', 3000);
      }

      return {
        valid: true,
        balance: totalBalance,
        required: requiredCredits
      };
    }

    // ============================================
    // AI 다중 질의 탭 바 관련 함수
    // ============================================

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

    // AI 탭 동적 생성 및 업데이트
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

    // window 스코프에 노출 (설정 페이지에서 모델 변경 시 탭 업데이트용)
    window.updateAITabs = updateAITabs;
    window.updateAITabsForMode = updateAITabsForMode;

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

    // Phase 7: 토스트 메시지 표시
    function showCreditToast(message, type = 'warning', duration = 4000) {
      // 기존 토스트 제거
      const existingToast = document.querySelector('.credit-toast');
      if (existingToast) {
        existingToast.remove();
      }

      // 아이콘 선택 (SVG 아이콘 사용)
      const icons = {
        warning: mmIcon('alert-triangle', 16),
        error: mmIcon('x-circle', 16),
        success: mmIcon('check-circle', 16),
        info: mmIcon('info', 16)
      };

      // 토스트 생성
      const toast = document.createElement('div');
      toast.className = `credit-toast ${type}`;
      toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="닫기">&times;</button>
      `;

      document.body.appendChild(toast);

      // 닫기 버튼 이벤트
      toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      });

      // 애니메이션으로 표시
      requestAnimationFrame(() => {
        toast.classList.add('show');
      });

      // 자동 숨김
      if (duration > 0) {
        setTimeout(() => {
          if (toast.parentElement) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
          }
        }, duration);
      }

      return toast;
    }

    // Phase 7: 키보드 내비게이션 설정
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

    // API Key 팝업 함수 제거됨 - Settings 페이지에서 API 키 관리
    // hideAPIKeyPopup() 및 setupAPIKeyPopup() 함수 제거됨

    // Global variable to track current folder for auto-save
    window.currentQAFolder = null;

    // Service-specific optimal token calculation
    function getOptimalMaxTokens(service, model, requestType = 'chat') {
      const serviceTokenLimits = {
        gpt: {
          'gpt-5': 128000,
          'gpt-5-codex': 128000,
          'o3': 100000,
          'o3-mini': 100000,
          'gpt-4.1': 32768,
          'gpt-4.1-mini': 32768,
          'gpt-4.1-nano': 32768,
          'gpt-4o': 4096,
          'gpt-4o-mini': 4096,
          'gpt-4-turbo': 4096,
          'gpt-3.5-turbo': 4096,
          'default': 4096
        },
        grok: {
          'grok-4': 16000,
          'grok-3': 16000,
          'grok-2': 8192,
          'grok-2-mini': 8192,
          'grok-1.5': 8192,
          'grok-1': 8192,
          'default': 8192
        },
        claude: {
          'claude-3.7-sonnet': 128000,
          'claude-opus-4': 8192,
          'claude-sonnet-4': 8192,
          'claude-haiku-4': 8192,
          'claude-3.5-sonnet': 8192,
          'default': 8192
        },
        gemini: {
          'gemini-2.0-pro': 8192,
          'gemini-2.0-flash': 2048,
          'gemini-1.5-pro': 8192,
          'gemini-1.5-flash': 8192,
          'default': 8192
        },
        local: {
          'gpt-oss-20b': 32000,
          'llama-2-70b': 32000,
          'mistral-7b': 32000,
          'codellama-34b': 32000,
          'default': 32000
        }
      };

      const serviceMap = serviceTokenLimits[service] || serviceTokenLimits.gpt;
      const maxTokens = serviceMap[model] || serviceMap.default;

      // For node expansion, use about 50% of max tokens to leave room for input
      if (requestType === 'nodeExpansion') {
        return Math.floor(maxTokens * 0.5);
      }

      // For chat, use about 80% of max tokens to leave room for input
      return Math.floor(maxTokens * 0.8);
    }

    // Auto-save Q&A content function
    // service 파라미터: AI 서비스명 (gpt, gemini, claude, grok, local) - 다중 AI 모드에서 사용
    async function autoSaveQAItem(qaItemHtml, service = null) {
      // CRITICAL FIX: AI 응답의 경우 HTML이 아닌 원본 마크다운을 저장
      // HTML에서 data-original-content 속성을 찾아 원본 마크다운 추출
      let processedHtml = qaItemHtml;

      // HTML 문자열을 임시 DOM으로 파싱
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = qaItemHtml;

      // AI 응답인지 확인 (.ai-content 요소가 있는지)
      const aiContentDiv = tempDiv.querySelector('.ai-content');
      if (aiContentDiv) {
        const originalContent = aiContentDiv.getAttribute('data-original-content');
        if (originalContent) {
          // 원본 마크다운 디코딩
          try {
            const markdownContent = decodeURIComponent(originalContent);
            console.log('[autoSaveQAItem] Extracting markdown from data-original-content');

            // 메타데이터 추출 (모델명, 시간)
            const metadataDiv = tempDiv.querySelector('.ai-metadata');
            let metadataHtml = '';
            if (metadataDiv) {
              metadataHtml = metadataDiv.outerHTML;
            }

            // 마크다운 content를 HTML로 재구성 (저장 시에는 data-original-content 속성 제거)
            // formatAIResponse를 사용하지 않고 마크다운 텍스트만 저장
            const markdownDiv = `<div class="ai-content" style="color: #000000; line-height: 1.6; white-space: pre-wrap;">${markdownContent}</div>`;

            // 복사 버튼 HTML 추가
            const copyButtonHTML = '<div style="text-align: right; margin-top: 10px;"><button class="copy-btn" style="padding: 6px 14px; background: #1976d2; color: #fff; border: none; border-radius: 6px; cursor: pointer;">복사</button></div>';

            // 전체 HTML 재구성 (메타데이터 + 전체 복사 버튼 + 마크다운 + 복사 버튼)
            const messageDiv = tempDiv.querySelector('div[style*="margin-bottom: 20px"]');
            if (messageDiv) {
              // 기존 스타일 유지
              const styleAttr = messageDiv.getAttribute('style');
              processedHtml = `<div style="${styleAttr}">`;

              // 메타데이터 헤더 (모델명, 시간)
              if (metadataHtml) {
                processedHtml += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">`;
                processedHtml += metadataDiv.innerHTML;
                processedHtml += `</div>`;
              }

              processedHtml += markdownDiv;
              processedHtml += copyButtonHTML;
              processedHtml += `</div>`;

              console.log('[autoSaveQAItem] Saving markdown with copy buttons');
            }
          } catch (e) {
            console.error('[autoSaveQAItem] Failed to extract markdown:', e);
            // 실패 시 원본 HTML 사용
          }
        }
      }

      // JSON의 mindMapData에서 폴더명과 qaFile 경로 가져오기
      let currentFolder = null;
      let qaFile = 'qa.html'; // 기본값

      if (window.MyMind3?.MindMapData?.mindMapData?.length > 0) {
        const rootNode = window.MyMind3.MindMapData.mindMapData[0];
        if (rootNode) {
          // 폴더명: 저장된 값 > title 폴백
          currentFolder = window.MyMind3?.currentFolder
            || localStorage.getItem('currentFolder')
            || rootNode.title;
          // JSON에 qaFile 정보가 있으면 사용
          if (rootNode.qaFile) {
            qaFile = rootNode.qaFile;
          }
          console.log('[autoSaveQAItem] Folder from JSON:', currentFolder);
          console.log('[autoSaveQAItem] QA file from JSON:', qaFile);
        }
      }

      // Fallback: 메모리에 저장된 currentQAFolder 사용
      if (!currentFolder) {
        currentFolder = window.currentQAFolder;
        console.log('[autoSaveQAItem] Fallback to window.currentQAFolder:', currentFolder);
      }

      if (!currentFolder) {
        console.error('[autoSaveQAItem] No current folder detected! Cannot save Q&A.');
        console.error('Debug info:', {
          'window.MyMind3?.MindMapData?.mindMapData': window.MyMind3?.MindMapData?.mindMapData,
          'window.currentQAFolder': window.currentQAFolder
        });
        return;
      }

      console.log('Using folder for Q&A auto-save:', currentFolder);
      console.log('Using QA file:', qaFile);

      try {
        console.log('Auto-saving Q&A item to folder:', currentFolder);

        // service 파라미터가 있으면 AI별 Q&A 파일에 저장 (다중 AI 모드)
        const requestBody = {
          folderName: currentFolder,
          qaItem: processedHtml  // 마크다운이 포함된 HTML 저장
        };
        if (service) {
          requestBody.service = service;
        }

        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch('/api/saveqa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include',
          body: JSON.stringify(requestBody)
        });

        const result = await response.json();

        if (result.success) {
          console.log('Q&A auto-saved successfully to:', result.path);

          // 이미지 매핑 정보 저장 (자동 만들기에서 사용)
          if (result.imageMapping && result.imageMapping.length > 0) {
            window.lastQAImageMapping = result.imageMapping;
            console.log('[autoSaveQAItem] 이미지 매핑 저장:', result.imageMapping.length, '개');
          }

          // qaFiles 배열에 저장된 파일명 추가
          if (window.MyMind3?.MindMapData?.mindMapData?.length > 0) {
            const rootNode = window.MyMind3.MindMapData.mindMapData[0];
            if (rootNode) {
              // qaFiles 배열 초기화 (없으면 생성)
              if (!Array.isArray(rootNode.qaFiles)) {
                rootNode.qaFiles = [];
              }

              // 저장된 파일명 결정
              const savedFileName = service ? `${service}_qa.html` : 'qa.html';

              // 중복 방지: 이미 없으면 추가
              if (!rootNode.qaFiles.includes(savedFileName)) {
                rootNode.qaFiles.push(savedFileName);
                console.log(`[autoSaveQAItem] Added "${savedFileName}" to qaFiles:`, rootNode.qaFiles);

                // JSON 파일도 자동 저장 (qaFiles 변경사항 반영)
                try {
                  const saveData = {
                    mindMapData: window.MyMind3.MindMapData.mindMapData,
                    nextNodeId: window.MyMind3.MindMapData.nextNodeId || 1
                  };
                  const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
                  const saveResponse = await fetch('/api/mindmap/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...csrfHeaders },
                    credentials: 'include',
                    body: JSON.stringify({
                      folder: currentFolder,
                      data: saveData
                    })
                  });
                  if (saveResponse.ok) {
                    console.log(`[autoSaveQAItem] JSON saved with updated qaFiles`);
                  }
                } catch (saveErr) {
                  console.error('[autoSaveQAItem] Failed to save JSON:', saveErr);
                }
              }
            }
          }
        } else {
          console.error('Failed to auto-save Q&A:', result.error);
        }
      } catch (error) {
        console.error('Error auto-saving Q&A:', error);
      }
    }

    // Clear Q&A history (커스텀 모달 사용 - 디버그 모드 호환)
    async function clearQA() {
      // 커스텀 확인 모달 생성
      const confirmed = await new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9998;';

        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:9999;min-width:300px;text-align:center;';
        modal.innerHTML = `<div style="font-size:16px;margin-bottom:20px;color:#333;">${window.i18n?.clearQaConfirmMsg || 'Q&A 기록을 모두 삭제하시겠습니까?'}</div><div style="display:flex;gap:12px;justify-content:center;"><button id="clearQaCancelBtn" style="padding:10px 24px;background:#ccc;border:none;border-radius:4px;cursor:pointer;">${window.i18n?.cancelBtn || '취소'}</button><button id="clearQaOkBtn" style="padding:10px 24px;background:#ff6b6b;color:#fff;border:none;border-radius:4px;cursor:pointer;">${window.i18n?.deleteBtn || '삭제'}</button></div>`;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        const cleanup = () => { modal.remove(); overlay.remove(); };
        document.getElementById('clearQaOkBtn').onclick = () => { cleanup(); resolve(true); };
        document.getElementById('clearQaCancelBtn').onclick = () => { cleanup(); resolve(false); };
        overlay.onclick = () => { cleanup(); resolve(false); };
      });

      if (!confirmed) return;

      // 현재 폴더 가져오기
      const currentFolder = window.MyMind3?.currentFolder || window.currentFolder || '';
      if (!currentFolder) {
        if (typeof showToast === 'function') {
          showToast(window.i18n?.toastLoadMindmapFirst || '마인드맵을 먼저 불러와주세요.', 'warning');
        }
        return;
      }

      try {
        // qaFiles 배열에서 실제 존재하는 서비스 목록 추출
        // 비어있으면 서버에서 폴더 내 모든 *_qa.html 파일을 자동 감지하여 삭제
        let services = [];
        if (window.MyMind3?.MindMapData?.mindMapData?.length > 0) {
          const rootNode = window.MyMind3.MindMapData.mindMapData[0];
          if (rootNode && rootNode.qaFiles && rootNode.qaFiles.length > 0) {
            // qaFiles에서 서비스 이름 추출 (예: "gpt_qa.html" -> "gpt")
            services = rootNode.qaFiles.map(file => {
              const match = file.match(/^(.+)_qa\.html$/);
              return match ? match[1] : null;
            }).filter(s => s !== null);
            console.log('[clearQA] Services from qaFiles:', services);
          }
        }

        // services가 비어있으면 서버에서 자동 감지하도록 빈 배열 전송
        if (services.length === 0) {
          console.log('[clearQA] Services empty, server will auto-detect all *_qa.html files');
        }

        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch('/api/ai/clear-qa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include',
          body: JSON.stringify({ folder: currentFolder, services: services })
        });

        if (response.ok) {
          if (typeof showToast === 'function') {
            showToast(window.i18n?.toastQaDeleted || 'Q&A 기록이 삭제되었습니다.', 'success');
          }

          // qaFiles 배열 비우기 및 자동 저장
          if (window.MyMind3?.MindMapData?.mindMapData?.length > 0) {
            const rootNode = window.MyMind3.MindMapData.mindMapData[0];
            if (rootNode) {
              rootNode.qaFiles = [];
              // 하위 호환성: 기존 qaFile도 제거
              delete rootNode.qaFile;
              console.log('[clearQA] qaFiles array cleared');

              // JSON 파일에 변경사항 자동 저장
              if (typeof window.MyMind3Simple?.saveMindmapSilently === 'function') {
                window.MyMind3Simple.saveMindmapSilently();
                console.log('[clearQA] Mindmap saved silently after clearing qaFiles');
              }
            }
          }

          const llmResponse = document.getElementById('llmResponse');
          if (llmResponse) {
            llmResponse.innerHTML = '';
            if (window.MyMind3Simple && window.MyMind3Simple.ensureAIContainers) {
              window.MyMind3Simple.ensureAIContainers();
            }
          }
        } else {
          const errorData = await response.json();
          if (typeof showToast === 'function') {
            showToast((window.i18n?.toastDeleteFailed || '삭제 실패') + ': ' + (errorData.message || (window.i18n?.alertUnknownError || '알 수 없는 오류')), 'error');
          }
        }
      } catch (error) {
        console.error('Clear QA error:', error);
        if (typeof showToast === 'function') {
          showToast(window.i18n?.toastDeleteError || '삭제 중 오류가 발생했습니다.', 'error');
        }
      }
    }

    function cancelAIRequest() {
      console.log('[AI] Cancelling request...');

      // Abort fetch request
      if (window.MyMindAI.abortController) {
        window.MyMindAI.abortController.abort();
        window.MyMindAI.abortController = null;
      }

      // Cancel stream reader
      if (window.MyMindAI.streamReader) {
        window.MyMindAI.streamReader.cancel();
        window.MyMindAI.streamReader = null;
      }

      // 처리 중 UI 복원 (리스타일 복원)
      const promptInput = document.getElementById('promptInput');
      const sendBtn = document.getElementById('sendPromptBtn');
      const imageAttachBtn = document.getElementById('imageAttachBtn');
      const clearQaBtn = document.getElementById('clearQaBtn');
      if (promptInput) {
        promptInput.disabled = false;
        promptInput.value = '';
        promptInput.style.background = '';
        promptInput.style.color = '';
        promptInput.style.borderColor = '';
        promptInput.style.fontWeight = '';
      }
      if (imageAttachBtn) imageAttachBtn.disabled = false;
      if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = window.i18n?.sendBtn || '전송'; }
      if (clearQaBtn) clearQaBtn.disabled = false;

      // Reset processing state
      window.MyMindAI.isProcessing = false;

      // Add cancellation message to display
      const llmResponse = document.getElementById('llmResponse');
      if (llmResponse) {
        const cancelDiv = document.createElement('div');
        cancelDiv.className = 'message system-message';
        cancelDiv.style.cssText = 'padding: 10px; margin-bottom: 10px; background-color: #fff3cd; border-left: 4px solid #ffc107; color: #856404; border-radius: 4px; font-size: 14px;';
        cancelDiv.innerHTML = mmIcon('alert-triangle', 14) + ' AI 요청이 사용자에 의해 중단되었습니다.';
        llmResponse.appendChild(cancelDiv);
        llmResponse.scrollTop = llmResponse.scrollHeight;
      }

      console.log('[AI] Request cancelled');
    }

    // ============================================
    // 다중 AI 호출 시스템
    // ============================================

    // 선택된 AI 서비스들 가져오기
    function getSelectedAIServices() {
      const services = ['gpt', 'grok', 'claude', 'gemini', 'local'];

      // 단일 모드: 현재 선택된 서비스만 반환
      if (!window.MyMindAI?.multiSelectMode) {
        const currentService = window.MyMindAI?.currentService || 'gpt';
        console.log('[AI] Single mode - returning current service only:', currentService);
        return [currentService];
      }

      // 다중 모드: 모든 활성화된 서비스 반환
      // 1. 먼저 window.MyMind3AISettings에서 가져오기 시도
      let aiSettings = window.MyMind3AISettings?.getAISettings?.();

      // 2. 없으면 localStorage에서 직접 읽기 (mymind3_ai_settings가 올바른 키)
      if (!aiSettings) {
        const savedSettings = localStorage.getItem('mymind3_ai_settings');
        if (savedSettings) {
          try {
            aiSettings = JSON.parse(savedSettings);
          } catch (e) {
            console.error('[AI] Error parsing AI settings:', e);
          }
        }
      }

      if (aiSettings?.services) {
        return services.filter(service => {
          const serviceSettings = aiSettings.services[service];
          if (!serviceSettings?.enabled) return false;

          // 크레딧 결제 모드인 경우 API 키 없이도 사용 가능
          if (serviceSettings.paymentMethod === 'credit') {
            return true;
          }

          // API 키 결제 모드인 경우 API 키 필요
          return !!window.MyMindAI?.apiKeys?.[service];
        });
      }

      // 기본값: API 키가 있는 서비스만 반환
      return services.filter(service => window.MyMindAI?.apiKeys?.[service]);
    }

    // 개별 AI 서비스 호출 (Promise 반환)
    /**
     * 단일 AI 서비스 호출 (스트리밍 및 이미지 첨부 지원)
     * @param {string} service - AI 서비스 이름 (gpt, gemini, claude, grok, local)
     * @param {string} message - 사용자 메시지
     * @param {Array} conversationHistory - 대화 히스토리
     * @param {Object} options - 옵션 객체
     * @param {number} options.timeout - 타임아웃 (ms), 기본값 60000
     * @param {boolean} options.useStreaming - 스트리밍 사용 여부, 기본값 false
     * @param {Object} options.imageData - 이미지 첨부 데이터 { base64, mimeType }
     * @param {Function} options.onStreamChunk - 스트리밍 청크 콜백 (chunk, fullText) => void
     * @param {AbortSignal} options.abortSignal - 취소 시그널
     * @param {HTMLElement} options.contentDiv - 스트리밍 응답을 표시할 DOM 요소
     */
    async function callSingleAIService(service, message, conversationHistory, options = {}) {
      // 하위 호환성: 4번째 인자가 숫자면 timeout으로 처리
      if (typeof options === 'number') {
        options = { timeout: options };
      }

      const {
        timeout = 60000,
        useStreaming = false,
        imageData = null,
        onStreamChunk = null,
        abortSignal = null,
        contentDiv = null
      } = options;

      // 크레딧 우선 사용 정책:
      // 1. 구독 크레딧 → 2. 무료 크레딧 → 3. 일반 크레딧 → 4. 사용자 API Key
      // 크레딧이 있으면 서버 API Key 사용, 소진 시 사용자 API Key로 자동 전환
      let paymentMethod = 'credit'; // 항상 크레딧 먼저 시도
      let apiKey = '';
      let userApiKey = window.MyMindAI.apiKeys[service] || ''; // 사용자 등록 API Key

      // 사전 체크: 크레딧과 API Key 둘 다 없으면 서비스 거부
      try {
        const balance = await getCreditBalance();
        // balance.credits가 객체({ total, free, service, paid })인 경우 total 값 추출
        const credits = balance?.credits;
        const totalCredits = typeof credits === 'number' ? credits : (credits?.total || 0);

        if (totalCredits <= 0 && !userApiKey) {
          throw new Error(`크레딧이 없고 ${service.toUpperCase()} API Key도 등록되지 않았습니다. 크레딧을 충전하거나 API Key를 등록해주세요.`);
        }

        console.log(`[AI] ${service} 서비스 - 크레딧: ${totalCredits}, API Key: ${userApiKey ? '있음' : '없음'}`);
      } catch (e) {
        if (e.message.includes('크레딧이 없고')) {
          throw e; // 명시적 거부 에러는 그대로 전달
        }
        console.warn('[AI] 크레딧 잔액 확인 실패:', e);
        // 크레딧 확인 실패 시 API Key가 없으면 거부
        if (!userApiKey) {
          throw new Error(`크레딧 잔액을 확인할 수 없고 ${service.toUpperCase()} API Key도 없습니다.`);
        }
      }

      // 서비스별 기본 모델 가져오기
      let model = null;
      try {
        let settingsForModel = window.MyMind3AISettings?.getAISettings?.();
        if (!settingsForModel) {
          const savedModelSettings = localStorage.getItem('mymind3_ai_settings');
          if (savedModelSettings) {
            settingsForModel = JSON.parse(savedModelSettings);
          }
        }
        if (settingsForModel?.services?.[service]) {
          model = settingsForModel.services[service].model;
        }
      } catch (e) {
        console.warn('[AI] 모델 설정 로드 실패:', e);
      }

      // 모델 기본값 설정
      if (!model) {
        const defaultModels = {
          gpt: 'gpt-4.1-mini',
          grok: 'grok-4',
          claude: 'claude-sonnet-4-5',
          gemini: 'gemini-2.5-pro',
          local: 'openai-gpt-oss-20b'
        };
        model = defaultModels[service] || 'gpt-4.1-mini';
      }

      // 스트리밍 지원 서비스 확인 (Gemini, Claude는 스트리밍 미지원)
      const streamingServices = ['gpt', 'grok', 'local'];
      const canStream = useStreaming && streamingServices.includes(service) && (onStreamChunk || contentDiv);

      // API 호출 함수 (재시도 로직 포함)
      const executeAPICall = async (currentPaymentMethod, currentApiKey) => {
        if (canStream) {
          return await callSingleAIServiceStreaming(service, message, conversationHistory, {
            timeout, imageData, onStreamChunk, abortSignal, contentDiv, model,
            paymentMethod: currentPaymentMethod, apiKey: currentApiKey
          });
        } else {
          return await callSingleAIServiceNonStreaming(service, message, conversationHistory, {
            timeout, imageData, abortSignal, model,
            paymentMethod: currentPaymentMethod, apiKey: currentApiKey
          });
        }
      };

      try {
        // 1차 시도: 크레딧 사용
        return await executeAPICall(paymentMethod, apiKey);
      } catch (error) {
        // 크레딧 부족 시 사용자 API Key로 자동 전환
        if (error.code === 'INSUFFICIENT_CREDITS' && error.canUseClientApiKey && userApiKey) {
          console.log(`[AI] 크레딧 소진 - ${service} 사용자 API Key로 자동 전환`);

          // 2차 시도: 사용자 API Key 사용
          return await executeAPICall('apikey', userApiKey);
        }

        // 크레딧 부족인데 사용자 API Key가 없는 경우
        if (error.code === 'INSUFFICIENT_CREDITS' && !userApiKey) {
          throw new Error(`크레딧이 소진되었습니다. ${service.toUpperCase()} API Key를 등록하거나 크레딧을 충전해주세요.`);
        }

        // 기타 에러는 그대로 throw
        throw error;
      }
    }

    /**
     * 스트리밍 API 호출 (/api/ai/chat-stream)
     */
    async function callSingleAIServiceStreaming(service, message, conversationHistory, options) {
      const { timeout, imageData, onStreamChunk, abortSignal, contentDiv, model, paymentMethod, apiKey } = options;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      try {
        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};

        const response = await fetch('/api/ai/chat-stream', {
          method: 'POST',
          headers: { ...headers, ...csrfHeaders },
          credentials: 'include',
          signal: abortSignal || controller.signal,
          body: JSON.stringify({
            message,
            conversationHistory,
            service,
            model,
            temperature: 0.7,
            maxTokens: getOptimalMaxTokens(service, model, 'chat'),
            paymentMethod,
            image: imageData
          })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `HTTP ${response.status}`;
          let errorCode = null;
          let canUseClientApiKey = false;
          try {
            const errorData = JSON.parse(errorText);
            errorCode = errorData.code;
            canUseClientApiKey = errorData.canUseClientApiKey || false;
            // 에러 메시지 추출: error가 객체일 경우 message 속성 사용
            if (errorData.error) {
              const errMsg = typeof errorData.error === 'object'
                ? (errorData.error?.message || JSON.stringify(errorData.error))
                : errorData.error;
              errorMessage += `: ${errMsg}`;
            }
          } catch (e) {
            if (errorText) errorMessage += `: ${errorText}`;
          }

          // 크레딧 부족 에러 처리 (자동 전환 플래그 포함)
          if (errorCode === 'INSUFFICIENT_CREDITS') {
            const error = new Error(errorMessage);
            error.code = 'INSUFFICIENT_CREDITS';
            error.canUseClientApiKey = canUseClientApiKey;
            throw error;
          }

          throw new Error(errorMessage);
        }

        // SSE 스트림 처리
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // 마지막 불완전한 라인은 버퍼에 보관

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const data = trimmed.substring(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);

                // SSE 스트림 내 에러 응답 체크
                if (parsed.error) {
                  let errMsg = parsed.error;
                  try {
                    const innerErr = JSON.parse(parsed.error);
                    errMsg = innerErr.error?.message || errMsg;
                  } catch (pe) {
                    // 이미 문자열이면 그대로 사용
                  }
                  const statusCode = parsed.status || '';
                  throw new Error(`API 오류${statusCode ? ` (${statusCode})` : ''}: ${errMsg}`);
                }

                const content = parsed.choices?.[0]?.delta?.content ||
                               parsed.content ||
                               parsed.delta?.content || '';
                if (content) {
                  fullResponse += content;

                  // 콜백 또는 DOM 직접 업데이트
                  if (onStreamChunk) {
                    onStreamChunk(content, fullResponse);
                  }
                  if (contentDiv) {
                    contentDiv.innerHTML = formatAIResponse(fullResponse);
                  }
                }
              } catch (e) {
                // 에러가 API 오류인 경우 상위로 전파
                if (e.message?.startsWith('API 오류')) {
                  throw e;
                }
                // JSON 파싱 실패 시 무시
              }
            }
          }
        }

        // 최종 렌더링
        if (contentDiv) {
          contentDiv.innerHTML = formatAIResponse(fullResponse);
          // KaTeX 렌더링
          if (typeof renderMathInElement === 'function') {
            renderMathInElement(contentDiv, {
              delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\[', right: '\\]', display: true },
                { left: '\\(', right: '\\)', display: false }
              ],
              throwOnError: false
            });
          }
        }

        // 크레딧 차감 (추정 토큰)
        const estimatedTokens = Math.ceil(fullResponse.length / 4) + Math.ceil(message.length / 4);
        deductCredits(service, model, estimatedTokens).catch(err => {
          console.error(`[Credits] Background deduction error for ${service}:`, err);
        });

        return {
          service,
          success: true,
          content: fullResponse,
          model: model,
          tokens: estimatedTokens
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }

    /**
     * 일반 API 호출 (/api/ai/chat) - 이미지 첨부 지원
     */
    async function callSingleAIServiceNonStreaming(service, message, conversationHistory, options) {
      const { timeout, imageData, abortSignal, model, paymentMethod, apiKey } = options;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      try {
        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};

        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { ...headers, ...csrfHeaders },
          credentials: 'include',
          signal: abortSignal || controller.signal,
          body: JSON.stringify({
            message,
            conversationHistory,
            service,
            model,
            temperature: 0.7,
            maxTokens: getOptimalMaxTokens(service, model, 'chat'),
            paymentMethod,
            image: imageData,  // 이미지 첨부 지원
            folder: window.currentQAFolder || window.MyMind3?.currentFolder || localStorage.getItem('currentFolder')  // [2026-02-07] 이미지 파일 저장 경로용
          })
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorCode = errorData.code;
          const canUseClientApiKey = errorData.canUseClientApiKey || false;

          // 크레딧 부족 에러 처리 (자동 전환 플래그 포함)
          if (errorCode === 'INSUFFICIENT_CREDITS') {
            const errorMsg = errorData.error || '크레딧이 소진되었습니다.';
            const error = new Error(errorMsg);
            error.code = 'INSUFFICIENT_CREDITS';
            error.canUseClientApiKey = canUseClientApiKey;
            throw error;
          }

          // 에러 메시지 추출: error가 객체일 경우 message 속성 사용
          const errorMsg = typeof errorData.error === 'object'
            ? (errorData.error?.message || JSON.stringify(errorData.error))
            : (errorData.error || `HTTP ${response.status}`);
          throw new Error(errorMsg);
        }

        const data = await response.json();
        const responseData = data.data || data;

        // 크레딧 차감
        const usage = responseData.usage || {};
        const totalTokens = usage.total_tokens || (usage.prompt_tokens + usage.completion_tokens) || 1000;
        deductCredits(service, model, totalTokens).catch(err => {
          console.error(`[Credits] Background deduction error for ${service}:`, err);
        });

        return {
          service,
          success: true,
          content: responseData.response || responseData.message || responseData.content || '',
          model: responseData.model || model,
          tokens: totalTokens
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }

    // 다중 AI 동시 호출 (Promise.allSettled 사용)
    async function sendMultiAIMessage(message, conversationHistory) {
      const services = getSelectedAIServices();

      if (services.length === 0) {
        alert(window.i18n?.alertNoAIService || '활성화된 AI 서비스가 없습니다. 설정에서 AI 서비스를 활성화하고 API Key를 설정해주세요.');
        return;
      }

      console.log('[AI Multi] Sending to services:', services);

      // 질문 처리 중 입력 비활성화 (평가 완료 전까지)
      // input 자체를 리스타일하여 flex:1 레이아웃 유지 (별도 div 삽입 X)
      const promptInput = document.getElementById('promptInput');
      const sendBtn = document.getElementById('sendPromptBtn');

      if (promptInput) {
        promptInput.disabled = true;
        promptInput.value = window.i18n?.aiProcessing || 'AI가 응답을 처리하고 있습니다...';
        promptInput.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        promptInput.style.color = 'white';
        promptInput.style.borderColor = 'transparent';
        promptInput.style.fontWeight = '500';
      }
      if (sendBtn) {
        sendBtn.disabled = true;
      }

      // 이미지 첨부 데이터 가져오기
      const imageData = window.MyMindAI?.attachedImage || null;
      if (imageData) {
        console.log('[AI Multi] Image attached for multi-AI request');
      }

      // 원본 메시지 추출 (컨텍스트 정보 제외 - 사용자가 입력한 질문만 표시)
      let displayMessage = message.split('\n\n[중요 지침]')[0];
      displayMessage = displayMessage.split('\n\n=== 체크된 관련 노드들 ===')[0];

      // 스트리밍 응답용 컨테이너 준비 (로딩 스피너 대신 스트리밍 콘텐츠 영역)
      const streamingContainers = {};
      services.forEach(service => {
        const container = document.getElementById(`${service}Response`);
        if (container) {
          // 기존 Q&A 유지 - 컨테이너 초기화하지 않음
          // 스트리밍 응답 영역만 새로 생성하여 추가 (최종 Q&A와 동일한 형식)
          const streamingDiv = document.createElement('div');
          streamingDiv.className = 'qa-item ai-streaming-response';
          streamingDiv.id = `streaming-${service}-${Date.now()}`; // 고유 ID 부여
          streamingDiv.style.cssText = 'margin-bottom: 20px;';

          // 질문 영역 (최종 저장 형식과 동일)
          const questionDiv = document.createElement('div');
          questionDiv.className = 'question';
          questionDiv.style.cssText = 'background: #e3f2fd; border-radius: 12px; padding: 16px; margin-bottom: 12px; position: relative;';
          questionDiv.innerHTML = `
            <div style="margin-bottom: 8px;">
              <span style="font-weight: bold; color: #333; font-size: 14px;">사용자:</span>
            </div>
            <div class="question-content" style="color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${displayMessage}</div>
          `;
          streamingDiv.appendChild(questionDiv);

          // 응답 영역 (최종 저장 형식과 동일 + 스피너)
          const answerDiv = document.createElement('div');
          answerDiv.className = 'answer';
          answerDiv.style.cssText = 'background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px; position: relative;';

          // 헤더 (AI 이름 + 모델 + 스피너)
          const headerDiv = document.createElement('div');
          headerDiv.className = 'streaming-header';
          headerDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px;';

          // 현재 서비스의 모델명 가져오기
          const enabledServices = getEnabledAIServices();
          const serviceInfo = enabledServices.find(s => s.service === service);
          const modelName = serviceInfo?.model ? getShortModelName(serviceInfo.model) : '';
          const displayLabel = modelName ? `${getAIDisplayName(service)}: ${modelName}` : getAIDisplayName(service);

          headerDiv.innerHTML = `
            ${mmIcon('robot', 18)}
            <span style="color: #1976d2; font-weight: bold; font-size: 14px;">${displayLabel}</span>
            <div class="spinner streaming-indicator" style="width: 16px; height: 16px; border: 2px solid #dee2e6; border-top-color: #1976d2; border-radius: 50%; animation: spin 1s linear infinite; margin-left: auto;"></div>
          `;
          answerDiv.appendChild(headerDiv);

          // 콘텐츠 영역 (스트리밍 텍스트가 표시됨)
          const contentDiv = document.createElement('div');
          contentDiv.className = 'answer-content streaming-content';
          contentDiv.style.cssText = 'color: #333; font-size: 14px; line-height: 1.6;';
          contentDiv.innerHTML = `<span style="color: #999;">${t('aiWaitingResponse', '응답 대기 중...')}</span>`;
          answerDiv.appendChild(contentDiv);

          streamingDiv.appendChild(answerDiv);
          container.appendChild(streamingDiv);
          streamingContainers[service] = { streamingDiv, contentDiv, headerDiv, answerDiv };
        }
        updateAITabStatus(service, 'loading');
      });

      // 탭 바 표시 및 첫 번째 서비스 탭 활성화
      const aiTabBar = document.getElementById('aiTabBar');
      if (aiTabBar) {
        aiTabBar.style.display = 'flex';
        switchAITab(services[0]);
      }

      // Promise.allSettled로 모든 AI 동시 호출 (스트리밍 + 이미지 지원)
      const results = await Promise.allSettled(
        services.map(service => {
          const containerInfo = streamingContainers[service];
          return callSingleAIService(service, message, conversationHistory, {
            timeout: 120000,  // 스트리밍은 더 긴 타임아웃
            useStreaming: true,
            imageData: imageData,
            contentDiv: containerInfo?.contentDiv || null,  // 실시간 업데이트용
            onStreamChunk: (chunk, fullText) => {
              // 스트리밍 중 실시간 업데이트
              if (containerInfo?.contentDiv) {
                containerInfo.contentDiv.innerHTML = formatAIResponse(fullText);
              }
            }
          });
        })
      );

      // 결과 처리 (스트리밍 완료 후) - 스피너 제거, Q&A 저장
      for (let index = 0; index < results.length; index++) {
        const result = results[index];
        const service = services[index];
        const container = document.getElementById(`${service}Response`);
        const containerInfo = streamingContainers[service];

        if (result.status === 'fulfilled') {
          // 성공
          const data = result.value;
          updateAITabStatus(service, 'success');

          // 질문 + 응답을 하나의 qa-item div로 래핑 (스크린샷 디자인)
          // 실시간 표시와 저장 형식을 완전히 동일하게 유지

          // 이미지 응답인지 확인하고 이미지 복사 버튼 HTML 생성 (파일 URL 기반)
          const imageMatch = data.content?.match(/!\[[^\]]*\]\(([^)]+)\)/);
          const imageSrc = imageMatch ? imageMatch[1] : null;
          const imageCopyBtnHTML = imageSrc ? `
      <button class="ai-image-copy-btn" data-image-src="${imageSrc}" style="padding: 6px 12px; background: #28a745; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px; margin-right: 8px;">
        <span style="font-size: 14px;"></span> 이미지 복사
      </button>` : '';

          const qaItemHTML = `
<div class="qa-item" style="margin-bottom: 20px;">
  <div class="question" style="background: #e3f2fd; border-radius: 12px; padding: 16px; margin-bottom: 12px; position: relative;">
    <div style="margin-bottom: 8px;">
      <span style="font-weight: bold; color: #333; font-size: 14px;">사용자:</span>
    </div>
    <div class="question-content" style="color: #333; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${displayMessage}</div>
  </div>
  <div class="answer" style="background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px; position: relative;">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
      ${mmIcon('robot', 18)}
      <span style="color: #1976d2; font-weight: bold; font-size: 14px;">${getAIDisplayName(service)}: ${data.model || ''}</span>
    </div>
    <div class="answer-content" data-original-content="${encodeURIComponent(data.content)}" style="color: #333; font-size: 14px; line-height: 1.6;">${formatAIResponse(data.content)}</div>
    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;">
      ${imageCopyBtnHTML}
      ${!imageSrc ? `<button class="create-node-btn" onclick="createNodeFromAIResponse(this)" style="padding: 6px 12px; background: #7c4dff; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
        ${mmIcon('plus-circle', 14)} 노드생성
      </button>
      <button class="copy-btn" onclick="copyAnswerToEditor(this)" style="padding: 6px 12px; background: #1976d2; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
        <span style="font-size: 14px;"></span> 복사
      </button>` : ''}
    </div>
  </div>
</div>`;

          // 스트리밍 완료 후 스트리밍 div만 교체 (기존 Q&A 유지)
          if (containerInfo?.streamingDiv && data.content) {
            // 스트리밍 div를 최종 Q&A 형식으로 교체
            containerInfo.streamingDiv.outerHTML = qaItemHTML;

            // 새로 추가된 이미지 복사 버튼에 이벤트 리스너 연결
            if (imageSrc) {
              setTimeout(() => {
                if (typeof window.attachImageCopyListeners === 'function') {
                  window.attachImageCopyListeners();
                }
              }, 100);
            }
          }

          // Q&A 자동 저장 (동일한 HTML 형식 사용)
          if (data.content) {
            await autoSaveQAItem(qaItemHTML, service);
            console.log(`[AI Multi] Q&A pair saved to ${service}_qa.html`);

            // 자동 노드 생성 (자동만들기 체크 시) - 각 AI 서비스별로 노드 생성
            await autoCreateNodeFromQuestion(displayMessage, data.content, service);
          }

          console.log(`[AI Multi] ${service} success`);
        } else {
          // 실패
          const error = result.reason;
          updateAITabStatus(service, 'error');

          // 에러 메시지 추출 (객체일 경우 문자열로 변환)
          let errorMsg = '알 수 없는 오류';
          if (typeof error === 'string') {
            errorMsg = error;
          } else if (error?.message) {
            errorMsg = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
          } else if (error) {
            errorMsg = JSON.stringify(error);
          }

          // 스트리밍 실패: 에러 표시로 변경
          if (containerInfo?.headerDiv) {
            const spinner = containerInfo.headerDiv.querySelector('.streaming-indicator');
            if (spinner) spinner.style.display = 'none';

            // 에러 아이콘 추가
            const errorIcon = document.createElement('span');
            errorIcon.style.cssText = 'margin-left: auto; color: #f44336; font-size: 14px;';
            errorIcon.textContent = t('statusError', '오류');
            containerInfo.headerDiv.appendChild(errorIcon);
          }

          if (containerInfo?.contentDiv) {
            containerInfo.contentDiv.innerHTML = `<div style="color: #f44336; padding: 10px; background: #ffebee; border-radius: 4px;">
              <strong>오류 발생</strong><br>${errorMsg}
            </div>`;
          }

          // 에러 시에도 질문+에러를 qa-item으로 저장
          const now = new Date();
          const timestamp = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + ' ' +
            String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0') + ':' +
            String(now.getSeconds()).padStart(2, '0');

          const qaErrorHTML = `
<div class="qa-item" style="margin-bottom: 6px; background: #fff; border-radius: 5px; box-shadow: 0 1px 2px rgba(0,0,0,0.08); overflow: hidden;">
  <div class="timestamp" style="background: #f8f9fa; color: #999; font-size: 0.65em; padding: 1px 6px; border-bottom: 1px solid #eee;">${timestamp}</div>
  <div class="question" style="border-left: 3px solid #2196f3; background: #f8fbff; padding: 3px 6px;">
    <div style="display: flex; align-items: flex-start; gap: 4px;">
      <span style="background: #2196f3; color: #fff; padding: 0 5px; border-radius: 6px; font-size: 0.6em; font-weight: 600; flex-shrink: 0; line-height: 1.4;">Q</span>
      <div style="color: #1565c0; font-size: 0.85em; line-height: 1.2; white-space: pre-wrap;">${displayMessage}</div>
    </div>
  </div>
  <div class="answer" style="border-left: 3px solid #f44336; background: #fff5f5; padding: 3px 6px;">
    <div style="display: flex; align-items: flex-start; gap: 4px;">
      <span style="background: #f44336; color: #fff; padding: 0 5px; border-radius: 6px; font-size: 0.6em; font-weight: 600; flex-shrink: 0; line-height: 1.4;">!</span>
      <div style="flex: 1; min-width: 0;">
        <span style="color: #888; font-size: 0.65em;">${getAIDisplayName(service)} · 오류</span>
        <div style="color: #c62828; font-size: 0.85em; line-height: 1.2;">${errorMsg}</div>
      </div>
    </div>
  </div>
</div>`;

          await autoSaveQAItem(qaErrorHTML, service);
          console.log(`[AI Multi] Q&A error saved to ${service}_qa.html`);

          console.error(`[AI Multi] ${service} failed:`, error);
        }
      }

      // 이미지 첨부 클리어 (전송 완료 후)
      if (imageData && typeof window.MyMindAI?.clearAttachedImage === 'function') {
        window.MyMindAI.clearAttachedImage();
        console.log('[AI Multi] Attached image cleared after sending');
      }

      // 성공한 서비스 중 첫 번째로 탭 전환
      const successService = services.find((service, index) =>
        results[index].status === 'fulfilled'
      );
      if (successService) {
        switchAITab(successService);
      }

      // 다중선택 모드일 때 평가 수행
      if (window.MyMindAI?.multiSelectMode === true) {
        await performMultiAIEvaluation(displayMessage, results, services, streamingContainers);
      }

      // 처리 완료 후 입력 활성화 (리스타일 복원)
      const promptInputEnd = document.getElementById('promptInput');
      const sendBtnEnd = document.getElementById('sendPromptBtn');
      if (promptInputEnd) {
        promptInputEnd.disabled = false;
        promptInputEnd.value = '';
        promptInputEnd.style.background = '';
        promptInputEnd.style.color = '';
        promptInputEnd.style.borderColor = '';
        promptInputEnd.style.fontWeight = '';
      }
      if (sendBtnEnd) {
        sendBtnEnd.disabled = false;
        sendBtnEnd.textContent = window.i18n?.sendBtn || '전송';
      }

      return results;
    }

    /**
     * 평가 프롬프트 생성 함수
     * 여러 AI의 응답을 비교 분석하기 위한 프롬프트 생성
     */
    function buildEvaluationPrompt(question, aiResponses) {
      const responsesText = aiResponses.map((r, i) => {
        return `## AI ${i + 1}: ${r.serviceName} (${r.modelName})
${r.content}
---`;
      }).join('\n\n');

      return `# AI 응답 비교 평가 요청

당신은 여러 AI 시스템의 응답을 객관적으로 비교 분석하는 전문 평가자입니다.
아래 질문에 대한 여러 AI의 응답을 심층 분석하여 평가해주세요.

## 원본 질문
${question}

## 각 AI의 응답

${responsesText}

---

# 평가 지침

다음 항목에 대해 상세히 분석해주세요:

## 1. 응답 품질 비교
각 AI 응답의 품질을 다음 기준으로 평가:
- **정확성**: 사실 관계가 정확한가?
- **완성도**: 질문에 대해 충분히 답변했는가?
- **명확성**: 설명이 이해하기 쉬운가?
- **깊이**: 분석이 심도 있는가?

## 2. 핵심 차이점 분석
- 각 AI가 **다르게 접근한 부분**은 무엇인가?
- **공통적으로 언급한 핵심 포인트**는 무엇인가?
- 어떤 AI가 **독특한 관점**을 제시했는가?

## 3. 장단점 분석
각 AI 응답의:
- **장점**: 특히 잘한 부분
- **단점**: 부족하거나 개선이 필요한 부분
- **누락된 정보**: 언급하지 않은 중요한 내용

## 4. 종합 평가
- **최고 품질 응답**: 어떤 AI의 응답이 가장 좋은가? (이유 포함)
- **가장 독창적 응답**: 어떤 AI가 새로운 관점을 제시했는가?
- **가장 실용적 응답**: 실제 적용에 가장 유용한 응답은?

## 5. 통합 최적 답변
위 모든 AI의 장점을 종합하여, 질문에 대한 **최적의 통합 답변**을 작성해주세요.
각 AI에서 좋은 부분을 선별하여 하나의 완벽한 답변으로 구성하세요.

---

위 형식에 맞춰 마크다운 형식으로 상세히 분석해주세요.`;
    }

    /**
     * 다중 AI 응답 평가 수행
     * 모든 AI 응답 완료 후 평가 AI를 호출하여 비교 분석
     */
    async function performMultiAIEvaluation(question, results, services, streamingContainers) {
      // 성공한 응답만 수집
      const successfulResponses = [];
      const enabledServices = getEnabledAIServices();

      for (let i = 0; i < results.length; i++) {
        if (results[i].status === 'fulfilled' && results[i].value?.content) {
          const service = services[i];
          const serviceInfo = enabledServices.find(s => s.service === service);
          const modelName = serviceInfo?.model ? getShortModelName(serviceInfo.model) : service;

          successfulResponses.push({
            service: service,
            serviceName: getAIDisplayName(service),
            modelName: modelName,
            content: results[i].value.content
          });
        }
      }

      // 성공한 응답이 2개 미만이면 평가 스킵
      if (successfulResponses.length < 2) {
        console.log('[Evaluation] 비교할 응답이 2개 미만이어서 평가 스킵');
        const evaluateContainer = document.getElementById('evaluateResponse');
        if (evaluateContainer) {
          evaluateContainer.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #666;">
              ${mmIcon('bar-chart', 48)}
              <p style="margin-top: 16px;">비교할 AI 응답이 2개 이상 필요합니다.</p>
              <p style="font-size: 12px; color: #999;">성공한 응답: ${successfulResponses.length}개</p>
            </div>
          `;
        }
        return;
      }

      console.log('[Evaluation] 평가 시작 - 응답 수:', successfulResponses.length);

      // 평가 컨테이너 준비
      const evaluateContainer = document.getElementById('evaluateResponse');
      if (!evaluateContainer) {
        console.error('[Evaluation] evaluateResponse 컨테이너를 찾을 수 없음');
        return;
      }

      // 기본 AI 서비스 정보 가져오기
      const defaultAI = enabledServices.find(s => s.isDefault) || enabledServices[0];
      const defaultModelName = defaultAI?.model ? getShortModelName(defaultAI.model) : '';
      const evaluateDisplayName = defaultModelName
        ? `${window.i18n?.evaluate || '평가'}(${defaultModelName})`
        : `${window.i18n?.evaluate || '평가'}(${getAIDisplayName(defaultAI?.service || 'gpt')})`;

      // 로딩 UI 표시
      const streamingDiv = document.createElement('div');
      streamingDiv.className = 'qa-item ai-streaming-response';
      streamingDiv.id = `streaming-evaluate-${Date.now()}`;
      streamingDiv.style.cssText = 'margin-bottom: 20px;';

      // 평가 모델 정보 문자열
      const evaluatorModelInfo = defaultAI?.model
        ? `${getAIDisplayName(defaultAI.service)} (${getShortModelName(defaultAI.model)})`
        : getAIDisplayName(defaultAI?.service || 'gpt');

      // 질문 영역
      const questionDiv = document.createElement('div');
      questionDiv.className = 'question';
      questionDiv.style.cssText = 'background: #fff3e0; border-radius: 12px; padding: 16px; margin-bottom: 12px; position: relative;';
      questionDiv.innerHTML = `
        <div style="margin-bottom: 8px;">
          <span style="font-weight: bold; color: #e65100; font-size: 14px;">${mmIcon('bar-chart', 14)} AI 응답 비교 평가</span>
        </div>
        <div style="color: #333; font-size: 14px; line-height: 1.5;">
          <strong>원본 질문:</strong> ${question}<br>
          <strong>비교 대상:</strong> ${successfulResponses.map(r => `${r.serviceName}(${r.modelName})`).join(', ')}<br>
          <strong>평가 모델:</strong> <span style="color: #e65100; font-weight: bold;">${evaluatorModelInfo}</span>
        </div>
      `;
      streamingDiv.appendChild(questionDiv);

      // 응답 영역
      const answerDiv = document.createElement('div');
      answerDiv.className = 'answer';
      answerDiv.style.cssText = 'background: #fff; border: 1px solid #ff9800; border-radius: 12px; padding: 16px; position: relative;';

      const headerDiv = document.createElement('div');
      headerDiv.className = 'streaming-header';
      headerDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px;';
      headerDiv.innerHTML = `
        ${mmIcon('bar-chart', 18)}
        <span style="color: #e65100; font-weight: bold; font-size: 14px;">${evaluateDisplayName}</span>
        <div class="spinner streaming-indicator" style="width: 16px; height: 16px; border: 2px solid #ffe0b2; border-top-color: #ff9800; border-radius: 50%; animation: spin 1s linear infinite; margin-left: auto;"></div>
      `;
      answerDiv.appendChild(headerDiv);

      const contentDiv = document.createElement('div');
      contentDiv.className = 'answer-content streaming-content';
      contentDiv.style.cssText = 'color: #333; font-size: 14px; line-height: 1.6;';
      contentDiv.innerHTML = `<span style="color: #999;">${t('aiAnalyzing', 'AI 응답들을 분석 중...')}</span>`;
      answerDiv.appendChild(contentDiv);

      streamingDiv.appendChild(answerDiv);
      evaluateContainer.innerHTML = '';
      evaluateContainer.appendChild(streamingDiv);

      // 탭 상태 업데이트
      updateAITabStatus('evaluate', 'loading');

      try {
        // 평가 프롬프트 생성
        const evaluationPrompt = buildEvaluationPrompt(question, successfulResponses);

        // 기본 AI 서비스로 평가 호출 (스트리밍)
        const evalResult = await callSingleAIService(
          defaultAI?.service || 'gpt',
          evaluationPrompt,
          [],
          {
            timeout: 180000,  // 평가는 더 긴 타임아웃 (3분)
            useStreaming: true,
            contentDiv: contentDiv,
            onStreamChunk: (chunk, fullText) => {
              if (contentDiv) {
                contentDiv.innerHTML = formatAIResponse(fullText);
              }
            }
          }
        );

        // 평가 완료
        updateAITabStatus('evaluate', 'success');

        // 스피너 제거
        const spinner = headerDiv.querySelector('.streaming-indicator');
        if (spinner) spinner.style.display = 'none';

        // 완료 아이콘 추가
        const completeIcon = document.createElement('span');
        completeIcon.style.cssText = 'margin-left: auto; color: #4caf50; font-size: 14px;';
        completeIcon.textContent = t('ratingComplete', '평가 완료');
        headerDiv.appendChild(completeIcon);

        // 노드생성 + 복사 버튼 추가
        const copyBtnDiv = document.createElement('div');
        copyBtnDiv.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;';
        copyBtnDiv.innerHTML = `
          <button class="create-node-btn" onclick="createNodeFromAIResponse(this)" style="padding: 6px 12px; background: #7c4dff; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
            ${mmIcon('plus-circle', 14)} 노드생성
          </button>
          <button class="copy-btn" onclick="copyAnswerToEditor(this)" style="padding: 6px 12px; background: #ff9800; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
            <span style="font-size: 14px;"></span> 복사
          </button>
        `;
        answerDiv.appendChild(copyBtnDiv);

        // Q&A 자동 저장
        const qaItemHTML = evaluateContainer.innerHTML;
        await autoSaveQAItem(qaItemHTML, 'evaluate');
        console.log('[Evaluation] 평가 결과 저장 완료');

        // 평가 결과를 노드로 자동 저장 (평가 모델 정보 포함)
        const evaluationHeader = `**평가 모델:** ${evaluatorModelInfo}\n**비교 대상:** ${successfulResponses.map(r => `${r.serviceName}(${r.modelName})`).join(', ')}\n\n---\n\n`;
        await autoCreateNodeFromQuestion(
          `[평가] ${question}`,
          evaluationHeader + evalResult.content,
          'evaluate'
        );

        console.log('[Evaluation] 평가 완료');

      } catch (error) {
        console.error('[Evaluation] 평가 실패:', error);
        updateAITabStatus('evaluate', 'error');

        // 에러 표시
        const spinner = headerDiv.querySelector('.streaming-indicator');
        if (spinner) spinner.style.display = 'none';

        const errorIcon = document.createElement('span');
        errorIcon.style.cssText = 'margin-left: auto; color: #f44336; font-size: 14px;';
        errorIcon.textContent = t('ratingFailed', '평가 실패');
        headerDiv.appendChild(errorIcon);

        contentDiv.innerHTML = `<div style="color: #f44336; padding: 10px; background: #ffebee; border-radius: 4px;">
          <strong>평가 오류</strong><br>${error.message || error}
        </div>`;
      }
    }

    // 자동 노드 생성 함수: AI 질문의 맥락으로 자식 노드 자동 생성
    // service: 다중 AI 모드에서 AI 서비스 이름 (gpt, gemini 등), 단일 모드에서는 null
    async function autoCreateNodeFromQuestion(originalQuestion, aiResponse, service = null) {
      const autoCreateCheckbox = document.getElementById('autoCreateNodeAI');
      if (!autoCreateCheckbox || !autoCreateCheckbox.checked) {
        return; // 체크박스가 없거나 체크 안됨
      }

      // 현재 선택된 노드 확인
      const currentNodeId = window.MyMind3?.MindMapData?.currentEditingNodeId;
      if (!currentNodeId) {
        console.log('[AutoCreateNode] 선택된 노드가 없어서 자동 생성 스킵');
        return;
      }

      const parentNode = window.MyMind3.MindMapData.findNodeById(currentNodeId);
      if (!parentNode) {
        console.log('[AutoCreateNode] 선택된 노드를 찾을 수 없어서 자동 생성 스킵');
        return;
      }

      // 질문에서 10자 이하의 제목 추출
      let nodeTitle = extractQuestionContext(originalQuestion);

      // 다중 AI 모드에서는 서비스 이름을 제목에 추가
      if (service) {
        const serviceName = getAIDisplayName(service);
        nodeTitle = `${serviceName}: ${nodeTitle}`;
      }
      console.log(`[AutoCreateNode] 추출된 제목: "${nodeTitle}", 부모 노드: "${parentNode.title}"${service ? `, 서비스: ${service}` : ''}`);

      // 선택된 노드의 자식 노드로 생성
      try {
        const newNode = window.MyMind3.MindMapData.createChildNode(parentNode.id, nodeTitle);
        if (newNode) {
          // 노드 내용에 질문과 응답 저장 (모델 버전 포함)
          let serviceLabel = 'AI 응답';
          if (service) {
            const enabledServices = getEnabledAIServices();
            const serviceInfo = enabledServices.find(s => s.service === service);
            const modelName = serviceInfo?.model ? getShortModelName(serviceInfo.model) : '';
            serviceLabel = modelName
              ? `${getAIDisplayName(service)} (${modelName}) 응답`
              : `${getAIDisplayName(service)} 응답`;
          }
          // imageMapping이 있으면 base64를 파일 경로로 변환
          let processedAiResponse = aiResponse;
          if (window.lastQAImageMapping && window.lastQAImageMapping.length > 0) {
            for (const mapping of window.lastQAImageMapping) {
              if (processedAiResponse.includes('data:image/')) {
                // base64 데이터를 저장된 경로로 대체
                processedAiResponse = processedAiResponse.replace(mapping.originalDataUrl, mapping.savedPath);
              }
            }
            console.log('[AutoCreateNode] 이미지 경로 변환 완료');
            // 사용 후 매핑 정보 초기화
            window.lastQAImageMapping = null;
          }

          const contentHTML = `<br>
<p><strong>질문:</strong> ${originalQuestion}</p>
<hr>
<p><strong>${serviceLabel}:</strong></p>
${processedAiResponse}`;
          newNode.content = contentHTML;

          // HTML 파일 생성
          const folderName = window.currentQAFolder || window.MyMind3?.currentFolder || localStorage.getItem('currentFolder');
          if (folderName) {
            const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
            await fetch('/api/savenode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...csrfHeaders },
              credentials: 'include',
              body: JSON.stringify({
                folder: folderName,
                nodeId: newNode.nodeId || String(newNode.id),
                content: contentHTML,
                nodeName: newNode.title || ''  // 서버에서 title[nodeId].html 파일명에 사용
              })
            });
          }

          // 마인드맵 다시 렌더링
          window.MyMind3.NodeRenderer.renderMindMap();
          console.log(`[AutoCreateNode] 자동 노드 생성 완료: "${nodeTitle}" (ID: ${newNode.id})`);

          // 마인드맵 자동 저장 (노드 생성 후) - 팝업 없이 조용히 저장
          if (window.MyMind3Simple && window.MyMind3Simple.saveMindmapSilently) {
            const saved = await window.MyMind3Simple.saveMindmapSilently();
            if (saved) {
              console.log(`[AutoCreateNode] 마인드맵 자동 저장 완료`);
            }
          }

          if (typeof showToast === 'function') {
            showToast(`"${nodeTitle}" 노드가 자동 생성되었습니다.`, 'success');
          }
        }
      } catch (error) {
        console.error('[AutoCreateNode] 노드 생성 실패:', error);
      }
    }

    // 질문에서 핵심 맥락 추출 (10자 이하)
    function extractQuestionContext(question) {
      if (!question) return '질문';

      // 불필요한 문자 제거
      let cleaned = question.trim()
        .replace(/[?？。.!！~～,，]/g, '') // 문장 부호 제거
        .replace(/\s+/g, ' '); // 연속 공백 정리

      // 자주 사용되는 질문 패턴 제거
      const patterns = [
        /^(알려줘|알려주세요|설명해줘|설명해주세요|뭐야|뭐에요|뭔가요|무엇인가요|무엇이야)/,
        /^(어떻게|어떤|왜|언제|어디서|누가|무슨)/,
        /(에 대해|에대해|에 관해|에관해|란|이란|가 뭐야|이 뭐야|을 알려|를 알려)/,
        /(해줘|해주세요|해 줘|해 주세요|할 수 있어|할수있어)$/
      ];

      for (const pattern of patterns) {
        cleaned = cleaned.replace(pattern, '');
      }

      cleaned = cleaned.trim();

      // 공백으로 분리하여 핵심 단어 추출
      const words = cleaned.split(' ').filter(w => w.length > 0);

      // 10자 이하로 조합
      let result = '';
      for (const word of words) {
        if ((result + ' ' + word).trim().length <= 10) {
          result = (result + ' ' + word).trim();
        } else {
          break;
        }
      }

      // 결과가 비어있으면 원본 질문의 앞부분 사용
      if (!result || result.length === 0) {
        result = question.substring(0, 10).replace(/[?？。.!！~～,，]/g, '').trim();
      }

      // 그래도 비어있으면 기본값
      if (!result || result.length === 0) {
        result = 'AI 질문';
      }

      return result.substring(0, 10); // 최대 10자
    }

    // formatAIResponse 함수는 sendAIMessage 뒤에 정의됨 (더 완전한 버전)

    async function sendAIMessage() {
      const promptInput = document.getElementById('promptInput');
      const sendBtn = document.getElementById('sendPromptBtn');
      const llmResponse = document.getElementById('llmResponse');

      // 크레딧 우선 사용 정책:
      // 1. 구독 크레딧 → 2. 무료 크레딧 → 3. 일반 크레딧 → 4. 사용자 API Key
      const currentService = window.MyMindAI.currentService;
      let paymentMethod = 'credit'; // 항상 크레딧 먼저 시도
      let currentApiKey = window.MyMindAI.getCurrentApiKey() || ''; // 사용자 등록 API Key (폴백용)

      // 사전 체크: 크레딧과 API Key 둘 다 없으면 서비스 거부
      try {
        const balance = await getCreditBalance();
        // balance.credits가 객체({ total, free, service, paid })인 경우 total 값 추출
        const credits = balance?.credits;
        const totalCredits = typeof credits === 'number' ? credits : (credits?.total || 0);

        if (totalCredits <= 0 && !currentApiKey) {
          const serviceName = currentService.toUpperCase();
          alert(t('creditNoKeyAlert', '크레딧이 없고 {service} API Key도 등록되지 않았습니다.\n\n크레딧을 충전하거나 Settings → AI 설정에서 API Key를 등록해주세요.').replace('{service}', serviceName));
          const goToSettings = confirm(t('goToSettingsConfirm', '설정 페이지로 이동하시겠습니까?'));
          if (goToSettings) {
            showSettingsLayerPopup('#ai');
          }
          return;
        }

        console.log(`[AI] ${currentService} 서비스 - 크레딧: ${totalCredits}, API Key: ${currentApiKey ? '있음' : '없음'}`);
      } catch (e) {
        console.warn('[AI] 크레딧 잔액 확인 실패:', e);
        // 크레딧 확인 실패 시 API Key가 있으면 진행, 없으면 거부
        if (!currentApiKey) {
          alert(t('creditCheckFailAlert', '크레딧 잔액을 확인할 수 없고 API Key도 없습니다.\n\nSettings → AI 설정에서 API Key를 등록해주세요.'));
          return;
        }
      }

      const message = promptInput ? promptInput.value.trim() : '';

      if (!message || message.length === 0) {
        alert(window.i18n?.alertEnterMessage || '메시지를 입력해주세요.');
        return;
      }

      if (window.MyMindAI.isProcessing) {
        alert(window.i18n?.alertAIProcessing || 'AI가 응답을 처리중입니다. "처리중..." 버튼을 클릭하여 중단할 수 있습니다.');
        return;
      }

      // Create new AbortController for this request
      window.MyMindAI.abortController = new AbortController();

      // Set processing state
      window.MyMindAI.isProcessing = true;
      sendBtn.disabled = false; // Keep button enabled to allow cancellation
      // 버튼 텍스트 변경하지 않음 (flex 레이아웃 폭 변동 방지)
      // 처리 중 상태는 input 그라데이션으로 표시
      if (promptInput) {
        promptInput.disabled = true;
        promptInput.value = window.i18n?.aiProcessing || 'AI가 응답을 처리하고 있습니다...';
        promptInput.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        promptInput.style.color = 'white';
        promptInput.style.borderColor = 'transparent';
        promptInput.style.fontWeight = '500';
      }

      // Get checked nodes context (now async)
      let finalMessage = message;
      if (window.MyMind3 && window.MyMind3.NodeRenderer && window.MyMind3.NodeRenderer.getCheckedNodesContext) {
        const checkedContext = await window.MyMind3.NodeRenderer.getCheckedNodesContext();
        if (checkedContext) {
          finalMessage = message + checkedContext;
        }
      }

      // 테이블 생성 지침 자동 추가 (이미지 모델 제외)
      const isImageModel = window.MyMindAI.currentModel && window.MyMindAI.currentModel.includes('image');
      if (!isImageModel) {
        finalMessage += '\n\n[중요 지침] 테이블을 생성할 때는 각 셀 내부에서 줄바꿈을 절대 사용하지 마세요. 엔터나 <br> 태그 없이 모든 셀 내용을 한 줄로 작성해야 합니다.';
      }

      // 사용자 메시지 표시는 sendMultiAIMessage에서 통합 처리 (중복 방지)
      // sendMultiAIMessage에서 streamingDiv에 질문을 포함하여 표시하므로 여기서는 제거

      // Initialize conversation history if not exists
      if (!window.MyMindAI.conversationHistory) {
        window.MyMindAI.conversationHistory = [];
      }

      // Add user message to conversation history
      window.MyMindAI.conversationHistory.push({
        role: 'user',
        content: finalMessage
      });

      // Keep only last 10 messages (5 exchanges) for context
      if (window.MyMindAI.conversationHistory.length > 10) {
        window.MyMindAI.conversationHistory = window.MyMindAI.conversationHistory.slice(-10);
      }

      promptInput.value = '';

      // 통합된 AI 호출: 단일/다중 모드 모두 sendMultiAIMessage 사용
      // getSelectedAIServices()가 모드에 따라 현재 서비스 또는 모든 활성화된 서비스를 반환
      try {
        console.log('[AI] Unified AI call - multiSelectMode:', window.MyMindAI.multiSelectMode);
        await sendMultiAIMessage(finalMessage, window.MyMindAI.conversationHistory);
      } catch (error) {
        // Handle abort error separately
        if (error.name === 'AbortError') {
          console.log('[AI] Request was aborted');
          return;
        }
        console.error('[AI] Request failed:', error);
        addMessageToDisplay('error', `AI 요청 실패: ${error.message}`);
      } finally {
        // Reset processing state + input 스타일 복원
        window.MyMindAI.isProcessing = false;
        sendBtn.disabled = false;
        if (promptInput) {
          promptInput.disabled = false;
          promptInput.value = '';
          promptInput.style.background = '';
          promptInput.style.color = '';
          promptInput.style.borderColor = '';
          promptInput.style.fontWeight = '';
        }

        // Clean up abort controller and reader
        window.MyMindAI.abortController = null;
        window.MyMindAI.streamReader = null;

        // 크레딧 결제 모드인 경우 잔액 UI 업데이트
        const currentService = window.MyMindAI?.currentService || 'gpt';
        let paymentMethod = 'apikey';
        try {
          let aiSettings = window.MyMind3AISettings?.getAISettings?.();
          if (!aiSettings) {
            const savedSettings = localStorage.getItem('mymind3_ai_settings');
            if (savedSettings) aiSettings = JSON.parse(savedSettings);
          }
          if (aiSettings?.services?.[currentService]) {
            paymentMethod = aiSettings.services[currentService].paymentMethod || 'apikey';
          }
        } catch (e) { /* ignore */ }

        if (paymentMethod === 'credit') {
          try {
            const balance = await getCreditBalance();
            if (balance && balance.credits) {
              updateCreditBalanceUI(balance.credits);
              console.log('[AI] Credit balance updated:', balance.credits);
            }
          } catch (e) {
            console.warn('[AI] Failed to update credit balance UI:', e);
          }
        }
      }
    }

    // [2025-12-27] 레거시 단일 모드 코드 삭제됨
    // 모든 AI 호출은 이제 sendMultiAIMessage → callSingleAIService 경로로 통합되었습니다.
    // 스트리밍, 이미지 첨부 모두 callSingleAIService에서 통합 처리됩니다.

    /* ===== 삭제된 레거시 코드 (약 400줄) =====
     * - 단일 모드 직접 /api/ai/chat 호출
     * - 단일 모드 직접 /api/ai/chat-stream 호출
     * - 스트리밍 응답 처리 로직
     * - 이미지 첨부 처리 로직
     * 모든 기능이 callSingleAIService/callSingleAIServiceStreaming으로 통합됨
     * ===== 삭제된 레거시 코드 끝 =====
     */

    /* ========== 아래부터 삭제된 레거시 코드 400줄 시작 ==========

          // 마크다운 파싱 (서버 응답 구조: { success, data: { response } })
          const responseText = data.data?.response || data.data?.text || data.text || data.response || '';

          // formatAIResponse 사용 (이미지 복사 버튼 포함)
          const formattedHTML = formatAIResponse(responseText);
          contentDiv.innerHTML = formattedHTML;

          messageDiv.appendChild(modelBadge);
          messageDiv.appendChild(contentDiv);

          // 복사 버튼 추가 (non-streaming 응답용)
          const copyButtonsContainer = document.createElement('div');
          copyButtonsContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; flex-wrap: wrap;';

          // AI 이미지가 있으면 이미지 복사, 다운로드 버튼 추가
          const aiImage = contentDiv.querySelector('.ai-generated-image');
          if (aiImage) {
            const imageSrc = aiImage.getAttribute('data-image-src');
            if (imageSrc) {
              const imgCopyBtn = document.createElement('button');
              imgCopyBtn.className = 'ai-image-copy-btn';
              imgCopyBtn.innerHTML = mmIcon('clipboard', 14) + ' 이미지 복사';
              imgCopyBtn.setAttribute('data-image-src', imageSrc);
              imgCopyBtn.style.cssText = 'padding: 8px 16px; background: #28a745; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; height: 36px;';

              const imgDownloadBtn = document.createElement('button');
              imgDownloadBtn.className = 'ai-image-download-btn';
              imgDownloadBtn.textContent = t('appDownload', '다운로드');
              imgDownloadBtn.setAttribute('data-image-src', imageSrc);
              imgDownloadBtn.setAttribute('data-filename', `ai-image-${Date.now()}.png`);
              imgDownloadBtn.style.cssText = 'padding: 8px 16px; background: #17a2b8; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; height: 36px;';

              copyButtonsContainer.appendChild(imgCopyBtn);
              copyButtonsContainer.appendChild(imgDownloadBtn);
            }
          }

          const copyMarkdownBtn = document.createElement('button');
          copyMarkdownBtn.className = 'copy-full-btn';
          copyMarkdownBtn.innerHTML = mmIcon('clipboard', 14) + ' 전체복사';
          copyMarkdownBtn.style.cssText = 'padding: 8px 16px; background: #1976d2; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; height: 36px;';
          copyMarkdownBtn.setAttribute('data-listener-attached', 'true');
          copyMarkdownBtn.onclick = function () {
            copyToEditor(responseText);
            const originalHTML = this.innerHTML;
            this.innerHTML = mmIcon('check-circle', 14) + ' 복사 완료!';
            this.style.background = '#28a745';
            setTimeout(() => {
              this.innerHTML = originalHTML;
              this.style.background = '#1976d2';
            }, 2000);
          };

          copyButtonsContainer.appendChild(copyMarkdownBtn);
          messageDiv.appendChild(copyButtonsContainer);

          document.getElementById('llmResponse').appendChild(messageDiv);

          // 대화 히스토리 추가
          window.MyMindAI.conversationHistory.push({
            role: 'assistant',
            content: responseText
          });

          // LaTeX 렌더링
          if (typeof renderMathInElement === 'function') {
            renderMathInElement(contentDiv, {
              delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\[', right: '\\]', display: true },
                { left: '\\(', right: '\\)', display: false }
              ],
              throwOnError: false
            });
          }

          // 복사 버튼 리스너 (이미지 복사 버튼 등)
          if (typeof attachQACopyListeners === 'function') {
            attachQACopyListeners();
          }

          // 스크롤
          document.getElementById('llmResponse').scrollTop = document.getElementById('llmResponse').scrollHeight;

          // 자동 노드 생성 (자동만들기 체크 시)
          await autoCreateNodeFromQuestion(message, responseText);

          // 처리 완료 + input 복원
          window.MyMindAI.isProcessing = false;
          sendBtn.disabled = false;
          if (promptInput) {
            promptInput.disabled = false;
            promptInput.value = '';
            promptInput.style.background = '';
            promptInput.style.color = '';
            promptInput.style.borderColor = '';
            promptInput.style.fontWeight = '';
          }
          return;
        }

        // 실시간 스트리밍 사용 (GPT, Grok, Local 등)
        console.log(`[AI] Using streaming API for ${window.MyMindAI.currentService}`);

        // 이미지 데이터 준비 (스트리밍)
        const streamImageData = window.MyMindAI.attachedImage ? {
          base64: window.MyMindAI.attachedImage.base64,
          mimeType: window.MyMindAI.attachedImage.mimeType
        } : null;

        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
        const response = await fetch('/api/ai/chat-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include',
          signal: window.MyMindAI.abortController.signal, // Add abort signal
          body: JSON.stringify({
            message: finalMessage,
            conversationHistory: window.MyMindAI.conversationHistory,
            service: window.MyMindAI.currentService,
            model: window.MyMindAI.currentModel,
            temperature: 0.7,
            maxTokens: getOptimalMaxTokens(window.MyMindAI.currentService, window.MyMindAI.currentModel, 'chat'),
            paymentMethod, // 서버에 결제 방식도 전달
            image: streamImageData // 첨부 이미지 데이터
          })
        });

        // 이미지 전송 후 클리어
        if (streamImageData) {
          window.MyMindAI.clearAttachedImage();
        }

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `HTTP ${response.status}`;
          let errorCode = null;
          let canUseClientApiKey = false;
          try {
            const errorData = JSON.parse(errorText);
            errorCode = errorData.code;
            canUseClientApiKey = errorData.canUseClientApiKey || false;
            if (errorData.error) {
              errorMessage += `: ${errorData.error}`;
            }
          } catch (e) {
            if (errorText) {
              errorMessage += `: ${errorText}`;
            }
          }

          // 크레딧 부족 시 사용자 API Key로 자동 재시도
          if (errorCode === 'INSUFFICIENT_CREDITS' && canUseClientApiKey && currentApiKey) {
            console.log('[AI] 크레딧 소진 - 사용자 API Key로 자동 전환하여 재시도');
            paymentMethod = 'apikey';
            // 재귀 호출 대신 에러를 throw하고 외부에서 처리하도록 함
            const retryError = new Error('RETRY_WITH_API_KEY');
            retryError.code = 'RETRY_WITH_API_KEY';
            throw retryError;
          }

          // 크레딧 부족인데 API Key 없음
          if (errorCode === 'INSUFFICIENT_CREDITS' && !currentApiKey) {
            throw new Error(`크레딧이 소진되었습니다. ${currentService.toUpperCase()} API Key를 등록하거나 크레딧을 충전해주세요.`);
          }

          throw new Error(errorMessage);
        }

        // 스트리밍 응답 처리
        const reader = response.body.getReader();
        window.MyMindAI.streamReader = reader; // Store reader for cancellation
        const decoder = new TextDecoder();
        let buffer = '';
        let fullResponse = '';

        // 실시간 응답을 표시할 메시지 div 생성
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant-message streaming';
        messageDiv.style.cssText = 'padding: 15px; margin-bottom: 15px; background-color: #f0f7ff; border-radius: 8px; line-height: 1.6;';

        const modelBadge = document.createElement('span');
        modelBadge.style.cssText = 'display: inline-block; padding: 2px 8px; background-color: #1976d2; color: white; border-radius: 4px; font-size: 11px; margin-bottom: 8px; font-weight: 600;';
        modelBadge.textContent = window.MyMindAI.currentModel;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.style.cssText = 'color: #000000 !important; word-wrap: break-word;';

        messageDiv.appendChild(modelBadge);
        messageDiv.appendChild(contentDiv);
        document.getElementById('llmResponse').appendChild(messageDiv);

        // 스트림 읽기
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('[AI Stream] Stream complete');
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // 마지막 불완전한 라인은 버퍼에 보관

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const data = trimmed.substring(6);

              if (data === '[DONE]') {
                console.log('[AI Stream] Stream finished');
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullResponse += parsed.content;
                  // 실시간으로 화면 업데이트
                  contentDiv.textContent = fullResponse;
                  // 스크롤을 아래로
                  document.getElementById('llmResponse').scrollTop = document.getElementById('llmResponse').scrollHeight;
                } else if (parsed.error) {
                  // 스트리밍 중 에러 발생
                  console.error('[AI Stream] Error from server:', parsed.error);
                  // 부분 응답이 있으면 messageDiv 제거
                  if (messageDiv && messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                  }
                  throw new Error(parsed.error);
                }
              } catch (e) {
                // JSON 파싱 에러는 무시하고 계속 진행
                if (e.message.includes('Unexpected token') || e.message.includes('JSON')) {
                  console.warn('[AI Stream] JSON parse error, skipping:', e.message);
                } else {
                  // 실제 에러면 throw
                  throw e;
                }
              }
            }
          }
        }

        // 스트리밍 완료 후 최종 포맷팅
        messageDiv.classList.remove('streaming');
        const formattedHTML = formatAIResponse(fullResponse);
        contentDiv.innerHTML = formattedHTML;

        // 복사 버튼 추가 (스트리밍 완료 후)
        const copyButtonsContainer = document.createElement('div');
        copyButtonsContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; flex-wrap: wrap;';

        // AI 이미지가 있으면 이미지 복사, 다운로드 버튼 추가
        const aiImage = contentDiv.querySelector('.ai-generated-image');
        if (aiImage) {
          const imageSrc = aiImage.getAttribute('data-image-src');
          if (imageSrc) {
            const imgCopyBtn = document.createElement('button');
            imgCopyBtn.className = 'ai-image-copy-btn';
            imgCopyBtn.innerHTML = mmIcon('clipboard', 14) + ' 이미지 복사';
            imgCopyBtn.setAttribute('data-image-src', imageSrc);
            imgCopyBtn.style.cssText = 'padding: 8px 16px; background: #28a745; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; height: 36px;';

            const imgDownloadBtn = document.createElement('button');
            imgDownloadBtn.className = 'ai-image-download-btn';
            imgDownloadBtn.textContent = t('downloadBtn', '다운로드');
            imgDownloadBtn.setAttribute('data-image-src', imageSrc);
            imgDownloadBtn.setAttribute('data-filename', `ai-image-${Date.now()}.png`);
            imgDownloadBtn.style.cssText = 'padding: 8px 16px; background: #17a2b8; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; height: 36px;';

            copyButtonsContainer.appendChild(imgCopyBtn);
            copyButtonsContainer.appendChild(imgDownloadBtn);
          }
        }

        // 전체복사 버튼 (마크다운으로 에디터에 복사)
        const copyMarkdownBtn = document.createElement('button');
        copyMarkdownBtn.className = 'copy-full-btn';
        copyMarkdownBtn.innerHTML = mmIcon('clipboard', 14) + ' 전체복사';
        copyMarkdownBtn.style.cssText = 'padding: 8px 16px; background: #1976d2; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; height: 36px;';
        copyMarkdownBtn.setAttribute('data-listener-attached', 'true'); // 중복 이벤트 리스너 방지
        copyMarkdownBtn.onclick = function () {
          // 마크다운 원본을 에디터에 직접 삽입
          copyToEditor(fullResponse);

          // 시각적 피드백
          const originalHTML = this.innerHTML;
          this.innerHTML = mmIcon('check-circle', 14) + ' 복사 완료!';
          this.style.background = '#28a745';
          setTimeout(() => {
            this.innerHTML = originalHTML;
            this.style.background = '#1976d2';
          }, 2000);
        };

        copyButtonsContainer.appendChild(copyMarkdownBtn);
        messageDiv.appendChild(copyButtonsContainer);

        // LaTeX 렌더링 (스트리밍 완료 후)
        if (typeof renderMathInElement === 'function') {
          console.log('[sendAIMessage] Triggering KaTeX rendering after streaming complete');
          renderMathInElement(contentDiv, {
            delimiters: [
              { left: '$$', right: '$$', display: true },
              { left: '$', right: '$', display: false },
              { left: '\\[', right: '\\]', display: true },
              { left: '\\(', right: '\\)', display: false }
            ],
            throwOnError: false
          });
          console.log('[sendAIMessage] KaTeX rendering complete');
        }

        // 복사 버튼 이벤트 리스너 재등록 (스트리밍 완료 후)
        if (typeof attachQACopyListeners === 'function') {
          attachQACopyListeners();
          console.log('[sendAIMessage] Copy button listeners attached');
        }

        // Add AI response to conversation history
        window.MyMindAI.conversationHistory.push({
          role: 'assistant',
          content: fullResponse
        });

        // Auto-save AI response - addMessageToDisplay 형태로 저장 (다중 모드와 동일)
        // 단일 AI 모드에서는 현재 선택된 AI 서비스의 Q&A 파일에 저장
        const saveHTML = addMessageToDisplay('assistant', fullResponse, window.MyMindAI.currentModel, null, false);
        if (saveHTML) {
          await autoSaveQAItem(saveHTML, window.MyMindAI.currentService);
        }

        console.log('[AI Stream] Final response:', fullResponse.substring(0, 200));

        // 자동 노드 생성 (자동만들기 체크 시)
        await autoCreateNodeFromQuestion(message, fullResponse);

      } catch (error) {
        // Handle abort error separately
        if (error.name === 'AbortError') {
          console.log('[AI] Request was aborted');
          // Don't show error message, cancelAIRequest already handled it
          return;
        }

        // 크레딧 소진 시 API Key로 자동 재시도
        if (error.code === 'RETRY_WITH_API_KEY' && currentApiKey) {
          console.log('[AI] 크레딧 소진 - API Key로 재시도 중...');
          addMessageToDisplay('system', t('appCreditExhaustedAutoSwitch', '크레딧이 소진되어 등록된 API Key로 자동 전환합니다.'));

          // Reset state for retry + input 복원
          window.MyMindAI.isProcessing = false;
          sendBtn.disabled = false;
          if (promptInput) {
            promptInput.disabled = false;
            promptInput.value = '';
            promptInput.style.background = '';
            promptInput.style.color = '';
            promptInput.style.borderColor = '';
            promptInput.style.fontWeight = '';
          }

          // API Key 모드로 재시도 (callSingleAIService 사용)
          try {
            const retryResult = await callSingleAIService(currentService, finalMessage, window.MyMindAI.conversationHistory, {
              timeout: 60000,
              useStreaming: true,
              onStreamChunk: (chunk, full) => {
                // 스트리밍 청크를 기존 응답에 추가
                const llmResponse = document.getElementById('llmResponse');
                const lastMessage = llmResponse?.querySelector('.message.assistant-message:last-child .message-content');
                if (lastMessage) {
                  lastMessage.innerHTML = window.formatAIResponse ? window.formatAIResponse(full) : full;
                }
              }
            });

            if (retryResult?.content) {
              window.MyMindAI.conversationHistory.push({ role: 'assistant', content: retryResult.content });
              await autoCreateNodeFromQuestion(message, retryResult.content);
            }
          } catch (retryError) {
            console.error('[AI] API Key 재시도 실패:', retryError);
            addMessageToDisplay('error', `API Key 전환 후 오류: ${retryError.message}`);
          }
          return;
        }

        console.error('AI request failed:', error);

        // 에러 메시지 구성
        let errorMessage = `서비스: ${window.MyMindAI.currentService.toUpperCase()}\n`;
        errorMessage += `모델: ${window.MyMindAI.currentModel}\n\n`;
        errorMessage += `에러 내용:\n${error.message}`;

        // 네트워크 에러인 경우
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage += '\n\n네트워크 연결을 확인해주세요.';
        }

        // API 키 에러인 경우
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage += '\n\nAPI 키를 확인해주세요.';
        }

        // 할당량 초과 에러인 경우
        if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate limit')) {
          errorMessage += '\n\nAPI 사용량 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
        }

        addMessageToDisplay('error', errorMessage);
      } finally {
        // Reset processing state + input 복원
        window.MyMindAI.isProcessing = false;
        sendBtn.disabled = false;
        if (promptInput) {
          promptInput.disabled = false;
          promptInput.value = '';
          promptInput.style.background = '';
          promptInput.style.color = '';
          promptInput.style.borderColor = '';
          promptInput.style.fontWeight = '';
        }

        // Clean up abort controller and reader
        window.MyMindAI.abortController = null;
        window.MyMindAI.streamReader = null;

        // 크레딧 결제 모드인 경우 잔액 UI 업데이트
        if (paymentMethod === 'credit') {
          try {
            const balance = await getCreditBalance();
            if (balance && balance.credits) {
              updateCreditBalanceUI(balance.credits);
              console.log('[AI] Credit balance updated after request:', balance.credits);
            }
          } catch (e) {
            console.warn('[AI] Failed to update credit balance UI:', e);
          }
        }
      }
    }
    ========== 삭제된 레거시 코드 400줄 끝 ========== */

    function formatAIResponse(content) {
      console.log('[formatAIResponse] Original content:', content.substring(0, 200));

      // 먼저 마크다운 테이블을 HTML 테이블로 변환
      content = convertMarkdownTablesToHTML(content);

      // AI 이미지 처리 (마크다운 이미지를 HTML + 버튼으로 변환)
      const imagePlaceholders = [];
      let imageIndex = 0;

      // 마크다운 이미지 ![alt](URL) 형식을 HTML로 변환 (파일 URL 기반)
      content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
        const imgHtml = `
          <div class="ai-generated-image" data-image-src="${src}" style="margin: 15px 0; text-align: center;">
            <img src="${src}" alt="${alt || 'AI 생성 이미지'}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          </div>`;
        const placeholder = `___AI_IMAGE_${imageIndex}___`;
        imagePlaceholders.push({ placeholder, html: imgHtml });
        imageIndex++;
        return placeholder;
      });


      // 코드 블록을 HTML로 변환하고 보호 (LaTeX보다 먼저 처리)
      const codePlaceholders = [];
      let codeIndex = 0;

      // 1. 언어 지정 코드 블록: ```language\ncode\n```
      content = content.replace(/```(\w+)\n([\s\S]*?)```/g, (match, lang, code) => {
        const escapedCode = code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

        const htmlCode = `<pre style="background-color: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 10px 0;"><code class="language-${lang}" style="font-family: 'Courier New', monospace; font-size: 14px;">${escapedCode}</code></pre>`;
        const placeholder = `___CODE_BLOCK_${codeIndex}___`;
        codePlaceholders.push({ placeholder, html: htmlCode });
        codeIndex++;
        return placeholder;
      });

      // 2. 일반 코드 블록: ```\ncode\n```
      content = content.replace(/```\n([\s\S]*?)```/g, (match, code) => {
        const escapedCode = code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

        const htmlCode = `<pre style="background-color: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 10px 0;"><code style="font-family: 'Courier New', monospace; font-size: 14px;">${escapedCode}</code></pre>`;
        const placeholder = `___CODE_BLOCK_${codeIndex}___`;
        codePlaceholders.push({ placeholder, html: htmlCode });
        codeIndex++;
        return placeholder;
      });

      // 3. 인라인 코드: `code`
      content = content.replace(/`([^`]+)`/g, (match, code) => {
        const escapedCode = code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

        return `<code style="background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 0.9em;">${escapedCode}</code>`;
      });

      // LaTeX 수식을 임시로 보호 (placeholder로 대체)
      const latexPlaceholders = [];
      let placeholderIndex = 0;

      // Display math $$...$$ 보호 (가장 먼저 - $...$ 보다 우선)
      content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
        const placeholder = `___LATEX_DISPLAY_${placeholderIndex}___`;
        latexPlaceholders.push({ placeholder, original: match });
        placeholderIndex++;
        return placeholder;
      });

      // Inline math $...$ 보호
      content = content.replace(/\$([^\$\n]+?)\$/g, (match) => {
        const placeholder = `___LATEX_INLINE_${placeholderIndex}___`;
        latexPlaceholders.push({ placeholder, original: match });
        placeholderIndex++;
        return placeholder;
      });

      // Display math \[...\] 보호
      content = content.replace(/\\\[([\s\S]*?)\\\]/g, (match) => {
        const placeholder = `___LATEX_DISPLAY_${placeholderIndex}___`;
        latexPlaceholders.push({ placeholder, original: match });
        placeholderIndex++;
        return placeholder;
      });

      // Inline math \(...\) 보호
      content = content.replace(/\\\(([\s\S]*?)\\\)/g, (match) => {
        const placeholder = `___LATEX_INLINE_${placeholderIndex}___`;
        latexPlaceholders.push({ placeholder, original: match });
        placeholderIndex++;
        return placeholder;
      });

      // HTML 테이블 보호 (줄바꿈 처리 전에 테이블을 먼저 보호)
      const tablePlaceholders = [];
      let tableIndex = 0;

      content = content.replace(/<table[\s\S]*?<\/table>/gi, (match) => {
        const placeholder = `___TABLE_${tableIndex}___`;
        tablePlaceholders.push({ placeholder, html: match });
        tableIndex++;
        return placeholder;
      });

      // Convert **bold** text to HTML bold (LaTeX가 보호된 상태에서)
      content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

      // Convert line breaks to paragraph breaks (LaTeX가 placeholder 상태에서 안전하게 처리)
      // FIX: 빈 문단 생성 방지 - 실제 내용이 있는 경우만 </p><p> 태그 삽입
      content = content.replace(/\n\n+/g, (match, offset, string) => {
        // 앞뒤로 실제 텍스트가 있는지 확인
        const before = string.substring(0, offset).trim();
        const after = string.substring(offset + match.length).trim();

        // 앞뒤 모두 내용이 있을 때만 문단 구분자 삽입
        if (before && after) {
          return '</p><p style="margin: 12px 0; line-height: 1.6;">';
        }
        // 그렇지 않으면 단순 줄바꿈으로 처리
        return '<br>';
      });
      content = content.replace(/\n/g, '<br>');

      // Wrap in paragraph tags if not already formatted
      if (!content.includes('<p>') && !content.includes('<div>') && !content.includes('<table>')) {
        content = `<p style="margin: 12px 0; line-height: 1.6;">${content}</p>`;
      }

      // 코드 블록 복원 (가장 먼저)
      codePlaceholders.forEach(({ placeholder, html }) => {
        content = content.replace(placeholder, html);
      });

      // 테이블 복원 (코드 블록 다음, LaTeX 전)
      tablePlaceholders.forEach(({ placeholder, html }) => {
        content = content.replace(placeholder, html);
      });

      // AI 이미지 복원
      imagePlaceholders.forEach(({ placeholder, html }) => {
        content = content.replace(placeholder, html);
      });

      // LaTeX 수식 복원 (가장 마지막에 - 줄바꿈 처리 후)
      // LaTeX placeholder를 KaTeX로 렌더링하여 복원
      latexPlaceholders.forEach(({ placeholder, original }) => {
        try {
          let latex = original;
          let displayMode = false;

          // Display mode 여부 확인 및 LaTeX 추출
          if (original.startsWith('$$') && original.endsWith('$$')) {
            latex = original.slice(2, -2).trim();
            displayMode = true;
          } else if (original.startsWith('$') && original.endsWith('$')) {
            latex = original.slice(1, -1).trim();
            displayMode = false;
          } else if (original.startsWith('\\[') && original.endsWith('\\]')) {
            latex = original.slice(2, -2).trim();
            displayMode = true;
          } else if (original.startsWith('\\(') && original.endsWith('\\)')) {
            latex = original.slice(2, -2).trim();
            displayMode = false;
          }

          // KaTeX로 렌더링
          if (typeof katex !== 'undefined') {
            const rendered = katex.renderToString(latex, { displayMode, throwOnError: false });
            content = content.replace(placeholder, rendered);
          } else {
            content = content.replace(placeholder, original);
          }
        } catch (e) {
          console.warn('[formatAIResponse] KaTeX 렌더링 실패:', e);
          content = content.replace(placeholder, original);
        }
      });

      // 연속된 <br> 태그 정리 (3개 이상을 2개로 축소)
      content = content.replace(/(<br\s*\/?>){3,}/gi, '<br><br>');

      // 표 앞뒤의 <br> 태그 모두 제거
      content = content.replace(/(<br\s*\/?>)+(\s*<table)/gi, '$2'); // 표 앞 <br> 제거
      content = content.replace(/(<\/table>\s*)(<br\s*\/?>)+/gi, '$1'); // 표 뒤 <br> 제거

      console.log('[formatAIResponse] Formatted content:', content.substring(0, 200));
      return content;
    }

    // 마크다운 테이블들을 HTML 테이블로 변환
    function convertMarkdownTablesToHTML(text) {
      const lines = text.split('\n');
      let result = [];
      let inTable = false;
      let tableLines = [];
      let inCodeBlock = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 코드 블록 체크
        if (line.trim().startsWith('```')) {
          inCodeBlock = !inCodeBlock;
          // 코드 블록 종료 시 테이블도 종료
          if (!inCodeBlock && inTable && tableLines.length > 0) {
            result.push(buildHTMLTableFromLines(tableLines));
            tableLines = [];
            inTable = false;
          }
          // 코드 블록 시작/종료 라인은 result에 추가
          result.push(line);
          continue;
        }

        // 코드 블록 안에서는 그대로 유지
        if (inCodeBlock) {
          // 코드 블록 내용은 테이블 처리 없이 그대로 추가
          result.push(line);
          continue;
        }

        // 일반 마크다운 테이블 처리
        const trimmed = line.trim();
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          if (!inTable) {
            inTable = true;
            tableLines = [];
          }
          tableLines.push(line);
        } else if (trimmed.includes('---') && trimmed.includes('|') && inTable) {
          // 구분선 포함
          tableLines.push(line);
        } else {
          // 테이블 종료
          if (inTable && tableLines.length > 0) {
            result.push(buildHTMLTableFromLines(tableLines));
            tableLines = [];
            inTable = false;
          }
          result.push(line);
        }
      }

      // 마지막 테이블 처리
      if (inTable && tableLines.length > 0) {
        result.push(buildHTMLTableFromLines(tableLines));
      }

      return result.join('\n');
    }

    // 테이블 라인들로부터 HTML 테이블 생성
    function buildHTMLTableFromLines(lines) {
      if (lines.length < 2) return lines.join('\n');

      console.log('[buildHTMLTableFromLines] Lines:', lines);

      // 헤더 라인
      const headerLine = lines[0];
      const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);

      // 구분선 찾기
      let separatorIndex = -1;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].includes('---') || lines[i].includes('—')) {
          separatorIndex = i;
          break;
        }
      }

      if (separatorIndex === -1) {
        // 구분선이 없으면 원본 반환
        return lines.join('\n');
      }

      // 데이터 라인들
      const dataLines = lines.slice(separatorIndex + 1);
      const dataRows = dataLines.map(line => {
        return line.split('|').map(cell => cell.trim()).filter(cell => cell);
      });

      // HTML 테이블 생성
      let html = '<table style="border-collapse: collapse; width: 100%; margin: 10px 0; border: 1px solid #ddd;">\n';

      // 헤더
      html += '  <thead>\n    <tr>';
      headers.forEach(header => {
        html += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">${header}</th>`;
      });
      html += '</tr>\n  </thead>\n';

      // 바디
      if (dataRows.length > 0) {
        html += '  <tbody>\n';
        dataRows.forEach(row => {
          if (row.length > 0) {
            html += '    <tr>';
            row.forEach(cell => {
              html += `<td style="border: 1px solid #ddd; padding: 8px;">${cell}</td>`;
            });
            html += '</tr>\n';
          }
        });
        html += '  </tbody>\n';
      }

      html += '</table>';

      console.log('[buildHTMLTableFromLines] Generated HTML:', html.substring(0, 200));
      return html;
    }

    /**
     * MathML을 LaTeX로 변환
     * @param {Element} mathElement - MathML math 요소
     * @returns {string} LaTeX 문자열
     */
    function convertMathMLToLaTeX(mathElement) {
      if (!mathElement) return '';

      // 기본적으로 innerHTML을 가져와서 MathML 태그를 LaTeX로 변환
      const processNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent;
        }

        const tagName = node.tagName?.toLowerCase();
        const children = Array.from(node.childNodes).map(processNode).join('');

        switch (tagName) {
          case 'mi': // identifier (변수)
          case 'mn': // number
          case 'mo': // operator
            return node.textContent;

          case 'msup': // 위첨자 (^)
            const base = processNode(node.childNodes[0]);
            const sup = processNode(node.childNodes[1]);
            return `${base}^{${sup}}`;

          case 'msub': // 아래첨자 (_)
            const baseS = processNode(node.childNodes[0]);
            const sub = processNode(node.childNodes[1]);
            return `${baseS}_{${sub}}`;

          case 'mfrac': // 분수
            const num = processNode(node.childNodes[0]);
            const den = processNode(node.childNodes[1]);
            return `\\frac{${num}}{${den}}`;

          case 'msqrt': // 제곱근
            return `\\sqrt{${children}}`;

          case 'mroot': // n제곱근
            const radicand = processNode(node.childNodes[0]);
            const index = processNode(node.childNodes[1]);
            return `\\sqrt[${index}]{${radicand}}`;

          case 'munderover': // 위아래 기호 (합, 적분 등)
            const op = processNode(node.childNodes[0]);
            const under = processNode(node.childNodes[1]);
            const over = processNode(node.childNodes[2]);
            return `${op}_{${under}}^{${over}}`;

          case 'msubsup': // 위아래 첨자
            const baseSubSup = processNode(node.childNodes[0]);
            const subSubSup = processNode(node.childNodes[1]);
            const supSubSup = processNode(node.childNodes[2]);
            return `${baseSubSup}_{${subSubSup}}^{${supSubSup}}`;

          case 'mrow': // 그룹
          case 'mstyle':
          case 'math':
            return children;

          default:
            return children;
        }
      };

      return processNode(mathElement);
    }

    /**
     * HTML을 포맷된 텍스트로 변환 (줄바꿈 정보 유지)
     * @param {HTMLElement} element - 변환할 HTML 엘리먼트
     * @returns {string} 포맷된 텍스트
     */
    function convertHtmlToFormattedText(element) {
      if (!element) return '';

      // Clone the element to avoid modifying the original
      const clone = element.cloneNode(true);

      // KaTeX 렌더링된 수식을 원본 LaTeX로 복원
      clone.querySelectorAll('.katex').forEach(katexSpan => {
        // KaTeX는 <math><semantics><annotation encoding="application/x-tex">에 원본 LaTeX 저장
        const annotation = katexSpan.querySelector('math semantics annotation[encoding="application/x-tex"]');
        if (annotation) {
          const latex = annotation.textContent;

          // Display math인지 inline math인지 확인
          // KaTeX는 display mode일 때 .katex-display 클래스 사용
          const isDisplay = katexSpan.classList.contains('katex-display') ||
            katexSpan.parentElement?.classList.contains('katex-display');

          // Display math: $$...$$ 또는 \[...\], Inline math: $...$ 또는 \(...\)
          const wrappedLatex = isDisplay
            ? `$$${latex}$$`
            : `$${latex}$`;

          console.log('[convertHtmlToFormattedText] KaTeX → LaTeX:', wrappedLatex.substring(0, 100));

          // KaTeX span 전체를 LaTeX로 교체
          const textNode = document.createTextNode(wrappedLatex);
          katexSpan.replaceWith(textNode);
        }
      });

      // MathJax 렌더링된 수식을 원본 LaTeX로 복원
      clone.querySelectorAll('mjx-container').forEach(container => {
        // MathJax는 접근성을 위해 <mjx-assistive-mml>에 MathML 저장
        const assistiveMml = container.querySelector('mjx-assistive-mml math');
        if (assistiveMml) {
          const isDisplay = container.getAttribute('display') === 'true';

          // MathML을 LaTeX로 변환
          const latex = convertMathMLToLaTeX(assistiveMml);

          // Display math (블록): \[...\], Inline math (인라인): \(...\)
          const wrappedLatex = isDisplay
            ? `\n\n\\[${latex}\\]\n\n`
            : `\\(${latex}\\)`;

          console.log('[convertHtmlToFormattedText] MathML → LaTeX:', wrappedLatex.substring(0, 100));
          container.replaceWith(wrappedLatex);
        }
      });

      // Process elements in order: tables, headers, lists, paragraphs, divs, breaks

      // <table> → Keep HTML table format (markdown tables don't support LaTeX rendering)
      // CRITICAL FIX: TOAST UI Editor's KaTeX plugin doesn't render LaTeX in markdown tables
      // Solution: Keep HTML table format instead of converting to markdown
      clone.querySelectorAll('table').forEach(table => {
        // Simply convert table to HTML string and wrap with newlines
        const tableHTML = '\n\n' + table.outerHTML + '\n\n';

        console.log('[Table] Keeping HTML format for LaTeX support');
        table.replaceWith(tableHTML);
      });

      // <h1>, <h2>, <h3>, etc. → double newline with # prefix
      for (let i = 1; i <= 6; i++) {
        clone.querySelectorAll(`h${i}`).forEach(h => {
          const text = h.textContent.trim();
          const prefix = '#'.repeat(i);
          h.replaceWith(`\n\n${prefix} ${text}\n\n`);
        });
      }

      // <li> → newline with bullet or number
      clone.querySelectorAll('li').forEach((li, index) => {
        const text = li.textContent.trim();
        const parentTag = li.parentElement?.tagName.toLowerCase();
        const prefix = parentTag === 'ol' ? `${index + 1}. ` : '- ';
        li.replaceWith('\n' + prefix + text);
      });

      // <p> → double newline (paragraph breaks)
      clone.querySelectorAll('p').forEach(p => {
        const text = p.textContent.trim();
        if (text) {
          p.replaceWith('\n\n' + text);
        } else {
          // FIX: 빈 <p> 태그 완전 제거 (프리뷰에서 <P></P> 노출 방지)
          p.remove();
        }
      });

      // <br> → newline (preserve line breaks)
      clone.querySelectorAll('br').forEach(br => {
        br.replaceWith('\n');
      });

      // <strong>, <b> → keep text only (remove tags but keep content)
      clone.querySelectorAll('strong, b').forEach(elem => {
        elem.replaceWith(elem.textContent);
      });

      // <div> → newline before content (to preserve block structure)
      clone.querySelectorAll('div').forEach(div => {
        const text = div.textContent.trim();
        if (text) {
          // Check if div contains markdown structure elements
          const hasStructure = div.querySelector('p, h1, h2, h3, h4, h5, h6, ul, ol, li, table');
          if (!hasStructure) {
            div.replaceWith('\n' + text);
          }
        }
      });

      // Get the final text content
      let text = clone.textContent || '';

      console.log('[convertHtmlToFormattedText] Before cleanup:', text.substring(0, 300));

      // Clean up extra whitespace BUT preserve single and double newlines
      // Replace multiple spaces (3+) with single space
      text = text.replace(/   +/g, ' ');

      // CRITICAL FIX: 과도한 빈 줄 제거로 <P></P> 태그 방지
      // Replace 3+ consecutive newlines with 2 newlines (preserve paragraph breaks)
      text = text.replace(/\n{3,}/g, '\n\n');

      // 수식 주변의 불필요한 빈 줄 제거
      // LaTeX 블록 수식 주변 정리: \n\n$$...$$\n\n → \n\n$$...$$\n\n (변경 없음)
      // LaTeX 인라인 수식 앞뒤 빈 줄 제거: \n\n$...$\n\n → \n$...$\n
      text = text.replace(/\n\n(\$[^$\n]+?\$)\n\n/g, '\n$1\n');

      // 헤더 주변 빈 줄 정리: \n\n## ...\n\n → \n\n## ...\n
      text = text.replace(/\n\n(#{1,6}\s[^\n]+)\n\n/g, '\n\n$1\n');

      // Trim leading/trailing whitespace but keep internal structure
      text = text.trim();

      console.log('[convertHtmlToFormattedText] After cleanup:', text.substring(0, 300));

      return text;
    }

    // Convert HTML table to Markdown table
    function convertHTMLTableToMarkdown(html) {
      console.log('[convertHTMLTableToMarkdown] Converting HTML tables to markdown...');

      // Create a temporary div to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // Find all tables
      const tables = tempDiv.querySelectorAll('table');

      if (tables.length === 0) {
        console.log('[convertHTMLTableToMarkdown] No tables found');
        return html;
      }

      console.log(`[convertHTMLTableToMarkdown] Found ${tables.length} table(s)`);

      // Convert each table to markdown
      tables.forEach((table, tableIndex) => {
        console.log(`[convertHTMLTableToMarkdown] Processing table ${tableIndex + 1}...`);

        const rows = [];
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        // Process header rows
        if (thead) {
          const headerRows = thead.querySelectorAll('tr');
          headerRows.forEach((tr) => {
            const cells = tr.querySelectorAll('th, td');
            const cellTexts = Array.from(cells).map(cell => {
              // Get text content, handling nested elements
              let text = cell.textContent.trim();
              // Check if cell contains LaTeX formula (within <span>$...$</span>)
              const spanWithFormula = cell.querySelector('span');
              if (spanWithFormula && spanWithFormula.textContent.includes('$')) {
                text = spanWithFormula.textContent.trim();
              }
              return text;
            });
            rows.push('| ' + cellTexts.join(' | ') + ' |');
          });

          // Add separator row
          if (rows.length > 0) {
            const firstRow = rows[0];
            const columnCount = (firstRow.match(/\|/g) || []).length - 1;
            const separator = '|' + ' --- |'.repeat(columnCount);
            rows.push(separator);
          }
        }

        // Process body rows
        if (tbody) {
          const bodyRows = tbody.querySelectorAll('tr');
          bodyRows.forEach((tr) => {
            const cells = tr.querySelectorAll('th, td');
            const cellTexts = Array.from(cells).map(cell => {
              // Get text content, handling nested elements
              let text = cell.textContent.trim();
              // Check if cell contains LaTeX formula (within <span>$...$</span>)
              const spanWithFormula = cell.querySelector('span');
              if (spanWithFormula && spanWithFormula.textContent.includes('$')) {
                text = spanWithFormula.textContent.trim();
              }
              return text;
            });
            rows.push('| ' + cellTexts.join(' | ') + ' |');
          });
        }

        // Create markdown table
        const markdownTable = rows.join('\n');
        console.log(`[convertHTMLTableToMarkdown] Markdown table ${tableIndex + 1}:\n${markdownTable.substring(0, 300)}...`);

        // Replace the HTML table with markdown table
        table.outerHTML = markdownTable;
      });

      // Return the updated HTML with markdown tables
      const result = tempDiv.innerHTML;
      console.log('[convertHTMLTableToMarkdown] Conversion complete');
      return result;
    }


    // Q&A HTML에서 이미지 경로 추출 함수
    function extractQAImagePaths(contentDiv) {
      const paths = [];
      if (!contentDiv) return paths;

      // 1. img 태그에서 src 추출
      const images = contentDiv.querySelectorAll('img');
      images.forEach(img => {
        const src = img.getAttribute('src');
        if (src && src.includes('_qa/')) {
          const match = src.match(/([^\/]+_qa\/[^"'\s\)]+)/);
          if (match) paths.push(match[1]);
        }
      });

      // 2. data-image-src 속성에서 추출
      const aiImages = contentDiv.querySelectorAll('[data-image-src]');
      aiImages.forEach(el => {
        const src = el.getAttribute('data-image-src');
        if (src && src.includes('_qa/')) {
          const match = src.match(/([^\/]+_qa\/[^"'\s\)]+)/);
          if (match) paths.push(match[1]);
        }
      });

      // 중복 제거
      return [...new Set(paths)];
    }

    // Q&A 내용을 선택된 노드에 복사 (이미지 포함)
    async function copyQAToNode(contentText, contentDiv) {
      console.log('[copyQAToNode] Called');

      // 1. 선택된 노드 확인
      const nodeId = window.MyMind3?.MindMapData?.currentEditingNodeId || window.selectedNodeId;
      if (!nodeId) {
        console.log('[copyQAToNode] No node selected, copying to editor only');
        showToast(t('appNoNodeSelected', '노드가 선택되지 않았습니다. 에디터에만 복사됩니다.'), 'warning');
        copyToEditor(contentText);
        return;
      }

      // 2. 폴더명 가져오기
      const folderName = window.MyMind3?.currentFolder || localStorage.getItem('currentFolder') || 'untitled';
      console.log('[copyQAToNode] nodeId:', nodeId, 'folder:', folderName);

      // 3. Q&A HTML에서 이미지 경로 추출
      const qaPaths = extractQAImagePaths(contentDiv);
      console.log('[copyQAToNode] Extracted QA image paths:', qaPaths);

      // 4. 이미지가 있는 경우: 이미지만 복사 (텍스트 제외)
      //    이미지가 없는 경우: 전체 내용 복사
      let textToCopy = contentText;
      if (qaPaths.length > 0) {
        // 마크다운에서 이미지 태그만 추출 (![alt](path) 형식)
        const imageMarkdownMatches = contentText.match(/!\[[^\]]*\]\([^)]+\)/g);
        if (imageMarkdownMatches && imageMarkdownMatches.length > 0) {
          textToCopy = imageMarkdownMatches.join('\n\n');
          console.log('[copyQAToNode] Copying images only:', textToCopy);
        } else {
          // 마크다운 형식이 아닌 경우, 추출한 경로로 마크다운 이미지 생성
          const imageMarkdowns = qaPaths.map(function(qaPath, idx) {
            return '![Image ' + (idx + 1) + '](' + qaPath + ')';
          });
          textToCopy = imageMarkdowns.join('\n\n');
          console.log('[copyQAToNode] Generated markdown from paths:', textToCopy);
        }
      }
      copyToEditor(textToCopy);

      // 5. 이미지가 있으면 /api/savenode 호출하여 이미지 복사
      if (qaPaths.length > 0) {
        try {
          const toastEditor = window.MyMind3Editor?.editor;
          if (!toastEditor) {
            console.warn('[copyQAToNode] No editor found');
            return;
          }

          // 원본 HTML(이미지 경로 포함)을 서버에 전송하여 이미지 복사 처리
          // 서버에서 _qa/ 패턴을 찾아 이미지를 복사하고 경로를 변환함
          const editorHtml = toastEditor.getHTML();  // HTML with image src attributes
          console.log('[copyQAToNode] Sending editor HTML to server, length:', editorHtml.length);

          // 현재 노드 정보 가져오기
          const currentNode = window.MyMind3?.MindMapData?.findNodeById(nodeId);

          const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch('/api/savenode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...csrfHeaders },
            body: JSON.stringify({
              folder: folderName,
              nodeId: currentNode?.nodeId || nodeId,
              content: editorHtml,  // 원본 HTML (이미지 src 포함) - 서버는 'content' 파라미터를 기대함
              nodeName: currentNode?.title || ''  // 서버에서 title[nodeId].html 파일명에 사용
            })
          });

          if (response.ok) {
            const data = await response.json();
            console.log('[copyQAToNode] Images copied successfully, basePath:', data.basePath);

            // 에디터의 이미지 경로도 업데이트 (_qa → 절대 경로로 변환)
            let updatedHtml = toastEditor.getHTML();
            const basePath = data.basePath || '';  // 서버에서 받은 절대 경로 기본값
            const imgFolder = data.nodeImageFolder || nodeId;  // 서버가 반환한 실제 이미지 폴더명
            qaPaths.forEach(qaPath => {
              const fileName = qaPath.split('/').pop();
              const nodeImagePath = `${basePath}${imgFolder}/${fileName}`;  // 절대 경로로 생성
              updatedHtml = updatedHtml.replace(new RegExp(qaPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), nodeImagePath);
            });
            toastEditor.setHTML(updatedHtml);

            showToast('Q&A 내용과 이미지가 노드에 복사되었습니다.', 'success');
          } else {
            console.warn('[copyQAToNode] Failed to copy images:', response.status);
            showToast('내용은 복사되었지만 이미지 복사에 실패했습니다.', 'warning');
          }
        } catch (error) {
          console.error('[copyQAToNode] Error copying images:', error);
          showToast('내용은 복사되었지만 이미지 복사 중 오류가 발생했습니다.', 'warning');
        }
      } else {
        showToast('Q&A 내용이 노드에 복사되었습니다.', 'success');
      }
    }

    // Copy content to editor function
    function copyToEditor(text) {
      console.log('[copyToEditor] Called with text length:', text?.length);
      console.log('[copyToEditor] window.selectedNodeId:', window.selectedNodeId);
      console.log('[copyToEditor] window.MyMind3Editor:', window.MyMind3Editor);
      console.log('[copyToEditor] window.MyMind3Editor?.editor:', window.MyMind3Editor?.editor);

      if (!text || typeof text !== 'string') {
        console.error('Invalid text to copy:', text);
        return;
      }

      // Get the active editor (MyMind3Editor)
      const toastEditor = window.MyMind3Editor?.editor;
      console.log('[copyToEditor] toastEditor:', toastEditor);
      console.log('[copyToEditor] toastEditor?.setMarkdown:', typeof toastEditor?.setMarkdown);

      // Check if MyMind3Editor is available
      if (toastEditor && typeof toastEditor.setMarkdown === 'function') {
        // Toast UI Editor is active
        try {
          console.log('[copyToEditor] Copying to MyMind3Editor...');

          // ENHANCED: HTML 요소가 포함되어 있으면 완전한 마크다운 변환 수행
          if (text.includes('<')) {
            console.log('[copyToEditor] HTML 태그 감지, 완전한 마크다운 변환 시작...');
            console.log('[copyToEditor] 변환 전 HTML 길이:', text.length);
            console.log('[copyToEditor] 변환 전 샘플 (첫 200자):', text.substring(0, 200));

            if (typeof window.MyMind3Editor?.htmlToMarkdown === 'function') {
              text = window.MyMind3Editor.htmlToMarkdown(text);
              console.log('[copyToEditor] 완전한 HTML→마크다운 변환 완료');
              console.log('[copyToEditor] 변환 후 마크다운 길이:', text.length);
              console.log('[copyToEditor] 변환 후 샘플 (첫 200자):', text.substring(0, 200));
            } else {
              console.warn('[copyToEditor] htmlToMarkdown 함수를 찾을 수 없음');
            }
          } else {
            console.log('[copyToEditor] HTML 태그가 없는 순수 텍스트로 판단');
          }

          // 1. 현재 내용 확인
          const currentMarkdown = toastEditor.getMarkdown();
          const hasContent = currentMarkdown.trim();

          // 2. 먼저 HTML에서 빈 <p></p> 태그를 제거한 후 마크다운으로 변환
          let cleanedText = text;

          // 임시 DOM 요소를 생성해서 <p></p> 태그 제거
          if (text.includes('<p>') || text.includes('<P>')) {
            console.log('[copyToEditor] HTML에서 빈 <p></p> 태그 제거 중...');
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = cleanedText;

            // 빈 p 태그들을 모두 찾아서 제거
            const emptyPTags = tempDiv.querySelectorAll('p');
            let removedCount = 0;

            emptyPTags.forEach(pTag => {
              const content = pTag.innerHTML.trim();
              // 완전히 빈 p 태그이거나 &nbsp;, <br> 같은 것만 있는 경우
              if (content === '' || content === '&nbsp;' || content === '<br>' || content === '<br/>') {
                console.log('[copyToEditor] 빈 <p> 태그 제거:', pTag.outerHTML);
                pTag.remove();
                removedCount++;
              }
            });

            cleanedText = tempDiv.innerHTML;
            console.log(`[copyToEditor] ${removedCount}개의 빈 <p> 태그 제거 완료`);
          }

          // 3. 현재 탭에 따라 커서 위치에 삽입 또는 끝에 추가
          const currentTab = window.MyMind3Editor?.currentTab;
          console.log('[copyToEditor] Current tab:', currentTab);

          if (currentTab === 'write') {
            // 에디터 모드: insertText() API로 커서 위치에 삽입 시도
            try {
              // 에디터에 포커스가 있는지 확인
              const editorEl = document.querySelector('.toastui-editor-md-editor .ProseMirror');
              const hasFocus = editorEl && document.activeElement === editorEl;

              if (hasFocus) {
                // 커서가 에디터 내에 있으면 insertText 사용
                toastEditor.insertText('\n\n' + cleanedText.trim() + '\n\n');
                console.log('Content inserted at cursor position (write mode)');
              } else {
                // 커서가 없으면 끝에 추가
                let newMarkdown;
                if (hasContent) {
                  newMarkdown = currentMarkdown + '\n\n' + cleanedText.trim();
                } else {
                  newMarkdown = cleanedText.trim();
                }
                toastEditor.setMarkdown(newMarkdown);
                console.log('Content appended to end (write mode, no cursor focus)');
              }
            } catch (e) {
              console.warn('[copyToEditor] insertText failed, falling back to setMarkdown:', e);
              let newMarkdown;
              if (hasContent) {
                newMarkdown = currentMarkdown + '\n\n' + cleanedText.trim();
              } else {
                newMarkdown = cleanedText.trim();
              }
              toastEditor.setMarkdown(newMarkdown);
            }
          } else if (currentTab === 'preview') {
            // 프리뷰 모드: 커서 위치에 삽입
            const previewCursorPos = window.MyMind3Editor?.previewCursorPosition;

            // NEW: 이미지 마크다운인 경우 정확한 위치에 삽입
            const isImageMarkdown = /^\!\[.*?\]\(.*?\)$/.test(cleanedText.trim());

            if (isImageMarkdown && typeof window.MyMind3Editor?.insertImageAtPreviewCursor === 'function') {
              // 이미지 마크다운: 정확한 커서 위치(블록 끝)에 삽입
              console.log('[copyToEditor] Image markdown detected, using insertImageAtPreviewCursor');
              window.MyMind3Editor.insertImageAtPreviewCursor(toastEditor, cleanedText.trim());
              console.log('Image inserted at preview cursor position (accurate)');
            } else if (previewCursorPos && previewCursorPos.markdownLine > 0) {
              // 프리뷰 커서 위치가 있으면 해당 위치에 삽입
              window.MyMind3Editor.insertAtPreviewCursor(toastEditor, cleanedText.trim());
              console.log('Content inserted at preview cursor position');
            } else {
              // 커서 위치가 없으면 끝에 추가
              let newMarkdown;
              if (hasContent) {
                newMarkdown = currentMarkdown + '\n\n' + cleanedText.trim();
              } else {
                newMarkdown = cleanedText.trim();
              }
              toastEditor.setMarkdown(newMarkdown);
              console.log('Content appended to end (preview mode, no cursor)');
            }

            // 프리뷰 새로고침
            setTimeout(() => {
              if (typeof window.MyMind3Editor?.refreshCustomPreview === 'function') {
                window.MyMind3Editor.refreshCustomPreview();
              }
            }, 50);
          } else {
            // 기본: 끝에 추가
            let newMarkdown;
            if (hasContent) {
              newMarkdown = currentMarkdown + '\n\n' + cleanedText.trim();
            } else {
              newMarkdown = cleanedText.trim();
            }
            toastEditor.setMarkdown(newMarkdown);
            console.log('Content copied to MyMind3Editor (default mode)');
          }

          // CRITICAL FIX: 수학 공식 기준으로 <P></P> 태그 완전 제거
          setTimeout(() => {
            const previewElement = document.querySelector('.toastui-editor-md-preview');
            if (previewElement) {
              let attempts = 0;
              const maxAttempts = 10; // 최대 10번 시도

              function removePTagsAroundMath() {
                attempts++;
                console.log(`[copyToEditor] <P></P> 태그 제거 시도 ${attempts}/${maxAttempts}`);

                const allPTags = previewElement.querySelectorAll('p');
                let removedCount = 0;

                allPTags.forEach(pTag => {
                  const content = pTag.innerHTML.trim();

                  // 완전히 빈 <p> 태그 제거
                  if (content === '') {
                    console.log('[copyToEditor] 빈 <p> 태그 제거:', pTag.outerHTML);
                    pTag.remove();
                    removedCount++;
                    return;
                  }

                  // 수학 공식 주변의 빈 <p> 태그 확인
                  const prevSibling = pTag.previousElementSibling;
                  const nextSibling = pTag.nextElementSibling;

                  // 앞 뒤에 수학 공식(.katex)이 있고 자신은 빈 태그인 경우
                  if (content === '' &&
                    ((prevSibling && prevSibling.querySelector('.katex')) ||
                      (nextSibling && nextSibling.querySelector('.katex')))) {
                    console.log('[copyToEditor] 수학 공식 주변 빈 <p> 태그 제거:', pTag.outerHTML);
                    pTag.remove();
                    removedCount++;
                  }
                });

                console.log(`[copyToEditor] 이번 시도에서 ${removedCount}개 <p> 태그 제거됨`);

                // 아직 빈 <p> 태그가 남아있고 최대 시도 횟수에 도달하지 않았으면 재시도
                const remainingEmptyPTags = previewElement.querySelectorAll('p');
                const stillHasEmptyPTags = Array.from(remainingEmptyPTags).some(p => p.innerHTML.trim() === '');

                if (stillHasEmptyPTags && attempts < maxAttempts) {
                  console.log('[copyToEditor] 아직 빈 <p> 태그가 남아있음, 0.2초 후 재시도...');
                  setTimeout(removePTagsAroundMath, 200);
                } else {
                  const finalEmptyCount = Array.from(previewElement.querySelectorAll('p')).filter(p => p.innerHTML.trim() === '').length;
                  console.log(`[copyToEditor] <P></P> 태그 제거 완료! 남은 빈 태그: ${finalEmptyCount}개`);
                }
              }

              // 첫 번째 시도 시작
              removePTagsAroundMath();
            }
          }, 100);


          // 3. KaTeX 재렌더링 트리거
          const renderKaTeX = () => {
            // test3/editor.html 패턴의 renderAll 함수 호출
            const previewEl = document.querySelector('.toastui-editor-md-preview');
            if (previewEl && window.katex) {
              console.log('[copyToEditor] Triggering KaTeX rendering');

              const elements = previewEl.querySelectorAll('p, div, li, td, th, h1, h2, h3, h4, h5, h6');
              elements.forEach(el => {
                el.classList.remove('katex-rendered');

                const text = el.innerHTML;
                if (text && text.includes('$')) {
                  try {
                    let processed = text.replace(/&lt;br\s*\/?&gt;/gi, '');
                    processed = processed.replace(/<br\s*\/?>/gi, '');

                    // 블록 수식
                    processed = processed.replace(/\$\$([^$]+?)\$\$/g, (match, latex) => {
                      try {
                        return window.katex.renderToString(latex.trim(), {
                          displayMode: true,
                          throwOnError: false
                        });
                      } catch (e) {
                        return match;
                      }
                    });

                    // 인라인 수식
                    processed = processed.replace(/\$([^$\n]+?)\$/g, (match, latex) => {
                      try {
                        return window.katex.renderToString(latex.trim(), {
                          displayMode: false,
                          throwOnError: false
                        });
                      } catch (e) {
                        return match;
                      }
                    });

                    if (processed !== text) {
                      el.innerHTML = processed;
                      el.classList.add('katex-rendered');
                    }
                  } catch (e) {
                    console.error('[copyToEditor] KaTeX error:', e);
                  }
                }
              });

              console.log('[copyToEditor] KaTeX rendering complete');
            }
          };

          // 4. 프리뷰 탭이 활성화된 경우 프리뷰 새로고침
          if (window.MyMind3Editor?.currentTab === 'preview' &&
            typeof window.MyMind3Editor?.refreshCustomPreview === 'function') {
            console.log('[copyToEditor] Refreshing preview after content copy...');
            setTimeout(() => {
              window.MyMind3Editor.refreshCustomPreview();
              // 프리뷰 새로고침 후 KaTeX 렌더링 (표 밖의 수식 렌더링)
              setTimeout(renderKaTeX, 50);
              console.log('[copyToEditor] Preview refreshed');
            }, 200);
            setTimeout(() => {
              window.MyMind3Editor.refreshCustomPreview();
              // 프리뷰 새로고침 후 KaTeX 렌더링 (재시도)
              setTimeout(renderKaTeX, 50);
            }, 700);
            setTimeout(() => {
              window.MyMind3Editor.refreshCustomPreview();
              // 프리뷰 새로고침 후 KaTeX 렌더링 (최종)
              setTimeout(renderKaTeX, 50);
            }, 1200);
          } else {
            // 5. 프리뷰 탭이 비활성화된 경우에도 KaTeX 렌더링 시도
            setTimeout(renderKaTeX, 150);
            setTimeout(renderKaTeX, 600);
            setTimeout(renderKaTeX, 1100);
          }

          return;
        } catch (err) {
          console.warn('MyMind3Editor failed:', err);
        }
      }

      // Fallback: 에디터가 없으면 알림
      console.warn('[copyToEditor] No editor available');
      alert(window.i18n?.alertOpenEditor || '에디터를 먼저 열어주세요. (노드를 선택하세요)');
    }

    // Convert markdown to HTML (마크다운 → HTML 완전 변환)
    function markdownToHTML(markdown) {
      console.log('[markdownToHTML] Input:', markdown);

      const lines = markdown.split('\n');
      let result = [];
      let inTable = false;
      let tableLines = [];
      let inList = false;
      let listItems = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // 빈 줄 처리
        if (!trimmed) {
          // 리스트 종료
          if (inList) {
            result.push('<ul>');
            listItems.forEach(item => result.push(`<li>${item}</li>`));
            result.push('</ul>');
            listItems = [];
            inList = false;
          }
          // 테이블 종료
          if (inTable && tableLines.length > 0) {
            result.push(convertMarkdownTableToHTML(tableLines));
            tableLines = [];
            inTable = false;
          }
          // 빈 줄은 무시 (단락 간격은 CSS로 처리)
          continue;
        }

        // 테이블 행 감지
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          // 리스트가 열려있으면 먼저 닫기
          if (inList) {
            result.push('<ul>');
            listItems.forEach(item => result.push(`<li>${item}</li>`));
            result.push('</ul>');
            listItems = [];
            inList = false;
          }

          if (!inTable) {
            inTable = true;
            tableLines = [];
          }
          tableLines.push(trimmed);
          continue;
        }

        // 테이블이 열려있으면 닫기
        if (inTable && tableLines.length > 0) {
          result.push(convertMarkdownTableToHTML(tableLines));
          tableLines = [];
          inTable = false;
        }

        // 헤더 처리 (## ... 또는 ### ...)
        if (trimmed.startsWith('##')) {
          // 리스트가 열려있으면 먼저 닫기
          if (inList) {
            result.push('<ul>');
            listItems.forEach(item => result.push(`<li>${item}</li>`));
            result.push('</ul>');
            listItems = [];
            inList = false;
          }

          const level = (trimmed.match(/^#+/) || [''])[0].length;
          const text = trimmed.substring(level).trim();
          result.push(`<h${level}>${text}</h${level}>`);
          continue;
        }

        // 리스트 항목 처리 (- ... 또는 * ...)
        if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const text = trimmed.substring(1).trim();
          listItems.push(text);
          inList = true;
          continue;
        }

        // 리스트가 열려있으면 닫기
        if (inList) {
          result.push('<ul>');
          listItems.forEach(item => result.push(`<li>${item}</li>`));
          result.push('</ul>');
          listItems = [];
          inList = false;
        }

        // 일반 텍스트 단락
        result.push(`<p>${trimmed}</p>`);
      }

      // 마지막에 열려있는 리스트 닫기
      if (inList && listItems.length > 0) {
        result.push('<ul>');
        listItems.forEach(item => result.push(`<li>${item}</li>`));
        result.push('</ul>');
      }

      // 마지막에 열려있는 테이블 닫기
      if (inTable && tableLines.length > 0) {
        result.push(convertMarkdownTableToHTML(tableLines));
      }

      const html = result.join('\n');
      console.log('[markdownToHTML] Output:', html);
      return html;
    }

    // 마크다운 테이블 라인들을 HTML 테이블로 변환
    function convertMarkdownTableToHTML(tableLines) {
      if (tableLines.length < 2) return tableLines.join('\n');

      // 첫 번째 줄: 헤더
      const headerCells = tableLines[0].split('|').map(c => c.trim()).filter(c => c);

      // 두 번째 줄: 구분선 (| --- | --- |)
      const isSeparator = tableLines[1].includes('---') || tableLines[1].includes('—');

      if (!isSeparator) {
        // 구분선이 없으면 일반 텍스트로 반환
        return tableLines.join('\n');
      }

      // 나머지 줄: 데이터 행
      const dataRows = tableLines.slice(2).map(line => {
        return line.split('|').map(c => c.trim()).filter(c => c);
      });

      // HTML 테이블 생성
      let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 10px 0; border: 1px solid #ddd;">\n';

      // 헤더 생성
      tableHTML += '  <thead>\n    <tr>';
      headerCells.forEach(header => {
        tableHTML += `<th style="border: 1px solid #ddd; padding: 8px; background-color: #f2f2f2; text-align: left;">${header}</th>`;
      });
      tableHTML += '</tr>\n  </thead>\n';

      // 바디 생성
      if (dataRows.length > 0) {
        tableHTML += '  <tbody>\n';
        dataRows.forEach(row => {
          tableHTML += '    <tr>';
          row.forEach(cell => {
            tableHTML += `<td style="border: 1px solid #ddd; padding: 8px;">${cell}</td>`;
          });
          tableHTML += '</tr>\n';
        });
        tableHTML += '  </tbody>\n';
      }

      tableHTML += '</table>';

      console.log('[convertMarkdownTableToHTML] Generated:', tableHTML);
      return tableHTML;
    }

    // AI 이미지 복사 버튼 이벤트 리스너 연결 함수 (전역 정의, 항상 사용 가능)
    window.attachImageCopyListeners = function() {
      const aiImageCopyBtns = document.querySelectorAll('.ai-image-copy-btn');
      aiImageCopyBtns.forEach(btn => {
        if (btn.getAttribute('data-listener-attached') === 'true') {
          return;
        }
        btn.setAttribute('data-listener-attached', 'true');

        btn.addEventListener('click', async function() {
          const imageSrc = this.getAttribute('data-image-src');
          if (!imageSrc) {
            console.error('[AI Image Copy] No image source found');
            return;
          }

          // Base64 데이터를 Blob으로 변환하는 헬퍼 함수 (CSP 우회)
          function base64ToBlob(dataUrl) {
            const parts = dataUrl.split(',');
            const mime = parts[0].match(/:(.*?);/)[1];
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], { type: mime });
          }

          // 현재 폴더와 노드 정보 가져오기
          const currentFolder = window.currentFolder || window.currentQAFolder || '';
          const editingNodeId = window.selectedNodeId || window.MyMind3?.MindMapData?.currentEditingNodeId || '';
          const currentNode = window.MyMind3?.MindMapData?.findNodeById(editingNodeId);
          const currentNodeId = currentNode?.nodeId || editingNodeId;

          if (!currentFolder || !currentNodeId) {
            // 폴더/노드가 없으면 클립보드에만 복사
            try {
              // CSP 우회: fetch 대신 직접 Base64를 Blob으로 변환
              const blob = base64ToBlob(imageSrc);
              await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
              ]);

              // 시각적 피드백
              const originalHTML = this.innerHTML;
              this.innerHTML = mmIcon('check-circle', 14) + ' 클립보드 복사됨!';
              this.style.background = '#17a2b8';
              setTimeout(() => {
                this.innerHTML = originalHTML;
                this.style.background = '#28a745';
              }, 2000);
            } catch (e) {
              console.error('[AI Image Copy] Clipboard copy failed:', e);
              alert(window.i18n?.alertImageCopyFailed || '이미지 복사에 실패했습니다.');
            }
            return;
          }

          // 서버에 이미지 저장
          try {
            this.textContent = t('appSaving', '저장 중...');
            this.disabled = true;

            // 이미 서버에 저장된 이미지인 경우 (URL 경로) - nodeId 폴더로 복사 후 삽입
            if (imageSrc.startsWith('/') || imageSrc.startsWith('http')) {
              // 서버에 이미지 복사 요청 (ai-images → nodeId 폴더)
              let finalPath = imageSrc;
              try {
                const storageToken = await window.MyMind3?.StorageAuth?.getToken();
                const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
                const copyRes = await fetch('/api/files/copy-image-to-node', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Storage-Token': storageToken,
                    ...csrfHeaders
                  },
                  body: JSON.stringify({ imageUrl: imageSrc, folder: currentFolder, nodeId: currentNodeId })
                });
                const copyResult = await copyRes.json();
                if (copyResult.success) {
                  finalPath = copyResult.data.webPath;
                  console.log(`[AI Image Copy] 이미지 복사 완료: ${imageSrc} → ${finalPath}`);
                } else {
                  console.warn(`[AI Image Copy] 복사 실패, 원본 경로 사용: ${copyResult.error}`);
                }
              } catch (copyErr) {
                console.warn('[AI Image Copy] 복사 요청 실패, 원본 경로 사용:', copyErr);
              }

              const markdownImage = `![AI 생성 이미지](${finalPath})`;
              copyToEditor(markdownImage);

              // 자동으로 노드에 저장
              setTimeout(async () => {
                const currentNodeIdForSave = window.MyMind3?.MindMapData?.currentEditingNodeId;
                if (currentNodeIdForSave && window.MyMind3Editor?.editor) {
                  const content = window.MyMind3Editor.editor.getMarkdown();
                  const mindMapData = window.MyMind3.MindMapData.mindMapData;
                  const _root = mindMapData && mindMapData.length > 0 ? mindMapData[0] : null;
                  const folderName = window.MyMind3?.currentFolder
                    || localStorage.getItem('currentFolder')
                    || (_root?.path ? _root.path.replace(/\.html$/, '') : null)
                    || (_root?.title || 'Untitled');
                  window.MyMind3.MindMapData.saveNodeContent(currentNodeIdForSave, content);

                  // 현재 노드 정보 가져오기
                  const saveNode = window.MyMind3?.MindMapData?.findNodeById(currentNodeIdForSave);

                  try {
                    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
                    await fetch('/api/savenode', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
                      credentials: 'include',
                      body: JSON.stringify({ folderName, nodeId: saveNode?.nodeId || currentNodeIdForSave, content, nodeName: saveNode?.title || '' })
                    });
                    console.log('[AI Image Copy] Auto-saved existing image to node file');
                  } catch (saveErr) {
                    console.error('[AI Image Copy] Auto-save failed:', saveErr);
                  }
                }
              }, 500);

              // 클립보드에 경로 복사
              try { await navigator.clipboard.writeText(finalPath); } catch (clipErr) { console.warn('[AI Image Copy] Clipboard copy failed:', clipErr); }

              // 시각적 피드백
              this.innerHTML = mmIcon('check-circle', 14) + ' 에디터에 복사됨!';
              this.style.background = '#17a2b8';
              setTimeout(() => {
                this.innerHTML = mmIcon('clipboard', 14) + ' 이미지 복사';
                this.style.background = '#28a745';
                this.disabled = false;
              }, 2000);
              console.log(`[AI Image Copy] Inserted image: ${finalPath}`);
              return;
            }

            // 새로운 base64 이미지인 경우 - API 호출로 서버에 저장
            // 인증 토큰 가져오기
            const storageToken = await window.MyMind3?.StorageAuth?.getToken();
            if (!storageToken) {
              throw new Error('인증이 필요합니다. 로그인 후 다시 시도하세요.');
            }

            const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch('/api/files/save-ai-image', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Storage-Token': storageToken
              , ...csrfHeaders },
              body: JSON.stringify({
                imageData: imageSrc,
                folder: currentFolder,
                nodeId: currentNodeId,
                nodeName: currentNode?.title || ''
              })
            });

            const result = await response.json();

            if (result.success) {
              // 프리뷰에서 이미지를 볼 수 있도록 마크다운 이미지 문법으로 삽입
              // 서버에서 반환한 webPath 사용 (프리뷰에서 바로 접근 가능한 경로)
              const imagePath = result.data.webPath || `/${encodeURIComponent(currentFolder)}/${currentNodeId}/${result.data.fileName}`;
              const markdownImage = `![AI 생성 이미지](${imagePath})`;
              copyToEditor(markdownImage);

              // 자동으로 1.html에 저장 (에디터 업데이트 후)
              setTimeout(async () => {
                const currentNodeIdForSave = window.MyMind3?.MindMapData?.currentEditingNodeId;
                if (currentNodeIdForSave && window.MyMind3Editor?.editor) {
                  const content = window.MyMind3Editor.editor.getMarkdown();
                  const mindMapData = window.MyMind3.MindMapData.mindMapData;
                  const _root2 = mindMapData && mindMapData.length > 0 ? mindMapData[0] : null;
                  const folderName = window.MyMind3?.currentFolder
                    || localStorage.getItem('currentFolder')
                    || (_root2?.path ? _root2.path.replace(/\.html$/, '') : null)
                    || (_root2?.title || 'Untitled');

                  // Save to memory
                  window.MyMind3.MindMapData.saveNodeContent(currentNodeIdForSave, content);

                  // Save to file
                  try {
                    // 현재 노드 정보 가져오기
                    const saveNode = window.MyMind3?.MindMapData?.findNodeById(currentNodeIdForSave);

                    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
                    await fetch('/api/savenode', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
                      credentials: 'include',
                      body: JSON.stringify({
                        folderName: folderName,
                        nodeId: saveNode?.nodeId || currentNodeIdForSave,
                        content: content,
                        nodeName: saveNode?.title || ''  // 서버에서 title[nodeId].html 파일명에 사용
                      })
                    });
                    console.log('[AI Image Copy] Auto-saved to node file');
                  } catch (saveErr) {
                    console.error('[AI Image Copy] Auto-save failed:', saveErr);
                  }
                }
              }, 500); // 에디터 업데이트 후 저장

              // 클립보드에는 이미지 경로 복사
              try {
                await navigator.clipboard.writeText(imagePath);
              } catch (clipErr) {
                console.warn('[AI Image Copy] Clipboard copy failed:', clipErr);
              }

              // 시각적 피드백
              this.innerHTML = mmIcon('check-circle', 14) + ' 에디터에 복사됨!';
              this.style.background = '#17a2b8';
              setTimeout(() => {
                this.innerHTML = mmIcon('clipboard', 14) + ' 이미지 복사';
                this.style.background = '#28a745';
                this.disabled = false;
              }, 2000);

              console.log(`[AI Image Copy] Saved: ${result.data.fullPath}, Path: ${imagePath}`);
            } else {
              throw new Error(result.error || '저장 실패');
            }
          } catch (e) {
            console.error('[AI Image Copy] Save failed:', e);
            this.innerHTML = mmIcon('x-circle', 14) + ' 저장 실패';
            this.style.background = '#dc3545';
            setTimeout(() => {
              this.innerHTML = mmIcon('clipboard', 14) + ' 이미지 복사';
              this.style.background = '#28a745';
              this.disabled = false;
            }, 2000);
          }
        });
      });
    };

    // Attach event listeners to copy buttons in loaded Q&A HTML
    function attachQACopyListeners() {
      const llmResponse = document.getElementById('llmResponse');
      if (!llmResponse) {
        console.error('llmResponse element not found');
        return;
      }

      console.log('Attaching event listeners to Q&A copy buttons...');

      // Find all buttons with onclick attributes (from old qa.html files)
      const oldButtons = llmResponse.querySelectorAll('button[onclick*="copyToEditor"]');
      console.log(`Found ${oldButtons.length} old-style buttons with onclick attributes`);

      oldButtons.forEach(button => {
        // Skip if listener already attached
        if (button.hasAttribute('data-listener-attached')) {
          return;
        }
        button.setAttribute('data-listener-attached', 'true');

        const onclickAttr = button.getAttribute('onclick');

        // Remove onclick attribute to avoid CSP violation
        button.removeAttribute('onclick');

        // Determine if it's a full copy or partial copy button
        if (onclickAttr.includes('nextElementSibling')) {
          // Full copy button (in header)
          button.addEventListener('click', async function () {
            const contentDiv = this.parentElement.nextElementSibling;
            if (contentDiv) {
              // CRITICAL FIX: data-original-content에서 마크다운 원본 추출
              let contentText;
              const originalContent = contentDiv.getAttribute('data-original-content');

              if (originalContent) {
                try {
                  contentText = decodeURIComponent(originalContent);
                  console.log('[attachQACopyListeners] Using markdown from data-original-content (old-style)');
                } catch (e) {
                  console.error('[attachQACopyListeners] Failed to decode data-original-content (old-style):', e);
                  contentText = convertHtmlToFormattedText(contentDiv);
                }
              } else {
                contentText = convertHtmlToFormattedText(contentDiv);
                console.log('[attachQACopyListeners] Using converted HTML (old-style)');
              }

              await copyQAToNode(contentText, contentDiv);
            }
          });
        } else if (onclickAttr.includes('previousElementSibling')) {
          // Partial copy button (at bottom)
          button.addEventListener('click', async function () {
            const contentDiv = this.parentElement.previousElementSibling;
            if (contentDiv) {
              // CRITICAL FIX: data-original-content에서 마크다운 원본 추출
              let contentText;
              const originalContent = contentDiv.getAttribute('data-original-content');

              if (originalContent) {
                try {
                  contentText = decodeURIComponent(originalContent);
                  console.log('[attachQACopyListeners] Using markdown from data-original-content (old-style, copy btn)');
                } catch (e) {
                  console.error('[attachQACopyListeners] Failed to decode data-original-content (old-style, copy btn):', e);
                  contentText = convertHtmlToFormattedText(contentDiv);
                }
              } else {
                contentText = convertHtmlToFormattedText(contentDiv);
                console.log('[attachQACopyListeners] Using converted HTML (old-style, copy btn)');
              }

              await copyQAToNode(contentText, contentDiv);
            }
          });
        }
      });

      // Find all new-style buttons with class names (no onclick attributes)
      // Support both copy-full-btn and copy-markdown-btn for qa.html compatibility
      const fullCopyButtons = llmResponse.querySelectorAll('.copy-full-btn, .copy-markdown-btn');
      const copyButtons = llmResponse.querySelectorAll('.copy-btn');

      console.log(`Found ${fullCopyButtons.length} full copy buttons and ${copyButtons.length} copy buttons`);
      console.log('Full copy buttons:', Array.from(fullCopyButtons).map(btn => ({
        text: btn.textContent,
        hasListener: btn.hasAttribute('data-listener-attached'),
        parentTag: btn.parentElement?.tagName,
        nextSibling: btn.parentElement?.nextElementSibling?.tagName
      })));

      // Attach listeners to full copy buttons (in header)
      fullCopyButtons.forEach(button => {
        // Skip if listener already attached
        if (button.hasAttribute('data-listener-attached')) {
          return;
        }
        button.setAttribute('data-listener-attached', 'true');

        button.addEventListener('click', async function () {
          console.log('═══════════════════════════════════════════════════════');
          console.log('[Full Copy Button] BUTTON CLICKED');
          console.log('═══════════════════════════════════════════════════════');
          console.log('[Full Copy Button] Current timestamp:', new Date().toISOString());
          console.log('[Full Copy Button] Button text:', this.textContent);
          console.log('[Full Copy Button] Button classList:', this.classList);
          console.log('[Full Copy Button] this.parentElement:', this.parentElement);
          console.log('[Full Copy Button] this.parentElement.tagName:', this.parentElement?.tagName);
          console.log('[Full Copy Button] this.parentElement.innerHTML (first 200 chars):', this.parentElement?.innerHTML.substring(0, 200));

          // 노드 선택 상태 확인
          console.log('-----------------------------------------------------------');
          console.log('[Full Copy Button] NODE SELECTION STATE:');
          console.log('[Full Copy Button] window.selectedNodeId:', window.selectedNodeId);
          console.log('[Full Copy Button] window.MyMind3?.MindMapData?.currentEditingNodeId:', window.MyMind3?.MindMapData?.currentEditingNodeId);
          console.log('[Full Copy Button] window.MyMind3Editor:', window.MyMind3Editor ? 'EXISTS' : 'NULL');
          console.log('[Full Copy Button] window.MyMind3Editor?.editor:', window.MyMind3Editor?.editor ? 'EXISTS' : 'NULL');

          // Find the ai-content or message-content div
          // Try next sibling first (new AI responses), then previous sibling (qa.html)
          console.log('-----------------------------------------------------------');
          console.log('[Full Copy Button] SEARCHING FOR CONTENT DIV:');
          let contentDiv = this.parentElement.nextElementSibling;
          console.log('[Full Copy Button] First try - nextElementSibling:', contentDiv);
          console.log('[Full Copy Button] contentDiv?.tagName:', contentDiv?.tagName);
          console.log('[Full Copy Button] contentDiv?.classList:', contentDiv?.classList);
          console.log('[Full Copy Button] contentDiv?.className:', contentDiv?.className);

          if (!contentDiv || (!contentDiv.classList.contains('ai-content') && !contentDiv.classList.contains('message-content') && !contentDiv.classList.contains('answer-content'))) {
            console.log('[Full Copy Button] First try failed, trying previousElementSibling...');
            contentDiv = this.parentElement.previousElementSibling;
            console.log('[Full Copy Button] Second try - previousElementSibling:', contentDiv);
            console.log('[Full Copy Button] contentDiv?.tagName:', contentDiv?.tagName);
            console.log('[Full Copy Button] contentDiv?.classList:', contentDiv?.classList);
          }

          // Support both ai-content (new) and message-content (qa.html) classes
          if (contentDiv && (contentDiv.classList.contains('ai-content') || contentDiv.classList.contains('message-content') || contentDiv.classList.contains('answer-content'))) {
            console.log('-----------------------------------------------------------');
            console.log('[Full Copy Button] CONTENT DIV FOUND!');
            console.log('[Full Copy Button] contentDiv classes:', Array.from(contentDiv.classList));
            console.log('[Full Copy Button] contentDiv.innerHTML length:', contentDiv.innerHTML.length);
            console.log('[Full Copy Button] contentDiv.innerHTML (first 200 chars):', contentDiv.innerHTML.substring(0, 200));

            // CRITICAL FIX: data-original-content에서 마크다운 원본 추출
            let contentText;
            const originalContent = contentDiv.getAttribute('data-original-content');
            console.log('[Full Copy Button] data-original-content exists:', !!originalContent);
            console.log('[Full Copy Button] data-original-content length:', originalContent?.length);

            if (originalContent) {
              // URL 디코딩하여 마크다운 원본 사용
              try {
                contentText = decodeURIComponent(originalContent);
                console.log('[Full Copy Button] Decoded data-original-content successfully');
                console.log('[Full Copy Button] contentText length:', contentText.length);
                console.log('[Full Copy Button] contentText (first 200 chars):', contentText.substring(0, 200));
              } catch (e) {
                console.error('[Full Copy Button] Failed to decode data-original-content:', e);
                contentText = convertHtmlToFormattedText(contentDiv);
                console.log('[Full Copy Button] Using convertHtmlToFormattedText instead');
              }
            } else {
              // data-original-content가 없으면 HTML을 텍스트로 변환 (기존 방식)
              console.log('[Full Copy Button] No data-original-content, converting HTML to text...');
              contentText = convertHtmlToFormattedText(contentDiv);
              console.log('[Full Copy Button] Converted text length:', contentText.length);
              console.log('[Full Copy Button] Converted text (first 200 chars):', contentText.substring(0, 200));
            }

            console.log('-----------------------------------------------------------');
            console.log('[Full Copy Button] CALLING copyToEditor...');
            console.log('[Full Copy Button] About to copy text of length:', contentText.length);

            await copyQAToNode(contentText, contentDiv);

            console.log('[Full Copy Button] copyToEditor call completed');
            console.log('═══════════════════════════════════════════════════════');
          } else {
            console.log('-----------------------------------------------------------');
            console.error('[Full Copy Button] CONTENT DIV NOT FOUND!');
            console.error('[Full Copy Button] contentDiv:', contentDiv);
            console.error('[Full Copy Button] contentDiv?.classList:', contentDiv?.classList);
            console.error('[Full Copy Button] Parent element structure:');
            console.error('[Full Copy Button] this.parentElement:', this.parentElement);
            console.error('[Full Copy Button] this.parentElement.children:', this.parentElement?.children);
            console.log('═══════════════════════════════════════════════════════');
          }
        });
      });

      // Attach listeners to partial copy buttons (at bottom)
      copyButtons.forEach(button => {
        // Skip if listener already attached
        if (button.hasAttribute('data-listener-attached')) {
          console.log('[attachQACopyListeners] Skipping copy-btn - already has listener');
          return;
        }
        button.setAttribute('data-listener-attached', 'true');
        console.log('[attachQACopyListeners] Attaching listener to copy-btn');

        button.addEventListener('click', async function () {
          console.log('═══════════════════════════════════════════════════════');
          console.log('[Copy Button] COPY-BTN CLICKED (qa.html)');
          console.log('═══════════════════════════════════════════════════════');
          console.log('[Copy Button] this:', this);
          console.log('[Copy Button] this.parentElement:', this.parentElement);

          // Find the ai-content or message-content div
          // Try previous sibling first, then next sibling
          let contentDiv = this.parentElement.previousElementSibling;
          console.log('[Copy Button] First try - previousElementSibling:', contentDiv);
          console.log('[Copy Button] contentDiv?.classList:', contentDiv?.classList);

          if (!contentDiv || (!contentDiv.classList.contains('ai-content') && !contentDiv.classList.contains('message-content') && !contentDiv.classList.contains('answer-content'))) {
            console.log('[Copy Button] First try failed, trying nextElementSibling...');
            contentDiv = this.parentElement.nextElementSibling;
            console.log('[Copy Button] Second try - nextElementSibling:', contentDiv);
            console.log('[Copy Button] contentDiv?.classList:', contentDiv?.classList);
          }

          // Support both ai-content (new) and message-content (qa.html) classes
          if (contentDiv && (contentDiv.classList.contains('ai-content') || contentDiv.classList.contains('message-content') || contentDiv.classList.contains('answer-content'))) {
            console.log('[Copy Button] Content div found!');
            // CRITICAL FIX: data-original-content에서 마크다운 원본 추출
            let contentText;
            const originalContent = contentDiv.getAttribute('data-original-content');

            if (originalContent) {
              // URL 디코딩하여 마크다운 원본 사용
              try {
                contentText = decodeURIComponent(originalContent);
                console.log('[attachQACopyListeners] Using markdown from data-original-content (copy btn)');
              } catch (e) {
                console.error('[attachQACopyListeners] Failed to decode data-original-content (copy btn):', e);
                contentText = convertHtmlToFormattedText(contentDiv);
              }
            } else {
              // data-original-content가 없으면 HTML을 텍스트로 변환 (기존 방식)
              contentText = convertHtmlToFormattedText(contentDiv);
              console.log('[attachQACopyListeners] Using converted HTML (no data-original-content, copy btn)');
            }

            await copyQAToNode(contentText, contentDiv);
            console.log('Copy button clicked');
          } else {
            console.error('Could not find ai-content div for copy');
          }
        });
      });

      // Attach listeners to user question copy buttons
      const userQuestionButtons = llmResponse.querySelectorAll('.copy-user-question-btn');
      console.log(`Found ${userQuestionButtons.length} user question copy buttons`);

      userQuestionButtons.forEach(button => {
        // Skip if listener already attached
        if (button.hasAttribute('data-listener-attached')) {
          console.log('[attachQACopyListeners] Skipping copy-user-question-btn - already has listener');
          return;
        }
        button.setAttribute('data-listener-attached', 'true');
        console.log('[attachQACopyListeners] Attaching listener to copy-user-question-btn');

        button.addEventListener('click', async function () {
          console.log('═══════════════════════════════════════════════════════');
          console.log('[User Question Copy Button] CLICKED');
          console.log('═══════════════════════════════════════════════════════');

          // Find the user-question-content div
          // It should be a sibling (next to the button's parent div)
          const parentDiv = this.parentElement;
          const questionContent = parentDiv.nextElementSibling;

          console.log('[User Question Copy Button] parentDiv:', parentDiv);
          console.log('[User Question Copy Button] questionContent:', questionContent);
          console.log('[User Question Copy Button] questionContent?.classList:', questionContent?.classList);

          if (questionContent && questionContent.classList.contains('user-question-content')) {
            const questionText = questionContent.textContent.trim();
            console.log('[User Question Copy Button] Question text found, length:', questionText.length);
            console.log('[User Question Copy Button] Copying to editor...');
            copyToEditor(questionText);
            console.log('[User Question Copy Button] Copy completed');
          } else {
            console.error('[User Question Copy Button] user-question-content div not found!');
            console.error('[User Question Copy Button] parentDiv.children:', parentDiv?.children);
            console.error('[User Question Copy Button] parentDiv.parentElement.children:', parentDiv?.parentElement?.children);
          }

          console.log('═══════════════════════════════════════════════════════');
        });
      });

      // 초기 이벤트 리스너 연결 (전역 함수 호출)
      window.attachImageCopyListeners();

      // AI 이미지 다운로드 버튼 이벤트 리스너
      const aiImageDownloadBtns = document.querySelectorAll('.ai-image-download-btn');
      aiImageDownloadBtns.forEach(btn => {
        if (btn.getAttribute('data-listener-attached') === 'true') {
          return;
        }
        btn.setAttribute('data-listener-attached', 'true');

        btn.addEventListener('click', function() {
          const imageSrc = this.getAttribute('data-image-src');
          const filename = this.getAttribute('data-filename') || `ai-image-${Date.now()}.png`;

          if (!imageSrc) {
            console.error('[AI Image Download] No image source found');
            return;
          }

          try {
            // Base64 데이터를 Blob으로 변환
            const parts = imageSrc.split(',');
            const mime = parts[0].match(/:(.*?);/)[1];
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });

            // 다운로드 링크 생성
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // 시각적 피드백
            const originalHTML = this.innerHTML;
            this.innerHTML = mmIcon('check-circle', 14) + ' 다운로드 완료!';
            this.style.background = '#28a745';
            setTimeout(() => {
              this.innerHTML = originalHTML;
              this.style.background = '#17a2b8';
            }, 2000);

            console.log('[AI Image Download] Downloaded:', filename);
          } catch (e) {
            console.error('[AI Image Download] Download failed:', e);
            alert(window.i18n?.alertImageDownloadFailed || '이미지 다운로드에 실패했습니다.');
          }
        });
      });

      console.log('Event listeners attached successfully');
    }

    // Make it globally accessible
    window.attachQACopyListeners = attachQACopyListeners;

    function addMessageToDisplay(role, content, model = null, targetContainer = null, appendToDOM = true) {
      // targetContainer가 제공되면 해당 컨테이너에, 아니면 llmResponse에 추가
      // appendToDOM이 false면 DOM에 추가하지 않고 HTML만 반환 (저장용)
      const llmResponse = targetContainer || document.getElementById('llmResponse');
      if (!llmResponse && appendToDOM) return;

      const messageDiv = document.createElement('div');
      messageDiv.style.cssText = 'margin-bottom: 20px;';

      if (role === 'user') {
        messageDiv.style.cssText += ' padding: 15px; background-color: #e3f2fd; border: 1px solid #90caf9; border-radius: 8px;';

        // Header without copy button
        let headerHTML = '<div style="margin-bottom: 10px;">';
        headerHTML += '<strong style="color: #000000;">사용자:</strong>';
        headerHTML += '</div>';

        // 보안: DOMPurify로 사용자 입력 XSS 방지
        const sanitizedContent = typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(content) : content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const contentHTML = `<div class="user-question-content" style="color: #000000;">${sanitizedContent}</div>`;

        messageDiv.innerHTML = headerHTML + contentHTML;
      } else if (role === 'assistant') {
        messageDiv.style.cssText += ' padding: 15px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px;';

        // 현재 시간 정보 생성 (YYYY-MM-DD HH:MM:SS)
        const now = new Date();
        const timestamp = now.getFullYear() + '-' +
          String(now.getMonth() + 1).padStart(2, '0') + '-' +
          String(now.getDate()).padStart(2, '0') + ' ' +
          String(now.getHours()).padStart(2, '0') + ':' +
          String(now.getMinutes()).padStart(2, '0') + ':' +
          String(now.getSeconds()).padStart(2, '0');

        // Simple header with model info and timestamp
        let headerHTML = '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">';
        headerHTML += '<div class="ai-metadata"><strong style="color: #000000;">AI:</strong>';
        if (model) {
          headerHTML += `<span style="margin-left: 8px; font-size: 0.9em; color: #666;">${model}</span>`;
        }
        headerHTML += `<br><span style="font-size: 0.85em; color: #999;">${timestamp}</span>`;
        headerHTML += '</div>';
        headerHTML += '</div>';

        // Simple content
        const formattedContent = formatAIResponse(content);
        // Store original markdown content for copying
        const encodedOriginalContent = encodeURIComponent(content);
        // 보안: DOMPurify로 AI 응답 HTML XSS 방지 (마크다운→HTML 변환 후 위험 태그 제거)
        const sanitizedFormatted = typeof DOMPurify !== 'undefined'
          ? DOMPurify.sanitize(formattedContent, { ADD_ATTR: ['target', 'data-original-content'] })
          : formattedContent;
        const contentHTML = `<div class="ai-content" data-original-content="${encodedOriginalContent}" style="color: #000000; line-height: 1.6;">${sanitizedFormatted}</div>`;

        // Copy button at bottom (WITHOUT onclick attribute)
        const copyButtonHTML = '<div style="text-align: right; margin-top: 10px;"><button class="copy-btn" style="padding: 6px 14px; background: #1976d2; color: #fff; border: none; border-radius: 6px; cursor: pointer;">복사</button></div>';

        messageDiv.innerHTML = headerHTML + contentHTML + copyButtonHTML;

        // Attach event listeners after HTML is set
        const copyBtn = messageDiv.querySelector('.copy-btn');
        const aiContentDiv = messageDiv.querySelector('.ai-content');
        const metadataDiv = messageDiv.querySelector('.ai-metadata');

        console.log('[addMessageToDisplay] copyBtn:', copyBtn);
        console.log('[addMessageToDisplay] aiContentDiv:', aiContentDiv);
        console.log('[addMessageToDisplay] metadataDiv:', metadataDiv);

        // CRITICAL FIX: metadataDiv is not required for copying
        // Only copyBtn and aiContentDiv are essential
        if (copyBtn && aiContentDiv) {
          // Mark as listener attached to prevent duplicate listeners from attachQACopyListeners
          copyBtn.setAttribute('data-listener-attached', 'true');
          console.log('[addMessageToDisplay] Attaching event listener to copy button');
          copyBtn.addEventListener('click', function () {
            console.log('[addMessageToDisplay] Copy button clicked!');
            // 메타데이터(모델명, 시간) 추출 (optional)
            const modelText = model ? `AI: ${model}` : 'AI';
            const timestampText = timestamp;
            const metadataText = metadataDiv ? `${modelText}\n${timestampText}\n\n` : '';

            // CRITICAL FIX: data-original-content에서 마크다운 원본 추출
            // qa.html을 로드한 경우 data-original-content 속성에 URL 인코딩된 마크다운 원본이 저장되어 있음
            let contentText;
            const originalContent = aiContentDiv.getAttribute('data-original-content');

            if (originalContent) {
              // URL 디코딩하여 마크다운 원본 사용
              try {
                contentText = decodeURIComponent(originalContent);
                console.log('[copyToEditor] Using markdown from data-original-content');
              } catch (e) {
                console.error('[copyToEditor] Failed to decode data-original-content:', e);
                contentText = convertHtmlToFormattedText(aiContentDiv);
              }
            } else {
              // data-original-content가 없으면 HTML을 텍스트로 변환 (기존 방식)
              contentText = convertHtmlToFormattedText(aiContentDiv);
              console.log('[copyToEditor] Using converted HTML (no data-original-content)');
            }

            // 메타데이터 + 내용 복사
            copyToEditor(metadataText + contentText);
          });
        } else {
          console.error('[addMessageToDisplay] Failed to attach event listener - missing REQUIRED elements');
          console.error('[addMessageToDisplay] copyBtn exists:', !!copyBtn);
          console.error('[addMessageToDisplay] aiContentDiv exists:', !!aiContentDiv);
          console.error('[addMessageToDisplay] Note: metadataDiv is optional, not required');
        }
      } else if (role === 'error') {
        messageDiv.style.cssText += ' padding: 15px; background-color: #ffebee; border: 1px solid #ffcdd2; border-radius: 8px;';

        // white-space: pre-wrap으로 줄바꿈 문자(\n) 표시
        const errorHeader = '<strong style="color: #d32f2f !important; font-size: 16px;">오류 발생</strong>';
        const errorContent = `<div style="color: #000000 !important; margin-top: 12px; white-space: pre-wrap; font-family: monospace; background-color: #fff; padding: 12px; border-radius: 4px; border: 1px solid #ffcdd2; overflow-x: auto;">${content}</div>`;

        messageDiv.innerHTML = errorHeader + errorContent;
      }

      // appendToDOM이 true일 때만 DOM에 추가
      if (appendToDOM && llmResponse) {
        llmResponse.appendChild(messageDiv);
        llmResponse.scrollTop = llmResponse.scrollHeight;
      }

      // Return the outerHTML of the displayed message for saving
      return messageDiv.outerHTML;
    }

    // 전역 MathJax 렌더링 함수 (qa.html 로드 후 호출용)
    window.renderMathJaxInPanel = function (panelId) {
      if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
        const panel = typeof panelId === 'string' ? document.getElementById(panelId) : panelId;
        if (panel) {
          console.log('[MathJax] Rendering in panel:', panelId || panel.id || 'unknown');
          MathJax.typesetPromise([panel]).then(() => {
            console.log('[MathJax] Panel rendering complete');
          }).catch(err => {
            console.warn('[MathJax] Panel rendering failed:', err);
          });
        } else {
          console.warn('[MathJax] Panel not found:', panelId);
        }
      } else {
        console.warn('[MathJax] MathJax not loaded');
      }
    };

    // llm-response 패널의 MathJax 렌더링 (노드 전환 시 호출)
    window.renderMathJaxInLLMPanel = function () {
      window.renderMathJaxInPanel('llmResponse');
    };

    function parseContentIntoBlocks(content) {
      try {
        if (!content) return [];

        // Split by numbered list (1. 2. 3.) or markdown headers (## ###)
        const lines = content.split(/\r?\n/);
        const blocks = [];
        let currentBlock = [];
        let blockStart = true; // Start with true to include content from beginning

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Block separator: numbered list (1. 2.) or markdown headers (## ###)
          if (/^(\d+\.|##+ )/.test(line)) {
            // Save previous block if exists
            if (currentBlock.length > 0) {
              blocks.push({
                content: currentBlock.join('\n').trim()
              });
              currentBlock = [];
            }
            blockStart = true;
          }

          // Add line to current block
          if (blockStart || currentBlock.length > 0) {
            currentBlock.push(line);
          }
        }

        // Save last block
        if (currentBlock.length > 0) {
          blocks.push({
            content: currentBlock.join('\n').trim()
          });
        }

        // If no blocks created, return whole content as one block
        if (blocks.length === 0 && content.trim()) {
          blocks.push({
            content: content.trim()
          });
        }

        return blocks;
      } catch (error) {
        console.error('Error parsing blocks:', error);
        // Return whole content as one block on error
        if (content && content.trim()) {
          return [{ content: content.trim() }];
        }
        return [];
      }
    }

    // Global function for copying block text from qa.html
    window.copyBlockText = function (button, text) {
      navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        const originalBg = button.style.background;
        button.textContent = t('appCopyDone', '복사 완료!');
        button.style.background = '#28a745';
        setTimeout(() => {
          button.textContent = originalText;
          button.style.background = originalBg;
        }, 2000);
      }).catch(err => {
        console.error('복사 실패:', err);
        alert(window.i18n?.alertCopyFailed || '복사에 실패했습니다.');
      });
    };

    // Global function for copying question content to clipboard
    window.copyQuestionToClipboard = function (button) {
      const questionDiv = button.closest('.question');
      const contentDiv = questionDiv?.querySelector('.question-content');
      const text = contentDiv?.textContent?.trim() || '';

      if (!text) {
        console.warn('[copyQuestionToClipboard] No content found');
        return;
      }

      navigator.clipboard.writeText(text).then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = mmIcon('check-circle', 14) + ' 복사됨!';
        button.style.background = '#28a745';
        setTimeout(() => {
          button.innerHTML = originalHTML;
          button.style.background = '#1976d2';
        }, 2000);
      }).catch(err => {
        console.error('[copyQuestionToClipboard] 복사 실패:', err);
        alert(window.i18n?.alertCopyFailed || '복사에 실패했습니다.');
      });
    };

    // Global function for copying AI answer content to clipboard
    window.copyToClipboard = function (button) {
      const answerDiv = button.closest('.answer');
      const contentDiv = answerDiv?.querySelector('.answer-content');
      const text = contentDiv?.textContent?.trim() || '';

      if (!text) {
        console.warn('[copyToClipboard] No content found');
        return;
      }

      navigator.clipboard.writeText(text).then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = mmIcon('check-circle', 14) + ' 복사됨!';
        button.style.background = '#28a745';
        setTimeout(() => {
          button.innerHTML = originalHTML;
          button.style.background = '#1976d2';
        }, 2000);
      }).catch(err => {
        console.error('[copyToClipboard] 복사 실패:', err);
        alert(window.i18n?.alertCopyFailed || '복사에 실패했습니다.');
      });
    };

    // AI 응답을 에디터에 복사하는 함수
    window.copyAnswerToEditor = function (button) {
      const answerDiv = button.closest('.answer');
      const contentDiv = answerDiv?.querySelector('.answer-content');

      if (!contentDiv) {
        console.warn('[copyAnswerToEditor] No content div found');
        return;
      }

      // data-original-content에서 마크다운 원본 가져오기
      let markdownText = '';
      const originalContent = contentDiv.getAttribute('data-original-content');

      if (originalContent) {
        try {
          markdownText = decodeURIComponent(originalContent);
          console.log('[copyAnswerToEditor] Using data-original-content');
        } catch (e) {
          console.error('[copyAnswerToEditor] Failed to decode:', e);
          markdownText = contentDiv.textContent?.trim() || '';
        }
      } else {
        // data-original-content가 없으면 텍스트 내용 사용
        markdownText = contentDiv.textContent?.trim() || '';
      }

      if (!markdownText) {
        console.warn('[copyAnswerToEditor] No content to copy');
        return;
      }

      // 에디터에 복사
      if (typeof copyToEditor === 'function') {
        copyToEditor(markdownText);

        // 시각적 피드백
        const originalHTML = button.innerHTML;
        button.innerHTML = mmIcon('check-circle', 14) + ' 에디터에 복사됨!';
        button.style.background = '#28a745';
        setTimeout(() => {
          button.innerHTML = originalHTML;
          button.style.background = '#1976d2';
        }, 2000);

        console.log('[copyAnswerToEditor] Successfully copied to editor');
      } else {
        console.error('[copyAnswerToEditor] copyToEditor function not found');
        alert(t('appEditorNotReady', '에디터가 준비되지 않았습니다.'));
      }
    };

    // AI 응답을 선택된 노드의 자식 노드로 생성하는 함수
    window.createNodeFromAIResponse = async function (button) {
      // 현재 선택된 노드 확인
      const currentNodeId = window.MyMind3?.MindMapData?.currentEditingNodeId;
      if (!currentNodeId) {
        if (typeof showToast === 'function') {
          showToast('노드가 선택되어야 노드 생성이 가능합니다.', 'warning', 3000);
        }
        return;
      }

      const parentNode = window.MyMind3.MindMapData.findNodeById(currentNodeId);
      if (!parentNode) {
        if (typeof showToast === 'function') {
          showToast('선택된 노드를 찾을 수 없습니다.', 'error', 3000);
        }
        return;
      }

      // 답변 내용 가져오기
      const answerDiv = button.closest('.answer');
      const contentDiv = answerDiv?.querySelector('.answer-content');
      if (!contentDiv) {
        console.warn('[createNodeFromAIResponse] 답변 내용을 찾을 수 없습니다.');
        return;
      }

      let markdownText = '';
      const originalContent = contentDiv.getAttribute('data-original-content');
      if (originalContent) {
        try {
          markdownText = decodeURIComponent(originalContent);
        } catch (e) {
          markdownText = contentDiv.textContent?.trim() || '';
        }
      } else {
        markdownText = contentDiv.textContent?.trim() || '';
      }

      if (!markdownText) {
        console.warn('[createNodeFromAIResponse] 복사할 내용이 없습니다.');
        return;
      }

      // 제목 추출 (첫 줄에서 30자 이내)
      let nodeTitle = markdownText.split('\n')[0].replace(/^[#*>\-\s]+/, '').trim();
      if (nodeTitle.length > 30) nodeTitle = nodeTitle.substring(0, 30) + '...';
      if (!nodeTitle) nodeTitle = 'AI 응답';

      try {
        const newNode = window.MyMind3.MindMapData.createChildNode(parentNode.id, nodeTitle);
        if (newNode) {
          const contentHTML = `<br>\n${markdownText}`;
          newNode.content = contentHTML;

          // HTML 파일 저장
          const folderName = window.currentQAFolder || window.MyMind3?.currentFolder || localStorage.getItem('currentFolder');
          if (folderName) {
            const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
            await fetch('/api/savenode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...csrfHeaders },
              credentials: 'include',
              body: JSON.stringify({
                folder: folderName,
                nodeId: newNode.nodeId || String(newNode.id),
                content: contentHTML,
                nodeName: newNode.title || ''  // 서버에서 title[nodeId].html 파일명에 사용
              })
            });
          }

          // 마인드맵 렌더링
          window.MyMind3.NodeRenderer.renderMindMap();

          // 마인드맵 자동 저장
          if (window.MyMind3Simple && window.MyMind3Simple.saveMindmapSilently) {
            await window.MyMind3Simple.saveMindmapSilently();
          }

          // 시각적 피드백
          const originalHTML = button.innerHTML;
          button.innerHTML = mmIcon('check-circle', 14) + ' 생성 완료!';
          button.style.background = '#28a745';
          setTimeout(() => {
            button.innerHTML = originalHTML;
            button.style.background = '#7c4dff';
          }, 2000);

          if (typeof showToast === 'function') {
            showToast(`"${nodeTitle}" 노드가 생성되었습니다.`, 'success');
          }
        } else {
          if (typeof showToast === 'function') {
            showToast('노드 생성에 실패했습니다. (동일한 제목의 노드가 이미 존재할 수 있습니다)', 'warning', 3000);
          }
        }
      } catch (error) {
        console.error('[createNodeFromAIResponse] 노드 생성 실패:', error);
        if (typeof showToast === 'function') {
          showToast('노드 생성 중 오류가 발생했습니다.', 'error', 3000);
        }
      }
    };

    function copyBlockToEditor(html, markdownSource) {
      try {
        // Check if Toast UI Editor instance exists
        if (!window.toastEditor || !window.toastEditor.getEditor) {
          console.error('Toast UI Editor instance not found');
          alert(window.i18n?.alertEditorNotReady || '에디터가 준비되지 않았습니다.');
          return;
        }

        const editor = window.toastEditor.getEditor();
        if (!editor) {
          alert(window.i18n?.alertEditorNotReady || '에디터가 준비되지 않았습니다.');
          return;
        }

        try {
          // Get current markdown content
          const currentMarkdown = editor.getMarkdown ? editor.getMarkdown() : '';

          // Use markdown source if provided (safest method)
          if (markdownSource) {
            // Add double newline if there's existing content
            const newContent = currentMarkdown
              ? currentMarkdown + '\n\n' + markdownSource
              : markdownSource;

            // Set markdown content
            editor.setMarkdown(newContent);

            console.log('Content copied to editor successfully');
            return;
          }

          // Fallback: extract plain text from HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          const plainText = tempDiv.textContent || tempDiv.innerText || '';

          // Add double newline if there's existing content
          const newContent = currentMarkdown
            ? currentMarkdown + '\n\n' + plainText
            : plainText;

          // Set markdown content
          editor.setMarkdown(newContent);

          console.log('Plain text copied to editor successfully');
        } catch (e) {
          console.error('Error copying to editor:', e);
          alert(window.i18n?.alertCopyError || '복사 중 오류가 발생했습니다. 다시 시도해 주세요.');
        }
      } catch (e) {
        console.error('Unexpected error:', e);
      }
    }

    async function suggestNodeExpansion(selectedNode) {
      const currentApiKey = window.MyMindAI.getCurrentApiKey();
      if (!currentApiKey) {
        const serviceName = window.MyMindAI.currentService.toUpperCase();
        const goToSettings = confirm(`${serviceName} API Key가 설정되지 않았습니다.\n\nSettings → AI 설정에서 API Key를 설정해주세요.\n\n설정 페이지로 이동하시겠습니까?`);
        if (goToSettings) {
          showSettingsLayerPopup('#ai');
        }
        return;
      }

      const nodeId = parseInt(selectedNode.getAttribute('data-id'));
      const nodeData = window.MyMind3?.MindMapData?.findNodeById(nodeId);

      if (!nodeData) {
        alert(window.i18n?.alertNodeNotFound || '노드 데이터를 찾을 수 없습니다.');
        return;
      }

      let prompt = `다음 마인드맵 노드를 확장하기 위한 하위 노드 3-5개를 제안해주세요:
노드 제목: "${nodeData.title}"
${nodeData.content ? `노드 내용: "${nodeData.content}"` : ''}

각 제안은 한 줄씩, 번호나 기호 없이 간단하게 작성해주세요.`;

      // Add checked nodes context
      if (window.MyMind3 && window.MyMind3.NodeRenderer && window.MyMind3.NodeRenderer.getCheckedNodesContext) {
        const checkedContext = window.MyMind3.NodeRenderer.getCheckedNodesContext();
        if (checkedContext) {
          prompt += checkedContext;
        }
      }

      if (window.MyMindAI.isProcessing) {
        alert(window.i18n?.alertAIBusy || 'AI가 다른 요청을 처리중입니다. 잠시 기다려주세요.');
        return;
      }

      window.MyMindAI.isProcessing = true;

      try {
        const userMessage = `"${nodeData.title}" 노드 확장 제안 요청`;
        const userHTML = addMessageToDisplay('user', userMessage);

        // Auto-save user request (현재 선택된 AI 서비스의 Q&A 파일에 저장)
        if (userHTML) {
          await autoSaveQAItem(userHTML, window.MyMindAI.currentService);
        }

        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${window.MyMindAI.apiKey}`,
            ...csrfHeaders
          },
          body: JSON.stringify({
            message: prompt,
            model: window.MyMindAI.currentModel,
            temperature: 0.8,
            maxTokens: getOptimalMaxTokens(window.MyMindAI.currentService, window.MyMindAI.currentModel, 'nodeExpansion')
          })
        });

        if (!response.ok) {
          const errorData = await response.json();

          // Validation 에러의 상세 정보 추출
          let errorMessage = errorData.error?.message || `HTTP ${response.status}`;

          if (errorData.error?.type === 'validation_error' && errorData.error?.details) {
            // Validation 실패한 필드들의 상세 정보 표시
            errorMessage += '\n\n상세 오류 정보:';
            errorData.error.details.forEach((detail, index) => {
              errorMessage += `\n${index + 1}. 필드: ${detail.path || detail.param}`;
              errorMessage += `\n   - 메시지: ${detail.msg}`;
              if (detail.value !== undefined) {
                const valueStr = typeof detail.value === 'string' && detail.value.length > 100
                  ? detail.value.substring(0, 100) + '...'
                  : String(detail.value);
                errorMessage += `\n   - 입력값: ${valueStr}`;
              }
              if (detail.location) {
                errorMessage += `\n   - 위치: ${detail.location}`;
              }
            });

            // Debug 정보 추가
            if (errorData.error?.debug) {
              errorMessage += `\n\n총 ${errorData.error.debug.totalErrors}개의 오류 발견`;
            }

            // Request ID 추가 (서버 로그 추적용)
            if (errorData.error?.requestId) {
              errorMessage += `\n\nRequest ID: ${errorData.error.requestId}`;
            }
          }

          throw new Error(errorMessage);
        }

        const result = await response.json();
        const suggestions = result.data.response.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .slice(0, 5);

        const assistantMessage = `${nodeData.title} 노드 확장 제안:\n\n${suggestions.join('\n')}`;
        const aiHTML = addMessageToDisplay('assistant', assistantMessage);

        // Auto-save assistant response (현재 선택된 AI 서비스의 Q&A 파일에 저장)
        if (aiHTML) {
          await autoSaveQAItem(aiHTML, window.MyMindAI.currentService);
        }

        // Optionally auto-create child nodes
        if (confirm(`${suggestions.length}개의 하위 노드를 자동으로 생성하시겠습니까?`)) {
          suggestions.forEach(suggestion => {
            if (window.MyMind3?.NodeRenderer?.addChildNode) {
              window.MyMind3.NodeRenderer.addChildNode(nodeId, suggestion);
            }
          });
        }

      } catch (error) {
        console.error('Node expansion suggestion failed:', error);
        addMessageToDisplay('error', `노드 확장 제안 실패: ${error.message}`);
      } finally {
        window.MyMindAI.isProcessing = false;
      }
    }

    // ========== PPT 템플릿 관리 함수들 (P5) ==========

    // 템플릿 업로드 모달 열기
    function openTemplateUploadModal() {
      document.getElementById('templateUploadModal').style.display = 'block';
      document.getElementById('templateUploadModalOverlay').style.display = 'block';
      switchTemplateTab('upload');
    }

    // 템플릿 업로드 모달 닫기
    function closeTemplateUploadModal() {
      document.getElementById('templateUploadModal').style.display = 'none';
      document.getElementById('templateUploadModalOverlay').style.display = 'none';
    }

    // 템플릿 탭 전환
    function switchTemplateTab(tab) {
      const uploadTab = document.getElementById('templateUploadTab');
      const listTab = document.getElementById('templateListTab');
      const uploadBtn = document.getElementById('templateTabUpload');
      const listBtn = document.getElementById('templateTabList');

      if (tab === 'upload') {
        uploadTab.style.display = 'block';
        listTab.style.display = 'none';
        uploadBtn.style.color = '#1976d2';
        uploadBtn.style.fontWeight = 'bold';
        uploadBtn.style.borderBottom = '2px solid #1976d2';
        listBtn.style.color = '#888';
        listBtn.style.fontWeight = 'normal';
        listBtn.style.borderBottom = '2px solid transparent';
      } else {
        uploadTab.style.display = 'none';
        listTab.style.display = 'block';
        uploadBtn.style.color = '#888';
        uploadBtn.style.fontWeight = 'normal';
        uploadBtn.style.borderBottom = '2px solid transparent';
        listBtn.style.color = '#1976d2';
        listBtn.style.fontWeight = 'bold';
        listBtn.style.borderBottom = '2px solid #1976d2';
        loadUserTemplates();
      }
    }

    // 사용자 템플릿 저장
    async function saveUserTemplate() {
      const name = document.getElementById('templateNameInput').value.trim();
      const description = document.getElementById('templateDescInput').value.trim();

      if (!name) {
        alert(window.i18n?.alertEnterTemplateName || '템플릿 이름을 입력해주세요.');
        return;
      }

      // 색상 수집
      const primary = document.getElementById('templateColorPrimary').value;
      const secondary = document.getElementById('templateColorSecondary').value;
      const background = document.getElementById('templateColorBg').value;
      const text = document.getElementById('templateColorText').value;

      // 폰트 수집
      const titleFont = document.getElementById('templateFontTitle').value;
      const bodyFont = document.getElementById('templateFontBody').value;

      // 전환 효과
      const transition = document.getElementById('templateTransition').value;

      // 템플릿 객체 생성
      const template = {
        name: name,
        title: name,
        description: description,
        colors: {
          primary: primary,
          secondary: secondary,
          background: background,
          text: text,
          levels: [primary, secondary, background === '#ffffff' ? '#64b5f6' : background, '#90caf9', '#bbdefb']
        },
        fonts: {
          title: titleFont,
          body: bodyFont,
          titleSize: 44,
          subtitleSize: 28,
          bodySize: 18
        },
        transition: {
          type: transition,
          speed: 1.0
        }
      };

      try {
        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          body: JSON.stringify({ template }),
          credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
          alert(window.i18n?.alertTemplateSaved || '템플릿이 저장되었습니다!');
          closeTemplateUploadModal();
          // 템플릿 선택 드롭다운 갱신
          loadTemplatesForSelect();
          // 입력 필드 초기화
          document.getElementById('templateNameInput').value = '';
          document.getElementById('templateDescInput').value = '';
        } else {
          alert((window.i18n?.alertSaveFailed || '저장 실패') + ': ' + (result.error || (window.i18n?.alertUnknownError || '알 수 없는 오류')));
        }
      } catch (error) {
        console.error('템플릿 저장 오류:', error);
        alert(window.i18n?.alertTemplateSaveError || '템플릿 저장 중 오류가 발생했습니다.');
      }
    }

    // 사용자 템플릿 목록 로드
    async function loadUserTemplates() {
      const listContainer = document.getElementById('userTemplateList');
      listContainer.innerHTML = `<div style="text-align:center; color:#888; padding:20px;">${t('templateLoading', '템플릿을 불러오는 중...')}</div>`;

      try {
        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};

        const response = await fetch('/api/templates', { credentials: 'include' });
        const result = await response.json();

        if (result.success && result.templates) {
          const userTemplates = result.templates.filter(t => t.type === 'user');

          if (userTemplates.length === 0) {
            listContainer.innerHTML = `
              <div style="text-align:center; color:#888; padding:30px;">
                <div style="font-size:48px; margin-bottom:10px;"></div>
                <div>저장된 사용자 템플릿이 없습니다.</div>
                <div style="font-size:12px; margin-top:5px;">위의 "템플릿 업로드" 탭에서 새 템플릿을 만들어보세요!</div>
              </div>
            `;
            return;
          }

          let html = '';
          for (const tmpl of userTemplates) {
            const primaryColor = tmpl.colors?.primary || '#1976d2';
            const secondaryColor = tmpl.colors?.secondary || '#42a5f5';
            html += `
              <div style="display:flex; align-items:center; padding:12px; border:1px solid #eee; border-radius:8px; margin-bottom:10px; background:#fafafa;">
                <div style="display:flex; gap:4px; margin-right:12px;">
                  <div style="width:24px; height:24px; border-radius:4px; background:${primaryColor};"></div>
                  <div style="width:24px; height:24px; border-radius:4px; background:${secondaryColor};"></div>
                </div>
                <div style="flex:1;">
                  <div style="font-weight:bold; color:#333;">${tmpl.title || tmpl.name}</div>
                  <div style="font-size:12px; color:#888;">${tmpl.description || '설명 없음'}</div>
                </div>
                <button onclick="deleteUserTemplate('${tmpl.name}')"
                  style="padding:6px 12px; background:#ff5252; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px;">
                  삭제
                </button>
              </div>
            `;
          }
          listContainer.innerHTML = html;
        } else {
          listContainer.innerHTML = `<div style="text-align:center; color:#ff5252; padding:20px;">${t('templateLoadFail', '템플릿 로드 실패')}</div>`;
        }
      } catch (error) {
        console.error('템플릿 목록 로드 오류:', error);
        listContainer.innerHTML = `<div style="text-align:center; color:#ff5252; padding:20px;">${t('networkError', '네트워크 오류')}</div>`;
      }
    }

    // 사용자 템플릿 삭제
    async function deleteUserTemplate(templateName) {
      if (!confirm(`"${templateName}" 템플릿을 삭제하시겠습니까?`)) return;

      try {
        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
        const response = await fetch(`/api/templates/${encodeURIComponent(templateName)}`, {
          method: 'DELETE',
          headers: { ...csrfHeaders },
          credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
          loadUserTemplates();
          loadTemplatesForSelect();
        } else {
          alert((window.i18n?.alertDeleteFailed || '삭제 실패') + ': ' + (result.error || (window.i18n?.alertUnknownError || '알 수 없는 오류')));
        }
      } catch (error) {
        console.error('템플릿 삭제 오류:', error);
        alert(window.i18n?.alertTemplateDeleteError || '템플릿 삭제 중 오류가 발생했습니다.');
      }
    }

    // 템플릿 선택 드롭다운 갱신
    async function loadTemplatesForSelect() {
      const select = document.getElementById('pptTemplateSelect');
      const typeLabel = document.getElementById('templateTypeLabel');
      if (!select) return;

      try {
        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch('/api/templates', { credentials: 'include' });
        const result = await response.json();

        if (result.success && result.templates) {
          select.innerHTML = '';

          // 시스템 템플릿 옵션 그룹
          const systemGroup = document.createElement('optgroup');
          systemGroup.label = '시스템 템플릿';
          result.templates.filter(t => t.type === 'system').forEach(tmpl => {
            const option = document.createElement('option');
            option.value = tmpl.name;
            option.textContent = `${tmpl.title || tmpl.name} - ${tmpl.description || ''}`;
            option.dataset.type = 'system';
            systemGroup.appendChild(option);
          });
          select.appendChild(systemGroup);

          // 사용자 템플릿 옵션 그룹
          const userTemplates = result.templates.filter(t => t.type === 'user');
          if (userTemplates.length > 0) {
            const userGroup = document.createElement('optgroup');
            userGroup.label = '내 템플릿';
            userTemplates.forEach(tmpl => {
              const option = document.createElement('option');
              option.value = tmpl.name;
              option.textContent = `${tmpl.title || tmpl.name}`;
              option.dataset.type = 'user';
              userGroup.appendChild(option);
            });
            select.appendChild(userGroup);
          }

          // 선택 변경 이벤트
          select.onchange = function() {
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption && selectedOption.dataset.type === 'user') {
              typeLabel.textContent = t('userTemplate', '사용자 템플릿');
              typeLabel.style.color = '#1976d2';
            } else {
              typeLabel.textContent = '';
            }
          };
        }
      } catch (error) {
        console.error('템플릿 목록 로드 오류:', error);
      }
    }

    // 문서 생성 기능 설정
    function setupDocumentGeneration() {
      const documentPopup = document.getElementById('documentPopup');
      const documentPopupOverlay = document.getElementById('documentPopupOverlay');
      const documentPopupCloseBtn = document.getElementById('documentPopupCloseBtn');
      const documentGenerateBtn = document.getElementById('documentGenerateBtn');
      const documentDownloadBtn = document.getElementById('documentDownloadBtn');
      const documentType = document.getElementById('documentType');
      const documentStatus = document.getElementById('documentStatus');

      let currentDocumentType = '';


      // PDF 버튼 이벤트 (중간 패널) - 기능설정으로 제거될 수 있어 null 체크
      const _pdfNodeBtn = document.getElementById('pdfNodeBtn');
      if (_pdfNodeBtn) {
        _pdfNodeBtn.addEventListener('click', () => {
          showDocumentPopup('PDF');
        });
      }

      // PPT 버튼 이벤트 (중간 패널) - 기능설정으로 제거될 수 있어 null 체크
      const _pptNodeBtn = document.getElementById('pptNodeBtn');
      if (_pptNodeBtn) {
        _pptNodeBtn.addEventListener('click', () => {
          showDocumentPopup('PPT');
        });
      }

      // 팝업 표시
      async function showDocumentPopup(type) {
        // Check both window.selectedNodeId and currentEditingNodeId
        const nodeId = window.selectedNodeId || window.MyMind3.MindMapData.currentEditingNodeId;

        if (!nodeId) {
          alert(window.i18n?.alertSelectNodeFirst || '먼저 노드를 선택해주세요.');
          return;
        }

        // Ensure window.selectedNodeId is set for other functions
        window.selectedNodeId = nodeId;

        currentDocumentType = type;
        documentType.textContent = type;
        documentStatus.textContent = '';

        // UI 초기화
        const documentFileInfo = document.getElementById('documentFileInfo');
        const documentFileName = document.getElementById('documentFileName');
        const downloadBtn = document.getElementById('documentDownloadBtn');

        documentFileInfo.style.display = 'none';
        documentFileName.textContent = '';
        downloadBtn.disabled = true;
        downloadBtn.style.opacity = '0.5';
        downloadBtn.style.cursor = 'not-allowed';

        // PPT 옵션 표시/숨김
        const pptOptions = document.getElementById('pptOptions');
        if (pptOptions) {
          pptOptions.style.display = (type === 'PPT') ? 'block' : 'none';

          // PPT 모드일 때 생성 방식 UI 초기화 (P7)
          if (type === 'PPT') {
            const useGPTCheckbox = document.getElementById('pptUseGPT');
            const keyPointsGroup = document.getElementById('keyPointsGroup');
            const aiModelInfoGroup = document.getElementById('aiModelInfoGroup');
            const keyPointsTextarea = document.getElementById('pptKeyPoints');
            const pptModeFast = document.getElementById('pptModeFast');
            const pptModeAI = document.getElementById('pptModeAI');

            // AI 고급 생성 모드로 통일 (UI 숨김, 내부 값만 설정)
            if (pptModeAI) pptModeAI.checked = true;
            if (pptModeFast) pptModeFast.checked = false;
            if (useGPTCheckbox) useGPTCheckbox.checked = true;
            if (keyPointsTextarea) keyPointsTextarea.value = '';

            // 템플릿 목록 로드 (P5 사용자 템플릿 지원)
            loadTemplatesForSelect();
          }
        }

        // PDF 옵션 표시/숨김
        const pdfOptions = document.getElementById('pdfOptions');
        if (pdfOptions) {
          pdfOptions.style.display = (type === 'PDF') ? 'block' : 'none';

          // PDF 모드일 때 AI 모델 선택기 초기화
          if (type === 'PDF' && typeof initPDFAIModelSelector === 'function') {
            initPDFAIModelSelector();
          }
        }

        // 팝업 먼저 표시
        documentPopup.style.display = 'block';
        documentPopupOverlay.style.display = 'block';

        // 문서 상태 확인 제거 - 기존 문서 상태와 관계없이 다운로드 버튼은 비활성화 유지
        // 파일 생성이 완료되어야만 다운로드 버튼이 활성화됨
        // await checkAndUpdateDocumentStatus(type.toLowerCase(), nodeId);
      }

      // PPT 생성 방식 스타일 업데이트 함수 (P7)
      function updatePPTModeStyles(mode) {
        const fastLabel = document.querySelector('label:has(#pptModeFast)');
        const aiLabel = document.querySelector('label:has(#pptModeAI)');

        if (mode === 'fast') {
          if (fastLabel) {
            fastLabel.style.border = '2px solid #4CAF50';
            fastLabel.style.background = '#f0fff0';
          }
          if (aiLabel) {
            aiLabel.style.border = '2px solid #ddd';
            aiLabel.style.background = '#fafafa';
          }
        } else if (mode === 'ai') {
          if (fastLabel) {
            fastLabel.style.border = '2px solid #ddd';
            fastLabel.style.background = '#fafafa';
          }
          if (aiLabel) {
            aiLabel.style.border = '2px solid #1976d2';
            aiLabel.style.background = '#e3f2fd';
          }
        }
      }

      // 핵심항목 및 AI 모델 정보 토글 함수
      function toggleKeyPointsAndModelInfo(isGPTChecked) {
        const keyPointsGroup = document.getElementById('keyPointsGroup');
        const aiModelInfoGroup = document.getElementById('aiModelInfoGroup');
        const keyPointsTextarea = document.getElementById('pptKeyPoints');
        const aiModelNameEl = document.getElementById('currentAIModelName');

        if (isGPTChecked) {
          // GPT 활성화: 핵심항목 입력창과 AI 모델 정보 표시
          if (keyPointsGroup) keyPointsGroup.style.display = 'block';
          if (aiModelInfoGroup) aiModelInfoGroup.style.display = 'block';

          // 현재 설정된 AI 모델 표시
          if (aiModelNameEl) {
            try {
              const aiSettings = JSON.parse(localStorage.getItem('mymind3_ai_settings') || '{}');
              const modelName = aiSettings.treeGenModel || 'gpt-4.1-mini';
              aiModelNameEl.textContent = modelName;
            } catch (e) {
              aiModelNameEl.textContent = 'gpt-4.1-mini';
            }
          }
        } else {
          // GPT 비활성화: 핵심항목 입력창과 AI 모델 정보 숨김
          if (keyPointsGroup) keyPointsGroup.style.display = 'none';
          if (aiModelInfoGroup) aiModelInfoGroup.style.display = 'none';
          if (keyPointsTextarea) keyPointsTextarea.value = ''; // 입력값 초기화
        }
      }

      // 팝업 닫기
      function hideDocumentPopup() {
        documentPopup.style.display = 'none';
        documentPopupOverlay.style.display = 'none';
        currentDocumentType = '';
      }

      // 팝업 닫기 이벤트
      documentPopupCloseBtn.addEventListener('click', hideDocumentPopup);

      // Document popup event propagation blocking
      if (documentPopup) {
        documentPopup.addEventListener('click', function (e) {
          e.stopPropagation();
          // Allow clicks within popup to work normally
        });
      }

      if (documentPopupOverlay) {
        documentPopupOverlay.addEventListener('click', function (e) {
          e.stopPropagation();
          e.preventDefault();
          // Do nothing - just block the click from reaching other elements
        });
      }

      // 파일 생성 (C 버튼)
      documentGenerateBtn.addEventListener('click', async () => {
        try {
          documentStatus.textContent = t('docGenerating', '문서 생성 중...');
          documentGenerateBtn.disabled = true;

          const currentFolder = getCurrentFolder();
          console.log('Current folder:', currentFolder);
          if (!currentFolder) {
            alert(window.i18n?.alertFolderNotFound || '현재 폴더를 확인할 수 없습니다.');
            return;
          }

          // 노드 제목 가져오기
          const nodeData = window.MyMind3?.MindMapData?.findNodeById(window.selectedNodeId);
          const nodeTitle = nodeData?.title || `node_${window.selectedNodeId}`;
          console.log('Node title:', nodeTitle);
          console.log('🆔 Selected node ID:', window.selectedNodeId);
          console.log('Document type:', currentDocumentType);

          // 기본 요청 데이터
          const requestData = {
            nodeId: window.selectedNodeId,
            type: currentDocumentType.toLowerCase(),
            folder: currentFolder,
            title: nodeTitle,
            gptModel: getSelectedGPTModel()
          };

          // PPT 전용 옵션 수집
          if (currentDocumentType === 'PPT') {
            const templateSelect = document.getElementById('pptTemplateSelect');
            const useGPTCheckbox = document.getElementById('pptUseGPT');
            const includeChildrenCheckbox = document.getElementById('pptIncludeChildren');
            const keyPointsTextarea = document.getElementById('pptKeyPoints');
            const pptModeAI = document.getElementById('pptModeAI');

            requestData.template = templateSelect?.value || 'default';
            requestData.useGPT = useGPTCheckbox?.checked || false;
            requestData.includeChildren = true; // P12: 하위 노드 포함 항상 적용 (PPT2.md 기획)

            // 핵심항목 추가 (GPT 활성화 시에만 유효)
            if (requestData.useGPT && keyPointsTextarea?.value?.trim()) {
              requestData.keyPoints = keyPointsTextarea.value.trim();
            }

            console.log('PPT Options:', {
              template: requestData.template,
              useGPT: requestData.useGPT,
              useSSE: pptModeAI?.checked,
              includeChildren: requestData.includeChildren,
              keyPoints: requestData.keyPoints || '(없음)'
            });

            // P7: AI 고급 생성 모드 - SSE 스트리밍 사용
            if (pptModeAI?.checked && requestData.useGPT) {
              console.log('[P7] AI 고급 생성 모드 - SSE 스트리밍 시작');

              // PPT AI 모델 선택 정보 로드 (사용자 선택)
              let pptAISelection = { service: 'gpt', model: 'gpt-4.1-mini' };
              if (typeof getPPTAISelection === 'function') {
                pptAISelection = getPPTAISelection();
              }
              const treeGenModel = pptAISelection.model;
              console.log('PPT AI Selection:', pptAISelection);

              // Storage Token 가져오기
              const storageToken = await window.MyMind3?.StorageAuth?.getToken();
              if (!storageToken) {
                throw new Error('Storage token not available. Please login first.');
              }

              // SSE 스트리밍 URL 구성 (토큰 포함)
              const sseParams = new URLSearchParams({
                nodeId: window.selectedNodeId,
                folder: currentFolder,
                template: requestData.template,
                keyPoints: requestData.keyPoints || '',
                useImages: 'true',
                useGPT: requestData.useGPT ? 'true' : 'false',  // GPT 내용 개선 옵션
                aiService: pptAISelection.service,  // AI 서비스 (gpt, claude, gemini, grok)
                aiModel: pptAISelection.model,      // AI 모델
                token: storageToken  // SSE는 헤더를 보낼 수 없으므로 쿼리 파라미터로 전달
              });

              const sseUrl = `/api/generate-ppt-stream?${sseParams.toString()}`;
              console.log('SSE URL:', sseUrl.replace(/token=[^&]+/, 'token=***'));

              // PPT2 기획: 진행상황 모달 사용
              if (typeof generatePPTWithModal !== 'undefined') {
                console.log('PPT 진행상황 모달 사용');

                // 문서 팝업 상태 표시
                documentStatus.innerHTML = `${mmIcon('rocket', 14)} ${treeGenModel}로 AI 고급 PPT 생성 중...`;
                documentStatus.style.color = '#2196F3';

                // 진행상황 모달과 함께 PPT 생성 (콜백으로 완료/에러 처리)
                generatePPTWithModal(
                  {
                    nodeId: window.selectedNodeId,
                    folder: currentFolder,
                    template: requestData.template,
                    keyPoints: requestData.keyPoints || '',
                    useImages: 'true',
                    useGPT: requestData.useGPT ? 'true' : 'false',  // GPT 내용 개선 옵션
                    aiService: pptAISelection.service,  // AI 서비스
                    aiModel: pptAISelection.model,      // AI 모델
                    token: storageToken
                  },
                  {
                    // 완료 시 문서 상태 업데이트
                    onComplete: async (data) => {
                      console.log('PPT 생성 완료 콜백:', data);
                      documentStatus.innerHTML = mmIcon('check-circle', 14) + ` AI PPT 생성 완료! (${treeGenModel})`;
                      documentStatus.style.color = '#4CAF50';
                      documentGenerateBtn.disabled = false;
                      // 다운로드 버튼 활성화
                      await checkAndUpdateDocumentStatus('ppt', window.selectedNodeId);
                    },
                    // 에러 시 UI 복원
                    onError: (error) => {
                      console.error('PPT 생성 에러 콜백:', error);
                      documentStatus.innerHTML = mmIcon('x-circle', 14) + ` 생성 실패: ${error.message || error}`;
                      documentStatus.style.color = '#F44336';
                      documentGenerateBtn.disabled = false;
                    }
                  }
                );

                // SSE 모드에서는 여기서 리턴 (완료는 콜백에서 처리)
                return;
              } else if (typeof PPTGeneratorClient !== 'undefined') {
                // PPT2 모달 없이 기존 방식 (폴백)
                console.log('generatePPTWithModal 미로드, 기존 방식 사용');

                documentStatus.innerHTML = `${mmIcon('rocket', 14)} ${treeGenModel}로 AI 고급 PPT 생성 중...`;
                documentStatus.style.color = '#2196F3';

                const pptClient = new PPTGeneratorClient();
                const startTime = Date.now();

                pptClient.on('progress', (data) => {
                  const elapsed = Math.floor((Date.now() - startTime) / 1000);
                  const phaseName = data.phaseName || data.phase?.name || data.detail || '진행 중';
                  const progress = data.progress || data.percent || 0;
                  documentStatus.innerHTML = `${mmIcon('rocket', 14)} ${phaseName} (${Math.round(progress)}%) | ${elapsed}초`;
                });

                pptClient.on('complete', async (data) => {
                  const totalTime = Math.floor((Date.now() - startTime) / 1000);
                  const slideInfo = data.slideCount ? ` | ${data.slideCount}개 슬라이드` : '';
                  documentStatus.innerHTML = mmIcon('check-circle', 14) + ` AI PPT 생성 완료! (${treeGenModel}${slideInfo} | ${totalTime}초 소요)`;
                  documentStatus.style.color = '#4CAF50';
                  documentGenerateBtn.disabled = false;
                  await checkAndUpdateDocumentStatus('ppt', window.selectedNodeId);
                });

                pptClient.on('error', (error) => {
                  console.error('SSE 에러:', error);
                  documentStatus.innerHTML = mmIcon('x-circle', 14) + ` AI PPT 생성 실패: ${error.message}`;
                  documentStatus.style.color = '#F44336';
                  documentGenerateBtn.disabled = false;
                });

                pptClient.on('heartbeat', () => {
                  console.log('Heartbeat received');
                });

                pptClient.on('reconnect', (data) => {
                  documentStatus.textContent = `재연결 중... (${data.attempt}/${data.maxAttempts})`;
                });

                await pptClient.generate({
                  nodeId: window.selectedNodeId,
                  folder: currentFolder,
                  template: requestData.template,
                  keyPoints: requestData.keyPoints || '',
                  useImages: 'true',
                  useGPT: requestData.useGPT ? 'true' : 'false',  // GPT 내용 개선 옵션
                  token: storageToken
                });

                return;
              } else {
                console.warn('PPTGeneratorClient 미로드, 기존 API로 폴백');
              }
            }

            // 기존 API 사용 시 AI 설정
            if (requestData.useGPT) {
              try {
                const aiSettings = JSON.parse(localStorage.getItem('mymind3_ai_settings') || '{}');
                requestData.treeGenService = aiSettings.treeGenService || 'gpt';
                requestData.treeGenModel = aiSettings.treeGenModel || 'gpt-4.1-mini';
              } catch (e) {
                console.warn('AI 설정 로드 실패, 기본값 사용:', e);
                requestData.treeGenService = 'gpt';
                requestData.treeGenModel = 'gpt-4.1-mini';
              }

              // 진행 상태에 AI 모델명 표시 + 진행 애니메이션
              const startTime = Date.now();
              documentStatus.innerHTML = `${mmIcon('rocket', 14)} ${requestData.treeGenModel}로 PPT 콘텐츠 생성 중...`;
              documentStatus.style.color = '#2196F3';

              // 진행 상태 업데이트 인터벌 (사용자에게 진행 중임을 알림)
              const progressMessages = [
                mmIcon('text', 14) + ' 노드 구조 분석 중...',
                mmIcon('robot', 14) + ' AI가 슬라이드 구성 중...',
                mmIcon('edit', 14) + ' 콘텐츠 생성 중...',
                mmIcon('palette', 14) + ' 프레젠테이션 디자인 중...',
                mmIcon('clock', 14) + ' AI 응답 대기 중 (최대 2분 소요)...'
              ];
              let progressIndex = 0;
              const progressInterval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const msg = progressMessages[Math.min(progressIndex, progressMessages.length - 1)];
                documentStatus.innerHTML = `${mmIcon('rocket', 14)} ${requestData.treeGenModel} | ${msg} (${elapsed}초)`;
                progressIndex++;
              }, 5000);

              // 응답 후 인터벌 정리를 위해 저장
              requestData._progressInterval = progressInterval;
              requestData._startTime = startTime;
            }
          }

          // PDF 전용 옵션 수집 및 SSE 스트리밍 생성
          if (currentDocumentType === 'PDF') {
            const pdfTemplate = document.getElementById('pdfTemplate');
            const pdfTone = document.getElementById('pdfTone');
            const pdfDetailLevel = document.getElementById('pdfDetailLevel');
            const pdfImageSource = document.getElementById('pdfImageSource');

            // PDF AI 모델 선택 정보 로드
            let pdfAISelection = { service: 'gpt', model: 'gpt-4o-mini' };
            if (typeof getPDFAISelection === 'function') {
              pdfAISelection = getPDFAISelection();
            }

            console.log('PDF Options:', {
              template: pdfTemplate?.value,
              tone: pdfTone?.value,
              detailLevel: pdfDetailLevel?.value,
              imageSource: pdfImageSource?.value,
              aiService: pdfAISelection.service,
              aiModel: pdfAISelection.model
            });

            // Storage Token 가져오기
            const storageToken = await window.MyMind3?.StorageAuth?.getToken();
            if (!storageToken) {
              throw new Error('Storage token not available. Please login first.');
            }

            // PDF 진행상황 모달 사용
            if (typeof generatePDFWithModal !== 'undefined') {
              console.log('PDF 진행상황 모달 사용');

              documentStatus.innerHTML = `${mmIcon('file', 14)} ${pdfAISelection.model}로 PDF 생성 중...`;
              documentStatus.style.color = '#ef4444';

              generatePDFWithModal(
                {
                  nodeId: window.selectedNodeId,
                  folder: currentFolder,
                  template: pdfTemplate?.value || 'default',
                  tone: pdfTone?.value || 'professional',
                  detailLevel: pdfDetailLevel?.value || 'standard',
                  imageSource: pdfImageSource?.value || 'none',
                  aiService: pdfAISelection.service,
                  aiModel: pdfAISelection.model,
                  token: storageToken
                },
                {
                  onComplete: async (data) => {
                    console.log('PDF 생성 완료 콜백:', data);
                    documentStatus.innerHTML = mmIcon('check-circle', 14) + ` PDF 생성 완료! (${pdfAISelection.model})`;
                    documentStatus.style.color = '#4CAF50';
                    documentGenerateBtn.disabled = false;
                    await checkAndUpdateDocumentStatus('pdf', window.selectedNodeId);
                  },
                  onError: (error) => {
                    console.error('PDF 생성 에러 콜백:', error);
                    documentStatus.innerHTML = mmIcon('x-circle', 14) + ` 생성 실패: ${error.message || error}`;
                    documentStatus.style.color = '#F44336';
                    documentGenerateBtn.disabled = false;
                  }
                }
              );

              // SSE 모드에서는 여기서 리턴
              return;
            } else if (typeof PDFGeneratorClient !== 'undefined') {
              // 모달 없이 기존 방식 (폴백)
              console.log('generatePDFWithModal 미로드, 기존 방식 사용');

              documentStatus.innerHTML = `${mmIcon('file', 14)} ${pdfAISelection.model}로 PDF 생성 중...`;
              documentStatus.style.color = '#ef4444';

              const pdfClient = new PDFGeneratorClient();
              const startTime = Date.now();

              pdfClient.on('progress', (data) => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                const phaseName = data.phaseName || data.phase?.name || data.detail || '진행 중';
                const progress = data.progress || data.percent || 0;
                documentStatus.innerHTML = `${mmIcon('file', 14)} ${phaseName} (${Math.round(progress)}%) | ${elapsed}초`;
              });

              pdfClient.on('complete', async (data) => {
                const totalTime = Math.floor((Date.now() - startTime) / 1000);
                const pageInfo = data.pageCount ? ` | ${data.pageCount}페이지` : '';
                documentStatus.innerHTML = mmIcon('check-circle', 14) + ` PDF 생성 완료! (${pdfAISelection.model}${pageInfo} | ${totalTime}초 소요)`;
                documentStatus.style.color = '#4CAF50';
                documentGenerateBtn.disabled = false;
                await checkAndUpdateDocumentStatus('pdf', window.selectedNodeId);
              });

              pdfClient.on('error', (error) => {
                console.error('SSE 에러:', error);
                documentStatus.innerHTML = mmIcon('x-circle', 14) + ` PDF 생성 실패: ${error.message}`;
                documentStatus.style.color = '#F44336';
                documentGenerateBtn.disabled = false;
              });

              await pdfClient.generate({
                nodeId: window.selectedNodeId,
                folder: currentFolder,
                template: pdfTemplate?.value || 'default',
                tone: pdfTone?.value || 'professional',
                detailLevel: pdfDetailLevel?.value || 'standard',
                imageSource: pdfImageSource?.value || 'none',
                aiService: pdfAISelection.service,
                aiModel: pdfAISelection.model,
                token: storageToken
              });

              return;
            }
          }

          // Storage Token 가져오기
          const storageToken = await window.MyMind3?.StorageAuth?.getToken();
          if (!storageToken) {
            throw new Error('Storage token not available. Please login first.');
          }

          const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
          const response = await fetch('/api/generate-document', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Storage-Token': storageToken,
              ...csrfHeaders
            },
            credentials: 'include',
            body: JSON.stringify(requestData)
          });

          console.log('Response status:', response.status);

          // 진행 인터벌 정리
          if (requestData._progressInterval) {
            clearInterval(requestData._progressInterval);
          }
          const totalTime = requestData._startTime ? Math.floor((Date.now() - requestData._startTime) / 1000) : 0;

          if (response.ok) {
            const data = await response.json();
            console.log('Document generated:', data);

            // 생성 완료 메시지에 AI 모델 정보 및 소요 시간 포함
            let completeMessage = '문서 생성 완료!';
            if (currentDocumentType === 'PPT' && requestData.useGPT && requestData.treeGenModel) {
              const slideInfo = data.slideCount ? ` | ${data.slideCount}개 슬라이드` : '';
              const timeInfo = totalTime > 0 ? ` | ${totalTime}초 소요` : '';
              completeMessage = `PPT 생성 완료! (${requestData.treeGenModel}${slideInfo}${timeInfo})`;
            }
            documentStatus.textContent = completeMessage;
            documentStatus.style.color = '#4CAF50';  // 성공 시 녹색

            // 문서 상태 업데이트 (파일명 표시 및 다운로드 버튼 활성화) - nodeId 명시적으로 전달
            await checkAndUpdateDocumentStatus(currentDocumentType.toLowerCase(), window.selectedNodeId);
          } else {
            const errorData = await response.json();
            console.error('Generation failed:', errorData);

            // 상세한 에러 메시지 표시
            let errorMessage = errorData.error || '알 수 없는 오류';
            if (errorData.details) {
              errorMessage += ` (${errorData.details})`;
            }
            documentStatus.innerHTML = mmIcon('x-circle', 14) + ` 생성 실패: ${errorMessage}`;
            documentStatus.style.color = '#F44336';  // 실패 시 빨간색

            // 에러 유형별 힌트 제공
            if (errorMessage.includes('empty response')) {
              console.warn('힌트: AI 응답이 비어있음 - 입력 데이터가 너무 크거나 복잡할 수 있음');
            } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
              console.warn('힌트: API 요청 한도 초과 - 잠시 후 다시 시도하세요');
            } else if (errorMessage.includes('model')) {
              console.warn('힌트: 모델 관련 오류 - 다른 AI 모델을 선택해보세요');
            }
          }
        } catch (error) {
          // 진행 인터벌 정리
          if (requestData._progressInterval) {
            clearInterval(requestData._progressInterval);
          }

          console.error('Document generation failed:', error);
          documentStatus.innerHTML = mmIcon('x-circle', 14) + ` 생성 실패: ${error.message}`;
          documentStatus.style.color = '#F44336';

          // 네트워크 에러 처리
          if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            documentStatus.innerHTML = mmIcon('x-circle', 14) + ' 네트워크 오류: 서버 연결 실패';
          }
        } finally {
          documentGenerateBtn.disabled = false;
          // 5초 후 색상 초기화
          setTimeout(() => {
            documentStatus.style.color = '';
          }, 5000);
        }
      });

      // 파일 다운로드 (D 버튼)
      documentDownloadBtn.addEventListener('click', async () => {
        try {
          const currentFolder = getCurrentFolder();
          if (!currentFolder || !window.selectedNodeId) {
            alert(window.i18n?.alertFolderOrNodeNotFound || '폴더 또는 노드를 확인할 수 없습니다.');
            return;
          }

          documentStatus.textContent = t('downloading', '다운로드 중...');
          await downloadDocument(currentDocumentType.toLowerCase());
          documentStatus.textContent = t('downloadComplete', '다운로드 완료!');

          // 팝업은 닫지 않음 - 사용자가 직접 닫을 수 있음
        } catch (error) {
          console.error('Document download failed:', error);
          documentStatus.textContent = `다운로드 실패: ${error.message}`;
        }
      });

      // 현재 폴더 가져오기
      function getCurrentFolder() {
        // 1. currentQAFolder가 설정되어 있으면 그것 사용 (가장 신뢰할 수 있음)
        if (window.currentQAFolder) {
          return window.currentQAFolder;
        }

        // 2. 저장된 currentFolder (생성/로드 시 설정됨)
        const storedFolder = window.MyMind3?.currentFolder || localStorage.getItem('currentFolder');
        if (storedFolder) {
          return storedFolder;
        }

        // 3. 루트 노드의 title에서 폴더명 도출
        const mindMapData = window.MyMind3?.MindMapData?.mindMapData;
        if (mindMapData && mindMapData.length > 0) {
          const rootNode = mindMapData.find(node => node.parentId === null || node.parentId === undefined) || mindMapData[0];
          if (rootNode) {
            return rootNode.title;
          }
        }

        return null;
      }

      // 선택된 노드 내용 가져오기
      function getSelectedNodeContent() {
        const editor = window.editorInstance;
        if (editor) {
          return editor.getHTML();
        }
        return document.getElementById('contentArea')?.innerHTML || '';
      }

      // 선택된 GPT 모델 가져오기
      function getSelectedGPTModel() {
        const modelSelect = document.getElementById('gptModelSelect');
        return modelSelect ? modelSelect.value : 'gpt-4o-mini';
      }

      // 문서 다운로드
      async function downloadDocument(type) {
        const currentFolder = getCurrentFolder();
        if (!currentFolder) {
          throw new Error('현재 폴더를 확인할 수 없습니다.');
        }

        // Storage Token 가져오기
        const storageToken = await window.MyMind3?.StorageAuth?.getToken();
        if (!storageToken) {
          throw new Error('Storage token not available. Please login first.');
        }

        // 파일 존재 확인 및 파일명 조회
        const checkResponse = await fetch(`/api/document-status/${window.selectedNodeId}/${type}?folder=${encodeURIComponent(currentFolder)}`, {
          headers: { 'X-Storage-Token': storageToken },
          credentials: 'include'
        });

        if (!checkResponse.ok) {
          throw new Error('파일이 존재하지 않습니다. 먼저 파일을 생성해주세요.');
        }

        const statusData = await checkResponse.json();
        if (!statusData.exists) {
          throw new Error('파일이 존재하지 않습니다. 먼저 파일을 생성해주세요.');
        }

        // 실제 파일명 (서버에서 반환된 값 사용)
        const fileName = statusData.fileName || `${currentFolder}.${type === 'ppt' ? 'pptx' : 'pdf'}`;
        console.log('Downloading file:', fileName);

        // 직접 URL 다운로드 방식 (토큰을 쿼리 파라미터로 전달)
        const downloadUrl = `/api/download-document/${window.selectedNodeId}/${type}?folder=${encodeURIComponent(currentFolder)}&token=${encodeURIComponent(storageToken)}`;

        console.log('Downloading file:', fileName);

        // <a> 태그를 사용한 다운로드 (iframe 사용 금지)
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.download = fileName;
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        console.log('Download initiated:', fileName);
      }

      // 문서 상태 확인 및 UI 업데이트 (노드 ID만 사용)
      async function checkAndUpdateDocumentStatus(type, nodeId = window.selectedNodeId) {
        try {
          const currentFolder = getCurrentFolder();
          console.log('Checking document status:', { type, nodeId, folder: currentFolder });

          if (!currentFolder) {
            console.error('Cannot get current folder');
            documentStatus.textContent = t('cannotCheckFolder', '현재 폴더를 확인할 수 없습니다.');
            return;
          }

          const storageToken = await window.MyMind3?.StorageAuth?.getToken();
          const response = await fetch(`/api/document-status/${nodeId}/${type}?folder=${encodeURIComponent(currentFolder)}`, {
            headers: storageToken ? { 'X-Storage-Token': storageToken } : {},
            credentials: 'include'
          });
          const data = await response.json();
          console.log('Document status response:', { status: response.status, data });

          const documentFileInfo = document.getElementById('documentFileInfo');
          const documentFileName = document.getElementById('documentFileName');
          const downloadBtn = document.getElementById('documentDownloadBtn');

          if (response.ok && data.exists) {
            // 파일이 존재함
            console.log('Document exists:', data.fileName);
            documentFileName.textContent = data.fileName;
            documentFileInfo.style.display = 'block';

            // 다운로드 버튼 활성화
            downloadBtn.disabled = false;
            downloadBtn.style.opacity = '1';
            downloadBtn.style.cursor = 'pointer';

            documentStatus.textContent = '';
          } else {
            // 파일이 존재하지 않음
            console.log('Document does not exist');
            documentFileInfo.style.display = 'none';

            // 다운로드 버튼 비활성화
            downloadBtn.disabled = true;
            downloadBtn.style.opacity = '0.5';
            downloadBtn.style.cursor = 'not-allowed';

            documentStatus.textContent = data.message || '파일이 아직 생성되지 않았습니다.';
          }
        } catch (error) {
          console.error('문서 상태 확인 실패:', error);
          documentStatus.textContent = t('statusCheckError', '상태 확인 중 오류가 발생했습니다.');
        }
      }
    }

    // 문서 생성 기능 초기화
    setupDocumentGeneration();

    // ===== 세션 관리 기능 =====
    let currentUser = null;

    // 세션 확인
    async function checkSession() {
      try {
        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        });

        if (!response.ok) {
          updateLoginUI(false);
          // 세션이 없으면 자동으로 로그인 팝업 표시
          showLoginPopup();
          return;
        }

        const data = await response.json();

        if (data.authenticated) {
          currentUser = data.userId;
          updateLoginUI(true, data.userId);

          // _xt가 있으면 sessionStorage에 저장 (Google OAuth 등에서 활용)
          if (data._xt) {
            sessionStorage.setItem('_xt', data._xt);
            console.log('[Auth] Session token saved from check');
          }

          // 로그인 상태에서 로컬 API 키 헬스 체크 (백그라운드)
          if (window.verifyLocalApiKeys) {
            window.verifyLocalApiKeys().catch(err => {
              console.error('[API Keys] 헬스 체크 실패:', err);
            });
          }
        } else {
          updateLoginUI(false);
          // 세션이 없으면 _xt도 삭제
          sessionStorage.removeItem('_xt');
          // 세션이 없으면 자동으로 로그인 팝업 표시
          showLoginPopup();
        }
      } catch (error) {
        console.error('세션 확인 실패:', error);
        updateLoginUI(false);
        // 세션 확인 실패 시에도 로그인 팝업 표시
        showLoginPopup();
      }
    }

    // 로그인 UI 업데이트
    function updateLoginUI(isLoggedIn, username = null) {
      const logoutBtn = document.getElementById('logoutBtn');
      const userDisplay = document.getElementById('currentUserDisplay');
      const userNamePart = document.getElementById('userNamePart');
      const creditPart = document.getElementById('creditPart');
      const etcMenuContainer = document.getElementById('etcMenuContainer');

      if (isLoggedIn && username) {
        if (logoutBtn) logoutBtn.style.display = 'block';
        if (etcMenuContainer) etcMenuContainer.style.display = 'block';
        if (userDisplay) {
          userDisplay.style.display = 'block';

          // 사용자 이름 표시
          if (userNamePart) {
            userNamePart.textContent = `${username}`;
          }

          // 잔여 크레딧 표시 (서버에서 실시간 조회)
          // 형식: 아이디(크레딧C) - 크레딧과 C는 굵은 글씨, 쉼표 없음
          if (creditPart) {
            // 서버에서 실시간 크레딧 잔액 조회
            getCreditBalance().then(balance => {
              if (balance && balance.credits) {
                updateCreditBalanceUI(balance.credits);
              } else {
                // 서버 조회 실패 시 localStorage 폴백
                const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
                if (subscription.isSubscribed && subscription.credits) {
                  const totalCredits = subscription.credits.total || 0;
                  creditPart.innerHTML = totalCredits > 0 ? `(<b>${Math.floor(totalCredits)}C</b>)` : '';
                } else {
                  creditPart.innerHTML = '';
                }
              }
            }).catch(() => {
              creditPart.innerHTML = '';
            });
          }

          userDisplay.onclick = () => {
            showSettingsLayerPopup();
          };
        }
      } else {
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (etcMenuContainer) etcMenuContainer.style.display = 'none';
        if (userDisplay) {
          userDisplay.style.display = 'none';
          // textContent 삭제하지 말고 개별 요소들만 비우기
          if (userNamePart) userNamePart.textContent = '';
          if (creditPart) creditPart.textContent = '';
          userDisplay.onclick = null;
        }
      }
    }

    // ========================================
    // YouTube Text Extraction Popup Functions
    // ========================================

    // YouTube 팝업 표시
    function showYoutubeExtractPopup() {
      const overlay = document.getElementById('youtubeExtractOverlay');
      const popup = document.getElementById('youtubeExtractPopup');

      if (overlay && popup) {
        overlay.classList.add('show');
        popup.classList.add('show');
        document.body.style.overflow = 'hidden';

        // 초기화
        document.getElementById('youtubeUrlInput').value = '';
        document.getElementById('youtubeExtractProgress').style.display = 'none';
        document.getElementById('youtubeExtractResult').style.display = 'none';
        document.getElementById('youtubeExtractBtn').disabled = false;
        document.querySelector('#youtubeExtractBtn .btn-text').style.display = 'inline';
        document.querySelector('#youtubeExtractBtn .btn-loading').style.display = 'none';
      }
    }

    // YouTube 팝업 닫기
    function hideYoutubeExtractPopup() {
      const overlay = document.getElementById('youtubeExtractOverlay');
      const popup = document.getElementById('youtubeExtractPopup');

      if (overlay && popup) {
        overlay.classList.remove('show');
        popup.classList.remove('show');
        document.body.style.overflow = '';
      }
    }

    // YouTube 텍스트 추출 처리
    async function handleYoutubeExtract() {
      const urlInput = document.getElementById('youtubeUrlInput');
      const extractBtn = document.getElementById('youtubeExtractBtn');
      const progressDiv = document.getElementById('youtubeExtractProgress');
      const progressFill = progressDiv.querySelector('.progress-fill');
      const progressText = progressDiv.querySelector('.progress-text');
      const resultDiv = document.getElementById('youtubeExtractResult');
      const resultContent = document.getElementById('youtubeResultContent');

      const url = urlInput.value.trim();

      // URL 유효성 검사
      if (!url) {
        showToast(window.i18n?.toastEnterYoutubeUrl || 'YouTube URL을 입력해주세요.', 'warning');
        return;
      }

      // YouTube URL 형식 검사
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[\w-]+/;
      if (!youtubeRegex.test(url)) {
        showToast(window.i18n?.toastInvalidYoutubeUrl || '올바른 YouTube URL을 입력해주세요.', 'warning');
        return;
      }

      // UI 상태 변경
      extractBtn.disabled = true;
      extractBtn.querySelector('.btn-text').style.display = 'none';
      extractBtn.querySelector('.btn-loading').style.display = 'inline';
      progressDiv.style.display = 'block';
      resultDiv.style.display = 'none';
      progressFill.style.width = '0%';
      progressText.textContent = t('audioDownloading', '오디오 다운로드 중...');

      try {
        // 진행 상태 시뮬레이션
        let progress = 0;
        const progressInterval = setInterval(() => {
          if (progress < 90) {
            progress += Math.random() * 10;
            progressFill.style.width = Math.min(progress, 90) + '%';
          }
        }, 500);

        // 서버 API 호출
        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
        const response = await fetch('/api/ai/youtube-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include',
          body: JSON.stringify({ url })
        });

        clearInterval(progressInterval);

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || '텍스트 추출에 실패했습니다.');
        }

        // 성공
        progressFill.style.width = '100%';
        progressText.textContent = t('complete', '완료!');

        setTimeout(() => {
          progressDiv.style.display = 'none';
          resultDiv.style.display = 'block';
          resultContent.textContent = data.text || '(추출된 텍스트 없음)';
          // 영상 제목을 data 속성에 저장 (노드만들기에서 사용)
          resultContent.dataset.videoTitle = data.videoTitle || 'YouTube 추출';
        }, 500);

        showToast(window.i18n?.toastExtractionComplete || '텍스트 추출이 완료되었습니다.', 'success');

      } catch (error) {
        console.error('YouTube 텍스트 추출 오류:', error);
        progressDiv.style.display = 'none';
        showToast(error.message || '텍스트 추출 중 오류가 발생했습니다.', 'error');
      } finally {
        extractBtn.disabled = false;
        extractBtn.querySelector('.btn-text').style.display = 'inline';
        extractBtn.querySelector('.btn-loading').style.display = 'none';
      }
    }

    // YouTube 결과 복사
    function copyYoutubeResult() {
      const resultContent = document.getElementById('youtubeResultContent');
      const text = resultContent.textContent;

      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          showToast(window.i18n?.toastCopiedToClipboard || '클립보드에 복사되었습니다.', 'success');
        }).catch(() => {
          showToast(window.i18n?.toastCopyFailed || '복사에 실패했습니다.', 'error');
        });
      }
    }

    // YouTube 추출 결과로 노드 생성
    async function createNodeFromYoutubeText() {
      const resultContent = document.getElementById('youtubeResultContent');
      const extractedText = resultContent?.textContent || '';
      const videoTitle = resultContent?.dataset.videoTitle || 'YouTube 추출';

      if (!extractedText.trim() || extractedText === '(추출된 텍스트 없음)') {
        showToast(window.i18n?.toastNoExtractedText || '추출된 텍스트가 없습니다.', 'warning');
        return;
      }

      // 루트 노드 존재 여부 확인
      const rootNodeCount = window.MyMind3?.MindMapData?.mindMapData?.length || 0;
      if (rootNodeCount >= 1) {
        showToast(window.i18n?.toastRootNodeExists || '이미 루트 노드가 존재합니다. 먼저 초기화하거나 기존 맵에 추가하세요.', 'warning');
        return;
      }

      // 버튼 비활성화
      const createNodeBtn = document.getElementById('youtubeCreateNodeBtn');
      if (createNodeBtn) {
        createNodeBtn.disabled = true;
        createNodeBtn.textContent = t('creating', '생성 중...');
      }

      try {
        // 1. 메인 노드 생성
        const rootNode = window.MyMind3.MindMapData.createMainTitle(videoTitle);

        if (!rootNode) {
          showToast(window.i18n?.toastNodeCreateFailed || '노드 생성에 실패했습니다.', 'error');
          return;
        }

        // 2. 노드 콘텐츠 설정 (제목 + 본문)
        const htmlContent = `<h2>${videoTitle}</h2>\n<p>${extractedText.replace(/\n\n/g, '</p>\n<p>').replace(/\n/g, '<br>')}</p>`;
        rootNode.content = htmlContent;

        // 3. 폴더명 설정 (제목만 사용)
        const folderName = videoTitle.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);

        // 4. 서버에 노드 콘텐츠 저장
        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
        const nodeResponse = await fetch('/api/savenode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include',
          body: JSON.stringify({
            folder: folderName,
            nodeId: rootNode.nodeId || String(rootNode.id),
            content: htmlContent,
            nodeName: rootNode.title || ''  // 서버에서 title[nodeId].html 파일명에 사용
          })
        });

        if (!nodeResponse.ok) {
          throw new Error('노드 콘텐츠 저장 실패');
        }

        // 5. 마인드맵 JSON 저장 (중요!)
        const mindMapData = window.MyMind3?.MindMapData?.mindMapData || [];
        const jsonResponse = await fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include',
          body: JSON.stringify({
            folderName: folderName,
            data: {
              mindMapData: mindMapData,
              metadata: {
                createdAt: new Date().toISOString(),
                modifiedAt: new Date().toISOString(),
                source: 'youtube-extract'
              }
            }
          })
        });

        if (jsonResponse.ok) {
          console.log(`[YouTube → Node] 노드 및 JSON 저장 완료: ${rootNode.id}`);

          // 6. 폴더명 전역 변수 설정
          window.currentQAFolder = folderName;
          if (!window.MyMind3) window.MyMind3 = {};
          window.MyMind3.currentFolder = folderName;
          localStorage.setItem('currentFolder', folderName);

          // 7. 에디터에 콘텐츠 설정
          window.MyMind3.MindMapData.currentEditingNodeId = rootNode.id;
          if (window.toastEditor?.getEditor) {
            const editor = window.toastEditor.getEditor();
            if (editor) {
              editor.setHTML(htmlContent);
            }
          }

          // 8. YouTube 팝업 닫기
          hideYoutubeExtractPopup();

          // 9. 마인드맵 렌더링
          window.MyMind3.NodeRenderer.renderMindMap();

          // 10. 버튼 상태 업데이트
          updateMainAddButtonState();
          updateSaveButtonState();
          if (typeof window.updateTreeGenButtonState === 'function') {
            window.updateTreeGenButtonState();
          }
          updateResponsePanelButtonState();

          showToast(window.i18n?.youtubeNodeCreated || 'YouTube 텍스트로 노드가 생성되었습니다.', 'success');
        } else {
          throw new Error('JSON 저장 실패');
        }
      } catch (error) {
        console.error('[YouTube → Node] 오류:', error);
        showToast(window.i18n?.toastNodeCreateError || '노드 생성 중 오류가 발생했습니다.', 'error');
      } finally {
        // 버튼 복원
        if (createNodeBtn) {
          createNodeBtn.disabled = false;
          createNodeBtn.textContent = t('createNode', '노드만들기');
        }
      }
    }

    // YouTube 팝업 이벤트 리스너 초기화
    function initYoutubeExtractPopup() {
      const closeBtn = document.getElementById('youtubeExtractCloseBtn');
      const overlay = document.getElementById('youtubeExtractOverlay');
      const extractBtn = document.getElementById('youtubeExtractBtn');
      const copyBtn = document.getElementById('youtubeResultCopyBtn');
      const urlInput = document.getElementById('youtubeUrlInput');

      if (closeBtn) {
        closeBtn.addEventListener('click', hideYoutubeExtractPopup);
      }

      if (overlay) {
        overlay.addEventListener('click', hideYoutubeExtractPopup);
      }

      if (extractBtn) {
        extractBtn.addEventListener('click', handleYoutubeExtract);
      }

      if (copyBtn) {
        copyBtn.addEventListener('click', copyYoutubeResult);
      }

      // 노드만들기 버튼 이벤트 리스너
      const createNodeBtn = document.getElementById('youtubeCreateNodeBtn');
      if (createNodeBtn) {
        createNodeBtn.addEventListener('click', createNodeFromYoutubeText);
      }

      if (urlInput) {
        urlInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            handleYoutubeExtract();
          }
        });
      }
    }

    // 페이지 로드 시 초기화
    document.addEventListener('DOMContentLoaded', initYoutubeExtractPopup);

    // Settings 레이어 팝업 표시 (iframe 사용 금지 - AJAX로 콘텐츠 로드)
    async function showSettingsLayerPopup(hash = '') {
      const overlay = document.getElementById('settingsLayerOverlay');
      const popup = document.getElementById('settingsLayerPopup');
      const content = document.getElementById('settingsLayerContent');

      if (overlay && popup && content) {
        // 로딩 표시
        content.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100%; font-size:18px; color:#666;">${t('loadingText', '로딩 중...')}</div>`;
        overlay.style.display = 'block';
        popup.style.display = 'block';
        document.body.style.overflow = 'hidden'; // 배경 스크롤 방지

        try {
          // AJAX로 settings.html 콘텐츠 로드
          const response = await fetch('/settings.html', { cache: 'no-store' });
          const html = await response.text();

          // HTML 파싱하여 body 내용만 추출
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');

          // head의 스타일시트 링크 추출 및 적용
          const styleLinks = doc.querySelectorAll('link[rel="stylesheet"]');
          styleLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && !document.querySelector(`link[href="${href}"]`)) {
              const newLink = document.createElement('link');
              newLink.rel = 'stylesheet';
              newLink.href = href;
              document.head.appendChild(newLink);
            }
          });

          // body 콘텐츠 삽입
          const bodyContent = doc.body.innerHTML;
          content.innerHTML = bodyContent;

          // data-icon 속성 → SVG 아이콘 변환
          if (window.mmInitDataIcons) {
            window.mmInitDataIcons();
          }

          // 초기화 플래그 리셋 (매번 새로 초기화되도록)
          window.settingsInitialized = false;

          // i18n: 현재 언어 파일만 동적 로드 (103개 전체 로드 대신)
          const settings = JSON.parse(localStorage.getItem('mymind3_settings') || '{}');
          const currentLang = settings.appLanguage || 'ko';

          // loadLanguageFile 함수가 없으면 정의
          if (!window.loadLanguageFile) {
            window.loadLanguageFile = function(lang) {
              return new Promise((resolve, reject) => {
                const langVarName = lang.replace(/-/g, '');
                if (window[`i18n_${langVarName}`]) {
                  resolve();
                  return;
                }
                const script = document.createElement('script');
                script.src = `/js/i18n/${lang}.js`;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error(`Failed to load ${lang}.js`));
                document.head.appendChild(script);
              });
            };
          }

          // 현재 언어 파일 로드
          await window.loadLanguageFile(currentLang);
          // 폴백용 영어도 로드
          if (currentLang !== 'en') {
            await window.loadLanguageFile('en');
          }
          console.log(`[Settings Popup] Language loaded: ${currentLang}`);

          // settings 관련 모든 스크립트를 순서대로 로드
          // settings-payment.js, settings-core.js, settings-ai.js가 먼저 로드되어야 함
          // settings-admin.js는 settings.js보다 먼저 로드되어야 함 (initSettingsAll에서 사용)
          const settingsScriptOrder = [
            'settings-core.js',
            'settings-env.js',
            'settings-payment.js',
            'settings-ai.js',
            'settings-drive.js',
            'settings-feature.js',
            'settings-2fa.js',
            'settings-admin.js',
            'settings-tools.js',
            'settings-board-admin.js',
            'settings-board.js',
            'settings-access-keys.js',
            'settings.js'
          ];

          // initSettingsPayment가 정의되지 않았으면 스크립트 새로 로드
          const needsReload = typeof window.initSettingsPayment !== 'function';
          console.log('[Settings Popup] needsReload:', needsReload);

          if (needsReload) {
            for (const scriptName of settingsScriptOrder) {
              const scriptEl = doc.querySelector(`script[src*="${scriptName}"]`);
              if (scriptEl) {
                const src = scriptEl.getAttribute('src');
                // 기존 스크립트 태그 제거 (캐시 문제 방지)
                const existingScripts = document.querySelectorAll(`script[src*="${scriptName}"]`);
                existingScripts.forEach(s => s.remove());
                // 새로 로드
                await loadScriptFresh(src);
                console.log(`[Settings Popup] Loaded: ${scriptName}`);
              }
            }
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          // Settings 초기화 또는 이벤트 리스너 재설정
          console.log('[Settings Popup] initSettings:', typeof window.initSettings);
          console.log('[Settings Popup] initSettingsEventListeners:', typeof window.initSettingsEventListeners);

          // 팝업 컨텐츠의 nav-item에 직접 이벤트 리스너 추가
          const navItems = content.querySelectorAll('.nav-item');
          navItems.forEach(item => {
            item.addEventListener('click', function(event) {
              const clickedItem = event.currentTarget;
              const menuName = clickedItem.getAttribute('data-menu');
              if (!menuName) return;

              // 모든 nav-item에서 active 제거
              content.querySelectorAll('.nav-item').forEach(ni => ni.classList.remove('active'));
              // 클릭된 항목에 active 추가
              clickedItem.classList.add('active');

              // 모든 content-section 숨기기
              content.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
              // 해당 섹션 표시
              const targetSection = content.querySelector(`#content-${menuName}`);
              if (targetSection) {
                targetSection.classList.add('active');
              }
            });
          });
          console.log('[Settings Popup] nav-item 이벤트 리스너 설정 완료:', navItems.length);

          // initSettingsAll 호출 (있으면)
          if (typeof window.initSettingsAll === 'function') {
            await window.initSettingsAll();
          } else if (typeof window.initSettings === 'function') {
            window.initSettings();
          }

          // hash가 있으면 해당 메뉴로 이동
          if (hash) {
            const menuName = hash.replace('#', '');
            const menuItem = content.querySelector(`[data-menu="${menuName}"]`);
            if (menuItem) {
              menuItem.click();
            }
          }
        } catch (error) {
          console.error('Settings 로드 실패:', error);
          content.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100%; font-size:18px; color:#f44336;">${t('settingsLoadFail', 'Settings 로드에 실패했습니다.')}</div>`;
        }
      }
    }

    // 스크립트 동적 로드 헬퍼 (기존 스크립트 있으면 스킵)
    function loadScript(src, forceReload = false) {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing && !forceReload) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    }

    // 스크립트 강제 새로고침 로드 (캐시 버스팅)
    function loadScriptFresh(src) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        // 캐시 버스팅을 위한 타임스탬프 추가
        script.src = src + (src.includes('?') ? '&' : '?') + '_t=' + Date.now();
        script.onload = () => {
          console.log('[loadScriptFresh] Loaded:', src);
          resolve();
        };
        script.onerror = (err) => {
          console.error('[loadScriptFresh] Failed:', src, err);
          reject(err);
        };
        document.body.appendChild(script);
      });
    }

    // Settings 레이어 팝업 닫기
    function hideSettingsLayerPopup() {
      const overlay = document.getElementById('settingsLayerOverlay');
      const popup = document.getElementById('settingsLayerPopup');
      const content = document.getElementById('settingsLayerContent');

      if (overlay && popup && content) {
        overlay.style.display = 'none';
        popup.style.display = 'none';
        content.innerHTML = ''; // 콘텐츠 정리
        document.body.style.overflow = ''; // 배경 스크롤 복원

        // Settings에서 변경된 API 키 다시 로드
        if (window.MyMindAI && window.MyMindAI.reloadApiKeys) {
          window.MyMindAI.reloadApiKeys();
        }

        // 사용자 표시 업데이트 (크레딧 변경 반영)
        if (typeof updateUserDisplay === 'function') {
          updateUserDisplay();
        }
      }
    }

    // Settings 레이어 팝업 이벤트 설정
    function setupSettingsLayerPopup() {
      const overlay = document.getElementById('settingsLayerOverlay');
      const closeBtn = document.getElementById('settingsLayerCloseBtn');

      // 오버레이 클릭 시 닫기
      if (overlay) {
        overlay.addEventListener('click', hideSettingsLayerPopup);
      }

      // 닫기 버튼 클릭
      if (closeBtn) {
        closeBtn.addEventListener('click', hideSettingsLayerPopup);
      }

      // ESC 키로 닫기
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          const popup = document.getElementById('settingsLayerPopup');
          if (popup && popup.style.display === 'block') {
            hideSettingsLayerPopup();
          }
        }
      });
    }

    // 미인증 시 /login 페이지로 리다이렉트
    function showLoginPopup() {
      window.location.href = '/login';
    }

    // 로그아웃 처리
    async function handleLogout() {
      if (!confirm(window.i18n?.logoutConfirm || '로그아웃 하시겠습니까?')) {
        return;
      }

      try {
        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};

        const response = await fetch('/api/auth/logout', {
          method: 'POST',

              headers: { ...csrfHeaders },
          credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && data.success) {
          currentUser = null;
          updateLoginUI(false);

          // _xt 삭제 + 구독/크레딧 캐시 제거
          sessionStorage.removeItem('_xt');
          localStorage.removeItem('mymind3_subscription');
          localStorage.removeItem('aiSettings');
          if (window.ApiCache) {
            window.ApiCache.invalidate('/api/credits/balance');
          }
          console.log('[Auth] Session token and subscription cache removed');

          // CSRF 토큰 정리 (세션 파괴로 기존 토큰 무효)
          if (window.csrfUtils) {
            window.csrfUtils.clearCsrfToken();
          }

          showToast(window.i18n?.toastLogoutSuccess || '로그아웃 되었습니다.', 'info');

          // 로그아웃 후 로그인 페이지로 이동
          setTimeout(() => {
            window.location.href = '/login';
          }, 500);
        }
      } catch (error) {
        console.error('로그아웃 오류:', error);
        showToast(window.i18n?.toastLogoutError || '로그아웃 중 오류가 발생했습니다.', 'error');
      }
    }

    // 이벤트 리스너 등록
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }

    // 기타 메뉴 드롭다운 이벤트 핸들러
    const etcMenuBtn = document.getElementById('etcMenuBtn');
    const etcMenuDropdown = document.getElementById('etcMenuDropdown');

    if (etcMenuBtn && etcMenuDropdown) {
      // 기타 버튼 클릭 시 드롭다운 토글
      etcMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        etcMenuDropdown.classList.toggle('show');
      });

      // 메뉴 아이템 클릭 핸들러
      etcMenuDropdown.addEventListener('click', (e) => {
        const menuItem = e.target.closest('.etc-menu-item');
        if (menuItem) {
          const menuNumber = menuItem.dataset.menu;
          etcMenuDropdown.classList.remove('show');

          // 메뉴별 기능 처리
          if (menuNumber === '1') {
            // YouTube Link Text 추출
            showYoutubeExtractPopup();
          } else {
            showToast(`메뉴${menuNumber} 클릭됨 (기능 구현 예정)`, 'info');
          }
        }
      });

      // 드롭다운 외부 클릭 시 닫기
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.etc-menu-container')) {
          etcMenuDropdown.classList.remove('show');
        }
      });
    }

    // 로그인 팝업 삭제됨: /login 페이지 사용

    // 페이지 로드 시 세션 확인 - auth-check.js에서 처리 (중복 호출 제거)
    // checkSession();

    // ==================== 다국어 지원 (i18n) ====================

    /**
     * 언어 파일 로드 함수
     */
    function loadLanguageFile(lang) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `/js/i18n/${lang}.js`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${lang}.js`));
        document.head.appendChild(script);
      });
    }

    /**
     * 페이지에 언어 적용
     */
    function applyLanguage() {
      const settings = JSON.parse(localStorage.getItem('mymind3_settings') || '{}');
      const currentLang = settings.appLanguage || 'ko';

      // ============================================
      // Phase 1-1: HTML lang 및 dir 속성 동적 변경
      // ============================================

      // HTML lang 속성 업데이트
      document.documentElement.setAttribute('lang', currentLang);

      // RTL (Right-to-Left) 언어 리스트
      const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];
      const isRTL = RTL_LANGUAGES.includes(currentLang);

      // HTML dir 속성 업데이트
      document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');

      console.log(`[MyMind3] Language: ${currentLang}, Direction: ${isRTL ? 'RTL' : 'LTR'}`);

      // ============================================

      // 언어 코드를 변수명으로 변환 (zh-CN -> zhCN)
      const langVarName = currentLang.replace(/-/g, '');
      const langObj = window[`i18n_${langVarName}`];

      if (!langObj) {
        console.warn(`Language file for "${currentLang}" not found. Using default text.`);
        return;
      }

      // 현재 언어 객체를 window.i18n에 설정 (JavaScript에서 동적 텍스트 사용을 위해)
      window.i18n = langObj;

      // data-i18n 속성이 있는 모든 요소 찾기
      const elements = document.querySelectorAll('[data-i18n]');
      elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (langObj[key]) {
          el.textContent = langObj[key];
        }
      });

      // data-i18n-placeholder 속성 처리 (input placeholder)
      const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
      placeholderElements.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (langObj[key]) {
          el.placeholder = langObj[key];
        }
      });

      // data-i18n-title 속성 처리 (title 또는 data-tooltip 속성)
      const titleElements = document.querySelectorAll('[data-i18n-title]');
      titleElements.forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (langObj[key]) {
          // has-tooltip 클래스가 있으면 data-tooltip 사용 (CSS 커스텀 툴팁)
          // 그렇지 않으면 title 사용 (브라우저 기본 툴팁)
          if (el.classList.contains('has-tooltip')) {
            el.dataset.tooltip = langObj[key];
            // title 속성이 있으면 제거 (더블 툴팁 방지)
            if (el.hasAttribute('title')) {
              el.removeAttribute('title');
            }
          } else {
            el.title = langObj[key];
          }
        }
      });
    }

    /**
     * 언어 파일 로드 및 적용
     */
    async function initializeLanguage() {
      try {
        const settings = JSON.parse(localStorage.getItem('mymind3_settings') || '{}');
        const currentLang = settings.appLanguage || 'ko';

        // 현재 선택된 언어 파일 로드
        await loadLanguageFile(currentLang);

        // 영어 파일도 로드 (fallback용)
        if (currentLang !== 'en') {
          await loadLanguageFile('en');
        }

        // 언어 적용
        applyLanguage();

        console.log(`Language initialized: ${currentLang}`);
      } catch (error) {
        console.error('Failed to initialize language:', error);
      }
    }

    // 설정 변경 이벤트 리스너 (설정 페이지에서 언어 변경 시)
    window.addEventListener('settingsChanged', async (event) => {
      try {
        const settings = JSON.parse(localStorage.getItem('mymind3_settings') || '{}');
        const newLang = settings.appLanguage || 'ko';

        // 새로운 언어 파일이 로드되지 않았다면 로드
        if (!window[`i18n_${newLang}`]) {
          await loadLanguageFile(newLang);
        }

        // 언어 적용
        applyLanguage();
      } catch (error) {
        console.error('Failed to apply language change:', error);
      }
    });

    // 페이지 로드 시 언어 초기화
    initializeLanguage();

