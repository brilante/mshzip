// public/js/features/ppt-generator.js
// PPT 생성 클라이언트 - SSE 연결 및 재연결 로직
// P6 구현 - 2025-12-23

/**
 * PPT 생성 클라이언트 클래스
 * SSE 연결, 하트비트 처리, 자동 재연결 기능 제공
 */
class PPTGeneratorClient {
  constructor(options = {}) {
    // 설정
    this.config = {
      maxReconnectAttempts: options.maxReconnectAttempts || 3,
      reconnectDelay: options.reconnectDelay || 3000,
      heartbeatTimeout: options.heartbeatTimeout || 30000, // 30초 (서버 15초 간격의 2배)
      connectionTimeout: options.connectionTimeout || 300000, // 5분
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
   * @param {string} event - 이벤트 유형 (progress, complete, error, heartbeat, reconnect)
   * @param {Function} callback - 콜백 함수
   */
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(`on${event.charAt(0).toUpperCase() + event.slice(1)}`)) {
      this.callbacks[`on${event.charAt(0).toUpperCase() + event.slice(1)}`] = callback;
    }
    return this;
  }

  /**
   * PPT 생성 시작
   * @param {Object} params - 생성 파라미터
   * @returns {Promise<void>}
   */
  async generate(params) {
    if (this.isConnecting) {
      console.warn('[PPTGenerator] 이미 생성 진행 중');
      return;
    }

    this.isConnecting = true;
    this.isCompleted = false;
    this.reconnectAttempts = 0;
    this.lastProgress = null;
    this.sessionId = this.generateSessionId();

    console.log(`[PPTGenerator] 생성 시작 (세션: ${this.sessionId})`);

    try {
      await this.connect(params);
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * SSE 연결 수립
   * @param {Object} params - 생성 파라미터
   */
  async connect(params) {
    // 기존 연결 정리
    this.cleanup();

    // 재연결을 위해 파라미터 저장
    this.currentParams = params;

    // URL 구성
    const queryParams = new URLSearchParams({
      ...params,
      sessionId: this.sessionId,
      reconnect: this.reconnectAttempts > 0 ? 'true' : 'false',
      lastProgress: this.lastProgress ? JSON.stringify(this.lastProgress) : ''
    });

    const url = `/api/generate-ppt-stream?${queryParams.toString()}`;

    console.log(`[PPTGenerator] SSE 연결 시도 (시도 ${this.reconnectAttempts + 1}/${this.config.maxReconnectAttempts + 1})`);

    // EventSource 생성
    this.eventSource = new EventSource(url);

    // 연결 타임아웃 설정
    this.startConnectionTimeout();

    // 이벤트 핸들러 등록
    this.setupEventHandlers();
  }

  /**
   * EventSource 이벤트 핸들러 설정
   */
  setupEventHandlers() {
    if (!this.eventSource) return;

    // 연결 성공
    this.eventSource.onopen = () => {
      console.log('[PPTGenerator] SSE 연결 성공');
      this.reconnectAttempts = 0;
      this.startHeartbeatMonitor();
    };

    // 메시지 수신
    this.eventSource.onmessage = (event) => {
      this.handleMessage(event);
    };

    // 진행 상태 이벤트
    this.eventSource.addEventListener('progress', (event) => {
      this.handleProgress(event);
    });

    // 완료 이벤트
    this.eventSource.addEventListener('complete', (event) => {
      this.handleComplete(event);
    });

    // 에러 이벤트
    this.eventSource.addEventListener('error', (event) => {
      this.handleSSEError(event);
    });

    // 하트비트 이벤트
    this.eventSource.addEventListener('heartbeat', (event) => {
      this.handleHeartbeat(event);
    });

    // 연결 에러
    this.eventSource.onerror = (error) => {
      this.handleConnectionError(error);
    };
  }

  /**
   * 일반 메시지 처리
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('[PPTGenerator] 메시지:', data);

      // heartbeat 메시지인 경우
      if (data.type === 'heartbeat') {
        this.updateHeartbeat();
      }
    } catch (e) {
      // JSON 파싱 실패시 무시
    }
  }

  /**
   * 진행 상태 처리
   */
  handleProgress(event) {
    this.clearConnectionTimeout();
    this.updateHeartbeat();  // 진행 이벤트도 하트비트로 간주

    try {
      const data = JSON.parse(event.data);
      this.lastProgress = data;

      // phase가 객체인 경우 처리
      const phaseName = data.phaseName || (typeof data.phase === 'object' ? data.phase?.name : data.phase) || data.detail || t('pptInProgress', '진행 중');
      const progress = data.progress || data.percent || 0;
      console.log(`[PPTGenerator] 진행: ${phaseName} - ${progress}%`);

      if (this.callbacks.onProgress) {
        this.callbacks.onProgress(data);
      }
    } catch (e) {
      console.error('[PPTGenerator] 진행 상태 파싱 실패:', e);
    }
  }

  /**
   * 완료 처리
   */
  handleComplete(event) {
    this.isCompleted = true;
    this.isConnecting = false;
    this.cleanup();

    try {
      const data = JSON.parse(event.data);
      console.log('[PPTGenerator] 생성 완료:', data);

      if (this.callbacks.onComplete) {
        this.callbacks.onComplete(data);
      }
    } catch (e) {
      console.error('[PPTGenerator] 완료 데이터 파싱 실패:', e);
      if (this.callbacks.onComplete) {
        this.callbacks.onComplete({ success: true });
      }
    }
  }

  /**
   * SSE 에러 이벤트 처리
   */
  handleSSEError(event) {
    try {
      const data = JSON.parse(event.data);
      console.error('[PPTGenerator] 서버 에러:', data);
      this.handleError(new Error(data.message || '서버 에러'));
    } catch (e) {
      console.error('[PPTGenerator] 에러 데이터 파싱 실패');
    }
  }

  /**
   * 하트비트 처리
   */
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

  /**
   * 하트비트 타임스탬프 업데이트
   */
  updateHeartbeat() {
    this.lastHeartbeat = Date.now();
  }

  /**
   * 하트비트 모니터 시작
   */
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
        console.warn(`[PPTGenerator] 하트비트 타임아웃 (${elapsed}ms)`);
        this.attemptReconnect();
      }
    }, 5000); // 5초마다 체크
  }

  /**
   * 하트비트 모니터 중지
   */
  stopHeartbeatMonitor() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 연결 타임아웃 시작
   */
  startConnectionTimeout() {
    this.clearConnectionTimeout();

    this.connectionTimer = setTimeout(() => {
      console.error('[PPTGenerator] 연결 타임아웃');
      this.handleError(new Error('연결 타임아웃'));
    }, this.config.connectionTimeout);
  }

  /**
   * 연결 타임아웃 해제
   */
  clearConnectionTimeout() {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
  }

  /**
   * 연결 에러 처리
   */
  handleConnectionError(error) {
    console.error('[PPTGenerator] 연결 에러:', error);

    // 이미 완료되었으면 무시
    if (this.isCompleted) {
      return;
    }

    // 재연결 시도
    this.attemptReconnect();
  }

  /**
   * 재연결 시도
   */
  attemptReconnect() {
    // 이미 완료되었거나 재연결 중이면 무시
    if (this.isCompleted || !this.isConnecting) {
      return;
    }

    // 기존 연결 정리
    this.cleanup();

    // 재연결 횟수 체크
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error(`[PPTGenerator] 최대 재연결 횟수 초과 (${this.config.maxReconnectAttempts}회)`);
      this.handleError(new Error('연결 실패: 최대 재연결 횟수 초과'));
      return;
    }

    this.reconnectAttempts++;
    console.log(`[PPTGenerator] ${this.config.reconnectDelay}ms 후 재연결 시도 (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    if (this.callbacks.onReconnect) {
      this.callbacks.onReconnect({
        attempt: this.reconnectAttempts,
        maxAttempts: this.config.maxReconnectAttempts,
        lastProgress: this.lastProgress
      });
    }

    // 지연 후 재연결
    setTimeout(() => {
      if (!this.isCompleted && this.isConnecting) {
        this.connect(this.currentParams);
      }
    }, this.config.reconnectDelay);
  }

  /**
   * 에러 처리
   */
  handleError(error) {
    this.isConnecting = false;
    this.cleanup();

    console.error('[PPTGenerator] 에러:', error.message);

    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }

  /**
   * 연결 취소
   */
  cancel() {
    console.log('[PPTGenerator] 생성 취소');
    this.isConnecting = false;
    this.isCompleted = true;
    this.cleanup();
  }

  /**
   * 리소스 정리
   */
  cleanup() {
    this.stopHeartbeatMonitor();
    this.clearConnectionTimeout();

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * 세션 ID 생성
   */
  generateSessionId() {
    return `ppt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 현재 상태 조회
   */
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

// 전역 인스턴스 (선택적 사용)
window.PPTGeneratorClient = PPTGeneratorClient;

// ==========================================
// PPT 진행상황 모달 UI 관리 (PPT2 기획)
// ==========================================

/**
 * PPT 진행상황 모달 열기
 */
function openPPTProgressModal() {
  const modal = document.getElementById('pptProgressModal');
  const overlay = document.getElementById('pptProgressOverlay');

  if (modal && overlay) {
    // 상태 초기화
    resetPPTProgressUI();

    // 모달 표시
    modal.style.display = 'block';
    overlay.style.display = 'block';

    // 취소/닫기 버튼 설정
    const cancelBtn = document.getElementById('pptCancelBtn');
    const closeBtn = document.getElementById('pptCloseProgressBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    if (closeBtn) closeBtn.style.display = 'none';

    console.log('[PPTProgress] 모달 열림');
  }
}

/**
 * PPT 진행상황 모달 닫기
 */
function closePPTProgressModal() {
  const modal = document.getElementById('pptProgressModal');
  const overlay = document.getElementById('pptProgressOverlay');

  if (modal) modal.style.display = 'none';
  if (overlay) overlay.style.display = 'none';

  console.log('[PPTProgress] 모달 닫힘');
}

/**
 * 진행상황 UI 초기화
 */
function resetPPTProgressUI() {
  // 제목 초기화
  const icon = document.getElementById('pptProgressIcon');
  const title = document.getElementById('pptProgressTitle');
  if (icon) icon.innerHTML = mmIcon('rocket', 14);
  if (title) title.textContent = t('pptGenerating', 'PPT 생성 중...');

  // 진행 영역 표시, 완료/에러 영역 숨김
  const content = document.getElementById('pptProgressContent');
  const complete = document.getElementById('pptProgressComplete');
  const error = document.getElementById('pptProgressError');
  if (content) content.style.display = 'block';
  if (complete) complete.style.display = 'none';
  if (error) error.style.display = 'none';

  // 모든 단계를 대기 상태로
  const phases = document.querySelectorAll('#pptProgressPhases .progress-phase');
  phases.forEach(phase => {
    phase.className = 'progress-phase pending';
    const iconEl = phase.querySelector('.phase-icon');
    const detailEl = phase.querySelector('.phase-detail');
    if (iconEl) iconEl.innerHTML = mmIcon('loader', 14);
    if (detailEl) detailEl.textContent = '';
  });

  // 진행 바 초기화
  const progressBar = document.getElementById('pptProgressBar');
  const percentEl = document.getElementById('pptProgressPercent');
  const timeEl = document.getElementById('pptProgressTime');
  if (progressBar) progressBar.style.width = '0%';
  if (percentEl) percentEl.textContent = '0%';
  if (timeEl) timeEl.textContent = '';

  // AI 모델 정보 표시 영역 초기화
  const aiDetailEl = document.getElementById('pptAIModelDetail');
  if (aiDetailEl) {
    aiDetailEl.textContent = '';
    aiDetailEl.style.color = '';
    aiDetailEl.style.fontWeight = '';
  }
}

/**
 * 진행상황 업데이트
 * @param {Object} data - 서버에서 받은 진행 데이터
 */
function updatePPTProgressUI(data) {
  console.log('[PPTProgress] 업데이트:', data);

  // Phase 정보 추출 (다양한 형식 지원)
  let phaseNum = 0;
  let phaseName = t('pptInProgress', '진행 중');
  let phaseStatus = 'in_progress';
  let detail = '';
  let progress = 0;

  // AI 모델 정보 추출 및 표시
  if (data.aiInfo) {
    const aiDetailEl = document.getElementById('pptAIModelDetail');
    if (aiDetailEl) {
      aiDetailEl.textContent = `(${data.aiInfo.display || data.aiInfo.service + '/' + data.aiInfo.model})`;
      aiDetailEl.style.color = '#2196F3';
      aiDetailEl.style.fontWeight = 'bold';
    }
    console.log('[PPTProgress] AI 모델:', data.aiInfo.display);
  }

  // data 형식에 따라 파싱
  if (data.phases && Array.isArray(data.phases)) {
    // PPT2 기획 형식: { phases: [...], progress: N }
    data.phases.forEach((phase, idx) => {
      updatePhaseElement(idx, phase.status, phase.detail?.message || phase.detail || '');
    });
    progress = data.progress || 0;
  } else if (data.phase !== undefined) {
    // 단일 phase 형식: { phase: N, phaseName: "...", status: "..." }
    phaseNum = typeof data.phase === 'object' ? data.phase.id : data.phase;
    phaseName = data.phaseName || data.phase?.name || getDefaultPhaseName(phaseNum);
    phaseStatus = data.status || 'in_progress';
    detail = data.detail?.message || data.detail || data.message || '';
    progress = data.progress || data.percent || calculateProgressFromPhase(phaseNum, phaseStatus);

    // 이전 단계들을 완료로
    for (let i = 0; i < phaseNum; i++) {
      updatePhaseElement(i, 'completed', '');
    }
    // 현재 단계 업데이트
    updatePhaseElement(phaseNum, phaseStatus, detail);
    // 이후 단계들은 대기로
    for (let i = phaseNum + 1; i < 6; i++) {
      updatePhaseElement(i, 'pending', '');
    }
  }

  // 진행 바 업데이트
  const progressBar = document.getElementById('pptProgressBar');
  const percentEl = document.getElementById('pptProgressPercent');
  if (progressBar) progressBar.style.width = `${Math.min(progress, 100)}%`;
  if (percentEl) percentEl.textContent = `${Math.round(progress)}%`;

  // 예상 시간 업데이트
  if (data.estimatedRemaining) {
    const timeEl = document.getElementById('pptProgressTime');
    if (timeEl) timeEl.textContent = `· 예상 남은 시간: 약 ${data.estimatedRemaining}초`;
  }
}

/**
 * 개별 단계 요소 업데이트
 */
function updatePhaseElement(phaseNum, status, detail) {
  const phaseEl = document.querySelector(`#pptProgressPhases .progress-phase[data-phase="${phaseNum}"]`);
  if (!phaseEl) return;

  // 클래스 업데이트
  phaseEl.className = `progress-phase ${status}`;

  // 아이콘 업데이트
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

  // 상세 정보 업데이트
  const detailEl = phaseEl.querySelector('.phase-detail');
  if (detailEl && detail) {
    detailEl.textContent = `(${detail})`;
  }
}

/**
 * 기본 단계 이름 반환
 */
function getDefaultPhaseName(phaseNum) {
  const names = [
    mmIcon('folder-open', 14) + ' ' + t('pptPhaseDataCollect', '데이터 수집'),
    mmIcon('robot', 14) + ' ' + t('pptPhaseSlideDesign', 'AI 슬라이드 설계'),
    mmIcon('sparkles', 14) + ' ' + t('pptPhaseContentImprove', 'AI 콘텐츠 개선'),
    mmIcon('image', 14) + ' ' + t('pptPhaseImageGen', '이미지 생성'),
    mmIcon('palette', 14) + ' ' + t('pptPhaseTemplate', '템플릿 적용'),
    mmIcon('file', 14) + ' ' + t('pptPhaseFileGen', 'PPTX 파일 생성')
  ];
  return names[phaseNum] || `Phase ${phaseNum}`;
}

/**
 * Phase 번호로부터 진행률 계산
 */
function calculateProgressFromPhase(phaseNum, status) {
  const phaseWeight = 100 / 6;  // 각 단계 약 16.67%
  let progress = phaseNum * phaseWeight;
  if (status === 'completed') {
    progress += phaseWeight;
  } else if (status === 'in_progress') {
    progress += phaseWeight / 2;
  }
  return Math.min(progress, 100);
}

/**
 * 완료 UI 표시
 * @param {Object} data - 완료 데이터
 * @param {boolean} autoClose - 자동 닫기 여부 (기본: false)
 * @param {number} autoCloseDelay - 자동 닫기 지연 시간 ms (기본: 1500)
 */
function showPPTProgressComplete(data, autoClose = false, autoCloseDelay = 1500) {
  // 진행 영역 그대로 유지 (각 단계 상태 확인 가능)
  // pptProgressContent는 숨기지 않음

  // 모든 단계를 완료 상태로 표시
  for (let i = 0; i < 6; i++) {
    updatePhaseElement(i, 'completed', '');
  }

  // 진행 바 100% 완료
  const progressBar = document.getElementById('pptProgressBar');
  const percentEl = document.getElementById('pptProgressPercent');
  if (progressBar) progressBar.style.width = '100%';
  if (percentEl) percentEl.textContent = '100%';

  // 완료 정보 표시 (시간 영역에)
  const timeEl = document.getElementById('pptProgressTime');
  if (timeEl) {
    const slideCount = data.slideCount ? `슬라이드: ${data.slideCount}개` : '';
    const elapsed = data.elapsed ? ` · 소요 시간: ${data.elapsed}초` : '';
    timeEl.textContent = slideCount + elapsed;
    timeEl.style.color = '#22c55e';
    timeEl.style.fontWeight = 'bold';
  }

  // 제목 변경
  const icon = document.getElementById('pptProgressIcon');
  const title = document.getElementById('pptProgressTitle');
  if (icon) icon.innerHTML = mmIcon('check-circle', 14);
  if (title) title.textContent = t('pptComplete', 'PPT 생성 완료!');

  // 버튼 전환 (취소 → 완료)
  const cancelBtn = document.getElementById('pptCancelBtn');
  const closeBtn = document.getElementById('pptCloseProgressBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (closeBtn) closeBtn.style.display = 'inline-block';

  console.log('[PPTProgress] 완료 표시 (진행 단계 유지)');

  // 자동 닫기 (기본값 false - 사용자가 완료 버튼 클릭 필요)
  if (autoClose) {
    setTimeout(() => {
      closePPTProgressModal();
      console.log('[PPTProgress] 자동 닫기 완료');
    }, autoCloseDelay);
  }
}

/**
 * 에러 UI 표시
 */
function showPPTProgressError(message) {
  // 진행 영역 숨기고 에러 영역 표시
  const content = document.getElementById('pptProgressContent');
  const error = document.getElementById('pptProgressError');
  if (content) content.style.display = 'none';
  if (error) error.style.display = 'block';

  // 에러 메시지 표시
  const msgEl = document.getElementById('pptProgressErrorMsg');
  if (msgEl) msgEl.textContent = message || t('pptUnknownError', '알 수 없는 오류가 발생했습니다.');

  // 제목 변경
  const icon = document.getElementById('pptProgressIcon');
  const title = document.getElementById('pptProgressTitle');
  if (icon) icon.innerHTML = mmIcon('x-circle', 14);
  if (title) title.textContent = t('pptFailed', '생성 실패');

  // 버튼 전환 (취소 → 닫기)
  const cancelBtn = document.getElementById('pptCancelBtn');
  const closeBtn = document.getElementById('pptCloseProgressBtn');
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (closeBtn) closeBtn.style.display = 'inline-block';

  console.log('[PPTProgress] 에러 표시:', message);
}

/**
 * 재연결 상태 표시
 */
function showPPTReconnectStatus(attempt, maxAttempts) {
  // 재연결 상태 요소가 없으면 생성
  let reconnectEl = document.getElementById('pptReconnectStatus');
  if (!reconnectEl) {
    reconnectEl = document.createElement('div');
    reconnectEl.id = 'pptReconnectStatus';
    reconnectEl.className = 'reconnect-status';
    reconnectEl.innerHTML = '<div class="spinner"></div><span></span>';
    const content = document.getElementById('pptProgressContent');
    if (content) content.appendChild(reconnectEl);
  }

  reconnectEl.style.display = 'flex';
  reconnectEl.querySelector('span').textContent = t('pptReconnecting', '재연결 중...') + ` (${attempt}/${maxAttempts})`;
}

/**
 * 재연결 상태 숨기기
 */
function hidePPTReconnectStatus() {
  const reconnectEl = document.getElementById('pptReconnectStatus');
  if (reconnectEl) reconnectEl.style.display = 'none';
}

// 전역으로 함수 노출
window.openPPTProgressModal = openPPTProgressModal;
window.closePPTProgressModal = closePPTProgressModal;
window.resetPPTProgressUI = resetPPTProgressUI;
window.updatePPTProgressUI = updatePPTProgressUI;
window.showPPTProgressComplete = showPPTProgressComplete;
window.showPPTProgressError = showPPTProgressError;
window.showPPTReconnectStatus = showPPTReconnectStatus;
window.hidePPTReconnectStatus = hidePPTReconnectStatus;

// 간편 사용 함수
window.generatePPTWithProgress = function(params, callbacks = {}) {
  const client = new PPTGeneratorClient();

  if (callbacks.onProgress) client.on('progress', callbacks.onProgress);
  if (callbacks.onComplete) client.on('complete', callbacks.onComplete);
  if (callbacks.onError) client.on('error', callbacks.onError);
  if (callbacks.onHeartbeat) client.on('heartbeat', callbacks.onHeartbeat);
  if (callbacks.onReconnect) client.on('reconnect', callbacks.onReconnect);

  client.generate(params);
  return client;
};

/**
 * 진행상황 모달과 함께 PPT 생성 (완전 통합 버전)
 * @param {Object} params - 생성 파라미터
 * @param {Object} callbacks - 추가 콜백 (onComplete, onError, onProgress)
 * @returns {PPTGeneratorClient}
 */
window.generatePPTWithModal = function(params, callbacks = {}) {
  // 모달 열기
  openPPTProgressModal();

  const client = new PPTGeneratorClient();
  const startTime = Date.now();

  client.on('progress', (data) => {
    updatePPTProgressUI(data);
    hidePPTReconnectStatus();
    // 추가 콜백 호출
    if (callbacks.onProgress) callbacks.onProgress(data);
  });

  client.on('complete', (data) => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const completeData = { ...data, elapsed };

    // 완료 UI 표시 (자동 닫기 비활성화 - 사용자가 직접 닫기 버튼 클릭)
    showPPTProgressComplete(completeData, false);

    // 추가 콜백 호출 (문서 상태 업데이트 등)
    if (callbacks.onComplete) {
      // 자동 닫기 전에 콜백 실행
      callbacks.onComplete(completeData);
    }
  });

  client.on('error', (error) => {
    showPPTProgressError(error.message || error);
    // 추가 콜백 호출
    if (callbacks.onError) callbacks.onError(error);
  });

  client.on('reconnect', (data) => {
    showPPTReconnectStatus(data.attempt, data.maxAttempts);
    if (callbacks.onReconnect) callbacks.onReconnect(data);
  });

  client.generate(params);

  // 취소 버튼 이벤트
  const cancelBtn = document.getElementById('pptCancelBtn');
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      client.cancel();
      closePPTProgressModal();
    };
  }

  // 닫기 버튼 이벤트
  const closeBtn = document.getElementById('pptCloseProgressBtn');
  if (closeBtn) {
    closeBtn.onclick = () => {
      closePPTProgressModal();
    };
  }

  return client;
};

