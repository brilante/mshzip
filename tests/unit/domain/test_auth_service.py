"""
인증 서비스 유닛 테스트
"""
import pytest
from src.app.domain.services.auth_service import hash_password, verify_password, generate_token


def test_hash_password():
  """비밀번호 해싱"""
  hashed = hash_password('testpassword123')
  assert hashed != 'testpassword123'
  assert hashed.startswith('$argon2')


def test_verify_password_correct():
  """올바른 비밀번호 검증"""
  hashed = hash_password('mypassword')
  assert verify_password('mypassword', hashed) is True


def test_verify_password_wrong():
  """잘못된 비밀번호 검증"""
  hashed = hash_password('correct_password')
  assert verify_password('wrong_password', hashed) is False


def test_generate_token():
  """토큰 생성"""
  token = generate_token()
  assert isinstance(token, str)
  assert len(token) > 20  # UUID 기반이므로 충분히 길어야 함


def test_generate_token_unique():
  """토큰 유일성"""
  token1 = generate_token()
  token2 = generate_token()
  assert token1 != token2
