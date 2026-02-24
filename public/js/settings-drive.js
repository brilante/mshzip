/* Settings Drive & Backup JavaScript - MyMind3 */
/* 구글 드라이브 연결 및 백업 관리 모듈 */
/* Drive는 백업 전용 — primary storage는 항상 로컬 */

(function () {
  'use strict';

  // ============================================
  // 토스트 알림 시스템
  // ============================================

  const ToastManager = {
    container: null,
    queue: [],
    maxToasts: 3,

    init() {
      if (this.container) return;
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 100005;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    },

    show(message, type = 'info', duration = 3000) {
      this.init();

      const icons = {
        success: mmIcon('check-circle', 16),
        error: mmIcon('x-circle', 16),
        warning: mmIcon('alert-triangle', 16),
        info: mmIcon('info', 16)
      };

      const colors = {
        success: { bg: '#27ae60', border: '#2ecc71' },
        error: { bg: '#c0392b', border: '#e74c3c' },
        warning: { bg: '#d68910', border: '#f39c12' },
        info: { bg: '#2980b9', border: '#3498db' }
      };

      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 20px;
        background: ${(colors[type] || colors.info).bg};
        border-left: 4px solid ${(colors[type] || colors.info).border};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-size: 14px;
        pointer-events: auto;
        cursor: pointer;
        animation: toastSlideIn 0.3s ease;
        max-width: 350px;
      `;
      toast.innerHTML = `
        <span style="font-size: 18px;">${icons[type] || icons.info}</span>
        <span style="flex: 1;">${message}</span>
        <span style="opacity: 0.7; font-size: 12px;"></span>
      `;

      toast.onclick = () => this.remove(toast);

      // 최대 개수 초과시 가장 오래된 것 제거
      while (this.container.children.length >= this.maxToasts) {
        this.remove(this.container.firstChild);
      }

      this.container.appendChild(toast);

      // 자동 제거
      setTimeout(() => this.remove(toast), duration);

      return toast;
    },

    remove(toast) {
      if (!toast || !toast.parentNode) return;
      toast.style.animation = 'toastSlideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }
  };

  // 토스트 애니메이션 CSS 추가
  if (!document.getElementById('toast-animations')) {
    const style = document.createElement('style');
    style.id = 'toast-animations';
    style.textContent = `
      @keyframes toastSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes toastSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
      @keyframes modalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes modalScaleIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  // 글로벌 showToast 함수 덮어쓰기
  // 매개변수 순서: (type, message) - 호출자가 showToast('info', '메시지')로 사용
  window.showToast = (type, message) => ToastManager.show(message, type);

  // ============================================
  // 모달 베이스 클래스
  // ============================================

  const ModalBase = {
    create(id, title, content, options = {}) {
      // 기존 모달 제거
      const existing = document.getElementById(id);
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = id;
      modal.className = 'phase7-modal-overlay';

      const width = options.width || '500px';
      const maxHeight = options.maxHeight || '80vh';

      modal.innerHTML = `
        <div class="phase7-modal" style="width: ${width}; max-height: ${maxHeight};">
          <div class="modal-header">
            <h3>${title}</h3>
            ${options.step ? `<span style="color: #888; font-size: 13px;">Step ${options.step}</span>` : ''}
            <button class="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            ${content}
          </div>
          ${options.footer ? `
            <div class="modal-footer">
              ${options.footer}
            </div>
          ` : ''}
        </div>
      `;

      // 닫기 버튼 이벤트
      modal.querySelector('.modal-close-btn').onclick = () => this.close(id);

      // 배경 클릭으로 닫기
      modal.onclick = (e) => {
        if (e.target === modal) this.close(id);
      };

      document.body.appendChild(modal);
      return modal;
    },

    close(id) {
      const modal = document.getElementById(id);
      if (modal) {
        modal.style.animation = 'modalFadeIn 0.2s ease reverse';
        setTimeout(() => modal.remove(), 200);
      }
    }
  };

  // ============================================
  // 드라이브 설정 관련 함수
  // ============================================

  /**
   * 드라이브 설정 초기화
   */
  async function initDriveSettings() {
    console.log('[Settings-Drive] Initializing drive settings...');

    // 드라이브 연결 상태 확인
    await loadDriveStatus();

    // 이벤트 리스너 등록
    setupDriveEventListeners();
  }

  /**
   * 드라이브 상태 로드
   */
  async function loadDriveStatus() {
    try {
      const response = await fetch('/api/drive/settings', {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('[Settings-Drive] Not logged in');
          updateDriveUI(false);
          return;
        }
        throw new Error('Failed to load drive settings');
      }

      const data = await response.json();
      console.log('[Settings-Drive] Drive settings loaded:', data);

      updateDriveUI(data.connected, data);

    } catch (error) {
      console.error('[Settings-Drive] Error loading drive status:', error);
      updateDriveUI(false);
    }
  }

  /**
   * 드라이브 UI 업데이트
   */
  function updateDriveUI(connected, data = {}) {
    const statusEl = document.getElementById('driveConnectionStatus');
    const connectBtn = document.getElementById('connectDriveBtn');
    const disconnectBtn = document.getElementById('disconnectDriveBtn');
    const detailSection = document.getElementById('driveSettingsDetail');
    const userEmailEl = document.getElementById('driveUserEmail');
    const pathEl = document.getElementById('drivePath');

    if (connected) {
      // 연결됨
      if (statusEl) {
        statusEl.innerHTML = mmIcon('check-circle', 14) + ' ' + t('driveConnected', '연결됨');
        statusEl.className = 'status-badge connected';
        statusEl.removeAttribute('data-i18n');
      }
      // 연결 버튼 숨김
      if (connectBtn) {
        connectBtn.style.display = 'none';
        connectBtn.classList.remove('visible');
      }
      // 연결 해제 버튼 표시
      if (disconnectBtn) {
        disconnectBtn.style.cssText = 'display: inline-block !important; visibility: visible !important;';
        disconnectBtn.classList.add('visible');
      }
      if (detailSection) detailSection.style.display = 'block';

      // 저장 경로 표시
      if (pathEl && data.path) {
        const userFriendlyPath = convertToUserFriendlyPath(data.path);
        pathEl.value = userFriendlyPath;
      }

      // 연결 테스트로 사용자 정보 가져오기
      testDriveConnection();

    } else {
      // 연결 안됨
      if (statusEl) {
        statusEl.innerHTML = mmIcon('x-circle', 14) + ' ' + t('driveDisconnected', '연결 안됨');
        statusEl.className = 'status-badge disconnected';
        statusEl.removeAttribute('data-i18n');
      }
      // 연결 버튼 표시
      if (connectBtn) {
        connectBtn.style.cssText = 'display: inline-block !important; visibility: visible !important;';
        connectBtn.classList.add('visible');
        connectBtn.removeAttribute('hidden');
      }
      // 연결 해제 버튼 숨김
      if (disconnectBtn) {
        disconnectBtn.style.display = 'none';
        disconnectBtn.classList.remove('visible');
      }
      if (detailSection) detailSection.style.display = 'none';

      // 사용자 이메일 초기화
      if (userEmailEl) userEmailEl.textContent = '-';
    }
  }

  /**
   * 내부 저장 경로를 사용자 친화적 경로로 변환
   */
  function convertToUserFriendlyPath(internalPath) {
    if (!internalPath) return '/MyMind3';

    let path = internalPath;

    // Base64로 보이는 부분 제거
    path = path.replace(/\/[A-Za-z0-9+/=]{10,}$/, '');

    // /saves 부분도 제거
    path = path.replace(/\/saves\/?$/, '');

    if (!path || path === '/') {
      path = '/MyMind3';
    }

    return path;
  }

  /**
   * 드라이브 연결 테스트 및 사용자 정보 가져오기
   */
  async function testDriveConnection() {
    try {
      const response = await fetch('/api/drive/test-connection', {
        credentials: 'include'
      });

      if (!response.ok) return;

      const data = await response.json();

      if (data.success) {
        const userEmailEl = document.getElementById('driveUserEmail');
        const quotaEl = document.getElementById('driveQuota');

        if (userEmailEl && data.user) {
          userEmailEl.textContent = data.user.emailAddress || '-';
        }

        if (quotaEl && data.quota) {
          const used = formatBytes(data.quota.usage || 0);
          const total = formatBytes(data.quota.limit || 0);
          quotaEl.textContent = `${used} / ${total}`;
        }
      }
    } catch (error) {
      console.error('[Settings-Drive] Connection test error:', error);
    }
  }

  /**
   * 드라이브 연결 시작
   */
  function connectDrive() {
    console.log('[Settings-Drive] Starting drive connection...');
    showToast(t('driveConnecting', '구글 드라이브 인증 페이지로 이동합니다...'), 'info');
    window.location.href = '/api/drive/auth';
  }

  /**
   * 드라이브 연결 해제 (1단계 — 즉시 해제)
   */
  async function disconnectDrive() {
    DisconnectModal.show(async () => {
      try {
        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
        const response = await fetch('/api/drive/disconnect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include'
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Disconnect failed');
        }

        showToast(t('driveDisconnectedSuccess', '드라이브 연결이 해제되었습니다'), 'success');
        await loadDriveStatus();
        await loadBackupStatus();

      } catch (error) {
        console.error('[Settings-Drive] Disconnect error:', error.message);
        showToast(t('driveDisconnectError', '연결 해제에 실패했습니다'), 'error');
      }
    });
  }

  /**
   * 드라이브 경로 저장
   */
  async function saveDrivePath() {
    const pathEl = document.getElementById('drivePath');
    let userPath = pathEl ? pathEl.value.trim() : '/MyMind3';

    const internalPath = convertToInternalPath(userPath);

    try {
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
      const response = await fetch('/api/drive/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({ path: internalPath })
      });

      if (!response.ok) throw new Error('Save failed');

      showToast(t('drivePathSaved', '저장 경로가 변경되었습니다'), 'success');

    } catch (error) {
      console.error('[Settings-Drive] Save path error:', error);
      showToast(t('drivePathSaveError', '경로 저장에 실패했습니다'), 'error');
    }
  }

  /**
   * 사용자 입력 경로를 내부 저장 경로로 변환
   */
  function convertToInternalPath(userPath) {
    if (!userPath) return '/MyMind3/saves';

    let path = userPath.trim();

    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    if (path.endsWith('/') && path.length > 1) {
      path = path.slice(0, -1);
    }

    if (!path.endsWith('/saves')) {
      path = path + '/saves';
    }

    return path;
  }

  // ============================================
  // 백업 설정 관련 함수
  // ============================================

  /**
   * 백업 설정 초기화
   */
  async function initBackupSettings() {
    console.log('[Settings-Drive] Initializing backup settings...');

    await loadBackupStatus();
    setupBackupEventListeners();
  }

  /**
   * 백업 상태 로드
   */
  async function loadBackupStatus() {
    try {
      const response = await fetch('/api/backup/schedule', {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('[Settings-Drive] Not logged in for backup');
          return;
        }
        throw new Error('Failed to load backup status');
      }

      const data = await response.json();
      console.log('[Settings-Drive] Backup status loaded:', data);

      updateBackupUI(data);

    } catch (error) {
      console.error('[Settings-Drive] Error loading backup status:', error);
    }
  }

  /**
   * 백업 UI 업데이트
   */
  function updateBackupUI(data) {
    const statusEl = document.getElementById('backupStatus');
    const nextBackupEl = document.getElementById('nextBackupTime');
    const lastBackupEl = document.getElementById('lastBackupTime');

    if (data.enabled !== false) {
      // 백업 활성
      if (statusEl) {
        statusEl.innerHTML = mmIcon('check-circle', 14) + ' ' + t('backupActive', '활성');
        statusEl.className = 'status-badge active';
      }
    } else {
      // 백업 비활성
      if (statusEl) {
        statusEl.innerHTML = mmIcon('pause', 14) + ' ' + t('backupInactive', '비활성');
        statusEl.className = 'status-badge inactive';
      }
    }

    if (nextBackupEl && data.nextBackup) {
      nextBackupEl.textContent = (window.MyMind3?.Intl?.formatDate(data.nextBackup, { dateStyle: 'short', timeStyle: 'short' }) || new Date(data.nextBackup).toLocaleString());
    }

    if (lastBackupEl && data.lastBackup) {
      lastBackupEl.textContent = (window.MyMind3?.Intl?.formatDate(data.lastBackup, { dateStyle: 'short', timeStyle: 'short' }) || new Date(data.lastBackup).toLocaleString());
    }
  }

  // 백업 버튼 쿨다운 상태
  let backupCooldown = false;

  /**
   * 백업 버튼 쿨다운 설정 (3초)
   */
  function setBackupCooldown(btn) {
    if (!btn) return;

    backupCooldown = true;
    btn.disabled = true;

    let countdown = 3;
    btn.textContent = `${t('backupCooldown', '대기 중...')} (${countdown}${t('secondsUnit', '초')})`;

    const timer = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        btn.textContent = `${t('backupCooldown', '대기 중...')} (${countdown}${t('secondsUnit', '초')})`;
      } else {
        clearInterval(timer);
        backupCooldown = false;
        btn.disabled = false;
        btn.innerHTML = mmIcon('refresh-cw', 14) + ' ' + t('backupNow', '지금 백업');
      }
    }, 1000);
  }

  /**
   * 수동 백업 실행
   */
  async function runManualBackup(confirmed = false) {
    const btn = document.getElementById('runBackupBtn');

    if (backupCooldown) {
      showToast(t('backupCooldownWait', '잠시 후 다시 시도해주세요'), 'warning');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = t('backupInProgress', '백업 중...');
    }

    try {
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
      const response = await fetch('/api/backup/run', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify({ confirmed })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Backup failed');
      console.log('[Settings-Drive] Backup response:', data);

      // 30개 초과로 확인이 필요한 경우
      if (data.needsConfirmation) {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = mmIcon('refresh-cw', 14) + ' ' + t('backupNow', '지금 백업');
        }

        const confirmMsg = t('backupOverLimitMsg', `백업이 이미 ${data.currentCount}개 있습니다.`) + `\n\n` +
          t('backupOldestWillDelete', '새 백업을 생성하면 가장 오래된 백업이 삭제됩니다.') + `\n` +
          t('backupOldestDate', '삭제될 백업') + `: ${data.oldestBackup?.date || t('unknownError', '알 수 없음')}\n\n` +
          t('confirmContinue', '계속하시겠습니까?');

        if (confirm(confirmMsg)) {
          await runManualBackup(true);
        }
        return;
      }

      if (data.success) {
        showToast(t('backupCompleted', '백업이 완료되었습니다'), 'success');
        await loadBackupStatus();
        setBackupCooldown(btn);
        return;
      } else {
        throw new Error(data.error || t('backupRunFailed', '백업 실행 실패'));
      }

    } catch (error) {
      console.error('[Settings-Drive] Backup error:', error);
      const msg = error.message && error.message !== 'Backup failed'
        ? error.message
        : t('backupFailed', '백업에 실패했습니다');
      showToast(msg, 'error');
      setBackupCooldown(btn);
      return;
    }
  }

  /**
   * 백업 내역 보기 - 모달로 표시
   */
  async function viewBackupHistory() {
    try {
      const response = await fetch('/api/backup/history?limit=30', {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to load history');

      const data = await response.json();
      console.log('[Settings-Drive] Backup history:', data);

      BackupHistoryModal.show(data.backups || []);

    } catch (error) {
      console.error('[Settings-Drive] History error:', error);
      showToast(t('backupHistoryError', '내역 조회에 실패했습니다'), 'error');
    }
  }

  // ============================================
  // 백업 히스토리 모달
  // ============================================

  const BackupHistoryModal = {
    show(history) {
      let tableRows = '';
      if (history.length === 0) {
        tableRows = `<tr><td colspan="6" class="backup-empty-state">
          ${mmIcon('clipboard', 32)}
          <p>${t('backupNoHistory', '백업 내역이 없습니다.')}</p>
        </td></tr>`;
      } else {
        tableRows = history.map((h, idx) => {
          const locationIcon = h.backupLocation === 'drive'
            ? mmIcon('cloud', 12) + ' Drive'
            : mmIcon('save', 12) + ' ' + t('backupLocationLocal', '서버');
          return `
          <tr>
            <td class="backup-no">${idx + 1}</td>
            <td class="backup-date">${window.MyMind3?.Intl?.formatDate(h.createdAt, { dateStyle: 'short', timeStyle: 'short' }) || new Date(h.createdAt).toLocaleString()}</td>
            <td class="backup-size">${formatBytes(h.backupSize || 0)}</td>
            <td><span class="backup-location-badge">${locationIcon}</span></td>
            <td>
              <span class="backup-status-badge ${h.status === 'success' ? 'success' : 'failed'}">
                ${h.status === 'success' ? mmIcon('check-circle', 12) + ' ' + t('backupStatusSuccess', '성공') : mmIcon('x-circle', 12) + ' ' + t('backupStatusFailed', '실패')}
              </span>
            </td>
            <td>
              <button class="backup-action-btn restore btn-restore" data-id="${h.id}" data-location="${h.backupLocation || 'local'}">${t('backupRestore', '복원')}</button>
              <button class="backup-action-btn delete btn-delete" data-id="${h.id}" data-location="${h.backupLocation || 'local'}">${t('delete', '삭제')}</button>
            </td>
          </tr>
        `;
        }).join('');
      }

      const content = `
        <table class="backup-history-table">
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>${t('backupDateTime', '백업 일시')}</th>
              <th>${t('backupSize', '크기')}</th>
              <th>${t('backupLocation', '위치')}</th>
              <th>${t('backupStatus', '상태')}</th>
              <th style="width: 150px;">${t('backupAction', '작업')}</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="backup-retention-info">
          ${mmIcon('lightbulb', 14)}
          <span>${t('backupRetentionInfo', '서버 백업: 최대 30개 보관, 1년(365일) 후 자동 삭제. 클라우드(구글 드라이브) 백업: 개수 제한 없음.')}</span>
        </div>
      `;

      const modal = ModalBase.create('backup-history-modal', mmIcon('clipboard', 16) + ' ' + t('backupHistory', '백업 히스토리'), content, {
        width: '700px',
        footer: `<button class="btn-secondary modal-close">${t('close', '닫기')}</button>`
      });

      // 이벤트 바인딩
      modal.querySelectorAll('.btn-restore').forEach(btn => {
        btn.onclick = () => this.confirmRestore(btn.dataset.id, btn.dataset.location);
      });

      modal.querySelectorAll('.btn-delete').forEach(btn => {
        btn.onclick = () => this.confirmDelete(btn.dataset.id, btn.dataset.location);
      });

      modal.querySelector('.modal-close').onclick = () => ModalBase.close('backup-history-modal');
    },

    async confirmRestore(backupId, backupLocation) {
      // 클라우드 백업인 경우 Drive 연결 상태 확인
      if (backupLocation === 'drive') {
        try {
          const driveRes = await fetch('/api/drive/settings', { credentials: 'include' });
          if (driveRes.ok) {
            const driveData = await driveRes.json();
            if (!driveData.connected) {
              this.showDriveRequiredModal();
              return;
            }
          }
        } catch (e) {
          console.error('[Settings-Drive] Drive 상태 확인 실패:', e);
        }
      }

      const content = `
        <div style="text-align: center; padding: 10px;">
          <div style="margin-bottom: 15px;">${mmIcon('alert-triangle', 48)}</div>
          <p style="font-size: 15px; margin-bottom: 20px;">
            ${t('backupRestoreConfirm', '이 백업으로 복원하시겠습니까?')}
          </p>
          <div class="backup-restore-warning">
            ${mmIcon('alert-triangle', 14)}
            <span>${t('backupRestoreWarning', '경고: 현재 저장된 모든 데이터가 삭제되고, 선택한 백업 시점의 데이터로 교체됩니다. 이 작업은 되돌릴 수 없습니다.')}</span>
          </div>
          <label class="backup-restore-checkbox">
            <input type="checkbox" id="backupBeforeRestore" checked>
            <span>${t('backupBeforeRestoreLabel', '현재 데이터 백업 후 복원 (권장)')}</span>
          </label>
        </div>
      `;

      const modal = ModalBase.create('restore-confirm-modal', t('backupRestoreTitle', '백업 복원 확인'), content, {
        width: '420px',
        footer: `
          <button class="btn-secondary modal-cancel">${t('cancel', '취소')}</button>
          <button class="btn-primary modal-confirm" style="background: #e74c3c;">${t('backupRestoreExecute', '복원 실행')}</button>
        `
      });

      modal.querySelector('.modal-cancel').onclick = () => ModalBase.close('restore-confirm-modal');
      modal.querySelector('.modal-confirm').onclick = async () => {
        const backupFirst = modal.querySelector('#backupBeforeRestore').checked;
        ModalBase.close('restore-confirm-modal');
        await this.executeRestore(backupId, backupFirst);
      };
    },

    async executeRestore(backupId, backupFirst) {
      showToast(t('backupRestoring', '복원 중...'), 'info');
      try {
        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
        const response = await fetch(`/api/backup/restore/${backupId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          credentials: 'include',
          body: JSON.stringify({ backupFirst })
        });

        if (!response.ok) throw new Error('Restore failed');

        showToast(t('backupRestored', '백업이 복원되었습니다'), 'success');
        ModalBase.close('backup-history-modal');

      } catch (error) {
        console.error('[Settings-Drive] Restore error:', error);
        showToast(t('backupRestoreError', '복원에 실패했습니다'), 'error');
      }
    },

    showDriveRequiredModal() {
      const content = `
        <div style="text-align: center; padding: 10px;">
          <div style="margin-bottom: 15px;">${mmIcon('cloud', 48)}</div>
          <p style="font-size: 15px; margin-bottom: 15px;">
            ${t('backupDriveRequiredMsg', '클라우드 백업을 복원하려면 구글 드라이브 연결이 필요합니다.')}
          </p>
          <p style="font-size: 13px; color: #999; margin-bottom: 10px;">
            ${t('backupDriveRequiredDesc', '드라이브를 연결하면 클라우드에 저장된 백업을 다운로드하여 복원할 수 있습니다.')}
          </p>
        </div>
      `;

      const modal = ModalBase.create('drive-required-modal', t('backupDriveRequiredTitle', '드라이브 연결 필요'), content, {
        width: '420px',
        footer: `
          <button class="btn-secondary modal-cancel">${t('cancel', '취소')}</button>
          <button class="btn-primary modal-connect" style="background: #3498db;">${t('connectDrive', '드라이브 연결')}</button>
        `
      });

      modal.querySelector('.modal-cancel').onclick = () => ModalBase.close('drive-required-modal');
      modal.querySelector('.modal-connect').onclick = () => {
        ModalBase.close('drive-required-modal');
        ModalBase.close('backup-history-modal');
        window.location.href = '/api/drive/auth';
      };
    },

    async confirmDelete(backupId, backupLocation) {
      const isDrive = backupLocation === 'drive';
      const confirmMsg = isDrive
        ? t('backupDeleteConfirmDrive', '이 백업을 삭제하시겠습니까?\n클라우드(구글 드라이브)에서도 실제 파일이 삭제됩니다.\n삭제된 백업은 복구할 수 없습니다.')
        : t('backupDeleteConfirm', '이 백업을 삭제하시겠습니까?\n삭제된 백업은 복구할 수 없습니다.');

      if (!confirm(confirmMsg)) return;

      try {
        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};

        const response = await fetch(`/api/backup/${backupId}`, {
          method: 'DELETE',
          headers: { ...csrfHeaders },
          credentials: 'include'
        });

        if (!response.ok) throw new Error('Delete failed');

        showToast(t('backupDeleted', '백업이 삭제되었습니다'), 'success');
        // 리스트 새로고침
        viewBackupHistory();

      } catch (error) {
        console.error('[Settings-Drive] Delete error:', error);
        showToast(t('backupDeleteError', '삭제에 실패했습니다'), 'error');
      }
    }
  };

  // ============================================
  // 연결 해제 확인 모달
  // ============================================

  const DisconnectModal = {
    show(callback) {
      const content = `
        <div style="text-align: center; padding: 10px;">
          <div style="margin-bottom: 15px;">${mmIcon('alert-triangle', 48)}</div>
          <p style="font-size: 15px; margin-bottom: 20px; color: #fff;">
            ${t('driveDisconnectConfirmMsg', '구글 드라이브 연결을 해제하시겠습니까?')}
          </p>

          <div style="background: #2a2a2a; border-radius: 8px; padding: 15px; text-align: left;">
            <p style="margin: 0 0 8px; color: #f39c12; font-size: 13px;">${mmIcon('alert-triangle', 14)} ${t('driveDisconnectWarning', '주의사항:')}</p>
            <ul style="margin: 0; padding-left: 20px; color: #ccc; font-size: 13px; line-height: 1.8;">
              <li>${t('driveDisconnectNote1', '드라이브에 저장된 데이터는 삭제되지 않습니다')}</li>
              <li>${t('driveDisconnectNote2', '백업 대상이 서버로 전환됩니다')}</li>
              <li>${t('driveDisconnectNote3', '연결 해제 후에도 언제든 다시 연결할 수 있습니다')}</li>
            </ul>
          </div>
        </div>
      `;

      const modal = ModalBase.create('disconnect-modal', t('driveDisconnectTitle', '연결 해제 확인'), content, {
        width: '420px',
        footer: `
          <button class="btn-secondary modal-cancel">${t('cancel', '취소')}</button>
          <button class="btn-danger modal-confirm" style="background: #e74c3c;">${t('driveDisconnect', '연결 해제')}</button>
        `
      });

      modal.querySelector('.modal-cancel').onclick = () => ModalBase.close('disconnect-modal');
      modal.querySelector('.modal-confirm').onclick = () => {
        ModalBase.close('disconnect-modal');
        setTimeout(() => {
          if (callback) callback();
        }, 250);
      };
    }
  };

  // ============================================
  // 이벤트 리스너 설정
  // ============================================

  function setupDriveEventListeners() {
    const connectBtn = document.getElementById('connectDriveBtn');
    const disconnectBtn = document.getElementById('disconnectDriveBtn');
    const savePathBtn = document.getElementById('saveDrivePathBtn');

    if (connectBtn) {
      connectBtn.addEventListener('click', connectDrive);
    }

    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', disconnectDrive);
    }

    if (savePathBtn) {
      savePathBtn.addEventListener('click', saveDrivePath);
    }

    console.log('[Settings-Drive] Drive event listeners attached');
  }

  function setupBackupEventListeners() {
    const runBackupBtn = document.getElementById('runBackupBtn');
    const viewHistoryBtn = document.getElementById('viewBackupHistoryBtn');

    if (runBackupBtn) {
      runBackupBtn.addEventListener('click', () => runManualBackup());
    }

    if (viewHistoryBtn) {
      viewHistoryBtn.addEventListener('click', viewBackupHistory);
    }

    console.log('[Settings-Drive] Backup event listeners attached');
  }

  // ============================================
  // 유틸리티 함수
  // ============================================

  function formatBytes(bytes) {
    const intl = window.MyMind3?.Intl;
    if (intl) return intl.formatFileSize(bytes);
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function showToast(message, type = 'info') {
    if (window.showToast && window.showToast !== showToast) {
      window.showToast(type, message);
    } else {
      console.log(`[Toast] ${type}: ${message}`);
      const toast = document.createElement('div');
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
        color: white;
        border-radius: 8px;
        z-index: 100002;
        animation: fadeIn 0.3s ease;
      `;
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 3000);
    }
  }

  // ============================================
  // 초기화 함수 (글로벌 공개)
  // ============================================

  window.initDriveAndBackupSettings = async function () {
    console.log('[Settings-Drive] Initializing drive and backup settings...');
    await initDriveSettings();
    await initBackupSettings();
  };

  // 글로벌 함수 공개
  window.viewBackupHistory = viewBackupHistory;

  // URL 파라미터 확인 (드라이브 연결 후 리다이렉트)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('drive') === 'connected') {
    showToast(t('driveConnectedSuccess', '구글 드라이브가 연결되었습니다!'), 'success');
    // URL 파라미터 제거
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (urlParams.get('drive') === 'error') {
    showToast(t('driveConnectError', '드라이브 연결에 실패했습니다') + ': ' + (urlParams.get('message') || t('unknownError', '알 수 없는 오류')), 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
  }

})();
