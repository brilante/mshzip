/**
 * CC체크 정합성 자동 검증 Hook
 * PreToolUse(*) 매처로 세션 시작 시 1회 실행
 * Hook Chain, Rules, Skills, MCP 설정이 기획대로 존재하는지 검증
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CLAUDE_DIR = path.join(ROOT, '.claude');
const STATE_FILE = path.join(CLAUDE_DIR, 'cc-check-validated');

// 세션당 1회만 실행 (날짜 기반)
const today = new Date().toISOString().split('T')[0];
if (fs.existsSync(STATE_FILE)) {
  const lastCheck = fs.readFileSync(STATE_FILE, 'utf-8').trim();
  if (lastCheck === today) process.exit(0); // 오늘 이미 검증 완료
}

const errors = [];
const warns = [];

// 1. settings.json Hook Chain 검증
try {
  const settings = JSON.parse(fs.readFileSync(path.join(CLAUDE_DIR, 'settings.json'), 'utf-8'));
  const hooks = settings.hooks || {};
  const pre = hooks.PreToolUse || [];
  const stop = hooks.Stop || [];

  // PreToolUse 5단계 순서 검증
  const expectedPre = [
    { matcher: 'Bash', file: 'check-dangerous.js' },
    { matcher: 'Write|Edit', file: 'command-log-enforcer.js' },
    { matcher: 'Write|Edit', file: 'protect-sensitive.js' },
    { matcher: 'Write|Edit', file: 'validate-output.js' },
    { matcher: 'Write|Edit', file: 'security-scan.js' },
    { matcher: '*', file: 'log-action.js' }
  ];

  if (pre.length < expectedPre.length) {
    errors.push(`PreToolUse 훅 ${pre.length}개 (기대: ${expectedPre.length}개)`);
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

// 2. Hook 파일 존재 검증
const requiredHooks = [
  'check-dangerous.js', 'command-log-enforcer.js', 'protect-sensitive.js',
  'validate-output.js', 'security-scan.js', 'log-action.js', 'session-summary.js'
];
for (const hook of requiredHooks) {
  if (!fs.existsSync(path.join(CLAUDE_DIR, 'hooks', hook))) {
    errors.push(`훅 파일 누락: ${hook}`);
  }
}

// 3. Rules 파일 존재 검증
const requiredRules = ['general.md', 'api.md', 'security.md', 'browser-test.md', 'command-log.md'];
for (const rule of requiredRules) {
  if (!fs.existsSync(path.join(CLAUDE_DIR, 'rules', rule))) {
    errors.push(`규칙 파일 누락: ${rule}`);
  }
}

// 4. Skills 존재 검증
const requiredSkills = [
  '기획', '팀즈', 'browser-test', 'ralph-checker',
  'pr-review', 'kill-server', 'order-validator', '노드추출'
];
for (const skill of requiredSkills) {
  const skillPath = path.join(CLAUDE_DIR, 'skills', skill, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    errors.push(`스킬 누락: ${skill}`);
  }
}

// 5. check-dangerous.js 핵심 패턴 검증
try {
  const src = fs.readFileSync(path.join(CLAUDE_DIR, 'hooks', 'check-dangerous.js'), 'utf-8');
  if (!src.includes('replace(/\\s+/g')) {
    warns.push('check-dangerous.js: 공백 정규화 패턴 없음 (우회 가능)');
  }
  const blockedCount = (src.match(/BLOCKED_COMMANDS\s*=\s*\[([^\]]+)\]/s) || ['', ''])[1]
    .split(',').filter(s => s.trim().startsWith("'")).length;
  if (blockedCount < 11) {
    warns.push(`check-dangerous.js: BLOCKED 패턴 ${blockedCount}개 (기대: 11개 이상)`);
  }
} catch (e) { /* 파일 읽기 실패는 이미 위에서 감지 */ }

// 6. protect-sensitive.js 보호 대상 수 검증
try {
  const src = fs.readFileSync(path.join(CLAUDE_DIR, 'hooks', 'protect-sensitive.js'), 'utf-8');
  const patternCount = (src.match(/PROTECTED_PATTERNS\s*=\s*\[([^\]]+)\]/s) || ['', ''])[1]
    .split(',').filter(s => s.trim().startsWith("'")).length;
  if (patternCount < 8) {
    warns.push(`protect-sensitive.js: 보호 패턴 ${patternCount}개 (기대: 8개 이상)`);
  }
} catch (e) { /* 무시 */ }

// 결과 출력
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
  console.error('[CC체크] 정합성 검증 통과 (Hook 7개, Rules 5개, Skills 8개, MCP 2개)');
}

// 검증 완료 기록 (세션당 1회)
try {
  fs.writeFileSync(STATE_FILE, today, 'utf-8');
} catch (e) { /* 기록 실패는 무시 */ }
