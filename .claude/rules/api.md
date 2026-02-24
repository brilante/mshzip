# API 개발 규칙 (Phase1: 분산 프롬프트)

## RESTful 규칙
```
GET    /api/resource      → 목록 조회
POST   /api/resource      → 생성
PUT    /api/resource/:id  → 전체 수정
PATCH  /api/resource/:id  → 부분 수정
DELETE /api/resource/:id  → 삭제
```

## 응답 형식 (스키마 강제)
```json
{
  "success": true,
  "data": {},
  "error": null
}
```

## 에러 코드
| 코드 | HTTP | 설명 |
|------|------|------|
| `VALIDATION_ERROR` | 400 | 입력값 검증 실패 |
| `UNAUTHORIZED` | 401 | 인증 필요 |
| `NOT_FOUND` | 404 | 리소스 없음 |
| `RATE_LIMITED` | 429 | 요청 제한 초과 |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |

## API 중복 금지
동일 기능은 하나의 API 엔드포인트만 사용. 사용처가 달라도 중복 생성 금지.
