/**
 * 브라우저 테스트: 설정 > Agent Skills > TODO Node ID 로드 검증
 * 수정사항: await 추가 + 탭 전환 재로드 + 재시도 로직
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, channel: 'chrome', args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  // 콘솔 로그 캡처
  const logs = [];
  page.on('console', msg => {
    const t = msg.text();
    if (t.includes('TODO') || t.includes('AccessKeys') || t.includes('Settings') || t.includes('ApiCache') || t.includes('user/settings')) {
      logs.push(`[${msg.type()}] ${t}`);
    }
  });

  // API 응답 캡처
  page.on('response', resp => {
    if (resp.url().includes('/api/user/settings')) {
      console.log('[API]', resp.request().method(), resp.status(), resp.url());
    }
  });

  // 1. 접속 + 로그인
  await page.goto('http://localhost:5858/', { waitUntil: 'networkidle' });

  // 로그인 API 직접 호출로 세션 확보
  const loginResp = await page.evaluate(async () => {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: 'bril', password: '1' })
    });
    return { status: resp.status, data: await resp.json() };
  });
  console.log('[1] 로그인:', loginResp.data.success ? 'OK' : 'FAIL');
  await page.waitForTimeout(1000);

  // 2. 설정 팝업 열기
  await page.evaluate(() => showSettingsLayerPopup('#basic'));
  await page.waitForTimeout(4000);
  console.log('[2] 설정 팝업 열기 완료');

  // 3. Agent Skills 활성화 (체크박스)
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

  // 관리자 인증 팝업 자동 처리
  const adminVis = await page.locator('#adminPasswordPopup').isVisible().catch(() => false);
  if (adminVis) {
    await page.fill('#adminPasswordInput', '1');
    await page.click('#adminPasswordConfirmBtn');
    await page.waitForTimeout(2000);
    console.log('[3.1] 관리자 인증 통과');
  }

  // 4. Agent Skills 탭 클릭
  const navVis = await page.locator('[data-menu="agent-skills"]').isVisible().catch(() => false);
  if (navVis) {
    await page.locator('[data-menu="agent-skills"]').click();
    await page.waitForTimeout(2000);
    console.log('[4] Agent Skills 탭 활성');
  } else {
    console.log('[4] Agent Skills 탭 미표시');
  }

  // 5. TODO Node ID 확인 (첫 번째)
  const todoVis = await page.locator('#todoNodeId').isVisible().catch(() => false);
  const val1 = todoVis ? await page.locator('#todoNodeId').inputValue() : '';
  console.log('[5] TODO Node ID (초기):', todoVis ? (val1 || '(비어있음)') : 'input 미표시');
  console.log('[5] 결과:', val1.length > 0 ? 'PASS - 값 로드됨' : 'EMPTY - 값 없음');

  // 6. 탭 전환 후 재로드 테스트 (basic → agent-skills)
  const basicTab = await page.locator('[data-menu="basic"]');
  if (await basicTab.isVisible().catch(() => false)) {
    await basicTab.click();
    await page.waitForTimeout(500);
    console.log('[6] basic 탭으로 전환');

    const agentTab = await page.locator('[data-menu="agent-skills"]');
    if (await agentTab.isVisible().catch(() => false)) {
      await agentTab.click();
      await page.waitForTimeout(2000);
      console.log('[6] agent-skills 탭으로 복귀');
    }
  }

  // 7. TODO Node ID 재확인 (탭 전환 후)
  const val2 = await page.locator('#todoNodeId').inputValue().catch(() => '');
  console.log('[7] TODO Node ID (탭 전환 후):', val2 || '(비어있음)');
  console.log('[7] 결과:', val2.length > 0 ? 'PASS - 재로드 성공' : 'EMPTY');

  // 8. 콘솔 로그 출력
  console.log('\n--- 캡처된 콘솔 로그 ---');
  logs.forEach(l => console.log(l));

  // 9. 스크린샷
  await page.screenshot({ path: 'testpy/agent-skills-todo-test.png', fullPage: false });
  console.log('\n[9] 스크린샷: testpy/agent-skills-todo-test.png');

  // 종합
  const pass = val1.length > 0 && val2.length > 0;
  console.log('\n=== 종합 결과 ===');
  console.log('초기 로드:', val1.length > 0 ? 'PASS' : 'FAIL');
  console.log('탭 전환 재로드:', val2.length > 0 ? 'PASS' : 'FAIL');
  console.log('전체:', pass ? 'PASS' : 'FAIL');

  await page.waitForTimeout(3000);
  await browser.close();
})().catch(e => console.error('오류:', e));
