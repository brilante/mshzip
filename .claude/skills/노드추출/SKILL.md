---
name: 노드추출
description: 프로젝트 UI 탐색 흐름을 분석하여 마인드맵 노드 트리로 자동 변환. Access Key 인증 필요.
argument-hint: "<해쉬값> [--옵션]"
---

# /노드추출 스킬

사용자 탐색 흐름(랜딩→로그인→메인→설정)을 따라가며, 화면의 UI 요소를 마인드맵 노드로, 내부 기능을 노드 설명으로 변환하는 스킬.

## 명령어

```bash
/노드추출 <access_key_hash>                  # 전체 UI 분석 (필수: 해쉬값)
/노드추출 <hash> --page main                 # 특정 페이지만 분석 (main/settings/login)
/노드추출 <hash> --depth 3                   # 분석 깊이 제한 (기본: 4)
/노드추출 <hash> --mindmap "MyMind3 UI 구조" # 저장할 마인드맵 이름
/노드추출 <hash> --dry-run                   # 트리 구조만 출력 (저장 안 함)
```

**해쉬값 복사**: Settings > Agent Skills > Access Keys 목록에서 [해쉬] 버튼 클릭

## 서버 주소

`config/settings_admin.json`의 `serverUrl` 필드에서 읽는다. 미설정 시 `http://localhost:8080`.

## 실행 순서

이 스킬은 6개 Phase를 순서대로 실행한다.

### Phase 1: Access Key 해쉬 검증

1. 첫 번째 인자에서 Access Key 해쉬값 확인
2. 없거나 빈 값이면 안내 출력 후 **종료**:
   ```
   [노드추출] Access Key 해쉬가 필요합니다.
   복사: MyMind3 → Settings → Agent Skills → Access Keys → [해쉬] 버튼
   사용: /노드추출 <복사한해쉬값>
   ```
3. API 호출로 해쉬 유효성 검증:
   ```bash
   curl -H "X-Access-Key-Hash: <해쉬값>" \
        $MYMIND3_SERVER_URL/api/skill/mindmaps
   ```
4. 응답에서 접근 가능한 마인드맵 목록 확인
5. `--mindmap` 옵션값이 목록에 있는지 확인 (미지정 시 "프로젝트명 UI 구조")
6. permission 확인: `readwrite`가 아니면 `--dry-run`만 가능
   - scope(whitelist/all)는 마인드맵 접근 범위
   - permission(read/readwrite)은 읽기/쓰기 권한

**실패 시 종료**:
- 401 INVALID_KEY_HASH → 해쉬값 확인 또는 키 재발급 안내
- 403 PERMISSION_DENIED → readwrite 권한 키 재발급 안내
- 마인드맵 미발견 → 접근 가능 목록 출력

### Phase 2: 사용자 탐색 흐름 분석

**핵심 원칙**: 화면에 보이는 UI = 노드, 보이지 않는 내부 기능 = 노드 설명

**Step 1 - 진입점 파악**:
1. `public/js/auth-check.js` 읽기 → 비로그인 시 `/login` 리다이렉트 확인
2. 루트 노드 = 랜딩 화면

**Step 2 - 화면별 UI 요소 추출 (→ 노드)**:
1. Read: `public/login.html` → input, button, a 태그 추출
   - 사용자이름 입력, 비밀번호 입력, 로그인 버튼, 소셜 로그인, 회원가입 링크
   - 2FA 폼 (조건부 표시)
2. Read: `public/index.html` → 3패널 구조의 모든 버튼/입력/모달
   - 왼쪽: 마인드맵 컨트롤 (추가, 저장, 불러오기, 초기화, AI재구성, 필터, 검색)
   - 중간: 에디터 (파일첨부, 콘텐츠저장, PDF생성, PPT생성)
   - 오른쪽: AI응답 (서비스선택, 모델선택, 설정, 테마, 로그아웃, 도구, 전송)
   - 노드 우클릭 → 컨텍스트 메뉴
   - 키보드 단축키, 상태 표시
3. Read: `public/settings.html` → 설정 메뉴별 폼 요소
   - 기본, Agent Skills, AI, 계정, 보안, 결제, 구독, 정보
   - 관리자: 기능설정, 관리자, AI모델, 동기화로그, 도구, 보드
4. 각 요소의 라벨/placeholder/textContent → 노드 이름(title)

**Step 3 - 화면 전환 흐름 추적 (→ 트리 구조)**:
1. Read: `public/js/modules/auth/login-popup.js` → 로그인 성공 → 메인 화면
2. Read: `public/js/modules/auth/settings-popup.js` → 설정 버튼 → 설정 팝업
3. Read: `public/js/app-init.js` → 각 버튼의 클릭 핸들러 → 팝업/모달 연결
4. "이 버튼을 클릭하면 무엇이 열리는가?" 재귀 추적

