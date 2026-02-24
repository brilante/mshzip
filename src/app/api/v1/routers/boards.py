"""
게시판 API 라우터
"""
import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path

from src.app.infrastructure.db.session import get_db
from src.app.infrastructure.db.models import (
  User, Board, BoardPost, BoardFile, AdminUser,
)
from src.app.api.v1.middleware.auth import require_auth, require_admin

router = APIRouter(prefix='/api/boards', tags=['boards'])

UPLOAD_DIR = Path('save/board-files')
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_FILES = 5


async def _is_admin(db: AsyncSession, username: str) -> bool:
  """관리자 여부 확인"""
  result = await db.execute(
    select(AdminUser).where(AdminUser.user_id == username, AdminUser.is_active == 1)
  )
  return result.scalar_one_or_none() is not None


# ─── 스키마 ─────────────────────────────────────────

class BoardCreateRequest(BaseModel):
  board_key: str
  name: str
  description: str | None = None
  is_public: bool = True
  allow_file_upload: bool = False


class BoardUpdateRequest(BaseModel):
  name: str | None = None
  description: str | None = None
  is_public: bool | None = None
  allow_file_upload: bool | None = None


class PostCreateRequest(BaseModel):
  title: str
  content: str
  is_notice: bool = False
  is_pinned: bool = False


class PostUpdateRequest(BaseModel):
  title: str | None = None
  content: str | None = None


# ─── 게시판 관리 ────────────────────────────────────

