/**
 * 게시판 사용자 UI
 * settings-board.js
 *
 * 공개 게시판 메뉴 및 게시글 UI
 * Phase 3: 파일 첨부 기능 포함
 *
 * @version 1.1.0
 * @date 2025-12-21
 */

// 공개 게시판 목록 데이터
let publicBoardsData = [];
let currentBoardKey = null;
let currentPostId = null;
let pendingFiles = []; // 업로드 대기 중인 파일

/**
 * 현재 언어 코드 가져오기
 */
function getCurrentLanguage() {
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
function getBoardName(board) {
  if (!board) return '';
  const lang = getCurrentLanguage();

  if (board.name_translations) {
    try {
      const translations = typeof board.name_translations === 'string'
        ? JSON.parse(board.name_translations)
        : board.name_translations;
      return getLocalizedText(translations, lang, board.name);
    } catch (e) {
      // JSON 파싱 실패 시 기본 이름 반환
    }
  }
  return board.name || '';
}

/**
 * 게시판 설명 가져오기 (다국어 지원)
 */
function getBoardDescription(board) {
  if (!board) return '';
  const lang = getCurrentLanguage();

  if (board.description_translations) {
    try {
      const translations = typeof board.description_translations === 'string'
        ? JSON.parse(board.description_translations)
        : board.description_translations;
      return getLocalizedText(translations, lang, board.description);
    } catch (e) {
      // JSON 파싱 실패 시 기본 설명 반환
    }
  }
  return board.description || '';
}

/**
 * 번역 객체에서 현재 언어의 텍스트 가져오기
 */
function getLocalizedText(translations, lang, fallback = '') {
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
 * 게시판 UI 초기화
 */
function initBoardUI() {
  console.log('[BoardUI] 게시판 UI 초기화');

  // 공개 게시판 메뉴 로드
  loadPublicBoardMenus();
}

/**
 * 공개 게시판 메뉴 로드
 */
async function loadPublicBoardMenus() {
  const menuContainer = document.getElementById('dynamicBoardMenus');
  if (!menuContainer) return;

  try {
    const response = await fetch('/api/boards/public', {
      credentials: 'include'
    });

    if (!response.ok) {
      console.warn('[BoardUI] 공개 게시판 목록 조회 실패');
      return;
    }

    const result = await response.json();

    if (result.success && result.data && result.data.length > 0) {
      publicBoardsData = result.data;
      renderPublicBoardMenus(publicBoardsData);
      createDynamicBoardSections(publicBoardsData);
    } else {
      menuContainer.innerHTML = '';
    }
  } catch (error) {
    console.error('[BoardUI] 공개 게시판 메뉴 로드 실패:', error);
  }
}

/**
 * 공개 게시판 메뉴 렌더링
 */
function renderPublicBoardMenus(boards) {
  const menuContainer = document.getElementById('dynamicBoardMenus');
  if (!menuContainer || !boards || boards.length === 0) return;

  const html = `
    <div class="nav-divider"></div>
    <ul class="nav-list board-nav-list">
      ${boards.map(board => `
        <li class="nav-item" data-menu="board-${board.board_key}">
          <span class="nav-icon">${mmIcon('megaphone', 16)}</span>
          <span class="nav-label">${escapeHtmlBoard(getBoardName(board))}</span>
        </li>
      `).join('')}
    </ul>
  `;

  menuContainer.innerHTML = html;

  // 메뉴 클릭 이벤트 등록
  const boardNavItems = menuContainer.querySelectorAll('.nav-item');
  boardNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const menu = item.getAttribute('data-menu');
      handleBoardMenuClick(menu);
    });
  });
}

/**
 * 동적 게시판 콘텐츠 섹션 생성
 */
