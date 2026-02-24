"""마인드맵 서비스 - CRUD + 노드 관리 + PATCH 연산."""

import json
import os
import re
import secrets
import string
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from src.app.core.logging import get_logger
from src.app.infrastructure.storage.local_provider import get_storage

logger = get_logger(__name__)

# 노드 ID 생성용 문자셋 (A-Z, 0-9)
NODE_ID_CHARSET = string.ascii_uppercase + string.digits


def generate_node_id() -> str:
    """10자리 랜덤 노드 ID 생성."""
    return ''.join(secrets.choice(NODE_ID_CHARSET) for _ in range(10))


# ── 트리 유틸리티 ──

def find_node_by_id(tree: list[dict], node_id: int | str) -> dict | None:
    """트리에서 id 또는 nodeId로 노드 검색 (재귀)."""
    for node in tree:
        # 숫자 id 매칭
        if node.get('id') == node_id:
            return node
        # 문자열 nodeId 매칭
        if node.get('nodeId') == node_id:
            return node
        # 자식 재귀
        children = node.get('children', [])
        if children:
            found = find_node_by_id(children, node_id)
            if found:
                return found
    return None


def find_parent_of(tree: list[dict], node_id: int | str) -> tuple[dict | None, int]:
    """노드의 부모와 인덱스 반환."""
    for node in tree:
        children = node.get('children', [])
        for i, child in enumerate(children):
            if child.get('id') == node_id or child.get('nodeId') == node_id:
                return node, i
            result = find_parent_of([child], node_id)
            if result[0] is not None:
                return result
    return None, -1


def remove_node_from_tree(tree: list[dict], node_id: int | str) -> dict | None:
    """트리에서 노드 제거 후 반환."""
    for node in tree:
        children = node.get('children', [])
        for i, child in enumerate(children):
            if child.get('id') == node_id or child.get('nodeId') == node_id:
                return children.pop(i)
            removed = remove_node_from_tree([child], node_id)
            if removed:
                return removed
    return None


def collect_all_ids(tree: list[dict]) -> set[int]:
    """트리의 모든 숫자 id 수집."""
    ids = set()
    for node in tree:
        if isinstance(node.get('id'), int):
            ids.add(node['id'])
        for child in node.get('children', []):
            ids.update(collect_all_ids([child]))
    return ids


def normalize_node(node: dict, parent_id: int | None = None, level: int = 0) -> dict:
    """노드 정규화 (text→title, 필수 속성 자동 채우기)."""
    # text → title
    if not node.get('title') and node.get('text'):
        node['title'] = node.pop('text')
    elif not node.get('title'):
        node['title'] = ''

    # 비숫자 문자열 id → nodeId
    if node.get('id') is not None and isinstance(node['id'], str) and not node['id'].isdigit():
        if not node.get('nodeId'):
            node['nodeId'] = node['id']
        node['id'] = None

    # 필수 속성 기본값
    if node.get('parentId') is None and parent_id is not None:
        node['parentId'] = parent_id
    if node.get('level') is None:
        node['level'] = level
    if node.get('expanded') is None:
        node['expanded'] = True
    if 'children' not in node:
        node['children'] = []
    if node.get('x') is None:
        node['x'] = 100 + level * 460
    if node.get('y') is None:
        node['y'] = 60

    # nodeId 자동 생성
    if not node.get('nodeId'):
        node['nodeId'] = generate_node_id()

    # path 자동 설정
    if not node.get('path') and node.get('title') and node.get('nodeId'):
        safe_title = re.sub(r'[<>:"/\\|?*]', '', node['title'])[:50]
        node['path'] = f'{safe_title}[{node["nodeId"]}].html'

    return node


def sanitize_node_paths(tree: list[dict]) -> None:
    """저장 전 노드 경로 정리 (재귀, content 제거)."""
    for node in tree:
        # path 미설정 시 생성
        if not node.get('path') and node.get('nodeId'):
            title = node.get('title', node.get('text', ''))
            safe_title = re.sub(r'[<>:"/\\|?*]', '', title)[:50]
            node['path'] = f'{safe_title}[{node["nodeId"]}].html'
        # content는 별도 HTML 파일에 저장하므로 JSON에서 제거
        node.pop('content', None)
        # 자식 재귀
        for child in node.get('children', []):
            sanitize_node_paths([child])


# ── 마인드맵 서비스 ──

