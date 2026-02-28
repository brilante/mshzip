/* Settings Page JavaScript - MyMind3 */
/* 모듈 로더 및 통합 초기화 */

/**
 * 중요: settings.html 직접 접근 금지!
 *
 * 이 스크립트는 index.html에서 레이어 팝업으로 settings.html을 로드한 후
 * initSettingsAll() 함수가 호출되어야만 정상 작동합니다.
 *
 * 모듈 구조:
 * - settings-core.js: 기본 설정, 언어, UI, 테마 관리
 * - settings-payment.js: 결제/구독 시스템 (패키지, 크레딧, 구독)
 * - settings-ai.js: AI 설정 (API 키, 모델 선택, 사용량)
 * - settings.js: 모듈 로더 및 통합 초기화 (본 파일)
 *
 * @see public/index.html - openSettingsPopup() 함수
 * @see CLAUDE.md - Settings 페이지 접근 방법
 */

// 레이어 팝업에서 전체 Settings 초기화를 위한 통합 함수
window.initSettingsAll = async function() {
  window.settingsInitialized = true;

  // 1. 기본 설정 초기화 (settings-core.js) - await로 loadSettings 완료 대기
  if (typeof window.initSettings === 'function') {
    await window.initSettings();
  }

  // 2. 결제 관련 기능 초기화 (settings-payment.js)
  if (typeof window.initSettingsPayment === 'function') {
    await window.initSettingsPayment();
  }

  // 3. AI 설정 초기화 (settings-ai.js)
  if (typeof window.initSettingsAI === 'function') {
    await window.initSettingsAI();
  }

  // 4. 드라이브/백업 설정 초기화 (settings-drive.js)
  if (typeof window.initDriveAndBackupSettings === 'function') {
    await window.initDriveAndBackupSettings();
  }

  // 5. 기능 설정 초기화 (settings-feature.js)
  if (typeof window.initFeatureSettings === 'function') {
    window.initFeatureSettings();
  }

  // 6. 관리자 설정 초기화 (settings-admin.js)
  if (typeof window.initSettingsAdmin === 'function') {
    await window.initSettingsAdmin();
  }

  // 6-1. 도구설정 초기화 (settings-tools.js)
  if (typeof window.initToolSettings === 'function') {
    await window.initToolSettings();
  }

  // 7. 게시판 UI 초기화 (settings-board.js)
  if (typeof window.initBoardUI === 'function') {
    window.initBoardUI();
  }

  // 7-1. Access Keys & TODO Node ID 초기화 (settings-access-keys.js)
  if (typeof window.initAccessKeys === 'function') {
    await window.initAccessKeys();
  }

  // 7-2. 2FA(TOTP) 설정 초기화 (settings-2fa.js)
  if (typeof window.initTwoFactorSettings === 'function') {
    window.initTwoFactorSettings();
  }

  // 8. 관리자 여부 확인 및 메뉴 초기화
  await checkAndInitAdminStatus();

  // 9. 모든 동적 콘텐츠 생성 후 다국어 재적용
  // (initSettingsPayment 등에서 동적으로 생성된 요소들에 번역 적용)
  if (typeof window.applyLanguageToSettings === 'function') {
    window.applyLanguageToSettings();
  }

  console.log('[Settings] 모든 설정 모듈 초기화 완료');
};

/**
 * 관리자 상태 확인 및 초기화
 * - roleToken이 있으면 가벼운 verify-role API 사용
 * - roleToken이 없으면 기존 admin-check API 사용 (폴백)
 */
async function checkAndInitAdminStatus() {
  try {
    const _xt = sessionStorage.getItem('_xt');
    let data;

    if (_xt) {
      // _xt가 있으면 가벼운 verify-role API 사용 (DB 조회 없음)
      console.log('[Settings] Cached token으로 관리자 상태 확인');
      const response = await fetch('/api/auth/verify-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ _xt })
      });
      data = await response.json();

      // 새 토큰이 전달되면 업데이트
      if (data._xt) {
        sessionStorage.setItem('_xt', data._xt);
        console.log('[Settings] Session token 갱신됨');
      }

      // 토큰이 유효하지 않으면 admin-check로 폴백
      if (!data.tokenValid) {
        console.log('[Settings] Token 유효하지 않음, admin-check로 폴백');
        sessionStorage.removeItem('_xt');
        const fallbackResponse = await fetch('/api/auth/admin-check', {
          credentials: 'include'
        });
        data = await fallbackResponse.json();
      }
    } else {
      // _xt가 없으면 기존 admin-check API 사용
      console.log('[Settings] Cached token 없음, admin-check API 사용');
      const response = await fetch('/api/auth/admin-check', {
        credentials: 'include'
      });
      data = await response.json();
    }

    if (data.isAdmin) {
      console.log('[Settings] 관리자 사용자 감지');

      // 비밀키 필요 여부 저장 (로컬 키 파일 존재 시)
      window._adminRequiresSecretKey = data.requiresSecretKey || false;
      console.log('[Settings] 비밀키 필요 여부:', window._adminRequiresSecretKey);

      // 이미 인증된 상태인지 확인
      if (data.isVerified) {
        showAdminSection();
        console.log('[Settings] 관리자 인증 유효 - 관리자 메뉴 표시');
      } else if (!data.isLocked) {
        // 비밀번호 확인 필요 (비밀키 필요 여부 전달)
        // 로컬 에이전트 연결 확인 후 팝업 표시 (async 함수)
        await showAdminPasswordPopup(data.requiresSecretKey || false);
      } else {
        // 계정 잠김
        console.log('[Settings] 관리자 계정 잠김:', data.lockedUntil);
      }
    }
  } catch (error) {
    console.error('[Settings] 관리자 상태 확인 실패:', error);
  }
}

