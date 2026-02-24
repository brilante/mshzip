"""
Google Drive 연동 API 라우터
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.infrastructure.db.session import get_db
from src.app.infrastructure.db.models import User, UserDriveSetting
from src.app.api.v1.middleware.auth import require_auth
from src.app.core.config import get_settings

router = APIRouter(prefix='/api/drive', tags=['drive'])


# ─── 스키마 ─────────────────────────────────────────

class UserDriveSettingRequest(BaseModel):
  enabled: bool | None = None
  path: str | None = None


# ─── 라우트 ─────────────────────────────────────────

@router.get('/auth')
async def drive_auth(user: User = Depends(require_auth)):
  """OAuth 인증 시작"""
  settings = get_settings()
  if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
    raise HTTPException(status_code=500, detail='Google OAuth 미설정')

  # OAuth URL 생성
  redirect_uri = f'{settings.CORS_ORIGINS[0]}/api/drive/callback'
  scope = 'https://www.googleapis.com/auth/drive.file'
  auth_url = (
    f'https://accounts.google.com/o/oauth2/v2/auth'
    f'?client_id={settings.GOOGLE_CLIENT_ID}'
    f'&redirect_uri={redirect_uri}'
    f'&response_type=code'
    f'&scope={scope}'
    f'&access_type=offline'
    f'&state={user.username}'
  )
  return {'success': True, 'data': {'authUrl': auth_url}, 'error': None}


@router.get('/callback')
async def drive_callback(
  code: str = Query(...),
  state: str = Query(''),
  db: AsyncSession = Depends(get_db),
):
  """OAuth 콜백"""
  import httpx
  settings = get_settings()
  redirect_uri = f'{settings.CORS_ORIGINS[0]}/api/drive/callback'

  # 토큰 교환
  async with httpx.AsyncClient() as client:
    resp = await client.post(
      'https://oauth2.googleapis.com/token',
      data={
        'code': code,
        'client_id': settings.GOOGLE_CLIENT_ID,
        'client_secret': settings.GOOGLE_CLIENT_SECRET,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code',
      },
    )
    if resp.status_code != 200:
      raise HTTPException(status_code=400, detail='토큰 교환 실패')
    token_data = resp.json()

  # 드라이브 설정 저장/갱신
  user_id = state
  result = await db.execute(
    select(UserDriveSetting).where(UserDriveSetting.user_id == user_id)
  )
  ds = result.scalar_one_or_none()
  if not ds:
    ds = UserDriveSetting(user_id=user_id)
    db.add(ds)

  ds.access_token_encrypted = token_data.get('access_token')  # TODO: 암호화 필요
  ds.refresh_token_encrypted = token_data.get('refresh_token', ds.refresh_token_encrypted)
  ds.drive_enabled = 1
  await db.flush()

  return RedirectResponse(url=f'{settings.CORS_ORIGINS[0]}/settings.html?drive=connected')


@router.get('/test-connection')
async def test_connection(
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """연결 상태 테스트"""
  ds = await _get_drive_settings(db, user.username)
  if not ds or not ds.drive_enabled:
    return {
      'success': True,
      'data': {'connected': False, 'reason': '미연결'},
      'error': None,
    }

  # Drive API 간단 호출
  import httpx
  try:
    async with httpx.AsyncClient() as client:
      resp = await client.get(
        'https://www.googleapis.com/drive/v3/about?fields=user',
        headers={'Authorization': f'Bearer {ds.access_token_encrypted}'},
      )
      if resp.status_code == 200:
        return {
          'success': True,
          'data': {'connected': True, 'user': resp.json().get('user', {})},
          'error': None,
        }
      else:
        return {
          'success': True,
          'data': {'connected': False, 'reason': '토큰 만료'},
          'error': None,
        }
  except Exception as e:
    return {
      'success': True,
      'data': {'connected': False, 'reason': str(e)},
      'error': None,
    }


@router.get('/settings')
async def get_drive_settings(
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """드라이브 설정 조회"""
  ds = await _get_drive_settings(db, user.username)
  if not ds:
    return {
      'success': True,
      'data': {
        'connected': False,
        'enabled': False,
        'path': None,
        'migratedToLocal': False,
      },
      'error': None,
    }
  return {
    'success': True,
    'data': {
      'connected': bool(ds.access_token_encrypted),
      'enabled': bool(ds.drive_enabled),
      'path': ds.drive_path,
      'migratedToLocal': bool(ds.migrated_to_local),
    },
    'error': None,
  }


@router.post('/settings')
async def update_drive_settings(
  body: UserDriveSettingRequest,
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """드라이브 설정 저장"""
  ds = await _get_drive_settings(db, user.username)
  if not ds:
    ds = UserDriveSetting(user_id=user.username)
    db.add(ds)

  if body.enabled is not None:
    ds.drive_enabled = 1 if body.enabled else 0
  if body.path is not None:
    ds.drive_path = body.path
  await db.flush()
  return {'success': True, 'data': {'updated': True}, 'error': None}


@router.post('/disconnect')
async def disconnect(
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """드라이브 연결 해제"""
  ds = await _get_drive_settings(db, user.username)
  if ds:
    ds.drive_enabled = 0
    ds.access_token_encrypted = None
    ds.refresh_token_encrypted = None
    await db.flush()
  return {'success': True, 'data': {'disconnected': True}, 'error': None}


@router.get('/mindmaps')
async def list_drive_mindmaps(
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """드라이브 마인드맵 목록"""
  ds = await _get_drive_settings(db, user.username)
  if not ds or not ds.drive_enabled:
    raise HTTPException(status_code=400, detail='드라이브 미연결')

  import httpx
  try:
    async with httpx.AsyncClient() as client:
      folder_id = ds.drive_path or 'root'
      resp = await client.get(
        'https://www.googleapis.com/drive/v3/files',
        params={
          'q': f"'{folder_id}' in parents and mimeType='application/zip'",
          'fields': 'files(id,name,modifiedTime,size)',
          'orderBy': 'modifiedTime desc',
        },
        headers={'Authorization': f'Bearer {ds.access_token_encrypted}'},
      )
      if resp.status_code != 200:
        raise HTTPException(status_code=400, detail='드라이브 조회 실패')
      files = resp.json().get('files', [])
      return {
        'success': True,
        'data': {'mindmaps': files},
        'error': None,
      }
  except httpx.HTTPError as e:
    raise HTTPException(status_code=500, detail=str(e))


@router.delete('/mindmap/{name}')
async def delete_drive_mindmap(
  name: str,
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """드라이브 마인드맵 삭제"""
  # Path Traversal 방지
  import re
  if re.search(r'\.\.', name):
    raise HTTPException(status_code=400, detail='잘못된 이름')

  ds = await _get_drive_settings(db, user.username)
  if not ds or not ds.drive_enabled:
    raise HTTPException(status_code=400, detail='드라이브 미연결')

  # TODO: Drive API로 파일 삭제 구현
  return {'success': True, 'data': {'deleted': True}, 'error': None}


# ─── 유틸리티 ───────────────────────────────────────

async def _get_drive_settings(db: AsyncSession, user_id: str):
  result = await db.execute(
    select(UserDriveSetting).where(UserDriveSetting.user_id == user_id)
  )
  return result.scalar_one_or_none()
