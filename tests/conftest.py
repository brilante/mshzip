"""
테스트 설정 (conftest.py)
"""
import os
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock

# 테스트 환경 변수 설정
os.environ.setdefault('APP_ENV', 'test')
os.environ.setdefault('DATABASE_URL', 'sqlite+aiosqlite:///test.db')
os.environ.setdefault('REDIS_URL', 'redis://localhost:6379/1')
os.environ.setdefault('SESSION_SECRET', 'test-secret-key-for-testing')


@pytest.fixture
def mock_db():
  """모의 AsyncSession"""
  db = AsyncMock()
  db.execute = AsyncMock()
  db.flush = AsyncMock()
  db.add = MagicMock()
  db.get = AsyncMock(return_value=None)
  db.delete = AsyncMock()
  return db


@pytest.fixture
def mock_user():
  """테스트 사용자"""
  user = MagicMock()
  user.id = 1
  user.username = 'testuser'
  user.email = 'test@test.com'
  user.display_name = 'Test User'
  user.auth_provider = 'local'
  return user