// 관리자 비밀번호 팝업 관련 함수들은 admin-auth.js에서 정의됨
// 비밀키는 로컬 에이전트(127.0.0.1:19999)에서 G:\.localkey 파일을 읽어
// AES-256-GCM으로 암호화하여 서버로 전송함
// window.verifyAdminPassword → admin-auth.js 참조

/**
 * 관리자 섹션 표시
 */
window.showAdminSection = function() {
  // 전역 환경선택 활성화
  if (window.SettingsEnv) {
    window.SettingsEnv.setAdminStatus(true);
  }

  // 기능설정 메뉴 표시
  const featureSettingsNavItem = document.getElementById('featureSettingsNavItem');
  if (featureSettingsNavItem) {
    featureSettingsNavItem.style.display = '';
  }

  // 메뉴 아이템 표시
  const adminNavItem = document.getElementById('adminNavItem');
  if (adminNavItem) {
    adminNavItem.style.display = '';
  }

  // AI 모델 관리 메뉴 표시
  const aiModelAdminNavItem = document.getElementById('aiModelAdminNavItem');
  if (aiModelAdminNavItem) {
    aiModelAdminNavItem.style.display = '';
  }

  // 모델 동기화 로그 메뉴 표시
  const modelSyncLogsNavItem = document.getElementById('modelSyncLogsNavItem');
  if (modelSyncLogsNavItem) {
    modelSyncLogsNavItem.style.display = '';
  }

  // 도구설정 메뉴 표시
  const toolSettingsNavItem = document.getElementById('toolSettingsNavItem');
  if (toolSettingsNavItem) {
    toolSettingsNavItem.style.display = '';
  }

  // 게시판 관리 메뉴 표시
  const boardAdminNavItem = document.getElementById('boardAdminNavItem');
  if (boardAdminNavItem) {
    boardAdminNavItem.style.display = '';
  }

  // 게시판 관리 초기화
  if (typeof window.initBoardAdmin === 'function') {
    window.initBoardAdmin();
  }

  // 관리자 플래그 설정
  window.isAdminVerified = true;

  console.log('[Settings] 관리자 섹션 활성화');
};

/**
 * 관리자 섹션 숨기기
 */
window.hideAdminSection = function() {
  // 전역 환경선택 비활성화
  if (window.SettingsEnv) {
    window.SettingsEnv.setAdminStatus(false);
  }

  // 기능설정 메뉴 숨기기
  const featureSettingsNavItem = document.getElementById('featureSettingsNavItem');
  if (featureSettingsNavItem) {
    featureSettingsNavItem.style.display = 'none';
  }

  // 메뉴 아이템 숨기기
  const adminNavItem = document.getElementById('adminNavItem');
  if (adminNavItem) {
    adminNavItem.style.display = 'none';
  }

  // AI 모델 관리 메뉴 숨기기
  const aiModelAdminNavItem = document.getElementById('aiModelAdminNavItem');
  if (aiModelAdminNavItem) {
    aiModelAdminNavItem.style.display = 'none';
  }

  // 모델 동기화 로그 메뉴 숨기기
  const modelSyncLogsNavItem = document.getElementById('modelSyncLogsNavItem');
  if (modelSyncLogsNavItem) {
    modelSyncLogsNavItem.style.display = 'none';
  }

  // 게시판 관리 메뉴 숨기기
  const boardAdminNavItem = document.getElementById('boardAdminNavItem');
  if (boardAdminNavItem) {
    boardAdminNavItem.style.display = 'none';
  }

  // 관리자 플래그 해제
  window.isAdminVerified = false;
};

/**
 * 관리자 로그아웃 (인증 해제)
 */
window.adminLogout = async function() {
  try {
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/auth/admin-logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include'
    });

    if (response.ok) {
      hideAdminSection();
      console.log('[Settings] 관리자 인증 해제');
    }
  } catch (error) {
    console.error('[Settings] 관리자 로그아웃 오류:', error);
  }
};

console.log('[Settings] settings.js 모듈 로더 로드 완료');
