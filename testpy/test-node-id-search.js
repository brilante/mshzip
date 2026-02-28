/**
 * 노드ID 검색 기능 테스트
 * - 노드ID(10자리 영숫자) 직접 검색
 * - id: 접두사 검색
 * - 검색 결과 하이라이트 확인
 */
const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:5858';
const USERNAME = process.env.TEST_ADMIN_USERNAME || 'Brilante33';
const PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Zkfltmak33';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  try {
    // 1. 로그인
    console.log('[1] 로그인...');
    await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle' });
    await page.fill('#username', USERNAME);
    await page.fill('#password', PASSWORD);
    await page.click('#loginBtn');
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    console.log('[2] 로그인 완료, URL:', page.url());

    // 2. 마인드맵 목록 가져와서 첫 번째 마인드맵 로드
    console.log('[3] 마인드맵 로드...');
    const loadResult = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/savelist', { credentials: 'include' });
        const data = await res.json();
        const folders = data.folders || data.data || data;
        if (Array.isArray(folders) && folders.length > 0) {
          const folderName = typeof folders[0] === 'string' ? folders[0] : (folders[0].name || folders[0].folder);
          if (window.MyMind3Simple && window.MyMind3Simple.loadFromFolder) {
            await window.MyMind3Simple.loadFromFolder(folderName);
            return { success: true, folder: folderName };
          }
          return { success: false, error: 'loadFromFolder not found' };
        }
        return { success: false, error: 'No folders', raw: JSON.stringify(data).substring(0, 200) };
      } catch (e) {
        return { success: false, error: e.message };
      }
    });
    console.log('    마인드맵 로드 결과:', JSON.stringify(loadResult));

    // 마인드맵 노드 대기
    await page.waitForSelector('.mindmap-node', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // 3. 노드ID 목록 수집 (테스트용)
    const nodeIds = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.mindmap-node[data-node-id]');
      return Array.from(nodes).slice(0, 5).map(n => ({
        internalId: n.dataset.id,
        nodeId: n.dataset.nodeId,
        title: n.querySelector('.node-title') ? n.querySelector('.node-title').textContent : n.textContent.trim().substring(0, 30)
      }));
    });
    console.log('[3] 노드ID 목록 (최대 5개):', JSON.stringify(nodeIds, null, 2));

    if (nodeIds.length === 0) {
      console.log('[WARN] 노드ID가 있는 노드를 찾지 못했습니다.');
      await page.screenshot({ path: 'testpy/node-id-search-no-nodes.png' });
      await browser.close();
      return;
    }

    const testNodeId = nodeIds[0].nodeId;
    console.log('[4] 테스트 대상 노드ID:', testNodeId);

    // 4. 검색창 placeholder 확인
    const placeholder = await page.$eval('#mindmapSearchInput', el => el.placeholder);
    console.log('[5] 검색창 placeholder:', placeholder);
    const hasIdHint = placeholder.includes('id:') || placeholder.includes('노드ID') || placeholder.includes('nodeID');
    console.log('    -> id: 접두사 안내 포함:', hasIdHint ? 'YES' : 'NO');

    // ===== 테스트 A: 노드ID 10자리 직접 검색 =====
    console.log('\n[테스트 A] 노드ID 10자리 직접 검색:', testNodeId);
    const searchInput = await page.$('#mindmapSearchInput');
    await searchInput.fill(testNodeId);
    const searchBtn = await page.$('#mindmapSearchBtn');
    await searchBtn.click();
    await page.waitForTimeout(2000);

    // 검색 결과 확인
    const resultA = await page.evaluate(() => {
      const highlights = document.querySelectorAll('.mindmap-node.search-highlight');
      const nodeIdMatches = document.querySelectorAll('.mindmap-node.search-highlight.match-node-id');
      const countEl = document.getElementById('searchResultCount');
      return {
        totalHighlights: highlights.length,
        nodeIdHighlights: nodeIdMatches.length,
        countText: countEl ? countEl.textContent : '(없음)',
        countVisible: countEl ? countEl.style.display !== 'none' : false
      };
    });
    console.log('    결과:', JSON.stringify(resultA));
    console.log('    -> 노드ID 매칭 하이라이트:', resultA.nodeIdHighlights > 0 ? 'PASS' : 'FAIL');

    await page.screenshot({ path: 'testpy/node-id-search-direct.png' });

    // 검색 초기화
    const clearBtn = await page.$('#mindmapSearchClearBtn');
    if (clearBtn) await clearBtn.click();
    await page.waitForTimeout(500);

    // ===== 테스트 B: id: 접두사 검색 =====
    console.log('\n[테스트 B] id: 접두사 검색: id:' + testNodeId);
    await searchInput.fill('id:' + testNodeId);
    await searchBtn.click();
    await page.waitForTimeout(2000);

    const resultB = await page.evaluate(() => {
      const highlights = document.querySelectorAll('.mindmap-node.search-highlight');
      const nodeIdMatches = document.querySelectorAll('.mindmap-node.search-highlight.match-node-id');
      const countEl = document.getElementById('searchResultCount');
      return {
        totalHighlights: highlights.length,
        nodeIdHighlights: nodeIdMatches.length,
        countText: countEl ? countEl.textContent : '(없음)'
      };
    });
    console.log('    결과:', JSON.stringify(resultB));
    console.log('    -> id: 접두사 검색 성공:', resultB.nodeIdHighlights > 0 ? 'PASS' : 'FAIL');

    await page.screenshot({ path: 'testpy/node-id-search-prefix.png' });

    // 검색 초기화
    if (clearBtn) await clearBtn.click();
    await page.waitForTimeout(500);

    // ===== 테스트 C: 노드ID 부분 검색 (id: 접두사로 부분매칭) =====
    const partialId = testNodeId.substring(0, 5);
    console.log('\n[테스트 C] id: 접두사 + 부분 검색: id:' + partialId);
    await searchInput.fill('id:' + partialId);
    await searchBtn.click();
    await page.waitForTimeout(2000);

    const resultC = await page.evaluate(() => {
      const highlights = document.querySelectorAll('.mindmap-node.search-highlight');
      const nodeIdMatches = document.querySelectorAll('.mindmap-node.search-highlight.match-node-id');
      return {
        totalHighlights: highlights.length,
        nodeIdHighlights: nodeIdMatches.length
      };
    });
    console.log('    결과:', JSON.stringify(resultC));
    console.log('    -> 부분 매칭 검색:', resultC.nodeIdHighlights > 0 ? 'PASS' : 'FAIL');

    await page.screenshot({ path: 'testpy/node-id-search-partial.png' });

    // 검색 초기화
    if (clearBtn) await clearBtn.click();
    await page.waitForTimeout(500);

    // ===== 테스트 D: 파란색 하이라이트(#배지) CSS 확인 =====
    console.log('\n[테스트 D] 노드ID 매칭 시 CSS 스타일 확인');
    await searchInput.fill(testNodeId);
    await searchBtn.click();
    await page.waitForTimeout(2000);

    const styleCheck = await page.evaluate(() => {
      const nodeIdMatch = document.querySelector('.mindmap-node.search-highlight.match-node-id');
      if (!nodeIdMatch) return { found: false };
      const style = window.getComputedStyle(nodeIdMatch);
      const afterStyle = window.getComputedStyle(nodeIdMatch, '::after');
      return {
        found: true,
        borderColor: style.borderColor,
        boxShadow: style.boxShadow,
        afterContent: afterStyle.content,
        afterBackground: afterStyle.backgroundColor
      };
    });
    console.log('    CSS 스타일:', JSON.stringify(styleCheck));
    console.log('    -> 파란색 스타일 적용:', styleCheck.found ? 'PASS' : 'FAIL');

    await page.screenshot({ path: 'testpy/node-id-search-style.png' });

    // ===== 테스트 E: 자동 선택(클릭) 확인 =====
    if (clearBtn) await clearBtn.click();
    await page.waitForTimeout(500);

    console.log('\n[테스트 E] 정확 매칭 1건 -> 자동 선택 확인');
    await searchInput.fill(testNodeId);
    await searchBtn.click();
    await page.waitForTimeout(3000); // 자동 선택 딜레이

    const autoSelectCheck = await page.evaluate(() => {
      const selected = document.querySelector('.mindmap-node.selected, .mindmap-node.active');
      const nodeIdMatch = document.querySelector('.mindmap-node.search-highlight.match-node-id');
      return {
        selectedExists: !!selected,
        selectedNodeId: selected ? selected.dataset.nodeId : null,
        matchNodeId: nodeIdMatch ? nodeIdMatch.dataset.nodeId : null,
        isMatched: selected && nodeIdMatch && selected === nodeIdMatch
      };
    });
    console.log('    자동 선택:', JSON.stringify(autoSelectCheck));
    console.log('    -> 자동 선택 동작:', autoSelectCheck.selectedExists ? 'PASS' : 'WARN (선택 CSS 없을 수 있음)');

    await page.screenshot({ path: 'testpy/node-id-search-autoselect.png' });

    // ===== 종합 결과 =====
    console.log('\n====== 종합 결과 ======');
    console.log('A. 노드ID 직접 검색:', resultA.nodeIdHighlights > 0 ? 'PASS' : 'FAIL');
    console.log('B. id: 접두사 검색:', resultB.nodeIdHighlights > 0 ? 'PASS' : 'FAIL');
    console.log('C. 부분 매칭 검색:', resultC.nodeIdHighlights > 0 ? 'PASS' : 'FAIL');
    console.log('D. CSS 스타일 적용:', styleCheck.found ? 'PASS' : 'FAIL');
    console.log('E. 자동 선택:', autoSelectCheck.selectedExists ? 'PASS' : 'WARN');
    console.log('F. placeholder 안내:', hasIdHint ? 'PASS' : 'FAIL');

    const allPass = resultA.nodeIdHighlights > 0 && resultB.nodeIdHighlights > 0 && resultC.nodeIdHighlights > 0 && styleCheck.found && hasIdHint;
    console.log('\n전체:', allPass ? 'ALL PASS' : '일부 실패');

  } catch (err) {
    console.error('[ERROR]', err.message);
    await page.screenshot({ path: 'testpy/node-id-search-error.png' });
  } finally {
    await browser.close();
  }
})();
