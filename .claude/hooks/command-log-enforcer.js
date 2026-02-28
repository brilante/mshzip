/**
 * TODO 게이트 훅 — 모든 도구의 첫 번째 관문 (PreToolUse * 매처)
 *
 * 4단계 강제 구조:
 *   A   → 명령 노드 등록      (--set-current)  : 미등록 시 전체 차단
 *   A-1 → 계획수립 노드 생성  (--set-planning) : 미생성 시 모든 작업 차단
 *   A-2 → 수행결과 노드 생성  (--set-result)   : 미생성 시 다음 명령 등록 차단
 *
 * 설계 원칙:
 *   SESSION_ID 없으면 graceful 통과 (충돌 방지 우선)
 *   stateFile만 신뢰 — API 복원 없음 (stale 값 방지)
 *   API 복원 없음 — 세션 간 stale 값 복원 버그 방지
 *   마인드맵 이름 하드코딩 없음 — nodeId로 mindmapId 자동 조회
 */
const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const PORT = parseInt(process.env.PORT) || 5858;

// ══════════════════════════════════════════════════════
//  TODO 활성화 여부 확인 (.env AGENT_SKILLS_TODO)
//  false 일 때 즉시 exit(0) — 모든 검사 대신 바로 통과
// ══════════════════════════════════════════════════════
function isTodoEnabled() {
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^AGENT_SKILLS_TODO=(.*)$/m);
    return !match || match[1].trim() !== 'false';
  } catch {
    return true; // .env 없으면 기본 활성
  }
}

if (!isTodoEnabled()) process.exit(0); // TODO 비활성 → 게이트 없이 즉시 통과

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const MM_API       = path.join(PROJECT_ROOT, 'testpy', 'mm-api.js');

const ACCESS_KEY_PATH = 'G:/USER/brilante33/.mymindmp3';

function getAccessKeyHash() {
  if (fs.existsSync(ACCESS_KEY_PATH)) {
    return crypto.createHash('sha256')
      .update(fs.readFileSync(ACCESS_KEY_PATH, 'utf-8').trim())
      .digest('hex');
  }
  return null;
}

function resolveUserIdFromHash(hash) {
  try {
    const p = path.join(PROJECT_ROOT, 'config', 'access-keys-data.json');
    if (!fs.existsSync(p)) return null;
    const d = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return d.keys.find(k => k.key_hash === hash && k.is_active === 1)?.user_id || null;
  } catch { return null; }
}

function fetchTodoRootFromDb(userId) {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl || !userId) return null;
    return execSync(
      `node -e "const{Pool}=require('pg');const p=new Pool({connectionString:'${dbUrl}'});` +
      `p.query('SELECT setting_value FROM user_settings WHERE user_id=\\$1 AND setting_key=\\$2',` +
      `['${userId}','todoRootNodeId']).then(r=>{console.log(r.rows[0]?r.rows[0].setting_value:'');p.end()}).catch(()=>{console.log('');p.end()})"`,
      { timeout: 5000, encoding: 'utf-8' }
    ).trim() || null;
  } catch { return null; }
}

function resolveUsernameFromToken() {
  try {
    const token = process.env.LOGIN_OK_ACCESSKEY || '';
    if (!token.startsWith('lok_')) return null;
    const hexKey = process.env.ENCRYPTION_KEY;
    if (!hexKey) return null;
    const key = Buffer.from(hexKey, 'hex');
    if (key.length !== 32) return null;
    const buf = Buffer.from(token.slice(4), 'base64url');
    const iv  = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const d = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
    d.setAuthTag(tag);
    const plain = Buffer.concat([d.update(enc), d.final()]).toString('utf8');
    const payload = JSON.parse(plain);
    if (payload.e && payload.e * 1000 <= Date.now()) return null;
    return payload.n || null;
  } catch { return null; }
}

function fetchTodoRootSync() {
  const hash     = getAccessKeyHash();
  const apiToken = process.env.LOGIN_OK_ACCESSKEY || hash;
  if (apiToken) {
    try {
      const r = execSync(
        `node -e "const h=require('http');const r=h.get('http://localhost:${PORT}/api/user/settings',` +
        `{headers:{'X-Access-Key-Hash':'${apiToken}'},timeout:2000},` +
        `res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{const j=JSON.parse(d);` +
        `console.log(j.data&&j.data.todoRootNodeId||'')}catch{console.log('')}})});r.on('error',()=>console.log(''))}"`,
        { timeout: 3000, encoding: 'utf-8' }
      ).trim();
      if (r) return r;
    } catch {}
  }
  const username = resolveUsernameFromToken();
  const userId   = username || (hash ? resolveUserIdFromHash(hash) : null);
  return fetchTodoRootFromDb(userId);
}

