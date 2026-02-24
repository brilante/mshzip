// MyMind3 Node Management
window.MyMind3 = window.MyMind3 || {};
window.MyMind3.MindMap = window.MyMind3.MindMap || {};

window.MyMind3.MindMap.Nodes = {
    _nodes: new Map(),
    _selectedNodes: new Set(),
    _nodeCounter: 0,

    // Create a new node
    createNode(options = {}) {
        const node = {
            id: options.id || this._generateNodeId(),
            text: options.text || 'New Node',
            x: options.x || 0,
            y: options.y || 0,
            width: options.width || 120,
            height: options.height || 40,
            color: options.color || '#007bff',
            selected: false,
            children: [],
            parent: options.parent || null,
            ...options
        };

        this._nodes.set(node.id, node);
        return node;
    },

    // Add node to canvas
    addNode(node) {
        if (!node) return null;

        const element = window.MyMind3.MindMap.Renderer.renderNode(node);
        if (element) {
            window.MyMind3.EventEmitter.emitNodeCreated(node);
        }
        return element;
    },

    // Delete node
    deleteNode(nodeId) {
        const node = this._nodes.get(nodeId);
        if (!node) return false;

        // Remove from DOM
        const element = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }

        // Remove from nodes map
        this._nodes.delete(nodeId);
        this._selectedNodes.delete(node);

        window.MyMind3.EventEmitter.emitNodeDeleted(node);
        return true;
    },

    // Update node
    updateNode(nodeId, updates) {
        const node = this._nodes.get(nodeId);
        if (!node) return false;

        Object.assign(node, updates);

        // Update DOM element
        const element = document.querySelector(`[data-node-id="${nodeId}"]`);
        if (element) {
            this._updateNodeElement(element, node);
        }

        window.MyMind3.EventEmitter.emitNodeUpdated(node, updates);
        return true;
    },

    _updateNodeElement(element, node) {
        element.setAttribute('transform', `translate(${node.x}, ${node.y})`);

        const rect = element.querySelector('rect');
        const text = element.querySelector('text');

        if (rect) {
            rect.setAttribute('fill', node.color);
            rect.setAttribute('width', node.width);
            rect.setAttribute('height', node.height);
        }

        if (text) {
            text.textContent = node.text;
            text.setAttribute('x', node.width / 2);
            text.setAttribute('y', node.height / 2);
        }
    },

    _generateNodeId() {
        // NodeId 모듈의 생성 함수 사용 (단일 생성 함수 원칙)
        if (window.MyMind3 && window.MyMind3.NodeId && window.MyMind3.NodeId.generate) {
            return window.MyMind3.NodeId.generate();
        }
        // NodeId 모듈 미로드 시 폴백
        const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$-_+=~';
        const arr = new Uint8Array(10);
        crypto.getRandomValues(arr);
        let result = '';
        for (let i = 0; i < 10; i++) {
            result += CHARSET[arr[i] % CHARSET.length];
        }
        return result;
    },

    getNode(id) {
        return this._nodes.get(id);
    },

    getAllNodes() {
        return Array.from(this._nodes.values());
    }
};

Object.freeze(window.MyMind3.MindMap.Nodes);