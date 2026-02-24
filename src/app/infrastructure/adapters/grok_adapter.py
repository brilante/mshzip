"""
Grok 어댑터 (xAI, OpenAI 호환 API)
"""
from typing import AsyncIterator
import httpx
from src.app.infrastructure.adapters.base_adapter import BaseAdapter
from src.app.core.config import get_settings


class GrokAdapter(BaseAdapter):
  """xAI Grok API 어댑터 (OpenAI 호환 base_url 변경)"""

  API_URL = 'https://api.x.ai/v1/chat/completions'

  async def chat(self, messages: list[dict], options: dict | None = None) -> str:
    options = options or {}
    settings = get_settings()

    async def _do():
      async with httpx.AsyncClient(timeout=self._get_timeout()) as client:
        resp = await client.post(
          self.API_URL,
          headers={'Authorization': f'Bearer {settings.GROK_API_KEY}'},
          json={
            'model': options.get('model', 'grok-2-latest'),
            'messages': messages,
            'temperature': options.get('temperature', 0.7),
            'max_tokens': options.get('maxTokens', 4096),
          },
        )
        resp.raise_for_status()
        data = resp.json()
        return data['choices'][0]['message']['content']

    return await self._retry_request(_do)

  async def stream(self, messages: list[dict], options: dict | None = None) -> AsyncIterator[str]:
    options = options or {}
    settings = get_settings()

    async with httpx.AsyncClient(timeout=self._get_timeout()) as client:
      async with client.stream(
        'POST',
        self.API_URL,
        headers={'Authorization': f'Bearer {settings.GROK_API_KEY}'},
        json={
          'model': options.get('model', 'grok-2-latest'),
          'messages': messages,
          'temperature': options.get('temperature', 0.7),
          'stream': True,
        },
      ) as resp:
        resp.raise_for_status()
        async for line in resp.aiter_lines():
          if line.startswith('data: ') and line != 'data: [DONE]':
            import json
            try:
              data = json.loads(line[6:])
              content = data['choices'][0].get('delta', {}).get('content', '')
              if content:
                yield content
            except (json.JSONDecodeError, KeyError, IndexError):
              pass

  async def get_models(self) -> list[dict]:
    return [
      {'id': 'grok-2-latest', 'name': 'Grok 2'},
      {'id': 'grok-3-latest', 'name': 'Grok 3'},
    ]
