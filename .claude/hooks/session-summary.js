#!/usr/bin/env node
/**
 * Claude Code Stop hook — 세션 요약 자동 기록
 *
 * 동작:
 *   1. 세션 로그에서 도구 사용 집계
 *   2. 프로젝트 TODO 마인드맵에 세션 요약 기록
 *      - 마인드맵 이름 하드코딩 없음 — parentId로 mindmapId 자동 조회
 *
 * ⚠️ 상태파일 삭제 금지
 *   Stop hook은 "Claude 응답 한 번 완료"마다 실행됩니다.
 *   여기서 상태파일을 삭제하면:
 *     --set-current → STATE_FILE 생성
 *     → Claude 응답 완료 → Stop hook → STATE_FILE 삭제 ❌
 *     → 다음 도구 → A게이트 → 파일 없음 → 다시 차단
 *     → A 노드만 계속 생성, A-1/A-2 절대 연결 불가
 *   상태파일은 오직 mm-api.js --set-current 실행 시에만 초기화됩니다.
 */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── 설정 ─────────────────────────────────────────────────────────────

require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env'),
  quiet: true
});

const PORT        = parseInt(process.env.PORT) || 5858;

// ══════════════════════════════════════════════════════
//  TODO 활성화 여부 확인 (.env AGENT_SKILLS_TODO)
//  false 일 때 세션 요약 미생성
// ══════════════════════════════════════════════════════
function isTodoEnabled() {
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^AGENT_SKILLS_TODO=(.*)$/m);
    return !match || match[1].trim() !== 'false';
  } catch {
    return true;
  }
}

if (!isTodoEnabled()) process.exit(0); // TODO 비활성 → 세션 요약 미생성
const PROJECT_DIR = path.join(__dirname, '..', '..');
const CLAUDE_DIR  = path.join(__dirname, '..');
const ACCESS_KEY  = fs.readFileSync('G:/USER/brilante33/.mymindmp3', 'utf-8').trim();
const HASH        = crypto.createHash('sha256').update(ACCESS_KEY).digest('hex');

// ── 세션 ID ──────────────────────────────────────────────────────────

function resolveSessionId() {
  if (process.env.CLAUDE_CODE_SSE_PORT) return process.env.CLAUDE_CODE_SSE_PORT;
  const ppid = process.ppid;
  if (ppid && ppid > 0) return `PID_${ppid}`;
  return null;
}
const SESSION_ID = resolveSessionId();

// 세션별 상태파일 경로
function sessionFile(name) {
  if (!SESSION_ID) return null;
  return path.join(CLAUDE_DIR, `${name}-${SESSION_ID}`);
}
const STATE_FILE          = sessionFile('current-command-node');  // A
const PLANNING_FILE       = sessionFile('planning-node');          // A-1
const RESULT_FILE         = sessionFile('result-node');            // A-2
const SUMMARY_WRITTEN_FILE = sessionFile('summary-written');       // 세션요약 중복방지 (mm-api.js --set-current 시 초기화됨)

// ── 공유 락 파일 (모든 세션 공통) ─────────────────────────────────────
//  크로스 세션 race condition 방지:
//  여러 터미널의 Stop hook이 동시에 실행될 때 하나만 진행하도록 락을 잡음
const SHARED_LOCK_FILE = path.join(CLAUDE_DIR, 'session-summary.lock');
const LOCK_TIMEOUT_MS  = 10000;  // 10초 이상 유지된 락은 stale로 간주

function acquireLock() {
  const now = Date.now();
  // stale 락 제거 (10초 초과)
  if (fs.existsSync(SHARED_LOCK_FILE)) {
    try {
      const lockAge = now - parseInt(fs.readFileSync(SHARED_LOCK_FILE, 'utf-8').trim(), 10);
      if (lockAge > LOCK_TIMEOUT_MS) {
        fs.unlinkSync(SHARED_LOCK_FILE);  // stale 락 강제 해제
      } else {
        return false;  // 유효한 락 존재 → 획득 실패
      }
    } catch { return false; }
  }
  try {
    // 락 획득: 타임스탬프 기록
    fs.writeFileSync(SHARED_LOCK_FILE, String(now), { flag: 'wx' });  // 'wx' = exclusive create
    return true;
  } catch { return false; }  // 동시 생성 경쟁 실패 → 다른 세션이 먼저 획득
}

