// public/js/features/pdf-generator.js
// PDF 생성 클라이언트 - SSE 연결 및 재연결 로직
// PDF.md 기획 기반 - 2025-12-29

/**
 * PDF 생성 클라이언트 클래스
 * SSE 연결, 하트비트 처리, 자동 재연결 기능 제공
 */
class PDFGeneratorClient {
  constructor(options = {}) {
    // 설정
    this.config = {
      maxReconnectAttempts: options.maxReconnectAttempts || 3,
      reconnectDelay: options.reconnectDelay || 3000,
      heartbeatTimeout: options.heartbeatTimeout || 120000, // 2분 (AI 생성 시간 고려)
      connectionTimeout: options.connectionTimeout || 600000, // 10분 (대용량 문서 처리 고려)
      ...options
    };

    // 상태
    this.eventSource = null;
    this.sessionId = null;
    this.reconnectAttempts = 0;
    this.lastHeartbeat = null;
    this.heartbeatTimer = null;
    this.connectionTimer = null;
    this.isConnecting = false;
    this.isCompleted = false;

    // 콜백
    this.callbacks = {
      onProgress: null,
      onComplete: null,
      onError: null,
      onHeartbeat: null,
      onReconnect: null
    };

    // 진행 상태 저장 (재연결 시 복구용)
    this.lastProgress = null;
  }

