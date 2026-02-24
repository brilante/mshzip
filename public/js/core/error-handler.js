// public/js/core/error-handler.js
// 클라이언트 에러 중앙 관리 및 서버 전송

window.MyMind3 = window.MyMind3 || {};
window.MyMind3.ErrorHandler = (function() {
  'use strict';

  // 설정
  const CONFIG = {
    serverEndpoint: '/api/client-error/log',
    batchEndpoint: '/api/client-error/batch',
    maxQueueSize: 50,          // 최대 대기열 크기
    sendInterval: 30000,        // 30초마다 배치 전송
    retryDelay: 5000,          // 재시도 대기 시간
    maxRetries: 3              // 최대 재시도 횟수
  };

  // 에러 대기열 (오프라인 또는 전송 실패 시 사용)
  let errorQueue = [];
  let isSending = false;

  /**
   * 에러를 서버로 전송
   */
  async function sendToServer(errorData) {
    try {
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch(CONFIG.serverEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify(errorData)
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      return true;
    } catch (e) {
      // 전송 실패 시 큐에 추가
      if (errorQueue.length < CONFIG.maxQueueSize) {
        errorQueue.push(errorData);
      }
      return false;
    }
  }

  /**
   * 대기열의 에러를 일괄 전송
   */
  async function flushQueue() {
    if (isSending || errorQueue.length === 0) return;

    isSending = true;
    const toSend = [...errorQueue];
    errorQueue = [];

    try {
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch(CONFIG.batchEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({ errors: toSend })
      });

      if (!response.ok) {
        // 실패 시 다시 큐에 추가
        errorQueue = [...toSend, ...errorQueue].slice(0, CONFIG.maxQueueSize);
      }
    } catch (e) {
      // 네트워크 오류 시 다시 큐에 추가
      errorQueue = [...toSend, ...errorQueue].slice(0, CONFIG.maxQueueSize);
    } finally {
      isSending = false;
    }
  }

  /**
   * 에러 처리 메인 함수
   */
  function handle(error, context, userMessage, level = 'ERROR') {
    // 콘솔 로깅
    console.error(`[${context}]`, error);

    // 사용자 알림
    if (userMessage) {
      if (typeof window.showToast === 'function') {
        window.showToast('error', userMessage);
      } else if (typeof showAIToast === 'function') {
        showAIToast(userMessage, 'error');
      } else {
        alert(userMessage);
      }
    }

    // 서버 전송
    sendToServer({
      level: level,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      context: context,
      url: window.location.href,
      userAgent: navigator.userAgent,
      extra: {
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * API 에러 처리
   */
  function handleAPIError(error, context) {
    const userMessage = error.message || '서버 요청 중 오류가 발생했습니다.';
    handle(error, `API:${context}`, userMessage, 'ERROR');
  }

  /**
   * 검증 에러 처리
   */
  function handleValidationError(message, context) {
    handle(new Error(message), `Validation:${context}`, message, 'WARNING');
  }

  // 글로벌 에러 핸들러 등록
  window.onerror = function(message, source, lineno, colno, error) {
    sendToServer({
      level: 'ERROR',
      message: message,
      stack: error?.stack || `at ${source}:${lineno}:${colno}`,
      context: 'global.onerror',
      url: window.location.href,
      userAgent: navigator.userAgent,
      extra: {
        source: source,
        line: lineno,
        column: colno
      }
    });
    return false; // 기본 에러 핸들링도 실행
  };

  // Unhandled Promise Rejection 핸들러
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason;
    sendToServer({
      level: 'ERROR',
      message: reason?.message || String(reason),
      stack: reason?.stack || null,
      context: 'global.unhandledrejection',
      url: window.location.href,
      userAgent: navigator.userAgent,
      extra: {
        type: 'unhandledrejection'
      }
    });
  });

  // 주기적으로 대기열 비우기
  setInterval(flushQueue, CONFIG.sendInterval);

  // 페이지 떠나기 전 대기열 비우기
  window.addEventListener('beforeunload', function() {
    if (errorQueue.length > 0 && navigator.sendBeacon) {
      navigator.sendBeacon(CONFIG.batchEndpoint, JSON.stringify({ errors: errorQueue }));
    }
  });

  return {
    handle: handle,
    handleAPIError: handleAPIError,
    handleValidationError: handleValidationError,
    flushQueue: flushQueue,
    getQueueSize: () => errorQueue.length
  };
})();
