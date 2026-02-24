/**
 * Settings Module - ESM Main Entry
 * Phase 3.1: 프론트엔드 모듈화
 *
 * @version 1.0.0
 * @date 2026-01-23
 *
 * 사용법:
 *   <script type="module">
 *     import { SettingsUI, SettingsAuth, SettingsCore } from '/js/modules/settings/index.js';
 *     await SettingsAuth.checkAdminStatus();
 *   </script>
 *
 * 마이그레이션 상태:
 * - ui.js: SettingsUI 클래스 (완료)
 * - auth.js: SettingsAuth 클래스 (완료)
 * - core.js: SettingsCore 클래스 (예정)
 * - payment.js: SettingsPayment 클래스 (예정)
 * - ai.js: SettingsAI 클래스 (예정)
 */

// 완료된 모듈
export { SettingsUI } from './ui.js';
export { SettingsAuth } from './auth.js';

// 예정된 모듈 (향후 마이그레이션)
// export { SettingsCore } from './core.js';
// export { SettingsPayment } from './payment.js';
// export { SettingsAI } from './ai.js';

/**
 * Settings 초기화 함수
 * 모든 Settings 모듈을 초기화
 */
export async function initSettings() {
  try {
    // 관리자 상태 확인
    const adminStatus = await SettingsAuth.checkAdminStatus();

    // 관리자 UI 적용
    SettingsAuth.applyAdminUI(adminStatus.isAdminVerified);

    console.log('[Settings] Module initialized');
    return { success: true, adminStatus };
  } catch (error) {
    console.error('[Settings] Initialization failed:', error);
    return { success: false, error };
  }
}

/**
 * 버전 정보
 */
export const VERSION = '1.0.0';
export const BUILD_DATE = '2026-01-23';
