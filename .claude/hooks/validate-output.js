/**
 * Phase1→CC: 출력 스키마 검증 Hook
 * Write/Edit 도구 호출 전 출력 형식을 자동 검증
 */
try {
  const input = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}');
  const filePath = input.file_path || '';
  // Write(content) + Edit(new_string) 양쪽 모두 검사
  const content = input.content || input.new_string || '';

  // JSON 파일 쓰기 시 유효성 검증
  if (filePath.endsWith('.json') && content) {
    try {
      JSON.parse(content);
    } catch (e) {
      console.error(`[스키마] 차단: 잘못된 JSON 형식 - ${e.message}`);
      process.exit(1);
    }

    // 유니코드 이스케이프 감지 (\\uXXXX 리터럴이 JSON content에 포함된 경우)
    if (content.includes('\\u') && /\\u[0-9a-fA-F]{4}/.test(content)) {
      console.error('[스키마] 차단: 유니코드 이스케이프 시퀀스 감지. ensure_ascii=False 사용 필수');
      process.exit(1);
    }
  }
} catch (e) {
  // 파싱 실패 시 통과
}