  /**
   * 이벤트 콜백 등록
   */
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(`on${event.charAt(0).toUpperCase() + event.slice(1)}`)) {
      this.callbacks[`on${event.charAt(0).toUpperCase() + event.slice(1)}`] = callback;
    }
    return this;
  }

  /**
   * PDF 생성 시작
   */
  async generate(params) {
    if (this.isConnecting) {
      console.warn('[PDFGenerator] 이미 생성 진행 중');
      return;
    }

    this.isConnecting = true;
    this.isCompleted = false;
    this.reconnectAttempts = 0;
    this.lastProgress = null;
    this.sessionId = this.generateSessionId();

    console.log(`[PDFGenerator] 생성 시작 (세션: ${this.sessionId})`);

    try {
      await this.connect(params);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * SSE 연결 수립
   */
  async connect(params) {
    this.cleanup();
    this.currentParams = params;

    const queryParams = new URLSearchParams({
      ...params,
      sessionId: this.sessionId,
      reconnect: this.reconnectAttempts > 0 ? 'true' : 'false',
      lastProgress: this.lastProgress ? JSON.stringify(this.lastProgress) : ''
    });

    const url = `/api/generate-pdf-stream?${queryParams.toString()}`;

    console.log(`[PDFGenerator] SSE 연결 시도 (시도 ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts + 1})`);

    this.eventSource = new EventSource(url);
    this.startConnectionTimeout();
    this.setupEventHandlers();
  }

  /**
   * EventSource 이벤트 핸들러 설정
   */
  setupEventHandlers() {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      console.log('[PDFGenerator] SSE 연결 성공');
      this.reconnectAttempts = 0;
      this.startHeartbeatMonitor();
    };

    this.eventSource.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.eventSource.addEventListener('progress', (event) => {
      this.handleProgress(event);
    });

    this.eventSource.addEventListener('complete', (event) => {
      this.handleComplete(event);
    });

    this.eventSource.addEventListener('error', (event) => {
      this.handleSSEError(event);
    });

    this.eventSource.addEventListener('heartbeat', (event) => {
      this.handleHeartbeat(event);
    });

    this.eventSource.onerror = (error) => {
      this.handleConnectionError(error);
    };
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('[PDFGenerator] 메시지:', data);

      // 타입에 따라 적절한 핸들러 호출
      switch (data.type) {
        case 'heartbeat':
          this.updateHeartbeat();
          break;
        case 'phase':
        case 'progress':
        case 'page_progress':
        case 'image_progress':
          this.handleProgressData(data);
          break;
        case 'complete':
          this.handleCompleteData(data);
          break;
        case 'error':
          this.handleError(new Error(data.message || 'PDF 생성 실패'));
          break;
        default:
          console.log('[PDFGenerator] 알 수 없는 메시지 타입:', data.type);
      }
    } catch (e) {
      // JSON 파싱 실패시 무시
      console.warn('[PDFGenerator] JSON 파싱 실패:', e);
    }
  }

  handleProgressData(data) {
    this.clearConnectionTimeout();
    this.updateHeartbeat();
    this.lastProgress = data;

    let progress = data.progress || 0;
    const phaseName = data.name || data.message || t('pdfInProgress', '진행 중');

    // page_progress: 30-55% 범위 내에서 계산
    if (data.type === 'page_progress' && data.current && data.total) {
      const pageProgress = (data.current / data.total) * 25; // 25% 범위 (30-55%)
      progress = 30 + pageProgress;
    }

    // image_progress: 60-75% 범위 내에서 계산
    if (data.type === 'image_progress' && data.current && data.total) {
      const imageProgress = (data.current / data.total) * 15; // 15% 범위 (60-75%)
      progress = 60 + imageProgress;
    }

    // progress 값을 data에 추가
    data.progress = Math.round(progress);

    console.log(`[PDFGenerator] 진행: ${phaseName} - ${data.progress}%`);

    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(data);
    }
  }

  handleCompleteData(data) {
    this.isCompleted = true;
    this.isConnecting = false;
    this.cleanup();

    console.log('[PDFGenerator] 생성 완료:', data);

    if (this.callbacks.onComplete) {
      this.callbacks.onComplete(data);
    }
  }

  handleProgress(event) {
    this.clearConnectionTimeout();
    this.updateHeartbeat();

    try {
      const data = JSON.parse(event.data);
      this.lastProgress = data;

      const phaseName = data.phaseName || (typeof data.phase === 'object' ? data.phase?.name : data.phase) || data.detail || t('pdfInProgress', '진행 중');
      const progress = data.progress || data.percent || 0;
      console.log(`[PDFGenerator] 진행: ${phaseName} - ${progress}%`);

      if (this.callbacks.onProgress) {
        this.callbacks.onProgress(data);
      }
    } catch (e) {
      console.error('[PDFGenerator] 진행 상태 파싱 실패:', e);
    }
  }

  handleComplete(event) {
    this.isCompleted = true;
    this.isConnecting = false;
    this.cleanup();

    try {
      const data = JSON.parse(event.data);
      console.log('[PDFGenerator] 생성 완료:', data);

      if (this.callbacks.onComplete) {
        this.callbacks.onComplete(data);
      }
    } catch (e) {
      console.error('[PDFGenerator] 완료 데이터 파싱 실패:', e);
      if (this.callbacks.onComplete) {
        this.callbacks.onComplete({ success: true });
      }
    }
  }

  handleSSEError(event) {
    try {
      const data = JSON.parse(event.data);
      console.error('[PDFGenerator] 서버 에러:', data);
      this.handleError(new Error(data.message || '서버 에러'));
    } catch (e) {
      console.error('[PDFGenerator] 에러 데이터 파싱 실패');
    }
  }

  handleHeartbeat(event) {
    this.updateHeartbeat();
    if (this.callbacks.onHeartbeat) {
      try {
        const data = JSON.parse(event.data);
        this.callbacks.onHeartbeat(data);
      } catch (e) {
        this.callbacks.onHeartbeat({ timestamp: Date.now() });
      }
    }
  }

  updateHeartbeat() {
    this.lastHeartbeat = Date.now();
  }

  startHeartbeatMonitor() {
    this.stopHeartbeatMonitor();
    this.lastHeartbeat = Date.now();

    this.heartbeatTimer = setInterval(() => {
      if (this.isCompleted) {
        this.stopHeartbeatMonitor();
        return;
      }

      const elapsed = Date.now() - this.lastHeartbeat;
      if (elapsed > this.config.heartbeatTimeout) {
        console.warn(`[PDFGenerator] 하트비트 타임아웃 (${elapsed}ms)`);
        this.attemptReconnect();
      }
    }, 5000);
  }

  stopHeartbeatMonitor() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  startConnectionTimeout() {
    this.clearConnectionTimeout();
    this.connectionTimer = setTimeout(() => {
      console.error('[PDFGenerator] 연결 타임아웃');
      this.handleError(new Error('연결 타임아웃'));
    }, this.config.connectionTimeout);
  }

  clearConnectionTimeout() {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  handleConnectionError(error) {
    console.error('[PDFGenerator] 연결 에러:', error);
    if (this.isCompleted) return;
    this.attemptReconnect();
  }

  attemptReconnect() {
    if (this.isCompleted || !this.isConnecting) return;

    this.cleanup();

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error(`[PDFGenerator] 최대 재연결 횟수 초과 (${this.config.maxReconnectAttempts}회)`);
      this.handleError(new Error('연결 실패: 최대 재연결 횟수 초과'));
      return;
    }

    this.reconnectAttempts++;
    console.log(`[PDFGenerator] ${this.config.reconnectDelay}ms 후 재연결 시도 (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    if (this.callbacks.onReconnect) {
      this.callbacks.onReconnect({
        attempt: this.reconnectAttempts,
        maxAttempts: this.config.maxReconnectAttempts,
        lastProgress: this.lastProgress
      });
    }

    setTimeout(() => {
      if (!this.isCompleted && this.isConnecting) {
        this.connect(this.currentParams);
      }
    }, this.config.reconnectDelay);
  }

  handleError(error) {
    this.isConnecting = false;
    this.cleanup();
    console.error('[PDFGenerator] 에러:', error.message);
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }

  cancel() {
    console.log('[PDFGenerator] 생성 취소');
    this.isConnecting = false;
    this.isCompleted = true;
    this.cleanup();
  }

  cleanup() {
    this.stopHeartbeatMonitor();
    this.clearConnectionTimeout();
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  generateSessionId() {
    return `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStatus() {
    return {
      isConnecting: this.isConnecting,
      isCompleted: this.isCompleted,
      sessionId: this.sessionId,
      reconnectAttempts: this.reconnectAttempts,
      lastProgress: this.lastProgress,
      lastHeartbeat: this.lastHeartbeat
    };
  }
}

// 전역 인스턴스
window.PDFGeneratorClient = PDFGeneratorClient;

// ==========================================
// PDF 진행상황 모달 UI 관리
// ==========================================

function openPDFProgressModal() {
  const modal = document.getElementById('pdfProgressModal');
  const overlay = document.getElementById('pdfProgressOverlay');

  if (modal && overlay) {
    resetPDFProgressUI();
    modal.style.display = 'block';
    overlay.style.display = 'block';

    const cancelBtn = document.getElementById('pdfCancelBtn');
    const closeBtn = document.getElementById('pdfCloseProgressBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    if (closeBtn) closeBtn.style.display = 'none';

    console.log('[PDFProgress] 모달 열림');
  }
}

function closePDFProgressModal() {
  const modal = document.getElementById('pdfProgressModal');
  const overlay = document.getElementById('pdfProgressOverlay');

  if (modal) modal.style.display = 'none';
  if (overlay) overlay.style.display = 'none';

  console.log('[PDFProgress] 모달 닫힘');
}

function resetPDFProgressUI() {
  const icon = document.getElementById('pdfProgressIcon');
  const title = document.getElementById('pdfProgressTitle');
  if (icon) icon.innerHTML = mmIcon('file', 14);
  if (title) title.textContent = t('pdfGenerating', 'PDF 생성 중...');

  const content = document.getElementById('pdfProgressContent');
  const complete = document.getElementById('pdfProgressComplete');
  const error = document.getElementById('pdfProgressError');
  if (content) content.style.display = 'block';
  if (complete) complete.style.display = 'none';
  if (error) error.style.display = 'none';

  const phases = document.querySelectorAll('#pdfProgressPhases .progress-phase');
  phases.forEach(phase => {
    phase.className = 'progress-phase pending';
    const iconEl = phase.querySelector('.phase-icon');
    const detailEl = phase.querySelector('.phase-detail');
    if (iconEl) iconEl.innerHTML = mmIcon('loader', 14);
    if (detailEl) detailEl.textContent = '';
  });

  const progressBar = document.getElementById('pdfProgressBar');
  const percentEl = document.getElementById('pdfProgressPercent');
  const timeEl = document.getElementById('pdfProgressTime');
  if (progressBar) progressBar.style.width = '0%';
  if (percentEl) percentEl.textContent = '0%';
  if (timeEl) timeEl.textContent = '';

  const aiDetailEl = document.getElementById('pdfAIModelDetail');
  if (aiDetailEl) {
    aiDetailEl.textContent = '';
    aiDetailEl.style.color = '';
    aiDetailEl.style.fontWeight = '';
  }
}

function updatePDFProgressUI(data) {
  console.log('[PDFProgress] 업데이트:', data);

  let phaseNum = 0;
  let phaseName = t('pdfInProgress', '진행 중');
  let phaseStatus = 'in_progress';
  let detail = '';
  let progress = 0;

  // AI 모델 정보 표시
  if (data.aiInfo) {
    const aiDetailEl = document.getElementById('pdfAIModelDetail');
    if (aiDetailEl) {
      aiDetailEl.textContent = `(${data.aiInfo.display || data.aiInfo.service + '/' + data.aiInfo.model})`;
      aiDetailEl.style.color = '#2196F3';
      aiDetailEl.style.fontWeight = 'bold';
    }
    console.log('[PDFProgress] AI 모델:', data.aiInfo.display);
  }

  // page_progress 이벤트 처리 (콘텐츠 생성 단계 - phase 2)
  if (data.type === 'page_progress' && data.current && data.total) {
    phaseNum = 2;
    phaseStatus = 'in_progress';
    detail = data.message || `${data.current}/${data.total} 페이지`;
    // 30-55% 범위 계산
    progress = 30 + (data.current / data.total) * 25;

    for (let i = 0; i < phaseNum; i++) {
      updatePDFPhaseElement(i, 'completed', '');
    }
    updatePDFPhaseElement(phaseNum, phaseStatus, detail);
    for (let i = phaseNum + 1; i < 6; i++) {
      updatePDFPhaseElement(i, 'pending', '');
    }
  }
  // image_progress 이벤트 처리 (이미지 처리 단계 - phase 3)
  else if (data.type === 'image_progress' && data.current && data.total) {
    phaseNum = 3;
    phaseStatus = 'in_progress';
    detail = data.message || `${data.current}/${data.total} 이미지`;
    // 60-75% 범위 계산
    progress = 60 + (data.current / data.total) * 15;

    for (let i = 0; i < phaseNum; i++) {
      updatePDFPhaseElement(i, 'completed', '');
    }
    updatePDFPhaseElement(phaseNum, phaseStatus, detail);
    for (let i = phaseNum + 1; i < 6; i++) {
      updatePDFPhaseElement(i, 'pending', '');
    }
  }
  else if (data.phases && Array.isArray(data.phases)) {
    data.phases.forEach((phase, idx) => {
      updatePDFPhaseElement(idx, phase.status, phase.detail?.message || phase.detail || '');
    });
    progress = data.progress || 0;
  } else if (data.phase !== undefined) {
    // 서버는 1-indexed (1-6), 클라이언트는 0-indexed (0-5)
    const serverPhase = typeof data.phase === 'object' ? data.phase.id : data.phase;
    phaseNum = serverPhase - 1; // 서버 phase 번호를 0-indexed로 변환
    phaseName = data.phaseName || data.phase?.name || data.name || getPDFDefaultPhaseName(phaseNum);
    phaseStatus = data.status || 'in_progress';
    detail = data.detail?.message || data.detail || data.message || '';
    progress = data.progress || data.percent || calculatePDFProgressFromPhase(phaseNum, phaseStatus);

    for (let i = 0; i < phaseNum; i++) {
      updatePDFPhaseElement(i, 'completed', '');
    }
    updatePDFPhaseElement(phaseNum, phaseStatus, detail);
    for (let i = phaseNum + 1; i < 6; i++) {
      updatePDFPhaseElement(i, 'pending', '');
    }
  }
  // progress 이벤트 처리 (data.progress가 이미 설정된 경우)
  else if (data.progress !== undefined && data.progress > 0) {
    progress = data.progress;
  }

  const progressBar = document.getElementById('pdfProgressBar');
  const percentEl = document.getElementById('pdfProgressPercent');
  if (progressBar) progressBar.style.width = `${Math.min(progress, 100)}%`;
  if (percentEl) percentEl.textContent = `${Math.round(progress)}%`;

  if (data.estimatedRemaining) {
    const timeEl = document.getElementById('pdfProgressTime');
    if (timeEl) timeEl.textContent = `· 예상 남은 시간: 약 ${data.estimatedRemaining}초`;
  }
}

function updatePDFPhaseElement(phaseNum, status, detail) {
  const phaseEl = document.querySelector(`#pdfProgressPhases .progress-phase[data-phase="${phaseNum}"]`);
  if (!phaseEl) return;

  phaseEl.className = `progress-phase ${status}`;

  const iconEl = phaseEl.querySelector('.phase-icon');
  if (iconEl) {
    switch (status) {
      case 'completed':
        iconEl.innerHTML = mmIcon('check-circle', 14);
        break;
      case 'in_progress':
      case 'in-progress':
        iconEl.innerHTML = mmIcon('refresh-cw', 14);
        break;
      case 'error':
        iconEl.innerHTML = mmIcon('x-circle', 14);
        break;
      default:
        iconEl.innerHTML = mmIcon('loader', 14);
    }
  }

  const detailEl = phaseEl.querySelector('.phase-detail');
  if (detailEl && detail) {
    detailEl.textContent = `(${detail})`;
  }
}

function getPDFDefaultPhaseName(phaseNum) {
  const names = [
    mmIcon('folder-open', 14) + ' ' + t('pdfPhaseDataCollect', '데이터 수집'),
    mmIcon('robot', 14) + ' ' + t('pdfPhasePageDesign', 'AI 페이지 설계'),
    mmIcon('sparkles', 14) + ' ' + t('pdfPhaseContentGen', 'AI 콘텐츠 생성'),
    mmIcon('image', 14) + ' ' + t('pdfPhaseImageProc', '이미지 처리'),
    mmIcon('palette', 14) + ' ' + t('pdfPhaseTemplate', '템플릿 적용'),
    mmIcon('file', 14) + ' ' + t('pdfPhaseFileGen', 'PDF 파일 생성')
  ];
  return names[phaseNum] || `Phase ${phaseNum}`;
}

function calculatePDFProgressFromPhase(phaseNum, status) {
  const phaseWeight = 100 / 6;
  let progress = phaseNum * phaseWeight;
  if (status === 'completed') {
    progress += phaseWeight;
  } else if (status === 'in_progress') {
    progress += phaseWeight / 2;
  }
  return Math.min(progress, 100);
}

function showPDFProgressComplete(data, autoClose = false, autoCloseDelay = 1500) {
  for (let i = 0; i < 6; i++) {
    updatePDFPhaseElement(i, 'completed', '');
  }

  const progressBar = document.getElementById('pdfProgressBar');
  const percentEl = document.getElementById('pdfProgressPercent');
  if (progressBar) progressBar.style.width = '100%';
  if (percentEl) percentEl.textContent = '100%';

  const timeEl = document.getElementById('pdfProgressTime');
  if (timeEl) {
    const pageCount = data.pageCount ? `페이지: ${data.pageCount}장` : '';
    const elapsed = data.elapsed ? ` · 소요 시간: ${data.elapsed}초` : '';
    timeEl.textContent = pageCount + elapsed;
    timeEl.style.color = '#22c55e';
    timeEl.style.fontWeight = 'bold';
  }

  const icon = document.getElementById('pdfProgressIcon');
  const title = document.getElementById('pdfProgressTitle');
  if (icon) icon.innerHTML = mmIcon('check-circle', 14);
  if (title) title.textContent = t('pdfComplete', 'PDF 생성 완료!');

  const cancelBtn = document.getElementById('pdfCancelBtn');
  const closeBtn = document.getElementById('pdfCloseProgressBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (closeBtn) closeBtn.style.display = 'inline-block';

  console.log('[PDFProgress] 완료 표시');

  if (autoClose) {
    setTimeout(() => {
      closePDFProgressModal();
      console.log('[PDFProgress] 자동 닫기 완료');
    }, autoCloseDelay);
  }
}

function showPDFProgressError(message) {
  const content = document.getElementById('pdfProgressContent');
  const error = document.getElementById('pdfProgressError');
  if (content) content.style.display = 'none';
  if (error) error.style.display = 'block';

  const msgEl = document.getElementById('pdfProgressErrorMsg');
  if (msgEl) msgEl.textContent = message || t('pdfUnknownError', '알 수 없는 오류가 발생했습니다.');

  const icon = document.getElementById('pdfProgressIcon');
  const title = document.getElementById('pdfProgressTitle');
  if (icon) icon.innerHTML = mmIcon('x-circle', 14);
  if (title) title.textContent = t('pdfFailed', '생성 실패');

  const cancelBtn = document.getElementById('pdfCancelBtn');
  const closeBtn = document.getElementById('pdfCloseProgressBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (closeBtn) closeBtn.style.display = 'inline-block';

  console.log('[PDFProgress] 에러 표시:', message);
}

function showPDFReconnectStatus(attempt, maxAttempts) {
  let reconnectEl = document.getElementById('pdfReconnectStatus');
  if (!reconnectEl) {
    reconnectEl = document.createElement('div');
    reconnectEl.id = 'pdfReconnectStatus';
    reconnectEl.className = 'reconnect-status';
    reconnectEl.innerHTML = '<div class="spinner"></div><span></span>';
    const content = document.getElementById('pdfProgressContent');
    if (content) content.appendChild(reconnectEl);
  }

  reconnectEl.style.display = 'flex';
  reconnectEl.querySelector('span').textContent = t('pdfReconnecting', '재연결 중...') + ` (${attempt}/${maxAttempts})`;
}

function hidePDFReconnectStatus() {
  const reconnectEl = document.getElementById('pdfReconnectStatus');
  if (reconnectEl) reconnectEl.style.display = 'none';
}

// 전역으로 함수 노출
window.openPDFProgressModal = openPDFProgressModal;
window.closePDFProgressModal = closePDFProgressModal;
window.resetPDFProgressUI = resetPDFProgressUI;
window.updatePDFProgressUI = updatePDFProgressUI;
window.showPDFProgressComplete = showPDFProgressComplete;
window.showPDFProgressError = showPDFProgressError;
window.showPDFReconnectStatus = showPDFReconnectStatus;
window.hidePDFReconnectStatus = hidePDFReconnectStatus;

// 간편 사용 함수
window.generatePDFWithProgress = function(params, callbacks = {}) {
  const client = new PDFGeneratorClient();

  if (callbacks.onProgress) client.on('progress', callbacks.onProgress);
  if (callbacks.onComplete) client.on('complete', callbacks.onComplete);
  if (callbacks.onError) client.on('error', callbacks.onError);
  if (callbacks.onHeartbeat) client.on('heartbeat', callbacks.onHeartbeat);
  if (callbacks.onReconnect) client.on('reconnect', callbacks.onReconnect);

  client.generate(params);
  return client;
};

/**
 * 진행상황 모달과 함께 PDF 생성 (완전 통합 버전)
 */
window.generatePDFWithModal = function(params, callbacks = {}) {
  openPDFProgressModal();

  const client = new PDFGeneratorClient();
  const startTime = Date.now();

  client.on('progress', (data) => {
    updatePDFProgressUI(data);
    hidePDFReconnectStatus();
    if (callbacks.onProgress) callbacks.onProgress(data);
  });

  client.on('complete', (data) => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const completeData = { ...data, elapsed };

    showPDFProgressComplete(completeData, false);

    if (callbacks.onComplete) {
      callbacks.onComplete(completeData);
    }
  });

  client.on('error', (error) => {
    showPDFProgressError(error.message || error);
    if (callbacks.onError) callbacks.onError(error);
  });

  client.on('reconnect', (data) => {
    showPDFReconnectStatus(data.attempt, data.maxAttempts);
    if (callbacks.onReconnect) callbacks.onReconnect(data);
  });

  client.generate(params);

  const cancelBtn = document.getElementById('pdfCancelBtn');
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      client.cancel();
      closePDFProgressModal();
    };
  }

  const closeBtn = document.getElementById('pdfCloseProgressBtn');
  if (closeBtn) {
    closeBtn.onclick = () => {
      closePDFProgressModal();
    };
  }

  return client;
};

console.log('[PDFGenerator] 클라이언트 및 진행상황 UI 로드 완료');

// ==========================================
// PDF AI 모델 선택 로직
// ==========================================

let PDF_AI_MODELS = {};
let PDF_ENABLED_SERVICES = ['gpt', 'grok', 'claude', 'gemini'];

async function loadPDFModelsFromServer() {
  try {
    // ApiCache 사용 (중복 호출 방지)
    const response = window.ApiCache
      ? await window.ApiCache.fetch('/api/credits/models')
      : await fetch('/api/credits/models');
    const data = await response.json();

    if (data.success && data.data && data.data.models) {
      PDF_AI_MODELS = {};
      const modelsData = data.data.models;

      if (Array.isArray(modelsData)) {
        for (const model of modelsData) {
          const service = model.ai_service;
          if (!PDF_AI_MODELS[service]) {
            PDF_AI_MODELS[service] = [];
          }
          PDF_AI_MODELS[service].push({
            value: model.model_name,
            label: model.display_name || model.model_name
          });
        }
      } else if (typeof modelsData === 'object') {
        for (const service of Object.keys(modelsData)) {
          if (!PDF_AI_MODELS[service]) {
            PDF_AI_MODELS[service] = [];
          }
          const serviceModels = modelsData[service];
          if (Array.isArray(serviceModels)) {
            for (const model of serviceModels) {
              PDF_AI_MODELS[service].push({
                // API 응답: model, displayName (camelCase)
                value: model.model || model.value || model.model_name,
                label: model.displayName || model.label || model.display_name || model.model
              });
            }
          }
        }
      }

      if (data.data.enabledServices) {
        PDF_ENABLED_SERVICES = data.data.enabledServices;
      }

      console.log('[PDFAIModel] 모델 로드 완료:', Object.keys(PDF_AI_MODELS));
      return true;
    }
  } catch (error) {
    console.error('[PDFAIModel] 모델 로드 실패:', error);
  }
  return false;
}

function filterPDFServiceSelect() {
  const serviceSelect = document.getElementById('pdfAIService');
  if (!serviceSelect) return;

  const options = serviceSelect.querySelectorAll('option');
  let firstEnabledService = null;

  options.forEach(option => {
    const isEnabled = PDF_ENABLED_SERVICES.includes(option.value);
    option.style.display = isEnabled ? '' : 'none';
    option.disabled = !isEnabled;
    if (isEnabled && !firstEnabledService) {
      firstEnabledService = option.value;
    }
  });

  if (!PDF_ENABLED_SERVICES.includes(serviceSelect.value) && firstEnabledService) {
    serviceSelect.value = firstEnabledService;
    updatePDFModelOptions(firstEnabledService);
  }
}

const PDF_DEFAULT_MODELS = {
  gpt: 'gpt-4o-mini',
  grok: 'grok-2',
  claude: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-1.5-flash'
};

const PDF_AI_STORAGE_KEY = 'mymind3_pdf_ai_selection';

async function initPDFAIModelSelector() {
  const serviceSelect = document.getElementById('pdfAIService');
  const modelSelect = document.getElementById('pdfAIModel');

  if (!serviceSelect || !modelSelect) {
    console.warn('[PDFAIModel] 선택기 요소를 찾을 수 없습니다');
    return;
  }

  await loadPDFModelsFromServer();
  filterPDFServiceSelect();

  const savedSelection = loadPDFAISelection();

  if (savedSelection.service && PDF_AI_MODELS[savedSelection.service] && PDF_ENABLED_SERVICES.includes(savedSelection.service)) {
    serviceSelect.value = savedSelection.service;
  } else if (PDF_ENABLED_SERVICES.length > 0) {
    serviceSelect.value = PDF_ENABLED_SERVICES[0];
  }

  updatePDFModelOptions(serviceSelect.value, savedSelection.model);

  serviceSelect.addEventListener('change', function() {
    const service = this.value;
    const defaultModel = PDF_DEFAULT_MODELS[service];
    updatePDFModelOptions(service, defaultModel);
    savePDFAISelection();
    console.log(`[PDFAIModel] 서비스 변경: ${service}`);
  });

  modelSelect.addEventListener('change', function() {
    savePDFAISelection();
    console.log(`[PDFAIModel] 모델 변경: ${this.value}`);
  });

  console.log('[PDFAIModel] 선택기 초기화 완료');
}

function updatePDFModelOptions(service, selectedModel) {
  const modelSelect = document.getElementById('pdfAIModel');
  if (!modelSelect) return;

  const models = PDF_AI_MODELS[service] || [];
  modelSelect.innerHTML = '';

  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.label;
    modelSelect.appendChild(option);
  });

  if (selectedModel && models.some(m => m.value === selectedModel)) {
    modelSelect.value = selectedModel;
  } else if (models.length > 0) {
    const defaultModel = PDF_DEFAULT_MODELS[service];
    if (defaultModel && models.some(m => m.value === defaultModel)) {
      modelSelect.value = defaultModel;
    }
  }
}

