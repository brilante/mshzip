/**
 * 마인드맵 API 헬퍼 (UTF-8 안전)
 * 마인드맵 이름 불필요 — parentId로 mindmapId 자동 조회
 *
 * 사용법: node testpy/mm-api.js [플래그] <명령> [인자...]
 *   read <nodeId>
 *   write <nodeId> <content>
 *   append <nodeId> <content>
 *   children <parentId>
 *   add-child <parentId> <title> [content]
 *
 * 세션 식별 (멀티 터미널 안전):
 *   CLAUDE_CODE_SSE_PORT (Claude Code 자동 설정, 항상 고유) → 최우선
 *   없으면 PID_${process.ppid} 자동 생성 → 터미널별 고유
 *   세션 ID가 없으면 상태파일 생성 거부 (충돌 방지)
 *
 * 상태파일 경로: .claude/{파일명}-{sessionId}
 *   current-command-node-{sessionId}  → A  (명령 노드)
 *   planning-node-{sessionId}         → A-1 (계획수립)
 *   result-node-{sessionId}           → A-2 (수행결과)
 *
 * --set-current: A  노드 생성 시 상태파일 + API 저장
 * --set-planning: A-1 노드 생성 시 상태파일 저장
 * --set-result:  A-2 노드 생성 시 상태파일 저장
 */
const http = require('http');
const zlib = require('zlib');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// .env에서 PORT 읽기
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const PORT = parseInt(process.env.PORT) || 5858;

// ══════════════════════════════════════════════════════════════════
//  인증 키 결정 (2단계 폴백)
//   1순위: .mymindmp3 Access Key sha256 해시
//   2순위: .env LOGIN_OK_ACCESSKEY 토큰 (로그인 후 자동 갱신)
// ══════════════════════════════════════════════════════════════════
let HASH;
try {
  const ACCESS_KEY = fs.readFileSync('G:/USER/brilante33/.mymindmp3', 'utf-8').trim();
  HASH = crypto.createHash('sha256').update(ACCESS_KEY).digest('hex');
} catch {
  // .mymindmp3 파일 없음 → LOGIN_OK 폴백 (정상 동작, 로그 없음)
  HASH = null;
}

// LOGIN_OK 토큰 (폴백용, 항상 로드)
const LOGIN_OK_TOKEN = process.env.LOGIN_OK_ACCESSKEY || null;
if (!HASH && !LOGIN_OK_TOKEN) {
  process.stderr.write('[mm-api] ⚠️ 인증 수단 없음: .mymindmp3 파일 없고 LOGIN_OK_ACCESSKEY도 없음\n');
}

// 실제 사용할 인증 키 (초기값, resolveAuthKey로 동적 전환)
let _activeHash = HASH || LOGIN_OK_TOKEN;

// ══════════════════════════════════════════════════════════════════
//  세션 ID 결정 (멀티 터미널 안전)
//   1순위: CLAUDE_CODE_SSE_PORT (Claude Code가 자동으로 설정, 항상 고유)
//   2순위: PID_${process.ppid}  (부모 프로세스 PID = 터미널별 고유)
//   없으면: 상태파일 생성 불가 → 충돌 방지
// ══════════════════════════════════════════════════════════════════
function resolveSessionId() {
  if (process.env.CLAUDE_CODE_SSE_PORT) return process.env.CLAUDE_CODE_SSE_PORT;
  const ppid = process.ppid;
  if (ppid && ppid > 0) return `PID_${ppid}`;
  return null;
}

const SESSION_ID = resolveSessionId();
const CLAUDE_DIR = path.join(__dirname, '..', '.claude');

// 세션별 상태파일 경로 (SESSION_ID 없으면 null → 저장 거부)
function sessionFile(name) {
  if (!SESSION_ID) return null;
  return path.join(CLAUDE_DIR, `${name}-${SESSION_ID}`);
}

const STATE_FILE           = sessionFile('current-command-node');  // A
const PLANNING_FILE        = sessionFile('planning-node');          // A-1
const RESULT_FILE          = sessionFile('result-node');            // A-2
const SUMMARY_WRITTEN_FILE = sessionFile('summary-written');        // 세션요약 중복 방지 (버그2 수정)

// API 설정 저장 키 (세션별 독립 → 다른 세션 값과 충돌 없음)
const CMD_NODE_API_KEY = SESSION_ID
  ? `currentCommandNodeId_${SESSION_ID}`
  : 'currentCommandNodeId';

