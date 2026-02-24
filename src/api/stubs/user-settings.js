'use strict';

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');

/**
 * GET /api/user/settings - 사용자 설정 (스텁)
 */
router.get('/settings', (req, res) => {
  res.json({
    success: true,
    data: {
      theme: 'light',
      language: 'ko',
      autoSaveInterval: '30',
      defaultNodeExpanded: 'true',
      confirmDelete: 'true',
      editorFontSize: '14',
      defaultService: 'gpt',
      multiAiEnabled: 'false',
      paymentCurrency: 'USD',
      aiServices: JSON.stringify({
        gpt: { enabled: true, model: 'gpt-4o-mini', paymentMethod: 'apikey' },
        claude: { enabled: false, model: 'claude-sonnet-4-20250514', paymentMethod: 'apikey' }
      })
    },
    source: 'default'
  });
});

/**
 * POST /api/user/settings - 사용자 설정 저장 (스텁)
 */
router.post('/settings', (req, res) => {
  logger.info('사용자 설정 저장 (스텁)', req.body);
  res.json({
    success: true,
    message: '설정이 저장되었습니다.',
    saved: Object.keys(req.body).length,
    keys: Object.keys(req.body)
  });
});

module.exports = router;
