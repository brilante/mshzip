/**
 * Phase5→CC: 민감 파일 보호 Hook
 * Write/Edit 도구 호출 전 민감 파일 수정을 차단
 */
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

try {
  const input = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}');
  const filePath = (input.file_path || '').toLowerCase();

  for (const pattern of PROTECTED_PATTERNS) {
    if (filePath.includes(pattern.toLowerCase())) {
      console.error(`[보안] 차단: 민감 파일 "${pattern}" 수정 시도. 사용자 확인이 필요합니다.`);
      process.exit(1);
    }
  }
} catch (e) {
  // 파싱 실패 시 통과
}
