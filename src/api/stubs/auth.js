'use strict';

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');

/**
 * GET /api/auth/check - 인증 상태 확인 (스텁)
 * 로컬 개발용: 항상 인증됨으로 응답
 */
router.get('/check', (req, res) => {
  logger.info('인증 확인 (스텁)');
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  res.json({
    success: true,
    authenticated: true,
    isLoggedIn: true,
    user: {
      username: 'dev',
      email: 'dev@local'
    }
  });
});

/**
 * POST /api/auth/login - 로그인 (스텁)
 */
router.post('/login', (req, res) => {
  logger.info('로그인 요청 (스텁)', { username: req.body.username });
  res.json({
    success: true,
    message: '로그인 성공 (스텁)',
    user: {
      username: req.body.username || 'dev',
      email: 'dev@local'
    }
  });
});

/**
 * POST /api/auth/logout - 로그아웃 (스텁)
 */
router.post('/logout', (req, res) => {
  logger.info('로그아웃 요청 (스텁)');
  res.json({ success: true, message: '로그아웃 완료 (스텁)' });
});

/**
 * GET /api/auth/admin-check - 관리자 확인 (스텁)
 */
router.get('/admin-check', (req, res) => {
  res.json({ success: true, isAdmin: true });
});

/**
 * POST /api/auth/admin-verify - 관리자 인증 (스텁)
 */
router.post('/admin-verify', (req, res) => {
  res.json({ success: true, verified: true });
});

module.exports = router;
