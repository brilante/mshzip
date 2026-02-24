/**
 * ============================================
 * ai-multi.js - 다중 AI 호출 관리 모듈
 * ============================================
 * 다중 AI 서비스 동시 호출, 평가, 자동 노드 생성 담당
 * - getSelectedAIServices: 활성화된 AI 서비스 목록 조회
 * - sendMultiAIMessage: 다중 AI 동시 호출
 * - buildEvaluationPrompt: 평가 프롬프트 생성
 * - performMultiAIEvaluation: 다중 AI 응답 평가
 * - autoCreateNodeFromQuestion: 질문에서 자동 노드 생성
 * - extractQuestionContext: 질문 컨텍스트 추출
 * ============================================
 */

(function() {
  'use strict';

  // ============================================
  // 선택된 AI 서비스 목록 가져오기
  // ============================================

  /**
   * 현재 활성화된 AI 서비스 목록 반환
   * - 단일 모드: 현재 선택된 서비스만 반환
   * - 다중 모드: 모든 활성화된 서비스 반환
   * @returns {string[]} 활성화된 서비스 ID 배열
   */
  function getSelectedAIServices() {
    const services = ['gpt', 'grok', 'claude', 'gemini', 'local'];

    // 단일 모드: 현재 선택된 서비스만 반환
    if (!window.MyMindAI?.multiSelectMode) {
      const currentService = window.MyMindAI?.currentService || 'gpt';
      console.log('[AI Multi] 단일 모드 - 현재 서비스만 반환:', currentService);
      return [currentService];
    }

    // 다중 모드: 모든 활성화된 서비스 반환
    // 1. window.MyMind3AISettings에서 가져오기 시도
    let aiSettings = window.MyMind3AISettings?.getAISettings?.();

    // 2. 없으면 localStorage에서 직접 읽기
    if (!aiSettings) {
      const savedSettings = localStorage.getItem('mymind3_ai_settings');
      if (savedSettings) {
        try {
          aiSettings = JSON.parse(savedSettings);
        } catch (e) {
          console.error('[AI Multi] AI 설정 파싱 오류:', e);
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

  // ============================================
  // 다중 AI 동시 호출
  // ============================================

  /**
   * 다중 AI 서비스에 동시 메시지 전송
   * Promise.allSettled를 사용하여 모든 서비스의 응답을 수집
   * @param {string} message - 사용자 메시지
   * @param {Array} conversationHistory - 대화 히스토리
   * @returns {Promise<Array>} 모든 AI 응답 결과
   */
  async function sendMultiAIMessage(message, conversationHistory) {
    const services = getSelectedAIServices();

    if (services.length === 0) {
      alert(window.i18n?.alertNoAIService || '활성화된 AI 서비스가 없습니다. 설정에서 AI 서비스를 활성화하고 API Key를 설정해주세요.');
      return;
    }

    console.log('[AI Multi] 전송 대상 서비스:', services);

    // 질문 처리 중 입력 비활성화 (평가 완료 전까지)
    const promptInput = document.getElementById('promptInput');
    const sendBtn = document.getElementById('sendPromptBtn');
    const imageAttachBtn = document.getElementById('imageAttachBtn');
    const clearQaBtn = document.getElementById('clearQaBtn');

    // 스타일에 애니메이션 추가
    if (!document.getElementById('aiProcessingStyle')) {
      const style = document.createElement('style');
      style.id = 'aiProcessingStyle';
      style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }

    // 입력란만 처리 중 메시지로 대체, 버튼들은 비활성화만
    const inputArea = document.getElementById('inputAreaDropTarget');
    if (inputArea) {
      // input 자체를 리스타일하여 flex:1 레이아웃 유지 (별도 div 삽입 X)
      if (promptInput) {
        promptInput.disabled = true;
        promptInput.value = window.i18n?.aiProcessing || 'AI가 응답을 처리하고 있습니다...';
        promptInput.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        promptInput.style.color = 'white';
        promptInput.style.borderColor = 'transparent';
        promptInput.style.fontWeight = '500';
      }
      // 버튼들은 비활성화만 (숨기지 않음)
      if (imageAttachBtn) imageAttachBtn.disabled = true;
      if (sendBtn) sendBtn.disabled = true;
      if (clearQaBtn) clearQaBtn.disabled = true;
    }

    // 이미지 첨부 데이터 가져오기
    const imageData = window.MyMindAI?.attachedImage || null;
    if (imageData) {
      console.log('[AI Multi] 다중 AI 요청에 이미지 첨부됨');
    }

    // 원본 메시지 추출 (컨텍스트 정보 제외 - 사용자가 입력한 질문만 표시)
    let displayMessage = message.split('\n\n[중요 지침]')[0];
    displayMessage = displayMessage.split('\n\n=== 체크된 관련 노드들 ===')[0];

    // 스트리밍 응답용 컨테이너 준비
    const streamingContainers = {};
    services.forEach(service => {
      const container = document.getElementById(`${service}Response`);
      if (container) {
        // 스트리밍 응답 영역 생성 (최종 Q&A와 동일한 형식)
        const streamingDiv = document.createElement('div');
        streamingDiv.className = 'qa-item ai-streaming-response';
        streamingDiv.id = `streaming-${service}-${Date.now()}`;
        streamingDiv.style.cssText = 'margin-bottom: 20px;';

        // 질문 영역
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

        // 응답 영역 (스피너 포함)
        const answerDiv = document.createElement('div');
        answerDiv.className = 'answer';
        answerDiv.style.cssText = 'background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px; position: relative;';

        // 헤더 (AI 이름 + 모델 + 스피너)
        const headerDiv = document.createElement('div');
        headerDiv.className = 'streaming-header';
        headerDiv.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px;';

        // 현재 서비스의 모델명 가져오기
        const enabledServices = window.getEnabledAIServices ? window.getEnabledAIServices() : [];
        const serviceInfo = enabledServices.find(s => s.service === service);
        const modelName = serviceInfo?.model ? (window.getShortModelName ? window.getShortModelName(serviceInfo.model) : serviceInfo.model) : '';
        const displayLabel = modelName
          ? `${window.getAIDisplayName ? window.getAIDisplayName(service) : service}: ${modelName}`
          : (window.getAIDisplayName ? window.getAIDisplayName(service) : service);

        headerDiv.innerHTML = `
          ${mmIcon('robot', 18)}
          <span style="color: #1976d2; font-weight: bold; font-size: 14px;">${displayLabel}</span>
          <div class="spinner streaming-indicator" style="width: 16px; height: 16px; border: 2px solid #dee2e6; border-top-color: #1976d2; border-radius: 50%; animation: spin 1s linear infinite; margin-left: auto;"></div>
        `;
        answerDiv.appendChild(headerDiv);

        // 콘텐츠 영역 (스트리밍 텍스트 표시)
        const contentDiv = document.createElement('div');
        contentDiv.className = 'answer-content streaming-content';
        contentDiv.style.cssText = 'color: #333; font-size: 14px; line-height: 1.6;';
        contentDiv.innerHTML = '<span style="color: #999;">' + t('aiWaitingResponse', '응답 대기 중...') + '</span>';
        answerDiv.appendChild(contentDiv);

        streamingDiv.appendChild(answerDiv);
        container.appendChild(streamingDiv);
        streamingContainers[service] = { streamingDiv, contentDiv, headerDiv, answerDiv };
      }
      if (window.updateAITabStatus) {
        window.updateAITabStatus(service, 'loading');
      }
    });

    // 탭 바 표시 및 첫 번째 서비스 탭 활성화
    const aiTabBar = document.getElementById('aiTabBar');
    if (aiTabBar) {
      aiTabBar.style.display = 'flex';
      if (window.switchAITab) {
        window.switchAITab(services[0]);
      }
    }

    // Promise.allSettled로 모든 AI 동시 호출 (스트리밍 + 이미지 지원)
    const results = await Promise.allSettled(
      services.map(service => {
        const containerInfo = streamingContainers[service];
        // callSingleAIService는 app-init.js에 정의됨
        if (typeof window.callSingleAIService === 'function') {
          return window.callSingleAIService(service, message, conversationHistory, {
            timeout: 120000,
            useStreaming: true,
            imageData: imageData,
            contentDiv: containerInfo?.contentDiv || null,
            onStreamChunk: (chunk, fullText) => {
              if (containerInfo?.contentDiv && window.formatAIResponse) {
                containerInfo.contentDiv.innerHTML = window.formatAIResponse(fullText);
              }
            }
          });
        }
        return Promise.reject(new Error('callSingleAIService 함수를 찾을 수 없습니다.'));
      })
    );

    // 결과 처리 (스트리밍 완료 후) - 스피너 제거, Q&A 저장
    for (let index = 0; index < results.length; index++) {
      const result = results[index];
      const service = services[index];
      const containerInfo = streamingContainers[service];

      if (result.status === 'fulfilled') {
        // 성공
        const data = result.value;
        if (window.updateAITabStatus) {
          window.updateAITabStatus(service, 'success');
        }

        // 이미지 응답 확인 및 복사 버튼 HTML 생성 (파일 URL 기반)
        const imageMatch = data.content?.match(/!\[[^\]]*\]\(([^)]+)\)/);
        const imageSrc = imageMatch ? imageMatch[1] : null;
        const imageCopyBtnHTML = imageSrc ? `
          <button class="ai-image-copy-btn" data-image-src="${imageSrc}" style="padding: 6px 12px; background: #28a745; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px; margin-right: 8px;">
            ${mmIcon('clipboard', 14)} 이미지 복사
          </button>` : '';

        const aiDisplayName = window.getAIDisplayName ? window.getAIDisplayName(service) : service;
        const formattedContent = window.formatAIResponse ? window.formatAIResponse(data.content) : data.content;

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
      <span style="color: #1976d2; font-weight: bold; font-size: 14px;">${aiDisplayName}: ${data.model || ''}</span>
    </div>
    <div class="answer-content" data-original-content="${encodeURIComponent(data.content)}" style="color: #333; font-size: 14px; line-height: 1.6;">${formattedContent}</div>
    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;">
      ${imageCopyBtnHTML}
      ${!imageSrc ? `<button class="create-node-btn" onclick="createNodeFromAIResponse(this)" style="padding: 6px 12px; background: #7c4dff; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
        ${mmIcon('plus-circle', 14)} 노드생성
      </button>
      <button class="copy-btn" onclick="copyAnswerToEditor(this)" style="padding: 6px 12px; background: #1976d2; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
        ${mmIcon('clipboard', 14)} 복사
      </button>` : ''}
    </div>
  </div>
</div>`;

        // 스트리밍 완료 후 스트리밍 div만 교체 (기존 Q&A 유지)
        if (containerInfo?.streamingDiv && data.content) {
          containerInfo.streamingDiv.outerHTML = qaItemHTML;

          // 이미지 복사 버튼에 이벤트 리스너 연결
          if (imageSrc) {
            setTimeout(() => {
              if (typeof window.attachImageCopyListeners === 'function') {
                window.attachImageCopyListeners();
              }
            }, 100);
          }
        }

        // Q&A 자동 저장
        if (data.content && typeof window.autoSaveQAItem === 'function') {
          await window.autoSaveQAItem(qaItemHTML, service);
          console.log(`[AI Multi] Q&A 저장 완료: ${service}_qa.html`);

          // 자동 노드 생성
          await autoCreateNodeFromQuestion(displayMessage, data.content, service);
        }

        console.log(`[AI Multi] ${service} 성공`);
      } else {
        // 실패
        const error = result.reason;
        if (window.updateAITabStatus) {
          window.updateAITabStatus(service, 'error');
        }

        // 에러 메시지 추출
        let errorMsg = t('aiMultiUnknownError', '알 수 없는 오류');
        if (typeof error === 'string') {
          errorMsg = error;
        } else if (error?.message) {
          errorMsg = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
        } else if (error) {
          errorMsg = JSON.stringify(error);
        }

        // 스트리밍 실패: 에러 표시
        if (containerInfo?.headerDiv) {
          const spinner = containerInfo.headerDiv.querySelector('.streaming-indicator');
          if (spinner) spinner.style.display = 'none';

          const errorIcon = document.createElement('span');
          errorIcon.style.cssText = 'margin-left: auto; color: #f44336; font-size: 14px;';
          errorIcon.textContent = t('aiMultiError', '오류');
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

        const aiDisplayName = window.getAIDisplayName ? window.getAIDisplayName(service) : service;
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
        <span style="color: #888; font-size: 0.65em;">${aiDisplayName} · 오류</span>
        <div style="color: #c62828; font-size: 0.85em; line-height: 1.2;">${errorMsg}</div>
      </div>
    </div>
  </div>
</div>`;

        if (typeof window.autoSaveQAItem === 'function') {
          await window.autoSaveQAItem(qaErrorHTML, service);
          console.log(`[AI Multi] Q&A 에러 저장: ${service}_qa.html`);
        }

        console.error(`[AI Multi] ${service} 실패:`, error);
      }
    }

    // 이미지 첨부 클리어 (전송 완료 후)
    if (imageData && typeof window.MyMindAI?.clearAttachedImage === 'function') {
      window.MyMindAI.clearAttachedImage();
      console.log('[AI Multi] 첨부 이미지 클리어 완료');
    }

    // 성공한 서비스 중 첫 번째로 탭 전환
    const successService = services.find((service, index) =>
      results[index].status === 'fulfilled'
    );
    if (successService && window.switchAITab) {
      window.switchAITab(successService);
    }

    // 다중선택 모드일 때 평가 수행
    if (window.MyMindAI?.multiSelectMode === true) {
      await performMultiAIEvaluation(displayMessage, results, services, streamingContainers);
    }

    // 처리 완료 후 입력 영역 복원 (리스타일 복원)
    const promptInputEnd = document.getElementById('promptInput');
    const sendBtnEnd = document.getElementById('sendPromptBtn');
    const imageAttachBtnEnd = document.getElementById('imageAttachBtn');
    const clearQaBtnEnd = document.getElementById('clearQaBtn');
    if (promptInputEnd) {
      promptInputEnd.disabled = false;
      promptInputEnd.value = '';
      promptInputEnd.style.background = '';
      promptInputEnd.style.color = '';
      promptInputEnd.style.borderColor = '';
      promptInputEnd.style.fontWeight = '';
    }
    if (imageAttachBtnEnd) imageAttachBtnEnd.disabled = false;
    if (sendBtnEnd) sendBtnEnd.disabled = false;
    if (clearQaBtnEnd) clearQaBtnEnd.disabled = false;

    return results;
  }

  // ============================================
  // 평가 프롬프트 생성
  // ============================================

  /**
   * 여러 AI의 응답을 비교 분석하기 위한 평가 프롬프트 생성
   * @param {string} question - 원본 질문
   * @param {Array} aiResponses - AI 응답 배열 [{serviceName, modelName, content}]
   * @returns {string} 평가 프롬프트
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

  // ============================================
  // 다중 AI 응답 평가 수행
  // ============================================

  /**
   * 모든 AI 응답 완료 후 평가 AI를 호출하여 비교 분석
   * @param {string} question - 원본 질문
   * @param {Array} results - Promise.allSettled 결과
   * @param {string[]} services - 서비스 목록
   * @param {Object} streamingContainers - 스트리밍 컨테이너 맵
   */
  async function performMultiAIEvaluation(question, results, services, streamingContainers) {
    // 성공한 응답만 수집
    const successfulResponses = [];
    const enabledServices = window.getEnabledAIServices ? window.getEnabledAIServices() : [];

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled' && results[i].value?.content) {
        const service = services[i];
        const serviceInfo = enabledServices.find(s => s.service === service);
        const modelName = serviceInfo?.model
          ? (window.getShortModelName ? window.getShortModelName(serviceInfo.model) : serviceInfo.model)
          : service;

        successfulResponses.push({
          service: service,
          serviceName: window.getAIDisplayName ? window.getAIDisplayName(service) : service,
          modelName: modelName,
          content: results[i].value.content
        });
      }
    }

    // 성공한 응답이 2개 미만이면 평가 스킵
    if (successfulResponses.length < 2) {
      console.log('[AI Eval] 비교할 응답이 2개 미만이어서 평가 스킵');
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

    console.log('[AI Eval] 평가 시작 - 응답 수:', successfulResponses.length);

    // 평가 컨테이너 준비
    const evaluateContainer = document.getElementById('evaluateResponse');
    if (!evaluateContainer) {
      console.error('[AI Eval] evaluateResponse 컨테이너를 찾을 수 없음');
      return;
    }

    // 기본 AI 서비스 정보 가져오기
    const defaultAI = enabledServices.find(s => s.isDefault) || enabledServices[0];
    const defaultModelName = defaultAI?.model
      ? (window.getShortModelName ? window.getShortModelName(defaultAI.model) : defaultAI.model)
      : '';
    const evaluateDisplayName = defaultModelName
      ? `${window.i18n?.evaluate || '평가'}(${defaultModelName})`
      : `${window.i18n?.evaluate || '평가'}(${window.getAIDisplayName ? window.getAIDisplayName(defaultAI?.service || 'gpt') : 'GPT'})`;

    // 로딩 UI 표시
    const streamingDiv = document.createElement('div');
    streamingDiv.className = 'qa-item ai-streaming-response';
    streamingDiv.id = `streaming-evaluate-${Date.now()}`;
    streamingDiv.style.cssText = 'margin-bottom: 20px;';

    // 평가 모델 정보 문자열
    const evaluatorModelInfo = defaultAI?.model
      ? `${window.getAIDisplayName ? window.getAIDisplayName(defaultAI.service) : defaultAI.service} (${window.getShortModelName ? window.getShortModelName(defaultAI.model) : defaultAI.model})`
      : (window.getAIDisplayName ? window.getAIDisplayName(defaultAI?.service || 'gpt') : 'GPT');

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
    contentDiv.innerHTML = '<span style="color: #999;">' + t('aiAnalyzing', 'AI 응답들을 분석 중...') + '</span>';
    answerDiv.appendChild(contentDiv);

    streamingDiv.appendChild(answerDiv);
    evaluateContainer.innerHTML = '';
    evaluateContainer.appendChild(streamingDiv);

    // 탭 상태 업데이트
    if (window.updateAITabStatus) {
      window.updateAITabStatus('evaluate', 'loading');
    }

    try {
      // 평가 프롬프트 생성
      const evaluationPrompt = buildEvaluationPrompt(question, successfulResponses);

      // 기본 AI 서비스로 평가 호출 (스트리밍)
      let evalResult;
      if (typeof window.callSingleAIService === 'function') {
        evalResult = await window.callSingleAIService(
          defaultAI?.service || 'gpt',
          evaluationPrompt,
          [],
          {
            timeout: 180000,  // 평가는 더 긴 타임아웃 (3분)
            useStreaming: true,
            contentDiv: contentDiv,
            onStreamChunk: (chunk, fullText) => {
              if (contentDiv && window.formatAIResponse) {
                contentDiv.innerHTML = window.formatAIResponse(fullText);
              }
            }
          }
        );
      } else {
        throw new Error('callSingleAIService 함수를 찾을 수 없습니다.');
      }

      // 평가 완료
      if (window.updateAITabStatus) {
        window.updateAITabStatus('evaluate', 'success');
      }

      // 스피너 제거
      const spinner = headerDiv.querySelector('.streaming-indicator');
      if (spinner) spinner.style.display = 'none';

      // 완료 아이콘 추가
      const completeIcon = document.createElement('span');
      completeIcon.style.cssText = 'margin-left: auto; color: #4caf50; font-size: 14px;';
      completeIcon.textContent = t('aiMultiEvalComplete', '평가 완료');
      headerDiv.appendChild(completeIcon);

      // 노드생성 + 복사 버튼 추가
      const copyBtnDiv = document.createElement('div');
      copyBtnDiv.style.cssText = 'display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;';
      copyBtnDiv.innerHTML = `
        <button class="create-node-btn" onclick="createNodeFromAIResponse(this)" style="padding: 6px 12px; background: #7c4dff; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
          ${mmIcon('plus-circle', 14)} 노드생성
        </button>
        <button class="copy-btn" onclick="copyAnswerToEditor(this)" style="padding: 6px 12px; background: #ff9800; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
          ${mmIcon('clipboard', 14)} 복사
        </button>
      `;
      answerDiv.appendChild(copyBtnDiv);

      // Q&A 자동 저장
      const qaItemHTML = evaluateContainer.innerHTML;
      if (typeof window.autoSaveQAItem === 'function') {
        await window.autoSaveQAItem(qaItemHTML, 'evaluate');
        console.log('[AI Eval] 평가 결과 저장 완료');
      }

      // 평가 결과를 노드로 자동 저장 (평가 모델 정보 포함)
      const evaluationHeader = `**평가 모델:** ${evaluatorModelInfo}\n**비교 대상:** ${successfulResponses.map(r => `${r.serviceName}(${r.modelName})`).join(', ')}\n\n---\n\n`;
      await autoCreateNodeFromQuestion(
        `[평가] ${question}`,
        evaluationHeader + evalResult.content,
        'evaluate'
      );

      console.log('[AI Eval] 평가 완료');

    } catch (error) {
      console.error('[AI Eval] 평가 실패:', error);
      if (window.updateAITabStatus) {
        window.updateAITabStatus('evaluate', 'error');
      }

      // 에러 표시
      const spinner = headerDiv.querySelector('.streaming-indicator');
      if (spinner) spinner.style.display = 'none';

      const errorIcon = document.createElement('span');
      errorIcon.style.cssText = 'margin-left: auto; color: #f44336; font-size: 14px;';
      errorIcon.textContent = t('aiMultiEvalFailed', '평가 실패');
      headerDiv.appendChild(errorIcon);

      contentDiv.innerHTML = `<div style="color: #f44336; padding: 10px; background: #ffebee; border-radius: 4px;">
        <strong>평가 오류</strong><br>${error.message || error}
      </div>`;
    }
  }

  // ============================================
  // 자동 노드 생성
  // ============================================

  /**
   * AI 질문의 맥락으로 자식 노드 자동 생성
   * @param {string} originalQuestion - 원본 질문
   * @param {string} aiResponse - AI 응답 내용
   * @param {string|null} service - AI 서비스 이름 (다중 모드에서 사용)
   */
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
      const serviceName = window.getAIDisplayName ? window.getAIDisplayName(service) : service;
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
          const enabledServices = window.getEnabledAIServices ? window.getEnabledAIServices() : [];
          const serviceInfo = enabledServices.find(s => s.service === service);
          const modelName = serviceInfo?.model
            ? (window.getShortModelName ? window.getShortModelName(serviceInfo.model) : serviceInfo.model)
            : '';
          serviceLabel = modelName
            ? `${window.getAIDisplayName ? window.getAIDisplayName(service) : service} (${modelName}) 응답`
            : `${window.getAIDisplayName ? window.getAIDisplayName(service) : service} 응답`;
        }

        // [2026-02-07] base64→파일 경로 변환 후처리 제거됨
        // AI 이미지가 이미 파일 URL로 전송되므로 추가 변환 불필요
        let processedAiResponse = aiResponse;

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
        if (window.MyMind3?.NodeRenderer?.renderMindMap) {
          window.MyMind3.NodeRenderer.renderMindMap();
        }
        console.log(`[AutoCreateNode] 자동 노드 생성 완료: "${nodeTitle}" (ID: ${newNode.id})`);

        // 마인드맵 자동 저장 (노드 생성 후) - 팝업 없이 조용히 저장
        if (window.MyMind3Simple?.saveMindmapSilently) {
          const saved = await window.MyMind3Simple.saveMindmapSilently();
          if (saved) {
            console.log('[AutoCreateNode] 마인드맵 자동 저장 완료');
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

  // ============================================
  // 질문 컨텍스트 추출
  // ============================================

  /**
   * 질문에서 핵심 맥락 추출 (10자 이하)
   * @param {string} question - 원본 질문
   * @returns {string} 추출된 핵심 맥락 (최대 10자)
   */
  function extractQuestionContext(question) {
    if (!question) return t('aiMultiQuestion', '질문');

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

  // ============================================
  // 전역 함수 노출
  // ============================================
  window.getSelectedAIServices = getSelectedAIServices;
  window.sendMultiAIMessage = sendMultiAIMessage;
  window.buildEvaluationPrompt = buildEvaluationPrompt;
  window.performMultiAIEvaluation = performMultiAIEvaluation;
  window.autoCreateNodeFromQuestion = autoCreateNodeFromQuestion;
  window.extractQuestionContext = extractQuestionContext;

  console.log('[Module] ai-multi.js 로드 완료');
})();
