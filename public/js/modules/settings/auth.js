/**
 * Settings Auth Module (ESM)
 * 관리자 인증 및 상태 관리
 */
import { SettingsUI } from './ui.js';

export class SettingsAuth {
    static async checkAdminStatus() {
        try {
            const _xt = sessionStorage.getItem('_xt');
            let data;

            if (_xt) {
                const response = await fetch('/api/auth/verify-role', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ _xt })
                });
                data = await response.json();
                
                if (data._xt) sessionStorage.setItem('_xt', data._xt);
                
                if (!data.tokenValid) {
                    sessionStorage.removeItem('_xt');
                    const fallback = await fetch('/api/auth/admin-check');
                    data = await fallback.json();
                }
            } else {
                const response = await fetch('/api/auth/admin-check');
                data = await response.json();
            }

            return data;
        } catch (error) {
            console.error('[SettingsAuth] Status check failed:', error);
            return { isAdmin: false };
        }
    }

    static applyAdminUI(isAdminVerified) {
        const sections = [
            'featureSettingsNavItem',
            'adminNavItem',
            'aiModelAdminNavItem',
            'modelSyncLogsNavItem',
            'boardAdminNavItem'
        ];

        sections.forEach(id => {
            if (isAdminVerified) {
                SettingsUI.showSection(id);
            } else {
                SettingsUI.hideSection(id);
            }
        });

        if (isAdminVerified && window.initBoardAdmin) {
            window.initBoardAdmin();
        }
    }
}
