// MyMind3 Connection Management
window.MyMind3 = window.MyMind3 || {};
window.MyMind3.MindMap = window.MyMind3.MindMap || {};

window.MyMind3.MindMap.Connections = {
    _connections: new Map(),
    _connectionCounter: 0,

    createConnection(sourceId, targetId, options = {}) {
        const connection = {
            id: options.id || this._generateConnectionId(),
            sourceId,
            targetId,
            x1: options.x1 || 0,
            y1: options.y1 || 0,
            x2: options.x2 || 100,
            y2: options.y2 || 100,
            ...options
        };

        this._connections.set(connection.id, connection);
        return connection;
    },

    addConnection(connection) {
        const element = window.MyMind3.MindMap.Renderer.renderConnection(connection);
        if (element) {
            window.MyMind3.EventEmitter.emitConnectionCreated(connection);
        }
        return element;
    },

    _generateConnectionId() {
        return `connection_${++this._connectionCounter}_${Date.now()}`;
    }
};

Object.freeze(window.MyMind3.MindMap.Connections);