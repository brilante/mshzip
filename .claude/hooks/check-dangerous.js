/**
 * Phase3→CC: PreToolUse 위험 명령 차단/경고 Hook
 * Bash 도구 호출 전 위험 명령을 감지하여 차단 또는 경고
 *
 * 2단계 위험도:
 * - BLOCKED: 절대 차단 (exit 1) - 복구 불가능한 파괴적 명령
 * - WARNED: 경고 출력 (exit 0) - 위험하지만 사용자가 의도할 수 있는 명령
 */
const BLOCKED_COMMANDS = [
  'rm -rf /',
  'DROP TABLE',
  'TRUNCATE',
  'DELETE FROM',
  'git push --force',
  'git reset --hard',
  'npm publish',
  'git push origin main',
  'git push origin master',
  'chmod 777',
  'mkfs'
];

const WARNED_COMMANDS = [
  'rm -rf',
  'git push',
  'git stash drop',
  'git branch -D',
  'docker rm',
  'docker rmi'
];

try {
  const input = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}');
  // 공백/탭 정규화: 다중 공백/탭으로 패턴 우회 방지
  const cmd = (input.command || '').toLowerCase().replace(/\s+/g, ' ').trim();

  // 1단계: 절대 차단 (복구 불가능)
  for (const blocked of BLOCKED_COMMANDS) {
    const pattern = blocked.toLowerCase();
    if (cmd.includes(pattern)) {
      // git push --force-with-lease는 안전한 명령이므로 제외
      if (pattern === 'git push --force' && cmd.includes('--force-with-lease')) continue;
      console.error(`[보안] 차단: 위험 명령 "${blocked}" 감지. 이 명령은 실행할 수 없습니다.`);
      process.exit(1);
    }
  }

  // 2단계: 경고 (AskUserQuestion 유도)
  for (const warned of WARNED_COMMANDS) {
    if (cmd.includes(warned.toLowerCase())) {
      console.error(`[보안] 경고: "${warned}" 감지. 사용자에게 AskUserQuestion으로 확인 후 진행하세요.`);
      // exit(0) → 차단하지 않되, AI에게 경고 메시지 전달
    }
  }

  // API 키 직접 노출 감지 → 절대 차단
  if (/sk-[a-zA-Z0-9]{20,}/.test(cmd) || /Bearer\s+[a-zA-Z0-9_-]{30,}/.test(cmd)) {
    console.error('[보안] 차단: API 키/토큰이 명령에 직접 포함됨. 환경 변수를 사용하세요.');
    process.exit(1);
  }
} catch (e) {
  // 파싱 실패 시 통과 (차단하지 않음)
}
