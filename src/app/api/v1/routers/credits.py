"""
크레딧/결제 API 라우터
"""
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from src.app.infrastructure.db.session import get_db
from src.app.infrastructure.db.models import User, StripeWebhookEvent
from src.app.api.v1.middleware.auth import require_auth
from src.app.domain.services.credit_service import get_balance, get_usage
from src.app.core.config import get_settings

router = APIRouter(prefix='/api/credits', tags=['credits'])


# ─── 스키마 ─────────────────────────────────────────

class CheckoutRequest(BaseModel):
  packageType: str
  successUrl: str | None = None
  cancelUrl: str | None = None


# ─── 라우트 ─────────────────────────────────────────

@router.get('/balance')
async def balance(
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """크레딧 잔액 조회"""
  data = await get_balance(db, user.username)
  return {'success': True, 'data': data, 'error': None}


@router.get('/usage')
async def usage(
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
  days: int = 30,
):
  """사용량 조회"""
  data = await get_usage(db, user.username, days)
  return {'success': True, 'data': {'usage': data}, 'error': None}


@router.post('/checkout')
async def checkout(
  body: CheckoutRequest,
  user: User = Depends(require_auth),
  db: AsyncSession = Depends(get_db),
):
  """Stripe 결제 세션 생성"""
  settings = get_settings()
  if not settings.STRIPE_SECRET_KEY:
    raise HTTPException(status_code=500, detail='Stripe 미설정')

  stripe.api_key = settings.STRIPE_SECRET_KEY

  try:
    session = stripe.checkout.Session.create(
      mode='subscription' if 'subscription' in body.packageType else 'payment',
      line_items=[{
        'price_data': {
          'currency': 'usd',
          'product_data': {'name': body.packageType},
          'unit_amount': 1000,  # TODO: 패키지별 가격 조회
        },
        'quantity': 1,
      }],
      success_url=body.successUrl or f'{settings.CORS_ORIGINS[0]}/payment-success.html',
      cancel_url=body.cancelUrl or f'{settings.CORS_ORIGINS[0]}/settings.html',
      client_reference_id=user.username,
      metadata={'packageType': body.packageType},
    )
    return {
      'success': True,
      'data': {'sessionId': session.id, 'url': session.url},
      'error': None,
    }
  except stripe.StripeError as e:
    raise HTTPException(status_code=400, detail=str(e))


# ─── Stripe 웹훅 ───────────────────────────────────

webhook_router = APIRouter(prefix='/api/stripe', tags=['stripe'])


@webhook_router.post('/webhook')
async def stripe_webhook(
  request: Request,
  db: AsyncSession = Depends(get_db),
):
  """Stripe 웹훅 핸들러"""
  settings = get_settings()
  payload = await request.body()
  sig_header = request.headers.get('stripe-signature')

  if not settings.STRIPE_WEBHOOK_SECRET:
    raise HTTPException(status_code=500, detail='웹훅 시크릿 미설정')

  try:
    stripe.api_key = settings.STRIPE_SECRET_KEY
    event = stripe.Webhook.construct_event(
      payload, sig_header, settings.STRIPE_WEBHOOK_SECRET,
    )
  except stripe.SignatureVerificationError:
    raise HTTPException(status_code=400, detail='서명 검증 실패')

  # 이벤트 중복 처리 방지
  existing = await db.execute(
    StripeWebhookEvent.__table__.select().where(
      StripeWebhookEvent.event_id == event['id']
    )
  )
  if existing.scalar():
    return {'success': True, 'data': {'duplicate': True}}

  # 이벤트 저장
  webhook_event = StripeWebhookEvent(
    event_id=event['id'],
    event_type=event['type'],
    payload=str(payload),
  )
  db.add(webhook_event)

  # 이벤트 타입별 처리
  if event['type'] == 'checkout.session.completed':
    # TODO: 크레딧 지급 로직
    pass
  elif event['type'] == 'invoice.paid':
    # TODO: 구독 갱신 로직
    pass
  elif event['type'] == 'customer.subscription.deleted':
    # TODO: 구독 해지 로직
    pass

  webhook_event.processed = 1
  await db.flush()

  return {'success': True, 'data': {'processed': True}}
