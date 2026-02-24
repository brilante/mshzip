"""게시판 Repository."""

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.app.infrastructure.db.models import Board, BoardPost
from src.app.infrastructure.db.repositories.base import SQLAlchemyRepository


class BoardRepository(SQLAlchemyRepository[Board]):
    """게시판 CRUD + 조회 확장."""

    model = Board

    async def get_by_key(self, board_key: str) -> Board | None:
        """board_key로 조회."""
        stmt = select(Board).where(Board.board_key == board_key)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_public_boards(self) -> list[Board]:
        """공개 게시판 목록 조회 (정렬순)."""
        stmt = (
            select(Board)
            .where(Board.is_public.is_(True))
            .order_by(Board.sort_order)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_posts(self, board_id: int, *, limit: int = 20, offset: int = 0) -> list[BoardPost]:
        """게시판의 글 목록 조회 (고정글 우선, 최신순)."""
        stmt = (
            select(BoardPost)
            .where(BoardPost.board_id == board_id, BoardPost.status == 'active')
            .order_by(BoardPost.is_pinned.desc(), BoardPost.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
