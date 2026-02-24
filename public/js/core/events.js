// MyMind3 Event System
window.MyMind3 = window.MyMind3 || {};

window.MyMind3.Events = {
    // Event listeners storage
    _listeners: new Map(),

    /**
     * Register event listener
     */
    on(eventName, callback, context = null) {
        if (typeof callback !== 'function') {
            console.warn('Event callback must be a function');
            return () => {};
        }

        if (!this._listeners.has(eventName)) {
            this._listeners.set(eventName, []);
        }

        const listener = {
            callback,
            context,
            id: (window.MyMind3 && window.MyMind3.Utils && window.MyMind3.Utils.String)
                ? window.MyMind3.Utils.String.generateId('listener')
                : 'listener_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        };
        this._listeners.get(eventName).push(listener);

        // Return unsubscribe function
        return () => this.off(eventName, listener.id);
    },

    /**
     * Register one-time event listener
     */
    once(eventName, callback, context = null) {
        const unsubscribe = this.on(eventName, (...args) => {
            unsubscribe();
            callback.apply(context, args);
        }, context);

        return unsubscribe;
    },

    /**
     * Remove event listener
     */
    off(eventName, callbackOrId) {
        if (!this._listeners.has(eventName)) return;

        const listeners = this._listeners.get(eventName);

        if (typeof callbackOrId === 'string') {
            // Remove by ID
            const index = listeners.findIndex(l => l.id === callbackOrId);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        } else if (typeof callbackOrId === 'function') {
            // Remove by callback function
            const index = listeners.findIndex(l => l.callback === callbackOrId);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        } else {
            // Remove all listeners for this event
            this._listeners.set(eventName, []);
        }

        // Clean up empty listener arrays
        if (listeners.length === 0) {
            this._listeners.delete(eventName);
        }
    },

    /**
     * Emit event to all listeners
     */
    emit(eventName, ...args) {
        if (!this._listeners.has(eventName)) return;

        const listeners = [...this._listeners.get(eventName)]; // Copy to prevent modification during iteration

        listeners.forEach(listener => {
            try {
                listener.callback.apply(listener.context, args);
            } catch (error) {
                console.error(`Error in event listener for '${eventName}':`, error);
                window.MyMind3.Utils.Error.log(error, { eventName, listener: listener.id });
            }
        });
    },

    /**
     * Get listener count for event
     */
    listenerCount(eventName) {
        return this._listeners.has(eventName) ? this._listeners.get(eventName).length : 0;
    },

    /**
     * Get all event names with listeners
     */
    eventNames() {
        return Array.from(this._listeners.keys());
    },

    /**
     * Clear all listeners
     */
    removeAllListeners(eventName = null) {
        if (eventName) {
            this._listeners.delete(eventName);
        } else {
            this._listeners.clear();
        }
    }
};

// Create a global event emitter instance
window.MyMind3.EventEmitter = {
    // Node events
    onNodeSelected(callback) {
        return window.MyMind3.Events.on(window.MyMind3.Constants.EVENTS.NODE_SELECTED, callback);
    },

    onNodeDeselected(callback) {
        return window.MyMind3.Events.on(window.MyMind3.Constants.EVENTS.NODE_DESELECTED, callback);
    },

    onNodeCreated(callback) {
        return window.MyMind3.Events.on(window.MyMind3.Constants.EVENTS.NODE_CREATED, callback);
    },

    onNodeUpdated(callback) {
        return window.MyMind3.Events.on(window.MyMind3.Constants.EVENTS.NODE_UPDATED, callback);
    },

    onNodeDeleted(callback) {
        return window.MyMind3.Events.on(window.MyMind3.Constants.EVENTS.NODE_DELETED, callback);
    },

    // Connection events
    onConnectionCreated(callback) {
        return window.MyMind3.Events.on(window.MyMind3.Constants.EVENTS.CONNECTION_CREATED, callback);
    },

    onConnectionDeleted(callback) {
        return window.MyMind3.Events.on(window.MyMind3.Constants.EVENTS.CONNECTION_DELETED, callback);
    },

    // Mind map events
    onMindMapLoaded(callback) {
        return window.MyMind3.Events.on(window.MyMind3.Constants.EVENTS.MINDMAP_LOADED, callback);
    },

    onMindMapSaved(callback) {
        return window.MyMind3.Events.on(window.MyMind3.Constants.EVENTS.MINDMAP_SAVED, callback);
    },

    // Theme events
    onThemeChanged(callback) {
        return window.MyMind3.Events.on(window.MyMind3.Constants.EVENTS.THEME_CHANGED, callback);
    },

    // AI events
    onAiResponse(callback) {
        return window.MyMind3.Events.on(window.MyMind3.Constants.EVENTS.AI_RESPONSE, callback);
    },

    // Error events
    onError(callback) {
        return window.MyMind3.Events.on(window.MyMind3.Constants.EVENTS.ERROR_OCCURRED, callback);
    },

    // Emit events
    emitNodeSelected(node) {
        window.MyMind3.Events.emit(window.MyMind3.Constants.EVENTS.NODE_SELECTED, node);
    },

    emitNodeDeselected(node) {
        window.MyMind3.Events.emit(window.MyMind3.Constants.EVENTS.NODE_DESELECTED, node);
    },

    emitNodeCreated(node) {
        window.MyMind3.Events.emit(window.MyMind3.Constants.EVENTS.NODE_CREATED, node);
    },

    emitNodeUpdated(node, changes) {
        window.MyMind3.Events.emit(window.MyMind3.Constants.EVENTS.NODE_UPDATED, node, changes);
    },

    emitNodeDeleted(node) {
        window.MyMind3.Events.emit(window.MyMind3.Constants.EVENTS.NODE_DELETED, node);
    },

    emitConnectionCreated(connection) {
        window.MyMind3.Events.emit(window.MyMind3.Constants.EVENTS.CONNECTION_CREATED, connection);
    },

    emitConnectionDeleted(connection) {
        window.MyMind3.Events.emit(window.MyMind3.Constants.EVENTS.CONNECTION_DELETED, connection);
    },

    emitMindMapLoaded(mindMap) {
        window.MyMind3.Events.emit(window.MyMind3.Constants.EVENTS.MINDMAP_LOADED, mindMap);
    },

    emitMindMapSaved(mindMap) {
        window.MyMind3.Events.emit(window.MyMind3.Constants.EVENTS.MINDMAP_SAVED, mindMap);
    },

    emitThemeChanged(theme) {
        window.MyMind3.Events.emit(window.MyMind3.Constants.EVENTS.THEME_CHANGED, theme);
    },

    emitAiResponse(response) {
        window.MyMind3.Events.emit(window.MyMind3.Constants.EVENTS.AI_RESPONSE, response);
    },

    emitError(error) {
        window.MyMind3.Events.emit(window.MyMind3.Constants.EVENTS.ERROR_OCCURRED, error);
    }
};

// DOM Event Handlers
window.MyMind3.DOMEvents = {
    // Keyboard event handling
    _keyboardHandlers: new Map(),

    /**
     * Register keyboard shortcut
     */
    registerShortcut(key, callback, options = {}) {
        const {
            ctrlKey = false,
            shiftKey = false,
            altKey = false,
            metaKey = false,
            preventDefault = true
        } = options;

        const handler = (event) => {
            if (event.code === key &&
                event.ctrlKey === ctrlKey &&
                event.shiftKey === shiftKey &&
                event.altKey === altKey &&
                event.metaKey === metaKey) {

                if (preventDefault) {
                    event.preventDefault();
                }

                callback(event);
            }
        };

        const handlerId = window.MyMind3.Utils.String.generateId('shortcut');
        this._keyboardHandlers.set(handlerId, handler);

        document.addEventListener('keydown', handler);

        return () => {
            document.removeEventListener('keydown', handler);
            this._keyboardHandlers.delete(handlerId);
        };
    },

    /**
     * Initialize default keyboard shortcuts
     */
    initShortcuts() {
        const shortcuts = window.MyMind3.Constants.SHORTCUTS;

        // Save shortcut
        this.registerShortcut(shortcuts.SAVE, () => {
            window.MyMind3.Events.emit('shortcut:save');
        }, { ctrlKey: true });

        // New node shortcut
        this.registerShortcut(shortcuts.NEW_NODE, () => {
            window.MyMind3.Events.emit('shortcut:new-node');
        });

        // Delete shortcut
        this.registerShortcut(shortcuts.DELETE, () => {
            window.MyMind3.Events.emit('shortcut:delete');
        });

        // Undo shortcut
        this.registerShortcut(shortcuts.UNDO, () => {
            window.MyMind3.Events.emit('shortcut:undo');
        }, { ctrlKey: true });

        // Redo shortcut
        this.registerShortcut(shortcuts.REDO, () => {
            window.MyMind3.Events.emit('shortcut:redo');
        }, { ctrlKey: true });

        // Copy shortcut
        this.registerShortcut(shortcuts.COPY, () => {
            window.MyMind3.Events.emit('shortcut:copy');
        }, { ctrlKey: true });

        // Paste shortcut
        this.registerShortcut(shortcuts.PASTE, () => {
            window.MyMind3.Events.emit('shortcut:paste');
        }, { ctrlKey: true });

        // Select all shortcut
        this.registerShortcut(shortcuts.SELECT_ALL, () => {
            window.MyMind3.Events.emit('shortcut:select-all');
        }, { ctrlKey: true });

        // Zoom shortcuts
        this.registerShortcut(shortcuts.ZOOM_IN, () => {
            window.MyMind3.Events.emit('shortcut:zoom-in');
        }, { ctrlKey: true });

        this.registerShortcut(shortcuts.ZOOM_OUT, () => {
            window.MyMind3.Events.emit('shortcut:zoom-out');
        }, { ctrlKey: true });

        // Center shortcut
        this.registerShortcut(shortcuts.CENTER, () => {
            window.MyMind3.Events.emit('shortcut:center');
        }, { ctrlKey: true, shiftKey: true });
    },

    /**
     * Clean up all keyboard handlers
     */
    cleanup() {
        this._keyboardHandlers.forEach((handler, id) => {
            document.removeEventListener('keydown', handler);
        });
        this._keyboardHandlers.clear();
    }
};

// Initialize DOM events when DOM is ready
// Note: Initialization is now controlled by main app.js to avoid dependency issues

// Freeze the events objects
Object.freeze(window.MyMind3.Events);
Object.freeze(window.MyMind3.EventEmitter);
Object.freeze(window.MyMind3.DOMEvents);