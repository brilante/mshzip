// MyMind3 Storage Management
window.MyMind3 = window.MyMind3 || {};

window.MyMind3.Storage = {
    // Storage keys (fallback if constants not loaded)
    KEYS: (window.MyMind3 && window.MyMind3.Constants && window.MyMind3.Constants.STORAGE) || {
        THEME: 'mymind3_theme',
        SETTINGS: 'mymind3_settings',
        RECENT_FILES: 'mymind3_recent_files',
        WORKSPACE: 'mymind3_workspace',
        AI_SETTINGS: 'mymind3_ai_settings'
    },

    /**
     * Set item in localStorage with error handling
     */
    set(key, value) {
        try {
            const serialized = JSON.stringify({
                data: value,
                timestamp: new Date().toISOString(),
                version: (window.MyMind3 && window.MyMind3.Constants && window.MyMind3.Constants.VERSION) || '3.0.0'
            });
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
            // Safe error logging (Utils might not be loaded yet)
            if (window.MyMind3 && window.MyMind3.Utils && window.MyMind3.Utils.Error) {
                window.MyMind3.Utils.Error.log(error, { key, operation: 'set' });
            }
            return false;
        }
    },

    /**
     * Get item from localStorage with error handling
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return defaultValue;

            const parsed = JSON.parse(item);

            // Check if the stored data has the expected structure
            if (parsed && typeof parsed === 'object' && parsed.data !== undefined) {
                return parsed.data;
            }

            // Fallback for old format data
            return parsed || defaultValue;
        } catch (error) {
            console.error('Failed to read from localStorage:', error);
            window.MyMind3.Utils.Error.log(error, { key, operation: 'get' });
            return defaultValue;
        }
    },

    /**
     * Remove item from localStorage
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to remove from localStorage:', error);
            window.MyMind3.Utils.Error.log(error, { key, operation: 'remove' });
            return false;
        }
    },

    /**
     * Clear all app-related localStorage items
     */
    clear() {
        try {
            Object.values(this.KEYS).forEach(key => {
                this.remove(key);
            });
            return true;
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
            window.MyMind3.Utils.Error.log(error, { operation: 'clear' });
            return false;
        }
    },

    /**
     * Get storage usage information
     */
    getUsage() {
        const usage = {
            used: 0,
            total: 0,
            available: 0,
            items: {}
        };

        try {
            // Calculate usage for each key
            Object.entries(this.KEYS).forEach(([name, key]) => {
                const item = localStorage.getItem(key);
                const size = item ? new Blob([item]).size : 0;
                usage.items[name] = size;
                usage.used += size;
            });

            // Try to estimate total storage available
            try {
                const testKey = 'storage_test';
                const testData = 'x'.repeat(1024); // 1KB
                let testSize = 0;

                while (testSize < 10 * 1024 * 1024) { // Max 10MB test
                    localStorage.setItem(testKey, testData.repeat(testSize / 1024));
                    testSize += 1024;
                }
            } catch {
                // When storage is full, calculate available space
                usage.total = usage.used + testSize;
            }

            localStorage.removeItem('storage_test');
            usage.available = usage.total - usage.used;

        } catch (error) {
            console.error('Failed to calculate storage usage:', error);
        }

        return usage;
    }
};

// Specific storage managers for different data types
window.MyMind3.ThemeStorage = {
    get() {
        return window.MyMind3.Storage.get(window.MyMind3.Storage.KEYS.THEME, 'default');
    },

    set(theme) {
        const success = window.MyMind3.Storage.set(window.MyMind3.Storage.KEYS.THEME, theme);
        if (success) {
            window.MyMind3.EventEmitter.emitThemeChanged(theme);
        }
        return success;
    }
};

window.MyMind3.SettingsStorage = {
    getDefault() {
        return {
            autoSave: true,
            autoSaveInterval: 30000, // 30 seconds
            theme: 'default',
            showGrid: true,
            snapToGrid: false,
            gridSize: 20,
            zoomSensitivity: 1.0,
            animations: true,
            sounds: false,
            notifications: true,
            language: 'en',
            editor: {
                wordWrap: true,
                minimap: false,
                fontSize: 14,
                theme: 'default'
            },
            ai: {
                enabled: true,
                model: 'gpt-4o-mini',
                temperature: 0.7,
                maxTokens: 1000
            }
        };
    },

    get() {
        const defaultSettings = this.getDefault();
        const stored = window.MyMind3.Storage.get(window.MyMind3.Storage.KEYS.SETTINGS, {});
        return window.MyMind3.Utils.Object.deepMerge({}, defaultSettings, stored);
    },

    set(settings) {
        return window.MyMind3.Storage.set(window.MyMind3.Storage.KEYS.SETTINGS, settings);
    },

    update(partialSettings) {
        const current = this.get();
        const updated = window.MyMind3.Utils.Object.deepMerge({}, current, partialSettings);
        return this.set(updated);
    }
};

