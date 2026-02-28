/**
 * 서버 자동 백업 서비스
 * 첫 로그인 24시간 후 자동 백업 시작, 매일 실행
 *
 * 백업 정책:
 * - 1계정당 최대 30개 백업 유지
 * - 생성 후 1년(365일) 지난 백업 자동 삭제
 * - 30개 초과 시 가장 오래된 백업 삭제 후 새 백업 생성 (사용자 확인 필요)
 * - 백업은 ZIP 형식으로 압축 저장
 * - 복구 시 기존 데이터를 먼저 백업한 후 복구 진행
 */

const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const archiver = require('archiver');
const extractZip = require('extract-zip');
const { BackupSchedule, BackupHistory } = require('../db/models/BackupSchedule');
const DriveSettings = require('../db/models/DriveSettings');
const errorLogger = require('./errorLogger');
const intlServer = require('../utils/intlServer');
const UserIdEncoder = require('../utils/userIdEncoder');

// 경로 설정 (config.js 없이 직접 설정)
const SAVE_DIR = path.join(__dirname, '../../save');
const ROOT_DIR = path.join(__dirname, '../..');

class BackupService {
  constructor() {
    this.backupPath = path.join(__dirname, '../../save_backup');
    this.isRunning = false;
  }

  /**
   * 서비스 시작
   */
  start() {
    console.log('[BackupService] Backup Service started');

    // 백업 폴더 생성
    if (!fs.existsSync(this.backupPath)) {
      fs.mkdirSync(this.backupPath, { recursive: true });
      console.log('[BackupService] Backup directory created:', this.backupPath);
    }

    // 매 시간 정각에 백업 스케줄 체크
    schedule.scheduleJob('0 * * * *', () => {
      this.checkAndRunBackups();
    });

    // 매일 자정(00:00)에 1년(365일) 경과 백업 삭제 배치 실행
    schedule.scheduleJob('0 0 * * *', () => {
      console.log('[BackupService] ========== 1년(365일) 경과 백업 삭제 배치 시작 ==========');
      this.cleanAllExpiredBackups();
    });
    console.log('[BackupService] Daily cleanup scheduled at 00:00 (midnight)');

    // 서버 시작 후 1분 뒤 첫 체크
    setTimeout(() => this.checkAndRunBackups(), 60000);
  }

