/**
 * 로그인 팝업 모듈
 *
 * 로그인/로그아웃 팝업 UI 및 인증 처리 기능을 제공합니다.
 *
 * 의존성:
 * - updateLoginUI: 로그인 상태에 따른 UI 업데이트
 * - showToast: 토스트 메시지 표시
 * - csrfUtils: CSRF 토큰 관리
 * - verifyLocalApiKeys: API 키 검증
 */
(function() {
  'use strict';

  /**
   * 로그인 팝업을 화면에 표시합니다.
   * 입력 필드를 초기화하고 에러 메시지를 제거합니다.
   */
  function showLoginPopup() {
    document.getElementById('loginPopup').style.display = 'block';
    document.getElementById('loginOverlay').style.display = 'block';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginErrorMsg').textContent = '';
  }

  /**
   * 로그인 팝업을 닫습니다.
   */
  function hideLoginPopup() {
    document.getElementById('loginPopup').style.display = 'none';
    document.getElementById('loginOverlay').style.display = 'none';
  }

  /**
   * 로그인 처리를 수행합니다.
   * 입력 검증 후 서버에 로그인 요청을 보내고 결과를 처리합니다.
   */
  async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorMsg = document.getElementById('loginErrorMsg');

    // 입력 검증
    if (!username) {
      errorMsg.textContent = t('loginEnterUsername', '아이디를 입력해주세요.');
      return;
    }

    if (!password) {
      errorMsg.textContent = t('loginEnterPassword', '비밀번호를 입력해주세요.');
      return;
    }

    try {
      // CSRF 헤더 가져오기
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};

      // 로그인 API 호출
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 로그인 성공 처리
        window.currentUser = username;
        updateLoginUI(true, username);
        hideLoginPopup();

        // 세션 토큰 저장
        if (data._xt) {
          sessionStorage.setItem('_xt', data._xt);
          console.log('[Auth] Session token saved');
        }

        showToast(window.i18n?.toastLoginSuccess || '로그인 성공', 'success');

        // API 키 헬스 체크 수행
        if (window.verifyLocalApiKeys) {
          window.verifyLocalApiKeys().catch(err => {
            console.error('[API Keys] 헬스 체크 실패:', err);
          });
        }
      } else {
        // 로그인 실패 메시지 표시
        errorMsg.textContent = data.message || (window.i18n?.loginFailed || '로그인 실패');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      errorMsg.textContent = window.i18n?.loginError || '로그인 중 오류가 발생했습니다.';
    }
  }

  /**
   * 로그아웃 처리를 수행합니다.
   * 사용자 확인 후 서버에 로그아웃 요청을 보내고 로그인 페이지로 리다이렉트합니다.
   */
  async function handleLogout() {
    // 로그아웃 확인
    if (!confirm(window.i18n?.logoutConfirm || '로그아웃 하시겠습니까?')) {
      return;
    }

    try {
      // CSRF 헤더 가져오기
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};

      // 로그아웃 API 호출
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { ...csrfHeaders },
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // 로그아웃 성공 처리
        window.currentUser = null;
        updateLoginUI(false);

        // 세션 토큰 및 구독/크레딧 캐시 제거
        sessionStorage.removeItem('_xt');
        localStorage.removeItem('mymind3_subscription');
        localStorage.removeItem('aiSettings');
        if (window.ApiCache) {
          window.ApiCache.invalidate('/api/credits/balance');
        }
        console.log('[Auth] Session token and subscription cache removed');

        showToast(window.i18n?.toastLogoutSuccess || '로그아웃 되었습니다.', 'info');

        // 로그인 페이지로 리다이렉트
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
      }
    } catch (error) {
      console.error('로그아웃 오류:', error);
      showToast(window.i18n?.toastLogoutError || '로그아웃 중 오류가 발생했습니다.', 'error');
    }
  }

  /**
   * 로그인 팝업 관련 이벤트 리스너를 설정합니다.
   * 로그아웃 버튼, 닫기 버튼, 오버레이 클릭, 확인 버튼, Enter 키 처리를 등록합니다.
   */
  function setupLoginPopupListeners() {
    // 로그아웃 버튼 이벤트
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }

    // 팝업 닫기 버튼 이벤트
    const loginPopupCloseBtn = document.getElementById('loginPopupCloseBtn');
    if (loginPopupCloseBtn) {
      loginPopupCloseBtn.addEventListener('click', hideLoginPopup);
    }

    // 팝업 내부 클릭 시 이벤트 전파 방지
    const loginPopup = document.getElementById('loginPopup');
    const loginOverlay = document.getElementById('loginOverlay');

    if (loginPopup) {
      loginPopup.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }

    // 오버레이 클릭 시 이벤트 전파 방지 (팝업 닫지 않음)
    if (loginOverlay) {
      loginOverlay.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
      });
    }

    // 로그인 확인 버튼 이벤트
    const loginConfirmBtn = document.getElementById('loginConfirmBtn');
    if (loginConfirmBtn) {
      loginConfirmBtn.addEventListener('click', handleLogin);
    }

    // 비밀번호 입력 필드에서 Enter 키 처리
    const loginPassword = document.getElementById('loginPassword');
    if (loginPassword) {
      loginPassword.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleLogin();
        }
      });
    }
  }

  // window 객체에 함수들 노출
  window.showLoginPopup = showLoginPopup;
  window.hideLoginPopup = hideLoginPopup;
  window.handleLogin = handleLogin;
  window.handleLogout = handleLogout;
  window.setupLoginPopupListeners = setupLoginPopupListeners;

  console.log('[Module] login-popup.js loaded');
})();
