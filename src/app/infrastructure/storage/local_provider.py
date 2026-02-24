"""LocalStorageProvider - 파일시스템 기반 저장소."""

import asyncio
import json
import shutil
from pathlib import Path

from src.app.core.config import get_settings
from src.app.core.logging import get_logger
from src.app.domain.ports.storage import IStorageProvider
from src.app.shared.user_id_encoder import find_or_create_user_folder

logger = get_logger(__name__)

# 사용자별 폴더 경로 캐시 (bcrypt 호출 방지)
_path_cache: dict[str, Path] = {}


class LocalStorageProvider(IStorageProvider):
    """로컬 파일시스템 저장소."""

    def __init__(self):
        settings = get_settings()
        self._save_dir = Path(settings.SAVE_DIR).resolve()
        self._save_dir.mkdir(parents=True, exist_ok=True)

    def _get_user_dir(self, user_id: str) -> Path:
        """사용자 폴더 경로 반환 (캐시 활용)."""
        if user_id in _path_cache:
            return _path_cache[user_id]

        result = find_or_create_user_folder(user_id, str(self._save_dir))
        user_dir = self._save_dir / result['folder']
        _path_cache[user_id] = user_dir
        return user_dir

    def _resolve_path(self, user_id: str, file_path: str) -> Path:
        """안전한 파일 경로 생성 (Path Traversal 방지)."""
        user_dir = self._get_user_dir(user_id)
        resolved = (user_dir / file_path).resolve()
        # user_dir 밖으로 벗어나지 못하게 검증
        if not str(resolved).startswith(str(user_dir)):
            raise PermissionError(f'잘못된 경로: {file_path}')
        return resolved

    async def save_file(self, user_id: str, file_path: str, content: str | bytes) -> dict:
        """파일 저장."""
        target = self._resolve_path(user_id, file_path)
        target.parent.mkdir(parents=True, exist_ok=True)

        def _write():
            if isinstance(content, bytes):
                target.write_bytes(content)
            else:
                target.write_text(content, encoding='utf-8')

        await asyncio.to_thread(_write)
        logger.info('파일 저장', user_id=user_id, path=file_path, size=len(content))
        return {'success': True, 'path': file_path}

    async def load_file(self, user_id: str, file_path: str, binary: bool = False) -> str | bytes:
        """파일 읽기."""
        target = self._resolve_path(user_id, file_path)
        if not target.exists():
            raise FileNotFoundError(f'파일 없음: {file_path}')

        def _read():
            if binary:
                return target.read_bytes()
            return target.read_text(encoding='utf-8')

        return await asyncio.to_thread(_read)

    async def delete_file(self, user_id: str, file_path: str) -> dict:
        """파일 삭제."""
        target = self._resolve_path(user_id, file_path)
        if target.exists():
            await asyncio.to_thread(target.unlink)
        return {'success': True}

    async def list_files(self, user_id: str, directory: str = '') -> list[dict]:
        """파일/폴더 목록 조회."""
        target = self._resolve_path(user_id, directory) if directory else self._get_user_dir(user_id)
        if not target.exists():
            return []

        def _list():
            items = []
            for entry in sorted(target.iterdir()):
                if entry.name.startswith('.'):
                    continue
                items.append({
                    'name': entry.name,
                    'isDirectory': entry.is_dir(),
                    'size': entry.stat().st_size if entry.is_file() else 0,
                })
            return items

        return await asyncio.to_thread(_list)

    async def exists(self, user_id: str, file_path: str) -> bool:
        """파일 존재 여부."""
        target = self._resolve_path(user_id, file_path)
        return await asyncio.to_thread(target.exists)

    async def delete_directory(self, user_id: str, directory: str) -> dict:
        """디렉토리 삭제."""
        target = self._resolve_path(user_id, directory)
        if target.exists() and target.is_dir():
            await asyncio.to_thread(shutil.rmtree, target)
            logger.info('디렉토리 삭제', user_id=user_id, directory=directory)
        return {'success': True}

    async def get_index(self, user_id: str) -> dict | None:
        """_index.json 읽기."""
        try:
            content = await self.load_file(user_id, '_index.json')
            return json.loads(content)
        except (FileNotFoundError, json.JSONDecodeError):
            return None

    async def save_index(self, user_id: str, data: dict) -> None:
        """_index.json 저장."""
        content = json.dumps(data, ensure_ascii=False, indent=2)
        await self.save_file(user_id, '_index.json', content)

    async def rebuild_index(self, user_id: str) -> dict:
        """폴더 스캔으로 인덱스 재구축."""
        user_dir = self._get_user_dir(user_id)
        entries = {}

        def _scan():
            if not user_dir.exists():
                return
            for entry in user_dir.iterdir():
                if not entry.is_dir() or entry.name.startswith('.') or entry.name.startswith('_'):
                    continue
                json_file = entry / f'{entry.name}.json'
                if json_file.exists():
                    title = entry.name
                    try:
                        data = json.loads(json_file.read_text(encoding='utf-8'))
                        if isinstance(data, dict) and data.get('name'):
                            title = data['name']
                        elif isinstance(data, list) and data and isinstance(data[0], dict):
                            title = data[0].get('text', data[0].get('title', entry.name))
                    except (json.JSONDecodeError, OSError):
                        pass
                    entries[entry.name] = {
                        'title': title,
                        'updatedAt': json_file.stat().st_mtime,
                    }

        await asyncio.to_thread(_scan)

        from datetime import datetime, timezone
        index = {
            'version': 1,
            'updatedAt': datetime.now(timezone.utc).isoformat(),
            'entries': entries,
        }
        await self.save_index(user_id, index)
        return index


# 싱글턴
_instance: LocalStorageProvider | None = None


def get_storage() -> LocalStorageProvider:
    """LocalStorageProvider 싱글턴 반환."""
    global _instance
    if _instance is None:
        _instance = LocalStorageProvider()
    return _instance
