/**
 * Access Keys 설정 관리
 * Settings > Agent Skills 섹션
 */

(function() {
  'use strict';

  // DOM 요소
  let accessKeysList;
  let btnNewAccessKey;
  let newAccessKeyModal;
  let newAccessKeyForm;
  let deleteAccessKeyModal;

  // 연결 테스트 DOM 요소
  let noKeyWarning;
  let connectionTestUI;
  let testKeySelect;
  let btnTestConnection;
  let connectionTestResult;
  let keyFilePathInput;
  let btnSaveKeyPath;
  let pathRequiredNotice;
  let serverUrlInput;
  let btnSaveServerUrl;

  // 상태
  let currentDeleteKeyId = null;
  let loadedKeys = []; // 로드된 키 목록 저장
  let keyFilePathSaved = false; // 키 파일 경로 저장 여부
  let serverUrlSaved = false; // 서버 주소 저장 여부

  /**
   * 초기화
   */
  function init() {
    // DOM 요소 캐싱
    accessKeysList = document.getElementById('accessKeysList');
    btnNewAccessKey = document.getElementById('btnNewAccessKey');
    newAccessKeyModal = document.getElementById('newAccessKeyModal');
    newAccessKeyForm = document.getElementById('newAccessKeyForm');
    deleteAccessKeyModal = document.getElementById('deleteAccessKeyModal');

    // 연결 테스트 DOM 요소
    noKeyWarning = document.getElementById('noKeyWarning');
    connectionTestUI = document.getElementById('connectionTestUI');
    testKeySelect = document.getElementById('testKeySelect');
    btnTestConnection = document.getElementById('btnTestConnection');
    connectionTestResult = document.getElementById('connectionTestResult');
    keyFilePathInput = document.getElementById('keyFilePath');
    btnSaveKeyPath = document.getElementById('btnSaveKeyPath');
    pathRequiredNotice = document.getElementById('pathRequiredNotice');
    serverUrlInput = document.getElementById('serverUrl');
    btnSaveServerUrl = document.getElementById('btnSaveServerUrl');

    if (!accessKeysList) return;

    // 이벤트 리스너 등록
    bindEvents();

    // 키 목록 로드
    loadAccessKeys();
  }

  /**
   * 이벤트 바인딩
   */
  function bindEvents() {
    // 새 키 발급 버튼
    if (btnNewAccessKey) {
      btnNewAccessKey.addEventListener('click', openNewKeyModal);
    }

    // 모달 닫기 버튼들
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', function() {
        const modal = this.closest('.modal-overlay');
        if (modal) closeModal(modal);
      });
    });

    // 모달 배경 클릭으로 닫기
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', function(e) {
        if (e.target === this) closeModal(this);
      });
    });

    // 발급하기 버튼
    const btnCreate = document.getElementById('btnCreateAccessKey');
    if (btnCreate) {
      btnCreate.addEventListener('click', createAccessKey);
    }

    // 삭제 확인 버튼
    const btnConfirmDelete = document.getElementById('btnConfirmDeleteKey');
    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', confirmDeleteKey);
    }

    // 연결 테스트 - 키 선택 변경
    if (testKeySelect) {
      testKeySelect.addEventListener('change', function() {
        if (btnTestConnection) {
          btnTestConnection.disabled = !this.value;
        }
      });
    }

    // 연결 테스트 버튼
    if (btnTestConnection) {
      btnTestConnection.addEventListener('click', testSkillConnection);
    }

    // 키 파일 경로 저장 버튼
    if (btnSaveKeyPath) {
      btnSaveKeyPath.addEventListener('click', saveKeyFilePath);
    }

    // 서버 주소 저장 버튼
    if (btnSaveServerUrl) {
      btnSaveServerUrl.addEventListener('click', saveServerUrl);
    }
  }

  /**
   * Access Keys 목록 로드
   */
  async function loadAccessKeys() {
    try {
      const response = await fetch('/api/access-keys');
      if (!response.ok) {
        throw new Error('키 목록 조회 실패');
      }

      const data = await response.json();
      loadedKeys = data.keys || [];
      renderKeysList(loadedKeys);

      // 연결 테스트 UI 업데이트
      updateConnectionTestUI(loadedKeys);
    } catch (error) {
      console.error('키 목록 로드 실패:', error);
      accessKeysList.innerHTML = '<div class="access-keys-empty"><p>' + t('accessKeyLoadFailed', '키 목록을 불러오는데 실패했습니다.') + '</p></div>';
      loadedKeys = [];
      updateConnectionTestUI([]);
    }
  }

  /**
   * 키 목록 렌더링
   */
  function renderKeysList(keys) {
    // 키가 있으면 "새 키 발급" 버튼 비활성화 (1개 제한)
    if (btnNewAccessKey) {
      if (keys && keys.length > 0) {
        btnNewAccessKey.disabled = true;
        btnNewAccessKey.title = t('accessKeyAlreadyExists', '이미 발급된 키가 있습니다. 기존 키를 삭제한 후 새 키를 발급할 수 있습니다.');
        btnNewAccessKey.style.opacity = '0.5';
        btnNewAccessKey.style.cursor = 'not-allowed';
      } else {
        btnNewAccessKey.disabled = false;
        btnNewAccessKey.title = '';
        btnNewAccessKey.style.opacity = '';
        btnNewAccessKey.style.cursor = '';
      }
    }

    if (!keys || keys.length === 0) {
      const emptyTemplate = document.getElementById('accessKeysEmptyTemplate');
      if (emptyTemplate) {
        accessKeysList.innerHTML = emptyTemplate.innerHTML;
      } else {
        accessKeysList.innerHTML = '<div class="access-keys-empty"><span class="empty-icon">' + mmIcon('key', 16) + '</span><p>' + t('accessKeyEmpty', '발급된 Access Key가 없습니다.') + '</p></div>';
      }
      return;
    }

    const template = document.getElementById('accessKeyItemTemplate');
    accessKeysList.innerHTML = '';

    keys.forEach(key => {
      let item;
      if (template) {
        item = template.content.cloneNode(true).querySelector('.access-key-item');
      } else {
        item = document.createElement('div');
        item.className = 'access-key-item';
        item.innerHTML = `
          <div class="key-info">
            <div class="key-name"><span class="key-icon">${mmIcon('key', 16)}</span><span class="name"></span></div>
            <div class="key-details">
              <span class="detail-item">${t('accessKeyMindmap', '마인드맵')}: <strong class="mindmap-name"></strong></span>
              <span class="detail-item">${t('accessKeyPermission', '권한')}: <strong class="permission"></strong></span>
              <span class="detail-item">${t('accessKeyExpiry', '만료')}: <strong class="expires"></strong></span>
            </div>
            <div class="key-meta"><span class="created-at"></span></div>
          </div>
          <div class="key-actions">
            <button type="button" class="btn-icon btn-copy-hash" title="${t('accessKeyCopyHash', '해쉬 복사')}">${t('accessKeyHash', '해쉬')}</button>
            <button type="button" class="btn-icon btn-delete" title="삭제">${mmIcon('trash', 14)}</button>
          </div>
        `;
      }

      item.dataset.keyId = key.id;
      item.querySelector('.name').textContent = key.name;

      // scope에 따른 마인드맵 표시
      const mindmapEl = item.querySelector('.mindmap-name');
      if (mindmapEl) {
        if (key.scope === 'all') {
          mindmapEl.innerHTML = '<span class="scope-badge scope-all">' + mmIcon('globe', 14) + ' ' + t('accessKeyScopeAll', '전체') + '</span>';
        } else {
          const count = key.whitelist_mindmaps?.length || 1;
          const mindmapList = key.whitelist_mindmaps?.join(', ') || key.mindmap_name || '알 수 없음';
          mindmapEl.innerHTML = `<span class="scope-badge scope-whitelist" title="${mindmapList}">${mmIcon('clipboard', 14)} ${count}개</span>`;
        }
      }

      item.querySelector('.permission').textContent = key.permission === 'readwrite' ? t('accessKeyReadWrite', '읽기/쓰기') : t('accessKeyReadOnly', '읽기 전용');

      // 만료일 표시
      if (key.expires_at) {
        const expiresDate = new Date(key.expires_at);
        const now = new Date();
        const daysLeft = Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24));
        if (daysLeft < 0) {
          item.querySelector('.expires').textContent = t('accessKeyExpired', '만료됨');
          item.querySelector('.expires').style.color = 'var(--danger-color, #dc3545)';
        } else {
          item.querySelector('.expires').textContent = `${daysLeft}일 (${formatDate(expiresDate)})`;
        }
      } else {
        item.querySelector('.expires').textContent = t('accessKeyNoExpiry', '무기한');
      }

      item.querySelector('.created-at').textContent = `${t('accessKeyCreated', '생성')}: ${formatDate(new Date(key.created_at))}`;

      // 해쉬 복사 버튼
      const copyHashBtn = item.querySelector('.btn-copy-hash');
      copyHashBtn.addEventListener('click', () => {
        if (key.key_hash) {
          copyToClipboard(key.key_hash);
          copyHashBtn.textContent = t('copied', '복사됨');
          setTimeout(() => { copyHashBtn.textContent = t('accessKeyHash', '해쉬'); }, 1500);
        } else {
          copyHashBtn.textContent = t('none', '없음');
          setTimeout(() => { copyHashBtn.textContent = t('accessKeyHash', '해쉬'); }, 1500);
        }
      });

      // 삭제 버튼
      const deleteBtn = item.querySelector('.btn-delete');
      deleteBtn.addEventListener('click', () => openDeleteModal(key.id, key.name));

      accessKeysList.appendChild(item);
    });
  }

  /**
   * 새 키 발급 모달 열기
   */
  function openNewKeyModal() {
    // 1개 제한 체크
    if (loadedKeys && loadedKeys.length > 0) {
      alert(t('accessKeyAlreadyExistsAlert', '이미 발급된 키가 있습니다. 기존 키를 삭제한 후 새 키를 발급해주세요.'));
      return;
    }

    // 폼 초기화
    if (newAccessKeyForm) {
      newAccessKeyForm.reset();
    }

    openModal(newAccessKeyModal);
  }

  /**
   * 마인드맵 목록 로드 (하위 호환용)
   */
  async function loadMindmapList() {
    const select = document.getElementById('akMindmap');
    if (!select) return;

    try {
      const response = await fetch('/api/mindmap/savelist');
      if (!response.ok) throw new Error('마인드맵 목록 조회 실패');

      const data = await response.json();
      const folders = data.folders || [];

      // 기존 옵션 제거 (첫 번째 placeholder 제외)
      while (select.options.length > 1) {
        select.remove(1);
      }

      // 마인드맵 옵션 추가
      folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder;
        option.textContent = folder;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('마인드맵 목록 로드 실패:', error);
    }
  }

  /**
   * 마인드맵 체크박스 목록 로드 (whitelist용)
   */
  async function loadMindmapCheckboxes() {
    const container = document.getElementById('akMindmapCheckboxes');
    if (!container) return;

    container.innerHTML = '<div class="loading-placeholder">' + t('accessKeyMindmapLoading', '마인드맵 목록 로딩 중...') + '</div>';

    try {
      const response = await fetch('/api/mindmap/savelist');
      if (!response.ok) throw new Error('마인드맵 목록 조회 실패');

      const data = await response.json();
      const folders = data.folders || [];

      if (folders.length === 0) {
        container.innerHTML = '<div class="empty-placeholder">' + t('accessKeyNoMindmap', '저장된 마인드맵이 없습니다.') + '</div>';
        return;
      }

      // 체크박스 목록 생성
      container.innerHTML = folders.map(folder => `
        <label class="checkbox-item mindmap-checkbox">
          <input type="checkbox" name="akMindmapWhitelist" value="${folder}">
          <span class="checkbox-label">${folder}</span>
        </label>
      `).join('');
    } catch (error) {
      console.error('마인드맵 체크박스 로드 실패:', error);
      container.innerHTML = '<div class="error-placeholder">' + t('accessKeyListLoadFailed', '목록 로드 실패') + '</div>';
    }
  }

  /**
   * Access Key 생성
   */
  async function createAccessKey() {
    const keyName = document.getElementById('akKeyName').value.trim();

    // 유효성 검사
    if (!keyName) {
      alert(t('accessKeyNameRequired', '키 이름을 입력해주세요.'));
      document.getElementById('akKeyName').focus();
      return;
    }

    // 요청 데이터 구성 (고정값: scope=all, permission=readwrite, ip=null, expires=null)
    const requestData = {
      name: keyName,
      scope: 'all',
      permission: 'readwrite',
      ip_whitelist: null,
      expires_days: null
    };

    try {
      const response = await csrfUtils.secureFetch('/api/access-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '키 발급 실패');
      }

      const data = await response.json();

      // 서버에서 키 파일 자동 저장 완료 → 경로 UI 반영
      if (data.filePath) {
        if (keyFilePathInput) {
          keyFilePathInput.value = data.filePath;
        }
        keyFilePathSaved = true;
        updateTestControlsState();
      }

      // 발급 모달 닫기
      closeModal(newAccessKeyModal);

      // 목록 새로고침
      loadAccessKeys();
    } catch (error) {
      console.error('키 발급 실패:', error);
      alert(t('accessKeyCreateFailed', '키 발급에 실패했습니다') + ': ' + error.message);
    }
  }

  /**
   * 삭제 확인 모달 열기
   */
  function openDeleteModal(keyId, keyName) {
    currentDeleteKeyId = keyId;
    document.getElementById('deleteKeyName').textContent = keyName;
    openModal(deleteAccessKeyModal);
  }

  /**
   * 키 삭제 확인
   */
  async function confirmDeleteKey() {
    if (!currentDeleteKeyId) return;

    try {
      const response = await csrfUtils.secureFetch(`/api/access-keys/${currentDeleteKeyId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '삭제 실패');
      }

      closeModal(deleteAccessKeyModal);
      currentDeleteKeyId = null;

      // 목록 새로고침
      loadAccessKeys();
    } catch (error) {
      console.error('키 삭제 실패:', error);
      alert(t('accessKeyDeleteFailed', '키 삭제에 실패했습니다') + ': ' + error.message);
    }
  }

  /**
   * 모달 열기
   */
  function openModal(modal) {
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * 모달 닫기
   */
  function closeModal(modal) {
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  /**
   * 클립보드 복사
   */
  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      // 폴백
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  /**
   * Access Key를 설정된 키 파일 경로에 저장 (서버 API 호출)
   * @param {string} keyValue - Access Key 값
   * @param {HTMLElement} button - 저장 버튼 요소 (UI 업데이트용)
   */
  async function saveKeyToFile(keyValue, button) {
    try {
      // 서버 API로 키 파일 저장
      const response = await csrfUtils.secureFetch('/api/access-keys/save-to-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyValue })
      });

      const data = await response.json();

      if (data.success) {
        if (button) {
          button.innerHTML = mmIcon('check-circle', 14) + ' ' + t('accessKeySaved', '저장 완료');
          button.title = t('accessKeySavedAt', '저장됨') + `: ${data.filePath}`;
        }
        showToast(t('accessKeyFileSaved', '키가 저장되었습니다') + `: ${data.filePath}`, 'success');
      } else {
        // 키 파일 경로 미설정 시 브라우저 다운로드로 폴백
        if (data.message && data.message.includes('경로가 설정되지')) {
          downloadKeyFile(keyValue);
          if (button) {
            button.innerHTML = mmIcon('download', 14) + ' ' + t('accessKeyDownloaded', '다운로드됨');
          }
          showToast(t('accessKeyPathNotSet', '키 파일 경로가 설정되지 않아 다운로드되었습니다. 다운로드된 파일을 키 파일 경로에 복사해주세요.'), 'warning');
        } else {
          throw new Error(data.message || t('accessKeySaveFailed', '키 저장 실패'));
        }
      }
    } catch (error) {
      console.error('[AccessKeys] 키 파일 저장 실패:', error);
      // 에러 시 브라우저 다운로드로 폴백
      downloadKeyFile(keyValue);
      if (button) {
        button.innerHTML = mmIcon('download', 14) + ' ' + t('accessKeyDownloaded', '다운로드됨');
      }
      showToast(t('accessKeyServerSaveFailed', '서버 저장 실패로 파일이 다운로드되었습니다.'), 'warning');
    }
  }

  /**
   * 키 파일을 브라우저 다운로드로 저장 (폴백)
   * @param {string} keyValue - Access Key 값
   */
  function downloadKeyFile(keyValue) {
    const blob = new Blob([keyValue], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.mymindmp3';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 날짜 포맷
   */
  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // DOM 로드 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /**
   * 연결 테스트 UI 업데이트
   * Access Key가 있을 때만 테스트 UI 표시
   */
  function updateConnectionTestUI(keys) {
    if (!noKeyWarning || !connectionTestUI) return;

    if (!keys || keys.length === 0) {
      // 키가 없으면 경고 표시, 테스트 UI 숨김
      noKeyWarning.style.display = 'flex';
      connectionTestUI.style.display = 'none';
    } else {
      // 키가 있으면 테스트 UI 표시
      noKeyWarning.style.display = 'none';
      connectionTestUI.style.display = 'block';

      // 서버 주소 조회
      loadServerUrl();

      // 키 파일 경로 조회
      loadKeyFilePath();

      // 키 선택 드롭다운 업데이트
      if (testKeySelect) {
        // 기존 옵션 제거 (placeholder 제외)
        while (testKeySelect.options.length > 1) {
          testKeySelect.remove(1);
        }

        // 키 옵션 추가 (scope 정보 포함)
        keys.forEach(key => {
          const option = document.createElement('option');
          option.value = key.id;
          const scopeText = key.scope === 'all' ? t('accessKeyScopeAll', '전체') : `${key.whitelist_mindmaps?.length || 1}${t('countUnit', '개')}`;
          option.textContent = `${key.name} (${scopeText})`;
          testKeySelect.appendChild(option);
        });

        // 버튼 비활성화 (선택 전)
        if (btnTestConnection) {
          btnTestConnection.disabled = true;
        }
      }

      // 결과 영역 초기화
      if (connectionTestResult) {
        connectionTestResult.style.display = 'none';
      }
    }
  }

  /**
   * 키 파일 경로 로드
   */
  async function loadKeyFilePath() {
    try {
      const response = await fetch('/api/access-keys/key-path');
      if (response.ok) {
        const data = await response.json();
        if (keyFilePathInput && data.path) {
          keyFilePathInput.value = data.path;
        }
        // 경로 존재 여부에 따라 테스트 컨트롤 상태 업데이트
        keyFilePathSaved = !!(data.path && data.path.trim());
        if (btnSaveKeyPath && keyFilePathSaved) {
          btnSaveKeyPath.innerHTML = mmIcon('check-circle', 14) + ' ' + t('saved', '저장됨');
        }
        updateTestControlsState();
      }
    } catch (error) {
      console.error('키 파일 경로 조회 실패:', error);
    }
  }

  /**
   * 서버 주소 로드
   */
  async function loadServerUrl() {
    try {
      const response = await fetch('/api/access-keys/server-url');
      if (response.ok) {
        const data = await response.json();
        if (serverUrlInput && data.url) {
          serverUrlInput.value = data.url;
        }
        // 실제 저장 여부는 서버의 saved 플래그 기반
        serverUrlSaved = !!data.saved;
        if (btnSaveServerUrl) {
          if (serverUrlSaved) {
            btnSaveServerUrl.innerHTML = mmIcon('check-circle', 14) + ' ' + t('saved', '저장됨');
          } else {
            btnSaveServerUrl.textContent = t('save', '저장');
          }
        }
        updateTestControlsState();
      }
    } catch (error) {
      console.error('서버 주소 조회 실패:', error);
    }
  }

  /**
   * 서버 주소 저장
   */
  async function saveServerUrl() {
    const url = serverUrlInput?.value?.trim();
    if (!url) {
      alert(t('accessKeyServerUrlRequired', '서버 주소를 입력해주세요.'));
      serverUrlInput?.focus();
      return;
    }

    try {
      if (btnSaveServerUrl) {
        btnSaveServerUrl.disabled = true;
        btnSaveServerUrl.textContent = t('saving', '저장 중...');
      }

      const response = await csrfUtils.secureFetch('/api/access-keys/server-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (data.success) {
        if (btnSaveServerUrl) {
          btnSaveServerUrl.innerHTML = mmIcon('check-circle', 14) + ' ' + t('saved', '저장됨');
        }
        serverUrlSaved = true;
        updateTestControlsState();
      } else {
        alert(t('saveFailed', '저장 실패') + ': ' + (data.message || t('unknownError', '알 수 없는 오류')));
      }
    } catch (error) {
      console.error('서버 주소 저장 실패:', error);
      alert(t('accessKeyServerUrlSaveFailed', '서버 주소 저장에 실패했습니다.'));
    } finally {
      if (btnSaveServerUrl) {
        btnSaveServerUrl.disabled = false;
        if (btnSaveServerUrl.textContent === t('saving', '저장 중...')) {
          btnSaveServerUrl.textContent = t('save', '저장');
        }
      }
    }
  }

  /**
   * 테스트 컨트롤 활성/비활성 상태 업데이트
   * 서버 주소 + 키 파일 경로 모두 저장되어야 활성화
   */
  function updateTestControlsState() {
    if (!pathRequiredNotice) return;

    const allReady = serverUrlSaved && keyFilePathSaved;

    if (!allReady) {
      // 미설정 항목 안내
      const missing = [];
      if (!serverUrlSaved) missing.push(t('accessKeyServerUrl', '서버 주소'));
      if (!keyFilePathSaved) missing.push(t('accessKeyFilePath', '키 파일 경로'));
      pathRequiredNotice.style.display = 'flex';
      const noticeText = pathRequiredNotice.querySelector('p');
      if (noticeText) {
        noticeText.textContent = t('accessKeyTestRequiresSave', '연결 테스트를 하려면 먼저') + ` ${missing.join(', ')}` + t('accessKeyPleaseSet', '를 저장해주세요.');
      }
      if (testKeySelect) testKeySelect.disabled = true;
      if (btnTestConnection) btnTestConnection.disabled = true;
    } else {
      // 모두 설정됨 → 안내 숨김, 테스트 활성화
      pathRequiredNotice.style.display = 'none';
      if (testKeySelect) testKeySelect.disabled = false;
      if (btnTestConnection) {
        btnTestConnection.disabled = !testKeySelect?.value;
      }
    }
  }

  /**
   * 키 파일 경로 저장
   */
  async function saveKeyFilePath() {
    const path = keyFilePathInput?.value?.trim();
    if (!path) {
      alert(t('accessKeyPathRequired', '키 파일 경로를 입력해주세요.'));
      keyFilePathInput?.focus();
      return;
    }

    try {
      if (btnSaveKeyPath) {
        btnSaveKeyPath.disabled = true;
        btnSaveKeyPath.textContent = t('saving', '저장 중...');
      }

      const response = await csrfUtils.secureFetch('/api/access-keys/key-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });

      const data = await response.json();

      if (data.success) {
        if (btnSaveKeyPath) {
          btnSaveKeyPath.innerHTML = mmIcon('check-circle', 14) + ' ' + t('saved', '저장됨');
        }
        // 경로 저장 성공 → 테스트 컨트롤 활성화
        keyFilePathSaved = true;
        updateTestControlsState();
      } else {
        alert(t('accessKeyPathSaveFailed', '경로 저장 실패') + ': ' + (data.message || t('unknownError', '알 수 없는 오류')));
      }
    } catch (error) {
      console.error('경로 저장 실패:', error);
      alert(t('accessKeyPathSaveError', '경로 저장에 실패했습니다.'));
    } finally {
      if (btnSaveKeyPath) {
        btnSaveKeyPath.disabled = false;
        if (btnSaveKeyPath.textContent === t('saving', '저장 중...')) {
          btnSaveKeyPath.textContent = t('save', '저장');
        }
      }
    }
  }

  /**
   * Skill API 연결 테스트
   */
  async function testSkillConnection() {
    const selectedKeyId = testKeySelect?.value;
    if (!selectedKeyId) {
      alert(t('accessKeySelectForTest', '테스트할 키를 선택해주세요.'));
      return;
    }

    // 선택된 키 정보 찾기
    const selectedKey = loadedKeys.find(k => k.id == selectedKeyId);
    if (!selectedKey) {
      alert(t('accessKeyNotFound', '키 정보를 찾을 수 없습니다.'));
      return;
    }

    // 버튼 비활성화 및 로딩 표시
    if (btnTestConnection) {
      btnTestConnection.disabled = true;
      btnTestConnection.textContent = t('accessKeyTesting', '테스트 중...');
    }

    // 결과 영역 표시
    if (connectionTestResult) {
      connectionTestResult.style.display = 'block';
      connectionTestResult.querySelector('.result-icon').textContent = '';
      connectionTestResult.querySelector('.result-status').textContent = t('accessKeyTestingConnection', '연결 테스트 중...');
      connectionTestResult.querySelector('.result-details').textContent = '';
    }

    try {
      // 서버 API를 통해 연결 테스트
      const response = await csrfUtils.secureFetch('/api/access-keys/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: selectedKeyId })
      });

      const data = await response.json();

      if (data.success) {
        // 마인드맵 목록 포함하여 결과 표시
        let details = data.details || '';
        if (data.mindmaps && data.mindmaps.length > 0) {
          const mapList = data.mindmaps.slice(0, 10).join(', ');
          const more = data.mindmaps.length > 10 ? ` 외 ${data.mindmaps.length - 10}개` : '';
          details += `\n접근 가능: ${mapList}${more}`;
        }
        showConnectionResult(true, t('accessKeyConnectSuccess', '연결 성공'), details, data.scope);
      } else {
        showConnectionResult(false, t('accessKeyConnectFailed', '연결 실패'), data.message || data.error || '');
      }
    } catch (error) {
      console.error('연결 테스트 오류:', error);
      showConnectionResult(false, t('accessKeyConnectFailed', '연결 실패'), error.message || t('networkError', '네트워크 오류'));
    } finally {
      // 버튼 복원
      if (btnTestConnection) {
        btnTestConnection.disabled = false;
        btnTestConnection.innerHTML = mmIcon('link', 14) + ' 연결 테스트';
      }
    }
  }

  /**
   * 연결 테스트 결과 표시
   */
  function showConnectionResult(success, status, details, scope) {
    if (!connectionTestResult) return;

    const icon = connectionTestResult.querySelector('.result-icon');
    const statusEl = connectionTestResult.querySelector('.result-status');
    const detailsEl = connectionTestResult.querySelector('.result-details');

    if (icon) icon.innerHTML = success ? mmIcon('check-circle', 16) : mmIcon('x-circle', 16);
    if (statusEl) {
      let statusText = status;
      if (success && scope) {
        statusText += scope === 'all' ? ' (' + t('accessKeyScopeAllMindmaps', '전체 마인드맵') + ')' : ' (' + t('accessKeyScopeWhitelist', '화이트리스트') + ')';
      }
      statusEl.textContent = statusText;
      statusEl.className = 'result-status ' + (success ? 'success' : 'error');
    }
    if (detailsEl) {
      // 줄바꿈 처리하여 표시
      detailsEl.innerHTML = details.replace(/\n/g, '<br>');
    }

    connectionTestResult.className = 'connection-test-result ' + (success ? 'success' : 'error');
  }

  // 전역 접근용 (디버깅)
  window.AccessKeysManager = {
    loadAccessKeys,
    openNewKeyModal,
    testSkillConnection
  };
})();
