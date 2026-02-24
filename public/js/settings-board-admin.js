/**
 * 게시판 관리 UI (관리자 전용)
 * settings-board-admin.js
 *
 * @version 2.0.0
 * @date 2025-12-26
 * - 체크박스 선택 번역 기능 추가
 * - Board Key 번역 지원
 */

// 게시판 목록 데이터
let boardAdminData = [];
// 선택된 게시판 ID 목록
let selectedBoardIds = new Set();

/**
 * 현재 언어 코드 가져오기
 */
function getCurrentLanguageAdmin() {
  try {
    const settings = JSON.parse(localStorage.getItem('mymind3_settings') || '{}');
    return settings.appLanguage || 'ko';
  } catch (e) {
    return 'ko';
  }
}

/**
 * 게시판 이름 가져오기 (다국어 지원)
 */
function getBoardNameAdmin(board) {
  if (!board) return '';
  const lang = getCurrentLanguageAdmin();

  if (board.name_translations) {
    try {
      const translations = typeof board.name_translations === 'string'
        ? JSON.parse(board.name_translations)
        : board.name_translations;
      return getLocalizedTextAdmin(translations, lang, board.name);
    } catch (e) {
      // JSON 파싱 실패 시 기본 이름 반환
    }
  }
  return board.name || '';
}

/**
 * 게시판 설명 가져오기 (다국어 지원)
 */
function getBoardDescriptionAdmin(board) {
  if (!board) return '';
  const lang = getCurrentLanguageAdmin();

  if (board.description_translations) {
    try {
      const translations = typeof board.description_translations === 'string'
        ? JSON.parse(board.description_translations)
        : board.description_translations;
      return getLocalizedTextAdmin(translations, lang, board.description);
    } catch (e) {
      // JSON 파싱 실패 시 기본 설명 반환
    }
  }
  return board.description || '';
}

/**
 * 게시판 키 가져오기 (다국어 지원)
 */
function getBoardKeyAdmin(board) {
  if (!board) return '';
  const lang = getCurrentLanguageAdmin();

  if (board.key_translations) {
    try {
      const translations = typeof board.key_translations === 'string'
        ? JSON.parse(board.key_translations)
        : board.key_translations;
      return getLocalizedTextAdmin(translations, lang, board.board_key);
    } catch (e) {
      // JSON 파싱 실패 시 기본 키 반환
    }
  }
  return board.board_key || '';
}

/**
 * 번역 객체에서 현재 언어의 텍스트 가져오기
 */
function getLocalizedTextAdmin(translations, lang, fallback = '') {
  if (!translations) return fallback;

  // 1. 정확한 언어 코드 매칭
  if (translations[lang]) {
    return translations[lang];
  }

  // 2. 기본 언어 코드 매칭 (zh-TW -> zh)
  const baseLang = lang.split('-')[0];
  if (translations[baseLang]) {
    return translations[baseLang];
  }

  // 3. 한국어 fallback
  if (translations.ko) {
    return translations.ko;
  }

  // 4. 영어 fallback
  if (translations.en) {
    return translations.en;
  }

  // 5. 첫 번째 사용 가능한 번역
  const firstAvailable = Object.values(translations)[0];
  return firstAvailable || fallback;
}

/**
 * 게시판 관리 초기화
 */
function initBoardAdmin() {
  console.log('[BoardAdmin] 게시판 관리 초기화');

  // 관리자 메뉴 표시 (관리자 인증 시)
  showBoardAdminMenu();

  // 게시판 목록 로드
  loadBoardAdminList();

  // 이벤트 리스너 등록
  setupBoardAdminEvents();

  // 언어 변경 이벤트 리스너 (즉시 반영)
  window.addEventListener('settingsChanged', () => {
    console.log('[BoardAdmin] 언어 변경 감지, 게시판 목록 다시 렌더링');
    renderBoardAdminList();
  });
}

/**
 * 관리자 메뉴 표시
 */
