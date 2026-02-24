"""크레딧 Repository."""

from sqlalchemy import select

from src.app.infrastructure.db.models import UsersCredit, CreditPurchaseLog, PaidCreditBatch
from src.app.infrastructure.db.repositories.base import SQLAlchemyRepository


class CreditRepository(SQLAlchemyRepository[UsersCredit]):
    """크레딧 CRUD + 조회 확장."""

    model = UsersCredit

    async def get_by_user_id(self, user_id: str) -> UsersCredit | None:
        """user_id로 크레딧 정보 조회."""
        return await self.session.get(UsersCredit, user_id)

    async def get_active_batches(self, user_id: str) -> list[PaidCreditBatch]:
        """FIFO 순서로 활성 유료 크레딧 배치 조회."""
        stmt = (
            select(PaidCreditBatch)
            .where(PaidCreditBatch.user_id == user_id, PaidCreditBatch.status == 'active')
            .order_by(PaidCreditBatch.purchased_at)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_purchase_history(self, user_id: str, *, limit: int = 50) -> list[CreditPurchaseLog]:
        """구매 내역 최신순 조회."""
        stmt = (
            select(CreditPurchaseLog)
            .where(CreditPurchaseLog.user_id == user_id)
            .order_by(CreditPurchaseLog.purchase_timestamp.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
