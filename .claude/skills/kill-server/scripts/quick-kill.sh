#!/bin/bash
# Kill Server Script (Bash)
# 프로젝트 웹서버를 찾아 종료하는 스크립트

# 기본 포트
PORTS=(5858 3999)

# 스크립트 디렉토리
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"

# .env에서 PORT 읽기
if [ -f "$PROJECT_ROOT/.env" ]; then
    ENV_PORT=$(grep "^PORT=" "$PROJECT_ROOT/.env" | cut -d'=' -f2)
    if [ -n "$ENV_PORT" ]; then
        PORTS=("$ENV_PORT" "${PORTS[@]}")
    fi
fi

# 중복 제거
PORTS=($(echo "${PORTS[@]}" | tr ' ' '\n' | sort -u | tr '\n' ' '))

echo " 프로젝트 웹서버 탐색 중..."
echo ""
echo " 프로젝트 경로: $PROJECT_ROOT"
echo " 검색 포트: ${PORTS[*]}"
echo ""

KILLED=false

for PORT in "${PORTS[@]}"; do
    # lsof 사용 (Linux/macOS)
    if command -v lsof &> /dev/null; then
        PID=$(lsof -i :$PORT -t 2>/dev/null | head -1)
    # netstat 사용 (대체)
    elif command -v netstat &> /dev/null; then
        PID=$(netstat -tlnp 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1)
    # ss 사용 (최신 Linux)
    elif command -v ss &> /dev/null; then
        PID=$(ss -tlnp 2>/dev/null | grep ":$PORT " | sed 's/.*pid=\([0-9]*\).*/\1/')
    else
        echo " lsof, netstat, ss 명령어가 없습니다."
        exit 1
    fi

    if [ -n "$PID" ]; then
        echo " 포트 $PORT 에서 프로세스 발견: PID $PID"

        # 프로세스 정보
        if command -v ps &> /dev/null; then
            echo " 프로세스 정보:"
            ps -p $PID -o pid,args= 2>/dev/null || true
            echo ""
        fi

        # 정상 종료 시도
        echo " 정상 종료 시도 중..."
        kill $PID 2>/dev/null
        sleep 3

        # 종료 확인
        if ! kill -0 $PID 2>/dev/null; then
            echo " 포트 $PORT 서버가 정상 종료되었습니다."
            echo ""
            KILLED=true
            continue
        fi

        # 강제 종료
        echo " 정상 종료 실패, 강제 종료 시도..."
        kill -9 $PID 2>/dev/null
        sleep 1

        if ! kill -0 $PID 2>/dev/null; then
            echo " 포트 $PORT 서버가 강제 종료되었습니다."
            echo ""
            KILLED=true
        else
            echo " 포트 $PORT 서버 종료 실패"
            echo ""
        fi
    else
        echo "ℹ 포트 $PORT: 실행 중인 서버 없음"
    fi
done

echo ""
if [ "$KILLED" = false ]; then
    echo " 종료할 서버가 없습니다."
fi