window.MyMind3.RecentFilesStorage = {
    get() {
        return window.MyMind3.Storage.get(window.MyMind3.Storage.KEYS.RECENT_FILES, []);
    },

    add(fileInfo) {
        const recentFiles = this.get();
        const existingIndex = recentFiles.findIndex(f => f.name === fileInfo.name);

        // Remove existing entry if found
        if (existingIndex > -1) {
            recentFiles.splice(existingIndex, 1);
        }

        // Add to beginning
        recentFiles.unshift({
            ...fileInfo,
            lastOpened: new Date().toISOString()
        });

        // Keep only last 10 files
        const trimmed = recentFiles.slice(0, 10);

        return window.MyMind3.Storage.set(window.MyMind3.Storage.KEYS.RECENT_FILES, trimmed);
    },

    remove(fileName) {
        const recentFiles = this.get();
        const filtered = recentFiles.filter(f => f.name !== fileName);
        return window.MyMind3.Storage.set(window.MyMind3.Storage.KEYS.RECENT_FILES, filtered);
    },

    clear() {
        return window.MyMind3.Storage.set(window.MyMind3.Storage.KEYS.RECENT_FILES, []);
    }
};

window.MyMind3.WorkspaceStorage = {
    getDefault() {
        return {
            layout: 'default',
            panels: {
                left: { visible: true, width: 250 },
                right: { visible: true, width: 350 },
                bottom: { visible: false, height: 200 }
            },
            viewport: {
                x: 0,
                y: 0,
                zoom: 1.0
            },
            selectedTool: 'select',
            selectedTab: 'editor'
        };
    },

    get() {
        const defaultWorkspace = this.getDefault();
        const stored = window.MyMind3.Storage.get(window.MyMind3.Storage.KEYS.WORKSPACE, {});
        return window.MyMind3.Utils.Object.deepMerge({}, defaultWorkspace, stored);
    },

    set(workspace) {
        return window.MyMind3.Storage.set(window.MyMind3.Storage.KEYS.WORKSPACE, workspace);
    },

    update(partialWorkspace) {
        const current = this.get();
        const updated = window.MyMind3.Utils.Object.deepMerge({}, current, partialWorkspace);
        return this.set(updated);
    }
};

window.MyMind3.AISettingsStorage = {
    getDefault() {
        return {
            enabled: true,
            model: 'gpt-4o-mini',
            temperature: 0.7,
            maxTokens: 1000,
            systemPrompt: 'You are a helpful assistant for mind mapping.',
            autoSuggest: true,
            suggestDelay: 2000,
            history: []
        };
    },

    get() {
        const defaultSettings = this.getDefault();
        const stored = window.MyMind3.Storage.get(window.MyMind3.Storage.KEYS.AI_SETTINGS, {});
        return window.MyMind3.Utils.Object.deepMerge({}, defaultSettings, stored);
    },

    set(settings) {
        return window.MyMind3.Storage.set(window.MyMind3.Storage.KEYS.AI_SETTINGS, settings);
    },

    update(partialSettings) {
        const current = this.get();
        const updated = window.MyMind3.Utils.Object.deepMerge({}, current, partialSettings);
        return this.set(updated);
    },

    addToHistory(query, response) {
        const settings = this.get();
        const historyEntry = {
            query,
            response,
            timestamp: new Date().toISOString(),
            id: window.MyMind3.Utils.String.generateId('ai_history')
        };

        settings.history.unshift(historyEntry);

        // Keep only last 50 entries
        settings.history = settings.history.slice(0, 50);

        return this.set(settings);
    },

    clearHistory() {
        const settings = this.get();
        settings.history = [];
        return this.set(settings);
    }
};

