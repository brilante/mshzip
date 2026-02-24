"""마인드맵 CRUD API 라우터.

원본 MyMind3 API와 동일한 경로 유지:
- GET  /api/mindmap/savelist
- POST /api/mindmap/save
- GET  /api/mindmap/load
- DELETE /api/mindmap/deletefolder
- PATCH /api/mindmap/patch
- POST /api/mindmap/savehtml
"""

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse

from src.app.api.v1.middleware.auth import get_current_user
from src.app.domain.services.mindmap_service import get_mindmap_service

router = APIRouter(prefix='/api/mindmap', tags=['mindmap'])


@router.get('/savelist')
async def save_list(
    rebuild: bool = Query(False),
    user: dict = Depends(get_current_user),
):
    """마인드맵 목록 조회."""
    service = get_mindmap_service()
    username = user['username']

    if rebuild:
        from src.app.infrastructure.storage.local_provider import get_storage
        await get_storage().rebuild_index(username)

    folders = await service.get_save_list(username)
    return {'success': True, 'folders': folders}


@router.post('/save')
async def save_mindmap(
    request: Request,
    user: dict = Depends(get_current_user),
):
    """마인드맵 저장."""
    body = await request.json()
    folder_name = body.get('folderName', '')
    data = body.get('data', {})

    if not folder_name:
        return JSONResponse({'success': False, 'error': '폴더명이 필요합니다.'}, 400)

    service = get_mindmap_service()
    result = await service.save_mindmap(user['username'], folder_name, data)
    return result


@router.get('/load')
async def load_mindmap(
    folder: str = Query(...),
    user: dict = Depends(get_current_user),
):
    """마인드맵 로드."""
    service = get_mindmap_service()
    result = await service.load_mindmap(user['username'], folder)

    if result.get('success') is False:
        return JSONResponse(result, 404)
    return result


@router.delete('/deletefolder')
async def delete_folder(
    folder: str = Query(...),
    user: dict = Depends(get_current_user),
):
    """마인드맵 폴더 삭제."""
    service = get_mindmap_service()
    result = await service.delete_mindmap(user['username'], folder)

    if result.get('success') is False:
        return JSONResponse(result, 404)
    return result


@router.patch('/patch')
async def patch_mindmap(
    request: Request,
    user: dict = Depends(get_current_user),
):
    """마인드맵 증분 패치."""
    body = await request.json()
    folder_name = body.get('folderName', '')
    operations = body.get('operations', [])

    if not folder_name:
        return JSONResponse({'success': False, 'error': '폴더명이 필요합니다.'}, 400)
    if not isinstance(operations, list) or not operations:
        return JSONResponse({'success': False, 'error': 'operations 배열이 필요합니다.'}, 400)

    service = get_mindmap_service()
    result = await service.patch_mindmap(user['username'], folder_name, operations)
    return result


@router.post('/savehtml')
async def save_html(
    request: Request,
    user: dict = Depends(get_current_user),
):
    """노드 HTML 콘텐츠 저장."""
    body = await request.json()
    folder_name = body.get('folderName', '')
    node_id = body.get('nodeId', '')
    content = body.get('content', '')

    if not folder_name or not node_id:
        return JSONResponse({'success': False, 'error': '폴더명과 노드ID가 필요합니다.'}, 400)

    service = get_mindmap_service()
    result = await service.save_node_html(user['username'], folder_name, node_id, content)
    return result
