/**
 * Phase4→CC: 세션 요약 생성 Hook
 * Stop 이벤트 시 세션 전체 행동 요약 생성
 * + 프로젝트 TODO 마인드맵(BTW5XOTCJ0)에 세션 요약 기록
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

// 마인드맵 API 설정
const ACCESS_KEY_PATH = 'G:/USER/brilante33/.mymindmp3';
const TODO_MM_ID = '프로젝트 TODO';
const TODO_ROOT = 'BTW5XOTCJ0';

function getHash() {
  if (!fs.existsSync(ACCESS_KEY_PATH)) return null;
  const key = fs.readFileSync(ACCESS_KEY_PATH, 'utf-8').trim();
  return crypto.createHash('sha256').update(key).digest('hex');
}

function mmRequest(method, mmId, apiPath, body) {
  return new Promise((resolve) => {
    try {
      const hash = getHash();
      if (!hash) { resolve(null); return; }
      const bodyStr = body ? JSON.stringify(body) : null;
      const opts = {
        hostname: 'localhost', port: 4848,
        path: apiPath,
        method,
        headers: {
          'X-Access-Key-Hash': hash,
          'Content-Type': 'application/json',
          ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
        },
        timeout: 5000
      };
      const req = http.request(opts, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
      if (bodyStr) req.write(bodyStr);
      req.end();
    } catch { resolve(null); }
  });
}

function readNode(nodeId) {
  return mmRequest('GET', null, `/api/skill/node/${nodeId}`);
}

function addChild(mmId, parentId, title, content) {
  const mmEnc = encodeURIComponent(mmId);
  const node = { title };
  if (content) node.content = content;
  return mmRequest('PATCH', mmId, `/api/skill/mindmap/${mmEnc}`, {
    operations: [{ op: 'add', parentId, node }]
  });
}

function writeNode(mmId, nodeId, content) {
  const mmEnc = encodeURIComponent(mmId);
  return mmRequest('PUT', mmId, `/api/skill/node/${mmEnc}/${nodeId}`, { append: content });
}

// 3단계 계층: BTW5XOTCJ0 → yyyy → yyyyMM → yyyyMMdd
async function findOrCreateChild(parentId, title) {
  const parent = await readNode(parentId);
  if (!parent || !parent.node) return null;

  const existing = (parent.node.children || []).find(c => c.title === title);
  if (existing) return existing.nodeId || existing.id;

  // 없으면 생성
  const result = await addChild(TODO_MM_ID, parentId, title);
  if (!result || !result.success) return null;

  // 생성된 노드 ID 가져오기
  const updated = await readNode(parentId);
  if (!updated || !updated.node) return null;
  const newNode = (updated.node.children || []).find(c => c.title === title);
  return newNode ? (newNode.nodeId || newNode.id) : null;
}

async function findOrCreateDateNode(today) {
  // today = "2026-02-24" → year="2026", month="202602", day="20260224"
  const dateStr = today.replace(/-/g, '');
  const year = dateStr.substring(0, 4);
  const yearMonth = dateStr.substring(0, 6);

  // 1단계: 년도 노드
  const yearNodeId = await findOrCreateChild(TODO_ROOT, year);
  if (!yearNodeId) return null;

  // 2단계: 년월 노드
  const monthNodeId = await findOrCreateChild(yearNodeId, yearMonth);
  if (!monthNodeId) return null;

  // 3단계: 년월일 노드
  const dayNodeId = await findOrCreateChild(monthNodeId, dateStr);
  return dayNodeId;
}

async function main() {
  try {
    const logDir = path.join(__dirname, '..', 'logs');
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `session-${today}.log`);

    if (!fs.existsSync(logFile)) return;

    const logs = fs.readFileSync(logFile, 'utf-8').trim().split('\n');

    // 도구별 사용 횟수 집계
    const toolCounts = {};
    for (const line of logs) {
      if (line.startsWith('===')) continue;
      const match = line.match(/\] (\S+)/);
      if (match && match[1]) {
        const tool = match[1];
        toolCounts[tool] = (toolCounts[tool] || 0) + 1;
      }
    }

    const toolSummary = Object.entries(toolCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([t, c]) => `${t}: ${c}회`)
      .join(', ');

    const timestamp = new Date().toISOString();
    const summary = `\n=== 세션 요약 (${timestamp}) ===\n총 액션: ${logs.length}회\n도구별: ${toolSummary}\n`;

    // 1. 로컬 로그에 기록
    fs.appendFileSync(logFile, summary, 'utf-8');

    // 2. 프로젝트 TODO 마인드맵에 세션 요약 기록
    //    세션별 고유 상태 파일에서 활성 명령 노드 ID를 읽어
    //    해당 노드 하위에 세션 요약 추가
    const ssePort = process.env.CLAUDE_CODE_SSE_PORT || '';
    const stateDir = path.join(__dirname, '..');
    const stateFile = ssePort
      ? path.join(stateDir, `current-command-node-${ssePort}`)
      : path.join(stateDir, 'current-command-node');
    let targetNodeId = null;
    let resolveMethod = 'none';

    // [1차] 세션별 상태 파일 (SSE_PORT 기반)
    if (fs.existsSync(stateFile)) {
      targetNodeId = fs.readFileSync(stateFile, 'utf-8').trim();
      resolveMethod = `session-file(port=${ssePort})`;
    }

    // [2차] 범용 파일 (SSE_PORT 없는 환경)
    if (!targetNodeId) {
      const fallbackFile = path.join(stateDir, 'current-command-node');
      if (fs.existsSync(fallbackFile)) {
        targetNodeId = fs.readFileSync(fallbackFile, 'utf-8').trim();
        resolveMethod = 'fallback-generic';
      }
    }

    // [3차] 날짜 노드 → 마지막 명령 노드 탐색
    if (!targetNodeId) {
      const dayNodeId = await findOrCreateDateNode(today);
      if (dayNodeId) {
        const dayNode = await readNode(dayNodeId);
        if (dayNode && dayNode.node && dayNode.node.children) {
          const cmdNodes = dayNode.node.children.filter(c => /^\d+\.\s/.test(c.title));
          if (cmdNodes.length > 0) {
            const last = cmdNodes[cmdNodes.length - 1];
            targetNodeId = last.nodeId || last.id;
            resolveMethod = `fallback-last-cmd(${last.title})`;
          } else {
            targetNodeId = dayNodeId;
            resolveMethod = 'fallback-date-node(no-cmds)';
          }
        } else {
          targetNodeId = dayNodeId;
          resolveMethod = 'fallback-date-node(no-children)';
        }
      }
    }

    // 디버그 로그: 어떤 경로로 타겟 노드를 결정했는지 기록
    const debugLog = `[session-summary] SSE_PORT=${ssePort}, stateFile=${stateFile}, exists=${fs.existsSync(stateFile)}, targetNodeId=${targetNodeId}, resolveMethod=${resolveMethod}\n`;
    fs.appendFileSync(logFile, debugLog, 'utf-8');

    if (targetNodeId) {
      const summaryContent = `<h3>세션 요약</h3><ul><li>시간: ${timestamp}</li><li>총 액션: ${logs.length}회</li><li>도구별: ${toolSummary}</li></ul>`;
      await addChild(TODO_MM_ID, targetNodeId, `세션 요약 ${timestamp.split('T')[1].substring(0, 5)}`, summaryContent);
    }

    // 세션 종료: 세션별 상태 파일 정리
    if (fs.existsSync(stateFile)) {
      try { fs.unlinkSync(stateFile); } catch {}
    }
  } catch (e) {
    // 요약 생성 실패는 무시
  }
}

main();