function createDynamicBoardSections(boards) {
  const container = document.getElementById('dynamicBoardContents');
  if (!container || !boards) return;

  const writeLabel = t('boardBtnWrite', '글쓰기');
  const loadingLabel = t('boardLoading', '로딩 중...');

  const html = boards.map(board => `
    <section id="content-board-${board.board_key}" class="content-section board-section" data-board-key="${board.board_key}">
      <div class="section-header">
        <div class="section-header-text">
          <h2 class="section-title">${mmIcon('megaphone', 16)} ${escapeHtmlBoard(getBoardName(board))}</h2>
          <p class="section-description">${escapeHtmlBoard(getBoardDescription(board))}</p>
        </div>
        <button class="btn-primary btn-write-post" data-board-key="${board.board_key}" data-write-permission="${board.write_permission}">
          <span>${mmIcon('edit', 14)}</span>
          <span>${writeLabel}</span>
        </button>
      </div>

      <!-- 게시글 목록 -->
      <div id="board-posts-${board.board_key}" class="board-posts-container">
        <div class="loading-spinner">${loadingLabel}</div>
      </div>

      <!-- 페이지네이션 -->
      <div id="board-pagination-${board.board_key}" class="board-pagination"></div>
    </section>
  `).join('');

  container.innerHTML = html;

  // 글쓰기 버튼 이벤트 위임 설정
  container.addEventListener('click', (e) => {
    const writeBtn = e.target.closest('.btn-write-post[data-board-key]');
    if (writeBtn) {
      const boardKey = writeBtn.dataset.boardKey;
      console.log('[BoardUI] 글쓰기 버튼 클릭:', boardKey);
      openPostWriteModal(boardKey);
    }
  });
}

/**
 * 게시판 메뉴 클릭 핸들러
 */
function handleBoardMenuClick(menuId) {
  // 모든 nav-item에서 active 제거
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });

  // 클릭된 메뉴에 active 추가
  const clickedItem = document.querySelector(`[data-menu="${menuId}"]`);
  if (clickedItem) {
    clickedItem.classList.add('active');
  }

  // 모든 content-section 숨기기
  document.querySelectorAll('.content-section').forEach(section => {
    section.classList.remove('active');
  });

  // 해당 콘텐츠 섹션 표시
  const contentSection = document.getElementById(`content-${menuId}`);
  if (contentSection) {
    contentSection.classList.add('active');

    // 게시판 키 추출
    const boardKey = menuId.replace('board-', '');
    currentBoardKey = boardKey;

    // 게시글 목록 로드
    loadBoardPosts(boardKey);
  }
}

/**
 * 게시글 목록 로드
 */
