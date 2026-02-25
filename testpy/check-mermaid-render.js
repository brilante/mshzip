/**
 * SRR7MQGNCH 노드의 Mermaid 렌더링 확인 (Playwright)
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

  console.log('1. 메인 페이지 접속...');
  await page.goto('http://localhost:5858/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 로그인 필요 시 처리
  const loginForm = await page.$('#login-form, .login-container, input[name="username"]');
  if (loginForm) {
    console.log('   로그인 필요 - bril/1 입력');
    await page.fill('input[name="username"], #username', 'bril');
    await page.fill('input[name="password"], #password', '1');
    await page.click('button[type="submit"], .login-btn, #login-btn');
    await page.waitForTimeout(3000);
  }

  // 일처리순서 마인드맵 열기 - 마인드맵 목록에서 찾기
  console.log('2. 일처리순서 마인드맵 접근...');

  // URL로 직접 접근 시도
  await page.goto('http://localhost:5858/?mm=' + encodeURIComponent('일처리순서'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // SRR7MQGNCH 노드 찾기 - 검색 또는 클릭
  console.log('3. SRR7MQGNCH (트리) 노드 탐색...');

  // 노드 텍스트로 찾기
  const treeNode = await page.$('text=트리');
  if (treeNode) {
    console.log('   트리 노드 발견 - 클릭');
    await treeNode.click();
    await page.waitForTimeout(2000);
  } else {
    console.log('   트리 노드 텍스트 미발견, 전체 DOM 탐색...');
    // data-node-id 속성으로 찾기
    const nodeEl = await page.$('[data-node-id="SRR7MQGNCH"], [data-id="SRR7MQGNCH"]');
    if (nodeEl) {
      await nodeEl.click();
      await page.waitForTimeout(2000);
    }
  }

  // 스크린샷 1: 노드 선택 상태
  await page.screenshot({ path: 'testpy/mermaid-render-1-node.png', fullPage: false });
  console.log('4. 스크린샷 저장: mermaid-render-1-node.png');

  // content 영역에서 Mermaid 렌더링 확인
  console.log('5. Mermaid 렌더링 확인...');

  // Mermaid가 렌더링되면 SVG 요소가 생성됨
  const mermaidSvgs = await page.$$('.mermaid svg, [data-mermaid] svg, pre code.language-mermaid + svg, .mermaid-container svg');
  console.log('   Mermaid SVG 요소 수:', mermaidSvgs.length);

  // 대안: SVG 내에 mermaid 관련 클래스 확인
  const allSvgs = await page.$$('svg');
  console.log('   전체 SVG 요소 수:', allSvgs.length);

  // content/preview 영역의 HTML 확인
  const contentArea = await page.$('.node-content, .content-preview, .preview, #content-area, .editor-preview');
  if (contentArea) {
    const html = await contentArea.innerHTML();
    const hasMermaidCode = html.includes('language-mermaid');
    const hasMermaidSvg = html.includes('<svg') && (html.includes('flowchart') || html.includes('mermaid'));
    console.log('   content 영역 발견');
    console.log('   Mermaid 코드 블록:', hasMermaidCode);
    console.log('   Mermaid SVG 렌더링:', hasMermaidSvg);
  } else {
    console.log('   content 영역 미발견');
  }

  // 스크린샷 2: 전체 페이지
  await page.screenshot({ path: 'testpy/mermaid-render-2-full.png', fullPage: true });
  console.log('6. 스크린샷 저장: mermaid-render-2-full.png');

  // 페이지 내 모든 mermaid 관련 요소 확인
  const mermaidInfo = await page.evaluate(() => {
    const results = {
      mermaidLoaded: typeof mermaid !== 'undefined',
      codeBlocks: document.querySelectorAll('code.language-mermaid, .language-mermaid').length,
      mermaidDivs: document.querySelectorAll('.mermaid').length,
      svgInMermaid: document.querySelectorAll('.mermaid svg').length,
      allSvgs: document.querySelectorAll('svg').length
    };
    return results;
  });
  console.log('7. Mermaid 상태:', JSON.stringify(mermaidInfo, null, 2));

  console.log('\n=== 완료 (브라우저 유지) ===');
})();
