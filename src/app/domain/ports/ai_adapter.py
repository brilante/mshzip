"""
AI 어댑터 인터페이스 (도메인 포트)
"""
from abc import ABC, abstractmethod
from typing import AsyncIterator


class IAIAdapter(ABC):
  """AI 서비스 어댑터 추상 인터페이스"""

  @abstractmethod
  async def chat(self, messages: list[dict], options: dict | None = None) -> str:
    """동기 채팅 (전체 응답 반환)"""
    ...

  @abstractmethod
  async def stream(self, messages: list[dict], options: dict | None = None) -> AsyncIterator[str]:
    """스트리밍 채팅 (청크별 반환)"""
    ...

  @abstractmethod
  async def get_models(self) -> list[dict]:
    """사용 가능한 모델 목록"""
    ...
