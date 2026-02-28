'use strict';

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const db = require('../../db');
const verifier = require('../../services/subscriptionVerifier');

// ══════════════════════════════════════════════════════
//  패키지 정의 (참고소스 동등)
// ══════════════════════════════════════════════════════
const PACKAGE_DEFS = {
  'lite':     { name: '라이트',   base_price: 3.30,  price_usd: 3.63,  credits: 330000,  bonusRate: 0.09, bonusUsage: 29700,   autopayBonusRate: 0.09 },
  'standard': { name: '스탠다드', base_price: 11.00, price_usd: 12.10, credits: 1100000, bonusRate: 0.07, bonusUsage: 77000,   autopayBonusRate: 0.09 },
  'pro':      { name: '프로',     base_price: 22.00, price_usd: 24.20, credits: 2200000, bonusRate: 0.05, bonusUsage: 110000,  autopayBonusRate: 0.09 },
  'max':      { name: '멕스',     base_price: 44.00, price_usd: 48.40, credits: 4400000, bonusRate: 0.03, bonusUsage: 132000,  autopayBonusRate: 0.09 }
};

/**
 * 보너스 크레딧 계산 헬퍼
 * @param {object} pkg - PACKAGE_DEFS 항목
 * @param {boolean} isAutopay - 자동결제 여부
 * @returns {{ baseCredits, bonusCredits, autopayBonus, totalBonusCredits, totalCredits }}
 */
function calculateBonusCredits(pkg, isAutopay = false) {
  const baseCredits = pkg.credits;
  const bonusCredits = pkg.bonusUsage;
  const autopayBonus = isAutopay ? Math.floor(baseCredits * pkg.autopayBonusRate) : 0;
  const totalBonusCredits = bonusCredits + autopayBonus;
  const totalCredits = baseCredits + totalBonusCredits;
  return { baseCredits, bonusCredits, autopayBonus, totalBonusCredits, totalCredits };
}

const PACKAGE_RANK = { 'lite': 1, 'standard': 2, 'pro': 3, 'max': 4 };

// 테스트 체크아웃 세션 저장소 (인메모리)
const testSessions = {};

/**
 * 세션에서 userId 추출
 */
function getUserId(req) {
  if (req.session?.userId) return req.session.userId;
  if (req.body?.userId && req.body.userId !== 'guest') return req.body.userId;
  return (process.env.TEST_ADMIN_USERNAME || '').toLowerCase() || 'dev';
}

/**
 * GET /api/credits/models - AI 모델 목록 (DB 동적 로드)
 * 2026-02-25: 하드코딩 제거, AIModelSettings DB 기반으로 전환
 */
router.get('/models', async (req, res) => {
  try {
    const { AIModelSettings, AIServiceSettings, MODEL_MAX_TOKENS, getServiceFromModel, generateDisplayName }
      = require('../../db/models/AIModelSettings');
    const db = require('../../db');

    const environment = process.env.APP_ENV || 'local';

    const [allModels, services] = await Promise.all([
      AIModelSettings.getAll(false, environment),
      AIServiceSettings.getAll(environment)
    ]);

    // DB에서 가격 정보 조회
    let pricingMap = {};
    try {
      const pricingRows = await db.all(`
        SELECT ai_service, model_name,
               cost_per_1m_input, cost_per_1m_output, cost_per_1m_cached_input,
               billing_type, cost_per_1m_image_input, cost_per_1m_image_output, cost_per_second
        FROM ai_model_pricing
        WHERE is_active = 1
      `);
      for (const row of pricingRows) {
        if (!pricingMap[row.ai_service]) pricingMap[row.ai_service] = {};
        pricingMap[row.ai_service][row.model_name] = {
          costInput: row.cost_per_1m_input || 0,
          costOutput: row.cost_per_1m_output || 0,
          billingType: row.billing_type || 'token',
          imageInputCost: row.cost_per_1m_image_input || 0,
          imageOutputCost: row.cost_per_1m_image_output || 0,
          perSecondCost: row.cost_per_second || 0
        };
      }
    } catch (e) {
      logger.warn('ai_model_pricing 조회 실패:', e.message);
    }

    // 활성화된 서비스 필터링
    const enabledServices = Object.entries(services)
      .filter(([, info]) => info.enabled)
      .map(([name]) => name);

    // 프론트엔드 기대 형식으로 변환
    const models = {};
    let totalCount = 0;

    for (const service of enabledServices) {
      const serviceModels = allModels[service];
      if (!serviceModels || serviceModels.length === 0) continue;

      models[service] = serviceModels
        .filter(m => m.enabled)
        .map((m, idx) => {
          const p = (pricingMap[service] && pricingMap[service][m.model]) || {};
          const isPerSecond = p.billingType === 'per_second';
          return {
            model: m.model,
            displayName: generateDisplayName(m.model),
            costInput: isPerSecond ? 0 : (p.costInput || 0),
            costOutput: isPerSecond ? 0 : (p.costOutput || 0),
            creditsInput: 1,
            creditsOutput: 2,
            isDefault: idx === 0,
            billingType: p.billingType || 'token',
            imageInputCost: p.imageInputCost || 0,
            imageOutputCost: p.imageOutputCost || 0,
            costPerSecond: isPerSecond ? (p.perSecondCost || 0) : 0
          };
        });

      totalCount += models[service].length;
    }

    // DB 비어있는 경우 MODEL_MAX_TOKENS fallback
    if (totalCount === 0) {
      logger.warn('모델 목록 비어있음 - MODEL_MAX_TOKENS fallback 사용');
      for (const modelName of Object.keys(MODEL_MAX_TOKENS)) {
        const svc = getServiceFromModel(modelName);
        if (!models[svc]) models[svc] = [];
        models[svc].push({
          model: modelName,
          displayName: generateDisplayName(modelName),
          costInput: 0,
          costOutput: 0,
          creditsInput: 1,
          creditsOutput: 2,
          isDefault: models[svc].length === 0,
          billingType: 'token',
          imageInputCost: 0,
          imageOutputCost: 0,
          costPerSecond: 0
        });
        totalCount++;
      }
    }

    logger.info(`모델 목록 응답: ${totalCount}개 모델, ${Object.keys(models).length}개 서비스`);

    res.json({
      success: true,
      data: {
        models,
        enabledServices: Object.keys(models),
        count: totalCount,
        environment
      }
    });
  } catch (error) {
    logger.error('모델 목록 조회 실패:', error.message);
    // DB 오류 시 최소 fallback
    res.json({
      success: true,
      data: {
        models: {
          gpt: [{ model: 'gpt-4o-mini', displayName: 'GPT-4o Mini', costInput: 0.15, costOutput: 0.6, creditsInput: 1, creditsOutput: 2, isDefault: true }]
        },
        enabledServices: ['gpt'],
        count: 1,
        environment: 'local'
      }
    });
  }
});

