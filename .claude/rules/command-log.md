# 명령 이력 기록 규칙 (최우선)

> 모든 사용자 명령은 프로젝트 TODO 마인드맵에 기록. 기록 없는 수행은 금지.

## 명령 수신 즉시 (코드 작성보다 먼저)

```bash
# 1. 3단계 경로 탐색: 년도 → 년월 → 년월일 노드 찾기
node testpy/mm-api.js --mm todo children BTW5XOTCJ0          # 년도 노드 확인
node testpy/mm-api.js --mm todo children <년도노드ID>         # 년월 노드 확인
node testpy/mm-api.js --mm todo children <년월노드ID>         # 년월일 노드 확인

# 2. 없는 단계가 있으면 순서대로 생성
node testpy/mm-api.js --mm todo add-child BTW5XOTCJ0 "2026"           # 년도 생성
node testpy/mm-api.js --mm todo add-child <년도노드ID> "202602"       # 년월 생성
node testpy/mm-api.js --mm todo add-child <년월노드ID> "20260225"     # 년월일 생성

# 3. 명령 노드 생성 (--set-current 필수, 명령 원문 content 필수)
node testpy/mm-api.js --mm todo --set-current add-child <년월일노드ID> "N. 명령요약" "사용자 명령 원문"
```

**경로 예시**: `BTW5XOTCJ0` → `2026` → `202602` → `20260225` → `1. 명령내용`

**주의**: 세 번째 인자(content)에 반드시 사용자 명령 원문을 포함할 것. content가 비어있으면 안 됨.

## 수행 중

주요 단계 완료 시 하위 노드 추가:
```bash
node testpy/mm-api.js --mm todo add-child <명령노드ID> "구현 완료" "<p>상세</p>"
```

## 완료 후

명령 노드에 요약으로 content 업데이트:
```bash
node testpy/mm-api.js --mm todo write <명령노드ID> "## 명령: 원문\n### 수행 요약\n...\n### 결과: ✅/❌"
```

## 기록 제외

단순 파일 읽기, 검색, 질문 응답 (코드 변경 없는 작업)
