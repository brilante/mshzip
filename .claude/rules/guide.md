# CC체크 시스템 가이드

> Claude Code 자동화 파이프라인 전체 설계 문서  
> 원본 기획 노드: (마인드맵 "개발자가 AI 길들이는 데 6개월 걸린 이유 (시행착오 전부 공개)_1")  
> 하위 8개 노드의 내용을 정리한 참조 가이드

---

## 1. 전체 자동화 플로우

### 파이프라인 개요

```
사용자 명령 입력
    ↓
[자동] TODO 이력 기록
  <todoRootNodeId> → yyyy → yyyyMM → yyyyMMdd
  (user_settings API에서 동적 조회: GET /api/user/settings → data.todoRootNodeId)
  → --set-current로 "N. 명령요약" 노드 생성
  → .claude/current-command-node-{SSE_PORT} 저장
    ↓
CLAUDE.md + Rules 로드 (general / api / security / browser-test / command-log)
    ↓
AI 판단: 도구 선택 (Bash / Write / Edit / Read / Skill / Task ...)
    ↓
PreToolUse Hook Chain (7단계 순차 실행)
    ↓
도구 실제 실행
    ↓
수행(Do) → 검증(Verify) → 보고(Report)  ※ 검증 없는 보고 = 거짓 보고
    ↓
[Stop 이벤트] session-summary.js 자동 실행
  → current-command-node-{SSE_PORT} 읽기 → 세션 요약 추가 → 파일 삭제
```

### 세션별 격리 (멀티 터미널)

```
터미널 A (SSE_PORT=38057): current-command-node-38057 = nodeId-A
터미널 B (SSE_PORT=41023): current-command-node-41023 = nodeId-B
→ 각 세션 종료 시 자기 파일만 읽고 삭제 → 충돌 없음
```

### 상황별 자동 도구 선택

| 상황 | 자동 선택 |
|------|-----------|
| DB 조회/쿼리 | PostgreSQL (src/db 모듈) |
| 브라우저 테스트 | Playwright MCP → /browser-test |
| API 테스트 | mymind-api-tester 에이전트 |
| 보안 점검 | mymind-security-scanner 에이전트 |
| 노드ID 패턴 (10자 영숫자) | /기획 스킬 자동 사용 |
| 팀 테스트 | /팀즈 스킬 |
| 이력 기록 | mm-api.js --mm todo --set-current (세션별 격리) |

---

## 2. PreToolUse Hook Chain (HFIAZ41CX0)

**원칙**: Claude Code가 도구를 호출할 때 실행 전에 Hook이 순차 실행됨. `exit(2)`로 도구 실행 차단.

### Hook 실행 순서 및 매처

| 순서 | Hook 파일 | Matcher | 역할 |
|------|-----------|---------|------|
| 1 | `command-log-enforcer.js` | `*` (전체) | **[TODO 게이트]** 상태파일 없으면 전체 도구 차단 |
| 2 | `check-dangerous.js` | `Bash` | 위험 명령 차단/경고 |
| 3 | `protect-sensitive.js` | `Write\|Edit` | 민감 파일 보호 |
| 4 | `validate-output.js` | `Write\|Edit` | 출력 검증 (JSON, 유니코드) |
| 5 | `security-scan.js` | `Write\|Edit` | 보안 취약점 탐지 |
| 6 | `log-action.js` | `*` (전체) | 액션 로깅 |
| 7 | `cc-check-validator.js` | `*` (전체) | **[CC체크]** 세션당 1회 정합성 검증 |

### 각 Hook 상세

**command-log-enforcer.js (TODO 게이트) (`*`)**
- 상태파일 있음 → 즉시 통과
- 데드락 방지 통과 (Bash 한정): `mm-api.js`, `--set-current`, `api/health`, `cc-check-validator`, `session-summary`, `current-command-node`
- **서버 재시작 예외 (언제나 통과)**: `kill-server`, `_internal/shutdown`, `.server.pid`, `quick-kill`, `node server.js`, `npm start`, `npm run dev`, `npm run start`
- 서버 미실행 또는 mm-api.js 없음 → graceful 통과 (exit 0)
- **서버 정상 + 상태파일 없음 → exit(2) 차단** (출력: hookSpecificOutput JSON)

