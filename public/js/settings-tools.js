/**
 * settings-tools.js
 * 도구설정 관리 모듈
 * 도구 카테고리 및 도구를 관리합니다.
 */

(function() {
  'use strict';

  // 상태 변수
  let toolsData = [];
  let categoriesData = [];
  let currentPage = 1;
  let pageSize = 20;
  let totalPages = 1;
  let selectedTools = new Set();
  let filters = {
    category: '',
    status: '',
    search: ''
  };

  /**
   * 도구설정 초기화
   */
  async function initToolSettings() {
    console.log('[Settings-Tools] 초기화 시작');

    // 이벤트 리스너 등록
    setupEventListeners();

    // 카테고리 목록 로드
    await loadCategories();

    // 도구 목록 로드
    await loadTools();

    console.log('[Settings-Tools] 초기화 완료');
  }

  /**
   * 이벤트 리스너 설정
   */
  function setupEventListeners() {
    // 새로고침 버튼
    const refreshBtn = document.getElementById('refreshToolsBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadTools();
      });
    }

    // 검색 버튼
    const searchBtn = document.getElementById('toolSearchBtn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        applyFilters();
      });
    }

    // 초기화 버튼
    const resetBtn = document.getElementById('toolResetFilterBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resetFilters();
      });
    }

    // 검색 입력 엔터키
    const searchInput = document.getElementById('toolSearchInput');
    if (searchInput) {
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          applyFilters();
        }
      });
    }

    // 카테고리 필터
    const categoryFilter = document.getElementById('toolCategoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', () => {
        filters.category = categoryFilter.value;
        applyFilters();
      });
    }

    // 상태 필터
    const statusFilter = document.getElementById('toolStatusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        filters.status = statusFilter.value;
        applyFilters();
      });
    }

    // 전체 선택 체크박스
    const selectAllCheckbox = document.getElementById('toolSelectAll');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        toggleSelectAll(e.target.checked);
      });
    }

    // 페이지네이션
    const prevBtn = document.getElementById('toolPrevBtn');
    const nextBtn = document.getElementById('toolNextBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          renderTools();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderTools();
        }
      });
    }

    // 일괄 활성화/비활성화
    const bulkActivateBtn = document.getElementById('bulkActivateBtn');
    const bulkDeactivateBtn = document.getElementById('bulkDeactivateBtn');
    if (bulkActivateBtn) {
      bulkActivateBtn.addEventListener('click', () => {
        bulkUpdateStatus(true);
      });
    }
    if (bulkDeactivateBtn) {
      bulkDeactivateBtn.addEventListener('click', () => {
        bulkUpdateStatus(false);
      });
    }

    console.log('[Settings-Tools] 이벤트 리스너 등록 완료');
  }

  /**
   * 카테고리 목록 로드
   */
  async function loadCategories() {
    try {
      const response = await fetch('/api/tools/categories');
      const data = await response.json();

      // API 응답 구조: { success: true, data: [...] }
      if (data.success && data.data) {
        categoriesData = data.data;

        // 카테고리 필터 옵션 업데이트
        const categoryFilter = document.getElementById('toolCategoryFilter');
        if (categoryFilter) {
          categoryFilter.innerHTML = '<option value="">' + t('toolAllCategories', '전체 카테고리') + '</option>';
          categoriesData.forEach(cat => {
            const option = document.createElement('option');
            // API 응답 필드: id, name, icon
            option.value = cat.id;
            option.textContent = `${cat.icon || ''} ${cat.name}`;
            categoryFilter.appendChild(option);
          });
        }

        // 카테고리 수 업데이트
        const totalCategoriesEl = document.getElementById('totalCategoriesCount');
        if (totalCategoriesEl) {
          totalCategoriesEl.textContent = categoriesData.length;
        }

        console.log('[Settings-Tools] 카테고리 로드 완료:', categoriesData.length, '개');
      }
    } catch (error) {
      console.error('[Settings-Tools] 카테고리 로드 실패:', error);
    }
  }

  /**
   * 도구 목록 로드
   */
  async function loadTools() {
    try {
      showLoading();

      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/tools/admin/list?${params.toString()}`);
      const data = await response.json();

      if (data.success && data.tools) {
        toolsData = data.tools;
        updateStats();
        renderTools();
      } else {
        showError(t('toolLoadFailed', '도구 목록을 불러오는데 실패했습니다.'));
      }
    } catch (error) {
      console.error('[Settings-Tools] 도구 로드 실패:', error);
      showError(t('toolLoadFailed', '도구 목록을 불러오는데 실패했습니다.'));
    }
  }

  /**
   * 통계 업데이트
   */
  function updateStats() {
    const totalToolsEl = document.getElementById('totalToolsCount');
    const activeToolsEl = document.getElementById('activeToolsCount');
    const inactiveToolsEl = document.getElementById('inactiveToolsCount');

    const activeCount = toolsData.filter(t => t.is_active).length;
    const inactiveCount = toolsData.filter(t => !t.is_active).length;

    if (totalToolsEl) totalToolsEl.textContent = toolsData.length;
    if (activeToolsEl) activeToolsEl.textContent = activeCount;
    if (inactiveToolsEl) inactiveToolsEl.textContent = inactiveCount;
  }

  /**
   * 도구 목록 렌더링
   */
  function renderTools() {
    const tbody = document.getElementById('toolTableBody');
    if (!tbody) return;

    // 페이지네이션 계산
    totalPages = Math.ceil(toolsData.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageTools = toolsData.slice(startIndex, endIndex);

    if (pageTools.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="loading-row">${t('toolEmpty', '도구가 없습니다.')}</td>
        </tr>
      `;
      updatePagination();
      return;
    }

    tbody.innerHTML = pageTools.map(tool => `
      <tr data-tool-id="${tool.id}">
        <td>
          <input type="checkbox" class="tool-checkbox" data-tool-id="${tool.id}"
            ${selectedTools.has(tool.id) ? 'checked' : ''}>
        </td>
        <td>
          <span class="tool-category-badge">${tool.category_icon || ''} ${tool.category_name || tool.category_slug || '-'}</span>
        </td>
        <td>
          <strong>${tool.name_ko || tool.name}</strong>
          ${tool.description_ko ? `<br><small class="tool-desc-text">${tool.description_ko.substring(0, 50)}...</small>` : ''}
        </td>
        <td>
          <code class="tool-path-code">
            ${tool.path || '-'}
          </code>
        </td>
        <td>
          <div class="tool-status-toggle ${tool.is_active ? 'active' : ''}"
               data-tool-id="${tool.id}"
               title="${tool.is_active ? t('toolActive', '활성') : t('toolInactive', '비활성')}">
          </div>
        </td>
        <td>
          <input type="number" class="tool-order-input" value="${tool.sort_order || 0}"
                 data-tool-id="${tool.id}" min="0" max="9999">
        </td>
        <td>
          <button class="tool-action-btn edit" data-tool-id="${tool.id}" title="편집">
            ${mmIcon('edit', 14)}
          </button>
        </td>
      </tr>
    `).join('');

    // 체크박스 이벤트
    tbody.querySelectorAll('.tool-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const toolId = e.target.dataset.toolId;
        if (e.target.checked) {
          selectedTools.add(toolId);
        } else {
          selectedTools.delete(toolId);
        }
        updateBulkActions();
      });
    });

    // 상태 토글 이벤트
    tbody.querySelectorAll('.tool-status-toggle').forEach(toggle => {
      toggle.addEventListener('click', async (e) => {
        const toolId = e.currentTarget.dataset.toolId;
        const isActive = e.currentTarget.classList.contains('active');
        await updateToolStatus(toolId, !isActive);
      });
    });

    // 순서 변경 이벤트
    tbody.querySelectorAll('.tool-order-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const toolId = e.target.dataset.toolId;
        const newOrder = parseInt(e.target.value) || 0;
        await updateToolOrder(toolId, newOrder);
      });
    });

    // 편집 버튼 이벤트
    tbody.querySelectorAll('.tool-action-btn.edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const toolId = e.currentTarget.dataset.toolId;
        editTool(toolId);
      });
    });

    updatePagination();
    updateBulkActions();
  }

  /**
   * 페이지네이션 업데이트
   */
  function updatePagination() {
    const pageInfo = document.getElementById('toolPageInfo');
    const prevBtn = document.getElementById('toolPrevBtn');
    const nextBtn = document.getElementById('toolNextBtn');

    if (pageInfo) {
      pageInfo.textContent = t('toolPageInfo', '페이지') + ` ${currentPage}/${totalPages}`;
    }
    if (prevBtn) {
      prevBtn.disabled = currentPage <= 1;
    }
    if (nextBtn) {
      nextBtn.disabled = currentPage >= totalPages;
    }
  }

  /**
   * 일괄 작업 UI 업데이트
   */
  function updateBulkActions() {
    const bulkActions = document.getElementById('toolBulkActions');
    const countEl = document.getElementById('selectedToolsCount');
    const selectAllCheckbox = document.getElementById('toolSelectAll');

    if (bulkActions) {
      bulkActions.style.display = selectedTools.size > 0 ? 'flex' : 'none';
    }
    if (countEl) {
      countEl.textContent = `${selectedTools.size}${t('toolSelectedCount', '개 선택됨')}`;
    }
    if (selectAllCheckbox) {
      const pageTools = toolsData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
      const allSelected = pageTools.length > 0 && pageTools.every(t => selectedTools.has(t.id));
      selectAllCheckbox.checked = allSelected;
    }
  }

  /**
   * 전체 선택/해제
   */
  function toggleSelectAll(checked) {
    const pageTools = toolsData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    pageTools.forEach(tool => {
      if (checked) {
        selectedTools.add(tool.id);
      } else {
        selectedTools.delete(tool.id);
      }
    });
    renderTools();
  }

  /**
   * 필터 적용
   */
  function applyFilters() {
    const searchInput = document.getElementById('toolSearchInput');
    filters.search = searchInput ? searchInput.value.trim() : '';
    currentPage = 1;
    loadTools();
  }

  /**
   * 필터 초기화
   */
  function resetFilters() {
    filters = { category: '', status: '', search: '' };

    const categoryFilter = document.getElementById('toolCategoryFilter');
    const statusFilter = document.getElementById('toolStatusFilter');
    const searchInput = document.getElementById('toolSearchInput');

    if (categoryFilter) categoryFilter.value = '';
    if (statusFilter) statusFilter.value = '';
    if (searchInput) searchInput.value = '';

    currentPage = 1;
    loadTools();
  }

  /**
   * 도구 상태 업데이트
   */
  async function updateToolStatus(toolId, isActive) {
    try {
      const response = await fetch(`/api/tools/admin/${toolId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: isActive })
      });

      const data = await response.json();
      if (data.success) {
        // 로컬 데이터 업데이트
        const tool = toolsData.find(t => t.id === toolId);
        if (tool) tool.is_active = isActive;
        updateStats();
        renderTools();
      } else {
        alert(t('toolStatusChangeFailed', '상태 변경에 실패했습니다') + ': ' + (data.message || ''));
      }
    } catch (error) {
      console.error('[Settings-Tools] 상태 변경 실패:', error);
      alert(t('toolStatusChangeError', '상태 변경 중 오류가 발생했습니다.'));
    }
  }

  /**
   * 도구 순서 업데이트
   */
  async function updateToolOrder(toolId, sortOrder) {
    try {
      const response = await fetch(`/api/tools/admin/${toolId}/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sort_order: sortOrder })
      });

      const data = await response.json();
      if (!data.success) {
        alert(t('toolOrderChangeFailed', '순서 변경에 실패했습니다') + ': ' + (data.message || ''));
      }
    } catch (error) {
      console.error('[Settings-Tools] 순서 변경 실패:', error);
      alert(t('toolOrderChangeError', '순서 변경 중 오류가 발생했습니다.'));
    }
  }

  /**
   * 일괄 상태 변경
   */
  async function bulkUpdateStatus(isActive) {
    if (selectedTools.size === 0) return;

    const action = isActive ? t('toolActivate', '활성화') : t('toolDeactivate', '비활성화');
    if (!confirm(t('toolBulkConfirm', '선택한') + ` ${selectedTools.size}${t('countUnit', '개')}` + t('toolBulkConfirmSuffix', '의 도구를') + ` ${action}` + t('toolBulkConfirmEnd', '하시겠습니까?'))) {
      return;
    }

    try {
      const response = await fetch('/api/tools/admin/bulk-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_ids: Array.from(selectedTools),
          is_active: isActive
        })
      });

      const data = await response.json();
      if (data.success) {
        selectedTools.clear();
        loadTools();
      } else {
        alert(t('toolBulkFailed', '일괄 처리에 실패했습니다') + ': ' + (data.message || ''));
      }
    } catch (error) {
      console.error('[Settings-Tools] 일괄 상태 변경 실패:', error);
      alert(t('toolBulkError', '일괄 상태 변경 중 오류가 발생했습니다.'));
    }
  }

  /**
   * 도구 편집 (팝업)
   */
  function editTool(toolId) {
    const tool = toolsData.find(t => t.id === toolId);
    if (!tool) return;

    // 간단한 편집 팝업 (추후 확장 가능)
    const newName = prompt(t('toolEditNamePrompt', '도구명 (한글):'), tool.name_ko || tool.name);
    if (newName !== null && newName !== tool.name_ko) {
      updateToolName(toolId, newName);
    }
  }

  /**
   * 도구명 업데이트
   */
  async function updateToolName(toolId, nameKo) {
    try {
      const response = await fetch(`/api/tools/admin/${toolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name_ko: nameKo })
      });

      const data = await response.json();
      if (data.success) {
        loadTools();
      } else {
        alert(t('toolNameChangeFailed', '도구명 변경에 실패했습니다: ') + (data.message || ''));
      }
    } catch (error) {
      console.error('[Settings-Tools] 도구명 변경 실패:', error);
      alert(t('toolNameChangeError', '도구명 변경 중 오류가 발생했습니다.'));
    }
  }

  /**
   * 로딩 표시
   */
  function showLoading() {
    const tbody = document.getElementById('toolTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="loading-row">${t('toolLoading', '도구 목록을 불러오는 중...')}</td>
        </tr>
      `;
    }
  }

  /**
   * 에러 표시
   */
  function showError(message) {
    const tbody = document.getElementById('toolTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="loading-row" style="color: #d32f2f;">${message}</td>
        </tr>
      `;
    }
  }

  // 전역 함수로 노출
  window.initToolSettings = initToolSettings;

  console.log('[Settings-Tools] settings-tools.js 로드 완료');
})();
