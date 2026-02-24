"""SQLAlchemy 기반 Repository 구현체."""

from typing import Any, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.domain.ports.repository import IRepository
from src.app.infrastructure.db.session import Base

T = TypeVar('T', bound=Base)


class SQLAlchemyRepository(IRepository[T]):
    """SQLAlchemy 기반 범용 Repository."""

    model: type[T]

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, id: Any) -> T | None:
        """PK로 엔티티 조회."""
        return await self.session.get(self.model, id)

    async def get_all(self, *, limit: int = 100, offset: int = 0) -> list[T]:
        """전체 엔티티 목록 조회."""
        stmt = select(self.model).limit(limit).offset(offset)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def create(self, **kwargs: Any) -> T:
        """엔티티 생성."""
        instance = self.model(**kwargs)
        self.session.add(instance)
        await self.session.flush()
        return instance

    async def update(self, id: Any, **kwargs: Any) -> T | None:
        """엔티티 수정."""
        instance = await self.get_by_id(id)
        if instance is None:
            return None
        for key, value in kwargs.items():
            setattr(instance, key, value)
        await self.session.flush()
        return instance

    async def delete(self, id: Any) -> bool:
        """엔티티 삭제."""
        instance = await self.get_by_id(id)
        if instance is None:
            return False
        await self.session.delete(instance)
        await self.session.flush()
        return True
