/**
 * MyMind3 - Main Application
 * Advanced Mind Mapping Application with AI Integration
 */

window.MyMind3 = (function() {
    'use strict';

    // Application state
    const state = {
        currentMindMap: null,
        selectedNodes: new Set(),
        clipboard: null,
        isDirty: false,
        isAutoSaving: false,
        settings: {
            theme: 'default',
            autoSave: true,
            autoSaveInterval: 60000,
            gridEnabled: false,
            snapToGrid: false
        },
        ui: {
            leftPanelOpen: true,
            rightPanelOpen: true,
            currentTool: 'select',
            activeTab: 'editor',
            zoom: 1.0,
            viewport: { x: 0, y: 0 }
        }
    };

    // DOM elements
    const elements = {
        app: null,
        loadingScreen: null,
        mindmapSvg: null,
        nodesLayer: null,
        connectionsLayer: null,
        projectNameInput: null,
        saveStatus: null,
        leftPanel: null,
        rightPanel: null,
        centerPanel: null
    };

    // Event handlers
    const handlers = {
        keydown: null,
        resize: null,
        beforeunload: null
    };

    /**
     * Initialize the application
     */
    function init() {
        try {
            console.log('Initializing MyMind3...');

            // Cache DOM elements
            cacheDOMElements();

            // Initialize modules
            initializeDOMEvents();
            initializeEventListeners();
            initializeUI();
            initializeMindMap();
            initializeAutoSave();

            // Load settings
            loadSettings();

            // Create new mind map or load from URL
            const urlParams = new URLSearchParams(window.location.search);
            const projectPath = urlParams.get('project');

            if (projectPath) {
                loadProject(projectPath);
            } else {
                createNewMindMap();
            }

            console.log('MyMind3 initialized successfully');
            showStatusMessage('Ready');

        } catch (error) {
            console.error('Failed to initialize MyMind3:', error);
            showStatusMessage('Initialization failed', 'error');
        }
    }

    /**
     * Cache frequently used DOM elements
     */
    function cacheDOMElements() {
        elements.app = document.getElementById('app');
        elements.loadingScreen = document.getElementById('loading-screen');
        elements.mindmapSvg = document.getElementById('mindmap-svg');
        elements.nodesLayer = document.getElementById('nodes-layer');
        elements.connectionsLayer = document.getElementById('connections-layer');
        elements.projectNameInput = document.getElementById('project-name');
        elements.saveStatus = document.getElementById('save-status');
        elements.leftPanel = document.getElementById('left-panel');
        elements.rightPanel = document.getElementById('right-panel');
        elements.centerPanel = document.getElementById('center-panel');

        // Validate essential elements
        const essentialElements = [
            'mindmapSvg', 'nodesLayer', 'connectionsLayer',
            'projectNameInput', 'leftPanel', 'rightPanel', 'centerPanel'
        ];

        for (const key of essentialElements) {
            if (!elements[key]) {
                throw new Error(`Essential element not found: ${key}`);
            }
        }
    }

    /**
     * Initialize DOM events and shortcuts
     */
    function initializeDOMEvents() {
        if (window.MyMind3.DOMEvents && window.MyMind3.DOMEvents.initShortcuts) {
            window.MyMind3.DOMEvents.initShortcuts();
        }
    }

    /**
     * Initialize event listeners
     */
    function initializeEventListeners() {
        // Keyboard shortcuts
        handlers.keydown = handleKeydown;
        document.addEventListener('keydown', handlers.keydown);

        // Window resize
        handlers.resize = debounce(handleResize, 250);
        window.addEventListener('resize', handlers.resize);

        // Before unload (unsaved changes warning)
        handlers.beforeunload = handleBeforeUnload;
        window.addEventListener('beforeunload', handlers.beforeunload);

        // Navigation buttons
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', handleNavAction);
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', handleTabSwitch);
        });

        // Tool selection
        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.addEventListener('click', handleToolSelect);
        });

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }

        // Project name changes
        if (elements.projectNameInput) {
            elements.projectNameInput.addEventListener('input', handleProjectNameChange);
        }

        // Panel resizing
        initializePanelResizing();
    }

    /**
     * Initialize UI components
     */
    function initializeUI() {
        try {
            // Initialize panels
            if (window.MyMind3.UI && window.MyMind3.UI.Panels) {
                window.MyMind3.UI.Panels.init();
            } else {
                console.warn('UI Panels module not available');
            }

            // Initialize toolbar
            if (window.MyMind3.UI && window.MyMind3.UI.Toolbar) {
                window.MyMind3.UI.Toolbar.init();
            } else {
                console.warn('UI Toolbar module not available');
            }

            // Initialize modals
            if (window.MyMind3.UI && window.MyMind3.UI.Modals) {
                window.MyMind3.UI.Modals.init();
            } else {
                console.warn('UI Modals module not available');
            }

            // Initialize editor
            if (window.MyMind3.UI && window.MyMind3.UI.Editor) {
                window.MyMind3.UI.Editor.init();
            } else {
                console.warn('UI Editor module not available');
            }

            // Set initial theme
            applyTheme(state.settings.theme);
        } catch (error) {
            console.error('Error initializing UI components:', error);
        }
    }

    /**
     * Initialize mind map rendering
     */
    function initializeMindMap() {
        try {
            if (window.MyMind3.MindMap && window.MyMind3.MindMap.Renderer) {
                window.MyMind3.MindMap.Renderer.init(elements.mindmapSvg);
            } else {
                console.warn('MindMap Renderer module not available');
            }
        } catch (error) {
            console.error('Error initializing MindMap:', error);
        }
    }

    /**
     * Initialize auto-save functionality
     */
    function initializeAutoSave() {
        if (state.settings.autoSave && window.MyMind3.Features && window.MyMind3.Features.AutoSave) {
            window.MyMind3.Features.AutoSave.start(state.settings.autoSaveInterval);
        }
    }

    /**
     * Create new mind map
     */
    async function createNewMindMap() {
        try {
            showStatusMessage('Creating new mind map...');

            const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch('/api/mindmap/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...csrfHeaders },
                credentials: 'include',
                body: JSON.stringify({
                    name: 'Untitled Mind Map',
                    theme: state.settings.theme
                })
            });

            const result = await response.json();

            if (result.success) {
                state.currentMindMap = result.data;
                state.isDirty = false;
                renderMindMap();
                updateProjectName(result.data.metadata.name);
                showStatusMessage('New mind map created');
            } else {
                throw new Error(result.error?.message || 'Failed to create mind map');
            }

        } catch (error) {
            console.error('Error creating new mind map:', error);
            showStatusMessage('Failed to create new mind map', 'error');
        }
    }

    /**
     * Load project from server
     */
    async function loadProject(projectPath) {
        try {
            showStatusMessage('Loading project...');

            const response = await fetch(`/api/mindmap/load?path=${encodeURIComponent(projectPath)}`);
            const result = await response.json();

            if (result.success) {
                state.currentMindMap = result.data;
                state.isDirty = false;
                renderMindMap();
                updateProjectName(result.data.metadata.name);
                showStatusMessage('Project loaded successfully');
            } else {
                throw new Error(result.error?.message || 'Failed to load project');
            }

        } catch (error) {
            console.error('Error loading project:', error);
            showStatusMessage('Failed to load project', 'error');
            // Fall back to creating new mind map
            createNewMindMap();
        }
    }

    /**
     * Save current mind map
     */
    async function saveProject() {
        if (!state.currentMindMap || state.isAutoSaving) {
            return;
        }

        try {
            state.isAutoSaving = true;
            showSaveStatus('saving');
            showStatusMessage('Saving project...');

            const projectName = elements.projectNameInput.value.trim() || 'Untitled Mind Map';

            const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
const response = await fetch('/api/mindmap/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...csrfHeaders },
                credentials: 'include',
                body: JSON.stringify({
                    mindMapData: state.currentMindMap,
                    projectName: projectName
                })
            });

            const result = await response.json();

            if (result.success) {
                state.isDirty = false;
                showSaveStatus('saved');
                showStatusMessage('Project saved successfully');
            } else {
                throw new Error(result.error?.message || 'Failed to save project');
            }

        } catch (error) {
            console.error('Error saving project:', error);
            showSaveStatus('error');
            showStatusMessage('Failed to save project', 'error');
        } finally {
            state.isAutoSaving = false;
        }
    }

    /**
     * Render mind map
     */
    function renderMindMap() {
        if (!state.currentMindMap || !window.MyMind3.MindMap) {
            return;
        }

        try {
            // Clear existing content
            elements.nodesLayer.innerHTML = '';
            elements.connectionsLayer.innerHTML = '';

            // Render connections
            if (window.MyMind3.MindMap.Connections) {
                window.MyMind3.MindMap.Connections.render(
                    state.currentMindMap.connections,
                    elements.connectionsLayer
                );
            }

            // Render nodes
            if (window.MyMind3.MindMap.Nodes) {
                window.MyMind3.MindMap.Nodes.render(
                    state.currentMindMap.nodes,
                    elements.nodesLayer
                );
            }

            // Update statistics
            updateStatistics();

        } catch (error) {
            console.error('Error rendering mind map:', error);
            showStatusMessage('Failed to render mind map', 'error');
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    function handleKeydown(event) {
        const { ctrlKey, altKey, shiftKey, key } = event;

        // Ignore if typing in input fields
        if (event.target.matches('input, textarea, [contenteditable]')) {
            return;
        }

        try {
            // Ctrl+S: Save
            if (ctrlKey && key === 's') {
                event.preventDefault();
                saveProject();
                return;
            }

            // Ctrl+N: New mind map
            if (ctrlKey && key === 'n') {
                event.preventDefault();
                if (confirmUnsavedChanges()) {
                    createNewMindMap();
                }
                return;
            }

            // Ctrl+Z: Undo
            if (ctrlKey && key === 'z' && !shiftKey) {
                event.preventDefault();
                undo();
                return;
            }

            // Ctrl+Y or Ctrl+Shift+Z: Redo
            if ((ctrlKey && key === 'y') || (ctrlKey && shiftKey && key === 'z')) {
                event.preventDefault();
                redo();
                return;
            }

            // Delete: Delete selected nodes
            if (key === 'Delete' && state.selectedNodes.size > 0) {
                event.preventDefault();
                deleteSelectedNodes();
                return;
            }

            // Escape: Deselect all
            if (key === 'Escape') {
                event.preventDefault();
                deselectAll();
                return;
            }

        } catch (error) {
            console.error('Error handling keyboard shortcut:', error);
        }
    }

    /**
     * Handle window resize
     */
    function handleResize() {
        try {
            // Update viewport dimensions
            if (elements.mindmapSvg) {
                const rect = elements.centerPanel.getBoundingClientRect();
                elements.mindmapSvg.setAttribute('width', rect.width);
                elements.mindmapSvg.setAttribute('height', rect.height);
            }

            // Re-render mind map if needed
            if (window.MyMind3.MindMap && window.MyMind3.MindMap.Layout) {
                window.MyMind3.MindMap.Layout.updateViewport();
            }

        } catch (error) {
            console.error('Error handling resize:', error);
        }
    }

    /**
     * Handle before unload (warn about unsaved changes)
     */
    function handleBeforeUnload(event) {
        if (state.isDirty) {
            event.preventDefault();
            event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return event.returnValue;
        }
    }

    /**
     * Show status message
     */
    function showStatusMessage(message, type = 'info') {
        const statusElement = document.getElementById('status-message');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-message ${type}`;

            // Clear message after 5 seconds
            setTimeout(() => {
                if (statusElement.textContent === message) {
                    statusElement.textContent = 'Ready';
                    statusElement.className = 'status-message';
                }
            }, 5000);
        }

        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    /**
     * Show save status
     */
    function showSaveStatus(status) {
        const indicator = document.querySelector('.status-indicator');
        if (indicator) {
            indicator.className = `status-indicator ${status}`;
        }

        const statusText = document.querySelector('.save-status .status-text');
        if (statusText) {
            const statusMessages = {
                saving: 'Saving...',
                saved: 'Saved',
                error: 'Save failed'
            };
            statusText.textContent = statusMessages[status] || 'Unknown';
        }
    }

    /**
     * Utility function to debounce function calls
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Stub implementations for missing functionality
    function handleNavAction(event) {
        const action = event.currentTarget.dataset.action;
        console.log('Navigation action:', action);
        // TODO: Implement navigation actions
    }

    function handleTabSwitch(event) {
        const tab = event.currentTarget.dataset.tab;
        console.log('Tab switch:', tab);
        // TODO: Implement tab switching
    }

    function handleToolSelect(event) {
        const tool = event.currentTarget.dataset.tool;
        console.log('Tool select:', tool);
        state.ui.currentTool = tool;
        // TODO: Implement tool selection
    }

    function toggleTheme() {
        const newTheme = state.settings.theme === 'default' ? 'dark' : 'default';
        applyTheme(newTheme);
        state.settings.theme = newTheme;
        saveSettings();
    }

    function applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        const themeStylesheet = document.getElementById('theme-stylesheet');
        if (themeStylesheet) {
            themeStylesheet.href = `/css/themes/${theme}.css`;
        }
    }

    function handleProjectNameChange(event) {
        const newName = event.target.value.trim();
        if (state.currentMindMap && state.currentMindMap.metadata) {
            state.currentMindMap.metadata.name = newName;
            state.isDirty = true;
        }
    }

    function updateProjectName(name) {
        if (elements.projectNameInput) {
            elements.projectNameInput.value = name;
        }
    }

    function initializePanelResizing() {
        // TODO: Implement panel resizing functionality
        console.log('Panel resizing initialized');
    }

    function updateStatistics() {
        const nodeCount = state.currentMindMap ? state.currentMindMap.nodes.length : 0;
        const connectionCount = state.currentMindMap ? state.currentMindMap.connections.length : 0;

        const nodeCountEl = document.getElementById('node-count');
        const connectionCountEl = document.getElementById('connection-count');

        if (nodeCountEl) nodeCountEl.textContent = `${nodeCount} nodes`;
        if (connectionCountEl) connectionCountEl.textContent = `${connectionCount} connections`;
    }

    function confirmUnsavedChanges() {
        return !state.isDirty || confirm('You have unsaved changes. Continue anyway?');
    }

    function loadSettings() {
        try {
            const saved = localStorage.getItem('mymind3-settings');
            if (saved) {
                const settings = JSON.parse(saved);
                Object.assign(state.settings, settings);
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem('mymind3-settings', JSON.stringify(state.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    // Stub functions for future implementation
    function undo() { console.log('Undo - not implemented'); }
    function redo() { console.log('Redo - not implemented'); }
    function deleteSelectedNodes() { console.log('Delete nodes - not implemented'); }
    function deselectAll() {
        state.selectedNodes.clear();
        console.log('Deselect all - not implemented');
    }

    // Public API
    return {
        init,
        state,
        elements,
        saveProject,
        createNewMindMap,
        loadProject,
        showStatusMessage,
        showSaveStatus
    };

})();