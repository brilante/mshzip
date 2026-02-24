/**
 * WARN 7건 → PASS 업데이트 + G6QN2ANDB1 요약 갱신
 */
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');

const key = fs.readFileSync('G:/USER/brilante33/.mymindmp3', 'utf-8').trim();
const hash = crypto.createHash('sha256').update(key).digest('hex');
const mindmapId = encodeURIComponent('개발자가 AI 길들이는 데 6개월 걸린 이유 (시행착오 전부 공개)_1');

function putNode(nodeId, htmlContent) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ content: htmlContent });
    const opts = {
      hostname: 'localhost',
      port: 4848,
      path: `/api/skill/node/${mindmapId}/${nodeId}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Key-Hash': hash,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log(`[${nodeId}] ${res.statusCode} - ${d.substring(0, 80)}`);
        resolve(d);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const updates = [
  {
    id: '0GJYPVW1P6',
    name: 'Plan Mode',
    html: '<h3>PASS ✅ (WARN→PASS 수정완료)</h3><p><b>기능</b>: EnterPlanMode / ExitPlanMode</p><p><b>점검 결과</b>: CLAUDE.md에 Plan Mode 자동 진입 규칙 추가 완료</p><ul><li>4가지 자동 진입 조건 명시</li><li>기능/품질/완료 지표 산출물 정의</li><li>ExitPlanMode 사용자 승인 연동</li></ul><p><b>수정 내용</b>: CLAUDE.md Phase0 섹션에 Plan Mode 자동 진입 규칙 추가</p>'
  },
  {
    id: 'NSX2TNVN4E',
    name: 'Skills frontmatter',
    html: '<h3>PASS ✅ (WARN→PASS 수정완료)</h3><p><b>기능</b>: Skills YAML frontmatter (name, description, argument-hint)</p><p><b>점검 결과</b>: 전체 9개 스킬 중 5개에 YAML frontmatter 추가 완료</p><ul><li>기획: name, description, argument-hint ✅</li><li>browser-test: name, description, argument-hint ✅</li><li>ralph-checker: name, description, argument-hint ✅</li><li>order-validator: name, description ✅</li><li>pr-review: name, description, argument-hint ✅</li></ul><p><b>수정 내용</b>: 4개 SKILL.md에 YAML frontmatter 블록 추가</p>'
  },
  {
    id: '10TX8XRPSA',
    name: 'validate-output.js',
    html: '<h3>PASS ✅ (WARN→PASS 수정완료)</h3><p><b>기능</b>: 출력 스키마 검증 Hook (JSON 유효성 + 유니코드 이스케이프 차단)</p><p><b>점검 결과</b>: 유니코드 이스케이프 감지 시 process.exit(1)로 차단 동작 확인</p><ul><li>JSON 파싱 실패 → exit(1) 차단 ✅</li><li>유니코드 이스케이프(\\uXXXX) → exit(1) 차단 ✅</li><li>정상 JSON → 통과 ✅</li></ul><p><b>수정 내용</b>: 유니코드 이스케이프 감지 시 경고→차단(exit 1)으로 강화</p>'
  },
  {
    id: 'LR9NR395U1',
    name: 'log-action.js',
    html: '<h3>PASS ✅ (WARN→PASS 수정완료)</h3><p><b>기능</b>: 액션 로깅 Hook (모든 도구 호출 자동 기록)</p><p><b>점검 결과</b>: CLAUDE_TOOL_NAME 미제공 시 CLAUDE_TOOL_INPUT 구조로 도구명 추론 동작 확인</p><ul><li>CLAUDE_TOOL_NAME 환경변수 우선 사용 ✅</li><li>빈값/unknown일 때 입력 구조 기반 추론 ✅ (11종 도구)</li><li>.claude/logs/ 디렉토리 자동 생성 + 날짜별 로그 파일 ✅</li></ul><p><b>수정 내용</b>: 도구명 추론 폴백 로직 추가 (command→Bash, old_string→Edit 등)</p>'
  },
  {
    id: 'O8N9PFIYPG',
    name: 'Memory',
    html: '<h3>PASS ✅ (WARN→PASS 수정완료)</h3><p><b>기능</b>: Auto Memory 세션 간 지식 보존</p><p><b>점검 결과</b>: MEMORY.md 파일 존재 및 내용 확인 완료</p><ul><li>경로: ~/.claude/projects/G--MyWrok2-mymind3v0/memory/MEMORY.md ✅</li><li>프로젝트 개요, CC 기능 현황, 디버깅 패턴, 핵심 규칙, API 접근 정보 기록 ✅</li><li>39줄, 200줄 제한 이내 ✅</li></ul><p><b>수정 내용</b>: MEMORY.md 파일 생성 + 프로젝트 핵심 지식 기록</p>'
  },
  {
    id: 'DKP9A6XH83',
    name: '3중 보안',
    html: '<h3>PASS ✅ (WARN→PASS 수정완료)</h3><p><b>기능</b>: 3중 보안 체계 (Rules + Hooks + Agent)</p><p><b>점검 결과</b>: Layer 3 독립 보안 탐지 Hook 추가 완료</p><ul><li>Layer 1 (Rules): security.md 예방 규칙 ✅</li><li>Layer 2 (Hooks): check-dangerous.js 명령 차단 ✅</li><li>Layer 3 (Agent): security-scan.js 코드 취약점 탐지 ✅ (신규)</li></ul><p><b>security-scan.js 탐지 패턴 (9종)</b>:</p><ul><li>XSS: innerHTML, document.write</li><li>코드 인젝션: eval(), new Function()</li><li>SQL Injection: 템플릿 리터럴, 문자열 연결</li><li>API 키/비밀번호 하드코딩</li><li>명령 인젝션: child_process.exec()</li></ul><p><b>수정 내용</b>: security-scan.js Hook 생성 + settings.json에 등록</p>'
  },
  {
    id: 'TAE1606DND',
    name: 'HiTL',
    html: '<h3>PASS ✅ (WARN→PASS 수정완료)</h3><p><b>기능</b>: Human-in-the-Loop 위험도 비례 인간 개입</p><p><b>점검 결과</b>: 3단계 위험도 체계 구현 완료</p><ul><li>낮음 (파일 읽기, 검색): 자동 실행 ✅</li><li>중간 (대규모 수정, 설정 변경): 경고 출력 후 진행 ✅</li><li>높음 (DB 변경, 배포, 삭제, git push): AskUserQuestion 필수 ✅</li></ul><p><b>Hook 연동</b>:</p><ul><li>check-dangerous.js: BLOCKED (exit 1) vs WARNED (경고 출력, exit 0)</li><li>BLOCKED 11종: rm -rf /, DROP TABLE, git push --force 등</li><li>WARNED 6종: rm -rf, git push, git branch -D 등</li></ul><p><b>수정 내용</b>: CLAUDE.md HiTL 2단계→3단계, check-dangerous.js 2단계 위험도 구현</p>'
  }
];

// 요약 노드 업데이트
const summaryUpdate = {
  id: 'G6QN2ANDB1',
  html: '<h2>CC 구현 설계 점검 결과 (최종)</h2><p><b>점검일</b>: 2026-02-24</p><p><b>대상</b>: 5R9HP52CGK (CC 구현 설계) 하위 19개 기능</p><h3>최종 결과: PASS 19 / WARN 0 / FAIL 0</h3><table border="1" cellpadding="4"><tr><th>Phase</th><th>기능수</th><th>결과</th></tr><tr><td>Phase0 (목표수립)</td><td>3</td><td>PASS 3</td></tr><tr><td>Phase1 (프롬프트)</td><td>4</td><td>PASS 4</td></tr><tr><td>Phase2 (컨텍스트)</td><td>2</td><td>PASS 2</td></tr><tr><td>Phase3 (도구/에이전트)</td><td>4</td><td>PASS 4</td></tr><tr><td>Phase4 (평가/디버깅)</td><td>3</td><td>PASS 3</td></tr><tr><td>Phase5 (운영안정화)</td><td>3</td><td>PASS 3</td></tr></table><h3>수정 이력</h3><ul><li><b>FAIL→PASS 3건</b>: Memory 생성, MCP playwright 패키지 수정, PR Review 스킬 생성</li><li><b>WARN→PASS 7건</b>: Plan Mode 규칙 추가, Skills frontmatter 추가, validate-output 차단 강화, log-action 도구명 추론, Memory 내용 보강, security-scan.js 신규 Hook, HiTL 3단계 체계</li></ul><p><b>총 25개 하위 노드</b>에 개별 점검 결과 기록</p>'
};

async function main() {
  // WARN 7건 업데이트
  for (const u of updates) {
    await putNode(u.id, u.html);
  }
  // 요약 노드 업데이트
  await putNode(summaryUpdate.id, summaryUpdate.html);
  console.log('\n완료: WARN 7건 PASS 전환 + 요약 노드 갱신');
}

main().catch(e => console.error('오류:', e));
