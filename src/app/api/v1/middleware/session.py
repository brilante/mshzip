"""세션 미들웨어 - 쿠키 기반 Redis 세션."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from src.app.infrastructure.cache.redis import get_session, update_session

SESSION_COOKIE = 'mym3_sid'


class SessionMiddleware(BaseHTTPMiddleware):
    """Redis 세션을 request.state.session에 주입하는 미들웨어."""

    async def dispatch(self, request: Request, call_next) -> Response:
        session_id = request.cookies.get(SESSION_COOKIE)
        session_data = None

        if session_id:
            session_data = await get_session(session_id)
            if session_data:
                # TTL 갱신 (sliding window)
                await update_session(session_id, session_data)

        # request.state에 세션 정보 주입
        request.state.session_id = session_id
        request.state.session = session_data or {}

        response = await call_next(request)
        return response
