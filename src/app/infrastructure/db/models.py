"""SQLAlchemy ORM 모델 정의.

레거시 MyMind3 PostgreSQL 스키마 기반.
마이그레이션 001~064 통합.
"""

from datetime import datetime, date

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.app.infrastructure.db.session import Base


# ============================================
# 1. users (026 + 039 TOTP + 040 Facebook)
# ============================================
class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    google_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    facebook_id: Mapped[str | None] = mapped_column(String(255))
    display_name: Mapped[str | None] = mapped_column(String(255))
    auth_provider: Mapped[str] = mapped_column(String(50), default='local')
    # TOTP 2FA (039)
    totp_secret: Mapped[str | None] = mapped_column(Text)
    totp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    # 타임스탬프
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    last_login: Mapped[datetime | None] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # 관계
    backup_codes: Mapped[list['BackupCode']] = relationship(back_populates='user', cascade='all, delete-orphan')
    access_keys: Mapped[list['AccessKey']] = relationship(back_populates='user', cascade='all, delete-orphan')
    node_ids: Mapped[list['NodeId']] = relationship(back_populates='user', cascade='all, delete-orphan')

    __table_args__ = (
        Index('idx_users_email', 'email'),
        Index('idx_users_google_id', 'google_id'),
        Index('idx_users_username', 'username'),
        Index('idx_users_facebook_id', 'facebook_id'),
        Index('idx_users_totp_enabled', 'totp_enabled'),
    )


# ============================================
# 2. admin_users (013)
# ============================================
class AdminUser(Base):
    __tablename__ = 'admin_users'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    admin_password: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime)

    __table_args__ = (
        Index('idx_admin_users_user_id', 'user_id'),
        Index('idx_admin_users_active', 'is_active'),
    )


# ============================================
# 3. backup_codes (039)
# ============================================
class BackupCode(Base):
    __tablename__ = 'backup_codes'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    code_hash: Mapped[str] = mapped_column(Text, nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    used_at: Mapped[datetime | None] = mapped_column(DateTime)

    user: Mapped['User'] = relationship(back_populates='backup_codes')

    __table_args__ = (
        Index('idx_backup_codes_user_id', 'user_id'),
        Index('idx_backup_codes_code_hash', 'code_hash'),
    )


# ============================================
# 4. token_usage (001)
# ============================================
class TokenUsage(Base):
    __tablename__ = 'token_usage'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, nullable=False)
    service: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(Text, nullable=False)
    request_tokens: Mapped[int] = mapped_column(Integer, default=0)
    response_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0)
    request_type: Mapped[str | None] = mapped_column(Text)
    mindmap_id: Mapped[str | None] = mapped_column(Text)
    node_id: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index('idx_token_usage_user_created', 'user_id', 'created_at'),
        Index('idx_token_usage_service', 'service', 'model'),
        Index('idx_token_usage_created', 'created_at'),
    )