function request(method, apiPath, body, authKey) {
  const key = authKey || _activeHash;
  return new Promise((resolve, reject) => {
    const jsonStr = body ? JSON.stringify(body) : null;

    const send = (bodyBuf, extraHeaders) => {
      const opts = {
        hostname: 'localhost', port: PORT,
        path: apiPath, method,
        headers: {
          'X-Access-Key-Hash': key,
          'Content-Type': 'application/json',
          ...(bodyBuf ? { 'Content-Length': bodyBuf.length, ...extraHeaders } : {})
        }
      };
      const req = http.request(opts, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve({ raw: data }); }
        });
      });
      req.on('error', reject);
      if (bodyBuf) req.write(bodyBuf);
      req.end();
    };

    if (jsonStr) {
      // UTF-8 JSON → gzip 압축 후 전송 (인코딩 문제 근본 해결)
      zlib.gzip(Buffer.from(jsonStr, 'utf-8'), (err, compressed) => {
        if (err) {
          // gzip 실패 시 plain으로 폴백
          send(Buffer.from(jsonStr, 'utf-8'), {});
        } else {
          send(compressed, { 'Content-Encoding': 'gzip' });
        }
      });
    } else {
      send(null, {});
    }
  });
}

/**
 * 인증 키 자동 폴백
 * .mymindmp3 해시로 ping 실패 시 LOGIN_OK 토큰으로 전환
 * 한번 결정되면 이후 모든 요청에 적용
 */
let _authResolved = false;
async function resolveAuthKey() {
  if (_authResolved) return;
  _authResolved = true;

  // _activeHash가 이미 설정되어 있으면 ping 테스트
  if (_activeHash) {
    const r = await request('GET', '/api/skill/ping', null, _activeHash).catch(() => null);
    if (r && r.success) return; // 현재 키 유효
  }

  // .mymindmp3 해시 실패 → LOGIN_OK 토큰 시도
  if (LOGIN_OK_TOKEN && _activeHash !== LOGIN_OK_TOKEN) {
    const r2 = await request('GET', '/api/skill/ping', null, LOGIN_OK_TOKEN).catch(() => null);
    if (r2 && r2.success) {
      _activeHash = LOGIN_OK_TOKEN;
      // .mymindmp3 없는 환경에서는 정상 폴백 — 로그 없음
      return;
    }
  }

  // .env 다시 읽기 (로그인 후 갱신된 토큰)
  try {
    const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8');
    const match = envContent.match(/^LOGIN_OK_ACCESSKEY=(.+)$/m);
    if (match && match[1] !== LOGIN_OK_TOKEN) {
      const freshToken = match[1].trim();
      const r3 = await request('GET', '/api/skill/ping', null, freshToken).catch(() => null);
      if (r3 && r3.success) {
        _activeHash = freshToken;
        process.stderr.write('[mm-api] .env에서 갱신된 LOGIN_OK 토큰으로 전환\n');
        return;
      }
    }
  } catch {}

  process.stderr.write('[mm-api] ⚠️ 모든 인증 수단 실패\n');
}

// 상태파일 안전 쓰기 (SESSION_ID 없으면 경고 후 스킵)
function safeWriteState(filePath, value, label) {
  if (!filePath) {
    process.stderr.write(`[mm-api] ⚠️ SESSION_ID 없음 — ${label} 상태파일 저장 불가 (충돌 방지)\n`);
    return false;
  }
  fs.writeFileSync(filePath, value, 'utf-8');
  return true;
}

// 상태파일 안전 삭제
function safeUnlink(filePath) {
  if (!filePath) return;
  try { fs.unlinkSync(filePath); } catch {}
}

// ══════════════════════════════════════════════════════════════════
//  mindmapId 자동 조회
//  GET /api/skill/node/:nodeId → 응답의 mindmapId 필드 사용
//  마인드맵 이름을 하드코딩하지 않음 — 언제든 변경 가능
// ══════════════════════════════════════════════════════════════════
async function resolveMindmapId(nodeId) {
  const r = await request('GET', `/api/skill/node/${nodeId}`);
  if (r.mindmapId) return r.mindmapId;
  throw new Error(`mindmapId 조회 실패 (nodeId: ${nodeId}): ${JSON.stringify(r)}`);
}

