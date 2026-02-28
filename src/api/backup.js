/**
 * 백업 API 라우터
 * 백업 스케줄 조회, 수동 백업, 히스토리, 복원 기능
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const backupService = require('../services/backupService');
const { BackupSchedule, BackupHistory } = require('../db/models/BackupSchedule');
const errorLogger = require('../services/errorLogger');

// 사용자별 백업 진행 상태 (동시 요청 방지)
const backupInProgress = new Map();

/**
 * 인증 미들웨어
 */
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
  next();
};

/**
 * 백업 스케줄 조회
 * GET /api/backup/schedule
 */
router.get('/schedule', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const schedule = await BackupSchedule.getByUserId(userId);

    if (!schedule) {
      return res.json({
        exists: false,
        message: '백업 스케줄이 없습니다.'
      });
    }

    res.json({
      exists: true,
      firstLogin: schedule.first_login,
      nextBackup: schedule.next_backup,
      lastBackup: schedule.last_backup,
      backupCount: schedule.backup_count || 0,
      isDriveUser: schedule.is_drive_user === 1,
      maxBackups: schedule.max_backups || 30
    });
  } catch (error) {
    errorLogger.error('백업 스케줄 조회 실패', error, {
      source: 'api.backup.schedule',
      userId: req.session?.userId,
      requestPath: req.originalUrl
    });
    console.error('[Backup API] Schedule error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 백업 상태 확인 (30개 초과 여부)
 * GET /api/backup/status
 */
router.get('/status', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const status = backupService.getBackupStatus(userId);

    res.json(status);
  } catch (error) {
    errorLogger.error('백업 상태 조회 실패', error, {
      source: 'api.backup.status',
      userId: req.session?.userId,
      requestPath: req.originalUrl
    });
    console.error('[Backup API] Status error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 수동 백업 실행
 * POST /api/backup/run
 * Body: { confirmed: boolean } - 30개 초과 시 삭제 확인 여부
 */
router.post('/run', requireAuth, async (req, res) => {
  const userId = req.session.userId;

  // 동시 백업 요청 방지
  if (backupInProgress.get(userId)) {
    console.log(`[Backup API] Backup already in progress for user: ${userId}`);
    return res.status(429).json({
      success: false,
      error: '백업이 이미 진행 중입니다. 잠시 후 다시 시도해주세요.'
    });
  }

  // 백업 시작 표시
  backupInProgress.set(userId, true);

  try {
    // confirmed 값 검증 (이벤트 객체가 전달되는 경우 방지)
    const confirmedValue = req.body?.confirmed === true;
    const result = await backupService.runManualBackup(userId, confirmedValue);

    // result가 없는 경우 처리
    if (!result) {
      return res.status(500).json({
        success: false,
        error: '백업 서비스 응답 없음'
      });
    }

    // 확인이 필요한 경우
    if (result.needsConfirmation) {
      return res.json({
        success: false,
        needsConfirmation: true,
        currentCount: result.currentCount,
        maxBackups: result.maxBackups,
        oldestBackup: result.oldestBackup,
        message: result.message
      });
    }

    if (result.success) {
      const historyList = await BackupHistory.getByUserId(userId, { limit: 1 });
      const history = Array.isArray(historyList) ? historyList[0] : null;

      res.json({
        success: true,
        backupPath: history?.backup_path,
        size: history?.backup_size,
        mindmapCount: history?.mindmap_count,
        fileCount: history?.node_count,
        backupLocation: result.backupLocation || history?.backup_location || 'local',
        driveFailed: result.driveFailed || false,
        driveError: result.driveError || null
      });
    } else {
      const statusCode = result.error === '백업할 데이터가 없습니다.' ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        error: result.error || '백업 실행 실패'
      });
    }
  } catch (error) {
    errorLogger.error('수동 백업 실행 실패', error, {
      source: 'api.backup.run',
      userId: req.session?.userId,
      requestPath: req.originalUrl,
      extra: { confirmed: req.body?.confirmed }
    });
    console.error('[Backup API] Run error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // 백업 완료 표시
    backupInProgress.delete(userId);
  }
});

/**
 * 백업 히스토리 조회
 * GET /api/backup/history
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const history = await BackupHistory.getByUserId(userId, { limit, offset });
    const totalCount = await BackupHistory.getBackupCount(userId);

    // 배열 보장
    const historyArray = Array.isArray(history) ? history : [];

    res.json({
      backups: historyArray.map(h => ({
        id: h.id,
        backupPath: h.backup_path,
        backupSize: h.backup_size,
        mindmapCount: h.mindmap_count,
        nodeCount: h.node_count,
        status: h.status,
        errorMessage: h.error_message,
        createdAt: h.created_at,
        backupLocation: h.backup_location || 'local',
        driveFileId: h.drive_file_id || null
      })),
      total: totalCount || 0,
      limit,
      offset
    });
  } catch (error) {
    errorLogger.error('백업 히스토리 조회 실패', error, {
      source: 'api.backup.history',
      userId: req.session?.userId,
      requestPath: req.originalUrl,
      extra: { limit: req.query?.limit, offset: req.query?.offset }
    });
    console.error('[Backup API] History error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 백업에서 복원
 * POST /api/backup/restore/:backupId
 */
router.post('/restore/:backupId', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { backupId } = req.params;
    const { targetFolder, backupFirst } = req.body;

    // 보안: targetFolder Path Traversal 방지
    if (targetFolder && (targetFolder.includes('..') || targetFolder.includes('/') || targetFolder.includes('\\'))) {
      return res.status(400).json({ error: '잘못된 폴더 경로입니다.' });
    }

    const result = await backupService.restoreFromBackup(userId, parseInt(backupId), targetFolder, { backupFirst: backupFirst !== false });

    res.json(result);
  } catch (error) {
    errorLogger.error('백업 복원 실패', error, {
      source: 'api.backup.restore',
      userId: req.session?.userId,
      requestPath: req.originalUrl,
      extra: { backupId: req.params?.backupId, targetFolder: req.body?.targetFolder }
    });
    console.error('[Backup API] Restore error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 백업 삭제 (실제 파일 삭제 + DB 소프트 삭제)
 * DELETE /api/backup/:backupId
 * Drive 백업: Drive에서 실제 파일 삭제
 * 로컬 백업: 디스크에서 실제 ZIP 파일 삭제
 */
router.delete('/:backupId', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { backupId } = req.params;

    // 백업 소유권 확인
    const backup = await BackupHistory.getById(parseInt(backupId));
    if (!backup || backup.user_id !== userId) {
      return res.status(404).json({ error: '백업을 찾을 수 없습니다.' });
    }

    // 실제 파일 삭제
    if (backup.backup_location === 'drive' && backup.drive_file_id) {
      // Drive 백업: 클라우드에서 실제 삭제
      try {
        const driveService = require('../services/driveService');
        await driveService.deleteBackup(userId, backup.drive_file_id);
        console.log(`[Backup API] Drive 파일 삭제 완료: fileId=${backup.drive_file_id}`);
      } catch (driveErr) {
        // Drive 삭제 실패해도 DB 삭제는 진행 (파일이 이미 없을 수 있음)
        console.warn(`[Backup API] Drive 파일 삭제 실패 (DB 삭제 계속): ${driveErr.message}`);
      }
    } else if (backup.backup_path) {
      // 로컬 백업: 디스크에서 실제 삭제
      try {
        if (fs.existsSync(backup.backup_path)) {
          if (backup.backup_path.endsWith('.zip')) {
            fs.unlinkSync(backup.backup_path);
          } else {
            fs.rmSync(backup.backup_path, { recursive: true, force: true });
          }
          console.log(`[Backup API] 로컬 파일 삭제 완료: ${backup.backup_path}`);
        }
      } catch (fsErr) {
        console.warn(`[Backup API] 로컬 파일 삭제 실패 (DB 삭제 계속): ${fsErr.message}`);
      }
    }

    // DB 소프트 삭제
    const result = await BackupHistory.softDelete(parseInt(backupId));
    if (!result || result.changes === 0) {
      return res.status(500).json({ error: '백업 삭제에 실패했습니다.' });
    }

    res.json({ success: true, message: '백업이 삭제되었습니다.' });
  } catch (error) {
    errorLogger.error('백업 삭제 실패', error, {
      source: 'api.backup.delete',
      userId: req.session?.userId,
      requestPath: req.originalUrl,
      extra: { backupId: req.params?.backupId }
    });
    console.error('[Backup API] Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 최대 백업 수 설정
 * PUT /api/backup/settings/max-backups
 */
router.put('/settings/max-backups', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { maxBackups } = req.body;

    if (!maxBackups || maxBackups < 1 || maxBackups > 30) {
      return res.status(400).json({ error: '최대 백업 수는 1-30 사이여야 합니다.' });
    }

    await BackupSchedule.setMaxBackups(userId, maxBackups);

    res.json({ success: true, maxBackups });
  } catch (error) {
    errorLogger.error('백업 설정 변경 실패', error, {
      source: 'api.backup.settings',
      userId: req.session?.userId,
      requestPath: req.originalUrl,
      extra: { maxBackups: req.body?.maxBackups }
    });
    console.error('[Backup API] Settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
