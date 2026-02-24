"""
도구 허브 API 라우터
"""
import re
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.infrastructure.db.session import get_db
from src.app.infrastructure.db.models import ToolCategory, Tool, ToolQA, User
from src.app.api.v1.middleware.auth import require_auth, require_admin

router = APIRouter(prefix='/api/tools', tags=['tools'])


# ─── 스키마 ─────────────────────────────────────────

class QARequest(BaseModel):
  question: str
  email: str


class ToolStatusRequest(BaseModel):
  is_active: bool


class ToolOrderRequest(BaseModel):
  sort_order: int


class BulkStatusRequest(BaseModel):
  tool_ids: list[int]
  is_active: bool


# ─── 공개 API ───────────────────────────────────────

@router.get('/')
async def get_tools(db: AsyncSession = Depends(get_db)):
  """모든 도구를 카테고리별로 그룹화"""
  cats_result = await db.execute(
    select(ToolCategory).order_by(ToolCategory.sort_order)
  )
  categories = cats_result.scalars().all()

  result = []
  total_count = 0
  for cat in categories:
    tools_result = await db.execute(
      select(Tool)
      .where(Tool.category_id == cat.id, Tool.is_active == True)
      .order_by(Tool.sort_order)
    )
    tools = tools_result.scalars().all()
    total_count += len(tools)
    result.append({
      'category': {
        'id': cat.id,
        'name': cat.name,
        'description': cat.description,
        'icon': cat.icon,
      },
      'tools': [_tool_to_dict(t) for t in tools],
    })

  return {
    'success': True,
    'data': {
      'categories': result,
      'totalCount': total_count,
      'categoryCount': len(categories),
    },
    'error': None,
  }


@router.get('/categories')
async def get_categories(db: AsyncSession = Depends(get_db)):
  """카테고리 목록"""
  result = await db.execute(
    select(ToolCategory).order_by(ToolCategory.sort_order)
  )
  cats = result.scalars().all()
  return {
    'success': True,
    'data': {
      'categories': [
        {'id': c.id, 'name': c.name, 'description': c.description, 'icon': c.icon}
        for c in cats
      ]
    },
    'error': None,
  }


@router.get('/category/{category_id}')
async def get_tools_by_category(category_id: int, db: AsyncSession = Depends(get_db)):
  """특정 카테고리의 도구 목록"""
  result = await db.execute(
    select(Tool)
    .where(Tool.category_id == category_id, Tool.is_active == True)
    .order_by(Tool.sort_order)
  )
  tools = result.scalars().all()
  return {
    'success': True,
    'data': {'tools': [_tool_to_dict(t) for t in tools]},
    'error': None,
  }


@router.get('/search')
async def search_tools(q: str = Query(''), db: AsyncSession = Depends(get_db)):
  """도구 검색"""
  if not q.strip():
    return {'success': True, 'data': {'tools': []}, 'error': None}
  keyword = f'%{q}%'
  result = await db.execute(
    select(Tool)
    .where(Tool.is_active == True)
    .where(Tool.name.ilike(keyword) | Tool.description.ilike(keyword))
    .order_by(Tool.sort_order)
    .limit(50)
  )
  tools = result.scalars().all()
  return {
    'success': True,
    'data': {'tools': [_tool_to_dict(t) for t in tools]},
    'error': None,
  }


@router.get('/{tool_id:int}')
async def get_tool(tool_id: int, db: AsyncSession = Depends(get_db)):
  """특정 도구 정보"""
  tool = await db.get(Tool, tool_id)
  if not tool:
    raise HTTPException(status_code=404, detail='도구 없음')
  return {
    'success': True,
    'data': {'tool': _tool_to_dict(tool)},
    'error': None,
  }


