# 명령 이력 기록 규칙 (최우선)

> 모든 사용자 명령은 TODO 마인드맵에 기록. 기록 없는 수행은 금지.

## 목표 구조

```
todoRoot (user_settings API 조회, TODO 마인드맵)
  └── yyyy (예: 2026)
        └── yyyyMM (예: 202602)
              └── yyyyMMdd (예: 20260227)   ← 오늘 날짜 노드
                    └── N. 명령요약          ← A  (--set-current)
                          ├── 명령 수행 계획수립   ← A-1 (--set-planning)
                          ├── 수행 및 테스트 결과  ← A-2 (--set-result)
                          └── 세션 요약            ← A-3 (자동)
```

명령 노드 1개당 자식 3개가 세트로 생성됨.

| 단계 | 시점 | 플래그 |
|------|------|--------|
| A  명령 접수   | 사용자 명령 수신 즉시     | `--set-current`  |
| A-1 계획 수립  | 실제 작업 시작 전         | `--set-planning` |
| A-2 수행 완료  | 구현+테스트 완료 후       | `--set-result`   |
| A-3 세션 요약  | 세션 종료 시              | (Stop Hook 자동) |

## Hook 게이트 (command-log-enforcer.js) — 강제 순서

| 게이트 | 조건 | 결과 |
|--------|------|------|
| A  게이트 | stateFile 없음      | Bash/Read/Grep/Write/Edit **전부 차단** |
| A-1 게이트 | planningFile 없음  | Bash/Read/Grep/Write/Edit **전부 차단** |
| A-2 게이트 | `--set-current` 시 resultFile 없음 | 다음 명령 등록 **차단** |

## 1단계 (A): 명령 수신 즉시

user-prompt-submit.js 훅이 날짜 노드를 자동 탐색/생성하여
Claude에게 실제 nodeId가 포함된 명령을 안내함.

```bash
# ★ --set-current 필수 (없으면 stateFile 미생성 → A 게이트 영구 차단)
node testpy/mm-api.js --set-current \
  add-child <yyyyMMdd노드ID> "N. 명령요약" "사용자 명령 원문"
```

**제목 규칙**
- ✅ `"3. 다크모드 버그 수정"` — 실제 명령 내용 요약
- ❌ `"3. 세션 작업"` / `"세션 자동 등록"` — 범용/무의미한 제목

## 2단계 (A-1): 계획수립 — 실제 작업 시작 전

```bash
# ★ --set-planning 필수 (없으면 planningFile 미생성 → A-1 게이트 영구 차단)
node testpy/mm-api.js --set-planning \
  add-child <A노드ID> "명령 수행 계획수립" "<계획 HTML>"
```

**content 필수 항목** (HTML):
- `<h3>명령 분석</h3>`: 요청 내용, 영향 범위, 위험도
- `<h3>구현 계획</h3>`: 단계별 상세 (ol 목록)
- `<h3>검증 기준</h3>`: PASS/FAIL 판단 조건
- `<h3>Mermaid 다이어그램</h3>` (**필수**): 작업 흐름 시각화
  - `flowchart TD` — 처리 흐름, 조건 분기
  - `sequenceDiagram` — 컴포넌트 간 호출 순서
  - `classDiagram` — 클래스/모듈 구조 변경
  - `erDiagram` — DB 스키마 변경
  - `gitGraph` — 브랜치 전략
  ```html
  <pre><code class="language-mermaid">flowchart TD
    A[시작] --> B[작업] --> C[완료]
  </code></pre>
  ```

## 3단계 (A-2): 수행결과 — 구현+테스트 완료 후

```bash
# ★ --set-result 필수 (없으면 resultFile 미생성 → 다음 명령의 A-2 게이트 차단)
node testpy/mm-api.js --set-result \
  add-child <A노드ID> "수행 및 테스트 결과" "<결과 HTML>"
```

**content 필수 항목** (HTML):
- `<h3>수행 결과: ✅ 성공 / ❌ 실패</h3>`
- `<h4>수정 파일</h4>`: 파일 경로 + 변경 내용 (ul)
- `<h4>구현 상세</h4>`: 주요 변경사항 (ul)
- `<h4>테스트</h4>`: 항목/결과/비고 (table), 종합 N/M PASS
- `<h4>에러 및 해결</h4>`: 해당 시에만

## 4단계 (A-3): 세션 요약 — 자동

`session-summary.js` (Stop Hook)가 자동 수행:
- `current-command-node-{SESSION_ID}` 파일에서 A 노드 ID 읽기
- A 노드 하위에 "세션 요약" 노드 생성 (중복 방지 포함)
- SUMMARY_WRITTEN_FILE + 공유 락으로 중복 실행 차단

## 상태 파일 생명주기

세션 ID = `CLAUDE_CODE_SSE_PORT` (터미널당 고유)

```
--set-current  실행 → current-command-node-{ID}  생성, planning/result/summary 초기화
--set-planning 실행 → planning-node-{ID}          생성
--set-result   실행 → result-node-{ID}            생성
Stop Hook      실행 → summary-written-{ID}        생성 (중복 방지)
```

**중요**: 각 플래그를 빠뜨리면 상태 파일이 생성되지 않아 게이트가 영구 차단됨.

## 기록 제외

단순 파일 읽기, 검색, 질문 응답 (코드 변경 없는 순수 조회 작업)

## 금지 노드 제목

- `"세션 작업"`, `"세션 자동 등록"` — 범용/무의미한 제목
- 명령 노드 제목은 반드시 **사용자의 실제 명령 내용을 요약**한 것
