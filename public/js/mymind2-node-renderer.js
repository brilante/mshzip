/**
 * MyMind2 Style Node Renderer
 * Exactly matching MyMind2's HTML-based node rendering
 */

window.MyMind2NodeRenderer = {
    mindmapContainer: null,
    mindmapLayout: null,

    // Drag state variables
    isDraggingNode: false,
    dragNode: null,
    dragStartX: 0,
    dragStartY: 0,
    positionIndicator: null,
    _rafPending: false, // RAF 쓰로틀링 플래그

    /**
     * 필터 상태를 고려한 커넥터 재그리기
     * 필터 활성 시 필터된 커넥터, 아니면 기본 커넥터 사용
     */
    _redrawConnectorsSmart() {
        // NodeFilterManager는 window.NodeFilterManager에 위치 (window.MyMind3 아님)
        const filterManager = window.NodeFilterManager || window.MyMind3?.NodeFilterManager;
        const activeFilterIds = filterManager?._getActiveFilterIds?.() || [];
        if (activeFilterIds.length > 0 && window.MyMind3?.ConnectorDrawer?.drawFilteredConnectors) {
            const mindMapData = window.MyMind3?.MindMapData?.mindMapData;
            if (mindMapData) {
                const nodeDataMap = new Map();
                const buildMap = (nodes) => {
                    nodes.forEach(n => {
                        nodeDataMap.set(String(n.id), n);
                        if (n.children) buildMap(n.children);
                    });
                };
                buildMap(mindMapData);
                window.MyMind3.ConnectorDrawer.drawFilteredConnectors(activeFilterIds, nodeDataMap, filterManager);
            }
        } else if (window.MyMind3?.ConnectorDrawer) {
            window.MyMind3.ConnectorDrawer.drawConnectors();
        } else if (window.ConnectorDrawer) {
            window.ConnectorDrawer.drawConnectors();
        }
    },

    // Pan state variables
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    panScrollLeft: 0,
    panScrollTop: 0,

    initialize() {
        this.mindmapContainer = document.querySelector('.mindmap-container');
        this.mindmapLayout = document.getElementById('mindmapLayout');

        if (!this.mindmapContainer || !this.mindmapLayout) {
            console.error('Required DOM elements not found for MyMind2NodeRenderer');
            return false;
        }

        // Setup drag and drop and pan event listeners
        this.setupInteractions();

        console.log('MyMind2NodeRenderer initialized successfully');
        return true;
    },

    /**
     * 마인드맵 렌더링
     * @param {object} options - 렌더링 옵션
     * @param {boolean} options.skipPositionRecalc - true면 좌표 재계산 건너뛰기 (노드 추가 시 사용)
     */
    renderMindMap(options = {}) {
        if (!window.MyMind3 || !window.MyMind3.MindMapData) {
            console.error('MyMind3.MindMapData not available');
            return;
        }

        // Clear existing nodes
        this.clearNodes();

        // Get mind map data
        const mindMapData = window.MyMind3.MindMapData.mindMapData;

        if (!mindMapData || mindMapData.length === 0) {
            console.log('No mind map data to render');
            return;
        }

        // 좌표 재계산 (skipPositionRecalc 옵션이 없을 때만)
        if (!options.skipPositionRecalc) {
            window.MyMind3.MindMapData.recalculateAllNodePositions();
        }

        // Render all root nodes and their children
        mindMapData.forEach(rootNode => {
            this.renderNodeRecursive(rootNode);
        });

        // 필터 오프셋을 즉시 동기적으로 적용 (접기/펼치기 시 노드 점프 방지)
        // MindMapData.filters를 최우선으로 확인 (loadFromJson에서 서버 데이터로 설정됨)
        let filters = window.MyMind3?.MindMapData?.filters || [];
        if (filters.length === 0) {
            filters = window.NodeFilterManager?.getFilters?.() || [];
        }
        if (filters.length > 0 && window.NodeFilterManager) {
            // NodeFilterManager에도 동기화 (stale 데이터 방지)
            window.NodeFilterManager.filters = filters;
            // 동기적으로 필터 리스트 렌더링 + 노드 오프셋 적용
            // (내부에서 moveNodesDown() 즉시 실행 → 점프 방지)
            window.NodeFilterManager.renderNodeFilterList(filters);
        } else {
            // 필터 없을 때 연결선 그리기 (다음 프레임에서 DOM 크기 확정 후 실행)
            requestAnimationFrame(() => {
                this._redrawConnectorsSmart();
            });
        }

        console.log('Mind map rendered successfully');
    },

    renderNodeRecursive(node) {
        // Create the node element
        const nodeElement = this.createNodeElement(node);
        this.mindmapLayout.appendChild(nodeElement);

        // Render children if expanded
        if (node.expanded && node.children && node.children.length > 0) {
            node.children.forEach(child => {
                this.renderNodeRecursive(child);
            });
        }
    },

    /**
     * 새 노드만 DOM에 추가 (기존 노드 위치 유지)
     * @param {object} node - 추가할 노드
     */
    appendSingleNode(node) {
        if (!this.mindmapLayout) return;

        // 이미 존재하는 노드인지 확인
        const existingNode = this.mindmapLayout.querySelector(`.mindmap-node[data-id="${node.id}"]`);
        if (existingNode) {
            console.log(`Node ${node.id} already exists, skipping`);
            return;
        }

        // 새 노드 엘리먼트 생성 및 추가
        const nodeElement = this.createNodeElement(node);
        this.mindmapLayout.appendChild(nodeElement);

        // 필터가 활성화되어 있으면 새 노드에도 오프셋 적용
        if (this.mindmapLayout.classList.contains('has-filters')) {
            const filters = window.MyMind3?.MindMapData?.filters || window.NodeFilterManager?.getFilters() || [];
            if (filters.length > 0) {
                // 필터 오프셋 계산 (37px = 35px 필터높이 + 2px 간격)
                const offset = 37;
                // 원래 좌표 저장
                nodeElement.dataset.originalTop = node.y;
                // 오프셋 적용
                nodeElement.style.top = (node.y + offset) + 'px';
                console.log(`Appended single node: ${node.id} at x=${node.x}, y=${node.y} (with filter offset: ${node.y + offset})`);
            } else {
                console.log(`Appended single node: ${node.id} at x=${node.x}, y=${node.y}`);
            }
        } else {
            console.log(`Appended single node: ${node.id} at x=${node.x}, y=${node.y}`);
        }

        // 연결선 다시 그리기 (다음 프레임에서 DOM 확정 후 실행)
        requestAnimationFrame(() => {
            this._redrawConnectorsSmart();
        });
    },

    /**
     * 드래그 시작 전 모든 노드의 DOM 좌표를 데이터에 동기화
     * 이렇게 하면 recalculateAllNodePositions() 호출 후에도 화면 좌표 유지
     */
    syncDOMPositionsToData() {
        if (!this.mindmapLayout || !window.MyMind3 || !window.MyMind3.MindMapData) return;

        const allNodeElements = this.mindmapLayout.querySelectorAll('.mindmap-node');
        const savedPositions = {};

        allNodeElements.forEach(nodeElement => {
            const nodeId = parseInt(nodeElement.getAttribute('data-id'));
            const left = parseFloat(nodeElement.style.left) || 0;
            const top = parseFloat(nodeElement.style.top) || 0;
            savedPositions[nodeId] = { x: left, y: top };
        });

        // 저장된 좌표를 반환 (나중에 복원용)
        this.savedPositionsBeforeDrag = savedPositions;
        console.log(`Synced ${Object.keys(savedPositions).length} node positions before drag`);
        return savedPositions;
    },

    /**
     * 드래그 후 이동하지 않은 노드들의 위치 복원
     * @param {number} movedNodeId - 이동한 노드 ID (이 노드는 복원하지 않음)
     */
    restoreNonMovedNodePositions(movedNodeId) {
        if (!this.savedPositionsBeforeDrag || !window.MyMind3 || !window.MyMind3.MindMapData) return;

        // 이동한 노드를 제외한 모든 노드의 데이터 좌표를 복원
        const updateNodePosition = (node) => {
            if (node.id !== movedNodeId && this.savedPositionsBeforeDrag[node.id]) {
                node.x = this.savedPositionsBeforeDrag[node.id].x;
                node.y = this.savedPositionsBeforeDrag[node.id].y;
            }
            if (node.children) {
                node.children.forEach(child => updateNodePosition(child));
            }
        };

        window.MyMind3.MindMapData.mindMapData.forEach(rootNode => {
            updateNodePosition(rootNode);
        });

        console.log(`Restored positions for non-moved nodes (moved: ${movedNodeId})`);
    },

    /**
     * 드래그 앤 드롭 후 이동한 노드만 업데이트 (기존 노드 위치 유지)
     * @param {number} movedNodeId - 이동한 노드 ID
     */
    updateNodeAfterDrag(movedNodeId) {
        if (!this.mindmapLayout) return;

        // 이동한 노드의 새 데이터 가져오기
        const movedNodeData = window.MyMind3.MindMapData.findNodeById(movedNodeId);
        if (!movedNodeData) {
            console.error(`Node ${movedNodeId} not found in data`);
            return;
        }

        // DOM에서 이동한 노드 찾기
        const movedNodeElement = this.mindmapLayout.querySelector(`.mindmap-node[data-id="${movedNodeId}"]`);
        if (movedNodeElement) {
            // 노드 위치 업데이트
            movedNodeElement.style.left = `${movedNodeData.x}px`;
            movedNodeElement.style.top = `${movedNodeData.y}px`;
            // 부모 ID 업데이트
            if (movedNodeData.parentId) {
                movedNodeElement.setAttribute('data-parent-id', movedNodeData.parentId);
            } else {
                movedNodeElement.removeAttribute('data-parent-id');
            }
            // 레벨 업데이트
            movedNodeElement.setAttribute('data-level', movedNodeData.level);
            movedNodeElement.className = `mindmap-node node-level-${movedNodeData.level}`;
        }

        console.log(`Updated moved node: ${movedNodeId} at x=${movedNodeData.x}, y=${movedNodeData.y}`);

        // 연결선 다시 그리기 (다음 프레임에서 DOM 확정 후 실행)
        requestAnimationFrame(() => {
            this._redrawConnectorsSmart();
        });
    },

    /**
     * 드래그 앤 드롭 후 모든 노드의 DOM 위치를 데이터 좌표로 동기화
     * recalculateAllNodePositions()가 계산한 좌표를 DOM에 반영하여
     * 형제 노드 사이 삽입 시 간격이 올바르게 벌어지도록 한다.
     */
    updateAllNodesDOM() {
        if (!this.mindmapLayout) return;

        const allNodeElements = this.mindmapLayout.querySelectorAll('.mindmap-node');
        let updated = 0;

        allNodeElements.forEach(nodeEl => {
            const nodeId = parseInt(nodeEl.getAttribute('data-id'));
            const nodeData = window.MyMind3.MindMapData.findNodeById(nodeId);
            if (!nodeData) return;

            // 좌표 업데이트
            nodeEl.style.left = `${nodeData.x}px`;
            nodeEl.style.top = `${nodeData.y}px`;

            // parentId 업데이트
            if (nodeData.parentId) {
                nodeEl.setAttribute('data-parent-id', nodeData.parentId);
            } else {
                nodeEl.removeAttribute('data-parent-id');
            }

            // level 업데이트
            nodeEl.setAttribute('data-level', nodeData.level);
            const baseClasses = Array.from(nodeEl.classList).filter(c => !c.startsWith('node-level-'));
            baseClasses.push(`node-level-${nodeData.level}`);
            nodeEl.className = baseClasses.join(' ');
            updated++;
        });

        // 필터 활성 시 오프셋 재적용 (필터바와 노드 겹침 방지)
        if (this.mindmapLayout.classList.contains('has-filters')) {
            const filterManager = window.NodeFilterManager;
            const filters = window.MyMind3?.MindMapData?.filters;
            if (filterManager && filters && filters.length > 0) {
                // data-original-top을 새 데이터 좌표로 갱신
                allNodeElements.forEach(nodeEl => {
                    nodeEl.dataset.originalTop = parseInt(nodeEl.style.top) || 0;
                });
                // 필터 오프셋 재적용
                filterManager.moveNodesDown(filters);
            }
        }

        console.log(`[DragDrop] 전체 노드 DOM 동기화: ${updated}개`);

        // 연결선 다시 그리기 (다음 프레임에서 DOM 확정 후 실행)
        requestAnimationFrame(() => {
            this._redrawConnectorsSmart();
        });
    },

    createNodeElement(node) {
        // Create main node container
        const nodeDiv = document.createElement('div');
        nodeDiv.classList.add('mindmap-node');
        nodeDiv.classList.add(`node-level-${node.level}`);
        // 현재 선택된 노드면 selected 클래스 유지 (renderMindMap 후에도 선택 상태 보존)
        if (window.selectedNodeId === node.id) {
            nodeDiv.classList.add('selected');
        }
        nodeDiv.setAttribute('data-id', node.id);
        nodeDiv.setAttribute('data-level', node.level);
        if (node.nodeId) {
            nodeDiv.setAttribute('data-node-id', node.nodeId);
        }
        if (node.parentId) {
            nodeDiv.setAttribute('data-parent-id', node.parentId);
        }

        // Position the node - 2025-12-18: 15% 축소 적용 후 20% 가로 확장
        nodeDiv.style.position = 'absolute';
        nodeDiv.style.left = `${node.x}px`;
        nodeDiv.style.top = `${node.y}px`;
        nodeDiv.style.width = `${window.MyMind3.MindMapData.getNodeWidth(node)}px`;

        // Debug log for positioning
        if (node.level === 0) {
            console.log(`Rendering root node "${node.title}" at x=${node.x}, y=${node.y}`);
        }

        // Node content container - 2025-12-18: 15% 축소 적용
        const nodeContentContainer = document.createElement('div');
        nodeContentContainer.classList.add('node-content-container');
        const hasChildren = node.children && node.children.length > 0;
        const paddingRight = hasChildren ? '10px' : '4px';  // 리프 노드: 토글 버튼 없으므로 패딩 최소화
        nodeContentContainer.style.cssText = `display: flex; align-items: center; justify-content: flex-start; gap: 0; padding: 7px ${paddingRight} 7px 8px; width: 100%; box-sizing: border-box;`;
        // 리프 노드: 노드 자체 padding-right도 최소화 (토글 버튼 영역 불필요)
        if (!hasChildren) {
            nodeDiv.style.paddingRight = '2px';
        }

        // Checkbox - 15% 축소
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = node.checked || false;
        checkbox.classList.add('node-checkbox');
        checkbox.style.cssText = 'width: 14px; height: 14px; cursor: pointer; flex-shrink: 0;';
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleNodeCheck(node.id);
        });

        // Node content
        const nodeContent = document.createElement('div');
        nodeContent.classList.add('node-content');

        // Add level-based class for CSS styling
        if (node.level === 0) {
            nodeContent.classList.add('root');
        } else {
            nodeContent.classList.add(`level-${node.level}`);
        }

        // Use config for text display limit based on node depth
        const config = window.MindmapConfig || {
            text: {
                maxDisplayLength: { root: 30, level1: 24, level2: 20, deepLevel: 16 },
                defaultMaxLength: 16,
                ellipsis: '...'
            }
        };

        // Get max length based on node level/depth
        let maxLength;
        if (node.level === 0) {
            maxLength = config.text.maxDisplayLength.root || 30;
        } else if (node.level === 1) {
            maxLength = config.text.maxDisplayLength.level1 || 24;
        } else if (node.level === 2) {
            maxLength = config.text.maxDisplayLength.level2 || 20;
        } else {
            maxLength = config.text.maxDisplayLength.deepLevel || 16;
        }

        const ellipsis = config.text.ellipsis;
        const displayTitle = node.title.length > maxLength ? node.title.substring(0, maxLength) + ellipsis : node.title;
        nodeContent.textContent = displayTitle;
        nodeContent.title = node.nodeId ? `${node.title}[${node.nodeId}]` : node.title; // 제목[노드ID] 형식
        nodeContent.style.cssText = 'flex: 1; width: 0; text-align: left !important; margin: 0; min-width: 0; word-wrap: break-word; justify-self: flex-start;';

        nodeContentContainer.appendChild(checkbox);
        nodeContentContainer.appendChild(nodeContent);

        // 필터 태그 추가 (노드에 filters가 있으면)
        if (node.filters && node.filters.length > 0) {
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'node-filter-tags';

            const allFilters = window.NodeFilterManager?.getFilters() || [];
            node.filters.forEach(filterId => {
                const filter = allFilters.find(f => f.id === filterId);
                if (filter) {
                    const tag = document.createElement('span');
                    tag.className = 'node-filter-tag';
                    tag.style.backgroundColor = filter.color;
                    tag.title = filter.name;
                    tagsContainer.appendChild(tag);
                }
            });

            // 리프 노드: 토글 버튼 없으므로 필터 태그의 margin-right 제거 (CSS 기본값 15px은 토글 버튼 간격용)
            if (!hasChildren) {
                tagsContainer.style.marginRight = '0px';
            }
            nodeContentContainer.appendChild(tagsContainer);
        }

        nodeDiv.appendChild(nodeContentContainer);

        // Node buttons container - 하위 노드가 있을 때만 토글 버튼 영역 생성
        if (hasChildren) {
            const nodeButtons = document.createElement('div');
            nodeButtons.classList.add('node-buttons');

            const toggleBtn = document.createElement('button');
            toggleBtn.classList.add('toggle-button');
            toggleBtn.textContent = node.expanded ? '−' : '+';
            toggleBtn.title = node.expanded ? 'Collapse' : 'Expand';
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNodeExpansion(node.id);
            });
            nodeButtons.appendChild(toggleBtn);

            nodeDiv.appendChild(nodeButtons);
        }

        // Add click handlers
        nodeDiv.addEventListener('click', () => {
            this.selectNode(node.id);
        });

        nodeDiv.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.editNodeTitle(node.id);
        });

        // Add drag handler
        nodeDiv.addEventListener('mousedown', (e) => {
            this.handleMouseDown(e, nodeDiv);
        });

        // Add context menu handler (우클릭 메뉴)
        nodeDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // 컨텍스트 메뉴 표시
            if (window.MyMind3 && window.MyMind3.ContextMenu) {
                window.MyMind3.ContextMenu.show(e, node);
            }
        });

        return nodeDiv;
    },

    clearNodes() {
        // DOM 서브트리 전체 제거 (이벤트 리스너 GC 보장)
        if (this.mindmapLayout) {
            while (this.mindmapLayout.firstChild) {
                const child = this.mindmapLayout.firstChild;
                // mindmap-node가 아닌 요소(connectorContainer 등)는 보존
                if (child.classList && child.classList.contains('mindmap-node')) {
                    this.mindmapLayout.removeChild(child);
                } else {
                    break;
                }
            }
            // 남은 mindmap-node 전부 제거
            const remaining = this.mindmapLayout.querySelectorAll('.mindmap-node');
            remaining.forEach(node => this.mindmapLayout.removeChild(node));
        }

        // Reset PDF/PPT/저장 button state - 노드 초기화 시 비활성화
        const pdfBtn = document.getElementById('pdfNodeBtn');
        const pptBtn = document.getElementById('pptNodeBtn');
        const saveBtn = document.getElementById('saveContentBtn');
        if (pdfBtn) pdfBtn.disabled = true;
        if (pptBtn) pptBtn.disabled = true;
        if (saveBtn) saveBtn.disabled = true;

        // Reset selected node
        window.selectedNodeId = null;
    },

    toggleNodeExpansion(nodeId) {
        const node = window.MyMind3.MindMapData.findNodeById(nodeId);
        if (!node) return;

        // 펼치는 경우 → 서버에서 하위 노드 동기화 후 렌더링
        if (!node.expanded) {
            node.expanded = true;
            this.renderMindMap();
            // 백그라운드로 서버 동기화 (새 하위 노드 추가될 수 있음)
            this.syncChildrenFromServer(nodeId);
        } else {
            // 접는 경우 → 즉시 토글 + 렌더링
            node.expanded = false;
            this.renderMindMap();
        }
    },

    async selectNode(nodeId) {
        // 이전 노드가 있으면 백그라운드 저장 (fire-and-forget, 새 노드 로드 차단하지 않음)
        const previousNodeId = window.selectedNodeId || window.MyMind3?.MindMapData?.currentEditingNodeId;

        if (previousNodeId && previousNodeId !== nodeId) {
            if (window.MyMind3Editor?.isDirty && window.MyMind3Editor.editor) {
                // dirty일 때만 백그라운드 저장 — 새 노드 로드를 차단하지 않음
                window.MyMind3Editor.saveContent().catch(error => {
                    console.error(`[MyMind2NodeRenderer] 이전 노드 ${previousNodeId} 저장 실패:`, error);
                });
            }
        }

        // Remove previous selection
        document.querySelectorAll('.mindmap-node.selected').forEach(node => {
            node.classList.remove('selected');
        });

        // Add selection to current node
        const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
        if (nodeElement) {
            nodeElement.classList.add('selected');

            // Update editing state
            console.log('═══════════════════════════════════════════════════════');
            console.log('[selectNode] NODE SELECTED');
            console.log('[selectNode] nodeId:', nodeId);
            console.log('[selectNode] Setting window.MyMind3.MindMapData.currentEditingNodeId =', nodeId);
            console.log('[selectNode] Setting window.selectedNodeId =', nodeId);
            window.MyMind3.MindMapData.currentEditingNodeId = nodeId;
            window.selectedNodeId = nodeId;
            console.log('[selectNode] Node selection state updated');
            console.log('[selectNode] Verify - window.selectedNodeId:', window.selectedNodeId);
            console.log('[selectNode] Verify - window.MyMind3.MindMapData.currentEditingNodeId:', window.MyMind3.MindMapData.currentEditingNodeId);
            console.log('═══════════════════════════════════════════════════════');

            // Show node content in editor
            await this.showNodeInEditor(nodeId);

            // FIX: loadQA()는 마인드맵 초기 로드 시 1번만 호출
            // 노드 클릭마다 호출하면 불필요한 네트워크 요청 발생
            // await this.loadQA(); // 제거됨 - app-simple.js의 loadMindmap에서 호출

            // Update copy button state
            this.updateCopyButtonState(true);

            // Update PDF/PPT/저장 button state - 노드 선택 시 활성화 (기능설정 비활성화 시 스킵)
            const pdfBtn = document.getElementById('pdfNodeBtn');
            const pptBtn = document.getElementById('pptNodeBtn');
            const saveBtn = document.getElementById('saveContentBtn');
            if (pdfBtn && (!window.isFeatureEnabled || window.isFeatureEnabled('pdf'))) pdfBtn.disabled = false;
            if (pptBtn && (!window.isFeatureEnabled || window.isFeatureEnabled('ppt'))) pptBtn.disabled = false;
            if (saveBtn) saveBtn.disabled = !!window.MyMind3?.isReadOnly;

            // nodeSelected 이벤트 발생 - 첨부파일 등 관련 기능에서 사용
            document.dispatchEvent(new CustomEvent('nodeSelected', {
                detail: { nodeId: nodeId }
            }));
            console.log('[selectNode] nodeSelected 이벤트 발생:', nodeId);

            // 서버에서 하위 노드 동기화 + 접혀있으면 자동 펼침
            this.syncChildrenFromServer(nodeId, true);
        }
    },

    // 서버에서 하위 노드를 확인하여 병합 + 자동 펼침
    // @param {number} nodeId - 노드 ID
    // @param {boolean} autoExpand - true면 하위 노드가 있을 때 자동으로 펼침
    async syncChildrenFromServer(nodeId, autoExpand = false) {
        const folder = window.MyMind3?.currentFolder || window.currentQAFolder || localStorage.getItem('currentFolder');
        if (!folder) {
            console.log('[syncChildren] folder 없음 → 스킵');
            return;
        }

        const node = window.MyMind3.MindMapData.findNodeById(nodeId);
        if (!node) {
            console.log('[syncChildren] 노드 못찾음:', nodeId);
            return;
        }

        // 서버 조회에 사용할 ID (문자열 nodeId 우선)
        const queryId = node.nodeId || String(node.id);

        try {
            const response = await fetch(
                `/api/mindmap/children?folder=${encodeURIComponent(folder)}&nodeId=${encodeURIComponent(queryId)}`,
                { credentials: 'include' }
            );
            if (!response.ok) {
                console.log(`[syncChildren] API 응답 실패: ${response.status}`);
                // API 실패해도 로컬 children이 있으면 펼침
                if (autoExpand && node.children && node.children.length > 0 && !node.expanded) {
                    node.expanded = true;
                    this.renderMindMap();
                }
                return;
            }

            const data = await response.json();

            // 서버에 children이 없는 경우 → 로컬 children이라도 있으면 펼침
            if (!data.success || !data.children || data.children.length === 0) {
                if (autoExpand && node.children && node.children.length > 0 && !node.expanded) {
                    node.expanded = true;
                    this.renderMindMap();
                }
                return;
            }

            // 메모리에 있는 children ID 수집
            const memoryIds = new Set();
            if (node.children) {
                node.children.forEach(c => {
                    memoryIds.add(String(c.id));
                    if (c.nodeId) memoryIds.add(c.nodeId);
                });
            }

            // 삭제된 노드 ID 참조 (재추가 방지)
            const deletedIds = window.MyMind3.MindMapData._deletedNodeIds || new Set();

            // 서버에만 있는 새 하위 노드 필터링 (삭제된 노드 제외)
            const newChildren = data.children.filter(c => {
                const inMemory = memoryIds.has(String(c.id)) || (c.nodeId && memoryIds.has(c.nodeId));
                const isDeleted = deletedIds.has(String(c.id)) || (c.nodeId && deletedIds.has(c.nodeId));
                return !inMemory && !isDeleted;
            });

            let needRender = false;

            if (newChildren.length > 0) {
                console.log(`[syncChildren] ${newChildren.length}개 새 하위 노드 발견:`, newChildren.map(c => c.title));
                if (!node.children) node.children = [];
                node.children.push(...newChildren);
                node.expanded = true;
                needRender = true;
            }

            // autoExpand: 서버에 children이 있고, 현재 접혀있으면 펼침
            if (autoExpand && !node.expanded && (node.children && node.children.length > 0)) {
                node.expanded = true;
                needRender = true;
            }

            if (needRender) {
                this.renderMindMap();
            }
        } catch (e) {
            console.warn('[syncChildrenFromServer] 서버 동기화 실패:', e.message);
            // 에러 발생해도 로컬 children이 있으면 펼침
            if (autoExpand && node.children && node.children.length > 0 && !node.expanded) {
                node.expanded = true;
                this.renderMindMap();
            }
        }
    },

    // 저장 전 서버 전체 트리와 동기화 (서버에만 있는 노드를 로컬에 병합)
    async syncFullTreeBeforeSave() {
        const folder = window.MyMind3?.currentFolder || window.currentQAFolder || localStorage.getItem('currentFolder');
        if (!folder) return false;

        try {
            const response = await fetch(
                `/api/load?folder=${encodeURIComponent(folder)}`,
                { credentials: 'include' }
            );
            if (!response.ok) return false;

            const serverData = await response.json();
            if (!serverData.mindMapData || serverData.mindMapData.length === 0) return false;

            const localData = window.MyMind3.MindMapData.mindMapData;
            if (!localData || localData.length === 0) return false;

            // 로컬에 있는 모든 노드 ID 수집
            const localIds = new Set();
            function collectIds(nodes) {
                if (!nodes) return;
                for (const node of nodes) {
                    localIds.add(String(node.id));
                    if (node.nodeId) localIds.add(node.nodeId);
                    if (node.children) collectIds(node.children);
                }
            }
            collectIds(localData);

            // 삭제된 노드 ID 참조 (sync 시 재추가 방지)
            const deletedIds = window.MyMind3.MindMapData._deletedNodeIds || new Set();

            // 재귀적으로 서버 트리 탐색 → 로컬에 없는 노드를 부모에게 추가
            let addedCount = 0;
            function mergeFromServer(serverNodes, localNodes) {
                if (!serverNodes || !localNodes) return;
                for (const sNode of serverNodes) {
                    // 서버 노드에 대응하는 로컬 노드 찾기
                    const lNode = localNodes.find(n =>
                        String(n.id) === String(sNode.id) || (n.nodeId && n.nodeId === sNode.nodeId)
                    );

                    if (lNode) {
                        // 로컬에 해당 노드가 존재 → 하위 노드 재귀 비교
                        if (sNode.children && sNode.children.length > 0) {
                            if (!lNode.children) lNode.children = [];
                            // 서버에만 있는 하위 노드 찾기
                            for (const sChild of sNode.children) {
                                const exists = localIds.has(String(sChild.id)) ||
                                    (sChild.nodeId && localIds.has(sChild.nodeId));
                                // 삭제된 노드는 재추가하지 않음
                                const isDeleted = deletedIds.has(String(sChild.id)) ||
                                    (sChild.nodeId && deletedIds.has(sChild.nodeId));
                                if (!exists && !isDeleted) {
                                    lNode.children.push(sChild);
                                    // 새로 추가된 노드와 그 하위 모두 ID 등록
                                    function registerIds(node) {
                                        localIds.add(String(node.id));
                                        if (node.nodeId) localIds.add(node.nodeId);
                                        if (node.children) node.children.forEach(registerIds);
                                    }
                                    registerIds(sChild);
                                    addedCount++;
                                }
                            }
                            // 이미 있는 노드의 하위도 재귀 비교
                            mergeFromServer(sNode.children, lNode.children);
                        }
                    }
                }
            }

            mergeFromServer(serverData.mindMapData, localData);

            if (addedCount > 0) {
                console.log(`[syncFullTree] 서버에서 ${addedCount}개 새 노드 병합 완료`);
                this.renderMindMap();
            }

            if (deletedIds.size > 0) {
                console.log(`[syncFullTree] _deletedNodeIds ${deletedIds.size}개 존재 → 재추가 방지됨`);
            }

            console.log('[syncFullTree] 동기화 완료');
            return addedCount > 0;
        } catch (e) {
            console.warn('[syncFullTreeBeforeSave] 동기화 실패 (저장은 계속 진행):', e.message);
            return false;
        }
    },

    // [DEPRECATED] 기존 qa.html 로드 함수 - 더 이상 사용하지 않음
    // AI별 Q&A 파일은 app-simple.js의 loadQAContent()에서 로드됨
    async loadQA() {
        console.log('[DEPRECATED] loadQA() is no longer used. Use loadQAContent() for AI-specific Q&A files.');
    },

    updateCopyButtonState(enabled) {
        const copyBtn = document.getElementById('copyNodeBtn');
        if (copyBtn) {
            copyBtn.disabled = !enabled;
            copyBtn.title = enabled ? (window.i18n?.copyNodeTooltip || '노드 복사') : (window.i18n?.noSelectedNode || '노드를 선택하세요');
        }
    },

    async addChildNode(parentId) {
        let title;
        const inputPrompt = window.i18n?.inputChildTitle || '새 하위 노드의 제목을 입력하세요:';
        if (typeof window.showInputModal === 'function') {
            title = await window.showInputModal(inputPrompt);
        } else {
            title = prompt(inputPrompt);
        }
        if (title && title.trim()) {
            const newNode = window.MyMind3.MindMapData.createChildNode(parentId, title.trim());
            if (newNode) {
                // 부모 노드 참조 (HTML 파일 생성용)
                const parentNode = window.MyMind3.MindMapData.findNodeById(parentId);

                // Set initial content as empty
                const initialContent = ``;

                console.log(`[MyMind2NodeRenderer] Creating empty HTML file for new node ${newNode.id}`);

                // 새 노드의 빈 HTML 파일을 즉시 생성
                try {
                    const folderName = window.currentQAFolder || window.MyMind3?.currentFolder || localStorage.getItem('currentFolder');

                    if (folderName) {
                        const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
                        const response = await fetch('/api/savenode', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', ...csrfHeaders },
                            credentials: 'include',
                            body: JSON.stringify({
                                folder: folderName,
                                nodeId: newNode.nodeId || String(newNode.id),
                                content: initialContent,
                                nodeName: newNode.title || ''  // 서버에서 title[nodeId].html 파일명에 사용
                            })
                        });

                        if (response.ok) {
                            console.log(`[MyMind2NodeRenderer] Empty HTML file created for node ${newNode.id}`);
                        } else {
                            console.warn(`[MyMind2NodeRenderer] Failed to create HTML file for node ${newNode.id}`);
                        }
                    } else {
                        console.warn('[MyMind2NodeRenderer] No current folder - HTML file not created');
                    }
                } catch (error) {
                    console.error('[MyMind2NodeRenderer] Error creating HTML file:', error);
                }

                // 전체 노드 위치 재계산 및 렌더링 (형제 노드 간격 보정)
                this.renderMindMap();

                // 왼쪽 패널 트리뷰 업데이트
                if (window.updateNodeTreeView) {
                    window.updateNodeTreeView();
                }

                // Update button states after adding child node
                if (window.updateSaveImproveButtonState) {
                    window.updateSaveImproveButtonState();
                }

                // Auto-select the new node and show in editor
                setTimeout(async () => {
                    await this.selectNode(newNode.id);
                    // Auto-save after adding child node
                    if (window.autoSaveMindMap) {
                        window.autoSaveMindMap();
                    }
                }, 100);
            }
        }
    },

    async confirmDeleteNode(nodeId) {
        const node = window.MyMind3.MindMapData.findNodeById(nodeId);
        if (!node) {
            console.warn('Node not found:', nodeId);
            return;
        }

        // 삭제 전 부모 노드 ID 확보 (삭제 후 에디터 전환용)
        const parentInfo = window.MyMind3.MindMapData.findNodeAndParent(nodeId);
        const parentId = parentInfo?.parent?.id || null;

        // Collect all node IDs in the subtree (node + all children)
        const nodeIdsToDelete = window.MyMind3.MindMapData.collectNodeSubtree(nodeId);

        let confirmMessage;
        if (nodeIdsToDelete.length > 1) {
            const template = window.i18n?.deleteNodeWithChildren || '"{title}" 노드와 {count}개의 하위 노드를 삭제하시겠습니까?';
            confirmMessage = template.replace('{title}', node.title).replace('{count}', nodeIdsToDelete.length - 1);
        } else {
            const template = window.i18n?.deleteNodeConfirm || '"{title}" 노드를 삭제하시겠습니까?';
            confirmMessage = template.replace('{title}', node.title);
        }

        const deleteBtn = window.i18n?.deleteBtn || '삭제';
        const cancelBtn = window.i18n?.cancelBtn || '취소';

        let confirmed;
        if (typeof window.showConfirmModal === 'function') {
            confirmed = await window.showConfirmModal(confirmMessage, deleteBtn, cancelBtn, true);
        } else {
            confirmed = confirm(confirmMessage);
        }
        if (!confirmed) {
            return;
        }

        try {
            // Get current folder name
            const folderName = window.currentQAFolder || (window.MyMind3.MindMapData.mindMapData[0] && window.MyMind3.MindMapData.mindMapData[0].title);

            if (!folderName) {
                console.error('Cannot determine folder name for deletion');
                alert(window.i18n?.alertFolderNotFound || '현재 폴더 정보를 확인할 수 없습니다.');
                return;
            }

            console.log(`Deleting node ${nodeId} and ${nodeIdsToDelete.length - 1} children from folder: ${folderName}`);

            // Send node data with all children to server for complete deletion
            const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
            const response = await fetch('/api/deletenode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...csrfHeaders },
                credentials: 'include',
                body: JSON.stringify({
                    folder: folderName,
                    nodeId: nodeId,
                    nodeData: node  // Send complete node tree with children
                })
            });

            const result = await response.json();

            if (!result.success) {
                console.error('Failed to delete node files:', result.error);
                alert(`파일 삭제 실패: ${result.error}`);
                return;
            }

            console.log(`Deleted ${result.count} files for ${result.nodesDeleted} nodes:`, result.deletedFiles);

            // Now delete from memory (this removes the entire subtree automatically)
            if (await window.MyMind3.MindMapData.deleteNode(nodeId)) {
                console.log(`Successfully deleted node ${nodeId} and all its children from memory`);
                this.renderMindMap();

                // Update button states after deletion
                if (window.updateMainAddButtonState) {
                    window.updateMainAddButtonState();
                }
                if (window.updateSaveImproveButtonState) {
                    window.updateSaveImproveButtonState();
                }

                // 삭제 후 부모 노드 선택 (에디터 내용 전환)
                if (parentId) {
                    await this.selectNode(parentId);
                } else if (window.MyMind3Editor?.clearEditorState) {
                    window.MyMind3Editor.clearEditorState();
                }

                // CRITICAL: Save JSON to persist the deletion
                console.log('Saving JSON after node deletion...');
                if (window.autoSaveMindMap) {
                    await window.autoSaveMindMap();
                    console.log('JSON saved successfully after deletion');
                } else {
                    console.warn('autoSaveMindMap function not found - deletion not persisted!');
                }
            } else {
                console.error(`Failed to delete node ${nodeId} from memory`);
            }

        } catch (error) {
            console.error('Error during node deletion:', error);
            alert(window.i18n?.alertNodeDeleteError || '노드 삭제 중 오류가 발생했습니다.');
        }
    },

    copyNode(nodeId) {
        const copiedNode = window.MyMind3.MindMapData.copyNode(nodeId);
        if (copiedNode) {
            this.renderMindMap();
            this.selectNode(copiedNode.id);
        }
    },

    async editNodeTitle(nodeId) {
        const node = window.MyMind3.MindMapData.findNodeById(nodeId);
        if (node) {
            // 커스텀 입력 모달 사용 (window.showInputModal이 있으면 사용, 없으면 prompt 폴백)
            let newTitle;
            const editPrompt = window.i18n?.editNodeTitle || '노드 제목을 편집하세요:';
            if (typeof window.showInputModal === 'function') {
                newTitle = await window.showInputModal(editPrompt, node.title);
            } else {
                newTitle = prompt(editPrompt, node.title);
            }
            if (newTitle && newTitle.trim() && newTitle.trim() !== node.title) {
                // IMPORTANT: title만 변경, path 필드는 절대 변경하지 않음
                // path는 nodeId 기반 HTML 파일명 (예: "20.html")으로 고정되어야 함
                // Limit title length to MAX_TITLE_LENGTH (1000 characters)
                const maxLength = window.MyMind3.MindMapData.MAX_TITLE_LENGTH || 1000;
                node.title = newTitle.trim().substring(0, maxLength);
                this.renderMindMap();
            }
        }
    },

    async showNodeInEditor(nodeId) {
        const node = window.MyMind3.MindMapData.findNodeById(nodeId);
        if (node) {
            // MyMind3Editor를 사용하여 노드 내용 표시
            if (window.MyMind3Editor) {
                await window.MyMind3Editor.showNodeContent(nodeId);
                console.log(`[MyMind2NodeRenderer] Node ${nodeId} displayed in editor`);
            } else {
                console.error('[MyMind2NodeRenderer] MyMind3Editor not available');
            }
        }
    },

    // Drag and Drop and Pan Implementation
    setupInteractions() {
        // Mouse move handler for document
        document.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });

        // Mouse up handler for document
        document.addEventListener('mouseup', (e) => {
            this.handleMouseUp(e);
        });

        // Setup right-click pan functionality
        if (this.mindmapContainer) {
            this.mindmapContainer.addEventListener('mousedown', (e) => {
                this.handleContainerMouseDown(e);
            });

            this.mindmapContainer.addEventListener('mouseleave', () => {
                this.isPanning = false;
                this.mindmapContainer.style.cursor = '';
            });

            this.mindmapContainer.addEventListener('contextmenu', (e) => {
                e.preventDefault(); // Prevent right-click context menu
            });
        }
    },

    handleMouseDown(e, nodeElement) {
        // Don't start drag if clicking on buttons
        if (e.target.closest('.node-buttons')) return;
        if (e.button !== 0) return; // Only left mouse button
        // 읽기 전용 모드에서는 드래그 차단
        if (window.MyMind3?.isReadOnly) return;

        // 드래그 시작 전 모든 노드의 DOM 좌표를 저장
        this.syncDOMPositionsToData();

        this.isDraggingNode = true;
        this.dragNode = nodeElement;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;

        // Store initial position
        this.dragNode.initialLeft = parseInt(this.dragNode.style.left) || 0;
        this.dragNode.initialTop = parseInt(this.dragNode.style.top) || 0;

        // 하위 노드 수집 및 초기 위치 저장 (드래그 시 함께 이동)
        this.dragDescendants = [];
        const collectDescendants = (parentEl) => {
            const parentId = parentEl.getAttribute('data-id');
            if (!this.mindmapLayout) return;
            const children = this.mindmapLayout.querySelectorAll(`.mindmap-node[data-parent-id="${parentId}"]`);
            children.forEach(child => {
                this.dragDescendants.push({
                    element: child,
                    initialLeft: parseInt(child.style.left) || 0,
                    initialTop: parseInt(child.style.top) || 0
                });
                collectDescendants(child);
            });
        };
        collectDescendants(this.dragNode);

        // Visual feedback for dragged node
        this.dragNode.style.zIndex = '100';
        this.dragNode.style.opacity = '0.8';
        // 하위 노드도 시각적 피드백
        this.dragDescendants.forEach(desc => {
            desc.element.style.zIndex = '99';
            desc.element.style.opacity = '0.8';
        });
        document.body.style.userSelect = 'none';

        e.preventDefault();
    },

    handleContainerMouseDown(e) {
        // Handle right-click pan
        if (e.button === 2 && !e.target.closest('.mindmap-node')) {
            this.isPanning = true;
            this.panStartX = e.clientX;
            this.panStartY = e.clientY;
            this.panScrollLeft = this.mindmapContainer.scrollLeft;
            this.panScrollTop = this.mindmapContainer.scrollTop;
            this.mindmapContainer.style.cursor = 'grabbing';
            e.preventDefault();
        }
    },

    handleMouseMove(e) {
        // Handle panning
        if (this.isPanning) {
            const dx = e.clientX - this.panStartX;
            const dy = e.clientY - this.panStartY;
            this.mindmapContainer.scrollLeft = this.panScrollLeft - dx;
            this.mindmapContainer.scrollTop = this.panScrollTop - dy;
            return;
        }

        // Handle node dragging
        if (!this.isDraggingNode || !this.dragNode) return;

        // Update drag node position
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        this.dragNode.style.left = (this.dragNode.initialLeft + dx) + 'px';
        this.dragNode.style.top = (this.dragNode.initialTop + dy) + 'px';

        // 하위 노드도 같은 delta로 이동 (연결선 왜곡 방지)
        if (this.dragDescendants) {
            this.dragDescendants.forEach(desc => {
                desc.element.style.left = (desc.initialLeft + dx) + 'px';
                desc.element.style.top = (desc.initialTop + dy) + 'px';
            });
        }

        // Clean up previous indicators
        this.cleanupDragIndicators();

        // Find target node under cursor (하위 노드 제외)
        const dragDescendantSet = new Set(this.dragDescendants?.map(d => d.element) || []);
        const elementsAtPoint = document.elementsFromPoint(e.clientX, e.clientY);
        const targetNode = elementsAtPoint.find(el =>
            el.classList && el.classList.contains('mindmap-node') && el !== this.dragNode && !dragDescendantSet.has(el)
        );

        if (targetNode) {
            this.showDropFeedback(targetNode, e);
        }

        // Update connectors during drag (RAF 쓰로틀링으로 프레임 드롭 방지)
        if (!this._rafPending) {
            this._rafPending = true;
            requestAnimationFrame(() => {
                this._redrawConnectorsSmart();
                this._rafPending = false;
            });
        }
    },

    handleMouseUp(e) {
        // Handle pan end
        if (e.button === 2 && this.isPanning) {
            this.isPanning = false;
            this.mindmapContainer.style.cursor = '';
            return;
        }

        // Handle drag end
        if (!this.isDraggingNode || !this.dragNode) return;

        // 드래그 중인 노드 ID 먼저 추출
        const movedNodeId = parseInt(this.dragNode.getAttribute('data-id'));

        try {
            let moved = false;

            if (this.positionIndicator) {
                // Handle position-based drops (above/below)
                const targetId = parseInt(this.positionIndicator.getAttribute('data-target-id'));
                const posType = this.positionIndicator.getAttribute('data-position');

                if (movedNodeId !== targetId) {
                    if (posType === 'middle') {
                        moved = window.MyMind3.MindMapData.moveNodeAsLastChild(movedNodeId, targetId);
                    } else {
                        moved = window.MyMind3.MindMapData.moveNodeBelowTarget(movedNodeId, targetId, posType);
                    }
                }
            } else {
                // Handle child drops (.drag-target)
                const dragTargets = document.querySelectorAll('.mindmap-node.drag-target');
                if (dragTargets.length > 0) {
                    const targetNode = dragTargets[0];
                    const targetId = parseInt(targetNode.getAttribute('data-id'));
                    if (movedNodeId !== targetId) {
                        moved = window.MyMind3.MindMapData.moveNodeAsLastChild(movedNodeId, targetId);
                    }
                }
            }

            if (moved) {
                // 노드 이동 시 전체 리렌더링 (새 부모-자식 관계 반영, 토글 버튼 갱신)
                this.renderMindMap();

                // 자동 저장 (노드 이동 후 데이터 유실 방지)
                if (window.autoSaveMindMap) {
                    window.autoSaveMindMap();
                }
            } else {
                // 이동 실패 시 원래 위치로 복원 (드래그 위치에 남지 않도록)
                if (this.dragNode.initialLeft !== undefined) {
                    this.dragNode.style.left = `${this.dragNode.initialLeft}px`;
                    this.dragNode.style.top = `${this.dragNode.initialTop}px`;
                }
                if (this.dragDescendants) {
                    this.dragDescendants.forEach(desc => {
                        desc.element.style.left = `${desc.initialLeft}px`;
                        desc.element.style.top = `${desc.initialTop}px`;
                    });
                }
            }

        } catch (err) {
            console.error('Drop error:', err);
        }

        // Clean up drag state
        this.isDraggingNode = false;
        this.dragNode.style.zIndex = '';
        this.dragNode.style.opacity = '1';
        // 하위 노드 시각적 상태 복원
        if (this.dragDescendants) {
            this.dragDescendants.forEach(desc => {
                desc.element.style.zIndex = '';
                desc.element.style.opacity = '1';
            });
        }
        document.body.style.userSelect = '';
        this.dragNode = null;
        this.dragDescendants = null;

        // Clean up visual indicators
        this.cleanupDragIndicators();
    },

    showDropFeedback(targetNode, e) {
        const rect = targetNode.getBoundingClientRect();
        const mouseY = e.clientY;
        const nodeTop = rect.top;
        const nodeBottom = rect.bottom;
        const nodeHeight = rect.height;
        const topZone = nodeTop + nodeHeight * 0.3;
        const bottomZone = nodeBottom - nodeHeight * 0.3;

        if (mouseY < topZone) {
            // Top 30%: Show red line above
            this.createPositionIndicator(targetNode, 'top');
        } else if (mouseY > bottomZone) {
            // Bottom 30%: Show red line below
            this.createPositionIndicator(targetNode, 'bottom');
        } else {
            // Middle 40%: Highlight as child target
            targetNode.classList.add('drag-target');
        }
    },

    createPositionIndicator(targetNode, position) {
        // Remove existing indicator
        if (this.positionIndicator && this.positionIndicator.parentNode) {
            this.positionIndicator.parentNode.removeChild(this.positionIndicator);
        }

        // Create new indicator
        const indicator = document.createElement('div');
        indicator.className = 'drag-position-indicator';

        const targetRect = targetNode.getBoundingClientRect();
        const containerRect = this.mindmapLayout.getBoundingClientRect();

        const left = targetRect.left - containerRect.left + this.mindmapLayout.scrollLeft;
        const width = targetRect.width;
        let top;

        if (position === 'top') {
            top = targetRect.top - containerRect.top + this.mindmapLayout.scrollTop - 2;
        } else {
            top = targetRect.bottom - containerRect.top + this.mindmapLayout.scrollTop - 1;
        }

        indicator.style.left = left + 'px';
        indicator.style.top = top + 'px';
        indicator.style.width = width + 'px';
        indicator.setAttribute('data-target-id', targetNode.getAttribute('data-id'));
        indicator.setAttribute('data-position', position);

        this.mindmapLayout.appendChild(indicator);
        this.positionIndicator = indicator;
    },

    cleanupDragIndicators() {
        // Remove position indicator
        if (this.positionIndicator && this.positionIndicator.parentNode) {
            this.positionIndicator.parentNode.removeChild(this.positionIndicator);
            this.positionIndicator = null;
        }

        // Remove drag target highlights
        document.querySelectorAll('.mindmap-node.drag-target')
            .forEach(el => el.classList.remove('drag-target'));

        // Remove position labels
        document.querySelectorAll('.drag-pos-label')
            .forEach(el => el.remove());
    },

    // Toggle node checked state
    toggleNodeCheck(nodeId) {
        if (!window.MyMind3 || !window.MyMind3.MindMapData) {
            console.error('MyMind3.MindMapData not available');
            return;
        }

        // Update the data
        const success = window.MyMind3.MindMapData.toggleNodeCheck(nodeId);
        if (success) {
            // Update the UI
            const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
            if (nodeElement) {
                const checkbox = nodeElement.querySelector('.node-checkbox');
                const nodeData = window.MyMind3.MindMapData.getNodeById(nodeId);
                if (checkbox && nodeData) {
                    checkbox.checked = nodeData.checked;
                }
            }

            // Auto-save
            if (window.autoSaveMindMap) {
                window.autoSaveMindMap();
            }
        }
    },

    // 서브트리의 모든 체크박스 UI를 데이터와 동기화
    updateSubtreeCheckboxUI(nodeId) {
        const mindmapData = window.MyMind3.MindMapData;
        if (!mindmapData) return;

        const nodeIds = mindmapData.collectNodeSubtree(nodeId);
        nodeIds.forEach(id => {
            const el = document.querySelector(`[data-id="${id}"]`);
            if (el) {
                const cb = el.querySelector('.node-checkbox');
                const nd = mindmapData.findNodeById(id);
                if (cb && nd) {
                    cb.checked = nd.checked;
                }
            }
        });
    },

    // Get all checked nodes
    getCheckedNodes() {
        if (!window.MyMind3 || !window.MyMind3.MindMapData) {
            return [];
        }

        const checkedNodes = [];

        function collectCheckedNodes(nodes) {
            nodes.forEach(node => {
                if (node.checked) {
                    checkedNodes.push({
                        id: node.id,
                        nodeId: node.nodeId,  // 문자열 노드 ID (예: "ASD003") - API 파일 조회용
                        title: node.title,
                        path: node.path || '',
                        level: node.level
                    });
                }
                if (node.children && node.children.length > 0) {
                    collectCheckedNodes(node.children);
                }
            });
        }

        collectCheckedNodes(window.MyMind3.MindMapData.mindMapData);
        return checkedNodes;
    },

    // Get checked nodes context for AI
    async getCheckedNodesContext() {
        const checkedNodes = this.getCheckedNodes();
        if (checkedNodes.length === 0) {
            return '';
        }

        // Get current project path (folder name)
        let projectPath = '';

        // 1. Try window.currentQAFolder first (most reliable)
        if (window.currentQAFolder) {
            projectPath = window.currentQAFolder;
        }
        // 2. Try to find root node from mindMapData
        else {
            const mindMapData = window.MyMind3?.MindMapData?.mindMapData;
            if (mindMapData && mindMapData.length > 0) {
                const rootNode = mindMapData.find(node => node.parentId === null || node.parentId === undefined);
                if (rootNode) {
                    projectPath = rootNode.title;
                } else {
                    projectPath = mindMapData[0].title;
                }
            }
        }

        if (!projectPath) {
            // If no project path, return titles only
            let context = '\n\n=== 체크된 관련 노드들 ===\n';
            checkedNodes.forEach(node => {
                context += `- ${node.title}\n`;
            });
            context += '=========================\n';
            return context;
        }

        let context = '\n\n=== 체크된 관련 노드들 ===\n';

        // Load HTML content for each checked node
        for (const node of checkedNodes) {
            context += `\n[노드: ${node.title}]\n`;

            try {
                // nodeId를 우선 사용, path에서는 [nodeId] 패턴으로 추출
                // path 형식: "제목[nodeId].html" 또는 레거시 "nodeId.html"
                let fileId = node.nodeId || String(node.id);
                if (node.path) {
                  const bracketMatch = node.path.match(/\[([^\]]+)\]\.html$/);
                  if (bracketMatch) fileId = bracketMatch[1];
                  else if (/^[a-zA-Z0-9_-]+\.html$/.test(node.path)) fileId = node.path.replace(/\.html$/, '');
                }
                const response = await fetch(`/api/loadnode?folder=${encodeURIComponent(projectPath)}&nodeId=${fileId}`);
                if (response.ok) {
                    const data = await response.json();
                    const htmlContent = data.content;

                    // Convert HTML to plain text
                    const cleanContent = this.htmlToPlainText(htmlContent);
                    if (cleanContent && cleanContent.trim()) {
                        context += `내용:\n${cleanContent}\n`;
                    } else {
                        context += '내용: (비어있음)\n';
                    }
                } else {
                    context += '내용: (로드 실패)\n';
                }
            } catch (error) {
                console.error(`Failed to load content for node ${node.id}:`, error);
                context += '내용: (에러)\n';
            }
        }

        context += '=========================\n';
        return context;
    },

    // Convert HTML to plain text
    htmlToPlainText(html) {
        if (!html) return '';

        // Create a temporary div to parse HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Remove script and style elements
        temp.querySelectorAll('script, style').forEach(el => el.remove());

        // Get text content and clean up
        let text = temp.textContent || temp.innerText || '';

        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();

        return text;
    }
};

// Make it compatible with existing MyMind3 namespace
window.MyMind3 = window.MyMind3 || {};
window.MyMind3.NodeRenderer = window.MyMind2NodeRenderer;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (window.MyMind2NodeRenderer) {
        window.MyMind2NodeRenderer.initialize();
    }
});