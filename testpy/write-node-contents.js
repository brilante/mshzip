'use strict';
const http = require('http');
const path = require('path');

// .env에서 PORT 읽기
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const PORT = parseInt(process.env.PORT) || 5858;

const HASH = 'a70dfada14ebb1ef9617b5b7ee508718546abbcfb32ce583ccd183402c5e46d2';
const MM = '개발자가 AI 길들이는 데 6개월 걸린 이유 (시행착오 전부 공개)_1';

function putNode(nodeId, content) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ content });
    const options = {
      hostname: 'localhost', port: PORT,
      path: '/api/skill/node/' + encodeURIComponent(MM) + '/' + nodeId,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Key-Hash': HASH,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ nodeId, success: parsed.success });
        } catch (e) {
          resolve({ nodeId, success: false, error: data });
        }
      });
    });
    req.on('error', (e) => resolve({ nodeId, success: false, error: e.message }));
    req.write(body);
    req.end();
  });
}

const nodes = {
  // Phase0 점검
  'SM4PO4TQ03': `<h1>Phase0 점검: 목표 수립</h1>
<p>점검일: 2026-02-24 | PASS 2 / WARN 1 / FAIL 0</p>
<hr>
<table border="1" cellpadding="4">
<tr><th>기능</th><th>판정</th><th>핵심 근거</th></tr>
<tr><td>CLAUDE.md 검증 규칙</td><td style="color:green"><strong>PASS</strong></td><td>5가지 수행유형별 검증 방법, 보고 형식, 금지 사항 완전 정의</td></tr>
<tr><td>Plan Mode 지표 수립</td><td style="color:orange"><strong>WARN</strong></td><td>EnterPlanMode 자동 진입 조건 미정의, 지표 수립 워크플로우 부재</td></tr>
<tr><td>Ralph Loop 탈출조건</td><td style="color:green"><strong>PASS</strong></td><td>3중 안전장치 + 4개 참조 문서 완비</td></tr>
</table>`,

  'TUMDU3DY2V': `<h1>PASS: CLAUDE.md 검증 규칙 (ITW3NWWJ27)</h1>
<p><strong>구현 파일</strong>: CLAUDE.md 8~29행</p>
<hr>
<h2>점검 항목</h2>
<table border="1" cellpadding="4">
<tr><th>항목</th><th>결과</th></tr>
<tr><td>"수행 후 검증 필수" 규칙</td><td>8행에 최우선 규칙으로 명시</td></tr>
<tr><td>핵심 원칙 3단계</td><td>수행(Do) → 검증(Verify) → 보고(Report)</td></tr>
<tr><td>5가지 수행유형별 검증</td><td>코드수정, API수정, DB변경, 프론트엔드, 파일생성 각각 정의</td></tr>
<tr><td>검증 보고 형식</td><td>성공/실패 2가지 형식 정의</td></tr>
<tr><td>절대 금지 3항</td><td>코드만 작성 완료, 로그 미확인, 추측 보고 금지</td></tr>
<tr><td>테스트 기획 선행</td><td>"테스트" 키워드 트리거 → 기획→승인→수행</td></tr>
<tr><td>파급 영향 분석</td><td>호출부 추적, 시그니처 변경, 공유 상태, 최소 변경</td></tr>
</table>
<h2>결론</h2>
<p>설계 의도대로 완전히 구현됨. 문제 없음.</p>`,

  '0GJYPVW1P6': `<h1>WARN: Plan Mode 지표 수립 (X2FJLSYMLJ)</h1>
<p><strong>구현 파일</strong>: CLAUDE.md (전체), order-validator/SKILL.md</p>
<hr>
<h2>문제점</h2>
<ol>
<li><strong>EnterPlanMode 자동 진입 조건 미정의</strong> - CLAUDE.md에 Plan Mode 진입 트리거 규칙 없음</li>
<li><strong>지표 수립 워크플로우 없음</strong> - 정량적/정성적 KPI 수립 절차 미구현</li>
<li><strong>order-validator 한계</strong> - 명령 충돌 감지만 하며 Plan Mode와 미연동</li>
</ol>
<h2>개선 제안</h2>
<ol>
<li>CLAUDE.md에 Plan Mode 자동 진입 조건 추가 (3개 이상 파일 변경, 아키텍처 변경 시 등)</li>
<li>Plan Mode 내 지표 수립 워크플로우 정의 (목표→측정방법→완료기준→승인)</li>
</ol>`,

  '0GFRPAUNM6': `<h1>PASS: Ralph Loop 탈출조건 (DQSCWQZZCU)</h1>
<p><strong>구현 파일</strong>: ralph-checker/SKILL.md + references/ 4개 파일</p>
<hr>
<h2>3중 안전장치 확인</h2>
<table border="1" cellpadding="4">
<tr><th>장치</th><th>구현</th><th>상태</th></tr>
<tr><td>탈출조건 (논리적)</td><td>정량적/기능적/품질적 3유형 + 8종 exit_conditions</td><td>완비</td></tr>
<tr><td>max_turns (물리적)</td><td>기본 10, 최대 20 하드리밋</td><td>완비</td></tr>
<tr><td>금지 동작</td><td>rm -rf, DROP TABLE, npm publish, git push</td><td>완비</td></tr>
</table>
<h2>추가 안전장치</h2>
<ul>
<li>Git 체크포인트 자동 생성</li>
<li>중간 개입 트리거 (3회 연속 에러, 5회 중간 보고)</li>
<li>롤백/비상 중단 절차</li>
</ul>`,

  // Phase1 점검
  'GD4PMGF87W': `<h1>Phase1 점검: 프롬프트 구조화</h1>
<p>점검일: 2026-02-24 | PASS 1 / WARN 2 / FAIL 0</p>
<hr>
<table border="1" cellpadding="4">
<tr><th>기능</th><th>판정</th><th>핵심 근거</th></tr>
<tr><td>Rules 분산 시스템</td><td style="color:green"><strong>PASS</strong></td><td>4개 파일 존재, 각 500토큰 이하, 내용 적절</td></tr>
<tr><td>Skills 역할 전문화</td><td style="color:orange"><strong>WARN</strong></td><td>YAML 프론트매터 5개 스킬 누락</td></tr>
<tr><td>Hooks 스키마 검증</td><td style="color:orange"><strong>WARN</strong></td><td>유니코드 이스케이프 경고만, 차단 안됨</td></tr>
</table>`,

  'GV4DO603FL': `<h1>PASS: Rules 분산 시스템 (XNW8H0F8HA)</h1>
<p><strong>구현 파일</strong>: .claude/rules/ (general.md, security.md, api.md, browser-test.md)</p>
<hr>
<h2>파일 확인</h2>
<table border="1" cellpadding="4">
<tr><th>파일</th><th>행 수</th><th>추정 토큰</th><th>500 이하</th></tr>
<tr><td>general.md</td><td>26행</td><td>~200</td><td>통과</td></tr>
<tr><td>security.md</td><td>24행</td><td>~250</td><td>통과</td></tr>
<tr><td>api.md</td><td>32행</td><td>~300</td><td>통과</td></tr>
<tr><td>browser-test.md</td><td>13행</td><td>~100</td><td>통과</td></tr>
</table>
<p>모든 파일이 설계 의도대로 분산 구현됨.</p>`,

  'NSX2TNVN4E': `<h1>WARN: Skills 역할 전문화 (L029NM92HH)</h1>
<p><strong>구현 파일</strong>: .claude/skills/ (7개 스킬)</p>
<hr>
<h2>스킬 현황</h2>
<table border="1" cellpadding="4">
<tr><th>스킬</th><th>YAML 프론트매터</th><th>역할 정의</th><th>에러 처리</th></tr>
<tr><td>기획</td><td style="color:red">X</td><td>O</td><td>X</td></tr>
<tr><td>browser-test</td><td style="color:red">X</td><td>O</td><td>O</td></tr>
<tr><td>ralph-checker</td><td style="color:red">X</td><td>O</td><td>위임</td></tr>
<tr><td>팀즈</td><td style="color:green">O</td><td>O</td><td>O</td></tr>
<tr><td>kill-server</td><td style="color:red">부분</td><td>O</td><td>X</td></tr>
<tr><td>노드추출</td><td style="color:green">O</td><td>O</td><td>O</td></tr>
<tr><td>order-validator</td><td style="color:red">X</td><td>O</td><td>X</td></tr>
</table>
<h2>문제점</h2>
<ol>
<li>5개 스킬에 YAML 프론트매터 누락 → 슬래시 명령 자동 호출 불가 위험</li>
<li>CLAUDE.md Skills 테이블이 4개만 나열 (실제 7개)</li>
</ol>`,

  '10TX8XRPSA': `<h1>WARN: Hooks 스키마 검증 (J6YDB38FGS)</h1>
<p><strong>구현 파일</strong>: .claude/hooks/validate-output.js</p>
<hr>
<h2>점검 결과</h2>
<table border="1" cellpadding="4">
<tr><th>기능</th><th>구현</th><th>동작</th></tr>
<tr><td>JSON 유효성 검증</td><td>O</td><td>process.exit(1)로 차단 → 정상</td></tr>
<tr><td>유니코드 이스케이프 감지</td><td>O</td><td style="color:red">console.error만 → 차단 안됨</td></tr>
</table>
<h2>문제</h2>
<p>CLAUDE.md 절대 원칙 "유니코드 이스케이프 금지"와 불일치. 감지 후 process.exit(1) 추가 필요.</p>`,

  // Phase2 점검
  '7190U3AHLY': `<h1>Phase2 점검: 컨텍스트 관리</h1>
<p>점검일: 2026-02-24 | PASS 2 / WARN 0 / FAIL 1</p>
<hr>
<table border="1" cellpadding="4">
<tr><th>기능</th><th>판정</th><th>핵심 근거</th></tr>
<tr><td>Memory 컨텍스트 압축</td><td style="color:red"><strong>FAIL</strong></td><td>memory/ 디렉토리와 MEMORY.md 미존재</td></tr>
<tr><td>Subagent 컨텍스트 격리</td><td style="color:green"><strong>PASS</strong></td><td>CLAUDE.md에 Task/Subagent 분리 지침 명확</td></tr>
<tr><td>Context7 + Glob/Grep</td><td style="color:green"><strong>PASS</strong></td><td>context7 MCP 정상 설정, npx 실행 확인</td></tr>
</table>`,

  'AZCD6OA59V': `<h1>FAIL: Memory 컨텍스트 압축 (8DIC9R8V8S)</h1>
<p><strong>구현 파일</strong>: 미존재</p>
<hr>
<h2>문제</h2>
<p>~/.claude/projects/G--MyWrok2-mymind3v0/memory/ 디렉토리와 MEMORY.md 파일이 아예 생성되지 않음.</p>
<h2>영향</h2>
<ul>
<li>세션 간 지식 보존 불가</li>
<li>디버깅 패턴 축적 불가</li>
<li>장기/단기 기억 분리 미작동</li>
</ul>
<h2>조치 필요</h2>
<ol>
<li>memory/ 디렉토리 생성</li>
<li>MEMORY.md 초기화 (200줄 이내 템플릿)</li>
<li>이전 프로젝트(mymind3) 패턴 이전 고려</li>
</ol>`,

  'RAYJWUATJF': `<h1>PASS: Subagent 컨텍스트 격리 (IHC9AY84M0)</h1>
<p><strong>구현 파일</strong>: CLAUDE.md 75~77행</p>
<hr>
<h2>확인 사항</h2>
<ul>
<li>"대규모 탐색은 Task/Subagent로 분리" 명시</li>
<li>"각 서브에이전트는 독립 컨텍스트에서 작업" 명시</li>
<li>"결과만 메인으로 반환 → 요약 오염 방지" 명시</li>
<li>현 세션에서도 TaskCreate/Task tool 정상 사용 확인</li>
</ul>`,

  'CKSUHXPHEQ': `<h1>PASS: Context7 + Glob/Grep (XZ4OQSNY2B)</h1>
<p><strong>구현 파일</strong>: .claude/settings.json 33~36행</p>
<hr>
<h2>확인 사항</h2>
<ul>
<li>context7 MCP 서버: @upstash/context7-mcp@latest 설정 정상</li>
<li>npx 실행 확인: v2.1.2 정상 응답</li>
<li>-y 플래그로 자동 설치 처리</li>
<li>Glob/Grep: Claude Code 내장 도구로 별도 설정 불필요</li>
</ul>`,

  // Phase3 점검
  '44Z3NRH8HM': `<h1>Phase3 점검: 도구/에이전트</h1>
<p>점검일: 2026-02-24 | PASS 2 / WARN 0 / FAIL 1</p>
<hr>
<table border="1" cellpadding="4">
<tr><th>기능</th><th>판정</th><th>핵심 근거</th></tr>
<tr><td>MCP 도구 표준화</td><td style="color:red"><strong>FAIL</strong></td><td>playwright 패키지명 오류 (@anthropic/mcp-playwright는 npm에 없음)</td></tr>
<tr><td>Ralph 무한루프 방지</td><td style="color:green"><strong>PASS</strong></td><td>3중 안전장치 + 참조 문서 완비</td></tr>
<tr><td>PreToolUse 권한 게이트</td><td style="color:green"><strong>PASS</strong></td><td>위험 명령 9종 차단, API 키 감지, 민감 파일 7종 보호</td></tr>
</table>`,

  'ERU8SDCLHF': `<h1>FAIL: MCP 도구 표준화 (W1E5QH26TN)</h1>
<p><strong>구현 파일</strong>: .claude/settings.json 29~32행</p>
<hr>
<h2>문제</h2>
<p>playwright MCP 패키지명이 잘못됨:</p>
<ul>
<li><strong>현재</strong>: <code>@anthropic/mcp-playwright</code> → npm 404 Not Found</li>
<li><strong>올바른</strong>: <code>@playwright/mcp</code> (v0.0.68, 2026-02-14)</li>
</ul>
<h2>수정 방법</h2>
<pre><code>{
  "playwright": {
    "command": "npx",
    "args": ["-y", "@playwright/mcp@latest"]
  }
}</code></pre>
<h2>context7 MCP</h2>
<p>정상 동작 확인됨.</p>`,

  '6JFQ3YUPI6': `<h1>PASS: Ralph 무한루프 방지 (9GTHYGM22N)</h1>
<p><strong>구현 파일</strong>: ralph-checker/SKILL.md + references/ 4개</p>
<hr>
<h2>3중 안전장치</h2>
<ol>
<li><strong>탈출조건</strong>: 8종 유형 (command_success, file_exists, output_contains, no_errors, ui_element, navigation, api_response, screenshot_match)</li>
<li><strong>max_turns</strong>: 기본 10, 최대 20 하드리밋</li>
<li><strong>금지 동작</strong>: 5개 카테고리 (파일삭제, DB파괴, 배포, 시스템설정, 민감정보)</li>
</ol>
<p>추가: Git 체크포인트, 중간 개입 트리거, 롤백 절차, 비상 중단까지 완비.</p>`,

  'FVB8U8B2XL': `<h1>PASS: PreToolUse 권한 게이트 (33WJ1FC7TZ)</h1>
<p><strong>구현 파일</strong>: check-dangerous.js + protect-sensitive.js</p>
<hr>
<h2>차단 현황</h2>
<table border="1" cellpadding="4">
<tr><th>Hook</th><th>대상</th><th>차단 패턴</th></tr>
<tr><td>check-dangerous.js</td><td>Bash</td><td>rm -rf, DROP TABLE, TRUNCATE, DELETE FROM, git push --force, git reset --hard, npm publish, git push origin main/master + API 키 패턴</td></tr>
<tr><td>protect-sensitive.js</td><td>Write/Edit</td><td>.env, credentials.json, .pem, .key, id_rsa, id_ed25519, .mymindmp3</td></tr>
</table>`,

  // Phase4 점검
  'AMOG8PVDBP': `<h1>Phase4 점검: 평가/디버깅</h1>
<p>점검일: 2026-02-24 | PASS 1 / WARN 1 / FAIL 1</p>
<hr>
<table border="1" cellpadding="4">
<tr><th>기능</th><th>판정</th><th>핵심 근거</th></tr>
<tr><td>팀즈 병렬 평가</td><td style="color:green"><strong>PASS</strong></td><td>6 Phase 워크플로우 완성, 8개 에이전트, 에러 처리까지 상세</td></tr>
<tr><td>Hook 기반 관측성</td><td style="color:orange"><strong>WARN</strong></td><td>도구명이 전부 "unknown"으로 기록되어 관측 가치 훼손</td></tr>
<tr><td>PR Review 실험 관리</td><td style="color:red"><strong>FAIL</strong></td><td>완전 미구현</td></tr>
</table>`,

  'L4UH6SB4FV': `<h1>PASS: 팀즈 병렬 평가 (GNWOPRR11D)</h1>
<p><strong>구현 파일</strong>: .claude/skills/팀즈/SKILL.md (340줄)</p>
<hr>
<h2>6 Phase 워크플로우</h2>
<ol>
<li>대상 분석 → 관련 파일 파악</li>
<li>테스트 기획 (test-planner, haiku)</li>
<li>병렬 검사 (api-tester/security-scanner/ui-reviewer, haiku)</li>
<li>적대적 검증 (devil-advocate, sonnet)</li>
<li>결과 집계 (test-aggregator, haiku)</li>
<li>문서 갱신 (doc-generator, haiku, 선택)</li>
</ol>
<p>에이전트 8개, 에러 처리 4종, 백그라운드 실행, Resume 패턴까지 완비.</p>`,

  'LR9NR395U1': `<h1>WARN: Hook 기반 관측성 (2I35MOE2ML)</h1>
<p><strong>구현 파일</strong>: log-action.js + session-summary.js</p>
<hr>
<h2>문제</h2>
<p>로그 파일(session-2026-02-24.log) 262줄 모두 <code>[타임스탬프] unknown</code>으로 기록됨.</p>
<p><code>process.env.CLAUDE_TOOL_NAME</code> 환경변수가 Hook 실행 시 전달되지 않는 것으로 추정.</p>
<h2>영향</h2>
<p>어떤 도구가 호출되었는지 식별 불가 → 관측성 핵심 가치 훼손.</p>
<h2>조치</h2>
<ol>
<li>Claude Code Hook 환경변수 인터페이스 재확인</li>
<li>CLAUDE_TOOL_INPUT에서 도구명 추출 방식으로 변경 고려</li>
</ol>`,

  'POJ64C57MG': `<h1>FAIL: PR Review 실험 관리 (5XK9EMYTHG)</h1>
<p><strong>구현 파일</strong>: 없음 (완전 미구현)</p>
<hr>
<h2>문제</h2>
<ul>
<li>.claude/skills/에 PR Review 스킬 없음</li>
<li>.claude/rules/에 PR Review 규칙 없음</li>
<li>CLAUDE.md에 PR Review 언급 없음</li>
</ul>
<h2>조치 제안</h2>
<ol>
<li>.claude/skills/pr-review/SKILL.md 생성 (자동 리뷰 체크리스트, 코드 품질 워크플로우)</li>
<li>또는 현 프로젝트에서 불필요하다면 설계에서 제외 명시</li>
</ol>`,

  // Phase5 점검
  'THGY8C2FN6': `<h1>Phase5 점검: 운영 안정화</h1>
<p>점검일: 2026-02-24 | PASS 1 / WARN 3 / FAIL 0</p>
<hr>
<table border="1" cellpadding="4">
<tr><th>기능</th><th>판정</th><th>핵심 근거</th></tr>
<tr><td>Memory 지식 보존</td><td style="color:orange"><strong>WARN</strong></td><td>현재 프로젝트 MEMORY.md 미생성</td></tr>
<tr><td>모델 선택 비용 최적화</td><td style="color:green"><strong>PASS</strong></td><td>haiku/sonnet 계층화가 팀즈 스킬에 정확히 적용</td></tr>
<tr><td>3중 보안 체계</td><td style="color:orange"><strong>WARN</strong></td><td>Layer 1~2 완성, Layer 3 독립성 부족</td></tr>
<tr><td>AskUserQuestion HiTL</td><td style="color:orange"><strong>WARN</strong></td><td>차단(exit 1)이지 사용자 확인 아님</td></tr>
</table>`,

  'O8N9PFIYPG': `<h1>WARN: Memory 지식 보존 (OVCIQR95V8)</h1>
<p><strong>구현 파일</strong>: CLAUDE.md 69행 (정책), 이전 프로젝트 MEMORY.md 존재</p>
<hr>
<h2>문제</h2>
<p>현재 프로젝트(mymind3v0)에 MEMORY.md 미생성. 이전 프로젝트(mymind3)에는 58줄, 200줄 이내 기준 충족.</p>
<h2>이전 프로젝트 MEMORY.md 품질</h2>
<p>디버깅 패턴(SVG 아이콘, 노드 속성 불일치, Drive 업로드), 워크플로우 규칙, 프로젝트 구조 등 우수한 내용.</p>`,

  'Y9J0FRFEO5': `<h1>PASS: 모델 선택 비용 최적화 (JYY4YB30W1)</h1>
<p><strong>구현 파일</strong>: CLAUDE.md 116~122행 + 팀즈 SKILL.md</p>
<hr>
<h2>모델 배정 확인</h2>
<table border="1" cellpadding="4">
<tr><th>모델</th><th>에이전트</th><th>이유</th></tr>
<tr><td>haiku</td><td>test-planner, orchestrator, api-tester, security-scanner, ui-reviewer, aggregator, doc-generator (7개)</td><td>단순 패턴 매칭/검사</td></tr>
<tr><td>sonnet</td><td>devil-advocate (1개)</td><td>교차 검증에 상위 모델 필요</td></tr>
</table>
<p>비용 최적화 원리가 실제 적용됨. 대부분 haiku, 핵심 검증만 sonnet.</p>`,

  'DKP9A6XH83': `<h1>WARN: 3중 보안 체계 (YRTG4DAATA)</h1>
<p><strong>구현 파일</strong>: rules/security.md + hooks/ + 팀즈 security-scanner</p>
<hr>
<h2>레이어별 상태</h2>
<table border="1" cellpadding="4">
<tr><th>레이어</th><th>역할</th><th>상태</th></tr>
<tr><td>Layer 1: Rules</td><td>예방</td><td style="color:green">완성 - SQL/XSS/Path Traversal 방지, API 키 규칙</td></tr>
<tr><td>Layer 2: Hooks</td><td>차단</td><td style="color:green">완성 - 위험 명령 9종, 민감 파일 7종, JSON 검증</td></tr>
<tr><td>Layer 3: Agent</td><td>탐지</td><td style="color:orange">부분 - /팀즈 --security로만 호출 가능, 독립 실행 불가</td></tr>
</table>
<h2>개선</h2>
<p>별도 /보안스캔 스킬 또는 PreToolUse Hook에서 보안 패턴 자동 검사 추가 권장.</p>`,

  'TAE1606DND': `<h1>WARN: AskUserQuestion HiTL (JZBK0XBVW5)</h1>
<p><strong>구현 파일</strong>: CLAUDE.md 124~128행, check-dangerous.js, protect-sensitive.js</p>
<hr>
<h2>설계 vs 실제</h2>
<table border="1" cellpadding="4">
<tr><th>항목</th><th>설계</th><th>실제</th></tr>
<tr><td>위험 명령 감지 시</td><td>AskUserQuestion (사용자 확인 후 진행)</td><td style="color:red">process.exit(1) (무조건 차단)</td></tr>
<tr><td>민감 파일 수정 시</td><td>사용자 확인 요청</td><td style="color:red">process.exit(1) (무조건 거부)</td></tr>
</table>
<h2>핵심 문제</h2>
<p>HiTL = "인간이 판단하여 허용/거부 결정". 현재는 Human-out-of-the-Loop(기계적 차단).</p>
<h2>개선</h2>
<ol>
<li>Hook에서 process.exit(2) 또는 stdout 기반 사용자 확인 메커니즘 적용</li>
<li>위험도 3단계 세분화: 낮음(자동), 중간(경고 후 진행), 높음(확인 필수)</li>
</ol>`
};

async function run() {
  const entries = Object.entries(nodes);
  let success = 0;
  let fail = 0;

  // 5개씩 병렬 처리
  for (let i = 0; i < entries.length; i += 5) {
    const batch = entries.slice(i, i + 5);
    const results = await Promise.all(batch.map(([id, content]) => putNode(id, content)));
    for (const r of results) {
      if (r.success) { success++; console.log('OK:', r.nodeId); }
      else { fail++; console.log('FAIL:', r.nodeId, r.error); }
    }
  }

  console.log('---');
  console.log('완료:', success, '성공 /', fail, '실패');
}

run();
