'use strict';

const express = require('express');
const router = express.Router();

/**
 * GET /api/packages - 요금제 패키지 목록 (스텁)
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    packages: {},
    count: 0,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
