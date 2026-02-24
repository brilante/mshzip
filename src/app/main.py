"""MyMind3 v0 - FastAPI 메인 앱."""

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware as StarletteSessionMiddleware

from src.app.core.config import get_settings
from src.app.core.logging import setup_logging, get_logger

logger = get_logger(__name__)

PUBLIC_DIR = Path(__file__).resolve().parent.parent.parent / 'public'


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """앱 시작/종료 이벤트."""
    settings = get_settings()
    setup_logging(debug=settings.DEBUG)
    logger.info('서버 시작', version=settings.APP_VERSION, port=settings.PORT)
    yield
    # Redis 종료
    from src.app.infrastructure.cache.redis import close_redis
    await close_redis()
    # DB 엔진 종료
    from src.app.infrastructure.db.session import dispose_engine
    await dispose_engine()
    logger.info('서버 종료')


def create_app() -> FastAPI:
    """FastAPI 앱 팩토리."""
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        lifespan=lifespan,
        docs_url='/docs' if settings.DEBUG else None,
        redoc_url=None,
    )

    # ── 미들웨어 (역순 실행 = 아래가 먼저) ──

    # 1. CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=['*'],
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )

    # 2. 보안 헤더
    from src.app.api.v1.middleware.security import SecurityHeadersMiddleware
    app.add_middleware(SecurityHeadersMiddleware)

    # 3. Rate Limiting
    from src.app.api.v1.middleware.security import RateLimitMiddleware
    app.add_middleware(RateLimitMiddleware)

    # 4. Redis 세션
    from src.app.api.v1.middleware.session import SessionMiddleware
    app.add_middleware(SessionMiddleware)

    # 5. Starlette 세션 (OAuth state 저장용)
    app.add_middleware(StarletteSessionMiddleware, secret_key=settings.SECRET_KEY)

    # ── 라우터 등록 ──
    from src.app.api.v1.routers.health import router as health_router
    from src.app.api.v1.routers.auth import router as auth_router
    from src.app.api.v1.routers.oauth import router as oauth_router
    from src.app.api.v1.routers.twofa import router as twofa_router

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(oauth_router)
    app.include_router(twofa_router)

    # 정적 파일 서빙 (프론트엔드) - 라우터 뒤에 등록
    if PUBLIC_DIR.exists():
        app.mount('/', StaticFiles(directory=str(PUBLIC_DIR), html=True), name='static')

    return app


app = create_app()
