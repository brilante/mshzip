"""인증 서비스 - 비밀번호 검증, 세션 관리, 역할 토큰."""

import hashlib
import hmac
import json
import time
from typing import Any

import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.core.config import get_settings
from src.app.infrastructure.db.models import User, AdminUser


# ── 비밀번호 해싱 ──

def hash_password(password: str) -> str:
    """bcrypt로 비밀번호 해싱."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()


def verify_password(password: str, hashed: str) -> bool:
    """비밀번호 검증. bcrypt, argon2, SHA256 레거시 지원."""
    if hashed.startswith('$2'):
        return bcrypt.checkpw(password.encode(), hashed.encode())
    if hashed.startswith('$argon2'):
        from argon2 import PasswordHasher
        from argon2.exceptions import VerifyMismatchError
        ph = PasswordHasher()
        try:
            return ph.verify(hashed, password)
        except VerifyMismatchError:
            return False
    # 레거시 SHA256
    legacy_hash = hashlib.sha256(password.encode()).hexdigest()
    return hmac.compare_digest(legacy_hash, hashed)


async def authenticate_user(
    db: AsyncSession, username: str, password: str
) -> dict[str, Any]:
    """사용자 인증. 성공 시 user dict, 실패 시 에러 메시지."""
    stmt = select(User).where(User.username == username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        return {'success': False, 'message': '사용자를 찾을 수 없습니다.'}

    if not verify_password(password, user.password):
        return {'success': False, 'message': '비밀번호가 올바르지 않습니다.'}

    # 레거시 (SHA256/argon2) → bcrypt 자동 마이그레이션
    if not user.password.startswith('$2'):
        user.password = hash_password(password)

    # last_login 갱신
    from datetime import datetime
    user.last_login = datetime.utcnow()
    await db.flush()

    return {
        'success': True,
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'totp_enabled': user.totp_enabled,
        },
    }


async def is_admin(db: AsyncSession, username: str) -> bool:
    """관리자 여부 확인."""
    stmt = select(AdminUser).where(AdminUser.user_id == username, AdminUser.is_active == 1)
    result = await db.execute(stmt)
    return result.scalar_one_or_none() is not None


# ── 역할 토큰 (클라이언트 캐시용, 세션에도 저장) ──

def generate_role_token(username: str, is_admin: bool) -> str:
    """HMAC 기반 역할 토큰 생성."""
    settings = get_settings()
    payload = json.dumps({
        'u': username,
        'a': is_admin,
        't': int(time.time()),
    }, separators=(',', ':'))
    sig = hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    return f'{payload}.{sig}'


def verify_role_token(token: str) -> dict | None:
    """역할 토큰 검증. 유효하면 payload dict 반환."""
    settings = get_settings()
    try:
        payload_str, sig = token.rsplit('.', 1)
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode(), payload_str.encode(), hashlib.sha256
        ).hexdigest()[:16]
        if not hmac.compare_digest(sig, expected_sig):
            return None
        data = json.loads(payload_str)
        return {'userId': data['u'], 'isAdmin': data['a'], 'timestamp': data['t']}
    except Exception:
        return None
