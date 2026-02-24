/**
 * 노드 첨부파일 관리 모듈
 * 기획서: testpy/md7/노드json 파일추가.md
 */

(function() {
  'use strict';

  // 중복 초기화 방지 플래그
  let isInitialized = false;

  // 파일 타입별 아이콘 (mmIcon SVG)
  const FILE_ICONS = {
    'image/jpeg': mmIcon('image', 16),
    'image/png': mmIcon('image', 16),
    'image/gif': mmIcon('image', 16),
    'image/webp': mmIcon('image', 16),
    'image/svg+xml': mmIcon('image', 16),
    'application/pdf': mmIcon('file', 16),
    'video/mp4': mmIcon('film', 16),
    'video/webm': mmIcon('film', 16),
    'audio/mpeg': mmIcon('music', 16),
    'audio/wav': mmIcon('music', 16),
    'audio/ogg': mmIcon('music', 16),
    'application/msword': mmIcon('text', 16),
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': mmIcon('text', 16),
    'application/vnd.ms-excel': mmIcon('bar-chart', 16),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': mmIcon('bar-chart', 16),
    'default': mmIcon('paperclip', 16)
  };

  /**
   * 파일 타입에 따른 아이콘 반환
   */
  function getFileIcon(mimeType) {
    return FILE_ICONS[mimeType] || FILE_ICONS['default'];
  }

  /**
   * 파일 크기 포맷
   */
  function formatFileSize(bytes) {
    const intl = window.MyMind3?.Intl;
    if (intl) return intl.formatFileSize(bytes);
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * 현재 마인드맵 ID 가져오기
   */
  function getCurrentMindmapId() {
    // window.MyMind3.currentFolder에서 가져오기 (app-simple.js에서 설정)
    if (window.MyMind3 && window.MyMind3.currentFolder) {
      return window.MyMind3.currentFolder;
    }
    // localStorage에서 가져오기 (폴백)
    const localFolder = localStorage.getItem('currentFolder');
    if (localFolder) {
      return localFolder;
    }
    return null;
  }

  /**
   * 현재 선택된 노드 ID 가져오기
   */
  function getCurrentNodeId() {
    if (window.MyMind3 && window.MyMind3.getCurrentNodeId) {
      return window.MyMind3.getCurrentNodeId();
    }
    if (window.selectedNodeId) {
      return window.selectedNodeId;
    }
    if (window.MyMind3 && window.MyMind3.MindMapData && window.MyMind3.MindMapData.currentEditingNodeId) {
      return window.MyMind3.MindMapData.currentEditingNodeId;
    }
    return null;
  }

  /**
   * 첨부 버튼 상태 업데이트 (input 오버레이 방식)
   */
  function updateAttachButtonState() {
    const attachFileBtn = document.getElementById('attachFileBtn');
    const attachFileInput = document.getElementById('attachFileInput');
    if (!attachFileBtn) return;

    const nodeId = getCurrentNodeId();
    const mindmapId = getCurrentMindmapId();

    if (nodeId && mindmapId) {
      // 활성화: pointer-events 허용, 투명도 제거
      attachFileBtn.style.pointerEvents = 'auto';
      attachFileBtn.style.opacity = '1';
      if (attachFileInput) {
        attachFileInput.disabled = false;
        attachFileInput.style.pointerEvents = 'auto'; // input도 명시적으로 활성화
      }
      console.log('[NodeAttachments] 버튼 활성화 - nodeId:', nodeId, 'mindmapId:', mindmapId);
    } else {
      // 비활성화: pointer-events 차단, 투명도 낮춤
      attachFileBtn.style.pointerEvents = 'none';
      attachFileBtn.style.opacity = '0.5';
      if (attachFileInput) {
        attachFileInput.disabled = true;
        attachFileInput.style.pointerEvents = 'none'; // input도 명시적으로 비활성화
      }
      console.log('[NodeAttachments] 버튼 비활성화 - nodeId:', nodeId, 'mindmapId:', mindmapId);
    }
  }

  /**
   * Storage Token 가져오기
   */
  async function getStorageToken() {
    if (window.MyMind3?.StorageAuth?.getToken) {
      return await window.MyMind3.StorageAuth.getToken();
    }
    return null;
  }

  /**
   * 첨부파일 목록 조회
   */
  async function loadAttachments(mindmapId, nodeId, isRetry = false) {
    try {
      // Storage Token 가져오기
      const storageToken = await getStorageToken();
      const headers = {};
      if (storageToken) {
        headers['X-Storage-Token'] = storageToken;
      }

      const response = await fetch(`/api/attachments/${encodeURIComponent(mindmapId)}/node/${nodeId}`, {
        headers,
        credentials: 'include'
      });

      // 403 에러 시 토큰 재발급 후 재시도
      if (response.status === 403 && !isRetry && window.MyMind3?.StorageAuth?.refreshToken) {
        console.log('[NodeAttachments] 토큰 만료, 재발급 후 재시도...');
        await window.MyMind3.StorageAuth.refreshToken();
        return await loadAttachments(mindmapId, nodeId, true);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      return data.attachments || [];
    } catch (error) {
      console.error('[NodeAttachments] 첨부파일 목록 조회 실패:', error);
      return [];
    }
  }

  /**
   * 첨부파일 업로드
   */
  async function uploadAttachment(mindmapId, nodeId, file, isRetry = false) {
    const formData = new FormData();
    formData.append('file', file);

    // Storage Token 및 CSRF 토큰 가져오기
    const storageToken = await getStorageToken();
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};

    const headers = { ...csrfHeaders };
    if (storageToken) {
      headers['X-Storage-Token'] = storageToken;
    }

    const response = await fetch(`/api/attachments/${encodeURIComponent(mindmapId)}/node/${nodeId}`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: formData
    });

    // 403 에러 시 토큰 재발급 후 재시도
    if (response.status === 403 && !isRetry && window.MyMind3?.StorageAuth?.refreshToken) {
      console.log('[NodeAttachments] 업로드 토큰 만료, 재발급 후 재시도...');
      await window.MyMind3.StorageAuth.refreshToken();
      return await uploadAttachment(mindmapId, nodeId, file, true);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    return data.attachment;
  }

  /**
   * 첨부파일 삭제
   */
  async function deleteAttachment(mindmapId, nodeId, filename, isRetry = false) {
    // Storage Token 및 CSRF 토큰 가져오기
    const storageToken = await getStorageToken();
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};

    const headers = { ...csrfHeaders };
    if (storageToken) {
      headers['X-Storage-Token'] = storageToken;
    }

    const response = await fetch(
      `/api/attachments/${encodeURIComponent(mindmapId)}/node/${nodeId}/${encodeURIComponent(filename)}`,
      {
        method: 'DELETE',
        headers,
        credentials: 'include'
      }
    );

    // 403 에러 시 토큰 재발급 후 재시도
    if (response.status === 403 && !isRetry && window.MyMind3?.StorageAuth?.refreshToken) {
      console.log('[NodeAttachments] 삭제 토큰 만료, 재발급 후 재시도...');
      await window.MyMind3.StorageAuth.refreshToken();
      return await deleteAttachment(mindmapId, nodeId, filename, true);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error);
    }

    return true;
  }

  /**
   * 탭 바로 아래에 첨부파일 컨테이너 찾기/생성
   */
  function getPreviewAttachmentContainer() {
    // 탭 요소 찾기
    const tabsDiv = document.getElementById('customEditorTabs');
    if (!tabsDiv) return null;

    // 기존 컨테이너 찾기 (탭의 형제 요소로)
    let container = tabsDiv.parentElement.querySelector('.preview-attachment-list');
    if (!container) {
      // 새로 생성하여 탭 바로 아래에 삽입
      container = document.createElement('div');
      container.className = 'preview-attachment-list';
      tabsDiv.insertAdjacentElement('afterend', container);
    }
    return container;
  }

  /**
   * 첨부파일 리스트 렌더링 (프리뷰 내용 상단에 표시)
   */
  function renderAttachmentList(attachments, mindmapId, nodeId) {
    // 기존 정적 컨테이너는 숨김
    const oldContainer = document.getElementById('attachmentListContainer');
    if (oldContainer) {
      oldContainer.style.display = 'none';
      oldContainer.innerHTML = '';
    }

    // 프리뷰 내 컨테이너 가져오기
    const container = getPreviewAttachmentContainer();
    if (!container) return;

    if (!attachments || attachments.length === 0) {
      container.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    container.style.display = 'block';
    container.innerHTML = `
      <div class="attachment-items">
        ${attachments.map(file => `
          <div class="attachment-item" data-filename="${escapeHtml(file.filename)}">
            <span class="file-icon">${getFileIcon(file.type)}</span>
            <span class="file-name" title="${escapeHtml(file.originalName || file.filename)}">${escapeHtml(file.filename)}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
            <button class="btn-preview" title="미리보기/다운로드" data-action="preview">${mmIcon('eye', 14)}</button>
            <button class="btn-delete" title="삭제" data-action="delete">${mmIcon('trash', 14)}</button>
          </div>
        `).join('')}
      </div>
    `;

    // 이벤트 핸들러 연결
    container.querySelectorAll('.attachment-item').forEach(item => {
      const filename = item.dataset.filename;

      // 미리보기/다운로드 - 이벤트 버블링 방지 추가
      item.querySelector('[data-action="preview"]').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const url = `/api/attachments/${encodeURIComponent(mindmapId)}/node/${nodeId}/${encodeURIComponent(filename)}`;
        console.log('[NodeAttachments] 파일 미리보기:', url);
        window.open(url, '_blank');
      });

      // 삭제 - 이벤트 버블링 방지 추가
      item.querySelector('[data-action="delete"]').addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (!confirm(t('attachConfirmDelete', '파일을 삭제하시겠습니까?'))) return;

        try {
          await deleteAttachment(mindmapId, nodeId, filename);
          showToast(t('attachFileDeleted', '파일이 삭제되었습니다'), 'success');
          // 목록 새로고침
          refreshAttachmentList();
        } catch (error) {
          showToast(error.message || t('attachDeleteFailed', '파일 삭제에 실패했습니다'), 'error');
        }
      });
    });
  }

  /**
   * HTML 이스케이프
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 토스트 메시지 표시
   */
  function showToast(message, type = 'info') {
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      alert(message);
    }
  }

  /**
   * 첨부파일 목록 새로고침 및 버튼 상태 업데이트
   */
  async function refreshAttachmentList() {
    console.log('[NodeAttachments] refreshAttachmentList 호출됨');

    // 버튼 상태 먼저 업데이트
    updateAttachButtonState();

    const mindmapId = getCurrentMindmapId();
    const nodeId = getCurrentNodeId();

    console.log('[NodeAttachments] 현재 상태:', { mindmapId, nodeId });

    if (!mindmapId || !nodeId) {
      console.log('[NodeAttachments] mindmapId 또는 nodeId 없음 - 목록 숨김');
      const container = document.getElementById('attachmentListContainer');
      if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
      }
      // 프리뷰 컨테이너도 숨김
      const previewContainer = getPreviewAttachmentContainer();
      if (previewContainer) {
        previewContainer.style.display = 'none';
      }
      return;
    }

    console.log('[NodeAttachments] 첨부파일 목록 로드 시작:', { mindmapId, nodeId });
    const attachments = await loadAttachments(mindmapId, nodeId);
    console.log('[NodeAttachments] 첨부파일 목록 로드 완료:', attachments);
    renderAttachmentList(attachments, mindmapId, nodeId);
  }

  // 파일 크기 제한 (10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  /**
   * 파일 업로드 처리
   */
  async function handleFileUpload(files) {
    const mindmapId = getCurrentMindmapId();
    const nodeId = getCurrentNodeId();

    if (!mindmapId || !nodeId) {
      showToast(t('attachSelectNodeFirst', '노드를 먼저 선택해주세요'), 'warning');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      // 파일 크기 체크
      if (file.size > MAX_FILE_SIZE) {
        const sizeStr = window.MyMind3?.Intl ? window.MyMind3.Intl.formatFileSize(file.size) : (file.size / (1024 * 1024)).toFixed(1) + ' MB';
        showToast(`${file.name}: ${t('attachFileSizeExceed', '파일 크기 초과')} (${sizeStr} / ${t('attachMaxSize', '최대 10MB')})`, 'error');
        failCount++;
        continue;
      }

      try {
        await uploadAttachment(mindmapId, nodeId, file);
        successCount++;
      } catch (error) {
        console.error('[NodeAttachments] 업로드 실패:', file.name, error);
        failCount++;
        showToast(`${file.name}: ${error.message}`, 'error');
      }
    }

    if (successCount > 0) {
      showToast(t('attachUploadSuccess', '{count}개 파일이 업로드되었습니다').replace('{count}', successCount), 'success');
      refreshAttachmentList();
    }
  }

  /**
   * 초기화
   */
  function init() {
    // 중복 초기화 방지
    if (isInitialized) {
      console.log('[NodeAttachments] 이미 초기화됨 - 스킵');
      return;
    }
    isInitialized = true;

    console.log('[NodeAttachments] 초기화 시작...');

    // 파일 첨부 버튼/라벨 및 input
    const attachFileBtn = document.getElementById('attachFileBtn');
    const attachFileInput = document.getElementById('attachFileInput');

    console.log('[NodeAttachments] 요소 확인:', {
      attachFileBtn: !!attachFileBtn,
      attachFileInput: !!attachFileInput
    });

    if (attachFileInput && attachFileBtn) {
      // 버튼 클릭 시 hidden input.click() 호출 (문서 기반 복원)
      attachFileBtn.addEventListener('click', function(e) {
        const nodeId = getCurrentNodeId();
        const mindmapId = getCurrentMindmapId();

        if (!nodeId || !mindmapId) {
          console.log('[NodeAttachments] 노드/마인드맵이 선택되지 않음 - 파일 선택 차단');
          showToast(t('attachSelectNodeFirst', '노드를 먼저 선택해주세요'), 'warning');
          return;
        }

        console.log('[NodeAttachments] 버튼 클릭 - 파일 선택 다이얼로그 열기');
        attachFileInput.click();
      });

      // 파일 선택 이벤트
      attachFileInput.addEventListener('change', async (e) => {
        console.log('[NodeAttachments] 파일 선택됨:', e.target.files.length, '개');
        const files = e.target.files;
        if (files.length === 0) return;

        await handleFileUpload(Array.from(files));
        attachFileInput.value = ''; // 초기화
      });

      console.log('[NodeAttachments] button 클릭 + input change 이벤트 등록 완료');
    } else {
      console.error('[NodeAttachments] input 또는 button 요소를 찾을 수 없음');
    }

    // 노드 선택 시 첨부파일 목록 새로고침 이벤트 리스너
    document.addEventListener('nodeSelected', refreshAttachmentList);

    // 마인드맵 노드 클릭 시 버튼 상태 업데이트 (Loop 7: 이벤트 가로채기 방지)
    // 주의: document.addEventListener('click', ...) 제거 - 다른 클릭 이벤트와 충돌 가능성
    // nodeSelected 이벤트로 대체
    document.addEventListener('nodeSelected', () => {
      setTimeout(updateAttachButtonState, 100);
    });

    // 에디터 콘텐츠 로드 시 버튼 상태 업데이트 (MutationObserver 사용)
    const editorContainer = document.getElementById('mdEditor') || document.querySelector('.toastui-editor');
    if (editorContainer) {
      const observer = new MutationObserver(() => {
        updateAttachButtonState();
      });
      observer.observe(editorContainer, { childList: true, subtree: true });
    }

    // 주기적으로 버튼 상태 확인 (폴백) - 성능 최적화 적용
    let debugCount = 0;
    let lastButtonState = null; // 마지막 버튼 상태 저장
    setInterval(() => {
      const nodeId = getCurrentNodeId();
      const mindmapId = getCurrentMindmapId();
      const btn = document.getElementById('attachFileBtn');

      // 처음 5번만 디버깅 로그 출력
      if (debugCount < 5) {
        console.log('[NodeAttachments] 상태 체크:', {
          nodeId,
          mindmapId,
          btnExists: !!btn,
          selectedNodeId: window.selectedNodeId,
          currentFolder: window.currentFolder
        });
        debugCount++;
      }

      if (btn) {
        const shouldBeEnabled = !!(nodeId && mindmapId);
        // label 요소는 disabled 속성이 없으므로 pointer-events로 상태 판단
        const isCurrentlyEnabled = btn.style.pointerEvents !== 'none';

        // 상태가 변경되었을 때만 업데이트 (중복 업데이트 방지)
        if (isCurrentlyEnabled !== shouldBeEnabled && lastButtonState !== shouldBeEnabled) {
          console.log('[NodeAttachments] 상태 변경:', {
            isCurrentlyEnabled,
            shouldBeEnabled
          });
          updateAttachButtonState();
          lastButtonState = shouldBeEnabled;
        }
      }
    }, 500);

    console.log('[NodeAttachments] 초기화 완료');
  }

  // DOM 로드 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 전역으로 노출
  window.NodeAttachments = {
    loadAttachments,
    uploadAttachment,
    deleteAttachment,
    refreshAttachmentList,
    handleFileUpload,
    updateAttachButtonState
  };

})();
