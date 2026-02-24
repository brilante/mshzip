"""
크레딧 서비스 (잔액 조회, 차감, 일일 무료 크레딧)
"""
from datetime import date, datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.infrastructure.db.models import UserCredits, CreditUsageLog, TokenUsage


async def get_balance(db: AsyncSession, user_id: str) -> dict:
  """크레딧 잔액 조회"""
  credits = await db.get(UserCredits, user_id)
  if not credits:
    return {
      'free_credits': 0,
      'service_credits': 0,
      'paid_credits': 0,
      'total': 0,
      'user_type': 'free',
      'subscription_status': 'inactive',
    }

  total = (credits.free_credits or 0) + (credits.service_credits or 0) + (credits.paid_credits or 0)
  return {
    'free_credits': credits.free_credits or 0,
    'service_credits': credits.service_credits or 0,
    'paid_credits': credits.paid_credits or 0,
    'total': total,
    'user_type': credits.user_type,
    'subscription_status': credits.subscription_status,
    'subscription_package': credits.subscription_package,
    'subscription_end_date': str(credits.subscription_end_date) if credits.subscription_end_date else None,
  }


async def deduct_credits(
  db: AsyncSession,
  user_id: str,
  amount: int,
  ai_service: str,
  model_name: str,
  input_tokens: int = 0,
  output_tokens: int = 0,
) -> bool:
  """크레딧 차감 (무료 → 서비스 → 유료 순서)"""
  credits = await db.get(UserCredits, user_id)
  if not credits:
    return False

  remaining = amount

  # 1. 무료 크레딧
  if credits.free_credits and credits.free_credits > 0:
    deducted = min(remaining, credits.free_credits)
    credits.free_credits -= deducted
    remaining -= deducted
    credit_type = 'free'

  # 2. 서비스 크레딧
  if remaining > 0 and credits.service_credits and credits.service_credits > 0:
    deducted = min(remaining, credits.service_credits)
    credits.service_credits -= deducted
    remaining -= deducted
    credit_type = 'service'

  # 3. 유료 크레딧
  if remaining > 0 and credits.paid_credits and credits.paid_credits > 0:
    deducted = min(remaining, credits.paid_credits)
    credits.paid_credits -= deducted
    remaining -= deducted
    credit_type = 'paid'

  if remaining > 0:
    return False  # 크레딧 부족

  # 사용량 로그 기록
  usage_log = CreditUsageLog(
    user_id=user_id,
    user_type=credits.user_type,
    ai_service=ai_service,
    model_name=model_name,
    input_tokens=input_tokens,
    output_tokens=output_tokens,
    total_tokens=input_tokens + output_tokens,
    credit_type=credit_type,
    credits_deducted=amount,
    status='success',
  )
  db.add(usage_log)
  credits.updated_at = datetime.utcnow()
  await db.flush()
  return True


async def get_usage(db: AsyncSession, user_id: str, days: int = 30) -> list[dict]:
  """사용량 조회"""
  from datetime import timedelta
  since = datetime.utcnow() - timedelta(days=days)
  result = await db.execute(
    select(CreditUsageLog)
    .where(CreditUsageLog.user_id == user_id, CreditUsageLog.created_at >= since)
    .order_by(CreditUsageLog.created_at.desc())
    .limit(100)
  )
  logs = result.scalars().all()
  return [
    {
      'service': log.ai_service,
      'model': log.model_name,
      'credits': log.credits_deducted,
      'tokens': log.total_tokens,
      'type': log.credit_type,
      'date': log.created_at.isoformat() if log.created_at else None,
    }
    for log in logs
  ]