// ── 출력 헬퍼 ──────────────────────────────────────────────────
function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: reason }
  }));
  process.exit(2);
}

function box(lines) {
  const BAR = '═'.repeat(68);
  console.error('');
  console.error('╔' + BAR + '╗');
  for (const line of lines) {
    if (line === '---') { console.error('╠' + BAR + '╣'); }
    else { console.error('║  ' + String(line).padEnd(66) + '║'); }
  }
  console.error('╚' + BAR + '╝');
  console.error('');
}

// ── stdin 파싱 ──────────────────────────────────────────────────
let toolInput = {};
try {
  const raw = fs.readFileSync(0, 'utf-8');
  const parsed = JSON.parse(raw);
  toolInput = {
    tool_name:  (parsed.tool_name || parsed.tool || '').toLowerCase(),
    tool_input: parsed.tool_input || parsed.input || parsed
  };
} catch {}

const toolName = toolInput.tool_name || '';
const isBash   = toolName === 'bash';
const bashCmd  = (isBash && toolInput.tool_input?.command) || '';
const inputStr = JSON.stringify(toolInput);

// ── 패턴 ───────────────────────────────────────────────────────
const SERVER_RESTART_PATTERNS = [
  'kill-server', '_internal/shutdown', '.server.pid',
  'quick-kill',  'node server.js', 'npm start', 'npm run dev', 'npm run start',
];
const isMmApiCall     = bashCmd.includes('mm-api.js') || inputStr.includes('mm-api.js');
const isSetCurrent    = bashCmd.includes('--set-current');
const isServerRestart = SERVER_RESTART_PATTERNS.some(p => bashCmd.includes(p) || inputStr.includes(p));

// ══════════════════════════════════════════════════════════════════
//  세션 ID 결정 (mm-api.js와 동일 로직 — 반드시 일치해야 함)
//   1순위: CLAUDE_CODE_SSE_PORT
//   2순위: PID_${process.ppid}
// ══════════════════════════════════════════════════════════════════
function resolveSessionId() {
  if (process.env.CLAUDE_CODE_SSE_PORT) return process.env.CLAUDE_CODE_SSE_PORT;
  const ppid = process.ppid;
  if (ppid && ppid > 0) return `PID_${ppid}`;
  return null;
}

const SESSION_ID = resolveSessionId();
const claudeDir  = path.join(__dirname, '..');

// 세션별 상태파일 경로 (SESSION_ID 없으면 null)
function sessionFile(name) {
  if (!SESSION_ID) return null;
  return path.join(claudeDir, `${name}-${SESSION_ID}`);
}

const stateFile    = sessionFile('current-command-node');  // A
const planningFile = sessionFile('planning-node');          // A-1
const resultFile   = sessionFile('result-node');            // A-2

// ── SESSION_ID 없으면 경고만 하고 graceful 통과 ──
if (!SESSION_ID) {
  console.error('[TODO게이트] ⚠️ SESSION_ID 결정 불가 — 상태추적 불가, 모든 도구 통과 (충돌 방지)');
  process.exit(0);
}

// ══════════════════════════════════════════════════════════════════
//  [A-2 게이트] --set-current 시도 시
//   이전 명령의 A-2(수행결과) 노드 미완료 → 새 명령 등록 차단
// ══════════════════════════════════════════════════════════════════
if (isSetCurrent) {
  if (stateFile && fs.existsSync(stateFile) && resultFile && !fs.existsSync(resultFile)) {
    const prevNodeId = fs.readFileSync(stateFile, 'utf-8').trim();
    box([
      '[A-2 게이트] 🚫 새 명령 등록 차단: 이전 명령의 수행결과 노드 미생성',
      '---',
      `세션 ID : ${SESSION_ID}`,
      `이전 명령 노드 ID : ${prevNodeId}`,
      '',
      '새 명령(--set-current) 등록 전 A-2(수행 및 테스트 결과) 노드를 생성하세요.',
      '',
      'A-2 노드 생성 (--set-result 필수):',
      `  node testpy/mm-api.js --set-result \\`,
      `    add-child ${prevNodeId} "수행 및 테스트 결과" "<결과 HTML>"`,
      '',
      '내용: 실제 수행 결과, 테스트 통과/실패, 변경 파일 목록',
    ]);
    deny(`[A-2게이트] 차단: 이전 명령(${prevNodeId})의 수행결과 노드 미생성. --set-result 실행 후 재시도`);
  }
  // A-2 완료 또는 첫 명령 → 통과
  process.exit(0);
}

