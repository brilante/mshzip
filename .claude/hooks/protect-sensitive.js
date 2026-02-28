/**
 * Phase5→CC: 민감 파일 보호 Hook
 * Write/Edit 도구 호출 전 민감 파일 수정을 차단
 */
const fs = require('fs');

const PROTECTED_PATTERNS = [
  '.env',
  'credentials.json',
  '.pem',
  '.key',
  'id_rsa',
  'id_ed25519',
  '.mymindmp3',
  '.htpasswd',
  'shadow'
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

  for (const pattern of PROTECTED_PATTERNS) {
    if (filePath.includes(pattern.toLowerCase())) {
      const reason = `[보안] 차단: 민감 파일 "${pattern}" 수정 시도. 사용자 확인이 필요합니다.`;
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
  // 파싱 실패 시 통과
}