**check-dangerous.js (Bash)**
- **BLOCKED 11개** → `exit(2)` 즉시 차단:  
  `rm -rf /`, `DROP TABLE`, `TRUNCATE`, `DELETE FROM`, `git push --force`, `git reset --hard`, `npm publish`, `git push origin main`, `git push origin master`, `chmod 777`, `mkfs`
- **WARNED 6개** → 경고만 출력:  
  `rm -rf`, `git push`, `git stash drop`, `git branch -D`, `docker rm`, `docker rmi`
- **API 키 감지**: `sk-[a-zA-Z0-9]{20,}` 또는 `Bearer\s+[a-zA-Z0-9_-]{30,}` → 차단
- 공백/탭 정규화: `replace(/\s+/g, ' ')` 처리 (우회 방지)

**protect-sensitive.js (Write|Edit)**
- 보호 대상 9종: `.env`, `.pem`, `.key`, `id_rsa`, `id_ed25519`, `credentials.json`, `.mymindmp3`, `.htpasswd`, `shadow`
- 파일 경로에 위 패턴 포함 시 `exit(2)` 차단

**validate-output.js (Write|Edit)**
- `.json` 파일 → `JSON.parse()`로 유효성 확인 → 실패 시 차단
- 유니코드 이스케이프 `/\\u[0-9a-fA-F]{4}/` 감지 → 차단
- Edit 도구의 `new_string` 필드도 검사

**security-scan.js (Write|Edit)**
- 대상: JS/HTML/TS/JSX/TSX 파일만
- **BLOCK 패턴**: `eval()` (코드 인젝션), 템플릿 리터럴 SQL (SQL Injection), API 키 하드코딩
- **WARN 패턴**: `innerHTML =`, `document.write()`, `new Function()`, `child_process exec()`, 문자열 연결 SQL, 비밀번호 하드코딩

**log-action.js (`*`)**
- 도구명 결정: 환경변수 `CLAUDE_TOOL_NAME` → stdin JSON → `inferToolName()` (16종)
- Bash 명령 분류: `classifyBashAction()` 25가지 (git/npm/node/HTTP 등)
- 기록: `.claude/logs/session-{YYYY-MM-DD}.log`

**cc-check-validator.js (`*`)**
- TODO 상태파일 없으면 건너뜀 (순서: 명령 등록 → CC체크)
- 세션당 1회만 실행 (session_id 또는 SSE_PORT 기반)
- **차단 없이 경고만 출력**

### 도구별 Hook 실행 매트릭스

| 도구 | TODO게이트 | 위험차단 | 파일보호 | 검증 | 보안 | 로깅 | CC체크 |
|------|-----------|---------|---------|------|------|------|--------|
| Bash | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Write | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Glob/Grep | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Skill/Task | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 3. 스킬 자동 트리거 시스템

스킬은 `.claude/skills/{name}/SKILL.md`에 정의된 전문 기능 모듈.  
`/스킬명`으로 명시 호출하거나 CLAUDE.md 자동 인식 규칙으로 트리거.

### /기획 - 마인드맵 노드 관리

- **트리거**: `/기획 R|W|LOG <노드ID>` 또는 **영숫자 10자리 패턴 자동 인식**
- **동작**:
  - `R` (읽기): `GET /api/skill/node/{nodeId}`
  - `W` (쓰기): `PUT /api/skill/node/{mmId}/{nodeId}` (append 모드)
  - `LOG` (이력 기록): 타임스탬프 + 구조화 형식으로 append
- **규칙**: 노드 생성/수정 후 반드시 R로 검증

### /팀즈 - 에이전트 팀 병렬 테스트

