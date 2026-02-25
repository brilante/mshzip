/**
 * Playwright Chrome 브라우저 테스트 (headed 모드)
 * - /login 페이지에서 로그인 → 메인 페이지 확인
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5858';
const TEST_USER = 'bril';
const TEST_PASS = '1';

let passed = 0;
let failed = 0;

function log(status, name, detail) {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`  ${icon} ${name}${detail ? ' - ' + detail : ''}`);
  if (status === 'PASS') passed++;
  else failed++;
}

(async () => {
  console.log('=== Playwright Chrome 브라우저 테스트 (headed) ===\n');

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

    // dialog 핸들러
    page.on('dialog', async dialog => {
      console.log(`  다이얼로그: ${dialog.type()} - "${dialog.message()}"`);
      await dialog.accept('1');
    });

    // JS 에러 수집
    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    // TC1: /login 페이지 접속
    console.log('[TC1] /login 페이지 접속');
    const res = await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    if (res.status() === 200) {
      log('PASS', '로그인 페이지 로드', `HTTP ${res.status()}`);
    } else {
      log('FAIL', '로그인 페이지 로드', `HTTP ${res.status()}`);
    }

    // TC2: 로그인 폼 확인
    console.log('\n[TC2] 로그인 폼 확인');
    await page.waitForTimeout(1000);
    const usernameField = await page.$('#username');
    const passwordField = await page.$('#password');
    const loginBtn = await page.$('#loginBtn');

    if (usernameField && passwordField && loginBtn) {
      log('PASS', '로그인 폼 발견', '#username, #password, #loginBtn');
    } else {
      log('FAIL', '로그인 폼 미발견', `username:${!!usernameField} password:${!!passwordField} btn:${!!loginBtn}`);
    }

    // TC3: 로그인 시도
    console.log('\n[TC3] 로그인 시도');
    await page.fill('#username', TEST_USER);
    await page.fill('#password', TEST_PASS);
    console.log(`  아이디: ${TEST_USER}, 비밀번호: (입력됨)`);

    // 스크린샷 (로그인 전)
    await page.screenshot({ path: 'testpy/browser-test-login.png' });
    console.log('  스크린샷: testpy/browser-test-login.png');

    // 로그인 버튼 클릭 (form submit)
    await page.click('#loginBtn');
    console.log('  로그인 버튼 클릭');

    // 페이지 전환 대기
    await page.waitForTimeout(3000);

    const afterLoginUrl = page.url();
    console.log(`  로그인 후 URL: ${afterLoginUrl}`);

    // 로그인 성공: /app 또는 / 으로 이동
    if (afterLoginUrl.includes('/app') || afterLoginUrl === `${BASE_URL}/`) {
      log('PASS', '로그인 성공', `URL: ${afterLoginUrl}`);
    } else {
      // 에러 메시지 확인
      const errorText = await page.evaluate(() => {
        const el = document.getElementById('errorMessage');
        return el ? el.innerText.trim() : '';
      });
      if (errorText) {
        log('FAIL', '로그인 실패', `에러: ${errorText}`);
      } else {
        log('FAIL', '로그인 결과 불명', `URL: ${afterLoginUrl}`);
      }
    }

    // TC4: 메인 페이지 UI 확인
    console.log('\n[TC4] 메인 페이지 UI 확인');
    await page.waitForTimeout(1000);
    const uiElements = await page.evaluate(() => {
      return {
        mindmap: !!document.querySelector('.mindmap-container, #mindmap, .node-container, #jsmind_container'),
        toolbar: !!document.querySelector('.button-toolbar, .toolbar, #toolbar')
      };
    });

    if (uiElements.mindmap || uiElements.toolbar) {
      log('PASS', 'UI 요소 발견', `마인드맵: ${uiElements.mindmap ? 'O' : 'X'}, 툴바: ${uiElements.toolbar ? 'O' : 'X'}`);
    } else {
      log('FAIL', 'UI 요소 미발견');
    }

    // TC5: JavaScript 에러 확인
    console.log('\n[TC5] JavaScript 에러 확인');
    if (jsErrors.length === 0) {
      log('PASS', 'JS 에러 없음');
    } else {
      log('FAIL', `JS 에러 ${jsErrors.length}건`, jsErrors.join('; ').substring(0, 200));
    }

    // TC6: 최종 스크린샷
    console.log('\n[TC6] 최종 스크린샷');
    await page.screenshot({ path: 'testpy/browser-test-chrome.png', fullPage: true });
    log('PASS', '스크린샷 저장', 'testpy/browser-test-chrome.png');

    // Chrome 정보
    console.log('\n[INFO] 브라우저 정보');
    const ua = await page.evaluate(() => navigator.userAgent);
    console.log(`  User-Agent: ${ua}`);
    const isRealChrome = ua.includes('Chrome/') && !ua.includes('Chromium/');
    console.log(`  시스템 Chrome 사용: ${isRealChrome ? '✅ YES' : '❌ NO'}`);

    // 브라우저 창 유지 (다른 창을 열기 전까지 닫지 않음)
  } catch (err) {
    console.error(`\n❌ 테스트 오류: ${err.message}`);
    failed++;
  }

  // 결과 요약
  console.log(`\n${'='.repeat(40)}`);
  console.log(`결과: ${passed} PASS / ${failed} FAIL (총 ${passed + failed}건)`);
  console.log(`${'='.repeat(40)}`);
  console.log('브라우저 창 유지 중... (Ctrl+C로 종료)');
})();
