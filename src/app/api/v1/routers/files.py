"""
파일 관리 API 라우터 (내보내기, 가져오기, 이미지 관리)
"""
import json
import hashlib
import os
import re
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.infrastructure.db.session import get_db
from src.app.infrastructure.db.models import User
from src.app.api.v1.middleware.auth import require_auth
from src.app.infrastructure.storage.local_provider import encode_username

router = APIRouter(prefix='/api/files', tags=['files'])

SAVE_DIR = Path('save')


# ─── 유틸리티 ─────────────────────────────────────

def _sanitize_filename(name: str) -> str:
  """안전한 파일명으로 변환"""
  name = re.sub(r'[<>:"/\\|?*]', '_', name)
  name = re.sub(r'\.\.', '_', name)
  return name.strip()


def _sanitize_folder_name(name: str) -> str:
  """안전한 폴더명으로 변환"""
  name = re.sub(r'[<>:"/\\|?*]', '_', name)
  name = re.sub(r'\.\.', '_', name)
  return name.strip()


def _is_path_safe(base: Path, target: Path) -> bool:
  """경로 탐색 공격 방지"""
  try:
    target.resolve().relative_to(base.resolve())
    return True
  except ValueError:
    return False


def _get_user_dir(user_id: str) -> Path:
  """사용자별 저장 디렉토리"""
  encoded = encode_username(user_id)
  return SAVE_DIR / encoded


# ─── 스키마 ─────────────────────────────────────────

class ExportRequest(BaseModel):
  mindmapId: str
  format: str = 'json'  # json, html, markdown, xml, csv
  data: dict | None = None


class ImportRequest(BaseModel):
  format: str = 'json'
  data: str


class SaveAiImageRequest(BaseModel):
  folder: str
  nodeId: str
  filename: str
  imageData: str  # base64


class CopyImageRequest(BaseModel):
  sourceFolder: str
  nodeId: str
  filename: str


class DeleteNodeFilesRequest(BaseModel):
  folder: str
  nodeId: str


# ─── 라우트 ─────────────────────────────────────────

@router.get('/list')
async def list_files(
  folder: str = '',
  user: User = Depends(require_auth),
):
  """파일 목록 조회"""
  user_dir = _get_user_dir(user.username)
  if folder:
    target_dir = user_dir / _sanitize_folder_name(folder)
  else:
    target_dir = user_dir

  if not _is_path_safe(SAVE_DIR, target_dir):
    raise HTTPException(status_code=400, detail='잘못된 경로')

  if not target_dir.exists():
    return {'success': True, 'data': {'files': []}, 'error': None}

  files = []
  for item in sorted(target_dir.iterdir()):
    stat = item.stat()
    files.append({
      'name': item.name,
      'isDirectory': item.is_dir(),
      'size': stat.st_size,
      'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
    })

  return {'success': True, 'data': {'files': files}, 'error': None}


@router.post('/export')
async def export_mindmap(
  body: ExportRequest,
  user: User = Depends(require_auth),
):
  """마인드맵 내보내기"""
  if not body.data:
    raise HTTPException(status_code=400, detail='데이터 필요')

  fmt = body.format.lower()
  if fmt == 'json':
    content = json.dumps(body.data, ensure_ascii=False, indent=2)
    media_type = 'application/json'
  elif fmt == 'markdown':
    content = _to_markdown(body.data)
    media_type = 'text/markdown'
  elif fmt == 'html':
    content = _to_html(body.data)
    media_type = 'text/html'
  elif fmt == 'xml':
    content = _to_xml(body.data)
    media_type = 'application/xml'
  elif fmt == 'csv':
    content = _to_csv(body.data)
    media_type = 'text/csv'
  else:
    raise HTTPException(status_code=400, detail=f'미지원 형식: {fmt}')

  return Response(
    content=content.encode('utf-8'),
    media_type=media_type,
    headers={
      'Content-Disposition': f'attachment; filename="{body.mindmapId}.{fmt}"',
    },
  )


@router.post('/import')
async def import_mindmap(
  body: ImportRequest,
  user: User = Depends(require_auth),
):
  """마인드맵 가져오기"""
  fmt = body.format.lower()
  if fmt == 'json':
    try:
      data = json.loads(body.data)
    except json.JSONDecodeError:
      raise HTTPException(status_code=400, detail='잘못된 JSON')
  elif fmt == 'html':
    data = _from_html(body.data)
  else:
    raise HTTPException(status_code=400, detail=f'미지원 가져오기 형식: {fmt}')

  return {'success': True, 'data': {'mindmap': data}, 'error': None}


@router.delete('/delete-node-files')
async def delete_node_files(
  body: DeleteNodeFilesRequest,
  user: User = Depends(require_auth),
):
  """노드 파일 삭제"""
  user_dir = _get_user_dir(user.username)
  folder_name = _sanitize_folder_name(body.folder)
  target = user_dir / folder_name

  if not _is_path_safe(SAVE_DIR, target):
    raise HTTPException(status_code=400, detail='잘못된 경로')

  deleted = 0
  if target.exists() and target.is_dir():
    import shutil
    shutil.rmtree(target)
    deleted = 1

  return {'success': True, 'data': {'deleted': deleted}, 'error': None}