- **트리거**: `/팀즈 "검증 대상"`
- **6단계 파이프라인**:

```
Phase 1: 대상 분석 (메인)
Phase 2: 테스트 기획 (haiku → test-planner)
Phase 3: 병렬 팀 검사 (3개 동시)
  ├─ api-tester (haiku)
  ├─ security-scanner (haiku)
  └─ ui-reviewer (haiku)
Phase 4: 적대적 검증 (sonnet → devil-advocate)
Phase 5: 결과 집계 (haiku → aggregator)
Phase 6: 문서 갱신 (선택, haiku → doc-generator)
```

- **옵션**: `--api`, `--security`, `--ui`, `--skip-advocate`, `--with-docs`, `--기록 <nodeId>`

### /browser-test - QA 브라우저 테스트

- **도구**: Playwright MCP 서버
- **규칙**: Modal 감지 → `browser_handle_dialog` 즉시, 실패 시 재시도 금지 → API 직접 호출 전환

### /랄프 (Ralph Loop) - 자동 반복 구현

- **트리거**: `/랄프 "목표 + 탈출조건"`
- **3중 안전장치**: 탈출조건(논리) + max_turns:20(물리) + 금지 동작 목록
- **탈출조건 유형**: 정량적(응답 < 3초), 기능적(로그인 성공), 품질적(에러 0건)

### /pr-review - PR 코드 리뷰

- **3단계 병렬 분석**: code-reviewer / code-simplifier / silent-failure-detector (모두 haiku)
- **출력**: PASS/WARN/FAIL 분류 리포트

### /kill-server - 웹서버 강제 종료

- **3단계 종료 순서**: HTTP shutdown → PID 파일 → 포트 기반(netstat)
- **허용 포트**: 4848, 3999, 5858

### /노드추출 - UI 흐름 → 마인드맵 변환

- 6단계: Access Key 검증 → 탐색 흐름 분석 → 노드 ID 생성 → JSON 생성 → API 저장 → 결과 보고

### /order-validator - 명령 충돌 검사

- 이력 노드에서 최근 5건 읽기 → 현재 명령과 충돌 패턴 비교
- 충돌 유형: 대상 충돌, 방향 충돌, 범위 충돌, 목표 전환

---

## 4. 분산 규칙 시스템

규칙 파일(`.md`)은 Claude Code 시스템 프롬프트에 **자동 주입**됨.  
Hook의 "사후 차단"과 달리 **예방적(Preventive)** 역할.

### general.md - 공통 규칙

| 항목 | 규칙 |
|------|------|
| 응답 언어 | 모든 응답/주석: **한글** |
| 들여쓰기 | 2 spaces |
| 따옴표 | 작은따옴표('') 우선 |
| 변수/함수 | camelCase |
| 클래스 | PascalCase |
| 상수 | UPPER_SNAKE_CASE |
| 파일명 | kebab-case.js |

**절대 금지**: 외부 API 직접 호출, iframe 사용, Git 쓰기 자동 실행

### api.md - API 설계 규칙

- 응답 스키마: `{ success: true, data: {}, error: null }`
- 에러 코드: VALIDATION_ERROR(400), UNAUTHORIZED(401), NOT_FOUND(404), RATE_LIMITED(429), INTERNAL_ERROR(500)
- **API 중복 금지**: 동일 기능은 하나의 엔드포인트만

### security.md - 보안 규칙

| 취약점 | 방지 방법 |
|--------|-----------|
| SQL Injection | 파라미터화 쿼리 (`?` 바인딩) |
| XSS | `textContent` 사용, `innerHTML` 지양 |
| Path Traversal | `path.resolve()` + 기준 경로 검증 |

API 키: 환경 변수 사용, 클라이언트 노출 및 하드코딩 절대 금지

### browser-test.md - 브라우저 테스트 규칙

- Modal 감지 → `browser_handle_dialog` 즉시 호출
- 캐시 히트 → 스냅샷 스킵, 직접 액션
- 브라우저 에러 → 재시도 금지 → API 직접 호출 전환

