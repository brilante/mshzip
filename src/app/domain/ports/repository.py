"""Repository 인터페이스 (Port)."""

from abc import ABC, abstractmethod
from typing import Any, Generic, TypeVar

T = TypeVar('T')


class IRepository(ABC, Generic[T]):
    """기본 CRUD Repository 인터페이스."""

    @abstractmethod
    async def get_by_id(self, id: Any) -> T | None:
        """ID로 엔티티 조회."""
        ...

    @abstractmethod
    async def get_all(self, *, limit: int = 100, offset: int = 0) -> list[T]:
        """전체 엔티티 목록 조회."""
        ...

    @abstractmethod
    async def create(self, **kwargs: Any) -> T:
        """엔티티 생성."""
        ...

    @abstractmethod
    async def update(self, id: Any, **kwargs: Any) -> T | None:
        """엔티티 수정."""
        ...

    @abstractmethod
    async def delete(self, id: Any) -> bool:
        """엔티티 삭제."""
        ...