async function main() {
  // 인증 키 자동 결정 (폴백 포함)
  await resolveAuthKey();

  const rawArgs = process.argv.slice(2);

  // 플래그 파싱
  function popFlag(flag) {
    const idx = rawArgs.indexOf(flag);
    if (idx !== -1) { rawArgs.splice(idx, 1); return true; }
    return false;
  }
  const setCurrent  = popFlag('--set-current');
  const setPlanning = popFlag('--set-planning');
  const setResult   = popFlag('--set-result');

  const [cmd, ...args] = rawArgs;

  // 세션 정보 디버그 (--verbose 있을 때)
  if (rawArgs.includes('--verbose') || process.env.MM_API_DEBUG) {
    process.stderr.write(`[mm-api] SESSION_ID=${SESSION_ID}, STATE_FILE=${STATE_FILE}\n`);
  }

  switch (cmd) {
    case 'read': {
      const r = await request('GET', `/api/skill/node/${args[0]}`);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'write': {
      // PUT /node/:nodeId — mindmapId 불필요 (서버가 자동 탐색)
      const r = await request('PUT', `/api/skill/node/${args[0]}`, { content: args[1] });
      console.log(JSON.stringify(r));
      break;
    }
    case 'append': {
      // PUT /node/:nodeId — mindmapId 불필요 (서버가 자동 탐색)
      const r = await request('PUT', `/api/skill/node/${args[0]}`, { append: args[1] });
      console.log(JSON.stringify(r));
      break;
    }
    case 'children': {
      const r = await request('GET', `/api/skill/node/${args[0]}`);
      if (r.node && r.node.children) {
        r.node.children.forEach(c => console.log(`${c.id}: ${c.title}`));
      }
      break;
    }
    case 'add-child': {
      const parentId = args[0];
      const title    = args[1];
      const content  = args[2] || '';

      // ① --set-current 사용 시: parentId가 날짜 노드(yyyyMMdd, 8자리 숫자)인지 검증
      //    tmp_0 / tmp_1 / tmp_2 / 명령노드 등 잘못된 부모에 생성 차단
      if (setCurrent) {
        const parentInfo = await request('GET', `/api/skill/node/${parentId}`);
        const parentTitle = parentInfo?.node?.title || '';
        if (!/^\d{8}$/.test(parentTitle)) {
          const errMsg = `--set-current 오류: parentId(${parentId})의 노드 타이틀이 날짜 형식(yyyyMMdd)이 아님 → "${parentTitle}"\n날짜 노드 ID를 user-prompt-submit 훅이 안내한 값으로 다시 확인하세요`;
          process.stderr.write(`[mm-api] ❌ ${errMsg}\n`);
          console.log(JSON.stringify({ success: false, error: errMsg, parentId, parentTitle }));
          process.exit(1);
        }
      }

      // ② parentId로 mindmapId 자동 조회 (이름 하드코딩 없음)
      const mindmapId = await resolveMindmapId(parentId);
      const mmEnc = encodeURIComponent(mindmapId);

      // ③ 노드 추가
      const node = { title };
      if (content) node.content = content;
      const r = await request('PATCH', `/api/skill/mindmap/${mmEnc}`, {
        operations: [{ op: 'add', parentId, node }]
      });

      if (r.success && r.applied > 0) {
        // ③ 생성된 nodeId 취득 (버그1 수정: 레이스 컨디션 제거)
        //
        //  [기존 방식의 문제]
        //  Session A, B가 동시에 add-child 실행 시:
        //    A: PATCH → 노드 생성 완료
        //    B: PATCH → 노드 생성 완료 (거의 동시)
        //    A: GET parent → 마지막 자식 = B의 노드 → ❌ 잘못된 nodeId 취득
        //
        //  [수정 방식]
        //  서버가 PATCH 응답에 newNodeIds 포함 → 재조회 불필요
        //  서버 구버전 대비 fallback은 유지

        // 1순위: 서버 응답의 newNodeIds (레이스 컨디션 없음)
        let newNodeId = (r.newNodeIds && r.newNodeIds.length > 0) ? r.newNodeIds[0] : null;

        // 2순위: 부모 재조회 → 마지막 자식 (서버 구버전 fallback)
        if (!newNodeId) {
          const parent = await request('GET', `/api/skill/node/${parentId}`);
          if (parent.node && parent.node.children && parent.node.children.length > 0) {
            newNodeId = parent.node.children[parent.node.children.length - 1].id;
          }
        }

        if (newNodeId) {
          // ── A 노드 등록 (--set-current) ──────────────────────
          if (setCurrent) {
            if (!SESSION_ID) {
              process.stderr.write('[mm-api] ❌ SESSION_ID 없음 — --set-current 사용 불가.\n');
            } else {
              safeWriteState(STATE_FILE, newNodeId, 'A(current-command-node)');
              safeUnlink(PLANNING_FILE);
              safeUnlink(RESULT_FILE);
              safeUnlink(SUMMARY_WRITTEN_FILE);  // 새 명령 → 세션요약 초기화
              try {
                await request('POST', '/api/user/settings', { [CMD_NODE_API_KEY]: newNodeId });
              } catch { /* API 저장 실패 시 로컬만 사용 */ }
            }
          }

          // ── A-1 노드 등록 (--set-planning) ───────────────────
          if (setPlanning) {
            safeWriteState(PLANNING_FILE, newNodeId, 'A-1(planning-node)');
          }

          // ── A-2 노드 등록 (--set-result) ─────────────────────
          if (setResult) {
            safeWriteState(RESULT_FILE, newNodeId, 'A-2(result-node)');
          }

          console.log(JSON.stringify({ success: true, nodeId: newNodeId, title, sessionId: SESSION_ID }));
        } else {
          console.log(JSON.stringify({ success: true, applied: r.applied, note: 'nodeId 조회 실패' }));
        }
      } else {
        // applied:0 또는 실패
        console.log(JSON.stringify(r));
      }
      break;
    }
    case 'set-current': {
      // 활성 명령 노드 직접 지정 (상태파일 + API 세션별 키로 저장)
      const nodeId = args[0];
      if (!nodeId) { console.error('노드 ID를 입력하세요'); process.exit(1); }
      if (!SESSION_ID) {
        console.error('[mm-api] ❌ SESSION_ID 없음 — set-current 사용 불가');
        process.exit(1);
      }
      safeWriteState(STATE_FILE, nodeId, 'A(current-command-node)');
      safeUnlink(PLANNING_FILE);
      safeUnlink(RESULT_FILE);
      try {
        const r = await request('POST', '/api/user/settings', { [CMD_NODE_API_KEY]: nodeId });
        console.log(JSON.stringify({ success: true, nodeId, sessionId: SESSION_ID, apiKey: CMD_NODE_API_KEY, apiSaved: !!r?.success }));
      } catch {
        console.log(JSON.stringify({ success: true, nodeId, sessionId: SESSION_ID, apiKey: CMD_NODE_API_KEY, apiSaved: false }));
      }
      break;
    }
    case 'session-info': {
      const stateExists    = STATE_FILE    ? fs.existsSync(STATE_FILE)    : false;
      const planningExists = PLANNING_FILE ? fs.existsSync(PLANNING_FILE) : false;
      const resultExists   = RESULT_FILE   ? fs.existsSync(RESULT_FILE)   : false;
      const stateValue     = stateExists    ? fs.readFileSync(STATE_FILE, 'utf-8').trim() : null;
      const planningValue  = planningExists ? fs.readFileSync(PLANNING_FILE, 'utf-8').trim() : null;
      const resultValue    = resultExists   ? fs.readFileSync(RESULT_FILE, 'utf-8').trim() : null;
      console.log(JSON.stringify({
        sessionId:    SESSION_ID,
        apiKey:       CMD_NODE_API_KEY,
        stateFile:    STATE_FILE,
        planningFile: PLANNING_FILE,
        resultFile:   RESULT_FILE,
        currentCommandNodeId: stateValue,
        planningNodeId:       planningValue,
        resultNodeId:         resultValue,
        gates: {
          A:   stateExists    ? `✅ ${stateValue}`    : '❌ 미등록',
          A1:  planningExists ? `✅ ${planningValue}` : '❌ 미생성',
          A2:  resultExists   ? `✅ ${resultValue}`   : '❌ 미생성',
        }
      }, null, 2));
      break;
    }
    default:
      console.log('사용법: node testpy/mm-api.js [플래그] <명령> [인자...]');
      console.log('');
      console.log('명령어:');
      console.log('  read <nodeId>                          노드 읽기');
      console.log('  write <nodeId> <content>               노드 덮어쓰기');
      console.log('  append <nodeId> <content>              노드에 내용 추가');
      console.log('  children <parentId>                    하위 노드 목록');
      console.log('  add-child <parentId> <title> [content] 하위 노드 생성');
      console.log('  set-current <nodeId>                   A 노드 직접 지정');
      console.log('  session-info                           현재 세션 상태 출력');
      console.log('');
      console.log('플래그 (add-child와 함께 사용):');
      console.log('  --set-current   A  노드로 등록 (새 명령 시작)');
      console.log('  --set-planning  A-1 노드로 등록 (계획수립)');
      console.log('  --set-result    A-2 노드로 등록 (수행결과)');
      console.log('');
      console.log('세션 정보:');
      console.log(`  SESSION_ID : ${SESSION_ID || '❌ 없음 (CLAUDE_CODE_SSE_PORT 미설정)'}`);
      console.log(`  API 키     : ${CMD_NODE_API_KEY}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
