/**
 * ============================================
 * ai-credits.js - AI 크레딧 관리 모듈
 * ============================================
 * 크레딧 조회, 차감, UI 업데이트, 검증 기능 담당
 * ============================================
 */

(function() {
  'use strict';

  // 크레딧 잔액 조회
  async function getCreditBalance() {
    try {
      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
      // ApiCache 사용 (중복 호출 방지)
      const response = window.ApiCache
        ? await window.ApiCache.fetch('/api/credits/balance')
        : await fetch('/api/credits/balance', { method: 'GET', credentials: 'include' });

      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
    } catch (error) {
      console.error('[Credits] Failed to get balance:', error);
    }
    return null;
  }

  // 크레딧 차감
  async function deductCredits(service, model, tokens) {
    try {
      // 크레딧 모드 확인 (설정에서 가져옴)
      const savedSettings = localStorage.getItem('aiSettings');
      let creditMode = false;
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          creditMode = settings.creditMode === true;
        } catch (e) {}
      }

      // 크레딧 모드가 아니면 차감하지 않음 (API Key 사용)
      if (!creditMode) {
        console.log('[Credits] Credit mode disabled, using API key');
        return { success: true, skipped: true };
      }

      // 토큰 수에 따른 크레딧 계산 (1K 토큰당 기본 1 크레딧)
      const creditsToDeduct = Math.ceil(tokens / 1000);

      const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
      const response = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        credentials: 'include',
        body: JSON.stringify({
          amount: creditsToDeduct,
          service,
          model,
          tokens
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Credits] Deducted ${creditsToDeduct} credits for ${service}/${model}`);

        // 잔액 UI 업데이트
        updateCreditBalanceUI(data.data.remaining);

        return data;
      } else {
        const errorData = await response.json();
        console.error('[Credits] Deduction failed:', errorData.error);
        return { success: false, error: errorData.error };
      }
    } catch (error) {
      console.error('[Credits] Deduction error:', error);
      return { success: false, error: error.message };
    }
  }

  // 잔액 UI 업데이트
  function updateCreditBalanceUI(balance) {
    // 헤더의 크레딧 표시 업데이트
    // 형식: (크레딧C) - 크레딧과 C는 굵은 글씨, 쉼표 없음
    const creditPart = document.getElementById('creditPart');
    if (creditPart && balance !== undefined) {
      const total = balance.total !== undefined ? balance.total :
                   (balance.free || 0) + (balance.service || 0) + (balance.paid || 0);
      const fmtTotal = window.MyMind3?.Intl?.formatNumber(total) || total;
      creditPart.innerHTML = `(<b>${fmtTotal}C</b>)`;
    }
  }

  // 크레딧 잔액 검증 (요청 전)
  async function validateCreditBalance(estimatedTokens) {
    const savedSettings = localStorage.getItem('aiSettings');
    let creditMode = false;
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        creditMode = settings.creditMode === true;
      } catch (e) {}
    }

    // 크레딧 모드가 아니면 검증 통과
    if (!creditMode) {
      return { valid: true, message: 'API Key mode' };
    }

    const balance = await getCreditBalance();
    if (!balance) {
      return { valid: false, message: '크레딧 정보를 가져올 수 없습니다.' };
    }

    const requiredCredits = Math.ceil(estimatedTokens / 1000);
    const totalBalance = balance.credits.total;

    if (totalBalance < requiredCredits) {
      // 크레딧 부족 토스트 표시
      showCreditToast(`크레딧이 부족합니다. (필요: ${requiredCredits}, 잔액: ${totalBalance})`, 'error', 5000);
      return {
        valid: false,
        message: `크레딧이 부족합니다. 필요: ${requiredCredits}, 잔액: ${totalBalance}`,
        balance: totalBalance,
        required: requiredCredits
      };
    }

    // 크레딧 잔액 부족 경고 (잔액이 예상 소비의 2배 미만일 때)
    if (totalBalance < requiredCredits * 2) {
      showCreditToast(`크레딧 잔액이 부족해지고 있습니다. (잔액: ${totalBalance})`, 'warning', 3000);
    }

    return {
      valid: true,
      balance: totalBalance,
      required: requiredCredits
    };
  }

  // 토스트 메시지 표시
  function showCreditToast(message, type = 'warning', duration = 4000) {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.credit-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // 아이콘 선택 (mmIcon SVG)
    const icons = {
      warning: mmIcon('alert-triangle', 16),
      error: mmIcon('x-circle', 16),
      success: mmIcon('check-circle', 16),
      info: mmIcon('info', 16)
    };

    // 토스트 생성
    const toast = document.createElement('div');
    toast.className = `credit-toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="닫기">&times;</button>
    `;

    document.body.appendChild(toast);

    // 닫기 버튼 이벤트
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    });

    // 애니메이션으로 표시
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // 자동 숨김
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) {
          toast.classList.remove('show');
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }

    return toast;
  }

  // Service-specific optimal token calculation
  function getOptimalMaxTokens(service, model, requestType = 'chat') {
    const serviceTokenLimits = {
      gpt: {
        'gpt-5': 128000,
        'gpt-5-codex': 128000,
        'o3': 100000,
        'o3-mini': 100000,
        'gpt-4.1': 32768,
        'gpt-4.1-mini': 32768,
        'gpt-4.1-nano': 32768,
        'gpt-4o': 4096,
        'gpt-4o-mini': 4096,
        'gpt-4-turbo': 4096,
        'gpt-3.5-turbo': 4096,
        'default': 4096
      },
      grok: {
        'grok-4': 16000,
        'grok-3': 16000,
        'grok-2': 8192,
        'grok-2-mini': 8192,
        'grok-1.5': 8192,
        'grok-1': 8192,
        'default': 8192
      },
      claude: {
        'claude-3.7-sonnet': 128000,
        'claude-opus-4': 8192,
        'claude-sonnet-4': 8192,
        'claude-haiku-4': 8192,
        'claude-3.5-sonnet': 8192,
        'default': 8192
      },
      gemini: {
        'gemini-2.0-pro': 8192,
        'gemini-2.0-flash': 2048,
        'gemini-1.5-pro': 8192,
        'gemini-1.5-flash': 8192,
        'default': 8192
      },
      local: {
        'gpt-oss-20b': 32000,
        'llama-2-70b': 32000,
        'mistral-7b': 32000,
        'codellama-34b': 32000,
        'default': 32000
      }
    };

    const serviceMap = serviceTokenLimits[service] || serviceTokenLimits.gpt;
    const maxTokens = serviceMap[model] || serviceMap.default;

    // For node expansion, use about 50% of max tokens to leave room for input
    if (requestType === 'nodeExpansion') {
      return Math.floor(maxTokens * 0.5);
    }

    // For chat, use about 80% of max tokens to leave room for input
    return Math.floor(maxTokens * 0.8);
  }

  // 전역 함수 노출
  window.getCreditBalance = getCreditBalance;
  window.deductCredits = deductCredits;
  window.updateCreditBalanceUI = updateCreditBalanceUI;
  window.validateCreditBalance = validateCreditBalance;
  window.showCreditToast = showCreditToast;
  window.getOptimalMaxTokens = getOptimalMaxTokens;

  console.log('[Module] ai-credits.js loaded');
})();
