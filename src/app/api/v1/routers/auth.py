"""인증 API 라우터.

프론트엔드 호환 경로: /api/auth/*
"""

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.api.v1.middleware.auth import get_current_user
from src.app.api.v1.middleware.session import SESSION_COOKIE
from src.app.core.config import get_settings
from src.app.domain.services.auth_service import (
    authenticate_user,
    generate_role_token,
    is_admin,
)
from src.app.infrastructure.cache.redis import create_session, delete_session, get_session, update_session
from src.app.infrastructure.db.session import get_db

router = APIRouter(prefix='/api/auth', tags=['auth'])


# ── Pydantic 스키마 ──

class LoginRequest(BaseModel):
    username: str
    password: str


class Login2FARequest(BaseModel):
    code: str
    isBackupCode: bool = False


# ── 세션 쿠키 설정 헬퍼 ──

def _set_session_cookie(response: Response, session_id: str) -> None:
    """세션 쿠키 설정 (httpOnly, sameSite=lax)."""
    settings = get_settings()
    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_id,
        max_age=settings.SESSION_TTL,
        httponly=True,
        samesite='lax',
        secure=False,  # 로컬 개발: False, 프로덕션: True
        path='/',
    )


def _clear_session_cookie(response: Response) -> None:
    """세션 쿠키 삭제."""
    response.delete_cookie(key=SESSION_COOKIE, path='/')


# ── 라우트 ──

@router.post('/login')
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """POST /api/auth/login - 로그인."""
    result = await authenticate_user(db, body.username, body.password)

    if not result['success']:
        return {'success': False, 'message': result['message']}

    user = result['user']

    # 2FA 활성화 시 → 대기 상태로 세션 생성
    if user['totp_enabled']:
        session_id = await create_session({
            'pending2FAUser': user['username'],
            'pending2FAEmail': user['email'],
        })
        _set_session_cookie(response, session_id)
        return {
            'success': True,
            'requiresTwoFactor': True,
            'message': '2차 인증이 필요합니다.',
        }

    # 2FA 비활성화 → 바로 로그인 완료
    admin = await is_admin(db, user['username'])
    _rt = generate_role_token(user['username'], admin)

    session_id = await create_session({
        'userId': user['username'],
        'email': user['email'],
        '_rt': _rt,
    })
    _set_session_cookie(response, session_id)

    return {
        'success': True,
        'message': '로그인 성공',
        'user': {'username': user['username'], 'email': user['email']},
        '_xt': _rt,
    }


