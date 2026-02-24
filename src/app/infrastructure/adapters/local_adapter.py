"""
로컬 AI 어댑터 (LM Studio 등 로컬 서버)
"""
from typing import AsyncIterator
import httpx
from src.app.infrastructure.adapters.base_adapter import BaseAdapter


class LocalAdapter(BaseAdapter):
  """로컬 AI 서버 어댑터 (OpenAI 호환)"""

  DEFAULT_URL = 'http://localhost:1234/v1/chat/completions'

  async def chat(self, messages: list[dict], options: dict | None = None) -> str:
    options = options or {}
    url = options.get('baseUrl', self.DEFAULT_URL)

    async def _do():
      async with httpx.AsyncClient(timeout=self._get_timeout()) as client:
        resp = await client.post(
          url,
          json={
            'model': options.get('model', 'local-model'),
            'messages': messages,
            'temperature': options.get('temperature', 0.7),
          },
        )
        resp.raise_for_status()
        data = resp.json()
        return data['choices'][0]['message']['content']

    return await self._retry_request(_do)

  async def stream(self, messages: list[dict], options: dict | None = None) -> AsyncIterator[str]:
    options = options or {}
    url = options.get('baseUrl', self.DEFAULT_URL)

    async with httpx.AsyncClient(timeout=self._get_timeout()) as client:
      async with client.stream(
        'POST',
        url,
        json={
          'model': options.get('model', 'local-model'),
          'messages': messages,
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
    try:
      async with httpx.AsyncClient(timeout=5) as client:
        resp = await client.get('http://localhost:1234/v1/models')
        resp.raise_for_status()
        data = resp.json()
        return [{'id': m['id'], 'name': m['id']} for m in data.get('data', [])]
    except Exception:
      return []
