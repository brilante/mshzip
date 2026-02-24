/**
 * AI 메시지 송수신 모듈
 * AI 서비스와의 통신, 메시지 전송, 요청 취소, Q&A 저장 기능을 담당
 *
 * @module ai-messaging
 * @requires window.MyMindAI - AI 상태 관리 전역 객체
 * @requires window.csrfUtils - CSRF 토큰 유틸리티
 */
(function() {
  'use strict';

  // ============================================
  // 유틸리티 함수 (외부 의존성 참조)
  // ============================================

  /**
   * 최적 토큰 수 계산 (외부 함수 호출)
   * @param {string} service - AI 서비스명
   * @param {string} model - 모델명
   * @param {string} requestType - 요청 타입 ('chat' | 'nodeExpansion')
   * @returns {number} 최적 토큰 수
   */
  function getOptimalMaxTokens(service, model, requestType) {
    // window.getOptimalMaxTokens가 있으면 사용, 없으면 기본값
    if (typeof window.getOptimalMaxTokens === 'function') {
      return window.getOptimalMaxTokens(service, model, requestType);
    }

    // 기본값 (서비스별 기본 토큰 한도)
    const defaultTokens = {
      gpt: 4096,
      grok: 8192,
      claude: 8192,
      gemini: 8192,
      local: 32000
    };
    const maxTokens = defaultTokens[service] || 4096;

    if (requestType === 'nodeExpansion') {
      return Math.floor(maxTokens * 0.5);
    }
    return Math.floor(maxTokens * 0.8);
  }

  /**
   * AI 응답 포맷팅 (외부 함수 호출)
   * @param {string} content - AI 응답 텍스트
   * @returns {string} 포맷팅된 HTML
   */
  function formatAIResponse(content) {
    if (typeof window.formatAIResponse === 'function') {
      return window.formatAIResponse(content);
    }
    // 기본 포맷팅 (마크다운 없이)
    return `<p style="margin: 12px 0; line-height: 1.6;">${content}</p>`;
  }

  /**
   * 크레딧 잔액 조회 (외부 함수 호출)
   * @returns {Promise<Object|null>} 크레딧 잔액 정보
   */
  async function getCreditBalance() {
    if (typeof window.getCreditBalance === 'function') {
      return window.getCreditBalance();
    }
    return null;
  }

  /**
   * 크레딧 차감 (외부 함수 호출)
   * @param {string} service - AI 서비스명
   * @param {string} model - 모델명
   * @param {number} tokens - 사용된 토큰 수
   * @returns {Promise<Object>} 차감 결과
   */
  async function deductCredits(service, model, tokens) {
    if (typeof window.deductCredits === 'function') {
      return window.deductCredits(service, model, tokens);
    }
    return { success: true, skipped: true };
  }

  // ============================================
  // Q&A 자동 저장
  // ============================================

  /**
   * Q&A 항목 자동 저장
   * AI 응답을 폴더별 Q&A 파일에 저장
   *
   * @param {string} qaItemHtml - 저장할 Q&A HTML
   * @param {string|null} service - AI 서비스명 (다중 AI 모드에서 사용)
   * @returns {Promise<void>}
   */
  async function autoSaveQAItem(qaItemHtml, service = null) {
    // AI 응답의 경우 HTML이 아닌 원본 마크다운을 저장
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
          console.log('[autoSaveQAItem] 원본 마크다운 추출 성공');

          // 메타데이터 추출 (모델명, 시간)
          const metadataDiv = tempDiv.querySelector('.ai-metadata');
          let metadataHtml = '';
          if (metadataDiv) {
            metadataHtml = metadataDiv.outerHTML;
          }

          // 마크다운 content를 HTML로 재구성 (저장 시에는 data-original-content 속성 제거)
          const markdownDiv = `<div class="ai-content" style="color: #000000; line-height: 1.6; white-space: pre-wrap;">${markdownContent}</div>`;

          // 복사 버튼 HTML 추가
          const copyButtonHTML = `<div style="text-align: right; margin-top: 10px;"><button class="copy-btn" style="padding: 6px 14px; background: #1976d2; color: #fff; border: none; border-radius: 6px; cursor: pointer;">${t('aiMsgCopy', '복사')}</button></div>`;

          // 전체 HTML 재구성 (메타데이터 + 마크다운 + 복사 버튼)
          const messageDiv = tempDiv.querySelector('div[style*="margin-bottom: 20px"]');
          if (messageDiv) {
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

            console.log('[autoSaveQAItem] 마크다운과 복사 버튼 포함하여 저장');
          }
        } catch (e) {
          console.error('[autoSaveQAItem] 마크다운 추출 실패:', e);
          // 실패 시 원본 HTML 사용
        }
      }
    }

    // JSON의 mindMapData에서 폴더명과 qaFile 경로 가져오기
    let currentFolder = null;
    let qaFile = 'qa.html'; // 기본값

    if (window.MyMind3?.MindMapData?.mindMapData?.length > 0) {
      const rootNode = window.MyMind3.MindMapData.mindMapData[0];
      if (rootNode && rootNode.title) {
        currentFolder = rootNode.title;
        // JSON에 qaFile 정보가 있으면 사용
        if (rootNode.qaFile) {
          qaFile = rootNode.qaFile;
        }
        console.log('[autoSaveQAItem] 폴더:', currentFolder, '/ QA 파일:', qaFile);
      }
    }

    // Fallback: 메모리에 저장된 currentQAFolder 사용
    if (!currentFolder) {
      currentFolder = window.currentQAFolder;
      console.log('[autoSaveQAItem] window.currentQAFolder 사용:', currentFolder);
    }

    if (!currentFolder) {
      console.error('[autoSaveQAItem] 폴더를 찾을 수 없음! Q&A 저장 불가');
      return;
    }

    try {
      console.log('[autoSaveQAItem] 폴더에 Q&A 저장:', currentFolder);

      // service 파라미터가 있으면 AI별 Q&A 파일에 저장 (다중 AI 모드)
      const requestBody = {
        folderName: currentFolder,
        qaItem: processedHtml
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
        console.log('[autoSaveQAItem] Q&A 저장 성공:', result.path);

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
              console.log(`[autoSaveQAItem] "${savedFileName}"을 qaFiles에 추가:`, rootNode.qaFiles);

              // JSON 파일도 자동 저장 (qaFiles 변경사항 반영)
              try {
                const saveData = {
                  mindMapData: window.MyMind3.MindMapData.mindMapData,
                  nextNodeId: window.MyMind3.MindMapData.nextNodeId || 1
                };
                const csrfSaveHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
                const saveResponse = await fetch('/api/mindmap/save', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...csrfSaveHeaders },
                  credentials: 'include',
                  body: JSON.stringify({
                    folder: currentFolder,
                    data: saveData
                  })
                });
                if (saveResponse.ok) {
                  console.log('[autoSaveQAItem] JSON 저장 완료 (qaFiles 업데이트)');
                }
              } catch (saveErr) {
                console.error('[autoSaveQAItem] JSON 저장 실패:', saveErr);
              }
            }
          }
        }
      } else {
        console.error('[autoSaveQAItem] Q&A 저장 실패:', result.error);
      }
    } catch (error) {
      console.error('[autoSaveQAItem] Q&A 저장 오류:', error);
    }
  }

  // ============================================
  // Q&A 초기화
  // ============================================

  /**
   * Q&A 기록 초기화 (삭제)
   * 커스텀 모달을 사용하여 확인 후 삭제
   *
   * @returns {Promise<void>}
   */
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
      let services = [];
      if (window.MyMind3?.MindMapData?.mindMapData?.length > 0) {
        const rootNode = window.MyMind3.MindMapData.mindMapData[0];
        if (rootNode && rootNode.qaFiles && rootNode.qaFiles.length > 0) {
          // qaFiles에서 서비스 이름 추출 (예: "gpt_qa.html" -> "gpt")
          services = rootNode.qaFiles.map(file => {
            const match = file.match(/^(.+)_qa\.html$/);
            return match ? match[1] : null;
          }).filter(s => s !== null);
          console.log('[clearQA] qaFiles에서 서비스 추출:', services);
        }
      }

      // services가 비어있으면 서버에서 자동 감지하도록 빈 배열 전송
      if (services.length === 0) {
        console.log('[clearQA] 서비스 목록 비어있음, 서버에서 자동 감지');
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
            console.log('[clearQA] qaFiles 배열 초기화 완료');

            // JSON 파일에 변경사항 자동 저장
            if (typeof window.MyMind3Simple?.saveMindmapSilently === 'function') {
              window.MyMind3Simple.saveMindmapSilently();
              console.log('[clearQA] 마인드맵 저장 완료');
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
      console.error('[clearQA] 오류:', error);
      if (typeof showToast === 'function') {
        showToast(window.i18n?.toastDeleteError || '삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  }

  // ============================================
  // AI 요청 취소
  // ============================================

  /**
   * AI 요청 취소
   * 현재 진행 중인 AI 요청을 중단
   */
  function cancelAIRequest() {
    console.log('[AI] 요청 취소 중...');

    // Abort fetch 요청
    if (window.MyMindAI.abortController) {
      window.MyMindAI.abortController.abort();
      window.MyMindAI.abortController = null;
    }

    // 스트림 리더 취소
    if (window.MyMindAI.streamReader) {
      window.MyMindAI.streamReader.cancel();
      window.MyMindAI.streamReader = null;
    }

    // UI 상태 리셋 - 입력 요소 리스타일 복원
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
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = t('aiMsgSend', '전송'); }
    if (clearQaBtn) clearQaBtn.disabled = false;

    // 처리 상태 리셋
    window.MyMindAI.isProcessing = false;

    // 취소 메시지 표시
    const llmResponse = document.getElementById('llmResponse');
    if (llmResponse) {
      const cancelDiv = document.createElement('div');
      cancelDiv.className = 'message system-message';
      cancelDiv.style.cssText = 'padding: 10px; margin-bottom: 10px; background-color: #fff3cd; border-left: 4px solid #ffc107; color: #856404; border-radius: 4px; font-size: 14px;';
      cancelDiv.textContent = t('aiMsgRequestCancelled', 'AI 요청이 사용자에 의해 중단되었습니다.');
      llmResponse.appendChild(cancelDiv);
      llmResponse.scrollTop = llmResponse.scrollHeight;
    }

    console.log('[AI] 요청 취소 완료');
  }

  // ============================================
  // 단일 AI 서비스 호출
  // ============================================

  /**
   * 단일 AI 서비스 호출 (스트리밍 및 이미지 첨부 지원)
   *
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
   * @returns {Promise<Object>} AI 응답 결과
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
    // 1. 구독 크레딧 -> 2. 무료 크레딧 -> 3. 일반 크레딧 -> 4. 사용자 API Key
    let paymentMethod = 'credit'; // 항상 크레딧 먼저 시도
    let apiKey = '';
    let userApiKey = window.MyMindAI.apiKeys[service] || ''; // 사용자 등록 API Key

    // 사전 체크: 크레딧과 API Key 확인
    let useApiKeyDueToNoCredits = false;
    try {
      const balance = await getCreditBalance();
      // balance.credits가 객체({ total, free, service, paid })인 경우 total 값 추출
      const credits = balance?.credits;
      const totalCredits = typeof credits === 'number' ? credits : (credits?.total || 0);

      if (totalCredits <= 0) {
        if (!userApiKey) {
          throw new Error(`크레딧이 없고 ${service.toUpperCase()} API Key도 등록되지 않았습니다. 크레딧을 충전하거나 API Key를 등록해주세요.`);
        } else {
          // 크레딧은 없지만 API Key가 있는 경우 - API Key 사용으로 전환
          useApiKeyDueToNoCredits = true;
          paymentMethod = 'apikey';
          apiKey = userApiKey;
          console.log(`[AI] ${service} 서비스 - 크레딧 없음, API Key로 진행`);
        }
      } else {
        console.log(`[AI] ${service} 서비스 - 크레딧: ${totalCredits}, API Key: ${userApiKey ? '있음' : '없음'}`);
      }
    } catch (e) {
      if (e.message.includes('크레딧이 없고')) {
        throw e; // 명시적 거부 에러는 그대로 전달
      }
      console.warn('[AI] 크레딧 잔액 확인 실패:', e);
      // 크레딧 확인 실패 시 API Key가 없으면 거부
      if (!userApiKey) {
        throw new Error(`크레딧 잔액을 확인할 수 없고 ${service.toUpperCase()} API Key도 없습니다.`);
      } else {
        // 크레딧 확인 실패했지만 API Key가 있는 경우 - API Key 사용
        useApiKeyDueToNoCredits = true;
        paymentMethod = 'apikey';
        apiKey = userApiKey;
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

    // 스트리밍 지원 서비스 확인 (모든 AI 서비스 스트리밍 지원)
    const streamingServices = ['gpt', 'grok', 'claude', 'gemini', 'local'];
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

  // ============================================
  // 스트리밍 API 호출
  // ============================================

  /**
   * 스트리밍 API 호출 (/api/ai/chat-stream)
   *
   * @param {string} service - AI 서비스명
   * @param {string} message - 사용자 메시지
   * @param {Array} conversationHistory - 대화 히스토리
   * @param {Object} options - 옵션 객체
   * @returns {Promise<Object>} AI 응답 결과
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
        console.error(`[Credits] ${service} 백그라운드 차감 오류:`, err);
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

  // ============================================
  // 논스트리밍 API 호출
  // ============================================

  /**
   * 일반 API 호출 (/api/ai/chat) - 이미지 첨부 지원
   *
   * @param {string} service - AI 서비스명
   * @param {string} message - 사용자 메시지
   * @param {Array} conversationHistory - 대화 히스토리
   * @param {Object} options - 옵션 객체
   * @returns {Promise<Object>} AI 응답 결과
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
          image: imageData  // 이미지 첨부 지원
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorCode = errorData.code;
        const canUseClientApiKey = errorData.canUseClientApiKey || false;

        // 크레딧 부족 에러 처리 (자동 전환 플래그 포함)
        if (errorCode === 'INSUFFICIENT_CREDITS') {
          const errorMsg = errorData.error || t('aiMsgCreditsExhausted', '크레딧이 소진되었습니다.');
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
        console.error(`[Credits] ${service} 백그라운드 차감 오류:`, err);
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

  // ============================================
  // 메인 AI 메시지 전송
  // ============================================

  /**
   * AI 메시지 전송 (메인 함수)
   * 사용자 입력을 받아 AI 서비스에 전송하고 응답을 처리
   *
   * @returns {Promise<void>}
   */
  async function sendAIMessage() {
    const promptInput = document.getElementById('promptInput');
    const sendBtn = document.getElementById('sendPromptBtn');
    const llmResponse = document.getElementById('llmResponse');

    // 크레딧 우선 사용 정책
    const currentService = window.MyMindAI.currentService;
    let paymentMethod = 'credit';
    let currentApiKey = window.MyMindAI.getCurrentApiKey() || '';

    // 사전 체크: 크레딧과 API Key 확인
    try {
      const balance = await getCreditBalance();
      // balance.credits가 객체({ total, free, service, paid })인 경우 total 값 추출
      const credits = balance?.credits;
      const totalCredits = typeof credits === 'number' ? credits : (credits?.total || 0);

      if (totalCredits <= 0) {
        if (!currentApiKey) {
          // 크레딧도 없고 API Key도 없는 경우
          const serviceName = currentService.toUpperCase();
          alert(t('aiMsgNoCreditsNoKey', '크레딧이 없고 {service} API Key도 등록되지 않았습니다.\n\n크레딧을 충전하거나 Settings -> AI 설정에서 API Key를 등록해주세요.').replace('{service}', serviceName));
          const goToSettings = confirm(t('aiMsgGoToSettings', '설정 페이지로 이동하시겠습니까?'));
          if (goToSettings && typeof showSettingsLayerPopup === 'function') {
            showSettingsLayerPopup('#ai');
          }
          return;
        } else {
          // 크레딧은 없지만 API Key가 있는 경우 - 그냥 진행
          console.log(`[AI] ${currentService} 서비스 - 크레딧 없음, API Key로 진행`);
        }
      } else {
        console.log(`[AI] ${currentService} 서비스 - 크레딧: ${totalCredits}, API Key: ${currentApiKey ? '있음' : '없음'}`);
      }
    } catch (e) {
      console.warn('[AI] 크레딧 잔액 확인 실패:', e);
      if (!currentApiKey) {
        alert(t('aiMsgCreditCheckFailedNoKey', '크레딧 잔액을 확인할 수 없고 API Key도 없습니다.\n\nSettings -> AI 설정에서 API Key를 등록해주세요.'));
        return;
      } else {
        // 크레딧 확인 실패했지만 API Key가 있는 경우 - 그냥 진행
        console.log('[AI] 크레딧 확인 실패, API Key로 진행');
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

    // 새 AbortController 생성
    window.MyMindAI.abortController = new AbortController();

    // 처리 상태 설정
    window.MyMindAI.isProcessing = true;
    sendBtn.disabled = false; // 취소 가능하도록 버튼 활성화 유지
    sendBtn.textContent = t('aiMsgProcessing', '처리중...');

    // 체크된 노드 컨텍스트 가져오기 (비동기)
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

    // 대화 히스토리 초기화 (없으면)
    if (!window.MyMindAI.conversationHistory) {
      window.MyMindAI.conversationHistory = [];
    }

    // 사용자 메시지를 대화 히스토리에 추가
    window.MyMindAI.conversationHistory.push({
      role: 'user',
      content: finalMessage
    });

    // 최근 10개 메시지만 유지 (5회 대화)
    if (window.MyMindAI.conversationHistory.length > 10) {
      window.MyMindAI.conversationHistory = window.MyMindAI.conversationHistory.slice(-10);
    }

    promptInput.value = '';

    // 통합된 AI 호출: 단일/다중 모드 모두 sendMultiAIMessage 사용
    try {
      console.log('[AI] 통합 AI 호출 - multiSelectMode:', window.MyMindAI.multiSelectMode);

      // sendMultiAIMessage는 외부에서 정의됨 (app-init.js)
      if (typeof window.sendMultiAIMessage === 'function') {
        await window.sendMultiAIMessage(finalMessage, window.MyMindAI.conversationHistory);
      } else {
        console.error('[AI] sendMultiAIMessage 함수를 찾을 수 없음');
        throw new Error('AI 메시지 전송 함수를 찾을 수 없습니다.');
      }
    } catch (error) {
      // Abort 에러는 별도 처리
      if (error.name === 'AbortError') {
        console.log('[AI] 요청이 취소됨');
        return;
      }
      console.error('[AI] 요청 실패:', error);
      if (typeof addMessageToDisplay === 'function') {
        addMessageToDisplay('error', `AI 요청 실패: ${error.message}`);
      }
    } finally {
      // 처리 상태 리셋
      window.MyMindAI.isProcessing = false;
      sendBtn.disabled = false;
      sendBtn.textContent = t('aiMsgSend', '전송');

      // AbortController 및 reader 정리
      window.MyMindAI.abortController = null;
      window.MyMindAI.streamReader = null;

      // 크레딧 결제 모드인 경우 잔액 UI 업데이트
      try {
        let aiSettings = window.MyMind3AISettings?.getAISettings?.();
        if (!aiSettings) {
          const savedSettings = localStorage.getItem('mymind3_ai_settings');
          if (savedSettings) aiSettings = JSON.parse(savedSettings);
        }
        let settingsPaymentMethod = 'apikey';
        if (aiSettings?.services?.[currentService]) {
          settingsPaymentMethod = aiSettings.services[currentService].paymentMethod || 'apikey';
        }

        if (settingsPaymentMethod === 'credit') {
          const balance = await getCreditBalance();
          if (balance && balance.credits && typeof window.updateCreditBalanceUI === 'function') {
            window.updateCreditBalanceUI(balance.credits);
            console.log('[AI] 크레딧 잔액 업데이트:', balance.credits);
          }
        }
      } catch (e) {
        console.warn('[AI] 크레딧 잔액 UI 업데이트 실패:', e);
      }
    }
  }

  // ============================================
  // 전역 객체에 함수 노출
  // ============================================

  // window.AIMessaging 네임스페이스 생성
  window.AIMessaging = {
    autoSaveQAItem,
    clearQA,
    cancelAIRequest,
    callSingleAIService,
    callSingleAIServiceStreaming,
    callSingleAIServiceNonStreaming,
    sendAIMessage
  };

  // 개별 함수들도 window에 직접 노출 (기존 코드 호환성)
  window.autoSaveQAItem = autoSaveQAItem;
  window.clearQA = clearQA;
  window.cancelAIRequest = cancelAIRequest;
  window.callSingleAIService = callSingleAIService;
  window.callSingleAIServiceStreaming = callSingleAIServiceStreaming;
  window.callSingleAIServiceNonStreaming = callSingleAIServiceNonStreaming;
  window.sendAIMessage = sendAIMessage;

  console.log('[AI Messaging] 모듈 로드 완료');

})();