// Auto-save functionality
window.MyMind3.AutoSave = {
    _timeoutId: null,
    _isEnabled: false,

    start() {
        const settings = window.MyMind3.SettingsStorage.get();
        if (!settings.autoSave) return;

        this._isEnabled = true;
        this._scheduleNext();
    },

    stop() {
        this._isEnabled = false;
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }
    },

    _scheduleNext() {
        if (!this._isEnabled) return;

        const settings = window.MyMind3.SettingsStorage.get();
        this._timeoutId = setTimeout(() => {
            this._performAutoSave();
            this._scheduleNext();
        }, settings.autoSaveInterval);
    },

    async _performAutoSave() {
        try {
            // This will be implemented when the mindmap system is created
            window.MyMind3.Events.emit('autosave:triggered');
        } catch (error) {
            console.error('Auto-save failed:', error);
            window.MyMind3.Utils.Error.log(error, { operation: 'autosave' });
        }
    }
};

// Initialize auto-save when settings are loaded
window.MyMind3.Events.on('app:initialized', () => {
    window.MyMind3.AutoSave.start();
});

// Storage Authentication
window.MyMind3.StorageAuth = {
    _token: null,
    _port: null,
    _refreshing: false,

    /**
     * Initialize storage authentication by fetching token from server
     */
    async initialize() {
        try {
            // Try to get from localStorage first
            const storedToken = localStorage.getItem('storage_token');
            const storedPort = localStorage.getItem('server_port');

            if (storedToken && storedPort) {
                // 현재 서버 포트 확인 (포트 변경 감지)
                const currentPort = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
                if (storedPort !== currentPort) {
                    console.log('[StorageAuth] Port changed, refreshing token...');
                    return await this.refreshToken();
                }
                this._token = storedToken;
                this._port = storedPort;
                console.log('[StorageAuth] Using cached token');
                return this._token;
            }

            // Fetch new token from server
            return await this._fetchToken();
        } catch (error) {
            console.error('[StorageAuth] Storage auth error:', error);
            return null;
        }
    },

    /**
     * 서버에서 새 토큰 가져오기 (내부 메서드)
     */
    async _fetchToken() {
        const response = await fetch('/api/config/auth-token');
        const data = await response.json();

        if (data.success) {
            this._token = data.token;
            this._port = data.port;
            localStorage.setItem('storage_token', data.token);
            localStorage.setItem('server_port', data.port);
            console.log('[StorageAuth] Storage authentication initialized for port:', data.port);
            return this._token;
        } else {
            console.error('[StorageAuth] Failed to get token:', data);
            return null;
        }
    },

    /**
     * Get current token (initialize if not already done)
     */
    async getToken() {
        if (this._token) {
            return this._token;
        }
        return await this.initialize();
    },

    /**
     * 토큰 강제 갱신 (403 에러 시 호출)
     */
    async refreshToken() {
        if (this._refreshing) {
            // 이미 갱신 중이면 대기
            await new Promise(resolve => setTimeout(resolve, 100));
            return this._token;
        }

        this._refreshing = true;
        try {
            this.clearToken();
            const token = await this._fetchToken();
            console.log('[StorageAuth] Token refreshed successfully');
            return token;
        } finally {
            this._refreshing = false;
        }
    },

    /**
     * 403 에러 처리 - 토큰 재발급 후 재시도
     * @param {Function} retryFn - 재시도할 함수
     * @returns {Promise} - 재시도 결과
     */
    async handleTokenError(retryFn) {
        console.log('[StorageAuth] Token error detected, refreshing...');
        await this.refreshToken();
        return await retryFn();
    },

    /**
     * Clear stored token (useful when port changes)
     */
    clearToken() {
        this._token = null;
        this._port = null;
        localStorage.removeItem('storage_token');
        localStorage.removeItem('server_port');
        console.log('[StorageAuth] Token cleared');
    }
};

// Auto-initialize storage authentication when DOM is ready
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.MyMind3.StorageAuth.initialize();
    });
}

// Freeze storage objects (except StorageAuth which needs to maintain state)
Object.freeze(window.MyMind3.Storage);
Object.freeze(window.MyMind3.ThemeStorage);
Object.freeze(window.MyMind3.SettingsStorage);
Object.freeze(window.MyMind3.RecentFilesStorage);
Object.freeze(window.MyMind3.WorkspaceStorage);
Object.freeze(window.MyMind3.AISettingsStorage);
Object.freeze(window.MyMind3.AutoSave);
// Note: StorageAuth is NOT frozen because it needs to store token state