# ============================================
# 5. users_credits (002 + 014 Stripe)
# ============================================
class UsersCredit(Base):
    __tablename__ = 'users_credits'

    user_id: Mapped[str] = mapped_column(Text, primary_key=True)
    username: Mapped[str] = mapped_column(Text, nullable=False)
    user_type: Mapped[str] = mapped_column(Text, default='free')
    # 크레딧 잔액
    free_credits: Mapped[int] = mapped_column(Integer, default=0)
    service_credits: Mapped[int] = mapped_column(Integer, default=0)
    paid_credits: Mapped[int] = mapped_column(Integer, default=0)
    # 만료일
    free_credits_expiry: Mapped[date | None] = mapped_column(Date)
    service_credits_expiry: Mapped[date | None] = mapped_column(Date)
    paid_credits_expiry: Mapped[date | None] = mapped_column(Date)
    # 구독
    subscription_status: Mapped[str] = mapped_column(Text, default='inactive')
    subscription_package: Mapped[str | None] = mapped_column(Text)
    subscription_start_date: Mapped[date | None] = mapped_column(Date)
    subscription_end_date: Mapped[date | None] = mapped_column(Date)
    auto_renewal: Mapped[int] = mapped_column(Integer, default=0)
    # Stripe (014)
    stripe_customer_id: Mapped[str | None] = mapped_column(Text)
    stripe_subscription_id: Mapped[str | None] = mapped_column(Text)
    # 타임스탬프
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    # 관계
    purchase_logs: Mapped[list['CreditPurchaseLog']] = relationship(back_populates='credit_user')
    usage_logs: Mapped[list['CreditUsageLog']] = relationship(back_populates='credit_user')
    paid_batches: Mapped[list['PaidCreditBatch']] = relationship(back_populates='credit_user')

    __table_args__ = (
        Index('idx_users_credits_type', 'user_type'),
        Index('idx_users_credits_status', 'subscription_status'),
        Index('idx_users_stripe_customer', 'stripe_customer_id'),
    )


# ============================================
# 6. credit_purchase_logs (002 + 014 Stripe)
# ============================================
class CreditPurchaseLog(Base):
    __tablename__ = 'credit_purchase_logs'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, ForeignKey('users_credits.user_id'), nullable=False)
    purchase_type: Mapped[str] = mapped_column(Text, nullable=False)
    package_type: Mapped[str | None] = mapped_column(Text)
    amount_usd: Mapped[float] = mapped_column(Float, nullable=False)
    credit_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    bonus_rate: Mapped[float] = mapped_column(Float, default=0)
    bonus_credits: Mapped[int] = mapped_column(Integer, default=0)
    payment_method: Mapped[str | None] = mapped_column(Text)
    payment_status: Mapped[str] = mapped_column(Text, default='pending')
    transaction_id: Mapped[str | None] = mapped_column(Text)
    # Stripe (014)
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(Text)
    stripe_checkout_session_id: Mapped[str | None] = mapped_column(Text)
    stripe_charge_id: Mapped[str | None] = mapped_column(Text)
    stripe_refund_id: Mapped[str | None] = mapped_column(Text)
    webhook_processed_at: Mapped[datetime | None] = mapped_column(DateTime)
    # 타임스탬프
    purchase_timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    credit_user: Mapped['UsersCredit'] = relationship(back_populates='purchase_logs')

    __table_args__ = (
        Index('idx_credit_purchase_user', 'user_id'),
        Index('idx_credit_purchase_date', 'purchase_timestamp'),
        Index('idx_purchase_logs_stripe_pi', 'stripe_payment_intent_id'),
        Index('idx_purchase_logs_stripe_session', 'stripe_checkout_session_id'),
    )


# ============================================
# 7. credit_usage_logs (002)
# ============================================
class CreditUsageLog(Base):
    __tablename__ = 'credit_usage_logs'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, ForeignKey('users_credits.user_id'), nullable=False)
    user_type: Mapped[str] = mapped_column(Text, default='free')
    ai_service: Mapped[str] = mapped_column(Text, nullable=False)
    model_name: Mapped[str] = mapped_column(Text, nullable=False)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    credit_type: Mapped[str | None] = mapped_column(Text)
    credits_deducted: Mapped[int] = mapped_column(Integer, default=0)
    request_preview: Mapped[str | None] = mapped_column(Text)
    response_preview: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, default='success')
    processing_time_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    credit_user: Mapped['UsersCredit'] = relationship(back_populates='usage_logs')

    __table_args__ = (
        Index('idx_credit_usage_user', 'user_id', 'created_at'),
        Index('idx_credit_usage_service', 'ai_service', 'model_name'),
    )


