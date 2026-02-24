"""
Gemini 어댑터 (Google AI, httpx 직접)
"""
from typing import AsyncIterator
import httpx
from src.app.infrastructure.adapters.base_adapter import BaseAdapter
from src.app.core.config import get_settings


class GeminiAdapter(BaseAdapter):
  """Google Gemini API 어댑터 (헤더 키 방식)"""

  API_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

  async def chat(self, messages: list[dict], options: dict | None = None) -> str:
    options = options or {}
    settings = get_settings()
    model = options.get('model', 'gemini-2.0-flash')

    # OpenAI 형식 → Gemini 형식 변환
    contents = []
    for m in messages:
      role = 'model' if m['role'] == 'assistant' else 'user'
      if m['role'] != 'system':
        contents.append({'role': role, 'parts': [{'text': m['content']}]})

    system_instruction = None
    for m in messages:
      if m['role'] == 'system':
        system_instruction = {'parts': [{'text': m['content']}]}
        break

    async def _do():
      async with httpx.AsyncClient(timeout=self._get_timeout()) as client:
        body = {'contents': contents}
        if system_instruction:
          body['systemInstruction'] = system_instruction

        resp = await client.post(
          f'{self.API_URL}/{model}:generateContent?key={settings.GEMINI_API_KEY}',
          json=body,
        )
        resp.raise_for_status()
        data = resp.json()
        return data['candidates'][0]['content']['parts'][0]['text']

    return await self._retry_request(_do)

  async def stream(self, messages: list[dict], options: dict | None = None) -> AsyncIterator[str]:
    options = options or {}
    settings = get_settings()
    model = options.get('model', 'gemini-2.0-flash')

    contents = []
    for m in messages:
      role = 'model' if m['role'] == 'assistant' else 'user'
      if m['role'] != 'system':
        contents.append({'role': role, 'parts': [{'text': m['content']}]})

    body = {'contents': contents}

    async with httpx.AsyncClient(timeout=self._get_timeout()) as client:
      async with client.stream(
        'POST',
        f'{self.API_URL}/{model}:streamGenerateContent?key={settings.GEMINI_API_KEY}&alt=sse',
        json=body,
      ) as resp:
        resp.raise_for_status()
        async for line in resp.aiter_lines():
          if line.startswith('data: '):
            import json
            try:
              data = json.loads(line[6:])
              parts = data.get('candidates', [{}])[0].get('content', {}).get('parts', [])
              for part in parts:
                text = part.get('text', '')
                if text:
                  yield text
            except (json.JSONDecodeError, KeyError, IndexError):
              pass

  async def get_models(self) -> list[dict]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=30) as client:
      resp = await client.get(
        f'{self.API_URL}?key={settings.GEMINI_API_KEY}',
      )
      resp.raise_for_status()
      data = resp.json()
      return [
        {'id': m['name'].replace('models/', ''), 'name': m.get('displayName', m['name'])}
        for m in data.get('models', [])
      ]
