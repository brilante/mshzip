---
name: kill-server
description: 실행중인 현재 프로젝트의 웹서버를 찾아서 강제로 종료시키는 스킬
---

# Kill Server

## 사용법

`/kill-server` 명령으로 실행

## 자동 실행 (Hook)

- "서버 재시작" 키워드 감지 시
- `node server.js`, `npm start`, `yarn start` 등 서버 시작 명령 감지 시

## 종료 우선순위

| 단계 | 방법 | 설명 |
|------|------|------|
| 1단계 | HTTP shutdown | `POST /_internal/shutdown` (localhost 전용, 가장 안정적) |
| 2단계 | PID 파일 | `.server.pid` → `process.kill()` (Node.js 네이티브) |
| 3단계 | 포트 기반 | netstat로 PID 탐색 → node 프로세스만 종료 |

## 허용 포트

| 포트 | 용도 |
|------|------|
| 5858 | 메인 개발 서버 (.env PORT) |
| 3999 | 대체 개발 서버 |

**위 포트만 종료 가능. 시스템 포트(80, 443, 22 등) 접근 금지.**

## 스크립트

- `.claude/skills/kill-server/scripts/kill-server.js` - Node.js 메인
- `.claude/hooks/server-restart-detector.js` - 자동 감지 Hook

## 서버 연동

- `server.js`에 `POST /_internal/shutdown` 엔드포인트 (localhost 전용)
- `server.js`에 `.server.pid` 파일 생성/삭제 (graceful shutdown 포함)
