/**
 * Connector Drawing Module
 * Provides functionality to draw connection lines between mindmap nodes using SVG
 */

window.MyMind3 = window.MyMind3 || {};
window.MyMind3.ConnectorDrawer = {
  /**
   * Initialize function
   */
  initialize: function() {
    console.log('ConnectorDrawer module initialized');
  },

  /**
   * Draw connectors
   * Draws connection lines between all nodes
   */
  drawConnectors: function() {
    try {
      console.log("Starting connector drawing");

      // Get connector container from NodeRenderer or directly from DOM
      let container;
      if (window.MyMind3 && window.MyMind3.NodeRenderer) {
        container = document.getElementById('connectorContainer');
      } else {
        container = document.getElementById('connectorContainer');
      }

      if (!container) {
        console.error("Connector container not found");
        return;
      }

      // Clear existing content completely
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      container.innerHTML = '';

      // Create SVG element
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '8000');  // Wide area for large mindmaps
      svg.setAttribute('height', '5000'); // Sufficient height
      svg.setAttribute('id', 'connection-svg');
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.overflow = 'visible';
      svg.style.zIndex = '0';

      container.appendChild(svg);

      // Check MindMapData module
      if (!window.MyMind3 || !window.MyMind3.MindMapData) {
        console.error('MyMind3.MindMapData module not found');
        return;
      }

      // Count visible nodes
      const visibleNodes = document.querySelectorAll('.mindmap-node:not(.hidden-node):not([style*="display: none"]):not([style*="visibility: hidden"])');
      console.log(`Visible nodes count: ${visibleNodes.length}`);

      // 노드 크기 캐시 (offsetWidth/offsetHeight 강제 리플로우 방지)
      const sizeCache = new Map();
      visibleNodes.forEach(node => {
        const nodeId = node.getAttribute('data-id');
        sizeCache.set(nodeId, {
          width: node.offsetWidth,
          height: node.offsetHeight,
          left: parseInt(node.style.left || 0),
          top: parseInt(node.style.top || 0)
        });
      });
      this._sizeCache = sizeCache;

      // Check mindmap data
      const mindMapData = window.MyMind3.MindMapData.mindMapData;
      if (!mindMapData || !Array.isArray(mindMapData) || mindMapData.length === 0) {
        console.warn("Mindmap data is empty or invalid");
        return;
      }

      // Cache valid parent-child relationships
      const validConnections = new Set();

      // Find and cache valid parent-child relationships
      visibleNodes.forEach(node => {
        const nodeId = parseInt(node.getAttribute('data-id'));
        const parentId = parseInt(node.getAttribute('data-parent-id'));

        if (parentId && !isNaN(parentId)) {
          const parentNode = document.querySelector(`.mindmap-node[data-id="${parentId}"]:not(.hidden-node):not([style*="display: none"]):not([style*="visibility: hidden"])`);
          if (parentNode) {
            validConnections.add(`${parentId}-${nodeId}`);
          }
        }
      });

      console.log(`Valid connections count: ${validConnections.size}`);

      // Draw connectors based on data model
      for (let i = 0; i < mindMapData.length; i++) {
        if (mindMapData[i] && typeof mindMapData[i] === 'object') {
          // Check if root node element exists properly in data model
          const rootNodeElement = document.querySelector(`.mindmap-node[data-id="${mindMapData[i].id}"]:not(.hidden-node):not([style*="display: none"]):not([style*="visibility: hidden"])`);
          if (rootNodeElement) {
            this.drawNodeConnectorsWithValidation(mindMapData[i], svg, validConnections);
          }
        }
      }

      // Emergency recovery if valid relationships exist but no connectors were drawn
      const pathsCount = svg.querySelectorAll('path').length;

      if (pathsCount < validConnections.size) {
        console.warn(`Insufficient connectors. Emergency recovery attempt: expected ${validConnections.size}, actual ${pathsCount}`);

        // Draw lines directly for all valid connections
        validConnections.forEach(connection => {
          const [parentId, childId] = connection.split('-').map(id => parseInt(id));

          // Check if connection already exists
          const existingPath = svg.querySelector(`path[data-parent-id="${parentId}"][data-child-id="${childId}"]`);
          if (!existingPath) {
            const parentNode = document.querySelector(`.mindmap-node[data-id="${parentId}"]`);
            const childNode = document.querySelector(`.mindmap-node[data-id="${childId}"]`);

            if (parentNode && childNode) {
              // 캐시에서 크기 조회 (리플로우 방지)
              const pCache = this._sizeCache?.get(String(parentId));
              const parentLeft = pCache ? pCache.left : parseInt(parentNode.style.left || 0);
              const parentTop = pCache ? pCache.top : parseInt(parentNode.style.top || 0);
              const parentWidth = pCache ? pCache.width : (parentNode.offsetWidth || 200);
              const parentHeight = pCache ? pCache.height : (parentNode.offsetHeight || 40);

              const cCache = this._sizeCache?.get(String(childId));
              const childLeft = cCache ? cCache.left : parseInt(childNode.style.left || 0);
              const childTop = cCache ? cCache.top : parseInt(childNode.style.top || 0);
              const childHeight = cCache ? cCache.height : (childNode.offsetHeight || 40);

              // Calculate connection points
              const parentX = parentLeft + parentWidth;
              const parentY = parentTop + (parentHeight / 2);
              const childX = childLeft;
              const childY = childTop + (childHeight / 2);

              console.log(`Emergency recovery: creating ${parentId} -> ${childId} connector`);

              // Add Bezier curve
              this.createConnectorPath(svg, parentId, childId, parentX, parentY, childX, childY);
            }
          }
        });
      }

      console.log("Connector drawing completed");
    } catch (error) {
      console.error("Error during connector drawing:", error);
    }
  },

  /**
   * Draw node connectors with validation
   * @param {Object} node - Parent node
   * @param {SVGElement} svg - SVG element
   * @param {Set} validConnections - Set of valid connection relationships
   */
  drawNodeConnectorsWithValidation: function(node, svg, validConnections) {
    if (!node || !node.children || node.children.length === 0) {
      return;
    }

    const nodeElement = document.querySelector(`.mindmap-node[data-id="${node.id}"]:not(.hidden-node):not([style*="display: none"]):not([style*="visibility: hidden"])`);
    if (!nodeElement) {
      return;
    }

    // Check if node is in expanded state
    if (node.expanded === false) {
      return;
    }

    // 캐시에서 부모 노드 크기 조회 (리플로우 방지)
    const parentCache = this._sizeCache?.get(String(node.id));
    const parentLeft = parentCache ? parentCache.left : parseInt(nodeElement.style.left || 0);
    const parentTop = parentCache ? parentCache.top : parseInt(nodeElement.style.top || 0);
    const parentWidth = parentCache ? parentCache.width : (nodeElement.offsetWidth || 200);
    const parentHeight = parentCache ? parentCache.height : (nodeElement.offsetHeight || 40);

    // Parent node right center point
    const parentX = parentLeft + parentWidth;
    const parentY = parentTop + (parentHeight / 2);

    // Draw connector for each child node
    for (let i = 0; i < node.children.length; i++) {
      const childNode = node.children[i];
      const connectionKey = `${node.id}-${childNode.id}`;

      // Find child node DOM element
      const childElement = document.querySelector(`.mindmap-node[data-id="${childNode.id}"]:not(.hidden-node):not([style*="display: none"]):not([style*="visibility: hidden"])`);

      // Check if child node is valid and parent-child relationship exists in validConnections
      if (childElement && validConnections.has(connectionKey)) {
        // 캐시에서 자식 노드 크기 조회 (리플로우 방지)
        const childCache = this._sizeCache?.get(String(childNode.id));
        const childLeft = childCache ? childCache.left : parseInt(childElement.style.left || 0);
        const childTop = childCache ? childCache.top : parseInt(childElement.style.top || 0);
        const childHeight = childCache ? childCache.height : (childElement.offsetHeight || 40);

        // Child node left center point
        const childX = childLeft;
        const childY = childTop + (childHeight / 2);

        // Add Bezier curve
        this.createConnectorPath(svg, node.id, childNode.id, parentX, parentY, childX, childY);

        // Recursively process children of child node
        this.drawNodeConnectorsWithValidation(childNode, svg, validConnections);
      }
    }
  },

  /**
   * Create connector path function
   * @param {SVGElement} svg - SVG element
   * @param {number} parentId - Parent node ID
   * @param {number} childId - Child node ID
   * @param {number} parentX - Parent node X coordinate
   * @param {number} parentY - Parent node Y coordinate
   * @param {number} childX - Child node X coordinate
   * @param {number} childY - Child node Y coordinate
   * @returns {SVGPathElement} - Created path element
   */
  createConnectorPath: function(svg, parentId, childId, parentX, parentY, childX, childY) {
    // Calculate vertical gap
    const verticalDiff = Math.abs(childY - parentY);

    // Calculate horizontal gap
    const horizontalDiff = childX - parentX;

    // Apply different curve calculation methods based on node level and relative position
    let controlX1, controlX2, controlY1, controlY2;

    // Optimized curvature based on 300px node width
    // Adjust curvature based on vertical difference
    if (verticalDiff > 80) {
      // For large vertical differences, use more rounded curves
      controlX1 = parentX + (horizontalDiff * 0.35);
      controlX2 = childX - (horizontalDiff * 0.35);
      controlY1 = parentY + (childY - parentY) * 0.18;
      controlY2 = childY - (childY - parentY) * 0.18;
    }
    else if (verticalDiff > 30) {
      // Medium vertical difference
      controlX1 = parentX + (horizontalDiff * 0.3);
      controlX2 = childX - (horizontalDiff * 0.3);
      controlY1 = parentY + (childY - parentY) * 0.15;
      controlY2 = childY - (childY - parentY) * 0.15;
    }
    else {
      // Small vertical difference, almost straight line
      controlX1 = parentX + (horizontalDiff * 0.25);
      controlX2 = childX - (horizontalDiff * 0.25);
      controlY1 = parentY;
      controlY2 = childY;
    }

    // Connection line color
    const connectionColor = '#1976D2';

    // Create path element (smooth curve)
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const d = `M ${parentX} ${parentY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${childX} ${childY}`;

    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', connectionColor);
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('data-parent-id', parentId);
    path.setAttribute('data-child-id', childId);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(path);
    return path;
  },

  /**
   * 필터 적용 시 연결선 그리기
   * 숨겨진 노드를 건너뛰고 보이는 조상과 보이는 자손을 직접 연결
   * @param {Array} activeFilterIds - 활성 필터 ID 배열
   * @param {Map} nodeDataMap - 노드 데이터 맵 (ID문자열 → nodeData)
   * @param {Object} filterManager - NodeFilterManager 인스턴스
   */
  drawFilteredConnectors: function(activeFilterIds, nodeDataMap, filterManager) {
    try {
      const container = document.getElementById('connectorContainer');
      if (!container) {
        console.error('Connector container not found');
        return;
      }

      // SVG 초기화
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      container.innerHTML = '';

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '8000');
      svg.setAttribute('height', '5000');
      svg.setAttribute('id', 'connection-svg');
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.overflow = 'visible';
      svg.style.zIndex = '0';
      container.appendChild(svg);

      const mindMapData = window.MyMind3?.MindMapData?.mindMapData;
      if (!mindMapData || mindMapData.length === 0) return;

      // 노드 크기 캐시 (리플로우 방지)
      const sizeCache = new Map();
      document.querySelectorAll('.mindmap-node').forEach(node => {
        const nodeId = node.getAttribute('data-id');
        sizeCache.set(nodeId, {
          width: node.offsetWidth,
          height: node.offsetHeight,
          left: parseInt(node.style.left || 0),
          top: parseInt(node.style.top || 0)
        });
      });
      this._sizeCache = sizeCache;

      // 각 루트 노드에서 재귀 순회
      for (let i = 0; i < mindMapData.length; i++) {
        const rootNode = mindMapData[i];
        if (!rootNode) continue;

        const rootVisible = filterManager.isNodeVisibleByFilter(rootNode, activeFilterIds);
        if (rootVisible && rootNode.expanded !== false && rootNode.children) {
          rootNode.children.forEach(child => {
            this._drawFilteredRecursive(child, rootNode, svg, activeFilterIds, filterManager);
          });
        }
      }

      console.log('Filtered connector drawing completed');
    } catch (error) {
      console.error('Error during filtered connector drawing:', error);
    }
  },

  /**
   * 필터 적용 재귀 순회
   * @param {Object} node - 현재 노드
   * @param {Object} visibleAncestor - 가장 가까운 보이는 조상 노드
   * @param {SVGElement} svg - SVG 요소
   * @param {Array} activeFilterIds - 활성 필터 ID 배열
   * @param {Object} filterManager - NodeFilterManager 인스턴스
   */
  _drawFilteredRecursive: function(node, visibleAncestor, svg, activeFilterIds, filterManager) {
    if (!node) return;

    const isVisible = filterManager.isNodeVisibleByFilter(node, activeFilterIds);

    if (isVisible) {
      // 보이는 노드 → 보이는 조상과 연결선 생성
      this._drawConnectionBetween(visibleAncestor, node, svg);

      // 자식 순회 시 이 노드가 새 visibleAncestor
      if (node.expanded !== false && node.children) {
        node.children.forEach(child => {
          this._drawFilteredRecursive(child, node, svg, activeFilterIds, filterManager);
        });
      }
    } else {
      // 숨겨진 노드 → 건너뛰고, 자식에게 visibleAncestor 그대로 전달
      if (node.expanded !== false && node.children) {
        node.children.forEach(child => {
          this._drawFilteredRecursive(child, visibleAncestor, svg, activeFilterIds, filterManager);
        });
      }
    }
  },

  /**
   * 두 노드 간 연결선 그리기
   * @param {Object} parentData - 부모 노드 데이터
   * @param {Object} childData - 자식 노드 데이터
   * @param {SVGElement} svg - SVG 요소
   */
  _drawConnectionBetween: function(parentData, childData, svg) {
    const parentEl = document.querySelector(`.mindmap-node[data-id="${parentData.id}"]`);
    const childEl = document.querySelector(`.mindmap-node[data-id="${childData.id}"]`);

    if (!parentEl || !childEl) return;

    // 캐시에서 크기 조회 (리플로우 방지)
    const pCache = this._sizeCache?.get(String(parentData.id));
    const parentLeft = pCache ? pCache.left : parseInt(parentEl.style.left || 0);
    const parentTop = pCache ? pCache.top : parseInt(parentEl.style.top || 0);
    const parentWidth = pCache ? pCache.width : (parentEl.offsetWidth || 200);
    const parentHeight = pCache ? pCache.height : (parentEl.offsetHeight || 40);

    const cCache = this._sizeCache?.get(String(childData.id));
    const childLeft = cCache ? cCache.left : parseInt(childEl.style.left || 0);
    const childTop = cCache ? cCache.top : parseInt(childEl.style.top || 0);
    const childHeight = cCache ? cCache.height : (childEl.offsetHeight || 40);

    const parentX = parentLeft + parentWidth;
    const parentY = parentTop + (parentHeight / 2);
    const childX = childLeft;
    const childY = childTop + (childHeight / 2);

    this.createConnectorPath(svg, parentData.id, childData.id, parentX, parentY, childX, childY);
  }
};

// Make it compatible with existing MyMind3 namespace
window.ConnectorDrawer = window.MyMind3.ConnectorDrawer;

// Module initialization
document.addEventListener('DOMContentLoaded', function() {
  window.MyMind3.ConnectorDrawer.initialize();
});