async function loadBoardPosts(boardKey, page = 1) {
  const container = document.getElementById(`board-posts-${boardKey}`);
  if (!container) return;

  try {
    container.innerHTML = '<div class="loading-spinner">' + t('boardLoading', '로딩 중...') + '</div>';

    const response = await fetch(`/api/boards/${boardKey}/posts?page=${page}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('게시글 목록 조회 실패');
    }

    const result = await response.json();

    if (result.success) {
      renderBoardPosts(boardKey, result.data || [], result.pagination);
    } else {
      container.innerHTML = '<p class="error-text">' + t('boardPostLoadError', '게시글을 불러올 수 없습니다.') + '</p>';
    }
  } catch (error) {
    console.error('[BoardUI] 게시글 목록 로드 실패:', error);
    container.innerHTML = `
      <div class="empty-state">
        <p>${t('boardNoPost', '아직 게시글이 없습니다.')}</p>
      </div>
    `;
  }
}

/**
 * 게시글 목록 렌더링
 */
function renderBoardPosts(boardKey, posts, pagination) {
  const container = document.getElementById(`board-posts-${boardKey}`);
  if (!container) return;

  if (!posts || posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>${t('boardNoPost', '아직 게시글이 없습니다.')}</p>
      </div>
    `;
    return;
  }

  const html = `
    <table class="board-posts-table">
      <thead>
        <tr>
          <th style="width: 60px;">${t('boardColNumber', '번호')}</th>
          <th>${t('boardColTitle', '제목')}</th>
          <th style="width: 120px;">${t('boardColAuthor', '작성자')}</th>
          <th style="width: 100px;">${t('boardColDate', '작성일')}</th>
          <th style="width: 60px;">${t('boardColViews', '조회')}</th>
        </tr>
      </thead>
      <tbody>
        ${posts.map((post, index) => `
          <tr class="${post.is_notice ? 'notice-row' : ''} ${post.is_pinned ? 'pinned-row' : ''}"
              data-board-key="${boardKey}" data-post-id="${post.id}" style="cursor: pointer;">
            <td class="text-center">
              ${post.is_notice ? '<span class="badge notice">' + t('boardNotice', '공지') + '</span>' : (post.is_pinned ? '<span class="badge pinned">' + mmIcon('map-pin', 12) + '</span>' : post.id)}
            </td>
            <td>
              <span class="post-title">${escapeHtmlBoard(post.title)}</span>
              ${post.has_files ? '<span class="file-icon">' + mmIcon('paperclip', 14) + '</span>' : ''}
              ${post.comment_count > 0 ? `<span class="comment-count">[${post.comment_count}]</span>` : ''}
            </td>
            <td>${escapeHtmlBoard(post.author_name || t('boardAnonymous', '익명'))}</td>
            <td>${formatDate(post.created_at)}</td>
            <td class="text-center">${post.view_count || 0}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.innerHTML = html;

  // 게시글 클릭 이벤트 위임
  container.querySelectorAll('tr[data-post-id]').forEach(row => {
    row.addEventListener('click', () => {
      const postBoardKey = row.dataset.boardKey;
      const postId = parseInt(row.dataset.postId, 10);
      console.log('[BoardUI] 게시글 클릭:', postBoardKey, postId);
      viewPost(postBoardKey, postId);
    });
  });

  // 페이지네이션 렌더링
  if (pagination && pagination.totalPages > 1) {
    renderPagination(boardKey, pagination);
  }
}

/**
 * 페이지네이션 렌더링
 */
function renderPagination(boardKey, pagination) {
  const container = document.getElementById(`board-pagination-${boardKey}`);
  if (!container) return;

  const { page, totalPages } = pagination;

  let html = '';

  if (page > 1) {
    html += `<button onclick="loadBoardPosts('${boardKey}', ${page - 1})">${t('boardPrevPage', '이전')}</button>`;
  }

  html += `<span class="page-info">${page} / ${totalPages}</span>`;

  if (page < totalPages) {
    html += `<button onclick="loadBoardPosts('${boardKey}', ${page + 1})">${t('boardNextPage', '다음')}</button>`;
  }

  container.innerHTML = html;
}

/**
 * 게시글 상세 보기
 */
async function viewPost(boardKey, postId) {
  console.log(`[BoardUI] 게시글 보기: ${boardKey}/${postId}`);
  currentPostId = postId;

  try {
    const response = await fetch(`/api/boards/${boardKey}/posts/${postId}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('게시글 조회 실패');
    }

    const result = await response.json();

    if (result.success) {
      showPostDetailModal(boardKey, result.data);
    } else {
      alert(t('boardPostLoadError', '게시글을 불러올 수 없습니다.'));
    }
  } catch (error) {
    console.error('[BoardUI] 게시글 조회 실패:', error);
    alert(t('boardPostLoadNetworkError', '게시글을 불러오는 중 오류가 발생했습니다.'));
  }
}

/**
 * 게시글 상세 모달 표시
 */
function showPostDetailModal(boardKey, post) {
  // 기존 모달 제거
  const existingModal = document.getElementById('postDetailModal');
  if (existingModal) {
    existingModal.remove();
  }

  const filesHtml = post.files && post.files.length > 0 ? `
    <div class="post-attachments">
      <h4>${mmIcon('paperclip', 14)} ${t('boardAttachments', '첨부파일')} (${post.files.length}${t('boardCountUnit', '개')})</h4>
      <ul class="file-list">
        ${post.files.map(file => `
          <li class="file-item">
            <span class="file-icon">${getFileIcon(file.mime_type)}</span>
            <span class="file-name">${escapeHtmlBoard(file.original_name)}</span>
            <span class="file-size">(${formatFileSize(file.file_size)})</span>
            <button class="btn-download" data-file-id="${file.id}">${t('boardDownload', '다운로드')}</button>
          </li>
        `).join('')}
      </ul>
    </div>
  ` : '';

  // 번역 버튼 라벨
  const translateBtnLabel = t('boardTranslateBtn', mmIcon('globe', 14) + ' 번역');

  const modalHtml = `
    <div id="postDetailModal" class="modal-overlay">
      <div class="modal-container post-detail-modal">
        <div class="modal-header">
          <h2 id="postDetailTitle">${escapeHtmlBoard(post.title)}</h2>
          <div class="modal-header-actions">
            <button class="btn-translate" id="btnTranslatePost" title="${translateBtnLabel}">${translateBtnLabel}</button>
            <button class="modal-close">&times;</button>
          </div>
        </div>
        <div class="post-meta">
          <span>${t('boardAuthorLabel', '작성자')}: ${escapeHtmlBoard(post.author_name || t('boardAnonymous', '익명'))}</span>
          <span>${t('boardDateLabel', '작성일')}: ${formatDateFull(post.created_at)}</span>
          <span>${t('boardViewsLabel', '조회')}: ${post.view_count || 0}</span>
        </div>
        <div class="modal-body">
          <div class="post-content" id="postDetailContent">
            ${post.content}
          </div>
          <div id="postDetailFiles">${filesHtml}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary btn-back-to-list" data-board-key="${boardKey}">${t('boardBackToList', '목록으로')}</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // 모달 이벤트 리스너 등록
  const modal = document.getElementById('postDetailModal');
  if (modal) {
    // 오버레이 클릭 시 닫기
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closePostDetailModal();
      }
    });

    // 모달 컨테이너 클릭 시 이벤트 전파 방지
    const container = modal.querySelector('.modal-container');
    if (container) {
      container.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // X 버튼
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closePostDetailModal();
      });
    }

    // 목록으로 버튼
    const backBtn = modal.querySelector('.btn-back-to-list');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const bKey = backBtn.dataset.boardKey;
        goBackToList(bKey);
      });
    }

    // 다운로드 버튼들
    modal.querySelectorAll('.btn-download[data-file-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const fileId = parseInt(btn.dataset.fileId, 10);
        console.log('[BoardUI] 파일 다운로드:', fileId);
        downloadFile(fileId);
      });
    });

    // 번역 버튼
    const translateBtn = modal.querySelector('#btnTranslatePost');
    if (translateBtn) {
      translateBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await translatePostContent(post, translateBtn);
      });
    }
  }
}

