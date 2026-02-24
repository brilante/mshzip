"""전역 상수 정의."""

# AI 서비스 식별자
AI_SERVICE_GPT = 'gpt'
AI_SERVICE_CLAUDE = 'claude'
AI_SERVICE_GEMINI = 'gemini'
AI_SERVICE_GROK = 'grok'
AI_SERVICE_LOCAL = 'local'

AI_SERVICES = [AI_SERVICE_GPT, AI_SERVICE_CLAUDE, AI_SERVICE_GEMINI, AI_SERVICE_GROK, AI_SERVICE_LOCAL]

# 세션
SESSION_COOKIE_NAME = 'mymind3_session'
SESSION_MAX_AGE = 3600  # 1시간

# 파일 제한
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.json', '.html', '.txt', '.md', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf'}

# 크레딧
FREE_DAILY_CREDITS = 0.05  # USD

# 구독 타입
SUBSCRIPTION_LITE = 'lite'
SUBSCRIPTION_PRO = 'pro'
SUBSCRIPTION_ULTRA = 'ultra'