**Step 4 - 내부 기능 수집 (→ 노드 설명)**:
1. 각 UI의 이벤트 핸들러 → `fetch('/api/...')` 추출
2. Grep: `src/api/**/*.js` → API 라우트 → 서비스 호출
3. Grep: `src/services/**/*.js` → 서비스 로직 → DB/외부 API
4. 처리 흐름 1~3줄로 요약

**Step 5 - 중간 트리 조립**:
각 노드에 대해 다음 구조로 정리:
```
{ title, url, type(A/B/C/D), elementId, backend: { api, service }, children }
```

노드 유형:
- **A**: 화면 노드 (URL 변경 또는 팝업/모달 열림)
- **B**: 화면 전환 액션 (클릭 시 새 화면 진입, 하위에 화면 요소)
- **C**: 말단 액션 (클릭 후 화면 변화 없음, 리프 노드)
- **D**: 입력 필드 (텍스트, 체크박스, 선택 등, 리프 노드)

**--page 적용**: 지정 페이지(main/settings/login)부터 분석
**--depth 적용**: 지정 깊이 초과 시 "... N개 하위 항목"으로 요약

### Phase 3: 노드 ID 생성

클라이언트 측에서 직접 생성 (서버 API가 세션 인증 전용이므로):

```javascript
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const NODE_ID_LENGTH = 10;

function generateNodeId() {
  const bytes = require('crypto').randomBytes(NODE_ID_LENGTH);
  let result = '';
  for (let i = 0; i < NODE_ID_LENGTH; i++) {
    result += CHARSET[bytes[i] % CHARSET.length];
  }
  return result;
}
```

1. Phase 2 결과에서 전체 노드 수(N) 확인
2. N개의 고유 10자 노드 ID 생성
3. 생성 목록 내 중복 검사 (중복 시 재생성)

### Phase 4: 마인드맵 JSON 생성

**노드 필수 필드**:

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | number | 순차 ID (1부터, BFS 순서) |
| `nodeId` | string | 10자 고유 ID (Phase 3) |
| `title` | string | UI 요소명 (**name 아님**) |
| `parentId` | number\|null | 부모 id (루트=null) |
| `level` | number | 깊이 (루트=0) |
| `x`, `y` | number | 좌표 (루트: 26,20 / 자식: 부모+300, 형제 간격 60) |
| `children` | array | 자식 배열 |
| `expanded` | boolean | level 0~1: true, 나머지: false |
| `path` | string | `"{title}[{nodeId}].html"` |
| `checked` | boolean | true |

**JSON 래퍼** (필수):
```json
{
  "mindMapData": [ { /* 루트 노드 (children으로 전체 트리 포함) */ } ],
  "nextNodeId": 마지막id+1,
  "filters": []
}
```

**변환 절차**:
1. Phase 2의 중간 트리 + Phase 3의 노드 ID 결합
2. BFS 순회하며 id(1~N) 부여
3. parentId 설정, 레이아웃 좌표 계산
4. mindMapData 래퍼로 감쌈

**--dry-run이면 여기서 트리 구조 텍스트 출력 후 종료**

### Phase 5: API 저장

**1. 마인드맵 JSON 구조 저장**:
```bash
curl -X PUT \
     -H "X-Access-Key-Hash: <해쉬값>" \
     -H "Content-Type: application/json" \
     -d '{"data": {JSON구조}, "options": {"overwrite": true, "preserveContent": true}}' \
     $MYMIND3_SERVER_URL/api/skill/mindmap/{mindmapId}
```

**2. 각 노드 HTML 콘텐츠 저장** (BFS 순서):
```bash
curl -X PUT \
     -H "X-Access-Key-Hash: <해쉬값>" \
     -H "Content-Type: application/json" \
     -d '{"content": "<h1>노드제목</h1><p>설명...</p>"}' \
     $MYMIND3_SERVER_URL/api/skill/node/{mindmapId}/{nodeId}
```

- 같은 Level 노드는 병렬 저장 (최대 5개 동시)
- 실패 시 재시도: 최대 3회, 지수 백오프 (1초, 2초, 4초)
- 부분 실패 시 실패 노드 목록 기록, 나머지 계속 진행

### Phase 6: 결과 보고

실행 완료 후 다음 형식으로 출력:

