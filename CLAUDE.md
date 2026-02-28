# CLAUDE.md - AI 길들이기 프로젝트 (CC 구현 설계)

> Claude Code 13종 기능을 활용한 AI 개발 프로젝트 템플릿
> 원본 설계: BXAE7QI0AI (CC 구현 설계)

## 로컬 테스트

| 항목 | 값 |
|------|-----|
| **URL** | `http://localhost:5858/` (`.env` PORT 확인) |
| **계정 (Admin, OAuth)** | `.env` TEST_ADMIN_USERNAME / TEST_ADMIN_PASSWORD |
| **계정 (Playwright)** | `Brilante33` / `Zkfltmak33` (`.env` TEST_ADMIN 계정, OAuth) |
| **관리자 비밀번호** | `1` (관리자 인증 팝업 → 입력값 `1` 입력 후 확인) |
| **테스트 카드** | `testpy/md5/테스트 카드 정보.md` 참조 |

### 관리자 인증 팝업 자동 처리

브라우저 테스트 또는 UI 조작 중 **"관리자 인증"** 팝업이 표시되면 자동으로 처리:
1. 비밀번호 입력란에 `1` 입력
2. **확인** 버튼 클릭

Playwright 코드 예시:
```javascript
// 관리자 인증 팝업 감지 시 자동 처리
const adminPasswordInput = await page.$('.admin-auth-modal input[type="password"], #adminPassword');
if (adminPasswordInput) {
  await adminPasswordInput.fill('1');
  const confirmBtn = await page.$('.admin-auth-modal .btn-primary, .admin-auth-modal button:has-text("확인")');
  if (confirmBtn) await confirmBtn.click();
}
```

## 프로젝트 개요

- **MyMind3**: AI 마인드맵 웹앱
- **기술**: Node.js, Express, PostgreSQL, Vanilla JS
- **AI**: OpenAI, Claude, Gemini, Grok
- **읽기 전용 참고소스**: `G:\MyWrok\mymind3` (MyMind3 본체, 수정 금지)

## 마인드맵 연동 설정

### 연동 MyMind3 계정 (Claude Code ↔ MyMind3 연결 기준)

> Claude Code와 MyMind3를 연동하는 계정은 `brilante33` (`.env` TEST_ADMIN 계정).
> Access Key 인증으로 마인드맵 API에 접근하며, user_settings에서 todoRootNodeId를 조회해 TODO 이력을 기록함.

| 항목 | 값 | 출처 |
|------|-----|------|
| **연동 사용자명** | `brilante33` | `.env` `TEST_ADMIN_USERNAME` (Access Key 소유자) |
| **연동 이메일** | `brilante33@gmail.com` | `.env` `TEST_ADMIN_EMAIL` |
| **인증 키 파일** | `G:/USER/brilante33/.mymindmp3` | Access Key (sha256 해시) |
| **저장소 해시** | `JDJiJDEwJFFHcE9Tc3pkWkl2bDZncjVKWm5pdmVjVnR2bXEvbXguNDVURnVVQ2JzTFVxcklnOVVlL1NXUeWah5faIQcX66ccmeX4` | brilante33 계정 마인드맵 저장소 |
| **저장소 물리경로** | `save/2025/202512/20251217/{저장소 해시}/` | 날짜 기반 경로 (DB `user_id_mapping.date_path`) |

> Hook들은 `GET /api/user/settings → data.todoRootNodeId`에서 실시간 조회하여 사용. **하드코딩 금지.**

### 저장소 경로 아키텍처

**경로 구조**: 날짜 기반 경로 (`save/{yyyy}/{yyyyMM}/{yyyyMMdd}/{hash}/`) + 레거시 경로 (`save/{hash}/`)

