"""
OpenAI 어댑터 (GPT 시리즈)
"""
from typing import AsyncIterator
import httpx
from src.app.infrastructure.adapters.base_adapter import BaseAdapter, sanitize_error
from src.app.core.config import get_settings


class OpenAIAdapter(BaseAdapter):
  """OpenAI API 어댑터"""

  async def chat(self, messages: list[dict], options: dict | None = None) -> str:
    options = options or {}
    settings = get_settings()

    async def _do():
      async with httpx.AsyncClient(timeout=self._get_timeout()) as client:
        resp = await client.post(
          'https://api.openai.com/v1/chat/completions',
          headers={'Authorization': f'Bearer {settings.OPENAI_API_KEY}'},
          json={
            'model': options.get('model', 'gpt-4o-mini'),
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
        'https://api.openai.com/v1/chat/completions',
        headers={'Authorization': f'Bearer {settings.OPENAI_API_KEY}'},
        json={
          'model': options.get('model', 'gpt-4o-mini'),
          'messages': messages,
          'temperature': options.get('temperature', 0.7),
          'max_tokens': options.get('maxTokens', 4096),
          'stream': True,
        },
      ) as resp:
        resp.raise_for_status()
        async for line in resp.aiter_lines():
          if line.startswith('data: ') and line != 'data: [DONE]':
            import json
            try:
              data = json.loads(line[6:])
              delta = data['choices'][0].get('delta', {})
              content = delta.get('content', '')
              if content:
                yield content
            except (json.JSONDecodeError, KeyError, IndexError):
              pass

  async def get_models(self) -> list[dict]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=30) as client:
      resp = await client.get(
        'https://api.openai.com/v1/models',
        headers={'Authorization': f'Bearer {settings.OPENAI_API_KEY}'},
      )
      resp.raise_for_status()
      data = resp.json()
      return [
        {'id': m['id'], 'name': m['id'], 'owned_by': m.get('owned_by', '')}
        for m in data.get('data', [])
      ]
