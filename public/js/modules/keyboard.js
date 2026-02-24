/**
 * 키보드 단축키 모듈
 * @module modules/keyboard
 * @description 키보드 단축키 기능
 */

/**
 * 키보드 단축키 설정
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function (e) {
    // Ctrl+D: 선택된 노드 복사
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      const selectedNode = document.querySelector('.mindmap-node.selected');
      if (selectedNode) {
        const nodeId = parseInt(selectedNode.getAttribute('data-id'));
        window.MyMind3.NodeRenderer.copyNode(nodeId);
      }
    }

    // Delete 키: 선택된 노드 삭제 (입력/에디터에서는 제외)
    if (e.key === 'Delete') {
      const activeElement = document.activeElement;
      const isInEditor = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true' ||
        activeElement.closest('#contentEditor') ||
        activeElement.closest('#promptInput')
      );

      // 입력/에디터 필드가 아닐 때만 노드 삭제
      if (!isInEditor) {
        e.preventDefault();
        const selectedNode = document.querySelector('.mindmap-node.selected');
        if (selectedNode) {
          const nodeId = parseInt(selectedNode.getAttribute('data-id'));
          window.MyMind3.NodeRenderer.confirmDeleteNode(nodeId);
        }
      }
    }

    // Ctrl+S: 콘텐츠 저장
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();

      console.log('[KeyboardShortcuts] Ctrl+S pressed, saving content...');

      const currentNodeId = window.MyMind3?.MindMapData?.currentEditingNodeId;
      if (!currentNodeId || !window.MyMind3?.MindMapData) {
        if (typeof showToast === 'function') {
          showToast('No node selected or data not ready', 'warning', 2000);
        }
        return;
      }

      let content = '';

      // Toast UI Editor 활성화 여부 확인
      if (window.MyMind3Editor && window.MyMind3Editor.editor && typeof window.MyMind3Editor.editor.getMarkdown === 'function') {
        content = window.MyMind3Editor.editor.getMarkdown();
      }
      // 폴백: textarea 에디터
      else {
        const editor = document.getElementById('contentEditor');
        content = editor ? editor.value : '';
      }

      // "~~~~" (코드 펜스 마커) 제거
      content = content.replace(/^~~~~\s*$/gm, '');
      content = content.trim();

      // 메모리에 저장
      window.MyMind3.MindMapData.saveNodeContent(currentNodeId, content);

      // 폴더 ID 가져오기 (editor.js saveContent()와 동일한 방식)
      const currentFolder = window.currentQAFolder || window.MyMind3?.currentFolder || localStorage.getItem('currentFolder');
      if (!currentFolder) {
        if (typeof showToast === 'function') {
          showToast('No folder selected', 'warning', 2000);
        }
        return;
      }

      // 파일로 저장
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
              if (typeof showToast === 'function') {
                showToast('Content saved successfully!', 'success', 2000);
              }
            } else {
              if (typeof showToast === 'function') {
                showToast(`Save failed: ${data.message}`, 'error', 3000);
              }
            }
          })
          .catch(error => {
            console.error('Save error:', error);
            if (typeof showToast === 'function') {
              showToast('Save failed: Network error', 'error', 3000);
            }
          });
      })();
    }

    // Insert: 선택된 노드에 자식 추가
    if (e.key === 'Insert') {
      e.preventDefault();
      const selectedNode = document.querySelector('.mindmap-node.selected');
      if (selectedNode) {
        const nodeId = parseInt(selectedNode.getAttribute('data-id'));
        window.MyMind3.NodeRenderer.addChildNode(nodeId);
      }
    }

    // F2: 선택된 노드 제목 편집
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

// 전역 접근 가능하도록 등록
window.setupKeyboardShortcuts = setupKeyboardShortcuts;

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setupKeyboardShortcuts };
}