function savePDFAISelection() {
  const serviceSelect = document.getElementById('pdfAIService');
  const modelSelect = document.getElementById('pdfAIModel');

  if (!serviceSelect || !modelSelect) return;

  const selection = {
    service: serviceSelect.value,
    model: modelSelect.value
  };

  try {
    localStorage.setItem(PDF_AI_STORAGE_KEY, JSON.stringify(selection));
    console.log('[PDFAIModel] 선택 저장:', selection);
  } catch (e) {
    console.error('[PDFAIModel] 저장 실패:', e);
  }
}

function loadPDFAISelection() {
  try {
    const saved = localStorage.getItem(PDF_AI_STORAGE_KEY);
    if (saved) {
      const selection = JSON.parse(saved);
      console.log('[PDFAIModel] 저장된 선택 불러오기:', selection);
      return selection;
    }
  } catch (e) {
    console.error('[PDFAIModel] 불러오기 실패:', e);
  }

  return {
    service: 'gpt',
    model: 'gpt-4o-mini'
  };
}

function getPDFAISelection() {
  const serviceSelect = document.getElementById('pdfAIService');
  const modelSelect = document.getElementById('pdfAIModel');

  if (serviceSelect && modelSelect) {
    return {
      service: serviceSelect.value,
      model: modelSelect.value
    };
  }

  return loadPDFAISelection();
}

