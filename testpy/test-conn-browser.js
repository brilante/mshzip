/**
 * Skill API 연결 테스트 - 브라우저 검증
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--start-maximized']
  });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  // 다이얼로그 자동 처리
  page.on('dialog', async (d) => {
    console.log('[Dialog]', d.type(), d.message());
    await d.accept(d.type() === 'prompt' ? '1' : '');
  });

  // 1. 로그인
  console.log('=== 1. 로그인 ===');
  await page.goto('http://localhost:5858/login');
  await page.waitForTimeout(1500);
  await page.fill('#username', 'bril');
  await page.fill('#password', '1');
  await page.click('#loginBtn');
  await page.waitForTimeout(3000);
  console.log('로그인 후 URL:', page.url());

  // 2. 세션 및 키 목록 확인
  console.log('\n=== 2. API 확인 ===');
  const apiResult = await page.evaluate(async () => {
    const [auth, keys, keyPath, serverUrl] = await Promise.all([
      fetch('/api/auth/check').then(r => r.json()),
      fetch('/api/access-keys').then(r => r.json()),
      fetch('/api/access-keys/key-path').then(r => r.json()),
      fetch('/api/access-keys/server-url').then(r => r.json())
    ]);
    return { auth, keys, keyPath, serverUrl };
  });
  console.log('인증:', JSON.stringify(apiResult.auth));
  console.log('키 목록:', JSON.stringify(apiResult.keys));
  console.log('키 경로:', JSON.stringify(apiResult.keyPath));
  console.log('서버 URL:', JSON.stringify(apiResult.serverUrl));

  // 3. 설정 팝업 열기 → Agent Skills 탭
  console.log('\n=== 3. Agent Skills 설정 열기 ===');
  await page.evaluate(() => showSettingsLayerPopup('#agent-skills'));

  // 설정 팝업 로드 대기 (SSI 파일 fetch + 스크립트 로드)
  await page.waitForTimeout(5000);

  // Agent Skills 활성화 + 메뉴 이동 (JavaScript로 직접)
  await page.evaluate(() => {
    // Agent Skills 토글 활성화
    const toggle = document.querySelector('#agentSkillsEnabled');
    if (toggle && !toggle.checked) {
      toggle.checked = true;
      toggle.dispatchEvent(new Event('change'));
    }
    // Agent Skills 메뉴 강제 표시 및 클릭
    const nav = document.querySelector('[data-menu="agent-skills"]');
    if (nav) {
      nav.style.display = '';
      nav.click();
    }
  });
  await page.waitForTimeout(3000);
  console.log('Agent Skills 탭 이동');

  // 4. UI 상태 확인
  console.log('\n=== 4. UI 상태 ===');
  const uiState = await page.evaluate(() => {
    const sv = document.querySelector('#serverUrl');
    const kp = document.querySelector('#keyFilePath');
    const sel = document.querySelector('#testKeySelect');
    const btn = document.querySelector('#btnTestConnection');
    return {
      serverUrl: sv ? sv.value : 'N/A',
      keyPath: kp ? kp.value : 'N/A',
      options: sel ? Array.from(sel.options).map(o => ({ text: o.textContent.trim(), value: o.value })) : [],
      btnExists: !!btn,
      btnDisabled: btn ? btn.disabled : true
    };
  });
  console.log('서버 주소:', uiState.serverUrl);
  console.log('키 파일 경로:', uiState.keyPath);
  console.log('키 선택 옵션:', JSON.stringify(uiState.options));
  console.log('테스트 버튼:', uiState.btnExists ? (uiState.btnDisabled ? '비활성' : '활성') : '없음');

  // 5. 서버주소/키경로 저장 (비어있으면)
  if (!uiState.serverUrl) {
    await page.fill('#serverUrl', 'http://localhost:5858');
    await page.click('#btnSaveServerUrl');
    await page.waitForTimeout(1000);
    console.log('서버 주소 저장');
  }
  if (!uiState.keyPath) {
    await page.fill('#keyFilePath', 'G:/USER/brilante33/.mymindmp32');
    await page.click('#btnSaveKeyFilePath');
    await page.waitForTimeout(1000);
    console.log('키 파일 경로 저장');
  }

  // 6. 키 선택 + 연결 테스트
  console.log('\n=== 5. 연결 테스트 ===');
  if (uiState.options.length > 1) {
    await page.selectOption('#testKeySelect', { index: 1 });
    console.log('키 선택:', uiState.options[1].text);
    await page.waitForTimeout(500);

    const btn = await page.$('#btnTestConnection');
    if (btn && !(await btn.isDisabled())) {
      await btn.click();
      console.log('연결 테스트 실행!');
      await page.waitForTimeout(5000);

      // 결과 확인
      const result = await page.evaluate(() => {
        const el = document.querySelector('#connectionTestResult');
        if (!el) return { visible: false };
        return {
          visible: getComputedStyle(el).display !== 'none',
          className: el.className,
          text: el.textContent.trim()
        };
      });
      console.log('\n=== 결과 ===');
      console.log('표시:', result.visible);
      console.log('클래스:', result.className);
      console.log('내용:', result.text);
    } else {
      console.log('테스트 버튼 비활성 또는 없음');
    }
  } else {
    console.log('선택 가능한 키 없음 - 키를 먼저 발급하세요');
  }

  // 7. 스크린샷
  await page.screenshot({ path: 'testpy/browser-conn-test-result.png' });
  console.log('\n스크린샷 저장: testpy/browser-conn-test-result.png');

  console.log('\n=== 완료 (30초 후 자동 종료) ===');
  setTimeout(() => { browser.close().then(() => process.exit(0)); }, 30000);
})().catch(e => {
  console.error('에러:', e.message);
  process.exit(1);
});
