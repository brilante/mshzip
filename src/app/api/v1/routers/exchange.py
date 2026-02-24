"""
환율 API 라우터
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.infrastructure.db.session import get_db
from src.app.infrastructure.db.models import ExchangeRate

router = APIRouter(prefix='/api/exchange', tags=['exchange'])


class ConvertRequest(BaseModel):
  amount: float
  currency: str


@router.get('/rates')
async def get_rates(db: AsyncSession = Depends(get_db)):
  """모든 환율 조회"""
  result = await db.execute(select(ExchangeRate))
  rates = result.scalars().all()
  data = {}
  for r in rates:
    data[r.currency_code] = {
      'currency_code': r.currency_code,
      'currency_name': r.currency_name,
      'rate': float(r.rate) if r.rate else 0,
      'updated_at': r.updated_at.isoformat() if r.updated_at else None,
    }
  return {'success': True, 'data': {'rates': data}, 'error': None}


@router.get('/rate/{currency}')
async def get_rate(currency: str, db: AsyncSession = Depends(get_db)):
  """특정 통화 환율"""
  result = await db.execute(
    select(ExchangeRate).where(ExchangeRate.currency_code == currency.upper())
  )
  rate = result.scalar_one_or_none()
  if not rate:
    raise HTTPException(status_code=404, detail=f'통화 미지원: {currency}')
  return {
    'success': True,
    'data': {
      'currency_code': rate.currency_code,
      'currency_name': rate.currency_name,
      'rate': float(rate.rate) if rate.rate else 0,
      'updated_at': rate.updated_at.isoformat() if rate.updated_at else None,
    },
    'error': None,
  }


@router.post('/convert')
async def convert_price(body: ConvertRequest, db: AsyncSession = Depends(get_db)):
  """가격 변환 (USD → 다른 통화)"""
  result = await db.execute(
    select(ExchangeRate).where(ExchangeRate.currency_code == body.currency.upper())
  )
  rate = result.scalar_one_or_none()
  if not rate:
    raise HTTPException(status_code=404, detail=f'통화 미지원: {body.currency}')
  converted = body.amount * (float(rate.rate) if rate.rate else 0)
  return {
    'success': True,
    'data': {
      'original_amount': body.amount,
      'currency': body.currency.upper(),
      'rate': float(rate.rate) if rate.rate else 0,
      'converted_amount': round(converted, 2),
    },
    'error': None,
  }


@router.get('/last-update')
async def last_update(db: AsyncSession = Depends(get_db)):
  """마지막 업데이트 시간"""
  result = await db.execute(
    select(ExchangeRate).order_by(ExchangeRate.updated_at.desc()).limit(1)
  )
  rate = result.scalar_one_or_none()
  return {
    'success': True,
    'data': {
      'last_update': rate.updated_at.isoformat() if rate and rate.updated_at else None,
    },
    'error': None,
  }
