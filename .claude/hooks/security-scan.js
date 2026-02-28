/**
 * Phase5→CC: 3중 보안 Layer 3 - 실시간 보안 탐지 Hook
 * Write/Edit 시 코드에서 보안 취약점 패턴을 자동 감지
 * /팀즈 --security 없이도 독립적으로 동작
 */
const fs = require('fs');

const SECURITY_PATTERNS = [
  { pattern: /innerHTML\s*=/, name: 'XSS: innerHTML 사용', severity: 'WARN' },
  { pattern: /document\.write\s*\(/, name: 'XSS: document.write 사용', severity: 'WARN' },
  { pattern: /eval\s*\(/, name: '코드 인젝션: eval() 사용', severity: 'BLOCK' },
  { pattern: /new\s+Function\s*\(/, name: '코드 인젝션: new Function() 사용', severity: 'WARN' },
  { pattern: /\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/i, name: 'SQL Injection: 템플릿 리터럴 쿼리', severity: 'BLOCK' },
  { pattern: /['"].*\+.*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/i, name: 'SQL Injection: 문자열 연결 쿼리', severity: 'WARN' },
  { pattern: /(?:sk-[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16}|ghp_[a-zA-Z0-9]{36})/, name: 'API 키 하드코딩', severity: 'BLOCK' },
  { pattern: /password\s*[:=]\s*['"][^'"]{3,}['"]/, name: '비밀번호 하드코딩', severity: 'WARN' },
  { pattern: /child_process.*exec\s*\(/, name: '명령 인젝션: exec() 사용', severity: 'WARN' }
];

// stdin 읽기 (Claude Code는 tool input을 stdin으로 전달)
function readInput() {
  try {
    const raw = fs.readFileSync(0, 'utf-8').trim();
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.tool_input || parsed.input || parsed;
    }
  } catch { /* stdin 없거나 파싱 실패 */ }
  // fallback: 환경변수
  try { return JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}'); } catch { return {}; }
}

try {
  const input = readInput();
  const filePath = (input.file_path || '').toLowerCase();
  const content = input.content || input.new_string || '';

  // JS/HTML 파일만 검사
  if (content && (filePath.endsWith('.js') || filePath.endsWith('.html') || filePath.endsWith('.ts') || filePath.endsWith('.jsx') || filePath.endsWith('.tsx'))) {
    const findings = [];

    for (const rule of SECURITY_PATTERNS) {
      if (rule.pattern.test(content)) {
        findings.push(rule);
      }
    }

    const blocks = findings.filter(f => f.severity === 'BLOCK');
    const warns = findings.filter(f => f.severity === 'WARN');

    if (warns.length > 0) {
      console.error('[보안탐지] 경고: ' + warns.map(w => w.name).join(', '));
    }

    if (blocks.length > 0) {
      const reason = '[보안탐지] 차단: ' + blocks.map(b => b.name).join(', ');
      console.error(reason);
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          permissionDecision: 'deny',
          permissionDecisionReason: reason
        }
      }));
      process.exit(2);
    }
  }
} catch (e) {
  // 스캔 실패는 차단하지 않음
}
