"""
AI 어댑터 공통 기반 클래스
재시도, 에러 마스킹, 타임아웃 처리
"""
import httpx
from src.app.domain.ports.ai_adapter import IAIAdapter
from src.app.core.logging import get_logger

log = get_logger('ai_adapter')

MAX_RETRIES = 3
DEFAULT_TIMEOUT = 600  # 10분 (SSE/Reasoning 모델)


def sanitize_error(error: Exception) -> str:
  """에러 메시지에서 API 키/URL 제거"""
  msg = str(error)
  # API 키 패턴 마스킹
  import re
  msg = re.sub(r'sk-[a-zA-Z0-9]{20,}', 'sk-***', msg)
  msg = re.sub(r'key-[a-zA-Z0-9]{20,}', 'key-***', msg)
  return msg


class BaseAdapter(IAIAdapter):
  """어댑터 공통 로직"""

  def _get_timeout(self) -> float:
    return DEFAULT_TIMEOUT

  async def _retry_request(self, fn, retries: int = MAX_RETRIES):
    """공통 재시도 로직"""
    last_error = None
    for attempt in range(retries):
      try:
        return await fn()
      except httpx.HTTPStatusError as e:
        last_error = e
        if e.response.status_code == 429:
          # Rate limit: Retry-After 헤더 준수
          import asyncio
          retry_after = int(e.response.headers.get('Retry-After', 2 ** attempt))
          log.warning('rate_limit', service=self.__class__.__name__, retry_after=retry_after)
          await asyncio.sleep(retry_after)
        elif e.response.status_code >= 500:
          import asyncio
          await asyncio.sleep(2 ** attempt)
        else:
          raise
      except (httpx.ConnectError, httpx.ReadTimeout) as e:
        last_error = e
        import asyncio
        await asyncio.sleep(2 ** attempt)

    raise last_error
