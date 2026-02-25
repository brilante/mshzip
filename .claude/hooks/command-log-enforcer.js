/**
 * Phase0->CC: 명령 이력 차단 Hook (Precondition Enforcement)
 * Bash/Write/Edit 도구 호출 전 명령 노드 존재 여부를 확인
 * 상태 파일이 없으면 Bash/Write/Edit를 차단(exit 1)하여 Claude가 --set-current로 명령 노드를 먼저 생성하도록 강제
 *
 * 프로그래밍 비유:
 *  - Git pre-commit hook: 검사 실패 → 커밋 차단
 *  - DB NOT NULL: 값 없으면 INSERT 실패
 *  - TypeScript required param: 인자 없으면 컴파일 실패
 *
 * 흐름:
 *  1. 상태 파일 있음 → 통과 (exit 0)
 *  2. Bash이고 mm-api.js / --set-current / api/health 포함 → 통과 (데드락 방지)
 *  3. 서버 미실행 또는 mm-api 없음 → 통과 (graceful degradation)
 *  4. 서버 정상 + 상태 파일 없음 → 날짜 경로 준비 후 차단 (exit 1)
 *
 * 날짜 경로(년도→년월→년월일)만 자동 생성하여 Claude가 바로 명령 노드를 만들 수 있도록 준비
 * "세션 작업" 같은 무의미한 노드 자동 생성은 하지 않음
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// .env에서 PORT 읽기 (독립 프로세스 실행 대응)
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const PORT = parseInt(process.env.PORT) || 5858;

const http = require('http');
const crypto = require('crypto');

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const MM_API = path.join(PROJECT_ROOT, 'testpy', 'mm-api.js');
const DEFAULT_TODO_ROOT = 'BTW5XOTCJ0';
const ACCESS_KEY_PATH = 'G:/USER/brilante33/.mymindmp3';

/**
 * user_settings DB에서 todoRootNodeId 동기 조회
 * (Hook은 동기 실행이므로 execSync 기반)
 */
function fetchTodoRootSync() {
  try {
    if (!fs.existsSync(ACCESS_KEY_PATH)) return DEFAULT_TODO_ROOT;
    const key = fs.readFileSync(ACCESS_KEY_PATH, 'utf-8').trim();
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const result = execSync(
      `node -e "const h=require('http');const r=h.get('http://localhost:${PORT}/api/user/settings',{headers:{'X-Access-Key-Hash':'${hash}'},timeout:2000},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{const j=JSON.parse(d);console.log(j.data&&j.data.todoRootNodeId||'')}catch{console.log('')}})});r.on('error',()=>console.log(''))"`,
      { timeout: 3000, encoding: 'utf-8' }
    ).trim();
    return result || DEFAULT_TODO_ROOT;
  } catch {
    return DEFAULT_TODO_ROOT;
  }
}

const TODO_ROOT = fetchTodoRootSync();

// ── stdin에서 도구 입력 읽기 (Bash 명령 예외 처리용) ──
let toolInput = {};
try {
  const raw = fs.readFileSync(0, 'utf-8'); // fd 0 = stdin
  toolInput = JSON.parse(raw);
} catch { /* stdin 없거나 JSON 파싱 실패 시 무시 */ }

const toolName = (toolInput.tool_name || '').toLowerCase();
const isBash = toolName === 'bash';

if (isBash) {
  const cmd = (toolInput.tool_input && toolInput.tool_input.command) || '';
  // 데드락 방지: mm-api.js 명령 / --set-current / 서버 헬스체크는 무조건 통과
  const BASH_EXEMPT_PATTERNS = [
    'mm-api.js',      // 마인드맵 API 헬퍼 (명령 노드 등록 자체)
    '--set-current',  // 명령 노드 생성 플래그
    'api/health',     // 서버 상태 확인
    'cc-check-validator', // CC체크 자체
    'session-summary',    // 세션 요약
    'current-command-node', // 상태 파일 직접 조작
  ];
  if (BASH_EXEMPT_PATTERNS.some(p => cmd.includes(p))) {
    process.exit(0);
  }
}

try {
  // 1. SSE_PORT 기반 상태 파일 경로 결정
  const ssePort = process.env.CLAUDE_CODE_SSE_PORT || '';
  const claudeDir = path.join(__dirname, '..');
  const stateFile = ssePort
    ? path.join(claudeDir, `current-command-node-${ssePort}`)
    : path.join(claudeDir, 'current-command-node');

  // 2. 상태 파일 존재 → 명령 노드가 이미 등록됨, 통과
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

  // 4. 상태 파일 없음 → 서버 상태에 따라 차단 또는 통과
  // Claude가 명령 수신 즉시 --set-current로 명령 노드를 생성해야 하는데 누락됨

  // 5. mm-api.js 없으면 인프라 부재 → 통과 (graceful degradation)
  if (!fs.existsSync(MM_API)) {
    console.error('[명령이력] ⚠️ mm-api.js 없음 - 명령 이력 기록 불가 (통과)');
    process.exit(0);
  }

  // 6. 마인드맵 서버 접근 가능 여부 확인
  let serverAvailable = false;
  try {
    execSync(`node -e "const h=require('http');const r=h.get('http://localhost:${PORT}/api/health',{timeout:2000},res=>{process.exit(res.statusCode===200?0:1)});r.on('error',()=>process.exit(1))"`, { timeout: 3000, stdio: 'ignore' });
    serverAvailable = true;
  } catch {
    // 서버 미실행 → 통과 (graceful degradation)
    console.error('[명령이력] ⚠️ 마인드맵 서버 미실행 - 명령 이력 기록 불가 (통과)');
    process.exit(0);
  }

  // 7. 서버 정상 + 상태 파일 없음 → 날짜 경로 준비 후 차단 (exit 1)
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

  // 날짜 경로만 준비 (년도 → 년월 → 년월일) — Claude가 바로 명령 노드를 만들 수 있도록
  try {
    const yearId = findOrCreate(TODO_ROOT, yyyy);
    if (yearId) {
      const monthId = findOrCreate(yearId, yyyyMM);
      if (monthId) {
        findOrCreate(monthId, yyyyMMdd);
      }
    }
  } catch (pathErr) {
    console.error('[명령이력] 날짜 경로 준비 중 오류:', pathErr.message);
  }

  // ★ 차단: Bash/Write/Edit 불가 — 먼저 --set-current로 명령 노드를 생성해야 함
  const blockedTool = isBash ? 'Bash' : 'Write/Edit';
  console.error('');
  console.error('╔══════════════════════════════════════════════════════════════╗');
  console.error(`║  [명령이력] 🚫 차단(${blockedTool}): 명령 노드 미등록               ║`);
  console.error('╠══════════════════════════════════════════════════════════════╣');
  console.error('║  Bash/Write/Edit 전에 --set-current로 명령 노드를 먼저 생성  ║');
  console.error('║                                                              ║');
  console.error('║  예시:                                                       ║');
  console.error('║  node testpy/mm-api.js --mm todo --set-current \\             ║');
  console.error('║    add-child <날짜노드ID> "N. 명령요약" "사용자 명령 원문"     ║');
  console.error('║                                                              ║');
  console.error('║  ❌ "세션 작업" 같은 범용 제목 금지                           ║');
  console.error('║  ✅ 사용자 실제 명령을 요약한 제목만 허용                     ║');
  console.error('╚══════════════════════════════════════════════════════════════╝');
  console.error('');
  process.exit(1);

} catch (e) {
  // 전체 실패 시 차단하지 않고 통과 (graceful degradation)
  console.error('[명령이력] 훅 실행 중 오류:', e.message);
  process.exit(0);
}
