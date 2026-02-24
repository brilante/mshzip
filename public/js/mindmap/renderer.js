// MyMind3 MindMap Renderer
window.MyMind3 = window.MyMind3 || {};
window.MyMind3.MindMap = window.MyMind3.MindMap || {};

window.MyMind3.MindMap.Renderer = {
    _svg: null,
    _nodesLayer: null,
    _connectionsLayer: null,
    _viewport: { x: 0, y: 0, zoom: 1.0 },
    _initialized: false,

    init() {
        if (this._initialized) return;

        this._setupSVG();
        this._setupViewport();
        this._setupEventListeners();

        this._initialized = true;
        console.log('MindMap Renderer initialized');
    },

    _setupSVG() {
        this._svg = window.MyMind3.Utils.DOM.find('#mindmap-svg');
        if (!this._svg) {
            console.error('SVG element not found');
            return;
        }

        this._nodesLayer = window.MyMind3.Utils.DOM.find('#nodes-layer', this._svg);
        this._connectionsLayer = window.MyMind3.Utils.DOM.find('#connections-layer', this._svg);

        if (!this._nodesLayer || !this._connectionsLayer) {
            console.error('SVG layers not found');
            return;
        }

        // Set initial viewBox
        this._updateViewBox();
    },

    _setupViewport() {
        const container = this._svg?.parentElement;
        if (!container) return;

        // Mouse wheel zoom
        container.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            this.zoom(this._viewport.zoom + delta, e.clientX, e.clientY);
        });

        // Pan with middle mouse button
        let isPanning = false;
        let lastPanX = 0;
        let lastPanY = 0;

        container.addEventListener('mousedown', (e) => {
            if (e.button === 1) { // Middle button
                isPanning = true;
                lastPanX = e.clientX;
                lastPanY = e.clientY;
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (isPanning) {
                const deltaX = e.clientX - lastPanX;
                const deltaY = e.clientY - lastPanY;
                this.pan(deltaX, deltaY);
                lastPanX = e.clientX;
                lastPanY = e.clientY;
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 1) {
                isPanning = false;
            }
        });
    },

    _setupEventListeners() {
        // Listen for zoom/pan actions
        window.MyMind3.Events.on('action:zoom-in', () => {
            this.zoom(this._viewport.zoom + 0.2);
        });

        window.MyMind3.Events.on('action:zoom-out', () => {
            this.zoom(this._viewport.zoom - 0.2);
        });

        window.MyMind3.Events.on('action:center-view', () => {
            this.centerView();
        });
    },

    // Node rendering
    renderNode(node) {
        if (!this._nodesLayer || !node) return null;

        const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        nodeGroup.setAttribute('class', 'mindmap-node');
        nodeGroup.setAttribute('data-node-id', node.id);
        nodeGroup.setAttribute('transform', `translate(${node.x || 0}, ${node.y || 0})`);

        // Node background
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', node.width || 120);
        rect.setAttribute('height', node.height || 40);
        rect.setAttribute('rx', '8');
        rect.setAttribute('fill', node.color || '#007bff');
        rect.setAttribute('stroke', node.selected ? '#000' : 'none');
        rect.setAttribute('stroke-width', '2');

        // Node text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', (node.width || 120) / 2);
        text.setAttribute('y', (node.height || 40) / 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', 'white');
        text.textContent = node.text || 'Node';

        nodeGroup.appendChild(rect);
        nodeGroup.appendChild(text);

        // Add click handler
        nodeGroup.addEventListener('click', (e) => {
            e.stopPropagation();
            this.selectNode(node);
        });

        this._nodesLayer.appendChild(nodeGroup);
        return nodeGroup;
    },

    // Connection rendering
    renderConnection(connection) {
        if (!this._connectionsLayer || !connection) return null;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('class', 'mindmap-connection');
        line.setAttribute('data-connection-id', connection.id);
        line.setAttribute('x1', connection.x1 || 0);
        line.setAttribute('y1', connection.y1 || 0);
        line.setAttribute('x2', connection.x2 || 100);
        line.setAttribute('y2', connection.y2 || 100);
        line.setAttribute('stroke', '#666');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', 'url(#arrowhead)');

        this._connectionsLayer.appendChild(line);
        return line;
    },

    // Viewport controls
    zoom(newZoom, centerX = null, centerY = null) {
        const minZoom = window.MyMind3.Constants.MINDMAP.CANVAS.MIN_ZOOM;
        const maxZoom = window.MyMind3.Constants.MINDMAP.CANVAS.MAX_ZOOM;

        newZoom = window.MyMind3.Utils.Number.clamp(newZoom, minZoom, maxZoom);

        if (centerX && centerY && this._svg) {
            const rect = this._svg.getBoundingClientRect();
            const svgX = centerX - rect.left;
            const svgY = centerY - rect.top;

            // Calculate zoom center offset
            const zoomRatio = newZoom / this._viewport.zoom;
            this._viewport.x = svgX - (svgX - this._viewport.x) * zoomRatio;
            this._viewport.y = svgY - (svgY - this._viewport.y) * zoomRatio;
        }

        this._viewport.zoom = newZoom;
        this._updateViewBox();
        this._emitViewportChange();
    },

    pan(deltaX, deltaY) {
        this._viewport.x += deltaX;
        this._viewport.y += deltaY;
        this._updateViewBox();
        this._emitViewportChange();
    },

    centerView() {
        // Center on all nodes (this is a simplified version)
        this._viewport.x = 0;
        this._viewport.y = 0;
        this._viewport.zoom = 1.0;
        this._updateViewBox();
        this._emitViewportChange();
    },

    _updateViewBox() {
        if (!this._svg) return;

        const rect = this._svg.getBoundingClientRect();
        const width = rect.width / this._viewport.zoom;
        const height = rect.height / this._viewport.zoom;

        this._svg.setAttribute('viewBox',
            `${-this._viewport.x / this._viewport.zoom} ${-this._viewport.y / this._viewport.zoom} ${width} ${height}`
        );
    },

    _emitViewportChange() {
        window.MyMind3.Events.emit('viewport:changed', {
            x: this._viewport.x,
            y: this._viewport.y,
            zoom: this._viewport.zoom
        });
    },

    // Node selection
    selectNode(node) {
        // Deselect all nodes first
        const allNodes = this._nodesLayer?.querySelectorAll('.mindmap-node');
        allNodes?.forEach(nodeEl => {
            const rect = nodeEl.querySelector('rect');
            if (rect) {
                rect.setAttribute('stroke', 'none');
            }
        });

        // Select the clicked node
        const nodeElement = this._nodesLayer?.querySelector(`[data-node-id="${node.id}"]`);
        if (nodeElement) {
            const rect = nodeElement.querySelector('rect');
            if (rect) {
                rect.setAttribute('stroke', '#000');
                rect.setAttribute('stroke-width', '3');
            }
        }

        node.selected = true;
        window.MyMind3.EventEmitter.emitNodeSelected(node);
    },

    // Clear the canvas
    clear() {
        if (this._nodesLayer) {
            this._nodesLayer.innerHTML = '';
        }
        if (this._connectionsLayer) {
            this._connectionsLayer.innerHTML = '';
        }
    },

    // Get viewport info
    getViewport() {
        return { ...this._viewport };
    }
};

// Initialize renderer when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.MyMind3.MindMap.Renderer.init();
    });
} else {
    window.MyMind3.MindMap.Renderer.init();
}

Object.freeze(window.MyMind3.MindMap.Renderer);