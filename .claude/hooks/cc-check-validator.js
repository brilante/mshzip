/**
 * CC체크 정합성 자동 검증 Hook
 * PreToolUse(*) 매처로 세션 시작 시 1회 실행
 * Hook Chain, Rules, Skills, MCP 설정이 기획(EUDC5SXHH7)대로 존재하는지 검증
 *
 * 검증 대상 6개 카테고리:
 * 1. PreToolUse Hook Chain (7개 훅, 순서 검증)
 *    - *(1) → Bash(1) → Write|Edit(3) → *(2) = 총 7개
 *    - 전체 훅 합계: PreToolUse 7개 + Stop 1개 = 8개
 * 2. Hook 파일 존재 (8개)
 * 3. Rules 파일 존재 (5개)
 * 4. Skills 존재 (7개)
 * 5. MCP 서버 등록 (2개)
 * 6. Stop Hook (1개)
 *
 * 추가 검증: 각 훅의 핵심 패턴/로직 존재 여부
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CLAUDE_DIR = path.join(ROOT, '.claude');
const STATE_FILE = path.join(CLAUDE_DIR, 'cc-check-validated');

// ── 순서 강제: 명령 > TODO > CC체크 ──
// TODO 상태파일(current-command-node)이 없으면 아직 TODO 기록 전 → CC체크 건너뜀

// stdin에서 session_id 읽기 (v2.1.9+ 공식 지원)
let sessionId = '';
try {
  const raw = fs.readFileSync(0, 'utf-8').trim();
  if (raw) {
    const parsed = JSON.parse(raw);
    sessionId = parsed.session_id || '';
  }
} catch { /* stdin 없거나 파싱 실패 */ }

const ssePort = process.env.CLAUDE_CODE_SSE_PORT || '';
const todoStateFile = ssePort
  ? path.join(CLAUDE_DIR, `current-command-node-${ssePort}`)
  : path.join(CLAUDE_DIR, 'current-command-node');
const todoFallbackFile = path.join(CLAUDE_DIR, 'current-command-node');
const todoRegistered = fs.existsSync(todoStateFile) || (ssePort && fs.existsSync(todoFallbackFile));
if (!todoRegistered) {
  // TODO 아직 미등록 → CC체크 순서 아님, 조용히 통과
  process.exit(0);
}

// 세션당 1회만 실행
// 우선순위: session_id (v2.1.9+) > SSE_PORT > 날짜
const today = new Date().toISOString().split('T')[0];
const sessionKey = sessionId
  ? `${today}-sid-${sessionId.substring(0, 8)}`  // session_id 앞 8자 사용
  : ssePort
  ? `${today}-${ssePort}`
  : today;
if (fs.existsSync(STATE_FILE)) {
  const lastCheck = fs.readFileSync(STATE_FILE, 'utf-8').trim();
  if (lastCheck === sessionKey) process.exit(0); // 이 세션에서 이미 검증 완료
}

const errors = [];
const warns = [];

// 헬퍼: 소스 파일에서 배열 항목 수 카운트
function countArrayItems(src, arrayName) {
  const match = src.match(new RegExp(arrayName + '\\s*=\\s*\\[([^\\]]+)\\]', 's'));
  if (!match) return 0;
  return match[1].split(',').filter(s => s.trim().startsWith("'") || s.trim().startsWith('"')).length;
}

// 헬퍼: 소스에서 특정 문자열 포함 여부
function srcIncludes(src, ...patterns) {
  return patterns.every(p => src.includes(p));
}