console.log('[PPTGenerator] 클라이언트 및 진행상황 UI 로드 완료');

// ==========================================
// PPT AI 모델 선택 로직
// ==========================================

/**
 * PPT 생성에 사용할 AI 모델 목록
 * API에서 동적으로 로드 (DB 설정 기반 필터링)
 */
let PPT_AI_MODELS = {};

// 활성화된 서비스 목록 (DB 설정 기반)
let PPT_ENABLED_SERVICES = ['gpt', 'grok', 'claude', 'gemini'];

/**
 * 서버에서 활성화된 AI 모델 목록 로드
 */
async function loadPPTModelsFromServer() {
  try {
    // ApiCache 사용 (중복 호출 방지)
    const response = window.ApiCache
      ? await window.ApiCache.fetch('/api/credits/models')
      : await fetch('/api/credits/models');
    const data = await response.json();

    if (data.success && data.data && data.data.models) {
      // 모델을 서비스별로 그룹화
      PPT_AI_MODELS = {};
      const modelsData = data.data.models;

      if (Array.isArray(modelsData)) {
        // 배열 형식: 모델을 서비스별로 그룹화
        for (const model of modelsData) {
          const service = model.ai_service;
          if (!PPT_AI_MODELS[service]) {
            PPT_AI_MODELS[service] = [];
          }
          PPT_AI_MODELS[service].push({
            value: model.model_name,
            label: model.display_name || model.model_name
          });
        }
      } else if (typeof modelsData === 'object') {
        // 객체 형식 (서비스별 그룹화된 형태)
        for (const service of Object.keys(modelsData)) {
          if (!PPT_AI_MODELS[service]) {
            PPT_AI_MODELS[service] = [];
          }
          const serviceModels = modelsData[service];
          if (Array.isArray(serviceModels)) {
            for (const model of serviceModels) {
              PPT_AI_MODELS[service].push({
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
        PPT_ENABLED_SERVICES = data.data.enabledServices;
      }

      console.log('[PPTAIModel] 모델 로드 완료:', Object.keys(PPT_AI_MODELS));
      return true;
    }
  } catch (error) {
    console.error('[PPTAIModel] 모델 로드 실패:', error);
  }
  return false;
}

/**
 * PPT 서비스 선택 드롭다운 필터링
 */
function filterPPTServiceSelect() {
  const serviceSelect = document.getElementById('pptAIService');
  if (!serviceSelect) return;

  const options = serviceSelect.querySelectorAll('option');
  let firstEnabledService = null;

  options.forEach(option => {
    const isEnabled = PPT_ENABLED_SERVICES.includes(option.value);
    option.style.display = isEnabled ? '' : 'none';
    option.disabled = !isEnabled;
    if (isEnabled && !firstEnabledService) {
      firstEnabledService = option.value;
    }
  });

  // 현재 선택된 서비스가 비활성화되었으면 첫번째 활성화된 서비스로 변경
  if (!PPT_ENABLED_SERVICES.includes(serviceSelect.value) && firstEnabledService) {
    serviceSelect.value = firstEnabledService;
    updatePPTModelOptions(firstEnabledService);
  }
}

// 기본 모델 설정 (실제 서비스 모델만)
const PPT_DEFAULT_MODELS = {
  gpt: 'gpt-4o-mini',
  grok: 'grok-2',
  claude: 'claude-3-5-sonnet-20241022',
  gemini: 'gemini-1.5-flash'
};

// localStorage 키
const PPT_AI_STORAGE_KEY = 'mymind3_ppt_ai_selection';

/**
 * PPT AI 모델 선택기 초기화
 */
async function initPPTAIModelSelector() {
  const serviceSelect = document.getElementById('pptAIService');
  const modelSelect = document.getElementById('pptAIModel');

  if (!serviceSelect || !modelSelect) {
    console.warn('[PPTAIModel] 선택기 요소를 찾을 수 없습니다');
    return;
  }

  // API에서 활성화된 모델 목록 로드
  await loadPPTModelsFromServer();

  // 서비스 드롭다운 필터링 (비활성화된 서비스 숨김)
  filterPPTServiceSelect();

  // localStorage에서 저장된 선택 불러오기
  const savedSelection = loadPPTAISelection();

  // 서비스 선택 초기화 (활성화된 서비스만)
  if (savedSelection.service && PPT_AI_MODELS[savedSelection.service] && PPT_ENABLED_SERVICES.includes(savedSelection.service)) {
    serviceSelect.value = savedSelection.service;
  } else if (PPT_ENABLED_SERVICES.length > 0) {
    // 저장된 서비스가 비활성화되었으면 첫번째 활성화된 서비스 선택
    serviceSelect.value = PPT_ENABLED_SERVICES[0];
  }

  // 모델 목록 업데이트
  updatePPTModelOptions(serviceSelect.value, savedSelection.model);

  // 서비스 변경 이벤트
  serviceSelect.addEventListener('change', function() {
    const service = this.value;
    const defaultModel = PPT_DEFAULT_MODELS[service];
    updatePPTModelOptions(service, defaultModel);
    savePPTAISelection();
    console.log(`[PPTAIModel] 서비스 변경: ${service}`);
  });

  // 모델 변경 이벤트
  modelSelect.addEventListener('change', function() {
    savePPTAISelection();
    console.log(`[PPTAIModel] 모델 변경: ${this.value}`);
  });

  console.log('[PPTAIModel] 선택기 초기화 완료');
}

/**
 * 모델 옵션 업데이트
 * @param {string} service - AI 서비스
 * @param {string} selectedModel - 선택할 모델 (없으면 첫번째)
 */
function updatePPTModelOptions(service, selectedModel) {
  const modelSelect = document.getElementById('pptAIModel');
  if (!modelSelect) return;

  const models = PPT_AI_MODELS[service] || [];

  // 기존 옵션 제거
  modelSelect.innerHTML = '';

  // 새 옵션 추가
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model.value;
    option.textContent = model.label;
    modelSelect.appendChild(option);
  });

  // 저장된 모델이 있고 현재 서비스에 존재하면 선택
  if (selectedModel && models.some(m => m.value === selectedModel)) {
    modelSelect.value = selectedModel;
  } else if (models.length > 0) {
    // 기본 모델 선택
    const defaultModel = PPT_DEFAULT_MODELS[service];
    if (defaultModel && models.some(m => m.value === defaultModel)) {
      modelSelect.value = defaultModel;
    }
  }
}

/**
 * 선택 정보 localStorage에 저장
 */
function savePPTAISelection() {
  const serviceSelect = document.getElementById('pptAIService');
  const modelSelect = document.getElementById('pptAIModel');

  if (!serviceSelect || !modelSelect) return;

  const selection = {
    service: serviceSelect.value,
    model: modelSelect.value
  };

  try {
    localStorage.setItem(PPT_AI_STORAGE_KEY, JSON.stringify(selection));
    console.log('[PPTAIModel] 선택 저장:', selection);
  } catch (e) {
    console.error('[PPTAIModel] 저장 실패:', e);
  }
}

/**
 * localStorage에서 선택 정보 불러오기
 * @returns {Object} 저장된 선택 (service, model)
 */
function loadPPTAISelection() {
  try {
    const saved = localStorage.getItem(PPT_AI_STORAGE_KEY);
    if (saved) {
      const selection = JSON.parse(saved);
      console.log('[PPTAIModel] 저장된 선택 불러오기:', selection);
      return selection;
    }
  } catch (e) {
    console.error('[PPTAIModel] 불러오기 실패:', e);
  }

  // 기본값
  return {
    service: 'gpt',
    model: 'gpt-4o-mini'
  };
}

/**
 * 현재 선택된 AI 서비스 및 모델 가져오기
 * @returns {Object} { service, model }
 */
function getPPTAISelection() {
  const serviceSelect = document.getElementById('pptAIService');
  const modelSelect = document.getElementById('pptAIModel');

  if (serviceSelect && modelSelect) {
    return {
      service: serviceSelect.value,
      model: modelSelect.value
    };
  }

  // 요소가 없으면 저장된 값 반환
  return loadPPTAISelection();
}

// 전역으로 함수 노출
window.initPPTAIModelSelector = initPPTAIModelSelector;
window.getPPTAISelection = getPPTAISelection;
window.PPT_AI_MODELS = PPT_AI_MODELS;

// DOM 로드 시 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPPTAIModelSelector);
} else {
  // 이미 로드됨 - 약간의 지연 후 초기화 (다른 스크립트 로드 대기)
  setTimeout(initPPTAIModelSelector, 100);
}

console.log('[PPTAIModel] 모듈 로드 완료');
