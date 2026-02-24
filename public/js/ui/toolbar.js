// MyMind3 Toolbar Management
window.MyMind3 = window.MyMind3 || {};
window.MyMind3.UI = window.MyMind3.UI || {};

window.MyMind3.UI.Toolbar = {
    // Toolbar state
    _tools: new Map(),
    _activeTool: 'select',
    _initialized: false,

    /**
     * Initialize toolbar management
     */
    init() {
        if (this._initialized) return;

        this._setupTools();
        this._setupNavigation();
        this._setupActions();
        this._loadToolbarState();

        this._initialized = true;
        console.log('Toolbar initialized');
    },

    /**
     * Set up drawing tools
     */
    _setupTools() {
        const toolButtons = window.MyMind3.Utils.DOM.findAll('[data-tool]');

        toolButtons.forEach(button => {
            const toolName = button.dataset.tool;
            const toolConfig = this._getToolConfig(toolName);

            this._tools.set(toolName, {
                name: toolName,
                element: button,
                config: toolConfig,
                active: toolName === this._activeTool
            });

            // Add click handler
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectTool(toolName);
            });

            // Update initial state
            window.MyMind3.Utils.DOM.toggleClass(button, 'active', toolName === this._activeTool);
        });
    },

    /**
     * Set up navigation actions
     */
    _setupNavigation() {
        const navButtons = window.MyMind3.Utils.DOM.findAll('[data-action]');

        navButtons.forEach(button => {
            const actionName = button.dataset.action;

            button.addEventListener('click', (e) => {
                e.preventDefault();
                this._handleAction(actionName);
            });
        });
    },

    /**
     * Set up additional actions
     */
    _setupActions() {
        // Theme toggle
        const themeToggle = window.MyMind3.Utils.DOM.find('#theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this._toggleTheme();
            });
        }

        // AI toggle
        const aiToggle = window.MyMind3.Utils.DOM.find('#ai-toggle');
        if (aiToggle) {
            aiToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this._toggleAI();
            });
        }

        // Settings toggle
        const settingsToggle = window.MyMind3.Utils.DOM.find('#settings-toggle');
        if (settingsToggle) {
            settingsToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this._showSettings();
            });
        }
    },

    /**
     * Select a tool
     */
    selectTool(toolName) {
        if (!this._tools.has(toolName)) {
            console.warn(`Tool '${toolName}' not found`);
            return;
        }

        // Deactivate current tool
        if (this._activeTool) {
            const currentTool = this._tools.get(this._activeTool);
            if (currentTool) {
                currentTool.active = false;
                window.MyMind3.Utils.DOM.toggleClass(currentTool.element, 'active', false);
            }
        }

        // Activate new tool
        const newTool = this._tools.get(toolName);
        newTool.active = true;
        window.MyMind3.Utils.DOM.toggleClass(newTool.element, 'active', true);

        this._activeTool = toolName;

        // Emit event
        window.MyMind3.Events.emit('tool:selected', {
            toolName,
            toolConfig: newTool.config
        });

        // Update cursor
        this._updateCursor(toolName);

        // Save state
        this._saveToolbarState();
    },

    /**
     * Get active tool
     */
    getActiveTool() {
        return this._activeTool;
    },

    /**
     * Get tool configuration
     */
    _getToolConfig(toolName) {
        const configs = {
            select: {
                cursor: 'default',
                shortcut: 'KeyV',
                description: 'Select and move nodes'
            },
            node: {
                cursor: 'crosshair',
                shortcut: 'KeyN',
                description: 'Create new nodes'
            },
            connect: {
                cursor: 'cell',
                shortcut: 'KeyC',
                description: 'Connect nodes'
            },
            'zoom-in': {
                cursor: 'zoom-in',
                shortcut: 'KeyZ',
                description: 'Zoom in',
                action: 'zoomIn'
            },
            'zoom-out': {
                cursor: 'zoom-out',
                shortcut: 'KeyX',
                description: 'Zoom out',
                action: 'zoomOut'
            },
            center: {
                cursor: 'move',
                shortcut: 'KeyH',
                description: 'Center view',
                action: 'centerView'
            }
        };

        return configs[toolName] || { cursor: 'default', description: toolName };
    },

    /**
     * Handle toolbar actions
     */
    _handleAction(actionName) {
        switch (actionName) {
            case 'new':
                this._newMindMap();
                break;
            case 'open':
                this._openMindMap();
                break;
            case 'save':
                this._saveMindMap();
                break;
            case 'export':
                this._exportMindMap();
                break;
            default:
                console.warn(`Action '${actionName}' not implemented`);
        }
    },

    /**
     * Update cursor based on active tool
     */
    _updateCursor(toolName) {
        const canvas = window.MyMind3.Utils.DOM.find('.mindmap-container');
        if (!canvas) return;

        const toolConfig = this._getToolConfig(toolName);
        canvas.style.cursor = toolConfig.cursor || 'default';
    },

    /**
     * Toggle theme
     */
    _toggleTheme() {
        const currentTheme = window.MyMind3.ThemeStorage.get();
        const newTheme = currentTheme === 'default' ? 'dark' : 'default';

        window.MyMind3.ThemeStorage.set(newTheme);
        document.body.setAttribute('data-theme', newTheme);

        // Update theme toggle icon
        const themeToggle = window.MyMind3.Utils.DOM.find('#theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('svg');
            // You can update the icon based on theme here
        }
    },

    /**
     * Toggle AI panel
     */
    _toggleAI() {
        window.MyMind3.UI.Panels.switchTab('right-panel', 'ai');

        // Toggle AI panel visibility if it's hidden
        const rightPanel = window.MyMind3.UI.Panels.getPanelState('right-panel');
        if (!rightPanel || !rightPanel.visible) {
            window.MyMind3.UI.Panels.setPanelVisibility('right-panel', true);
        }
    },

    /**
     * Show settings
     */
    _showSettings() {
        // This will be implemented when modals are created
        window.MyMind3.Events.emit('action:show-settings');
    },

    /**
     * Create new mind map
     */
    _newMindMap() {
        if (this._hasUnsavedChanges()) {
            // Show confirmation dialog
            if (!confirm('You have unsaved changes. Create new mind map anyway?')) {
                return;
            }
        }

        window.MyMind3.Events.emit('action:new-mindmap');
    },

    /**
     * Open mind map
     */
    _openMindMap() {
        window.MyMind3.Events.emit('action:open-mindmap');
    },

    /**
     * Save mind map
     */
    _saveMindMap() {
        window.MyMind3.Events.emit('action:save-mindmap');
    },

    /**
     * Export mind map
     */
    _exportMindMap() {
        window.MyMind3.Events.emit('action:export-mindmap');
    },

    /**
     * Check if there are unsaved changes
     */
    _hasUnsavedChanges() {
        // This will be implemented when mindmap system is created
        return false;
    },

    /**
     * Load toolbar state from storage
     */
    _loadToolbarState() {
        const workspace = window.MyMind3.WorkspaceStorage.get();
        const savedTool = workspace.selectedTool || 'select';

        if (this._tools.has(savedTool)) {
            this.selectTool(savedTool);
        }
    },

    /**
     * Save toolbar state to storage
     */
    _saveToolbarState() {
        window.MyMind3.WorkspaceStorage.update({
            selectedTool: this._activeTool
        });
    }
};