```
save/
├── 2025/202512/20251217/           ← 날짜 기반 (신규 사용자)
│   └── JDJiJDEw...UeWah5fa.../    ← brilante33 저장소 해시
│       ├── .userid                 ← 소유자 식별 파일 ("brilante33")
│       ├── {마인드맵명}/           ← 마인드맵 폴더
│       │   └── {마인드맵명}.json
│       └── 기획 마인드맵/
│           └── ...
└── JDJiJDEw.../                    ← 레거시 경로 (기존 사용자, date_path 없음)
```

**핵심 테이블**: `user_id_mapping` (PostgreSQL)

| 컬럼 | 설명 | 예시 |
|------|------|------|
| `user_id` | 사용자명 (UNIQUE 키) | `brilante33` |
| `user_id_hash` | bcrypt+base64 해시 (100자) | `JDJiJDEwJFFH...` |
| `date_path` | 날짜 경로 | `2025/202512/20251217` |
| `legacy_folder` | 레거시 폴더 (base64) | `YnJpbGFudGUzMw==` |

**경로 해석 흐름** (`resolveUserPath(username)`):
1. `user_id_mapping`에서 `user_id = username` 조회
2. `date_path` 있으면 → `save/{date_path}/{hash}/` (날짜 기반)
3. `date_path` 없으면 → `save/{hash}/` (레거시)

**폴더 소유자 확인**: `.userid` 마커 파일 (텍스트, 소유자 username 기록). `getUserFolder()` 4단계 폴백:
1. 소유 날짜 디렉토리 (`.userid` 일치)
2. 소유 레거시 디렉토리 (`.userid` 일치)
3. 날짜 디렉토리 (소유 무관, 마인드맵 존재)
4. 레거시 디렉토리 (소유 무관, 마인드맵 존재)

### 기획 마인드맵 (기본)

| 항목 | 값 |
|------|-----|
| **마인드맵 ID** | `개발자가 AI 길들이는 데 6개월 걸린 이유 (시행착오 전부 공개)_1` |
| **저장소** | `JDJiJDEwJFFHcE9Tc3pkWkl2bDZncjVKWm5pdmVjVnR2bXEvbXguNDVURnVVQ2JzTFVxcklnOVVlL1NXUeWah5faIQcX66ccmeX4` (brilante33 계정) |
| **서버** | `http://localhost:{PORT}` (`.env` PORT 값 사용, 기본 5858) |
| **인증** | `X-Access-Key-Hash` (sha256, 키 파일: `G:/USER/brilante33/.mymindmp3`) |
| **종합 CC 노드** | `8QIA56Z3PS` |
| **헬퍼** | `node testpy/mm-api.js <명령> [args]` |

### TODO 마인드맵 (이력 관리)

| 항목 | 값 |
|------|-----|
| **마인드맵 ID** | user_settings API 동적 조회 (마인드맵명 하드코딩 금지) |
| **저장소** | `JDJiJDEwJFFHcE9Tc3pkWkl2bDZncjVKWm5pdmVjVnR2bXEvbXguNDVURnVVQ2JzTFVxcklnOVVlL1NXUeWah5faIQcX66ccmeX4` (brilante33 계정) |
| **이력 루트 노드** | user_settings API 동적 조회: `GET /api/user/settings → data.todoRootNodeId` (하드코딩 금지) |
| **헬퍼** | `node testpy/mm-api.js --mm todo <명령> [args]` |

### 세션 시작 규칙

> ⚠️ **절대 원칙**: 사용자 명령 수신 시 **첫 번째 행동은 반드시 TODO 등록**.
> TODO 등록 완료 전에는 **서버 재시작 명령을 제외한 어떠한 명령도 수행 불가**.
> (이 규칙은 command-log-enforcer Hook이 강제 차단으로 실행함)

> **필수 순서**: 명령 접수 → ① **TODO 등록 (최우선, 차단 해제 조건)** → ② 작업 수행 → ③ CC체크

