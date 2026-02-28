# 전체 적용 규칙 (Phase1: 분산 프롬프트)

> 모든 파일에 적용되는 공통 규칙. 500토큰 이하 유지.

## 언어
- 모든 응답/주석: **한글**

## 코드 스타일
- 들여쓰기: 2 spaces
- 세미콜론: 필수
- 따옴표: 작은따옴표('') 우선

## 네이밍
```javascript
const userName = 'testUser';    // 변수: camelCase
function getUserData() {}      // 함수: camelCase
class UserController {}        // 클래스: PascalCase
const MAX_RETRY = 3;           // 상수: UPPER_SNAKE_CASE
// 파일명: kebab-case.js
```

## 절대 금지
1. 외부 API 직접 호출 금지 → `fetch('/api/...')` 경유
2. iframe 사용 금지 → AJAX/fetch
3. Git 쓰기 자동 실행 금지 → 사용자 요청 필수
