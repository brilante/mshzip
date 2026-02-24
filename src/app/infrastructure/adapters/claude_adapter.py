"""
Claude 어댑터 (Anthropic API)
"""
from typing import AsyncIterator
import httpx
from src.app.infrastructure.adapters.base_adapter import BaseAdapter
from src.app.core.config import get_settings


class ClaudeAdapter(BaseAdapter):
  """Anthropic Claude API 어댑터"""

  API_URL = 'https://api.anthropic.com/v1/messages'
  API_VERSION = '2023-06-01'

  async def chat(self, messages: list[dict], options: dict | None = None) -> str:
    options = options or {}
    settings = get_settings()

    # OpenAI 형식 → Anthropic 형식 변환
    system_msg = ''
    chat_messages = []
    for m in messages:
      if m['role'] == 'system':
        system_msg = m['content']
      else:
        chat_messages.append({'role': m['role'], 'content': m['content']})

    async def _do():
      async with httpx.AsyncClient(timeout=self._get_timeout()) as client:
        body = {
          'model': options.get('model', 'claude-sonnet-4-20250514'),
          'messages': chat_messages,
          'max_tokens': options.get('maxTokens', 4096),
        }
        if system_msg:
          body['system'] = system_msg

        resp = await client.post(
          self.API_URL,
          headers={
            'x-api-key': settings.ANTHROPIC_API_KEY,
            'anthropic-version': self.API_VERSION,
            'content-type': 'application/json',
          },
          json=body,
        )
        resp.raise_for_status()
        data = resp.json()
        return data['content'][0]['text']

    return await self._retry_request(_do)

  async def stream(self, messages: list[dict], options: dict | None = None) -> AsyncIterator[str]:
    options = options or {}
    settings = get_settings()

    system_msg = ''
    chat_messages = []
    for m in messages:
      if m['role'] == 'system':
        system_msg = m['content']
      else:
        chat_messages.append({'role': m['role'], 'content': m['content']})

    body = {
      'model': options.get('model', 'claude-sonnet-4-20250514'),
      'messages': chat_messages,
      'max_tokens': options.get('maxTokens', 4096),
      'stream': True,
    }
    if system_msg:
      body['system'] = system_msg

    async with httpx.AsyncClient(timeout=self._get_timeout()) as client:
      async with client.stream(
        'POST',
        self.API_URL,
        headers={
          'x-api-key': settings.ANTHROPIC_API_KEY,
          'anthropic-version': self.API_VERSION,
          'content-type': 'application/json',
        },
        json=body,
      ) as resp:
        resp.raise_for_status()
        async for line in resp.aiter_lines():
          if line.startswith('data: '):
            import json
            try:
              data = json.loads(line[6:])
              if data.get('type') == 'content_block_delta':
                text = data.get('delta', {}).get('text', '')
                if text:
                  yield text
            except (json.JSONDecodeError, KeyError):
              pass

  async def get_models(self) -> list[dict]:
    return [
      {'id': 'claude-opus-4-20250514', 'name': 'Claude Opus 4'},
      {'id': 'claude-sonnet-4-20250514', 'name': 'Claude Sonnet 4'},
      {'id': 'claude-haiku-4-20250514', 'name': 'Claude Haiku 4'},
    ]
