# 보안 규칙 (Phase5: 3중 보안 Layer 1)

> Rules = 예방 레이어. Hooks = 차단 레이어. Agent = 탐지 레이어.

## 취약점 방지

| 취약점 | 방지 방법 |
|--------|----------|
| SQL Injection | 파라미터화 쿼리 (`?` 바인딩) |
| XSS | `textContent` 사용, `innerHTML` 지양 |
| Path Traversal | `path.resolve()` + 기준 경로 검증 |

## API 키
- 환경 변수 사용 (`process.env.KEY`)
- 클라이언트 노출 금지
- 하드코딩 절대 금지

## 민감 파일 (커밋 금지)
`.env`, `*.pem`, `*.key`, `credentials.json`

## 입력 검증
- 모든 사용자 입력은 서버에서 검증
- 프롬프트 인젝션 방어: 서버 경유 필수 아키텍처
