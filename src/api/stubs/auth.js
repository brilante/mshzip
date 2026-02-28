'use strict';

const express = require('express');
const router = express.Router();
const passport = require('passport');
const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');
const { generateLoginOkToken } = require('../../utils/loginOkKey');

/**
 * 로그인 성공 시 LOGIN_OK_ACCESSKEY 갱신
 *
 * - 만료 시각을 토큰 내부에 암호화하여 저장 (별도 EXPIRES_AT 불필요)
 * - .env의 LOGIN_OK_ACCESSKEY = lok_<AES-256-GCM 암호화 토큰>
 * - access-keys-data.json 미사용 (토큰 자체로 검증 완결)
 */
function updateLoginOkAccessKey(username) {
  try {
    const envPath = path.join(__dirname, '..', '..', '..', '.env');
    if (!fs.existsSync(envPath)) return;

    // 만료 시각이 내장된 암호화 토큰 생성
    const { token, expiresAt } = generateLoginOkToken(username);

    // .env 갱신
    let content = fs.readFileSync(envPath, 'utf-8');

    if (/^LOGIN_OK_ACCESSKEY=.*$/m.test(content)) {
      content = content.replace(/^LOGIN_OK_ACCESSKEY=.*$/m, `LOGIN_OK_ACCESSKEY=${token}`);
    } else {
      content += `\nLOGIN_OK_ACCESSKEY=${token}`;
    }

    // 이전 버전에서 남은 EXPIRES_AT 라인 제거
    content = content.replace(/^LOGIN_OK_ACCESSKEY_EXPIRES_AT=.*\n?/m, '');

    fs.writeFileSync(envPath, content, 'utf-8');

    // 현재 프로세스 환경변수 갱신
    process.env.LOGIN_OK_ACCESSKEY = token;
    delete process.env.LOGIN_OK_ACCESSKEY_EXPIRES_AT;

    logger.info('[Auth] LOGIN_OK Access Key 발급', {
      username,
      expiresAt: expiresAt.toISOString(),
      tokenPrefix: token.substring(0, 20) + '...'
    });
  } catch (e) {
    logger.warn('[Auth] LOGIN_OK Access Key 발급 실패', { error: e.message });
  }
}

// DB 모델 (지연 로드 - DB 미연결 시 안전)
let User, AdminUser, UserIdMapping;
try {
  User = require('../../db/models/User');
  AdminUser = require('../../db/models/AdminUser');
  UserIdMapping = require('../../db/models/UserIdMapping');
} catch (e) {
  console.warn('[Auth] DB 모델 로드 실패 (스텁 전용 모드):', e.message);
}

/**
 * 로그인 성공 후 — 저장소 존재 확인 및 자동 생성, 세션에 경로 정보 주입
 *
 * ★ 설계 원칙:
 *   - 경로는 오직 DB(user_id_mapping)에서만 결정됨
 *   - .userid 마커 파일 사용 안 함
 *   - 파일시스템 스캔 없음
 *   - 로그인 시 1회 DB 조회 → 세션 캐시 → 이후 API는 캐시만 사용
 *
 * 흐름:
 *   1. DB user_id_mapping 조회
 *   2. 없으면: 오늘 날짜(KST) date_path 생성 → DB INSERT → 폴더 생성
 *   3. 있으면: 폴더 없으면 생성 (폴더가 삭제된 경우 복구)
 *   4. 세션에 userStorageInfo 저장
 *
 * @param {string} username - 사용자 ID
 * @param {Object|null} session - express-session 객체 (선택)
 */
