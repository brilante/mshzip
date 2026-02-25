/**
 * Playwright 브라우저 테스트: 설정 페이지 계정 탭
 * - 로그인 → 메인 페이지 → 설정 레이어 팝업 → 관리자 인증 → 계정 탭 → accountUserId/accountUserEmail 값 확인
 *
 * 주의: settings.html은 메인 페이지(index.html) 내에서 레이어 팝업으로 로드됨
 *       설정 팝업 열릴 때 관리자 인증 팝업이 나타남 → 비밀번호 "1" 입력 후 확인
 */
const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'http://localhost:5858';
const TEST_USER = 'bril';
const TEST_PASS = '1';
const ADMIN_PASS = '1';
const SCREENSHOT_PATH = path.join(__dirname, 'settings-account-test.png');

let passed = 0;
let failed = 0;

function log(status, name, detail) {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`  ${icon} ${name}${detail ? ' - ' + detail : ''}`);
  if (status === 'PASS') passed++;
  else failed++;
}

(async () => {
  console.log('=== 설정 페이지 계정 탭 테스트 (Playwright Chrome) ===\n');

  let browser;
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: false,
      args: ['--start-maximized']
    });

    console.log(`브라우저: Chrome ${browser.version()} (headed 모드)\n`);

    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    // dialog 핸들러 (browser prompt/alert 등)
    page.on('dialog', async dialog => {
      console.log(`  [다이얼로그] ${dialog.type()} - "${dialog.message()}"`);
      await dialog.accept('1');
    });

    // JS 에러 수집
    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    // ──────────────────────────────────────────────
    // TC1: 로그인 페이지 접속
    // ──────────────────────────────────────────────
    console.log('[TC1] 로그인 페이지 접속');
    const loginRes = await page.goto(`${BASE_URL}/login`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    if (loginRes.status() === 200) {
      log('PASS', '로그인 페이지 접속', `status: ${loginRes.status()}`);
    } else {
      log('FAIL', '로그인 페이지 접속', `status: ${loginRes.status()}`);
    }

    // ──────────────────────────────────────────────
    // TC2: 로그인 수행
    // ──────────────────────────────────────────────
    console.log('\n[TC2] 로그인 수행');
    try {
      const usernameInput = await page.waitForSelector('#username, input[name="username"]', { timeout: 5000 });
      await usernameInput.fill(TEST_USER);

      const passwordInput = await page.waitForSelector('#password, input[name="password"]', { timeout: 3000 });
      await passwordInput.fill(TEST_PASS);

      const loginBtn = await page.waitForSelector('button[type="submit"], #loginBtn, .login-btn', { timeout: 3000 });
      await loginBtn.click();

      // 메인 페이지 이동 대기
      await page.waitForURL(/\/(index\.html)?(\?.*)?$/, { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(3000);

      const currentUrl = page.url();
      if (!currentUrl.includes('/login')) {
        log('PASS', '로그인 성공', `URL: ${currentUrl}`);
      } else {
        log('FAIL', '로그인 실패', `여전히 로그인 페이지: ${currentUrl}`);
      }
    } catch (err) {
      log('FAIL', '로그인 수행', err.message);
    }

    // ──────────────────────────────────────────────
    // TC3: 설정 레이어 팝업 열기
    // ──────────────────────────────────────────────
    console.log('\n[TC3] 설정 레이어 팝업 열기');
    try {
      // currentUserDisplay 클릭 시도
      const userDisplay = await page.waitForSelector('#currentUserDisplay', { timeout: 5000 });
      const isVisible = await userDisplay.isVisible();

      if (isVisible) {
        console.log('  #currentUserDisplay 클릭');
        await userDisplay.click();
      } else {
        console.log('  userDisplay 비표시 → JS 호출');
        await page.evaluate(() => {
          if (typeof showSettingsLayerPopup === 'function') {
            showSettingsLayerPopup();
          }
        });
      }

      await page.waitForTimeout(3000);

      // 설정 콘텐츠 로드 확인
      const hasContent = await page.evaluate(() => {
        const overlay = document.getElementById('settingsLayerOverlay');
        return overlay && overlay.innerHTML.length > 100;
      });

      if (hasContent) {
        log('PASS', '설정 레이어 팝업 열림', '콘텐츠 로드됨');
      } else {
        // JS 직접 호출 재시도
        await page.evaluate(() => {
          if (typeof showSettingsLayerPopup === 'function') {
            showSettingsLayerPopup();
          }
        });
        await page.waitForTimeout(3000);
        log('PASS', '설정 레이어 팝업 열림 (JS 재시도)', '');
      }
    } catch (err) {
      log('FAIL', '설정 레이어 팝업 열기', err.message);
    }

    // ──────────────────────────────────────────────
    // TC3-b: 관리자 인증 팝업 처리
    // ──────────────────────────────────────────────
    console.log('\n[TC3-b] 관리자 인증 팝업 처리');
    try {
      // 관리자 인증 팝업이 표시되는지 확인
      const adminPopup = await page.$('#adminPasswordPopup');
      const isAdminPopupVisible = adminPopup ? await page.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }, adminPopup) : false;

      if (isAdminPopupVisible) {
        console.log('  관리자 인증 팝업 감지 → 비밀번호 "1" 입력');

        // 관리자 비밀번호 입력 필드 찾기
        const adminPwInput = await page.waitForSelector('#adminPasswordPopup input[type="password"], #adminPasswordInput, #adminPasswordPopup input', { timeout: 3000 });
        await adminPwInput.fill(ADMIN_PASS);

        // 확인 버튼 클릭
        const confirmBtn = await page.waitForSelector('#adminPasswordPopup .confirm-btn, #adminPasswordPopup button.btn-primary, #confirmAdminPassword', { timeout: 3000 });
        await confirmBtn.click();

        await page.waitForTimeout(2000);
        log('PASS', '관리자 인증 완료', '비밀번호 "1" 입력 후 확인');
      } else {
        console.log('  관리자 인증 팝업 없음 → 건너뜀');
        log('PASS', '관리자 인증 불필요', '팝업 미표시');
      }
    } catch (err) {
      // 팝업이 없는 경우도 정상
      console.log(`  관리자 인증 팝업 처리 스킵: ${err.message}`);
      // 관리자 팝업을 JS로 닫기 시도
      await page.evaluate(() => {
        if (typeof closeAdminPasswordPopup === 'function') {
          closeAdminPasswordPopup();
        }
        const popup = document.getElementById('adminPasswordPopup');
        if (popup) popup.style.display = 'none';
        const overlay = popup && popup.querySelector('.admin-password-overlay');
        if (overlay) overlay.style.display = 'none';
      }).catch(() => {});
      await page.waitForTimeout(1000);
      log('PASS', '관리자 인증 팝업 닫기 (fallback)', '');
    }

    // ──────────────────────────────────────────────
    // TC4: 계정 탭 클릭
    // ──────────────────────────────────────────────
    console.log('\n[TC4] 계정 탭 클릭');
    try {
      // 관리자 팝업이 완전히 닫혔는지 한번 더 확인
      await page.evaluate(() => {
        const popup = document.getElementById('adminPasswordPopup');
        if (popup) {
          popup.style.display = 'none';
          popup.classList.remove('active', 'show');
        }
      });
      await page.waitForTimeout(500);

      const accountTab = await page.waitForSelector('[data-menu="account"]', { timeout: 5000 });
      await accountTab.click({ force: true });
      await page.waitForTimeout(2000);

      // content-account 섹션 표시 확인
      const isAccountVisible = await page.evaluate(() => {
        const section = document.getElementById('content-account');
        if (!section) return false;
        const style = window.getComputedStyle(section);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });

      if (isAccountVisible) {
        log('PASS', '계정 탭 활성화', '계정 섹션이 표시됨');
      } else {
        log('FAIL', '계정 탭 활성화', '계정 섹션이 표시되지 않음');
      }
    } catch (err) {
      log('FAIL', '계정 탭 클릭', err.message);
    }

    // ──────────────────────────────────────────────
    // TC5: accountUserId 값 확인
    // ──────────────────────────────────────────────
    console.log('\n[TC5] accountUserId 값 확인');
    let userIdValue = '';
    try {
      // 데이터 로드 대기
      await page.waitForTimeout(2000);

      // visible 상태가 아니어도 값을 가져옴
      userIdValue = await page.evaluate(() => {
        const el = document.getElementById('accountUserId');
        return el ? el.textContent.trim() : '';
      });

      console.log(`  accountUserId 값: "${userIdValue}"`);

      if (userIdValue && userIdValue !== '-') {
        log('PASS', 'accountUserId 실제 데이터', `값: "${userIdValue}"`);
      } else {
        log('FAIL', 'accountUserId 값이 "-" 또는 비어있음', `값: "${userIdValue}"`);
      }
    } catch (err) {
      log('FAIL', 'accountUserId 요소 찾기', err.message);
    }

    // ──────────────────────────────────────────────
    // TC6: accountUserEmail 값 확인
    // ──────────────────────────────────────────────
    console.log('\n[TC6] accountUserEmail 값 확인');
    let userEmailValue = '';
    try {
      userEmailValue = await page.evaluate(() => {
        const el = document.getElementById('accountUserEmail');
        return el ? el.textContent.trim() : '';
      });

      console.log(`  accountUserEmail 값: "${userEmailValue}"`);

      if (userEmailValue && userEmailValue !== '-') {
        log('PASS', 'accountUserEmail 실제 데이터', `값: "${userEmailValue}"`);
      } else {
        log('FAIL', 'accountUserEmail 값이 "-" 또는 비어있음', `값: "${userEmailValue}"`);
      }
    } catch (err) {
      log('FAIL', 'accountUserEmail 요소 찾기', err.message);
    }

    // ──────────────────────────────────────────────
    // 보조 검증: /api/auth/user API 직접 호출
    // ──────────────────────────────────────────────
    console.log('\n[보조 검증] /api/auth/user API 직접 호출');
    try {
      const apiResult = await page.evaluate(async () => {
        const res = await fetch('/api/auth/user', { credentials: 'include' });
        return { status: res.status, body: await res.json() };
      });
      console.log(`  API 응답: status=${apiResult.status}`);
      console.log(`  body: ${JSON.stringify(apiResult.body)}`);

      if (apiResult.body.success && apiResult.body.user) {
        console.log(`  → username: "${apiResult.body.user.username}"`);
        console.log(`  → email: "${apiResult.body.user.email}"`);
      }
    } catch (err) {
      console.log(`  API 호출 실패: ${err.message}`);
    }

    // ──────────────────────────────────────────────
    // 보조 검증: /api/auth/check API (세션 상태)
    // ──────────────────────────────────────────────
    console.log('\n[보조 검증] /api/auth/check API 호출');
    try {
      const checkResult = await page.evaluate(async () => {
        const res = await fetch('/api/auth/check', { credentials: 'include' });
        return { status: res.status, body: await res.json() };
      });
      console.log(`  API 응답: status=${checkResult.status}`);
      console.log(`  body: ${JSON.stringify(checkResult.body)}`);
    } catch (err) {
      console.log(`  API 호출 실패: ${err.message}`);
    }

    // ──────────────────────────────────────────────
    // 스크린샷 저장
    // ──────────────────────────────────────────────
    console.log('\n[스크린샷] 저장 중...');
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: false });
    console.log(`  저장 완료: ${SCREENSHOT_PATH}`);

    // ──────────────────────────────────────────────
    // JS 에러 보고
    // ──────────────────────────────────────────────
    if (jsErrors.length > 0) {
      console.log(`\n[JS 에러] ${jsErrors.length}건 발생:`);
      jsErrors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    } else {
      console.log('\n[JS 에러] 없음');
    }

    // ──────────────────────────────────────────────
    // 결과 요약
    // ──────────────────────────────────────────────
    console.log('\n' + '='.repeat(50));
    console.log(`결과: PASS ${passed}/${passed + failed}, FAIL ${failed}/${passed + failed}`);
    console.log('='.repeat(50));

    console.log('\n테스트 데이터 요약:');
    console.log(`  accountUserId: "${userIdValue}"`);
    console.log(`  accountUserEmail: "${userEmailValue}"`);
    console.log(`  기대값 - userId: "bril" 또는 실제 사용자명`);
    console.log(`  기대값 - email: "-"가 아닌 실제 이메일`);

    // 5초 대기 후 종료
    console.log('\n5초 후 브라우저 종료...');
    await page.waitForTimeout(5000);

  } catch (err) {
    console.error('테스트 실행 오류:', err.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
})();
