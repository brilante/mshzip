'use strict';

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');

/**
 * 미구현 API catch-all (스텁)
 * 404 대신 빈 성공 응답 반환 → 프론트엔드 에러 방지
 */
router.all('*', (req, res) => {
  logger.warn(`미구현 API 호출: ${req.method} ${req.originalUrl}`);
  res.json({
    success: true,
    data: {},
    _stub: true
  });
});

module.exports = router;
