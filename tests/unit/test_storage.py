"""
스토리지 유닛 테스트
"""
import pytest
from src.app.infrastructure.storage.local_provider import encode_username


def test_encode_username():
  """사용자명 인코딩"""
  encoded = encode_username('testuser')
  assert isinstance(encoded, str)
  assert len(encoded) > 0
  # 같은 입력은 항상 같은 결과
  assert encode_username('testuser') == encoded


def test_encode_username_different():
  """다른 사용자명은 다른 결과"""
  e1 = encode_username('user1')
  e2 = encode_username('user2')
  assert e1 != e2
