/**
 * MyMind3 Simple Application
 * Based on working patterns from MyMind2
 */

// 마인드맵 폴더 잠금 관리 (localStorage 기반)
window.MyMind3 = window.MyMind3 || {};
window.MyMind3.FolderLock = {
  _storageKey: 'mymind3_locked_folders',

  _getLockedSet() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  },

  _saveLockedSet(set) {
    localStorage.setItem(this._storageKey, JSON.stringify([...set]));
  },

  isLocked(folder) {
    return this._getLockedSet().has(folder);
  },

  toggleLock(folder) {
    const set = this._getLockedSet();
    if (set.has(folder)) {
      set.delete(folder);
    } else {
      set.add(folder);
    }
    this._saveLockedSet(set);
    return set.has(folder);
  }
};

// 읽기 전용 플래그 초기화
window.MyMind3.isReadOnly = false;

// Simple global object pattern like MyMind2
window.MyMind3Simple = {
  // Application state
  data: {
    mindMapData: [],
    nextNodeId: 1,
    currentParentId: null,
    previousSelectedNodeId: null,
    currentEditingNodeId: null
  },

  // AI 응답 컨테이너 HTML 템플릿
  _aiContainersTemplate: `
    <div class="ai-response-container" id="gptResponse" data-service="gpt"></div>
    <div class="ai-response-container" id="grokResponse" data-service="grok" style="display: none;"></div>
    <div class="ai-response-container" id="claudeResponse" data-service="claude" style="display: none;"></div>
    <div class="ai-response-container" id="geminiResponse" data-service="gemini" style="display: none;"></div>
    <div class="ai-response-container" id="localResponse" data-service="local" style="display: none;"></div>
  `,

  // AI 응답 컨테이너 재생성 (다중 AI 모드에서 필요)
  ensureAIContainers: function() {
    const llmResponse = document.getElementById('llmResponse');
    if (!llmResponse) return;

    // gptResponse가 없으면 AI 컨테이너들 재생성
    if (!document.getElementById('gptResponse')) {
      console.log('[AI] Recreating AI response containers');
      llmResponse.insertAdjacentHTML('beforeend', this._aiContainersTemplate);
    }
  },

  // UI state
  ui: {
    leftPanelOpen: true,
    rightPanelOpen: true,
    currentTool: 'select',
    activeTab: 'editor'
  },

  // Initialize the application
  init: function() {
    try {
      console.log('Initializing MyMind3Simple...');

      // Initialize data
      this.data.mindMapData = [];
      this.data.nextNodeId = 1;

      // Setup event listeners
      this.setupEventListeners();

      // Initialize basic mind map
      this.renderMindmap();

      console.log('MyMind3Simple initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize MyMind3Simple:', error);
      return false;
    }
  },

  // Setup basic event listeners
  setupEventListeners: function() {
    // Navigation buttons
    const navButtons = document.querySelectorAll('[data-action]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleNavAction(action);
      });
    });

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Tool selection
    const toolButtons = document.querySelectorAll('[data-tool]');
    toolButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tool = e.currentTarget.dataset.tool;
        this.selectTool(tool);
      });
    });

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    console.log('Event listeners setup complete');
  },

  // Handle navigation actions
  handleNavAction: function(action) {
    console.log('Navigation action:', action);

    switch (action) {
      case 'new':
        this.createNewMindmap();
        break;
      case 'open':
        this.openMindmap();
        break;
      case 'save':
        this.saveMindmap();
        break;
      case 'export':
        this.exportMindmap();
        break;
      default:
        console.log('Unknown action:', action);
    }
  },

  // Switch tabs
  switchTab: function(tab) {
    console.log('Switching to tab:', tab);

    // Update UI state
    this.ui.activeTab = tab;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tab === tab) {
        btn.classList.add('active');
      }
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.style.display = content.dataset.tabContent === tab ? 'block' : 'none';
    });
  },

  // Select tool
  selectTool: function(tool) {
    console.log('Selecting tool:', tool);

    // Update UI state
    this.ui.currentTool = tool;

    // Update tool buttons
    document.querySelectorAll('[data-tool]').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.tool === tool) {
        btn.classList.add('active');
      }
    });
  },

  // Toggle theme
  toggleTheme: function() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme') || 'default';
    const newTheme = currentTheme === 'default' ? 'dark' : 'default';

    body.setAttribute('data-theme', newTheme);

    // Update theme stylesheet
    const themeLink = document.getElementById('theme-stylesheet');
    if (themeLink) {
      themeLink.href = `/css/themes/${newTheme}.css`;
    }

    console.log('Theme changed to:', newTheme);
  },

  // Create new mind map
  createNewMindmap: async function() {
    console.log('Creating new mindmap...');

    // Check if MyMind3 modules are available
    if (!window.MyMind3 || !window.MyMind3.MindMapData) {
      console.error('MyMind3 modules not loaded');
      this.showStatus('Mind map engine not ready', 'error');
      return;
    }

    // Get title from user
    const title = prompt('Enter a title for your new mind map:', 'My Mind Map');
    if (!title) {
      return; // User cancelled
    }

    // Reset data
    window.MyMind3.MindMapData.initialize();

    // 새 마인드맵 생성 시 기존 폴더 설정 초기화 (새 폴더에 저장되도록)
    window.currentQAFolder = null;
    if (window.MyMind3) {
      window.MyMind3.currentFolder = null;
    }
    localStorage.removeItem('currentFolder');
    console.log('[createNewMindmap] Cleared previous folder settings for new mindmap');

    // Create root node
    const rootNode = window.MyMind3.MindMapData.createMainTitle(title);
    if (rootNode) {
      // Set initial content with title + enter + enter
      const initialContent = `<h2>${title}</h2><p><br></p><p><br></p>`;
      // content 필드는 더 이상 JSON에 저장하지 않음 - HTML 파일만 사용
      // rootNode.content = initialContent;  // 삭제됨

      console.log(`[createNewMindmap] Creating empty HTML file for root node ${rootNode.id}`);

      // 루트 노드의 빈 HTML 파일을 즉시 생성 (nodeId 기반 폴더명 사용)
      try {
        const folderName = title || rootNode.nodeId || String(rootNode.id);

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
          console.log(`[createNewMindmap] Empty HTML file created for root node ${rootNode.id}`);

          // 새 마인드맵이므로 항상 새 폴더명으로 설정
          window.currentQAFolder = folderName;
          if (!window.MyMind3) window.MyMind3 = {};
          window.MyMind3.currentFolder = folderName;
          localStorage.setItem('currentFolder', folderName);
          console.log(`[createNewMindmap] Current folder set to: ${folderName}`);

          // 메인 추가로 새 마인드맵 생성 후 노드재구성 버튼 상태 업데이트
          if (typeof window.updateTreeGenButtonState === 'function') {
            window.updateTreeGenButtonState();
          }

          // 응답 패널 버튼 상태 업데이트 (전송, 삭제, 파일첨부)
          if (typeof window.updateResponsePanelButtonState === 'function') {
            window.updateResponsePanelButtonState();
          }
        } else {
          console.warn(`[createNewMindmap] Failed to create HTML file for root node ${rootNode.id}`);
        }
      } catch (error) {
        console.error('[createNewMindmap] Error creating HTML file:', error);
      }

      // Update currentEditingNodeId before rendering
      if (window.MyMind3 && window.MyMind3.MindMapData) {
        window.MyMind3.MindMapData.currentEditingNodeId = rootNode.id;
      }


      // Render the new mind map
      this.renderMindmap();

      // Update project name
      const projectInput = document.getElementById('project-name');
      if (projectInput) {
        projectInput.value = title;
      }

      // Select the node after rendering - FIX: selectNode 호출로 에디터 초기화
      // 비동기 타이밍 수정: setTimeout 대신 requestAnimationFrame + Promise 사용
      requestAnimationFrame(async () => {
        try {
          if (window.MyMind3.NodeRenderer && window.MyMind3.NodeRenderer.selectNode) {
            await window.MyMind3.NodeRenderer.selectNode(rootNode.id);
            console.log(`[createNewMindmap] Node ${rootNode.id} auto-selected after creation`);
          } else {
            // 폴백: NodeRenderer가 없으면 기본 CSS 클래스만 추가
            const nodeElement = document.querySelector(`[data-id="${rootNode.id}"]`);
            if (nodeElement) {
              nodeElement.classList.add('selected');
            }
          }

          // Auto-save (selectNode 완료 후 실행)
          if (window.autoSaveMindMap) {
            await window.autoSaveMindMap();
          }
        } catch (error) {
          console.error('[createNewMindmap] selectNode 또는 autoSave 오류:', error);
        }
      });

      this.showStatus(`New mind map "${title}" created`);

      // 마인드맵 생성 완료 이벤트 발생 (새 트리 버튼 상태 업데이트용)
      const createdFolder = window.MyMind3.currentFolder || title;
      window.dispatchEvent(new CustomEvent('mindmapLoaded', { detail: { folderName: createdFolder } }));
    } else {
      this.showStatus('Failed to create new mind map', 'error');
    }
  },

  // Save mind map
  saveMindmap: async function() {
    // 읽기 전용 모드 체크
    if (window.MyMind3.isReadOnly) {
      console.log('[saveMindmap] 읽기 전용 모드 - 저장 차단');
      if (typeof window.showToast === 'function') {
        window.showToast(t('readOnlyNoSave', '읽기 전용 모드에서는 저장할 수 없습니다'), 'warning', 2000);
      }
      return;
    }
    console.log('Saving mindmap...');

    try {
      if (!window.MyMind3 || !window.MyMind3.MindMapData) {
        alert('Mind map engine not ready');
        return;
      }

      // Show folder selection popup
      this.showSaveFolderPopup();
    } catch (error) {
      console.error('Error saving mindmap:', error);
      alert('Failed to save mind map: ' + error.message);
    }
  },

  // Show save folder popup
  showSaveFolderPopup: async function() {
    const popup = document.getElementById('saveFolderPopup');
    const overlay = document.getElementById('saveFolderOverlay');
    const folderList = document.getElementById('saveFolderList');
    const folderInput = document.getElementById('saveFolderNameInput');

    // 제목만 표시 (nodeId 부분은 저장 시 자동 추가)
    const mindMapData = window.MyMind3.MindMapData.mindMapData;
    if (mindMapData && mindMapData.length > 0) {
      folderInput.value = mindMapData[0].title || '';
    }

    // Load existing folders
    try {
      const response = await fetch('/api/savelist', {
        credentials: 'include'
      });

      // response.ok 체크 추가
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 폴더 목록 로드 실패`);
      }

      const data = await response.json();

      const folders = data.folders || [];
      folderList.innerHTML = '';
      folders.forEach(item => {
        const li = document.createElement('li');
        // {folder, title} 객체 또는 레거시 문자열 지원
        const displayName = item.title || item.folder || item;
        const folderValue = item.folder || item;
        li.textContent = displayName;
        li.style.cssText = 'padding:8px; cursor:pointer; border-bottom:1px solid #eee;';
        li.addEventListener('click', () => {
          // 제목만 표시 (nodeId 부분은 저장 시 자동 추가)
          folderInput.value = (item.title || folderValue).replace(/\[[A-Z0-9]{10}\]$/, '');
          li.style.background = '#e3f2fd';
          setTimeout(() => li.style.background = '', 200);
        });
        li.addEventListener('mouseenter', () => li.style.background = '#f5f5f5');
        li.addEventListener('mouseleave', () => li.style.background = '');
        folderList.appendChild(li);
      });
    } catch (error) {
      console.error('Failed to load folder list:', error);
    }

    popup.style.display = 'block';
    overlay.style.display = 'block';
  },

  // Hide save folder popup
  hideSaveFolderPopup: function() {
    document.getElementById('saveFolderPopup').style.display = 'none';
    document.getElementById('saveFolderOverlay').style.display = 'none';
    document.getElementById('saveFolderNameInput').value = '';

    // 팝업 닫힐 때 노드재구성 버튼 상태 업데이트
    if (typeof window.updateTreeGenButtonState === 'function') {
      window.updateTreeGenButtonState();
    }
  },

  // Confirm save to folder
  confirmSaveToFolder: async function() {
    let inputTitle = document.getElementById('saveFolderNameInput').value.trim();

    if (!inputTitle) {
      alert('Please enter a folder name');
      return;
    }

    try {
      // 폴더명 = 제목만 사용 (nodeId 미포함)
      const rootNode = window.MyMind3.MindMapData.mindMapData?.[0];
      const nodeId = rootNode?.nodeId;
      let folderName = inputTitle;

      // currentFolder에서 제목 부분만 추출하여 비교 (old [nodeId] 포맷 하위호환)
      const currentFolder = window.MyMind3.currentFolder || localStorage.getItem('currentFolder');
      const currentTitle = currentFolder
        ? currentFolder.replace(/\[[A-Z0-9]{10}\]$/, '')
        : null;

      // 신규 저장 시 (currentFolder 없음) 중복 폴더명 체크
      if (!currentFolder) {
        const existingItems = document.querySelectorAll('#saveFolderList li');
        const existingFolders = Array.from(existingItems).map(li => {
          const raw = li.getAttribute('data-folder') || li.textContent;
          return raw.replace(/\[[A-Z0-9]{10}\]$/, '');
        });
        if (existingFolders.includes(folderName)) {
          let suffix = 2;
          while (existingFolders.includes(`${folderName} (${suffix})`)) suffix++;
          folderName = `${folderName} (${suffix})`;
          console.log(`[confirmSaveToFolder] 중복 감지 → "${folderName}" 으로 변경`);
        }
      }

      // 제목이 변경된 경우에만 rename 실행
      if (currentFolder && currentTitle !== inputTitle) {
        console.log(`폴더 이름 변경 감지: "${currentFolder}" -> "${folderName}"`);

        // 롤백 지원을 위한 이전 상태 저장
        const previousFolder = {
          qaFolder: window.currentQAFolder,
          mindFolder: window.MyMind3.currentFolder,
          localFolder: localStorage.getItem('currentFolder')
        };

        try {
          const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
          const renameResponse = await fetch('/api/mindmap/rename-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...csrfHeaders },
            credentials: 'include',
            body: JSON.stringify({
              oldFolderName: currentFolder,
              newFolderName: folderName
            })
          });

          if (!renameResponse.ok) {
            throw new Error(`HTTP ${renameResponse.status}: 폴더 이름 변경 요청 실패`);
          }

          const renameResult = await renameResponse.json();

          if (!renameResult.success) {
            alert(`폴더 이름 변경 실패: ${renameResult.message || '알 수 없는 오류'}`);
            return;
          }

          console.log('폴더 이름 변경 성공:', renameResult);

          // Update current folder tracking variables
          window.currentQAFolder = folderName;
          window.MyMind3.currentFolder = folderName;
          localStorage.setItem('currentFolder', folderName);
        } catch (renameError) {
          console.error('폴더 이름 변경 오류:', renameError);

          // 롤백: 이전 상태로 복원
          window.currentQAFolder = previousFolder.qaFolder;
          window.MyMind3.currentFolder = previousFolder.mindFolder;
          if (previousFolder.localFolder) {
            localStorage.setItem('currentFolder', previousFolder.localFolder);
          }
          console.log('[confirmSaveToFolder] 롤백 완료 - 이전 폴더 상태로 복원됨');

          // 기존 폴더명으로 저장 계속 진행
          folderName = currentFolder;
          if (typeof window.showToast === 'function') {
            window.showToast('폴더 이름 변경 실패 - 기존 이름으로 저장합니다', 'warning', 3000);
          }
        }
      } else if (currentFolder) {
        // 제목 변경 없음 → 기존 폴더명 유지
        folderName = currentFolder;
      }

      // 현재 편집 중인 노드의 에디터 내용을 먼저 저장
      const currentNodeId = window.MyMind3?.MindMapData?.currentEditingNodeId;
      if (currentNodeId && window.MyMind3Editor && window.MyMind3Editor.editor) {
        try {
          let content = '';
          if (typeof window.MyMind3Editor.editor.getMarkdown === 'function') {
            content = window.MyMind3Editor.editor.getMarkdown();
          }

          // 현재 노드 정보 가져오기
          const currentNode = window.MyMind3?.MindMapData?.findNodeById(currentNodeId);

          if (currentNode) {
            const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
            const saveNodeResponse = await fetch('/api/savenode', {
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

            const saveNodeResult = await saveNodeResponse.json();
            if (saveNodeResult.success) {
              console.log('[confirmSaveToFolder] 에디터 내용 저장 완료:', currentNode?.nodeId || currentNodeId);
            } else {
              console.warn('[confirmSaveToFolder] 에디터 내용 저장 실패:', saveNodeResult.error);
            }
          }
        } catch (editorSaveError) {
          console.error('[confirmSaveToFolder] 에디터 내용 저장 오류:', editorSaveError);
          // 에디터 저장 실패해도 JSON 저장은 계속 진행
        }
      }

      // 저장 전 서버 트리와 동기화 (서버에만 있는 노드를 로컬에 병합)
      if (window.MyMind3?.NodeRenderer?.syncFullTreeBeforeSave) {
        try {
          await window.MyMind3.NodeRenderer.syncFullTreeBeforeSave();
        } catch (syncErr) {
          console.warn('[confirmSaveToFolder] 저장 전 동기화 실패 (저장은 계속 진행):', syncErr.message);
        }
      }

      const jsonData = window.MyMind3.MindMapData.getDataAsJson();
      const data = JSON.parse(jsonData);

      // Collect AI response history from llm-body
      const llmBody = document.querySelector('.llm-body');
      let qaContent = '';
      if (llmBody) {
        // Get all child divs in llmBody (each represents a message)
        const messages = llmBody.children;

        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i];

          // Skip the initial placeholder message
          if (msg.tagName === 'P' && msg.textContent.includes('마인드맵 노드에 대한 응답이 여기에 표시됩니다')) {
            continue;
          }

          // 배경색이 있는 메시지만 저장 (헤더 div 제외)
          const style = msg.getAttribute('style');
          if (!style || !style.includes('background-color')) {
            console.log(`[confirmSaveToFolder] Skipping message ${i} (no background-color):`, msg.innerHTML.substring(0, 50));
            continue;
          }

          // Check if this is a user or AI message based on content structure
          const isUserMessage = msg.innerHTML.includes('<strong style="color: #000000 !important;">사용자:</strong>');
          const intl = window.MyMind3 && window.MyMind3.Intl;
          const timestamp = intl ? intl.formatDate(new Date(), { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString();

          qaContent += `
            <div class="qa-item">
              <div class="timestamp">${timestamp}</div>
              <div class="${isUserMessage ? 'question' : 'answer'}">
                ${msg.innerHTML}
              </div>
            </div>
          `;
        }

        // Q&A는 AI 응답 시 자동으로 AI별 파일에 저장됨 (예: gpt_qa.html, gemini_qa.html)
        // 기존 qa.html 저장 로직은 더 이상 사용하지 않음
      }

      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({ folderName, data })
      });

      const result = await response.json();

      if (result.success) {
        this.hideSaveFolderPopup();

        // 서버에서 중복 방지로 폴더명이 변경된 경우 동기화
        const actualFolder = result.actualFolder || folderName;

        // Set current folder for auto-save Q&A functionality (양쪽 다 설정)
        window.currentQAFolder = actualFolder;
        if (!window.MyMind3) window.MyMind3 = {};
        window.MyMind3.currentFolder = actualFolder;
        localStorage.setItem('currentFolder', actualFolder);
        console.log('Current folder set to:', actualFolder);

        // 저장 성공 → 삭제된 노드 ID 목록 클리어 (서버에 반영 완료)
        if (window.MyMind3?.MindMapData?._deletedNodeIds?.size > 0) {
          console.log(`[saveMindmapToFolder] _deletedNodeIds ${window.MyMind3.MindMapData._deletedNodeIds.size}개 클리어`);
          window.MyMind3.MindMapData._deletedNodeIds = new Set();
        }

        // 저장 완료 후 노드재구성 버튼 상태 업데이트
        if (typeof window.updateTreeGenButtonState === 'function') {
          window.updateTreeGenButtonState();
        }

        // 저장 성공 토스트 메시지 (nodeId 폴더는 제목으로 표시)
        const mmData = window.MyMind3?.MindMapData?.mindMapData;
        const toastTitle = (mmData && mmData.length > 0) ? mmData[0].title : folderName;
        if (typeof window.showToast === 'function') {
          window.showToast(`"${toastTitle}" 저장 완료`, 'success', 2000);
        }
      } else {
        console.error('Failed to save:', result.error);
        // 저장 실패 토스트 메시지
        if (typeof window.showToast === 'function') {
          window.showToast('저장 실패: ' + (result.error || '알 수 없는 오류'), 'error', 3000);
        }
      }
    } catch (error) {
      console.error('Error saving to folder:', error);
      if (typeof window.showToast === 'function') {
        window.showToast('저장 오류: ' + error.message, 'error', 3000);
      }
    }
  },

  // 팝업 없이 조용히 저장 (자동 저장용)
  saveMindmapSilently: async function() {
    // 읽기 전용 모드 체크
    if (window.MyMind3.isReadOnly) {
      console.log('[saveMindmapSilently] 읽기 전용 모드 - 자동 저장 차단');
      return false;
    }
    console.log('[saveMindmapSilently] 자동 저장 시작...');

    try {
      if (!window.MyMind3 || !window.MyMind3.MindMapData) {
        console.error('[saveMindmapSilently] Mind map engine not ready');
        return false;
      }

      // 현재 폴더 이름 확인
      const folderName = window.MyMind3.currentFolder || localStorage.getItem('currentFolder');

      if (!folderName) {
        console.log('[saveMindmapSilently] 폴더 이름 없음 - 팝업으로 대체');
        this.showSaveFolderPopup();
        return false;
      }

      // 루트 노드 제목으로 폴더 이름 변경 여부 확인
      const mindMapData = window.MyMind3.MindMapData.mindMapData;
      const rootTitle = (mindMapData && mindMapData.length > 0) ? mindMapData[0].title : folderName;

      if (rootTitle !== folderName) {
        console.log(`[saveMindmapSilently] 폴더 이름 변경: "${folderName}" -> "${rootTitle}"`);

        try {
          const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
          const renameResponse = await fetch('/api/mindmap/rename-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...csrfHeaders },
            credentials: 'include',
            body: JSON.stringify({
              oldFolderName: folderName,
              newFolderName: rootTitle
            })
          });

          const renameResult = await renameResponse.json();

          if (renameResult.success) {
            console.log('[saveMindmapSilently] 폴더 이름 변경 성공');
            // 현재 폴더 업데이트
            window.currentQAFolder = rootTitle;
            window.MyMind3.currentFolder = rootTitle;
            localStorage.setItem('currentFolder', rootTitle);
          } else {
            console.error('[saveMindmapSilently] 폴더 이름 변경 실패:', renameResult.message);
          }
        } catch (renameError) {
          console.error('[saveMindmapSilently] 폴더 이름 변경 오류:', renameError);
        }
      }

      // 저장할 폴더 이름 (변경된 경우 새 이름 사용)
      const saveFolderName = window.MyMind3.currentFolder || folderName;

      // 현재 편집 중인 노드의 에디터 내용을 먼저 저장
      const currentNodeId = window.MyMind3?.MindMapData?.currentEditingNodeId;
      if (currentNodeId && window.MyMind3Editor && window.MyMind3Editor.editor) {
        try {
          let content = '';
          if (typeof window.MyMind3Editor.editor.getMarkdown === 'function') {
            content = window.MyMind3Editor.editor.getMarkdown();
          }

          // 현재 노드 정보 가져오기
          const currentNode = window.MyMind3?.MindMapData?.findNodeById(currentNodeId);

          if (currentNode) {
            const editorCsrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
            const saveNodeResponse = await fetch('/api/savenode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...editorCsrfHeaders },
              credentials: 'include',
              body: JSON.stringify({
                folderName: saveFolderName,
                nodeId: currentNode?.nodeId || currentNodeId,
                content: content,
                nodeName: currentNode?.title || ''  // 서버에서 title[nodeId].html 파일명에 사용
              })
            });

            const saveNodeResult = await saveNodeResponse.json();
            if (saveNodeResult.success) {
              console.log('[saveMindmapSilently] 에디터 내용 저장 완료:', currentNode?.nodeId || currentNodeId);
            } else {
              console.warn('[saveMindmapSilently] 에디터 내용 저장 실패:', saveNodeResult.error);
            }
          }
        } catch (editorSaveError) {
          console.error('[saveMindmapSilently] 에디터 내용 저장 오류:', editorSaveError);
          // 에디터 저장 실패해도 JSON 저장은 계속 진행
        }
      }

      // 저장 전 서버 트리와 동기화 (서버에만 있는 노드를 로컬에 병합)
      if (window.MyMind3?.NodeRenderer?.syncFullTreeBeforeSave) {
        try {
          await window.MyMind3.NodeRenderer.syncFullTreeBeforeSave();
        } catch (syncErr) {
          console.warn('[saveMindmapSilently] 저장 전 동기화 실패 (저장은 계속 진행):', syncErr.message);
        }
      }

      // 마인드맵 데이터 수집
      const jsonData = window.MyMind3.MindMapData.getDataAsJson();
      const data = JSON.parse(jsonData);

      // Q&A 콘텐츠 수집 (생략 - 자동 저장에서는 Q&A 저장 안함)
      // Q&A는 AI 응답 시 자동으로 저장되므로 여기서는 마인드맵만 저장

      // 서버에 저장
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({ folderName: saveFolderName, data })
      });

      const result = await response.json();

      if (result.success) {
        console.log(`[saveMindmapSilently] "${saveFolderName}" 자동 저장 완료`);

        // 저장 성공 → 삭제된 노드 ID 목록 클리어 (서버에 반영 완료)
        if (window.MyMind3?.MindMapData?._deletedNodeIds?.size > 0) {
          console.log(`[saveMindmapSilently] _deletedNodeIds ${window.MyMind3.MindMapData._deletedNodeIds.size}개 클리어`);
          window.MyMind3.MindMapData._deletedNodeIds = new Set();
        }

        // 저장 성공 토스트 메시지 (nodeId 폴더는 제목으로 표시)
        const toastTitle = rootTitle || saveFolderName;
        if (typeof window.showToast === 'function') {
          window.showToast(`"${toastTitle}" 저장 완료`, 'success', 2000);
        }

        return true;
      } else {
        console.error('[saveMindmapSilently] 저장 실패:', result.error);
        if (typeof window.showToast === 'function') {
          window.showToast('저장 실패: ' + (result.error || '알 수 없는 오류'), 'error', 3000);
        }
        return false;
      }
    } catch (error) {
      console.error('[saveMindmapSilently] 저장 오류:', error);
      if (typeof window.showToast === 'function') {
        window.showToast('저장 오류: ' + error.message, 'error', 3000);
      }
      return false;
    }
  },

  // Open mind map
  openMindmap: async function() {
    console.log('Opening mindmap...');
    this.showLoadFolderPopup();
  },

  // Show load folder popup
  showLoadFolderPopup: async function(rebuild) {
    const popup = document.getElementById('loadFolderPopup');
    const overlay = document.getElementById('loadFolderOverlay');
    const folderList = document.getElementById('loadFolderList');

    if (!popup || !overlay || !folderList) {
      console.error('Load popup elements not found');
      return;
    }

    // 팝업 즉시 표시 + 로딩 인디케이터
    const loadingMsg = rebuild ? t('rebuildingIndex', '디렉토리 재탐색 중...') : t('loadingText', '로딩 중...');
    folderList.innerHTML = '<li style="padding:24px; text-align:center; color:#666;"><span style="display:inline-block; width:18px; height:18px; border:2px solid #ccc; border-top-color:#1976d2; border-radius:50%; animation:spin 0.8s linear infinite; vertical-align:middle; margin-right:8px;"></span>' + loadingMsg + '</li>';
    popup.style.display = 'block';
    overlay.style.display = 'block';

    // 스피너 애니메이션 (없으면 추가)
    if (!document.getElementById('loadSpinnerStyle')) {
      const style = document.createElement('style');
      style.id = 'loadSpinnerStyle';
      style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }

    // API 호출 후 폴더 목록 교체
    try {
      const url = rebuild ? '/api/savelist?rebuild=true' : '/api/savelist';
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-cache'
      });
      const data = await response.json();

      const folders = data.folders || [];
      folderList.innerHTML = '';
      folders.forEach(item => {
        // {folder, title} 객체 또는 레거시 문자열 지원
        const displayName = item.title || item.folder || item;
        const folderValue = item.folder || item;

        const li = document.createElement('li');
        li.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:12px; cursor:pointer; border-bottom:1px solid #eee; font-size:14px;';

        // li 전체 영역 클릭 시 폴더 불러오기 (패딩 영역 포함)
        li.addEventListener('click', () => {
          this.loadFromFolder(folderValue);
        });

        // 폴더명 영역 (제목 표시)
        const folderNameSpan = document.createElement('span');
        folderNameSpan.textContent = displayName;
        folderNameSpan.style.cssText = 'flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';

        // 잠금 상태 확인
        const isLocked = window.MyMind3.FolderLock.isLocked(folderValue);

        // 잠금 버튼 (삭제 버튼 좌측) - mmIcon 사용 (stroke="currentColor")
        const lockBtn = document.createElement('button');
        lockBtn.title = isLocked ? t('unlockMindmap', '잠금 해제') : t('lockMindmap', '읽기 전용 잠금');
        lockBtn.style.cssText = 'background:transparent; border:none; cursor:pointer; padding:4px 6px; margin-left:8px; flex-shrink:0; display:flex; align-items:center;';
        const updateLockIcon = (btn, locked) => {
          btn.style.color = locked ? '#e6a700' : '#999';
          btn.innerHTML = typeof window.mmIcon === 'function'
            ? window.mmIcon(locked ? 'lock' : 'unlock', 16)
            : (locked ? '\u{1F512}' : '\u{1F513}');
        };
        updateLockIcon(lockBtn, isLocked);
        lockBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const nowLocked = window.MyMind3.FolderLock.toggleLock(folderValue);
          // 아이콘 업데이트
          updateLockIcon(lockBtn, nowLocked);
          lockBtn.title = nowLocked ? t('unlockMindmap', '잠금 해제') : t('lockMindmap', '읽기 전용 잠금');
          // 삭제 버튼 활성/비활성
          deleteBtn.disabled = nowLocked;
          deleteBtn.style.opacity = nowLocked ? '0.4' : '1';
          deleteBtn.style.cursor = nowLocked ? 'not-allowed' : 'pointer';
          // 잠긴 마인드맵 제목 스타일
          folderNameSpan.style.color = nowLocked ? '#e6a700' : '';
          // 현재 열린 마인드맵이 잠긴 경우 즉시 readOnly 반영
          if (window.MyMind3.currentFolder === folderValue) {
            window.MyMind3.isReadOnly = nowLocked;
            window.MyMind3.updateReadOnlyUI();
          }
          if (typeof window.showToast === 'function') {
            window.showToast(nowLocked ? t('mindmapLocked', '읽기 전용으로 잠겼습니다') : t('mindmapUnlocked', '잠금이 해제되었습니다'), 'info', 2000);
          }
        });

        // 삭제 버튼
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = t('appSimpleDelete', '삭제');
        deleteBtn.style.cssText = 'background:#dc3545; color:#fff; border:none; border-radius:4px; padding:4px 10px; font-size:12px; cursor:pointer; margin-left:6px; flex-shrink:0;';
        deleteBtn.disabled = isLocked;
        if (isLocked) {
          deleteBtn.style.opacity = '0.4';
          deleteBtn.style.cursor = 'not-allowed';
          folderNameSpan.style.color = '#e6a700';
        }
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation(); // 폴더 클릭 이벤트 방지
          if (window.MyMind3.FolderLock.isLocked(folderValue)) {
            if (typeof window.showToast === 'function') {
              window.showToast(t('cannotDeleteLocked', '잠긴 마인드맵은 삭제할 수 없습니다'), 'warning', 2000);
            }
            return;
          }
          await this.deleteFolder(folderValue, displayName);
        });
        deleteBtn.addEventListener('mouseenter', () => { if (!deleteBtn.disabled) deleteBtn.style.background = '#c82333'; });
        deleteBtn.addEventListener('mouseleave', () => { if (!deleteBtn.disabled) deleteBtn.style.background = '#dc3545'; });

        li.appendChild(folderNameSpan);
        li.appendChild(lockBtn);
        li.appendChild(deleteBtn);
        li.addEventListener('mouseenter', () => li.style.background = '#e3f2fd');
        li.addEventListener('mouseleave', () => li.style.background = '');
        folderList.appendChild(li);
      });

      if (folders.length === 0) {
        folderList.innerHTML = '<li style="padding:12px; color:#999; text-align:center;">' + t('noSavedMindmaps', '저장된 마인드맵이 없습니다') + '</li>';
      }
    } catch (error) {
      console.error('Failed to load folder list:', error);
      folderList.innerHTML = '<li style="padding:12px; color:#f44336; text-align:center;">' + t('folderListLoadFail', '폴더 목록 로딩 실패') + '</li>';
    }
  },

  // Hide load folder popup
  hideLoadFolderPopup: function() {
    document.getElementById('loadFolderPopup').style.display = 'none';
    document.getElementById('loadFolderOverlay').style.display = 'none';
  },

  // Delete folder
  deleteFolder: async function(folderName, displayTitle) {
    // 삭제 확인 얼럿 (displayTitle이 있으면 사용, 없으면 folderName)
    const showName = displayTitle || folderName;
    const confirmed = confirm(`주의: "${showName}" 마인드맵을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.\n모든 노드와 Q&A 내용이 영구적으로 삭제됩니다.`);

    if (!confirmed) {
      console.log('[deleteFolder] 사용자가 삭제를 취소했습니다.');
      return;
    }

    try {
      console.log('[deleteFolder] 폴더 삭제 시작:', folderName);

      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
      const response = await fetch(`/api/deletefolder?folder=${encodeURIComponent(folderName)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: csrfHeaders
      });

      const result = await response.json();

      if (result.success) {
        console.log('[deleteFolder] 폴더 삭제 성공:', folderName);

        // 토스트 메시지 (제목 표시)
        if (typeof window.showToast === 'function') {
          window.showToast(`"${showName}" 삭제 완료`, 'success', 2000);
        }

        // 현재 열린 폴더가 삭제된 폴더라면 초기화
        if (window.MyMind3.currentFolder === folderName) {
          window.MyMind3.currentFolder = null;
          window.currentQAFolder = null;
          localStorage.removeItem('currentFolder');
          window.MyMind3.MindMapData.initialize();
          this.renderMindmap();
        }

        // 폴더 목록 새로고침
        await this.showLoadFolderPopup();
      } else {
        console.error('[deleteFolder] 삭제 실패:', result.error);
        alert(t('appSimpleDeleteFailed', '삭제 실패') + ': ' + (result.error || t('appSimpleUnknownError', '알 수 없는 오류')));
      }
    } catch (error) {
      console.error('[deleteFolder] 오류:', error);
      alert(t('appSimpleDeleteError', '삭제 중 오류가 발생했습니다') + ': ' + error.message);
    }
  },

  // 로딩 중 플래그 (중복 클릭 방지)
  _isLoadingFolder: false,

  // Load from folder
  loadFromFolder: async function(folderName) {
    // 중복 클릭 방지: 이미 로딩 중이면 무시
    if (this._isLoadingFolder) {
      console.log('[loadFromFolder] 이미 로딩 중 - 중복 클릭 무시');
      return;
    }
    this._isLoadingFolder = true;
    console.log('Loading from folder:', folderName);

    try {
      // 이전 마인드맵 상태 완전 초기화 (다른 마인드맵 불러오기 시 잔여 상태 제거)
      window.selectedNodeId = null;
      if (window.MyMind3Editor && window.MyMind3Editor.clearEditorState) {
        window.MyMind3Editor.clearEditorState();
      }
      // Q&A 패널 초기화
      const llmResponse = document.getElementById('llmResponse');
      if (llmResponse) llmResponse.innerHTML = '';
      // 서비스별 Q&A 컨테이너 초기화
      ['gpt', 'gemini', 'claude', 'grok', 'local'].forEach(svc => {
        const el = document.getElementById(`${svc}Response`);
        if (el) el.innerHTML = '';
      });

      const response = await fetch(`/api/load?folder=${encodeURIComponent(folderName)}`);
      const data = await response.json();

      console.log('Received data from server:', data);

      // Pass object directly instead of stringifying
      console.log('Calling window.MyMind3.MindMapData.loadFromJson...');
      const loadResult = window.MyMind3.MindMapData.loadFromJson(data);
      console.log('loadFromJson result:', loadResult);

      if (loadResult) {
        this.hideLoadFolderPopup();

        // Set current folder for auto-save Q&A functionality (양쪽 다 설정)
        window.currentQAFolder = folderName;
        if (!window.MyMind3) window.MyMind3 = {};
        window.MyMind3.currentFolder = folderName;
        localStorage.setItem('currentFolder', folderName);
        console.log('Current folder set to:', folderName);

        // 잠금 상태 확인 → 읽기 전용 모드 설정
        window.MyMind3.isReadOnly = window.MyMind3.FolderLock.isLocked(folderName);
        window.MyMind3.updateReadOnlyUI();
        if (window.MyMind3.isReadOnly) {
          console.log('[loadFromFolder] 읽기 전용 모드로 로드:', folderName);
        }

        // Set current folder for search module (콘텐츠 검색용)
        if (window.MyMind3.Features && window.MyMind3.Features.Search) {
          window.MyMind3.Features.Search.setCurrentFolder(folderName);
          console.log('Search folder set to:', folderName);
        }

        // Load Q&A content if exists (with pagination support)
        console.log('About to call loadQAContent...');
        await this.loadQAContent(folderName);
        console.log('loadQAContent completed');

        // Adjust x coordinates of all nodes after loading (move left)
        const adjustXCoordinates = (nodes) => {
          if (!nodes || nodes.length === 0) return;

          nodes.forEach(node => {
            // Move nodes left by 70 pixels if they're at the old position
            if (node.x === 100) {
              node.x = 30;
              console.log(`Adjusted node ${node.id} x position: 100 -> 30`);
            }
            // Recursively adjust children
            if (node.children && node.children.length > 0) {
              adjustXCoordinates(node.children);
            }
          });
        };

        // Apply coordinate adjustment
        const mindMapData = window.MyMind3.MindMapData.mindMapData;
        if (mindMapData && mindMapData.length > 0) {
          adjustXCoordinates(mindMapData);
        }

        // 렌더링 전 NodeFilterManager에 필터 동기화 (로드된 필터가 즉시 렌더링되도록)
        if (window.NodeFilterManager && window.MyMind3.MindMapData.filters) {
          window.NodeFilterManager.filters = window.MyMind3.MindMapData.filters;
          console.log('[loadFromFolder] NodeFilterManager 필터 동기화:', window.MyMind3.MindMapData.filters.length, '개');
        }

        if (window.MyMind3.NodeRenderer) {
          window.MyMind3.NodeRenderer.renderMindMap();

          // Update main add button state after loading
          if (typeof updateMainAddButtonState === 'function') {
            updateMainAddButtonState();
          }

          // Update save and improve button state after loading
          if (typeof updateSaveImproveButtonState === 'function') {
            updateSaveImproveButtonState();
          }

          // 불러오기 완료 후 노드재구성 버튼 상태 업데이트
          if (typeof window.updateTreeGenButtonState === 'function') {
            window.updateTreeGenButtonState();
          }

          // 응답 패널 버튼 상태 업데이트 (전송, 삭제, 파일첨부)
          if (typeof window.updateResponsePanelButtonState === 'function') {
            window.updateResponsePanelButtonState();
          }

          // Auto-select root node after loading
          // 비동기 타이밍 수정: setTimeout → requestAnimationFrame + async/await
          requestAnimationFrame(async () => {
            try {
              const mindMapData = window.MyMind3.MindMapData.mindMapData;
              if (mindMapData && mindMapData.length > 0) {
                const rootNode = mindMapData[0]; // First node is the root
                console.log('Auto-selecting root node:', rootNode.title, 'ID:', rootNode.id);

                // Select the root node (await로 완료 대기)
                if (window.MyMind3.NodeRenderer.selectNode) {
                  await window.MyMind3.NodeRenderer.selectNode(rootNode.id);
                }

                // Check if root node has qaFiles (array) or qaFile (string - backward compatible)
                let firstService = null;
                const qaLoadPromises = [];

                if (Array.isArray(rootNode.qaFiles) && rootNode.qaFiles.length > 0) {
                  console.log('Root node has qaFiles array:', rootNode.qaFiles);
                  console.log('Loading Q&A content from qaFiles...');
                  // 각 AI 서비스별 Q&A 파일 로드 (Promise.allSettled로 부분 실패 허용)
                  rootNode.qaFiles.forEach((qaFileName, index) => {
                    // 파일명에서 서비스명 추출 (예: gpt_qa.html -> gpt)
                    const match = qaFileName.match(/^([a-z]+)_qa\.html$/);
                    const service = match ? match[1] : null;
                    if (index === 0 && service) firstService = service;
                    qaLoadPromises.push(window.MyMind3Simple.loadQAContent(folderName, 1, 100, service));
                  });
                } else if (rootNode.qaFile) {
                  // 하위 호환성: 기존 단일 qaFile 지원
                  console.log('Root node has qaFile (legacy):', rootNode.qaFile);
                  console.log('Loading Q&A content from qaFile...');
                  qaLoadPromises.push(window.MyMind3Simple.loadQAContent(folderName));
                } else {
                  // qaFiles가 비어있을 때 기존 Q&A 파일 자동 감지
                  console.log('Root node has no qaFile/qaFiles - attempting auto-detection');
                  const defaultServices = ['gpt', 'gemini', 'claude', 'grok', 'local'];
                  firstService = 'gpt'; // 기본값
                  defaultServices.forEach(service => {
                    qaLoadPromises.push(window.MyMind3Simple.loadQAContent(folderName, 1, 100, service));
                  });
                }

                // 모든 Q&A 로드 완료 대기 (부분 실패 허용)
                if (qaLoadPromises.length > 0) {
                  const results = await Promise.allSettled(qaLoadPromises);
                  const fulfilled = results.filter(r => r.status === 'fulfilled').length;
                  const rejected = results.filter(r => r.status === 'rejected').length;
                  console.log(`[loadFromFolder] Q&A 로드 완료: ${fulfilled}개 성공, ${rejected}개 실패`);
                }

                // Q&A 로드 후 첫 번째 서비스 탭 활성화
                if (firstService && typeof switchAITab === 'function') {
                  console.log('Activating first service tab:', firstService);
                  switchAITab(firstService);
                }
              }
            } catch (error) {
              console.error('[loadFromFolder] 루트 노드 선택 또는 Q&A 로드 오류:', error);
            }
          });
        }

        console.log('Mind map loaded successfully from:', folderName);

        // 마인드맵 로드 완료 이벤트 발생 (새 트리 버튼 상태 업데이트용)
        window.dispatchEvent(new CustomEvent('mindmapLoaded', { detail: { folderName } }));
      } else {
        console.error('loadFromJson returned false');
        this.hideLoadFolderPopup();
        alert('Failed to load mind map data');
      }
    } catch (error) {
      console.error('Error loading from folder:', error);
      this.hideLoadFolderPopup();
      alert('Failed to load: ' + error.message);
    } finally {
      this._isLoadingFolder = false;
    }
  },

  // Load Q&A content with pagination support
  // service 파라미터: AI 서비스명 (gpt, gemini, claude, grok, local) - 다중 AI 모드에서 사용
  loadQAContent: async function(folderName, page = 1, limit = 10, service = null) {
    console.log(`loadQAContent called: folder="${folderName}", page=${page}, limit=${limit}, service=${service}`);
    try {
      let apiUrl = `/api/loadqa?folder=${encodeURIComponent(folderName)}&page=${page}&limit=${limit}`;
      if (service) {
        apiUrl += `&service=${encodeURIComponent(service)}`;
      }
      const qaResponse = await fetch(apiUrl);
      console.log('API response status:', qaResponse.status);
      const qaData = await qaResponse.json();
      console.log('API response data:', qaData);

      if (qaData.exists) {
        // 서비스별 컨테이너 사용 (탭 전환 시 해당 서비스 Q&A만 표시)
        let targetContainer;
        if (service) {
          // 서비스별 컨테이너 사용 (예: gptResponse, geminiResponse)
          targetContainer = document.getElementById(`${service}Response`);
          if (!targetContainer) {
            // 컨테이너가 없으면 생성
            this.ensureAIContainers();
            targetContainer = document.getElementById(`${service}Response`);
          }
        }
        // 폴백: 서비스 없거나 컨테이너 없으면 llmResponse 사용
        if (!targetContainer) {
          targetContainer = document.getElementById('llmResponse');
        }
        console.log('Target container:', targetContainer ? targetContainer.id : 'NOT FOUND');
        if (targetContainer) {
          // 빈 Q&A인 경우 기존 콘텐츠 덮어쓰기 방지
          if (!qaData.content || qaData.content.trim() === '') {
            console.log('Skipping empty Q&A content for service:', service);
            return;
          }

          if (page === 1) {
            // First page - replace content (but append if already has content from another service)
            // 수식 내부의 <br> 태그 및 줄바꿈(\n) 제거 (KaTeX 렌더링을 위해)
            let cleanedContent = qaData.content;
            // $$ ... $$ 사이의 <br> 및 \n 제거 (display math)
            cleanedContent = cleanedContent.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
              return '$$' + formula.replace(/<br\s*\/?>/gi, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() + '$$';
            });
            // $ ... $ 사이의 <br> 및 \n 제거 (inline math) - [\s\S]로 줄바꿈 포함
            cleanedContent = cleanedContent.replace(/\$([\s\S]+?)\$/g, (match, formula) => {
              // display math($$)는 이미 처리됨, skip
              if (match.startsWith('$$')) return match;
              return '$' + formula.replace(/<br\s*\/?>/gi, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() + '$';
            });
            targetContainer.innerHTML = cleanedContent;

            // AI 응답 컨테이너 재생성 (다중 AI 모드용) - 서비스별 컨테이너 사용 시 스킵
            if (!service) {
              this.ensureAIContainers();
            }

            // Attach event listeners to copy buttons after loading HTML
            setTimeout(() => {
              if (window.attachQACopyListeners) {
                window.attachQACopyListeners();
              }
            }, 50); // DOM 업데이트 직후 이벤트 리스너 연결

            // KaTeX 렌더링 (qa.html에 수식이 있는 경우) - 두 번 렌더링으로 확실히 처리
            const renderKaTeX = () => {
              if (typeof renderMathInElement === 'function') {
                console.log('[loadQAContent] Triggering KaTeX rendering for loaded Q&A');
                renderMathInElement(targetContainer, {
                  delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                  ],
                  throwOnError: false
                });
              }
            };
            // 첫 번째 렌더링 (DOM 업데이트 후)
            setTimeout(renderKaTeX, 100);
            // 두 번째 렌더링 (확실한 처리를 위해)
            setTimeout(renderKaTeX, 500);

            // 자동 스크롤: 가장 마지막 답변의 가장 마지막 줄이 화면 하단에 보이도록
            setTimeout(() => {
              targetContainer.scrollTop = targetContainer.scrollHeight;
              console.log('Auto-scrolled to bottom of Q&A content');
            }, 600); // KaTeX 렌더링 후 스크롤

            // 페이지네이션 기능 제거 - 모든 콘텐츠를 한 번에 로드
          } else {
            // Additional pages - append content
            // 수식 내부의 <br> 태그 및 줄바꿈(\n) 제거 (KaTeX 렌더링을 위해)
            let cleanedContent = qaData.content;
            cleanedContent = cleanedContent.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
              return '$$' + formula.replace(/<br\s*\/?>/gi, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() + '$$';
            });
            cleanedContent = cleanedContent.replace(/\$([\s\S]+?)\$/g, (match, formula) => {
              // display math($$)는 이미 처리됨, skip
              if (match.startsWith('$$')) return match;
              return '$' + formula.replace(/<br\s*\/?>/gi, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim() + '$';
            });
            const existingContent = targetContainer.innerHTML;
            targetContainer.innerHTML = existingContent + cleanedContent;

            // AI 응답 컨테이너 재생성 (다중 AI 모드용) - 서비스별 컨테이너 사용 시 스킵
            if (!service) {
              this.ensureAIContainers();
            }

            // Attach event listeners to copy buttons after loading HTML
            setTimeout(() => {
              if (window.attachQACopyListeners) {
                window.attachQACopyListeners();
              }
            }, 50); // DOM 업데이트 직후 이벤트 리스너 연결

            // KaTeX 렌더링 (추가 페이지에도) - 두 번 렌더링으로 확실히 처리
            const renderKaTeXMore = () => {
              if (typeof renderMathInElement === 'function') {
                console.log('[loadQAContent] Triggering KaTeX rendering for additional Q&A page');
                renderMathInElement(targetContainer, {
                  delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false}
                  ],
                  throwOnError: false
                });
              }
            };
            // 첫 번째 렌더링 (DOM 업데이트 후)
            setTimeout(renderKaTeXMore, 100);
            // 두 번째 렌더링 (확실한 처리를 위해)
            setTimeout(renderKaTeXMore, 500);

            // Update pagination controls
            this.updateQAPaginationControls(folderName, qaData);

            // 추가 페이지 로드 후에도 자동 스크롤
            setTimeout(() => {
              llmResponse.scrollTop = llmResponse.scrollHeight;
              console.log('Auto-scrolled to bottom after loading more Q&A');
            }, 600); // KaTeX 렌더링 후 스크롤
          }

          console.log(`Loaded Q&A content page ${qaData.currentPage}/${qaData.totalPages} (${qaData.totalItems} total items, ${qaData.fileSize}MB)`);
        } else {
          console.error('llmResponse element not found in DOM!');
        }
      } else {
        console.log('No Q&A content found (exists=false)');
      }
    } catch (qaError) {
      console.error('Error loading Q&A content:', qaError);
    }
  },

  // Add pagination controls for Q&A content
  addQAPaginationControls: function(folderName, qaData) {
    const llmResponse = document.getElementById('llmResponse');
    if (!llmResponse) return;

    // Remove existing pagination controls
    const existingControls = llmResponse.querySelector('.qa-pagination-controls');
    if (existingControls) {
      existingControls.remove();
    }

    // Add pagination controls at the end
    // XSS 방지: folderName 이스케이프
    const safeFolderName = folderName.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const paginationHtml = `
      <div class="qa-pagination-controls" style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 5px; text-align: center;">
        <div style="margin-bottom: 10px; color: #666; font-size: 0.9em;">
          페이지 ${qaData.currentPage} / ${qaData.totalPages} (총 ${qaData.totalItems}개 항목, 파일 크기: ${qaData.fileSize}MB)
        </div>
        <div class="qa-pagination-buttons">
          ${qaData.hasMore ? `<button onclick="window.MyMind3Simple.loadMoreQA('${safeFolderName}', ${parseInt(qaData.currentPage) + 1})" style="padding: 8px 15px; margin: 0 5px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">다음 페이지 로드</button>` : ''}
          ${qaData.currentPage > 1 ? `<button onclick="window.MyMind3Simple.reloadQAFromStart('${safeFolderName}')" style="padding: 8px 15px; margin: 0 5px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">처음부터 다시 로드</button>` : ''}
        </div>
      </div>
    `;

    llmResponse.insertAdjacentHTML('beforeend', paginationHtml);
  },

  // Update pagination controls
  updateQAPaginationControls: function(folderName, qaData) {
    const controls = document.querySelector('.qa-pagination-controls');
    if (!controls) return;

    // Update page info
    const pageInfo = controls.querySelector('div:first-child');
    if (pageInfo) {
      pageInfo.textContent = t('qaPaginationInfo', '페이지 {currentPage} / {totalPages} (총 {totalItems}개 항목, 파일 크기: {fileSize}MB)').replace('{currentPage}', qaData.currentPage).replace('{totalPages}', qaData.totalPages).replace('{totalItems}', qaData.totalItems).replace('{fileSize}', qaData.fileSize);
    }

    // Update buttons - XSS 방지: folderName 이스케이프
    const safeFolderName = folderName.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const buttonsContainer = controls.querySelector('.qa-pagination-buttons');
    if (buttonsContainer) {
      buttonsContainer.innerHTML = `
        ${qaData.hasMore ? `<button onclick="window.MyMind3Simple.loadMoreQA('${safeFolderName}', ${parseInt(qaData.currentPage) + 1})" style="padding: 8px 15px; margin: 0 5px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">다음 페이지 로드</button>` : ''}
        <button onclick="window.MyMind3Simple.reloadQAFromStart('${safeFolderName}')" style="padding: 8px 15px; margin: 0 5px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer;">처음부터 다시 로드</button>
      `;
    }
  },

  // Load more Q&A content (next page)
  loadMoreQA: async function(folderName, page) {
    await this.loadQAContent(folderName, page, 10);
  },

  // Reload Q&A from the beginning
  reloadQAFromStart: async function(folderName) {
    const llmResponse = document.getElementById('llmResponse');
    if (llmResponse) {
      llmResponse.innerHTML = ''; // Clear existing content
      // AI 응답 컨테이너 재생성 (다중 AI 모드용)
      this.ensureAIContainers();
    }
    await this.loadQAContent(folderName, 1, 10);
  },

  // Export mind map
  exportMindmap: function() {
    console.log('Exporting mindmap...');
    this.showStatus('Export feature coming soon');
  },

  // Render mind map (connected to new engine)
  renderMindmap: function() {
    console.log('Rendering mindmap...');

    // Use the new NodeRenderer to render the mind map
    if (window.MyMind3 && window.MyMind3.NodeRenderer) {
      window.MyMind3.NodeRenderer.renderMindMap();
    } else {
      console.error('MyMind3.NodeRenderer not available');
      // Fallback to placeholder
      const mindmapContainer = document.querySelector('.mindmap-container');
      if (mindmapContainer) {
        mindmapContainer.innerHTML = '<p>Mind map engine loading...</p>';
      }
    }

    // Update statistics
    this.updateStatistics();
  },

  // Update statistics display
  updateStatistics: function() {
    const nodeCount = this.data.mindMapData.length;
    const connectionCount = 0; // Will be calculated based on connections

    const nodeCountEl = document.getElementById('node-count');
    const connectionCountEl = document.getElementById('connection-count');
    const zoomLevelEl = document.getElementById('zoom-level');

    if (nodeCountEl) nodeCountEl.textContent = `${nodeCount} nodes`;
    if (connectionCountEl) connectionCountEl.textContent = `${connectionCount} connections`;
    if (zoomLevelEl) zoomLevelEl.textContent = '100%';
  },

  // Show status message
  showStatus: function(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);

    const statusEl = document.getElementById('status-message');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status ${type}`;

      // Clear after 3 seconds
      setTimeout(() => {
        statusEl.textContent = 'Ready';
        statusEl.className = 'status';
      }, 3000);
    }
  },

  // Create main node (like MyMind2)
  createMainNode: function(title) {
    if (!title || !title.trim()) {
      title = prompt('Enter node title:');
      if (!title) return;
    }

    const nodeId = this.data.nextNodeId++;
    const newNode = {
      id: nodeId,
      title: title.trim(),
      level: 0,
      x: 100,
      y: 100,
      children: [],
      expanded: true
    };

    this.data.mindMapData.push(newNode);
    this.renderMindmap();
    this.showStatus(`Node "${title}" created`);

    return newNode;
  },

  // Find node by ID (from MyMind2)
  findNodeById: function(id) {
    function findNodeRecursive(nodes, targetId) {
      if (!nodes || nodes.length === 0) return null;

      for (const node of nodes) {
        if (node.id === targetId) {
          return node;
        }

        if (node.children && node.children.length > 0) {
          const foundNode = findNodeRecursive(node.children, targetId);
          if (foundNode) {
            return foundNode;
          }
        }
      }

      return null;
    }

    return findNodeRecursive(this.data.mindMapData, id);
  }
};

// AI 응답 후 자동 저장 기능
function setupAIAutoSave() {
  // AI 응답 이벤트 리스너 추가
  if (window.MyMind3 && window.MyMind3.Events) {
    window.MyMind3.Events.on('ai:response', async (response) => {
      console.log('AI response received, auto-saving Q&A...');

      // 현재 폴더가 설정되어 있는지 확인
      if (!window.currentQAFolder) {
        console.log('No current Q&A folder set, skipping auto-save');
        return;
      }

      try {
        // 사용자 질문과 AI 응답을 Q&A 형식으로 생성
        const intlUtil = window.MyMind3 && window.MyMind3.Intl;
        const timestamp = intlUtil ? intlUtil.formatDate(new Date(), { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString();

        // 사용자 질문 저장
        const userQAItem = `<div class="qa-item">
            <div class="timestamp">${timestamp}</div>
            <div class="question">
                <strong style="color: #000000 !important;">사용자:</strong><br>
                <div style="color: #000000 !important; margin-top: 8px;">${response.query}</div>
            </div>
        </div>`;

        // service 파라미터가 있으면 AI별 Q&A 파일에 저장
        const currentService = window.MyMindAI?.currentService || null;
        const userRequestBody = {
          folderName: window.currentQAFolder,
          qaItem: userQAItem
        };
        if (currentService) {
          userRequestBody.service = currentService;
        }

        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
        await fetch('/api/saveqa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include',
          body: JSON.stringify(userRequestBody)
        });

        // AI 응답 저장 (약간의 시간차를 두어 순서 보장)
        setTimeout(async () => {
          const intlFmt = window.MyMind3 && window.MyMind3.Intl;
          const aiTimestamp = intlFmt ? intlFmt.formatDate(new Date(), { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString();

          // 수식 내부의 <br> 태그 제거 (KaTeX 렌더링을 위해)
          let cleanedResponse = response.response;

          // HTML에서 $ 바로 뒤나 바로 앞의 <br> 제거
          // 패턴: $<br>formula<br>$ 형태를 $formula$로 변경
          cleanedResponse = cleanedResponse.replace(/\$\s*<br\s*\/?>\s*/gi, '$');
          cleanedResponse = cleanedResponse.replace(/\s*<br\s*\/?>\s*\$/gi, '$');

          // $$ ... $$ 사이의 <br> 제거 (display math)
          cleanedResponse = cleanedResponse.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
            return '$$' + formula.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim() + '$$';
          });
          // $ ... $ 사이의 <br> 제거 (inline math) - 더 공격적으로
          cleanedResponse = cleanedResponse.replace(/\$([^$]*?)\$/g, (match, formula) => {
            return '$' + formula.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim() + '$';
          });

          const aiQAItem = `<div class="qa-item">
              <div class="timestamp">${aiTimestamp}</div>
              <div class="answer">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e0e0e0;">
                      <strong style="color: #000000;">AI:</strong>
                  </div>
                  <div style="color: #000000 !important; margin-top: 8px;">
                      ${cleanedResponse}
                  </div>
              </div>
          </div>`;

          // AI 응답도 동일한 서비스의 Q&A 파일에 저장
          const aiRequestBody = {
            folderName: window.currentQAFolder,
            qaItem: aiQAItem
          };
          if (currentService) {
            aiRequestBody.service = currentService;
          }

          const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
          await fetch('/api/saveqa', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...csrfHeaders
            },
            credentials: 'include',
            body: JSON.stringify(aiRequestBody)
          });

          console.log(`Q&A auto-saved successfully${currentService ? ` to ${currentService}_qa.html` : ''}`);
        }, 100);

      } catch (error) {
        console.error('Failed to auto-save Q&A:', error);
      }
    });
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing MyMind3Simple...');

  // Wait a bit for other scripts to load
  setTimeout(() => {
    if (window.MyMind3Simple) {
      window.MyMind3Simple.init();
    }

    // AI 자동 저장 기능 설정
    setupAIAutoSave();
  }, 100);
});

// 읽기 전용 모드 UI 업데이트 함수
window.MyMind3.updateReadOnlyUI = function() {
  const isReadOnly = window.MyMind3.isReadOnly;

  // 기존 배너 제거 (이전 버전 호환)
  const oldBanner = document.getElementById('readOnlyBanner');
  if (oldBanner) oldBanner.remove();

  // 메인 추가 버튼 왼쪽 잠금 아이콘
  const lockIcon = document.getElementById('readOnlyLockIcon');
  if (lockIcon) {
    if (isReadOnly) {
      if (!lockIcon.innerHTML) {
        lockIcon.innerHTML = typeof window.mmIcon === 'function'
          ? window.mmIcon('lock-keyhole', 16)
          : '<svg class="mm-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10" width="14" height="10" rx="2" ry="2"/><path d="M8 10V6.5a4 4 0 0 1 8 0V10"/><circle cx="12" cy="14.5" r="1.5"/><path d="M12 16v2"/></svg>';
      }
      lockIcon.style.display = 'inline-flex';
    } else {
      lockIcon.style.display = 'none';
    }
  }

  // 저장 버튼 비활성화/활성화
  const saveBtns = [
    document.getElementById('saveMapBtn'),
    document.getElementById('saveContentBtn')
  ];
  saveBtns.forEach(btn => {
    if (!btn) return;
    btn.disabled = isReadOnly;
    btn.style.opacity = isReadOnly ? '0.4' : '';
    btn.style.cursor = isReadOnly ? 'not-allowed' : '';
  });
};