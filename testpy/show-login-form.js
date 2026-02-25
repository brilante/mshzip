/**
 * 로그인 폼 확인용 - 기존 로그인 팝업을 그대로 표시
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

  await page.goto('http://localhost:5858/', { waitUntil: 'domcontentloaded', timeout: 10000 });
  console.log('페이지 로드 완료');

  // 기존 로그인 팝업을 그대로 표시
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const popup = document.getElementById('loginPopup');
    const overlay = document.getElementById('loginOverlay');
    if (popup) popup.style.display = 'flex';
    if (overlay) overlay.style.display = 'block';
  });

  console.log('로그인 폼 표시됨 - 브라우저 창 유지 중...');
})();
