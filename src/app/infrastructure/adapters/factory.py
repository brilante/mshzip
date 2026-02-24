"""
AI 어댑터 팩토리
"""
from src.app.domain.ports.ai_adapter import IAIAdapter
from src.app.infrastructure.adapters.openai_adapter import OpenAIAdapter
from src.app.infrastructure.adapters.claude_adapter import ClaudeAdapter
from src.app.infrastructure.adapters.gemini_adapter import GeminiAdapter
from src.app.infrastructure.adapters.grok_adapter import GrokAdapter
from src.app.infrastructure.adapters.local_adapter import LocalAdapter

_ADAPTERS: dict[str, type[IAIAdapter]] = {
  'gpt': OpenAIAdapter,
  'openai': OpenAIAdapter,
  'claude': ClaudeAdapter,
  'anthropic': ClaudeAdapter,
  'gemini': GeminiAdapter,
  'google': GeminiAdapter,
  'grok': GrokAdapter,
  'xai': GrokAdapter,
  'local': LocalAdapter,
}


def get_adapter(service: str) -> IAIAdapter:
  """서비스명으로 어댑터 인스턴스 반환"""
  adapter_cls = _ADAPTERS.get(service.lower())
  if not adapter_cls:
    raise ValueError(f'지원하지 않는 AI 서비스: {service}')
  return adapter_cls()


def get_available_services() -> list[str]:
  """사용 가능한 서비스 목록"""
  return list(set(cls.__name__ for cls in _ADAPTERS.values()))
