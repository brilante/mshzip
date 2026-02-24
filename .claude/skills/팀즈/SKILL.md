---
name: 팀즈
description: 에이전트 팀 테스트. 여러 테스트 에이전트를 병렬 실행하여 빠르게 검증한다.
argument-hint: "<대상> [--옵션]"
---

# /팀즈 스킬

에이전트 팀을 구성하여 **병렬 테스트**를 수행하는 스킬.
단독 테스트 대비 빠르고 전문 영역별 깊이 있는 검증이 가능하다.

## 명령어

```bash
/팀즈 <대상>                    # 전체 팀 테스트 (기획→실행→검증→집계)
/팀즈 <대상> --api              # API 테스터만
/팀즈 <대상> --security         # 보안 스캐너만
/팀즈 <대상> --ui               # UI 리뷰어만
/팀즈 <대상> --skip-advocate    # 적대적 검증 생략 (빠른 실행)
/팀즈 <대상> --skip-plan        # 테스트 기획 생략 (직접 실행)
/팀즈 <대상> --with-docs        # 완료 후 문서 자동 갱신
/팀즈 <대상> --기록 <nodeId>    # 결과를 마인드맵 노드에 자동 기록
```

**예시:**
```bash
/팀즈 payment-success.html
/팀즈 settings.html --api --security
/팀즈 src/api/credits/checkout.js --with-docs
```

## 에이전트 팀 구성

### 검사 에이전트 (Layer 1 - 병렬 실행)

| 에이전트 | subagent_type | 역할 | 모델 |
|---------|---------------|------|------|
| API 테스터 | `mymind-api-tester` | API 엔드포인트 테스트, 응답 검증, 에러 케이스 | haiku |
| 보안 스캐너 | `mymind-security-scanner` | OWASP Top 10 기반 보안 취약점 탐지 | haiku |
| UI 리뷰어 | `mymind-ui-reviewer` | CSS 일관성, 접근성, 반응형, 다크모드 검증 | haiku |

### 기획/조율 에이전트 (Layer 0 - 검사 전 실행)

| 에이전트 | subagent_type | 역할 | 모델 |
|---------|---------------|------|------|
| **테스트 기획** | `mymind-test-planner` | 페이지 분석 → 테스트 종류/시나리오 자동 기획 | haiku |
| **테스트 오케스트레이터** | `mymind-test-orchestrator` | 기획서 기반으로 적절한 에이전트에게 작업 분배 | haiku |

### 검증/집계 에이전트 (Layer 2 - 검사 후 실행)

| 에이전트 | subagent_type | 역할 | 모델 |
|---------|---------------|------|------|
| **악마의 변호인** | `mymind-devil-advocate` | 다른 에이전트 결과 교차 검증, 누락/모순 탐지 | **sonnet** |
| **결과 집계** | `mymind-test-aggregator` | 모든 결과 수집 → 대시보드 생성 → 노드 기록 | haiku |

### 부가 에이전트 (선택)

| 에이전트 | subagent_type | 역할 | 모델 |
|---------|---------------|------|------|
| 문서 생성 | `mymind-doc-generator` | 코드 변경 문서화, API 문서/CHANGELOG 갱신 | haiku |

## 실행 흐름

```
Phase 1          Phase 2           Phase 3              Phase 4        Phase 5
대상 분석 ──→ 테스트 기획 ──→ 병렬 검사 실행 ──→ 적대적 검증 ──→ 결과 집계
                (planner)     (api/security/ui)    (devil-advocate)  (aggregator)
                                    │                                     │
                                    └── 백그라운드 실행 가능 ──────────────┘
                                                                          │
                                                                   Phase 6 (선택)
                                                                    문서 갱신
                                                                  (doc-generator)
```

### Phase 1: 대상 분석

대상 파일/페이지를 분석하여 관련 파일을 파악한다.

```
입력: payment-success.html
  → HTML 파일: public/payment-success.html
  → API 의존: /api/credits/payment-status/:sessionId
  → JS 의존: (인라인)
  → 라우터: src/api/credits/checkout.js
```

### Phase 2: 테스트 기획 (Layer 0)

> `--skip-plan` 옵션 시 이 Phase 건너뜀

**테스트 기획 에이전트**가 대상을 분석하여 테스트 시나리오를 자동 생성한다.

