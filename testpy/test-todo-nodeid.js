const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, channel: 'chrome', args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  page.on('console', msg => {
    const t = msg.text();
    if (t.includes('TODO') || t.includes('AccessKeys') || t.includes('401') || t.includes('저장')) {
      console.log('[CONSOLE]', msg.type(), t);
    }
  });
  page.on('response', resp => {
    if (resp.url().includes('/api/user/settings')) {
      console.log('[API]', resp.request().method(), resp.status());
    }
  });

  // 1. 접속 + 강제 로그인
  await page.goto('http://localhost:5858/', { waitUntil: 'networkidle' });

  // 로그아웃 후 다시 로그인하여 세션 확보
  await page.evaluate(() => {
    if (typeof doLogout === 'function') doLogout();
  });
  await page.waitForTimeout(1500);

  // 로그인 폼 표시 대기
  const loginVisible = await page.locator('#loginForm, #loginUsername').isVisible({ timeout: 5000 }).catch(() => false);
  if (loginVisible) {
    await page.fill('#loginUsername', 'bril');
    await page.fill('#loginPassword', '1');
    await page.click('#loginSubmit');
    await page.waitForTimeout(3000);
    console.log('[1] 로그인 완료');
  } else {
    // 이미 로그인 상태 → 세션 확인
    console.log('[1] 로그인 폼 미표시 - 세션 확인 필요');
    // 로그인 API 직접 호출
    const loginResp = await page.evaluate(async () => {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: 'bril', password: '1' })
      });
      return { status: resp.status, data: await resp.json() };
    });
    console.log('[1] 로그인 API:', loginResp.status, loginResp.data.success);
    await page.waitForTimeout(1000);
  }

  // 2. 설정 팝업 열기
  await page.evaluate(() => showSettingsLayerPopup('#basic'));
  await page.waitForTimeout(2000);
  console.log('[2] 설정 팝업');

  // 3. Agent Skills 활성화 + 관리자 인증
  const checked = await page.evaluate(() => {
    const el = document.getElementById('agentSkillsEnabled');
    if (el && !el.checked) {
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return 'activated';
    }
    return el ? 'already_on' : 'not_found';
  });
  console.log('[3] Agent Skills:', checked);
  await page.waitForTimeout(1500);

  const adminVis = await page.locator('#adminPasswordPopup').isVisible().catch(() => false);
  if (adminVis) {
    await page.fill('#adminPasswordInput', '1');
    await page.click('#adminPasswordConfirmBtn');
    await page.waitForTimeout(2000);
    console.log('[3.1] 관리자 인증');
  }

  // 4. Agent Skills 메뉴
  const navVis = await page.locator('[data-menu="agent-skills"]').isVisible().catch(() => false);
  if (navVis) {
    await page.locator('[data-menu="agent-skills"]').click();
    await page.waitForTimeout(3000);
    console.log('[4] Agent Skills 메뉴');
  }

  // 5. TODO Node ID 확인
  const todoVis = await page.locator('#todoNodeId').isVisible().catch(() => false);
  const loadedVal = todoVis ? await page.locator('#todoNodeId').inputValue() : '';
  console.log('[5] TODO Node ID:', todoVis ? 'PASS' : 'FAIL', '값:', loadedVal || '(비어있음)');

  if (todoVis) {
    // 6. 저장
    await page.locator('#todoNodeId').clear();
    await page.locator('#todoNodeId').fill('BTW5XOTCJ0');
    await page.locator('#btnSaveTodoNodeId').click();
    await page.waitForTimeout(3000);

    const statusVis = await page.locator('#todoNodeIdStatus').isVisible().catch(() => false);
    const statusTxt = statusVis ? await page.locator('#todoNodeIdStatus').textContent() : '';
    const btnHtml = await page.locator('#btnSaveTodoNodeId').innerHTML();
    console.log('[6] 상태:', statusVis ? 'PASS' : 'FAIL', statusTxt.trim());
    console.log('[6] 버튼:', btnHtml.substring(0, 80));
  }

  await page.screenshot({ path: 'testpy/todo-node-id-test.png', fullPage: false });
  console.log('[7] 스크린샷');
})().catch(e => console.error('오류:', e));