/**
 * 게시글 내용 번역 (1회성, DB 저장 안함)
 */
async function translatePostContent(post, translateBtn) {
  // 현재 언어 가져오기
  const targetLang = getCurrentLanguage();

  // 이미 번역 중이면 무시
  if (translateBtn.disabled) return;

  // 버튼 상태 변경
  const originalText = translateBtn.textContent;
  translateBtn.textContent = t('boardTranslating', '번역 중...');
  translateBtn.disabled = true;

  try {
    // 파일명 추출
    const fileNames = post.files ? post.files.map(f => f.original_name) : [];

    // API 호출
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/boards/translate-content', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...csrfHeaders
      },
      body: JSON.stringify({
        title: post.title,
        content: post.content,
        fileNames: fileNames,
        targetLang: targetLang
      })
    });

    const result = await response.json();

    if (result.success && result.data) {
      // 제목 업데이트
      const titleEl = document.getElementById('postDetailTitle');
      if (titleEl && result.data.title) {
        titleEl.textContent = result.data.title;
      }

      // 내용 업데이트
      const contentEl = document.getElementById('postDetailContent');
      if (contentEl && result.data.content) {
        contentEl.innerHTML = result.data.content;
      }

      // 파일명 업데이트
      if (result.data.fileNames && result.data.fileNames.length > 0) {
        const filesContainer = document.getElementById('postDetailFiles');
        if (filesContainer) {
          const fileNameEls = filesContainer.querySelectorAll('.file-name');
          fileNameEls.forEach((el, index) => {
            if (result.data.fileNames[index]) {
              el.textContent = result.data.fileNames[index];
            }
          });
        }
      }

      // 버튼 상태 업데이트
      translateBtn.innerHTML = mmIcon('globe', 14) + ' ' + t('boardTranslated', '번역됨');
    } else {
      throw new Error(result.message || '번역 실패');
    }
  } catch (error) {
    console.error('[BoardUI] 번역 오류:', error);
    alert(t('boardTranslateError', '번역에 실패했습니다.'));
    translateBtn.textContent = originalText;
    translateBtn.disabled = false;
  }
}

/**
 * 게시글 상세 모달 닫기
 */
