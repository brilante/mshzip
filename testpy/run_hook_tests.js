#!/usr/bin/env node
/**
 * Hook 시스템 테스트 러너
 * D1, D2, D3 테스트 케이스 일괄 실행
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const LOGS_DIR = path.join(PROJECT_ROOT, '.claude', 'logs');
const SESSION_LOG = path.join(LOGS_DIR, 'session-2026-02-24.log');

// 로그 초기화
if (fs.existsSync(LOGS_DIR)) {
  fs.readdirSync(LOGS_DIR).forEach(f => {
    fs.unlinkSync(path.join(LOGS_DIR, f));
  });
}
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

let results = [];

function runTest(id, input, expectPattern) {
  const env = { ...process.env, CLAUDE_TOOL_INPUT: JSON.stringify(input) };
  spawnSync('node', ['.claude/hooks/log-action.js'], {
    env,
    cwd: PROJECT_ROOT,
    stdio: 'pipe',
    timeout: 2000
  });

  if (!fs.existsSync(SESSION_LOG)) {
    results.push({ id, status: 'FAIL', reason: 'log file not created' });
    return;
  }

  const content = fs.readFileSync(SESSION_LOG, 'utf-8');
  const lastLine = content.trim().split('\n').pop();

  if (lastLine.includes(expectPattern)) {
    results.push({ id, status: 'PASS', log: lastLine });
  } else {
    results.push({ id, status: 'FAIL', reason: `expected ${expectPattern}`, log: lastLine });
  }
}

// ====== D1 Tests (inferToolName) ======
console.log('Running D1 Tests (inferToolName)...');

runTest('D1-01', { command: 'echo test' }, 'Bash');
runTest('D1-02', { old_string: 'a', new_string: 'b', file_path: 'x.js' }, 'Edit');
runTest('D1-03', { content: 'data', file_path: 'x.js' }, 'Write');
runTest('D1-04', { pattern: 'test', output_mode: 'content' }, 'Grep');
runTest('D1-05', { pattern: '*.js' }, 'Glob');
runTest('D1-06', { file_path: '/tmp/x.js' }, 'Read');
runTest('D1-07', { prompt: '분석', subagent_type: 'Explore' }, 'Task');
runTest('D1-08', { url: 'http://x.com', prompt: '읽기' }, 'WebFetch');
runTest('D1-09', { query: '검색어' }, 'WebSearch');
runTest('D1-10', { questions: [] }, 'AskUser');
runTest('D1-11', { skill: '기획' }, 'Skill');
runTest('D1-12', { notebook_path: '/x.ipynb' }, 'NotebookEdit');
runTest('D1-13', { subject: '작업' }, 'TaskCreate');
runTest('D1-14', { taskId: '1' }, 'TaskUpdate');
runTest('D1-15', { uri: 'mcp://x' }, 'MCP');
runTest('D1-16', {}, 'unknown');

// D1-17: unset CLAUDE_TOOL_INPUT
fs.unlinkSync(SESSION_LOG);
const env17 = { ...process.env };
delete env17.CLAUDE_TOOL_INPUT;
const result17 = spawnSync('node', ['.claude/hooks/log-action.js'], {
  env: env17,
  cwd: PROJECT_ROOT,
  stdio: 'pipe',
  timeout: 2000
});
if (result17.error === undefined || result17.status === 0) {
  results.push({ id: 'D1-17', status: 'PASS', reason: 'no crash' });
} else {
  results.push({ id: 'D1-17', status: 'FAIL', reason: `error: ${result17.error}` });
}

// ====== D2 Tests (classifyBashAction) ======
console.log('Running D2 Tests (classifyBashAction)...');

runTest('D2-01', { command: 'git commit -m test' }, '[git:커밋]');
runTest('D2-02', { command: 'git push origin main' }, '[git:푸시]');
runTest('D2-03', { command: 'git add .' }, '[git:스테이지]');
runTest('D2-04', { command: 'npm install express' }, '[npm:설치]');
runTest('D2-05', { command: 'node server.js' }, '[node실행]');
runTest('D2-06', { command: 'curl http://localhost' }, '[HTTP요청]');
runTest('D2-07', { command: 'rm -rf ./tmp' }, '[삭제]');
runTest('D2-08', { command: 'mkdir ./new-dir' }, '[디렉토리생성]');
runTest('D2-09', { command: 'python script.py' }, '[python실행]');

// D2-10: 분류 없이 명령만 기록
runTest('D2-10', { command: 'whoami' }, '| whoami');

// D2-11: 120자 초과 명령
const longCmd = 'echo ' + 'a'.repeat(150);
runTest('D2-11', { command: longCmd }, '[출력]');

// ====== D3 Tests (session-summary.js 정적 분석) ======
console.log('Running D3 Tests (static analysis)...');

const sessionSummaryPath = path.join(PROJECT_ROOT, '.claude', 'hooks', 'session-summary.js');
const sessionSummaryCode = fs.readFileSync(sessionSummaryPath, 'utf-8');

const d3Tests = [
  { id: 'D3-01', pattern: /function appendToMindmap/, name: 'appendToMindmap 함수' },
  { id: 'D3-02', pattern: /G:\/USER\/brilante33\/.mymindmp3/, name: 'ACCESS_KEY_PATH' },
  { id: 'D3-03', pattern: /CFLA6IJAND/, name: '이력 노드 ID' },
  { id: 'D3-04', pattern: /method: 'PUT'/, name: 'PUT method' },
  { id: 'D3-05', pattern: /append:/, name: 'append 키' },
];

d3Tests.forEach(test => {
  if (test.pattern.test(sessionSummaryCode)) {
    results.push({ id: test.id, status: 'PASS', name: test.name });
  } else {
    results.push({ id: test.id, status: 'FAIL', name: test.name });
  }
});

// D3-06: appendFileSync + appendToMindmap 양쪽 호출
const hasAppendFile = /fs\.appendFileSync/.test(sessionSummaryCode);
const callsAppendToMindmap = /await appendToMindmap/.test(sessionSummaryCode);
if (hasAppendFile && callsAppendToMindmap) {
  results.push({ id: 'D3-06', status: 'PASS', name: '양쪽 호출' });
} else {
  results.push({ id: 'D3-06', status: 'FAIL', name: '양쪽 호출' });
}

// D3-07: try-catch + resolve(false) 존재, process.exit 없음
const hasTryCatch = /try \{/.test(sessionSummaryCode);
const resolveFalse = /resolve\(false\)/.test(sessionSummaryCode);
const noProcessExit = !/process\.exit/.test(sessionSummaryCode);
if (hasTryCatch && resolveFalse && noProcessExit) {
  results.push({ id: 'D3-07', status: 'PASS', name: '에러 안전성' });
} else {
  results.push({ id: 'D3-07', status: 'FAIL', name: '에러 안전성' });
}

// D3-08: 타임아웃 설정 5000ms
if (/timeout: 5000/.test(sessionSummaryCode)) {
  results.push({ id: 'D3-08', status: 'PASS', name: '타임아웃 5000' });
} else {
  results.push({ id: 'D3-08', status: 'FAIL', name: '타임아웃 5000' });
}

// D3-09: toolCounts 변수 + 집계
const hasToolCounts = /const toolCounts = \{\}/.test(sessionSummaryCode);
const hasAggregation = /toolCounts\[/.test(sessionSummaryCode);
if (hasToolCounts && hasAggregation) {
  results.push({ id: 'D3-09', status: 'PASS', name: 'toolCounts 집계' });
} else {
  results.push({ id: 'D3-09', status: 'FAIL', name: 'toolCounts 집계' });
}

// D3-10: 문법 유효성
const syntaxResult = spawnSync('node', ['-c', sessionSummaryPath], {
  stdio: 'pipe',
  timeout: 2000
});
if (syntaxResult.status === 0) {
  results.push({ id: 'D3-10', status: 'PASS', name: '문법 유효' });
} else {
  results.push({ id: 'D3-10', status: 'FAIL', name: '문법 오류' });
}

// ====== 결과 출력 ======
console.log('\n========== TEST RESULTS ==========\n');

const passCount = results.filter(r => r.status === 'PASS').length;
const failCount = results.filter(r => r.status === 'FAIL').length;

results.forEach(r => {
  const mark = r.status === 'PASS' ? '✓' : '✗';
  console.log(`[${r.id}] ${mark} ${r.status} - ${r.reason || r.name || ''}`);
});

console.log(`\n========== SUMMARY ==========`);
console.log(`PASS: ${passCount}/${results.length}`);
console.log(`FAIL: ${failCount}/${results.length}`);

if (failCount > 0) {
  const failIds = results.filter(r => r.status === 'FAIL').map(r => r.id);
  console.log(`Failed: ${failIds.join(', ')}`);
}

process.exit(failCount > 0 ? 1 : 0);