/**
 * GET /api/credits/balance - 크레딧 잔액 (DB 조회)
 */
router.get('/balance', async (req, res) => {
  try {
    const userId = getUserId(req);
    const user = await db.get(
      'SELECT free_credits, service_credits, paid_credits, subscription_status, subscription_package, auto_renewal, subscription_start_date, subscription_end_date, updated_at FROM users_credits WHERE user_id = ?',
      [userId]
    );

    if (!user) {
      return res.json({
        success: true,
        data: {
          balance: 0, currency: 'credits',
          credits: { free: 0, service: 0, paid: 0, total: 0 },
          subscription: { status: 'inactive', package: null, autoRenewal: false, startDate: null, endDate: null },
          lastChargeDate: null
        }
      });
    }

    // 마지막 충전일 조회 (credit_purchase_logs → users_credits.updated_at 폴백)
    const lastPurchase = await db.get(
      'SELECT purchase_timestamp FROM credit_purchase_logs WHERE user_id = ? AND payment_status = \'completed\' ORDER BY purchase_timestamp DESC LIMIT 1',
      [userId]
    );

    // 구독 결제 통화 조회 (가장 최근 구독 결제의 통화 — 통화 고정 정책)
    let subscriptionCurrency = null;
    if (user.subscription_status === 'active') {
      const lastSubPayment = await db.get(
        `SELECT currency FROM credit_purchase_logs
         WHERE user_id = $1 AND purchase_type IN ('subscription', 'subscription_upgrade')
           AND payment_status = 'completed'
         ORDER BY purchase_timestamp DESC LIMIT 1`,
        [userId]
      );
      subscriptionCurrency = lastSubPayment?.currency || 'USD';
    }

    let lastChargeDate = null;
    const ts = lastPurchase?.purchase_timestamp || user.updated_at;
    if (ts) {
      const d = ts instanceof Date ? ts : new Date(ts);
      lastChargeDate = d.toISOString().split('T')[0];
    }

    // 결제 내역 조회 - completed, cancelled, pending 모두 포함 (원본 동등 구현)
    const purchaseLogs = await db.all(
      `SELECT purchase_type, package_type, amount_usd, credit_amount, bonus_credits,
              currency, exchange_rate, payment_status, purchase_timestamp, stripe_checkout_session_id
       FROM credit_purchase_logs
       WHERE user_id = $1 AND payment_status IN ('completed', 'cancelled', 'pending')
       ORDER BY purchase_timestamp DESC LIMIT 50`,
      [userId]
    );

    const paymentHistory = (purchaseLogs || []).map(log => ({
      date: log.purchase_timestamp,
      type: log.purchase_type,
      package: log.package_type,
      amount: parseFloat(log.amount_usd) || 0,
      usdAmount: parseFloat(log.amount_usd) || 0,
      credits: parseFloat(log.credit_amount) || 0,
      bonusCredits: parseFloat(log.bonus_credits) || 0,
      currency: log.currency || 'USD',
      exchangeRate: parseFloat(log.exchange_rate) || 1,
      status: log.payment_status,
      transactionId: log.stripe_checkout_session_id
    }));

    const free = Number(user.free_credits) || 0;
    const service = Number(user.service_credits) || 0;
    const paid = Number(user.paid_credits) || 0;
    const total = free + service + paid;

    // 구독 상태 판단
    const isSubscription = (user.subscription_status === 'active') && service > 0;
    const endDate = user.subscription_end_date || null;

    // daily: 구독 여부 + 일일 잔여 크레딧 계산
    let dailyRemaining = 0;
    if (isSubscription && endDate) {
      const now = new Date();
      const end = new Date(endDate);
      const remainDays = Math.max(1, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
      dailyRemaining = Math.floor(service / remainDays);
    }

    // expiry: 만료일 포맷 (YYYY-MM-DD)
    const fmtDate = (d) => {
      if (!d) return null;
      const dt = d instanceof Date ? d : new Date(d);
      return dt.toISOString().split('T')[0];
    };

    res.json({
      success: true,
      data: {
        balance: total, currency: 'credits',
        credits: { free, service, paid, total },
        daily: {
          isSubscription,
          dailyRemaining
        },
        expiry: {
          serviceCredits: isSubscription ? fmtDate(endDate) : null,
          paidCredits: paid > 0 ? null : null
        },
        subscription: {
          status: user.subscription_status || 'inactive',
          package: user.subscription_package || null,
          packageName: user.subscription_package ? user.subscription_package.charAt(0).toUpperCase() + user.subscription_package.slice(1) : null,
          autoRenewal: user.auto_renewal === 1,
          startDate: user.subscription_start_date || null,
          endDate: endDate,
          paymentCurrency: subscriptionCurrency  // 구독 결제 통화 (null = 미구독)
        },
        lastChargeDate,
        paymentHistory
      }
    });
  } catch (error) {
    logger.warn('[Credits] balance DB 조회 실패, fallback:', error.message);
    res.json({
      success: true,
      data: { balance: 0, currency: 'credits', credits: { free: 0, service: 0, paid: 0, total: 0 }, subscription: { status: 'inactive', package: null, autoRenewal: false } }
    });
  }
});

// ══════════════════════════════════════════════════════
//  결제 (Checkout) API - 참고소스 동등 구현
// ══════════════════════════════════════════════════════

/**
 * POST /api/credits/create-checkout
 * 테스트 체크아웃 세션 생성 (Stripe 대체)
 * 프론트엔드 processStripeCheckout()가 호출
 */
router.post('/create-checkout', (req, res) => {
  try {
    const userId = getUserId(req);
    const { package_type, currency = 'USD', is_autopay = false } = req.body;

    if (!userId || userId === 'guest') {
      return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
    }
    if (!package_type || !PACKAGE_DEFS[package_type]) {
      return res.status(400).json({ success: false, error: '유효하지 않은 패키지입니다.' });
    }

    const sessionId = 'TEST_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const pkg = PACKAGE_DEFS[package_type];

    const bonus = calculateBonusCredits(pkg, is_autopay);
    testSessions[sessionId] = {
      userId, package_type, currency, is_autopay,
      price_usd: pkg.price_usd,
      credits: bonus.baseCredits,
      bonusCredits: bonus.bonusCredits,
      autopayBonus: bonus.autopayBonus,
      totalCredits: bonus.totalCredits,
      status: 'pending', type: 'subscription',
      created: Date.now()
    };

    // 오래된 세션 정리 (1시간 이상)
    const now = Date.now();
    for (const [id, s] of Object.entries(testSessions)) {
      if (now - s.created > 3600000) delete testSessions[id];
    }

    const checkoutUrl = `/checkout-test.html?session_id=${sessionId}`;
    logger.info(`[Credits] 테스트 체크아웃 세션 생성: ${sessionId}, package=${package_type}`);

    res.json({
      success: true,
      data: { sessionId, url: checkoutUrl }
    });
  } catch (error) {
    logger.error('[Credits] 체크아웃 세션 생성 실패:', error.message);
    res.status(500).json({ success: false, error: '체크아웃 세션 생성 실패' });
  }
});

/**
 * POST /api/credits/create-upgrade-checkout
 * 업그레이드 비례 정산 테스트 체크아웃 세션 생성
 */
router.post('/create-upgrade-checkout', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { new_package, currency = 'USD' } = req.body;

    if (!userId || userId === 'guest') {
      return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
    }
    if (!new_package || !PACKAGE_DEFS[new_package]) {
      return res.status(400).json({ success: false, error: '유효하지 않은 패키지입니다.' });
    }

    // 현재 구독 확인
    const currentUser = await db.get(
      'SELECT subscription_status, subscription_package, subscription_start_date, subscription_end_date, service_credits FROM users_credits WHERE user_id = ?',
      [userId]
    );

    if (!currentUser || currentUser.subscription_status !== 'active') {
      return res.status(400).json({ success: false, error: '활성화된 구독이 없습니다.' });
    }

    const currentRank = PACKAGE_RANK[currentUser.subscription_package] || 0;
    const newRank = PACKAGE_RANK[new_package] || 0;
    if (newRank <= currentRank) {
      return res.status(400).json({ success: false, error: '상위 패키지로만 업그레이드 가능합니다.' });
    }

    const newPkg = PACKAGE_DEFS[new_package];
    const oldPkg = PACKAGE_DEFS[currentUser.subscription_package];
    const priceDiff = Math.round((newPkg.price_usd - oldPkg.price_usd) * 100) / 100;
    const creditDiff = newPkg.credits - oldPkg.credits;

    const sessionId = 'TEST_UPG_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    testSessions[sessionId] = {
      userId, package_type: new_package, currency,
      old_package: currentUser.subscription_package,
      price_usd: priceDiff, credits: creditDiff,
      status: 'pending', type: 'upgrade',
      created: Date.now()
    };

    const checkoutUrl = `/checkout-test.html?session_id=${sessionId}`;
    logger.info(`[Credits] 업그레이드 체크아웃 세션 생성: ${sessionId}, ${currentUser.subscription_package}→${new_package}`);

    res.json({
      success: true,
      data: { sessionId, url: checkoutUrl }
    });
  } catch (error) {
    logger.error('[Credits] 업그레이드 체크아웃 실패:', error.message);
    res.status(500).json({ success: false, error: '업그레이드 체크아웃 실패' });
  }
});

