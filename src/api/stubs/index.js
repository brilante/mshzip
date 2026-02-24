'use strict';

const express = require('express');
const router = express.Router();

// CSRF 토큰 (루트 레벨: /api/csrf-token)
router.get('/csrf-token', (req, res) => {
  res.json({ success: true, csrfToken: 'dev-csrf-stub-token' });
});

// 도메인별 스텁 라우터
router.use('/auth', require('./auth'));
router.use('/config', require('./config'));
router.use('/credits', require('./credits'));
router.use('/ai', require('./ai'));
router.use('/preferences', require('./preferences'));
router.use('/user', require('./user-settings'));
router.use('/packages', require('./packages'));
router.use('/tools', require('./tools'));

// catch-all은 반드시 마지막 (미구현 API 대응)
router.use('/', require('./catch-all'));

module.exports = router;
