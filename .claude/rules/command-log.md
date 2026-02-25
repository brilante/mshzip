# 명령 이력 기록 규칙 (최우선)

> 모든 사용자 명령은 프로젝트 TODO 마인드맵에 기록. 기록 없는 수행은 금지.

## 전체 흐름 (3-노드 구조)

```
원본노드 (N. 명령요약)          ← 1단계: 명령 수신 즉시 생성 (content: 원본 명령, 덮어쓰기 금지)
├── 명령 수행 계획수립           ← 2단계-a: 구현 시작 전 (분석+계획+Mermaid)
├── 수행 및 테스트 결과          ← 2단계-b: 구현+테스트 완료 후 (결과 통합)
└── 세션 요약                   ← 3단계: 세션 종료 시 자동 (session-summary.js)
```

| 단계 | 시점 | 수행 주체 | 동작 |
|------|------|-----------|------|
| 1. 명령 접수 | 사용자 명령 수신 즉시 | **Claude** | `--set-current`로 원본노드 생성 (명령 원문 content, 덮어쓰기 금지) |
| 2-a. 계획 수립 | 구현 시작 전 | **Claude** | 원본노드 하위에 "명령 수행 계획수립" 노드 추가 |
| 2-b. 수행 완료 | 구현+테스트 완료 시 | **Claude** | 원본노드 하위에 "수행 및 테스트 결과" 노드 추가 |
| 3. 세션 요약 | 세션 종료 시 | **자동** (Stop Hook) | `session-summary.js`가 원본노드 하위에 "세션 요약" 추가 |

## 1단계: 명령 수신 즉시 (코드 작성보다 먼저)

```bash
# 1. 3단계 경로 탐색: 년도 → 년월 → 년월일 노드 찾기
node testpy/mm-api.js --mm todo children BTW5XOTCJ0          # 년도 노드 확인
node testpy/mm-api.js --mm todo children <년도노드ID>         # 년월 노드 확인
node testpy/mm-api.js --mm todo children <년월노드ID>         # 년월일 노드 확인

# 2. 없는 단계가 있으면 순서대로 생성
node testpy/mm-api.js --mm todo add-child BTW5XOTCJ0 "2026"           # 년도 생성
node testpy/mm-api.js --mm todo add-child <년도노드ID> "202602"       # 년월 생성
node testpy/mm-api.js --mm todo add-child <년월노드ID> "20260225"     # 년월일 생성

# 3. 원본노드 생성 (--set-current 필수, 명령 원문 content 필수)
node testpy/mm-api.js --mm todo --set-current add-child <년월일노드ID> "N. 명령요약" "사용자 명령 원문"
```

**경로 예시**: `BTW5XOTCJ0` → `2026` → `202602` → `20260225` → `1. 명령내용`

**원본 명령 보존 원칙**: content에 사용자 명령 원문을 저장한 후 **절대 덮어쓰지 않는다**.
`mm-api.js --mm todo write <명령노드ID>` 명령은 명령 노드에 사용 금지.

## 2단계-a: 명령 수행 계획수립 (구현 시작 전)

구현 착수 전 원본노드 하위에 "명령 수행 계획수립" 노드를 생성한다:
```bash
node testpy/mm-api.js --mm todo add-child <원본노드ID> "명령 수행 계획수립" "<계획 HTML content>"
```

**content 필수 항목** (HTML):
- `<h3>명령 분석</h3>`: 요청 내용, 영향 범위, 위험도
- `<h3>구현 계획</h3>`: 단계별 상세 (ol 목록)
- `<h3>검증 기준</h3>`: PASS/FAIL 판단 조건
- `<h3>Mermaid 플로우차트</h3>`: 구현 흐름 시각화 (`<pre><code class="language-mermaid">`)

**Plan Mode 연동**: Plan Mode 진입 시 그 결과를 이 노드에 기록한다.

## 2단계-b: 수행 및 테스트 결과 (구현+테스트 완료 시)

구현 완료 후 원본노드 하위에 "수행 및 테스트 결과" 노드를 생성한다:
```bash
node testpy/mm-api.js --mm todo add-child <원본노드ID> "수행 및 테스트 결과" "<결과 HTML content>"
```

**content 필수 항목** (HTML):
- `<h3>수행 결과: ✅ 성공 / ❌ 실패</h3>`
- `<h4>수정 파일</h4>`: 파일 경로 + 변경 내용 (ul 목록)
- `<h4>구현 상세</h4>`: 주요 변경사항 (ul 목록)
- `<h4>테스트</h4>`: 테스트 항목/결과/비고 (table), 종합 N/M PASS
- `<h4>에러 및 해결</h4>`: 해당 시에만 (에러 → 해결 방법)

## 3단계: 세션 종료 (자동)

`session-summary.js` (Stop Hook)가 자동 수행:
- `.claude/current-command-node-{SSE_PORT}` 상태 파일에서 원본노드 ID를 읽음
- 원본노드 하위에 "세션 요약" 노드 생성 (도구별 사용 횟수 집계)
- 상태 파일 정리 (삭제)

## Hook 연동 (command-log-enforcer.js) — 차단 모드

`command-log-enforcer.js`는 Write/Edit 시 상태 파일 존재를 **강제**:
- 상태 파일 있음 → 통과 (exit 0)
- 서버 미실행 / mm-api 없음 → 통과 (graceful degradation)
- **서버 정상 + 상태 파일 없음 → exit(1) 차단** (Write/Edit 실패)

**차단 시 Claude가 할 일**: 즉시 `--set-current`로 명령 노드를 생성한 후 다시 Write/Edit 시도

## 기록 제외

단순 파일 읽기, 검색, 질문 응답 (코드 변경 없는 작업)

## 금지 노드 제목 (절대 생성 금지)

- **"세션 작업"** - 범용/무의미한 제목. Hook 경고에 반응하여 자동 생성하지 말 것
- **"세션 자동 등록"** - 자동 등록 목적의 노드 생성 금지
- 명령 노드 제목은 반드시 **사용자의 실제 명령 내용을 요약**한 것이어야 함
- 예시: ✅ `"3. 다크모드 버그 수정"`, ❌ `"3. 세션 작업"`
