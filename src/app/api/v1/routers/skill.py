"""Skill API 라우터 - Access Key 기반 노드 데이터 접근.

원본 MyMind3 API와 동일한 경로:
- GET  /api/skill/ping
- GET  /api/skill/mindmaps
- PATCH /api/skill/mindmap/:mindmapId
- PUT  /api/skill/mindmap/:mindmapId
- GET  /api/skill/node/:mindmapId/:nodeId
- GET  /api/skill/node/:nodeId
- PUT  /api/skill/node/:mindmapId/:nodeId
- PUT  /api/skill/node/:nodeId
"""

import hashlib
import json
import re
from copy import deepcopy
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.api.v1.middleware.auth import require_access_key
from src.app.core.logging import get_logger
from src.app.domain.services.mindmap_service import (
    MindmapService,
    find_node_by_id,
    generate_node_id,
    get_mindmap_service,
    normalize_node,
    sanitize_node_paths,
)
from src.app.infrastructure.db.models import AccessKey, NodeId, User
from src.app.infrastructure.db.session import get_db
from src.app.infrastructure.storage.local_provider import get_storage
from src.app.shared.user_id_encoder import find_user_folder

logger = get_logger(__name__)

router = APIRouter(prefix='/api/skill', tags=['skill'])


# ── 유틸리티 ──

async def _resolve_username(access_key: dict, db: AsyncSession) -> str | None:
    """Access Key에서 username 추출."""
    user_id = access_key.get('user_id')
    if not user_id:
        return None
    stmt = select(User.username).where(User.id == user_id)
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    return row


async def _find_node_across_mindmaps(
    username: str, node_id: str,
) -> tuple[str | None, dict | None, dict | None]:
    """모든 마인드맵에서 노드 검색.

    Returns: (mindmapId, node, mindmapData)
    """
    storage = get_storage()
    service = get_mindmap_service()

    folders = await service.get_save_list(username)
    for f in folders:
        folder_name = f['folder']
        mm_data = await service.load_mindmap(username, folder_name)
        tree = mm_data.get('mindMapData', [])
        if not tree:
            continue
        node = find_node_by_id(tree, node_id)
        if node:
            return folder_name, node, mm_data
    return None, None, None


# ── 엔드포인트 ──

@router.get('/ping')
async def ping(access_key: dict = Depends(require_access_key)):
    """연결 테스트."""
    return {
        'success': True,
        'message': 'pong',
        'scope': access_key.get('scope', 'whitelist'),
    }


@router.get('/mindmaps')
async def list_mindmaps(
    access_key: dict = Depends(require_access_key),
    db: AsyncSession = Depends(get_db),
):
    """접근 가능한 마인드맵 목록."""
    username = await _resolve_username(access_key, db)
    if not username:
        return JSONResponse({'success': False, 'error': '사용자를 찾을 수 없습니다.'}, 404)

    service = get_mindmap_service()
    folders = await service.get_save_list(username)

    # scope 필터링 (모든 마인드맵 접근 가능이 아닌 경우)
    # 현재 단순 구현 - scope='all'이면 전체, 아니면 mindmap_id 매칭
    scope = access_key.get('scope', 'whitelist')
    if scope != 'all':
        # AccessKey의 mindmap_id와 일치하는 것만
        # TODO: access_key_mindmaps 화이트리스트 테이블 연동
        pass

    return {'success': True, 'mindmaps': folders}


@router.patch('/mindmap/{mindmap_id}')
async def patch_mindmap(
    mindmap_id: str,
    request: Request,
    access_key: dict = Depends(require_access_key),
    db: AsyncSession = Depends(get_db),
):
    """마인드맵 PATCH 연산 (add/update/delete/move)."""
    username = await _resolve_username(access_key, db)
    if not username:
        return JSONResponse({'success': False, 'error': '사용자를 찾을 수 없습니다.'}, 404)

    body = await request.json()
    operations = body.get('operations', [])

    if not isinstance(operations, list) or not operations:
        return JSONResponse({'success': False, 'error': 'operations 배열이 필요합니다.'}, 400)

    # 유효한 연산 타입
    valid_ops = {'add', 'update', 'delete', 'move'}
    for op in operations:
        if op.get('op') not in valid_ops:
            return JSONResponse(
                {'success': False, 'error': f'잘못된 연산: {op.get("op")}'},
                400,
            )

    service = get_mindmap_service()
    result = await service.patch_mindmap(username, mindmap_id, operations)

    # node_ids DB 동기화
    if result.get('success'):
        await _sync_node_ids(db, access_key['user_id'], mindmap_id, username)

    return result


