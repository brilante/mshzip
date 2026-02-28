/**
 * UserPromptSubmit Hook
 *
 * 사용자 명령 수신 시 Claude에게 정확한 절차를 주입합니다.
 *
 * ★ 설계 원칙:
 *   - --mm 플래그 사용 금지 (mm-api.js에서 완전 제거됨)
 *   - 날짜 노드 자동 탐색/생성 → Claude에게 실제 nodeId 포함된 명령 전달
 *   - todoRootNodeId: 상수 금지. API에서 동적 조회.
 *
 * 목표 구조:
 *   todoRoot → yyyy → yyyyMM → yyyyMMdd
 *     └── N. 명령요약           ← A  (--set-current)
 *           ├── 명령 수행 계획수립  ← A-1 (--set-planning)
 *           ├── 수행 및 테스트 결과 ← A-2 (--set-result)
 *           └── 세션 요약           ← A-3 (자동)
 *
 * 케이스 A (명령 노드 미등록):
 *   날짜 노드 자동 탐색/생성 → 다음 번호 계산 → 실제 nodeId 포함 명령 안내
 *
 * 케이스 B (명령 노드 등록됨):
 *   A-1 미생성이면 → 계획수립 노드 생성 리마인더
 *   A-1 생성됨이면 → 수행결과 노드 생성 리마인더
 */

'use strict';

const fs            = require('fs');
const path          = require('path');
const http          = require('http');
const crypto        = require('crypto');
const { execSync }  = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const PORT          = parseInt(process.env.PORT) || 5858;

// ══════════════════════════════════════════════════════
//  TODO 활성화 여부 확인 (.env AGENT_SKILLS_TODO)
//  false 일 때 안내 미주입—조용히 종료
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

if (!isTodoEnabled()) process.exit(0); // TODO 비활성 → 안내 미주입
const ACCESS_KEY_PATH = 'G:/USER/brilante33/.mymindmp3';
const CLAUDE_DIR    = path.join(__dirname, '..');
const PROJECT_ROOT  = path.join(__dirname, '..', '..');
const MM_API        = path.join(PROJECT_ROOT, 'testpy', 'mm-api.js');

// ── 날짜 (KST = UTC+9) ──────────────────────────────────────────────
// new Date()는 UTC 기준이므로, 한국 자정(00:00 KST)이 UTC로 이전날 15:00에 해당.
// KST 기준 날짜를 올바르게 계산하기 위해 +9시간 오프셋 적용.

const _now     = new Date();
const _kst     = new Date(_now.getTime() + 9 * 60 * 60 * 1000);  // UTC+9
const yyyy     = String(_kst.getUTCFullYear());
const yyyyMM   = yyyy + String(_kst.getUTCMonth() + 1).padStart(2, '0');
const yyyyMMdd = yyyyMM + String(_kst.getUTCDate()).padStart(2, '0');

// ── 세션 ID ──────────────────────────────────────────────────────────

function resolveSessionId() {
  if (process.env.CLAUDE_CODE_SSE_PORT) return process.env.CLAUDE_CODE_SSE_PORT;
  const ppid = process.ppid;
  if (ppid && ppid > 0) return `PID_${ppid}`;
  return null;
}

const SESSION_ID   = resolveSessionId();
const stateFile    = SESSION_ID ? path.join(CLAUDE_DIR, `current-command-node-${SESSION_ID}`)  : null;
const planningFile = SESSION_ID ? path.join(CLAUDE_DIR, `planning-node-${SESSION_ID}`)         : null;
const resultFile   = SESSION_ID ? path.join(CLAUDE_DIR, `result-node-${SESSION_ID}`)           : null;

const todoRegistered  = !!(stateFile    && fs.existsSync(stateFile));
const planningCreated = !!(planningFile && fs.existsSync(planningFile));
const resultCreated   = !!(resultFile   && fs.existsSync(resultFile));

// ── Access Key ───────────────────────────────────────────────────────

