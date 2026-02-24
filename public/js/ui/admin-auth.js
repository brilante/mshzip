/**
 * 관리자 인증 함수 모듈
 * index.html에서 분리됨 - settings.js 로드 전에도 동작해야 함
 *
 * 인증 방식:
 * 1. 관리자 비밀번호 (UI 입력)
 * 2. 비밀키 (로컬 에이전트에서 G:\.localkey 파일 읽기 → 암호화 전송)
 *
 * 로컬 에이전트: http://127.0.0.1:19999
 * - 관리자 PC에서 node admin-agent/agent.js 실행 필요
 */

// 로컬 에이전트 설정
const ADMIN_AGENT_URL = 'http://127.0.0.1:19999';

// 암호화 키 (서버와 동일해야 함 - 32자리)
const ADMIN_CRYPTO_KEY = 'MyMind3AdminSecretKey2024!@#$%^';

// 비밀키 필요 여부 캐시
window._adminRequiresSecretKey = false;

/**
 * 로컬 에이전트에서 비밀키 조회
 * @returns {Promise<string|null>} 비밀키 또는 null
 */
async function getLocalSecretKey() {
  try {
    const response = await fetch(`${ADMIN_AGENT_URL}/key`, {
      method: 'GET',
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.key) {
      console.log('[Admin] 로컬 에이전트에서 비밀키 조회 성공');
      return data.key;
    } else {
      console.error('[Admin] 비밀키 조회 실패:', data.error);
      return null;
    }
  } catch (err) {
    console.error('[Admin] 로컬 에이전트 연결 실패:', err.message);
    return null;
  }
}

/**
 * 비밀키 암호화 (AES-256-GCM)
 * Web Crypto API 사용
 * @param {string} key - 평문 비밀키
 * @returns {Promise<object>} 암호화된 데이터 { iv, data }
 */
async function encryptSecretKey(key) {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);

    // 암호화 키 생성 (32자리 문자열을 SHA-256으로 해싱)
    const keyBuffer = await crypto.subtle.digest(
      'SHA-256',
      encoder.encode(ADMIN_CRYPTO_KEY)
    );

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    // IV 생성 (12바이트)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // 암호화
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      cryptoKey,
      keyData
    );

    console.log('[Admin] 비밀키 암호화 완료');

    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    };
  } catch (err) {
    console.error('[Admin] 암호화 실패:', err);
    throw err;
  }
}

/**
 * 로컬 에이전트 상태 확인
 * @returns {Promise<boolean>} 연결 가능 여부
 */
async function checkAgentStatus() {
  try {
    const response = await fetch(`${ADMIN_AGENT_URL}/status`, {
      method: 'GET',
      mode: 'cors'
    });
    const data = await response.json();
    return data.success && data.status === 'running';
  } catch {
    return false;
  }
}

/**
 * 로컬 에이전트가 완전히 로딩될 때까지 대기
 * @param {number} maxRetries - 최대 재시도 횟수 (기본 10회)
 * @param {number} retryInterval - 재시도 간격 ms (기본 500ms)
 * @returns {Promise<boolean>} 에이전트 로딩 완료 여부
 */
