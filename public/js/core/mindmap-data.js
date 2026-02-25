/**
 * MyMind3 - Mind Map Data Management
 * Apple-inspired mind map data structure and CRUD operations
 */

window.MyMind3 = window.MyMind3 || {};

window.MyMind3.MindMapData = {
    // Layout constants - 노드 가로 70% 축소 적용
    LAYOUT_CONSTANTS: {
        ROOT_NODE_X: 26,            // was 30
        ROOT_NODE_Y: 20,            // 기본 위치
        ROOT_NODE_Y_SPACING: 85,    // was 100
        HORIZONTAL_SPACING: 260,    // 노드 200px + 간격 60px
        VERTICAL_SPACING: 68,       // was 80
        MIN_VERTICAL_SPACING: 43,   // was 50
        NODE_GAP: 60,               // 노드 간 수평 간격
        BASE_NODE_WIDTH: 200,       // 기본 노드 너비 (286의 70%)
        FILTER_EXPAND: 34,          // 필터 태그당 추가 너비
        TOGGLE_BTN_SPACE: 23        // 토글 버튼 공간 (min-width 22px + gap 1px)
    },

    /**
     * 노드의 동적 너비 계산 (필터 태그 수에 따라 확장, 자식 없으면 토글 버튼 공간 절약)
     * @param {object} node - 노드 데이터
     * @returns {number} - 노드 너비 (px)
     */
    getNodeWidth(node) {
        const base = this.LAYOUT_CONSTANTS.BASE_NODE_WIDTH;
        if (!node) return base;
        let width = base;
        // 필터 태그에 의한 확장
        if (node.filters && node.filters.length > 0) {
            width += node.filters.length * this.LAYOUT_CONSTANTS.FILTER_EXPAND;
        }
        // 자식이 없으면 토글 버튼(+/−) 공간 절약
        if (!node.children || node.children.length === 0) {
            width -= this.LAYOUT_CONSTANTS.TOGGLE_BTN_SPACE;
        }
        return width;
    },

    // Maximum title length for nodes (노드 제목 최대 길이)
    MAX_TITLE_LENGTH: 1000,

    // Mind map data array
    mindMapData: [],
    // Next node ID (auto-increment)
    nextNodeId: 1,
    // Currently selected parent node ID
    currentParentId: null,
    // Previously selected node ID
    previousSelectedNodeId: null,
    // Currently editing node ID
    currentEditingNodeId: null,
    // 노드 인덱스 Map (id → node) - O(1) 조회용
    _nodeIndex: new Map(),
    // 현재 세션에서 삭제된 노드 ID Set (sync 시 재추가 방지)
    _deletedNodeIds: new Set(),
    // 필터 목록 (노드 필터 관리)
    filters: [],

    /**
     * Initialize the data module
     */
    initialize() {
        this.mindMapData = [];
        this.nextNodeId = 1;
        this.currentParentId = null;
        this.previousSelectedNodeId = null;
        this.currentEditingNodeId = null;
        this._nodeIndex = new Map();
        this._deletedNodeIds = new Set();
        this.filters = [];
        console.log('MyMind3.MindMapData module initialized');

        // 마인드맵 초기화 이벤트 발생 (새 트리 버튼 비활성화용)
        window.dispatchEvent(new CustomEvent('mindmapCleared'));
    },

    /**
     * Find node by ID recursively
     * @param {number} id - Node ID to find
     * @returns {object|null} - Found node or null
     */
    findNodeById(id) {
        // O(1) 인덱스 조회 (캐시 히트)
        const cached = this._nodeIndex.get(id);
        if (cached) return cached;

        // 인덱스 미스 시 트리 순회 후 인덱스에 추가
        const findNodeRecursive = (nodes, targetId) => {
            if (!nodes || nodes.length === 0) return null;

            for (const node of nodes) {
                if (node.id === targetId) {
                    return node;
                }

                if (node.children && node.children.length > 0) {
                    const foundNode = findNodeRecursive(node.children, targetId);
                    if (foundNode) {
                        return foundNode;
                    }
                }
            }

            return null;
        };

        const found = findNodeRecursive(this.mindMapData, id);
        if (found) {
            this._nodeIndex.set(id, found);
        }
        return found;
    },

    /**
     * Create main title (root node)
     * @param {string} title - Node title
     * @returns {object|null} - Created node or null
     */
    createMainTitle(title) {
        try {
            // Limit title length to MAX_TITLE_LENGTH (1000 characters)
            const limitedTitle = title.substring(0, this.MAX_TITLE_LENGTH);
            console.log(`Creating main title: ${limitedTitle}`);

            const nodeId = this.nextNodeId++;

            // nodeId 생성 (노드 생성 시 자동 부여)
            let userNodeId = window.MyMind3.NodeId ? window.MyMind3.NodeId.generate() : null;
            if (userNodeId && window.MyMind3.NodeId) {
                window.MyMind3.NodeId.Registry.register(userNodeId);
            }

            const newNode = {
                id: nodeId,
                nodeId: userNodeId,  // 사용자용 고유 ID (예: ASD003)
                title: limitedTitle,
                parentId: null,
                level: 0, // Root level
                x: this.LAYOUT_CONSTANTS.ROOT_NODE_X,
                y: this.LAYOUT_CONSTANTS.ROOT_NODE_Y + (this.mindMapData.length * this.LAYOUT_CONSTANTS.ROOT_NODE_Y_SPACING), // Stack multiple root nodes vertically
                children: [],
                expanded: true,
                content: '', // HTML content for the node
                path: `${limitedTitle}[${userNodeId || nodeId}].html`,  // title[nodeId].html 형식
                checked: true  // 루트 노드는 기본 체크 상태로 생성 (노드재구성 자동 선택용)
            };

            this.mindMapData.push(newNode);
            this._nodeIndex.set(nodeId, newNode);

            // nodeId 생성 실패 시 비동기 폴백 (풀 보충 후 재시도)
            if (!userNodeId && window.MyMind3.NodeId) {
                console.warn('[createMainTitle] nodeId 풀 비어있음, 비동기 생성 시도');
                window.MyMind3.NodeId.generateFromServer('_main').then(function(id) {
                    if (id && !newNode.nodeId) {
                        newNode.nodeId = id;
                        newNode.path = limitedTitle + '[' + id + '].html';
                        window.MyMind3.NodeId.Registry.register(id);
                        // DOM 업데이트
                        if (window.MyMind3.NodeId.fixMissingIds) {
                            window.MyMind3.NodeId.fixMissingIds();
                        }
                        console.log('[createMainTitle] 비동기 nodeId 부여 완료: ' + id);
                    }
                }).catch(function(err) {
                    console.error('[createMainTitle] 비동기 nodeId 생성 실패:', err);
                });
            }

            console.log(`Main title created successfully: ${title} (ID: ${nodeId}, x=${newNode.x}, y=${newNode.y})`);
            return newNode;
        } catch (error) {
            console.error('Error creating main title:', error);
            return null;
        }
    },

    /**
     * Create child node
     * @param {number} parentId - Parent node ID
     * @param {string} title - Node title
     * @returns {object|boolean} - Created node or false on failure
     */
    createChildNode(parentId, title) {
        // 읽기 전용 모드 체크
        if (window.MyMind3?.isReadOnly) {
            console.log('[MindMapData] 읽기 전용 모드 - 노드 추가 차단');
            if (typeof window.showToast === 'function') {
                window.showToast(typeof t === 'function' ? t('readOnlyNoEdit', '읽기 전용 모드에서는 편집할 수 없습니다') : '읽기 전용 모드에서는 편집할 수 없습니다', 'warning', 2000);
            }
            return false;
        }
        if (!title || !title.trim()) {
            console.error('Title is empty');
            return false;
        }

        const parentNode = this.findNodeById(parentId);
        if (!parentNode) {
            console.error(`Parent node ID ${parentId} not found`);
            return false;
        }

        // Check for duplicate titles
        const hasDuplicate = parentNode.children.some(child => child.title === title.trim());
        if (hasDuplicate) {
            console.error('Child with same title already exists');
            return false;
        }

        try {
            const newNodeId = this.nextNodeId++;
            // Limit title length to MAX_TITLE_LENGTH (1000 characters)
            const limitedTitle = title.trim().substring(0, this.MAX_TITLE_LENGTH);

            const folderName = this.mindMapData.length > 0 ? this.mindMapData[0].title : 'Untitled';

            // nodeId 생성 (노드 생성 시 자동 부여)
            const userNodeId = window.MyMind3.NodeId ? window.MyMind3.NodeId.generate() : null;
            if (userNodeId && window.MyMind3.NodeId) {
                window.MyMind3.NodeId.Registry.register(userNodeId);
            }

            const newNode = {
                id: newNodeId,
                nodeId: userNodeId,  // 사용자용 고유 ID (예: ASD003)
                title: limitedTitle,
                parentId: parentId,
                children: [],
                expanded: false,
                level: parentNode.level + 1,
                content: '',
                path: `${limitedTitle}[${userNodeId || newNodeId}].html`,  // title[nodeId].html 형식
                checked: true  // 자동 만들기로 생성된 노드는 기본 선택 상태
            };

            parentNode.children.push(newNode);
            this._nodeIndex.set(newNodeId, newNode);

            // Expand parent node if collapsed
            if (!parentNode.expanded) {
                parentNode.expanded = true;
            }

            // 새 자식 노드의 좌표 계산
            this.calculateNewChildPosition(parentNode, newNode);

            console.log(`New child node created: ${title} (ID: ${newNode.id}, x=${newNode.x}, y=${newNode.y})`);
            return newNode;
        } catch (error) {
            console.error('Error creating child node:', error);
            return false;
        }
    },

    /**
     * Recursively collect node and all its children IDs
     * @param {number} nodeId - Starting node ID
     * @returns {Array<number>} - Array of all node IDs in the subtree
     */
    collectNodeSubtree(nodeId) {
        const nodeIds = [];

        const collectRecursive = (node) => {
            if (!node) return;

            nodeIds.push(node.id);

            if (node.children && node.children.length > 0) {
                node.children.forEach(child => collectRecursive(child));
            }
        };

        const targetNode = this.findNodeById(nodeId);
        if (targetNode) {
            collectRecursive(targetNode);
            console.log(`Collected ${nodeIds.length} nodes in subtree starting from node ${nodeId}:`, nodeIds);
        } else {
            console.warn(`Node ID ${nodeId} not found`);
        }

        return nodeIds;
    },

    /**
     * Delete node
     * @param {number} nodeId - Node ID to delete
     * @returns {boolean} - Success status
     */
    async deleteNode(nodeId) {
        // 읽기 전용 모드 체크
        if (window.MyMind3?.isReadOnly) {
            console.log('[MindMapData] 읽기 전용 모드 - 노드 삭제 차단');
            if (typeof window.showToast === 'function') {
                window.showToast(typeof t === 'function' ? t('readOnlyNoEdit', '읽기 전용 모드에서는 편집할 수 없습니다') : '읽기 전용 모드에서는 편집할 수 없습니다', 'warning', 2000);
            }
            return false;
        }
        try {
            console.log(`Starting node deletion: ID ${nodeId}`);

            // 노드 정보 가져오기 (파일 경로 확인용)
            const nodeToDelete = this.findNodeById(nodeId);
            if (!nodeToDelete) {
                console.warn(`Node ID ${nodeId} not found in data`);
                return false;
            }

            // 현재 폴더 정보 가져오기
            const currentFolder = this.data?.currentFolder || (this.mindMapData && this.mindMapData.length > 0 ? this.mindMapData[0].title : null);

            // 하위 노드 파일 경로 수집 (메모리 삭제 전에 수집해야 함)
            // path 형식: "노드명[NODEID].html" → NODEID 추출
            const childPaths = [];
            const collectChildren = (node) => {
                if (node.children && node.children.length > 0) {
                    node.children.forEach(child => {
                        if (child.path) {
                            childPaths.push(child.path);
                        }
                        collectChildren(child);
                    });
                }
            };
            collectChildren(nodeToDelete);

            // 파일 삭제 API용 정보를 미리 캡처 (메모리 삭제 전)
            const fileDeleteInfo = {
                nodeId: nodeId,
                folder: currentFolder,
                htmlPath: nodeToDelete.path,
                pdfFile: nodeToDelete.pdf || '',
                pptFile: nodeToDelete.ppt || '',
                childPaths: childPaths.length > 0 ? childPaths : undefined
            };

            // 삭제 대상 ID를 _deletedNodeIds에 등록 (sync 시 재추가 방지)
            const registerDeleted = (node) => {
                this._deletedNodeIds.add(String(node.id));
                if (node.nodeId) this._deletedNodeIds.add(node.nodeId);
                if (node.children) node.children.forEach(registerDeleted);
            };
            registerDeleted(nodeToDelete);
            console.log(`[deleteNode] _deletedNodeIds에 ${this._deletedNodeIds.size}개 ID 등록`);

            // 인덱스에서 서브트리 전체 제거
            const removeFromIndex = (node) => {
                this._nodeIndex.delete(node.id);
                if (node.children) {
                    node.children.forEach(child => removeFromIndex(child));
                }
            };
            removeFromIndex(nodeToDelete);

            // 메모리에서 먼저 제거 (렌더링 시 올바른 상태 보장)
            let removed = false;

            // Check if it's a root node
            for (let i = 0; i < this.mindMapData.length; i++) {
                if (this.mindMapData[i].id === nodeId) {
                    this.mindMapData.splice(i, 1);
                    console.log(`Root node deleted: ID ${nodeId}`);
                    removed = true;

                    // Update main add button state after root node deletion
                    if (typeof updateMainAddButtonState === 'function') {
                        updateMainAddButtonState();
                    }
                    break;
                }
            }

            // Search and remove from children recursively
            if (!removed) {
                const removeFromChildren = (parentNode) => {
                    if (!parentNode.children) return false;

                    for (let i = 0; i < parentNode.children.length; i++) {
                        if (parentNode.children[i].id === nodeId) {
                            parentNode.children.splice(i, 1);
                            console.log(`Child node removed from parent ID ${parentNode.id}: ID ${nodeId}`);
                            return true;
                        }

                        if (removeFromChildren(parentNode.children[i])) {
                            return true;
                        }
                    }

                    return false;
                };

                for (const rootNode of this.mindMapData) {
                    if (removeFromChildren(rootNode)) {
                        removed = true;
                        break;
                    }
                }
            }

            if (!removed) {
                console.warn(`Node ID ${nodeId} not found in data`);
                return false;
            }

            // 서버에 파일 삭제 요청 (메모리 삭제 후, 실패해도 계속 진행)
            if (currentFolder) {
                try {
                    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
                    const storageToken = window.MyMind3?.StorageAuth?.getToken ? await window.MyMind3.StorageAuth.getToken() : null;
                    const headers = { 'Content-Type': 'application/json', ...csrfHeaders };
                    if (storageToken) headers['X-Storage-Token'] = storageToken;
                    const response = await fetch('/api/files/delete-node-files', {
                        method: 'DELETE',
                        headers,
                        body: JSON.stringify(fileDeleteInfo)
                    });

                    if (response.ok) {
                        const result = await response.json();
                        console.log(`Node files deleted:`, result.deletedFiles);
                    } else {
                        console.error('Failed to delete node files:', await response.text());
                    }
                } catch (error) {
                    console.error('Error calling delete-node-files API:', error);
                }
            }

            return true;
        } catch (error) {
            console.error('Error deleting node:', error);
            return false;
        }
    },

    /**
     * Toggle node expansion
     * @param {number} nodeId - Node ID to toggle
     * @returns {boolean} - Success status
     */
    toggleNodeExpansion(nodeId) {
        try {
            const node = this.findNodeById(nodeId);
            if (!node) {
                console.error(`Node not found: ID ${nodeId}`);
                return false;
            }

            node.expanded = !node.expanded;
            console.log(`Node expansion toggled: ID ${nodeId}, expanded: ${node.expanded}`);
            return true;
        } catch (error) {
            console.error('Error toggling node expansion:', error);
            return false;
        }
    },

    /**
     * Save node content
     * @param {number} nodeId - Node ID
     * @param {string} content - HTML content to save
     * @returns {boolean} - Success status
     */
    saveNodeContent(nodeId, content) {
        try {
            const node = this.findNodeById(nodeId);
            if (!node) {
                console.error(`Node not found: ID ${nodeId}`);
                return false;
            }

            // content 필드는 더 이상 JSON에 저장하지 않음 - HTML 파일만 사용
            // node.content = content;  // 삭제됨
            console.log(`saveNodeContent() 함수는 더 이상 사용되지 않음. HTML 파일 저장 사용하세요.`);
            return true;
        } catch (error) {
            console.error('Error saving node content:', error);
            return false;
        }
    },

    /**
     * Get data as JSON string
     * @returns {string} - JSON string
     */
    getDataAsJson() {
        try {
            // 루트 노드에 qaFiles 배열이 없으면 빈 배열로 초기화 (Q&A 저장 시 채워짐)
            if (this.mindMapData && this.mindMapData.length > 0) {
                const rootNode = this.mindMapData[0];
                if (rootNode) {
                    // qaFiles 배열이 없으면 빈 배열 초기화
                    if (!Array.isArray(rootNode.qaFiles)) {
                        rootNode.qaFiles = [];
                    }
                    // 기존 qaFile (string)이 있으면 qaFiles로 마이그레이션
                    if (rootNode.qaFile && !rootNode.qaFiles.includes(rootNode.qaFile)) {
                        rootNode.qaFiles.push(rootNode.qaFile);
                        console.log('Migrated qaFile to qaFiles:', rootNode.qaFiles);
                    }
                    // 기존 qaFile 속성 제거
                    delete rootNode.qaFile;
                }
            }

            const saveData = {
                mindMapData: this.mindMapData,
                nextNodeId: this.nextNodeId,
                filters: this.filters || []
            };

            return JSON.stringify(saveData, null, 2);
        } catch (error) {
            console.error('Error converting data to JSON:', error);
            return '{}';
        }
    },

    /**
     * Load data from JSON string
     * @param {string} jsonData - JSON string to load
     * @returns {boolean} - Success status
     */
    loadFromJson(jsonData) {
        try {
            // Accept both string and object
            const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

            if (data && data.mindMapData) {
                // 이전 마인드맵 상태 초기화 (다른 마인드맵 불러오기 시 잔여 상태 제거)
                this.currentParentId = null;
                this.previousSelectedNodeId = null;
                this.currentEditingNodeId = null;

                this.mindMapData = data.mindMapData;
                // text → title 정규화 (Skill API 등 외부 경로로 생성된 노드 호환)
                this._normalizeNodeTitles(this.mindMapData);
                // nextNodeId는 반드시 기존 최대 ID보다 커야 함 (PATCH API 등으로 추가된 노드 ID 충돌 방지)
                const maxExistingId = this.getMaxNodeId();
                this.nextNodeId = Math.max(data.nextNodeId || 0, maxExistingId + 1);
                if (data.nextNodeId && data.nextNodeId <= maxExistingId) {
                    console.warn(`[loadFromJson] nextNodeId(${data.nextNodeId}) <= maxId(${maxExistingId}), 보정: ${this.nextNodeId}`);
                }
                this.filters = data.filters || [];

                // 중복 ID 검사 및 자동 수정
                this._fixDuplicateIds();

                // 노드 인덱스 재구축
                this._rebuildNodeIndex();

                // nodeId 마이그레이션 (기존 데이터에 nodeId가 없으면 생성)
                if (window.MyMind3.NodeId) {
                    window.MyMind3.NodeId.Registry.clear();
                    window.MyMind3.NodeId.migrate(this.mindMapData);

                    // 풀이 비어서 nodeId가 null로 남은 노드 비동기 보정
                    // (풀 보충 완료 후 재시도)
                    const hasNullNodeId = this.mindMapData.some(function checkNull(n) {
                        if (!n.nodeId) return true;
                        return (n.children || []).some(checkNull);
                    });
                    if (hasNullNodeId) {
                        console.log('[loadFromJson] nodeId 없는 노드 발견, 비동기 보정 스케줄');
                        setTimeout(function() {
                            if (window.MyMind3.NodeId.fixMissingIds) {
                                window.MyMind3.NodeId.fixMissingIds();
                            }
                        }, 1500);
                    }
                }

                // 노드 위치 재계산 (LAYOUT_CONSTANTS 적용)
                this.recalculateAllNodePositions();

                console.log('Mind map data loaded successfully, filters:', this.filters.length);
                return true;
            } else {
                console.error('Invalid mind map data - missing mindMapData property');
                console.error('Received data:', data);
                return false;
            }
        } catch (error) {
            console.error('Error loading mind map data:', error);
            return false;
        }
    },

    /**
     * Get maximum node ID
     * @returns {number} - Maximum node ID
     */
    getMaxNodeId() {
        let maxId = 0;

        const findMaxIdRecursive = (nodes) => {
            if (!nodes || nodes.length === 0) return;

            for (const node of nodes) {
                if (node.id > maxId) {
                    maxId = node.id;
                }

                if (node.children && node.children.length > 0) {
                    findMaxIdRecursive(node.children);
                }
            }
        };

        findMaxIdRecursive(this.mindMapData);
        return maxId;
    },

    /**
     * Calculate node positions for layout
     * @param {object} node - Node to calculate position for
     * @param {number} startX - Starting X position
     * @param {number} startY - Starting Y position
     * @param {number} level - Current level
     */
    /**
     * Get node height based on level (including padding)
     * @param {number} level - Node level
     * @returns {number} - Total node height including padding
     * 2025-12-18: 15% 축소 적용 (22px, was 26px)
     */
    getNodeHeightByLevel(level) {
        // Updated padding: 8px * 2 = 16px (15% 축소)
        // Font-size: 16px + line height
        // Fixed height: 22px (was 26px)
        return 22; // Uniform height for all levels - 15% 축소
    },

    /**
     * Calculate subtree bottom position (improved version)
     * @param {object} node - Node to calculate
     * @returns {number} - Bottom Y position of subtree
     */
    calculateSubtreeBottom(node) {
        if (!node) return 0;

        // Use actual rendered node height (46px including checkbox, padding, buttons)
        const nodeHeight = 46;
        let bottom = node.y + nodeHeight;

        // Only check child nodes if node is expanded and has children
        if (node.expanded && node.children && node.children.length > 0) {
            // Check heights of all child node subtrees
            for (let i = 0; i < node.children.length; i++) {
                const childNode = node.children[i];
                // Recursively calculate bottom position of each child node's subtree
                const childBottom = this.calculateSubtreeBottom(childNode);
                if (childBottom > bottom) {
                    bottom = childBottom;
                }
            }
        }

        return bottom;
    },

    calculateNodePositions(node, startX = null, startY = null, level = 0, parentNode = null) {
        // Use constants if not specified
        if (startX === null) startX = this.LAYOUT_CONSTANTS.ROOT_NODE_X;
        if (startY === null) startY = this.LAYOUT_CONSTANTS.ROOT_NODE_Y;
        if (!node) return startY;

        // 부모 노드가 있으면 부모의 실제 너비 기반으로 X 계산 (필터 태그 겹침 방지)
        if (parentNode) {
            node.x = parentNode.x + this.getNodeWidth(parentNode) + this.LAYOUT_CONSTANTS.NODE_GAP;
        } else {
            node.x = startX + (level * this.LAYOUT_CONSTANTS.HORIZONTAL_SPACING);
        }
        node.y = startY;
        node.level = level;

        let currentY = startY;

        if (node.expanded && node.children && node.children.length > 0) {
            // First child starts at same Y position as parent
            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i];

                if (i === 0) {
                    // First child at same Y position as parent
                    currentY = this.calculateNodePositions(child, startX, currentY, level + 1, node);
                } else {
                    // Subsequent siblings start after previous sibling's subtree + spacing
                    const prevSibling = node.children[i - 1];
                    const prevSubtreeBottom = this.calculateSubtreeBottom(prevSibling);
                    currentY = prevSubtreeBottom + 10; // 10px spacing between sibling nodes
                    currentY = this.calculateNodePositions(child, startX, currentY, level + 1, node);
                }
            }
        }

        // Use actual rendered node height (46px including checkbox, padding, buttons)
        const nodeHeight = 46;
        return Math.max(startY + nodeHeight, currentY); // Minimum node height
    },

    /**
     * Recalculate all node positions
     */
    recalculateAllNodePositions() {
        let currentY = this.LAYOUT_CONSTANTS.ROOT_NODE_Y;

        for (let i = 0; i < this.mindMapData.length; i++) {
            const rootNode = this.mindMapData[i];

            if (i === 0) {
                // First root node starts at ROOT_NODE_Y
                currentY = this.LAYOUT_CONSTANTS.ROOT_NODE_Y;
            } else {
                // Subsequent root nodes start after previous root node's subtree + spacing
                const prevRootNode = this.mindMapData[i - 1];
                const prevSubtreeBottom = this.calculateSubtreeBottom(prevRootNode);
                currentY = prevSubtreeBottom + 13; // 13px spacing between root nodes (15% 축소, was 15px)
            }

            this.calculateNodePositions(rootNode, this.LAYOUT_CONSTANTS.ROOT_NODE_X, currentY, 0);
        }
    },

    /**
     * 새 자식 노드의 좌표만 계산 (기존 노드 좌표 유지)
     * @param {object} parentNode - 부모 노드
     * @param {object} newNode - 새로 추가된 자식 노드
     */
    calculateNewChildPosition(parentNode, newNode) {
        if (!parentNode || !newNode) return;

        const level = parentNode.level + 1;
        newNode.level = level;
        newNode.x = parentNode.x + this.getNodeWidth(parentNode) + this.LAYOUT_CONSTANTS.NODE_GAP;

        // 부모의 자식 중 새 노드의 인덱스
        const siblingIndex = parentNode.children.findIndex(c => c.id === newNode.id);

        if (siblingIndex === 0) {
            // 첫 번째 자식이면 부모와 같은 Y 위치
            newNode.y = parentNode.y;
        } else {
            // 이전 형제 노드의 서브트리 아래에 위치
            const prevSibling = parentNode.children[siblingIndex - 1];
            const prevSubtreeBottom = this.calculateSubtreeBottom(prevSibling);
            newNode.y = prevSubtreeBottom + 10; // 10px spacing
        }

        console.log(`New child node position: x=${newNode.x}, y=${newNode.y}`);
    },

    /**
     * Find node and its parent
     * @param {number} nodeId - Node ID to find
     * @returns {object|null} - Object with node and parent, or null
     */
    findNodeAndParent(nodeId) {
        const findNodeAndParentRecursive = (nodes, targetId, parent = null) => {
            if (!nodes || nodes.length === 0) return null;

            for (const node of nodes) {
                if (node.id === targetId) {
                    return { node: node, parent: parent };
                }

                if (node.children && node.children.length > 0) {
                    const result = findNodeAndParentRecursive(node.children, targetId, node);
                    if (result) return result;
                }
            }
            return null;
        };

        return findNodeAndParentRecursive(this.mindMapData, nodeId);
    },

    /**
     * Check if a node is ancestor of another node
     * @param {object} node - Potential ancestor node
     * @param {number} descendantId - Descendant node ID
     * @returns {boolean} - True if node is ancestor of descendantId
     */
    isAncestor(node, descendantId) {
        if (!node || !node.children) return false;

        for (const child of node.children) {
            if (child.id === descendantId) return true;
            if (this.isAncestor(child, descendantId)) return true;
        }
        return false;
    },

    /**
     * Remove node from data structure and return it
     * @param {number} nodeId - Node ID to remove
     * @returns {object|null} - Removed node or null
     */
    removeNodeFromStructure(nodeId) {
        // Check if it's a root node
        for (let i = 0; i < this.mindMapData.length; i++) {
            if (this.mindMapData[i].id === nodeId) {
                return this.mindMapData.splice(i, 1)[0];
            }
        }

        // Search in children recursively
        const removeFromChildren = (parentNode) => {
            if (!parentNode.children) return null;

            for (let i = 0; i < parentNode.children.length; i++) {
                if (parentNode.children[i].id === nodeId) {
                    return parentNode.children.splice(i, 1)[0];
                }

                const result = removeFromChildren(parentNode.children[i]);
                if (result) return result;
            }
            return null;
        };

        for (const rootNode of this.mindMapData) {
            const result = removeFromChildren(rootNode);
            if (result) return result;
        }

        return null;
    },

    /**
     * Move node as last child of target
     * @param {number} dragId - Node ID to move
     * @param {number} targetId - Target parent node ID
     * @returns {boolean} - Success status
     */
    moveNodeAsLastChild(dragId, targetId) {
        try {
            const dragNode = this.findNodeById(dragId);
            const targetNode = this.findNodeById(targetId);

            if (!dragNode || !targetNode) return false;
            if (dragId === targetId) return false;
            if (this.isAncestor(dragNode, targetId)) return false;

            // Remove from current position
            const removedNode = this.removeNodeFromStructure(dragId);
            if (!removedNode) return false;

            // Add as last child
            if (!targetNode.children) targetNode.children = [];
            removedNode.parentId = targetId;
            targetNode.children.push(removedNode);

            // 이동된 자식이 보이도록 대상 노드 자동 펼침
            targetNode.expanded = true;

            // Update levels and positions
            this.updateNodeLevels();
            this.recalculateAllNodePositions();

            console.log(`Node ${dragId} moved as child of ${targetId}`);
            return true;
        } catch (error) {
            console.error('Error moving node as child:', error);
            return false;
        }
    },

    /**
     * Move node below target (as sibling)
     * @param {number} dragId - Node ID to move
     * @param {number} targetId - Target sibling node ID
     * @param {string} position - 'top' or 'bottom'
     * @returns {boolean} - Success status
     */
    moveNodeBelowTarget(dragId, targetId, position) {
        try {
            const targetInfo = this.findNodeAndParent(targetId);
            if (!targetInfo) return false;

            // Remove dragged node
            const removedNode = this.removeNodeFromStructure(dragId);
            if (!removedNode) return false;

            // Handle root level nodes
            if (!targetInfo.parent) {
                const targetIndex = this.mindMapData.findIndex(node => node.id === targetId);
                const insertIndex = position === 'top' ? targetIndex : targetIndex + 1;
                removedNode.parentId = null;
                removedNode.level = 0;
                this.mindMapData.splice(insertIndex, 0, removedNode);
            } else {
                // Handle child nodes
                const targetIndex = targetInfo.parent.children.findIndex(node => node.id === targetId);
                const insertIndex = position === 'top' ? targetIndex : targetIndex + 1;
                removedNode.parentId = targetInfo.parent.id;
                targetInfo.parent.children.splice(insertIndex, 0, removedNode);
            }

            // Update levels and positions
            this.updateNodeLevels();
            this.recalculateAllNodePositions();

            console.log(`Node ${dragId} moved ${position} of ${targetId}`);
            return true;
        } catch (error) {
            console.error('Error moving node below target:', error);
            return false;
        }
    },

    /**
     * Deep copy a node and all its children
     * @param {object} node - Node to copy
     * @param {number} offsetX - X offset for copied node
     * @param {number} offsetY - Y offset for copied node
     * @returns {object} - Copied node
     */
    deepCopyNode(node, offsetX = 50, offsetY = 50) {
        const copyNodeRecursive = (original, parentId = null) => {
            const folderName = this.mindMapData.length > 0 ? this.mindMapData[0].title : 'Untitled';
            const newId = this.nextNodeId++;

            // 복사된 노드에 새 nodeId 생성
            const userNodeId = window.MyMind3.NodeId ? window.MyMind3.NodeId.generate() : null;
            if (userNodeId && window.MyMind3.NodeId) {
                window.MyMind3.NodeId.Registry.register(userNodeId);
            }

            const newNode = {
                id: newId,
                nodeId: userNodeId,  // 복사 시 새 nodeId 생성
                title: original.title + ' (copy)',
                level: original.level,
                x: original.x + offsetX,
                y: original.y + offsetY,
                expanded: original.expanded,
                content: original.content || '',
                children: [],
                path: `${(original.title || '').substring(0, 50) + ' (copy)'}[${userNodeId || newId}].html`,  // title[nodeId].html 형식
                checked: original.checked || false
            };

            if (parentId !== null) {
                newNode.parentId = parentId;
            }

            // 인덱스에 추가
            this._nodeIndex.set(newId, newNode);

            // Recursively copy children
            if (original.children && original.children.length > 0) {
                newNode.children = original.children.map(child =>
                    copyNodeRecursive(child, newNode.id)
                );
            }

            return newNode;
        };

        return copyNodeRecursive(node);
    },

    /**
     * Copy selected node
     * @param {number} nodeId - Node ID to copy
     * @returns {object|null} - Copied node or null
     */
    copyNode(nodeId) {
        try {
            const originalNode = this.findNodeById(nodeId);
            if (!originalNode) {
                console.error(`Node not found: ID ${nodeId}`);
                return null;
            }

            const copiedNode = this.deepCopyNode(originalNode);

            // Add to same level as original
            const nodeInfo = this.findNodeAndParent(nodeId);

            if (!nodeInfo.parent) {
                // Root node - add to root level
                this.mindMapData.push(copiedNode);
            } else {
                // Child node - add to same parent
                if (!nodeInfo.parent.children) {
                    nodeInfo.parent.children = [];
                }
                nodeInfo.parent.children.push(copiedNode);
            }

            this.recalculateAllNodePositions();
            console.log(`Node ${nodeId} copied successfully`);
            return copiedNode;
        } catch (error) {
            console.error('Error copying node:', error);
            return null;
        }
    },

    /**
     * Update node levels recursively
     */
    updateNodeLevels() {
        const updateLevelsRecursive = (nodes, level = 0) => {
            if (!nodes) return;

            nodes.forEach(node => {
                node.level = level;
                if (node.children) {
                    updateLevelsRecursive(node.children, level + 1);
                }
            });
        };

        updateLevelsRecursive(this.mindMapData, 0);
    },

    /**
     * Toggle node checked state
     * @param {number} nodeId - Node ID to toggle
     * @returns {boolean} - Success status
     */
    toggleNodeCheck(nodeId) {
        const node = this.findNodeById(nodeId);
        if (!node) {
            console.error(`Node with ID ${nodeId} not found`);
            return false;
        }

        node.checked = !node.checked;
        console.log(`Node ${nodeId} (${node.title}) checked status: ${node.checked}`);
        return true;
    },

    /**
     * 노드와 모든 하위 노드의 checked 상태를 일괄 설정
     * @param {number} nodeId - 시작 노드 ID
     * @param {boolean} checked - 설정할 체크 상태
     * @returns {number} - 변경된 노드 수
     */
    setSubtreeCheck(nodeId, checked) {
        const node = this.findNodeById(nodeId);
        if (!node) return 0;

        let count = 0;
        const setRecursive = (n) => {
            n.checked = checked;
            count++;
            if (n.children && n.children.length > 0) {
                n.children.forEach(child => setRecursive(child));
            }
        };

        setRecursive(node);
        console.log(`[MindMapData] setSubtreeCheck: ${count}개 노드 → checked=${checked}`);
        return count;
    },

    /**
     * Get node by ID (alias for findNodeById)
     * @param {number} nodeId - Node ID to find
     * @returns {object|null} - Found node or null
     */
    getNodeById(nodeId) {
        return this.findNodeById(nodeId);
    },

    /**
     * 노드 인덱스 재구축 (JSON 로드 후 호출)
     */
    /**
     * 중복 ID 검사 및 자동 수정
     * PATCH API 등에서 nextNodeId 갱신 없이 추가된 노드와 충돌하는 ID를 수정
     */
    // text → title 정규화 (Skill API 등 외부 경로로 생성된 노드에서 text만 있을 수 있음)
    _normalizeNodeTitles(nodes) {
        if (!nodes || !Array.isArray(nodes)) return;
        for (const node of nodes) {
            if (!node.title && node.text) {
                node.title = node.text;
                delete node.text;
            }
            if (node.children && node.children.length > 0) {
                this._normalizeNodeTitles(node.children);
            }
        }
    },

    _fixDuplicateIds() {
        const seenIds = new Map(); // id → 첫 번째 발견된 노드
        let fixed = 0;

        const checkAndFix = (nodes) => {
            if (!nodes) return;
            for (const node of nodes) {
                if (seenIds.has(node.id)) {
                    const oldId = node.id;
                    const newId = this.nextNodeId++;
                    console.warn(`[DuplicateIdFix] 중복 ID 발견: id=${oldId} (title="${node.title}") → 새 ID: ${newId}`);
                    node.id = newId;
                    // parentId 참조는 자식 노드에서 갱신
                    if (node.children) {
                        node.children.forEach(child => { child.parentId = newId; });
                    }
                    fixed++;
                }
                seenIds.set(node.id, node);
                if (node.children) {
                    checkAndFix(node.children);
                }
            }
        };

        checkAndFix(this.mindMapData);
        if (fixed > 0) {
            console.warn(`[DuplicateIdFix] ${fixed}개 중복 ID 수정 완료`);
        }
    },

    _rebuildNodeIndex() {
        this._nodeIndex = new Map();
        const indexRecursive = (nodes) => {
            if (!nodes) return;
            nodes.forEach(node => {
                this._nodeIndex.set(node.id, node);
                if (node.children) {
                    indexRecursive(node.children);
                }
            });
        };
        indexRecursive(this.mindMapData);
        console.log(`[NodeIndex] 인덱스 재구축 완료: ${this._nodeIndex.size}개 노드`);
    },

    /**
     * Initialize with sample data (for testing)
     */
    initializeSampleData() {
        this.initialize();
        console.log('Mind map initialized - empty');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.MyMind3.MindMapData.initialize();
});