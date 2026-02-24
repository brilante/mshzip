/**
 * buttons.js - 버튼 상태 관리 모듈
 *
 * 마인드맵 UI의 각종 버튼 상태를 관리합니다.
 * - 메인 추가 버튼
 * - 저장 버튼
 * - 응답 패널 버튼
 * - 트리 생성 버튼
 */

(function() {
  'use strict';

  /**
   * 메인 추가 버튼 상태 업데이트
   * 루트 노드가 1개 이상이면 비활성화, 없으면 활성화
   */
  function updateMainAddButtonState() {
    const addMainBtn = document.getElementById('addMainTitleBtn');
    if (!addMainBtn) return;

    const rootNodeCount = window.MyMind3?.MindMapData?.mindMapData?.length || 0;

    if (rootNodeCount >= 1) {
      // 루트 노드가 1개 이상 있으면 비활성화
      addMainBtn.disabled = true;
      addMainBtn.style.opacity = '0.5';
      addMainBtn.style.cursor = 'not-allowed';
      addMainBtn.title = '루트 노드는 1개만 생성할 수 있습니다';
    } else {
      // 루트 노드가 없으면 활성화
      addMainBtn.disabled = false;
      addMainBtn.style.opacity = '1';
      addMainBtn.style.cursor = 'pointer';
      addMainBtn.title = '메인 노드 추가';
    }

    console.log(`[updateMainAddButtonState] 루트 노드 수: ${rootNodeCount}, 버튼 상태: ${addMainBtn.disabled ? '비활성화' : '활성화'}`);
  }

  /**
   * 저장 버튼 상태 업데이트
   * 노드가 있으면 활성화, 없으면 비활성화
   */
  function updateSaveButtonState() {
    const saveBtn = document.getElementById('saveMapBtn');
    const hasNodes = window.MyMind3?.MindMapData?.mindMapData?.length > 0;

    if (saveBtn) {
      saveBtn.disabled = !hasNodes;
    }

    console.log(`[updateSaveButtonState] 노드 존재: ${hasNodes}, 저장 버튼 상태: ${hasNodes ? '활성화' : '비활성화'}`);
  }

  /**
   * 응답 패널 버튼 상태 업데이트
   * 루트 노드가 있으면 활성화, 없으면 비활성화
   */
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

  /**
   * 트리 생성 버튼 상태 업데이트
   * 노드가 있고 저장된 상태이면 활성화, 아니면 비활성화
   */
  function updateTreeGenButtonState() {
    const treeGenBtn = document.getElementById('generateTreeBtn');
    const hasNodes = window.MyMind3?.MindMapData?.mindMapData?.length > 0;
    const currentFolder = window.MyMind3?.currentFolder || localStorage.getItem('currentFolder');
    const isSaved = hasNodes && currentFolder;

    if (treeGenBtn) {
      treeGenBtn.disabled = !isSaved;
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

  /**
   * 모든 버튼 상태 한번에 업데이트
   */
  function updateAllButtonStates() {
    updateMainAddButtonState();
    updateSaveButtonState();
    updateResponsePanelButtonState();
    updateTreeGenButtonState();
  }

  // window 객체에 함수들 노출
  window.updateMainAddButtonState = updateMainAddButtonState;
  window.updateSaveButtonState = updateSaveButtonState;
  window.updateSaveImproveButtonState = updateSaveButtonState; // 하위 호환성
  window.updateResponsePanelButtonState = updateResponsePanelButtonState;
  window.updateTreeGenButtonState = updateTreeGenButtonState;
  window.updateAllButtonStates = updateAllButtonStates;

  console.log('[Module] buttons.js loaded');
})();