function showBoardAdminMenu() {
  const boardAdminNavItem = document.getElementById('boardAdminNavItem');
  if (boardAdminNavItem) {
    // 관리자 인증 여부 확인 (settings-admin.js에서 설정한 상태)
    // admin-only 클래스는 관리자 인증 시 자동으로 표시됨
    console.log('[BoardAdmin] 게시판 관리 메뉴 준비됨');
  }
}

/**
 * 게시판 목록 로드
 */
async function loadBoardAdminList() {
  const listContainer = document.getElementById('boardAdminList');
  if (!listContainer) return;

  try {
    listContainer.innerHTML = `<div class="loading-spinner">${window.i18n?.boardAdminLoading || '로딩 중...'}</div>`;

    const response = await fetch('/api/boards', {
      credentials: 'include'
    });

    const result = await response.json();

    if (result.success) {
      boardAdminData = result.data || [];
      renderBoardAdminList(boardAdminData);
    } else if (result.requiresVerification) {
      // 관리자 재인증 필요
      listContainer.innerHTML = `<p class="error-text">${window.i18n?.boardAdminAuthExpired || '관리자 인증이 만료되었습니다. 다시 인증해주세요.'}</p>`;
      if (typeof showAdminPasswordPopup === 'function') {
        showAdminPasswordPopup();
      }
    } else if (response.status === 401 || response.status === 403) {
      listContainer.innerHTML = `<p class="error-text">${window.i18n?.boardAdminAuthRequired || '관리자 인증이 필요합니다.'}</p>`;
    } else {
      listContainer.innerHTML = `<p class="error-text">${window.i18n?.boardAdminLoadFailed || '게시판 목록을 불러올 수 없습니다.'}</p>`;
    }
  } catch (error) {
    console.error('[BoardAdmin] 게시판 목록 로드 실패:', error);
    listContainer.innerHTML = `<p class="error-text">${window.i18n?.boardAdminError || '오류가 발생했습니다.'}</p>`;
  }
}

/**
 * 게시판 목록 렌더링
 */