async function ensureUserStorage(username, session = null) {
  if (!username) return;

  try {
    const UserIdEncoder = require('../../utils/userIdEncoder');
    const saveDir = path.join(__dirname, '..', '..', '..', 'save');

    let folderName;  // user_id_hash
    let datePath = null;

    // 1. DB에서 기존 매핑 조회
    if (UserIdMapping) {
      const mapping = await UserIdMapping.findByUserId(username);

      if (mapping) {
        // 기존 매핑 사용
        folderName = mapping.user_id_hash;
        datePath   = mapping.date_path || null;
        logger.info('[Auth] DB 매핑 확인', { username, datePath });
      } else {
        // 2. 신규 사용자: 오늘 날짜(KST) 기준 date_path 생성
        folderName = UserIdEncoder.encode(username);
        datePath   = UserIdEncoder.calculateDatePath();  // 'yyyy/yyyyMM/yyyyMMdd'
        const legacyFolder = UserIdEncoder.encodeLegacy(username);
        await UserIdMapping.create(username, folderName, legacyFolder, datePath);
        logger.info('[Auth] 신규 DB 매핑 등록', { username, datePath });
      }
    } else {
      // DB 없음: encode 기본값
      folderName = UserIdEncoder.encode(username);
    }

    // 3. 물리 폴더 생성 (없으면) — date_path 적용
    const userSaveDir = datePath
      ? path.join(saveDir, ...datePath.split('/'), folderName)
      : path.join(saveDir, folderName);

    if (!fs.existsSync(userSaveDir)) {
      fs.mkdirSync(userSaveDir, { recursive: true });
      logger.info('[Auth] 저장소 폴더 생성', { username, path: userSaveDir });
    }

    // 4. 세션에 저장 경로 정보 기록 (이후 캐시로 사용, 세션 만료 시 자동 파기)
    const relativePath = datePath
      ? `${datePath}/${folderName}`
      : folderName;

    // UserIdEncoder 캐시도 동시에 워밍 (이후 resolveUserPath DB 재조회 없음)
    const cache = UserIdEncoder._folderCache;
    if (cache) {
      cache.set(`resolve_${username}`, relativePath);
      cache.set(String(username), relativePath);
    }

    if (session) {
      session.userStorageInfo = {
        userId:       username,
        datePath:     datePath || null,
        hash:         folderName,
        relativePath: relativePath,
        absolutePath: userSaveDir.replace(/\\/g, '/'),
        loadedAt:     new Date().toISOString()
      };
      logger.info('[Auth] 세션에 경로 정보 주입', { username, relativePath });
    }

    // 5. BackupSchedule 자동 생성 (없으면)
    try {
      const { BackupSchedule } = require('../../db/models/BackupSchedule');
      const existing = await BackupSchedule.getByUserId(username);
      if (!existing) {
        await BackupSchedule.create(username, new Date().toISOString());
        logger.info('[Auth] BackupSchedule 생성', { username });
      }
    } catch (bsErr) {
      logger.warn('[Auth] BackupSchedule 생성 실패', { username, error: bsErr.message });
    }
  } catch (e) {
    logger.warn('[Auth] ensureUserStorage 실패 (로그인 계속 진행)', { username, error: e.message });
  }
}

/**
 * GET /api/auth/check - 인증 상태 확인
 * 세션에 userId가 있으면 반환, 없으면 미인증 상태 반환
 */
router.get('/check', (req, res) => {
  const username = req.session?.userId || req.session?.passport?.user?.username;
  const email = req.session?.email || req.session?.passport?.user?.email;

  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  if (!username) {
    return res.json({
      success: true,
      authenticated: false,
      isLoggedIn: false,
      user: null
    });
  }

  logger.info('인증 확인', { username });
  res.json({
    success: true,
    authenticated: true,
    isLoggedIn: true,
    user: {
      username,
      email: email || ''
    }
  });
});

/**
 * POST /api/auth/login - 로그인 (DB 검증)
 * DB 연결 시 실제 비밀번호 검증, 미연결 시 스텁 동작
 */
router.post('/login', async (req, res) => {
  const username = (req.body.username || '').toLowerCase();
  const password = req.body.password || '';
  logger.info('로그인 요청', { username });

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: '사용자 이름과 비밀번호를 입력하세요.'
    });
  }

  // DB 검증 시도
  if (User) {
    try {
      const result = await User.verifyPassword(username, password);
      if (result.success) {
        // 세션에 사용자 정보 저장
        if (req.session) {
          req.session.userId = username;
          req.session.email = result.user.email;
        }
        // .env LOGIN_OK 갱신 (Claude Code Hook 연동)
        updateLoginOkAccessKey(username);
        // 저장소 자동 생성 + 세션에 경로 정보 주입
        ensureUserStorage(username, req.session).catch(() => {});
        logger.info('로그인 성공', { username });
        return res.json({
          success: true,
          message: '로그인 성공',
          user: {
            username,
            email: result.user.email
          }
        });
      } else {
        logger.warn('로그인 실패', { username, message: result.message });
        return res.status(401).json({
          success: false,
          message: result.message || '사용자 이름 또는 비밀번호가 잘못되었습니다.'
        });
      }
    } catch (dbErr) {
      // DB 오류 시 스텁 폴백
      logger.warn('로그인 DB 검증 실패, 스텁 폴백', { error: dbErr.message });
    }
  }

  // 스텁 폴백 (DB 미연결)
  const email = req.body.email || `${username}@local`;
  if (req.session) {
    req.session.userId = username;
    req.session.email = email;
  }
  // .env LOGIN_OK 갱신 (Claude Code Hook 연동)
  updateLoginOkAccessKey(username);
  // 저장소 자동 생성 + 세션에 경로 정보 주입
  ensureUserStorage(username, req.session).catch(() => {});
  res.json({
    success: true,
    message: '로그인 성공 (스텁)',
    user: { username, email }
  });
});