@router.post('/save-ai-image')
async def save_ai_image(
  body: SaveAiImageRequest,
  user: User = Depends(require_auth),
):
  """AI 생성 이미지 저장"""
  import base64
  user_dir = _get_user_dir(user.username)
  folder_name = _sanitize_folder_name(body.folder)
  filename = _sanitize_filename(body.filename)
  target_dir = user_dir / folder_name
  target_dir.mkdir(parents=True, exist_ok=True)

  if not _is_path_safe(SAVE_DIR, target_dir):
    raise HTTPException(status_code=400, detail='잘못된 경로')

  # base64 디코딩
  try:
    img_data = body.imageData
    if ',' in img_data:
      img_data = img_data.split(',', 1)[1]
    image_bytes = base64.b64decode(img_data)
  except Exception:
    raise HTTPException(status_code=400, detail='잘못된 이미지 데이터')

  filepath = target_dir / filename
  filepath.write_bytes(image_bytes)

  return {
    'success': True,
    'data': {'path': f'{folder_name}/{filename}'},
    'error': None,
  }


@router.post('/copy-image-to-node')
async def copy_image_to_node(
  body: CopyImageRequest,
  user: User = Depends(require_auth),
):
  """이미지를 nodeId 폴더로 복사"""
  import shutil
  user_dir = _get_user_dir(user.username)
  src_dir = user_dir / _sanitize_folder_name(body.sourceFolder)
  src_file = src_dir / _sanitize_filename(body.filename)

  if not src_file.exists():
    raise HTTPException(status_code=404, detail='원본 파일 없음')

  if not _is_path_safe(SAVE_DIR, src_file):
    raise HTTPException(status_code=400, detail='잘못된 경로')

  dest_dir = user_dir / body.nodeId
  dest_dir.mkdir(parents=True, exist_ok=True)
  dest_file = dest_dir / _sanitize_filename(body.filename)
  shutil.copy2(str(src_file), str(dest_file))

  return {
    'success': True,
    'data': {'path': f'{body.nodeId}/{body.filename}'},
    'error': None,
  }


@router.get('/image/{folder}/{filename:path}')
async def get_image(
  folder: str,
  filename: str,
  user: User = Depends(require_auth),
):
  """이미지 프록시 API"""
  user_dir = _get_user_dir(user.username)
  filepath = user_dir / _sanitize_folder_name(folder) / _sanitize_filename(filename)

  if not _is_path_safe(SAVE_DIR, filepath):
    raise HTTPException(status_code=400, detail='잘못된 경로')

  if not filepath.exists():
    raise HTTPException(status_code=404, detail='파일 없음')

  return FileResponse(str(filepath))


# ─── 내보내기 변환 함수 ──────────────────────────────

def _to_markdown(data: dict, level: int = 1) -> str:
  """마인드맵 데이터를 Markdown으로 변환"""
  lines = []
  title = data.get('title', data.get('text', ''))
  lines.append(f"{'#' * min(level, 6)} {title}")
  if data.get('content'):
    lines.append(f"\n{data['content']}\n")
  for child in data.get('children', []):
    lines.append(_to_markdown(child, level + 1))
  return '\n'.join(lines)


def _to_html(data: dict) -> str:
  """마인드맵 데이터를 HTML로 변환"""
  title = data.get('title', data.get('text', ''))
  html = f'<h1>{title}</h1>'
  if data.get('content'):
    html += f'<p>{data["content"]}</p>'
  children = data.get('children', [])
  if children:
    html += '<ul>'
    for child in children:
      html += f'<li>{_to_html_node(child)}</li>'
    html += '</ul>'
  return f'<!DOCTYPE html><html><head><meta charset="utf-8"><title>{title}</title></head><body>{html}</body></html>'


def _to_html_node(data: dict) -> str:
  """HTML 노드 변환 (재귀)"""
  title = data.get('title', data.get('text', ''))
  html = f'<strong>{title}</strong>'
  if data.get('content'):
    html += f' - {data["content"]}'
  children = data.get('children', [])
  if children:
    html += '<ul>'
    for child in children:
      html += f'<li>{_to_html_node(child)}</li>'
    html += '</ul>'
  return html


def _to_xml(data: dict) -> str:
  """마인드맵 데이터를 XML로 변환"""
  def node_to_xml(node, indent=0):
    sp = '  ' * indent
    title = node.get('title', node.get('text', ''))
    xml = f'{sp}<node title="{title}"'
    if node.get('id'):
      xml += f' id="{node["id"]}"'
    children = node.get('children', [])
    if children or node.get('content'):
      xml += '>\n'
      if node.get('content'):
        xml += f'{sp}  <content>{node["content"]}</content>\n'
      for child in children:
        xml += node_to_xml(child, indent + 1)
      xml += f'{sp}</node>\n'
    else:
      xml += ' />\n'
    return xml
  return '<?xml version="1.0" encoding="UTF-8"?>\n<mindmap>\n' + node_to_xml(data, 1) + '</mindmap>\n'


def _to_csv(data: dict) -> str:
  """마인드맵 데이터를 CSV로 변환"""
  lines = ['id,title,parent_id,level']
  def flatten(node, parent_id='', level=0):
    nid = node.get('id', '')
    title = node.get('title', node.get('text', '')).replace('"', '""')
    lines.append(f'"{nid}","{title}","{parent_id}",{level}')
    for child in node.get('children', []):
      flatten(child, nid, level + 1)
  flatten(data)
  return '\n'.join(lines)


def _from_html(html_str: str) -> dict:
  """HTML에서 마인드맵 데이터 파싱 (간단 구현)"""
  return {'title': 'Imported', 'children': [], '_raw': html_str}
