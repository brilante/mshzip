# MyMind3 v0 - Python/FastAPI
FROM python:3.14-slim AS base

WORKDIR /app

# 시스템 의존성
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# uv 설치
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# 의존성 설치 (캐시 활용)
COPY pyproject.toml ./
RUN uv pip install --system --no-cache -r pyproject.toml

# 소스 복사
COPY src/ src/
COPY public/ public/
COPY alembic/ alembic/
COPY alembic.ini ./

# 환경 변수
ENV APP_ENV=production
ENV PORT=5858

EXPOSE 5858

# 헬스체크
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:5858/api/health || exit 1

# 실행
CMD ["uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "5858"]