1. **[TODO 등록 — 최우선]** 마인드맵 서버 확인 후 즉시 명령 노드 등록:
   - `todoRootNodeId`(user_settings API 자동 조회) → `yyyy` → `yyyyMM` → `yyyyMMdd` 경로 탐색/생성
   - `--set-current`로 명령 노드 생성 → 이 시점에 모든 도구 차단 해제
   - 명령 노드 제목: 사용자 실제 명령 요약 (범용 제목 금지)
   - **⚠️ TODO 등록 전 시도 가능한 명령: `mm-api.js` 호출, 서버 재시작만 허용**
2. **[CC체크] 검증**: cc-check-validator가 TODO 상태파일 확인 후 자동 실행 (세션당 1회)
3. **최근 이력 확인**: 오늘 날짜 노드의 마지막 명령 번호 확인 (다음 번호 결정)
4. 서버 미실행 시 → 정적 규칙(`.claude/rules/`)만으로 동작, 경고 출력

### 명령 이력 기록 규칙 (TODO)

**구조**: `todoRootNodeId`(user_settings API 실시간 조회) → `yyyy` (년도) → `yyyyMM` (년월) → `yyyyMMdd` (년월일) → `N. 명령내용` (순번) → 3-노드 구조

```
<todoRootNodeId> (TODO, user_settings에서 조회)
├── 2026 (년도)
│   └── 202602 (년월)
│       └── 20260225 (년월일)
│           ├── 1. 이력 형식 고도화
│           │   ├── 명령 수행 계획수립
│           │   ├── 수행 및 테스트 결과
│           │   └── 세션 요약
│           └── 2. 다크모드 버그 수정
│               ├── 명령 수행 계획수립
│               ├── 수행 및 테스트 결과
│               └── 세션 요약
└── 2027 (다음 년도 → 자동 생성)
    └── 202701
        └── 20270101
            └── 1. 새 명령 ...
```

**기록 시점과 흐름**:

| 단계 | 시점 | 동작 |
|------|------|------|
| 1. 명령 접수 | 사용자 명령 수신 직후 | 날짜 노드 확인/생성 → `--set-current`로 명령 노드 생성 (content: 원본 명령, 덮어쓰기 금지) |
| 2-a. 계획 수립 | 구현 시작 전 | "명령 수행 계획수립" 하위 노드 추가 (분석+계획+Mermaid 플로우차트) |
| 2-b. 수행 완료 | 구현+테스트 완료 시 | "수행 및 테스트 결과" 하위 노드 추가 (결과 통합) |
| 3. 세션 종료 | Stop Hook 자동 | `session-summary.js`가 "세션 요약" 하위 노드 추가 |

**`--set-current` 필수**: 명령 노드 생성 시 반드시 `--set-current`를 붙여야 세션 종료 시 해당 노드 하위에 세션 요약이 기록됨. 상태 파일: `.claude/current-command-node-{SSE_PORT}` (세션별 고유, `CLAUDE_CODE_SSE_PORT` 환경변수 기반)

**상태파일 생성/복원 원칙**:
- `--set-current` 실행 시: 로컬 상태파일 + `POST /api/user/settings { currentCommandNodeId }` **동시 저장**
- 새 세션 시작 시 (상태파일 없음): `GET /api/user/settings → currentCommandNodeId` 조회 후 상태파일 자동 생성 → 직접 통과
- 사용자가 노드를 변경 시: `node testpy/mm-api.js set-current <nodeId>` 로 파일+API 동기화

