"""UserIdEncoder - 사용자 폴더명 인코딩/탐색.

원본 MyMind3의 userIdEncoder.js를 Python으로 포팅.
3가지 버전의 인코딩 지원 (V3 bcrypt, V1 HMAC-SHA256, Legacy Base64).
"""

import base64
import hashlib
import hmac
import os
from pathlib import Path

import bcrypt

from src.app.core.config import get_settings
from src.app.core.logging import get_logger

logger = get_logger(__name__)

FOLDER_NAME_LENGTH = 100
BCRYPT_COST = 10

# bcrypt 자체 Base64 알파벳 (OpenBSD 형식, 표준 Base64와 다름)
_BCRYPT_B64 = './ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'


def _bcrypt_b64_encode(data: bytes) -> str:
    """16바이트 → bcrypt Base64 (22자).

    OpenBSD bcrypt의 자체 Base64 인코딩.
    표준 Base64와 알파벳/비트 순서가 다름.
    """
    result = []
    off = 0
    length = len(data)

    while off < length:
        c1 = data[off]; off += 1
        result.append(_BCRYPT_B64[(c1 >> 2) & 0x3f])
        c1 = (c1 & 0x03) << 4
        if off >= length:
            result.append(_BCRYPT_B64[c1 & 0x3f])
            break
        c2 = data[off]; off += 1
        c1 |= (c2 >> 4) & 0x0f
        result.append(_BCRYPT_B64[c1 & 0x3f])
        c1 = (c2 & 0x0f) << 2
        if off >= length:
            result.append(_BCRYPT_B64[c1 & 0x3f])
            break
        c2 = data[off]; off += 1
        c1 |= (c2 >> 6) & 0x03
        result.append(_BCRYPT_B64[c1 & 0x3f])
        result.append(_BCRYPT_B64[c2 & 0x3f])

    return ''.join(result)


def _get_key_bytes() -> bytes | None:
    """ENCRYPTION_KEY hex → bytes. 미설정 시 None."""
    settings = get_settings()
    key = settings.ENCRYPTION_KEY
    if not key:
        return None
    return bytes.fromhex(key)


# ── 인코딩 ──

def encode_v3(user_id: str) -> str:
    """V3 bcrypt + Base64 인코딩 (100자 고정)."""
    key_bytes = _get_key_bytes()
    if key_bytes is None:
        raise ValueError('ENCRYPTION_KEY 환경변수가 필요합니다.')

    # 1. Salt 생성: SHA256(key) → 앞 16바이트 → bcrypt Base64 22자
    salt_raw = hashlib.sha256(key_bytes).digest()[:16]
    salt_b64 = _bcrypt_b64_encode(salt_raw)
    salt = f'$2b${BCRYPT_COST:02d}${salt_b64}'.encode()

    # 2. bcrypt 해싱
    hashed = bcrypt.hashpw(user_id.encode(), salt)

    # 3. URL-safe Base64 인코딩
    b64 = base64.b64encode(hashed).decode('ascii')
    b64 = b64.replace('+', '-').replace('/', '_').rstrip('=')

    # 4. 100자로 패딩
    if len(b64) >= FOLDER_NAME_LENGTH:
        return b64[:FOLDER_NAME_LENGTH]

    padding = hmac.new(
        key_bytes,
        (user_id + hashed.decode()).encode(),
        hashlib.sha256,
    ).hexdigest()
    padding = padding.replace('+', '').replace('/', '').replace('=', '')
    return (b64 + padding)[:FOLDER_NAME_LENGTH]


def encode_v1(user_id: str) -> str:
    """V1 HMAC-SHA256 인코딩 (32자)."""
    key_bytes = _get_key_bytes()
    h = hmac.new(key_bytes, user_id.encode(), hashlib.sha256).hexdigest()
    return h[:32]


def encode_legacy(user_id: str) -> str:
    """Legacy Base64 인코딩."""
    return base64.b64encode(user_id.encode()).decode('ascii')


def encode(user_id: str) -> str:
    """현재 버전(V3) 인코딩."""
    return encode_v3(user_id)


# ── 폴더 탐색 ──

def find_user_folder(user_id: str, save_dir: str) -> dict | None:
    """사용자 폴더 탐색 (우선순위 기반).

    Returns:
        {'folder': str, 'version': str} 또는 None
    """
    save_path = Path(save_dir)
    if not save_path.exists():
        return None

    # 1. .userid 마커 파일 검색 (최우선 - JS/Python 호환)
    try:
        for entry in save_path.iterdir():
            if not entry.is_dir():
                continue
            marker = entry / '.userid'
            if marker.is_file():
                stored = marker.read_text(encoding='utf-8').strip()
                if stored == user_id:
                    return {'folder': entry.name, 'version': 'marker'}
    except OSError:
        pass

    # 2. V3 폴더 확인
    try:
        v3_name = encode_v3(user_id)
        if (save_path / v3_name).is_dir():
            _ensure_user_marker(save_path / v3_name, user_id)
            return {'folder': v3_name, 'version': 'v3'}
    except (ValueError, Exception):
        pass

    # 3. V1 폴더 확인
    try:
        v1_name = encode_v1(user_id)
        if (save_path / v1_name).is_dir():
            _ensure_user_marker(save_path / v1_name, user_id)
            return {'folder': v1_name, 'version': 'v1'}
    except (ValueError, Exception):
        pass

    # 4. Legacy Base64 폴더 확인
    legacy_name = encode_legacy(user_id)
    if (save_path / legacy_name).is_dir():
        _ensure_user_marker(save_path / legacy_name, user_id)
        return {'folder': legacy_name, 'version': 'legacy'}

    # 5. bcrypt 동적 매칭 (디렉토리 스캔)
    try:
        for entry in save_path.iterdir():
            if not entry.is_dir():
                continue
            name = entry.name
            # V3 길이 (100자) + bcrypt Base64 패턴 검증
            if len(name) >= 60:
                try:
                    # Base64 디코딩 시도 → bcrypt 해시 추출 → 비교
                    padded = name.replace('-', '+').replace('_', '/')
                    # 패딩 복원
                    padded += '=' * (4 - len(padded) % 4) if len(padded) % 4 else ''
                    decoded = base64.b64decode(padded[:88])  # bcrypt 해시 약 60바이트
                    if decoded.startswith(b'$2'):
                        if bcrypt.checkpw(user_id.encode(), decoded):
                            _ensure_user_marker(entry, user_id)
                            return {'folder': name, 'version': 'v3-dynamic'}
                except Exception:
                    continue
    except OSError:
        pass

    return None


def find_or_create_user_folder(user_id: str, save_dir: str) -> dict:
    """사용자 폴더 탐색 또는 V3 폴더 생성."""
    result = find_user_folder(user_id, save_dir)
    if result:
        return result

    # 신규 V3 폴더 생성
    v3_name = encode_v3(user_id)
    folder_path = Path(save_dir) / v3_name
    folder_path.mkdir(parents=True, exist_ok=True)
    _ensure_user_marker(folder_path, user_id)
    logger.info('사용자 폴더 생성', user_id=user_id, folder=v3_name)
    return {'folder': v3_name, 'version': 'v3'}


def _ensure_user_marker(folder_path: Path, user_id: str) -> None:
    """사용자 마커 파일 (.userid) 생성."""
    marker = folder_path / '.userid'
    if not marker.exists():
        try:
            marker.write_text(user_id, encoding='utf-8')
        except OSError:
            pass
