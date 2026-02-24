"""
크레딧 서비스 유닛 테스트
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from src.app.domain.services.credit_service import get_balance, deduct_credits, get_usage


@pytest.mark.asyncio
async def test_get_balance_no_credits(mock_db):
  """크레딧 레코드가 없는 사용자"""
  mock_db.get = AsyncMock(return_value=None)
  result = await get_balance(mock_db, 'nouser')
  assert result['total'] == 0
  assert result['user_type'] == 'free'
  assert result['subscription_status'] == 'inactive'


@pytest.mark.asyncio
async def test_get_balance_with_credits(mock_db):
  """크레딧이 있는 사용자"""
  credits = MagicMock()
  credits.free_credits = 100
  credits.service_credits = 200
  credits.paid_credits = 300
  credits.user_type = 'premium'
  credits.subscription_status = 'active'
  credits.subscription_package = 'standard'
  credits.subscription_end_date = None

  mock_db.get = AsyncMock(return_value=credits)
  result = await get_balance(mock_db, 'testuser')

  assert result['total'] == 600
  assert result['free_credits'] == 100
  assert result['service_credits'] == 200
  assert result['paid_credits'] == 300
  assert result['user_type'] == 'premium'


@pytest.mark.asyncio
async def test_deduct_credits_insufficient(mock_db):
  """크레딧 부족"""
  credits = MagicMock()
  credits.free_credits = 10
  credits.service_credits = 0
  credits.paid_credits = 0

  mock_db.get = AsyncMock(return_value=credits)
  result = await deduct_credits(mock_db, 'testuser', 100, 'gpt', 'gpt-4')
  assert result is False


@pytest.mark.asyncio
async def test_deduct_credits_success(mock_db):
  """정상 크레딧 차감 (무료 → 서비스 → 유료 순서)"""
  credits = MagicMock()
  credits.free_credits = 30
  credits.service_credits = 50
  credits.paid_credits = 100
  credits.user_type = 'premium'

  mock_db.get = AsyncMock(return_value=credits)
  result = await deduct_credits(
    mock_db, 'testuser', 50, 'claude', 'claude-3',
    input_tokens=1000, output_tokens=500,
  )
  assert result is True
  # 무료 30 먼저 차감 → 나머지 20은 서비스에서
  assert credits.free_credits == 0
  assert credits.service_credits == 30


@pytest.mark.asyncio
async def test_deduct_credits_no_record(mock_db):
  """크레딧 레코드 없음"""
  mock_db.get = AsyncMock(return_value=None)
  result = await deduct_credits(mock_db, 'nouser', 10, 'gpt', 'gpt-4')
  assert result is False
