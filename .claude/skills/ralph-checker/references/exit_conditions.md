# 탈출조건 유형

## 개요

탈출조건(Exit Condition)은 Ralph Loop가 성공적으로 완료되었는지 판단하는 기준입니다.
모든 탈출조건이 통과해야 루프가 종료됩니다.

## 탈출조건 유형

| 유형 | 설명 | 검증 방법 | 예시 |
|------|------|----------|------|
| `command_success` | 명령어 성공 (exit 0) | bash/PowerShell | `npm run build` |
| `file_exists` | 파일 존재 | filesystem | `dist/bundle.js` |
| `output_contains` | 출력 문자열 포함 | bash | "All tests passed" |
| `no_errors` | 에러 없음 | bash/lint | `eslint src/` |
| `ui_element` | UI 요소 존재 | Chrome MCP | `form#login-form` |
| `navigation` | URL 이동 | Playwright | `/dashboard` |
| `api_response` | API 응답 확인 | HTTP 요청 | `200 OK` |
| `screenshot_match` | 스크린샷 비교 | Chrome MCP | 시각적 검증 |

## 유형별 상세

### 1. command_success

명령어가 성공적으로 실행되었는지 확인합니다.

**config.json 형식:**
```json
{
  "id": 1,
  "type": "command_success",
  "description": "빌드 성공",
  "command": "npm run build",
  "expected_exit_code": 0
}
```

**검증 로직:**
```javascript
const { execSync } = require('child_process');
try {
  execSync(condition.command, { stdio: 'pipe' });
  return { passed: true, message: "명령어 성공" };
} catch (error) {
  return { passed: false, message: error.message };
}
```

### 2. file_exists

특정 파일이 존재하는지 확인합니다.

**config.json 형식:**
```json
{
  "id": 2,
  "type": "file_exists",
  "description": "빌드 결과물 존재",
  "path": "dist/bundle.js"
}
```

**검증 로직:**
```javascript
const fs = require('fs');
const exists = fs.existsSync(condition.path);
return { 
  passed: exists, 
  message: exists ? "파일 존재" : "파일 없음" 
};
```

### 3. output_contains

명령어 출력에 특정 문자열이 포함되는지 확인합니다.

**config.json 형식:**
```json
{
  "id": 3,
  "type": "output_contains",
  "description": "테스트 통과",
  "command": "npm test",
  "expected_output": "All tests passed"
}
```

### 4. no_errors

명령어 실행 시 에러가 없는지 확인합니다.

**config.json 형식:**
```json
{
  "id": 4,
  "type": "no_errors",
  "description": "린트 에러 없음",
  "command": "npm run lint"
}
```

### 5. ui_element

UI 요소가 페이지에 존재하는지 확인합니다.

**config.json 형식:**
```json
{
  "id": 5,
  "type": "ui_element",
  "description": "로그인 폼 존재",
  "url": "http://localhost:3000/login",
  "selector": "form#login-form",
  "method": "chrome_mcp"
}
```

**검증 방법:**
- Chrome MCP: `find(tabId, "로그인 폼")`
- Playwright: `browser_snapshot()` 후 요소 확인

### 6. navigation

특정 URL로 이동하는지 확인합니다.

**config.json 형식:**
```json
{
  "id": 6,
  "type": "navigation",
  "description": "로그인 후 대시보드 이동",
  "trigger": {
    "url": "http://localhost:3000/login",
    "actions": [
      { "type": "fill", "selector": "#email", "value": "test@test.com" },
      { "type": "fill", "selector": "#password", "value": "password" },
      { "type": "click", "selector": "button[type=submit]" }
    ]
  },
  "expected_url": "/dashboard",
  "method": "playwright"
}
```

### 7. api_response

API 응답을 확인합니다.

**config.json 형식:**
```json
{
  "id": 7,
  "type": "api_response",
  "description": "API 헬스체크",
  "url": "http://localhost:3000/api/health",
  "method": "GET",
  "expected_status": 200,
  "expected_body_contains": "ok"
}
```

## 탈출조건 조합 예시

### 로그인 페이지 구현

```json
{
  "exit_conditions": [
    {
      "id": 1,
      "type": "command_success",
      "description": "빌드 성공",
      "command": "npm run build"
    },
    {
      "id": 2,
      "type": "ui_element",
      "description": "로그인 페이지 로드",
      "url": "http://localhost:3000/login",
      "selector": "form",
      "method": "chrome_mcp"
    },
    {
      "id": 3,
      "type": "ui_element",
      "description": "이메일 필드 존재",
      "selector": "input[type=email]",
      "method": "chrome_mcp"
    },
    {
      "id": 4,
      "type": "ui_element",
      "description": "비밀번호 필드 존재",
      "selector": "input[type=password]",
      "method": "chrome_mcp"
    },
    {
      "id": 5,
      "type": "ui_element",
      "description": "로그인 버튼 존재",
      "selector": "button[type=submit]",
      "method": "chrome_mcp"
    },
    {
      "id": 6,
      "type": "navigation",
      "description": "로그인 성공 시 리다이렉트",
      "expected_url": "/dashboard",
      "method": "playwright"
    }
  ]
}
```

### API 엔드포인트 구현

```json
{
  "exit_conditions": [
    {
      "id": 1,
      "type": "command_success",
      "description": "서버 시작",
      "command": "npm start"
    },
    {
      "id": 2,
      "type": "api_response",
      "description": "헬스체크 통과",
      "url": "http://localhost:3000/api/health",
      "expected_status": 200
    },
    {
      "id": 3,
      "type": "api_response",
      "description": "로그인 API 동작",
      "url": "http://localhost:3000/api/login",
      "method": "POST",
      "body": {"email": "test@test.com", "password": "test"},
      "expected_status": 200
    },
    {
      "id": 4,
      "type": "command_success",
      "description": "테스트 통과",
      "command": "npm test"
    }
  ]
}
```

## 우선순위 권장사항

탈출조건은 다음 순서로 정의하는 것을 권장합니다:

1. **빌드/컴파일** - 코드가 유효한지 확인
2. **린트/타입체크** - 코드 품질 확인
3. **파일 존재** - 결과물 생성 확인
4. **서버 시작** - 실행 가능 확인
5. **UI 요소** - 화면 구성 확인
6. **기능 테스트** - 동작 확인
7. **시나리오 테스트** - 전체 흐름 확인
