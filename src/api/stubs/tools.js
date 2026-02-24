'use strict';

const express = require('express');
const router = express.Router();

/**
 * GET /api/tools - 도구 카테고리 목록 (스텁)
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      categories: [],
      totalCount: 0,
      categoryCount: 0
    }
  });
});

/**
 * GET /api/tools/:toolId - 개별 도구 (스텁)
 */
router.get('/:toolId', (req, res) => {
  res.json({
    success: false,
    error: '도구를 찾을 수 없습니다 (스텁)'
  });
});

module.exports = router;
