"""Storage Port - 파일 저장소 인터페이스."""

from abc import ABC, abstractmethod
from typing import Any


class IStorageProvider(ABC):
    """파일 저장소 추상 인터페이스."""

    @abstractmethod
    async def save_file(self, user_id: str, file_path: str, content: str | bytes) -> dict:
        """파일 저장."""
        ...

    @abstractmethod
    async def load_file(self, user_id: str, file_path: str, binary: bool = False) -> str | bytes:
        """파일 읽기."""
        ...

    @abstractmethod
    async def delete_file(self, user_id: str, file_path: str) -> dict:
        """파일 삭제."""
        ...

    @abstractmethod
    async def list_files(self, user_id: str, directory: str = '') -> list[dict]:
        """파일/폴더 목록 조회."""
        ...

    @abstractmethod
    async def exists(self, user_id: str, file_path: str) -> bool:
        """파일 존재 여부."""
        ...

    @abstractmethod
    async def delete_directory(self, user_id: str, directory: str) -> dict:
        """디렉토리 삭제."""
        ...