// ═══════════════════════════════════════════════════════════════
// 1. settings.json Hook Chain 검증
// ═══════════════════════════════════════════════════════════════
try {
  const settings = JSON.parse(fs.readFileSync(path.join(CLAUDE_DIR, 'settings.json'), 'utf-8'));
  const hooks = settings.hooks || {};
  const pre = hooks.PreToolUse || [];
  const stop = hooks.Stop || [];

  // PreToolUse 7단계 순서 검증 (*(1) → Bash(1) → Write|Edit(3) → *(2))
  // [0] * → command-log-enforcer (TODO 게이트, 모든 도구 차단)
  // [1] Bash → check-dangerous
  // [2] Write|Edit → protect-sensitive
  // [3] Write|Edit → validate-output
  // [4] Write|Edit → security-scan
  // [5] * → log-action
  // [6] * → cc-check-validator
  // [전체 합계] PreToolUse 7개 + Stop 1개 = 8개
  const expectedPre = [
    { matcher: '*',          file: 'command-log-enforcer.js' },
    { matcher: 'Bash',       file: 'check-dangerous.js' },
    { matcher: 'Write|Edit', file: 'protect-sensitive.js' },
    { matcher: 'Write|Edit', file: 'validate-output.js' },
    { matcher: 'Write|Edit', file: 'security-scan.js' },
    { matcher: '*',          file: 'log-action.js' },
    { matcher: '*',          file: 'cc-check-validator.js' }
  ];

  if (pre.length < expectedPre.length) {
    errors.push(`PreToolUse 훅 ${pre.length}개 (기대: ${expectedPre.length}개 / PreToolUse 7 + Stop 1 = 전체 8개)`);
  } else {
    for (let i = 0; i < expectedPre.length; i++) {
      const actual = pre[i];
      const expected = expectedPre[i];
      if (actual.matcher !== expected.matcher) {
        errors.push(`PreToolUse[${i}] matcher: "${actual.matcher}" (기대: "${expected.matcher}")`);
      }
      const cmd = (actual.hooks && actual.hooks[0] && actual.hooks[0].command) || '';
      if (!cmd.includes(expected.file)) {
        errors.push(`PreToolUse[${i}] 파일: "${cmd}" (기대: ${expected.file})`);
      }
    }
  }

  // Stop Hook 검증
  if (!stop.length || !JSON.stringify(stop).includes('session-summary.js')) {
    errors.push('Stop 훅에 session-summary.js 미등록');
  }

  // MCP 서버 검증
  const mcp = settings.mcpServers || {};
  if (!mcp.playwright) errors.push('MCP: playwright 미등록');
  if (!mcp.context7) errors.push('MCP: context7 미등록');
} catch (e) {
  errors.push(`settings.json 파싱 실패: ${e.message}`);
}

