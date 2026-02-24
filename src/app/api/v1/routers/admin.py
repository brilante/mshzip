"""
관리자 API 라우터
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.infrastructure.db.session import get_db
from src.app.infrastructure.db.models import (
  User, AIModelPricing, ModelSyncLog, ErrorLog,
)
from src.app.api.v1.middleware.auth import require_admin

router = APIRouter(prefix='/api/admin', tags=['admin'])


# ─── 스키마 ─────────────────────────────────────────

class AiModelRequest(BaseModel):
  service: str
  model_id: str
  display_name: str | None = None
  is_active: bool = True


class LogResolveRequest(BaseModel):
  status: str = 'resolved'


# ─── AI 모델 관리 ───────────────────────────────────

@router.get('/ai-models')
async def list_ai_models(
  service: str | None = None,
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """AI 모델 목록"""
  query = select(AIModelPricing)
  if service:
    query = query.where(AIModelPricing.ai_service == service)
  query = query.order_by(AIModelPricing.ai_service, AIModelPricing.model_name)

  result = await db.execute(query)
  models = result.scalars().all()
  return {
    'success': True,
    'data': {
      'models': [
        {
          'id': m.id,
          'ai_service': m.ai_service,
          'model_name': m.model_name,
          'display_name': m.display_name,
          'is_active': m.is_active,
          'cost_per_1m_input': m.cost_per_1m_input,
          'cost_per_1m_output': m.cost_per_1m_output,
          'created_at': m.created_at,
        }
        for m in models
      ]
    },
    'error': None,
  }


@router.post('/ai-models')
async def create_ai_model(
  body: AiModelRequest,
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """AI 모델 등록"""
  model = AIModelPricing(
    ai_service=body.service,
    model_name=body.model_id,
    display_name=body.display_name or body.model_id,
    is_active=1 if body.is_active else 0,
  )
  db.add(model)
  await db.flush()
  return {'success': True, 'data': {'id': model.id}, 'error': None}


# ─── 에러 로그 ──────────────────────────────────────

@router.get('/logs/search')
async def search_logs(
  search: str | None = None,
  level: str | None = None,
  limit: int = Query(50, ge=1, le=500),
  offset: int = Query(0, ge=0),
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """로그 검색"""
  query = select(ErrorLog)
  if search:
    keyword = f'%{search}%'
    query = query.where(ErrorLog.message.ilike(keyword))
  if level:
    query = query.where(ErrorLog.level == level)

  # 총 수
  count_q = select(func.count()).select_from(ErrorLog)
  if search:
    count_q = count_q.where(ErrorLog.message.ilike(f'%{search}%'))
  if level:
    count_q = count_q.where(ErrorLog.level == level)
  total_result = await db.execute(count_q)
  total = total_result.scalar() or 0

  result = await db.execute(
    query.order_by(desc(ErrorLog.created_at)).offset(offset).limit(limit)
  )
  logs = result.scalars().all()

  return {
    'success': True,
    'data': {
      'logs': [
        {
          'id': l.id,
          'level': l.level,
          'message': l.message,
          'stack': l.stack,
          'source': l.source,
          'is_resolved': l.is_resolved,
          'created_at': l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
      ],
      'total': total,
    },
    'error': None,
  }


@router.get('/logs/stats')
async def log_stats(
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """로그 통계"""
  total_result = await db.execute(
    select(func.count()).select_from(ErrorLog)
  )
  total = total_result.scalar() or 0

  # 레벨별 통계
  level_result = await db.execute(
    select(ErrorLog.level, func.count())
    .group_by(ErrorLog.level)
  )
  by_level = {row[0]: row[1] for row in level_result.all()}

  return {
    'success': True,
    'data': {
      'total': total,
      'by_level': by_level,
    },
    'error': None,
  }


@router.get('/logs/{error_id}')
async def get_log(
  error_id: int,
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """로그 상세"""
  log = await db.get(ErrorLog, error_id)
  if not log:
    raise HTTPException(status_code=404, detail='로그 없음')
  return {
    'success': True,
    'data': {
      'log': {
        'id': log.id,
        'level': log.level,
        'message': log.message,
        'stack': log.stack,
        'source': log.source,
        'user_id': log.user_id,
        'request_path': log.request_path,
        'is_resolved': log.is_resolved,
        'created_at': log.created_at.isoformat() if log.created_at else None,
      }
    },
    'error': None,
  }


@router.patch('/logs/{error_id}/resolve')
async def resolve_log(
  error_id: int,
  body: LogResolveRequest,
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """로그 상태 변경"""
  log = await db.get(ErrorLog, error_id)
  if not log:
    raise HTTPException(status_code=404, detail='로그 없음')
  log.is_resolved = 1 if body.status == 'resolved' else 0
  await db.flush()
  return {'success': True, 'data': {'resolved': True}, 'error': None}


@router.delete('/logs/delete')
async def delete_logs(
  before: str | None = Query(None),
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """로그 삭제"""
  from sqlalchemy import delete as sql_delete
  query = sql_delete(ErrorLog)
  if before:
    query = query.where(ErrorLog.created_at < before)
  result = await db.execute(query)
  await db.flush()
  return {'success': True, 'data': {'deleted': result.rowcount}, 'error': None}


# ─── 모델 동기화 ────────────────────────────────────

@router.get('/model-sync/logs')
async def sync_logs(
  limit: int = Query(50, ge=1, le=200),
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """동기화 로그"""
  result = await db.execute(
    select(ModelSyncLog)
    .order_by(desc(ModelSyncLog.created_at))
    .limit(limit)
  )
  logs = result.scalars().all()
  return {
    'success': True,
    'data': {
      'logs': [
        {
          'id': l.id,
          'ai_service': l.ai_service,
          'api_status': l.api_status,
          'models_found': l.models_found,
          'models_added': l.models_added,
          'sync_date': l.sync_date,
          'created_at': l.created_at,
        }
        for l in logs
      ]
    },
    'error': None,
  }
