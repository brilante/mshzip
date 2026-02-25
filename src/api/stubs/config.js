'use strict';

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');

/**
 * GET /api/config/info - 서버 설정 정보 (스텁)
 */
router.get('/info', (req, res) => {
  logger.info('설정 정보 요청 (스텁)');
  res.json({
    success: true,
    config: {
      port: parseInt(process.env.PORT) || 5858,
      environment: 'local',
      savePath: './save'
    }
  });
});

/**
 * GET /api/config/auth-token - 인증 토큰 (스텁)
 */
router.get('/auth-token', (req, res) => {
  const port = parseInt(process.env.PORT) || 5858;
  res.json({
    success: true,
    token: 'dev-stub-token-' + port,
    port
  });
});

module.exports = router;