**헬퍼 사용법**:
```bash
# user_settings API에서 동적 조회: GET /api/user/settings → data.todoRootNodeId
# 실제 루트ID는 user-prompt-submit.js가 안내를 맡 때 자동 주입함 (로컬 하드코딩 금지)

# 3단계 경로 탐색 (년도 → 년월 → 년월일)
node testpy/mm-api.js --mm todo children <todoRootNodeId>    # → 년도 노드 목록
node testpy/mm-api.js --mm todo children <년도노드ID>         # → 년월 노드 목록
node testpy/mm-api.js --mm todo children <년월노드ID>         # → 년월일 노드 목록

# 없는 단계 생성 (년도 → 년월 → 년월일 순서)
node testpy/mm-api.js --mm todo add-child <todoRootNodeId> "2026"
node testpy/mm-api.js --mm todo add-child <년도노드ID> "202602"
node testpy/mm-api.js --mm todo add-child <년월노드ID> "20260225"

# 명령 노드 생성 (--set-current 필수, 명령 원문 content 필수)
node testpy/mm-api.js --mm todo --set-current add-child <년월일노드ID> "3. 새 기능 구현" "사용자 명령 원문"

# 명령 수행 계획수립 노드 생성 (구현 시작 전)
node testpy/mm-api.js --mm todo add-child <명령노드ID> "명령 수행 계획수립" "<계획 HTML content>"

# 수행 및 테스트 결과 노드 생성 (구현+테스트 완료 시)
node testpy/mm-api.js --mm todo add-child <명령노드ID> "수행 및 테스트 결과" "<결과 HTML content>"
```

**명령 노드 content (원본 보존 원칙)**: 명령 노드의 content에는 사용자의 원본 명령을 그대로 저장한다. 완료 후 `write` 덮어쓰기는 금지. 요약 정보는 "수행 및 테스트 결과" 하위 노드에 기록.

**하위 노드 유형 (3-노드 구조)**:

| 하위 노드 제목 | 생성 시점 | 용도 |
|---------------|----------|------|
| `명령 수행 계획수립` | 구현 시작 전 | 명령 분석, 영향 범위, 구현 단계, 검증 기준, Mermaid 플로우차트 |
| `수행 및 테스트 결과` | 구현+테스트 완료 시 | 수정 파일, 구현 상세, 테스트 항목/결과 (table), 에러 해결 |
| `세션 요약` | 세션 종료 시 (자동) | session-summary.js가 도구별 사용 횟수 집계하여 자동 생성 |

**기록 제외**: 단순 파일 읽기, 검색, 질문 응답 (코드 변경이 없는 작업)

**금지 제목**: "세션 작업", "세션 자동 등록" 등 범용/무의미한 제목의 명령 노드 생성 금지. 반드시 사용자 실제 명령을 요약한 제목 사용

## Phase0 → 목표 수립 자동화

### 수행 후 검증 필수 (최우선 규칙)

**핵심 원칙**: 수행(Do) → 검증(Verify) → 보고(Report). 검증 없는 보고는 거짓 보고와 동일

| 수행 유형 | 필수 검증 방법 |
|-----------|---------------|
| 코드 수정 | 서버 재시작 or 해당 기능 실행하여 에러 없음 확인 |
| API 수정 | 실제 API 호출하여 응답 확인 (curl/fetch/브라우저) |
| DB 스키마 변경 | 마이그레이션 실행 + 관련 CRUD 동작 확인 |
| 프론트엔드 수정 | 브라우저에서 실제 렌더링/동작 확인 |
| 파일 생성/수정 | 파일 다시 읽어서 내용이 의도대로인지 확인 |

**검증 보고 형식:**
```
[검증] ✅ 성공 - 검증 방법: {어떻게 검증했는지}, 결과: {실제 확인한 내용}
[검증] ❌ 실패 - 검증 방법: {어떻게 검증했는지}, 오류: {실제 발생한 에러}
```

**절대 금지:**
- 코드만 작성하고 "수정 완료했습니다"로 끝내기
- 에러 로그를 확인하지 않고 성공 보고
- "문법적으로 올바르므로 동작할 것입니다" 식의 추측 보고

### 테스트 기획 선행 규칙

사용자 메시지에 **"테스트"** 단어가 포함되면 자동 트리거:
1. **기획 단계**: 테스트 대상, 범위, 시나리오, 검증 기준, 방법 정의
2. **사용자에게 기획 먼저 제시** → 승인 후 수행
3. **수행 단계**: 기획에 따라 순서대로 실행, 결과 기록

