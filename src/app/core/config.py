"""애플리케이션 설정 - Pydantic Settings 기반 환경변수 관리."""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """환경변수에서 자동 로드되는 설정."""

    # 앱 기본
    APP_NAME: str = 'MyMind3'
    APP_VERSION: str = '0.1.0'
    DEBUG: bool = False
    PORT: int = 8000

    # DB
    DATABASE_URL: str = 'postgresql+asyncpg://postgres:postgres@localhost:5432/mymind3'

    # Redis
    REDIS_URL: str = 'redis://localhost:6379/0'

    # 보안
    SECRET_KEY: str = 'change-me-in-production'
    ENCRYPTION_KEY: str = ''
    SESSION_TTL: int = 3600  # 1시간

    # AI API 키
    OPENAI_API_KEY: str = ''
    ANTHROPIC_API_KEY: str = ''
    GOOGLE_API_KEY: str = ''
    XAI_API_KEY: str = ''
    OPENROUTER_API_KEY: str = ''

    # Stripe
    STRIPE_SECRET_KEY: str = ''
    STRIPE_PUBLISHABLE_KEY: str = ''
    STRIPE_WEBHOOK_SECRET: str = ''

    # OAuth
    GOOGLE_CLIENT_ID: str = ''
    GOOGLE_CLIENT_SECRET: str = ''
    FACEBOOK_APP_ID: str = ''
    FACEBOOK_APP_SECRET: str = ''

    # SMTP
    SMTP_HOST: str = 'smtp.gmail.com'
    SMTP_PORT: int = 587
    SMTP_USER: str = ''
    SMTP_PASS: str = ''

    # 파일 저장
    SAVE_DIR: str = 'save'

    model_config = {
        'env_file': '.env',
        'env_file_encoding': 'utf-8',
        'case_sensitive': True,
    }


@lru_cache
def get_settings() -> Settings:
    """설정 싱글턴 반환."""
    return Settings()