/**
 * GET /api/credits/checkout-session/:sessionId
 * 체크아웃 세션 정보 조회 (테스트 결제 페이지용)
 */
router.get('/checkout-session/:sessionId', (req, res) => {
  const session = testSessions[req.params.sessionId];
  if (!session) {
    return res.status(404).json({ success: false, error: '세션을 찾을 수 없습니다.' });
  }

  const pkg = PACKAGE_DEFS[session.package_type];
  res.json({
    success: true,
    data: {
      sessionId: req.params.sessionId,
      type: session.type,
      packageType: session.package_type,
      packageName: pkg ? pkg.name : session.package_type,
      priceUSD: session.price_usd,
      credits: session.credits,
      currency: session.currency,
      isAutopay: session.is_autopay || false,
      oldPackage: session.old_package || null,
      status: session.status
    }
  });
});

/**
 * POST /api/credits/process-test-payment/:sessionId
 * 테스트 결제 처리 (체크아웃 페이지에서 "결제하기" 클릭 시)
 */
router.post('/process-test-payment/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const session = testSessions[sessionId];
    if (!session) {
      return res.status(404).json({ success: false, error: '세션을 찾을 수 없습니다.' });
    }
    if (session.status === 'completed') {
      return res.json({ success: true, message: '이미 처리된 결제입니다.' });
    }

    const userId = session.userId;
    const pkg = PACKAGE_DEFS[session.package_type];

    if (session.type === 'upgrade') {
      // 업그레이드: 크레딧 차액 추가
      await db.run(`
        UPDATE users_credits
        SET subscription_package = ?,
            service_credits = service_credits + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [session.package_type, session.credits, userId]);

      // 로그 기록 (sessionId 저장으로 검증 연동)
      await db.run(`
        INSERT INTO credit_purchase_logs
        (user_id, purchase_type, package_type, amount_usd, credit_amount, currency, exchange_rate, payment_status, stripe_checkout_session_id)
        VALUES (?, 'subscription_upgrade', ?, ?, ?, ?, 1, 'completed', ?)
      `, [userId, session.package_type, session.price_usd, session.credits, session.currency, sessionId]);

    } else {
      // 신규 구독
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      const todayStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      // 보너스 크레딧 계산 (세션에 저장된 값 우선, 없으면 재계산)
      const bonusCredits = session.bonusCredits ?? pkg.bonusUsage;
      const autopayBonus = session.autopayBonus ?? (session.is_autopay ? Math.floor(pkg.credits * pkg.autopayBonusRate) : 0);
      const totalBonusCredits = bonusCredits + autopayBonus;

      // RETURNING user_id: users_credits에 id 컬럼 없음 → db.run의 자동 RETURNING id 방지
      await db.run(`
        INSERT INTO users_credits (user_id, username, user_type, free_credits, service_credits, paid_credits,
          subscription_status, subscription_package, subscription_start_date, subscription_end_date, auto_renewal)
        VALUES (?, ?, 'basic', ?, ?, 0, 'active', ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          user_type = 'basic',
          free_credits = ?,
          service_credits = ?,
          subscription_status = 'active',
          subscription_package = ?,
          subscription_start_date = ?,
          subscription_end_date = ?,
          auto_renewal = ?,
          updated_at = CURRENT_TIMESTAMP
        RETURNING user_id
      `, [
        userId, userId, totalBonusCredits, pkg.credits, session.package_type, todayStr, endStr, session.is_autopay ? 1 : 0,
        totalBonusCredits, pkg.credits, session.package_type, todayStr, endStr, session.is_autopay ? 1 : 0
      ]);

      // 로그 기록 (보너스 정보 포함, sessionId 저장으로 검증 연동)
      await db.run(`
        INSERT INTO credit_purchase_logs
        (user_id, purchase_type, package_type, amount_usd, credit_amount, bonus_rate, bonus_credits, currency, exchange_rate, payment_status, stripe_checkout_session_id)
        VALUES (?, 'subscription', ?, ?, ?, ?, ?, ?, 1, 'completed', ?)
      `, [userId, session.package_type, pkg.price_usd, pkg.credits, pkg.bonusRate, totalBonusCredits, session.currency, sessionId]);
    }

    // 세션 상태 업데이트
    session.status = 'completed';

    // 비동기 검증 엔진 호출 (결제 응답 차단하지 않음)
    setImmediate(async () => {
      try {
        const verifyFn = session.type === 'upgrade' ? verifier.verifyUpgrade : verifier.verifySubscription;
        const result = await verifyFn(sessionId);
        logger.info(`[Credits] 검증 완료: ${result.passed ? 'PASSED' : 'FAILED'} (${result.passedSteps}/${result.totalSteps}), runId=${result.runId}`);
      } catch (e) {
        logger.warn('[Credits] 검증 엔진 호출 실패:', e.message);
      }
    });

    // 보너스 정보 계산 (응답용)
    const resBonus = calculateBonusCredits(pkg, session.is_autopay);

    logger.info(`[Credits] 테스트 결제 처리 완료: ${sessionId}, type=${session.type}, package=${session.package_type}, base=${resBonus.baseCredits}, bonus=${resBonus.totalBonusCredits}`);

    res.json({
      success: true,
      message: '결제가 완료되었습니다.',
      data: {
        sessionId,
        packageType: session.package_type,
        credits: {
          service: resBonus.baseCredits,
          free: resBonus.totalBonusCredits,
          bonusCredits: resBonus.bonusCredits,
          autopayBonus: resBonus.autopayBonus,
          total: resBonus.totalCredits
        }
      }
    });
  } catch (error) {
    logger.error('[Credits] 테스트 결제 처리 실패:', error.message);
    res.status(500).json({ success: false, error: '결제 처리 실패: ' + error.message });
  }
});

/**
 * GET /api/credits/payment-status/:sessionId
 * 결제 상태 조회 (payment-success.html용)
 */
router.get('/payment-status/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const session = testSessions[sessionId];

    if (!session) {
      return res.json({ success: false, error: '세션을 찾을 수 없습니다.' });
    }

    const pkg = PACKAGE_DEFS[session.package_type];

    // 구독 정보 조회하여 subscriptionData 구성
    let subscriptionData = null;
    if (session.status === 'completed') {
      const user = await db.get(
        'SELECT free_credits, service_credits, paid_credits, subscription_status, subscription_package, subscription_start_date, subscription_end_date FROM users_credits WHERE user_id = ?',
        [session.userId]
      );
      if (user) {
        const free = Number(user.free_credits) || 0;
        const service = Number(user.service_credits) || 0;
        const paid = Number(user.paid_credits) || 0;
        subscriptionData = {
          isSubscribed: true,
          subscriptionStatus: 'active',
          subscriptionType: session.package_type,
          subscriptionStartDate: user.subscription_start_date,
          subscriptionEndDate: user.subscription_end_date,
          credits: {
            free,
            service,
            paid,
            total: free + service + paid
          }
        };
      }
    }

    res.json({
      success: true,
      status: session.status === 'completed' ? 'completed' : 'pending',
      packageType: session.package_type,
      credits: session.type === 'upgrade' ? session.credits : (pkg ? pkg.credits : 0),
      subscriptionData
    });
  } catch (error) {
    logger.error('[Credits] payment-status 조회 실패:', error.message);
    res.json({ success: false, error: '결제 상태 조회 실패' });
  }
});

// ══════════════════════════════════════════════════════
//  구독 관리 API - 참고소스 동등 구현
// ══════════════════════════════════════════════════════

/**
 * POST /api/credits/subscribe
 * 구독 처리 (테스트 모드용 - processTestSubscription에서 호출)
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { package_type, currency = 'USD', exchange_rate = 1, is_autopay = false } = req.body;
    const userId = getUserId(req);

    if (!userId || userId === 'guest') {
      return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
    }

    const safeExchangeRate = Number(exchange_rate);
    if (!Number.isFinite(safeExchangeRate) || safeExchangeRate < 0.01 || safeExchangeRate > 100000) {
      return res.status(400).json({ success: false, error: '유효하지 않은 환율입니다.' });
    }

    // 이미 활성 구독 확인
    const existingUser = await db.get(
      'SELECT subscription_status, subscription_package FROM users_credits WHERE user_id = ?',
      [userId]
    );

    if (existingUser && existingUser.subscription_status === 'active') {
      return res.status(400).json({
        success: false,
        error: '이미 활성화된 구독이 있습니다.',
        currentPackage: existingUser.subscription_package
      });
    }

    const pkgDef = PACKAGE_DEFS[package_type];
    if (!pkgDef) {
      return res.status(400).json({ success: false, error: '유효하지 않은 패키지입니다.' });
    }

    // 보너스 크레딧 분리 계산
    const bonus = calculateBonusCredits(pkgDef, is_autopay);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    const todayStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // service_credits = 구독 기본 크레딧, free_credits = 보너스 크레딧 (분리 저장)
    // RETURNING user_id: users_credits에 id 컬럼 없음 → db.run의 자동 RETURNING id 방지
    await db.run(`
      INSERT INTO users_credits (user_id, username, user_type, free_credits, service_credits, paid_credits,
        subscription_status, subscription_package, subscription_start_date, subscription_end_date, auto_renewal)
      VALUES (?, ?, 'basic', ?, ?, 0, 'active', ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        user_type = 'basic',
        free_credits = ?,
        service_credits = ?,
        subscription_status = 'active',
        subscription_package = ?,
        subscription_start_date = ?,
        subscription_end_date = ?,
        auto_renewal = ?,
        updated_at = CURRENT_TIMESTAMP
      RETURNING user_id
    `, [
      userId, userId, bonus.totalBonusCredits, bonus.baseCredits, package_type, todayStr, endStr, is_autopay ? 1 : 0,
      bonus.totalBonusCredits, bonus.baseCredits, package_type, todayStr, endStr, is_autopay ? 1 : 0
    ]);

    // sessionId 생성 (검증 엔진 연동)
    const sessionId = 'TEST_SUB_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    // 로그 기록 (보너스 정보 포함, sessionId 저장으로 검증 연동)
    await db.run(`
      INSERT INTO credit_purchase_logs
      (user_id, purchase_type, package_type, amount_usd, credit_amount, bonus_rate, bonus_credits, currency, exchange_rate, payment_status, stripe_checkout_session_id)
      VALUES (?, 'subscription', ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
    `, [userId, package_type, pkgDef.price_usd, bonus.baseCredits, pkgDef.bonusRate, bonus.totalBonusCredits, currency, safeExchangeRate, sessionId]);

    // 비동기 검증 엔진 호출 (결제 응답 차단하지 않음)
    setImmediate(async () => {
      try {
        const result = await verifier.verifySubscription(sessionId);
        logger.info(`[Credits] 구독 검증 완료: ${result.passed ? 'PASSED' : 'FAILED'} (${result.passedSteps}/${result.totalSteps}), runId=${result.runId}`);
      } catch (e) {
        logger.warn('[Credits] 구독 검증 호출 실패:', e.message);
      }
    });

    logger.info(`[Credits] 구독 완료: userId=${userId}, package=${package_type}, service=${bonus.baseCredits}, bonus=${bonus.totalBonusCredits} (기본보너스=${bonus.bonusCredits}, 자동결제보너스=${bonus.autopayBonus})`);

    res.json({
      success: true,
      message: '구독이 완료되었습니다.',
      data: {
        package: package_type,
        credits: {
          free: bonus.totalBonusCredits,
          service: bonus.baseCredits,
          paid: 0,
          total: bonus.totalCredits,
          bonusCredits: bonus.bonusCredits,
          autopayBonus: bonus.autopayBonus
        },
        subscription: { startDate: todayStr, endDate: endStr }
      }
    });
  } catch (error) {
    logger.error('[Credits] 구독 처리 실패:', error.message);
    res.status(500).json({ success: false, error: '구독 처리 실패' });
  }
});

/**
 * POST /api/credits/upgrade
 * 구독 업그레이드 (테스트 모드용)
 */
router.post('/upgrade', async (req, res) => {
  try {
    const { new_package, currency = 'USD', exchange_rate = 1 } = req.body;
    const userId = getUserId(req);

    if (!userId || userId === 'guest') {
      return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
    }

    const safeExchangeRate = Number(exchange_rate);
    if (!Number.isFinite(safeExchangeRate) || safeExchangeRate < 0.01 || safeExchangeRate > 100000) {
      return res.status(400).json({ success: false, error: '유효하지 않은 환율입니다.' });
    }

    const currentUser = await db.get(
      'SELECT subscription_status, subscription_package, service_credits FROM users_credits WHERE user_id = ?',
      [userId]
    );

    if (!currentUser || currentUser.subscription_status !== 'active') {
      return res.status(400).json({ success: false, error: '활성화된 구독이 없습니다.' });
    }

    const oldPkg = PACKAGE_DEFS[currentUser.subscription_package];
    const newPkg = PACKAGE_DEFS[new_package];

    if (!newPkg) {
      return res.status(400).json({ success: false, error: '유효하지 않은 패키지입니다.' });
    }
    if (newPkg.price_usd <= oldPkg.price_usd) {
      return res.status(400).json({ success: false, error: '상위 패키지로만 업그레이드 가능합니다.' });
    }

    const creditDiff = newPkg.credits - oldPkg.credits;
    const priceDiff = Math.round((newPkg.price_usd - oldPkg.price_usd) * 100) / 100;

    await db.run(`
      UPDATE users_credits
      SET subscription_package = ?,
          service_credits = service_credits + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [new_package, creditDiff, userId]);

    // sessionId 생성 (검증 엔진 연동)
    const sessionId = 'TEST_UPG_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);

    await db.run(`
      INSERT INTO credit_purchase_logs
      (user_id, purchase_type, package_type, amount_usd, credit_amount, currency, exchange_rate, payment_status, stripe_checkout_session_id)
      VALUES (?, 'subscription_upgrade', ?, ?, ?, ?, ?, 'completed', ?)
    `, [userId, new_package, priceDiff, creditDiff, currency, safeExchangeRate, sessionId]);

    // 비동기 검증 엔진 호출
    setImmediate(async () => {
      try {
        const result = await verifier.verifyUpgrade(sessionId);
        logger.info(`[Credits] 업그레이드 검증 완료: ${result.passed ? 'PASSED' : 'FAILED'} (${result.passedSteps}/${result.totalSteps}), runId=${result.runId}`);
      } catch (e) {
        logger.warn('[Credits] 업그레이드 검증 호출 실패:', e.message);
      }
    });

    logger.info(`[Credits] 업그레이드 완료: userId=${userId}, ${currentUser.subscription_package}→${new_package}`);

    res.json({
      success: true,
      message: '구독 업그레이드가 완료되었습니다.',
      data: {
        oldPackage: currentUser.subscription_package,
        newPackage: new_package,
        addedCredits: creditDiff,
        priceDiff
      }
    });
  } catch (error) {
    logger.error('[Credits] 업그레이드 실패:', error.message);
    res.status(500).json({ success: false, error: '업그레이드 실패' });
  }
});

/**
 * GET /api/credits/upgrade-preview
 * 업그레이드 비례 정산 미리보기
 */
router.get('/upgrade-preview', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { new_package, currency = 'USD' } = req.query;

    if (!new_package) {
      return res.status(400).json({ success: false, error: '새 패키지 타입이 필요합니다.' });
    }

    const currentUser = await db.get(
      'SELECT subscription_status, subscription_package, subscription_start_date, subscription_end_date, service_credits FROM users_credits WHERE user_id = ?',
      [userId]
    );

    if (!currentUser || currentUser.subscription_status !== 'active') {
      return res.status(400).json({ success: false, error: '활성화된 구독이 없습니다.' });
    }

    const currentRank = PACKAGE_RANK[currentUser.subscription_package] || 0;
    const newRank = PACKAGE_RANK[new_package] || 0;
    if (newRank <= currentRank) {
      return res.status(400).json({ success: false, error: '상위 패키지로만 업그레이드 가능합니다.' });
    }

    const currentPkg = PACKAGE_DEFS[currentUser.subscription_package];
    const newPkg = PACKAGE_DEFS[new_package];
    const totalDays = 30;
    const now = new Date();
    const startDate = new Date(currentUser.subscription_start_date);
    const usedDays = Math.max(0, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
    const remainingDays = Math.max(0, totalDays - usedDays);

    const currentDailyRate = currentPkg.price_usd / totalDays;
    const remainingValue = Math.round(currentDailyRate * remainingDays * 100) / 100;
    const upgradeCharge = Math.max(0, Math.round((newPkg.price_usd - remainingValue) * 100) / 100);

    // 환율 조회 (통화별 로컬 금액 계산)
    const UPGRADE_EXCHANGE_RATES = { USD: 1, KRW: 1450, JPY: 155, EUR: 0.92, GBP: 0.79, CNY: 7.25 };
    const actualRate = UPGRADE_EXCHANGE_RATES[currency.toUpperCase()] || 1;
    const upgradeChargeLocal = currency.toUpperCase() === 'USD'
      ? upgradeCharge
      : Math.round(upgradeCharge * actualRate);
    const newCredits = newPkg.credits - currentPkg.credits;

    res.json({
      success: true,
      data: {
        currentPackage: currentUser.subscription_package,
        newPackage: new_package,
        totalDays, usedDays, remainingDays,
        currentPriceUSD: currentPkg.price_usd,
        newPriceUSD: newPkg.price_usd,
        remainingValue, upgradeCharge,
        currentTotalCredits: currentPkg.credits,
        newTotalCredits: newPkg.credits,
        newCredits,
        currency, exchangeRate: actualRate,
        upgradeChargeLocal
      }
    });
  } catch (error) {
    logger.error('[Credits] upgrade-preview 실패:', error.message);
    res.status(500).json({ success: false, error: '업그레이드 미리보기 실패' });
  }
});

/**
 * POST /api/credits/cancel-subscription
 * 구독 취소
 */
router.post('/cancel-subscription', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId || userId === 'guest') {
      return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
    }

    const user = await db.get(
      'SELECT subscription_status, subscription_package, service_credits FROM users_credits WHERE user_id = ?',
      [userId]
    );

    if (!user || user.subscription_status !== 'active') {
      return res.status(400).json({ success: false, error: '취소할 활성 구독이 없습니다.' });
    }

    const cancelledPackage = user.subscription_package;
    const revokedCredits = user.service_credits || 0;

    await db.run(`
      UPDATE users_credits
      SET subscription_status = 'cancelled',
          subscription_package = NULL,
          service_credits = 0,
          auto_renewal = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [userId]);

    await db.run(`
      INSERT INTO credit_purchase_logs
      (user_id, purchase_type, package_type, amount_usd, credit_amount, bonus_rate, bonus_credits, payment_status, currency, exchange_rate)
      VALUES (?, 'cancellation', ?, 0, ?, 0, 0, 'cancelled', 'USD', 1)
    `, [userId, cancelledPackage, -revokedCredits]);

    const remaining = await db.get(
      'SELECT free_credits, service_credits, paid_credits FROM users_credits WHERE user_id = ?',
      [userId]
    );

    // 비동기 취소 검증 엔진 호출
    setImmediate(async () => {
      try {
        const result = await verifier.verifySubscriptionCancel(userId);
        logger.info(`[Credits] 구독 취소 검증 완료: ${result.passed ? 'PASSED' : 'FAILED'} (${result.passedSteps}/${result.totalSteps}), runId=${result.runId}`);
      } catch (e) {
        logger.warn('[Credits] 구독 취소 검증 호출 실패:', e.message);
      }
    });

    logger.info(`[Credits] 구독 취소 완료: userId=${userId}, package=${cancelledPackage}`);

    res.json({
      success: true,
      message: '구독이 취소되었습니다.',
      data: {
        cancelledPackage,
        creditsRevoked: revokedCredits,
        endDate: new Date().toISOString().split('T')[0],
        remainingCredits: {
          free: remaining?.free_credits || 0,
          service: 0,
          paid: remaining?.paid_credits || 0,
          total: (remaining?.free_credits || 0) + (remaining?.paid_credits || 0)
        }
      }
    });
  } catch (error) {
    logger.error('[Credits] 구독 취소 실패:', error.message);
    res.status(500).json({ success: false, error: '구독 취소 실패' });
  }
});

/**
 * POST /api/credits/toggle-auto-renewal
 * 자동 갱신 토글
 */
router.post('/toggle-auto-renewal', async (req, res) => {
  try {
    const userId = getUserId(req);
    const user = await db.get('SELECT auto_renewal FROM users_credits WHERE user_id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
    }

    const newValue = user.auto_renewal === 1 ? 0 : 1;
    await db.run('UPDATE users_credits SET auto_renewal = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [newValue, userId]);

    res.json({ success: true, data: { autoRenewal: newValue === 1 } });
  } catch (error) {
    logger.error('[Credits] auto-renewal 토글 실패:', error.message);
    res.status(500).json({ success: false, error: '자동 갱신 토글 실패' });
  }
});

/**
 * POST /api/credits/set-auto-renewal
 * 자동결제 설정 저장
 */
router.post('/set-auto-renewal', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'enabled 값이 필요합니다.' });
    }

    const newValue = enabled ? 1 : 0;
    await db.run('UPDATE users_credits SET auto_renewal = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [newValue, userId]);
    logger.info(`[Credits] 자동결제 설정 변경: userId=${userId}, auto_renewal=${newValue}`);

    res.json({ success: true, data: { autoRenewal: enabled } });
  } catch (error) {
    logger.error('[Credits] set-auto-renewal 실패:', error.message);
    // DB 실패해도 응답은 성공으로 (프론트 에러 방지)
    res.json({ success: true, data: { autoRenewal: req.body.enabled } });
  }
});

/**
 * POST /api/credits/reactivate
 * 구독 재활성화
 */
router.post('/reactivate', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { package_type } = req.body;

    const pkgDef = PACKAGE_DEFS[package_type];
    if (!pkgDef) {
      return res.status(400).json({ success: false, error: '유효하지 않은 패키지입니다.' });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    const todayStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    await db.run(`
      UPDATE users_credits
      SET subscription_status = 'active',
          subscription_package = ?,
          subscription_start_date = ?,
          subscription_end_date = ?,
          service_credits = ?,
          user_type = 'basic',
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [package_type, todayStr, endStr, pkgDef.credits, userId]);

    logger.info(`[Credits] 구독 재활성화: userId=${userId}, package=${package_type}`);

    res.json({
      success: true,
      message: '구독이 재활성화되었습니다.',
      data: { package: package_type, credits: pkgDef.credits, startDate: todayStr, endDate: endStr }
    });
  } catch (error) {
    logger.error('[Credits] 재활성화 실패:', error.message);
    res.status(500).json({ success: false, error: '구독 재활성화 실패' });
  }
});

