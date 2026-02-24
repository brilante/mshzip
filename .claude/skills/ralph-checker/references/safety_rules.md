# 안전장치 규칙

## 개요

Ralph Loop는 자동으로 코드를 수정하고 실행하기 때문에 
안전장치가 필수적입니다. 이 문서는 반드시 준수해야 하는 
안전 규칙을 정의합니다.

## 금지 동작

###  파일 삭제 명령어

다음 명령어는 절대 실행하지 않습니다:

```bash
# Unix/Linux/Mac
rm -rf
rm -r
rmdir

# Windows
del /f /s /q
rd /s /q
Remove-Item -Recurse -Force
```

**예외:** 임시 파일, 빌드 캐시 등 재생성 가능한 파일만 허용
- `node_modules/` 삭제 후 `npm install`
- `dist/` 삭제 후 `npm run build`
- `.cache/` 삭제

###  데이터베이스 파괴 명령어

다음 SQL 명령어는 절대 실행하지 않습니다:

```sql
DROP TABLE
DROP DATABASE
DELETE FROM (WHERE 없이)
TRUNCATE TABLE
```

**예외:** 테스트 데이터베이스에 대한 작업만 허용
- 파일명에 `test`, `mock`, `fixture` 포함 시
- 환경변수 `NODE_ENV=test` 일 때

###  프로덕션 배포

다음 작업은 절대 수행하지 않습니다:

```bash
# 배포 명령어
npm publish
git push origin main
git push --force
deploy
kubectl apply -f (production)
```

**예외:** 없음. 배포는 항상 수동으로 수행

###  시스템 설정 변경

다음 작업은 절대 수행하지 않습니다:

```bash
# 시스템 설정
chmod 777
chown
sudo
admin
registry edit
netsh
```

###  민감 정보 노출

다음 정보는 코드에 하드코딩하지 않습니다:

- API 키
- 비밀번호
- 개인정보
- 인증 토큰

**대신:** 환경변수 또는 설정 파일 사용

## 필수 백업

### Git 체크포인트

각 Loop 시작 전에 Git 체크포인트를 생성합니다:

```bash
# 태그 생성
git add -A
git commit -m "Ralph checkpoint - Loop {N}"
git tag ralph-checkpoint-{session_id}-{loop}
```

**복구 방법:**
```bash
# 특정 체크포인트로 복구
git checkout ralph-checkpoint-0001-3
```

### config.json에 백업 설정

```json
{
  "safety": {
    "backup_enabled": true,
    "backup_method": "git_tag",
    "forbidden_actions": [
      "rm -rf",
      "DROP TABLE",
      "DELETE FROM",
      "npm publish",
      "git push"
    ]
  }
}
```

## 제한 사항

### 최대 루프 횟수

- 기본값: 10회
- 최대값: 20회 (하드 리밋)
- 설정 위치: config.json의 `max_loop`

### 타임아웃

- Claude 호출: 5분 (300초)
- 단일 검증: 2분 (120초)
- 전체 세션: 2시간 (7200초)

### 파일 크기 제한

- 단일 파일: 1MB
- 총 생성 파일: 10MB

## 중간 개입 트리거

다음 상황에서 사용자 개입을 요청합니다:

### 1. 3회 연속 동일 에러

```
[Ralph]  동일한 에러가 3회 반복되고 있습니다:
 Cannot read property 'email' of undefined

선택:
1. 접근 방식 변경
2. 계속 진행
3. 중단
```

### 2. 5회 도달 (중간 보고)

```
[Ralph]  중간 보고 (5회 도달)
진행률: 4/6 조건 통과

선택:
1. 계속
2. 중단
```

### 3. 의심스러운 동작 감지

- 대량 파일 수정 (10개 이상)
- 시스템 파일 접근 시도
- 네트워크 요청 다수 발생

## 롤백 절차

### 자동 롤백 조건

- 세션 실패 시
- 사용자 중단 시
- 타임아웃 시

### 롤백 명령어

```bash
# 가장 최근 체크포인트로 롤백
git checkout ralph-checkpoint-{session_id}-{last_successful_loop}

# 세션 시작 전으로 롤백
git checkout ralph-checkpoint-{session_id}-0
```

## 로깅

### 필수 로그 항목

모든 작업은 PROGRESS.md에 기록됩니다:

```markdown
## Loop 3

**시작:** 2025-01-21 16:45:30
**종료:** 2025-01-21 16:47:15

### 수행 작업
- src/pages/Login.tsx 수정
- src/contexts/AuthContext.tsx 수정

### 검증 결과
-  빌드 성공
-  폼 요소 존재
-  리다이렉트 실패

### 에러 로그
```
Error: Cannot navigate to /dashboard
  at LoginForm.handleSubmit
```
```

### 스크린샷 저장

UI 검증 시 스크린샷을 저장합니다:

```
.ralph/{session_id}/screenshots/
├── loop1_before.png
├── loop1_after.png
├── loop2_before.png
└── loop2_after.png
```

## 비상 중단

### 강제 종료 방법

1. **터미널에서:** `Ctrl+C`
2. **명령어:** `ralph stop {session_id}`
3. **프로세스 킬:** `kill -9 {pid}`

### 비상 중단 후 정리

```bash
# 1. 세션 상태 확인
ralph status {session_id}

# 2. 마지막 체크포인트 확인
git tag | grep ralph-checkpoint-{session_id}

# 3. 필요 시 롤백
git checkout ralph-checkpoint-{session_id}-{N}

# 4. 세션 정리
ralph stop {session_id}
```
