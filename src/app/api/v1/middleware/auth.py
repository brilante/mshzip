"""인증 의존성 - FastAPI Depends 패턴."""

from fastapi import Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.infrastructure.db.session import get_db


async def get_current_user(request: Request) -> dict:
    """세션에서 현재 로그인 사용자 조회. 미인증 시 401."""
    session = getattr(request.state, 'session', {})
    user_id = session.get('userId')
    if not user_id:
        raise HTTPException(status_code=401, detail='로그인이 필요합니다.')
    return {
        'username': user_id,
        'email': session.get('email', ''),
    }


async def get_optional_user(request: Request) -> dict | None:
    """세션에서 현재 사용자 조회. 미인증이면 None."""
    session = getattr(request.state, 'session', {})
    user_id = session.get('userId')
    if not user_id:
        return None
    return {
        'username': user_id,
        'email': session.get('email', ''),
    }


async def require_admin(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    """관리자 권한 필수 의존성."""
    session = getattr(request.state, 'session', {})
    user_id = session.get('userId')
    if not user_id:
        raise HTTPException(status_code=401, detail='로그인이 필요합니다.')

    from src.app.infrastructure.db.models import AdminUser
    from sqlalchemy import select

    stmt = select(AdminUser).where(AdminUser.user_id == user_id, AdminUser.is_active == 1)
    result = await db.execute(stmt)
    admin = result.scalar_one_or_none()

    if not admin:
        raise HTTPException(status_code=403, detail='관리자 권한이 없습니다.')

    return {
        'username': user_id,
        'email': session.get('email', ''),
        'is_admin': True,
    }


async def require_access_key(
    request: Request,
    authorization: str = Header(default=''),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Access Key Bearer 인증 의존성 (Skill API용)."""
    if not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Authorization 헤더가 필요합니다.')

    raw_key = authorization[7:]

    from src.app.infrastructure.db.models import AccessKey
    from sqlalchemy import select
    import hashlib
    from datetime import datetime

    # 해시 기반 검증
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    stmt = select(AccessKey).where(
        AccessKey.key_hash == key_hash,
        AccessKey.is_active == 1,
    )
    result = await db.execute(stmt)
    key_record = result.scalar_one_or_none()

    if not key_record:
        raise HTTPException(status_code=401, detail='유효하지 않은 Access Key입니다.')

    # 만료 검사
    if key_record.expires_at and key_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail='Access Key가 만료되었습니다.')

    return {
        'key_id': key_record.id,
        'user_id': key_record.user_id,
        'scope': key_record.scope or 'whitelist',
        'permission': key_record.permission,
        'mindmap_id': key_record.mindmap_id,
    }
