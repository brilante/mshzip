/**
 * Phase4→CC: API 헬스체크 테스트
 * 서버 상태 및 기능 목록 검증
 */
const http = require('http');

const BASE = 'http://localhost:5858';

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { reject(new Error('JSON 파싱 실패: ' + data.substring(0, 100))); }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('=== CC 구현 프로젝트 테스트 ===\n');
  let passed = 0;
  let failed = 0;

  // TC1: 헬스체크
  try {
    const r = await fetchJson(BASE + '/api/health');
    if (r.status === 200 && r.body.success && r.body.data.status === 'ok') {
      console.log('[TC1] ✅ 헬스체크 - 성공 (uptime:', Math.floor(r.body.data.uptime) + '초)');
      passed++;
    } else {
      console.log('[TC1] ❌ 헬스체크 - 실패:', JSON.stringify(r.body));
      failed++;
    }
  } catch (e) {
    console.log('[TC1] ❌ 헬스체크 - 에러:', e.message);
    failed++;
  }

  // TC2: 기능 목록
  try {
    const r = await fetchJson(BASE + '/api/features');
    if (r.status === 200 && r.body.data.totalFeatures === 19) {
      console.log('[TC2] ✅ 기능 목록 - 19개 기능 확인');
      passed++;
    } else {
      console.log('[TC2] ❌ 기능 목록 - 예상 19개, 실제:', r.body.data?.totalFeatures);
      failed++;
    }
  } catch (e) {
    console.log('[TC2] ❌ 기능 목록 - 에러:', e.message);
    failed++;
  }

  // TC3: Phase별 기능 분포
  try {
    const r = await fetchJson(BASE + '/api/features');
    const phases = {};
    r.body.data.implemented.forEach(f => {
      phases[f.phase] = (phases[f.phase] || 0) + 1;
    });
    const expected = { 0: 3, 1: 3, 2: 3, 3: 3, 4: 3, 5: 4 };
    let match = true;
    for (const [p, count] of Object.entries(expected)) {
      if (phases[p] !== count) { match = false; break; }
    }
    if (match) {
      console.log('[TC3] ✅ Phase별 분포 - P0:3, P1:3, P2:3, P3:3, P4:3, P5:4');
      passed++;
    } else {
      console.log('[TC3] ❌ Phase별 분포 불일치:', JSON.stringify(phases));
      failed++;
    }
  } catch (e) {
    console.log('[TC3] ❌ Phase별 분포 - 에러:', e.message);
    failed++;
  }

  console.log('\n=== 결과: ' + passed + '/' + (passed + failed) + ' 통과 ===');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
