'use strict';

const express = require('express');
const router = express.Router();

/**
 * GET /api/packages - 요금제 패키지 목록
 * constants.js와 동일한 패키지 정의를 반환 (단일 진실 소스)
 */
router.get('/', (req, res) => {
  const packages = {
    'lite': {
      name: 'Lite',
      displayName: '라이트',
      basePrice: 3.30,
      priceUSD: 3.63,
      baseUsage: 330000,
      bonusRate: 0.09,
      bonusUsage: 29700,
      totalUsage: 359700,
      expireDays: 30,
      autopayBonusRate: 0.09,
      target: '개인/취미'
    },
    'standard': {
      name: 'Standard',
      displayName: '스탠다드',
      basePrice: 11.00,
      priceUSD: 12.10,
      baseUsage: 1100000,
      bonusRate: 0.07,
      bonusUsage: 77000,
      totalUsage: 1177000,
      expireDays: 30,
      autopayBonusRate: 0.09,
      target: '일반 사용자'
    },
    'pro': {
      name: 'Pro',
      displayName: '프로',
      basePrice: 22.00,
      priceUSD: 24.20,
      baseUsage: 2200000,
      bonusRate: 0.05,
      bonusUsage: 110000,
      totalUsage: 2310000,
      expireDays: 30,
      autopayBonusRate: 0.09,
      target: '헤비 유저'
    },
    'max': {
      name: 'Max',
      displayName: '멕스',
      basePrice: 44.00,
      priceUSD: 48.40,
      baseUsage: 4400000,
      bonusRate: 0.03,
      bonusUsage: 132000,
      totalUsage: 4532000,
      expireDays: 30,
      autopayBonusRate: 0.09,
      target: '헤비 유저/기업'
    }
  };

  res.json({
    success: true,
    packages,
    count: Object.keys(packages).length,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