# ============================================
# 8. currency_exchange_rates (002)
# ============================================
class CurrencyExchangeRate(Base):
    __tablename__ = 'currency_exchange_rates'

    id: Mapped[int] = mapped_column(primary_key=True)
    currency_code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    currency_name: Mapped[str] = mapped_column(Text, nullable=False)
    currency_symbol: Mapped[str] = mapped_column(Text, nullable=False)
    rate_to_usd: Mapped[float] = mapped_column(Float, nullable=False)
    is_active: Mapped[int] = mapped_column(Integer, default=1)
    last_updated: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ============================================
# 9. ai_model_pricing (002 + 038 per_1m)
# ============================================
class AIModelPricing(Base):
    __tablename__ = 'ai_model_pricing'

    id: Mapped[int] = mapped_column(primary_key=True)
    ai_service: Mapped[str] = mapped_column(Text, nullable=False)
    model_name: Mapped[str] = mapped_column(Text, nullable=False)
    display_name: Mapped[str | None] = mapped_column(Text)
    cost_per_1k_input: Mapped[float] = mapped_column(Float, default=0)
    cost_per_1k_output: Mapped[float] = mapped_column(Float, default=0)
    credits_per_1k_tokens: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[int] = mapped_column(Integer, default=1)
    is_default: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('ai_service', 'model_name'),
        Index('idx_ai_model_service', 'ai_service', 'is_active'),
    )


# ============================================
# 10. subscription_packages (032)
# ============================================
class SubscriptionPackage(Base):
    __tablename__ = 'subscription_packages'

    id: Mapped[int] = mapped_column(primary_key=True)
    package_type: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    display_name: Mapped[str] = mapped_column(Text, nullable=False)
    base_price: Mapped[float] = mapped_column(Float, nullable=False)
    price_usd: Mapped[float] = mapped_column(Float, nullable=False)
    vat_rate: Mapped[float] = mapped_column(Float, default=0.10)
    base_usage: Mapped[int] = mapped_column(Integer, nullable=False)
    bonus_rate: Mapped[float] = mapped_column(Float, default=0)
    bonus_usage: Mapped[int] = mapped_column(Integer, default=0)
    total_usage: Mapped[int] = mapped_column(Integer, nullable=False)
    expire_days: Mapped[int] = mapped_column(Integer, default=30)
    target: Mapped[str | None] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[int] = mapped_column(Integer, default=1)
    is_popular: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_subscription_packages_type', 'package_type'),
        Index('idx_subscription_packages_active', 'is_active', 'sort_order'),
    )


# ============================================
# 11. package_id_mapping (032)
# ============================================
class PackageIdMapping(Base):
    __tablename__ = 'package_id_mapping'

    id: Mapped[int] = mapped_column(primary_key=True)
    old_id: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    new_id: Mapped[str] = mapped_column(Text, ForeignKey('subscription_packages.package_type'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# ============================================
# 12. paid_credit_batches (052)
# ============================================
class PaidCreditBatch(Base):
    __tablename__ = 'paid_credit_batches'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, ForeignKey('users_credits.user_id'), nullable=False)
    purchase_log_id: Mapped[int | None] = mapped_column(ForeignKey('credit_purchase_logs.id'))
    original_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    remaining_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    purchased_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expires_at: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(Text, default='active')
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    credit_user: Mapped['UsersCredit'] = relationship(back_populates='paid_batches')

    __table_args__ = (
        Index('idx_paid_batches_user_status', 'user_id', 'status'),
        Index('idx_paid_batches_expires', 'expires_at', 'status'),
        Index('idx_paid_batches_fifo', 'user_id', 'status', 'purchased_at'),
    )


# ============================================
# 13. stripe_webhook_events (014)
# ============================================
class StripeWebhookEvent(Base):
    __tablename__ = 'stripe_webhook_events'

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    processed: Mapped[int] = mapped_column(Integer, default=0)
    payload: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    processed_at: Mapped[datetime | None] = mapped_column(DateTime)

    __table_args__ = (
        Index('idx_webhook_events_id', 'event_id'),
        Index('idx_webhook_events_type', 'event_type', 'processed'),
    )


# ============================================
# 14. user_drive_settings (008)
# ============================================
class UserDriveSetting(Base):
    __tablename__ = 'user_drive_settings'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    drive_enabled: Mapped[int] = mapped_column(Integer, default=0)
    drive_path: Mapped[str] = mapped_column(Text, default='/MyMind3/saves')
    access_token_encrypted: Mapped[str | None] = mapped_column(Text)
    refresh_token_encrypted: Mapped[str | None] = mapped_column(Text)
    token_expiry: Mapped[datetime | None] = mapped_column(DateTime)
    last_sync: Mapped[datetime | None] = mapped_column(DateTime)
    sync_mode: Mapped[str] = mapped_column(Text, default='two-way-manual')
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_drive_settings_user', 'user_id'),
    )