### Plan Mode 자동 진입

다음 조건에서 **EnterPlanMode** 사용:
1. 새 기능 구현 (3개 이상 파일 변경 예상)
2. 아키텍처 변경 또는 다수의 접근 방식 존재
3. 기존 동작에 영향을 주는 코드 수정
4. 요구사항이 불명확하여 탐색이 필요한 경우

Plan Mode 내 필수 산출물:
- **기능 지표**: 구체적 동작 확인 항목
- **품질 지표**: 에러율, 테스트 통과 기준
- **완료 기준**: PASS/FAIL 판단 조건 → ExitPlanMode로 사용자 승인

### 파급 영향 분석 필수

코드 수정 전 반드시:
1. **호출부 추적**: Grep으로 모든 호출 위치 파악
2. **시그니처 변경 시**: 모든 호출부 동시 수정
3. **공유 상태 확인**: 전역 변수, export, DB 스키마 의존 모듈 전수 확인
4. **최소 변경 원칙**: 목표 달성에 필요한 최소한만 수정

## Phase1 → 프롬프트 구조화

### 분산 규칙 시스템

상세 규칙은 `.claude/rules/` 참조:
- `general.md` - 공통 규칙 (네이밍, 스타일, 언어)
- `security.md` - 보안 규칙 (SQL Injection, XSS, API 키)
- `api.md` - API 설계 규칙 (RESTful, 에러 코드)
- `browser-test.md` - 브라우저 테스트 규칙
- **`guide.md` - CC체크 시스템 전체 가이드 (EUDC5SXHH7 기획 기반, Hook/Skill/Rules/세션 상세 명세)**

### Skills 역할 전문화

| Skill | 역할 | 호출 |
|-------|------|------|
| /기획 | 기획 문서 전문가 | `/기획 R <노드ID>` |
| /browser-test | QA 전문가 | `/browser-test` |
| /랄프 | 자동 반복 구현 | `/랄프 "목표"` |
| /팀즈 | 팀 테스트 관리 | `/팀즈 "검증 대상"` |
| /pr-review | PR 코드 리뷰 | `/pr-review` |
| /kill-server | 웹서버 강제 종료 | `/kill-server` |
| /노드추출 | UI→마인드맵 변환 | `/노드추출` |

## Phase2 → 컨텍스트 관리

### Auto Memory

- 세션 간 지식 보존: `~/.claude/projects/{project}/memory/MEMORY.md`
- 장기 기억(Memory) + 단기 기억(세션) 분리
- 저장 대상: 안정적 패턴, 아키텍처 결정, 디버깅 패턴

### Subagent 컨텍스트 격리

- 대규모 탐색은 Task/Subagent로 분리
- 각 서브에이전트는 독립 컨텍스트에서 작업
- 결과만 메인으로 반환 → 요약 오염 방지

## Phase3 → 도구/에이전트 안정화

### MCP Server

`.claude/settings.json`에서 MCP Server 설정 관리

### Ralph Loop 탈출조건

```
/랄프 "목표 + 탈출조건"
→ 탈출조건: [정량적 기준]
→ max_turns: 20 (하드 리밋)
→ 금지 동작: rm -rf, DROP TABLE, git push
```

## Phase4 → 평가/디버깅 체계

### 팀즈 병렬 평가

```
/팀즈 "검증 대상"
→ test-planner → orchestrator → 병렬 실행 → aggregator
```

### Hook 기반 관측성

- PreToolUse: 모든 액션 자동 로깅
- Stop: 세션 종료 시 요약 생성

## Phase5 → 운영 안정화

### 3중 보안 체계

1. **Rules** (예방): .claude/rules/security.md
2. **Hooks** (차단): PreToolUse 위험 명령 차단
3. **Agent** (탐지): mymind-security-scanner

