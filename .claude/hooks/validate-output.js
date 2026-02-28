/**
 * Phase1→CC: 출력 스키마 검증 Hook
 * Write/Edit 도구 호출 전 출력 형식을 자동 검증
 */
const fs = require('fs');

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
  const filePath = input.file_path || '';
  // Write(content) + Edit(new_string) 양쪽 모두 검사
  const content = input.content || input.new_string || '';

  // JSON 파일 쓰기 시 유효성 검증
  if (filePath.endsWith('.json') && content) {
    try {
      JSON.parse(content);
    } catch (e) {
      const reason = `[스키마] 차단: 잘못된 JSON 형식 - ${e.message}`;
      console.error(reason);
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: reason }
      }));
      process.exit(2);
    }

    // 유니코드 이스케이프 감지 (\\uXXXX 리터럴이 JSON content에 포함된 경우)
    if (content.includes('\\u') && /\\u[0-9a-fA-F]{4}/.test(content)) {
      const reason = '[스키마] 차단: 유니코드 이스케이프 시퀀스 감지. ensure_ascii=False 사용 필수';
      console.error(reason);
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: reason }
      }));
      process.exit(2);
    }
  }
} catch (e) {
  // 파싱 실패 시 통과
}
