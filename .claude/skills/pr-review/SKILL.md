---
name: pr-review
description: PR 코드 리뷰 및 실험 비교. 브랜치별 변경사항을 분석하여 정량적 리포트를 생성한다.
argument-hint: "[--branch <name>] [--compare <base>]"
---

# /pr-review 스킬

PR 또는 브랜치의 코드 변경을 분석하여 정량적 리뷰 리포트를 생성하는 스킬.
실험 브랜치 간 비교를 통해 최적 접근법을 선택할 수 있다.

## 명령어

```bash
/pr-review                        # 현재 브랜치 vs main 리뷰
/pr-review --branch feature/auth  # 특정 브랜치 리뷰
/pr-review --compare exp-A exp-B  # 두 실험 브랜치 비교
```

## 실행 흐름

### Phase 1: 변경사항 수집

```
git diff <base>...HEAD --stat     # 변경 파일 목록
git diff <base>...HEAD            # 전체 diff
git log <base>..HEAD --oneline    # 커밋 이력
```

### Phase 2: 병렬 분석 (3개 에이전트)

| 에이전트 | 분석 대상 | 모델 |
|---------|----------|------|
| code-reviewer | 코드 품질, 버그 위험, 보안 취약점 | haiku |
| code-simplifier | 복잡도, 중복, 단순화 가능성 | haiku |
| silent-failure-detector | 에러 누락, 빈 catch, 무시된 반환값 | haiku |

```
Task(subagent_type="Explore", model="haiku", prompt="코드 품질 분석: {diff}")
Task(subagent_type="Explore", model="haiku", prompt="복잡도 분석: {diff}")
Task(subagent_type="Explore", model="haiku", prompt="무시된 에러 탐지: {diff}")
```

### Phase 3: 리포트 생성

```markdown
## PR Review 리포트

### 변경 요약
- 변경 파일: N개
- 추가/삭제: +N / -N 줄
- 커밋: N개

### 코드 품질
| 항목 | 판정 | 상세 |
|------|------|------|
| 보안 취약점 | PASS/WARN/FAIL | ... |
| 에러 처리 | PASS/WARN/FAIL | ... |
| 코드 중복 | PASS/WARN/FAIL | ... |
| 복잡도 | PASS/WARN/FAIL | ... |

### 발견된 문제
1. [심각도] 설명 - 파일:행

### 개선 제안
1. ...
```

## 실험 비교 모드 (--compare)

두 브랜치의 리포트를 나란히 비교:

```
/pr-review --compare experiment/approach-A experiment/approach-B
```

### 비교 리포트

```markdown
## 실험 비교: approach-A vs approach-B

| 항목 | A | B |
|------|---|---|
| 변경 파일 수 | 5 | 3 |
| 코드 줄 수 | +120 | +80 |
| 보안 이슈 | 0 | 0 |
| 복잡도 점수 | 중간 | 낮음 |
| 추천 | - | 추천 |
```

## 규칙

- 리뷰는 읽기 전용 (코드 수정 안 함)
- 발견된 문제는 PASS/WARN/FAIL로 분류
- .claude/rules/security.md 기준으로 보안 검사
- 민감 파일(.env, .key) 변경 시 즉시 경고