### 모델 선택 비용 최적화

| 작업 | 모델 | 이유 |
|------|------|------|
| 파일 탐색 | haiku | 단순 패턴 매칭 |
| 코드 생성 | sonnet | 균형잡힌 품질/비용 |
| 아키텍처 결정 | opus | 최고 추론 능력 |

### Human-in-the-Loop (3단계)

| 위험도 | 예시 | 처리 |
|--------|------|------|
| 낮음 | 파일 읽기, 검색, 코드 작성 | 자동 실행 |
| 중간 | 대규모 파일 수정, 설정 변경, 패키지 추가 | 경고 출력 후 진행 |
| 높음 | DB 변경, 배포, 삭제, git push | **AskUserQuestion 필수** |

**Hook 연동**: check-dangerous.js에서 최고위험 명령은 차단, 중간위험은 경고 출력

## 절대 원칙

| 원칙 | 설명 |
|------|------|
| **TODO 등록 첫 번째 (강제)** | **사용자 명령 수신 시 첫 번째 행동은 TODO 등록**. TODO 완료 전 서버 재시작을 제외한 모든 명령 차단 (Hook 강제). `mm-api.js --set-current` 실행이 모든 작업보다 먼저 |
| **3-노드 구조 필수** | 명령 노드 하위에 반드시 3개 노드 생성: ① 작업 전 `명령 수행 계획수립` ② 작업 후 `수행 및 테스트 결과` ③ 세션 종료 시 `세션 요약`(자동). ①②를 누락하면 절차 위반. |
| 서버 경유 필수 | `fetch('/api/...')` (외부 API 직접 호출 금지) |
| Git 쓰기 제한 | add/commit/push → 사용자 요청 필수 |
| 유니코드 이스케이프 금지 | `ensure_ascii=False` 필수 |
| 루트 청결 유지 | 임시 파일은 `.ralph/` 또는 `testpy/` |
| API 중복 생성 금지 | 동일 기능은 하나의 API만 |
| 노드 접근 API 필수 | 노드ID로 읽기/쓰기/하위 생성 등 모든 노드 조작은 반드시 `/기획` 스킬 또는 API(`/api/skill/node/...`) 경유 |
| 노드ID 패턴 자동 인식 | 영숫자 10자리 패턴(예: `YU23DJ8GJQ`)은 노드ID → `/기획` 스킬 자동 사용 |
| **참고소스 동등 구현 필수** | 참고소스(`G:\MyWrok\mymind3`)를 확인하고 구현할 때 간소화/축약 금지. 참고소스와 동등한 수준으로 완전 구현 |
| **SQLite 사용 절대 금지** | SQLite(`sqlite3`, `better-sqlite3`, `sql.js` 등) 사용 금지. 모든 데이터베이스는 **PostgreSQL**만 사용. SQLite 관련 패키지 설치(`npm install sqlite3` 등), `require('sqlite3')`, SQLite 파일(`.sqlite`, `.db`) 생성 일체 금지 |
| **테스트 계정 하드코딩 절대 금지** | 사용자명, 비밀번호, 이메일을 코드에 직접 문자열로 쓰지 않는다. 반드시 `.env` 환경변수(`TEST_ADMIN_USERNAME`, `TEST_ADMIN_PASSWORD`, `TEST_ADMIN_EMAIL`)를 `process.env`로 읽어 사용. 주석/JSDoc 예시에도 실제 계정명 대신 `username`, `testUser` 등 일반 placeholder 사용. 프론트엔드는 서버 API 경유 또는 role 기반 판별 사용 |

### SVG 아이콘 단색 원칙

**원칙**: 모든 SVG 아이콘은 `stroke="currentColor"`로 단색 렌더링. 아이콘 내에서 두 가지 이상의 색 사용 금지.