// ── mm-api.js 호출 → 통과 ──
if (isMmApiCall) process.exit(0);

// ── 서버 재시작 → 통과 ──
if (isServerRestart) process.exit(0);

// ══════════════════════════════════════════════════════════════════
//  이하: 일반 작업 도구 (Bash/Read/Grep/Write/Edit 등) 처리
// ══════════════════════════════════════════════════════════════════
try {

  // ── [A 게이트] stateFile 확인 ────────────────────────────────
  // stateFile이 유일한 진실의 원천. API 복원 없음 (stale 값 방지).
  const hasState = stateFile && fs.existsSync(stateFile);

  if (!hasState) {
    // graceful degradation
    if (!fs.existsSync(MM_API)) {
      console.error('[TODO게이트] ⚠️ mm-api.js 없음 — 명령 이력 기록 불가 (통과)');
      process.exit(0);
    }
    try {
      execSync(
        `node -e "const h=require('http');const r=h.get('http://localhost:${PORT}/api/health',` +
        `{timeout:2000},res=>{process.exit(res.statusCode===200?0:1)});r.on('error',()=>process.exit(1))"`,
        { timeout: 3000, stdio: 'ignore' }
      );
    } catch {
      console.error('[TODO게이트] ⚠️ 마인드맵 서버 미실행 — 명령 이력 기록 불가 (통과)');
      process.exit(0);
    }

    const TODO_ROOT = fetchTodoRootSync();
    if (!TODO_ROOT) {
      box([
        '[TODO게이트] ⚠️ todoRootNodeId 미설정',
        '---',
        '설정 > Agent Skills > TODO Node ID (todoRootNodeId) 를 등록해주세요.',
        '또는 API: POST /api/user/settings { "todoRootNodeId": "<노드ID>" }',
      ]);
      process.exit(0);
    }

    // KST(UTC+9) 기준 날짜 계산
    const _now2    = new Date();
    const _kst2    = new Date(_now2.getTime() + 9 * 60 * 60 * 1000);
    const yyyy     = String(_kst2.getUTCFullYear());
    const yyyyMM   = yyyy + String(_kst2.getUTCMonth() + 1).padStart(2, '0');
    const yyyyMMdd = yyyyMM + String(_kst2.getUTCDate()).padStart(2, '0');

    function mmExec(a) {
      return execSync(`node "${MM_API}" ${a}`, {
        cwd: PROJECT_ROOT, timeout: 10000, encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim();
    }
    function findChild(parentId, title) {
      const output = mmExec(`children ${parentId}`);
      for (const line of output.split('\n')) {
        const m = line.match(/^(\S+):\s*(.+)$/);
        if (m && m[2].trim() === title) return m[1];
      }
      return null;
    }
    function findOrCreate(parentId, title) {
      const ex = findChild(parentId, title);
      if (ex) return ex;
      const r = mmExec(`add-child ${parentId} "${title}"`);
      try { const p = JSON.parse(r); if (p.success && p.nodeId) return p.nodeId; } catch {}
      return findChild(parentId, title);
    }

    let dayNodeId = null;
    try {
      const yId = findOrCreate(TODO_ROOT, yyyy);
      if (yId) {
        const mId = findOrCreate(yId, yyyyMM);
        if (mId) dayNodeId = findOrCreate(mId, yyyyMMdd);
      }
    } catch (e) {
      console.error('[TODO게이트] 날짜 경로 준비 중 오류:', e.message);
    }

    const toolLabel = toolName || '도구';
    const dayId     = dayNodeId || `<${yyyyMMdd}노드ID>`;
    box([
      `[A 게이트] 🚫 차단 (${toolLabel}): 명령 노드 미등록`,
      '---',
      `세션 ID : ${SESSION_ID}`,
      '',
      '모든 도구(Bash/Read/Grep/Write/Edit/Task 등)는 A 노드 등록 후 실행 가능',
      '',
      dayNodeId
        ? `✅ ${yyyyMMdd} 날짜 노드 자동 생성됨: ${dayNodeId}`
        : `⚠️  ${yyyyMMdd} 날짜 노드 생성 실패 (수동 확인 필요)`,
      '',
      'A 명령 노드 생성 (--set-current 필수):',
      `  node testpy/mm-api.js --set-current \\`,
      `    add-child ${dayId} "N. 명령요약" "사용자 명령 원문"`,
      '',
      '❌ "세션 작업" 등 범용 제목 금지',
      '✅ 사용자 실제 명령을 요약한 제목만 허용',
    ]);
    deny(`[A게이트] ${toolLabel} 차단: 명령 노드 미등록. --set-current 실행 후 재시도`);
  }

  // ══════════════════════════════════════════════════════════════
  //  [A-1 게이트] stateFile 있음 → planningFile 확인
  //   mm-api.js / 서버재시작은 이미 위에서 통과됨
  //   나머지 모든 도구 → A-1 없으면 차단
  // ══════════════════════════════════════════════════════════════
  if (planningFile && !fs.existsSync(planningFile)) {
    const cmdNodeId = fs.readFileSync(stateFile, 'utf-8').trim();

    // ══════════════════════════════════════════════════════════════
    //  [마인드맵 실제 자식 확인] 크로스 세션 중복 방지
    //  다른 터미널의 Claude가 이미 계획수립 노드를 생성했을 수 있음.
    //  서버에서 확인 후 이미 있으면 PLANNING_FILE 재사용 후 통과.
    // ══════════════════════════════════════════════════════════════
    try {
      const hashVal = getAccessKeyHash();
      if (hashVal) {
        const existingPlanningId = execSync(
          `node -e "const h=require('http');` +
          `h.get('http://localhost:${PORT}/api/skill/node/${cmdNodeId}',` +
          `{headers:{'X-Access-Key-Hash':'${hashVal}'},timeout:2000},` +
          `res=>{let d='';res.on('data',c=>d+=c);` +
          `res.on('end',()=>{try{const r=JSON.parse(d);` +
          `const c=r.node&&r.node.children&&r.node.children.find(x=>x.title==='\\uba85\\ub839 \\uc218\\ud589 \\uacc4\\ud68d\\uc218\\ub9bd');` +
          `console.log(c?c.id:'')}catch{console.log('')}})}).on('error',()=>console.log(''))"`,
          { timeout: 3000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        ).trim();
        if (existingPlanningId && /^[A-Za-z0-9_-]+$/.test(existingPlanningId)) {
          // 다른 세션이 생성한 planning 노드 재사용
          fs.writeFileSync(planningFile, existingPlanningId, 'utf-8');
          console.error(`[TODO게이트] ✅ 기존 계획수립 노드 재사용 — PLANNING_FILE 자동 복원 (nodeId: ${existingPlanningId}, 세션: ${SESSION_ID})`);
          process.exit(0);
        }
      }
    } catch { /* 서버 확인 실패 시 기존 차단 로직 진행 */ }

    box([
      `[A-1 게이트] 🚫 차단 (${toolName || '도구'}): 계획수립 노드 미생성`,
      '---',
      `세션 ID : ${SESSION_ID}`,
      `명령 노드 ID : ${cmdNodeId}`,
      '',
      '모든 작업 도구는 A-1(명령 수행 계획수립) 노드 생성 후 실행 가능',
      '(Read/Grep/Bash/Write/Edit 전부 차단)',
      '',
      'A-1 노드 생성 (--set-planning 필수):',
      `  node testpy/mm-api.js --set-planning \\`,
      `    add-child ${cmdNodeId} "명령 수행 계획수립" "<계획 HTML>"`,
      '',
      '내용: 명령 분석, 영향 범위, 구현 단계',
      'Mermaid 다이어그램 필수 포함 (flowchart / sequenceDiagram / classDiagram 등 적합한 형식 선택)',
    ]);
    deny(`[A-1게이트] ${toolName || '도구'} 차단: 계획수립 노드 미생성. --set-planning 실행 후 재시도`);
  }

  // 모든 게이트 통과
  process.exit(0);

} catch (e) {
  console.error('[TODO게이트] 훅 실행 중 오류:', e.message);
  process.exit(0);
}