/**
 * POST /api/auth/logout - 로그아웃
 * 세션 파기 + 쿠키 삭제 (참고소스 동등 구현)
 */
router.post('/logout', (req, res) => {
  const userId = req.session?.userId;
  logger.info('로그아웃 요청', { userId });

  if (!req.session) {
    return res.json({ success: true, message: '로그아웃 완료' });
  }

  req.session.destroy((err) => {
    if (err) {
      logger.error('로그아웃 세션 파기 실패', { error: err.message });
      return res.status(500).json({
        success: false,
        message: '로그아웃 중 오류가 발생했습니다.'
      });
    }

    // 세션 쿠키 삭제
    res.clearCookie('connect.sid', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    logger.info('로그아웃 완료', { userId });
    res.json({ success: true, message: '로그아웃 완료' });
  });
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
 * GET /api/auth/admin-check - 관리자 확인 (DB 연동)
 * 실제 admin_users 테이블에서 관리자 여부 확인
 */
router.get('/admin-check', async (req, res) => {
  const userId = req.session?.userId || (process.env.TEST_ADMIN_USERNAME || '').toLowerCase() || 'dev';
  const isVerified = req.session?.adminVerified || false;

  // DB에서 실제 관리자 여부 확인
  let isAdmin = true; // 스텁 기본값
  if (AdminUser) {
    try {
      isAdmin = await AdminUser.isAdmin(userId);
    } catch (dbErr) {
      logger.warn('[admin-check] DB 조회 실패, 스텁 폴백', { error: dbErr.message });
    }
  }

  res.json({
    success: true,
    isAdmin,
    isVerified: isVerified,
    isLocked: false
  });
});

/**
 * POST /api/auth/admin-verify - 관리자 인증 (스텁)
 * 비밀번호 검증 후 세션에 인증 상태 저장
 */
router.post('/admin-verify', async (req, res) => {
  const password = req.body?.password;

  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, verified: false, message: '로그인이 필요합니다.' });
  }

  const userId = req.session.userId;

  // 관리자 여부 확인
  let isAdmin = false;
  try {
    if (AdminUser) {
      isAdmin = await AdminUser.isAdmin(userId);
    }
  } catch (e) {
    // DB 미연결 시 스텁 모드
  }
  if (!isAdmin) {
    // 스텁 환경: 세션 기반 fallback
    isAdmin = true;
  }

  // 비밀번호 검증 (DB 우선, 스텁 fallback)
  let passwordValid = false;
  try {
    if (AdminUser) {
      const result = await AdminUser.verifyPassword(userId, password);
      passwordValid = result.success;
      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          verified: false,
          message: result.message || '관리자 비밀번호가 올바르지 않습니다.',
          remainingAttempts: result.remainingAttempts,
          lockedUntil: result.lockedUntil
        });
      }
    }
  } catch (e) {
    // DB 미연결 시 하드코딩 비밀번호 사용
  }

  // DB 검증 실패/불가 시 스텁 비밀번호 체크
  if (!passwordValid) {
    if (password === '1' || password === process.env.TEST_ADMIN_PASSWORD) {
      passwordValid = true;
    } else {
      return res.json({ success: false, verified: false, message: '관리자 비밀번호가 올바르지 않습니다.' });
    }
  }

  // 세션에 관리자 인증 상태 저장 (원본과 동일: ISO 문자열)
  req.session.adminVerified = true;
  req.session.adminVerifiedAt = new Date().toISOString();

  logger.info('관리자 인증 성공 (스텁)', { userId });
  return res.json({
    success: true,
    verified: true,
    message: '관리자 인증 성공',
    expiresIn: 3600
  });
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
      // 세션에 사용자 정보 저장
      if (req.session) {
        req.session.userId = user.username;
        req.session.email = user.email || '';
        req.session.save(() => {});
      }
      // .env LOGIN_OK 갱신 (Claude Code Hook 연동)
      updateLoginOkAccessKey(user.username);
      // 저장소 자동 생성 + 세션에 경로 정보 주입
      ensureUserStorage(user.username, req.session).catch(() => {});
      logger.info('Google 로그인 성공', { username: user.username });
      return res.redirect('/');
    });
  })(req, res, next);
});

module.exports = router;
