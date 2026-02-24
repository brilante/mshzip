# 브라우저 테스트 규칙 (Phase1: 분산 프롬프트)

## Modal 다이얼로그 처리
Modal state 감지 → 즉시 `browser_handle_dialog` 호출

## 스냅샷 최적화
- 캐시 히트 → 스냅샷 스킵, 직접 액션
- 검증된 UI 경로 → `browser_run_code`로 한 번에 통과
- 새 화면만 스냅샷

## 실패 시 전환
브라우저 에러 → 재시도 금지 → API 직접 호출로 전환