**금지:**
- `[data-theme="dark"] svg path { stroke: ... }` 같은 전역 SVG 요소 타겟 CSS 규칙
- SVG 아이콘에 하드코딩된 색상 (`stroke="#xxx"`, `fill="#xxx"`) → 반드시 `currentColor` 사용

### 요금제 변경 시 전면 수정 필수

**트리거**: 요금제 가격 변경, 연속구독 할인 비율 변경, 수익률 변경

| 영역 | 수정 대상 |
|------|-----------|
| 랜딩 페이지 | 가격 표시, 요금제 비교표, 할인율 문구 |
| DB 로직 | 결제 계산, 크레딧 산정, 구독 갱신 로직 |
| 기획 문서 | 수익 모델, 요금제 기획 노드 |
| 설정/관리자 | 패키지 설정, 관리자 요금 관리 |
| i18n | 전체 언어 파일의 요금 관련 문자열 |
| Stripe 연동 | 상품/가격 ID, 결제 금액 검증 |

## 맥락 기반 자동 도구 선택

| 맥락 | 도구 |
|------|------|
| DB 조회, 쿼리 | PostgreSQL (`src/db` 모듈) |
| 브라우저 테스트 | `playwright` MCP |
| API 테스트 | `mymind-api-tester` 에이전트 |
| 보안 점검 | `mymind-security-scanner` 에이전트 |
| UI/CSS 리뷰 | `mymind-ui-reviewer` 에이전트 |
| 노드ID 패턴 (영숫자 10자리) | `/기획` 스킬 (R/W/append 문맥 판단) |
| 팀 테스트 | `/팀즈` 스킬 (기획→실행→검증→집계) |

## Hooks 자동 실행

### Hook 실행 체인 (PreToolUse)

도구 호출 시 아래 순서로 Hook이 순차 실행됨. **`exit(2)`** 시 도구 호출 차단 (`exit(1)` 은 non-blocking이므로 사용하지 않음).

> **핵심 원칙**: `command-log-enforcer`가 `*` 매찬로 **모든 도구의 첫 번째 관문**. TODO 미등록 시 Bash/Read/Grep/Glob/Write/Edit/Task 등 **전부 차단**.

| 순서 | Hook | matcher | 역할 | 차단 조건 |
|------|------|---------|------|-----------|
| 1 | `command-log-enforcer.js` | **\* (전체)** | **[TODO 게이트] 모든 도구 일괄 차단** | 상태파일 없음 → **exit(2)**. 예외: mm-api.js/--set-current(데드락 방지) + 서버 재시작 패턴만 통과. **그 외 어떠한 명령도 차단** |
| 2 | `check-dangerous.js` | Bash | 위험 명령 차단/경고 | BLOCKED 11종 → **exit(2)**, WARNED 6종 → 경고 |
| 3 | `protect-sensitive.js` | Write\|Edit | 민감 파일 보호 | .env, .pem, .key 등 9종 → **exit(2)** |
| 4 | `validate-output.js` | Write\|Edit | 출력 검증 | JSON 무효 또는 유니코드 이스케이프 → **exit(2)** |
| 5 | `security-scan.js` | Write\|Edit | 보안 취약점 탐지 | eval/SQL Injection/API키 → **exit(2)**, 나머지 → 경고 |
| 6 | `log-action.js` | * (전체) | 액션 로깅 | 차단 없음 (16종 도구명 인식, detail 기록) |
| 7 | `cc-check-validator.js` | * (전체) | **[CC체크] 정합성 검증** | TODO 상태파일 없으면 건너뜀. 있으면 세션당 1회 실행, 차단 없음 (경고만). session_id 기반 격리 |

> **훅 수 정리**: PreToolUse `*(1)` → `Bash(1)` → `Write|Edit(3)` → `*(2)` = PreToolUse **7개** + Stop **1개** = **전체 8개**

### Stop 이벤트

