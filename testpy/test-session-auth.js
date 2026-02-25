const http = require('http');

// 시나리오 3: 기존 세션 쿠키(userId 없음) → auth/check → POST
// 브라우저가 이미 세션을 가졌지만 로그인 안 한 상태 시뮬레이션

// 1단계: auth/check에서 새 세션 + userId 설정
console.log('=== 시나리오: auth/check → POST (정상 플로우) ===');
const req1 = http.request('http://localhost:5858/api/auth/check', (res1) => {
  const cookies = res1.headers['set-cookie'] || [];
  const sid = cookies.find(c => c.startsWith('connect.sid'));
  const cookie = sid ? sid.split(';')[0] : '';
  let body1 = '';
  res1.on('data', d => body1 += d);
  res1.on('end', () => {
    console.log('[1] auth/check:', res1.statusCode, 'cookie:', cookie ? 'SET' : 'NONE');

    // 2단계: 같은 세션으로 POST
    const postData = JSON.stringify({ todoRootNodeId: 'BTW5XOTCJ0' });
    const req2 = http.request('http://localhost:5858/api/user/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res2) => {
      let body2 = '';
      res2.on('data', d => body2 += d);
      res2.on('end', () => {
        console.log('[2] POST:', res2.statusCode, body2.substring(0, 80));
        console.log('[결과]', res2.statusCode === 200 ? 'PASS' : 'FAIL');

        // 시나리오 2: 로그인 → POST
        testLoginFlow();
      });
    });
    req2.write(postData);
    req2.end();
  });
});
req1.end();

function testLoginFlow() {
  console.log('\n=== 시나리오: login(bril) → POST ===');
  const loginData = JSON.stringify({ username: 'bril', password: '1' });
  const req1 = http.request('http://localhost:5858/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(loginData) }
  }, (res1) => {
    const cookies = res1.headers['set-cookie'] || [];
    const sid = cookies.find(c => c.startsWith('connect.sid'));
    const cookie = sid ? sid.split(';')[0] : '';
    let body1 = '';
    res1.on('data', d => body1 += d);
    res1.on('end', () => {
      console.log('[1] login:', res1.statusCode, body1.substring(0, 60));

      const postData = JSON.stringify({ todoRootNodeId: 'BTW5XOTCJ0' });
      const req2 = http.request('http://localhost:5858/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie,
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res2) => {
        let body2 = '';
        res2.on('data', d => body2 += d);
        res2.on('end', () => {
          console.log('[2] POST:', res2.statusCode, body2.substring(0, 80));
          console.log('[결과]', res2.statusCode === 200 ? 'PASS' : 'FAIL');
        });
      });
      req2.write(postData);
      req2.end();
    });
  });
  req1.write(loginData);
  req1.end();
}
