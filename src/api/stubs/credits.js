'use strict';

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');

/**
 * GET /api/credits/models - AI 모델 목록 (스텁)
 */
router.get('/models', (req, res) => {
  logger.info('모델 목록 요청 (스텁)');
  res.json({
    success: true,
    data: {
      models: {
        gpt: [
          {
            model: 'gpt-4o',
            displayName: 'GPT-4o',
            costInput: 2.5,
            costOutput: 10,
            creditsInput: 5,
            creditsOutput: 15,
            isDefault: false
          },
          {
            model: 'gpt-4o-mini',
            displayName: 'GPT-4o Mini',
            costInput: 0.15,
            costOutput: 0.6,
            creditsInput: 1,
            creditsOutput: 2,
            isDefault: true
          }
        ],
        claude: [
          {
            model: 'claude-sonnet-4-20250514',
            displayName: 'Claude Sonnet 4',
            costInput: 3,
            costOutput: 15,
            creditsInput: 6,
            creditsOutput: 20,
            isDefault: true
          }
        ]
      },
      enabledServices: ['gpt', 'claude'],
      count: 3,
      environment: 'local'
    }
  });
});

/**
 * GET /api/credits/balance - 크레딧 잔액 (스텁)
 */
router.get('/balance', (req, res) => {
  res.json({
    success: true,
    data: { balance: 99999, currency: 'credits' }
  });
});

module.exports = router;