| Hook | 역할 |
|------|------|
| `session-summary.js` | 세션 종료 시 로그 파일에 총 액션 수 요약 추가 + TODO에 세션 요약 기록 |

### UserPromptSubmit 이벤트

| Hook | 역할 |
|------|------|
| `user-prompt-submit.js` | TODO 상태파일 없으면 **명령 등록 절차 안내를 Claude 컨텍스트에 주입** (프롬프트 수신 시점, 차단 없음). 상태파일 있으면 조용히 통과 |

### 이벤트 요약

| 이벤트 | 동작 |
|--------|------|
| **UserPromptSubmit** | `user-prompt-submit.js`: TODO 미등록 시 **명령 등록 절차 안내 주입** |
| PreToolUse | **7단계 체인**: **[TODO]차단(exit 2)** → 위험차단(exit 2) → 보호 → 검증 → 탐지 → 로깅 → **[CC체크]** |
| Stop | `session-summary.js`: 세션 요약 생성 |

## CC체크 자동 검증 (EUDC5SXHH7 기획 기반)

### 검증 대상 (기획 노드: EUDC5SXHH7, 8개 하위)

| # | 구성 요소 | 검증 기준 | 필수 수량 |
|---|----------|---------|----------|
| 1 | PreToolUse Hook Chain | settings.json 순서: *(1개)→Bash(1개)→Write\|Edit(3개)→*(2개) = PreToolUse 7개 + Stop 1개 = 전체 8개 | 7개 PreToolUse 훅 |
| 2 | Hook 파일 | check-dangerous, command-log-enforcer, protect-sensitive, validate-output, security-scan, log-action, session-summary, cc-check-validator | 8개 |
| 3 | Rules 파일 | general, api, security, browser-test, command-log | 5개 |
| 4 | Skills | 기획, 팀즈, browser-test, ralph-checker, pr-review, kill-server, 노드추출 | 7개 |
| 5 | MCP 서버 | playwright, context7 | 2개 |
| 6 | Stop Hook | session-summary.js | 1개 |

### 자동 검증 훅

`cc-check-validator.js`가 **세션당 1회** 자동 실행되어 위 항목을 검증. 결과:
- `[CC체크] 정합성 검증 통과` → 정상
- `[CC체크] 검증 실패 (N건)` → 누락/불일치 항목 출력
- `[CC체크] 경고 (N건)` → 패턴 수 부족 등 경고

### 수동 검증 명령

```bash
node .claude/hooks/cc-check-validator.js
```

### 핵심 정합성 기준 (2026-02-24 팀즈 검증 결과)

| Hook | 필수 패턴 |
|------|---------|
| check-dangerous.js | BLOCKED 11개 + WARNED 6개 + API키 감지 + 공백 정규화 |
| protect-sensitive.js | 보호 대상 9종 (.env, .pem, .key, id_rsa, id_ed25519, credentials.json, .mymindmp3, .htpasswd, shadow) |
| validate-output.js | JSON 검증 + 유니코드 이스케이프 + Edit(new_string) 검사 |
| security-scan.js | BLOCK 3패턴(eval, SQL Injection, API키) + WARN 6패턴 |
| command-log-enforcer.js | SSE_PORT 기반 상태 파일 확인 + 2단계 fallback + 서버 접속 확인 + 날짜 경로만 자동 생성 + **차단(exit 2)** + hookSpecificOutput JSON (서버 미실행 시만 exit 0) |
| log-action.js | 16종 도구 인식 + 25가지 Bash 분류 |
| session-summary.js | 3단계 fallback + SSE_PORT 격리 + 상태 파일 삭제 + **lok_ 토큰 만료 검증 후 폴백** |

## 세션 복구

`[Session Recovery]` 메시지 시 → 사용자에게 알림 후 진행 여부 확인

## 응답 언어

- 모든 응답/주석: **한글**

---

**버전**: 1.0.0 | **기반**: CC 구현 설계 (BXAE7QI0AI)
