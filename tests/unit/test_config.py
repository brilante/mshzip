"""
설정 유닛 테스트
"""
import os
import pytest


def test_settings_defaults():
  """기본 설정값 확인"""
  from src.app.core.config import Settings

  settings = Settings(
    APP_ENV='local',
    DEBUG=False,
    DATABASE_URL='sqlite+aiosqlite:///test.db',
    SESSION_SECRET='test',
    _env_file=None,
  )
  assert settings.APP_ENV == 'local'
  assert settings.PORT == 5858
  assert settings.DEBUG is False


def test_settings_cors_origins():
  """CORS origins 리스트"""
  from src.app.core.config import Settings

  settings = Settings(
    DATABASE_URL='sqlite+aiosqlite:///test.db',
    SESSION_SECRET='test',
    CORS_ORIGINS=['http://localhost:3000', 'http://localhost:5858'],
    _env_file=None,
  )
  assert 'http://localhost:3000' in settings.CORS_ORIGINS
  assert 'http://localhost:5858' in settings.CORS_ORIGINS
