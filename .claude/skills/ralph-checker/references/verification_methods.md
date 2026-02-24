# 검증 수단 상세

## 검증 수단 분류

| 분류 | 검증 수단 | 용도 |
|------|----------|------|
| **코드형** | pytest, npm test, go test, lint | 테스트, 코드 품질 |
| **UI형** | Playwright, Chrome MCP, 스크린샷 | 화면, 요소 확인 |
| **시스템형** | PowerShell, Bash, HTTP 요청 | 환경, 프로세스 |

## 자동 선택 로직

프로젝트 유형에 따라 적절한 검증 수단을 자동 선택합니다:

```
프론트엔드 → playwright, chrome_mcp, screenshot
백엔드    → pytest, http_request, bash
API       → http_request, curl, pytest
UI        → chrome_mcp, screenshot, playwright
컴포넌트  → playwright, screenshot
스타일    → screenshot, chrome_mcp
빌드      → filesystem, bash, powershell
윈도우앱  → powershell, screenshot
CLI       → bash, powershell
```

## 검증 수단별 상세

### 1. Chrome MCP

**용도:** UI 요소 확인, 실시간 브라우저 조작

**사용 가능한 기능:**
- `navigate(tabId, url)` - 페이지 이동
- `find(tabId, query)` - 요소 검색
- `read_page(tabId)` - 페이지 DOM 읽기
- `computer({ action: "screenshot" })` - 스크린샷
- `computer({ action: "left_click", coordinate })` - 클릭

**예시:**
```javascript
// 요소 존재 확인
const elements = await chrome_mcp.find(tabId, "로그인 버튼")
const exists = elements.length > 0

// 스크린샷 저장
await chrome_mcp.computer({ action: "screenshot", tabId })
```

### 2. Playwright MCP

**용도:** 시나리오 기반 E2E 테스트

**사용 가능한 기능:**
- `browser_navigate({ url })` - 페이지 이동
- `browser_snapshot()` - DOM 스냅샷
- `browser_click({ ref, element })` - 클릭
- `browser_type({ ref, text })` - 텍스트 입력
- `browser_take_screenshot()` - 스크린샷

**예시:**
```javascript
// 로그인 시나리오
await playwright.browser_navigate({ url: "http://localhost:3000/login" })
await playwright.browser_type({ ref: "email", text: "test@test.com" })
await playwright.browser_type({ ref: "password", text: "password123" })
await playwright.browser_click({ ref: "submitBtn" })
// URL 확인
```

### 3. PowerShell / Bash

**용도:** 시스템 명령, 빌드, 프로세스 확인

**예시:**
```powershell
# 빌드 확인
npm run build

# 포트 확인
netstat -an | findstr :3000

# 파일 존재 확인
Test-Path "dist/bundle.js"

# 프로세스 확인
Get-Process | Where-Object { $_.ProcessName -eq "node" }
```

### 4. HTTP 요청

**용도:** API 엔드포인트 테스트

**예시:**
```bash
# GET 요청
curl http://localhost:3000/api/health

# POST 요청
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

### 5. 파일시스템

**용도:** 파일 존재, 내용 확인

**예시:**
```javascript
// 파일 존재 확인
const exists = fs.existsSync("dist/bundle.js")

// 파일 내용 확인
const content = fs.readFileSync("config.json", "utf-8")
const hasKey = content.includes("apiKey")
```

## 검증 조합 예시

### 프론트엔드 페이지 검증

```
1. 빌드 확인 (PowerShell)
   - npm run build 성공

2. 서버 시작 (PowerShell)
   - npm run dev
   - 포트 3000 리슨 확인

3. 페이지 로드 (Chrome MCP)
   - http://localhost:3000/login 접속
   - 페이지 로드 확인

4. UI 요소 확인 (Chrome MCP)
   - 이메일 입력 필드 존재
   - 비밀번호 입력 필드 존재
   - 로그인 버튼 존재

5. 기능 테스트 (Playwright)
   - 로그인 시나리오 실행
   - 리다이렉트 확인

6. 스크린샷 (Chrome MCP)
   - 최종 상태 캡처
```

### API 엔드포인트 검증

```
1. 서버 시작 (PowerShell)
   - npm start
   - 포트 확인

2. Health Check (HTTP)
   - GET /api/health
   - 200 응답 확인

3. API 테스트 (HTTP)
   - POST /api/login
   - 응답 확인
   - 토큰 반환 확인

4. 자동화 테스트 (Bash)
   - npm test
   - 테스트 통과 확인
```
