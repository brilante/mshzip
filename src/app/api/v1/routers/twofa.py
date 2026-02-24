"""2FA API 라우터.

프론트엔드 호환 경로: /api/2fa/*
"""

import secrets

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.api.v1.middleware.auth import get_current_user
from src.app.domain.services.totp_service import generate_qr_base64, generate_secret, get_totp_uri, verify_totp
from src.app.infrastructure.db.models import BackupCode, User
from src.app.infrastructure.db.session import get_db

router = APIRouter(prefix='/api/2fa', tags=['2fa'])


class VerifyRequest(BaseModel):
    code: str


@router.post('/setup')
async def setup_2fa(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """POST /api/2fa/setup - 2FA 설정 시작 (QR 코드 생성)."""
    stmt = select(User).where(User.username == user['username'])
    result = await db.execute(stmt)
    db_user = result.scalar_one_or_none()

    if not db_user:
        return {'success': False, 'message': '사용자를 찾을 수 없습니다.'}

    if db_user.totp_enabled:
        return {'success': False, 'message': '이미 2FA가 활성화되어 있습니다.'}

    # 새 시크릿 생성 (아직 활성화하지 않음)
    secret = generate_secret()
    db_user.totp_secret = secret
    await db.flush()

    uri = get_totp_uri(secret, db_user.username)
    qr_base64 = generate_qr_base64(uri)

    return {
        'success': True,
        'secret': secret,
        'qrCode': qr_base64,
        'otpAuthUrl': uri,
    }


@router.post('/verify')
async def verify_2fa(
    body: VerifyRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """POST /api/2fa/verify - 2FA 코드 검증 후 활성화."""
    stmt = select(User).where(User.username == user['username'])
    result = await db.execute(stmt)
    db_user = result.scalar_one_or_none()

    if not db_user or not db_user.totp_secret:
        return {'success': False, 'message': '먼저 2FA 설정을 시작하세요.'}

    if not verify_totp(db_user.totp_secret, body.code):
        return {'success': False, 'message': '인증 코드가 올바르지 않습니다.'}

    # 활성화
    db_user.totp_enabled = True
    await db.flush()

    # 백업 코드 생성 (10개)
    backup_codes = []
    for _ in range(10):
        code = secrets.token_hex(4).upper()  # 8자리 16진수
        bc = BackupCode(user_id=db_user.id, code=code, used=False)
        db.add(bc)
        backup_codes.append(code)
    await db.flush()

    return {
        'success': True,
        'message': '2FA가 활성화되었습니다.',
        'backupCodes': backup_codes,
    }


@router.post('/disable')
async def disable_2fa(
    body: VerifyRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """POST /api/2fa/disable - 2FA 비활성화."""
    stmt = select(User).where(User.username == user['username'])
    result = await db.execute(stmt)
    db_user = result.scalar_one_or_none()

    if not db_user or not db_user.totp_enabled:
        return {'success': False, 'message': '2FA가 활성화되어 있지 않습니다.'}

    if not verify_totp(db_user.totp_secret, body.code):
        return {'success': False, 'message': '인증 코드가 올바르지 않습니다.'}

    # 비활성화
    db_user.totp_enabled = False
    db_user.totp_secret = None
    await db.flush()

    # 백업 코드 삭제
    stmt_bc = select(BackupCode).where(BackupCode.user_id == db_user.id)
    bc_result = await db.execute(stmt_bc)
    for bc in bc_result.scalars().all():
        await db.delete(bc)
    await db.flush()

    return {'success': True, 'message': '2FA가 비활성화되었습니다.'}
