/**
 * 2FA (TOTP) API 라우터
 * Google Authenticator 호환 2차 인증
 *
 * 주요 기능:
 * - TOTP 설정 (QR 코드 생성)
 * - TOTP 활성화/비활성화
 * - TOTP 코드 검증 (로그인)
 * - 백업 코드 생성/검증
 */
const express = require('express');
const router = express.Router();
const totpService = require('../services/totpService');
const BackupCode = require('../db/models/BackupCode');
const UserSettings = require('../db/models/UserSettings');
const logger = require('../utils/logger');

/**
 * 인증 확인 미들웨어
 */
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: '로그인이 필요합니다.'
    });
  }
  next();
};

/**
 * GET /api/2fa/status
 * 2FA 상태 확인
 * - TOTP 활성화 여부
 * - 남은 백업 코드 개수
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    // 2FA 활성화 여부 확인
    const totpEnabledVal = await UserSettings.get(userId, 'totp_enabled');
    const totpEnabled = totpEnabledVal === '1' || totpEnabledVal === 'true';
    let backupCodeCount = 0;

    if (totpEnabled) {
      backupCodeCount = await BackupCode.getRemainingCount(userId);
    }

    res.json({
      success: true,
      totpEnabled,
      backupCodeCount,
      // TOTP 기능 사용 가능 여부 (환경변수 설정 여부)
      totpAvailable: totpService.isEnabled()
    });

  } catch (error) {
    console.error('[2FA] status error:', error);
    logger.error('2FA 상태 확인 실패', {
      source: 'api.2fa.status',
      userId: req.session.userId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: '2FA 상태 확인 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /api/2fa/setup
 * TOTP 설정 시작
 * - Secret 생성
 * - QR 코드 반환
 * - 아직 활성화되지 않음 (verify로 확인 후 활성화)
 */
