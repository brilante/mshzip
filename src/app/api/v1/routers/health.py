"""헬스체크 API."""

from fastapi import APIRouter

from src.app.core.config import get_settings

router = APIRouter(tags=['health'])


@router.get('/api/health')
async def health_check() -> dict:
    """서버 상태 확인."""
    settings = get_settings()
    return {
        'status': 'ok',
        'app': settings.APP_NAME,
        'version': settings.APP_VERSION,
    }
