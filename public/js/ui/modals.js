// MyMind3 Modal Management
window.MyMind3 = window.MyMind3 || {};
window.MyMind3.UI = window.MyMind3.UI || {};

window.MyMind3.UI.Modals = {
    _container: null,
    _activeModals: new Set(),

    init() {
        this._container = window.MyMind3.Utils.DOM.find('#modals-container');
        if (!this._container) {
            this._container = window.MyMind3.Utils.DOM.create('div', {
                id: 'modals-container',
                class: 'modals-container'
            });
            document.body.appendChild(this._container);
        }
    },

    show(type, options = {}) {
        const modal = this._createModal(type, options);
        this._container.appendChild(modal);
        this._activeModals.add(modal);

        // Show with animation
        setTimeout(() => modal.classList.add('visible'), 10);

        return modal;
    },

    close(modal) {
        if (modal && this._activeModals.has(modal)) {
            modal.classList.remove('visible');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
                this._activeModals.delete(modal);
            }, 300);
        }
    },

    _createModal(type, options) {
        const modal = window.MyMind3.Utils.DOM.create('div', {
            class: 'modal-overlay'
        });

        const dialog = window.MyMind3.Utils.DOM.create('div', {
            class: 'modal-dialog'
        });

        const content = this._getModalContent(type, options);
        dialog.appendChild(content);
        modal.appendChild(dialog);

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.close(modal);
            }
        });

        return modal;
    },

    _getModalContent(type, options) {
        switch (type) {
            case 'settings':
                return this._createSettingsModal(options);
            case 'export':
                return this._createExportModal(options);
            case 'file-browser':
                return this._createFileBrowserModal(options);
            default:
                return this._createGenericModal(options);
        }
    },

    _createSettingsModal(options) {
        return window.MyMind3.Utils.DOM.create('div', {
            class: 'modal-content settings-modal'
        }, `
            <div class="modal-header">
                <h2>Settings</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="settings-tabs">
                    <button class="tab-btn active" data-tab="general">General</button>
                    <button class="tab-btn" data-tab="ai">AI</button>
                </div>
                <div class="settings-content">
                    <div class="tab-content active" data-tab-content="general">
                        <p>General settings coming soon...</p>
                    </div>
                    <div class="tab-content" data-tab-content="ai">
                        <p>AI settings coming soon...</p>
                    </div>
                </div>
            </div>
        `);
    },

    _createExportModal(options) {
        return window.MyMind3.Utils.DOM.create('div', {
            class: 'modal-content export-modal'
        }, `
            <div class="modal-header">
                <h2>Export Mind Map</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="export-options">
                    <label><input type="radio" name="format" value="json" checked> JSON</label>
                    <label><input type="radio" name="format" value="html"> HTML</label>
                    <label><input type="radio" name="format" value="markdown"> Markdown</label>
                </div>
                <button class="btn-primary export-btn">Export</button>
            </div>
        `);
    },

    _createFileBrowserModal(options) {
        return window.MyMind3.Utils.DOM.create('div', {
            class: 'modal-content file-browser-modal'
        }, `
            <div class="modal-header">
                <h2>Open Mind Map</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="file-list">
                    <p>Loading files...</p>
                </div>
            </div>
        `);
    },

    _createGenericModal(options) {
        return window.MyMind3.Utils.DOM.create('div', {
            class: 'modal-content'
        }, `
            <div class="modal-header">
                <h2>${options.title || 'Modal'}</h2>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                ${options.content || '<p>Modal content</p>'}
            </div>
        `);
    }
};

// Toast notifications
window.MyMind3.UI.Toast = {
    show(message, type = 'info', duration = 3000) {
        const toast = window.MyMind3.Utils.DOM.create('div', {
            class: `toast toast-${type}`
        }, message);

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('visible'), 10);

        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
};

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.MyMind3.UI.Modals.init();
    });
} else {
    window.MyMind3.UI.Modals.init();
}

Object.freeze(window.MyMind3.UI.Modals);
Object.freeze(window.MyMind3.UI.Toast);