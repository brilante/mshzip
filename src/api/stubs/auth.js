'use strict';

const express = require('express');
const router = express.Router();
const passport = require('passport');
const logger = require('../../utils/logger');

/**
 * GET /api/auth/check - 인증 상태 확인 (스텁)
 * 로컬 개발용: 항상 인증됨으로 응답
 */
router.get('/check', (req, res) => {
  let username = req.session?.userId || req.session?.passport?.user?.username;
  if (!username) {
    username = 'dev';
    // 세션에 userId 설정 (후속 API 호출에서 인증 실패 방지)
    if (req.session) {
      req.session.userId = username;
      // resave:false 환경에서도 세션 변경이 저장되도록 명시적 save
      req.session.save(() => {});
    }
  }
  logger.info('인증 확인 (스텁)', { username });
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
      username,
      email: 'dev@local'
    }
  });
});

/**
 * POST /api/auth/login - 로그인 (스텁)
 */
router.post('/login', (req, res) => {
  const username = req.body.username || 'dev';
  const email = req.body.email || `${username}@local`;
  logger.info('로그인 요청 (스텁)', { username });

  // 세션에 사용자 정보 저장 (getUserId에서 사용)
  if (req.session) {
    req.session.userId = username;
    req.session.email = email;
  }

  res.json({
    success: true,
    message: '로그인 성공 (스텁)',
    user: {
      username,
      email
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
 * GET /api/auth/user - 현재 사용자 정보 조회
 */
router.get('/user', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: '로그인이 필요합니다.'
    });
  }

  res.json({
    success: true,
    user: {
      username: req.session.userId,
      email: req.session.email || ''
    }
  });
});

/**
 * GET /api/auth/admin-check - 관리자 확인 (스텁)
 * 세션에서 인증 상태를 확인하여 isVerified 반환
 */
router.get('/admin-check', (req, res) => {
  const isVerified = req.session?.adminVerified || false;
  res.json({
    success: true,
    isAdmin: true,
    isVerified: isVerified,
    isLocked: false
  });
});

/**
 * POST /api/auth/admin-verify - 관리자 인증 (스텁)
 * 비밀번호 검증 후 세션에 인증 상태 저장
 */
router.post('/admin-verify', (req, res) => {
  const password = req.body?.password;

  // 스텁: 로컬 개발용 비밀번호 '1' 허용 (CLAUDE.md 기준)
  if (password === '1' || password === process.env.TEST_ADMIN_PASSWORD) {
    // 세션에 관리자 인증 상태 저장
    if (req.session) {
      req.session.adminVerified = true;
      req.session.adminVerifiedAt = Date.now();
      req.session.save(() => {});
    }
    logger.info('관리자 인증 성공 (스텁)');
    res.json({ success: true, verified: true });
  } else {
    logger.warn('관리자 인증 실패 (스텁)');
    res.json({ success: false, verified: false, message: '관리자 비밀번호가 올바르지 않습니다.' });
  }
});

/**
 * POST /api/auth/verify-role - 역할 토큰 검증 (스텁)
 */
router.post('/verify-role', (req, res) => {
  const { _xt } = req.body || {};
  const isVerified = req.session?.adminVerified || false;

  if (_xt) {
    res.json({
      success: true,
      isAdmin: true,
      isVerified: isVerified,
      tokenValid: true,
      _xt
    });
  } else {
    res.json({
      success: true,
      isAdmin: true,
      isVerified: isVerified,
      tokenValid: false
    });
  }
});

/**
 * POST /api/auth/admin-logout - 관리자 인증 해제 (스텁)
 */
router.post('/admin-logout', (req, res) => {
  if (req.session) {
    delete req.session.adminVerified;
    delete req.session.adminVerifiedAt;
    req.session.save(() => {});
  }
  logger.info('관리자 세션 해제 (스텁)');
  res.json({ success: true, message: '관리자 세션 해제' });
});

/**
 * GET /api/auth/google - Google OAuth 시작
 */
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account'
}));

/**
 * GET /api/auth/google/callback - Google OAuth 콜백
 */
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) {
      logger.error('Google OAuth 에러', { error: err.message });
      return res.redirect('/login?error=oauth');
    }
    if (!user) {
      logger.warn('Google OAuth 사용자 없음', { info });
      return res.redirect('/login?error=denied');
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        logger.error('세션 생성 실패', { error: loginErr.message });
        return res.redirect('/login?error=session');
      }
      logger.info('Google 로그인 성공', { username: user.username });
      return res.redirect('/');
    });
  })(req, res, next);
});

module.exports = router;
