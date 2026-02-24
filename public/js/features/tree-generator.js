/**
 * AI 기반 새 노드 트리 생성 모듈
 * 체크된 노드들을 AI에게 전달하여 새 마인드맵을 자동 생성
 */

// 자체 Toast 알림 기능 (showToast가 정의되지 않은 경우 사용)
const TreeGeneratorToast = {
  show(message, type = 'info') {
    // 기존 토스트가 있으면 제거
    const existingToast = document.getElementById('treeGenToast');
    if (existingToast) existingToast.remove();

    // 타입별 색상
    const colors = {
      success: { bg: '#4caf50', icon: mmIcon('check-circle', 14) },
      error: { bg: '#f44336', icon: mmIcon('x-circle', 14) },
      warning: { bg: '#ff9800', icon: mmIcon('alert-triangle', 14) },
      info: { bg: '#2196f3', icon: mmIcon('info', 14) }
    };
    const color = colors[type] || colors.info;

    // 토스트 HTML 생성
    const toast = document.createElement('div');
    toast.id = 'treeGenToast';
    toast.innerHTML = `
      <span style="margin-right: 8px; font-size: 16px;">${color.icon}</span>
      <span>${message}</span>
    `;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${color.bg};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10001;
      display: flex;
      align-items: center;
      font-size: 14px;
      animation: treeGenToastFadeIn 0.3s ease;
    `;

    // 애니메이션 스타일 추가
    if (!document.getElementById('treeGenToastStyle')) {
      const style = document.createElement('style');
      style.id = 'treeGenToastStyle';
      style.textContent = `
        @keyframes treeGenToastFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes treeGenToastFadeOut {
          from { opacity: 1; transform: translateX(-50%) translateY(0); }
          to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // 3초 후 자동 제거
    setTimeout(() => {
      toast.style.animation = 'treeGenToastFadeOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// 전역 showToast가 없으면 TreeGeneratorToast 사용
if (typeof window.showToast !== 'function') {
  window.showToast = (message, type) => TreeGeneratorToast.show(message, type);
}

const TreeGenerator = {
  // 타이머 관련 변수
  _timerInterval: null,
  _timerStartTime: null,

  // ============================================
  // API 호출 방식 관련 함수 (Phase 1 구현)
  // ============================================
  // 참고: 모든 AI API 호출은 서버를 경유합니다 (아키텍처 원칙 준수)
  // 클라이언트에서 직접 외부 API 호출은 금지됩니다.

  /**
   * [REMOVED] 서비스별 API 엔드포인트 - 직접 호출 금지
   * 모든 AI 호출은 /api/ai/chat 서버 API를 통해 수행
   */

  /**
   * [REMOVED] 서비스별 요청 본문 구성 - 서버에서 처리
   */

  // ============================================
  // callAIWithPersonalKey가 서버 경유로 변경됨
  // ============================================
  _placeholder_buildRequestBody(service, model, message, systemPrompt = '') {
    const messages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }]
      : [{ role: 'user', content: message }];

    switch (service) {
      case 'gpt':
      case 'grok':
        return {
          model: model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 4000
        };
      case 'claude':
        return {
          model: model,
          max_tokens: 4000,
          messages: messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            content: m.content
          })),
          system: systemPrompt || undefined
        };
      case 'gemini':
        return {
          contents: [{ parts: [{ text: message }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4000
          }
        };
      default:
        throw new Error(`지원하지 않는 AI 서비스: ${service}`);
    }
  },

  // [REMOVED] extractResponseText - 서버에서 처리함

  /**
   * 방법 1: 개인 API Key 사용 - 서버 경유 호출
   * API Key는 Authorization 헤더로 서버에 전달, 서버가 대신 AI API 호출
   * 클라이언트에서 직접 외부 API 호출 금지 (아키텍처 원칙)
   */
  async callAIWithPersonalKey(params) {
    const { service, model, message, systemPrompt } = params;

    // localStorage에서 API Key 가져오기 (서비스별로 다른 키)
    const apiKeysStr = localStorage.getItem('mymind3_api_keys');
    const apiKeys = apiKeysStr ? JSON.parse(apiKeysStr) : {};
    const apiKey = apiKeys[service];

    if (!apiKey) {
      throw new Error(`${service} API Key가 설정되지 않았습니다. 설정 > AI 설정에서 API Key를 입력해주세요.`);
    }

    console.log(`[TreeGenerator] 방법 1: ${service} 서버 경유 호출 시작 (개인 API Key)`);

    // 서버 API를 통해 호출 (API Key는 Authorization 헤더로 전달)
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,  // 개인 API Key를 헤더로 전달
        ...csrfHeaders
      },
      credentials: 'include',
      body: JSON.stringify({
        service: service,
        model: model,
        message: message,
        systemPrompt: systemPrompt,
        paymentMethod: 'apikey'  // API Key 결제 방식
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || errorData.error || `AI API 호출 실패: ${response.status}`);
    }

    const result = await response.json();
    const text = result.data?.response || result.response || '';
    const tokensUsed = result.data?.usage?.total_tokens || result.usage?.total_tokens || 0;

    console.log(`[TreeGenerator] 방법 1: ${service} 서버 경유 호출 완료, 토큰: ${tokensUsed}`);

    return {
      success: true,
      data: {
        response: text,
        usage: { total_tokens: tokensUsed }
      }
    };
  },

  /**
   * 방법 2: 사이트 서비스 사용 - 서버를 통한 AI 호출
   * 서버가 자체 API Key로 AI 호출, 사용자는 크레딧으로 결제
   */
  async callAIWithSiteService(params) {
    const { service, model, message, systemPrompt } = params;

    console.log(`[TreeGenerator] 방법 2: 서버 경유 ${service} 호출 시작`);

    // API Key 없이 서버로 요청
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include',
      body: JSON.stringify({
        service: service,
        model: model,
        message: message,
        systemPrompt: systemPrompt,
        paymentMethod: 'credits'  // 크레딧 결제
        // apiKey 필드 없음!
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      // 크레딧 부족 에러 처리
      if (errorData.code === 'INSUFFICIENT_CREDITS') {
        const error = new Error(window.i18n?.errorInsufficientCredits || '크레딧이 부족합니다. 크레딧을 충전하거나 구독을 시작하세요.');
        error.code = 'INSUFFICIENT_CREDITS';
        throw error;
      }

      throw new Error(errorData.error || `서버 AI 호출 실패: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[TreeGenerator] 방법 2: 서버 경유 ${service} 호출 완료`);

    return result;
  },

  /**
   * AI 호출 통합 함수
   * paymentMethod에 따라 적절한 방법 선택
   */
  async callAI(params) {
    const { paymentMethod } = params;

    if (paymentMethod === 'apikey') {
      // 방법 1: 개인 API Key (브라우저 직접 호출)
      return this.callAIWithPersonalKey(params);
    } else if (paymentMethod === 'credits') {
      // 방법 2: 사이트 서비스 (서버 경유)
      return this.callAIWithSiteService(params);
    } else {
      throw new Error('알 수 없는 결제 방식입니다.');
    }
  },

  /**
   * 방법 1 사용 시: AI 결과를 서버에 저장 (API Key 없이!)
   */
  async saveResultToServer(params) {
    const { newMapName, treeData, selectedNodes, service, model } = params;

    console.log('[TreeGenerator] 방법 1: 서버에 결과 저장 (API Key 미포함)');

    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/mindmap/save-generated-tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include',
      body: JSON.stringify({
        newMapName: newMapName,
        treeData: treeData,
        selectedNodes: selectedNodes,
        metadata: {
          service: service,
          model: model,
          generatedAt: new Date().toISOString(),
          source: 'client-direct'  // 클라이언트 직접 호출로 생성됨
        }
        // apiKey 필드 없음!
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '결과 저장 실패');
    }

    return response.json();
  },

  /**
   * 방법 1: 개인 API Key로 트리 생성
   * 브라우저에서 직접 AI API 호출 후 결과만 서버에 저장
   */
  async generateWithPersonalKey(params) {
    const { selectedService, selectedModel, secondaryService, secondaryModel, checkedNodes, currentFolder, newMapName } = params;

    console.log('[TreeGenerator] generateWithPersonalKey 시작');
    console.log('[TreeGenerator] 주 모델:', selectedService, selectedModel);
    console.log('[TreeGenerator] 보조 모델:', secondaryService, secondaryModel);

    // Phase 0: 노드 콘텐츠 수집
    this.updateProgressStep(0, 'in_progress', '노드 콘텐츠 수집 중...');

    // 노드 콘텐츠를 서버에서 가져오기
    const nodeContents = await this.fetchNodeContents(currentFolder, checkedNodes);

    // Phase 1: 구조 분석 (간단한 프롬프트로 직접 AI 호출)
    // 각 단계별 응답 검증 추가
    this.updateProgressStep(1, 'in_progress', '구조 분석 중...');

    const analysisPrompt = this.buildAnalysisPrompt(checkedNodes, nodeContents);
    const analysisResult = await this.callAIWithPersonalKey({
      service: selectedService,
      model: selectedModel,
      message: analysisPrompt,
      systemPrompt: '당신은 마인드맵 구조 분석 전문가입니다. 주어진 노드들을 분석하여 핵심 주제와 관계를 파악하세요.'
    });

    // Phase 1 응답 검증
    if (!analysisResult || !analysisResult.success || !analysisResult.data || !analysisResult.data.response) {
      const errorMsg = analysisResult?.error || '구조 분석 응답이 비어있습니다';
      console.error('[TreeGenerator] Phase 1 실패:', errorMsg);
      throw new Error(`구조 분석 실패: ${errorMsg}`);
    }
    console.log('[TreeGenerator] Phase 1 완료:', analysisResult.data.response.substring(0, 100) + '...');

    // Phase 2: MECE 재분류
    this.updateProgressStep(2, 'in_progress', 'MECE 원칙으로 재분류 중...');

    const classificationPrompt = this.buildClassificationPrompt(checkedNodes, nodeContents, analysisResult.data.response);
    const classificationResult = await this.callAIWithPersonalKey({
      service: selectedService,
      model: selectedModel,
      message: classificationPrompt,
      systemPrompt: '당신은 마인드맵 구조 설계 전문가입니다. MECE 원칙에 따라 노드를 분류하세요.'
    });

    // Phase 2 응답 검증
    if (!classificationResult || !classificationResult.success || !classificationResult.data || !classificationResult.data.response) {
      const errorMsg = classificationResult?.error || 'MECE 분류 응답이 비어있습니다';
      console.error('[TreeGenerator] Phase 2 실패:', errorMsg);
      throw new Error(`MECE 분류 실패: ${errorMsg}`);
    }
    console.log('[TreeGenerator] Phase 2 완료:', classificationResult.data.response.substring(0, 100) + '...');

    // Phase 3: 트리 재조립
    this.updateProgressStep(3, 'in_progress', '트리 구조 생성 중...');

    const assemblyPrompt = this.buildAssemblyPrompt(newMapName, classificationResult.data.response);
    const assemblyResult = await this.callAIWithPersonalKey({
      service: selectedService,
      model: selectedModel,
      message: assemblyPrompt,
      systemPrompt: '당신은 마인드맵 JSON 생성 전문가입니다. 반드시 유효한 JSON 형식으로 마인드맵 구조를 생성하세요.'
    });

    // Phase 3 응답 검증
    if (!assemblyResult || !assemblyResult.success || !assemblyResult.data || !assemblyResult.data.response) {
      const errorMsg = assemblyResult?.error || '트리 생성 응답이 비어있습니다';
      console.error('[TreeGenerator] Phase 3 실패:', errorMsg);
      throw new Error(`트리 생성 실패: ${errorMsg}`);
    }
    console.log('[TreeGenerator] Phase 3 완료:', assemblyResult.data.response.substring(0, 100) + '...');

    // JSON 파싱
    let treeData;
    try {
      const responseText = assemblyResult.data.response;
      const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/) || responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText;
      treeData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[TreeGenerator] JSON 파싱 실패:', parseError);
      throw new Error('AI 응답을 JSON으로 파싱하지 못했습니다.');
    }

    // Phase 4: 서버에 결과 저장 (API Key 없이!)
    this.updateProgressStep(4, 'in_progress', '파일 저장 중...');

    const saveResult = await this.saveGeneratedTree({
      newMapName,
      treeData,
      selectedNodes: checkedNodes,
      metadata: {
        service: selectedService,
        model: selectedModel,
        generatedAt: new Date().toISOString(),
        source: 'client-direct'
      }
    });

    return {
      success: true,
      nodeCount: this.countNodes(treeData),
      qualityScore: saveResult.qualityScore
    };
  },

  /**
   * 방법 2: 사이트 서비스로 트리 생성 (SSE 스트림)
   * 서버가 AI 호출, 사용자는 크레딧 결제
   */
  async generateWithSiteService(params) {
    const { selectedService, selectedModel, secondaryService, secondaryModel, checkedNodes, currentFolder, newMapName, answerLevel } = params;

    console.log('[TreeGenerator] generateWithSiteService 시작 (SSE)');
    console.log('[TreeGenerator] 주 모델:', selectedService, selectedModel);
    console.log('[TreeGenerator] 보조 모델:', secondaryService, secondaryModel);
    console.log('[TreeGenerator] 답변 수준:', answerLevel);

    // API Key 없이 서버로 요청!
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/ai/generate-tree-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include',
      body: JSON.stringify({
        sourceMapName: currentFolder,
        selectedNodes: checkedNodes,
        newMapName: newMapName,
        service: selectedService,
        model: selectedModel,
        secondaryService: secondaryService,
        secondaryModel: secondaryModel,
        answerLevel: answerLevel,  // 답변 수준 (2026-01-21 추가)
        paymentMethod: 'credits',  // 크레딧 결제
        useAdvancedPipeline: true
        // apiKey 필드 없음!
      })
    });

    if (response.status === 401) {
      throw new Error('로그인이 필요합니다. 로그인 후 다시 시도해주세요.');
    }

    // SSE 스트림 처리
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let eventType = '';
      let eventData = '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.substring(7).trim();
        } else if (line.startsWith('data: ')) {
          eventData = line.substring(6).trim();

          if (eventType && eventData) {
            try {
              const data = JSON.parse(eventData);
              console.log('[TreeGenerator] SSE Event:', eventType, data);

              if (eventType === 'progress') {
                this.updateProgressStep(data.phase, data.status, data.message, data.contentProgress, data.aiStats);
                // AI 호출 정보가 있으면 로그에 추가
                if (data.aiCall) {
                  this.addAICallLog(data.aiCall.service, data.aiCall.model, data.aiCall.purpose || data.message);
                }
                // [2026-01-14] AI 응답 내용이 있으면 실시간 로그에 표시
                if (data.aiResponse) {
                  this.addAIResponseLog(data.aiResponse);
                }
              } else if (eventType === 'complete') {
                result = data;
                this.addAILog(`총 노드 수: ${data.nodeCount || '?'}개`, 'complete', mmIcon('bar-chart', 14));
                if (data.qualityScore) {
                  this.addAILog(`품질 점수: ${data.qualityScore}`, 'complete', mmIcon('star', 14));
                }
              } else if (eventType === 'error') {
                this.addErrorLog(data.error || '서버 오류');
                throw new Error(data.error || '서버 오류');
              } else if (eventType === 'log') {
                // 서버에서 보내는 상세 로그
                this.addAILog(data.message || data, data.type || 'content');
              }
            } catch (parseError) {
              if (eventType === 'error') throw parseError;
              console.error('[TreeGenerator] SSE 파싱 오류:', parseError);
            }
            eventType = '';
            eventData = '';
          }
        }
      }
    }

    return result;
  },

  /**
   * 노드 콘텐츠 가져오기 (서버에서)
   */
  async fetchNodeContents(folder, nodes) {
    const contents = {};
    for (const node of nodes) {
      try {
        const response = await fetch(`/api/loadnode?folder=${encodeURIComponent(folder)}&nodeId=${node.nodeId || node.id}`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          contents[node.id] = data.content || '';
        }
      } catch (error) {
        console.log(`[TreeGenerator] 노드 ${node.id} 콘텐츠 로드 실패:`, error);
        contents[node.id] = '';
      }
    }
    return contents;
  },

  /**
   * 분석 프롬프트 생성
   */
  buildAnalysisPrompt(nodes, contents) {
    let prompt = '다음 마인드맵 노드들을 분석하여 주요 테마와 관계를 파악해주세요.\n\n';
    prompt += '## 노드 목록:\n';
    for (const node of nodes) {
      const content = contents[node.id] || '';
      prompt += `- [${node.id}] ${node.title} (레벨 ${node.level})\n`;
      if (content) {
        prompt += `  내용: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}\n`;
      }
    }
    prompt += '\n주요 테마, 키워드, 노드 간 관계를 JSON 형식으로 분석해주세요.';
    return prompt;
  },

  /**
   * 분류 프롬프트 생성
   */
  buildClassificationPrompt(nodes, contents, analysisText) {
    let prompt = `이전 분석 결과를 바탕으로 MECE 원칙에 따라 노드들을 재분류해주세요.\n\n`;
    prompt += `## 분석 결과:\n${analysisText}\n\n`;
    prompt += `## 노드 목록:\n`;
    for (const node of nodes) {
      prompt += `- [${node.id}] ${node.title}\n`;
    }
    prompt += '\n상호 배타적이고 전체를 포괄하는 카테고리로 분류하고, 각 노드의 새 카테고리를 JSON으로 제시해주세요.';
    return prompt;
  },

  /**
   * 조립 프롬프트 생성
   */
  buildAssemblyPrompt(mapName, classificationText) {
    return `다음 분류 결과를 바탕으로 "${mapName}"이라는 이름의 새 마인드맵 JSON을 생성해주세요.

## 분류 결과:
${classificationText}

## 필수 JSON 형식:
{
  "title": "${mapName}",
  "content": "",
  "children": [
    {
      "title": "카테고리명",
      "content": "설명",
      "children": [...]
    }
  ]
}

반드시 위 형식의 유효한 JSON만 출력하세요. \`\`\`json으로 감싸주세요.`;
  },

  /**
   * 생성된 트리를 서버에 저장 (API Key 없이!)
   */
  async saveGeneratedTree(params) {
    const { newMapName, treeData, selectedNodes, metadata } = params;

    console.log('[TreeGenerator] 서버에 생성된 트리 저장 (API Key 미포함)');

    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include',
      body: JSON.stringify({
        folderName: newMapName,
        data: {
          mindMapData: [this.convertToMindmapFormat(treeData)],
          metadata: {
            ...metadata,
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString(),
            version: '1.0'
          }
        }
        // apiKey 없음!
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || '저장 실패');
    }

    return response.json();
  },

  /**
   * AI 응답 트리를 마인드맵 형식으로 변환
   */
  convertToMindmapFormat(node, level = 0, parentId = null, idCounter = { value: 1 }) {
    const id = idCounter.value++;
    const result = {
      id,
      title: node.title || t('treeNoTitle', '제목 없음'),
      level,
      expanded: true,
      checked: false,
      parentId,
      children: []
    };

    if (node.children && Array.isArray(node.children)) {
      result.children = node.children.map(child =>
        this.convertToMindmapFormat(child, level + 1, id, idCounter)
      );
    }

    return result;
  },

  /**
   * 노드 수 계산
   */
  countNodes(node) {
    let count = 1;
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        count += this.countNodes(child);
      }
    }
    return count;
  },

  // 타이머 시작
  startTimer() {
    this._timerStartTime = Date.now();
    const timerElement = document.getElementById('genElapsedTime');

    // 기존 타이머가 있으면 정리
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
    }

    // 1초마다 업데이트
    this._timerInterval = setInterval(() => {
      if (!timerElement) return;

      const elapsed = Date.now() - this._timerStartTime;
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      timerElement.textContent =
        String(hours).padStart(2, '0') + ':' +
        String(minutes).padStart(2, '0') + ':' +
        String(seconds).padStart(2, '0');
    }, 1000);

    // 초기값 표시
    if (timerElement) {
      timerElement.textContent = '00:00:00';
    }
  },

  // 타이머 정지 및 최종 시간 반환
  stopTimer() {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }

    if (this._timerStartTime) {
      const elapsed = Date.now() - this._timerStartTime;
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      this._timerStartTime = null;

      return {
        elapsed,
        formatted: String(hours).padStart(2, '0') + ':' +
                   String(minutes).padStart(2, '0') + ':' +
                   String(seconds).padStart(2, '0')
      };
    }

    return { elapsed: 0, formatted: '00:00:00' };
  },

  // 노드별 진행 상황 업데이트
  updateNodeProgress(contentProgress) {
    if (!contentProgress) return;

    const { processed, total, currentNode, level, hasError } = contentProgress;

    const nodeProgressDiv = document.getElementById('genNodeProgress');
    const nodeCountSpan = document.getElementById('genNodeCount');
    const progressBar = document.getElementById('genNodeProgressBar');
    const currentNodeDiv = document.getElementById('genCurrentNode');

    if (!nodeProgressDiv) return;

    // 진행 영역 표시
    nodeProgressDiv.style.display = 'block';

    // 카운트 업데이트
    if (nodeCountSpan) {
      nodeCountSpan.textContent = `${processed}/${total}`;
    }

    // 프로그레스 바 업데이트
    if (progressBar && total > 0) {
      const percent = Math.round((processed / total) * 100);
      progressBar.style.width = `${percent}%`;

      // 에러가 있으면 색상 변경
      if (hasError) {
        progressBar.style.background = 'linear-gradient(90deg, #f44336, #ff7043)';
      } else {
        progressBar.style.background = 'linear-gradient(90deg, #1976d2, #42a5f5)';
      }
    }

    // 현재 노드 정보 표시
    if (currentNodeDiv && currentNode) {
      const levelLabel = level === 0 ? t('treeRoot', '루트') : level === 1 ? t('treeBranch', '브랜치') : `L${level}`;
      const errorIcon = hasError ? ' ' + mmIcon('alert-triangle', 14) : '';
      currentNodeDiv.innerHTML = `[${levelLabel}] ${this.escapeHtml(currentNode)}${errorIcon}`;
      currentNodeDiv.title = currentNode; // 툴팁으로 전체 이름 표시
    }
  },

  // AI 호출 통계 업데이트 (2026-01-14 추가) - 디버깅 로그 포함
  updateAIStats(aiStats) {
    console.log('[TreeGenerator] updateAIStats called with:', JSON.stringify(aiStats));

    if (!aiStats) {
      console.log('[TreeGenerator] aiStats is null/undefined');
      return;
    }

    const aiStatsDiv = document.getElementById('genAIStats');
    const primarySpan = document.getElementById('genPrimaryAICalls');
    const secondarySpan = document.getElementById('genSecondaryAICalls');

    console.log('[TreeGenerator] DOM elements found:', {
      aiStatsDiv: !!aiStatsDiv,
      primarySpan: !!primarySpan,
      secondarySpan: !!secondarySpan
    });

    if (!aiStatsDiv) {
      console.log('[TreeGenerator] genAIStats div not found!');
      return;
    }

    // AI 통계 영역 표시
    aiStatsDiv.style.display = 'block';
    console.log('[TreeGenerator] Set display to block');

    // 주AI 호출 횟수 업데이트
    if (primarySpan) {
      const primaryCalls = aiStats.primaryCalls || 0;
      const primaryTotal = aiStats.primaryTotal || 5;
      primarySpan.textContent = `${primaryCalls}/${primaryTotal}`;
      console.log('[TreeGenerator] Primary:', primaryCalls, '/', primaryTotal);
    }

    // 보조AI 호출 횟수 업데이트
    if (secondarySpan) {
      const secondaryCalls = aiStats.secondaryCalls || 0;
      const secondaryTotal = aiStats.secondaryTotal || 0;
      secondarySpan.textContent = `${secondaryCalls}/${secondaryTotal}`;
      console.log('[TreeGenerator] Secondary:', secondaryCalls, '/', secondaryTotal);
    }
  },

  // AI 통계 초기화
  resetAIStats() {
    const aiStatsDiv = document.getElementById('genAIStats');
    const primarySpan = document.getElementById('genPrimaryAICalls');
    const secondarySpan = document.getElementById('genSecondaryAICalls');

    if (aiStatsDiv) aiStatsDiv.style.display = 'none';
    if (primarySpan) primarySpan.textContent = '0/0';
    if (secondarySpan) secondarySpan.textContent = '0/0';
  },

  // 노드 진행 상황 초기화
  resetNodeProgress() {
    const nodeProgressDiv = document.getElementById('genNodeProgress');
    const nodeCountSpan = document.getElementById('genNodeCount');
    const progressBar = document.getElementById('genNodeProgressBar');
    const currentNodeDiv = document.getElementById('genCurrentNode');

    if (nodeProgressDiv) nodeProgressDiv.style.display = 'none';
    if (nodeCountSpan) nodeCountSpan.textContent = '0/0';
    if (progressBar) {
      progressBar.style.width = '0%';
      progressBar.style.background = 'linear-gradient(90deg, #1976d2, #42a5f5)';
    }
    if (currentNodeDiv) currentNodeDiv.textContent = '';
  },

  // 진행 단계 업데이트 (aiStats 추가: 2026-01-14, 로딩 애니메이션 강화: 2026-01-14)
  updateProgressStep(phase, status, message, contentProgress, aiStats) {
    const steps = document.querySelectorAll('#genProgress .step-item');
    const statusMessage = document.getElementById('genStatusMessage');

    // AI 호출 통계 업데이트 (2026-01-14 추가)
    if (aiStats) {
      this.updateAIStats(aiStats);
    }

    // AI 로그에 진행 상태 추가
    if (message) {
      this.addAILog(message, 'phase');
    }

    // 진행 상태 메시지 업데이트
    if (statusMessage && message) {
      statusMessage.textContent = message;
      statusMessage.style.display = 'block';
    }

    // 노드별 진행 상황 업데이트 (Phase 3에서만)
    if (phase === 3 && contentProgress) {
      this.updateNodeProgress(contentProgress);
      // 콘텐츠 생성 진행 로그
      if (contentProgress.currentNode) {
        this.addAILog(`[${contentProgress.processed}/${contentProgress.total}] ${contentProgress.currentNode}`, 'content');
      }
    }

    // [2026-01-14] Phase 1.5 등 소수점 단계를 위해 Math.floor 사용
    const currentPhaseFloor = Math.floor(phase);

    steps.forEach((step, index) => {
      const stepPhase = parseInt(step.dataset.step);
      const icon = step.querySelector('.step-icon');
      const text = step.querySelector('.step-text');

      // 기존 로딩 인디케이터 제거
      const existingIndicator = step.querySelector('.step-loading-indicator');
      if (existingIndicator) existingIndicator.remove();

      // [2026-01-14] 소수점 Phase 처리: Phase 1.5는 Step 1에서 애니메이션 표시
      // stepPhase < currentPhaseFloor: 완료된 단계
      // stepPhase === currentPhaseFloor: 현재 진행 중인 단계
      if (stepPhase < currentPhaseFloor) {
        // 완료된 단계
        step.style.color = '#4caf50';
        step.style.fontWeight = 'normal';
        step.style.textShadow = 'none';
        step.style.animation = 'none';
        icon.style.background = '#4caf50';
        icon.style.color = 'white';
        icon.style.boxShadow = 'none';
        icon.style.animation = 'none';
        icon.innerHTML = mmIcon('check-circle', 14);
      } else if (stepPhase === currentPhaseFloor) {
        // 현재 진행 중인 단계 - 강화된 로딩 애니메이션
        step.style.color = '#00e5ff';
        step.style.fontWeight = '700';
        step.style.textShadow = '0 0 10px rgba(0, 229, 255, 0.7)';
        step.style.animation = 'none';

        // 아이콘에 회전 + 글로우 애니메이션
        icon.style.background = 'linear-gradient(135deg, #00e5ff, #00b8d4)';
        icon.style.color = 'white';
        icon.style.boxShadow = '0 0 15px rgba(0, 229, 255, 0.9)';
        icon.style.animation = 'borderGlow 1.5s ease-in-out infinite';
        icon.innerHTML = '<span style="animation: spinGlow 1s linear infinite; display: inline-block;">' + mmIcon('settings', 14) + '</span>';

        // 텍스트 옆에 점 로딩 인디케이터 추가
        const loadingIndicator = document.createElement('span');
        loadingIndicator.className = 'step-loading-indicator';
        loadingIndicator.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
        text.appendChild(loadingIndicator);
      } else {
        // 대기 중인 단계
        step.style.color = '#666';
        step.style.fontWeight = 'normal';
        step.style.textShadow = 'none';
        step.style.animation = 'none';
        icon.style.background = '#444';
        icon.style.color = '#888';
        icon.style.boxShadow = 'none';
        icon.style.animation = 'none';
        icon.innerHTML = index + 1;
      }
    });

    // 스피너 애니메이션 스타일 추가
    if (!document.getElementById('spinnerStyle')) {
      const style = document.createElement('style');
      style.id = 'spinnerStyle';
      style.textContent = `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  },

  // 모든 단계 완료 표시
  markAllStepsComplete() {
    const steps = document.querySelectorAll('#genProgress .step-item');
    const statusMessage = document.getElementById('genStatusMessage');

    steps.forEach((step) => {
      const icon = step.querySelector('.step-icon');
      // 로딩 인디케이터 제거
      const loadingIndicator = step.querySelector('.step-loading-indicator');
      if (loadingIndicator) loadingIndicator.remove();

      step.style.color = '#4caf50';
      step.style.fontWeight = 'normal';
      step.style.textShadow = 'none';
      step.style.animation = 'none';
      icon.style.background = '#4caf50';
      icon.style.color = 'white';
      icon.style.boxShadow = 'none';
      icon.style.animation = 'none';
      icon.innerHTML = '';
    });

    // 완료 메시지 표시
    if (statusMessage) {
      statusMessage.textContent = t('treeComplete', '완료!');
      statusMessage.style.color = '#4caf50';
      statusMessage.style.fontWeight = '600';
    }

    // AI 로그에 완료 메시지 추가
    this.addAILog(t('treeRestructureComplete', '노드 재구성이 완료되었습니다!'), 'complete', mmIcon('check-circle', 14));

    // AI 로그 패널 상태 아이콘 변경 (완료)
    const statusIcon = document.getElementById('aiLogStatusIcon');
    if (statusIcon) {
      statusIcon.style.background = '#4caf50';
      statusIcon.style.animation = 'none';
    }
  },

  // ============================================
  // AI 실시간 로그 패널 관련 함수들 (2026-01-14 추가)
  // ============================================

  // AI 로그 카운터
  _aiLogCount: 0,

  /**
   * AI 로그 패널 표시
   */
  showAILogPanel() {
    const panel = document.getElementById('aiLogPanel');
    const modalContent = document.querySelector('#treeGenModal .modal-content');

    if (panel) {
      // flex 레이아웃으로 표시하여 전체 높이 활용
      panel.style.display = 'flex';
      panel.style.flexDirection = 'column';

      // 노드재구성 패널과 높이를 동일하게 맞춤
      if (modalContent) {
        modalContent.style.borderRadius = '12px 0 0 12px';

        // 높이 동기화 함수
        const syncHeight = () => {
          const leftHeight = modalContent.offsetHeight;
          if (leftHeight > 0) {
            panel.style.height = leftHeight + 'px';
          }
        };

        // 초기 높이 설정
        syncHeight();

        // ResizeObserver로 왼쪽 패널 크기 변화 감지하여 실시간 동기화
        if (window.ResizeObserver) {
          // 기존 observer가 있으면 정리
          if (this._panelResizeObserver) {
            this._panelResizeObserver.disconnect();
          }

          this._panelResizeObserver = new ResizeObserver(() => {
            syncHeight();
          });
          this._panelResizeObserver.observe(modalContent);
        }
      }
    }
  },

  /**
   * AI 로그 패널 숨기기
   */
  hideAILogPanel() {
    const panel = document.getElementById('aiLogPanel');
    const modalContent = document.querySelector('#treeGenModal .modal-content');

    // ResizeObserver 정리
    if (this._panelResizeObserver) {
      this._panelResizeObserver.disconnect();
      this._panelResizeObserver = null;
    }

    if (panel) {
      panel.style.display = 'none';
      // 모달 컨텐츠의 border-radius 복원
      if (modalContent) {
        modalContent.style.borderRadius = '12px';
      }
    }
  },

  /**
   * AI 로그 초기화
   */
  clearAILog() {
    const logContent = document.getElementById('aiLogContent');
    const logCount = document.getElementById('aiLogCount');
    const statusIcon = document.getElementById('aiLogStatusIcon');

    if (logContent) {
      logContent.innerHTML = `
        <div class="ai-log-welcome" style="
          text-align: center;
          padding: 40px 20px;
          color: #666;
        ">
          <div style="font-size: 40px; margin-bottom: 12px;">${mmIcon('robot', 40)}</div>
          <div style="font-size: 14px;">AI 처리가 시작되면<br>실시간 로그가 여기에 표시됩니다</div>
        </div>
      `;
    }

    if (logCount) {
      logCount.textContent = '0 lines';
    }

    if (statusIcon) {
      statusIcon.style.background = '#4caf50';
      statusIcon.style.animation = 'pulse 1.5s ease-in-out infinite';
    }

    this._aiLogCount = 0;
  },

  /**
   * AI 로그 추가
   * @param {string} message - 로그 메시지
   * @param {string} type - 로그 타입 (phase, ai-call, content, error, complete)
   */
  addAILog(message, type = 'content', icon = '') {
    const logContent = document.getElementById('aiLogContent');
    const logCount = document.getElementById('aiLogCount');

    if (!logContent) return;

    // 환영 메시지 제거 (첫 번째 로그 추가 시)
    const welcomeMsg = logContent.querySelector('.ai-log-welcome');
    if (welcomeMsg) {
      welcomeMsg.remove();
    }

    // 타임스탬프 생성
    const now = new Date();
    const timestamp = now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // 로그 엔트리 생성 (icon은 SVG HTML이므로 이스케이프하지 않음)
    const entry = document.createElement('div');
    entry.className = `ai-log-entry ${type}`;
    const iconHtml = icon ? icon + ' ' : '';
    entry.innerHTML = `<span class="ai-log-timestamp">[${timestamp}]</span>${iconHtml}${this.escapeHtml(message)}`;

    // 로그 추가
    logContent.appendChild(entry);

    // 카운터 업데이트
    this._aiLogCount++;
    if (logCount) {
      logCount.textContent = `${this._aiLogCount} lines`;
    }

    // 자동 스크롤 (최신 로그가 보이도록)
    logContent.scrollTop = logContent.scrollHeight;
  },

  /**
   * HTML 이스케이프
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * AI 호출 로그 추가 (서비스, 모델, 목적 표시)
   */
  addAICallLog(service, model, purpose) {
    const serviceIcons = {
      gpt: mmIcon('robot', 14),
      grok: mmIcon('rocket', 14),
      claude: mmIcon('brain', 14),
      gemini: mmIcon('sparkles', 14)
    };
    const serviceNames = { gpt: 'GPT', grok: 'Grok', claude: 'Claude', gemini: 'Gemini' };
    const serviceName = serviceNames[service] || service;
    const serviceIcon = serviceIcons[service] || '';
    this.addAILog(`${serviceName} (${model}) 호출: ${purpose}`, 'ai-call', serviceIcon);
  },

  /**
   * 에러 로그 추가
   */
  addErrorLog(error) {
    this.addAILog(`오류: ${error}`, 'error');

    // 상태 아이콘을 빨간색으로 변경
    const statusIcon = document.getElementById('aiLogStatusIcon');
    if (statusIcon) {
      statusIcon.style.background = '#f44336';
      statusIcon.style.animation = 'none';
    }
  },

  /**
   * [2026-01-14] AI 응답 내용 로그 추가 (실시간 스트리밍)
   */
  addAIResponseLog(aiResponse) {
    if (!aiResponse) return;

    const { phase, service, model, content, nodeTitle, nodeLevel, hasError } = aiResponse;

    // Phase 이름/아이콘 매핑
    const phaseInfo = {
      'analysis': { icon: mmIcon('bar-chart', 14), text: t('treePhaseAnalysis', '심층 분석') },
      'causalAnalysis': { icon: mmIcon('link', 14), text: t('treePhaseCausal', '인과관계 분석') },
      'classification': { icon: mmIcon('folder', 14), text: t('treePhaseClassify', 'MECE 재분류') },
      'assembly': { icon: mmIcon('wrench', 14), text: t('treePhaseAssembly', '트리 조립') },
      'content_generation': { icon: mmIcon('text', 14), text: t('treePhaseContentGen', '콘텐츠 생성') },
      'evaluation': { icon: mmIcon('star', 14), text: t('treePhaseEvaluation', '품질 평가') }
    };

    // 서비스 라벨/아이콘
    const serviceInfo = {
      gpt: { icon: mmIcon('robot', 14), text: 'GPT' },
      grok: { icon: mmIcon('rocket', 14), text: 'Grok' },
      claude: { icon: mmIcon('brain', 14), text: 'Claude' },
      gemini: { icon: mmIcon('sparkles', 14), text: 'Gemini' }
    };

    const pi = phaseInfo[phase] || { icon: '', text: phase };
    const si = serviceInfo[service] || { icon: '', text: service };

    // 콘텐츠 생성 진행 중인 경우 (노드별)
    if (phase === 'content_generation') {
      const errorIconHtml = hasError ? mmIcon('alert-triangle', 14) : '';
      this.addAILog(content, 'content', errorIconHtml);
      return;
    }

    // Phase 완료 시 헤더와 응답 내용 표시
    this.addAILog(`\n━━━ ${pi.text} 완료 [${si.text}/${model}] ━━━`, 'phase', pi.icon);

    // AI 응답 내용 표시 (줄바꿈 처리)
    if (content) {
      const lines = content.split('\n');
      for (const line of lines.slice(0, 20)) { // 최대 20줄까지 표시
        if (line.trim()) {
          this.addAILog(`  ${line}`, 'ai-response');
        }
      }
      if (lines.length > 20) {
        this.addAILog(`  ... (${lines.length - 20}줄 더 있음)`, 'ai-response');
      }
    }
  },

  // 진행 단계 초기화
  resetProgressSteps() {
    const steps = document.querySelectorAll('#genProgress .step-item');
    const statusMessage = document.getElementById('genStatusMessage');

    steps.forEach((step, index) => {
      const icon = step.querySelector('.step-icon');
      step.style.color = '#666';
      step.style.fontWeight = 'normal';
      step.style.textShadow = 'none';
      icon.style.background = '#444';
      icon.style.color = '#888';
      icon.style.boxShadow = 'none';
      icon.innerHTML = index + 1;
    });

    // 상태 메시지 초기화
    if (statusMessage) {
      statusMessage.textContent = '';
      statusMessage.style.display = 'none';
      statusMessage.style.color = '#666';
      statusMessage.style.fontWeight = 'normal';
    }

    // 노드별 진행 상황 초기화
    this.resetNodeProgress();

    // AI 호출 통계 초기화
    this.resetAIStats();
  },

  // 마인드맵 데이터가 있는지 확인
  hasMindmapData() {
    const mindMapData = window.MyMind3?.MindMapData?.mindMapData || [];
    return mindMapData.length > 0;
  },

  // 버튼 상태 업데이트
  updateButtonState() {
    const btn = document.getElementById('generateTreeBtn');
    if (!btn) return;

    const hasData = this.hasMindmapData();

    if (hasData) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.title = 'AI 노드재구성';
    } else {
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
      btn.title = t('treeLoadMapFirst', '마인드맵을 먼저 불러오세요');
    }
  },

  // 체크된 노드 수집
  getCheckedNodes() {
    const checkedNodes = [];
    const allNodes = window.MyMind3?.MindMapData?.mindMapData || [];

    function traverse(nodes) {
      for (const node of nodes) {
        if (node.checked) {
          checkedNodes.push({
            id: node.id,
            title: node.title,
            level: node.level,
            parentId: node.parentId
          });
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    }

    traverse(allNodes);
    return checkedNodes;
  },

  // 임시 기본 이름 생성 (API 호출 없이 즉시 반환)
  getTempDefaultName() {
    const currentFolder = window.currentQAFolder || window.MyMind3?.currentFolder || localStorage.getItem('currentFolder');
    return currentFolder ? `${currentFolder}_1` : t('treeNewMapDefault', '새 마인드맵_1');
  },

  // 정확한 기본 이름 생성 (부모 마인드맵 이름 + _숫자, API 호출)
  async getDefaultName() {
    const currentFolder = window.currentQAFolder || window.MyMind3?.currentFolder || localStorage.getItem('currentFolder');

    if (!currentFolder) {
      return t('treeNewMapDefault', '새 마인드맵_1');
    }

    // 기존 폴더 목록을 가져와서 중복 체크
    try {
      const response = await fetch('/api/savelist', {
        credentials: 'include'  // 세션 쿠키 포함
      });
      if (response.ok) {
        const data = await response.json();
        const folders = data.folders || [];

        // 현재 폴더명_숫자 패턴 찾기
        const pattern = new RegExp(`^${currentFolder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_(\\d+)$`);
        let maxNum = 0;

        for (const folder of folders) {
          const match = folder.match(pattern);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }

        return `${currentFolder}_${maxNum + 1}`;
      }
    } catch (error) {
      console.log('[TreeGenerator] Could not fetch folder list:', error);
    }

    return `${currentFolder}_1`;
  },

  // AI 모델 옵션 (API에서 동적 로드, DB 설정 기반 필터링)
  AI_MODELS: {},

  // 활성화된 서비스 목록 (DB 설정 기반)
  ENABLED_SERVICES: ['gpt', 'grok', 'claude', 'gemini'],

  /**
   * 서버에서 활성화된 AI 모델 목록 로드
   */
  async loadModelsFromServer() {
    try {
      // ApiCache 사용 (중복 호출 방지)
      const response = window.ApiCache
        ? await window.ApiCache.fetch('/api/credits/models')
        : await fetch('/api/credits/models');
      const data = await response.json();

      if (data.success && data.data && data.data.models) {
        this.AI_MODELS = {};

        // API 응답 형식 확인: 배열인지 객체인지
        const modelsData = data.data.models;

        if (Array.isArray(modelsData)) {
          // 배열 형식: 모델을 서비스별로 그룹화
          for (const model of modelsData) {
            const service = model.ai_service;
            if (!this.AI_MODELS[service]) {
              this.AI_MODELS[service] = [];
            }
            this.AI_MODELS[service].push({
              value: model.model_name,
              label: model.display_name || model.model_name
            });
          }
        } else if (typeof modelsData === 'object') {
          // 객체 형식 (서비스별 그룹화된 형태)
          for (const service of Object.keys(modelsData)) {
            if (!this.AI_MODELS[service]) {
              this.AI_MODELS[service] = [];
            }
            const serviceModels = modelsData[service];
            if (Array.isArray(serviceModels)) {
              for (const model of serviceModels) {
                this.AI_MODELS[service].push({
                  // API 응답: model, displayName (camelCase)
                  value: model.model || model.value || model.model_name,
                  label: model.displayName || model.label || model.display_name || model.model
                });
              }
            }
          }
        }

        // 활성화된 서비스 목록 업데이트
        if (data.data.enabledServices) {
          this.ENABLED_SERVICES = data.data.enabledServices;
        }

        console.log('[TreeGenerator] 모델 로드 완료:', Object.keys(this.AI_MODELS));
        return true;
      }
    } catch (error) {
      console.error('[TreeGenerator] 모델 로드 실패:', error);
    }
    return false;
  },

  /**
   * 활성화된 서비스 옵션 HTML 생성
   */
  getServiceOptionsHtml(selectedService = 'gpt') {
    // option 태그는 텍스트만 렌더링하므로 순수 텍스트 라벨 사용
    const serviceLabels = {
      gpt: 'GPT',
      grok: 'Grok',
      claude: 'Claude',
      gemini: 'Gemini'
    };

    return this.ENABLED_SERVICES.map(service => {
      const label = serviceLabels[service] || service;
      const selected = service === selectedService ? 'selected' : '';
      return `<option value="${service}" ${selected}>${label}</option>`;
    }).join('');
  },

  // 모달 표시 (최적화: 팝업 먼저 표시, 기본 이름은 비동기로 로드)
  async showModal() {
    // 마인드맵 데이터가 없으면 경고
    if (!this.hasMindmapData()) {
      TreeGeneratorToast.show(t('treeLoadMapFirst', '마인드맵을 먼저 불러오세요.'), 'warning');
      return;
    }

    // API에서 활성화된 모델 목록 로드
    await this.loadModelsFromServer();

    const checkedNodes = this.getCheckedNodes();
    // 임시 이름으로 먼저 표시 (API 호출 대기 없이 즉시 팝업)
    const tempName = this.getTempDefaultName();
    const currentSettings = this.getAISettings();

    // 기존 모달이 있으면 제거
    const existingModal = document.getElementById('treeGenModal');
    if (existingModal) existingModal.remove();

    // 모달 HTML 생성
    const checkedInfo = checkedNodes.length > 0
      ? `<p style="margin: 0 0 20px 0; color: #666;">선택된 노드: <strong style="color: #1976d2;">${checkedNodes.length}개</strong></p>`
      : `<p style="margin: 0 0 20px 0; color: #888; font-size: 13px;">${mmIcon('lightbulb', 14)} 노드를 체크하면 해당 노드들의 내용을 기반으로 AI가 새 트리를 생성합니다.<br>체크하지 않으면 빈 마인드맵이 생성됩니다.</p>`;

    // 임시 이름 사용 (API 응답 전까지)
    const defaultName = tempName;

    // 현재 선택된 서비스가 비활성화되었으면 첫번째 활성화된 서비스로 변경
    let selectedService = currentSettings.service;
    if (!this.ENABLED_SERVICES.includes(selectedService) && this.ENABLED_SERVICES.length > 0) {
      selectedService = this.ENABLED_SERVICES[0];
    }

    // AI 서비스 옵션 생성 (활성화된 서비스만)
    const serviceOptions = this.getServiceOptionsHtml(selectedService);

    // 현재 서비스의 모델 옵션 생성 (이미지 전용 모델 제외 - 노드재구성은 텍스트 생성 목적)
    const modelOptions = this.getModelOptionsHtml(selectedService, currentSettings.model, true);

    // 보조 AI 설정 가져오기 (Settings와 동기화 - v3)
    let secondaryService = currentSettings.secondaryService || 'gpt';
    let secondaryModel = currentSettings.secondaryModel || 'gpt-4o-mini';
    // 보조 서비스가 비활성화되었으면 첫번째 활성화된 서비스로 변경
    if (!this.ENABLED_SERVICES.includes(secondaryService) && this.ENABLED_SERVICES.length > 0) {
      secondaryService = this.ENABLED_SERVICES[0];
      secondaryModel = ''; // 모델은 자동 선택
    }
    // 보조AI에 이미지 전용 모델이 설정되어 있으면 기본 모델로 변경
    if (this.isImageOnlyModel(secondaryModel)) {
      console.warn(`[TreeGenerator] 보조AI에 이미지 전용 모델(${secondaryModel}) 감지, 기본 모델로 변경`);
      secondaryModel = 'gpt-4o-mini';
    }
    const secondaryServiceOptions = this.getServiceOptionsHtml(secondaryService);
    // 보조AI: 이미지 생성 모델 제외 (텍스트 콘텐츠 생성이 목적)
    const secondaryModelOptions = this.getModelOptionsHtml(secondaryService, secondaryModel, true);

    const modalHtml = `
      <div id="treeGenModal" class="modal-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      ">
        <!-- 메인 컨테이너: 팝업 + AI 로그 패널 -->
        <div id="treeGenContainer" style="
          display: flex;
          gap: 0;
          max-width: 95%;
          max-height: 90vh;
          align-items: stretch;
        ">
        <div class="modal-content" style="
          background: white;
          border-radius: 12px 0 0 12px;
          padding: 0;
          width: 520px;
          max-width: 520px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          flex-shrink: 0;
          max-height: 90vh;
          overflow-y: auto;
        ">
          <div class="modal-header" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #eee;
          ">
            <h3 style="margin: 0; font-size: 18px; font-weight: 600;">노드재구성</h3>
            <button class="modal-close" onclick="TreeGenerator.closeModal()" style="
              background: none;
              border: none;
              font-size: 24px;
              cursor: pointer;
              color: #666;
              padding: 0;
              line-height: 1;
            ">&times;</button>
          </div>
          <div class="modal-body" style="padding: 24px;">
            ${checkedInfo}
            <!-- 답변 수준 선택 (2026-01-21 추가) -->
            <div class="form-group" style="margin-bottom: 20px;">
              <label style="
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: #333;
              ">답변 수준:</label>
              <div id="answerLevelGroup" style="
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
              ">
                <label style="display: flex; align-items: center; cursor: pointer; padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; transition: all 0.2s;">
                  <input type="radio" name="answerLevel" value="elementary" style="margin-right: 6px;"> 초등
                </label>
                <label style="display: flex; align-items: center; cursor: pointer; padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; transition: all 0.2s;">
                  <input type="radio" name="answerLevel" value="middle" style="margin-right: 6px;"> 중등
                </label>
                <label style="display: flex; align-items: center; cursor: pointer; padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; transition: all 0.2s;">
                  <input type="radio" name="answerLevel" value="high" style="margin-right: 6px;"> 고등
                </label>
                <label style="display: flex; align-items: center; cursor: pointer; padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; transition: all 0.2s; background: #e3f2fd; border-color: #1976d2;">
                  <input type="radio" name="answerLevel" value="university" checked style="margin-right: 6px;"> 대학
                </label>
                <label style="display: flex; align-items: center; cursor: pointer; padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; transition: all 0.2s;">
                  <input type="radio" name="answerLevel" value="graduate" style="margin-right: 6px;"> 대학원
                </label>
                <label style="display: flex; align-items: center; cursor: pointer; padding: 6px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; transition: all 0.2s;">
                  <input type="radio" name="answerLevel" value="phd" style="margin-right: 6px;"> 박사
                </label>
              </div>
            </div>
            <div class="form-group" style="margin-bottom: 20px;">
              <label for="newMapName" style="
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: #333;
              ">새 마인드맵 이름:</label>
              <input type="text" id="newMapName" value="${defaultName}" placeholder="새 마인드맵 이름 입력" style="
                width: 100%;
                padding: 12px 16px;
                border: 1px solid #ddd;
                border-radius: 8px;
                font-size: 14px;
                box-sizing: border-box;
                outline: none;
                transition: border-color 0.2s;
              " onfocus="this.style.borderColor='#1976d2'; this.select();" onblur="this.style.borderColor='#ddd'" />
            </div>
            <div class="form-group" style="margin-bottom: 20px;">
              <label style="
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
                color: #333;
              ">${window.i18n?.aiModelSelectPrimary || 'AI 모델 선택: 주AI'}</label>
              <div style="display: flex; gap: 10px;">
                <select id="treeGenServiceSelect" style="
                  flex: 1;
                  padding: 10px 12px;
                  border: 1px solid #ddd;
                  border-radius: 8px;
                  font-size: 14px;
                  cursor: pointer;
                  background: white;
                ">
                  ${serviceOptions}
                </select>
                <select id="treeGenModelSelect" style="
                  flex: 2;
                  padding: 10px 12px;
                  border: 1px solid #ddd;
                  border-radius: 8px;
                  font-size: 14px;
                  cursor: pointer;
                  background: white;
                ">
                  ${modelOptions}
                </select>
              </div>
              <label style="
                display: block;
                margin-top: 20px;
                margin-bottom: 8px;
                font-weight: 500;
                color: #333;
              ">${window.i18n?.aiModelSelectSecondary || 'AI 모델 선택: 보조AI'}</label>
              <div style="display: flex; gap: 10px;">
                <select id="treeGenSecondaryServiceSelect" style="
                  flex: 1;
                  padding: 10px 12px;
                  border: 1px solid #ddd;
                  border-radius: 8px;
                  font-size: 14px;
                  cursor: pointer;
                  background: white;
                ">
                  ${secondaryServiceOptions}
                </select>
                <select id="treeGenSecondaryModelSelect" style="
                  flex: 2;
                  padding: 10px 12px;
                  border: 1px solid #ddd;
                  border-radius: 8px;
                  font-size: 14px;
                  cursor: pointer;
                  background: white;
                ">
                  ${secondaryModelOptions}
                </select>
              </div>
            </div>
            <div id="genProgress" style="display:none;">
              <div class="progress-steps" style="margin-bottom: 16px;">
                <div class="step-item" data-step="0" style="display: flex; align-items: center; padding: 8px 0; color: #999;">
                  <span class="step-icon" style="width: 24px; height: 24px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px;">1</span>
                  <span class="step-text">노드 콘텐츠 수집</span>
                </div>
                <div class="step-item" data-step="1" style="display: flex; align-items: center; padding: 8px 0; color: #999;">
                  <span class="step-icon" style="width: 24px; height: 24px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px;">2</span>
                  <span class="step-text">구조 분석</span>
                </div>
                <div class="step-item" data-step="2" style="display: flex; align-items: center; padding: 8px 0; color: #999;">
                  <span class="step-icon" style="width: 24px; height: 24px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px;">3</span>
                  <span class="step-text">MECE 재분류</span>
                </div>
                <div class="step-item" data-step="3" style="display: flex; align-items: center; padding: 8px 0; color: #999;">
                  <span class="step-icon" style="width: 24px; height: 24px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px;">4</span>
                  <span class="step-text">트리 재조립</span>
                </div>
                <div class="step-item" data-step="4" style="display: flex; align-items: center; padding: 8px 0; color: #999;">
                  <span class="step-icon" style="width: 24px; height: 24px; border-radius: 50%; background: #eee; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px;">5</span>
                  <span class="step-text">파일 저장</span>
                </div>
              </div>
              <!-- AI 호출 통계 표시 영역 (2026-01-14 추가) -->
              <div id="genAIStats" style="
                display: none;
                background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
                color: white;
              ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-size: 13px; font-weight: 600;">AI 호출 현황</span>
                </div>
                <div style="display: flex; gap: 16px;">
                  <div style="flex: 1; background: rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; text-align: center;">
                    <div style="font-size: 11px; color: rgba(255,255,255,0.7); margin-bottom: 4px;">${mmIcon('target', 11)} 주AI</div>
                    <div id="genPrimaryAICalls" style="font-size: 18px; font-weight: 700;">0/0</div>
                  </div>
                  <div style="flex: 1; background: rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; text-align: center;">
                    <div style="font-size: 11px; color: rgba(255,255,255,0.7); margin-bottom: 4px;">${mmIcon('layers', 11)} 보조AI</div>
                    <div id="genSecondaryAICalls" style="font-size: 18px; font-weight: 700;">0/0</div>
                  </div>
                </div>
              </div>
              <!-- 노드별 진행 상황 표시 영역 -->
              <div id="genNodeProgress" style="
                display: none;
                background: #f5f5f5;
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 12px;
              ">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span style="font-size: 12px; color: #666;">노드 콘텐츠 생성</span>
                  <span id="genNodeCount" style="font-size: 12px; font-weight: 600; color: #1976d2;">0/0</span>
                </div>
                <div style="background: #ddd; border-radius: 4px; height: 6px; overflow: hidden;">
                  <div id="genNodeProgressBar" style="
                    background: linear-gradient(90deg, #1976d2, #42a5f5);
                    height: 100%;
                    width: 0%;
                    transition: width 0.3s ease;
                  "></div>
                </div>
                <div id="genCurrentNode" style="
                  font-size: 11px;
                  color: #888;
                  margin-top: 6px;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                "></div>
              </div>
              <p id="genStatusMessage" style="
                text-align: center;
                color: #666;
                margin: 0 0 12px 0;
                font-size: 13px;
                min-height: 20px;
                display: none;
              "></p>
              <p id="genElapsedTime" style="
                text-align: center;
                color: #1976d2;
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                font-family: 'Consolas', 'Monaco', monospace;
              ">00:00:00</p>
            </div>
          </div>
          <div class="modal-footer" style="
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 24px;
            border-top: 1px solid #eee;
            background: #f9f9f9;
            border-radius: 0 0 12px 12px;
          ">
            <button class="btn-secondary" style="
              padding: 10px 20px;
              border: 1px solid #ddd;
              background: white;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              color: #666;
            ">취소</button>
            <button class="btn-primary" id="generateTreeBtn2" style="
              padding: 10px 24px;
              border: none;
              background: #1976d2;
              color: white;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 500;
            ">생성</button>
          </div>
        </div>
        <!-- AI 실시간 로그 패널 -->
        <div id="aiLogPanel" class="ai-log-panel" style="
          background: #1a1a2e;
          border-radius: 0 12px 12px 0;
          padding: 0;
          width: 520px;
          max-width: 520px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          display: none;
          flex-shrink: 0;
        ">
          <div class="ai-log-header" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid #2d2d44;
            background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
            border-radius: 0 12px 0 0;
          ">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span id="aiLogStatusIcon" class="ai-log-status-icon" style="
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #4caf50;
                animation: pulse 1.5s ease-in-out infinite;
              "></span>
              <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #e0e0e0;">AI 실시간 로그</h3>
            </div>
            <span id="aiLogCount" style="
              font-size: 12px;
              color: #888;
              background: rgba(255,255,255,0.1);
              padding: 4px 10px;
              border-radius: 12px;
            ">0 lines</span>
          </div>
          <div id="aiLogContent" class="ai-log-content" style="
            padding: 16px;
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.6;
            color: #b0b0b0;
            background: #0d0d1a;
          ">
            <div class="ai-log-welcome" style="
              text-align: center;
              padding: 40px 20px;
              color: #666;
            ">
              <div style="font-size: 40px; margin-bottom: 12px;">${mmIcon('robot', 40)}</div>
              <div style="font-size: 14px;">AI 처리가 시작되면<br>실시간 로그가 여기에 표시됩니다</div>
            </div>
          </div>
        </div>
        </div>
      </div>
      <style>
        @keyframes progressPulse {
          0% { width: 20%; margin-left: 0%; }
          50% { width: 40%; margin-left: 30%; }
          100% { width: 20%; margin-left: 80%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes spinGlow {
          0% { transform: rotate(0deg); filter: drop-shadow(0 0 4px rgba(0, 229, 255, 0.8)); }
          50% { filter: drop-shadow(0 0 8px rgba(0, 229, 255, 1)); }
          100% { transform: rotate(360deg); filter: drop-shadow(0 0 4px rgba(0, 229, 255, 0.8)); }
        }
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0; transform: scale(0.5); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes borderGlow {
          0%, 100% { box-shadow: 0 0 5px rgba(0, 229, 255, 0.5), inset 0 0 5px rgba(0, 229, 255, 0.1); }
          50% { box-shadow: 0 0 15px rgba(0, 229, 255, 0.8), inset 0 0 10px rgba(0, 229, 255, 0.2); }
        }
        .ai-log-content::-webkit-scrollbar {
          width: 8px;
        }
        .ai-log-content::-webkit-scrollbar-track {
          background: #1a1a2e;
          border-radius: 4px;
        }
        .ai-log-content::-webkit-scrollbar-thumb {
          background: #3d3d5c;
          border-radius: 4px;
        }
        .ai-log-content::-webkit-scrollbar-thumb:hover {
          background: #5d5d7c;
        }
        .ai-log-entry {
          padding: 6px 10px;
          border-left: 2px solid #333;
          margin-bottom: 4px;
          background: rgba(255,255,255,0.02);
          border-radius: 0 4px 4px 0;
          word-break: break-word;
        }
        .ai-log-entry.phase { border-left-color: #00e5ff; background: rgba(0, 229, 255, 0.1); }
        .ai-log-entry.ai-call { border-left-color: #ff9800; background: rgba(255, 152, 0, 0.1); }
        .ai-log-entry.content { border-left-color: #4caf50; background: rgba(76, 175, 80, 0.1); }
        .ai-log-entry.error { border-left-color: #f44336; background: rgba(244, 67, 54, 0.1); color: #ff8a80; }
        .ai-log-entry.complete { border-left-color: #9c27b0; background: rgba(156, 39, 176, 0.1); }
        .ai-log-entry.ai-response {
          border-left-color: #64b5f6;
          background: rgba(100, 181, 246, 0.05);
          color: #b0bec5;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 11px;
          padding: 4px 10px;
          white-space: pre-wrap;
          word-break: break-all;
        }
        .ai-log-timestamp {
          color: #666;
          font-size: 10px;
          margin-right: 8px;
        }
        .step-loading-indicator {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          margin-left: 8px;
        }
        .step-loading-indicator .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00e5ff;
        }
        .step-loading-indicator .dot:nth-child(1) { animation: dotPulse 1.4s ease-in-out infinite; }
        .step-loading-indicator .dot:nth-child(2) { animation: dotPulse 1.4s ease-in-out 0.2s infinite; }
        .step-loading-indicator .dot:nth-child(3) { animation: dotPulse 1.4s ease-in-out 0.4s infinite; }
      </style>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // AI 서비스 변경 시 모델 목록 업데이트 및 즉시 저장 (주 모델) - 이미지 전용 모델 제외
    const serviceSelect = document.getElementById('treeGenServiceSelect');
    const modelSelect = document.getElementById('treeGenModelSelect');
    if (serviceSelect && modelSelect) {
      serviceSelect.addEventListener('change', () => {
        const newService = serviceSelect.value;
        modelSelect.innerHTML = this.getModelOptionsHtml(newService, '', true);
        // 즉시 저장
        this.saveAsDefaultAI(newService, modelSelect.value);
      });
      modelSelect.addEventListener('change', () => {
        // 모델 변경 시 즉시 저장
        this.saveAsDefaultAI(serviceSelect.value, modelSelect.value);
      });
    }

    // 보조 모델 서비스 변경 시 모델 목록 업데이트 및 즉시 저장
    const secondaryServiceSelect = document.getElementById('treeGenSecondaryServiceSelect');
    const secondaryModelSelect = document.getElementById('treeGenSecondaryModelSelect');
    if (secondaryServiceSelect && secondaryModelSelect) {
      secondaryServiceSelect.addEventListener('change', () => {
        const newService = secondaryServiceSelect.value;
        // 보조AI: 이미지 생성 모델 제외 (텍스트 콘텐츠 생성이 목적)
        secondaryModelSelect.innerHTML = this.getModelOptionsHtml(newService, '', true);
        // 즉시 저장
        this.saveSecondaryAI(newService, secondaryModelSelect.value);
      });
      secondaryModelSelect.addEventListener('change', () => {
        // 보조 모델 변경 시 즉시 저장
        this.saveSecondaryAI(secondaryServiceSelect.value, secondaryModelSelect.value);
      });
    }

    // 버튼 이벤트 리스너 등록 (onclick 속성이 동적 HTML에서 동작하지 않을 수 있음)
    const modal = document.getElementById('treeGenModal');

    // X 버튼 (닫기)
    modal.querySelector('.modal-close')?.addEventListener('click', () => {
      this.closeModal();
    });

    // 취소 버튼
    modal.querySelector('.btn-secondary')?.addEventListener('click', () => {
      this.closeModal();
    });

    // 생성 버튼
    modal.querySelector('.btn-primary')?.addEventListener('click', () => {
      this.generate();
    });

    // 입력 필드에 포커스
    setTimeout(() => {
      document.getElementById('newMapName')?.focus();
    }, 100);

    // 비동기로 정확한 기본 이름 가져와서 업데이트 (중복 체크 포함)
    this.getDefaultName().then(exactName => {
      const nameInput = document.getElementById('newMapName');
      if (nameInput && nameInput.value === tempName) {
        // 사용자가 아직 수정하지 않았으면 정확한 이름으로 업데이트
        nameInput.value = exactName;
      }
    }).catch(err => {
      console.log('[TreeGenerator] 기본 이름 로드 실패, 임시 이름 유지:', err);
    });

    // AI 로그 패널 표시 (팝업 열릴 때부터 표시)
    this.clearAILog();
    this.showAILogPanel();
  },

  // 모달 닫기
  closeModal() {
    console.log('[TreeGenerator] closeModal 시작');

    // 타이머가 실행 중이면 정리 (에러 방지를 위해 try-catch)
    try {
      if (this.timerInterval) {
        this.stopTimer();
      }
    } catch (e) {
      console.log('[TreeGenerator] stopTimer 에러 (무시):', e.message);
    }

    const modal = document.getElementById('treeGenModal');
    console.log('[TreeGenerator] 모달 요소:', modal ? 'found' : 'not found');
    if (modal) {
      modal.remove();
      console.log('[TreeGenerator] 모달 제거 완료');
    }
  },

  // 이미지 생성 전용 모델인지 확인 (텍스트 생성 불가)
  isImageOnlyModel(modelName) {
    if (!modelName) return false;
    const name = modelName.toLowerCase();
    // 이미지 생성 전용 모델 패턴
    return name.includes('image') ||  // gpt-image-*, gemini-*-image*, grok-*-image*
           name.startsWith('dall-e') ||  // dall-e-3
           name.startsWith('imagen');     // imagen-4
  },

  // 모델 옵션 HTML 생성
  // @param {string} service - AI 서비스명
  // @param {string} selectedModel - 선택된 모델명
  // @param {boolean} excludeImageModels - true면 이미지 생성 모델 제외 (보조AI용)
  getModelOptionsHtml(service, selectedModel = '', excludeImageModels = false) {
    let models = this.AI_MODELS[service] || this.AI_MODELS.gpt || [];
    if (!Array.isArray(models) || models.length === 0) {
      console.warn('[TreeGenerator] 모델 목록이 비어있습니다:', service);
      return '<option value="">모델 로딩중...</option>';
    }

    // 보조AI 선택 시 이미지 생성 전용 모델 제외 (텍스트 생성 불가)
    if (excludeImageModels) {
      const originalCount = models.length;
      models = models.filter(m => !this.isImageOnlyModel(m.value));
      if (models.length < originalCount) {
        console.log(`[TreeGenerator] 이미지 전용 모델 ${originalCount - models.length}개 제외 (보조AI용)`);
      }
    }

    return models.map(m =>
      `<option value="${m.value}" ${m.value === selectedModel ? 'selected' : ''}>${m.label}</option>`
    ).join('');
  },

  // 선택된 AI 설정을 새노드 만들기 기본값으로 저장 (주 AI)
  saveAsDefaultAI(service, model) {
    try {
      const aiSettingsStr = localStorage.getItem('mymind3_ai_settings');
      let aiSettings = aiSettingsStr ? JSON.parse(aiSettingsStr) : {
        defaultService: 'gpt',
        multiAiEnabled: false,
        paymentCurrency: 'USD',
        treeGenService: 'gpt',
        treeGenModel: 'gpt-4o-mini',
        treeGenSecondaryService: 'gpt',
        treeGenSecondaryModel: 'gpt-4o-mini',
        services: {
          gpt: { enabled: true, model: 'gpt-4o-mini', paymentMethod: 'credit' },
          grok: { enabled: false, model: 'grok-2', paymentMethod: 'credit' },
          claude: { enabled: false, model: 'claude-sonnet-4-20250514', paymentMethod: 'credit' },
          gemini: { enabled: false, model: 'gemini-2.0-flash', paymentMethod: 'credit' }
        }
      };

      // 새노드 만들기 주 AI 설정 업데이트
      aiSettings.treeGenService = service;
      aiSettings.treeGenModel = model;

      localStorage.setItem('mymind3_ai_settings', JSON.stringify(aiSettings));
      console.log('[TreeGenerator] 주 AI 설정 저장됨:', { service, model });

      return true;
    } catch (error) {
      console.error('[TreeGenerator] 주 AI 설정 저장 실패:', error);
      return false;
    }
  },

  // 보조 AI 설정 저장
  saveSecondaryAI(service, model) {
    try {
      const aiSettingsStr = localStorage.getItem('mymind3_ai_settings');
      let aiSettings = aiSettingsStr ? JSON.parse(aiSettingsStr) : {
        defaultService: 'gpt',
        multiAiEnabled: false,
        paymentCurrency: 'USD',
        treeGenService: 'gpt',
        treeGenModel: 'gpt-4o-mini',
        treeGenSecondaryService: 'gpt',
        treeGenSecondaryModel: 'gpt-4o-mini',
        services: {
          gpt: { enabled: true, model: 'gpt-4o-mini', paymentMethod: 'credit' },
          grok: { enabled: false, model: 'grok-2', paymentMethod: 'credit' },
          claude: { enabled: false, model: 'claude-sonnet-4-20250514', paymentMethod: 'credit' },
          gemini: { enabled: false, model: 'gemini-2.0-flash', paymentMethod: 'credit' }
        }
      };

      // 새노드 만들기 보조 AI 설정 업데이트
      aiSettings.treeGenSecondaryService = service;
      aiSettings.treeGenSecondaryModel = model;

      localStorage.setItem('mymind3_ai_settings', JSON.stringify(aiSettings));
      console.log('[TreeGenerator] 보조 AI 설정 저장됨:', { service, model });

      return true;
    } catch (error) {
      console.error('[TreeGenerator] 보조 AI 설정 저장 실패:', error);
      return false;
    }
  },

  // AI 설정 정보 가져오기 (settings-ai.js와 동일한 저장소 사용)
  getAISettings() {
    try {
      // 설정 페이지와 동일한 키에서 AI 설정 가져오기
      const aiSettingsStr = localStorage.getItem('mymind3_ai_settings');
      const apiKeysStr = localStorage.getItem('mymind3_api_keys');

      // 기본값: 가장 효율 좋은 모델 (gpt-4o-mini)
      const defaultSettings = {
        service: 'gpt',
        model: 'gpt-4o-mini',
        apiKey: '',
        paymentMethod: 'credit'
      };

      // 메인 페이지 도구모음의 현재 선택값 우선 사용
      const mainServiceSelect = document.getElementById('aiServiceSelect');
      const mainModelSelect = document.getElementById('gptModelSelect');
      const currentMainService = mainServiceSelect?.value || null;
      const currentMainModel = mainModelSelect?.value || null;
      console.log('[TreeGenerator] 메인 페이지 현재 선택:', { currentMainService, currentMainModel });

      if (!aiSettingsStr) {
        // localStorage 설정이 없으면 메인 페이지 값 또는 기본값 사용
        const service = currentMainService || defaultSettings.service;
        const model = currentMainModel || defaultSettings.model;
        console.log('[TreeGenerator] AI 설정 없음, 메인 페이지/기본값 사용:', { service, model });
        return { ...defaultSettings, service, model };
      }

      const aiSettings = JSON.parse(aiSettingsStr);
      const apiKeys = apiKeysStr ? JSON.parse(apiKeysStr) : {};

      // Settings의 "AI로 새노드 만들기" 설정을 우선 사용 (v3)
      const service = aiSettings.treeGenService || aiSettings.defaultService || 'gpt';
      const model = aiSettings.treeGenModel || aiSettings.services?.[service]?.model || defaultSettings.model;

      // 해당 서비스의 결제 설정 가져오기
      const serviceSettings = aiSettings.services?.[service] || {};
      const paymentMethod = serviceSettings.paymentMethod || 'credit';
      const apiKey = apiKeys[service] || '';

      // 보조 AI 설정 가져오기 (v3)
      const secondaryService = aiSettings.treeGenSecondaryService || 'gpt';
      const secondaryModel = aiSettings.treeGenSecondaryModel || 'gpt-4o-mini';

      console.log('[TreeGenerator] AI Settings:', { service, model, secondaryService, secondaryModel, paymentMethod, hasApiKey: !!apiKey });

      return { service, model, apiKey, paymentMethod, secondaryService, secondaryModel };
    } catch (error) {
      console.error('[TreeGenerator] Failed to get AI settings:', error);
      // 오류 시 가장 효율 좋은 기본값 반환
      return {
        service: 'gpt',
        model: 'gpt-4o-mini',
        apiKey: '',
        paymentMethod: 'credit',
        secondaryService: 'gpt',
        secondaryModel: 'gpt-4o-mini'
      };
    }
  },

  // 트리 생성 실행
  async generate() {
    console.log('[TreeGenerator] ========== generate() 시작 ==========');

    const newMapName = document.getElementById('newMapName')?.value.trim();
    console.log('[TreeGenerator] newMapName:', newMapName);

    if (!newMapName) {
      console.log('[TreeGenerator] ERROR: 마인드맵 이름 없음');
      TreeGeneratorToast.show(t('treeEnterMapName', '마인드맵 이름을 입력해주세요.'), 'warning');
      return;
    }

    // 답변 수준 가져오기 (2026-01-21 추가)
    const answerLevelRadio = document.querySelector('input[name="answerLevel"]:checked');
    const answerLevel = answerLevelRadio?.value || 'university';
    console.log('[TreeGenerator] answerLevel:', answerLevel);

    const checkedNodes = this.getCheckedNodes();
    console.log('[TreeGenerator] checkedNodes:', checkedNodes.length, '개');
    if (checkedNodes.length > 0) {
      console.log('[TreeGenerator] 첫번째 체크된 노드:', JSON.stringify(checkedNodes[0]));
    }

    const currentFolder = window.currentQAFolder || window.MyMind3?.currentFolder || localStorage.getItem('currentFolder');
    console.log('[TreeGenerator] currentFolder:', currentFolder);

    // 드롭다운에서 선택된 AI 서비스/모델 가져오기 (주 모델)
    const serviceSelect = document.getElementById('treeGenServiceSelect');
    const modelSelect = document.getElementById('treeGenModelSelect');

    // 보조 모델 정보 가져오기
    const secondaryServiceSelect = document.getElementById('treeGenSecondaryServiceSelect');
    const secondaryModelSelect = document.getElementById('treeGenSecondaryModelSelect');

    console.log('[TreeGenerator] 주 모델:', serviceSelect?.value, modelSelect?.value);
    console.log('[TreeGenerator] 보조 모델:', secondaryServiceSelect?.value, secondaryModelSelect?.value);

    const selectedService = serviceSelect?.value || 'gpt';
    const selectedModel = modelSelect?.value || 'gpt-4o-mini';

    // 보조 모델 정보
    const secondaryService = secondaryServiceSelect?.value || 'gpt';
    const secondaryModel = secondaryModelSelect?.value || 'gpt-4o-mini';

    console.log('[TreeGenerator] 선택된 설정:', {
      newMapName,
      checkedNodesCount: checkedNodes.length,
      currentFolder,
      primaryService: selectedService,
      primaryModel: selectedModel,
      secondaryService,
      secondaryModel
    });

    // AI 설정 즉시 저장 (변경 시 자동 적용)
    this.saveAsDefaultAI(selectedService, selectedModel);

    // 진행 상태 표시
    const progressDiv = document.getElementById('genProgress');
    const footerDiv = document.querySelector('#treeGenModal .modal-footer');
    console.log('[TreeGenerator] progressDiv:', progressDiv ? 'FOUND' : 'NOT FOUND');
    console.log('[TreeGenerator] footerDiv:', footerDiv ? 'FOUND' : 'NOT FOUND');

    if (progressDiv) {
      progressDiv.style.display = 'block';
      console.log('[TreeGenerator] 진행바 표시됨');
    }
    if (footerDiv) {
      footerDiv.style.display = 'none';
      console.log('[TreeGenerator] 푸터 숨김');
    }

    // 타이머 시작
    this.startTimer();
    // 진행 단계 초기화
    this.resetProgressSteps();

    // AI 로그 패널 표시 및 초기화 (2026-01-14 추가)
    this.clearAILog();
    this.showAILogPanel();
    this.addAILog(t('treeRestructureStart', '노드 재구성을 시작합니다...'), 'phase', mmIcon('rocket', 14));
    this.addAILog(`새 마인드맵 이름: ${newMapName}`, 'content', mmIcon('text', 14));
    this.addAILog(`선택된 노드: ${checkedNodes.length}개`, 'content', mmIcon('bar-chart', 14));
    this.addAILog(`주AI: ${selectedService} (${selectedModel})`, 'ai-call', mmIcon('robot', 14));
    this.addAILog(`보조AI: ${secondaryService} (${secondaryModel})`, 'ai-call', mmIcon('layers', 14));

    try {
      // 체크된 노드가 없으면 자동 선택 또는 빈 마인드맵 생성
      if (checkedNodes.length === 0) {
        // 전체 노드 확인 - 루트 노드만 있고 콘텐츠가 있으면 자동 선택
        const allNodes = window.MyMind3?.MindMapData?.mindMapData || [];

        if (allNodes.length === 1 && allNodes[0]) {
          // 단일 루트 노드가 있으면 자동으로 선택하여 재구성
          const rootNode = allNodes[0];
          console.log('[TreeGenerator] 체크된 노드 없음, 단일 루트 노드 자동 선택:', rootNode.title);

          // checkedNodes에 루트 노드 추가
          checkedNodes.push({
            id: rootNode.id,
            title: rootNode.title,
            level: rootNode.level || 0,
            parentId: rootNode.parentId || null
          });

          TreeGeneratorToast.show(t('treeRootAutoSelected', '루트 노드가 자동 선택되었습니다.'), 'info');
        } else if (allNodes.length > 1) {
          // 여러 노드가 있는데 체크된 것이 없으면 경고
          console.log('[TreeGenerator] 여러 노드가 있지만 체크된 노드 없음');
          TreeGeneratorToast.show(t('treeCheckNodesFirst', '재구성할 노드를 먼저 체크해주세요.'), 'warning');

          // UI 복원
          const progressDiv = document.getElementById('genProgress');
          const footerDiv = document.querySelector('#treeGenModal .modal-footer');
          if (progressDiv) progressDiv.style.display = 'none';
          if (footerDiv) footerDiv.style.display = 'flex';
          this.stopTimer();
          return;
        } else {
          // 노드가 없으면 빈 마인드맵 생성
          console.log('[TreeGenerator] 노드 없음 → 빈 마인드맵 생성');
          await this.createEmptyMindmap(newMapName);
          return;
        }
      }

      // 체크된 노드가 있으면 AI 기반 생성
      if (!currentFolder) {
        throw new Error('현재 마인드맵 정보를 찾을 수 없습니다.');
      }

      // 먼저 중복 이름 체크 (클라이언트 측)
      console.log('[TreeGenerator] 중복 이름 체크 시작...');
      const checkResponse = await fetch('/api/savelist', {
        credentials: 'include'
      });
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        const folders = checkData.folders || [];
        console.log('[TreeGenerator] 기존 폴더 목록:', folders);
        if (folders.includes(newMapName)) {
          throw new Error(`"${newMapName}" 이름의 마인드맵이 이미 존재합니다.`);
        }
        console.log('[TreeGenerator] 중복 이름 없음 - 계속 진행');
      }

      // 해당 서비스의 결제 방식 가져오기 (서비스별로 다를 수 있음!)
      const savedSettings = this.getAISettings();
      // 선택된 서비스의 결제 방식을 가져옴 (savedSettings.service가 아닌 selectedService 기준)
      const aiSettingsStr = localStorage.getItem('mymind3_ai_settings');
      const aiSettings = aiSettingsStr ? JSON.parse(aiSettingsStr) : {};
      const serviceSettings = aiSettings.services?.[selectedService] || {};
      const paymentMethod = serviceSettings.paymentMethod || 'credits';

      console.log('[TreeGenerator] savedSettings:', JSON.stringify(savedSettings));
      console.log('[TreeGenerator] 선택된 서비스의 결제 방식:', { selectedService, paymentMethod });

      // ============================================
      // 결제 방식에 따른 분기 처리
      // ============================================

      let result = null;

      if (paymentMethod === 'apikey') {
        // ============================================
        // 방법 1: 개인 API Key - 브라우저 직접 호출
        // API Key는 서버로 전송 금지!
        // ============================================
        console.log('[TreeGenerator] 방법 1: 개인 API Key 사용 (브라우저 직접 호출)');

        result = await this.generateWithPersonalKey({
          selectedService,
          selectedModel,
          secondaryService,
          secondaryModel,
          checkedNodes,
          currentFolder,
          newMapName
        });

      } else {
        // ============================================
        // 방법 2: 사이트 서비스 - 서버 경유 (SSE 스트림)
        // API Key 없이 요청!
        // ============================================
        console.log('[TreeGenerator] 방법 2: 사이트 서비스 사용 (서버 경유)');

        result = await this.generateWithSiteService({
          selectedService,
          selectedModel,
          secondaryService,
          secondaryModel,
          checkedNodes,
          currentFolder,
          newMapName,
          answerLevel
        });
      }

      if (result && result.success) {
        // 타이머 종료 및 경과 시간 가져오기
        const timerResult = this.stopTimer();
        console.log('[TreeGenerator] 성공! 노드 수:', result.nodeCount, '경과 시간:', timerResult.formatted);

        // 모든 단계 완료 표시
        this.markAllStepsComplete();

        // 품질 점수 표시 (3-Phase 파이프라인 사용 시)
        let successMsg = `새 마인드맵 "${newMapName}" 생성 완료! (${result.nodeCount}개 노드, ${timerResult.formatted})`;
        if (result.qualityScore !== undefined) {
          successMsg += ` 품질: ${result.qualityScore}점`;
          console.log('[TreeGenerator] Quality Score:', result.qualityScore);
        }
        if (result.pipelineInfo) {
          console.log('[TreeGenerator] Pipeline Info:', result.pipelineInfo);
        }

        // 토스트 메시지 먼저 표시
        TreeGeneratorToast.show(successMsg, 'success');

        // AI 로그에 성공 정보 추가
        this.addAILog(`총 ${result.nodeCount}개 노드 생성`, 'complete', mmIcon('sparkles', 14));
        this.addAILog(`소요 시간: ${timerResult.formatted}`, 'complete', mmIcon('clock', 14));

        // 2초 후 자동으로 팝업 닫기 및 마인드맵 불러오기
        const mapNameToLoad = newMapName;
        console.log('[TreeGenerator] 2초 후 자동 닫기 예약:', mapNameToLoad);
        setTimeout(() => {
          console.log('[TreeGenerator] 자동 닫기 실행 시작');
          TreeGenerator.closeModal();
          console.log('[TreeGenerator] 모달 닫기 완료, 마인드맵 불러오기:', mapNameToLoad);
          TreeGenerator.loadNewMindmap(mapNameToLoad);
        }, 2000);
      } else if (!result) {
        throw new Error('서버 응답이 없습니다.');
      } else {
        throw new Error(result.error || '트리 생성 실패');
      }

    } catch (error) {
      // 타이머 종료
      const timerResult = this.stopTimer();

      console.error('[TreeGenerator] ========== 에러 발생 ==========');
      console.error('[TreeGenerator] Error:', error);
      console.error('[TreeGenerator] Error.name:', error.name);
      console.error('[TreeGenerator] Error.message:', error.message);
      console.error('[TreeGenerator] Error.stack:', error.stack);
      console.error('[TreeGenerator] 경과 시간:', timerResult.formatted);
      console.error('[TreeGenerator] 컨텍스트:', {
        currentFolder,
        checkedNodesCount: checkedNodes.length,
        newMapName,
        selectedService,
        selectedModel
      });

      const errorMessage = error.message || t('treeUnknownError', '알 수 없는 오류가 발생했습니다.');
      TreeGeneratorToast.show(`오류: ${errorMessage} (${timerResult.formatted})`, 'error');

      // AI 로그에 에러 추가
      this.addErrorLog(`${errorMessage} (경과: ${timerResult.formatted})`);

      // UI 복원
      if (progressDiv) progressDiv.style.display = 'none';
      if (footerDiv) footerDiv.style.display = 'flex';
    }

    console.log('[TreeGenerator] ========== generate() 종료 ==========');
  },

  // 빈 마인드맵 생성
  async createEmptyMindmap(newMapName) {
    console.log('[TreeGenerator] Creating empty mindmap:', newMapName);

    try {
      // 기본 마인드맵 데이터 구조 생성
      const emptyMindmapData = {
        mindMapData: [
          {
            id: 1,
            title: newMapName,
            level: 0,
            expanded: true,
            checked: false,
            children: []
          }
        ],
        metadata: {
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
          version: '1.0'
        }
      };

      console.log('[TreeGenerator] Empty mindmap data:', emptyMindmapData);

      // 먼저 중복 이름 체크
      const checkResponse = await fetch('/api/savelist', {
        credentials: 'include'
      });
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        const folders = checkData.folders || [];
        if (folders.includes(newMapName)) {
          throw new Error(`"${newMapName}" 이름의 마인드맵이 이미 존재합니다.`);
        }
      }

      // 서버에 저장 (/api/save 사용 - server.js의 엔드포인트)
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',  // 세션 쿠키 포함
        body: JSON.stringify({
          folderName: newMapName,
          data: emptyMindmapData
        })
      });

      console.log('[TreeGenerator] Save response status:', response.status);
      const result = await response.json();
      console.log('[TreeGenerator] Save response:', result);

      if (result.success || response.ok) {
        // 타이머 종료 및 경과 시간 가져오기
        const timerResult = this.stopTimer();
        console.log('[TreeGenerator] 빈 마인드맵 생성 완료, 경과 시간:', timerResult.formatted);

        // 모든 단계 완료 표시
        TreeGenerator.markAllStepsComplete();

        // 토스트 메시지 먼저 표시
        TreeGeneratorToast.show(`새 마인드맵 "${newMapName}" 생성 완료! (${timerResult.formatted})`, 'success');

        // 2초 후 자동으로 팝업 닫기 및 마인드맵 불러오기
        const mapNameToLoad = newMapName;
        console.log('[TreeGenerator] 빈 마인드맵 - 2초 후 자동 닫기 예약:', mapNameToLoad);
        setTimeout(() => {
          console.log('[TreeGenerator] 빈 마인드맵 - 자동 닫기 실행');
          TreeGenerator.closeModal();
          TreeGenerator.loadNewMindmap(mapNameToLoad);
        }, 2000);
      } else {
        throw new Error(result.error || '마인드맵 저장 실패');
      }
    } catch (error) {
      // 타이머 종료
      const timerResult = this.stopTimer();

      console.error('[TreeGenerator] Empty mindmap creation error:', error);
      console.error('[TreeGenerator] Error stack:', error.stack);
      console.error('[TreeGenerator] Error details:', {
        name: error.name,
        message: error.message,
        newMapName
      });
      console.error('[TreeGenerator] 경과 시간:', timerResult.formatted);

      const errorMessage = error.message || t('treeUnknownError', '알 수 없는 오류가 발생했습니다.');
      TreeGeneratorToast.show(`오류: ${errorMessage} (${timerResult.formatted})`, 'error');

      // UI 복원
      const progressDiv = document.getElementById('genProgress');
      const footerDiv = document.querySelector('#treeGenModal .modal-footer');
      if (progressDiv) progressDiv.style.display = 'none';
      if (footerDiv) footerDiv.style.display = 'flex';
    }
  },

  // 새 마인드맵 불러오기
  loadNewMindmap(mapName) {
    console.log('[TreeGenerator] loadNewMindmap 시작:', mapName);

    // MyMind3Simple.loadFromFolder 사용 (가장 정확한 방법)
    if (window.MyMind3Simple && typeof window.MyMind3Simple.loadFromFolder === 'function') {
      console.log('[TreeGenerator] MyMind3Simple.loadFromFolder 사용');
      window.MyMind3Simple.loadFromFolder(mapName);
    } else if (typeof loadMindmap === 'function') {
      console.log('[TreeGenerator] loadMindmap 사용');
      loadMindmap(mapName);
    } else if (typeof window.loadFolder === 'function') {
      console.log('[TreeGenerator] window.loadFolder 사용');
      window.loadFolder(mapName);
    } else if (typeof loadMapFromServer === 'function') {
      console.log('[TreeGenerator] loadMapFromServer 사용');
      loadMapFromServer(mapName);
    } else {
      // 불러오기 함수를 찾을 수 없는 경우 토스트로 안내
      console.log('[TreeGenerator] 불러오기 함수를 찾을 수 없음');
      TreeGeneratorToast.show(`마인드맵 "${mapName}" 생성 완료. 불러오기 기능을 사용해 열어주세요.`, 'info');
    }
  }
};

// 전역 등록
window.TreeGenerator = TreeGenerator;

// 페이지 로드 시 버튼 상태 초기화
document.addEventListener('DOMContentLoaded', () => {
  TreeGenerator.updateButtonState();
});

// 마인드맵 로드/변경 시 버튼 상태 업데이트를 위한 이벤트 리스너
window.addEventListener('mindmapLoaded', () => {
  TreeGenerator.updateButtonState();
});

window.addEventListener('mindmapCleared', () => {
  TreeGenerator.updateButtonState();
});

console.log('[TreeGenerator] Module loaded');
