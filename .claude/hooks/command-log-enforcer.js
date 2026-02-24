/**
 * Phase0->CC: 명령 이력 기록 강제 Hook
 * Write/Edit 도구 호출 전 명령 노드 생성 여부를 확인
 * 상태 파일(.claude/current-command-node-{SSE_PORT})이 없으면 경고 출력
 */
const fs = require('fs');
const path = require('path');

try {
  // 1. SSE_PORT 기반 상태 파일 경로 결정 (mm-api.js와 동일한 로직)
  const ssePort = process.env.CLAUDE_CODE_SSE_PORT || '';
  const claudeDir = path.join(__dirname, '..');
  const stateFile = ssePort
    ? path.join(claudeDir, `current-command-node-${ssePort}`)
    : path.join(claudeDir, 'current-command-node');

  // 2. 상태 파일 존재 여부 확인
  if (fs.existsSync(stateFile)) {
    process.exit(0);
  }

  // 3. 범용 fallback 파일도 확인 (SSE_PORT가 다른 세션에서 생성된 경우)
  if (ssePort) {
    const fallbackFile = path.join(claudeDir, 'current-command-node');
    if (fs.existsSync(fallbackFile)) {
      process.exit(0);
    }
  }

  // 4. 상태 파일 없음 -> 경고 출력 (차단하지 않음)
  const input = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}');
  const filePath = input.file_path || '(unknown)';
  console.error(`[명령이력] 경고: 명령 노드 미등록 상태에서 파일 수정 시도 (${filePath})`);
  console.error('[명령이력] CLAUDE.md 규칙: 코드 수정 전 --set-current로 명령 노드를 먼저 생성하세요.');
  console.error('[명령이력] 실행: node testpy/mm-api.js --mm todo --set-current add-child <날짜노드ID> "N. 명령요약" "명령 원문"');
} catch (e) {
  // 파싱 실패 시 통과
}