// 전역으로 함수 노출
window.initPDFAIModelSelector = initPDFAIModelSelector;
window.getPDFAISelection = getPDFAISelection;
window.PDF_AI_MODELS = PDF_AI_MODELS;

// DOM 로드 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPDFAIModelSelector);
} else {
  setTimeout(initPDFAIModelSelector, 100);
}

console.log('[PDFAIModel] 모듈 로드 완료');

// ==========================================
// PDF 옵션 모달 관리
// ==========================================

/**
 * PDF 옵션 모달 열기
 */
function openPDFOptionsModal(nodeId, folder) {
  const modal = document.getElementById('pdfOptionsModal');
  const overlay = document.getElementById('pdfOptionsOverlay');

  if (modal && overlay) {
    // nodeId와 folder 저장
    modal.dataset.nodeId = nodeId;
    modal.dataset.folder = folder;

    modal.style.display = 'block';
    overlay.style.display = 'block';

    // AI 모델 선택기 초기화
    initPDFAIModelSelector();

    console.log('[PDFOptions] 모달 열림 - nodeId:', nodeId, 'folder:', folder);
  }
}

/**
 * PDF 옵션 모달 닫기
 */
function closePDFOptionsModal() {
  const modal = document.getElementById('pdfOptionsModal');
  const overlay = document.getElementById('pdfOptionsOverlay');

  if (modal) modal.style.display = 'none';
  if (overlay) overlay.style.display = 'none';

  console.log('[PDFOptions] 모달 닫힘');
}

