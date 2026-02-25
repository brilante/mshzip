/**
 * 마인드맵 API 헬퍼 (UTF-8 안전, 멀티 마인드맵 지원)
 * 사용법: node testpy/mm-api.js <command> [args...]
 *   read <nodeId>
 *   write <nodeId> <content>
 *   append <nodeId> <content>
 *   patch <json_operations>
 *   children <parentId>
 *   add-child <parentId> <title> [content]  # 하위 노드 생성
 *
 * --mm 옵션으로 마인드맵 전환:
 *   --mm todo  → "프로젝트 TODO"
 *   --mm main  → 기본 마인드맵 (생략 가능)
 *
 * --set-current: 명령 노드 생성 시 활성 노드 ID를 .claude/current-command-node에 저장
 *   (session-summary.js가 세션 종료 시 이 노드 하위에 요약 추가)
 *
 * 예시:
 *   node testpy/mm-api.js --mm todo add-child BTW5XOTCJ0 "20260225"
 *   node testpy/mm-api.js --mm todo --set-current add-child YOAAKHVO8V "2. 새 기능" "<p>요약</p>"
 */
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// .env에서 PORT 읽기 (독립 프로세스 실행 대응)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const PORT = parseInt(process.env.PORT) || 5858;

const ACCESS_KEY = fs.readFileSync('G:/USER/brilante33/.mymindmp3', 'utf-8').trim();
const HASH = crypto.createHash('sha256').update(ACCESS_KEY).digest('hex');

// 세션별 고유 상태 파일 (CLAUDE_CODE_SSE_PORT로 구분)
const SSE_PORT = process.env.CLAUDE_CODE_SSE_PORT || '';
const STATE_FILE = SSE_PORT
  ? path.join(__dirname, '..', '.claude', `current-command-node-${SSE_PORT}`)
  : path.join(__dirname, '..', '.claude', 'current-command-node');

// 마인드맵 별칭 맵
const MINDMAP_ALIASES = {
  main: '개발자가 AI 길들이는 데 6개월 걸린 이유 (시행착오 전부 공개)_1',
  todo: '프로젝트 TODO',
  py: '파이선 Web 프로젝트'
};

function resolveMindmap(alias) {
  return MINDMAP_ALIASES[alias] || MINDMAP_ALIASES.main;
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: PORT,
      path, method,
      headers: {
        'X-Access-Key-Hash': HASH,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  const rawArgs = process.argv.slice(2);

  // --mm 옵션 파싱
  let mmAlias = 'main';
  const mmIdx = rawArgs.indexOf('--mm');
  if (mmIdx !== -1) {
    mmAlias = rawArgs[mmIdx + 1] || 'main';
    rawArgs.splice(mmIdx, 2);
  }

  // --set-current 옵션 파싱
  let setCurrent = false;
  const scIdx = rawArgs.indexOf('--set-current');
  if (scIdx !== -1) {
    setCurrent = true;
    rawArgs.splice(scIdx, 1);
  }

  const MM = resolveMindmap(mmAlias);
  const MM_ENC = encodeURIComponent(MM);
  const [cmd, ...args] = rawArgs;

  switch (cmd) {
    case 'read': {
      const r = await request('GET', `/api/skill/node/${args[0]}`);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'write': {
      const r = await request('PUT', `/api/skill/node/${MM_ENC}/${args[0]}`, { content: args[1] });
      console.log(JSON.stringify(r));
      break;
    }
    case 'append': {
      const r = await request('PUT', `/api/skill/node/${MM_ENC}/${args[0]}`, { append: args[1] });
      console.log(JSON.stringify(r));
      break;
    }
    case 'patch': {
      const ops = JSON.parse(args[0]);
      const r = await request('PATCH', `/api/skill/mindmap/${MM_ENC}`, { operations: ops });
      console.log(JSON.stringify(r));
      break;
    }
    case 'children': {
      const r = await request('GET', `/api/skill/node/${args[0]}`);
      if (r.node && r.node.children) {
        r.node.children.forEach(c => console.log(`${c.nodeId || c.id}: ${c.title}`));
      }
      break;
    }
    case 'add-child': {
      // add-child <parentId> <title> [content]
      const parentId = args[0];
      const title = args[1];
      const content = args[2] || '';
      const node = { title };
      if (content) node.content = content;
      const r = await request('PATCH', `/api/skill/mindmap/${MM_ENC}`, {
        operations: [{ op: 'add', parentId, node }]
      });
      // 생성 후 부모 노드 읽어서 새 노드 ID 반환
      if (r.success) {
        const parent = await request('GET', `/api/skill/node/${parentId}`);
        if (parent.node && parent.node.children) {
          const last = parent.node.children[parent.node.children.length - 1];
          const newNodeId = last.nodeId || last.id;
          // --set-current: 활성 명령 노드 ID 저장
          if (setCurrent) {
            fs.writeFileSync(STATE_FILE, newNodeId, 'utf-8');
          }
          console.log(JSON.stringify({ success: true, nodeId: newNodeId, title: last.title }));
        } else {
          console.log(JSON.stringify(r));
        }
      } else {
        console.log(JSON.stringify(r));
      }
      break;
    }
    default:
      console.log('사용법: node mm-api.js [--mm todo|main] <command> [args...]');
      console.log('명령어:');
      console.log('  read <nodeId>                     노드 읽기');
      console.log('  write <nodeId> <content>          노드 덮어쓰기');
      console.log('  append <nodeId> <content>         노드에 내용 추가');
      console.log('  patch <json_operations>           PATCH 연산');
      console.log('  children <parentId>               하위 노드 목록');
      console.log('  add-child <parentId> <title> [content]  하위 노드 생성');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