### command-log.md - 명령 이력 기록 규칙

- 명령 수신 **즉시** 이력 노드 생성 (코드 작성보다 먼저)
- 3단계 경로 탐색: `<todoRootNodeId> → yyyy → yyyyMM → yyyyMMdd` (루트ID는 user_settings API에서 동적 조회)
- `--set-current` 필수: 세션별 상태 파일에 활성 노드 ID 저장
- 기록 제외: 단순 파일 읽기, 검색, 질문 응답

### Rules vs Hooks vs CLAUDE.md 비교

| 구분 | Rules | Hooks | CLAUDE.md |
|------|-------|-------|-----------|
| 역할 | 예방 (지침) | 차단/검증 | 전체 설계 |
| 적용 시점 | 코드 생성 시 | 도구 실행 전 | 세션 시작 시 |
| 형식 | Markdown | JavaScript | Markdown |
| 강제력 | **권고(Soft)** | **강제(Hard)** | **권고(Soft)** |

---

## 5. 세션 생명주기

### Phase A: 세션 시작

```
Claude Code 실행 (고유 CLAUDE_CODE_SSE_PORT 할당)
    ↓
[1] CLAUDE.md + Rules 로드
    ├─ .claude/rules/*.md (5개: general, api, security, browser-test, command-log)
    └─ MEMORY.md (Auto Memory)
    ↓
[2] 마인드맵 서버 접근 확인 (localhost:5858)
    ├─ 성공 → 정상 동작
    └─ 실패 → 정적 규칙만으로 동작, 경고 출력
    ↓
[3] TODO 3단계 날짜 노드 준비
    <todoRootNodeId> → yyyy → yyyyMM → yyyyMMdd
    (없는 노드는 순서대로 생성, 다음 명령 번호 결정)
    ↓
[4] [Session Recovery] 메시지 시 → 사용자 알림 + 진행 여부 확인
```

### Phase B: 명령 수행

```
사용자 명령 입력
    ↓
[1] 이력 노드 생성 (--set-current 필수, 명령 원문 content 필수)
    mm-api.js --mm todo --set-current add-child <년월일ID> "N. 명령" "원문"
    → .claude/current-command-node-{SSE_PORT}에 생성된 노드 ID 저장
    ↓
[2] 명령 분석 + 자동 트리거
    ├─ "테스트" 포함? → 테스트 기획 선행 후 사용자 승인
    ├─ 3파일 이상 변경? → Plan Mode 진입
    ├─ 노드ID 패턴? → /기획 스킬 자동 사용
    └─ 위험도 판단 → HiTL 3단계
    ↓
[3] 도구 선택 + Hook Chain (반복)
    ↓
[4] 수행 후 검증 (최우선 규칙)
    코드 수정 → 서버 재시작 or 기능 실행 확인
    API 수정 → 실제 API 호출 확인
    ↓
[5] 수행 완료 후 이력 노드에 "수행 및 테스트 결과" 하위 노드 추가
```

### Phase C: 세션 종료

```
세션 종료 트리거
    ↓
session-summary.js 자동 실행
    ├─ 당일 로그 집계 (.claude/logs/session-{YYYY-MM-DD}.log)
    └─ fallback 체인:
        [1차] .claude/current-command-node-{SSE_PORT}  ← 세션별 파일
        [2차] .claude/current-command-node              ← 범용 파일
        [3차] findOrCreateDateNode(today)              ← 날짜 노드 생성
        → 해당 노드 하위에 "세션 요약 HH:MM" 추가
        → 세션별 파일 삭제 (정리)
```

### mm-api.js 헬퍼 명령어

