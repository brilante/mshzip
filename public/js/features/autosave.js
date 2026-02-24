// MyMind3 AutoSave Feature
window.MyMind3 = window.MyMind3 || {};
window.MyMind3.Features = window.MyMind3.Features || {};

window.MyMind3.Features.AutoSave = {
    _enabled: true,
    _timeoutId: null,

    init() {
        window.MyMind3.Events.on('mindmap:content-changed', () => {
            this.scheduleAutoSave();
        });
    },

    scheduleAutoSave() {
        if (!this._enabled) return;
        // 읽기 전용 모드 체크
        if (window.MyMind3.isReadOnly) return;

        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
        }

        this._timeoutId = setTimeout(() => {
            this.performAutoSave();
        }, 2000);
    },

    performAutoSave() {
        window.MyMind3.Events.emit('action:save-mindmap');
        console.log('Auto-save performed');
    }
};

// Object.freeze 제거 - isReadOnly 동적 체크를 위해 필요