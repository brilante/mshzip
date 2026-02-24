"""
AI 채팅 API 라우터 (SSE 스트리밍)
"""
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from src.app.infrastructure.db.models import User
from src.app.api.v1.middleware.auth import require_auth
from src.app.infrastructure.adapters.factory import get_adapter, get_available_services

router = APIRouter(prefix='/api/ai', tags=['ai'])


# ─── 스키마 ─────────────────────────────────────────

class ChatRequest(BaseModel):
  service: str = 'gpt'
  model: str | None = None
  messages: list[dict]
  stream: bool = True
  temperature: float | None = None
  maxTokens: int | None = None


# ─── 라우트 ─────────────────────────────────────────

@router.post('/chat')
async def chat(
  body: ChatRequest,
  user: User = Depends(require_auth),
):
  """AI 채팅 (스트리밍/비스트리밍)"""
  try:
    adapter = get_adapter(body.service)
  except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e))

  options = {}
  if body.model:
    options['model'] = body.model
  if body.temperature is not None:
    options['temperature'] = body.temperature
  if body.maxTokens is not None:
    options['maxTokens'] = body.maxTokens

  if body.stream:
    # SSE 스트리밍
    async def event_generator():
      try:
        async for chunk in adapter.stream(body.messages, options):
          yield {'data': json.dumps({'content': chunk}, ensure_ascii=False)}
        yield {'data': json.dumps({'done': True}, ensure_ascii=False)}
      except Exception as e:
        yield {'data': json.dumps({'error': str(e)}, ensure_ascii=False)}

    return EventSourceResponse(event_generator())
  else:
    # 비스트리밍
    try:
      content = await adapter.chat(body.messages, options)
      return {
        'success': True,
        'data': {'content': content, 'service': body.service, 'model': body.model},
        'error': None,
      }
    except Exception as e:
      raise HTTPException(status_code=500, detail=str(e))


@router.get('/models')
async def get_models(
  service: str = 'gpt',
  user: User = Depends(require_auth),
):
  """AI 모델 목록 조회"""
  try:
    adapter = get_adapter(service)
    models = await adapter.get_models()
    return {'success': True, 'data': {'models': models, 'service': service}, 'error': None}
  except ValueError as e:
    raise HTTPException(status_code=400, detail=str(e))
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))


@router.get('/services')
async def get_services():
  """사용 가능한 AI 서비스 목록"""
  return {
    'success': True,
    'data': {'services': get_available_services()},
    'error': None,
  }