/**
 * PDF 생성 시작 (옵션 모달에서 호출)
 */
function startPDFGeneration() {
  const modal = document.getElementById('pdfOptionsModal');
  if (!modal) return;

  const nodeId = modal.dataset.nodeId;
  const folder = modal.dataset.folder;

  // 옵션 수집
  const aiSelection = getPDFAISelection();
  const templateSelect = document.getElementById('pdfTemplate');
  const toneSelect = document.getElementById('pdfTone');
  const detailLevelSelect = document.getElementById('pdfDetailLevel');
  const imageSourceSelect = document.getElementById('pdfImageSource');

  const params = {
    nodeId: nodeId,
    folder: folder,
    aiService: aiSelection.service,
    aiModel: aiSelection.model,
    template: templateSelect ? templateSelect.value : 'default',
    tone: toneSelect ? toneSelect.value : 'professional',
    detailLevel: detailLevelSelect ? detailLevelSelect.value : 'standard',
    imageSource: imageSourceSelect ? imageSourceSelect.value : 'none'
  };

  console.log('[PDFOptions] 생성 시작:', params);

  // 옵션 모달 닫기
  closePDFOptionsModal();

  // PDF 생성 (진행상황 모달과 함께)
  window.generatePDFWithModal(params, {
    onComplete: (data) => {
      console.log('[PDFOptions] 생성 완료:', data);
      // 다운로드 URL이 있으면 자동 다운로드
      if (data.downloadUrl) {
        window.location.href = data.downloadUrl;
      }
    },
    onError: (error) => {
      console.error('[PDFOptions] 생성 실패:', error);
    }
  });
}

// 전역으로 함수 노출
window.openPDFOptionsModal = openPDFOptionsModal;
window.closePDFOptionsModal = closePDFOptionsModal;
window.startPDFGeneration = startPDFGeneration;

console.log('[PDFOptions] 모듈 로드 완료');
