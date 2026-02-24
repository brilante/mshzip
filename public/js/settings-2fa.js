/**
 * Settings 2FA (TOTP) Module
 * 2차 인증 설정 관리
 */

(function() {
  'use strict';

  // 현재 백업 코드 저장 (다운로드/복사용)
  let currentBackupCodes = [];

  /**
   * 2FA 상태 로드
   */
  async function loadTwoFactorStatus() {
    try {
      const response = await fetch('/api/2fa/status', {
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn('[2FA] Status API error:', response.status);
        return;
      }

      const data = await response.json();

      if (!data.success) {
        console.warn('[2FA] Status check failed:', data.message);
        return;
      }

      // TOTP 사용 불가 시 UI 숨기기
      if (!data.totpAvailable) {
        const unavailableEl = document.getElementById('twoFactorUnavailable');
        const settingsGroup = document.querySelector('#content-security .setting-group');
        if (unavailableEl) unavailableEl.style.display = 'block';
        if (settingsGroup) settingsGroup.style.display = 'none';
        return;
      }

      updateTwoFactorUI(data.totpEnabled, data.backupCodeCount);
    } catch (error) {
      console.error('[2FA] Status load error:', error);
    }
  }

  /**
   * 2FA UI 업데이트
   */
  function updateTwoFactorUI(enabled, backupCodeCount) {
    const statusEl = document.getElementById('twoFactorStatus');
    const enableSection = document.getElementById('twoFactorEnableSection');
    const manageSection = document.getElementById('twoFactorManageSection');
    const backupCountEl = document.getElementById('backupCodeCount');

    if (enabled) {
      // 2FA 활성화 상태
      if (statusEl) {
        statusEl.innerHTML = mmIcon('check-circle', 14) + ' ' + t('twofaEnabled', '활성화');
        statusEl.className = 'status-badge connected';
      }
      if (enableSection) enableSection.style.display = 'none';
      if (manageSection) manageSection.style.display = 'block';
      if (backupCountEl) {
        backupCountEl.textContent = `${backupCodeCount}${t('twofaCodesRemaining', '개 남음')}`;
        if (backupCodeCount <= 2) {
          backupCountEl.style.color = '#ef4444';
        } else {
          backupCountEl.style.color = '';
        }
      }
    } else {
      // 2FA 비활성화 상태
      if (statusEl) {
        statusEl.innerHTML = mmIcon('x-circle', 14) + ' ' + t('twofaDisabled', '비활성화');
        statusEl.className = 'status-badge disconnected';
      }
      if (enableSection) enableSection.style.display = 'flex';
      if (manageSection) manageSection.style.display = 'none';
    }
  }

  /**
   * 2FA 설정 모달 열기
   */
  async function openTwoFactorSetupModal() {
    const modal = document.getElementById('twoFactorSetupModal');
    const step1 = document.getElementById('twoFactorStep1');
    const step2 = document.getElementById('twoFactorStep2');
    const qrImage = document.getElementById('qrCodeImage');
    const manualKey = document.getElementById('manualEntryKey');
    const codeInput = document.getElementById('totpVerifyCode');

    // 초기화
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    if (codeInput) codeInput.value = '';

    // API 호출하여 QR 코드 생성
    try {
      const response = await window.csrfUtils.secureFetch('/api/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.message || t('twofaSetupFailed', '2FA 설정을 시작할 수 없습니다.'));
        return;
      }

      // QR 코드 및 수동 입력 키 표시
      if (qrImage) qrImage.src = data.qrCodeDataUrl;
      if (manualKey) manualKey.textContent = data.manualEntryKey;

      // 모달 표시
      if (modal) modal.style.display = 'flex';

    } catch (error) {
      console.error('[2FA] Setup error:', error);
      alert(t('twofaSetupError', '2FA 설정 중 오류가 발생했습니다.'));
    }
  }

  /**
   * 2FA 설정 모달 닫기
   */
  function closeTwoFactorSetupModal(reload = false) {
    const modal = document.getElementById('twoFactorSetupModal');
    if (modal) modal.style.display = 'none';

    if (reload) {
      loadTwoFactorStatus();
    }
  }

  /**
   * 2FA 설정 검증 및 활성화
   */
  async function verifyTwoFactorSetup() {
    const codeInput = document.getElementById('totpVerifyCode');
    const code = codeInput ? codeInput.value.trim() : '';

    if (!code || code.length !== 6) {
      alert(t('twofaEnterCode', '6자리 인증 코드를 입력하세요.'));
      return;
    }

    try {
      const response = await window.csrfUtils.secureFetch('/api/2fa/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.message || t('twofaInvalidCode', '인증 코드가 올바르지 않습니다.'));
        return;
      }

      // 백업 코드 저장 및 표시
      currentBackupCodes = data.backupCodes || [];
      displayBackupCodes(data.backupCodes, 'backupCodesList');

      // Step 2 표시
      const step1 = document.getElementById('twoFactorStep1');
      const step2 = document.getElementById('twoFactorStep2');
      if (step1) step1.style.display = 'none';
      if (step2) step2.style.display = 'block';

    } catch (error) {
      console.error('[2FA] Verify setup error:', error);
      alert(t('twofaActivateError', '2FA 활성화 중 오류가 발생했습니다.'));
    }
  }

  /**
   * 백업 코드 목록 표시
   */
  function displayBackupCodes(codes, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !codes) return;

    container.innerHTML = codes.map(code =>
      `<div class="backup-code-item"><code>${code}</code></div>`
    ).join('');
  }

  /**
   * 수동 입력 키 복사
   */
  function copyManualKey() {
    const manualKey = document.getElementById('manualEntryKey');
    if (!manualKey) return;

    const key = manualKey.textContent.replace(/\s/g, '');
    navigator.clipboard.writeText(key).then(() => {
      showToast(t('twofaKeyCopied', '키가 복사되었습니다.'));
    }).catch(err => {
      console.error('[2FA] Copy failed:', err);
    });
  }

  /**
   * 백업 코드 복사
   */
  function copyBackupCodes(type = 'setup') {
    const codes = type === 'new' ?
      (window.newBackupCodes || []) : currentBackupCodes;

    if (!codes.length) return;

    const text = codes.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      showToast(t('twofaBackupCodesCopied', '백업 코드가 복사되었습니다.'));
    }).catch(err => {
      console.error('[2FA] Copy failed:', err);
    });
  }

  /**
   * 백업 코드 다운로드
   */
  function downloadBackupCodes(type = 'setup') {
    const codes = type === 'new' ?
      (window.newBackupCodes || []) : currentBackupCodes;

    if (!codes.length) return;

    const content = `MyMind3 2FA ${t('twofaBackupCodesTitle', '백업 코드')}
${t('twofaCreatedDate', '생성일')}: ${new Date().toLocaleDateString()}

${t('twofaBackupCodesDesc', '아래 코드는 인증 앱을 사용할 수 없을 때 로그인에 사용됩니다.')}
${t('twofaBackupCodesOnce', '각 코드는 한 번만 사용할 수 있습니다.')}

${codes.join('\n')}

${t('twofaKeepSafe', '이 파일을 안전한 곳에 보관하세요!')}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mymind3-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 2FA 비활성화 모달 열기
   */
  function openDisable2FAModal() {
    const modal = document.getElementById('disable2FAModal');
    const passwordInput = document.getElementById('disable2FAPassword');
    const codeInput = document.getElementById('disable2FACode');

    // 초기화
    if (passwordInput) passwordInput.value = '';
    if (codeInput) codeInput.value = '';

    // 비밀번호 탭 활성화
    switchDisableAuthTab('password');

    // 모달 표시 (CSS에서 스타일 관리)
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  /**
   * 2FA 비활성화 모달 닫기
   */
  function closeDisable2FAModal() {
    const modal = document.getElementById('disable2FAModal');
    if (modal) modal.style.display = 'none';
  }

  /**
   * 2FA 비활성화 인증 탭 전환
   */
  function switchDisableAuthTab(tab) {
    // Ultra compact 스타일 지원
    const passwordBtn = document.querySelector('.disable2fa-tabs .disable2fa-tab:first-child') ||
                        document.querySelector('.auth-tabs-inline .auth-tab-sm:first-child') ||
                        document.querySelector('.auth-tabs .auth-tab:first-child');
    const codeBtn = document.querySelector('.disable2fa-tabs .disable2fa-tab:last-child') ||
                    document.querySelector('.auth-tabs-inline .auth-tab-sm:last-child') ||
                    document.querySelector('.auth-tabs .auth-tab:last-child');
    const passwordInput = document.getElementById('disablePasswordInput');
    const codeInput = document.getElementById('disableCodeInput');

    if (tab === 'password') {
      if (passwordBtn) passwordBtn.classList.add('active');
      if (codeBtn) codeBtn.classList.remove('active');
      if (passwordInput) passwordInput.style.display = 'block';
      if (codeInput) codeInput.style.display = 'none';
    } else {
      if (passwordBtn) passwordBtn.classList.remove('active');
      if (codeBtn) codeBtn.classList.add('active');
      if (passwordInput) passwordInput.style.display = 'none';
      if (codeInput) codeInput.style.display = 'block';
    }
  }

  /**
   * 2FA 비활성화 확인
   */
  async function confirmDisable2FA() {
    const passwordInput = document.getElementById('disable2FAPassword');
    const codeInput = document.getElementById('disable2FACode');
    const passwordTab = document.getElementById('disablePasswordInput');

    const isPasswordTab = passwordTab && passwordTab.style.display !== 'none';
    const password = isPasswordTab ? (passwordInput ? passwordInput.value : '') : '';
    const code = !isPasswordTab ? (codeInput ? codeInput.value : '') : '';

    if (!password && !code) {
      alert(t('twofaEnterPasswordOrCode', '비밀번호 또는 인증 코드를 입력하세요.'));
      return;
    }

    try {
      const response = await window.csrfUtils.secureFetch('/api/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password, code })
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.message || t('twofaDisableFailed', '2FA 비활성화에 실패했습니다.'));
        return;
      }

      showToast(t('twofaDisabledSuccess', '2FA가 비활성화되었습니다.'));
      closeDisable2FAModal();
      loadTwoFactorStatus();

    } catch (error) {
      console.error('[2FA] Disable error:', error);
      alert(t('twofaDisableError', '2FA 비활성화 중 오류가 발생했습니다.'));
    }
  }

  /**
   * 백업 코드 재생성 모달 열기
   */
  function openRegenerateBackupCodesModal() {
    const modal = document.getElementById('regenerateBackupCodesModal');
    const step1 = document.getElementById('regenerateStep1');
    const step2 = document.getElementById('regenerateStep2');
    const codeInput = document.getElementById('regenerateVerifyCode');

    // 초기화
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    if (codeInput) codeInput.value = '';

    if (modal) modal.style.display = 'flex';
  }

  /**
   * 백업 코드 재생성 모달 닫기
   */
  function closeRegenerateBackupCodesModal(reload = false) {
    const modal = document.getElementById('regenerateBackupCodesModal');
    if (modal) modal.style.display = 'none';

    if (reload) {
      loadTwoFactorStatus();
    }
  }

  /**
   * 백업 코드 재생성 확인
   */
  async function confirmRegenerateBackupCodes() {
    const codeInput = document.getElementById('regenerateVerifyCode');
    const code = codeInput ? codeInput.value.trim() : '';

    if (!code || code.length !== 6) {
      alert(t('twofaEnterCode', '6자리 인증 코드를 입력하세요.'));
      return;
    }

    try {
      const response = await window.csrfUtils.secureFetch('/api/2fa/regenerate-backup-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.message || t('twofaRegenerateFailed', '백업 코드 재생성에 실패했습니다.'));
        return;
      }

      // 새 백업 코드 저장 및 표시
      window.newBackupCodes = data.backupCodes || [];
      displayBackupCodes(data.backupCodes, 'newBackupCodesList');

      // Step 2 표시
      const step1 = document.getElementById('regenerateStep1');
      const step2 = document.getElementById('regenerateStep2');
      if (step1) step1.style.display = 'none';
      if (step2) step2.style.display = 'block';

    } catch (error) {
      console.error('[2FA] Regenerate error:', error);
      alert(t('twofaRegenerateError', '백업 코드 재생성 중 오류가 발생했습니다.'));
    }
  }

  /**
   * 토스트 메시지 표시
   */
  function showToast(message) {
    const indicator = document.getElementById('savingIndicator');
    if (indicator) {
      indicator.textContent = message;
      indicator.style.display = 'block';
      setTimeout(() => {
        indicator.style.display = 'none';
      }, 2000);
    }
  }

  /**
   * 2FA 설정 초기화
   */
  function initTwoFactorSettings() {
    // 초기화 시 모든 2FA 모달 닫기 (이전 상태가 남아있을 수 있음)
    const disable2FAModal = document.getElementById('disable2FAModal');
    if (disable2FAModal) {
      disable2FAModal.style.display = 'none';
      disable2FAModal.style.cssText = 'display: none !important;';
    }
    const twoFactorSetupModal = document.getElementById('twoFactorSetupModal');
    if (twoFactorSetupModal) {
      twoFactorSetupModal.style.display = 'none';
    }
    const regenerateBackupCodesModal = document.getElementById('regenerateBackupCodesModal');
    if (regenerateBackupCodesModal) {
      regenerateBackupCodesModal.style.display = 'none';
    }

    // 버튼 이벤트 바인딩
    const enable2FABtn = document.getElementById('enable2FABtn');
    const disable2FABtn = document.getElementById('disable2FABtn');
    const regenerateBtn = document.getElementById('regenerateBackupCodesBtn');

    if (enable2FABtn) {
      enable2FABtn.addEventListener('click', openTwoFactorSetupModal);
    }

    if (disable2FABtn) {
      disable2FABtn.addEventListener('click', openDisable2FAModal);
    }

    if (regenerateBtn) {
      regenerateBtn.addEventListener('click', openRegenerateBackupCodesModal);
    }

    // TOTP 코드 입력 필드에 숫자만 허용
    const totpInputs = document.querySelectorAll('.totp-code-input');
    totpInputs.forEach(input => {
      input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
      });
    });

    // 2FA 상태 로드
    loadTwoFactorStatus();
  }

  // 전역 함수 노출
  window.loadTwoFactorStatus = loadTwoFactorStatus;
  window.openTwoFactorSetupModal = openTwoFactorSetupModal;
  window.closeTwoFactorSetupModal = closeTwoFactorSetupModal;
  window.verifyTwoFactorSetup = verifyTwoFactorSetup;
  window.copyManualKey = copyManualKey;
  window.copyBackupCodes = copyBackupCodes;
  window.downloadBackupCodes = downloadBackupCodes;
  window.openDisable2FAModal = openDisable2FAModal;
  window.closeDisable2FAModal = closeDisable2FAModal;
  window.switchDisableAuthTab = switchDisableAuthTab;
  window.confirmDisable2FA = confirmDisable2FA;
  window.openRegenerateBackupCodesModal = openRegenerateBackupCodesModal;
  window.closeRegenerateBackupCodesModal = closeRegenerateBackupCodesModal;
  window.confirmRegenerateBackupCodes = confirmRegenerateBackupCodes;
  window.initTwoFactorSettings = initTwoFactorSettings;

  // DOM 로드 완료 시 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTwoFactorSettings);
  } else {
    // 이미 로드된 경우 (settings 팝업으로 로드)
    initTwoFactorSettings();
  }

})();
