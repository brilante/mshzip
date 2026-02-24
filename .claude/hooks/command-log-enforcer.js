/**
 * Phase0->CC: 명령 이력 자동 등록 Hook
 * Write/Edit 도구 호출 전 명령 노드 존재 여부를 확인
 * 상태 파일이 없으면 자동으로 날짜 경로 탐색/생성 후 명령 노드를 생성
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const MM_API = path.join(PROJECT_ROOT, 'testpy', 'mm-api.js');
const TODO_ROOT = 'BTW5XOTCJ0';

try {
  // 1. SSE_PORT 기반 상태 파일 경로 결정
  const ssePort = process.env.CLAUDE_CODE_SSE_PORT || '';
  const claudeDir = path.join(__dirname, '..');
  const stateFile = ssePort
    ? path.join(claudeDir, `current-command-node-${ssePort}`)
    : path.join(claudeDir, 'current-command-node');

  // 2. 상태 파일 존재 → 통과
  if (fs.existsSync(stateFile)) {
    process.exit(0);
  }

  // 3. 범용 fallback 파일 확인
  if (ssePort) {
    const fallbackFile = path.join(claudeDir, 'current-command-node');
    if (fs.existsSync(fallbackFile)) {
      process.exit(0);
    }
  }

  // 4. mm-api.js 존재 확인
  if (!fs.existsSync(MM_API)) {
    console.error('[명령이력] mm-api.js 없음, 자동 등록 불가');
    process.exit(0);
  }

  // 5. 마인드맵 서버 접속 확인 (빠른 타임아웃)
  try {
    execSync('node -e "const h=require(\'http\');const r=h.get(\'http://localhost:4848/api/health\',{timeout:2000},res=>{process.exit(res.statusCode===200?0:1)});r.on(\'error\',()=>process.exit(1))"', { timeout: 3000, stdio: 'ignore' });
  } catch {
    // 마인드맵 서버 미실행 → 경고만 출력
    console.error('[명령이력] 마인드맵 서버(4848) 미실행, 자동 등록 건너뜀');
    process.exit(0);
  }

  // 6. 날짜 경로 탐색/생성: 년도 → 년월 → 년월일
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const yyyyMM = yyyy + String(now.getMonth() + 1).padStart(2, '0');
  const yyyyMMdd = yyyyMM + String(now.getDate()).padStart(2, '0');

  function mmExec(args) {
    return execSync(`node "${MM_API}" --mm todo ${args}`, {
      cwd: PROJECT_ROOT, timeout: 10000, encoding: 'utf-8'
    }).trim();
  }

  function findChild(parentId, title) {
    const output = mmExec(`children ${parentId}`);
    for (const line of output.split('\n')) {
      const match = line.match(/^(\S+):\s*(.+)$/);
      if (match && match[2].trim() === title) return match[1];
    }
    return null;
  }

  function findOrCreate(parentId, title) {
    const existing = findChild(parentId, title);
    if (existing) return existing;
    const result = mmExec(`add-child ${parentId} "${title}"`);
    try {
      const parsed = JSON.parse(result);
      if (parsed.success && parsed.nodeId) return parsed.nodeId;
    } catch {}
    return null;
  }

  // 년도 → 년월 → 년월일 순서로 탐색/생성
  const yearId = findOrCreate(TODO_ROOT, yyyy);
  if (!yearId) { console.error('[명령이력] 년도 노드 생성 실패'); process.exit(0); }

  const monthId = findOrCreate(yearId, yyyyMM);
  if (!monthId) { console.error('[명령이력] 년월 노드 생성 실패'); process.exit(0); }

  const dayId = findOrCreate(monthId, yyyyMMdd);
  if (!dayId) { console.error('[명령이력] 년월일 노드 생성 실패'); process.exit(0); }

  // 7. 기존 명령 노드 수 확인 → 다음 번호 결정
  const dayChildren = mmExec(`children ${dayId}`);
  let nextNum = 1;
  for (const line of dayChildren.split('\n')) {
    const match = line.match(/^(\S+):\s*(\d+)\./);
    if (match) {
      const num = parseInt(match[2]);
      if (num >= nextNum) nextNum = num + 1;
    }
  }

  // 8. 명령 노드 자동 생성 (--set-current)
  const title = `${nextNum}. 세션 작업`;
  const content = `세션 자동 등록 (${yyyyMMdd} ${now.toTimeString().slice(0, 5)})`;
  const result = mmExec(`--set-current add-child ${dayId} "${title}" "${content}"`);

  try {
    const parsed = JSON.parse(result);
    if (parsed.success) {
      console.error(`[명령이력] 자동 등록 완료: ${parsed.nodeId} → "${title}"`);
    }
  } catch {
    console.error('[명령이력] 자동 등록 결과 파싱 실패:', result);
  }

} catch (e) {
  // 전체 실패 시 차단하지 않고 통과
  console.error('[명령이력] 자동 등록 중 오류:', e.message);
}