@router.post('/login-2fa')
async def login_2fa(
    body: Login2FARequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """POST /api/auth/login-2fa - 2FA 코드 검증 후 로그인 완료."""
    session = getattr(request.state, 'session', {})
    pending_user = session.get('pending2FAUser')

    if not pending_user:
        return {'success': False, 'message': '먼저 사용자명과 비밀번호로 로그인하세요.'}

    from src.app.domain.services.totp_service import verify_totp
    from src.app.infrastructure.db.models import User, BackupCode
    from sqlalchemy import select

    # 사용자 조회
    stmt = select(User).where(User.username == pending_user)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        return {'success': False, 'message': '사용자를 찾을 수 없습니다.'}

    # TOTP 또는 백업 코드 검증
    verified = False
    if body.isBackupCode:
        stmt_bc = select(BackupCode).where(
            BackupCode.user_id == user.id,
            BackupCode.code == body.code,
            BackupCode.used.is_(False),
        )
        bc_result = await db.execute(stmt_bc)
        backup_code = bc_result.scalar_one_or_none()
        if backup_code:
            backup_code.used = True
            await db.flush()
            verified = True
    else:
        verified = verify_totp(user.totp_secret, body.code)

    if not verified:
        msg = '백업 코드가 올바르지 않거나 이미 사용되었습니다.' if body.isBackupCode else '인증 코드가 올바르지 않습니다.'
        return {'success': False, 'message': msg}

    # 2FA 검증 성공 → 로그인 완료
    admin = await is_admin(db, user.username)
    _rt = generate_role_token(user.username, admin)

    # 기존 세션 삭제 후 새 세션 생성
    old_sid = getattr(request.state, 'session_id', None)
    if old_sid:
        await delete_session(old_sid)

    session_id = await create_session({
        'userId': user.username,
        'email': user.email,
        '_rt': _rt,
        'twoFactorVerified': True,
    })
    _set_session_cookie(response, session_id)

    return {
        'success': True,
        'message': '로그인 성공',
        'user': {'username': user.username, 'email': user.email},
        '_xt': _rt,
    }


@router.post('/logout')
async def logout(request: Request, response: Response):
    """POST /api/auth/logout - 로그아웃."""
    session_id = getattr(request.state, 'session_id', None)
    if session_id:
        await delete_session(session_id)
    _clear_session_cookie(response)
    return {'success': True, 'message': '로그아웃 성공'}


@router.get('/check')
async def check(request: Request):
    """GET /api/auth/check - 인증 상태 확인."""
    session = getattr(request.state, 'session', {})
    user_id = session.get('userId')

    if user_id:
        return {
            'success': True,
            'authenticated': True,
            'user': {'username': user_id, 'email': session.get('email', '')},
            '_xt': session.get('_rt'),
        }
    return {
        'success': True,
        'authenticated': False,
        'user': None,
        '_xt': None,
    }


@router.get('/user')
async def get_user(user: dict = Depends(get_current_user)):
    """GET /api/auth/user - 현재 로그인 사용자 정보."""
    return {'success': True, 'user': user}


@router.get('/admin-check')
async def admin_check(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """GET /api/auth/admin-check - 관리자 여부 확인."""
    from src.app.domain.services.auth_service import verify_role_token

    session = getattr(request.state, 'session', {})
    user_id = session.get('userId')

    if not user_id:
        return {'success': True, 'isAdmin': False, 'message': '로그인이 필요합니다.'}

    # 역할 토큰으로 빠른 확인
    _rt = session.get('_rt')
    if _rt:
        token_data = verify_role_token(_rt)
        if token_data and token_data['userId'] == user_id:
            return {
                'success': True,
                'isAdmin': token_data['isAdmin'],
                'isVerified': session.get('adminVerified', False),
            }

    # DB 폴백
    admin = await is_admin(db, user_id)
    return {
        'success': True,
        'isAdmin': admin,
        'isVerified': session.get('adminVerified', False),
    }


@router.post('/admin-verify')
async def admin_verify(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """POST /api/auth/admin-verify - 관리자 2차 비밀번호 검증."""
    session = getattr(request.state, 'session', {})
    user_id = session.get('userId')
    if not user_id:
        return {'success': False, 'message': '로그인이 필요합니다.'}

    body = await request.json()
    password = body.get('password', '')

    from src.app.infrastructure.db.models import AdminUser
    from sqlalchemy import select

    stmt = select(AdminUser).where(AdminUser.user_id == user_id, AdminUser.is_active == 1)
    result = await db.execute(stmt)
    admin = result.scalar_one_or_none()

    if not admin:
        return {'success': False, 'message': '관리자 권한이 없습니다.'}

    # 관리자 비밀번호 검증
    from src.app.domain.services.auth_service import verify_password
    if not verify_password(password, admin.admin_password):
        return {'success': False, 'message': '관리자 비밀번호가 올바르지 않습니다.'}

    # 세션에 관리자 인증 상태 저장
    import time
    session['adminVerified'] = True
    session['adminVerifiedAt'] = int(time.time())
    session_id = getattr(request.state, 'session_id', None)
    if session_id:
        await update_session(session_id, session)

    return {'success': True, 'message': '관리자 인증 성공'}


@router.post('/admin-logout')
async def admin_logout(request: Request):
    """POST /api/auth/admin-logout - 관리자 세션 해제."""
    session = getattr(request.state, 'session', {})
    session.pop('adminVerified', None)
    session.pop('adminVerifiedAt', None)
    session_id = getattr(request.state, 'session_id', None)
    if session_id:
        await update_session(session_id, session)
    return {'success': True, 'message': '관리자 세션 해제'}