# ============================================
# 15. boards (020)
# ============================================
class Board(Base):
    __tablename__ = 'boards'

    id: Mapped[int] = mapped_column(primary_key=True)
    board_key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    icon: Mapped[str] = mapped_column(String(50), default='📋')
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_file_upload: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_comment: Mapped[bool] = mapped_column(Boolean, default=True)
    max_file_size: Mapped[int] = mapped_column(Integer, default=10485760)
    allowed_extensions: Mapped[str] = mapped_column(Text, default='jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,zip')
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    write_permission: Mapped[str] = mapped_column(String(20), default='user')
    read_permission: Mapped[str] = mapped_column(String(20), default='all')
    created_by: Mapped[str | None] = mapped_column(String(100))
    name_translations: Mapped[str | None] = mapped_column(Text)
    description_translations: Mapped[str | None] = mapped_column(Text)
    key_translations: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    posts: Mapped[list['BoardPost']] = relationship(back_populates='board', cascade='all, delete-orphan')

    __table_args__ = (
        Index('idx_boards_key', 'board_key'),
        Index('idx_boards_public', 'is_public'),
        Index('idx_boards_sort', 'sort_order'),
    )


# ============================================
# 16. board_posts (020)
# ============================================
class BoardPost(Base):
    __tablename__ = 'board_posts'

    id: Mapped[int] = mapped_column(primary_key=True)
    board_id: Mapped[int] = mapped_column(ForeignKey('boards.id', ondelete='CASCADE'), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    author_id: Mapped[str] = mapped_column(String(100), nullable=False)
    author_name: Mapped[str | None] = mapped_column(String(100))
    author_email: Mapped[str | None] = mapped_column(String(200))
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    is_pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    is_notice: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default='active')
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    board: Mapped['Board'] = relationship(back_populates='posts')
    files: Mapped[list['BoardFile']] = relationship(back_populates='post', cascade='all, delete-orphan')
    comments: Mapped[list['BoardComment']] = relationship(back_populates='post', cascade='all, delete-orphan')

    __table_args__ = (
        Index('idx_posts_board', 'board_id'),
        Index('idx_posts_author', 'author_id'),
        Index('idx_posts_status', 'status'),
        Index('idx_posts_created', 'created_at'),
    )


# ============================================
# 17. board_files (020)
# ============================================
class BoardFile(Base):
    __tablename__ = 'board_files'

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey('board_posts.id', ondelete='CASCADE'), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(100))
    download_count: Mapped[int] = mapped_column(Integer, default=0)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    post: Mapped['BoardPost'] = relationship(back_populates='files')


# ============================================
# 18. board_comments (020)
# ============================================
class BoardComment(Base):
    __tablename__ = 'board_comments'

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey('board_posts.id', ondelete='CASCADE'), nullable=False)
    parent_id: Mapped[int | None] = mapped_column(ForeignKey('board_comments.id', ondelete='CASCADE'))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    author_id: Mapped[str] = mapped_column(String(100), nullable=False)
    author_name: Mapped[str | None] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default='active')
    admin_reply: Mapped[str | None] = mapped_column(Text)
    admin_replied_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    post: Mapped['BoardPost'] = relationship(back_populates='comments')

    __table_args__ = (
        Index('idx_comments_post', 'post_id'),
        Index('idx_comments_author', 'author_id'),
        Index('idx_comments_status', 'status'),
    )