async function waitForAgentReady(maxRetries = 10, retryInterval = 500) {
  console.log('[Admin] 로컬 에이전트 로딩 대기 중...');

  for (let i = 0; i < maxRetries; i++) {
    const isRunning = await checkAgentStatus();
    if (isRunning) {
      // 추가 안정화 대기 (에이전트 내부 초기화 완료 보장)
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log(`[Admin] 로컬 에이전트 준비 완료 (${i + 1}번째 시도)`);
      return true;
    }

    console.log(`[Admin] 에이전트 대기 중... (${i + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, retryInterval));
  }

  console.error('[Admin] 로컬 에이전트 로딩 시간 초과');
  return false;
}


/**
 * 서버를 통해 로컬 에이전트 자동 시작
 */
async function startAgentViaServer() {
  try {
    console.log('[Admin] 서버를 통해 에이전트 시작 요청...');
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/auth/start-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include'
    });
    const data = await response.json();
    if (data.success) {
      console.log('[Admin] 에이전트 시작 성공:', data.message);
      return { success: true, message: data.message };
    } else {
      console.error('[Admin] 에이전트 시작 실패:', data.message);
      return { success: false, message: data.message };
    }
  } catch (err) {
    console.error('[Admin] 에이전트 시작 API 오류:', err);
    return { success: false, message: 'API 오류' };
  }
}

/**
 * 에이전트 로딩 오버레이 표시
 * @param {string} message - 표시할 메시지
 */
function showAgentLoadingOverlay(message = t('adminAgentLoading', '에이전트 로딩 중...')) {
  let overlay = document.getElementById('agentLoadingOverlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'agentLoadingOverlay';
    overlay.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10001;
      ">
        <div style="
          background: var(--bg-secondary, #1a1a1a);
          border-radius: 12px;
          padding: 32px 48px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        ">
          <div class="agent-spinner" style="
            width: 48px;
            height: 48px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: #4a9eff;
            border-radius: 50%;
            margin: 0 auto 16px;
            animation: agentSpin 1s linear infinite;
          "></div>
          <p id="agentLoadingMessage" style="
            color: var(--text-primary, #ffffff);
            font-size: 16px;
            margin: 0;
          ">${message}</p>
        </div>
      </div>
      <style>
        @keyframes agentSpin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(overlay);
  } else {
    const msgEl = overlay.querySelector('#agentLoadingMessage');
    if (msgEl) msgEl.textContent = message;
    overlay.style.display = 'block';
  }

  console.log('[Admin] 에이전트 로딩 오버레이 표시:', message);
}

/**
 * 에이전트 로딩 오버레이 숨기기
 */
function hideAgentLoadingOverlay() {
  const overlay = document.getElementById('agentLoadingOverlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
  console.log('[Admin] 에이전트 로딩 오버레이 숨김');
}

/**
 * 에이전트 로딩 메시지 업데이트
 * @param {string} message - 새 메시지
 */
function updateAgentLoadingMessage(message) {
  const msgEl = document.querySelector('#agentLoadingOverlay #agentLoadingMessage');
  if (msgEl) {
    msgEl.textContent = message;
  }
}

// 관리자 비밀번호 팝업 표시
window.showAdminPasswordPopup = async function(requiresSecretKey = false) {
  const popup = document.getElementById('adminPasswordPopup');
  const passwordInput = document.getElementById('adminPasswordInput');
  const error = document.getElementById('adminPasswordError');

  // 비밀키 필요 여부 저장
  window._adminRequiresSecretKey = requiresSecretKey;

  // 비밀키가 필요한 경우, 먼저 로컬 에이전트를 시작하고 완전히 로딩될 때까지 대기
  // 중요: 에이전트가 완전히 로딩된 후에만 팝업을 표시함
  if (requiresSecretKey) {
    console.log('[Admin] 비밀키 필요 - 로컬 에이전트 시작 및 로딩 대기...');

    // 1. 먼저 에이전트 로딩 오버레이 표시
    showAgentLoadingOverlay(t('adminCheckingAgent', '에이전트 상태 확인 중...'));

    let agentRunning = await checkAgentStatus();

    if (!agentRunning) {
      console.log('[Admin] 로컬 에이전트가 실행되지 않음 - 자동 시작 시도...');

      // 2. 에이전트 시작 메시지로 업데이트
      updateAgentLoadingMessage(t('adminStartingAgent', '로컬 에이전트 시작 중...'));
      if (typeof showToast === 'function') showToast(t('adminStartingAgent', '로컬 에이전트 시작 중...'), 'info');

      const startResult = await startAgentViaServer();

      if (startResult.success) {
        // 3. 에이전트 로딩 대기 메시지로 업데이트
        updateAgentLoadingMessage(t('adminWaitingAgentReady', '에이전트 로딩 완료 대기 중...'));
        console.log('[Admin] 에이전트 시작 요청 성공, 로딩 완료 대기 중...');

        // 에이전트가 완전히 로딩될 때까지 대기 (최대 5초)
        agentRunning = await waitForAgentReady(10, 500);

        if (agentRunning) {
          updateAgentLoadingMessage(t('adminAgentReady', '에이전트 준비 완료!'));
          if (typeof showToast === 'function') showToast(t('adminAgentReadyToast', '로컬 에이전트가 준비되었습니다.'), 'success');
          // 잠시 성공 메시지 표시 후 오버레이 숨김
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } else {
      console.log('[Admin] 로컬 에이전트가 이미 실행 중');
      updateAgentLoadingMessage(t('adminAgentConnected', '에이전트 연결 확인 완료'));
      // 잠시 대기 후 진행
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // 4. 에이전트 로딩 오버레이 숨기기 (성공/실패 모두)
    hideAgentLoadingOverlay();

    if (!agentRunning) {
      console.error('[Admin] 로컬 에이전트 시작 또는 로딩 실패');

      // 얼럿으로 에러 표시
      alert(t('adminAgentStartFailed', '로컬 에이전트를 시작할 수 없거나 로딩에 실패했습니다.\n\n관리자 PC에서 다음 명령을 실행하세요:\nnode admin-agent/agent.js'));

      // 토스트 메시지로도 에러 표시
      if (typeof showToast === 'function') {
        showToast(t('adminAgentStartFailedShort', '로컬 에이전트 시작 실패'), 'error');
      }

      // 팝업을 표시하지 않고 종료
      return;
    }

    // 5. 에이전트가 완전히 로딩된 후에만 여기에 도달
    console.log('[Admin] 로컬 에이전트 완전히 로딩됨 - 관리자 인증 팝업 표시');
  }

  // 6. 팝업 표시 (에이전트 로딩 완료 후)
  if (popup) {
    popup.style.display = 'flex';

    // 비밀번호 입력 필드 초기화
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.classList.remove('error');
      passwordInput.focus();
    }

    if (error) {
      error.textContent = '';
    }

    // Enter 키 이벤트 리스너 추가 (비밀번호 필드)
    if (passwordInput && !passwordInput._hasEnterListener) {
      passwordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
          verifyAdminPassword();
        }
      });
      passwordInput._hasEnterListener = true;
    }

    // 취소 버튼 클릭 핸들러
    const cancelBtn = document.getElementById('adminPasswordCancelBtn');
    if (cancelBtn) {
      cancelBtn.onclick = function() {
        closeAdminPasswordPopup();
      };
    }

    // 확인 버튼 클릭 핸들러
    const confirmBtn = document.getElementById('adminPasswordConfirmBtn');
    if (confirmBtn) {
      confirmBtn.onclick = function() {
        verifyAdminPassword();
      };
    }

    // 오버레이 클릭 핸들러
    const overlay = popup.querySelector('.admin-password-overlay');
    if (overlay) {
      overlay.onclick = function() {
        closeAdminPasswordPopup();
      };
    }
  }
};

// 관리자 비밀번호 팝업 닫기
window.closeAdminPasswordPopup = function() {
  const popup = document.getElementById('adminPasswordPopup');
  if (popup) {
    popup.style.display = 'none';
  }
};

/**
 * 관리자 비밀번호 + 비밀키 검증
 * 비밀키는 로컬 에이전트에서 조회하여 암호화 후 전송
 */
window.verifyAdminPassword = async function() {
  const passwordInput = document.getElementById('adminPasswordInput');
  const error = document.getElementById('adminPasswordError');
  const confirmBtn = document.getElementById('adminPasswordConfirmBtn');

  // 비밀번호 입력 확인
  if (!passwordInput || !passwordInput.value.trim()) {
    if (error) error.textContent = t('adminEnterPassword', '비밀번호를 입력하세요.');
    if (passwordInput) passwordInput.classList.add('error');
    return;
  }

  // 버튼 비활성화
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = t('adminVerifying', '인증 중...');
  }

  try {
    // 요청 데이터 구성
    const requestBody = {
      password: passwordInput.value
    };

    // 비밀키가 필요한 경우
    if (window._adminRequiresSecretKey) {
      // 1. 로컬 에이전트에서 비밀키 조회
      const secretKey = await getLocalSecretKey();

      if (!secretKey) {
        const agentRunning = await checkAgentStatus();
        if (!agentRunning) {
          throw new Error(t('adminAgentNotRunning', '로컬 에이전트가 실행되지 않았습니다.\n관리자 PC에서 "node admin-agent/agent.js"를 실행하세요.'));
        } else {
          throw new Error(t('adminSecretKeyNotFound', '비밀키 파일을 읽을 수 없습니다.\nG:\\.localkey 파일이 존재하는지 확인하세요.'));
        }
      }

      // 2. 비밀키 암호화
      const encryptedKey = await encryptSecretKey(secretKey);
      requestBody.encryptedSecretKey = encryptedKey;

      console.log('[Admin] 암호화된 비밀키 포함하여 전송');
    }

    // 3. 서버로 전송 (CSRF 토큰 포함)
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/auth/admin-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...csrfHeaders
      },
      credentials: 'include',
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (data.verified) {
      // 인증 성공
      closeAdminPasswordPopup();

      // 설정 팝업 내의 관리자 섹션 표시
      if (typeof showAdminSection === 'function') {
        showAdminSection();
      } else {
        // 직접 관리자 메뉴 표시
        const adminNavItem = document.getElementById('adminNavItem');
        if (adminNavItem) {
          adminNavItem.style.display = '';
        }
        window.isAdminVerified = true;
      }

      console.log('[Admin] 관리자 인증 성공');

      if (typeof showToast === 'function') {
        showToast(t('adminAuthSuccess', '관리자 인증 성공'), 'success');
      }
    } else {
      // 인증 실패
      if (passwordInput) passwordInput.classList.add('error');

      let toastMessage = '';
      if (response.status === 429) {
        toastMessage = t('adminRateLimitExceeded', '로그인 시도 한도를 초과했습니다. 15분 후에 다시 시도해주세요.');
      } else if (data.lockedUntil) {
        const lockTime = new Date(data.lockedUntil).toLocaleTimeString();
        toastMessage = t('adminAccountLocked', '계정이 잠겼습니다. {time} 이후 다시 시도하세요.').replace('{time}', lockTime);
      } else if (data.remainingAttempts !== undefined) {
        toastMessage = t('adminAuthFailedRemaining', '인증 실패! (남은 시도: {count}회)').replace('{count}', data.remainingAttempts);
      } else if (data.message) {
        toastMessage = data.message;
      } else {
        toastMessage = t('adminAuthFailed', '인증에 실패했습니다!');
      }

      if (typeof showToast === 'function') {
        showToast(toastMessage, 'error');
      }

      if (error) {
        error.textContent = toastMessage;
      }
    }
  } catch (err) {
    console.error('[Admin] 관리자 인증 오류:', err);

    const errorMessage = err.message || t('adminServerError', '서버 오류가 발생했습니다.');

    if (error) {
      error.textContent = errorMessage;
    }

    if (typeof showToast === 'function') {
      showToast(errorMessage, 'error');
    }
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = t('adminConfirmBtn', '확인');
    }
  }
};

console.log('[Admin] 관리자 인증 함수 로드 완료');

// 페이지 로드 시 관리자 팝업 버튼 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function() {
  // 취소 버튼
  const cancelBtn = document.getElementById('adminPasswordCancelBtn');
  if (cancelBtn) {
    cancelBtn.onclick = function() {
      closeAdminPasswordPopup();
    };
    console.log('[Admin] 취소 버튼 이벤트 핸들러 등록');
  }

  // 확인 버튼
  const confirmBtn = document.getElementById('adminPasswordConfirmBtn');
  if (confirmBtn) {
    confirmBtn.onclick = function() {
      verifyAdminPassword();
    };
    console.log('[Admin] 확인 버튼 이벤트 핸들러 등록');
  }

  // 오버레이
  const overlay = document.querySelector('#adminPasswordPopup .admin-password-overlay');
  if (overlay) {
    overlay.onclick = function() {
      closeAdminPasswordPopup();
    };
    console.log('[Admin] 오버레이 이벤트 핸들러 등록');
  }
});
