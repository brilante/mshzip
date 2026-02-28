/**
 * Phase4→CC: 액션 로깅 Hook
 * 모든 도구 호출을 자동 기록하여 관측성 확보
 *
 * 도구명 결정 우선순위:
 * 1. CLAUDE_TOOL_NAME 환경변수 (CC 런타임 제공)
 * 2. stdin JSON의 tool_name 필드 (일부 CC 버전)
 * 3. CLAUDE_TOOL_INPUT 환경변수에서 입력 구조 추론
 */
const fs = require('fs');
const path = require('path');

// 입력 구조 기반 도구명 추론
function inferToolName(input) {
  if (!input || typeof input !== 'object') return 'unknown';
  // Bash: command 필드
  if (input.command !== undefined) return 'Bash';
  // Edit: old_string + new_string
  if (input.old_string !== undefined) return 'Edit';
  // Write: content + file_path (old_string 없음)
  if (input.content !== undefined && input.file_path) return 'Write';
  // Grep: pattern + (output_mode 또는 type 또는 path)
  if (input.pattern !== undefined && (input.output_mode !== undefined || input.type !== undefined || input.glob !== undefined)) return 'Grep';
  // Glob: pattern만 (output_mode 없음)
  if (input.pattern !== undefined) return 'Glob';
  // Read: file_path만
  if (input.file_path !== undefined) return 'Read';
  // Task: prompt + subagent_type
  if (input.prompt !== undefined && input.subagent_type) return 'Task';
  // WebFetch: url + prompt
  if (input.url !== undefined && input.prompt !== undefined) return 'WebFetch';
  // WebSearch: query
  if (input.query !== undefined) return 'WebSearch';
  // AskUserQuestion: questions 배열
  if (input.questions !== undefined) return 'AskUser';
  // Skill: skill 필드
  if (input.skill !== undefined) return 'Skill';
  // NotebookEdit: notebook_path
  if (input.notebook_path !== undefined) return 'NotebookEdit';
  // TaskCreate/Update/List: taskId 또는 subject
  if (input.subject !== undefined) return 'TaskCreate';
  if (input.taskId !== undefined) return 'TaskUpdate';
  // MCP 도구: 기타 구조
  if (input.uri !== undefined) return 'MCP';
  if (input.code !== undefined) return 'MCP:executeCode';
  return 'unknown';
}

// Bash 명령에서 액션 유형 분류
function classifyBashAction(cmd) {
  const c = cmd.toLowerCase().trim();
  if (/^(mkdir|md)\s/.test(c)) return '디렉토리생성';
  if (/^(rm|del|rmdir)\s/.test(c)) return '삭제';
  if (/^(cp|copy)\s/.test(c)) return '복사';
  if (/^(mv|move|rename)\s/.test(c)) return '이동';
  if (/^(chmod|chown|icacls)\s/.test(c)) return '권한변경';
  if (/^git\s+add/.test(c)) return 'git:스테이지';
  if (/^git\s+commit/.test(c)) return 'git:커밋';
  if (/^git\s+push/.test(c)) return 'git:푸시';
  if (/^git\s+pull/.test(c)) return 'git:풀';
  if (/^git\s+checkout/.test(c) || /^git\s+switch/.test(c)) return 'git:브랜치전환';
  if (/^git\s+merge/.test(c)) return 'git:머지';
  if (/^git\s+stash/.test(c)) return 'git:스태시';
  if (/^git\s+(status|log|diff|show|branch)/.test(c)) return 'git:조회';
  if (/^git\s/.test(c)) return 'git';
  if (/^npm\s+(install|i|ci)\s/.test(c) || /^npm\s+(install|i|ci)$/.test(c)) return 'npm:설치';
  if (/^npm\s+(run|start|test)/.test(c)) return 'npm:실행';
  if (/^node\s/.test(c)) return 'node실행';
  if (/^(curl|wget)\s/.test(c)) return 'HTTP요청';
  if (/^(docker|docker-compose)\s/.test(c)) return 'docker';
  if (/^(cat|head|tail|less|more)\s/.test(c)) return '파일읽기';
  if (/^(ls|dir|find|tree)\s/.test(c) || /^ls$/.test(c)) return '목록조회';
  if (/^(echo|printf)\s/.test(c)) return '출력';
  if (/^(cd)\s/.test(c)) return '디렉토리이동';
  if (/^(python|python3|py)\s/.test(c)) return 'python실행';
  if (/\|/.test(c)) return '파이프';
  return null;
}

function main() {
  try {
    const timestamp = new Date().toISOString();
    let resolvedName = '';
    let detail = '';

    // 1순위: CLAUDE_TOOL_NAME 환경변수
    const envToolName = (process.env.CLAUDE_TOOL_NAME || '').trim();
    if (envToolName && envToolName !== 'unknown') {
      resolvedName = envToolName;
    }

    // 2순위: stdin 동기 읽기 (다른 훅과 동일한 방식)
    if (!resolvedName) {
      try {
        const stdinData = fs.readFileSync(0, 'utf-8').trim();
        if (stdinData) {
          const parsed = JSON.parse(stdinData);
          if (parsed.tool_name) resolvedName = parsed.tool_name;
          else if (parsed.tool) resolvedName = parsed.tool;
          if (!resolvedName) resolvedName = inferToolName(parsed.tool_input || parsed.input || parsed);
        }
      } catch (e) { /* stdin 파싱 실패는 무시 */ }
    }

    // 3순위: CLAUDE_TOOL_INPUT 환경변수에서 추론
    if (!resolvedName || resolvedName === 'unknown') {
      try {
        const inputStr = process.env.CLAUDE_TOOL_INPUT || '';
        if (inputStr) {
          const input = JSON.parse(inputStr);
          resolvedName = inferToolName(input);
          // 세부 정보 추출: 도구명 + 대상 파일 + 액션 유형
          if (input.command) {
            const cmd = input.command.substring(0, 120).replace(/\n/g, ' ');
            const action = classifyBashAction(cmd);
            detail = action ? `[${action}] ${cmd.substring(0, 80)}` : cmd.substring(0, 80);
          }
          else if (input.old_string !== undefined && input.file_path) detail = `[수정] ${input.file_path}`;
          else if (input.content !== undefined && input.file_path) detail = `[생성/쓰기] ${input.file_path}`;
          else if (input.file_path) detail = input.file_path;
          else if (input.pattern) detail = `pattern:${input.pattern.substring(0, 40)}`;
          else if (input.skill) detail = `skill:${input.skill}`;
          else if (input.prompt && input.subagent_type) detail = `${input.subagent_type}`;
          else if (input.subject) detail = `task:${input.subject.substring(0, 40)}`;
        }
      } catch (e) { /* 파싱 실패는 무시 */ }
    }

    if (!resolvedName) resolvedName = 'unknown';

    // 로그 엔트리 생성
    const logEntry = detail
      ? `[${timestamp}] ${resolvedName} | ${detail}`
      : `[${timestamp}] ${resolvedName}`;

    // .claude/logs/ 디렉토리에 로그 기록
    const logDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `session-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, logEntry + '\n', 'utf-8');
  } catch (e) {
    // 로깅 실패는 차단하지 않음
  }
}

main();
