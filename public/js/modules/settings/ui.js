/**
 * Settings UI Module (ESM)
 * UI 관련 공통 유틸리티
 */
export class SettingsUI {
    static showSection(id) {
        const element = document.getElementById(id);
        if (element) element.style.display = '';
    }

    static hideSection(id) {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    }

    static async showToast(message, type = 'info') {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[Toast] ${type}: ${message}`);
        }
    }
}
