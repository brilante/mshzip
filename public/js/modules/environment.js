/**
 * 환경 배지 모듈
 * @module modules/environment
 * @description 환경 배지 로드 및 표시 기능 제공
 */

/**
 * 환경 배지 로드 및 표시
 * .env의 APP_ENV 설정에 따라 [로컬], [개발], [운영] 표시
 */
const t = window.t || ((k, fb) => fb);

async function loadEnvironmentBadge() {
  try {
    const response = await fetch('/api/config/info');
    const data = await response.json();

    if (data.success && data.config && data.config.environment) {
      const env = data.config.environment;
      const badge = document.getElementById('envBadge');

      if (badge) {
        // 환경별 텍스트 및 클래스 설정
        const envConfig = {
          local: { text: t('envBadgeLocal', '[로컬]'), class: 'env-local' },
          development: { text: t('envBadgeDev', '[개발]'), class: 'env-development' },
          production: { text: t('envBadgeProd', '[운영]'), class: 'env-production' }
        };

        const config = envConfig[env] || envConfig.local;
        badge.textContent = config.text;
        badge.className = `env-badge ${config.class}`;
        badge.style.display = 'inline-block';

        console.log(`[Environment] 현재 환경: ${env}`);
      }
    }
  } catch (error) {
    console.error('[Environment] 환경 정보 로드 실패:', error);
  }
}

// 전역 접근 가능하도록 등록
window.loadEnvironmentBadge = loadEnvironmentBadge;

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadEnvironmentBadge };
}
