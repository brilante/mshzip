/**
 * /login 페이지 확인용
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  page.on('dialog', async dialog => {
    console.log(`다이얼로그: ${dialog.type()} - "${dialog.message()}"`);
    await dialog.accept('1');
  });

  await page.goto('http://localhost:5858/login', { waitUntil: 'domcontentloaded', timeout: 10000 });
  console.log('로그인 페이지 로드 완료');
  console.log('브라우저 창 유지 중...');
})();