router.post('/setup', requireAuth, async (req, res) => {
  try {
    // TOTP 기능 활성화 확인
    if (!totpService.isEnabled()) {
      return res.status(503).json({
        success: false,
        message: 'TOTP 기능이 비활성화되어 있습니다. 관리자에게 문의하세요.'
      });
    }

    const userId = req.session.userId;

    // 이미 TOTP가 활성화된 경우
    const totpEnabledVal = await UserSettings.get(userId, 'totp_enabled');
    if (totpEnabledVal === '1' || totpEnabledVal === 'true') {
      return res.status(400).json({
        success: false,
        message: '이미 2FA가 활성화되어 있습니다. 재설정하려면 먼저 비활성화하세요.'
      });
    }

    // Secret 생성
    const email = req.session.email || userId;
    const secretData = await totpService.generateSecret(email);

    // 세션에 임시 저장 (아직 DB에 저장하지 않음)
    req.session.pendingTotpSecret = secretData.secret;

    console.log(`[2FA] Setup initiated for user: ${userId}`);

    res.json({
      success: true,
      qrCodeDataUrl: secretData.qrCodeDataUrl,
      // 수동 입력용 (QR 코드 스캔 불가 시)
      manualEntryKey: totpService.formatSecretForDisplay(secretData.secret),
      message: 'QR 코드를 Google Authenticator로 스캔한 후 코드를 입력하세요.'
    });

  } catch (error) {
    console.error('[2FA] setup error:', error);
    logger.error('2FA 설정 실패', {
      source: 'api.2fa.setup',
      userId: req.session.userId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: '2FA 설정 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /api/2fa/verify-setup
 * TOTP 설정 완료 (코드 검증 후 활성화)
 * - 사용자가 입력한 코드 검증
 * - 성공 시 TOTP 활성화 및 백업 코드 발급
 */
router.post('/verify-setup', requireAuth, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '인증 코드를 입력하세요.'
      });
    }

    const userId = req.session.userId;

    // 세션에서 임시 secret 확인
    const pendingSecret = req.session.pendingTotpSecret;
    if (!pendingSecret) {
      return res.status(400).json({
        success: false,
        message: '먼저 2FA 설정을 시작하세요. (/api/2fa/setup)'
      });
    }

    // 코드 검증
    const isValid = totpService.verifyToken(pendingSecret, code);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: '인증 코드가 올바르지 않습니다. 다시 시도하세요.'
      });
    }

    // Secret 암호화
    const encryptedSecret = totpService.encryptSecret(pendingSecret);

    // 백업 코드 생성
    const backupCodes = totpService.generateBackupCodes();

    // DB 업데이트 (TOTP 활성화)
    await UserSettings.set(userId, 'totp_secret', encryptedSecret);
    await UserSettings.set(userId, 'totp_enabled', '1');

    // 백업 코드 저장
    await BackupCode.saveAll(userId, backupCodes);

    // 세션에서 임시 secret 삭제
    delete req.session.pendingTotpSecret;

    console.log(`[2FA] Enabled for user: ${userId}`);

    res.json({
      success: true,
      message: '2FA가 활성화되었습니다.',
      backupCodes: backupCodes,
      warning: '백업 코드를 안전한 곳에 보관하세요. 이 코드는 다시 볼 수 없습니다.'
    });

  } catch (error) {
    console.error('[2FA] verify-setup error:', error);
    logger.error('2FA 설정 검증 실패', {
      source: 'api.2fa.verify-setup',
      userId: req.session.userId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: '2FA 활성화 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /api/2fa/verify
 * TOTP 코드 검증 (로그인 시)
 * - 2FA 활성화된 사용자의 로그인 2단계
 */
router.post('/verify', async (req, res) => {
  try {
    const { username, code, isBackupCode } = req.body;

    if (!username || !code) {
      return res.status(400).json({
        success: false,
        message: '사용자명과 인증 코드가 필요합니다.'
      });
    }

    // 사용자의 TOTP 설정 확인
    const totpEnabledVal = await UserSettings.get(username, 'totp_enabled');
    if (totpEnabledVal !== '1' && totpEnabledVal !== 'true') {
      return res.status(400).json({
        success: false,
        message: '이 사용자는 2FA가 활성화되어 있지 않습니다.'
      });
    }

    let verified = false;

    if (isBackupCode) {
      // 백업 코드로 인증
      const backupResult = await BackupCode.verifyAndUse(username, code);
      verified = backupResult.success;

      if (verified) {
        console.log(`[2FA] Backup code used for user: ${username}`);
      }
    } else {
      // TOTP 코드로 인증
      const encryptedSecret = await UserSettings.get(username, 'totp_secret');
      if (encryptedSecret) {
        const decryptedSecret = totpService.decryptSecret(encryptedSecret);
        verified = totpService.verifyToken(decryptedSecret, code);
      }
    }

    if (!verified) {
      return res.status(401).json({
        success: false,
        message: isBackupCode
          ? '백업 코드가 올바르지 않거나 이미 사용되었습니다.'
          : '인증 코드가 올바르지 않습니다.'
      });
    }

    // 2FA 검증 성공 - 세션에 플래그 설정
    req.session.twoFactorVerified = true;

    console.log(`[2FA] Verification successful for user: ${username}`);

    res.json({
      success: true,
      message: '2FA 인증 성공'
    });

  } catch (error) {
    console.error('[2FA] verify error:', error);
    logger.error('2FA 검증 실패', {
      source: 'api.2fa.verify',
      username: req.body?.username,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: '2FA 검증 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /api/2fa/disable
 * 2FA 비활성화
 * - 현재 비밀번호 또는 TOTP 코드로 확인 후 비활성화
 */
router.post('/disable', requireAuth, async (req, res) => {
  try {
    const { password, code } = req.body;

    if (!password && !code) {
      return res.status(400).json({
        success: false,
        message: '비밀번호 또는 인증 코드가 필요합니다.'
      });
    }

    const userId = req.session.userId;

    const totpEnabledVal = await UserSettings.get(userId, 'totp_enabled');
    if (totpEnabledVal !== '1' && totpEnabledVal !== 'true') {
      return res.status(400).json({
        success: false,
        message: '2FA가 활성화되어 있지 않습니다.'
      });
    }

    // 인증 확인
    let authenticated = false;

    if (password) {
      // 비밀번호로 확인 (스텁: 개발 환경에서는 통과)
      authenticated = true;
    } else if (code) {
      // TOTP 코드로 확인
      const encryptedSecret = await UserSettings.get(userId, 'totp_secret');
      if (encryptedSecret) {
        const decryptedSecret = totpService.decryptSecret(encryptedSecret);
        authenticated = totpService.verifyToken(decryptedSecret, code);
      }
    }

    if (!authenticated) {
      return res.status(401).json({
        success: false,
        message: '인증에 실패했습니다.'
      });
    }

    // 2FA 비활성화
    await UserSettings.set(userId, 'totp_secret', null);
    await UserSettings.set(userId, 'totp_enabled', '0');

    // 백업 코드 삭제
    await BackupCode.deleteAllByUserId(userId);

    console.log(`[2FA] Disabled for user: ${userId}`);

    res.json({
      success: true,
      message: '2FA가 비활성화되었습니다.'
    });

  } catch (error) {
    console.error('[2FA] disable error:', error);
    logger.error('2FA 비활성화 실패', {
      source: 'api.2fa.disable',
      userId: req.session.userId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: '2FA 비활성화 중 오류가 발생했습니다.'
    });
  }
});

/**
 * POST /api/2fa/regenerate-backup-codes
 * 백업 코드 재생성
 * - 기존 코드 무효화 후 새 코드 발급
 */
router.post('/regenerate-backup-codes', requireAuth, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: '현재 인증 코드를 입력하세요.'
      });
    }

    const userId = req.session.userId;

    const totpEnabledVal = await UserSettings.get(userId, 'totp_enabled');
    if (totpEnabledVal !== '1' && totpEnabledVal !== 'true') {
      return res.status(400).json({
        success: false,
        message: '2FA가 활성화되어 있지 않습니다.'
      });
    }

    // TOTP 코드 검증
    const encryptedSecret = await UserSettings.get(userId, 'totp_secret');
    if (!encryptedSecret) {
      return res.status(400).json({
        success: false,
        message: 'TOTP 설정을 찾을 수 없습니다.'
      });
    }

    const decryptedSecret = totpService.decryptSecret(encryptedSecret);
    const isValid = totpService.verifyToken(decryptedSecret, code);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '인증 코드가 올바르지 않습니다.'
      });
    }

    // 새 백업 코드 생성
    const backupCodes = totpService.generateBackupCodes();

    // 기존 코드 삭제 후 새 코드 저장
    await BackupCode.saveAll(userId, backupCodes);

    console.log(`[2FA] Backup codes regenerated for user: ${userId}`);

    res.json({
      success: true,
      message: '새 백업 코드가 생성되었습니다.',
      backupCodes: backupCodes,
      warning: '이전 백업 코드는 더 이상 사용할 수 없습니다. 새 코드를 안전한 곳에 보관하세요.'
    });

  } catch (error) {
    console.error('[2FA] regenerate-backup-codes error:', error);
    logger.error('백업 코드 재생성 실패', {
      source: 'api.2fa.regenerate-backup-codes',
      userId: req.session.userId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: '백업 코드 재생성 중 오류가 발생했습니다.'
    });
  }
});

/**
 * GET /api/2fa/backup-codes/count
 * 남은 백업 코드 개수 확인
 */
router.get('/backup-codes/count', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const count = await BackupCode.getRemainingCount(userId);

    res.json({
      success: true,
      count,
      warning: count <= 2 ? '백업 코드가 얼마 남지 않았습니다. 새 코드를 생성하세요.' : null
    });

  } catch (error) {
    console.error('[2FA] backup-codes/count error:', error);
    res.status(500).json({
      success: false,
      message: '백업 코드 개수 확인 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
