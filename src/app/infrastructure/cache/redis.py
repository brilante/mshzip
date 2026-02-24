"""Redis 클라이언트 싱글턴 + 인메모리 폴백."""

import json
import secrets
import time
from typing import Any

from src.app.core.config import get_settings
from src.app.core.logging import get_logger

logger = get_logger(__name__)

_redis = None
_use_memory = False
_memory_store: dict[str, tuple[str, float]] = {}  # key → (value, expire_at)

SESSION_PREFIX = 'sess:'


async def _try_connect_redis():
    """Redis 연결 시도. 실패하면 인메모리 모드 전환."""
    global _redis, _use_memory
    if _use_memory:
        return
    try:
        import redis.asyncio as aioredis
        settings = get_settings()
        client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await client.ping()
        _redis = client
        logger.info('Redis 연결 성공', url=settings.REDIS_URL)
    except Exception as e:
        _use_memory = True
        logger.warning('Redis 연결 실패 → 인메모리 세션 모드', error=str(e))


def _mem_set(key: str, value: str, ttl: int) -> None:
    """인메모리 저장."""
    _memory_store[key] = (value, time.time() + ttl)


def _mem_get(key: str) -> str | None:
    """인메모리 조회 (만료 체크)."""
    item = _memory_store.get(key)
    if item is None:
        return None
    value, expire_at = item
    if time.time() > expire_at:
        del _memory_store[key]
        return None
    return value


def _mem_delete(key: str) -> bool:
    """인메모리 삭제."""
    return _memory_store.pop(key, None) is not None


async def close_redis() -> None:
    """Redis 연결 종료."""
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None


# ── 세션 관리 ──

async def create_session(data: dict[str, Any], ttl: int | None = None) -> str:
    """새 세션 생성 → session_id 반환."""
    await _try_connect_redis()
    settings = get_settings()
    ttl = ttl or settings.SESSION_TTL
    session_id = secrets.token_urlsafe(32)
    key = f'{SESSION_PREFIX}{session_id}'
    payload = json.dumps(data, ensure_ascii=False)

    if _use_memory:
        _mem_set(key, payload, ttl)
    else:
        await _redis.set(key, payload, ex=ttl)
    return session_id


async def get_session(session_id: str) -> dict[str, Any] | None:
    """세션 데이터 조회."""
    key = f'{SESSION_PREFIX}{session_id}'

    if _use_memory:
        raw = _mem_get(key)
    else:
        await _try_connect_redis()
        if _use_memory:
            raw = _mem_get(key)
        else:
            raw = await _redis.get(key)

    if raw is None:
        return None
    return json.loads(raw)


async def update_session(session_id: str, data: dict[str, Any], ttl: int | None = None) -> bool:
    """세션 데이터 갱신 (TTL 리셋)."""
    settings = get_settings()
    ttl = ttl or settings.SESSION_TTL
    key = f'{SESSION_PREFIX}{session_id}'
    payload = json.dumps(data, ensure_ascii=False)

    if _use_memory:
        if _mem_get(key) is None:
            return False
        _mem_set(key, payload, ttl)
        return True
    else:
        exists = await _redis.exists(key)
        if not exists:
            return False
        await _redis.set(key, payload, ex=ttl)
        return True


async def delete_session(session_id: str) -> bool:
    """세션 삭제."""
    key = f'{SESSION_PREFIX}{session_id}'

    if _use_memory:
        return _mem_delete(key)
    else:
        deleted = await _redis.delete(key)
        return deleted > 0
