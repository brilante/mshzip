"""보안 미들웨어 - 헤더, Rate Limiting."""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """보안 헤더 미들웨어 (Helmet.js 대응)."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # 보안 헤더 설정
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'

        # CSP (Content Security Policy) - 인라인 스크립트 허용 (프론트엔드 호환)
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
            "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' https://accounts.google.com https://apis.google.com; "
            "frame-src https://accounts.google.com https://appleid.apple.com;"
        )

        return response


# ── Rate Limiting (인메모리 카운터, 프로덕션에서는 Redis 기반 권장) ──

import time
from collections import defaultdict


class _RateLimitStore:
    """인메모리 IP별 요청 카운터."""

    def __init__(self):
        self._store: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str, max_requests: int, window_seconds: int) -> bool:
        """True = 허용, False = 제한 초과."""
        now = time.time()
        cutoff = now - window_seconds
        # 만료된 항목 제거
        self._store[key] = [t for t in self._store[key] if t > cutoff]
        if len(self._store[key]) >= max_requests:
            return False
        self._store[key].append(now)
        return True


_rate_store = _RateLimitStore()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """IP 기반 Rate Limiting 미들웨어."""

    async def dispatch(self, request: Request, call_next) -> Response:
        client_ip = request.client.host if request.client else '0.0.0.0'
        path = request.url.path

        # 경로별 Rate Limit 설정
        if path.startswith('/api/ai'):
            allowed = _rate_store.check(f'ai:{client_ip}', max_requests=10, window_seconds=60)
        elif path.startswith('/api/auth/login'):
            allowed = _rate_store.check(f'login:{client_ip}', max_requests=5, window_seconds=60)
        elif path.startswith('/api/files'):
            allowed = _rate_store.check(f'files:{client_ip}', max_requests=100, window_seconds=60)
        else:
            allowed = _rate_store.check(f'general:{client_ip}', max_requests=1000, window_seconds=900)

        if not allowed:
            return Response(
                content='{"success":false,"error":"요청 횟수를 초과했습니다.","code":"RATE_LIMITED"}',
                status_code=429,
                media_type='application/json',
            )

        return await call_next(request)