```bash
# 3단계 경로 탐색
node testpy/mm-api.js --mm todo children <todoRootNodeId>  # 년도 목록  ← 루트ID는 user_settings API 조회
node testpy/mm-api.js --mm todo children <년도ID>           # 년월 목록
node testpy/mm-api.js --mm todo children <년월ID>           # 년월일 목록

# 명령 노드 생성 (--set-current 필수)
node testpy/mm-api.js --mm todo --set-current add-child <년월일ID> "N. 명령" "원문"

# 하위 상세 노드 생성
node testpy/mm-api.js --mm todo add-child <명령ID> "명령 수행 계획수립" "<p>내용</p>"
node testpy/mm-api.js --mm todo add-child <명령ID> "수행 및 테스트 결과" "<p>내용</p>"

# 읽기/쓰기
node testpy/mm-api.js --mm todo write <nodeId> "내용"
node testpy/mm-api.js --mm todo append <nodeId> "추가 내용"
```

---

## 6. 3중 보안 체계

```
Layer 1: Rules (예방)   → AI가 안전한 코드를 생성하도록 지침
    ↓
Layer 2: Hooks (차단)   → 위험한 도구 호출을 실행 전 강제 차단
    ↓
Layer 3: Agent (탐지)   → 실행 후 보안 취약점 탐지/보고
```

### 보안 체계 커버리지

| 공격 벡터 | L1:Rules | L2:Hooks | L3:Agent |
|-----------|---------|---------|---------|
| SQL Injection | ✅ 지침 | ✅ 차단 | ✅ 탐지 |
| XSS | ✅ 지침 | ⚠️ 경고 | ✅ 탐지 |
| API 키 노출 | ✅ 지침 | ✅ 차단 | ✅ 탐지 |
| 위험 명령 | ✅ 지침 | ✅ 차단 | - |
| 민감 파일 | ✅ 지침 | ✅ 차단 | - |
| 코드 인젝션 | - | ✅ 차단 | ✅ 탐지 |
| Path Traversal | ✅ 지침 | - | ✅ 탐지 |

**Layer 3 에이전트**: `/팀즈` 스킬 실행 시 mymind-security-scanner 서브에이전트로 전체 코드베이스 스캔 + OWASP Top 10 점검

---

## 7. 마인드맵 이력 관리 시스템

### 5단계 트리 구조

```
<todoRootNodeId> (TODO, user_settings에서 조회)
├── Level 1: 년도 (yyyy)          2026, 2027, ...
├── Level 2: 년월 (yyyyMM)        202602, 202603, ...
├── Level 3: 년월일 (yyyyMMdd)    20260224, 20260225, ...
├── Level 4: 명령 노드             "N. 명령요약" ← --set-current로 생성
└── Level 5: 상세 노드             ① 명령 수행 계획수립 / ② 수행 및 테스트 결과 / ③ 세션 요약(자동)
```

### 아키텍처 버전 이력

| 항목 | v1 | v2 | v3 | v4 (현재) |
|------|----|----|----|----|
| 상태 파일 | 없음 | 공유 1개 | 공유 1개 | **세션별 (SSE_PORT)** |
| 동시 실행 | 미지원 | ❌ 경합 | ❌ 경합 | **✅ 격리** |
| 종료 시 정리 | 없음 | 없음 | 없음 | **파일 삭제** |

### 핵심 파일

| 파일 | 역할 |
|------|------|
| `.claude/current-command-node-{PORT}` | 세션별 활성 명령 노드 ID (생성→읽기→삭제) |
| `.claude/logs/session-{date}.log` | 도구 사용 로그 |
| `.claude/hooks/session-summary.js` | Stop Hook: 세션 요약 생성 |
| `.claude/rules/command-log.md` | 명령 이력 기록 규칙 |
| `testpy/mm-api.js` | 헬퍼 스크립트 |

### 핵심 노드 ID 맵

| 마인드맵 | 노드 ID | 역할 |
|----------|---------|------|
| TODO | `<todoRootNodeId>` (user_settings API 조회) | **이력 루트** |
| 기획 마인드맵 | `ZCMJPYR5R4` | 동적 규칙 저장소 |
| 기획 마인드맵 | `8QIA56Z3PS` | 종합 CC 노드 |
| 기획 마인드맵 | `EUDC5SXHH7` | 자동화 플로우차트 기획 문서 (이 가이드의 원본) |

