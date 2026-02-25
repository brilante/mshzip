/**
 * Playwright Chrome WebApp 검증 스크립트
 * - Chrome 브라우저가 실행되는지
 * - User-Agent에 Chrome이 포함되는지
 * - 페이지가 정상 로드되는지
 */
const { chromium } = require('playwright');

(async () => {
  console.log('=== Playwright Chrome WebApp 검증 시작 ===\n');

  let browser;
  try {
    // 1. Chrome 채널로 브라우저 실행 (MCP 설정과 동일: --browser chrome)
    console.log('[1] Chrome 채널로 브라우저 실행 시도...');
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true
    });

    const browserVersion = browser.version();
    console.log(`[1] ✅ 브라우저 실행 성공 - 버전: ${browserVersion}`);

    // 2. Chrome 기반 확인 (User-Agent)
    const context = await browser.newContext();
    const page = await context.newPage();

    const userAgent = await page.evaluate(() => navigator.userAgent);
    const isChrome = userAgent.includes('Chrome/');
    const isChromium = userAgent.includes('Chromium/');

    console.log(`\n[2] User-Agent 분석:`);
    console.log(`    UA: ${userAgent}`);
    console.log(`    Chrome 포함: ${isChrome ? '✅ YES' : '❌ NO'}`);
    console.log(`    Chromium 포함: ${isChromium ? '⚠️ YES (번들 Chromium)' : '✅ NO (시스템 Chrome)'}`);

    // Chrome 버전 추출
    const chromeMatch = userAgent.match(/Chrome\/([\d.]+)/);
    if (chromeMatch) {
      console.log(`    Chrome 버전: ${chromeMatch[1]}`);
    }

    // 3. 로컬 서버 접속 테스트
    console.log(`\n[3] http://localhost:5858/ 접속 시도...`);
    try {
      const response = await page.goto('http://localhost:5858/', {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });

      const status = response.status();
      const title = await page.title();

      console.log(`    HTTP 상태: ${status}`);
      console.log(`    페이지 제목: ${title}`);
      console.log(`    ${status === 200 ? '✅ 페이지 로드 성공' : '❌ 페이지 로드 실패'}`);
    } catch (navErr) {
      console.log(`    ❌ 접속 실패: ${navErr.message}`);
    }

    // 4. 최종 판정
    console.log('\n=== 최종 검증 결과 ===');
    console.log(`브라우저 실행: ✅`);
    console.log(`Chrome 사용: ${isChrome && !isChromium ? '✅ 시스템 Chrome' : isChromium ? '⚠️ 번들 Chromium' : '❌ Chrome 아님'}`);
    console.log(`브라우저 버전: ${browserVersion}`);

    // MCP 설정과의 일치 여부
    console.log(`\n[MCP 설정 일치 여부]`);
    console.log(`설정: --browser chrome → channel: "chrome"`);
    console.log(`결과: ${isChrome ? '✅ Chrome 채널로 정상 실행됨' : '❌ Chrome 채널이 아님'}`);

    await context.close();
  } catch (err) {
    console.error(`❌ 오류 발생: ${err.message}`);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }

  console.log('\n=== 검증 완료 ===');
})();
