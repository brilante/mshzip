/**
 * 세션 관리 모듈
 *
 * 사용자 세션 확인 및 로그인 UI 업데이트를 담당합니다.
 *
 * 의존성:
 * - getCreditBalance: 크레딧 잔액 조회 함수
 * - updateCreditBalanceUI: 크레딧 UI 업데이트 함수
 * - showSettingsLayerPopup: 설정 팝업 표시 함수
 * - showLoginPopup: 로그인 팝업 표시 함수
 * - verifyLocalApiKeys: 로컬 API 키 검증 함수
 * - csrfUtils: CSRF 유틸리티 객체
 */
(function() {
  'use strict';

  // 현재 로그인된 사용자 ID
  let currentUser = null;

  /**
   * 세션 확인 함수
   * 서버에 현재 세션 상태를 확인하고 UI를 업데이트합니다.
   * 로그인된 경우 API 키 헬스 체크도 수행합니다.
   */
  async function checkSession() {
    try {
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
      const response = await fetch('/api/auth/check', {
        credentials: 'include'
      });

      if (!response.ok) {
        updateLoginUI(false);
        showLoginPopup();
        return;
      }

      const data = await response.json();

      if (data.authenticated) {
        currentUser = data.userId;
        updateLoginUI(true, data.userId);

        // 세션 토큰 저장
        if (data._xt) {
          sessionStorage.setItem('_xt', data._xt);
          console.log('[Auth] Session token saved from check');
        }

        // 로그인 상태에서 API 키 헬스 체크
        if (window.verifyLocalApiKeys) {
          window.verifyLocalApiKeys().catch(err => {
            console.error('[API Keys] 헬스 체크 실패:', err);
          });
        }
      } else {
        updateLoginUI(false);
        sessionStorage.removeItem('_xt');
        showLoginPopup();
      }
    } catch (error) {
      console.error('세션 확인 실패:', error);
      updateLoginUI(false);
      showLoginPopup();
    }
  }

  /**
   * 로그인 UI 업데이트 함수
   * 로그인 상태에 따라 화면의 UI 요소들을 표시/숨김 처리합니다.
   *
   * @param {boolean} isLoggedIn - 로그인 여부
   * @param {string|null} username - 사용자명 (로그인 시)
   */
  function updateLoginUI(isLoggedIn, username = null) {
    const logoutBtn = document.getElementById('logoutBtn');
    const userDisplay = document.getElementById('currentUserDisplay');
    const userNamePart = document.getElementById('userNamePart');
    const creditPart = document.getElementById('creditPart');
    const etcMenuContainer = document.getElementById('etcMenuContainer');

    if (isLoggedIn && username) {
      // 로그인 상태: UI 요소 표시
      if (logoutBtn) logoutBtn.style.display = 'block';
      if (etcMenuContainer) etcMenuContainer.style.display = 'block';
      if (userDisplay) {
        userDisplay.style.display = 'block';

        // 사용자명 표시
        if (userNamePart) {
          userNamePart.textContent = `${username}`;
        }

        // 크레딧 잔액 표시
        if (creditPart) {
          // 결제 직후 플래그 확인 (payment-success.html에서 설정)
          const paymentFlag = sessionStorage.getItem('paymentJustCompleted');
          const isPaymentRecent = paymentFlag && (Date.now() - Number(paymentFlag)) < 300000; // 5분 이내

          if (isPaymentRecent) {
            // ApiCache 무효화하여 캐시된 이전 잔액 제거
            if (window.ApiCache) {
              window.ApiCache.invalidate('/api/credits/balance');
            }
          }

          getCreditBalance().then(balance => {
            if (balance && balance.credits) {
              updateCreditBalanceUI(balance.credits);

              // 결제 직후인데 크레딧이 0이면 webhook 처리 대기 후 재조회
              if (isPaymentRecent && balance.credits.total <= 0) {
                pollCreditBalance(creditPart, 3);
              } else if (isPaymentRecent) {
                // 크레딧 정상 반영 → 플래그 제거
                sessionStorage.removeItem('paymentJustCompleted');
              }
            } else {
              // 로컬 스토리지에서 구독 정보 확인
              const subscription = JSON.parse(localStorage.getItem('mymind3_subscription') || '{}');
              if (subscription.isSubscribed && subscription.credits) {
                const totalCredits = subscription.credits.total || 0;
                creditPart.innerHTML = `(<b>${totalCredits}C</b>)`;
              } else {
                creditPart.innerHTML = '';
              }

              // 결제 직후면 재조회 시도
              if (isPaymentRecent) {
                pollCreditBalance(creditPart, 3);
              }
            }
          }).catch(() => {
            creditPart.innerHTML = '';
            if (isPaymentRecent) {
              pollCreditBalance(creditPart, 3);
            }
          });
        }

        // 사용자 표시 클릭 시 설정 팝업 표시
        userDisplay.onclick = () => {
          showSettingsLayerPopup();
        };
      }
    } else {
      // 비로그인 상태: UI 요소 숨김
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (etcMenuContainer) etcMenuContainer.style.display = 'none';
      if (userDisplay) {
        userDisplay.style.display = 'none';
        if (userNamePart) userNamePart.textContent = '';
        if (creditPart) creditPart.textContent = '';
        userDisplay.onclick = null;
      }
    }
  }

  /**
   * 로그인 팝업 표시 헬퍼 함수
   * window.showLoginPopup이 없는 경우를 대비한 안전한 호출
   */
  function showLoginPopup() {
    if (typeof window.showLoginPopup === 'function') {
      window.showLoginPopup();
    } else {
      console.warn('[Session] showLoginPopup 함수를 찾을 수 없습니다');
    }
  }

  /**
   * 설정 팝업 표시 헬퍼 함수
   * window.showSettingsLayerPopup이 없는 경우를 대비한 안전한 호출
   */
  function showSettingsLayerPopup() {
    if (typeof window.showSettingsLayerPopup === 'function') {
      window.showSettingsLayerPopup();
    } else {
      console.warn('[Session] showSettingsLayerPopup 함수를 찾을 수 없습니다');
    }
  }

  /**
   * 결제 직후 크레딧 잔액 폴링 (webhook 처리 대기)
   * 3초 간격으로 최대 retries회 재조회하여 크레딧이 반영될 때까지 대기
   */
  function pollCreditBalance(creditPart, retries) {
    if (retries <= 0) {
      console.warn('[Session] 크레딧 폴링 최대 횟수 초과');
      return;
    }

    setTimeout(async () => {
      // 캐시 무효화 후 재조회
      if (window.ApiCache) {
        window.ApiCache.invalidate('/api/credits/balance');
      }

      try {
        const balance = await getCreditBalance();
        if (balance && balance.credits && balance.credits.total > 0) {
          updateCreditBalanceUI(balance.credits);
          sessionStorage.removeItem('paymentJustCompleted');
          console.log('[Session] 결제 후 크레딧 반영 완료:', balance.credits.total);
        } else {
          // 아직 반영 안됨 → 재시도
          console.log(`[Session] 크레딧 미반영, ${retries - 1}회 재시도 남음`);
          pollCreditBalance(creditPart, retries - 1);
        }
      } catch (e) {
        pollCreditBalance(creditPart, retries - 1);
      }
    }, 3000);
  }

  /**
   * 크레딧 잔액 조회 헬퍼 함수
   * window.getCreditBalance가 없는 경우를 대비한 안전한 호출
   */
  function getCreditBalance() {
    if (typeof window.getCreditBalance === 'function') {
      return window.getCreditBalance();
    }
    return Promise.resolve(null);
  }

  /**
   * 크레딧 UI 업데이트 헬퍼 함수
   * window.updateCreditBalanceUI가 없는 경우를 대비한 안전한 호출
   */
  function updateCreditBalanceUI(credits) {
    if (typeof window.updateCreditBalanceUI === 'function') {
      window.updateCreditBalanceUI(credits);
    }
  }

  // window 객체에 함수들 노출
  window.checkSession = checkSession;
  window.updateLoginUI = updateLoginUI;

  // currentUser는 getter/setter로 노출 (직접 수정 방지)
  Object.defineProperty(window, 'currentUser', {
    get: function() {
      return currentUser;
    },
    set: function(value) {
      currentUser = value;
    },
    configurable: true
  });

  console.log('[Module] session.js loaded');
})();