### 저장소 역할 분리

| 저장소 | 역할 | 수명 |
|--------|------|------|
| MEMORY.md | 장기 기억 (패턴, 결정, 디버깅) | 프로젝트 전체 |
| TODO | 명령 이력 (매 명령 상세 기록) | 날짜별 누적 |
| `current-command-node-{PORT}` | 현재 활성 명령 노드 | **세션 단위** |
| `.claude/logs/` | 도구 사용 로그 | 일별 |

---

## 8. 모델 선택 및 MCP 연동

### 모델 선택 전략

| 작업 유형 | 모델 | 비용 비율 |
|-----------|------|-----------|
| 파일 탐색, 패턴 매칭 | **haiku** | 1x (최저) |
| 코드 생성, 일반 개발 | **sonnet** | 5x |
| 아키텍처 결정, 복잡한 추론 | **opus** | 25x (최고) |

### 스킬별 모델 할당

```
/팀즈:
  test-planner, api-tester, security-scanner, ui-reviewer, aggregator, doc-generator → haiku
  devil-advocate → sonnet (교차 검증, 높은 추론)

/pr-review:
  code-reviewer, code-simplifier, silent-failure-detector → haiku
```

### MCP 서버 설정 (`.claude/settings.json`)

**1. Playwright MCP**
```json
{
  "playwright": {
    "command": "npx",
    "args": ["-y", "@playwright/mcp@latest"]
  }
}
```
- 주요 도구: `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_handle_dialog`, `browser_run_code`
- 연관: `/browser-test` 스킬, `browser-test.md` 규칙

**2. Context7 MCP**
```json
{
  "context7": {
    "command": "npx",
    "args": ["-y", "@upstash/context7-mcp@latest"]
  }
}
```
- 용도: npm 패키지명으로 최신 API 문서를 실시간 조회

### 서브에이전트 컨텍스트 격리

```
메인 에이전트 → Task 도구 → 서브에이전트 (독립 컨텍스트)
  ├─ 메인 컨텍스트 오염 방지
  ├─ 병렬 실행으로 속도 향상
  └─ 결과(요약)만 메인으로 반환
```

### Phase0~5 자동화 체계 요약

| Phase | 이름 | 핵심 기능 |
|-------|------|-----------|
| 0 | 목표 수립 | 수행→검증→보고, Plan Mode, 파급 영향 분석 |
| 1 | 프롬프트 구조화 | 분산 규칙, Skills 전문화 |
| 2 | 컨텍스트 관리 | Auto Memory, Subagent 격리 |
| 3 | 도구/에이전트 | MCP Server, Ralph Loop |
| 4 | 평가/디버깅 | 팀즈 병렬 평가, Hook 관측성 |
| 5 | 운영 안정화 | 3중 보안, 모델 최적화, HiTL |

---

## CC체크 자동 검증 기준 (cc-check-validator.js)

`cc-check-validator.js`가 세션당 1회 자동 실행하여 아래 항목을 검증:

| # | 검증 항목 | 기준 |
|---|----------|------|
| 1 | PreToolUse Hook Chain | settings.json에 7개 훅이 올바른 순서로 등록 |
| 2 | Hook 파일 존재 | 8개 JS 파일 모두 존재 |
| 3 | Rules 파일 존재 | 5개 Markdown 파일 모두 존재 |
| 4 | Skills 존재 | 7개 스킬 SKILL.md 모두 존재 |
| 5 | MCP 서버 | playwright, context7 2개 등록 |
| 6 | Stop Hook | session-summary.js 등록 |

```bash
# 수동 검증
node .claude/hooks/cc-check-validator.js
```

---

*최종 업데이트: 2026-02-26 | 원본 노드: EUDC5SXHH7 (CC체크) + 하위 8개 노드*
