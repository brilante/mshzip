"""
AI 어댑터 팩토리 유닛 테스트
"""
import pytest
from src.app.infrastructure.adapters.factory import get_adapter, get_available_services


def test_get_adapter_gpt():
  """GPT 어댑터 반환"""
  adapter = get_adapter('gpt')
  assert adapter.__class__.__name__ == 'OpenAIAdapter'


def test_get_adapter_claude():
  """Claude 어댑터 반환"""
  adapter = get_adapter('claude')
  assert adapter.__class__.__name__ == 'ClaudeAdapter'


def test_get_adapter_gemini():
  """Gemini 어댑터 반환"""
  adapter = get_adapter('gemini')
  assert adapter.__class__.__name__ == 'GeminiAdapter'


def test_get_adapter_grok():
  """Grok 어댑터 반환"""
  adapter = get_adapter('grok')
  assert adapter.__class__.__name__ == 'GrokAdapter'


def test_get_adapter_local():
  """Local 어댑터 반환"""
  adapter = get_adapter('local')
  assert adapter.__class__.__name__ == 'LocalAdapter'


def test_get_adapter_case_insensitive():
  """대소문자 무관"""
  adapter = get_adapter('GPT')
  assert adapter.__class__.__name__ == 'OpenAIAdapter'


def test_get_adapter_alias():
  """별칭 지원"""
  assert get_adapter('openai').__class__.__name__ == 'OpenAIAdapter'
  assert get_adapter('anthropic').__class__.__name__ == 'ClaudeAdapter'
  assert get_adapter('google').__class__.__name__ == 'GeminiAdapter'
  assert get_adapter('xai').__class__.__name__ == 'GrokAdapter'


def test_get_adapter_unknown():
  """미지원 서비스"""
  with pytest.raises(ValueError, match='지원하지 않는'):
    get_adapter('unknown_service')


def test_get_available_services():
  """사용 가능한 서비스 목록"""
  services = get_available_services()
  assert isinstance(services, list)
  assert len(services) >= 5  # 최소 5개 어댑터