function getAccessKeyHash() {
  try {
    if (fs.existsSync(ACCESS_KEY_PATH)) {
      return crypto.createHash('sha256')
        .update(fs.readFileSync(ACCESS_KEY_PATH, 'utf-8').trim())
        .digest('hex');
    }
  } catch {}
  return null;
}

function resolveApiToken() {
  const lok = process.env.LOGIN_OK_ACCESSKEY;
  if (lok && lok.startsWith('lok_')) return lok;
  return getAccessKeyHash();
}

// ── API 조회 (sync) ───────────────────────────────────────────────────

function apiGetSync(apiPath) {
  const token = resolveApiToken();
  if (!token) return null;
  try {
    const result = execSync(
      `node -e "const h=require('http');` +
      `h.get('http://localhost:${PORT}${apiPath}',` +
      `{headers:{'X-Access-Key-Hash':'${token}'},timeout:3000},` +
      `res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>process.stdout.write(d))})` +
      `.on('error',()=>process.stdout.write('{}'))"`,
      { timeout: 5000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
    return JSON.parse(result);
  } catch { return null; }
}

// ── todoRootNodeId 조회 ───────────────────────────────────────────────

function fetchTodoRoot() {
  const r = apiGetSync('/api/user/settings');
  return r?.data?.todoRootNodeId || null;
}

// ── 노드 자식 목록 ────────────────────────────────────────────────────

function getChildren(nodeId) {
  const r = apiGetSync(`/api/skill/node/${nodeId}`);
  return r?.node?.children || [];
}

// ── mm-api.js 실행 ────────────────────────────────────────────────────

function mmExec(args) {
  return execSync(`node "${MM_API}" ${args}`, {
    cwd: PROJECT_ROOT, timeout: 15000, encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  }).trim();
}

// ── 자식에서 타이틀로 nodeId 찾기 ────────────────────────────────────

function findChildByTitle(children, title) {
  const c = children.find(c => c.title === title);
  return c ? c.id : null;
}

// ── 없으면 생성, 있으면 기존 반환 ────────────────────────────────────

function findOrCreate(parentId, title) {
  const children = getChildren(parentId);
  const existing = findChildByTitle(children, title);
  if (existing) return { id: existing, children };

  try {
    const r = mmExec(`add-child ${parentId} "${title}"`);
    const parsed = JSON.parse(r);
    if (parsed.success && parsed.nodeId) {
      return { id: parsed.nodeId, children: getChildren(parentId) };
    }
  } catch {}

  // 생성 후 재조회
  const updated = getChildren(parentId);
  const found = findChildByTitle(updated, title);
  return { id: found, children: updated };
}

// ── 서버 실행 여부 확인 ───────────────────────────────────────────────

function isServerRunning() {
  try {
    execSync(
      `node -e "const h=require('http');` +
      `h.get('http://localhost:${PORT}/api/health',{timeout:2000},` +
      `r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"`,
      { timeout: 3000, stdio: 'ignore' }
    );
    return true;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────
//  메인
// ─────────────────────────────────────────────────────────────────────

async function main() {

  // ════════════════════════════════════════════════════════════════════
  //  케이스 B: 명령 노드 이미 등록됨
  // ════════════════════════════════════════════════════════════════════
  if (todoRegistered) {
    let cmdNodeId = '';
    try { cmdNodeId = fs.readFileSync(stateFile, 'utf-8').trim(); } catch {}
    const nodeRef = cmdNodeId || '<명령노드ID>';

    let planningNodeId = '';
    if (planningCreated && planningFile) {
      try { planningNodeId = fs.readFileSync(planningFile, 'utf-8').trim(); } catch {}
    }

    if (!planningCreated) {
      // A-1 미생성 → 계획수립 먼저
      process.stdout.write(
`[리마인더] 명령 노드 등록됨 (${nodeRef})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
★ 작업 시작 전: A-1 계획수립 노드를 먼저 생성하세요 ★
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【즉시 실행】A-1 계획수립 노드 생성 (--set-planning 필수)
  node testpy/mm-api.js --set-planning \\
    add-child ${nodeRef} "명령 수행 계획수립" "<계획 HTML>"

  필수 내용:
    - 명령 분석 (요청 내용, 영향 범위, 위험도)
    - 구현 단계별 계획
    - 검증 기준
    - Mermaid 다이어그램 (flowchart/sequenceDiagram/classDiagram 중 선택)

  ※ 이 노드 생성 없이는 Bash/Read/Write/Edit 전부 차단됨

【완료 후】A-2 수행결과 노드 생성 (--set-result 필수)
  node testpy/mm-api.js --set-result \\
    add-child ${nodeRef} "수행 및 테스트 결과" "<결과 HTML>"

【자동】세션 종료 시 "세션 요약" 노드 자동 생성

최종 구조:
  ${nodeRef}
    ├── 명령 수행 계획수립   ← 지금 생성 (★--set-planning)
    ├── 수행 및 테스트 결과  ← 작업 완료 후 (★--set-result)
    └── 세션 요약            ← 자동`.trim()
      );
    } else if (!resultCreated) {
      // A-1 있고 A-2 없음 → 수행결과 리마인더
      process.stdout.write(
`[리마인더] 명령 노드 등록됨 (${nodeRef}) | 계획수립 완료 (${planningNodeId || 'A-1'})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
작업 완료 후 반드시 A-2 수행결과 노드를 생성하세요.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【작업 완료 후 즉시 실행】A-2 수행결과 노드 생성 (--set-result 필수)
  node testpy/mm-api.js --set-result \\
    add-child ${nodeRef} "수행 및 테스트 결과" "<결과 HTML>"

  필수 내용:
    - 수행 결과 (성공/실패)
    - 수정 파일 목록 + 변경 내용
    - 테스트 항목/결과 표
    - 에러 및 해결 (해당 시)

  ※ 누락 시 다음 명령 등록 시 차단됨

【자동】세션 종료 시 "세션 요약" 노드 자동 생성`.trim()
      );
    } else {
      // ══════════════════════════════════════════════════════
      // A-1 ✅ A-2 ✅ → 이전 명령 완료 → 새 명령 안내 필요
      // ★ 핵심 버그 수정: "계속하세요" 대신 올바른 날짜 노드 + nextN 안내
      //   이전에 이 분기에서 dayNodeId를 제공하지 않아
      //   Claude가 컨텍스트 기억(tmp_2 등)을 parentId로 사용했음
      // ══════════════════════════════════════════════════════

      // 서버 확인
      if (!isServerRunning()) {
        process.stdout.write(`[확인] 이전 명령(${nodeRef}) 완료 ✅\n서버 미실행 — 새 명령 노드를 수동 등록하세요.`.trim());
        return;
      }

      const TODO_ROOT2 = fetchTodoRoot();
      let dayNodeId2 = null, dayNodeChildren2 = [], setupError2 = null;
      try {
        const { id: yId2 } = findOrCreate(TODO_ROOT2, yyyy);
        if (!yId2) throw new Error(`${yyyy} 노드 생성 실패`);
        const { id: mId2 } = findOrCreate(yId2, yyyyMM);
        if (!mId2) throw new Error(`${yyyyMM} 노드 생성 실패`);
        const { id: dId2, children: dCh2 } = findOrCreate(mId2, yyyyMMdd);
        if (!dId2) throw new Error(`${yyyyMMdd} 노드 생성 실패`);
        dayNodeId2 = dId2; dayNodeChildren2 = dCh2;
      } catch(e) { setupError2 = e.message; }

      let nextN2 = 1;
      try {
        const nums2 = dayNodeChildren2
          .filter(c => /^\d+\./.test(c.title))
          .map(c => parseInt(c.title.split('.')[0], 10))
          .filter(n => !isNaN(n));
        nextN2 = nums2.length > 0 ? Math.max(...nums2) + 1 : 1;
      } catch { nextN2 = 1; }

      if (dayNodeId2) {
        process.stdout.write(
`[완료→새명령] 이전 명령(${nodeRef}) 완료 ✅ — 새 명령을 등록하세요
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  오늘 날짜  : ${yyyyMMdd} (노드: ${dayNodeId2})
  다음 번호  : ${nextN2}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【즉시 실행】새 A 명령 노드 생성 (--set-current 필수)

  node testpy/mm-api.js --set-current \\
    add-child ${dayNodeId2} "${nextN2}. 명령요약" "사용자 명령 원문"

  ※ parentId는 반드시 날짜 노드 ${dayNodeId2} (${yyyyMMdd}) 를 사용할 것
  ※ tmp_0 / tmp_1 / tmp_2 / ${nodeRef} 등 다른 노드 절대 사용 금지
  ※ "${nextN2}. 명령요약" 부분을 실제 명령 내용으로 교체

완성 구조:
  ${dayNodeId2} (${yyyyMMdd})
    └── ${nextN2}. 명령요약   ← 지금 생성 (★--set-current)
          ├── 명령 수행 계획수립
          ├── 수행 및 테스트 결과
          └── 세션 요약`.trim()
        );
      } else {
        process.stdout.write(`[완료→새명령] 이전 명령(${nodeRef}) 완료 ✅ — 날짜 노드 생성 실패(${setupError2})\n수동으로 ${yyyyMMdd} 노드를 찾아 --set-current 실행하세요.`.trim());
      }
    }
    return;
  }

  // ════════════════════════════════════════════════════════════════════
  //  케이스 A: 명령 노드 미등록 → 날짜 노드 탐색/생성 후 정확한 명령 안내
  // ════════════════════════════════════════════════════════════════════

  // 서버 미실행 시 간략 안내
  if (!isServerRunning()) {
    process.stdout.write(
`[TODO 게이트] ⚠️ 마인드맵 서버 미실행
서버 실행 후 명령 노드를 등록하세요:
  node testpy/mm-api.js --set-current \\
    add-child <${yyyyMMdd}노드ID> "N. 명령요약" "명령 원문"`.trim()
    );
    return;
  }

  // todoRootNodeId 조회
  const TODO_ROOT = fetchTodoRoot();
  if (!TODO_ROOT) {
    process.stdout.write(
`[TODO 게이트] ⚠️ todoRootNodeId 미설정
설정 방법: 마인드맵 앱 > 설정 > Agent Skills > TODO Node ID (todoRootNodeId)
또는: POST /api/user/settings { "todoRootNodeId": "<노드ID>" }`.trim()
    );
    return;
  }

  // 날짜 노드 자동 탐색/생성: root → yyyy → yyyyMM → yyyyMMdd
  let dayNodeId = null;
  let dayNodeChildren = [];
  let setupError = null;

  try {
    const { id: yId }   = findOrCreate(TODO_ROOT, yyyy);
    if (!yId) throw new Error(`${yyyy} 노드 생성 실패`);

    const { id: mId }   = findOrCreate(yId, yyyyMM);
    if (!mId) throw new Error(`${yyyyMM} 노드 생성 실패`);

    const { id: dId, children: dChildren } = findOrCreate(mId, yyyyMMdd);
    if (!dId) throw new Error(`${yyyyMMdd} 노드 생성 실패`);

    dayNodeId       = dId;
    dayNodeChildren = dChildren;
  } catch (e) {
    setupError = e.message;
  }

  // 다음 명령 번호 계산
  // ★ 날짜 노드(yyyyMMdd)의 직접 자식 중 "숫자." 패턴만 카운트
  // ★ tmp_*, tmp_숫자 등 사용자 임의 그룹 노드는 완전 무시 (내부 스캔 없음)
  let nextN = 1;
  try {
    const directCmdNums = dayNodeChildren
      .filter(c => /^\d+\./.test(c.title))   // 숫자. 로 시작하는 것만
      .map(c => parseInt(c.title.split('.')[0], 10))
      .filter(n => !isNaN(n));

    nextN = directCmdNums.length > 0 ? Math.max(...directCmdNums) + 1 : 1;
  } catch {
    nextN = 1;
  }

  if (dayNodeId) {
    // ── 정상: 실제 nodeId 포함된 즉시 실행 명령 안내 ──
    process.stdout.write(
`[필수] 사용자 명령 수신 — 아래 단계를 순서대로 수행하세요
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TODO 루트  : ${TODO_ROOT}
  오늘 날짜  : ${yyyyMMdd} (노드: ${dayNodeId})
  다음 번호  : ${nextN}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【1단계】A 명령 노드 생성 (--set-current 필수 ★ 없으면 모든 도구 차단)

  node testpy/mm-api.js --set-current \\
    add-child ${dayNodeId} "${nextN}. 명령요약" "사용자 명령 원문"

  ※ parentId는 반드시 날짜 노드 ${dayNodeId} (${yyyyMMdd}) 를 사용할 것
  ※ tmp_0, tmp_1, tmp_2 등 다른 노드를 parentId로 사용하면 절대 안 됨
  ※ "${nextN}. 명령요약" 부분을 실제 명령 내용으로 교체
  ※ 예: "${nextN}. 다크모드 버그 수정" / "${nextN}. 로그인 API 리팩토링"
  ※ "세션 작업", "자동 등록" 등 범용 제목 금지

【2단계】A-1 계획수립 노드 생성 (--set-planning 필수 ★ 없으면 모든 도구 차단)

  node testpy/mm-api.js --set-planning \\
    add-child <1단계에서_생성된_노드ID> "명령 수행 계획수립" "<계획 HTML>"

  필수: 명령 분석, 구현 단계, Mermaid 다이어그램

【3단계】실제 작업 수행

【4단계】A-2 수행결과 노드 생성 (--set-result 필수 ★ 없으면 다음 명령 차단)

  node testpy/mm-api.js --set-result \\
    add-child <1단계에서_생성된_노드ID> "수행 및 테스트 결과" "<결과 HTML>"

  필수: 수정 파일 목록, 테스트 결과 표

【자동】세션 종료 시 "세션 요약" 노드 자동 생성

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
완성 구조:
  ${dayNodeId} (${yyyyMMdd})
    └── ${nextN}. 명령요약                ← 지금 생성 (★1단계)
          ├── 명령 수행 계획수립  ← 2단계 (★--set-planning)
          ├── 수행 및 테스트 결과 ← 4단계 (★--set-result)
          └── 세션 요약           ← 자동`.trim()
    );
  } else {
    // ── 날짜 노드 생성 실패 시 수동 안내 ──
    process.stdout.write(
`[필수] 사용자 명령 수신 — 날짜 노드 자동 생성 실패 (${setupError || '알 수 없는 오류'})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TODO 루트: ${TODO_ROOT}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

날짜 노드를 수동으로 탐색/생성하세요:

  # 자식 목록 확인
  node testpy/mm-api.js children ${TODO_ROOT}

  # 없는 노드 생성
  node testpy/mm-api.js add-child ${TODO_ROOT} "${yyyy}"
  node testpy/mm-api.js add-child <${yyyy}노드ID> "${yyyyMM}"
  node testpy/mm-api.js add-child <${yyyyMM}노드ID> "${yyyyMMdd}"

  # A 명령 노드 생성 (★ --set-current 필수)
  node testpy/mm-api.js --set-current \\
    add-child <${yyyyMMdd}노드ID> "N. 명령요약" "명령 원문"`.trim()
    );
  }
}

main().catch((e) => {
  process.stdout.write(
    `[TODO] 명령 노드를 생성하세요:\n` +
    `  node testpy/mm-api.js --set-current add-child <${yyyyMMdd}노드ID> "N. 명령요약" "원문"\n` +
    `  (오류: ${e.message})`
  );
});
