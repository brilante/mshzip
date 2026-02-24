"""OAuth 라우터 - Google, Facebook, Apple.

프론트엔드 호환 경로: /api/auth/google, /api/auth/facebook, /api/auth/apple
"""

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.api.v1.middleware.session import SESSION_COOKIE
from src.app.core.config import get_settings
from src.app.domain.services.auth_service import generate_role_token, is_admin
from src.app.infrastructure.cache.redis import create_session
from src.app.infrastructure.db.models import User
from src.app.infrastructure.db.session import get_db

router = APIRouter(prefix='/api/auth', tags=['oauth'])


def _set_session_cookie(response: Response, session_id: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_id,
        max_age=settings.SESSION_TTL,
        httponly=True,
        samesite='lax',
        secure=False,
        path='/',
    )


# ── Google OAuth ──

@router.get('/google')
async def google_login(request: Request):
    """GET /api/auth/google - Google OAuth 시작."""
    settings = get_settings()
    if not settings.GOOGLE_CLIENT_ID:
        return {'success': False, 'message': 'Google OAuth 미설정'}

    from authlib.integrations.starlette_client import OAuth
    oauth = OAuth()
    oauth.register(
        name='google',
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile'},
    )
    redirect_uri = str(request.url_for('google_callback'))
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get('/google/callback', name='google_callback')
async def google_callback(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """GET /api/auth/google/callback - Google OAuth 콜백."""
    settings = get_settings()
    from authlib.integrations.starlette_client import OAuth
    oauth = OAuth()
    oauth.register(
        name='google',
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile'},
    )

    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception:
        return RedirectResponse('/login?error=oauth')

    userinfo = token.get('userinfo', {})
    google_id = userinfo.get('sub')
    email = userinfo.get('email', '')
    display_name = userinfo.get('name', '')

    if not google_id:
        return RedirectResponse('/login?error=no_google_id')

    # Upsert 사용자
    user = await _upsert_oauth_user(db, 'google', google_id, email, display_name)

    # 세션 생성
    admin = await is_admin(db, user.username)
    _rt = generate_role_token(user.username, admin)
    session_id = await create_session({
        'userId': user.username,
        'email': user.email,
        '_rt': _rt,
    })

    redirect = RedirectResponse('/app', status_code=302)
    _set_session_cookie(redirect, session_id)
    return redirect


# ── Google One Tap ──

@router.get('/google-config')
async def google_config():
    """GET /api/auth/google-config - Google Client ID 반환."""
    settings = get_settings()
    return {
        'success': True,
        'clientId': settings.GOOGLE_CLIENT_ID,
    }


@router.post('/google-onetap')
async def google_onetap(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """POST /api/auth/google-onetap - Google One Tap 로그인."""
    body = await request.json()
    credential = body.get('credential', '')

    if not credential:
        return {'success': False, 'message': 'credential이 필요합니다.'}

    settings = get_settings()
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests

    try:
        idinfo = id_token.verify_oauth2_token(
            credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
    except Exception:
        return {'success': False, 'message': '유효하지 않은 Google 토큰입니다.'}

    google_id = idinfo.get('sub')
    email = idinfo.get('email', '')
    display_name = idinfo.get('name', '')

    user = await _upsert_oauth_user(db, 'google', google_id, email, display_name)

    admin = await is_admin(db, user.username)
    _rt = generate_role_token(user.username, admin)
    session_id = await create_session({
        'userId': user.username,
        'email': user.email,
        '_rt': _rt,
    })
    _set_session_cookie(response, session_id)

    return {
        'success': True,
        'message': '로그인 성공',
        'user': {'username': user.username, 'email': user.email},
        '_xt': _rt,
    }


# ── Facebook OAuth ──

@router.get('/facebook')
async def facebook_login(request: Request):
    """GET /api/auth/facebook - Facebook OAuth 시작."""
    settings = get_settings()
    if not settings.FACEBOOK_APP_ID:
        return {'success': False, 'message': 'Facebook OAuth 미설정'}

    from authlib.integrations.starlette_client import OAuth
    oauth = OAuth()
    oauth.register(
        name='facebook',
        client_id=settings.FACEBOOK_APP_ID,
        client_secret=settings.FACEBOOK_APP_SECRET,
        authorize_url='https://www.facebook.com/v18.0/dialog/oauth',
        access_token_url='https://graph.facebook.com/v18.0/oauth/access_token',
        client_kwargs={'scope': 'email public_profile'},
    )
    redirect_uri = str(request.url_for('facebook_callback'))
    return await oauth.facebook.authorize_redirect(request, redirect_uri)


@router.get('/facebook/callback', name='facebook_callback')
async def facebook_callback(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """GET /api/auth/facebook/callback - Facebook OAuth 콜백."""
    settings = get_settings()
    from authlib.integrations.starlette_client import OAuth
    oauth = OAuth()
    oauth.register(
        name='facebook',
        client_id=settings.FACEBOOK_APP_ID,
        client_secret=settings.FACEBOOK_APP_SECRET,
        authorize_url='https://www.facebook.com/v18.0/dialog/oauth',
        access_token_url='https://graph.facebook.com/v18.0/oauth/access_token',
        client_kwargs={'scope': 'email public_profile'},
    )

    try:
        token = await oauth.facebook.authorize_access_token(request)
    except Exception:
        return RedirectResponse('/login?error=oauth')

    # Facebook Graph API로 사용자 정보 조회
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            'https://graph.facebook.com/me',
            params={'fields': 'id,name,email', 'access_token': token['access_token']},
        )
        if resp.status_code != 200:
            return RedirectResponse('/login?error=facebook_api')
        userinfo = resp.json()

    facebook_id = userinfo.get('id')
    email = userinfo.get('email', '')
    display_name = userinfo.get('name', '')

    user = await _upsert_oauth_user(db, 'facebook', facebook_id, email, display_name)

    admin = await is_admin(db, user.username)
    _rt = generate_role_token(user.username, admin)
    session_id = await create_session({
        'userId': user.username,
        'email': user.email,
        '_rt': _rt,
    })

    redirect = RedirectResponse('/app', status_code=302)
    _set_session_cookie(redirect, session_id)
    return redirect


# ── Apple OAuth ──

@router.get('/apple')
async def apple_login(request: Request):
    """GET /api/auth/apple - Apple OAuth 시작."""
    settings = get_settings()
    apple_client_id = getattr(settings, 'APPLE_CLIENT_ID', '')
    if not apple_client_id:
        return {'success': False, 'message': 'Apple OAuth 미설정'}
    # Apple Sign In은 POST callback 사용 → 프론트엔드에서 처리
    return {'success': False, 'message': 'Apple Sign In은 클라이언트에서 직접 처리합니다.'}


@router.post('/apple/callback')
async def apple_callback(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """POST /api/auth/apple/callback - Apple OAuth 콜백."""
    form = await request.form()
    id_token_str = form.get('id_token', '')

    if not id_token_str:
        return RedirectResponse('/login?error=no_token')

    import jwt
    try:
        # Apple ID 토큰 디코딩 (검증은 프로덕션에서 추가)
        payload = jwt.decode(id_token_str, options={'verify_signature': False})
    except Exception:
        return RedirectResponse('/login?error=invalid_token')

    apple_id = payload.get('sub')
    email = payload.get('email', '')

    user = await _upsert_oauth_user(db, 'apple', apple_id, email, '')

    admin = await is_admin(db, user.username)
    _rt = generate_role_token(user.username, admin)
    session_id = await create_session({
        'userId': user.username,
        'email': user.email,
        '_rt': _rt,
    })

    redirect = RedirectResponse('/app', status_code=302)
    _set_session_cookie(redirect, session_id)
    return redirect


@router.get('/apple/config')
async def apple_config():
    """GET /api/auth/apple/config - Apple 설정 반환."""
    settings = get_settings()
    return {
        'success': True,
        'clientId': getattr(settings, 'APPLE_CLIENT_ID', ''),
        'redirectUri': getattr(settings, 'APPLE_REDIRECT_URI', ''),
    }


# ── 공통: OAuth 사용자 Upsert ──

async def _upsert_oauth_user(
    db: AsyncSession, provider: str, provider_id: str, email: str, display_name: str
) -> User:
    """OAuth 제공자별 사용자 생성/업데이트."""
    from src.app.domain.services.auth_service import hash_password
    import secrets

    # 기존 사용자 검색 (provider ID 기반)
    if provider == 'google':
        stmt = select(User).where(User.google_id == provider_id)
    elif provider == 'facebook':
        stmt = select(User).where(User.facebook_id == provider_id)
    else:
        # Apple 등 → 이메일 기반
        stmt = select(User).where(User.email == email)

    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user:
        # 기존 사용자 업데이트
        if display_name:
            user.display_name = display_name
        from datetime import datetime
        user.last_login = datetime.utcnow()
        await db.flush()
        return user

    # 이메일 기반 기존 사용자 검색
    if email:
        stmt_email = select(User).where(User.email == email)
        result_email = await db.execute(stmt_email)
        user = result_email.scalar_one_or_none()
        if user:
            # provider ID 연결
            if provider == 'google':
                user.google_id = provider_id
            elif provider == 'facebook':
                user.facebook_id = provider_id
            if display_name:
                user.display_name = display_name
            from datetime import datetime
            user.last_login = datetime.utcnow()
            await db.flush()
            return user

    # 새 사용자 생성
    username = email.split('@')[0] if email else f'{provider}_{provider_id[:8]}'
    # username 중복 확인
    existing = await db.execute(select(User).where(User.username == username))
    if existing.scalar_one_or_none():
        username = f'{username}_{secrets.token_hex(3)}'

    new_user = User(
        username=username,
        email=email,
        password=hash_password(secrets.token_urlsafe(32)),
        google_id=provider_id if provider == 'google' else None,
        facebook_id=provider_id if provider == 'facebook' else None,
        display_name=display_name or username,
        auth_provider=provider,
    )
    db.add(new_user)
    await db.flush()
    return new_user