@router.get('/{tool_id:int}/qa')
async def get_tool_qa(tool_id: int, db: AsyncSession = Depends(get_db)):
  """도구의 Q&A 목록"""
  result = await db.execute(
    select(ToolQA)
    .where(ToolQA.tool_id == tool_id, ToolQA.status == 'answered', ToolQA.is_public == True)
    .order_by(ToolQA.created_at.desc())
  )
  qas = result.scalars().all()
  return {
    'success': True,
    'data': {
      'qa': [
        {
          'id': qa.id,
          'question': qa.question,
          'answer': qa.answer,
          'created_at': qa.created_at.isoformat() if qa.created_at else None,
        }
        for qa in qas
      ]
    },
    'error': None,
  }


@router.post('/{tool_id:int}/qa')
async def create_qa(
  tool_id: int,
  body: QARequest,
  db: AsyncSession = Depends(get_db),
):
  """새 질문 등록"""
  # 이메일 형식 검증
  if not re.match(r'^[^@]+@[^@]+\.[^@]+$', body.email):
    raise HTTPException(status_code=400, detail='잘못된 이메일 형식')
  if len(body.question) < 5 or len(body.question) > 1000:
    raise HTTPException(status_code=400, detail='질문은 5~1000자')

  tool = await db.get(Tool, tool_id)
  if not tool:
    raise HTTPException(status_code=404, detail='도구 없음')

  qa = ToolQA(
    tool_id=tool_id,
    question=body.question,
    email=body.email,
    status='pending',
    is_public=False,
  )
  db.add(qa)
  await db.flush()
  return {'success': True, 'data': {'id': qa.id}, 'error': None}


# ─── 관리자 API ─────────────────────────────────────

@router.get('/admin/list')
async def admin_list_tools(
  category: int | None = None,
  status: str | None = None,
  search: str | None = None,
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """도구 목록 조회 (관리자)"""
  query = select(Tool)
  if category:
    query = query.where(Tool.category_id == category)
  if status == 'active':
    query = query.where(Tool.is_active == True)
  elif status == 'inactive':
    query = query.where(Tool.is_active == False)
  if search:
    keyword = f'%{search}%'
    query = query.where(Tool.name.ilike(keyword) | Tool.description.ilike(keyword))

  result = await db.execute(query.order_by(Tool.sort_order))
  tools = result.scalars().all()
  return {
    'success': True,
    'data': {'tools': [_tool_to_dict(t) for t in tools]},
    'error': None,
  }


@router.put('/admin/{tool_id}/status')
async def admin_update_status(
  tool_id: int,
  body: ToolStatusRequest,
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """도구 활성화/비활성화"""
  tool = await db.get(Tool, tool_id)
  if not tool:
    raise HTTPException(status_code=404, detail='도구 없음')
  tool.is_active = body.is_active
  await db.flush()
  return {'success': True, 'data': {'id': tool_id, 'is_active': body.is_active}, 'error': None}


@router.put('/admin/{tool_id}/order')
async def admin_update_order(
  tool_id: int,
  body: ToolOrderRequest,
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """도구 순서 변경"""
  tool = await db.get(Tool, tool_id)
  if not tool:
    raise HTTPException(status_code=404, detail='도구 없음')
  tool.sort_order = body.sort_order
  await db.flush()
  return {'success': True, 'data': {'id': tool_id, 'sort_order': body.sort_order}, 'error': None}


@router.put('/admin/bulk-status')
async def admin_bulk_status(
  body: BulkStatusRequest,
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """일괄 상태 변경"""
  updated = 0
  for tid in body.tool_ids:
    tool = await db.get(Tool, tid)
    if tool:
      tool.is_active = body.is_active
      updated += 1
  await db.flush()
  return {'success': True, 'data': {'updated': updated}, 'error': None}


# ─── 유틸리티 ───────────────────────────────────────

def _tool_to_dict(tool: Tool) -> dict:
  return {
    'id': tool.id,
    'name': tool.name,
    'description': tool.description,
    'category_id': tool.category_id,
    'icon': tool.icon,
    'url': tool.url,
    'is_active': tool.is_active,
    'sort_order': tool.sort_order,
  }
