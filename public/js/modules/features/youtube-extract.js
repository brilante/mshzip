/**
 * YouTube 텍스트 추출 모듈
 *
 * YouTube 영상에서 텍스트(자막/음성)를 추출하고
 * 마인드맵 노드로 변환하는 기능을 제공합니다.
 *
 * 의존성:
 * - showToast: 토스트 알림 표시
 * - csrfUtils: CSRF 토큰 처리
 * - MyMind3.MindMapData: 마인드맵 데이터 관리
 * - MyMind3.NodeRenderer: 노드 렌더링
 * - updateMainAddButtonState: 메인 추가 버튼 상태 업데이트
 * - updateSaveButtonState: 저장 버튼 상태 업데이트
 * - updateTreeGenButtonState: 트리 생성 버튼 상태 업데이트
 * - updateResponsePanelButtonState: 응답 패널 버튼 상태 업데이트
 */
(function() {
  'use strict';

  /**
   * YouTube 팝업 표시
   * 팝업을 열고 입력 필드를 초기화합니다.
   */
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

  /**
   * YouTube 팝업 닫기
   * 팝업을 숨기고 스크롤을 복원합니다.
   */
  function hideYoutubeExtractPopup() {
    const overlay = document.getElementById('youtubeExtractOverlay');
    const popup = document.getElementById('youtubeExtractPopup');

    if (overlay && popup) {
      overlay.classList.remove('show');
      popup.classList.remove('show');
      document.body.style.overflow = '';
    }
  }

  /**
   * YouTube 텍스트 추출 처리
   * 서버 API를 호출하여 YouTube 영상에서 텍스트를 추출합니다.
   */
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
    progressText.textContent = t('youtubeDownloading', '오디오 다운로드 중...');

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
        throw new Error(data.error || t('youtubeExtractFailed', '텍스트 추출에 실패했습니다.'));
      }

      // 성공
      progressFill.style.width = '100%';
      progressText.textContent = t('youtubeExtractDone', '완료!');

      setTimeout(() => {
        progressDiv.style.display = 'none';
        resultDiv.style.display = 'block';
        resultContent.textContent = data.text || t('youtubeNoText', '(추출된 텍스트 없음)');
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

  /**
   * YouTube 결과 복사
   * 추출된 텍스트를 클립보드에 복사합니다.
   */
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

  /**
   * YouTube 추출 결과로 노드 생성
   * 추출된 텍스트를 사용하여 마인드맵 루트 노드를 생성하고
   * 서버에 저장합니다.
   */
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
      createNodeBtn.textContent = t('youtubeCreatingNode', '생성 중...');
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

      // 3. 폴더명 설정 (영상 제목 사용, 특수문자 제거)
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
        console.log(`[YouTube -> Node] 노드 및 JSON 저장 완료: ${rootNode.id}`);

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

        showToast(window.i18n?.youtubeNodeCreated || 'YouTube 텍스트로 노드가 생성되었습니다.', 'success');
      } else {
        throw new Error('JSON 저장 실패');
      }
    } catch (error) {
      console.error('[YouTube -> Node] 오류:', error);
      showToast(window.i18n?.toastNodeCreateError || '노드 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      // 버튼 복원
      if (createNodeBtn) {
        createNodeBtn.disabled = false;
        createNodeBtn.textContent = t('youtubeCreateNodeBtn', '노드만들기');
      }
    }
  }

  /**
   * YouTube 팝업 이벤트 리스너 초기화
   * 팝업의 모든 버튼과 입력 필드에 이벤트 리스너를 연결합니다.
   */
  function initYoutubeExtractPopup() {
    const closeBtn = document.getElementById('youtubeExtractCloseBtn');
    const overlay = document.getElementById('youtubeExtractOverlay');
    const extractBtn = document.getElementById('youtubeExtractBtn');
    const copyBtn = document.getElementById('youtubeResultCopyBtn');
    const urlInput = document.getElementById('youtubeUrlInput');

    // 닫기 버튼 클릭
    if (closeBtn) {
      closeBtn.addEventListener('click', hideYoutubeExtractPopup);
    }

    // 오버레이 클릭 (팝업 외부 클릭 시 닫기)
    if (overlay) {
      overlay.addEventListener('click', hideYoutubeExtractPopup);
    }

    // 추출 버튼 클릭
    if (extractBtn) {
      extractBtn.addEventListener('click', handleYoutubeExtract);
    }

    // 복사 버튼 클릭
    if (copyBtn) {
      copyBtn.addEventListener('click', copyYoutubeResult);
    }

    // 노드만들기 버튼 이벤트 리스너
    const createNodeBtn = document.getElementById('youtubeCreateNodeBtn');
    if (createNodeBtn) {
      createNodeBtn.addEventListener('click', createNodeFromYoutubeText);
    }

    // URL 입력창에서 Enter 키 입력 시 추출 실행
    if (urlInput) {
      urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleYoutubeExtract();
        }
      });
    }
  }

  /**
   * 도구 페이지에서 노드 생성 요청 처리
   * 도구 페이지(새 탭 또는 팝업)에서 postMessage로 전송된 노드 생성 요청을 처리합니다.
   */
  async function handleToolsCreateNodeMessage(event) {
    // 메시지 타입 확인
    if (!event.data || event.data.type !== 'tools:createNode') {
      return;
    }

    const { title, content, source, videoId } = event.data;

    if (!content || !content.trim()) {
      showToast(t('youtubeNoTextToCreate', '생성할 텍스트가 없습니다.'), 'warning');
      return;
    }

    console.log(`[Tools -> Main] 노드 생성 요청 수신: source=${source}, title=${title}`);

    // 루트 노드 존재 여부 확인
    const rootNodeCount = window.MyMind3?.MindMapData?.mindMapData?.length || 0;
    if (rootNodeCount >= 1) {
      showToast(t('youtubeRootExists', '이미 루트 노드가 존재합니다. 먼저 초기화하거나 기존 맵에 추가하세요.'), 'warning');
      return;
    }

    try {
      // 노드 제목 생성
      const nodeTitle = title || `${source || '도구'} 추출`;

      // 1. 메인 노드 생성
      const rootNode = window.MyMind3.MindMapData.createMainTitle(nodeTitle);

      if (!rootNode) {
        showToast(t('youtubeNodeCreateFailed', '노드 생성에 실패했습니다.'), 'error');
        return;
      }

      // 2. 노드 콘텐츠 설정 (제목 + 본문)
      const htmlContent = `<h2>${nodeTitle}</h2>\n<p>${content.replace(/\n\n/g, '</p>\n<p>').replace(/\n/g, '<br>')}</p>`;
      rootNode.content = htmlContent;

      // 3. 폴더명 설정 (제목 사용, 특수문자 제거)
      const folderName = nodeTitle.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100);

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

      // 5. 마인드맵 JSON 저장
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
              source: source || 'tools'
            }
          }
        })
      });

      if (jsonResponse.ok) {
        console.log(`[Tools -> Main] 노드 및 JSON 저장 완료: ${rootNode.id}`);

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

        // 8. 마인드맵 렌더링
        window.MyMind3.NodeRenderer.renderMindMap();

        // 9. 버튼 상태 업데이트
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

        showToast(t('youtubeToolNodeCreated', '도구에서 노드가 생성되었습니다') + `: ${nodeTitle}`, 'success');
      } else {
        throw new Error('JSON 저장 실패');
      }
    } catch (error) {
      console.error('[Tools -> Main] 노드 생성 오류:', error);
      showToast(t('youtubeNodeCreateError', '노드 생성 중 오류가 발생했습니다.'), 'error');
    }
  }

  // window 객체에 함수들 노출
  window.showYoutubeExtractPopup = showYoutubeExtractPopup;
  window.hideYoutubeExtractPopup = hideYoutubeExtractPopup;
  window.handleYoutubeExtract = handleYoutubeExtract;
  window.copyYoutubeResult = copyYoutubeResult;
  window.createNodeFromYoutubeText = createNodeFromYoutubeText;
  window.initYoutubeExtractPopup = initYoutubeExtractPopup;

  // 페이지 로드 시 초기화
  document.addEventListener('DOMContentLoaded', initYoutubeExtractPopup);

  // 도구 페이지에서 오는 메시지 수신
  window.addEventListener('message', handleToolsCreateNodeMessage);

  console.log('[Module] youtube-extract.js loaded');
})();