  /**
   * 백업 대상 확인 및 실행
   */
  async checkAndRunBackups() {
    if (this.isRunning) {
      console.log('[BackupService] Backup already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();
    let backupCount = 0;

    try {
      const dueBackups = await BackupSchedule.getDueBackups();
      console.log(`[BackupService] Found ${dueBackups.length} users due for backup`);

      for (const sched of dueBackups) {
        await this.runBackupForUser(sched.user_id);
        backupCount++;
      }
    } catch (error) {
      errorLogger.error(
        '백업 스케줄 체크 실패',
        error,
        {
          source: 'service.backupService.checkAndRunBackups'
        }
      );
      console.error('[BackupService] Backup check error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 사용자별 백업 실행 (ZIP 압축)
   * @param {string} userId - 사용자 ID
   */
  async runBackupForUser(userId) {
    const encodedUserId = UserIdEncoder.findUserFolderSync(userId, SAVE_DIR);
    const sourcePath = path.join(SAVE_DIR, encodedUserId);

    if (!fs.existsSync(sourcePath)) {
      console.log(`[BackupService] No data to backup for user: ${userId}`);
      return { success: false, error: '백업할 데이터가 없습니다.' };
    }

    // Drive 연결 여부 확인
    const isDriveConnected = await DriveSettings.isDriveConnected(userId);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // 백업 디렉토리는 해시만 사용 (날짜 경로 제외, 플랫 구조 유지)
    const backupId = path.basename(encodedUserId);
    const userBackupDir = path.join(this.backupPath, backupId);
    const zipFileName = `backup_${timestamp}.zip`;
    const zipPath = path.join(userBackupDir, zipFileName);

    try {
      // 백업 폴더 생성
      fs.mkdirSync(userBackupDir, { recursive: true });

      // 소스 폴더 통계 수집
      const stats = await this.getDirectoryStats(sourcePath);

      // ZIP 압축
      await this.createZipBackup(sourcePath, zipPath);

      // ZIP 파일 크기 확인
      const zipStats = fs.statSync(zipPath);

      if (isDriveConnected) {
        // Drive 백업: ZIP을 Drive에 업로드 후 로컬 ZIP 삭제
        try {
          const driveService = require('./driveService');
          const uploadResult = await driveService.uploadBackupZip(userId, zipPath, zipFileName);

          await BackupHistory.create({
            user_id: userId,
            backup_path: zipFileName,
            backup_size: zipStats.size,
            mindmap_count: stats.folderCount,
            node_count: stats.fileCount,
            status: 'success',
            backup_location: 'drive',
            drive_file_id: uploadResult.fileId
          });

          // 로컬 ZIP 삭제
          if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

          console.log(`[BackupService] Drive backup completed for ${userId}: ${stats.folderCount} mindmaps, fileId=${uploadResult.fileId}`);
        } catch (driveErr) {
          // Drive 업로드 실패 — 로컬 백업으로 폴백하되 사용자에게 알림
          console.warn(`[BackupService] Drive 업로드 실패, 로컬 백업으로 전환: ${driveErr.message}`);

          await BackupHistory.create({
            user_id: userId,
            backup_path: zipPath,
            backup_size: zipStats.size,
            mindmap_count: stats.folderCount,
            node_count: stats.fileCount,
            status: 'success',
            backup_location: 'local',
            error_message: `Drive 업로드 실패: ${driveErr.message}`
          });

          // 스케줄 업데이트
          await BackupSchedule.updateAfterBackup(userId);
          await this.cleanOldBackups(encodedUserId, null);

          return {
            success: true,
            driveFailed: true,
            driveError: driveErr.message,
            stats: { ...stats, zipSize: zipStats.size },
            backupLocation: 'local'
          };
        }
      } else {
        // 로컬 백업: 기존 방식
        await BackupHistory.create({
          user_id: userId,
          backup_path: zipPath,
          backup_size: zipStats.size,
          mindmap_count: stats.folderCount,
          node_count: stats.fileCount,
          status: 'success',
          backup_location: 'local'
        });

        console.log(`[BackupService] Local backup completed for ${userId}: ${stats.folderCount} mindmaps, ${stats.fileCount} files, ZIP size: ${(zipStats.size / 1024).toFixed(2)}KB`);
      }

      // 스케줄 업데이트
      await BackupSchedule.updateAfterBackup(userId);

      // 오래된 백업 정리
      await this.cleanOldBackups(encodedUserId, isDriveConnected ? userId : null);

      return { success: true, stats: { ...stats, zipSize: zipStats.size }, backupLocation: isDriveConnected ? 'drive' : 'local' };

    } catch (error) {
      errorLogger.error(
        '사용자 백업 실패',
        error,
        {
          source: 'service.backupService.runBackupForUser',
          userId,
          extra: { sourcePath, zipPath, isDriveConnected }
        }
      );
      console.error(`[BackupService] Backup failed for ${userId}:`, error);

      // 실패한 ZIP 파일 정리
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }

      await BackupHistory.create({
        user_id: userId,
        backup_path: zipPath,
        status: 'failed',
        error_message: error.message,
        backup_location: isDriveConnected ? 'drive' : 'local'
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * ZIP 백업 생성
   * @param {string} sourcePath - 소스 폴더 경로
   * @param {string} zipPath - ZIP 파일 경로
   */
  async createZipBackup(sourcePath, zipPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // 최대 압축
      });

      output.on('close', () => {
        console.log(`[BackupService] ZIP created: ${(archive.pointer() / 1024).toFixed(2)}KB`);
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(sourcePath, false); // 루트에 파일들 배치
      archive.finalize();
    });
  }

  /**
   * 디렉토리 통계 수집 (ZIP 생성 전)
   * @param {string} dirPath - 디렉토리 경로
   */
  async getDirectoryStats(dirPath) {
    let totalSize = 0;
    let fileCount = 0;
    let folderCount = 0;

    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        folderCount++;
        const subStats = await this.getDirectoryStats(itemPath);
        totalSize += subStats.totalSize;
        fileCount += subStats.fileCount;
      } else {
        totalSize += stat.size;
        fileCount++;
      }
    }

    return { totalSize, fileCount, folderCount };
  }

  /**
   * 디렉토리 복사
   * @param {string} source - 소스 경로
   * @param {string} target - 타겟 경로
   */
  async copyDirectory(source, target) {
    let totalSize = 0;
    let fileCount = 0;
    let folderCount = 0;

    const items = fs.readdirSync(source);

    for (const item of items) {
      const sourcePath = path.join(source, item);
      const targetPath = path.join(target, item);
      const stat = fs.statSync(sourcePath);

      if (stat.isDirectory()) {
        fs.mkdirSync(targetPath, { recursive: true });
        const subStats = await this.copyDirectory(sourcePath, targetPath);
        totalSize += subStats.totalSize;
        fileCount += subStats.fileCount;
        folderCount += 1;
      } else {
        try {
          fs.copyFileSync(sourcePath, targetPath);
          totalSize += stat.size;
          fileCount++;
        } catch (copyErr) {
          // ENOENT: 파일이 listing과 copy 사이에 삭제됨 (경쟁 조건)
          if (copyErr.code === 'ENOENT') {
            console.warn(`[BackupService] 파일 복사 스킵 (ENOENT): ${sourcePath}`);
          } else {
            throw copyErr;
          }
        }
      }
    }

    return { totalSize, fileCount, folderCount };
  }

  /**
   * 오래된 백업 정리
   * 정책: 로컬 백업만 최대 30개 유지 + 1년(365일) 지난 백업 자동 삭제
   * Drive 백업은 개수 제한 없음 (무제한)
   * @param {string} encodedUserId - Base64 인코딩된 사용자 ID
   * @param {string|null} driveUserId - Drive 사용자인 경우 (로컬 정리 스킵)
   */
  async cleanOldBackups(encodedUserId, driveUserId = null) {
    // Drive 백업은 개수 제한 없음 — 정리하지 않음
    if (driveUserId) {
      return;
    }

    // 로컬 백업 정리 (날짜 경로 포함 시 해시만 추출)
    const userBackupPath = path.join(this.backupPath, path.basename(encodedUserId));

    if (!fs.existsSync(userBackupPath)) return;

    const now = Date.now();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;

    const backups = fs.readdirSync(userBackupPath)
      .filter(name => name.endsWith('.zip') || fs.statSync(path.join(userBackupPath, name)).isDirectory())
      .map(name => ({
        name,
        path: path.join(userBackupPath, name),
        time: fs.statSync(path.join(userBackupPath, name)).mtime.getTime(),
        isZip: name.endsWith('.zip')
      }))
      .sort((a, b) => b.time - a.time);

    // 1. 1년(365일) 지난 백업 삭제
    const expiredBackups = backups.filter(b => (now - b.time) > oneYearMs);
    for (const backup of expiredBackups) {
      if (backup.isZip) {
        fs.unlinkSync(backup.path);
      } else {
        fs.rmSync(backup.path, { recursive: true, force: true });
      }
      console.log(`[BackupService] Deleted expired backup (>365 days): ${backup.name}`);
    }

    const remainingBackups = backups.filter(b => (now - b.time) <= oneYearMs);

    // 2. 최대 30개 유지
    const maxBackups = 30;

    if (remainingBackups.length > maxBackups) {
      const toDelete = remainingBackups.slice(maxBackups);

      for (const backup of toDelete) {
        if (backup.isZip) {
          fs.unlinkSync(backup.path);
        } else {
          fs.rmSync(backup.path, { recursive: true, force: true });
        }
        console.log(`[BackupService] Deleted excess backup (>30): ${backup.name}`);
      }
    }
  }

  /**
   * 모든 사용자의 1년(365일) 경과 백업 삭제 (매일 자정 배치)
   * 백업 폴더의 모든 사용자 디렉토리를 순회하며 1년 지난 백업 삭제
   */
  async cleanAllExpiredBackups() {
    const startTime = Date.now();
    console.log(`[BackupService] 실행 시간: ${new Date().toISOString()}`);

    if (!fs.existsSync(this.backupPath)) {
      console.log('[BackupService] 백업 폴더가 없습니다. 정리할 백업 없음.');
      console.log('[BackupService] ========== 1년(365일) 경과 백업 삭제 배치 완료 ==========');
      return { totalDeleted: 0, usersProcessed: 0 };
    }

    const now = Date.now();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    let totalDeleted = 0;
    let usersProcessed = 0;
    let totalSizeFreed = 0;

    try {
      // 모든 사용자 백업 폴더 조회
      const userFolders = fs.readdirSync(this.backupPath)
        .filter(name => {
          const folderPath = path.join(this.backupPath, name);
          return fs.statSync(folderPath).isDirectory();
        });

      console.log(`[BackupService] 백업 폴더 사용자 수: ${userFolders.length}`);

      for (const encodedUserId of userFolders) {
        const userBackupPath = path.join(this.backupPath, encodedUserId);

        try {
          // ZIP 파일 및 레거시 폴더 백업 모두 처리
          const backups = fs.readdirSync(userBackupPath)
            .map(name => {
              const backupPath = path.join(userBackupPath, name);
              const stat = fs.statSync(backupPath);
              return {
                name,
                path: backupPath,
                time: stat.mtime.getTime(),
                size: stat.size,
                isZip: name.endsWith('.zip'),
                isDirectory: stat.isDirectory()
              };
            });

          // 1년(365일) 지난 백업 필터링
          const expiredBackups = backups.filter(b => (now - b.time) > oneYearMs);

          if (expiredBackups.length > 0) {
            console.log(`[BackupService] 사용자 ${encodedUserId}: ${expiredBackups.length}개 만료 백업 발견`);

            for (const backup of expiredBackups) {
              try {
                if (backup.isZip) {
                  fs.unlinkSync(backup.path);
                } else if (backup.isDirectory) {
                  fs.rmSync(backup.path, { recursive: true, force: true });
                }

                totalDeleted++;
                totalSizeFreed += backup.size;
                console.log(`  삭제됨: ${backup.name} (${(backup.size / 1024).toFixed(2)}KB)`);
              } catch (deleteError) {
                console.error(`  삭제 실패: ${backup.name} - ${deleteError.message}`);
              }
            }
          }

          usersProcessed++;
        } catch (userError) {
          console.error(`[BackupService] 사용자 ${encodedUserId} 처리 오류:`, userError.message);
        }
      }

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[BackupService] 정리 결과:`);
      console.log(`  - 처리된 사용자: ${usersProcessed}`);
      console.log(`  - 삭제된 백업: ${totalDeleted}개`);
      console.log(`  - 확보된 용량: ${(totalSizeFreed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`  - 소요 시간: ${elapsedTime}초`);
      console.log('[BackupService] ========== 1년(365일) 경과 백업 삭제 배치 완료 ==========');

      return { totalDeleted, usersProcessed, totalSizeFreed };

    } catch (error) {
      errorLogger.error(
        '백업 정리 배치 실패',
        error,
        {
          source: 'service.backupService.cleanAllExpiredBackups'
        }
      );
      console.error('[BackupService] 백업 정리 배치 오류:', error);
      console.log('[BackupService] ========== 1년(365일) 경과 백업 삭제 배치 실패 ==========');
      return { totalDeleted, usersProcessed, error: error.message };
    }
  }

  /**
   * 백업 상태 확인 (30개 초과 여부)
   * @param {string} userId - 사용자 ID
   * @returns {Object} 백업 상태 정보
   */
  getBackupStatus(userId) {
    const encodedUserId = UserIdEncoder.findUserFolderSync(userId, SAVE_DIR);
    const backupId = path.basename(encodedUserId);
    const userBackupPath = path.join(this.backupPath, backupId);
    const maxBackups = 30;

    if (!fs.existsSync(userBackupPath)) {
      return {
        currentCount: 0,
        maxBackups,
        needsConfirmation: false,
        oldestBackup: null
      };
    }

    const backups = fs.readdirSync(userBackupPath)
      .map(name => ({
        name,
        path: path.join(userBackupPath, name),
        time: fs.statSync(path.join(userBackupPath, name)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    const oldestBackup = backups.length > 0 ? backups[backups.length - 1] : null;

    return {
      currentCount: backups.length,
      maxBackups,
      needsConfirmation: backups.length >= maxBackups,
      oldestBackup: oldestBackup ? {
        name: oldestBackup.name,
        date: intlServer.formatDate(new Date(oldestBackup.time), 'ko-KR', { dateStyle: 'short', timeStyle: 'short' })
      } : null
    };
  }

  /**
   * 수동 백업 실행 (확인 모드 지원)
   * @param {string} userId - 사용자 ID
   * @param {boolean} confirmed - 30개 초과 시 삭제 확인 여부
   */
  async runManualBackup(userId, confirmed = false) {
    // Drive 연결 사용자는 개수 제한 없이 바로 백업 실행
    const DriveSettings = require('../db/models/DriveSettings');
    const isDriveConnected = await DriveSettings.isDriveConnected(userId);
    if (isDriveConnected) {
      return await this.runBackupForUser(userId);
    }

    const status = this.getBackupStatus(userId);

    // 30개 이상이고 확인하지 않은 경우 (로컬 백업만 해당)
    if (status.needsConfirmation && !confirmed) {
      return {
        success: false,
        needsConfirmation: true,
        currentCount: status.currentCount,
        maxBackups: status.maxBackups,
        oldestBackup: status.oldestBackup,
        message: `백업이 이미 ${status.currentCount}개 있습니다. 새 백업을 생성하면 가장 오래된 백업(${status.oldestBackup?.date})이 삭제됩니다.`
      };
    }

    // 30개 이상이고 확인된 경우, 가장 오래된 백업 삭제
    if (status.needsConfirmation && confirmed) {
      const encodedUserId = UserIdEncoder.findUserFolderSync(userId, SAVE_DIR);
      const backupId = path.basename(encodedUserId);
      const userBackupPath = path.join(this.backupPath, backupId);

      const backups = fs.readdirSync(userBackupPath)
        .map(name => ({
          name,
          path: path.join(userBackupPath, name),
          time: fs.statSync(path.join(userBackupPath, name)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);

      // 가장 오래된 백업 삭제
      if (backups.length >= status.maxBackups) {
        const oldestBackup = backups[backups.length - 1];
        fs.rmSync(oldestBackup.path, { recursive: true, force: true });
        console.log(`[BackupService] Deleted oldest backup for new backup: ${oldestBackup.name}`);
      }
    }

    return await this.runBackupForUser(userId);
  }


  /**
   * 백업에서 복원
   * 복구 전에 현재 데이터를 먼저 백업한 후 복원 진행
   * @param {string} userId - 사용자 ID
   * @param {number} backupId - 백업 ID
   * @param {string} targetFolder - 복원할 폴더 (선택적)
   * @param {Object} options - 복원 옵션
   * @param {boolean} options.backupFirst - 복원 전 현재 데이터 백업 여부 (기본: true)
   */
  async restoreFromBackup(userId, backupId, targetFolder = null, options = {}) {
    const { backupFirst = true } = options;
    const history = await BackupHistory.getById(backupId);

    if (!history || history.user_id !== userId) {
      throw new Error('백업을 찾을 수 없습니다.');
    }

    const encodedUserId = UserIdEncoder.findUserFolderSync(userId, SAVE_DIR);
    const targetPath = targetFolder
      ? path.join(SAVE_DIR, encodedUserId, targetFolder)
      : path.join(SAVE_DIR, encodedUserId);

    // Drive 백업 여부 확인
    const isDriveBackup = history.backup_location === 'drive';
    let sourcePath = history.backup_path;
    let tempDriveZipPath = null;

    // Drive 백업인 경우: Drive에서 ZIP 다운로드
    if (isDriveBackup) {
      if (!history.drive_file_id) {
        throw new Error('Drive 백업 파일 ID가 없습니다.');
      }

      const tempDir = path.join(ROOT_DIR, 'temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      tempDriveZipPath = path.join(tempDir, `restore_${Date.now()}.zip`);

      try {
        const driveService = require('./driveService');
        await driveService.downloadBackupZip(userId, history.drive_file_id, tempDriveZipPath);
        sourcePath = tempDriveZipPath;
        console.log(`[BackupService] Drive 백업 다운로드 완료: ${tempDriveZipPath}`);
      } catch (dlErr) {
        if (tempDriveZipPath && fs.existsSync(tempDriveZipPath)) {
          fs.unlinkSync(tempDriveZipPath);
        }
        throw new Error(`Drive 백업 다운로드 실패: ${dlErr.message}`);
      }
    } else {
      // 로컬 백업: 파일 존재 확인
      if (!fs.existsSync(sourcePath)) {
        throw new Error('백업 파일이 존재하지 않습니다.');
      }
    }

    try {
      // 1. 복구 전에 현재 데이터 백업 (pre-restore backup, backupFirst=true일 때만)
      let preRestoreBackupPath = null;
      if (backupFirst && fs.existsSync(targetPath)) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const userBackupDir = path.join(this.backupPath, encodedUserId);
        const preRestoreZipName = `pre-restore_${timestamp}.zip`;
        preRestoreBackupPath = path.join(userBackupDir, preRestoreZipName);

        try {
          fs.mkdirSync(userBackupDir, { recursive: true });
          await this.createZipBackup(targetPath, preRestoreBackupPath);
          console.log(`[BackupService] Pre-restore backup created: ${preRestoreZipName}`);

          const preRestoreStats = fs.statSync(preRestoreBackupPath);
          await BackupHistory.create({
            user_id: userId,
            backup_path: preRestoreBackupPath,
            backup_size: preRestoreStats.size,
            status: 'success',
            error_message: 'Pre-restore backup before restoration'
          });
        } catch (preBackupError) {
          console.error(`[BackupService] Pre-restore backup failed:`, preBackupError.message);
        }
      }

      // 2. 기존 데이터 삭제 (복원 준비)
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
        console.log(`[BackupService] Cleared target path for restoration: ${targetPath}`);
      }

      // 3. 백업에서 복원
      fs.mkdirSync(targetPath, { recursive: true });

      const isZipBackup = sourcePath.endsWith('.zip');

      if (isZipBackup) {
        const absoluteTargetPath = path.resolve(targetPath);
        await extractZip(sourcePath, { dir: absoluteTargetPath });
        console.log(`[BackupService] Extracted ZIP backup to: ${absoluteTargetPath}`);
      } else {
        await this.copyDirectory(sourcePath, targetPath);
        console.log(`[BackupService] Copied folder backup to: ${targetPath}`);
      }

      return {
        success: true,
        restoredPath: targetPath,
        preRestoreBackup: preRestoreBackupPath
      };
    } finally {
      // Drive 임시 ZIP 파일 정리
      if (tempDriveZipPath && fs.existsSync(tempDriveZipPath)) {
        fs.unlinkSync(tempDriveZipPath);
      }
    }
  }

  /**
   * 사용자 백업 히스토리 조회
   * @param {string} userId - 사용자 ID
   * @param {Object} options - 조회 옵션
   */
  getBackupHistory(userId, options = {}) {
    return BackupHistory.getByUserId(userId, options);
  }

  /**
   * 백업 스케줄 정보 조회
   * @param {string} userId - 사용자 ID
   */
  async getScheduleInfo(userId) {
    return await BackupSchedule.getByUserId(userId);
  }
}

module.exports = new BackupService();