function renderBoardAdminList(boards) {
  const listContainer = document.getElementById('boardAdminList');
  if (!listContainer) return;

  // 선택 상태 초기화
  selectedBoardIds.clear();
  updateSelectedCount();

  if (!boards || boards.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <p>${window.i18n?.boardAdminEmpty || '생성된 게시판이 없습니다.'}</p>
        <p>${window.i18n?.boardAdminEmptyDesc || '게시판 생성 버튼을 클릭하여 새 게시판을 만들어보세요.'}</p>
      </div>
    `;
    return;
  }

  const html = `
    <table class="board-admin-table">
      <thead>
        <tr>
          <th style="width: 40px;" class="col-checkbox">
            <input type="checkbox" id="selectAllBoards" title="${window.i18n?.boardSelectAll || '전체 선택'}">
          </th>
          <th style="width: 50px;">${window.i18n?.boardAdminColOrder || '순서'}</th>
          <th style="width: 60px;">${window.i18n?.boardAdminColIcon || '아이콘'}</th>
          <th>${window.i18n?.boardAdminColName || '이름'}</th>
          <th>${window.i18n?.boardAdminColKey || '키'}</th>
          <th>${window.i18n?.boardAdminColStatus || '상태'}</th>
          <th>${window.i18n?.boardAdminColPosts || '글수'}</th>
          <th style="width: 180px;">${window.i18n?.boardAdminColActions || '관리'}</th>
        </tr>
      </thead>
      <tbody>
        ${boards.map(board => renderBoardRow(board)).join('')}
      </tbody>
    </table>
  `;

  listContainer.innerHTML = html;

  // 전체 선택 체크박스 이벤트
  const selectAllCheckbox = document.getElementById('selectAllBoards');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', handleSelectAll);
  }

  // 개별 체크박스 이벤트
  const checkboxes = listContainer.querySelectorAll('.board-checkbox');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', handleBoardCheckboxChange);
  });
}

/**
 * 게시판 행 렌더링
 */
function renderBoardRow(board) {
  const isPublic = board.is_public === true || board.is_public === 1;
  const statusClass = isPublic ? 'status-public' : 'status-private';
  const statusText = isPublic
    ? (window.i18n?.boardStatusPublic || '공개')
    : (window.i18n?.boardStatusPrivate || '비공개');
  const toggleTitle = isPublic
    ? (window.i18n?.boardToggleToPrivate || '비공개로 전환')
    : (window.i18n?.boardToggleToPublic || '공개로 전환');

  // 다국어 게시판 이름/설명/키 가져오기
  const boardName = getBoardNameAdmin(board);
  const boardDesc = getBoardDescriptionAdmin(board);
  const boardKey = getBoardKeyAdmin(board);

  return `
    <tr data-board-id="${board.id}" data-board-name="${escapeHtml(board.name)}">
      <td class="col-checkbox text-center">
        <input type="checkbox" class="board-checkbox" value="${board.id}">
      </td>
      <td class="text-center">${board.sort_order || 0}</td>
      <td class="text-center">${board.icon || mmIcon('clipboard', 16)}</td>
      <td>
        <strong>${escapeHtml(boardName)}</strong>
        ${boardDesc ? `<br><small class="text-muted">${escapeHtml(boardDesc)}</small>` : ''}
      </td>
      <td><code>${escapeHtml(boardKey)}</code></td>
      <td>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </td>
      <td class="text-center">${board.post_count || 0}</td>
      <td class="actions">
        <button class="btn-icon btn-toggle" data-action="toggle" title="${toggleTitle}">
          ${isPublic ? mmIcon('unlock', 14) : mmIcon('lock', 14)}
        </button>
        <button class="btn-icon btn-edit" data-action="edit" title="${window.i18n?.boardBtnEdit || '수정'}">
          ${mmIcon('edit', 14)}
        </button>
        <button class="btn-icon btn-delete" data-action="delete" title="${window.i18n?.boardBtnDelete || '삭제'}">
          ${mmIcon('trash', 14)}
        </button>
      </td>
    </tr>
  `;
}

/**
 * 이벤트 리스너 설정
 */
function setupBoardAdminEvents() {
  // 게시판 생성 버튼
  const createBtn = document.getElementById('createBoardBtn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      openBoardEditModal();
    });
  }

  // 게시판 일괄 번역 버튼
  const translateBtn = document.getElementById('translateBoardsBtn');
  if (translateBtn) {
    translateBtn.addEventListener('click', () => {
      translateAllBoards();
    });
  }

  // 모달 이벤트 설정
  const modal = document.getElementById('boardEditModal');
  if (modal) {
    // X 버튼 (닫기)
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeBoardEditModal();
      });
    }

    // 취소 버튼
    const cancelBtn = modal.querySelector('.btn-secondary');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeBoardEditModal();
      });
    }

    // 저장 버튼
    const saveBtn = modal.querySelector('.btn-primary');
    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        saveBoardForm();
      });
    }

    // 오버레이 클릭 시 닫기
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeBoardEditModal();
      }
    });
  }

  // 게시판 목록 이벤트 위임 (수정, 삭제, 토글 버튼)
  const listContainer = document.getElementById('boardAdminList');
  if (listContainer) {
    listContainer.addEventListener('click', (e) => {
      const button = e.target.closest('button[data-action]');
      if (!button) return;

      const row = button.closest('tr[data-board-id]');
      if (!row) return;

      const boardId = parseInt(row.dataset.boardId, 10);
      const boardName = row.dataset.boardName || '';
      const action = button.dataset.action;

      switch (action) {
        case 'edit':
          editBoard(boardId);
          break;
        case 'delete':
          deleteBoard(boardId, boardName);
          break;
        case 'toggle':
          toggleBoardPublic(boardId);
          break;
      }
    });
  }
}

/**
 * 게시판 생성/수정 모달 열기
 */
function openBoardEditModal(boardId = null) {
  const modal = document.getElementById('boardEditModal');
  const title = document.getElementById('boardEditModalTitle');
  const form = document.getElementById('boardEditForm');

  if (!modal || !form) return;

  // 폼 초기화
  form.reset();
  document.getElementById('boardEditId').value = '';
  document.getElementById('boardEditIcon').value = '';
  document.getElementById('boardEditWritePermission').value = 'user';
  document.getElementById('boardEditReadPermission').value = 'all';
  document.getElementById('boardEditSortOrder').value = '0';
  document.getElementById('boardEditAllowUpload').checked = true;
  document.getElementById('boardEditAllowComment').checked = true;

  if (boardId) {
    // 수정 모드
    title.textContent = window.i18n?.boardModalTitleEdit || '게시판 수정';
    document.getElementById('boardEditKey').disabled = true;

    const board = boardAdminData.find(b => b.id === boardId);
    if (board) {
      document.getElementById('boardEditId').value = board.id;
      // Board Key는 URL에 사용되므로 원본 유지
      document.getElementById('boardEditKey').value = board.board_key;
      // Board Name과 Description은 현재 언어에 맞는 번역된 값 표시
      document.getElementById('boardEditName').value = getBoardNameAdmin(board);
      document.getElementById('boardEditDescription').value = getBoardDescriptionAdmin(board);
      document.getElementById('boardEditIcon').value = board.icon || '';
      document.getElementById('boardEditWritePermission').value = board.write_permission || 'user';
      document.getElementById('boardEditReadPermission').value = board.read_permission || 'all';
      document.getElementById('boardEditSortOrder').value = board.sort_order || 0;
      document.getElementById('boardEditAllowUpload').checked = board.allow_file_upload === true || board.allow_file_upload === 1;
      document.getElementById('boardEditAllowComment').checked = board.allow_comment === true || board.allow_comment === 1;
    }
  } else {
    // 생성 모드
    title.textContent = window.i18n?.boardModalTitleCreate || '게시판 생성';
    document.getElementById('boardEditKey').disabled = false;
  }

  modal.style.display = 'flex';
}

/**
 * 게시판 모달 닫기
 */
function closeBoardEditModal() {
  const modal = document.getElementById('boardEditModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * 게시판 저장
 */
async function saveBoardForm() {
  const boardId = document.getElementById('boardEditId').value;
  const isEdit = !!boardId;

  const boardData = {
    board_key: document.getElementById('boardEditKey').value.trim().toLowerCase(),
    name: document.getElementById('boardEditName').value.trim(),
    description: document.getElementById('boardEditDescription').value.trim(),
    icon: document.getElementById('boardEditIcon').value.trim() || '',
    write_permission: document.getElementById('boardEditWritePermission').value,
    read_permission: document.getElementById('boardEditReadPermission').value,
    sort_order: parseInt(document.getElementById('boardEditSortOrder').value) || 0,
    allow_file_upload: document.getElementById('boardEditAllowUpload').checked,
    allow_comment: document.getElementById('boardEditAllowComment').checked
  };

  // 유효성 검사
  if (!boardData.board_key || !boardData.name) {
    alert(window.i18n?.boardValidateKeyName || '게시판 키와 이름을 입력해주세요.');
    return;
  }

  if (!/^[a-z0-9-]+$/.test(boardData.board_key)) {
    alert(window.i18n?.boardValidateKeyFormat || '게시판 키는 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.');
    return;
  }

  try {
    const url = isEdit ? `/api/boards/${boardId}` : '/api/boards';
    const method = isEdit ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(boardData)
    });

    const result = await response.json();

    if (result.success) {
      closeBoardEditModal();
      loadBoardAdminList();
      loadPublicBoardMenus(); // 공개 게시판 메뉴 갱신
      alert(isEdit
        ? (window.i18n?.boardEditSuccess || '게시판이 수정되었습니다.')
        : (window.i18n?.boardCreateSuccess || '게시판이 생성되었습니다.'));
    } else if (result.requiresVerification) {
      // 관리자 재인증 필요
      alert(window.i18n?.boardAdminAuthExpired || '관리자 인증이 만료되었습니다. 다시 인증해주세요.');
      // 관리자 비밀번호 팝업 표시
      if (typeof showAdminPasswordPopup === 'function') {
        showAdminPasswordPopup();
      }
    } else {
      alert(result.message || (window.i18n?.boardSaveFailed || '저장에 실패했습니다.'));
    }
  } catch (error) {
    console.error('[BoardAdmin] 게시판 저장 실패:', error);
    alert(window.i18n?.boardSaveError || '저장 중 오류가 발생했습니다.');
  }
}

/**
 * 게시판 수정
 */
function editBoard(boardId) {
  openBoardEditModal(boardId);
}

/**
 * 게시판 삭제
 */
async function deleteBoard(boardId, boardName) {
  const confirmMsg = (window.i18n?.boardDeleteConfirm || '"{name}" 게시판을 삭제하시겠습니까?').replace('{name}', boardName);
  const warningMsg = window.i18n?.boardDeleteWarning || '게시판의 모든 게시글과 첨부파일이 함께 삭제됩니다.';
  if (!confirm(`${confirmMsg}\n\n${warningMsg}`)) {
    return;
  }

  try {
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch(`/api/boards/${boardId}`, {
      method: 'DELETE',
      headers: { ...csrfHeaders },
      credentials: 'include'
    });

    const result = await response.json();

    if (result.success) {
      loadBoardAdminList();
      loadPublicBoardMenus();
      alert(window.i18n?.boardDeleteSuccess || '게시판이 삭제되었습니다.');
    } else if (result.requiresVerification) {
      alert(window.i18n?.boardAdminAuthExpired || '관리자 인증이 만료되었습니다. 다시 인증해주세요.');
      if (typeof showAdminPasswordPopup === 'function') {
        showAdminPasswordPopup();
      }
    } else {
      alert(result.message || (window.i18n?.boardDeleteFailed || '삭제에 실패했습니다.'));
    }
  } catch (error) {
    console.error('[BoardAdmin] 게시판 삭제 실패:', error);
    alert(window.i18n?.boardDeleteError || '삭제 중 오류가 발생했습니다.');
  }
}

/**
 * 게시판 공개/비공개 토글
 */
async function toggleBoardPublic(boardId) {
  try {
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch(`/api/boards/${boardId}/toggle`, {
      method: 'PATCH',
      headers: { ...csrfHeaders },
      credentials: 'include'
    });

    const result = await response.json();

    if (result.success) {
      loadBoardAdminList();
      loadPublicBoardMenus();
    } else if (result.requiresVerification) {
      alert(window.i18n?.boardAdminAuthExpired || '관리자 인증이 만료되었습니다. 다시 인증해주세요.');
      if (typeof showAdminPasswordPopup === 'function') {
        showAdminPasswordPopup();
      }
    } else {
      alert(result.message || (window.i18n?.boardToggleFailed || '상태 변경에 실패했습니다.'));
    }
  } catch (error) {
    console.error('[BoardAdmin] 상태 토글 실패:', error);
    alert(window.i18n?.boardToggleError || '상태 변경 중 오류가 발생했습니다.');
  }
}

/**
 * HTML 이스케이프
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 선택된 게시판 일괄 번역
 */
async function translateAllBoards() {
  // 선택된 게시판 확인
  const selectedIds = Array.from(selectedBoardIds);

  if (selectedIds.length === 0) {
    alert(window.i18n?.boardTranslateNoSelection || '번역할 게시판을 선택해주세요.');
    return;
  }

  // 확인 메시지
  const confirmMsg = (window.i18n?.boardTranslateConfirmSelected || '{count}개 게시판을 번역하시겠습니까?\n(Gemini 2.0 Flash AI 사용)')
    .replace('{count}', selectedIds.length);
  const processingMsg = window.i18n?.boardTranslateProcessing || 'AI 번역을 진행 중입니다...';

  if (!confirm(confirmMsg)) {
    return;
  }

  const translateBtn = document.getElementById('translateBoardsBtn');
  if (translateBtn) {
    translateBtn.disabled = true;
    translateBtn.innerHTML = `<span></span> <span>${processingMsg}</span>`;
  }

  try {
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/boards/translate-selected', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include',
      body: JSON.stringify({ boardIds: selectedIds })
    });

    const result = await response.json();

    if (result.success) {
      const successMsg = (window.i18n?.boardTranslateSelectedSuccess || '{count}개 게시판 번역이 완료되었습니다.')
        .replace('{count}', result.data?.translated || 0);
      alert(successMsg);
      loadBoardAdminList(); // 목록 새로고침
    } else if (result.requiresVerification) {
      alert(window.i18n?.boardAdminAuthExpired || '관리자 인증이 만료되었습니다. 다시 인증해주세요.');
      if (typeof showAdminPasswordPopup === 'function') {
        showAdminPasswordPopup();
      }
    } else {
      alert(result.message || (window.i18n?.boardTranslateFailed || '번역에 실패했습니다.'));
    }
  } catch (error) {
    console.error('[BoardAdmin] 일괄 번역 실패:', error);
    alert(window.i18n?.boardTranslateError || '번역 중 오류가 발생했습니다.');
  } finally {
    if (translateBtn) {
      translateBtn.disabled = false;
      translateBtn.innerHTML = `<span>${mmIcon('globe', 14)}</span> <span data-i18n="boardBtnTranslate">${window.i18n?.boardBtnTranslate || '일괄 번역'}</span>`;
    }
  }
}

/**
 * 전체 선택/해제 핸들러
 */
function handleSelectAll(e) {
  const isChecked = e.target.checked;
  const checkboxes = document.querySelectorAll('.board-checkbox');

  checkboxes.forEach(cb => {
    cb.checked = isChecked;
    const boardId = parseInt(cb.value, 10);
    if (isChecked) {
      selectedBoardIds.add(boardId);
    } else {
      selectedBoardIds.delete(boardId);
    }
  });

  updateSelectedCount();
}

/**
 * 개별 체크박스 변경 핸들러
 */
function handleBoardCheckboxChange(e) {
  const boardId = parseInt(e.target.value, 10);

  if (e.target.checked) {
    selectedBoardIds.add(boardId);
  } else {
    selectedBoardIds.delete(boardId);
  }

  // 전체 선택 체크박스 상태 업데이트
  updateSelectAllCheckbox();
  updateSelectedCount();
}

/**
 * 전체 선택 체크박스 상태 업데이트
 */
function updateSelectAllCheckbox() {
  const selectAllCheckbox = document.getElementById('selectAllBoards');
  const checkboxes = document.querySelectorAll('.board-checkbox');

  if (!selectAllCheckbox || checkboxes.length === 0) return;

  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  const someChecked = Array.from(checkboxes).some(cb => cb.checked);

  selectAllCheckbox.checked = allChecked;
  selectAllCheckbox.indeterminate = someChecked && !allChecked;
}

/**
 * 선택된 개수 표시 업데이트
 */
function updateSelectedCount() {
  const countDisplay = document.getElementById('selectedBoardCount');
  if (!countDisplay) return;

  const count = selectedBoardIds.size;
  if (count > 0) {
    const text = (window.i18n?.boardSelectedCount || '{count}개 선택됨').replace('{count}', count);
    countDisplay.textContent = text;
    countDisplay.style.display = 'inline-block';
  } else {
    countDisplay.style.display = 'none';
  }
}

// 전역 함수 등록
window.initBoardAdmin = initBoardAdmin;
window.loadBoardAdminList = loadBoardAdminList;
window.openBoardEditModal = openBoardEditModal;
window.closeBoardEditModal = closeBoardEditModal;
window.saveBoardForm = saveBoardForm;
window.editBoard = editBoard;
window.deleteBoard = deleteBoard;
window.toggleBoardPublic = toggleBoardPublic;
window.translateAllBoards = translateAllBoards;