```
Task(
  subagent_type="mymind-test-planner",
  model="haiku",
  prompt="
    대상: {target}
    관련 파일: {files}
    서버: http://localhost:4848

    이 페이지/모듈을 분석하여 다음을 기획하세요:
    1. 필요한 테스트 종류 (API/보안/UI)
    2. 각 테스트별 시나리오 (정상/엣지/실패)
    3. 검증 기준 (PASS/FAIL 판단 조건)
    4. 우선순위 (Critical/High/Medium/Low)
  "
)
```

기획 결과는 Phase 3의 각 에이전트 프롬프트에 포함된다.

### Phase 3: 팀 자동 구성 및 병렬 실행

대상 유형에 따라 에이전트를 자동 선택한다.

| 대상 유형 | API 테스터 | 보안 스캐너 | UI 리뷰어 |
|----------|:----------:|:----------:|:---------:|
| HTML 페이지 | O | O | O |
| API 라우터 (src/api/) | O | O | - |
| JS 모듈 (src/) | - | O | - |
| CSS/프론트엔드 | - | - | O |

**Task tool을 사용하여 에이전트를 동시에 호출한다.**

각 에이전트에게 전달할 프롬프트 템플릿:

```
대상: {target}
관련 파일: {files}
서버: http://localhost:4848
테스트 계정: bril / 1

[테스트 기획서]
{Phase 2의 기획 결과 중 해당 에이전트 영역}

다음을 수행하고 결과를 보고하세요:
1. [에이전트별 전문 영역 수행]
2. 결과를 PASS/FAIL/WARN 형식으로 정리
3. 발견된 문제에 대한 수정 제안
```

**병렬 호출 패턴 (단일 메시지에서 동시 호출):**
```
Task(subagent_type="mymind-api-tester", model="haiku", prompt="...")
Task(subagent_type="mymind-security-scanner", model="haiku", prompt="...")
Task(subagent_type="mymind-ui-reviewer", model="haiku", prompt="...")
```

**백그라운드 실행 (대규모 테스트 시):**

테스트 대상이 많을 때 `run_in_background=true`로 비동기 실행 가능:
```
Task(
  subagent_type="mymind-api-tester",
  model="haiku",
  run_in_background=true,
  prompt="..."
)
→ output_file 경로 반환 → Read로 결과 확인
```

### Phase 4: 적대적 검증 (Devil's Advocate)

Phase 3의 모든 에이전트 완료 후, **결과를 집계하기 전에** devil-advocate를 실행한다.

**목적**: haiku 에이전트들의 결과를 sonnet 모델이 교차 검증하여 거짓 통과/누락/모순을 탐지

```
Task(
  subagent_type="mymind-devil-advocate",
  model="sonnet",
  prompt="
    대상: {target}
    관련 파일: {files}

    --- API 테스터 결과 ---
    {Phase 3에서 받은 api-tester 결과 전문}

    --- 보안 스캐너 결과 ---
    {Phase 3에서 받은 security-scanner 결과 전문}

    --- UI 리뷰어 결과 ---
    {Phase 3에서 받은 ui-reviewer 결과 전문}

    위 에이전트들의 결과를 적대적으로 검증하세요.
  "
)
```

**devil-advocate 반환값:**
- 신뢰도 등급 (HIGH/MEDIUM/LOW)
- 교차 검증 결과
- 검증 누락 영역
- 에이전트 간 모순
- 독자적 스팟 체크

**신뢰도 등급별 후속 조치:**

| 등급 | 후속 조치 |
|------|----------|
| HIGH | Phase 5로 직행, 검증 결과를 보고서에 부록으로 첨부 |
| MEDIUM | 의심 포인트를 보고서 상단에 경고로 표시 |
| LOW | 재검증 필요 항목을 사용자에게 별도 안내, 메인 에이전트가 직접 확인 권고 |

### Phase 5: 결과 집계 (Aggregator)

모든 에이전트 + devil-advocate 완료 후 **결과 집계 에이전트**가 통합 보고서를 생성한다.

