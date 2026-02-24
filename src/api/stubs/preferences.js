'use strict';

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');

/**
 * GET /api/preferences - 사용자 선호 설정 (스텁)
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    preferences: {
      aiService: 'gpt',
      aiModel: 'gpt-4o-mini'
    }
  });
});

/**
 * POST /api/preferences - 선호 설정 저장 (스텁)
 */
router.post('/', (req, res) => {
  logger.info('선호 설정 저장 (스텁)', req.body);
  res.json({
    success: true,
    preferences: req.body
  });
});

module.exports = router;