function releaseLock() {
  try { fs.unlinkSync(SHARED_LOCK_FILE); } catch {}
}

// ── 로그 파일 ─────────────────────────────────────────────────────────

const logsDir = path.join(CLAUDE_DIR, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const today   = new Date().toISOString().slice(0, 10);
const logFile = path.join(logsDir, `session-${today}.log`);

// ── HTTP 유틸리티 ─────────────────────────────────────────────────────

function mmRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: PORT, path: apiPath, method,
      headers: {
        'X-Access-Key-Hash': HASH,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── 서버 연결 확인 ────────────────────────────────────────────────────

async function checkServer() {
  try {
    const r = await mmRequest('GET', '/api/skill/ping');
    return !!(r && r.success);
  } catch { return false; }
}

// ── 자식 노드 목록 조회 (중복 방지용) ───────────────────────────────
//   타이틀 → nodeId 맵 반환. 실패 시 빈 Map.

async function getChildrenMap(nodeId) {
  try {
    const r = await mmRequest('GET', `/api/skill/node/${nodeId}`);
    const map = new Map();
    for (const c of (r?.node?.children || [])) map.set(c.title, c.id);
    return map;
  } catch { return new Map(); }
}

// ── 노드 추가 (마인드맵 이름 없이) ───────────────────────────────────
//   1. GET /node/:parentId → mindmapId 조회
//   2. PATCH /mindmap/:mindmapId → 노드 추가
//   3. nodeId: r.newNodeIds 우선 사용 (mm-api.js와 동일, race condition 제거)

async function addChild(parentId, title, content) {
  const parentInfo = await mmRequest('GET', `/api/skill/node/${parentId}`);
  if (!parentInfo || !parentInfo.mindmapId) return null;
  const mmEnc = encodeURIComponent(parentInfo.mindmapId);
  const node  = { title };
  if (content) node.content = content;
  const r = await mmRequest('PATCH', `/api/skill/mindmap/${mmEnc}`, {
    operations: [{ op: 'add', parentId, node }]
  });
  if (r?.success && r.applied > 0) {
    // 1순위: 서버 응답 newNodeIds (race condition 없음)
    if (r.newNodeIds && r.newNodeIds.length > 0) return r.newNodeIds[0];
    // 2순위: 부모 재조회 마지막 자식 (구버전 서버 fallback)
    const parent = await mmRequest('GET', `/api/skill/node/${parentId}`);
    const last   = parent?.node?.children?.slice(-1)[0];
    return last?.id || null;
  }
  return null;
}

// ── 노드 내용 append ──────────────────────────────────────────────────

async function appendNode(nodeId, content) {
  return mmRequest('PUT', `/api/skill/node/${nodeId}`, { append: content });
}

// ── 노드 내용 수정 (마인드맵 이름 없이) ─────────────────────────────
//   PUT /node/:nodeId — mindmapId 불필요 (서버가 자동 탐색)

async function writeNode(nodeId, content) {
  return mmRequest('PUT', `/api/skill/node/${nodeId}`, { content });
}


// ── 로그 집계 ─────────────────────────────────────────────────────────

function buildToolSummary() {
  if (!fs.existsSync(logFile)) return '기록 없음';
  const lines = fs.readFileSync(logFile, 'utf-8').trim().split('\n');
  const counts = {};
  for (const line of lines) {
    if (line.startsWith('===') || line.startsWith('[session-summary]')) continue;
    const m = line.match(/^\[\d{4}-\d{2}-\d{2}T[\d:.]+Z\] ([A-Za-z:가-힣]+)/);
    if (m && m[1]) counts[m[1]] = (counts[m[1]] || 0) + 1;
  }
  const total  = Object.values(counts).reduce((a, b) => a + b, 0);
  const detail = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([t, c]) => `${t}: ${c}회`)
    .join(', ');
  return `총 ${total}회 (${detail || '없음'})`;
}

// ── 메인 ─────────────────────────────────────────────────────────────

async function main() {
  const timestamp = new Date().toISOString();

  // ══════════════════════════════════════════════════════════════════
  //  [중복방지 1] SUMMARY_WRITTEN_FILE — 단일 세션 내 Stop hook 반복 실행 차단
  //   Stop hook은 Claude 응답 1번 완료마다 실행됨.
  //   같은 세션에서 이미 세션 요약을 작성했으면 즉시 종료.
  //   SUMMARY_WRITTEN_FILE은 mm-api.js --set-current 시 자동 초기화됨.
  // ══════════════════════════════════════════════════════════════════
  if (SUMMARY_WRITTEN_FILE && fs.existsSync(SUMMARY_WRITTEN_FILE)) {
    process.exit(0);
  }

  // ══════════════════════════════════════════════════════════════════
  //  [중복방지 2] 공유 락 획득 — 크로스 세션 race condition 방지
  //   여러 터미널의 Stop hook이 동시에 실행될 때,
  //   락을 획득한 세션만 실제 노드 생성을 진행.
  //   락 실패 시: 이 세션은 건너뜀 (SUMMARY_WRITTEN_FILE 미설정 → 다음 번에 재시도 가능)
  // ══════════════════════════════════════════════════════════════════
  const gotLock = acquireLock();
  if (!gotLock) {
    fs.appendFileSync(
      logFile,
      `[session-summary] ⏳ 락 획득 실패 — 다른 세션이 진행 중, 건너뜀 (SESSION_ID=${SESSION_ID})\n`,
      'utf-8'
    );
    process.exit(0);
  }

  // 상태파일 존재 여부 확인
  const stateExists = STATE_FILE && fs.existsSync(STATE_FILE);
  const targetNodeId = stateExists ? fs.readFileSync(STATE_FILE, 'utf-8').trim() : null;

  fs.appendFileSync(
    logFile,
    `[session-summary] SESSION_ID=${SESSION_ID}, STATE_FILE=${STATE_FILE}, ` +
    `exists=${stateExists}, targetNodeId=${targetNodeId}, resolveMethod=session-file\n`,
    'utf-8'
  );

  // 서버 미실행 시 graceful exit
  const serverOk = await checkServer();
  if (!serverOk) {
    fs.appendFileSync(logFile, `[session-summary] 서버 미실행 — 기록 건너뜀\n`, 'utf-8');
    process.exit(0);
  }

  // 노드 없으면 기록 불가
  if (!targetNodeId) {
    fs.appendFileSync(logFile, `[session-summary] 명령 노드 없음 — 기록 건너뜀\n`, 'utf-8');
    process.exit(0);
  }

  // ── 도구 요약 ────────────────────────────────────────────────────────

  const toolSummary = buildToolSummary();

  // ── TODO 마인드맵 기록 ────────────────────────────────────────────────

  try {
    // ══════════════════════════════════════════════════════════════════
    //  [중복방지 2] 서버 실제 자식 노드 조회 — 크로스 세션 중복 방지
    //   다른 터미널의 Claude가 이미 해당 타이틀의 노드를 생성했으면
    //   새로 생성하지 않고 기존 노드에 append하거나 skip함.
    // ══════════════════════════════════════════════════════════════════
    const childrenMap = await getChildrenMap(targetNodeId);

    // A-3 세션 요약 기록
    const summaryContent =
      `<h3>세션 요약 (${timestamp})</h3>` +
      `<p>세션 ID: ${SESSION_ID}</p>` +
      `<p>도구 사용: ${toolSummary}</p>`;

    const existingSummaryId = childrenMap.get('세션 요약');
    if (existingSummaryId) {
      // 이미 세션 요약 존재 → 기존 노드에 이 세션 정보 append (새 노드 생성 금지)
      await appendNode(existingSummaryId,
        `<hr><p>추가 세션 (${SESSION_ID}, ${timestamp})</p>` +
        `<p>도구 사용: ${toolSummary}</p>`);
      fs.appendFileSync(logFile, `[session-summary] ✅ 기존 세션요약 노드에 append (nodeId: ${existingSummaryId})\n`, 'utf-8');
    } else {
      // 세션 요약 없음 → 새로 생성
      await addChild(targetNodeId, '세션 요약', summaryContent);
      fs.appendFileSync(logFile, `[session-summary] ✅ 세션요약 노드 신규 생성\n`, 'utf-8');
    }

    // A-2 수행결과 누락 확인 및 플레이스홀더 생성
    const resultExists = RESULT_FILE && fs.existsSync(RESULT_FILE);
    if (!resultExists) {
      const planningExists = PLANNING_FILE && fs.existsSync(PLANNING_FILE);
      if (planningExists) {
        if (childrenMap.has('수행 및 테스트 결과')) {
          // 이미 존재 (다른 세션이 생성) → skip
          fs.appendFileSync(logFile, `[session-summary] ✅ 수행결과 노드 이미 존재 — 플레이스홀더 생성 skip\n`, 'utf-8');
        } else {
          const placeholderContent =
            `<p>⚠️ 수행 결과 미기록 — 세션 종료 시 자동 생성됨</p>` +
            `<p>세션 ID: ${SESSION_ID}</p>` +
            `<p>시간: ${timestamp}</p>` +
            `<p>도구 사용: ${toolSummary}</p>` +
            `<p>수동 등록: <code>node testpy/mm-api.js --set-result add-child ${targetNodeId} "수행 및 테스트 결과" "&lt;결과&gt;"</code></p>`;
          await addChild(targetNodeId, '수행 및 테스트 결과', placeholderContent);
          fs.appendFileSync(logFile, `[session-summary] ⚠️ A-2(수행결과) 누락 → 플레이스홀더 자동 생성\n`, 'utf-8');
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════
    //  SUMMARY_WRITTEN_FILE 생성 — 이 세션의 Stop hook 재실행 방지
    // ══════════════════════════════════════════════════════════════════
    if (SUMMARY_WRITTEN_FILE) {
      fs.writeFileSync(SUMMARY_WRITTEN_FILE, timestamp, 'utf-8');
    }

    fs.appendFileSync(logFile, `[session-summary] 세션(${SESSION_ID}) 요약 완료 (상태파일 유지)\n`, 'utf-8');

    // 세션 로그 집계 기록
    fs.appendFileSync(
      logFile,
      `=== 세션 요약 (${timestamp}) ===\n${toolSummary}\n`,
      'utf-8'
    );

  } catch (e) {
    fs.appendFileSync(logFile, `[session-summary] 오류: ${e.message}\n`, 'utf-8');
  } finally {
    releaseLock();  // 성공/실패 무관하게 반드시 락 해제
  }

  // ══════════════════════════════════════════════════════════════════
  //  ⚠️ 상태파일 삭제 금지
  //
  //  Stop hook은 "Claude 응답 한 번 완료"마다 실행됩니다.
  //  여기서 상태파일을 삭제하면:
  //   → --set-current → STATE_FILE 생성
  //   → Claude 응답 완료 → Stop hook → STATE_FILE 삭제 ❌
  //   → 다음 도구 → A게이트 → 파일 없음 → 다시 차단
  //   → 매번 새 A 노드 요구 → A-1, A-2 연결 불가
  //
  //  상태파일은 오직 mm-api.js --set-current 실행 시에만 초기화됩니다.
  // ══════════════════════════════════════════════════════════════════
  // 상태파일 유지 (삭제 금지 — 파일 삭제는 mm-api.js --set-current만 수행)
}

main().catch(e => {
  const logFile2 = path.join(CLAUDE_DIR, 'logs', `session-${new Date().toISOString().slice(0, 10)}.log`);
  try { fs.appendFileSync(logFile2, `[session-summary] 치명적 오류: ${e.message}\n`, 'utf-8'); } catch {}
  process.exit(0);
});
