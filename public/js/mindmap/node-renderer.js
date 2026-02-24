/**
 * MyMind3 - Apple-Inspired Node Renderer
 * Renders mind map nodes with Apple design aesthetics
 */

window.MyMind3 = window.MyMind3 || {};

window.MyMind3.NodeRenderer = {
    // DOM element references
    mindmapContainer: null,
    nodesLayer: null,
    connectionsLayer: null,

    /**
     * Initialize the node renderer
     */
    initialize() {
        this.mindmapContainer = document.querySelector('.mindmap-container');
        this.nodesLayer = document.getElementById('nodes-layer');
        this.connectionsLayer = document.getElementById('connections-layer');

        if (!this.mindmapContainer || !this.nodesLayer) {
            console.error('Required DOM elements not found for NodeRenderer');
            return false;
        }

        console.log('MyMind3.NodeRenderer initialized successfully');
        return true;
    },

    /**
     * Render a single node with Apple styling
     * @param {object} node - Node data to render
     * @returns {SVGElement} - Created node element
     */
    renderNode(node) {
        try {
            // Create node group
            const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            nodeGroup.classList.add('mindmap-node');
            nodeGroup.setAttribute('data-id', node.id);
            nodeGroup.setAttribute('data-level', node.level);
            if (node.parentId) {
                nodeGroup.setAttribute('data-parent-id', node.parentId);
            }
            nodeGroup.setAttribute('transform', `translate(${node.x}, ${node.y})`);

            // Node background with Apple styling
            const nodeBackground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            nodeBackground.classList.add('node-background');
            nodeBackground.setAttribute('width', '300');
            nodeBackground.setAttribute('height', '40');
            nodeBackground.setAttribute('rx', this.getNodeBorderRadius(node.level));

            // Apply level-specific styling
            this.applyNodeLevelStyling(nodeBackground, node.level);

            nodeGroup.appendChild(nodeBackground);

            // Node text
            const nodeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            nodeText.classList.add('node-text');
            nodeText.setAttribute('x', '20');
            nodeText.setAttribute('y', '20');
            nodeText.setAttribute('dominant-baseline', 'middle');
            nodeText.textContent = node.title || node.text || '';

            // Apply text styling based on level
            this.applyTextLevelStyling(nodeText, node.level);

            nodeGroup.appendChild(nodeText);

            // Node controls (buttons)
            this.addNodeControls(nodeGroup, node);

            // Add interaction handlers
            this.addNodeInteractions(nodeGroup, node);

            // Render child nodes if expanded
            if (node.expanded && node.children && node.children.length > 0) {
                node.children.forEach(child => {
                    const childElement = this.renderNode(child);
                    this.nodesLayer.appendChild(childElement);
                });
            }

            return nodeGroup;
        } catch (error) {
            console.error('Error rendering node:', error);
            return null;
        }
    },

    /**
     * Get border radius based on node level (Apple design hierarchy)
     * @param {number} level - Node level
     * @returns {string} - Border radius value
     */
    getNodeBorderRadius(level) {
        switch (level) {
            case 0: return '16'; // Root nodes: Large radius
            case 1: return '12'; // Level 1: Medium radius
            case 2: return '8';  // Level 2: Small radius
            default: return '6'; // Deeper levels: Minimal radius
        }
    },

    /**
     * Apply Apple-style background styling based on node level
     * @param {SVGElement} element - Background element
     * @param {number} level - Node level
     */
    applyNodeLevelStyling(element, level) {
        element.classList.add(`node-level-${level}`);

        switch (level) {
            case 0:
                // Root node: Apple blue gradient
                element.setAttribute('fill', 'url(#gradient-blue-purple)');
                element.setAttribute('stroke', 'none');
                break;
            case 1:
                // Level 1: Green gradient
                element.setAttribute('fill', 'url(#gradient-green-teal)');
                element.setAttribute('stroke', 'none');
                break;
            case 2:
                // Level 2: Orange gradient
                element.setAttribute('fill', 'url(#gradient-orange-pink)');
                element.setAttribute('stroke', 'none');
                break;
            default:
                // Deeper levels: System fill
                element.setAttribute('fill', 'var(--color-fill-secondary)');
                element.setAttribute('stroke', 'var(--color-separator)');
                element.setAttribute('stroke-width', '1');
        }
    },

    /**
     * Apply text styling based on node level
     * @param {SVGElement} element - Text element
     * @param {number} level - Node level
     */
    applyTextLevelStyling(element, level) {
        switch (level) {
            case 0:
                // Root node: Large, bold, white text
                element.setAttribute('font-size', 'var(--font-size-title3)');
                element.setAttribute('font-weight', 'var(--font-weight-semibold)');
                element.setAttribute('fill', 'var(--color-white)');
                break;
            case 1:
                // Level 1: Medium, medium weight, white text
                element.setAttribute('font-size', 'var(--font-size-callout)');
                element.setAttribute('font-weight', 'var(--font-weight-medium)');
                element.setAttribute('fill', 'var(--color-white)');
                break;
            case 2:
                // Level 2: Normal, white text
                element.setAttribute('font-size', 'var(--font-size-body)');
                element.setAttribute('font-weight', 'var(--font-weight-medium)');
                element.setAttribute('fill', 'var(--color-white)');
                break;
            default:
                // Deeper levels: System text color
                element.setAttribute('font-size', 'var(--font-size-body)');
                element.setAttribute('font-weight', 'var(--font-weight-regular)');
                element.setAttribute('fill', 'var(--color-text-primary)');
        }
    },

    /**
     * Add interactive controls to node
     * @param {SVGElement} nodeGroup - Node group element
     * @param {object} node - Node data
     */
    addNodeControls(nodeGroup, node) {
        const controlsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        controlsGroup.classList.add('node-controls');
        controlsGroup.setAttribute('transform', 'translate(260, 10)');

        let buttonX = 0;

        // Expand/Collapse button for nodes with children
        if (node.children && node.children.length > 0) {
            const toggleButton = this.createControlButton(
                buttonX, 0,
                node.expanded ? '−' : '+',
                node.expanded ? 'Collapse' : 'Expand',
                () => this.toggleNodeExpansion(node.id)
            );
            controlsGroup.appendChild(toggleButton);
            buttonX += 30;
        }

        // Add child button
        const addButton = this.createControlButton(
            buttonX, 0, '+', 'Add Child',
            () => this.addChildNode(node.id)
        );
        controlsGroup.appendChild(addButton);
        buttonX += 30;

        // Delete button (not for root nodes or if only one root exists)
        const canDelete = node.level > 0 || window.MyMind3.MindMapData.mindMapData.length > 1;
        if (canDelete) {
            const deleteButton = this.createControlButton(
                buttonX, 0, '×', 'Delete Node',
                () => this.confirmDeleteNode(node.id)
            );
            deleteButton.classList.add('delete-button');
            controlsGroup.appendChild(deleteButton);
        }

        nodeGroup.appendChild(controlsGroup);
    },

    /**
     * Create a control button with Apple styling
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} symbol - Button symbol
     * @param {string} title - Button title
     * @param {function} clickHandler - Click handler function
     * @returns {SVGElement} - Button group element
     */
    createControlButton(x, y, symbol, title, clickHandler) {
        const buttonGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        buttonGroup.classList.add('control-button');
        buttonGroup.setAttribute('transform', `translate(${x}, ${y})`);
        buttonGroup.style.cursor = 'pointer';

        // Button background
        const buttonBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        buttonBg.setAttribute('cx', '12');
        buttonBg.setAttribute('cy', '12');
        buttonBg.setAttribute('r', '10');
        buttonBg.setAttribute('fill', 'var(--color-fill-secondary)');
        buttonBg.setAttribute('stroke', 'var(--color-separator)');
        buttonBg.setAttribute('stroke-width', '1');
        buttonBg.style.backdropFilter = 'var(--backdrop-blur)';

        buttonGroup.appendChild(buttonBg);

        // Button text
        const buttonText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        buttonText.setAttribute('x', '12');
        buttonText.setAttribute('y', '12');
        buttonText.setAttribute('text-anchor', 'middle');
        buttonText.setAttribute('dominant-baseline', 'central');
        buttonText.setAttribute('font-size', '12');
        buttonText.setAttribute('font-weight', 'var(--font-weight-medium)');
        buttonText.setAttribute('fill', 'var(--color-text-primary)');
        buttonText.textContent = symbol;

        buttonGroup.appendChild(buttonText);

        // Add title for accessibility
        const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        titleElement.textContent = title;
        buttonGroup.appendChild(titleElement);

        // Click handler
        buttonGroup.addEventListener('click', (e) => {
            e.stopPropagation();
            clickHandler();
        });

        // Hover effects
        buttonGroup.addEventListener('mouseenter', () => {
            buttonBg.setAttribute('fill', 'var(--color-fill-quaternary)');
            buttonText.setAttribute('fill', 'var(--color-accent-blue)');
        });

        buttonGroup.addEventListener('mouseleave', () => {
            buttonBg.setAttribute('fill', 'var(--color-fill-secondary)');
            buttonText.setAttribute('fill', 'var(--color-text-primary)');
        });

        return buttonGroup;
    },

    /**
     * Add interaction handlers to node
     * @param {SVGElement} nodeGroup - Node group element
     * @param {object} node - Node data
     */
    addNodeInteractions(nodeGroup, node) {
        // Click to select node
        nodeGroup.addEventListener('click', (e) => {
            this.selectNode(node.id);
        });

        // Hover effects
        nodeGroup.addEventListener('mouseenter', () => {
            nodeGroup.classList.add('node-hover');
        });

        nodeGroup.addEventListener('mouseleave', () => {
            nodeGroup.classList.remove('node-hover');
        });

        // Double-click to edit
        nodeGroup.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.editNodeTitle(node.id);
        });
    },

    /**
     * Create SVG gradients for Apple-style styling
     */
    createGradients() {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');

        // Blue to purple gradient (for root nodes)
        const bluePurpleGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        bluePurpleGradient.setAttribute('id', 'gradient-blue-purple');
        bluePurpleGradient.setAttribute('x1', '0%');
        bluePurpleGradient.setAttribute('y1', '0%');
        bluePurpleGradient.setAttribute('x2', '100%');
        bluePurpleGradient.setAttribute('y2', '100%');

        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', 'var(--color-accent-blue)');

        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', 'var(--color-accent-purple)');

        bluePurpleGradient.appendChild(stop1);
        bluePurpleGradient.appendChild(stop2);
        defs.appendChild(bluePurpleGradient);

        // Green to teal gradient (for level 1)
        const greenTealGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        greenTealGradient.setAttribute('id', 'gradient-green-teal');
        greenTealGradient.setAttribute('x1', '0%');
        greenTealGradient.setAttribute('y1', '0%');
        greenTealGradient.setAttribute('x2', '100%');
        greenTealGradient.setAttribute('y2', '100%');

        const stop3 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop3.setAttribute('offset', '0%');
        stop3.setAttribute('stop-color', 'var(--color-accent-green)');

        const stop4 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop4.setAttribute('offset', '100%');
        stop4.setAttribute('stop-color', 'var(--color-accent-teal)');

        greenTealGradient.appendChild(stop3);
        greenTealGradient.appendChild(stop4);
        defs.appendChild(greenTealGradient);

        // Orange to pink gradient (for level 2)
        const orangePinkGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        orangePinkGradient.setAttribute('id', 'gradient-orange-pink');
        orangePinkGradient.setAttribute('x1', '0%');
        orangePinkGradient.setAttribute('y1', '0%');
        orangePinkGradient.setAttribute('x2', '100%');
        orangePinkGradient.setAttribute('y2', '100%');

        const stop5 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop5.setAttribute('offset', '0%');
        stop5.setAttribute('stop-color', 'var(--color-accent-orange)');

        const stop6 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop6.setAttribute('offset', '100%');
        stop6.setAttribute('stop-color', 'var(--color-accent-pink)');

        orangePinkGradient.appendChild(stop5);
        orangePinkGradient.appendChild(stop6);
        defs.appendChild(orangePinkGradient);

        return defs;
    },

    /**
     * Render the complete mind map
     */
    renderMindMap() {
        try {
            console.log('Rendering mind map...');

            if (!this.nodesLayer) {
                console.error('Nodes layer not found');
                return;
            }

            // Clear existing content
            this.nodesLayer.innerHTML = '';
            this.connectionsLayer.innerHTML = '';

            // Add gradients to SVG
            const svgElement = document.getElementById('mindmap-svg');
            if (svgElement) {
                const existingDefs = svgElement.querySelector('defs');
                if (!existingDefs || !existingDefs.querySelector('#gradient-blue-purple')) {
                    const defs = this.createGradients();
                    if (existingDefs) {
                        existingDefs.appendChild(...defs.children);
                    } else {
                        svgElement.insertBefore(defs, svgElement.firstChild);
                    }
                }
            }

            // Get mind map data
            const mindMapData = window.MyMind3.MindMapData.mindMapData;

            if (!mindMapData || mindMapData.length === 0) {
                console.log('No mind map data to render');
                this.showEmptyState();
                return;
            }

            // Recalculate node positions
            window.MyMind3.MindMapData.recalculateAllNodePositions();

            // Render all root nodes and their children
            mindMapData.forEach(rootNode => {
                const nodeElement = this.renderNode(rootNode);
                if (nodeElement) {
                    this.nodesLayer.appendChild(nodeElement);
                }
            });

            // Draw connections after nodes are rendered
            setTimeout(() => {
                this.drawConnections();
            }, 50);

            console.log('Mind map rendered successfully');
        } catch (error) {
            console.error('Error rendering mind map:', error);
        }
    },

    /**
     * Show empty state when no data exists
     */
    showEmptyState() {
        const emptyGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        emptyGroup.classList.add('empty-state');
        emptyGroup.setAttribute('transform', 'translate(200, 200)');

        const emptyText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        emptyText.setAttribute('x', '0');
        emptyText.setAttribute('y', '0');
        emptyText.setAttribute('text-anchor', 'middle');
        emptyText.setAttribute('font-size', 'var(--font-size-title2)');
        emptyText.setAttribute('font-weight', 'var(--font-weight-medium)');
        emptyText.setAttribute('fill', 'var(--color-text-tertiary)');
        emptyText.textContent = 'Click "New Mind Map" to get started';

        emptyGroup.appendChild(emptyText);
        this.nodesLayer.appendChild(emptyGroup);
    },

    /**
     * Draw connections between nodes
     */
    drawConnections() {
        if (!this.connectionsLayer) return;

        this.connectionsLayer.innerHTML = '';

        const drawNodeConnections = (node) => {
            if (!node.expanded || !node.children || node.children.length === 0) {
                return;
            }

            node.children.forEach(child => {
                this.drawConnection(node, child);
                drawNodeConnections(child);
            });
        };

        window.MyMind3.MindMapData.mindMapData.forEach(rootNode => {
            drawNodeConnections(rootNode);
        });
    },

    /**
     * Draw a connection between two nodes
     * @param {object} parentNode - Parent node
     * @param {object} childNode - Child node
     */
    drawConnection(parentNode, childNode) {
        const startX = parentNode.x + 300; // Right edge of parent
        const startY = parentNode.y + 20;  // Middle of parent
        const endX = childNode.x;          // Left edge of child
        const endY = childNode.y + 20;     // Middle of child

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.classList.add('mindmap-connection');

        // Create a smooth curved connection
        const midX = startX + (endX - startX) / 2;
        const pathData = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

        path.setAttribute('d', pathData);
        path.setAttribute('stroke', 'var(--color-separator)');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('opacity', '0.8');

        this.connectionsLayer.appendChild(path);
    },

    // Action methods (to be connected with UI)
    toggleNodeExpansion(nodeId) {
        if (window.MyMind3.MindMapData.toggleNodeExpansion(nodeId)) {
            this.renderMindMap();
        }
    },

    selectNode(nodeId) {
        // Remove previous selection
        document.querySelectorAll('.mindmap-node.selected').forEach(node => {
            node.classList.remove('selected');
        });

        // Add selection to current node
        const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
        if (nodeElement) {
            nodeElement.classList.add('selected');

            // Update editing state
            window.MyMind3.MindMapData.currentEditingNodeId = nodeId;
            window.selectedNodeId = nodeId;

            // Show node content in editor
            this.showNodeInEditor(nodeId);

            // nodeSelected 이벤트 발생 - 첨부파일 등 관련 기능에서 사용
            document.dispatchEvent(new CustomEvent('nodeSelected', {
                detail: { nodeId: nodeId }
            }));
        }
    },

    addChildNode(parentId) {
        const title = prompt('Enter new node title:');
        if (title && title.trim()) {
            const newNode = window.MyMind3.MindMapData.createChildNode(parentId, title.trim());
            if (newNode) {
                this.renderMindMap();
            }
        }
    },

    confirmDeleteNode(nodeId) {
        const node = window.MyMind3.MindMapData.findNodeById(nodeId);
        if (node && confirm(`Delete node "${node.title || node.text || ''}"?`)) {
            if (window.MyMind3.MindMapData.deleteNode(nodeId)) {
                this.renderMindMap();
            }
        }
    },

    editNodeTitle(nodeId) {
        const node = window.MyMind3.MindMapData.findNodeById(nodeId);
        if (node) {
            const currentTitle = node.title || node.text || '';
            const newTitle = prompt('Edit node title:', currentTitle);
            if (newTitle && newTitle.trim() && newTitle.trim() !== currentTitle) {
                node.title = newTitle.trim();
                this.renderMindMap();
            }
        }
    },

    showNodeInEditor(nodeId) {
        const node = window.MyMind3.MindMapData.findNodeById(nodeId);
        if (node && window.MyMind3.Editor) {
            window.MyMind3.Editor.showNodeContent(node);
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.MyMind3.NodeRenderer.initialize();
});