// Status bar management
window.MyMind3.UI.StatusBar = {
    _elements: {},

    init() {
        this._elements = {
            nodeCount: window.MyMind3.Utils.DOM.find('#node-count'),
            connectionCount: window.MyMind3.Utils.DOM.find('#connection-count'),
            zoomLevel: window.MyMind3.Utils.DOM.find('#zoom-level'),
            statusMessage: window.MyMind3.Utils.DOM.find('#status-message'),
            coordinates: window.MyMind3.Utils.DOM.find('#coordinates'),
            memoryUsage: window.MyMind3.Utils.DOM.find('#memory-usage')
        };

        this._setupEventListeners();
        this._updateMemoryUsage();

        // Update memory usage periodically
        setInterval(() => this._updateMemoryUsage(), 5000);
    },

    _setupEventListeners() {
        // Listen for mindmap changes
        window.MyMind3.Events.on('mindmap:stats-changed', (stats) => {
            this.updateStats(stats);
        });

        // Listen for viewport changes
        window.MyMind3.Events.on('viewport:changed', (viewport) => {
            this.updateViewport(viewport);
        });

        // Listen for status messages
        window.MyMind3.Events.on('status:message', (message) => {
            this.showMessage(message);
        });
    },

    updateStats(stats) {
        if (this._elements.nodeCount) {
            this._elements.nodeCount.textContent = `${stats.nodeCount || 0} nodes`;
        }
        if (this._elements.connectionCount) {
            this._elements.connectionCount.textContent = `${stats.connectionCount || 0} connections`;
        }
    },

    updateViewport(viewport) {
        if (this._elements.zoomLevel) {
            this._elements.zoomLevel.textContent = `${Math.round((viewport.zoom || 1) * 100)}%`;
        }
        if (this._elements.coordinates) {
            const x = Math.round(viewport.x || 0);
            const y = Math.round(viewport.y || 0);
            this._elements.coordinates.textContent = `${x}, ${y}`;
        }
    },

    showMessage(message, type = 'info') {
        if (!this._elements.statusMessage) return;

        this._elements.statusMessage.textContent = message;
        this._elements.statusMessage.className = `status-${type}`;

        // Clear message after 3 seconds
        setTimeout(() => {
            if (this._elements.statusMessage.textContent === message) {
                this._elements.statusMessage.textContent = 'Ready';
                this._elements.statusMessage.className = '';
            }
        }, 3000);
    },

    _updateMemoryUsage() {
        if (!this._elements.memoryUsage || !performance.memory) return;

        const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
        this._elements.memoryUsage.textContent = `${memoryMB} MB`;
    }
};