/**
 * POST /api/credits/cancel-paid
 * 일반 크레딧 취소
 */
router.post('/cancel-paid', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { amount } = req.body;

    await db.run('UPDATE users_credits SET paid_credits = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [userId]);

    // 비동기 크레딧 취소 검증
    setImmediate(async () => {
      try {
        const result = await verifier.verifyCreditCancel(userId);
        logger.info(`[Credits] 크레딧 취소 검증 완료: ${result.passed ? 'PASSED' : 'FAILED'} (${result.passedSteps}/${result.totalSteps})`);
      } catch (e) {
        logger.warn('[Credits] 크레딧 취소 검증 호출 실패:', e.message);
      }
    });

    logger.info(`[Credits] paid 크레딧 취소: userId=${userId}, amount=${amount}`);

    res.json({ success: true, message: '크레딧이 취소되었습니다.' });
  } catch (error) {
    logger.error('[Credits] cancel-paid 실패:', error.message);
    res.status(500).json({ success: false, error: '크레딧 취소 실패' });
  }
});

// ══════════════════════════════════════════════════════
//  검증 결과 조회 API — 원본 동등 구현
// ══════════════════════════════════════════════════════

/**
 * GET /api/credits/verification-result/:runId
 * 특정 검증 실행 결과 조회
 */
