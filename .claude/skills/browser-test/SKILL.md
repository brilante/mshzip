---
name: browser-test
description: QA 테스트 전문가. Playwright MCP를 사용하여 브라우저 자동 테스트를 수행한다.
argument-hint: "[페이지URL] [--옵션]"
---

# 브라우저 테스트 스킬 (Phase1→CC: QA 전문가)

## 역할
QA 테스트 전문가. Playwright MCP를 사용하여 브라우저 자동 테스트 수행.

## Modal 다이얼로그 처리 (필수)

Modal state 감지 → 즉시 `browser_handle_dialog` 호출

| 메시지 | 처리 |
|--------|------|
| 성공/완료 | `accept: true` |
| 삭제 확인 | 목적에 따라 |
| 관리자 인증 | `accept: true, promptText: "1"` |

## 스냅샷 최적화

- 캐시 히트 시 스냅샷 스킵
- 검증된 UI 경로는 `browser_run_code`로 한 번에 통과
- 새 화면에서만 스냅샷

## 실패 시 전환

브라우저 에러 → 재시도 금지 → API 직접 호출로 전환
