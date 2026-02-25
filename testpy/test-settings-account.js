/**
 * 설정 > 계정 탭 브라우저 테스트
 * - 로그인 → 설정 팝업 → 관리자 인증 → 계정 탭 → userId/email 값 확인
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
  console.log('=== 설정 > 계정 탭 브라우저 테스트 ===\n');

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

    // dialog 핸들러 (일반 prompt/alert)
    page.on('dialog', async dialog => {
      console.log(`  [다이얼로그] ${dialog.type()} - "${dialog.message()}"`);
      await dialog.accept('1');
    });

    // JS 에러 수집
    const jsErrors = [];
    page.on('pageerror', err => jsErrors.push(err.message));

    // 콘솔 로그 수집 (settings 관련)
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Settings') || text.includes('account') || text.includes('Account')) {
        console.log(`  [콘솔] ${text}`);
      }
    });

    // ============================================
    // TC1: 로그인 페이지 접속
    // ============================================
    console.log('[TC1] /login 페이지 접속');
    const res = await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    if (res.status() === 200) {
      log('PASS', '로그인 페이지 로드', `HTTP ${res.status()}`);
    } else {
      log('FAIL', '로그인 페이지 로드', `HTTP ${res.status()}`);
    }

    // ============================================
    // TC2: 로그인 수행
    // ============================================
    console.log('\n[TC2] 로그인 수행');
    await page.waitForTimeout(1000);
    await page.fill('#username', TEST_USER);
    await page.fill('#password', TEST_PASS);
    await page.click('#loginBtn');
    console.log(`  아이디: ${TEST_USER}, 비밀번호: (입력됨) → 로그인 클릭`);

    // 페이지 전환 대기
    await page.waitForTimeout(3000);

    const afterLoginUrl = page.url();
    console.log(`  로그인 후 URL: ${afterLoginUrl}`);

    if (afterLoginUrl.includes('/app') || afterLoginUrl === `${BASE_URL}/`) {
      log('PASS', '로그인 성공', `URL: ${afterLoginUrl}`);
    } else {
      log('FAIL', '로그인 실패', `URL: ${afterLoginUrl}`);
    }

    // ============================================
    // TC3: 설정 팝업 열기
    // ============================================
    console.log('\n[TC3] 설정 팝업 열기');

    // showSettingsLayerPopup() 직접 호출
    await page.evaluate(() => {
      if (typeof showSettingsLayerPopup === 'function') {
        showSettingsLayerPopup('#account');
      }
    });
    console.log('  showSettingsLayerPopup("#account") 호출');

    // 팝업이 로드될 때까지 대기
    await page.waitForTimeout(5000);

    // 팝업 표시 확인
    const popupVisible = await page.evaluate(() => {
      const popup = document.getElementById('settingsLayerPopup');
      return popup ? popup.style.display !== 'none' : false;
    });

    if (popupVisible) {
      log('PASS', '설정 팝업 표시됨');
    } else {
      log('FAIL', '설정 팝업 미표시');
    }

    // ============================================
    // TC4: 관리자 인증 팝업 처리 (HTML overlay 팝업)
    // ============================================
    console.log('\n[TC4] 관리자 인증 팝업 처리');

    // 관리자 인증 팝업이 표시되었는지 확인
    const adminPopupVisible = await page.evaluate(() => {
      const popup = document.getElementById('adminPasswordPopup');
      return popup ? popup.style.display !== 'none' : false;
    });
    console.log(`  관리자 인증 팝업 표시: ${adminPopupVisible}`);

    if (adminPopupVisible) {
      // 비밀번호 "1" 입력 후 확인 클릭
      await page.fill('#adminPasswordInput', '1');
      await page.click('#adminPasswordConfirmBtn');
      console.log('  비밀번호 "1" 입력 → 확인 클릭');
      await page.waitForTimeout(2000);

      // 팝업이 닫혔는지 확인
      const popupClosed = await page.evaluate(() => {
        const popup = document.getElementById('adminPasswordPopup');
        return popup ? popup.style.display === 'none' : true;
      });

      if (popupClosed) {
        log('PASS', '관리자 인증 성공', '팝업 닫힘');
      } else {
        log('FAIL', '관리자 인증 실패', '팝업 여전히 표시 중');
      }
    } else {
      log('PASS', '관리자 인증 불필요', '팝업 미표시 (이미 인증됨)');
    }

    // ============================================
    // TC5: 계정 탭 클릭
    // ============================================
    console.log('\n[TC5] 계정 탭 클릭');

    // 계정 탭이 이미 active가 아니면 클릭
    const accountTabExists = await page.evaluate(() => {
      const tab = document.querySelector('[data-menu="account"]');
      return !!tab;
    });

    if (accountTabExists) {
      // evaluate로 직접 클릭 (overlay 간섭 방지)
      await page.evaluate(() => {
        const tab = document.querySelector('[data-menu="account"]');
        if (tab) tab.click();
      });
      console.log('  계정 탭 (data-menu="account") 클릭 (evaluate)');
      await page.waitForTimeout(2000);
      log('PASS', '계정 탭 존재 및 클릭');
    } else {
      log('FAIL', '계정 탭 미발견');
    }

    // ============================================
    // TC6: accountUserId, accountUserEmail 값 확인
    // ============================================
    console.log('\n[TC6] 계정 정보 확인');

    // 계정 데이터 로드 대기 (API 호출 시간)
    await page.waitForTimeout(3000);

    const accountData = await page.evaluate(() => {
      const userIdEl = document.getElementById('accountUserId');
      const emailEl = document.getElementById('accountUserEmail');

      // content-account 섹션 활성화 여부
      const accountSection = document.getElementById('content-account');
      const isActive = accountSection ? accountSection.classList.contains('active') : false;

      return {
        userId: userIdEl ? userIdEl.textContent.trim() : null,
        email: emailEl ? emailEl.textContent.trim() : null,
        userIdExists: !!userIdEl,
        emailExists: !!emailEl,
        sectionActive: isActive
      };
    });

    console.log(`  계정 섹션 활성: ${accountData.sectionActive}`);
    console.log(`  accountUserId 요소: ${accountData.userIdExists}, 값: "${accountData.userId}"`);
    console.log(`  accountUserEmail 요소: ${accountData.emailExists}, 값: "${accountData.email}"`);

    // userId 검증
    if (accountData.userId && accountData.userId !== '-' && accountData.userId !== '') {
      log('PASS', 'accountUserId 값 표시', `"${accountData.userId}"`);
    } else {
      log('FAIL', 'accountUserId 빈 값 또는 기본값', `"${accountData.userId}"`);
    }

    // email 검증
    if (accountData.email && accountData.email !== '-' && accountData.email !== '') {
      log('PASS', 'accountUserEmail 값 표시', `"${accountData.email}"`);
    } else {
      log('FAIL', 'accountUserEmail 빈 값 또는 기본값', `"${accountData.email}"`);
    }

    // ============================================
    // TC7: 스크린샷 저장
    // ============================================
    console.log('\n[TC7] 스크린샷 저장');
    await page.screenshot({ path: 'testpy/settings-account-test.png', fullPage: true });
    log('PASS', '스크린샷 저장', 'testpy/settings-account-test.png');

    // ============================================
    // TC8: JS 에러 확인
    // ============================================
    console.log('\n[TC8] JavaScript 에러 확인');
    if (jsErrors.length === 0) {
      log('PASS', 'JS 에러 없음');
    } else {
      log('FAIL', `JS 에러 ${jsErrors.length}건`, jsErrors.join('; ').substring(0, 300));
    }

    // 브라우저 창 유지
  } catch (err) {
    console.error(`\n❌ 테스트 오류: ${err.message}`);
    failed++;
  }

  // 결과 요약
  console.log(`\n${'='.repeat(50)}`);
  console.log(`결과: ${passed} PASS / ${failed} FAIL (총 ${passed + failed}건)`);
  console.log(`${'='.repeat(50)}`);

  // 브라우저 닫기 (스크립트 종료를 위해)
  if (browser) {
    await browser.close();
  }

  process.exit(failed > 0 ? 1 : 0);
})();