# ============================================
# 19. error_logs (012)
# ============================================
class ErrorLog(Base):
    __tablename__ = 'error_logs'

    id: Mapped[int] = mapped_column(primary_key=True)
    error_id: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    level: Mapped[str] = mapped_column(Text, nullable=False)
    level_num: Mapped[int] = mapped_column(Integer, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    stack: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str | None] = mapped_column(Text)
    user_id: Mapped[str | None] = mapped_column(Text)
    request_id: Mapped[str | None] = mapped_column(Text)
    request_path: Mapped[str | None] = mapped_column(Text)
    extra: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    retention_days: Mapped[int | None] = mapped_column(Integer)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    is_resolved: Mapped[int] = mapped_column(Integer, default=0)

    __table_args__ = (
        Index('idx_error_logs_level', 'level_num'),
        Index('idx_error_logs_created', 'created_at'),
        Index('idx_error_logs_expires', 'expires_at'),
        Index('idx_error_logs_source', 'source'),
    )


# ============================================
# 20. audit_logs (029)
# ============================================
class AuditLog(Base):
    __tablename__ = 'audit_logs'

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    event: Mapped[str] = mapped_column(String(100), nullable=False)
    sensitivity: Mapped[str] = mapped_column(String(20), default='low')
    user_id: Mapped[str | None] = mapped_column(String(255))
    session_id: Mapped[str | None] = mapped_column(String(255))
    ip: Mapped[str | None] = mapped_column(String(45))
    user_agent: Mapped[str | None] = mapped_column(Text)
    resource: Mapped[str | None] = mapped_column(String(100))
    resource_id: Mapped[str | None] = mapped_column(String(255))
    action: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(20), default='success')
    details: Mapped[str | None] = mapped_column(Text)
    metadata_: Mapped[str | None] = mapped_column('metadata', Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        Index('idx_audit_logs_timestamp', timestamp.desc()),
        Index('idx_audit_logs_user_id', 'user_id'),
        Index('idx_audit_logs_event', 'event'),
        Index('idx_audit_logs_sensitivity', 'sensitivity'),
    )


# ============================================
# 21. access_keys (047)
# ============================================
class AccessKey(Base):
    __tablename__ = 'access_keys'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(20), nullable=False)
    key_id: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)
    mindmap_id: Mapped[str] = mapped_column(String(255), nullable=False)
    permission: Mapped[str] = mapped_column(String(10), default='read')
    ip_whitelist: Mapped[str | None] = mapped_column(Text)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime)
    is_active: Mapped[int] = mapped_column(Integer, default=1)

    user: Mapped['User'] = relationship(back_populates='access_keys')

    __table_args__ = (
        Index('idx_access_keys_user_id', 'user_id'),
        Index('idx_access_keys_key_hash', 'key_hash'),
        Index('idx_access_keys_key_id', 'key_id'),
        Index('idx_access_keys_mindmap_id', 'mindmap_id'),
        Index('idx_access_keys_is_active', 'is_active'),
    )


# ============================================
# 22. node_ids (049)
# ============================================
class NodeId(Base):
    __tablename__ = 'node_ids'

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    mindmap_id: Mapped[str] = mapped_column(String(255), nullable=False)
    node_id: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped['User'] = relationship(back_populates='node_ids')

    __table_args__ = (
        UniqueConstraint('user_id', 'node_id'),
        Index('idx_node_ids_user_id', 'user_id'),
        Index('idx_node_ids_node_id', 'node_id'),
        Index('idx_node_ids_mindmap', 'user_id', 'mindmap_id'),
    )
