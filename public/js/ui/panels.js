// MyMind3 Panel Management
window.MyMind3 = window.MyMind3 || {};
window.MyMind3.UI = window.MyMind3.UI || {};

window.MyMind3.UI.Panels = {
    // Panel state
    _panels: new Map(),
    _initialized: false,

    /**
     * Initialize panel management
     */
    init() {
        if (this._initialized) return;

        this._setupPanels();
        this._setupResizers();
        this._setupTabSwitching();
        this._loadPanelStates();

        this._initialized = true;
        console.log('Panel management initialized');
    },

    /**
     * Set up panel elements and state
     */
    _setupPanels() {
        const panelConfigs = [
            { id: 'left-panel', type: 'left', resizable: true },
            { id: 'right-panel', type: 'right', resizable: true, hasTabs: true },
            { id: 'center-panel', type: 'center', resizable: false }
        ];

        panelConfigs.forEach(config => {
            const element = window.MyMind3.Utils.DOM.find(`#${config.id}`);
            if (element) {
                this._panels.set(config.id, {
                    ...config,
                    element,
                    visible: true,
                    width: this._getComputedSize(element, 'width'),
                    height: this._getComputedSize(element, 'height'),
                    activeTab: config.hasTabs ? 'editor' : null
                });
            }
        });
    },

    /**
     * Set up panel resizers
     */
    _setupResizers() {
        const resizers = window.MyMind3.Utils.DOM.findAll('.divider.vertical-divider');

        resizers.forEach(resizer => {
            this._setupResizer(resizer);
        });
    },

    /**
     * Set up individual resizer
     */
    _setupResizer(resizer) {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        let targetPanel = null;

        const onMouseDown = (e) => {
            isResizing = true;
            startX = e.clientX;

            // Find the panel being resized
            const prevElement = resizer.previousElementSibling;
            if (prevElement && prevElement.classList.contains('panel')) {
                targetPanel = this._panels.get(prevElement.id);
                startWidth = targetPanel ? targetPanel.width : 0;
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.body.classList.add('resizing');
            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!isResizing || !targetPanel) return;

            const deltaX = e.clientX - startX;
            const newWidth = Math.max(100, Math.min(600, startWidth + deltaX));

            this.setPanelSize(targetPanel.element.id, newWidth);
        };

        const onMouseUp = () => {
            isResizing = false;
            targetPanel = null;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.classList.remove('resizing');
            this._savePanelStates();
        };

        resizer.addEventListener('mousedown', onMouseDown);
    },

    /**
     * Set up tab switching for panels with tabs
     */
    _setupTabSwitching() {
        const tabButtons = window.MyMind3.Utils.DOM.findAll('.tab-btn');

        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = button.dataset.tab;
                const panel = button.closest('.panel');

                if (panel && tabName) {
                    this.switchTab(panel.id, tabName);
                }
            });
        });
    },

    /**
     * Switch active tab in a panel
     */
    switchTab(panelId, tabName) {
        const panel = this._panels.get(panelId);
        if (!panel || !panel.hasTabs) return;

        const panelElement = panel.element;

        // Update tab buttons
        const tabButtons = window.MyMind3.Utils.DOM.findAll('.tab-btn', panelElement);
        tabButtons.forEach(btn => {
            const isActive = btn.dataset.tab === tabName;
            window.MyMind3.Utils.DOM.toggleClass(btn, 'active', isActive);
        });

        // Update tab content
        const tabContents = window.MyMind3.Utils.DOM.findAll('.tab-content', panelElement);
        tabContents.forEach(content => {
            const isActive = content.dataset.tabContent === tabName;
            window.MyMind3.Utils.DOM.toggleClass(content, 'active', isActive);
        });

        // Update panel state
        panel.activeTab = tabName;

        // Emit event
        window.MyMind3.Events.emit('panel:tab-switched', {
            panelId,
            tabName
        });

        this._savePanelStates();
    },

    /**
     * Toggle panel visibility
     */
    togglePanel(panelId) {
        const panel = this._panels.get(panelId);
        if (!panel) return;

        const newVisibility = !panel.visible;
        this.setPanelVisibility(panelId, newVisibility);
    },

    /**
     * Set panel visibility
     */
    setPanelVisibility(panelId, visible) {
        const panel = this._panels.get(panelId);
        if (!panel) return;

        panel.visible = visible;
        window.MyMind3.Utils.DOM.toggleClass(panel.element, 'hidden', !visible);

        // Emit event
        window.MyMind3.Events.emit('panel:visibility-changed', {
            panelId,
            visible
        });

        this._savePanelStates();
    },

    /**
     * Set panel size
     */
    setPanelSize(panelId, width, height = null) {
        const panel = this._panels.get(panelId);
        if (!panel) return;

        if (width !== null) {
            panel.width = width;
            panel.element.style.width = `${width}px`;
        }

        if (height !== null) {
            panel.height = height;
            panel.element.style.height = `${height}px`;
        }

        // Emit event
        window.MyMind3.Events.emit('panel:size-changed', {
            panelId,
            width: panel.width,
            height: panel.height
        });
    },

    /**
     * Get panel state
     */
    getPanelState(panelId) {
        const panel = this._panels.get(panelId);
        if (!panel) return null;

        return {
            visible: panel.visible,
            width: panel.width,
            height: panel.height,
            activeTab: panel.activeTab
        };
    },

    /**
     * Get all panel states
     */
    getAllPanelStates() {
        const states = {};
        this._panels.forEach((panel, id) => {
            states[id] = this.getPanelState(id);
        });
        return states;
    },

    /**
     * Load panel states from storage
     */
    _loadPanelStates() {
        const workspace = window.MyMind3.WorkspaceStorage.get();

        Object.entries(workspace.panels || {}).forEach(([panelId, state]) => {
            const panel = this._panels.get(panelId);
            if (!panel) return;

            if (typeof state.visible === 'boolean') {
                this.setPanelVisibility(panelId, state.visible);
            }

            if (typeof state.width === 'number' && state.width > 0) {
                this.setPanelSize(panelId, state.width, state.height);
            }

            if (state.activeTab && panel.hasTabs) {
                this.switchTab(panelId, state.activeTab);
            }
        });
    },

    /**
     * Save panel states to storage
     */
    _savePanelStates() {
        const panelStates = this.getAllPanelStates();
        window.MyMind3.WorkspaceStorage.update({
            panels: panelStates
        });
    },

    /**
     * Get computed size of element
     */
    _getComputedSize(element, dimension) {
        const style = getComputedStyle(element);
        const value = dimension === 'width' ? style.width : style.height;
        return parseInt(value, 10) || 0;
    },

    /**
     * Reset all panels to default state
     */
    resetPanels() {
        const defaultWorkspace = window.MyMind3.WorkspaceStorage.getDefault();

        Object.entries(defaultWorkspace.panels).forEach(([panelId, state]) => {
            this.setPanelVisibility(panelId, state.visible);
            if (state.width) {
                this.setPanelSize(panelId, state.width, state.height);
            }
        });

        // Reset active tabs
        this._panels.forEach((panel, panelId) => {
            if (panel.hasTabs) {
                this.switchTab(panelId, 'editor');
            }
        });

        window.MyMind3.Events.emit('panels:reset');
    }
};

// Panel toggle handlers
window.MyMind3.UI.PanelHandlers = {
    init() {
        // Panel toggle buttons
        const toggleButtons = window.MyMind3.Utils.DOM.findAll('[data-panel]');
        toggleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const panelId = button.dataset.panel;
                if (panelId) {
                    window.MyMind3.UI.Panels.togglePanel(`${panelId}-panel`);
                }
            });
        });

        // Keyboard shortcuts for panels
        window.MyMind3.Events.on('shortcut:toggle-left-panel', () => {
            window.MyMind3.UI.Panels.togglePanel('left-panel');
        });

        window.MyMind3.Events.on('shortcut:toggle-right-panel', () => {
            window.MyMind3.UI.Panels.togglePanel('right-panel');
        });
    }
};

// Initialize panels when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.MyMind3.UI.Panels.init();
        window.MyMind3.UI.PanelHandlers.init();
    });
} else {
    window.MyMind3.UI.Panels.init();
    window.MyMind3.UI.PanelHandlers.init();
}

// Freeze panel objects
Object.freeze(window.MyMind3.UI.Panels);
Object.freeze(window.MyMind3.UI.PanelHandlers);