class MindmapService:
    """마인드맵 CRUD 서비스."""

    def __init__(self):
        self._storage = get_storage()

    async def get_save_list(self, username: str) -> list[dict]:
        """마인드맵 목록 조회."""
        # 인덱스 조회 또는 재구축
        index = await self._storage.get_index(username)
        if not index:
            index = await self._storage.rebuild_index(username)

        entries = index.get('entries', {})
        folders = []
        for folder_name, info in entries.items():
            folders.append({
                'folder': folder_name,
                'title': info.get('title', folder_name),
            })
        return folders

    async def save_mindmap(self, username: str, folder_name: str, data: dict) -> dict:
        """마인드맵 저장."""
        if not folder_name:
            return {'success': False, 'error': '폴더명이 필요합니다.'}

        mind_map_data = data.get('mindMapData', [])

        # 노드 경로 정리 (content 제거)
        sanitize_node_paths(mind_map_data)

        # JSON 저장
        json_path = f'{folder_name}/{folder_name}.json'
        json_content = json.dumps(data, ensure_ascii=False, indent=2)
        await self._storage.save_file(username, json_path, json_content)

        # 인덱스 업데이트
        title = folder_name
        if mind_map_data and isinstance(mind_map_data[0], dict):
            title = mind_map_data[0].get('title', mind_map_data[0].get('text', folder_name))

        index = await self._storage.get_index(username) or {
            'version': 1, 'entries': {},
        }
        index['entries'][folder_name] = {
            'title': title,
            'updatedAt': datetime.now(timezone.utc).isoformat(),
        }
        index['updatedAt'] = datetime.now(timezone.utc).isoformat()
        await self._storage.save_index(username, index)

        logger.info('마인드맵 저장', username=username, folder=folder_name)
        return {
            'success': True,
            'path': json_path,
            'actualFolder': folder_name,
        }

    async def load_mindmap(self, username: str, folder_name: str) -> dict:
        """마인드맵 로드."""
        json_path = f'{folder_name}/{folder_name}.json'
        try:
            content = await self._storage.load_file(username, json_path)
        except FileNotFoundError:
            return {'success': False, 'error': '마인드맵을 찾을 수 없습니다.'}

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            return {'success': False, 'error': 'JSON 파싱 오류'}

        # mindMapData 배열인 경우 래핑
        if isinstance(data, list):
            data = {'mindMapData': data}

        data['currentFolder'] = folder_name
        return data

    async def delete_mindmap(self, username: str, folder_name: str) -> dict:
        """마인드맵 삭제."""
        if not folder_name:
            return {'success': False, 'error': '폴더명이 필요합니다.'}

        exists = await self._storage.exists(username, folder_name)
        if not exists:
            return {'success': False, 'error': '폴더를 찾을 수 없습니다.'}

        await self._storage.delete_directory(username, folder_name)

        # 인덱스에서 제거
        index = await self._storage.get_index(username)
        if index and folder_name in index.get('entries', {}):
            del index['entries'][folder_name]
            index['updatedAt'] = datetime.now(timezone.utc).isoformat()
            await self._storage.save_index(username, index)

        logger.info('마인드맵 삭제', username=username, folder=folder_name)
        return {
            'success': True,
            'message': f'"{folder_name}" 폴더가 삭제되었습니다.',
        }

    async def save_node_html(self, username: str, folder_name: str, node_id: str, content: str) -> dict:
        """노드 HTML 콘텐츠 저장."""
        # 마인드맵 JSON에서 노드 찾기 → path 확인
        mm_data = await self.load_mindmap(username, folder_name)
        if not mm_data.get('mindMapData'):
            return {'success': False, 'error': '마인드맵을 찾을 수 없습니다.'}

        tree = mm_data['mindMapData']
        node = find_node_by_id(tree, node_id)
        if not node:
            return {'success': False, 'error': '노드를 찾을 수 없습니다.'}

        # path 결정
        node_path = node.get('path')
        if not node_path:
            safe_title = re.sub(r'[<>:"/\\|?*]', '', node.get('title', ''))[:50]
            nid = node.get('nodeId', node_id)
            node_path = f'{safe_title}[{nid}].html'

        file_path = f'{folder_name}/{node_path}'
        await self._storage.save_file(username, file_path, content)
        return {'success': True, 'path': file_path}

    async def load_node_html(self, username: str, folder_name: str, node: dict) -> str:
        """노드 HTML 콘텐츠 로드."""
        node_path = node.get('path')
        if not node_path:
            return ''

        file_path = f'{folder_name}/{node_path}'
        try:
            return await self._storage.load_file(username, file_path)
        except FileNotFoundError:
            return ''

    # ── PATCH 연산 ──

    async def patch_mindmap(
        self, username: str, folder_name: str, operations: list[dict]
    ) -> dict:
        """마인드맵 증분 패치 (add/update/delete/move)."""
        # 현재 마인드맵 로드
        mm_data = await self.load_mindmap(username, folder_name)
        if mm_data.get('success') is False:
            return mm_data

        tree = mm_data.get('mindMapData', [])
        next_node_id = mm_data.get('nextNodeId', 1)
        applied = 0

        for op in operations:
            op_type = op.get('op')

            if op_type == 'add':
                result = self._apply_add(tree, op, next_node_id, username, folder_name)
                if result.get('success'):
                    next_node_id = result['nextNodeId']
                    applied += 1
                    # content가 있으면 HTML 파일 저장
                    if op.get('node', {}).get('content'):
                        node = result['node']
                        nid = node.get('nodeId', '')
                        safe_title = re.sub(r'[<>:"/\\|?*]', '', node.get('title', ''))[:50]
                        html_path = f'{folder_name}/{safe_title}[{nid}].html'
                        await self._storage.save_file(
                            username, html_path, op['node']['content'],
                        )

            elif op_type == 'update':
                if self._apply_update(tree, op):
                    applied += 1

            elif op_type == 'delete':
                if self._apply_delete(tree, op):
                    applied += 1

            elif op_type == 'move':
                if self._apply_move(tree, op):
                    applied += 1

        # 중복 id 수정
        self._fix_duplicate_ids(tree, next_node_id)

        # 저장
        mm_data['mindMapData'] = tree
        mm_data['nextNodeId'] = next_node_id
        mm_data.pop('currentFolder', None)

        sanitize_node_paths(tree)
        json_content = json.dumps(mm_data, ensure_ascii=False, indent=2)
        json_path = f'{folder_name}/{folder_name}.json'
        await self._storage.save_file(username, json_path, json_content)

        return {'success': True, 'applied': applied, 'total': len(operations)}

    def _apply_add(
        self, tree: list[dict], op: dict, next_node_id: int,
        username: str, folder_name: str,
    ) -> dict:
        """add 연산 적용."""
        parent_id = op.get('parentId') or op.get('parentNodeId')
        node = deepcopy(op.get('node', {}))

        # 부모 찾기
        parent = find_node_by_id(tree, parent_id)
        if not parent:
            # 루트 레벨에 추가
            if not tree:
                parent = None
            else:
                logger.warning('부모 노드 없음', parent_id=parent_id)
                return {'success': False}

        # 노드 정규화
        parent_level = parent.get('level', -1) if parent else -1
        normalize_node(node, parent_id, parent_level + 1)

        # 숫자 id 할당
        if node.get('id') is None:
            node['id'] = next_node_id
            next_node_id += 1
        else:
            next_node_id = max(next_node_id, node['id'] + 1)

        # x, y 계산 (부모 기준 우측 배치)
        if parent:
            parent_children = parent.get('children', [])
            node['x'] = parent.get('x', 100) + 460
            if parent_children:
                last_child = parent_children[-1]
                node['y'] = last_child.get('y', 60) + 60
            else:
                node['y'] = parent.get('y', 60)

            parent.setdefault('children', []).append(node)
        else:
            tree.append(node)

        return {'success': True, 'nextNodeId': next_node_id, 'node': node}

    def _apply_update(self, tree: list[dict], op: dict) -> bool:
        """update 연산 적용."""
        node_id = op.get('nodeId') or op.get('id')
        changes = op.get('changes', {})
        if not node_id or not changes:
            return False

        node = find_node_by_id(tree, node_id)
        if not node:
            return False

        # text → title 정규화
        if 'text' in changes and 'title' not in changes:
            changes['title'] = changes.pop('text')

        # 변경사항 적용 (children은 덮어쓰지 않음)
        for key, value in changes.items():
            if key != 'children':
                node[key] = value

        return True

    def _apply_delete(self, tree: list[dict], op: dict) -> bool:
        """delete 연산 적용."""
        node_id = op.get('nodeId') or op.get('id')
        if not node_id:
            return False
        removed = remove_node_from_tree(tree, node_id)
        return removed is not None

    def _apply_move(self, tree: list[dict], op: dict) -> bool:
        """move 연산 적용."""
        node_id = op.get('nodeId') or op.get('id')
        new_parent_id = op.get('newParentId')
        index = op.get('index', -1)

        if not node_id or new_parent_id is None:
            return False

        # 노드 추출
        removed = remove_node_from_tree(tree, node_id)
        if not removed:
            return False

        # 새 부모 찾기
        new_parent = find_node_by_id(tree, new_parent_id)
        if not new_parent:
            return False

        # 부모 정보 갱신
        removed['parentId'] = new_parent.get('id')
        removed['level'] = new_parent.get('level', 0) + 1

        children = new_parent.setdefault('children', [])
        if 0 <= index < len(children):
            children.insert(index, removed)
        else:
            children.append(removed)

        return True

    def _fix_duplicate_ids(self, tree: list[dict], next_id: int) -> int:
        """중복 숫자 id 수정."""
        seen: set[int] = set()

        def _fix(nodes: list[dict]):
            nonlocal next_id
            for node in nodes:
                nid = node.get('id')
                if isinstance(nid, int):
                    if nid in seen:
                        node['id'] = next_id
                        next_id += 1
                    seen.add(node['id'])
                _fix(node.get('children', []))

        _fix(tree)
        return next_id


# 싱글턴
_instance: MindmapService | None = None


def get_mindmap_service() -> MindmapService:
    """MindmapService 싱글턴 반환."""
    global _instance
    if _instance is None:
        _instance = MindmapService()
    return _instance
