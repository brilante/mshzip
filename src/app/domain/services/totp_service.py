"""TOTP 2FA 서비스 - pyotp 기반."""

import base64
import io

import pyotp

from src.app.core.config import get_settings


def generate_secret() -> str:
    """새 TOTP 시크릿 생성."""
    return pyotp.random_base32()


def get_totp_uri(secret: str, username: str) -> str:
    """QR 코드용 TOTP URI 생성."""
    settings = get_settings()
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=username, issuer_name=settings.APP_NAME)


def verify_totp(secret: str | None, code: str) -> bool:
    """TOTP 코드 검증 (±1 타임스텝 허용)."""
    if not secret or not code:
        return False
    try:
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)
    except Exception:
        return False


def generate_qr_base64(uri: str) -> str:
    """TOTP URI를 QR 코드 Base64 이미지로 변환."""
    try:
        import qrcode
        qr = qrcode.make(uri)
        buf = io.BytesIO()
        qr.save(buf, format='PNG')
        return base64.b64encode(buf.getvalue()).decode()
    except ImportError:
        # qrcode 미설치 시 URI만 반환
        return ''