@router.put('/mindmap/{mindmap_id}')
async def put_mindmap(
    mindmap_id: str,
    request: Request,
    access_key: dict = Depends(require_access_key),
    db: AsyncSession = Depends(get_db),
):
    """마인드맵 전체 구조 저장."""
    username = await _resolve_username(access_key, db)
    if not username:
        return JSONResponse({'success': False, 'error': '사용자를 찾을 수 없습니다.'}, 404)

    body = await request.json()
    data = body.get('data', body)

    service = get_mindmap_service()
    result = await service.save_mindmap(username, mindmap_id, data)

    if result.get('success'):
        await _sync_node_ids(db, access_key['user_id'], mindmap_id, username)

    return result


@router.get('/node/{mindmap_id}/{node_id}')
async def get_node_with_mindmap(
    mindmap_id: str,
    node_id: str,
    access_key: dict = Depends(require_access_key),
    db: AsyncSession = Depends(get_db),
):
    """노드 데이터 조회 (mindmapId 지정)."""
    username = await _resolve_username(access_key, db)
    if not username:
        return JSONResponse({'success': False, 'error': '사용자를 찾을 수 없습니다.'}, 404)

    service = get_mindmap_service()
    mm_data = await service.load_mindmap(username, mindmap_id)
    if mm_data.get('success') is False:
        return JSONResponse(mm_data, 404)

    tree = mm_data.get('mindMapData', [])
    node = find_node_by_id(tree, node_id)
    if not node:
        return JSONResponse({'success': False, 'error': '노드를 찾을 수 없습니다.'}, 404)

    # HTML 콘텐츠 로드
    content = await service.load_node_html(username, mindmap_id, node)

    return {
        'success': True,
        'mindmapId': mindmap_id,
        'node': {
            **node,
            'content': content,
            'children': _summarize_children(node.get('children', [])),
        },
    }


@router.get('/node/{node_id}')
async def get_node_legacy(
    node_id: str,
    access_key: dict = Depends(require_access_key),
    db: AsyncSession = Depends(get_db),
):
    """노드 데이터 조회 (레거시 - nodeId로 전체 검색)."""
    username = await _resolve_username(access_key, db)
    if not username:
        return JSONResponse({'success': False, 'error': '사용자를 찾을 수 없습니다.'}, 404)

    # 1. node_ids DB에서 mindmap_id 조회
    stmt = select(NodeId.mindmap_id).where(
        NodeId.user_id == access_key['user_id'],
        NodeId.node_id == node_id,
    )
    result = await db.execute(stmt)
    mindmap_id = result.scalar_one_or_none()

    if mindmap_id:
        service = get_mindmap_service()
        mm_data = await service.load_mindmap(username, mindmap_id)
        if mm_data.get('success') is not False:
            tree = mm_data.get('mindMapData', [])
            node = find_node_by_id(tree, node_id)
            if node:
                content = await service.load_node_html(username, mindmap_id, node)
                return {
                    'success': True,
                    'mindmapId': mindmap_id,
                    'node': {
                        **node,
                        'content': content,
                        'children': _summarize_children(node.get('children', [])),
                    },
                }

    # 2. 전체 마인드맵 스캔 폴백
    mindmap_id, node, mm_data = await _find_node_across_mindmaps(username, node_id)
    if not node:
        return JSONResponse({'success': False, 'error': '노드를 찾을 수 없습니다.'}, 404)

    service = get_mindmap_service()
    content = await service.load_node_html(username, mindmap_id, node)

    return {
        'success': True,
        'mindmapId': mindmap_id,
        'node': {
            **node,
            'content': content,
            'children': _summarize_children(node.get('children', [])),
        },
    }


@router.put('/node/{mindmap_id}/{node_id}')
async def put_node_with_mindmap(
    mindmap_id: str,
    node_id: str,
    request: Request,
    access_key: dict = Depends(require_access_key),
    db: AsyncSession = Depends(get_db),
):
    """노드 데이터 수정 (mindmapId 지정)."""
    username = await _resolve_username(access_key, db)
    if not username:
        return JSONResponse({'success': False, 'error': '사용자를 찾을 수 없습니다.'}, 404)

    body = await request.json()
    return await _update_node(username, mindmap_id, node_id, body)


