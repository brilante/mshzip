/**
 * AI 서비스별 기본 모델 설정 - Proxy 기반 변경 추적
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, channel: 'chrome', args: ['--start-maximized'] });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  const expected = {
    gpt: 'gpt-5.2',
    grok: 'grok-4-1-fast-non-reasoning',
    claude: 'claude-sonnet-4-6',
    gemini: 'gemini-3-flash'
  };

  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[AI Settings]') || text.includes('[PROXY]')) {
      console.log('[BROWSER]', text);
    }
  });

  try {
    await page.goto('http://localhost:5858');
    await page.waitForTimeout(2000);

    const usernameInput = page.locator('input[name=username], #username').first();
    if (await usernameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await usernameInput.fill('bril');
      await page.locator('input[type=password]').first().fill('1');
      await page.locator('button[type=submit]').first().click();
      await page.waitForTimeout(3000);
    }

    // Proxy 삽입: MyMind3AISettings.getAISettings가 가능하면 그걸 사용
    // settings-ai.js 로드 후 currentAISettings.services에 Proxy를 설정하려면
    // loadAISettings 이후에 intercept해야 함
    // 대신 initSettingsAI를 래핑하여 서비스 모델 변경 추적

    await page.evaluate(() => {
      // saveAISettings 호출 시 스택트레이스 출력
      const origFetch = window.fetch;
      window.fetch = function(...args) {
        if (args[0] === '/api/user/settings' && args[1] && args[1].method === 'POST') {
          const body = JSON.parse(args[1].body);
          if (body.aiServices) {
            const svcs = JSON.parse(body.aiServices);
            const grokModel = svcs.grok?.model;
            console.log('[PROXY] saveAISettings POST: grok.model=' + grokModel + ' stack=' + new Error().stack.split('\\n').slice(1, 5).join(' | '));
          }
        }
        return origFetch.apply(this, args);
      };

      if (typeof showSettingsLayerPopup === 'function') {
        showSettingsLayerPopup('#ai');
      }
    });
    await page.waitForTimeout(6000);

    const debugInfo = await page.evaluate((exp) => {
      const info = { selects: {} };
      for (const svc of ['gpt', 'grok', 'claude', 'gemini']) {
        const select = document.getElementById(svc + 'Model');
        info.selects[svc] = select ? {
          value: select.value,
          expected: exp[svc],
          pass: select.value === exp[svc]
        } : null;
      }
      return info;
    }, expected);

    console.log('\n=== 최종 결과 ===');
    let allPass = true;
    for (const [svc, data] of Object.entries(debugInfo.selects)) {
      if (!data) continue;
      const icon = data.pass ? '✅' : '❌';
      console.log(`${svc}: value="${data.value}" expected="${data.expected}" ${icon}`);
      if (!data.pass) allPass = false;
    }
    console.log('\n종합: ' + (allPass ? '✅ 전체 PASS' : '❌ FAIL 있음'));

    await page.waitForTimeout(2000);
  } catch (err) {
    console.error('테스트 오류:', err.message);
  } finally {
    await browser.close();
  }
})();
