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
  page.on('dialog', async dialog => {
    console.log('   다이얼로그:', dialog.type(), dialog.message());
    if (dialog.type() === 'prompt') {
      await dialog.accept('1');
    } else {
      await dialog.accept();
    }
  });

  // 1. 메인 페이지 접속
  console.log('1. 메인 페이지 접속...');
  await page.goto('http://localhost:5858/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 초기 상태 스크린샷
  await page.screenshot({ path: 'testpy/mermaid-step1-initial.png' });
  console.log('   스크린샷: mermaid-step1-initial.png');

  // 현재 페이지 상태 확인
  const pageState = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
      type: i.type, name: i.name, id: i.id, visible: i.offsetParent !== null,
      placeholder: i.placeholder
    }));
    const buttons = Array.from(document.querySelectorAll('button')).slice(0, 10).map(b => ({
      text: b.textContent.trim().substring(0, 30), visible: b.offsetParent !== null
    }));
    return { url: location.href, inputs, buttons };
  });
  console.log('2. 페이지 상태:', JSON.stringify(pageState, null, 2));

  // 로그인 처리 - 보이는 입력 필드로만
  const visibleInputs = pageState.inputs.filter(i => i.visible);
  if (visibleInputs.length > 0) {
    console.log('3. 로그인 시도...');
    const userField = visibleInputs.find(i => i.type === 'text' || i.name === 'username' || i.id === 'username');
    const pwdField = visibleInputs.find(i => i.type === 'password');
    if (userField) {
      const selector = userField.id ? '#' + userField.id : (userField.name ? 'input[name="' + userField.name + '"]' : 'input[type="' + userField.type + '"]');
      await page.fill(selector, 'bril');
    }
    if (pwdField) {
      const selector = pwdField.id ? '#' + pwdField.id : (pwdField.name ? 'input[name="' + pwdField.name + '"]' : 'input[type="password"]');
      await page.fill(selector, '1');
    }
    const loginBtn = pageState.buttons.find(b => b.visible && (b.text.includes('로그인') || b.text.includes('Login')));
    if (loginBtn) {
      await page.click('button:has-text("' + loginBtn.text + '")');
    } else {
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(3000);
  }

  await page.screenshot({ path: 'testpy/mermaid-step2-after-login.png' });
  console.log('4. 스크린샷: mermaid-step2-after-login.png');

  // 불러오기 버튼 클릭
  console.log('5. 마인드맵 불러오기...');
  const loadBtnVisible = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const loadBtn = btns.find(b => b.textContent.includes('불러오기') && b.offsetParent !== null);
    return loadBtn ? loadBtn.textContent.trim() : null;
  });

  if (loadBtnVisible) {
    await page.click('button:has-text("불러오기")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'testpy/mermaid-step3-mmlist.png' });
    console.log('   스크린샷: mermaid-step3-mmlist.png');

    // 모달/목록 내용 확인
    const listContent = await page.evaluate(() => {
      const items = document.querySelectorAll('.modal-body li, .mindmap-list-item, .mm-list-item, select option, .dropdown-item, li, .list-item');
      return Array.from(items).slice(0, 20).map(i => i.textContent.trim().substring(0, 50));
    });
    console.log('   목록 항목:', listContent);

    // "일처리순서" 찾기
    const mmLink = await page.$('text=일처리순서');
    if (mmLink) {
      console.log('   일처리순서 발견 - 클릭');
      await mmLink.click();
      await page.waitForTimeout(3000);
    }
  }

  await page.screenshot({ path: 'testpy/mermaid-step4-mmloaded.png' });
  console.log('6. 스크린샷: mermaid-step4-mmloaded.png');

  // 마인드맵 트리에서 노드 찾기
  console.log('7. 트리 노드 탐색...');
  const treeInfo = await page.evaluate(() => {
    const panel = document.querySelector('#mindmap-tree, .mindmap-panel, .tree-panel, .mindmap');
    if (!panel) return { panel: 'none', nodes: [] };
    const spans = panel.querySelectorAll('span, div, a, li');
    const nodes = Array.from(spans)
      .filter(s => s.textContent.trim().length > 0 && s.textContent.trim().length < 50)
      .slice(0, 30).map(s => ({
        text: s.textContent.trim().substring(0, 40),
        tag: s.tagName,
        nodeId: s.getAttribute('data-node-id') || ''
      }));
    return { panel: panel.className || panel.id, nodes };
  });
  console.log('   트리 정보:', JSON.stringify(treeInfo, null, 2));

  // "트리" 노드 클릭
  const treeNodeEl = await page.$('[data-node-id="SRR7MQGNCH"]');
  if (treeNodeEl) {
    console.log('8. SRR7MQGNCH 직접 클릭');
    await treeNodeEl.click();
  } else {
    console.log('8. data-node-id 미발견, 노드 검색으로 시도...');
    // 검색 필드 사용
    const searchInput = await page.$('input[placeholder*="검색"], input[type="search"], .search-input');
    if (searchInput) {
      await searchInput.fill('트리');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
    }
  }

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'testpy/mermaid-step5-nodeclick.png' });
  console.log('9. 스크린샷: mermaid-step5-nodeclick.png');

  // Mermaid 렌더링 확인
  console.log('10. Mermaid 렌더링 확인...');
  const mermaidState = await page.evaluate(() => {
    const editorEl = document.querySelector('.ql-editor, .node-content-area, .content-preview, .preview');
    return {
      mermaidLib: typeof mermaid !== 'undefined',
      codeBlocks: document.querySelectorAll('code.language-mermaid').length,
      mermaidDivs: document.querySelectorAll('.mermaid').length,
      svgInContent: editorEl ? editorEl.querySelectorAll('svg').length : -1,
      svgsTotal: document.querySelectorAll('svg').length,
      editorExists: !!editorEl,
      editorPreview: editorEl ? editorEl.innerHTML.substring(0, 500) : 'editor 없음'
    };
  });
  console.log(JSON.stringify(mermaidState, null, 2));

  await page.screenshot({ path: 'testpy/mermaid-step6-final.png' });
  console.log('11. 최종 스크린샷: mermaid-step6-final.png');

  console.log('\n=== 완료 (브라우저 유지) ===');
})();
