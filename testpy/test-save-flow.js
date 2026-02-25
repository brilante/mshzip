'use strict';

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--start-maximized']
  });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  // 콘솔 메시지 캡처
  const consoleMsgs = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error' || text.includes('Save') || text.includes('save') ||
        text.includes('저장') || text.includes('Failed') || text.includes('failed')) {
      consoleMsgs.push('[' + msg.type() + '] ' + text.substring(0, 300));
    }
  });

  // API 응답 캡처
  const apiResponses = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/save') || url.includes('/api/mindmap/rename')) {
      const status = response.status();
      let body = '';
      try { body = await response.text(); } catch(e) {}
      apiResponses.push({ url: url.replace('http://localhost:5858', ''), status, body: body.substring(0, 300) });
    }
  });

  try {
    // 1. 메인 페이지 접속
    await page.goto('http://localhost:5858/', { waitUntil: 'networkidle', timeout: 15000 });
    console.log('1. 페이지 로드 완료');
    await page.waitForTimeout(2000);

    // MindMapData 초기화 확인
    const isReady = await page.evaluate(() => {
      return !!window.MyMind3?.MindMapData;
    });
    console.log('2. MindMapData 준비:', isReady);

    // 기존 루트 노드 확인
    const rootCount = await page.evaluate(() => {
      return window.MyMind3?.MindMapData?.mindMapData?.length || 0;
    });
    console.log('3. 루트 노드 수:', rootCount);

    // 루트 노드가 있으면 새 마인드맵으로 시작
    if (rootCount >= 1) {
      console.log('   기존 노드 있음 - 새 마인드맵으로 초기화');
      await page.evaluate(() => {
        window.MyMind3.MindMapData.mindMapData = [];
        window.MyMind3.MindMapData.nextNodeId = 1;
        window.MyMind3.currentFolder = null;
        localStorage.removeItem('currentFolder');
      });
    }

    // 3. 메인추가 버튼 클릭
    const addBtn = page.locator('[id="addMainTitleBtn"]');
    console.log('4. 메인추가 버튼 클릭');
    await addBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // 커스텀 입력 모달이 나타날 때까지 대기
    const inputModal = page.locator('[id="inputModalText"]');
    const hasModal = await inputModal.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasModal) {
      console.log('5. 입력 모달 표시됨 - 제목 입력');
      await inputModal.fill('브라우저저장테스트');
      // 모달 확인 버튼 클릭 (id="inputModalOk")
      await page.locator('[id="inputModalOk"]').click();
      await page.waitForTimeout(3000);
    } else {
      console.log('5. 모달 없음 - JS로 직접 노드 생성');
      await page.evaluate(() => {
        const node = window.MyMind3.MindMapData.createMainTitle('브라우저저장테스트');
        if (node) {
          node.content = '<h2>브라우저저장테스트</h2><p><br></p>';
          window.currentQAFolder = '브라우저저장테스트';
          window.MyMind3.currentFolder = '브라우저저장테스트';
          localStorage.setItem('currentFolder', '브라우저저장테스트');
        }
      });
      await page.waitForTimeout(1000);
    }

    // 노드 생성 결과 확인
    const result = await page.evaluate(() => ({
      rootCount: window.MyMind3?.MindMapData?.mindMapData?.length || 0,
      currentFolder: window.MyMind3?.currentFolder || 'none',
      firstTitle: window.MyMind3?.MindMapData?.mindMapData?.[0]?.title || 'none'
    }));
    console.log('6. 노드 생성 결과:', JSON.stringify(result));

    // 저장 버튼 클릭 (enabled 상태 강제)
    console.log('7. 저장 시도...');
    const saveResult = await page.evaluate(async () => {
      try {
        // saveMindmapSilently 직접 호출 (저장 버튼과 동일)
        if (window.MyMind3Simple && window.MyMind3Simple.saveMindmapSilently) {
          const result = await window.MyMind3Simple.saveMindmapSilently();
          return { method: 'saveMindmapSilently', result };
        } else if (window.MyMind3Simple && window.MyMind3Simple.saveMindmap) {
          window.MyMind3Simple.saveMindmap();
          return { method: 'saveMindmap (popup)', result: 'triggered' };
        }
        return { method: 'none', result: 'no save function' };
      } catch (e) {
        return { method: 'error', result: e.message };
      }
    });
    console.log('8. 저장 결과:', JSON.stringify(saveResult));
    await page.waitForTimeout(3000);

    // 결과 출력
    console.log('\n=== API 응답 ===');
    apiResponses.forEach(r => console.log('  ' + r.url + ' → ' + r.status + ': ' + r.body));

    console.log('\n=== 관련 콘솔 메시지 ===');
    consoleMsgs.forEach(m => console.log('  ' + m));

    // 스크린샷
    await page.screenshot({ path: 'testpy/save-test-result.png' });
    console.log('\n스크린샷: testpy/save-test-result.png');

    // Cleanup
    await page.evaluate(async () => {
      try {
        await fetch('/api/deletefolder?folder=' + encodeURIComponent('브라우저저장테스트'), { method: 'DELETE' });
      } catch(e) {}
    });

    await page.waitForTimeout(1000);
  } catch (err) {
    console.error('TEST ERROR:', err.message);
    await page.screenshot({ path: 'testpy/save-test-error.png' }).catch(() => {});
  } finally {
    await browser.close();
  }
})();