router.get('/verification-result/:runId', async (req, res) => {
  try {
    const result = await verifier.getVerificationResult(req.params.runId);
    if (!result) {
      return res.status(404).json({ success: false, error: '검증 결과를 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('[Credits] verification-result 조회 실패:', error.message);
    res.status(500).json({ success: false, error: '검증 결과 조회 실패' });
  }
});

/**
 * GET /api/credits/verification-history/:sessionId
 * 세션별 검증 이력 조회
 */
router.get('/verification-history/:sessionId', async (req, res) => {
  try {
    const history = await verifier.getVerificationHistory(req.params.sessionId);
    res.json({ success: true, data: history || [] });
  } catch (error) {
    logger.error('[Credits] verification-history 조회 실패:', error.message);
    res.status(500).json({ success: false, error: '검증 이력 조회 실패' });
  }
});

/**
 * GET /api/credits/verification-alerts
 * 미확인 검증 알림 조회
 */
router.get('/verification-alerts', async (req, res) => {
  try {
    const userId = getUserId(req);
    const alerts = await verifier.getUnacknowledgedAlerts(userId);
    res.json({ success: true, data: alerts || [] });
  } catch (error) {
    logger.error('[Credits] verification-alerts 조회 실패:', error.message);
    res.status(500).json({ success: false, error: '검증 알림 조회 실패' });
  }
});

/**
 * POST /api/credits/verification-alerts/:alertId/acknowledge
 * 검증 알림 확인 처리
 */
router.post('/verification-alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const userId = getUserId(req);
    await verifier.acknowledgeAlert(req.params.alertId, userId);
    res.json({ success: true, message: '알림 확인 완료' });
  } catch (error) {
    logger.error('[Credits] alert acknowledge 실패:', error.message);
    res.status(500).json({ success: false, error: '알림 확인 실패' });
  }
});

/**
 * POST /api/credits/verification-alerts/acknowledge-all
 * 모든 검증 알림 일괄 확인
 */
router.post('/verification-alerts/acknowledge-all', async (req, res) => {
  try {
    const userId = getUserId(req);
    await verifier.acknowledgeAllAlerts(userId);
    res.json({ success: true, message: '모든 알림 확인 완료' });
  } catch (error) {
    logger.error('[Credits] acknowledge-all 실패:', error.message);
    res.status(500).json({ success: false, error: '일괄 확인 실패' });
  }
});

module.exports = router;