```
══════════════════════════════════════════════
  /노드추출 완료
══════════════════════════════════════════════

  마인드맵: {이름}
  총 노드 수: {N}개

  탐색 흐름별 분포:
  ├── 랜딩 → 로그인: {n}개
  ├── [로그인] → 메인: {n}개
  ├── [설정] → 설정 화면: {n}개
  └── 공통 UI: {n}개

  노드 유형별:
  ├── 화면 (A): {n}개
  ├── 화면 전환 (B): {n}개
  ├── 말단 액션 (C): {n}개
  └── 입력 필드 (D): {n}개

  저장: JSON 구조 성공, 콘텐츠 {n}/{N} 성공
══════════════════════════════════════════════
```

## 노드 콘텐츠 HTML 템플릿

노드 유형(A/B/C/D)에 따라 HTML 콘텐츠를 생성한다.

### 유형 A: 화면 노드

```html
<h1>{화면명}</h1>
<p>{설명}</p>
<p>URL: <code>{경로}</code> | 파일: <code>{파일}</code></p>
<hr>
<h2>도달 경로</h2>
<p>{어떻게 이 화면에 도달하는지}</p>
<h2>화면 구성</h2>
<ul><li>{요소1}</li><li>{요소2}</li></ul>
<h2>내부 동작</h2>
<ul><li><strong>인증</strong>: <code>{API}</code> → {서비스}</li></ul>
```

### 유형 B: 화면 전환 액션

```html
<h1>{버튼명}</h1>
<p>{설명}</p>
<p>요소 ID: <code>{id}</code> | 타입: {type}</p>
<hr>
<h2>클릭 시 동작</h2>
<p>{결과} → <strong>{이동 화면}</strong></p>
<h2>내부 처리 흐름</h2>
<ol><li>{단계1}</li><li>{단계2}</li></ol>
```

### 유형 C: 말단 액션

```html
<h1>{버튼명}</h1>
<p>{설명}</p>
<p>요소 ID: <code>{id}</code></p>
<hr>
<h2>사용자 액션</h2>
<p>{트리거}</p>
<h2>내부 처리 흐름</h2>
<ol><li>{단계1}</li><li>{단계2}</li></ol>
```

### 유형 D: 입력 필드

```html
<h1>{필드명}</h1>
<p>{설명}</p>
<p>요소: <code>{selector}</code> | 타입: {type}</p>
<hr>
<h2>입력 규칙</h2>
<ul><li>{규칙1}</li></ul>
<h2>내부 처리</h2>
<p>{처리 흐름}</p>
```

## Access Key 해쉬 전달 방식

환경변수 대신, **해쉬값을 명령어 인자로 직접 전달**한다.

```bash
/노드추출 ed24770df41201c5c2e42ac9e78f000177ca6784e93b646b78e71edcd9cbd9d2
```

해쉬값은 Settings UI에서 [해쉬] 버튼으로 복사한다. 원본 Access Key(`mym3_ak_...`)는 전송하지 않으므로 보안성이 높다.

## Access Key 발급 및 해쉬 복사

1. MyMind3 → Settings → Agent Skills
2. [+ 새 키 발급] 클릭
3. 권한: **읽기/쓰기 (readwrite)**, scope: **전체(all)**
4. Access Keys 목록에서 **[해쉬]** 버튼 클릭 → 해쉬값 복사

## 에러 처리

| 코드 | 원인 | 해결 |
|------|------|------|
| `INVALID_KEY_HASH` | 해쉬값 오류/만료 | Settings에서 [해쉬] 버튼으로 재복사 |
| `PERMISSION_DENIED` | 마인드맵 접근 권한 없음 | 권한 있는 키 재발급 |
| `WRITE_DENIED` | permission=read인 키 | readwrite 키 재발급 또는 `--dry-run` |
| `NO_FILES_FOUND` | 분석 대상 파일 없음 | `--page` 옵션 확인 |
| `NETWORK_ERROR` | 서버 미구동 | `MYMIND3_SERVER_URL` 확인 또는 서버 시작 |
| `RATE_LIMITED` | 요청 제한 초과 | 대기 후 재시도 |

## API 엔드포인트

- **GET** `/api/skill/mindmaps` - 접근 가능 마인드맵 목록
- **PUT** `/api/skill/mindmap/:mindmapId` - 마인드맵 JSON 구조 저장 (신규)
- **PUT** `/api/skill/node/:mindmapId/:nodeId` - 노드 HTML 콘텐츠 저장

## 제한사항

- 최대 노드 수: 500개 (초과 시 `--depth` 자동 축소)
- 노드당 콘텐츠: 최대 5KB HTML
- API 동시 요청: 최대 5개 병렬
- `MYMIND3_SERVER_URL` 서버 구동 필수 (기본: `http://localhost:8080`)
- 민감 파일(`.env`, `*.key`) 분석 제외
- 유니코드 이스케이프 금지 (한글 직접 저장)
