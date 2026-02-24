/**
 * 노드필터 관리 모듈
 * @file node-filter.js
 * @description 마인드맵 노드에 필터(태그/라벨) 적용 및 관리
 * @version 1.0.0
 */

(function() {
  'use strict';

  // 색상 팔레트 (8x3 = 24색)
  const COLOR_PALETTE = [
    // 1행 (기본)
    '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#1F2937', '#F3F4F6',
    // 2행 (밝은)
    '#FCA5A5', '#FDBA74', '#FDE047', '#86EFAC', '#93C5FD', '#C4B5FD', '#6B7280', '#E5E7EB',
    // 3행 (어두운)
    '#B91C1C', '#C2410C', '#A16207', '#15803D', '#1D4ED8', '#6D28D9', '#111827', '#9CA3AF'
  ];

  // 밝은 색상 목록 (체크 표시 색상 결정용)
  const LIGHT_COLORS = ['#F3F4F6', '#FDE047', '#86EFAC', '#E5E7EB', '#FDBA74', '#FCA5A5', '#93C5FD', '#C4B5FD'];

  /**
   * 노드필터 관리자 클래스
   */
  class NodeFilterManager {
    constructor() {
      this.filters = [];
      this.selectedColor = null;
      this.editingFilterId = null;
      this.isOpen = false;
      this.hasChanges = false;

      this.init();
    }

    /**
     * 초기화
     */
    init() {
      this.cacheElements();
      this.bindEvents();
      this.renderColorPalette();
      this.updateButtonState();
      this.observeMindMapChanges();
      console.log('[NodeFilter] 모듈 초기화 완료');
    }

    /**
     * 노드 존재 여부에 따라 버튼 상태 업데이트
     */
    updateButtonState() {
      if (!this.nodeFilterBtn) return;

      const hasNodes = this.hasAnyNodes();

      if (hasNodes) {
        this.nodeFilterBtn.disabled = false;
        this.nodeFilterBtn.title = window.MyMind3?.i18n?.t('nodeFilterBtn') || '노드 필터 관리';
      } else {
        this.nodeFilterBtn.disabled = true;
        this.nodeFilterBtn.title = window.MyMind3?.i18n?.t('nodeFilterNoNodes') || '노드가 없습니다';
      }
    }

    /**
     * 마인드맵에 노드가 있는지 확인
     */
    hasAnyNodes() {
      const mindMapData = window.MyMind3?.MindMapData?.mindMapData;

      if (!mindMapData || !Array.isArray(mindMapData)) {
        return false;
      }

      // 빈 배열이거나 모든 노드가 비어있으면 false
      return mindMapData.length > 0 && mindMapData.some(node => node && Object.keys(node).length > 0);
    }

    /**
     * 마인드맵 데이터 변경 감지
     */
    observeMindMapChanges() {
      // MutationObserver로 마인드맵 컨테이너 변경 감지
      const mindmapContainer = document.getElementById('mindmap');
      if (mindmapContainer) {
        const observer = new MutationObserver(() => {
          this.updateButtonState();
        });
        observer.observe(mindmapContainer, { childList: true, subtree: true });
      }

      // 커스텀 이벤트 리스너 (마인드맵 데이터 변경 시)
      document.addEventListener('mindmap:dataChanged', () => {
        this.updateButtonState();
      });

      // 주기적으로 버튼 상태 확인 (백업)
      setInterval(() => {
        this.updateButtonState();
      }, 2000);
    }

    /**
     * DOM 요소 캐싱
     */
    cacheElements() {
      this.overlay = document.getElementById('nodeFilterOverlay');
      this.popup = this.overlay?.querySelector('.node-filter-popup');
      this.closeBtn = document.getElementById('nodeFilterClose');
      this.nameInput = document.getElementById('filterNameInput');
      this.colorGrid = document.getElementById('filterColorGrid');
      this.addBtn = document.getElementById('addFilterBtn');
      this.updateBtn = document.getElementById('updateFilterBtn');
      this.cancelEditBtn = document.getElementById('cancelEditBtn');
      this.filterList = document.getElementById('filterList');
      this.saveBtn = document.getElementById('saveFiltersBtn');
      this.cancelBtn = document.getElementById('cancelFiltersBtn');
      this.addSection = document.getElementById('nodeFilterAddSection');
      this.nodeFilterBtn = document.getElementById('nodeFilterBtn');
    }

    /**
     * 이벤트 바인딩
     */
    bindEvents() {
      // 노드필터 버튼 클릭 → 팝업 열기
      if (this.nodeFilterBtn) {
        this.nodeFilterBtn.addEventListener('click', () => this.open());
      }

      // 닫기 버튼
      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', () => this.close());
      }

      // 오버레이 클릭 → 팝업 닫기
      if (this.overlay) {
        this.overlay.addEventListener('click', (e) => {
          if (e.target === this.overlay) {
            this.close();
          }
        });
      }

      // ESC 키 → 팝업 닫기
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          this.close();
        }
      });

      // 필터 추가 버튼
      if (this.addBtn) {
        this.addBtn.addEventListener('click', () => this.addFilter());
      }

      // 필터 업데이트 버튼
      if (this.updateBtn) {
        this.updateBtn.addEventListener('click', () => this.updateFilter());
      }

      // 수정 취소 버튼
      if (this.cancelEditBtn) {
        this.cancelEditBtn.addEventListener('click', () => this.cancelEdit());
      }

      // 저장 버튼
      if (this.saveBtn) {
        this.saveBtn.addEventListener('click', () => this.save());
      }

      // 취소 버튼
      if (this.cancelBtn) {
        this.cancelBtn.addEventListener('click', () => this.close());
      }

      // Enter 키 → 필터 추가
      if (this.nameInput) {
        this.nameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            if (this.editingFilterId) {
              this.updateFilter();
            } else {
              this.addFilter();
            }
          }
        });
      }
    }

    /**
     * 색상 팔레트 렌더링
     */
    renderColorPalette() {
      if (!this.colorGrid) return;

      this.colorGrid.innerHTML = '';

      COLOR_PALETTE.forEach((color) => {
        const box = document.createElement('div');
        box.className = 'filter-color-box';
        box.style.backgroundColor = color;
        box.dataset.color = color;

        // 밝은 색상 표시 (체크 표시 색상 결정용)
        if (LIGHT_COLORS.includes(color)) {
          box.dataset.light = 'true';
        }

        box.addEventListener('click', () => this.selectColor(color));

        this.colorGrid.appendChild(box);
      });
    }

    /**
     * 색상 선택
     */
    selectColor(color) {
      this.selectedColor = color;

      // 이전 선택 해제
      this.colorGrid.querySelectorAll('.filter-color-box').forEach((box) => {
        box.classList.remove('selected');
      });

      // 새 선택 표시
      const selectedBox = this.colorGrid.querySelector(`[data-color="${color}"]`);
      if (selectedBox) {
        selectedBox.classList.add('selected');
      }
    }

    /**
     * 필터 ID 자동 발급
     */
    generateFilterId() {
      const usedNumbers = this.filters
        .map((f) => parseInt(f.id.substring(1)))
        .filter((n) => !isNaN(n));

      let newNumber = 1;
      while (usedNumbers.includes(newNumber)) {
        newNumber++;
      }

      return 'f' + String(newNumber).padStart(3, '0');
    }

    /**
     * 필터 추가
     */
    addFilter() {
      const name = this.nameInput?.value.trim();

      // 유효성 검증
      if (!name) {
        alert(t('filterEnterName', '필터 이름을 입력하세요.'));
        this.nameInput?.focus();
        return;
      }

      if (name.length > 20) {
        alert(t('filterNameMaxLength', '필터 이름은 최대 20자입니다.'));
        return;
      }

      if (!this.selectedColor) {
        alert(t('filterSelectColor', '필터 색상을 선택하세요.'));
        return;
      }

      // 새 필터 생성
      const newFilter = {
        id: this.generateFilterId(),
        name: name,
        color: this.selectedColor,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.filters.push(newFilter);
      this.hasChanges = true;

      // 폼 초기화
      this.resetForm();

      // 목록 갱신
      this.renderFilterList();

      // 즉시 저장
      this.saveToMindmap();

      console.log('[NodeFilter] 필터 추가:', newFilter);
    }

    /**
     * 필터 수정 시작
     */
    startEdit(filterId) {
      const filter = this.filters.find((f) => f.id === filterId);
      if (!filter) return;

      this.editingFilterId = filterId;

      // 폼에 값 로드
      if (this.nameInput) {
        this.nameInput.value = filter.name;
      }
      this.selectColor(filter.color);

      // 수정 모드 UI
      this.addSection?.classList.add('edit-mode');

      // 섹션 타이틀 변경
      const title = this.addSection?.querySelector('h4');
      if (title) {
        title.textContent = t('filterEditTitle', '필터 수정');
        title.dataset.i18n = 'filterEditTitle';
      }

      this.nameInput?.focus();
    }

    /**
     * 필터 업데이트
     */
    updateFilter() {
      if (!this.editingFilterId) return;

      const name = this.nameInput?.value.trim();

      // 유효성 검증
      if (!name) {
        alert(t('filterEnterName', '필터 이름을 입력하세요.'));
        this.nameInput?.focus();
        return;
      }

      if (name.length > 20) {
        alert(t('filterNameMaxLength', '필터 이름은 최대 20자입니다.'));
        return;
      }

      if (!this.selectedColor) {
        alert(t('filterSelectColor', '필터 색상을 선택하세요.'));
        return;
      }

      // 필터 업데이트
      const filter = this.filters.find((f) => f.id === this.editingFilterId);
      if (filter) {
        filter.name = name;
        filter.color = this.selectedColor;
        filter.updatedAt = new Date().toISOString();
        this.hasChanges = true;
      }

      // 수정 모드 종료
      this.cancelEdit();

      // 목록 갱신
      this.renderFilterList();

      // 즉시 저장
      this.saveToMindmap();

      console.log('[NodeFilter] 필터 수정:', filter);
    }

    /**
     * 수정 취소
     */
    cancelEdit() {
      this.editingFilterId = null;
      this.resetForm();

      // 수정 모드 UI 해제
      this.addSection?.classList.remove('edit-mode');

      // 섹션 타이틀 복원
      const title = this.addSection?.querySelector('h4');
      if (title) {
        title.textContent = t('filterAddTitle', '필터 추가');
        title.dataset.i18n = 'filterAddTitle';
      }
    }

    /**
     * 필터 삭제
     */
    deleteFilter(filterId) {
      const filter = this.filters.find((f) => f.id === filterId);
      if (!filter) return;

      // 해당 필터가 적용된 노드 수 확인
      const nodeCount = this.countNodesWithFilter(filterId);

      // 확인 다이얼로그
      this.showDeleteConfirm(filter, nodeCount, () => {
        // 필터 삭제
        this.filters = this.filters.filter((f) => f.id !== filterId);
        this.hasChanges = true;

        // 노드에서 필터 제거
        this.removeFilterFromNodes(filterId);

        // 목록 갱신
        this.renderFilterList();

        // 즉시 저장
        this.saveToMindmap();

        console.log('[NodeFilter] 필터 삭제:', filterId);
      });
    }

    /**
     * 삭제 확인 다이얼로그
     */
    showDeleteConfirm(filter, nodeCount, onConfirm) {
      const confirmDiv = document.createElement('div');
      confirmDiv.className = 'filter-delete-confirm';
      confirmDiv.innerHTML = `
        <div class="filter-delete-confirm-box">
          <p>
            <strong>"${filter.name} (${filter.id})"</strong> 필터를 삭제하시겠습니까?
            ${nodeCount > 0 ? `<br>이 필터가 적용된 ${nodeCount}개의 노드에서 필터가 제거됩니다.` : ''}
          </p>
          <div class="filter-delete-confirm-buttons">
            <button class="btn-confirm-cancel">취소</button>
            <button class="btn-confirm-delete">삭제</button>
          </div>
        </div>
      `;

      document.body.appendChild(confirmDiv);

      // 취소 버튼
      confirmDiv.querySelector('.btn-confirm-cancel').addEventListener('click', () => {
        confirmDiv.remove();
      });

      // 삭제 버튼
      confirmDiv.querySelector('.btn-confirm-delete').addEventListener('click', () => {
        confirmDiv.remove();
        onConfirm();
      });

      // 배경 클릭 → 닫기
      confirmDiv.addEventListener('click', (e) => {
        if (e.target === confirmDiv) {
          confirmDiv.remove();
        }
      });
    }

    /**
     * 필터가 적용된 노드 수 계산
     */
    countNodesWithFilter(filterId) {
      // MindMapData에서 노드 가져오기
      if (typeof MyMind3 !== 'undefined' && MyMind3.MindMapData) {
        const nodes = MyMind3.MindMapData.mindMapData;
        if (nodes && nodes.length > 0) {
          return this.countNodesRecursive(nodes, filterId);
        }
      }
      return 0;
    }

    countNodesRecursive(nodes, filterId) {
      let count = 0;
      nodes.forEach((node) => {
        if (node.filters && node.filters.includes(filterId)) {
          count++;
        }
        if (node.children) {
          count += this.countNodesRecursive(node.children, filterId);
        }
      });
      return count;
    }

    /**
     * 노드에서 필터 제거
     */
    removeFilterFromNodes(filterId) {
      if (typeof MyMind3 !== 'undefined' && MyMind3.MindMapData) {
        const nodes = MyMind3.MindMapData.mindMapData;
        if (nodes && nodes.length > 0) {
          this.removeFilterRecursive(nodes, filterId);
        }
      }
    }

    removeFilterRecursive(nodes, filterId) {
      nodes.forEach((node) => {
        if (node.filters) {
          node.filters = node.filters.filter((f) => f !== filterId);
        }
        if (node.children) {
          this.removeFilterRecursive(node.children, filterId);
        }
      });
    }

    /**
     * 필터 목록 렌더링
     */
    renderFilterList() {
      if (!this.filterList) return;

      if (this.filters.length === 0) {
        this.filterList.innerHTML = '<div class="filter-list-empty" data-i18n="filterListEmpty">필터가 없습니다</div>';
        return;
      }

      this.filterList.innerHTML = this.filters.map((filter) => `
        <div class="filter-item" data-filter-id="${filter.id}">
          <div class="filter-item-color" style="background-color: ${filter.color}"></div>
          <div class="filter-item-info">
            <span class="filter-item-name">${this.escapeHtml(filter.name)}</span><span class="filter-item-id">[${filter.id}]</span>
          </div>
          <div class="filter-item-actions">
            <button class="btn-filter-edit" data-action="edit" data-i18n="filterEditBtn">수정</button>
            <button class="btn-filter-delete" data-action="delete" data-i18n="filterDeleteBtn">삭제</button>
          </div>
        </div>
      `).join('');

      // 수정/삭제 버튼 이벤트
      this.filterList.querySelectorAll('.filter-item').forEach((item) => {
        const filterId = item.dataset.filterId;

        item.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
          this.startEdit(filterId);
        });

        item.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
          this.deleteFilter(filterId);
        });
      });
    }

    /**
     * 폼 초기화
     */
    resetForm() {
      if (this.nameInput) {
        this.nameInput.value = '';
      }
      this.selectedColor = null;
      this.colorGrid?.querySelectorAll('.filter-color-box').forEach((box) => {
        box.classList.remove('selected');
      });
    }

    /**
     * HTML 이스케이프
     */
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    /**
     * 팝업 열기
     */
    open() {
      if (!this.overlay) return;

      // 기존 필터 로드
      this.loadFromMindmap();

      // 팝업 표시
      this.overlay.classList.add('active');
      this.isOpen = true;
      this.hasChanges = false;

      // 목록 렌더링
      this.renderFilterList();

      // 폼 초기화
      this.resetForm();
      this.cancelEdit();

      // 포커스
      setTimeout(() => {
        this.nameInput?.focus();
      }, 100);

      console.log('[NodeFilter] 팝업 열림');
    }

    /**
     * 팝업 닫기
     */
    close() {
      if (!this.overlay) return;

      // 변경사항 확인
      if (this.hasChanges) {
        // 이미 즉시 저장되므로 확인 불필요
      }

      this.overlay.classList.remove('active');
      this.isOpen = false;
      this.editingFilterId = null;

      console.log('[NodeFilter] 팝업 닫힘');
    }

    /**
     * 저장
     */
    async save() {
      this.saveToMindmap();

      // 루트 노드 위 필터 리스트 갱신
      this.refreshNodeFilterListOnSave();

      // JSON 파일에 즉시 저장
      if (window.MyMind3Simple?.saveMindmapSilently) {
        const saved = await window.MyMind3Simple.saveMindmapSilently();
        if (saved) {
          console.log('[NodeFilter] JSON 파일 저장 완료');
        }
      }

      this.close();
      console.log('[NodeFilter] 저장 완료');
    }

    /**
     * 마인드맵에서 필터 로드
     */
    loadFromMindmap() {
      if (typeof MyMind3 !== 'undefined' && MyMind3.MindMapData) {
        // MindMapData 객체의 filters 속성에서 로드
        this.filters = MyMind3.MindMapData.filters || [];
      } else {
        // 로컬 스토리지에서 로드 (폴백)
        try {
          const stored = localStorage.getItem('nodeFilters');
          this.filters = stored ? JSON.parse(stored) : [];
        } catch (e) {
          this.filters = [];
        }
      }
      console.log('[NodeFilter] 필터 로드:', this.filters.length, '개');
    }

    /**
     * 마인드맵에 필터 저장
     */
    saveToMindmap() {
      if (typeof MyMind3 !== 'undefined' && MyMind3.MindMapData) {
        // MindMapData 객체에 filters 속성으로 저장
        MyMind3.MindMapData.filters = this.filters;
        // 저장 버튼 활성화 (변경사항 표시)
        const saveMapBtn = document.getElementById('saveMapBtn');
        if (saveMapBtn) {
          saveMapBtn.disabled = !!window.MyMind3?.isReadOnly;
        }
      }
      // 항상 로컬 스토리지에도 저장 (백업)
      try {
        localStorage.setItem('nodeFilters', JSON.stringify(this.filters));
      } catch (e) {
        console.error('[NodeFilter] 저장 실패:', e);
      }
      console.log('[NodeFilter] 필터 저장:', this.filters.length, '개');
    }

    /**
     * 필터 목록 반환
     */
    getFilters() {
      return this.filters;
    }

    /**
     * 필터 ID로 필터 조회
     */
    getFilterById(filterId) {
      return this.filters.find((f) => f.id === filterId);
    }

    /**
     * 모든 노드의 필터 태그 갱신
     * 마인드맵 로드 후 NodeFilterManager가 초기화된 뒤 호출
     */
    refreshAllNodeFilterTags() {
      const allNodes = document.querySelectorAll('.mindmap-node');
      const mindMapData = window.MyMind3?.MindMapData?.mindMapData || [];

      // 노드 ID로 데이터를 빠르게 찾기 위한 맵 생성
      const nodeDataMap = new Map();
      const buildMap = (nodes) => {
        nodes.forEach(node => {
          nodeDataMap.set(node.id, node);
          if (node.children) buildMap(node.children);
        });
      };
      buildMap(mindMapData);

      allNodes.forEach((nodeElement, index) => {
        // 노드 요소에서 데이터 찾기 (인덱스 기반 - 렌더링 순서와 동일)
        const nodeData = this.findNodeDataByElement(nodeElement, nodeDataMap, mindMapData);
        if (!nodeData || !nodeData.filters || nodeData.filters.length === 0) return;

        // 기존 필터 태그 컨테이너 찾기
        let tagsContainer = nodeElement.querySelector('.node-filter-tags');

        // 없으면 생성
        if (!tagsContainer) {
          const nodeContentContainer = nodeElement.querySelector('.node-content-container');
          if (nodeContentContainer) {
            tagsContainer = document.createElement('div');
            tagsContainer.className = 'node-filter-tags';
            nodeContentContainer.appendChild(tagsContainer);
          }
        }

        if (!tagsContainer) return;

        // 기존 태그 제거 후 새로 렌더링
        tagsContainer.innerHTML = '';

        nodeData.filters.forEach(filterId => {
          const filter = this.getFilterById(filterId);
          if (filter) {
            const tag = document.createElement('span');
            tag.className = 'node-filter-tag';
            tag.style.backgroundColor = filter.color;
            tag.title = filter.name;
            tagsContainer.appendChild(tag);
          }
        });
      });

      console.log('[NodeFilter] 모든 노드 필터 태그 갱신 완료');
    }

    /**
     * DOM 요소에서 노드 데이터 찾기
     */
    findNodeDataByElement(nodeElement, nodeDataMap, mindMapData) {
      // 노드 텍스트로 찾기 (가장 확실한 방법)
      const nodeContent = nodeElement.querySelector('.node-content');
      if (!nodeContent) return null;

      const title = nodeContent.title || nodeContent.textContent?.trim();

      // 재귀적으로 노드 찾기
      const findByTitle = (nodes, targetTitle) => {
        for (const node of nodes) {
          if (node.title === targetTitle) return node;
          if (node.children) {
            const found = findByTitle(node.children, targetTitle);
            if (found) return found;
          }
        }
        return null;
      };

      return findByTitle(mindMapData, title);
    }

    // ============================================
    // 루트 노드 위 필터 리스트 기능
    // ============================================

    /**
     * 마인드맵 JSON에서 필터 읽기
     * @returns {Array} 필터 목록
     */
    getFiltersFromMindmap() {
      if (typeof MyMind3 !== 'undefined' && MyMind3.MindMapData) {
        return MyMind3.MindMapData.filters || [];
      }
      // 로컬 스토리지 폴백
      try {
        const stored = localStorage.getItem('nodeFilters');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    }

    /**
     * 마인드맵 JSON에 필터 저장
     * @param {Array} filters - 저장할 필터 목록
     */
    saveFiltersToMindmap(filters) {
      if (typeof MyMind3 !== 'undefined' && MyMind3.MindMapData) {
        MyMind3.MindMapData.filters = filters;
      }
      // 로컬 스토리지에도 저장
      try {
        localStorage.setItem('nodeFilters', JSON.stringify(filters));
      } catch (e) {
        console.error('[NodeFilter] 필터 저장 실패:', e);
      }
    }

    /**
     * 루트 노드 위 필터 아이템 DOM 생성
     * @param {Object} filter - 필터 데이터
     * @param {boolean} isAll - "전체" 버튼 여부
     * @returns {HTMLElement} 필터 아이템 요소
     */
    createNodeFilterItem(filter, isAll = false) {
      if (isAll) {
        // "전체" 버튼 - 체크박스 없이 버튼으로 생성
        const button = document.createElement('button');
        button.className = 'filter-item filter-item-all';
        button.dataset.filterId = 'all';
        button.textContent = filter.name;
        button.addEventListener('click', () => this.handleAllButtonClick());
        return button;
      }

      const label = document.createElement('label');
      label.className = 'filter-item';
      label.dataset.filterId = filter.id;

      // 체크박스 - 기본값은 항상 체크 해제 (체크 상태는 저장되지 않음)
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = false;
      checkbox.addEventListener('change', () => this.handleFilterCheckChange(filter.id, checkbox.checked));
      label.appendChild(checkbox);

      // 색상
      if (filter.color) {
        const colorSpan = document.createElement('span');
        colorSpan.className = 'filter-color';
        colorSpan.style.backgroundColor = filter.color;
        label.appendChild(colorSpan);
      }

      // 필터명
      const nameSpan = document.createElement('span');
      nameSpan.className = 'filter-name';
      nameSpan.textContent = filter.name;
      label.appendChild(nameSpan);

      return label;
    }

    /**
     * "전체" 버튼 클릭 처리 - 모든 필터 체크 해제
     */
    handleAllButtonClick() {
      const filterList = document.getElementById('nodeFilterList');
      if (!filterList) return;

      // 모든 필터 체크박스 해제
      filterList.querySelectorAll('.filter-item:not(.filter-item-all) input').forEach(cb => {
        cb.checked = false;
      });

      // 필터 적용 (전체 표시)
      this.applyFilters();
    }

    /**
     * 루트 노드 위 필터 리스트 렌더링
     * @param {Array} filters - 필터 목록
     */
    renderNodeFilterList(filters) {
      const filterList = document.getElementById('nodeFilterList');
      const rootNode = document.querySelector('.mindmap-node.root, .mindmap-node[data-level="0"]');

      if (!filterList) {
        console.warn('[NodeFilter] nodeFilterList 요소를 찾을 수 없습니다');
        return;
      }

      // 필터가 없으면 숨김 + 노드 원위치
      if (!filters || filters.length === 0) {
        filterList.style.display = 'none';
        this.resetNodePositions();
        return;
      }

      // 1. 먼저 모든 노드의 원래 위치 저장 (이동 전)
      this.saveOriginalPositions();

      // 2. 기존 체크 상태 저장 (innerHTML 초기화 전)
      const savedCheckedIds = this._getActiveFilterIds();

      // 3. 기존 내용 초기화 및 필터 버튼 생성
      filterList.innerHTML = '';

      // "전체" 버튼 추가
      filterList.appendChild(this.createNodeFilterItem({
        id: 'all',
        name: t('filterAll', '전체'),
        color: null,
        checked: false
      }, true));

      // 개별 필터 버튼 추가
      filters.forEach(filter => {
        filterList.appendChild(this.createNodeFilterItem({
          ...filter,
          checked: false
        }));
      });

      // 4. 저장된 체크 상태 복원
      if (savedCheckedIds.length > 0) {
        filterList.querySelectorAll('.filter-item:not(.filter-item-all)').forEach(item => {
          const checkbox = item.querySelector('input');
          if (checkbox && savedCheckedIds.includes(item.dataset.filterId)) {
            checkbox.checked = true;
          }
        });
      }

      // 5. 필터 리스트 위치 계산 (원래 루트 노드 위치 기준)
      if (rootNode) {
        this.positionFilterList(filterList, rootNode);
      } else {
        filterList.style.left = '50%';
        filterList.style.top = '10px';
      }

      filterList.style.display = 'flex';

      // 6. 노드들을 아래로 이동
      this.moveNodesDown(filters);

      // 7. 체크 상태가 있었으면 필터 재적용, 아니면 기본 연결선 그리기
      if (savedCheckedIds.length > 0) {
        this.applyFilters();
      } else {
        // 필터 미체크 시에도 노드 이동 후 연결선 재계산 필요
        this.redrawConnectors();
      }

      console.log('[NodeFilter] 루트 노드 위 필터 리스트 렌더링 완료:', filters.length, '개');
    }

    /**
     * 필터 리스트 위치 계산 (루트 노드 좌측 정렬)
     * @param {HTMLElement} filterList - 필터 리스트 요소
     * @param {HTMLElement} rootNode - 루트 노드 요소
     */
    positionFilterList(filterList, rootNode) {
      const container = document.getElementById('mindmapLayout');
      if (!container) return;

      // 루트 노드의 원래 top 값 (오프셋 적용 전)
      const originalTop = parseInt(rootNode.dataset.originalTop) || parseInt(rootNode.style.top) || 0;

      // 루트 노드의 left 값 (좌측 정렬)
      const rootLeft = parseInt(rootNode.style.left) || 0;

      // 필터 리스트를 루트 노드와 같은 좌측 위치에 배치
      filterList.style.left = rootLeft + 'px';
      filterList.style.top = (originalTop - 10) + 'px';
    }

    /**
     * 루트 노드 오프셋 계산
     * @param {Array} filters - 필터 목록
     * @returns {number} 오프셋 (px)
     */
    calculateRootNodeOffset(filters) {
      const FILTER_LIST_HEIGHT = 35;  // 5픽셀 더 줄임 (40 → 35)
      const FILTER_GAP = 2;

      if (!filters || filters.length === 0) {
        return 0;
      }
      return FILTER_LIST_HEIGHT + FILTER_GAP;
    }

    /**
     * 모든 노드의 원래 위치 저장
     */
    saveOriginalPositions() {
      const mindmapLayout = document.getElementById('mindmapLayout');
      if (!mindmapLayout) return;

      const nodes = mindmapLayout.querySelectorAll('.mindmap-node');
      nodes.forEach(node => {
        // 원래 top 값 저장 (최초 1회만, 또는 이동되지 않은 상태일 때)
        if (!node.dataset.originalTop) {
          node.dataset.originalTop = parseInt(node.style.top) || 0;
        }
      });
    }

    /**
     * 노드들을 원래 위치로 되돌리기
     */
    resetNodePositions() {
      const mindmapLayout = document.getElementById('mindmapLayout');
      if (!mindmapLayout) return;

      const nodes = mindmapLayout.querySelectorAll('.mindmap-node');
      let positionChanged = false;

      nodes.forEach(node => {
        if (node.dataset.originalTop !== undefined) {
          node.style.top = node.dataset.originalTop + 'px';
          delete node.dataset.originalTop;
          positionChanged = true;
        }
      });

      mindmapLayout.classList.remove('has-filters');

      // 위치가 변경되었으면 연결선 다시 그리기
      if (positionChanged) {
        this.redrawConnectors();
      }
    }

    /**
     * 연결선 다시 그리기
     */
    redrawConnectors() {
      // ConnectorDrawer 사용
      if (window.MyMind3?.ConnectorDrawer?.drawConnectors) {
        setTimeout(() => {
          window.MyMind3.ConnectorDrawer.drawConnectors();
          console.log('[NodeFilter] 연결선 다시 그리기 완료');
        }, 50);
      }
    }

    /**
     * 노드들을 아래로 이동
     * @param {Array} filters - 필터 목록
     */
    moveNodesDown(filters) {
      const mindmapLayout = document.getElementById('mindmapLayout');
      if (!mindmapLayout) return;

      const offset = this.calculateRootNodeOffset(filters);
      const nodes = mindmapLayout.querySelectorAll('.mindmap-node');

      nodes.forEach(node => {
        const originalTop = parseInt(node.dataset.originalTop) || 0;
        node.style.top = (originalTop + offset) + 'px';
      });

      mindmapLayout.classList.add('has-filters');
      // 연결선은 applyFilters()에서 처리하므로 여기서 호출하지 않음
    }

    /**
     * 마인드맵 레이아웃 조정 (레거시 - 호환성 유지)
     * @param {Array} filters - 필터 목록
     */
    adjustMindmapLayout(filters) {
      const mindmapLayout = document.getElementById('mindmapLayout');
      if (!mindmapLayout) return;

      if (!filters || filters.length === 0) {
        this.resetNodePositions();
        mindmapLayout.classList.remove('has-filters');
      } else {
        mindmapLayout.classList.add('has-filters');
      }
    }

    /**
     * 필터 리스트 위치 업데이트 (스크롤/줌 시)
     */
    updateNodeFilterListPosition() {
      const filterList = document.getElementById('nodeFilterList');
      const rootNode = document.querySelector('.mindmap-node.root, .mindmap-node[data-level="0"]');

      if (filterList && rootNode && filterList.style.display !== 'none') {
        this.positionFilterList(filterList, rootNode);
      }
    }

    /**
     * 노드 필터 가시성 판별
     * @param {Object} nodeData - 노드 데이터
     * @param {Array} activeFilterIds - 활성 필터 ID 배열
     * @returns {boolean} 표시 여부
     */
    isNodeVisibleByFilter(nodeData, activeFilterIds) {
      // 필터 없으면 전체 표시
      if (!activeFilterIds || activeFilterIds.length === 0) return true;
      // 메인(루트) 노드 항상 표시
      if (nodeData.level === 0) return true;
      // 무색 노드(필터 미할당) 항상 표시
      if (!nodeData.filters || nodeData.filters.length === 0) return true;
      // OR 매칭: 노드 필터 중 하나라도 활성 필터에 포함되면 표시
      return nodeData.filters.some(fId => activeFilterIds.includes(fId));
    }

    /**
     * DOM에서 현재 체크된 필터 ID 배열 반환
     * @returns {Array} 활성 필터 ID 배열
     */
    _getActiveFilterIds() {
      const filterList = document.getElementById('nodeFilterList');
      if (!filterList) return [];

      const activeIds = [];
      filterList.querySelectorAll('.filter-item:not(.filter-item-all)').forEach(item => {
        const checkbox = item.querySelector('input');
        if (checkbox?.checked) {
          activeIds.push(item.dataset.filterId);
        }
      });
      return activeIds;
    }

    /**
     * 필터 체크 변경 처리
     * @param {string} filterId - 필터 ID
     * @param {boolean} checked - 체크 여부
     */
    handleFilterCheckChange(filterId, checked) {
      this.applyFilters();
    }

    /**
     * 필터 적용 (노드 표시/숨김)
     */
    applyFilters() {
      const activeFilterIds = this._getActiveFilterIds();

      // MindMapData에서 전체 노드 Map 구축 (ID → nodeData)
      const mindMapData = window.MyMind3?.MindMapData?.mindMapData;
      if (!mindMapData) return;

      const nodeDataMap = new Map();
      const buildMap = (nodes) => {
        nodes.forEach(node => {
          nodeDataMap.set(String(node.id), node);
          if (node.children) buildMap(node.children);
        });
      };
      buildMap(mindMapData);

      // 각 DOM 노드 판별
      const domNodes = document.querySelectorAll('.mindmap-node');
      domNodes.forEach(domNode => {
        const nodeId = domNode.getAttribute('data-id');
        const nodeData = nodeDataMap.get(nodeId);

        if (!nodeData) return;

        const visible = this.isNodeVisibleByFilter(nodeData, activeFilterIds);

        if (visible) {
          domNode.style.display = '';
          domNode.classList.remove('filter-hidden');
        } else {
          domNode.style.display = 'none';
          domNode.classList.add('filter-hidden');
        }
      });

      // 연결선 재계산
      this.redrawFilteredConnectors(activeFilterIds, nodeDataMap);

      console.log('[NodeFilter] 필터 적용:', activeFilterIds.length === 0 ? '전체' : activeFilterIds.join(', '));
    }

    /**
     * 필터 적용 시 연결선 재계산
     * @param {Array} activeFilterIds - 활성 필터 ID 배열
     * @param {Map} nodeDataMap - 노드 데이터 맵
     */
    redrawFilteredConnectors(activeFilterIds, nodeDataMap) {
      if (!activeFilterIds || activeFilterIds.length === 0) {
        // 필터 없으면 기존 연결선 그리기
        this.redrawConnectors();
        return;
      }
      // 필터 있으면 필터 전용 커넥터 그리기
      if (window.MyMind3?.ConnectorDrawer?.drawFilteredConnectors) {
        setTimeout(() => {
          window.MyMind3.ConnectorDrawer.drawFilteredConnectors(activeFilterIds, nodeDataMap, this);
          console.log('[NodeFilter] 필터 연결선 다시 그리기 완료');
        }, 50);
      } else {
        // 폴백: 기존 연결선 그리기
        this.redrawConnectors();
      }
    }

    /**
     * 마인드맵 불러오기 후 필터 리스트 초기화
     * (외부에서 호출용)
     */
    initNodeFilterListOnLoad() {
      const filters = this.getFiltersFromMindmap();
      this.filters = filters;

      if (filters.length > 0) {
        this.renderNodeFilterList(filters);
      } else {
        // 필터 숨김
        const filterList = document.getElementById('nodeFilterList');
        if (filterList) {
          filterList.style.display = 'none';
        }
        this.adjustMindmapLayout([]);
      }
    }

    /**
     * 필터 저장 후 필터 리스트 갱신
     * (저장 버튼 클릭 시 호출)
     */
    refreshNodeFilterListOnSave() {
      this.renderNodeFilterList(this.filters);
    }
  }

  // 전역 인스턴스 생성
  let nodeFilterManager = null;

  // DOM 로드 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      nodeFilterManager = new NodeFilterManager();
      window.NodeFilterManager = nodeFilterManager;
      bindGlobalEvents();
    });
  } else {
    nodeFilterManager = new NodeFilterManager();
    window.NodeFilterManager = nodeFilterManager;
    bindGlobalEvents();
  }

  /**
   * 전역 이벤트 바인딩
   */
  function bindGlobalEvents() {
    // 마인드맵 불러오기 완료 시 필터 리스트 초기화
    window.addEventListener('mindmapLoaded', () => {
      console.log('[NodeFilter] mindmapLoaded 이벤트 감지');
      // 약간의 지연 후 필터 리스트 초기화 및 노드 필터 태그 갱신 (렌더링 완료 대기)
      setTimeout(() => {
        if (nodeFilterManager) {
          nodeFilterManager.initNodeFilterListOnLoad();
          // 노드들의 필터 태그 갱신 (렌더링 타이밍 문제 해결)
          nodeFilterManager.refreshAllNodeFilterTags();
        }
      }, 100);
    });

    // 마인드맵 변환/줌 시 필터 리스트 위치 업데이트
    document.addEventListener('mindmapTransformed', () => {
      if (nodeFilterManager) {
        nodeFilterManager.updateNodeFilterListPosition();
      }
    });

    // 윈도우 리사이즈 시 위치 업데이트
    window.addEventListener('resize', () => {
      if (nodeFilterManager) {
        nodeFilterManager.updateNodeFilterListPosition();
      }
    });

    console.log('[NodeFilter] 전역 이벤트 바인딩 완료');
  }

  console.log('[NodeFilter] 모듈 로드 완료');
})();
