"""
백업 관리 API 라우터
"""
import zipfile
import shutil
from datetime import datetime
from pathlib import Path
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.infrastructure.db.session import get_db
from src.app.infrastructure.db.models import User, UserBackupSchedule, BackupHistory
from src.app.api.v1.middleware.auth import require_auth
from src.app.infrastructure.storage.local_provider import encode_username

router = APIRouter(prefix='/api/backup', tags=['backup'])

SAVE_DIR = Path('save')
BACKUP_DIR = Path('save/backups')

# 동시 백업 방지
_backup_in_progress: dict[str, bool] = {}


class MaxBackupsRequest(BaseModel):
  max_backups: int


# ─── 라우트 ─────────────────────────────────────────

@router.get('/schedule')
async def get_schedule(
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """백업 스케줄 조회"""
  result = await db.execute(
    select(UserBackupSchedule).where(UserBackupSchedule.user_id == user.username)
  )
  schedule = result.scalar_one_or_none()

  if not schedule:
    return {
      'success': True,
      'data': {
        'firstLogin': None,
        'nextBackup': None,
        'lastBackup': None,
        'maxBackups': 10,
        'isDriveUser': False,
      },
      'error': None,
    }

  return {
    'success': True,
    'data': {
      'firstLogin': schedule.first_login.isoformat() if schedule.first_login else None,
      'nextBackup': schedule.next_backup.isoformat() if schedule.next_backup else None,
      'lastBackup': schedule.last_backup.isoformat() if schedule.last_backup else None,
      'maxBackups': schedule.max_backups or 10,
      'isDriveUser': schedule.is_drive_user,
    },
    'error': None,
  }


@router.get('/status')
async def get_status(
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """백업 상태 확인"""
  count_result = await db.execute(
    select(func.count()).select_from(BackupHistory)
    .where(BackupHistory.user_id == user.username, BackupHistory.deleted_at == None)
  )
  count = count_result.scalar() or 0

  return {
    'success': True,
    'data': {
      'count': count,
      'exceeds_limit': count > 30,
      'in_progress': _backup_in_progress.get(user.username, False),
    },
    'error': None,
  }


@router.post('/run')
async def run_backup(
  confirmed: bool = Query(False),
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """수동 백업 실행"""
  if _backup_in_progress.get(user.username):
    raise HTTPException(status_code=409, detail='백업 진행 중')

  # 30개 초과 확인
  count_result = await db.execute(
    select(func.count()).select_from(BackupHistory)
    .where(BackupHistory.user_id == user.username, BackupHistory.deleted_at == None)
  )
  count = count_result.scalar() or 0

  if count >= 30 and not confirmed:
    return {
      'success': True,
      'data': {'needsConfirmation': True, 'currentCount': count},
      'error': None,
    }

  try:
    _backup_in_progress[user.username] = True

    # 사용자 디렉토리 zip 생성
    encoded = encode_username(user.username)
    user_dir = SAVE_DIR / encoded
    if not user_dir.exists():
      raise HTTPException(status_code=400, detail='백업할 데이터 없음')

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    backup_name = f'{encoded}_{timestamp}.zip'
    backup_path = BACKUP_DIR / backup_name

    with zipfile.ZipFile(str(backup_path), 'w', zipfile.ZIP_DEFLATED) as zf:
      for file_path in user_dir.rglob('*'):
        if file_path.is_file():
          arcname = file_path.relative_to(user_dir)
          zf.write(str(file_path), str(arcname))

    file_size = backup_path.stat().st_size

    # DB 기록
    history = BackupHistory(
      user_id=user.username,
      backup_path=str(backup_path),
      backup_size=file_size,
      status='completed',
      backup_location='local',
    )
    db.add(history)

    # 스케줄 갱신
    sched_result = await db.execute(
      select(UserBackupSchedule).where(UserBackupSchedule.user_id == user.username)
    )
    schedule = sched_result.scalar_one_or_none()
    if schedule:
      schedule.last_backup = datetime.utcnow()
    else:
      schedule = UserBackupSchedule(
        user_id=user.username,
        last_backup=datetime.utcnow(),
        max_backups=10,
      )
      db.add(schedule)

    await db.flush()
    return {
      'success': True,
      'data': {
        'backup_id': history.id,
        'backup_path': backup_name,
        'backup_size': file_size,
      },
      'error': None,
    }
  finally:
    _backup_in_progress.pop(user.username, None)


@router.get('/history')
async def get_history(
  limit: int = Query(20, ge=1, le=100),
  offset: int = Query(0, ge=0),
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """백업 히스토리 조회"""
  result = await db.execute(
    select(BackupHistory)
    .where(BackupHistory.user_id == user.username, BackupHistory.deleted_at == None)
    .order_by(BackupHistory.created_at.desc())
    .offset(offset).limit(limit)
  )
  backups = result.scalars().all()

  count_result = await db.execute(
    select(func.count()).select_from(BackupHistory)
    .where(BackupHistory.user_id == user.username, BackupHistory.deleted_at == None)
  )
  total = count_result.scalar() or 0

  return {
    'success': True,
    'data': {
      'backups': [
        {
          'id': b.id,
          'backup_location': b.backup_location,
          'backup_path': b.backup_path,
          'backup_size': b.backup_size,
          'created_at': b.created_at.isoformat() if b.created_at else None,
        }
        for b in backups
      ],
      'total': total,
    },
    'error': None,
  }


@router.post('/restore/{backup_id}')
async def restore_backup(
  backup_id: int,
  target_folder: str = Query(''),
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """백업에서 복원"""
  backup = await db.get(BackupHistory, backup_id)
  if not backup or backup.user_id != user.username:
    raise HTTPException(status_code=404, detail='백업 없음')

  backup_path = Path(backup.backup_path)
  if not backup_path.exists():
    raise HTTPException(status_code=404, detail='백업 파일 없음')

  # 복원 경로 검증
  encoded = encode_username(user.username)
  user_dir = SAVE_DIR / encoded
  if target_folder:
    import re
    if re.search(r'\.\.', target_folder):
      raise HTTPException(status_code=400, detail='잘못된 경로')
    restore_dir = user_dir / target_folder
  else:
    restore_dir = user_dir

  restore_dir.mkdir(parents=True, exist_ok=True)

  with zipfile.ZipFile(str(backup_path), 'r') as zf:
    zf.extractall(str(restore_dir))

  return {'success': True, 'data': {'restored': True}, 'error': None}


@router.delete('/{backup_id}')
async def delete_backup(
  backup_id: int,
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """백업 삭제 (소프트 삭제)"""
  backup = await db.get(BackupHistory, backup_id)
  if not backup or backup.user_id != user.username:
    raise HTTPException(status_code=404, detail='백업 없음')

  # 실제 파일 삭제
  backup_path = Path(backup.backup_path)
  if backup_path.exists():
    backup_path.unlink()

  backup.deleted_at = datetime.utcnow()
  await db.flush()
  return {'success': True, 'data': {'deleted': True}, 'error': None}


@router.put('/settings/max-backups')
async def set_max_backups(
  body: MaxBackupsRequest,
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """최대 백업 수 설정"""
  if body.max_backups < 1 or body.max_backups > 30:
    raise HTTPException(status_code=400, detail='1~30 사이 값 필요')

  result = await db.execute(
    select(UserBackupSchedule).where(UserBackupSchedule.user_id == user.username)
  )
  schedule = result.scalar_one_or_none()
  if not schedule:
    schedule = UserBackupSchedule(user_id=user.username, max_backups=body.max_backups)
    db.add(schedule)
  else:
    schedule.max_backups = body.max_backups

  await db.flush()
  return {'success': True, 'data': {'max_backups': body.max_backups}, 'error': None}