function closePostDetailModal(event) {
  if (event && event.target !== event.currentTarget) return;

  const modal = document.getElementById('postDetailModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * 목록으로 돌아가기
 */
function goBackToList(boardKey) {
  closePostDetailModal();
  loadBoardPosts(boardKey);
}

/**
 * 파일 다운로드
 */
function downloadFile(fileId) {
  window.location.href = `/api/boards/files/${fileId}`;
}

/**
 * 글쓰기 모달 열기
 */
function openPostWriteModal(boardKey, editPost = null) {
  console.log(`[BoardUI] 글쓰기: ${boardKey}`);
  currentBoardKey = boardKey;
  pendingFiles = [];

  // 게시판 정보 찾기
  const board = publicBoardsData.find(b => b.board_key === boardKey);
  if (!board) {
    alert(t('boardNotFound', '게시판 정보를 찾을 수 없습니다.'));
    return;
  }

  // 기존 모달 제거
  const existingModal = document.getElementById('postWriteModal');
  if (existingModal) {
    existingModal.remove();
  }

  const isEdit = !!editPost;
  const title = isEdit
    ? t('boardPostEditTitle', '게시글 수정')
    : t('boardPostWriteTitle', '글쓰기');

  // i18n 텍스트
  const titleLabel = t('boardTitleLabel', '제목');
  const titlePlaceholder = t('boardTitlePlaceholder', '제목을 입력하세요');
  const contentLabel = t('boardContentLabel', '내용');
  const contentPlaceholder = t('boardContentPlaceholder', '내용을 입력하세요');
  const cancelLabel = t('boardBtnCancel', '취소');
  const submitLabel = isEdit
    ? t('boardBtnUpdate', '수정')
    : t('boardBtnSubmit', '등록');

  // 파일 첨부 관련 i18n
  const maxFileSize = board.max_file_size || 3145728; // 기본 3MB
  const fileSize = Math.floor(maxFileSize / 1024 / 1024);
  const fileAttachLabel = t('boardFileAttach', '파일 첨부');
  const fileAttachDesc = t('boardFileAttachDesc', '최대 {count}개, 각 {size}MB')
    .replace('{count}', '5')
    .replace('{size}', fileSize);
  const fileSelectLabel = t('boardFileSelect', '파일 선택');
  const fileAllowedExt = t('boardFileAllowedExt', '허용 확장자: 실행파일 제외');

  const fileUploadHtml = board.allow_file_upload ? `
    <div class="form-group">
      <label>${mmIcon('paperclip', 14)} ${fileAttachLabel} (${fileAttachDesc})</label>
      <div class="file-upload-area" id="fileUploadArea">
        <input type="file" id="fileInput" multiple style="display: none;">
        <button type="button" class="btn-secondary" id="btnSelectFile">
          + ${fileSelectLabel}
        </button>
        <p class="form-hint">${fileAllowedExt}</p>
      </div>
      <div id="pendingFilesList" class="pending-files-list"></div>
    </div>
  ` : '';

  const modalHtml = `
    <div id="postWriteModal" class="modal-overlay">
      <div class="modal-container post-write-modal">
        <div class="modal-header">
          <h2>${mmIcon('edit', 14)} ${title}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <form id="postWriteForm" data-board-key="${boardKey}" data-post-id="${isEdit ? editPost.id : ''}">
            <div class="form-group">
              <label for="postTitle">${titleLabel} *</label>
              <input type="text" id="postTitle" class="form-input" required
                     placeholder="${titlePlaceholder}" value="${isEdit ? escapeHtmlBoard(editPost.title) : ''}">
            </div>

            <div class="form-group">
              <label for="postContent">${contentLabel} *</label>
              <textarea id="postContent" class="form-textarea" required rows="10"
                        placeholder="${contentPlaceholder}">${isEdit ? escapeHtmlBoard(editPost.content) : ''}</textarea>
            </div>

            ${fileUploadHtml}
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary btn-cancel">${cancelLabel}</button>
          <button type="submit" class="btn-primary" form="postWriteForm">
            ${submitLabel}
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // 모달 이벤트 리스너 등록
  const modal = document.getElementById('postWriteModal');
  if (modal) {
    // 오버레이 클릭 시 닫기
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closePostWriteModal();
      }
    });

    // X 버튼
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closePostWriteModal();
      });
    }

    // 취소 버튼
    const cancelBtn = modal.querySelector('.btn-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closePostWriteModal();
      });
    }

    // 폼 제출
    const form = document.getElementById('postWriteForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formBoardKey = form.dataset.boardKey;
        const formPostId = form.dataset.postId || null;
        submitPost(e, formBoardKey, formPostId ? parseInt(formPostId) : null);
      });
    }

    // 파일 선택 버튼
    const fileSelectBtn = document.getElementById('btnSelectFile');
    const fileInput = document.getElementById('fileInput');
    if (fileSelectBtn && fileInput) {
      fileSelectBtn.addEventListener('click', () => {
        console.log('[BoardUI] 파일 선택 버튼 클릭');
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        handleFileSelect(e);
      });
    }
  }
}

/**
 * 글쓰기 모달 닫기
 */
function closePostWriteModal(event) {
  if (event && event.target !== event.currentTarget) return;

  const modal = document.getElementById('postWriteModal');
  if (modal) {
    modal.remove();
  }
  pendingFiles = [];
}

/**
 * 파일 선택 핸들러
 */
function handleFileSelect(event) {
  const files = Array.from(event.target.files);

  // 게시판 설정 확인
  const board = publicBoardsData.find(b => b.board_key === currentBoardKey);
  const maxFileSize = board?.max_file_size || 3145728; // 기본 3MB
  const allowedExtensions = (board?.allowed_extensions || 'jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,zip').split(',');

  for (const file of files) {
    // 최대 5개 제한
    if (pendingFiles.length >= 5) {
      alert(t('boardFileMaxCount', '파일은 최대 5개까지 첨부할 수 있습니다.'));
      break;
    }

    // 파일 크기 검증
    if (file.size > maxFileSize) {
      alert(`${file.name}: ${t('boardFileSizeExceed', '파일 크기가 초과합니다.')}`);
      continue;
    }

    // 확장자 검증
    const ext = file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      alert(`${file.name}: ${t('boardFileTypeNotAllowed', '허용되지 않은 파일 형식입니다.')}`);
      continue;
    }

    // 중복 파일 체크
    if (pendingFiles.some(f => f.name === file.name && f.size === file.size)) {
      alert(`${file.name}: ${t('boardFileDuplicate', '이미 추가된 파일입니다.')}`);
      continue;
    }

    pendingFiles.push(file);
  }

  renderPendingFiles();
  event.target.value = ''; // 입력 초기화
}

/**
 * 대기 중인 파일 목록 렌더링
 */
function renderPendingFiles() {
  const container = document.getElementById('pendingFilesList');
  if (!container) return;

  if (pendingFiles.length === 0) {
    container.innerHTML = '';
    return;
  }

  const html = pendingFiles.map((file, index) => `
    <div class="pending-file-item" data-file-index="${index}">
      <span class="file-icon">${getFileIconByName(file.name)}</span>
      <span class="file-name">${escapeHtmlBoard(file.name)}</span>
      <span class="file-size">(${formatFileSize(file.size)})</span>
      <button type="button" class="btn-remove" data-action="remove-file" data-index="${index}"></button>
    </div>
  `).join('');

  container.innerHTML = html;

  // 파일 삭제 버튼 이벤트 위임
  container.querySelectorAll('.btn-remove[data-action="remove-file"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const index = parseInt(btn.dataset.index, 10);
      console.log('[BoardUI] 파일 삭제:', index);
      removePendingFile(index);
    });
  });
}

/**
 * 대기 중인 파일 제거
 */
function removePendingFile(index) {
  pendingFiles.splice(index, 1);
  renderPendingFiles();
}

/**
 * 게시글 제출
 */
async function submitPost(event, boardKey, postId) {
  event.preventDefault();

  const title = document.getElementById('postTitle').value.trim();
  const content = document.getElementById('postContent').value.trim();

  if (!title || !content) {
    alert(t('boardRequiredFields', '제목과 내용을 입력해주세요.'));
    return;
  }

  try {
    const isEdit = postId !== null;
    const url = isEdit
      ? `/api/boards/${boardKey}/posts/${postId}`
      : `/api/boards/${boardKey}/posts`;

    // 게시글 저장
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...csrfHeaders
      },
      credentials: 'include',
      body: JSON.stringify({ title, content })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '게시글 저장 실패');
    }

    const result = await response.json();

    if (result.success) {
      const savedPostId = isEdit ? postId : result.data.id;

      // 파일 업로드
      if (pendingFiles.length > 0) {
        await uploadFiles(boardKey, savedPostId);
      }

      alert(isEdit ? t('boardPostUpdated', '게시글이 수정되었습니다.') : t('boardPostCreated', '게시글이 등록되었습니다.'));
      closePostWriteModal();
      loadBoardPosts(boardKey);
    } else {
      throw new Error(result.message || '게시글 저장 실패');
    }
  } catch (error) {
    console.error('[BoardUI] 게시글 저장 실패:', error);
    alert(error.message || t('boardPostSaveError', '게시글 저장 중 오류가 발생했습니다.'));
  }
}

/**
 * 파일 업로드
 */
async function uploadFiles(boardKey, postId) {
  if (pendingFiles.length === 0) return;

  const formData = new FormData();
  for (const file of pendingFiles) {
    formData.append('files', file);
  }

  try {
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch(`/api/boards/${boardKey}/posts/${postId}/files`, {
      method: 'POST',
      headers: { ...csrfHeaders },
      credentials: 'include',
      body: formData
    });

    if (!response.ok) {
      console.error('파일 업로드 실패');
    }

    const result = await response.json();

    if (result.data?.errors && result.data.errors.length > 0) {
      const errorMessages = result.data.errors.map(e => `${e.filename}: ${e.error}`).join('\n');
      alert(`${t('boardFileUploadPartialFail', '일부 파일 업로드 실패')}:\n${errorMessages}`);
    }
  } catch (error) {
    console.error('[BoardUI] 파일 업로드 실패:', error);
  }
}

/**
 * 날짜 포맷
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return (window.MyMind3?.Intl?.formatTime(date) || date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
  }

  return (window.MyMind3?.Intl?.formatDate(date, { month: '2-digit', day: '2-digit' }) || date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }));
}

/**
 * 날짜 전체 포맷
 */
function formatDateFull(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return (window.MyMind3?.Intl?.formatDate(date, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) || date.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }));
}

/**
 * 파일 크기 포맷
 */
function formatFileSize(bytes) {
  const intl = window.MyMind3?.Intl;
  if (intl) return intl.formatFileSize(bytes);
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * MIME 타입으로 아이콘 반환
 */
function getFileIcon(mimeType) {
  if (!mimeType) return mmIcon('paperclip', 14);
  if (mimeType.startsWith('image/')) return mmIcon('image', 14);
  if (mimeType === 'application/pdf') return mmIcon('file', 14);
  if (mimeType.includes('word')) return mmIcon('text', 14);
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return mmIcon('bar-chart', 14);
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return mmIcon('monitor', 14);
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return mmIcon('package', 14);
  return mmIcon('paperclip', 14);
}

/**
 * 파일명으로 아이콘 반환
 */
function getFileIconByName(filename) {
  if (!filename) return mmIcon('paperclip', 14);
  const ext = filename.split('.').pop().toLowerCase();

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const docExts = ['pdf'];
  const wordExts = ['doc', 'docx'];
  const excelExts = ['xls', 'xlsx'];
  const pptExts = ['ppt', 'pptx'];
  const archiveExts = ['zip', 'rar', '7z'];

  if (imageExts.includes(ext)) return mmIcon('image', 14);
  if (docExts.includes(ext)) return mmIcon('file', 14);
  if (wordExts.includes(ext)) return mmIcon('text', 14);
  if (excelExts.includes(ext)) return mmIcon('bar-chart', 14);
  if (pptExts.includes(ext)) return mmIcon('monitor', 14);
  if (archiveExts.includes(ext)) return mmIcon('package', 14);
  return mmIcon('paperclip', 14);
}

/**
 * HTML 이스케이프 (게시판용)
 */
function escapeHtmlBoard(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 전역 함수 등록
window.initBoardUI = initBoardUI;
window.loadPublicBoardMenus = loadPublicBoardMenus;
window.handleBoardMenuClick = handleBoardMenuClick;
window.loadBoardPosts = loadBoardPosts;
window.viewPost = viewPost;
window.openPostWriteModal = openPostWriteModal;
window.closePostWriteModal = closePostWriteModal;
window.closePostDetailModal = closePostDetailModal;
window.goBackToList = goBackToList;
window.downloadFile = downloadFile;
window.handleFileSelect = handleFileSelect;
window.removePendingFile = removePendingFile;
window.submitPost = submitPost;