// Keyboard shortcuts for tools
window.MyMind3.UI.ToolbarShortcuts = {
    init() {
        // Tool selection shortcuts
        window.MyMind3.DOMEvents.registerShortcut('KeyV', () => {
            window.MyMind3.UI.Toolbar.selectTool('select');
        });

        window.MyMind3.DOMEvents.registerShortcut('KeyN', () => {
            window.MyMind3.UI.Toolbar.selectTool('node');
        });

        window.MyMind3.DOMEvents.registerShortcut('KeyC', () => {
            window.MyMind3.UI.Toolbar.selectTool('connect');
        });

        // Action shortcuts
        window.MyMind3.Events.on('shortcut:save', () => {
            window.MyMind3.UI.Toolbar._saveMindMap();
        });

        window.MyMind3.Events.on('shortcut:new-node', () => {
            window.MyMind3.UI.Toolbar.selectTool('node');
        });

        window.MyMind3.Events.on('shortcut:zoom-in', () => {
            window.MyMind3.Events.emit('action:zoom-in');
        });

        window.MyMind3.Events.on('shortcut:zoom-out', () => {
            window.MyMind3.Events.emit('action:zoom-out');
        });

        window.MyMind3.Events.on('shortcut:center', () => {
            window.MyMind3.Events.emit('action:center-view');
        });
    }
};

// Initialize toolbar when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.MyMind3.UI.Toolbar.init();
        window.MyMind3.UI.StatusBar.init();
        window.MyMind3.UI.ToolbarShortcuts.init();
    });
} else {
    window.MyMind3.UI.Toolbar.init();
    window.MyMind3.UI.StatusBar.init();
    window.MyMind3.UI.ToolbarShortcuts.init();
}

// Freeze toolbar objects
Object.freeze(window.MyMind3.UI.Toolbar);
Object.freeze(window.MyMind3.UI.StatusBar);
Object.freeze(window.MyMind3.UI.ToolbarShortcuts);