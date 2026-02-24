"""사용자 Repository."""

from sqlalchemy import select

from src.app.infrastructure.db.models import User
from src.app.infrastructure.db.repositories.base import SQLAlchemyRepository


class UserRepository(SQLAlchemyRepository[User]):
    """사용자 CRUD + 조회 확장."""

    model = User

    async def get_by_username(self, username: str) -> User | None:
        """username으로 조회."""
        stmt = select(User).where(User.username == username)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_google_id(self, google_id: str) -> User | None:
        """Google OAuth ID로 조회."""
        stmt = select(User).where(User.google_id == google_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """이메일로 조회."""
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
