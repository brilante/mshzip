/**
 * Node Context Menu - 노드 우클릭 컨텍스트 메뉴
 *
 * 기능:
 * - 노드ID복사 (Ctrl+Shift+C)
 * - 하위 노드 추가
 * - 형제 노드 추가
 * - 제목 편집
 * - 노드 삭제
 */

(function() {
  'use strict';

  // i18n 안전 래퍼: i18n-init.js가 defer로 로드되어 아직 없을 수 있음
  function t(key, fallback) { return (typeof window.t === 'function') ? window.t(key, fallback) : (fallback || key); }

  // 전역 네임스페이스 확인
  window.MyMind3 = window.MyMind3 || {};

  // 메뉴 아이템 정의 (i18nKey로 render 시점에 번역 적용)
  const contextMenuItems = [
    {
      id: 'copy-node-id',
      i18nKey: 'ctxCopyNodeId',
      label: '노드ID복사',
      icon: 'copy',
      action: 'copyNodeId',
      shortcut: 'Ctrl+Shift+C'
    },
    {
      id: 'node-filter',
      i18nKey: 'ctxNodeFilter',
      label: '노드필터',
      icon: 'filter',
      action: 'nodeFilter',
      hasSubmenu: true,
      hidden: function(node) {
        // 루트 노드이거나 필터가 없으면 숨김
        if (node && node.level === 0) return true;
        const filters = window.NodeFilterManager?.getFilters() || [];
        return filters.length === 0;
      }
    },
    { type: 'separator' },
    {
      id: 'add-child',
      i18nKey: 'ctxAddChild',
      label: '하위 노드 추가',
      icon: 'plus',
      action: 'addChild',
      shortcut: 'Tab',
      disabled: function() { return !!window.MyMind3?.isReadOnly; }
    },
    {
      id: 'add-sibling',
      i18nKey: 'ctxAddSibling',
      label: '형제 노드 추가',
      icon: 'plus-circle',
      action: 'addSibling',
      shortcut: 'Enter',
      disabled: function() { return !!window.MyMind3?.isReadOnly; }
    },
    {
      id: 'toggle-subtree-check',
      i18nKey: 'ctxToggleSubtreeCheck',
      label: '하위노드토글',
      icon: 'check-square',
      action: 'toggleSubtreeCheck',
      disabled: function() { return !!window.MyMind3?.isReadOnly; }
    },
    { type: 'separator' },
    {
      id: 'edit-title',
      i18nKey: 'ctxEditTitle',
      label: '제목 편집',
      icon: 'edit',
      action: 'editTitle',
      shortcut: 'F2',
      disabled: function() { return !!window.MyMind3?.isReadOnly; }
    },
    {
      id: 'delete-node',
      i18nKey: 'ctxDeleteNode',
      label: '노드 삭제',
      icon: 'trash',
      action: 'deleteNode',
      shortcut: 'Delete',
      disabled: function(node) { return (node && node.level === 0) || !!window.MyMind3?.isReadOnly; }
    }
  ];

  // SVG 아이콘 정의
  const icons = {
    copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    filter: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    'plus-circle': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
    edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    'check-square': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>'
  };

  /**
   * NodeContextMenu 클래스
   */
  class NodeContextMenu {
    constructor() {
      this.menu = null;
      this.targetNode = null;
      this.isVisible = false;
      this.filterChanged = false; // 필터 변경 여부 추적
      this.init();
    }

    /**
     * 메뉴 초기화
     */
    init() {
      // 메뉴 DOM 생성
      this.menu = document.createElement('div');
      this.menu.className = 'node-context-menu';
      this.menu.style.display = 'none';
      document.body.appendChild(this.menu);

      // 문서 클릭 시 메뉴 닫기
      document.addEventListener('click', this.handleDocumentClick.bind(this));

      // ESC 키로 메뉴 닫기
      document.addEventListener('keydown', this.handleKeyDown.bind(this));

      console.log('[ContextMenu] 초기화 완료');
    }

    /**
     * 문서 클릭 핸들러
     */
    handleDocumentClick(e) {
      if (this.isVisible && !this.menu.contains(e.target)) {
        this.hide();
      }
    }

    /**
     * 키보드 이벤트 핸들러
     */
    handleKeyDown(e) {
      // ESC 키로 메뉴 닫기
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
      }

      // Ctrl+Shift+C: 선택된 노드 ID 복사
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.copySelectedNodeId();
      }
    }

    /**
     * 선택된 노드 ID 복사 (단축키용)
     */
    async copySelectedNodeId() {
      const selectedNodeId = window.MyMind3.MindMapData && window.MyMind3.MindMapData.currentEditingNodeId;
      if (!selectedNodeId) {
        this.showToast(t('ctxNoSelectedNode', '선택된 노드가 없습니다'), 'warning');
        return;
      }

      const node = window.MyMind3.MindMapData.findNodeById(selectedNodeId);
      if (!node) return;

      // nodeId 없으면 생성 (동기 시도 → 실패 시 서버 직접 요청)
      if (!node.nodeId && window.MyMind3.NodeId) {
        node.nodeId = window.MyMind3.NodeId.generate();
        if (!node.nodeId) {
          try {
            node.nodeId = await window.MyMind3.NodeId.generateFromServer('_copy');
          } catch (e) {
            console.error('[ContextMenu] nodeId 서버 생성 실패:', e);
          }
        }
        if (node.nodeId) {
          window.MyMind3.NodeId.Registry.register(node.nodeId);
          if (window.MyMind3.Events) {
            window.MyMind3.Events.emit('mindmap:content-changed');
          }
        }
      }

      if (node.nodeId) {
        await this.copyToClipboard(node.nodeId);
        this.showToast(t('ctxNodeIdCopied', '노드 ID 복사됨: ') + node.nodeId);
      } else {
        this.showToast(t('ctxNodeIdGenFailed', '노드 ID 생성 실패'), 'error');
      }
    }

    /**
     * 메뉴 표시
     * @param {Event} event - 우클릭 이벤트
     * @param {Object} node - 노드 데이터
     */
    show(event, node) {
      event.preventDefault();
      event.stopPropagation();

      this.targetNode = node;

      // nodeId가 없으면 생성 (동기 시도, 실패 시 비동기로 백그라운드 생성)
      if (!node.nodeId && window.MyMind3.NodeId) {
        node.nodeId = window.MyMind3.NodeId.ensure(node);
        if (!node.nodeId) {
          // 풀이 비어서 실패 → 서버에서 직접 생성 (비동기, 메뉴 표시는 바로)
          window.MyMind3.NodeId.generateFromServer('_menu').then(function(id) {
            if (id && !node.nodeId) {
              node.nodeId = id;
              window.MyMind3.NodeId.Registry.register(id);
            }
          }).catch(function(e) {
            console.error('[ContextMenu] 비동기 nodeId 생성 실패:', e);
          });
        }
      }

      this.render();

      // 메뉴 위치 설정
      const x = event.clientX;
      const y = event.clientY;

      this.menu.style.left = x + 'px';
      this.menu.style.top = y + 'px';
      this.menu.style.display = 'block';
      this.isVisible = true;

      // 화면 밖으로 나가지 않도록 조정
      requestAnimationFrame(() => this.adjustPosition());
    }

    /**
     * 메뉴 숨기기
     */
    hide() {
      // 필터 서브메뉴가 열려있으면 먼저 닫기 (저장 트리거)
      this.hideFilterSubmenu();

      this.menu.style.display = 'none';
      this.isVisible = false;
      this.targetNode = null;
    }

    /**
     * 메뉴 렌더링
     */
    render() {
      let html = '';

      for (let i = 0; i < contextMenuItems.length; i++) {
        const item = contextMenuItems[i];

        if (item.type === 'separator') {
          html += '<div class="context-menu-separator"></div>';
          continue;
        }

        // hidden 체크
        const hidden = item.hidden && item.hidden(this.targetNode);
        if (hidden) continue;

        const disabled = item.disabled && item.disabled(this.targetNode);
        const disabledClass = disabled ? ' disabled' : '';
        const hasSubmenuClass = item.hasSubmenu ? ' has-submenu' : '';

        html += '<div class="context-menu-item' + disabledClass + hasSubmenuClass + '" data-action="' + item.action + '">';
        html += '<span class="menu-icon">' + (icons[item.icon] || '') + '</span>';
        const labelText = item.i18nKey ? t(item.i18nKey, item.label) : item.label;
        html += '<span class="menu-label">' + labelText + '</span>';
        if (item.hasSubmenu) {
          html += '<span class="menu-arrow">' + mmIcon('chevron-right', 12) + '</span>';
        } else {
          html += '<span class="menu-shortcut">' + (item.shortcut || '') + '</span>';
        }
        html += '</div>';
      }

      this.menu.innerHTML = html;

      // 이벤트 바인딩
      const menuItems = this.menu.querySelectorAll('.context-menu-item:not(.disabled)');
      for (let i = 0; i < menuItems.length; i++) {
        const menuItem = menuItems[i];

        // 서브메뉴가 있는 경우 마우스오버 이벤트
        if (menuItem.classList.contains('has-submenu')) {
          menuItem.addEventListener('mouseenter', this.handleSubmenuHover.bind(this));
          menuItem.addEventListener('mouseleave', this.handleSubmenuLeave.bind(this));
        } else {
          menuItem.addEventListener('click', this.handleMenuItemClick.bind(this));
        }
      }
    }

    /**
     * 서브메뉴 호버 핸들러
     */
    handleSubmenuHover(e) {
      const action = e.currentTarget.dataset.action;

      if (action === 'nodeFilter') {
        this.showFilterSubmenu(e.currentTarget);
      }
    }

    /**
     * 서브메뉴 떠남 핸들러
     */
    handleSubmenuLeave(e) {
      // 서브메뉴로 이동 중이면 닫지 않음
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && relatedTarget.closest('.context-submenu')) {
        return;
      }

      // 약간의 지연 후 서브메뉴 닫기
      setTimeout(() => {
        if (!this.isHoveringSubmenu) {
          this.hideFilterSubmenu();
        }
      }, 100);
    }

    /**
     * 필터 서브메뉴 표시
     */
    showFilterSubmenu(menuItem) {
      // 기존 서브메뉴 제거
      this.hideFilterSubmenu();

      const filters = window.NodeFilterManager?.getFilters() || [];
      if (filters.length === 0) return;

      // 노드에 적용된 필터 목록
      const nodeFilters = this.targetNode.filters || [];

      // 서브메뉴 생성
      const submenu = document.createElement('div');
      submenu.className = 'context-submenu node-filter-submenu';

      let html = '';
      filters.forEach(filter => {
        const isChecked = nodeFilters.includes(filter.id);
        html += '<label class="submenu-filter-item" data-filter-id="' + filter.id + '">';
        html += '<input type="checkbox"' + (isChecked ? ' checked' : '') + '>';
        html += '<span class="filter-color-tag" style="background-color: ' + filter.color + ';"></span>';
        html += '<span class="filter-label">' + filter.name + '</span>';
        html += '</label>';
      });

      submenu.innerHTML = html;

      // 위치 설정 (메뉴 아이템 오른쪽)
      const itemRect = menuItem.getBoundingClientRect();
      submenu.style.left = itemRect.right + 'px';
      submenu.style.top = itemRect.top + 'px';

      document.body.appendChild(submenu);
      this.filterSubmenu = submenu;

      // 서브메뉴 이벤트
      submenu.addEventListener('mouseenter', () => {
        this.isHoveringSubmenu = true;
      });
      submenu.addEventListener('mouseleave', () => {
        this.isHoveringSubmenu = false;
        this.hideFilterSubmenu();
      });

      // 체크박스 이벤트
      submenu.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          e.stopPropagation(); // 이벤트 버블링 방지 - 메뉴가 닫히지 않도록
          const filterId = e.target.closest('.submenu-filter-item').dataset.filterId;
          this.toggleNodeFilter(filterId, e.target.checked);
        });
        // 클릭 이벤트도 버블링 방지
        checkbox.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      });
      // 서브메뉴 자체의 클릭 이벤트 버블링 방지
      submenu.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    /**
     * 필터 서브메뉴 숨기기
     */
    hideFilterSubmenu() {
      if (this.filterSubmenu) {
        this.filterSubmenu.remove();
        this.filterSubmenu = null;
      }

      // 필터가 변경되었으면 즉시 저장
      if (this.filterChanged) {
        this.filterChanged = false;
        this.saveImmediately();
      }
    }

    /**
     * 즉시 저장 (지연 없이)
     */
    saveImmediately() {
      console.log('[ContextMenu] 필터 변경으로 즉시 저장 시작');
      if (window.autoSaveMindMap) {
        window.autoSaveMindMap();
        console.log('[ContextMenu] autoSaveMindMap 호출 완료');
      } else if (window.MyMind3?.Events) {
        window.MyMind3.Events.emit('action:save-mindmap');
        console.log('[ContextMenu] action:save-mindmap 이벤트 발생');
      }
    }

    /**
     * 노드 필터 토글
     */
    toggleNodeFilter(filterId, isChecked) {
      if (!this.targetNode) return;

      // 노드에 filters 배열 초기화
      if (!this.targetNode.filters) {
        this.targetNode.filters = [];
      }

      if (isChecked) {
        // 필터 추가
        if (!this.targetNode.filters.includes(filterId)) {
          this.targetNode.filters.push(filterId);
        }
      } else {
        // 필터 제거
        this.targetNode.filters = this.targetNode.filters.filter(id => id !== filterId);
      }

      // 필터 변경 플래그 설정
      this.filterChanged = true;

      // 노드 UI 업데이트
      this.updateNodeFilterTags(this.targetNode);

      // 변경 이벤트 발생
      if (window.MyMind3.Events) {
        window.MyMind3.Events.emit('mindmap:content-changed');
      }

      console.log('[ContextMenu] 노드 필터 변경:', this.targetNode.id, this.targetNode.filters);
    }

    /**
     * 노드 필터 태그 업데이트
     */
    updateNodeFilterTags(node) {
      const nodeElement = document.querySelector('.mindmap-node[data-id="' + node.id + '"]');
      if (!nodeElement) {
        console.warn('[ContextMenu] 노드 요소를 찾을 수 없음:', node.id);
        return;
      }

      // node-content-container 찾기
      const nodeContentContainer = nodeElement.querySelector('.node-content-container');
      if (!nodeContentContainer) {
        console.warn('[ContextMenu] node-content-container를 찾을 수 없음');
        return;
      }

      // 기존 태그 컨테이너 제거
      const existingTags = nodeContentContainer.querySelector('.node-filter-tags');
      if (existingTags) {
        existingTags.remove();
      }

      // 필터가 없으면 너비 갱신 후 종료
      if (!node.filters || node.filters.length === 0) {
        nodeElement.style.width = `${window.MyMind3.MindMapData.getNodeWidth(node)}px`;
        window.MyMind3.MindMapData.recalculateAllNodePositions();
        if (window.MyMind2NodeRenderer) {
          window.MyMind2NodeRenderer.renderMindMap();
        }
        return;
      }

      // 태그 컨테이너 생성
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

      // 노드 컨텐츠 컨테이너의 마지막에 추가 (체크박스, 제목 다음)
      nodeContentContainer.appendChild(tagsContainer);

      console.log('[ContextMenu] 필터 태그 추가됨:', node.id, node.filters);

      // 노드 너비 실시간 갱신 (필터 수 변경에 따른 동적 너비)
      nodeElement.style.width = `${window.MyMind3.MindMapData.getNodeWidth(node)}px`;

      // 전체 노드 위치 재계산 + 연결선 갱신
      window.MyMind3.MindMapData.recalculateAllNodePositions();
      if (window.MyMind2NodeRenderer) {
        window.MyMind2NodeRenderer.renderMindMap();
      }
    }

    /**
     * 메뉴 아이템 클릭 핸들러
     */
    async handleMenuItemClick(e) {
      const action = e.currentTarget.dataset.action;
      await this.executeAction(action);
      this.hide();
    }

    /**
     * 액션 실행
     * @param {string} action - 액션 이름
     */
    async executeAction(action) {
      if (!this.targetNode) return;

      switch (action) {
        case 'copyNodeId':
          await this.copyNodeId();
          break;

        case 'addChild':
          if (window.MyMind3.NodeRenderer && window.MyMind3.NodeRenderer.addChildNode) {
            window.MyMind3.NodeRenderer.addChildNode(this.targetNode.id);
          } else if (window.MyMind2NodeRenderer) {
            // mymind2 렌더러 사용 시
            const title = prompt(t('ctxEnterNewNodeTitle', '새 노드 제목을 입력하세요:'));
            if (title && title.trim()) {
              window.MyMind3.MindMapData.createChildNode(this.targetNode.id, title.trim());
              if (window.MyMind2NodeRenderer.renderMindMap) {
                window.MyMind2NodeRenderer.renderMindMap();
              }
            }
          }
          break;

        case 'addSibling':
          this.addSiblingNode();
          break;

        case 'toggleSubtreeCheck':
          this.toggleSubtreeCheck();
          break;

        case 'editTitle':
          if (window.MyMind3.NodeRenderer && window.MyMind3.NodeRenderer.editNodeTitle) {
            window.MyMind3.NodeRenderer.editNodeTitle(this.targetNode.id);
          } else {
            // 기본 편집 로직
            const newTitle = prompt(t('ctxEditNodeTitle', '노드 제목 편집:'), this.targetNode.title);
            if (newTitle !== null && newTitle.trim()) {
              this.targetNode.title = newTitle.trim();
              if (window.MyMind2NodeRenderer && window.MyMind2NodeRenderer.renderMindMap) {
                window.MyMind2NodeRenderer.renderMindMap();
              }
            }
          }
          break;

        case 'deleteNode':
          // confirmDeleteNode 사용 (서버 파일 삭제 + 메모리 삭제 + JSON 저장 포함)
          if (window.MyMind3?.NodeRenderer?.confirmDeleteNode) {
            window.MyMind3.NodeRenderer.confirmDeleteNode(this.targetNode.id);
          } else if (window.MyMind2NodeRenderer?.confirmDeleteNode) {
            window.MyMind2NodeRenderer.confirmDeleteNode(this.targetNode.id);
          }
          break;

        default:
          console.warn('[ContextMenu] 알 수 없는 액션:', action);
      }
    }

    /**
     * 노드 ID 복사
     */
    async copyNodeId() {
      if (!this.targetNode) return;

      // nodeId가 없으면 생성 (동기 시도 → 실패 시 서버 직접 요청)
      if (!this.targetNode.nodeId && window.MyMind3.NodeId) {
        this.targetNode.nodeId = window.MyMind3.NodeId.generate();
        if (!this.targetNode.nodeId) {
          try {
            this.targetNode.nodeId = await window.MyMind3.NodeId.generateFromServer('_copy');
          } catch (e) {
            console.error('[ContextMenu] nodeId 서버 생성 실패:', e);
          }
        }
        if (this.targetNode.nodeId) {
          window.MyMind3.NodeId.Registry.register(this.targetNode.nodeId);
          if (window.MyMind3.Events) {
            window.MyMind3.Events.emit('mindmap:content-changed');
          }
        }
      }

      if (this.targetNode.nodeId) {
        const success = await this.copyToClipboard(this.targetNode.nodeId);
        if (success) {
          this.showToast(t('ctxNodeIdCopied', '노드 ID 복사됨: ') + this.targetNode.nodeId);
        } else {
          this.showToast(t('ctxCopyFailed', '복사 실패'), 'error');
        }
      } else {
        this.showToast(t('ctxNodeIdGenFailed', '노드 ID 생성 실패'), 'error');
      }
    }

    /**
     * 형제 노드 추가
     */
    addSiblingNode() {
      const nodeInfo = window.MyMind3.MindMapData.findNodeAndParent(this.targetNode.id);
      if (!nodeInfo) return;

      const title = prompt(t('ctxEnterSiblingTitle', '새 형제 노드 제목을 입력하세요:'));
      if (!title || !title.trim()) return;

      if (nodeInfo.parent) {
        // 자식 노드인 경우 - 같은 부모에 추가
        window.MyMind3.MindMapData.createChildNode(nodeInfo.parent.id, title.trim());
      } else {
        // 루트 노드인 경우 - 새 루트 노드 추가
        window.MyMind3.MindMapData.createMainTitle(title.trim());
      }

      // 재렌더링
      if (window.MyMind2NodeRenderer && window.MyMind2NodeRenderer.renderMindMap) {
        window.MyMind2NodeRenderer.renderMindMap();
      }
    }

    /**
     * 하위노드토글 - 해당 노드 포함 모든 하위 노드의 체크 상태를 일괄 토글
     */
    toggleSubtreeCheck() {
      if (!this.targetNode) return;

      const mindmapData = window.MyMind3.MindMapData;
      if (!mindmapData) return;

      const node = mindmapData.findNodeById(this.targetNode.id);
      if (!node) return;

      // 현재 노드의 checked 상태 반전 → 서브트리 전체에 적용
      const newState = !node.checked;
      const count = mindmapData.setSubtreeCheck(this.targetNode.id, newState);

      // UI 일괄 업데이트
      if (window.MyMind2NodeRenderer && window.MyMind2NodeRenderer.updateSubtreeCheckboxUI) {
        window.MyMind2NodeRenderer.updateSubtreeCheckboxUI(this.targetNode.id);
      }

      // 자동 저장
      if (window.autoSaveMindMap) {
        window.autoSaveMindMap();
      }

      console.log(`[ContextMenu] 하위노드토글: ${count}개 노드 → checked=${newState}`);
    }

    /**
     * 클립보드에 복사
     * @param {string} text - 복사할 텍스트
     * @returns {Promise<boolean>}
     */
    async copyToClipboard(text) {
      if (window.MyMind3.NodeId && window.MyMind3.NodeId.copyToClipboard) {
        return await window.MyMind3.NodeId.copyToClipboard(text);
      }

      // 폴백
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.error('[ContextMenu] 클립보드 복사 실패:', err);
        return false;
      }
    }

    /**
     * 토스트 메시지 표시
     * @param {string} message - 메시지
     * @param {string} type - 타입 (success, warning, error)
     */
    showToast(message, type) {
      type = type || 'success';

      // MyMind3.Toast 사용 시도
      if (window.MyMind3.Toast && window.MyMind3.Toast.show) {
        window.MyMind3.Toast.show(message, type);
        return;
      }

      // 기본 토스트 구현
      const toast = document.createElement('div');
      toast.className = 'context-menu-toast context-menu-toast-' + type;
      toast.textContent = message;
      document.body.appendChild(toast);

      // 애니메이션
      requestAnimationFrame(function() {
        toast.classList.add('show');
      });

      // 3초 후 제거
      setTimeout(function() {
        toast.classList.remove('show');
        setTimeout(function() {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }, 3000);
    }

    /**
     * 메뉴 위치 조정 (화면 밖으로 나가지 않도록)
     */
    adjustPosition() {
      const rect = this.menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (rect.right > viewportWidth) {
        this.menu.style.left = (viewportWidth - rect.width - 10) + 'px';
      }
      if (rect.bottom > viewportHeight) {
        this.menu.style.top = (viewportHeight - rect.height - 10) + 'px';
      }
    }
  }

  // 싱글톤 인스턴스 생성 및 전역 등록
  let instance = null;

  function getInstance() {
    if (!instance) {
      instance = new NodeContextMenu();
    }
    return instance;
  }

  // 전역 네임스페이스에 등록
  window.MyMind3.ContextMenu = {
    show: function(event, node) {
      getInstance().show(event, node);
    },
    hide: function() {
      getInstance().hide();
    },
    getInstance: getInstance
  };

  console.log('[ContextMenu] 모듈 로드 완료');
})();