```
Task(
  subagent_type="mymind-test-aggregator",
  model="haiku",
  prompt="
    대상: {target}
    실행일: YYYY-MM-DD

    --- 테스트 기획 ---
    {Phase 2 기획 결과}

    --- API 테스터 결과 ---
    {결과}

    --- 보안 스캐너 결과 ---
    {결과}

    --- UI 리뷰어 결과 ---
    {결과}

    --- 적대적 검증 결과 ---
    {결과}

    위 모든 결과를 수집하여 대시보드를 생성하세요.
    --기록 옵션 시 노드ID: {nodeId}
  "
)
```

**집계 보고서 형식:**

```markdown
## 팀즈 테스트 결과

### 환경
- 대상: {target}
- 실행일: YYYY-MM-DD
- 에이전트: N개 병렬 실행 + 적대적 검증 1회 + 집계 1회

### 적대적 검증 신뢰도: [HIGH/MEDIUM/LOW]
> [devil-advocate가 발견한 주요 의심 포인트 요약, 없으면 "전체 결과 신뢰 가능"]

### 요약
| 에이전트 | PASS | FAIL | WARN | 소요시간 |
|---------|------|------|------|---------|
| API 테스터 | 5 | 0 | 1 | 12s |
| 보안 스캐너 | 8 | 1 | 2 | 8s |
| UI 리뷰어 | 3 | 0 | 0 | 5s |
| 악마의 변호인 | - | - | - | 15s |

### 상세 결과
[각 에이전트 보고서 통합]

### 발견된 문제
1. [심각도] 설명 - 에이전트명
2. ...

### 적대적 검증 상세 (부록)
[devil-advocate 전체 보고서]
```

### Phase 6: 문서 갱신 (선택)

> `--with-docs` 옵션 시에만 실행

테스트 결과를 바탕으로 관련 문서를 자동 갱신한다.

```
Task(
  subagent_type="mymind-doc-generator",
  model="haiku",
  prompt="
    대상: {target}
    테스트 결과 요약: {Phase 5 보고서}
    발견된 문제: {문제 목록}

    테스트 결과를 바탕으로 관련 문서를 갱신하세요:
    - API 문서 업데이트 (발견된 API 변경사항)
    - CHANGELOG 추가 (발견된 이슈/수정사항)
  "
)
```

## 에이전트 재개 (Resume)

이전 실행의 에이전트를 이어서 사용할 수 있다.

```
# 에이전트가 반환한 agent_id를 저장
agent_id = "agent-xxx-yyy"

# 후속 작업에서 재개
Task(
  subagent_type="mymind-api-tester",
  resume=agent_id,
  prompt="이전 테스트에서 FAIL된 항목을 재검증하세요: {실패 항목}"
)
```

**활용 시나리오:**
- 적대적 검증에서 LOW 신뢰도 판정 → 해당 에이전트 재개하여 재검증
- 부분 실패 시 실패 항목만 재실행
- 추가 시나리오 테스트

## 결과 기록 (--기록 옵션)

`/팀즈 <대상> --기록 <nodeId>` 옵션으로 마인드맵 노드에 결과를 자동 기록한다.
`mymind-test-aggregator` 에이전트가 집계 시 자동으로 노드에 기록한다.

## 제한사항

- 서버가 실행 중이어야 API 테스트 가능
- Playwright MCP는 메인 에이전트만 사용 가능 (서브에이전트 불가)
- 브라우저 E2E 테스트는 메인 에이전트가 직접 수행
- 검사 에이전트(api-tester, security-scanner, ui-reviewer)는 haiku 모델로 실행 (비용 효율)
- 기획/집계 에이전트(test-planner, test-aggregator)는 haiku 모델로 실행
- 적대적 검증 에이전트(devil-advocate)는 sonnet 모델로 실행 (haiku 결과를 검증하려면 상위 모델 필요)
- `--api`, `--security`, `--ui` 등 단일 에이전트 실행 시에는 devil-advocate와 aggregator 자동 생략
- 백그라운드 실행 시 `Read`로 output_file을 확인하여 결과 수집

## 에러 처리

| 상황 | 대응 |
|------|------|
| 서버 미실행 | 서버 시작 후 재시도 안내 |
| 에이전트 타임아웃 | 해당 에이전트 결과를 TIMEOUT 표시, 나머지로 집계 |
| 대상 파일 미존재 | 에러 메시지 출력 |
| 기획 에이전트 실패 | `--skip-plan` 모드로 폴백하여 직접 실행 |
| 집계 에이전트 실패 | 메인 에이전트가 직접 결과 통합 |
