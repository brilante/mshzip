"""
구독 패키지 API 라우터
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.app.infrastructure.db.session import get_db
from src.app.infrastructure.db.models import SubscriptionPackage

router = APIRouter(prefix='/api/packages', tags=['packages'])


def _package_to_dict(pkg) -> dict:
  """패키지 모델을 dict로 변환"""
  return {
    'package_type': pkg.package_type,
    'name': pkg.name,
    'display_name': pkg.display_name,
    'base_price': float(pkg.base_price) if pkg.base_price else 0,
    'price_usd': float(pkg.price_usd) if pkg.price_usd else 0,
    'base_usage': pkg.base_usage,
    'bonus_rate': float(pkg.bonus_rate) if pkg.bonus_rate else 0,
    'bonus_usage': pkg.bonus_usage,
    'total_usage': pkg.total_usage,
    'expire_days': pkg.expire_days,
    'target': pkg.target,
    'sort_order': pkg.sort_order,
    'is_popular': pkg.is_popular,
  }


@router.get('/')
async def get_packages(db: AsyncSession = Depends(get_db)):
  """모든 활성 패키지 조회"""
  result = await db.execute(
    select(SubscriptionPackage)
    .where(SubscriptionPackage.is_active == True)
    .order_by(SubscriptionPackage.sort_order)
  )
  packages = result.scalars().all()
  return {
    'success': True,
    'data': {'packages': [_package_to_dict(p) for p in packages]},
    'error': None,
  }


@router.get('/{package_type}')
async def get_package(package_type: str, db: AsyncSession = Depends(get_db)):
  """특정 패키지 상세"""
  result = await db.execute(
    select(SubscriptionPackage)
    .where(SubscriptionPackage.package_type == package_type)
  )
  pkg = result.scalar_one_or_none()
  if not pkg:
    raise HTTPException(status_code=404, detail=f'패키지 없음: {package_type}')
  return {
    'success': True,
    'data': {'package': _package_to_dict(pkg)},
    'error': None,
  }