@router.get('/')
async def list_boards(
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """전체 게시판 목록 (관리자)"""
  result = await db.execute(select(Board).order_by(Board.created_at.desc()))
  boards = result.scalars().all()
  return {
    'success': True,
    'data': {'boards': [_board_to_dict(b) for b in boards]},
    'error': None,
  }


@router.get('/public')
async def list_public_boards(db: AsyncSession = Depends(get_db)):
  """공개 게시판 목록"""
  result = await db.execute(
    select(Board).where(Board.is_public == True).order_by(Board.created_at.desc())
  )
  boards = result.scalars().all()
  return {
    'success': True,
    'data': {'boards': [_board_to_dict(b) for b in boards]},
    'error': None,
  }


@router.get('/{board_key}')
async def get_board(
  board_key: str,
  db: AsyncSession = Depends(get_db),
):
  """게시판 상세"""
  board = await _get_board_by_key(db, board_key)
  if not board:
    raise HTTPException(status_code=404, detail='게시판 없음')

  # 게시글 수 통계
  count_result = await db.execute(
    select(func.count()).select_from(BoardPost).where(BoardPost.board_id == board.id)
  )
  post_count = count_result.scalar() or 0

  data = _board_to_dict(board)
  data['post_count'] = post_count
  return {'success': True, 'data': {'board': data}, 'error': None}


@router.post('/')
async def create_board(
  body: BoardCreateRequest,
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """게시판 생성"""
  if not re.match(r'^[a-z0-9-]+$', body.board_key):
    raise HTTPException(status_code=400, detail='board_key 형식: 영소문자, 숫자, 하이픈만')

  existing = await _get_board_by_key(db, body.board_key)
  if existing:
    raise HTTPException(status_code=409, detail='이미 존재하는 board_key')

  board = Board(
    board_key=body.board_key,
    name=body.name,
    description=body.description,
    is_public=body.is_public,
    allow_file_upload=body.allow_file_upload,
  )
  db.add(board)
  await db.flush()
  return {'success': True, 'data': {'board': _board_to_dict(board)}, 'error': None}


@router.put('/{board_id}')
async def update_board(
  board_id: int,
  body: BoardUpdateRequest,
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """게시판 수정"""
  board = await db.get(Board, board_id)
  if not board:
    raise HTTPException(status_code=404, detail='게시판 없음')

  if body.name is not None:
    board.name = body.name
  if body.description is not None:
    board.description = body.description
  if body.is_public is not None:
    board.is_public = body.is_public
  if body.allow_file_upload is not None:
    board.allow_file_upload = body.allow_file_upload

  await db.flush()
  return {'success': True, 'data': {'board': _board_to_dict(board)}, 'error': None}


@router.delete('/{board_id}')
async def delete_board(
  board_id: int,
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """게시판 삭제"""
  board = await db.get(Board, board_id)
  if not board:
    raise HTTPException(status_code=404, detail='게시판 없음')
  await db.delete(board)
  await db.flush()
  return {'success': True, 'data': {'deleted': True}, 'error': None}


@router.patch('/{board_id}/toggle')
async def toggle_board(
  board_id: int,
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """공개/비공개 토글"""
  board = await db.get(Board, board_id)
  if not board:
    raise HTTPException(status_code=404, detail='게시판 없음')
  board.is_public = not board.is_public
  await db.flush()
  return {'success': True, 'data': {'is_public': board.is_public}, 'error': None}


# ─── 게시글 API ─────────────────────────────────────

@router.get('/{board_key}/posts')
async def list_posts(
  board_key: str,
  page: int = Query(1, ge=1),
  limit: int = Query(20, ge=1, le=100),
  search: str | None = None,
  search_type: str = 'title',
  db: AsyncSession = Depends(get_db),
):
  """게시글 목록 (페이지네이션, 검색)"""
  board = await _get_board_by_key(db, board_key)
  if not board:
    raise HTTPException(status_code=404, detail='게시판 없음')

  query = select(BoardPost).where(BoardPost.board_id == board.id)
  if search:
    keyword = f'%{search}%'
    if search_type == 'content':
      query = query.where(BoardPost.content.ilike(keyword))
    else:
      query = query.where(BoardPost.title.ilike(keyword))

  # 총 게시글 수
  count_q = select(func.count()).select_from(BoardPost).where(BoardPost.board_id == board.id)
  if search:
    if search_type == 'content':
      count_q = count_q.where(BoardPost.content.ilike(keyword))
    else:
      count_q = count_q.where(BoardPost.title.ilike(keyword))
  total_result = await db.execute(count_q)
  total = total_result.scalar() or 0

  # 정렬: 공지 → 고정 → 최신순
  query = query.order_by(
    BoardPost.is_notice.desc(),
    BoardPost.is_pinned.desc(),
    BoardPost.created_at.desc(),
  )
  offset = (page - 1) * limit
  query = query.offset(offset).limit(limit)

  result = await db.execute(query)
  posts = result.scalars().all()

  return {
    'success': True,
    'data': {
      'posts': [_post_to_dict(p) for p in posts],
      'total': total,
      'page': page,
      'limit': limit,
      'totalPages': (total + limit - 1) // limit,
    },
    'error': None,
  }


@router.get('/{board_key}/posts/{post_id}')
async def get_post(
  board_key: str,
  post_id: int,
  db: AsyncSession = Depends(get_db),
):
  """게시글 상세"""
  board = await _get_board_by_key(db, board_key)
  if not board:
    raise HTTPException(status_code=404, detail='게시판 없음')

  post = await db.get(BoardPost, post_id)
  if not post or post.board_id != board.id:
    raise HTTPException(status_code=404, detail='게시글 없음')

  # 조회수 증가
  post.view_count = (post.view_count or 0) + 1
  await db.flush()

  return {'success': True, 'data': {'post': _post_to_dict(post)}, 'error': None}


@router.post('/{board_key}/posts')
async def create_post(
  board_key: str,
  body: PostCreateRequest,
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """게시글 작성"""
  board = await _get_board_by_key(db, board_key)
  if not board:
    raise HTTPException(status_code=404, detail='게시판 없음')

  is_admin = await _is_admin(db, user.username)
  post = BoardPost(
    board_id=board.id,
    author_id=user.username,
    title=body.title,
    content=body.content,
    is_notice=body.is_notice if is_admin else False,
    is_pinned=body.is_pinned if is_admin else False,
  )
  db.add(post)
  await db.flush()
  return {'success': True, 'data': {'post': _post_to_dict(post)}, 'error': None}


@router.put('/{board_key}/posts/{post_id}')
async def update_post(
  board_key: str,
  post_id: int,
  body: PostUpdateRequest,
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """게시글 수정"""
  post = await db.get(BoardPost, post_id)
  if not post:
    raise HTTPException(status_code=404, detail='게시글 없음')
  if post.author_id != user.username and not await _is_admin(db, user.username):
    raise HTTPException(status_code=403, detail='권한 없음')

  if body.title is not None:
    post.title = body.title
  if body.content is not None:
    post.content = body.content
  post.updated_at = datetime.utcnow()
  await db.flush()
  return {'success': True, 'data': {'post': _post_to_dict(post)}, 'error': None}


@router.delete('/{board_key}/posts/{post_id}')
async def delete_post(
  board_key: str,
  post_id: int,
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """게시글 삭제"""
  post = await db.get(BoardPost, post_id)
  if not post:
    raise HTTPException(status_code=404, detail='게시글 없음')
  if post.author_id != user.username and not await _is_admin(db, user.username):
    raise HTTPException(status_code=403, detail='권한 없음')

  await db.delete(post)
  await db.flush()
  return {'success': True, 'data': {'deleted': True}, 'error': None}


@router.patch('/{board_key}/posts/{post_id}/pin')
async def toggle_pin(
  board_key: str,
  post_id: int,
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """상단 고정 토글"""
  post = await db.get(BoardPost, post_id)
  if not post:
    raise HTTPException(status_code=404, detail='게시글 없음')
  post.is_pinned = not post.is_pinned
  await db.flush()
  return {'success': True, 'data': {'is_pinned': post.is_pinned}, 'error': None}


@router.patch('/{board_key}/posts/{post_id}/notice')
async def toggle_notice(
  board_key: str,
  post_id: int,
  user: User = Depends(require_admin),
  db: AsyncSession = Depends(get_db),
):
  """공지 토글"""
  post = await db.get(BoardPost, post_id)
  if not post:
    raise HTTPException(status_code=404, detail='게시글 없음')
  post.is_notice = not post.is_notice
  await db.flush()
  return {'success': True, 'data': {'is_notice': post.is_notice}, 'error': None}


# ─── 파일 첨부 API ──────────────────────────────────

@router.get('/{board_key}/posts/{post_id}/files')
async def list_post_files(
  board_key: str,
  post_id: int,
  db: AsyncSession = Depends(get_db),
):
  """게시글 첨부파일 목록"""
  result = await db.execute(
    select(BoardFile).where(BoardFile.post_id == post_id).order_by(BoardFile.created_at)
  )
  files = result.scalars().all()
  return {
    'success': True,
    'data': {
      'files': [_file_to_dict(f) for f in files]
    },
    'error': None,
  }


@router.get('/files/{file_id}')
async def download_file(
  file_id: int,
  db: AsyncSession = Depends(get_db),
):
  """파일 다운로드"""
  bf = await db.get(BoardFile, file_id)
  if not bf:
    raise HTTPException(status_code=404, detail='파일 없음')

  filepath = Path(bf.file_path)
  if not filepath.exists():
    raise HTTPException(status_code=404, detail='파일 없음')

  bf.download_count = (bf.download_count or 0) + 1
  await db.flush()

  return FileResponse(
    str(filepath),
    filename=bf.original_name,
    media_type=bf.mime_type or 'application/octet-stream',
  )


@router.delete('/files/{file_id}')
async def delete_file(
  file_id: int,
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """파일 삭제"""
  bf = await db.get(BoardFile, file_id)
  if not bf:
    raise HTTPException(status_code=404, detail='파일 없음')

  # 권한 확인
  post = await db.get(BoardPost, bf.post_id)
  if post and post.author_id != user.username and not await _is_admin(db, user.username):
    raise HTTPException(status_code=403, detail='권한 없음')

  # 실제 파일 삭제
  filepath = Path(bf.file_path)
  if filepath.exists():
    filepath.unlink()

  await db.delete(bf)
  await db.flush()
  return {'success': True, 'data': {'deleted': True}, 'error': None}


# ─── 유틸리티 ───────────────────────────────────────

async def _get_board_by_key(db: AsyncSession, board_key: str):
  result = await db.execute(
    select(Board).where(Board.board_key == board_key)
  )
  return result.scalar_one_or_none()


def _board_to_dict(b) -> dict:
  return {
    'id': b.id,
    'board_key': b.board_key,
    'name': b.name,
    'description': b.description,
    'is_public': b.is_public,
    'allow_file_upload': b.allow_file_upload,
    'created_at': b.created_at.isoformat() if b.created_at else None,
  }


def _post_to_dict(p) -> dict:
  return {
    'id': p.id,
    'board_id': p.board_id,
    'author_id': p.author_id,
    'title': p.title,
    'content': p.content,
    'is_notice': p.is_notice,
    'is_pinned': p.is_pinned,
    'view_count': p.view_count or 0,
    'created_at': p.created_at.isoformat() if p.created_at else None,
    'updated_at': p.updated_at.isoformat() if p.updated_at else None,
  }


def _file_to_dict(f) -> dict:
  return {
    'id': f.id,
    'post_id': f.post_id,
    'original_name': f.original_name,
    'file_size': f.file_size,
    'mime_type': f.mime_type,
    'download_count': f.download_count or 0,
    'uploaded_at': f.uploaded_at.isoformat() if f.uploaded_at else None,
  }