@router.put('/node/{node_id}')
async def put_node_legacy(
    node_id: str,
    request: Request,
    access_key: dict = Depends(require_access_key),
    db: AsyncSession = Depends(get_db),
):
    """노드 데이터 수정 (레거시 - nodeId로 검색)."""
    username = await _resolve_username(access_key, db)
    if not username:
        return JSONResponse({'success': False, 'error': '사용자를 찾을 수 없습니다.'}, 404)

    # mindmap_id 찾기
    mindmap_id, _, _ = await _find_node_across_mindmaps(username, node_id)
    if not mindmap_id:
        return JSONResponse({'success': False, 'error': '노드를 찾을 수 없습니다.'}, 404)

    body = await request.json()
    return await _update_node(username, mindmap_id, node_id, body)


# ── 내부 함수 ──

async def _update_node(
    username: str, mindmap_id: str, node_id: str, body: dict,
) -> JSONResponse | dict:
    """노드 업데이트 공통 로직."""
    service = get_mindmap_service()

    # content (덮어쓰기) 또는 append (추가) 모드
    content = body.get('content')
    append = body.get('append')
    title = body.get('title')
    filename = body.get('filename')

    if content is not None or append is not None:
        # HTML 콘텐츠 저장
        mm_data = await service.load_mindmap(username, mindmap_id)
        if mm_data.get('success') is False:
            return JSONResponse(mm_data, 404)

        tree = mm_data.get('mindMapData', [])
        node = find_node_by_id(tree, node_id)
        if not node:
            return JSONResponse({'success': False, 'error': '노드를 찾을 수 없습니다.'}, 404)

        if filename:
            # 첨부파일 모드
            file_path = f'{mindmap_id}/{node_id}/{filename}'
            file_content = content or append or ''
            storage = get_storage()
            await storage.save_file(username, file_path, file_content)
            return {'success': True, 'path': file_path, 'mode': 'attachment'}

        # HTML 콘텐츠 모드
        if append:
            existing = await service.load_node_html(username, mindmap_id, node)
            content = existing + append

        result = await service.save_node_html(username, mindmap_id, node_id, content)

        # title 변경 시 JSON도 업데이트
        if title:
            await service.patch_mindmap(username, mindmap_id, [
                {'op': 'update', 'nodeId': node_id, 'changes': {'title': title}},
            ])

        return result

    # 기타 속성 업데이트
    if title or body.get('changes'):
        changes = body.get('changes', {})
        if title:
            changes['title'] = title
        result = await service.patch_mindmap(username, mindmap_id, [
            {'op': 'update', 'nodeId': node_id, 'changes': changes},
        ])
        return result

    return {'success': True, 'message': '변경사항 없음'}


def _summarize_children(children: list[dict]) -> list[dict]:
    """자식 노드 요약 (content 제외, 제목만)."""
    return [
        {
            'id': c.get('id'),
            'nodeId': c.get('nodeId'),
            'title': c.get('title', c.get('text', '')),
            'childCount': len(c.get('children', [])),
        }
        for c in children
    ]


async def _sync_node_ids(
    db: AsyncSession, user_id: int, mindmap_id: str, username: str,
) -> None:
    """node_ids 테이블 동기화."""
    try:
        service = get_mindmap_service()
        mm_data = await service.load_mindmap(username, mindmap_id)
        tree = mm_data.get('mindMapData', [])

        # 트리에서 모든 nodeId 수집
        node_ids: set[str] = set()

        def _collect(nodes: list[dict]):
            for node in nodes:
                nid = node.get('nodeId')
                if nid:
                    node_ids.add(nid)
                _collect(node.get('children', []))

        _collect(tree)

        if not node_ids:
            return

        # 기존 DB 레코드 조회
        stmt = select(NodeId.node_id).where(
            NodeId.user_id == user_id,
            NodeId.mindmap_id == mindmap_id,
        )
        result = await db.execute(stmt)
        existing = {row[0] for row in result.fetchall()}

        # 신규 노드 삽입
        new_ids = node_ids - existing
        for nid in new_ids:
            db.add(NodeId(user_id=user_id, mindmap_id=mindmap_id, node_id=nid))

        # 삭제된 노드 제거
        deleted_ids = existing - node_ids
        if deleted_ids:
            from sqlalchemy import delete
            await db.execute(
                delete(NodeId).where(
                    NodeId.user_id == user_id,
                    NodeId.mindmap_id == mindmap_id,
                    NodeId.node_id.in_(deleted_ids),
                ),
            )

        await db.commit()
    except Exception as e:
        logger.warning('node_ids 동기화 실패', error=str(e))
        await db.rollback()
