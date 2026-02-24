/**
 * 토스트 알림 모듈
 * @module modules/toast
 * @description 토스트 알림 표시 기능 제공
 */

/**
 * 토스트 알림 표시
 * @param {string} message - 표시할 메시지
 * @param {string} type - 알림 타입 ('success', 'error', 'warning', 'info')
 * @param {number} duration - 표시 시간 (ms)
 */
function showToast(message, type = 'success', duration = 3000) {
  // 기존 토스트 제거
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }

  // 새 토스트 생성
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  toast.textContent = message;

  // DOM에 추가
  document.body.appendChild(toast);

  // 애니메이션 시작
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // 자동 제거
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

// 전역 접근 가능하도록 등록
window.showToast = showToast;

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showToast };
}