// ═══════════════════════════════════════════════════════════════
// 2. Hook 파일 존재 검증 (8개, cc-check-validator 자기 자신 포함)
// ═══════════════════════════════════════════════════════════════
const requiredHooks = [
  'check-dangerous.js', 'command-log-enforcer.js', 'protect-sensitive.js',
  'validate-output.js', 'security-scan.js', 'log-action.js',
  'session-summary.js', 'cc-check-validator.js'
];
for (const hook of requiredHooks) {
  if (!fs.existsSync(path.join(CLAUDE_DIR, 'hooks', hook))) {
    errors.push(`훅 파일 누락: ${hook}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 3. Rules 파일 존재 검증 (5개)
// ═══════════════════════════════════════════════════════════════
const requiredRules = ['general.md', 'api.md', 'security.md', 'browser-test.md', 'command-log.md'];
for (const rule of requiredRules) {
  if (!fs.existsSync(path.join(CLAUDE_DIR, 'rules', rule))) {
    errors.push(`규칙 파일 누락: ${rule}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 4. Skills 존재 검증 (7개)
// ═══════════════════════════════════════════════════════════════
const requiredSkills = [
  '기획', '팀즈', 'browser-test', 'ralph-checker',
  'pr-review', 'kill-server', '노드추출'
];
for (const skill of requiredSkills) {
  const skillPath = path.join(CLAUDE_DIR, 'skills', skill, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    errors.push(`스킬 누락: ${skill}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 5. check-dangerous.js 핵심 패턴 검증
//    기준: BLOCKED 11개 + WARNED 6개 + API키 감지 + 공백 정규화
// ═══════════════════════════════════════════════════════════════
try {
  const src = fs.readFileSync(path.join(CLAUDE_DIR, 'hooks', 'check-dangerous.js'), 'utf-8');

  // 공백 정규화 패턴
  if (!src.includes('replace(/\\s+/g')) {
    warns.push('check-dangerous.js: 공백 정규화 패턴 없음 (우회 가능)');
  }

  // BLOCKED_COMMANDS 수 (기대: 11개 이상)
  const blockedCount = countArrayItems(src, 'BLOCKED_COMMANDS');
  if (blockedCount < 11) {
    warns.push(`check-dangerous.js: BLOCKED 패턴 ${blockedCount}개 (기대: 11개 이상)`);
  }

  // WARNED_COMMANDS 수 (기대: 6개 이상)
  const warnedCount = countArrayItems(src, 'WARNED_COMMANDS');
  if (warnedCount < 6) {
    warns.push(`check-dangerous.js: WARNED 패턴 ${warnedCount}개 (기대: 6개 이상)`);
  }

  // API키 감지 패턴 (sk-, Bearer)
  if (!src.includes('sk-')) {
    warns.push('check-dangerous.js: API키 감지 패턴(sk-) 없음');
  }
  if (!src.includes('Bearer')) {
    warns.push('check-dangerous.js: Bearer 토큰 감지 패턴 없음');
  }
} catch (e) { /* 파일 읽기 실패는 이미 위에서 감지 */ }

// ═══════════════════════════════════════════════════════════════
// 6. protect-sensitive.js 보호 대상 수 검증
//    기준: 보호 패턴 9종
// ═══════════════════════════════════════════════════════════════
try {
  const src = fs.readFileSync(path.join(CLAUDE_DIR, 'hooks', 'protect-sensitive.js'), 'utf-8');
  const patternCount = countArrayItems(src, 'PROTECTED_PATTERNS');
  if (patternCount < 9) {
    warns.push(`protect-sensitive.js: 보호 패턴 ${patternCount}개 (기대: 9개 이상)`);
  }
} catch (e) { /* 무시 */ }

// ═══════════════════════════════════════════════════════════════
// 7. validate-output.js 내부 로직 검증
//    기준: JSON 검증 + 유니코드 이스케이프 + Edit(new_string) 검사
// ═══════════════════════════════════════════════════════════════
try {
  const src = fs.readFileSync(path.join(CLAUDE_DIR, 'hooks', 'validate-output.js'), 'utf-8');

  if (!src.includes('JSON.parse')) {
    warns.push('validate-output.js: JSON 검증 로직(JSON.parse) 없음');
  }
  if (!src.includes('\\u') || !src.includes('0-9a-fA-F')) {
    warns.push('validate-output.js: 유니코드 이스케이프 감지 정규식 없음');
  }
  if (!src.includes('new_string')) {
    warns.push('validate-output.js: Edit(new_string) 검사 로직 없음');
  }
} catch (e) { /* 무시 */ }

// ═══════════════════════════════════════════════════════════════
// 8. security-scan.js 내부 로직 검증
//    기준: BLOCK 3패턴 + WARN 6패턴 (총 9개 이상)
// ═══════════════════════════════════════════════════════════════
try {
  const src = fs.readFileSync(path.join(CLAUDE_DIR, 'hooks', 'security-scan.js'), 'utf-8');

  // SECURITY_PATTERNS 총 수
  const totalPatterns = (src.match(/severity:\s*'(BLOCK|WARN)'/g) || []).length;
  if (totalPatterns < 9) {
    warns.push(`security-scan.js: 보안 패턴 ${totalPatterns}개 (기대: 9개 이상)`);
  }

  // BLOCK severity 수 (기대: 3개 이상)
  const blockCount = (src.match(/severity:\s*'BLOCK'/g) || []).length;
  if (blockCount < 3) {
    warns.push(`security-scan.js: BLOCK 패턴 ${blockCount}개 (기대: 3개 이상)`);
  }

  // WARN severity 수 (기대: 6개 이상)
  const warnCount = (src.match(/severity:\s*'WARN'/g) || []).length;
  if (warnCount < 6) {
    warns.push(`security-scan.js: WARN 패턴 ${warnCount}개 (기대: 6개 이상)`);
  }
} catch (e) { /* 무시 */ }

// ═══════════════════════════════════════════════════════════════
// 9. command-log-enforcer.js 내부 로직 검증
//    기준: SSE_PORT 기반 상태 파일 + fallback + 서버 접속 확인
// ═══════════════════════════════════════════════════════════════
try {
  const src = fs.readFileSync(path.join(CLAUDE_DIR, 'hooks', 'command-log-enforcer.js'), 'utf-8');

  if (!src.includes('CLAUDE_CODE_SSE_PORT')) {
    warns.push('command-log-enforcer.js: SSE_PORT 기반 세션 격리 없음');
  }
  if (!src.includes('todoRootNodeId')) {
    warns.push('command-log-enforcer.js: todoRootNodeId API 조회 로직 없음');
  }
  if (!src.includes('api/health')) {
    warns.push('command-log-enforcer.js: 서버 접속 확인 로직(api/health) 없음');
  }
  if (!src.includes('process.env.PORT') && !src.includes('dotenv')) {
    warns.push('command-log-enforcer.js: .env PORT 참조 없음 (하드코딩 의심)');
  }
  // fallback 통과 시 노드 ID 유효성 검증 (STUB_ENV 차단 로직)
  if (!src.includes('STUB_ENV') && !src.includes('[A-Za-z0-9]')) {
    warns.push('command-log-enforcer.js: fallback 상태파일 내용 검증 로직 없음 (STUB_ENV 우회 가능)');
  }
} catch (e) { /* 무시 */ }

// ═══════════════════════════════════════════════════════════════
// 10. log-action.js 내부 로직 검증
//     기준: 16종 도구 인식 + 25가지 Bash 분류
// ═══════════════════════════════════════════════════════════════
try {
  const src = fs.readFileSync(path.join(CLAUDE_DIR, 'hooks', 'log-action.js'), 'utf-8');

  // 도구 인식 수: inferToolName 내 고유 도구명 매핑
  const toolMatches = src.match(/return '(\w+)'/g) || [];
  const uniqueTools = new Set(toolMatches.map(m => m.match(/return '(\w+)'/)[1]));
  if (uniqueTools.size < 16) {
    warns.push(`log-action.js: 도구 인식 ${uniqueTools.size}종 (기대: 16종 이상)`);
  }

  // Bash 분류 수: classifyBashAction 존재 및 분류 항목 수
  if (!src.includes('classifyBashAction')) {
    warns.push('log-action.js: classifyBashAction 함수 없음');
  } else {
    const classifySection = src.split('classifyBashAction')[1] || '';
    const classifyReturns = classifySection.match(/return '([^']+)'/g) || [];
    if (classifyReturns.length < 25) {
      warns.push(`log-action.js: Bash 분류 ${classifyReturns.length}가지 (기대: 25가지 이상)`);
    }
  }
} catch (e) { /* 무시 */ }

// ═══════════════════════════════════════════════════════════════
// 11. session-summary.js 내부 로직 검증
//     기준: 3단계 fallback + SSE_PORT 격리 + 상태 파일 삭제
// ═══════════════════════════════════════════════════════════════
try {
  const src = fs.readFileSync(path.join(CLAUDE_DIR, 'hooks', 'session-summary.js'), 'utf-8');

  // SSE_PORT 기반 세션 격리
  if (!src.includes('CLAUDE_CODE_SSE_PORT')) {
    warns.push('session-summary.js: SSE_PORT 기반 세션 격리 없음');
  }

  // 상태 파일 삭제 (unlinkSync)
  if (!src.includes('unlinkSync')) {
    warns.push('session-summary.js: 상태 파일 삭제(unlinkSync) 로직 없음');
  }

  // Access Key 파일 경로 참조
  if (!src.includes('.mymindmp3')) {
    warns.push('session-summary.js: Access Key 파일(.mymindmp3) 참조 없음');
  }

  // lok_ 토큰 만료 검증 로직 (버그 수정 항목)
  // getHash();에서 checkLokToken() 또는 만료 판단 로직이 있어야 함
  if (!src.includes('checkLokToken') && !src.includes('payload.e * 1000')) {
    warns.push('session-summary.js: lok_ 토큰 만료 검증 로직 없음 (getHash 버그 미수정 의심)');
  }
  // fallback-generic 삭제 로직 (STUB_ENV 잔류 방지)
  if (!src.includes('fallback-generic') || !src.includes('unlinkSync')) {
    warns.push('session-summary.js: fallback-generic 상태파일 삭제 로직 없음 (STUB_ENV 문제 재발 가능)');
  }
} catch (e) { /* 무시 */ }

// ═══════════════════════════════════════════════════════════════
// 결과 출력
// ═══════════════════════════════════════════════════════════════
if (errors.length > 0) {
  console.error(`[CC체크] 검증 실패 (${errors.length}건):`);
  errors.forEach(e => console.error(`  - ${e}`));
  // CC체크 오류는 경고만 출력 (작업 차단하지 않음)
}

if (warns.length > 0) {
  console.error(`[CC체크] 경고 (${warns.length}건):`);
  warns.forEach(w => console.error(`  - ${w}`));
}

if (errors.length === 0 && warns.length === 0) {
  console.error('[CC체크] 정합성 검증 통과 (PreToolUse훅 7개 + Stop훅 1개 = 8개, Rules 5개, Skills 7개, MCP 2개)');
}

// 검증 완료 기록 (세션당 1회)
try {
  fs.writeFileSync(STATE_FILE, sessionKey, 'utf-8');
} catch (e) { /* 기록 실패는 무시 */ }
