/**
 * 관리자 설정 모듈 - 에러 로그 검색 UI
 * settings-admin.js
 */

/**
 * i18n 번역 함수 - 현재 언어에 맞는 텍스트 반환
 */
function getAdminI18n(key, params = {}) {
  // localStorage 우선, 없으면 document.documentElement.lang, 그것도 없으면 'ko'
  const currentLang = localStorage.getItem('appLanguage') || document.documentElement.lang || 'ko';
  const langVarName = currentLang.replace(/-/g, '');

  // 다중 fallback: 현재 언어 → ko → en → 빈 객체
  const i18nData = window[`i18n_${langVarName}`] || window.i18n_ko || window.i18n_en || {};

  let text = i18nData[key] || key;

  // 플레이스홀더 치환 (예: {days}, {current}, {total})
  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
  });

  return text;
}

// 상태 관리
const adminState = {
  currentPage: 1,
  limit: 50,
  total: 0,
  filters: {
    level: '',
    from: '',
    to: '',
    source: '',
    message: '',
    resolved: ''
  },
  logs: []
};

// AI 추천 정보 캐시 (관리자용)
let adminAIRecommendations = null;

// 서비스명 매핑 (UI 서비스명 -> 추천 JSON 키)
const ADMIN_SERVICE_NAME_MAP = {
  gpt: 'openai',
  grok: 'xai',
  gemini: 'google',
  claude: 'anthropic'
};

/**
 * AI 추천 정보 로드 (관리자용)
 */
async function loadAdminAIRecommendations() {
  try {
    // ApiCache 사용 (중복 호출 방지)
    const response = window.ApiCache
      ? await window.ApiCache.fetch('/api/ai/recommendations')
      : await fetch('/api/ai/recommendations');
    const data = await response.json();

    if (data.success && data.data && data.data.recommendations) {
      adminAIRecommendations = data.data.recommendations;
      console.log('[Settings-Admin] AI 추천 정보 로드 완료:', Object.keys(adminAIRecommendations));
    } else {
      adminAIRecommendations = null;
    }
  } catch (error) {
    console.warn('[Settings-Admin] AI 추천 정보 로드 실패:', error.message);
    adminAIRecommendations = null;
  }
}

/**
 * 모델이 추천 모델인지 확인 (관리자용)
 */
function isAdminModelRecommended(service, modelName) {
  if (!adminAIRecommendations || !modelName) return null;

  const mappedService = ADMIN_SERVICE_NAME_MAP[service];
  if (!mappedService || !adminAIRecommendations[mappedService]) return null;

  const rec = adminAIRecommendations[mappedService];

  // 최고 성능 모델 확인 (모델명 부분 일치)
  if (rec.best_performance?.model) {
    const bestPerfModel = rec.best_performance.model.toLowerCase();
    const checkModel = modelName.toLowerCase();
    if (checkModel.includes(bestPerfModel) || bestPerfModel.includes(checkModel)) {
      return { type: t('adminBestPerformance', '최고성능'), badge: 'best-perf' };
    }
  }

  // 가성비 모델 확인 (모델명 부분 일치)
  if (rec.best_value?.model) {
    const bestValueModel = rec.best_value.model.toLowerCase();
    const checkModel = modelName.toLowerCase();
    if (checkModel.includes(bestValueModel) || bestValueModel.includes(checkModel)) {
      return { type: t('adminBestValue', '가성비'), badge: 'best-value' };
    }
  }

  return null;
}

/**
 * 관리자 설정 초기화
 */
window.initSettingsAdmin = async function() {
  console.log('[Settings-Admin] 초기화 시작');

  // 이벤트 리스너 등록
  initAdminEventListeners();

  // 로깅 설정 이벤트 초기화
  if (typeof initLoggingSettingsEvents === 'function') {
    initLoggingSettingsEvents();
  }

  // 기본 날짜 설정 (7일 전 ~ 오늘)
  setDefaultDateRange(7);

  // 탭 진입 시 자동으로 로그 검색 실행
  await searchAdminLogs();

  console.log('[Settings-Admin] 초기화 완료');
};

/**
 * 이벤트 리스너 등록
 * 직접 DOM 요소에 onclick 핸들러를 설정하는 방식으로 변경
 * (이벤트 위임 방식의 타이밍 문제 해결)
 */
function initAdminEventListeners() {
  console.log('[Settings-Admin] 이벤트 리스너 등록 시작');

  // 에러 로그 검색 버튼 클릭 (inline onclick 대체)
  const errorLogMenuItem = document.querySelector('[data-action="error-logs"]');
  if (errorLogMenuItem) {
    errorLogMenuItem.onclick = function() {
      openErrorLogsPanel();
    };
    console.log('[Settings-Admin] 에러 로그 버튼 핸들러 등록');
  }

  // 레벨 버튼 클릭 - 직접 onclick 설정
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.onclick = function() {
      document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      adminState.filters.level = this.dataset.level || '';
    };
  });

  // 기간 프리셋 버튼 클릭 - 직접 onclick 설정
  document.querySelectorAll('.period-preset-btn').forEach(btn => {
    btn.onclick = function() {
      document.querySelectorAll('.period-preset-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      setDefaultDateRange(parseInt(this.dataset.days) || 7);
    };
  });

  // 검색 버튼 - 직접 onclick 설정
  const searchBtn = document.getElementById('adminLogSearchBtn');
  if (searchBtn) {
    searchBtn.onclick = function(e) {
      e.preventDefault();
      console.log('[Settings-Admin] 검색 버튼 클릭됨');
      searchAdminLogs();
    };
    console.log('[Settings-Admin] 검색 버튼 핸들러 등록 완료');
  } else {
    console.warn('[Settings-Admin] 검색 버튼을 찾을 수 없음 - 지연 등록 시도');
    // DOM이 아직 준비되지 않았을 수 있으므로 지연 등록
    setTimeout(() => {
      const delayedSearchBtn = document.getElementById('adminLogSearchBtn');
      if (delayedSearchBtn) {
        delayedSearchBtn.onclick = function(e) {
          e.preventDefault();
          console.log('[Settings-Admin] 검색 버튼 클릭됨 (지연 등록)');
          searchAdminLogs();
        };
        console.log('[Settings-Admin] 검색 버튼 핸들러 지연 등록 완료');
      }
    }, 500);
  }

  // 초기화 버튼 - 직접 onclick 설정
  const resetBtn = document.getElementById('adminLogResetBtn');
  if (resetBtn) {
    resetBtn.onclick = function(e) {
      e.preventDefault();
      console.log('[Settings-Admin] 초기화 버튼 클릭됨');
      resetAdminLogFilters();
    };
    console.log('[Settings-Admin] 초기화 버튼 핸들러 등록 완료');
  } else {
    // DOM이 아직 준비되지 않았을 수 있으므로 지연 등록
    setTimeout(() => {
      const delayedResetBtn = document.getElementById('adminLogResetBtn');
      if (delayedResetBtn) {
        delayedResetBtn.onclick = function(e) {
          e.preventDefault();
          console.log('[Settings-Admin] 초기화 버튼 클릭됨 (지연 등록)');
          resetAdminLogFilters();
        };
        console.log('[Settings-Admin] 초기화 버튼 핸들러 지연 등록 완료');
      }
    }, 500);
  }

  // 삭제 버튼 - 직접 onclick 설정
  const deleteBtn = document.getElementById('adminLogDeleteBtn');
  if (deleteBtn) {
    deleteBtn.onclick = function(e) {
      e.preventDefault();
      console.log('[Settings-Admin] 삭제 버튼 클릭됨');
      deleteAdminLogs();
    };
    console.log('[Settings-Admin] 삭제 버튼 핸들러 등록 완료');
  } else {
    // DOM이 아직 준비되지 않았을 수 있으므로 지연 등록
    setTimeout(() => {
      const delayedDeleteBtn = document.getElementById('adminLogDeleteBtn');
      if (delayedDeleteBtn) {
        delayedDeleteBtn.onclick = function(e) {
          e.preventDefault();
          console.log('[Settings-Admin] 삭제 버튼 클릭됨 (지연 등록)');
          deleteAdminLogs();
        };
        console.log('[Settings-Admin] 삭제 버튼 핸들러 지연 등록 완료');
      }
    }, 500);
  }

  // 페이지네이션 버튼 - 직접 onclick 설정
  const prevBtn = document.getElementById('adminLogsPrevBtn');
  if (prevBtn) {
    prevBtn.onclick = function() {
      loadAdminLogsPrev();
    };
  }

  const nextBtn = document.getElementById('adminLogsNextBtn');
  if (nextBtn) {
    nextBtn.onclick = function() {
      loadAdminLogsNext();
    };
  }

  // 로그 테이블 행 클릭 (이벤트 위임 - inline onclick 대체)
  const tableBody = document.getElementById('adminLogsTableBody');
  if (tableBody) {
    tableBody.onclick = function(e) {
      const row = e.target.closest('tr.clickable');
      if (row) {
        const onclickAttr = row.getAttribute('onclick');
        if (onclickAttr) {
          const match = onclickAttr.match(/showLogDetail\(['"]([^'"]+)['"]\)/);
          if (match && match[1]) {
            showLogDetail(match[1]);
          }
        }
      }
    };
    console.log('[Settings-Admin] 로그 테이블 행 클릭 핸들러 등록');
  }

  // 로그 상세 모달 버튼 클릭 (이벤트 위임 - 동적 생성된 모달용)
  // body에 한 번만 등록되도록 플래그 사용
  if (!window._adminModalListenerRegistered) {
    window._adminModalListenerRegistered = true;
    document.body.addEventListener('click', function(e) {
      // 모달 오버레이 클릭 시 닫기
      if (e.target.classList.contains('admin-log-detail-overlay')) {
        closeLogDetail();
        return;
      }

      // 모달 닫기 버튼
      if (e.target.classList.contains('admin-log-detail-close')) {
        closeLogDetail();
        return;
      }

      // 해결/미해결 토글 버튼
      const resolveBtn = e.target.closest('.admin-action-btn.resolve, .admin-action-btn.unresolve');
      if (resolveBtn) {
        const onclickAttr = resolveBtn.getAttribute('onclick');
        if (onclickAttr) {
          const match = onclickAttr.match(/toggleLogResolved\(['"]([^'"]+)['"],\s*(true|false)\)/);
          if (match) {
            toggleLogResolved(match[1], match[2] === 'true');
          }
        }
        return;
      }

      // 복사 버튼
      const copyBtn = e.target.closest('.admin-action-btn.copy');
      if (copyBtn) {
        const onclickAttr = copyBtn.getAttribute('onclick');
        if (onclickAttr) {
          const match = onclickAttr.match(/copyLogInfo\(['"]([^'"]+)['"]\)/);
          if (match) {
            copyLogInfo(match[1]);
          }
        }
        return;
      }
    });
    console.log('[Settings-Admin] 모달 버튼 이벤트 위임 등록');
  }

  console.log('[Settings-Admin] 이벤트 리스너 등록 완료');
}

/**
 * 기본 날짜 범위 설정
 */
function setDefaultDateRange(days) {
  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - days + 1);

  const dateFrom = document.getElementById('adminLogDateFrom');
  const dateTo = document.getElementById('adminLogDateTo');

  if (dateFrom) dateFrom.value = formatDateForInput(fromDate);
  if (dateTo) dateTo.value = formatDateForInput(today);
}

/**
 * 날짜를 input[type=date] 형식으로 변환
 */
function formatDateForInput(date) {
  return date.toISOString().split('T')[0];
}

/**
 * 에러 로그 패널 열기
 */
window.openErrorLogsPanel = function() {
  const panel = document.getElementById('adminLogsPanel');
  if (panel) {
    panel.style.display = 'block';
    // 처음 열 때 로그 검색
    searchAdminLogs();
  }
};

/**
 * 에러 로그 검색
 */
window.searchAdminLogs = async function() {
  // 필터 값 수집
  // 레벨 필터 - 로그검색 패널 내 활성화된 버튼에서 값 가져오기
  const activeLevelBtn = document.querySelector('.level-btn-group .level-btn.active');
  adminState.filters.level = activeLevelBtn?.dataset.level || '';
  console.log('[Settings-Admin] 검색 레벨 필터:', adminState.filters.level, activeLevelBtn);

  adminState.filters.from = document.getElementById('adminLogDateFrom')?.value || '';
  adminState.filters.to = document.getElementById('adminLogDateTo')?.value || '';
  adminState.filters.source = document.getElementById('adminLogSource')?.value || '';
  adminState.filters.message = document.getElementById('adminLogMessage')?.value || '';
  adminState.filters.resolved = document.getElementById('adminLogResolved')?.value || '';

  // 페이지 초기화
  adminState.currentPage = 1;

  await loadAdminLogs();
  await loadAdminStats();
};

/**
 * 로그 데이터 로드
 */
async function loadAdminLogs() {
  const tableBody = document.getElementById('adminLogsTableBody');
  if (!tableBody) return;

  // 로딩 표시
  tableBody.innerHTML = `<tr><td colspan="5" class="admin-loading">${getAdminI18n('logDetailLoading')}</td></tr>`;

  try {
    const params = new URLSearchParams();
    if (adminState.filters.level) params.append('level', adminState.filters.level);
    if (adminState.filters.from) params.append('from', adminState.filters.from + 'T00:00:00.000Z');
    if (adminState.filters.to) params.append('to', adminState.filters.to + 'T23:59:59.999Z');
    if (adminState.filters.source) params.append('source', adminState.filters.source);
    if (adminState.filters.message) params.append('message', adminState.filters.message);
    if (adminState.filters.resolved) params.append('resolved', adminState.filters.resolved);
    params.append('limit', adminState.limit);
    params.append('offset', (adminState.currentPage - 1) * adminState.limit);

    const response = await fetch(`/api/admin/logs/search?${params.toString()}`, {
      credentials: 'include'
    });

    if (response.status === 401) {
      const data = await response.json();
      if (data.requiresVerification) {
        showAdminPasswordPopup();
        return;
      }
      throw new Error(getAdminI18n('logDetailAuthRequired'));
    }

    if (!response.ok) {
      throw new Error(getAdminI18n('logDetailLoadError'));
    }

    const data = await response.json();
    adminState.logs = data.data.logs || [];
    adminState.total = data.data.total || 0;

    renderAdminLogs();
    updatePagination();

  } catch (error) {
    console.error('[Settings-Admin] 로그 로드 오류:', error);
    tableBody.innerHTML = `<tr><td colspan="5" class="admin-empty">
      <div class="admin-empty-icon">!</div>
      <div class="admin-empty-text">${error.message}</div>
    </td></tr>`;
  }
}

/**
 * 로그 테이블 렌더링
 */
function renderAdminLogs() {
  const tableBody = document.getElementById('adminLogsTableBody');
  if (!tableBody) return;

  if (adminState.logs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="admin-empty">
      <div class="admin-empty-icon">!</div>
      <div class="admin-empty-text">${getAdminI18n('logDetailNoResults')}</div>
    </td></tr>`;
    return;
  }

  tableBody.innerHTML = adminState.logs.map(log => {
    const levelClass = log.level.toLowerCase();
    const intl = window.MyMind3 && window.MyMind3.Intl;
    const time = intl ? intl.formatDate(new Date(log.created_at), { dateStyle: 'short', timeStyle: 'short' }) : new Date(log.created_at).toLocaleString();
    const message = escapeHtml(log.message || '').substring(0, 80);
    const source = escapeHtml(log.source || '').substring(0, 30);
    const resolved = log.is_resolved ? '&check;' : '&times;';
    const resolvedClass = log.is_resolved ? 'resolved' : 'unresolved';

    return `
      <tr class="clickable" onclick="showLogDetail('${log.error_id}')">
        <td><span class="log-level-badge ${levelClass}">${log.level}</span></td>
        <td>${time}</td>
        <td title="${escapeHtml(log.message || '')}">${message}${log.message && log.message.length > 80 ? '...' : ''}</td>
        <td>${source}</td>
        <td class="${resolvedClass}">${resolved}</td>
      </tr>
    `;
  }).join('');
}

/**
 * 페이지네이션 업데이트
 */
function updatePagination() {
  const pageInfo = document.getElementById('adminLogsPageInfo');
  const prevBtn = document.getElementById('adminLogsPrevBtn');
  const nextBtn = document.getElementById('adminLogsNextBtn');

  const totalPages = Math.ceil(adminState.total / adminState.limit) || 1;

  if (pageInfo) {
    pageInfo.textContent = `${t('adminPage', '페이지')} ${adminState.currentPage}/${totalPages} (${t('adminTotal', '총')} ${adminState.total}${t('adminCount', '건')})`;
  }

  if (prevBtn) {
    prevBtn.disabled = adminState.currentPage <= 1;
  }

  if (nextBtn) {
    nextBtn.disabled = adminState.currentPage >= totalPages;
  }
}

/**
 * 이전 페이지 로드
 */
window.loadAdminLogsPrev = function() {
  if (adminState.currentPage > 1) {
    adminState.currentPage--;
    loadAdminLogs();
  }
};

/**
 * 다음 페이지 로드
 */
window.loadAdminLogsNext = function() {
  const totalPages = Math.ceil(adminState.total / adminState.limit);
  if (adminState.currentPage < totalPages) {
    adminState.currentPage++;
    loadAdminLogs();
  }
};

/**
 * 통계 로드
 */
async function loadAdminStats() {
  try {
    // 날짜 범위에서 일수 계산
    const from = document.getElementById('adminLogDateFrom')?.value;
    const to = document.getElementById('adminLogDateTo')?.value;
    let days = 7;

    if (from && to) {
      const diffTime = Math.abs(new Date(to) - new Date(from));
      days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    const response = await fetch(`/api/admin/logs/stats?days=${days}`, {
      credentials: 'include'
    });

    if (!response.ok) return;

    const data = await response.json();
    const stats = data.data.total || {};

    document.getElementById('statCritical').textContent = stats.critical_count || 0;
    document.getElementById('statError').textContent = stats.error_count || 0;
    document.getElementById('statWarning').textContent = stats.warning_count || 0;
    document.getElementById('statInfo').textContent = stats.info_count || 0;
    document.getElementById('statTotal').textContent = stats.total_count || 0;

  } catch (error) {
    console.error('[Settings-Admin] 통계 로드 오류:', error);
  }
}

/**
 * 필터 초기화
 */
window.resetAdminLogFilters = function() {
  // 레벨 버튼 초기화
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.level === '');
  });

  // 기간 프리셋 초기화
  document.querySelectorAll('.period-preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.days === '7');
  });

  // 입력 필드 초기화
  document.getElementById('adminLogSource').value = '';
  document.getElementById('adminLogMessage').value = '';
  document.getElementById('adminLogResolved').value = '';

  // 날짜 범위 초기화
  setDefaultDateRange(7);

  // 탭 진입 시 자동으로 로그 검색 실행
  adminState.filters = {
    level: '',
    from: '',
    to: '',
    source: '',
    message: '',
    resolved: ''
  };

  // 검색 실행
  searchAdminLogs();
};

/**
 * 로그 삭제
 * 조회된 내역이 있으면 해당 조회 결과를 삭제, 조회가 안된 상태라면 전체 로그 삭제
 */
window.deleteAdminLogs = async function() {
  // 현재 필터 상태 확인 (빈 값이 아닌 필터가 있는지)
  const hasActiveFilters = Object.values(adminState.filters).some(v => v !== '');

  // 삭제 대상 메시지 생성
  let confirmMessage;
  if (hasActiveFilters) {
    confirmMessage = getAdminI18n('logDeleteFilteredConfirm') ||
      `현재 조회된 ${adminState.total}건의 로그를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`;
  } else {
    confirmMessage = getAdminI18n('logDeleteAllConfirm') ||
      '전체 로그 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.';
  }

  // 확인 대화상자
  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    // 필터 파라미터 구성
    const params = new URLSearchParams();
    if (hasActiveFilters) {
      if (adminState.filters.level) params.append('level', adminState.filters.level);
      if (adminState.filters.from) params.append('from', adminState.filters.from);
      if (adminState.filters.to) params.append('to', adminState.filters.to);
      if (adminState.filters.source) params.append('source', adminState.filters.source);
      if (adminState.filters.message) params.append('message', adminState.filters.message);
      if (adminState.filters.resolved) params.append('resolved', adminState.filters.resolved);
    }

    const url = `/api/admin/logs/delete${params.toString() ? '?' + params.toString() : ''}`;

    // CSRF 토큰이 포함된 secureFetch 사용
    const response = await (window.csrfUtils?.secureFetch || fetch)(url, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || getAdminI18n('logDeleteError') || '로그 삭제 중 오류가 발생했습니다.');
    }

    const result = await response.json();
    const deletedCount = result.deletedCount || 0;

    // 성공 메시지
    alert(getAdminI18n('logDeleteSuccess', { count: deletedCount }) ||
      `${deletedCount}건의 로그가 삭제되었습니다.`);

    // 로그 목록 새로고침
    searchAdminLogs();

  } catch (error) {
    console.error('[Settings-Admin] 로그 삭제 실패:', error);
    alert(error.message || getAdminI18n('logDeleteError') || '로그 삭제 중 오류가 발생했습니다.');
  }
};

/**
 * 로그 상세 보기
 */
window.showLogDetail = async function(errorId) {
  try {
    const response = await fetch(`/api/admin/logs/${errorId}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(getAdminI18n('logDetailLoadError'));
    }

    const data = await response.json();
    const log = data.data;

    // 보관 기간 텍스트 생성
    const retentionText = log.retention_days === -1
      ? getAdminI18n('logDetailRetentionPermanent')
      : getAdminI18n('logDetailRetentionDays', { days: log.retention_days });

    // 만료일 텍스트 생성
    const expiresText = log.expires_at
      ? (window.MyMind3?.Intl?.formatDate(log.expires_at, { dateStyle: 'short', timeStyle: 'short' }) || new Date(log.expires_at).toLocaleString())
      : getAdminI18n('logDetailExpiresNone');

    // 상태 텍스트 생성
    const statusText = log.is_resolved
      ? getAdminI18n('logDetailResolved')
      : getAdminI18n('logDetailUnresolved');

    // 버튼 텍스트 생성
    const toggleBtnText = log.is_resolved
      ? getAdminI18n('logDetailMarkUnresolved')
      : getAdminI18n('logDetailMarkResolved');

    // 모달 생성
    const modal = document.createElement('div');
    modal.className = 'admin-log-detail-modal';
    modal.id = 'adminLogDetailModal';
    modal.innerHTML = `
      <div class="admin-log-detail-overlay" onclick="closeLogDetail()"></div>
      <div class="admin-log-detail-content">
        <div class="admin-log-detail-header">
          <h3>${getAdminI18n('logDetailTitle')}</h3>
          <button class="admin-log-detail-close" onclick="closeLogDetail()">&times;</button>
        </div>
        <div class="admin-log-detail-info">
          <span class="label">${getAdminI18n('logDetailErrorId')}</span>
          <span class="value">${escapeHtml(log.error_id)}</span>

          <span class="label">${getAdminI18n('logDetailLevel')}</span>
          <span class="value"><span class="log-level-badge ${log.level.toLowerCase()}">${log.level}</span></span>

          <span class="label">${getAdminI18n('logDetailMessage')}</span>
          <span class="value">${escapeHtml(log.message || '-')}</span>

          <span class="label">${getAdminI18n('logDetailSource')}</span>
          <span class="value">${escapeHtml(log.source || '-')}</span>

          <span class="label">${getAdminI18n('logDetailUser')}</span>
          <span class="value">${escapeHtml(log.user_id || '-')}</span>

          <span class="label">${getAdminI18n('logDetailRequestPath')}</span>
          <span class="value">${escapeHtml(log.request_path || '-')}</span>

          <span class="label">${getAdminI18n('logDetailCreatedAt')}</span>
          <span class="value">${window.MyMind3?.Intl?.formatDate(log.created_at, { dateStyle: 'short', timeStyle: 'short' }) || new Date(log.created_at).toLocaleString()}</span>

          <span class="label">${getAdminI18n('logDetailRetention')}</span>
          <span class="value">${retentionText}</span>

          <span class="label">${getAdminI18n('logDetailExpiresAt')}</span>
          <span class="value">${expiresText}</span>

          <span class="label">${getAdminI18n('logDetailStatus')}</span>
          <span class="value">${statusText}</span>
        </div>

        ${log.stack ? `
        <div class="admin-log-stack">
          <h4>${getAdminI18n('logDetailStackTrace')}</h4>
          <pre>${escapeHtml(log.stack)}</pre>
        </div>
        ` : ''}

        ${log.extra ? `
        <div class="admin-log-stack">
          <h4>${getAdminI18n('logDetailExtraInfo')}</h4>
          <pre>${escapeHtml(typeof log.extra === 'object' ? JSON.stringify(log.extra, null, 2) : log.extra)}</pre>
        </div>
        ` : ''}

        <div class="admin-log-detail-actions">
          <button class="admin-action-btn ${log.is_resolved ? 'unresolve' : 'resolve'}"
                  onclick="toggleLogResolved('${log.error_id}', ${!log.is_resolved})">
            ${toggleBtnText}
          </button>
          <button class="admin-action-btn copy" onclick="copyLogInfo('${log.error_id}')">${getAdminI18n('logDetailCopy')}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

  } catch (error) {
    console.error('[Settings-Admin] 로그 상세 조회 오류:', error);
    alert(getAdminI18n('logDetailLoadError'));
  }
};

/**
 * 로그 상세 모달 닫기
 */
window.closeLogDetail = function() {
  const modal = document.getElementById('adminLogDetailModal');
  if (modal) {
    modal.remove();
  }
};

/**
 * 로그 해결 상태 토글
 */
window.toggleLogResolved = async function(errorId, resolved) {
  try {
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch(`/api/admin/logs/${errorId}/resolve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include',
      body: JSON.stringify({ resolved })
    });

    if (!response.ok) {
      throw new Error(getAdminI18n('logDetailStatusChangeError'));
    }

    // 모달 닫고 목록 새로고침
    closeLogDetail();
    await loadAdminLogs();

    console.log('[Settings-Admin] 로그 상태 변경:', errorId, resolved);

  } catch (error) {
    console.error('[Settings-Admin] 로그 상태 변경 오류:', error);
    alert(getAdminI18n('logDetailStatusChangeError'));
  }
};

/**
 * 로그 정보 복사
 */
window.copyLogInfo = function(errorId) {
  const log = adminState.logs.find(l => l.error_id === errorId);
  if (!log) return;

  const text = `Error ID: ${log.error_id}
Level: ${log.level}
Message: ${log.message}
Source: ${log.source}
Time: ${window.MyMind3?.Intl?.formatDate(log.created_at, { dateStyle: 'short', timeStyle: 'short' }) || new Date(log.created_at).toLocaleString()}
${log.stack ? '\nStack:\n' + log.stack : ''}`;

  navigator.clipboard.writeText(text).then(() => {
    alert(getAdminI18n('logDetailCopySuccess'));
  }).catch(err => {
    console.error('복사 실패:', err);
    alert(getAdminI18n('logDetailCopyError'));
  });
};

/**
 * HTML 이스케이프
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// AI 모델 관리 기능
// ============================================

// AI 모델 설정 상태
const aiModelState = {
  currentEnvironment: null,  // 현재 선택된 환경 (서버에서 자동 결정)
  serverEnvironment: null,   // 서버의 실제 환경 (NODE_ENV 기반)
  environments: ['local', 'development', 'production'],  // 지원 환경 목록
  services: {},   // 서비스 활성화 상태
  models: {},     // 모델별 활성화 상태
  sortOrders: {}, // 모델별 정렬 순서
  defaultModels: {}, // 서비스별 기본 모델
  originalData: null  // 원본 데이터 (변경 감지용)
};

// 환경 이름 매핑 (한글)
const ENV_NAMES = {
  local: t('envLocal', '로컬'),
  development: t('envDevelopment', '개발'),
  production: t('envProduction', '운영')
};

/**
 * AI 모델 관리 초기화
 */
window.initAIModelAdmin = async function() {
  console.log('[AI-Model-Admin] 초기화');

  // 이벤트 리스너 등록
  initAIModelEventListeners();

  // 데이터 로드
  await loadAIModelSettings();
};

/**
 * AI 모델 관리 이벤트 리스너 등록
 */
function initAIModelEventListeners() {
  // 저장 버튼
  const saveBtn = document.getElementById('aiModelSaveBtn');
  if (saveBtn) {
    saveBtn.onclick = saveAIModelSettings;
  }

  // 초기화 버튼
  const resetBtn = document.getElementById('aiModelResetBtn');
  if (resetBtn) {
    resetBtn.onclick = resetAIModelSettings;
  }

  // 동기화 버튼 (로컬/개발 환경에서만 표시)
  const syncBtn = document.getElementById('aiModelSyncBtn');
  if (syncBtn) {
    syncBtn.onclick = syncAIModelSettings;
  }

  // 전역 환경 변경 이벤트 구독
  document.addEventListener('envChanged', function(e) {
    console.log(`[AI-Model-Admin] 전역 환경 변경 감지: ${e.detail.backendEnv}`);
    loadAIModelSettings(e.detail.backendEnv);
  });
}

/**
 * 동기화 버튼 표시/숨김 (운영 환경에서는 숨김)
 */
function updateSyncButtonVisibility() {
  const syncBtn = document.getElementById('aiModelSyncBtn');
  if (!syncBtn) return;

  const serverEnv = aiModelState.serverEnvironment;
  // 운영 환경에서는 동기화 버튼 숨김
  if (serverEnv === 'production') {
    syncBtn.style.display = 'none';
  } else {
    syncBtn.style.display = 'inline-block';
    // 버튼 텍스트 업데이트: 로컬→개발, 개발→운영
    const targetEnv = serverEnv === 'local' ? t('envDevelopment', '개발') : t('envProduction', '운영');
    syncBtn.innerHTML = `${mmIcon('refresh-cw', 14)} ${targetEnv}${t('adminSyncTo', '로 동기화')}`;
    syncBtn.title = `${t('adminCurrentEnv', '현재 환경')}(${ENV_NAMES[serverEnv]})${t('adminSyncAIModelTo', '의 AI 모델 설정을')} ${targetEnv} ${t('adminSyncEnvTarget', '환경으로 동기화합니다')}`;
  }
}

/**
 * AI 모델 설정 동기화 (로컬→개발 또는 개발→운영)
 */
async function syncAIModelSettings() {
  const serverEnv = aiModelState.serverEnvironment;
  const targetEnv = serverEnv === 'local' ? 'development' : 'production';
  const targetEnvName = serverEnv === 'local' ? t('envDevelopment', '개발') : t('envProduction', '운영');

  // 확인 메시지
  const confirmed = confirm(
    `${t('adminCurrentEnv', '현재 환경')}(${ENV_NAMES[serverEnv]})${t('adminSyncAIModelTo', '의 AI 모델 설정을')} ${targetEnvName} ${t('adminSyncConfirmMsg', '환경으로 동기화하시겠습니까?')}\n\n` +
    `${targetEnvName} ${t('adminSyncOverwriteMsg', '환경의 기존 설정이 덮어씌워집니다.')}`
  );

  if (!confirmed) return;

  const syncBtn = document.getElementById('aiModelSyncBtn');
  const originalText = syncBtn.innerHTML;

  try {
    syncBtn.disabled = true;
    syncBtn.innerHTML = mmIcon('refresh-cw', 14) + ' ' + t('adminSyncing', '동기화 중...');

    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/admin/ai-models/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include',
      body: JSON.stringify({
        sourceEnvironment: serverEnv,
        targetEnvironment: targetEnv
      })
    });

    const result = await response.json();

    if (result.success) {
      alert(`${t('adminSyncComplete', '동기화 완료!')}${result.message ? '\n\n' + result.message : '\n\n' + ENV_NAMES[serverEnv] + ' → ' + targetEnvName + ' ' + t('adminSyncCopied', '환경으로 설정이 복사되었습니다.')}`);
    } else {
      throw new Error(result.message || t('adminSyncFailed', '동기화 실패'));
    }
  } catch (error) {
    console.error('[AI-Model-Admin] 동기화 실패:', error);
    alert(`${t('adminSyncFailed', '동기화 실패')}\n\n${error.message}`);
  } finally {
    syncBtn.disabled = false;
    syncBtn.innerHTML = originalText;
  }
}

/**
 * AI 모델 설정 로드
 * @param {string} environment - 로드할 환경 (기본값: 현재 선택된 환경)
 */
async function loadAIModelSettings(environment = null) {
  const listEl = document.getElementById('aiModelList');
  const loadingEl = document.getElementById('aiModelLoading');

  if (!listEl) return;

  // 로딩 표시
  if (loadingEl) loadingEl.style.display = 'block';
  listEl.innerHTML = '';

  // AI 추천 정보 로드 (병렬)
  await loadAdminAIRecommendations();

  try {
    // 환경 파라미터: 명시적 지정 시 해당 환경, 없으면 서버가 자동 결정
    const envParam = environment || aiModelState.currentEnvironment;
    const url = envParam ? `/api/admin/ai-models?env=${envParam}` : '/api/admin/ai-models';
    const response = await fetch(url);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Failed to load AI model settings');
    }

    // 환경 목록 업데이트 (API에서 제공하는 경우)
    if (result.data.environments) {
      aiModelState.environments = result.data.environments;
    }

    // 현재 환경 업데이트 (서버에서 결정한 환경 사용)
    if (result.data.currentEnvironment) {
      aiModelState.currentEnvironment = result.data.currentEnvironment;
    }

    // 서버 환경 저장 (첫 로드 시 기본 선택용)
    if (result.data.serverEnvironment) {
      aiModelState.serverEnvironment = result.data.serverEnvironment;
      // 전역 SettingsEnv에 서버 환경 설정
      if (window.SettingsEnv) {
        window.SettingsEnv.setServerEnv(result.data.serverEnvironment);
      }
    }

    // 상태 저장
    aiModelState.services = {};
    aiModelState.models = {};
    aiModelState.sortOrders = {};
    aiModelState.defaultModels = {};

    // 서비스 상태 저장 (enabled + default_model)
    for (const [service, info] of Object.entries(result.data.services)) {
      aiModelState.services[service] = info.enabled;
      aiModelState.defaultModels[service] = info.default_model || null;
    }

    // 모델 상태 및 정렬 순서 저장
    for (const [service, models] of Object.entries(result.data.models)) {
      aiModelState.models[service] = {};
      aiModelState.sortOrders[service] = {};
      for (const modelInfo of models) {
        // 가격 미설정이어도 모델 활성화 상태는 유지 (가격은 경고만 표시)
        aiModelState.models[service][modelInfo.model] = modelInfo.enabled;
        aiModelState.sortOrders[service][modelInfo.model] = modelInfo.sortOrder || 0;
      }
    }

    // 원본 데이터 저장
    aiModelState.originalData = JSON.stringify({
      services: aiModelState.services,
      models: aiModelState.models,
      sortOrders: aiModelState.sortOrders
    });

    // UI 렌더링
    renderAIModelSettings(result.data);

    // Local AI URL 로드 (UI 렌더링 후)
    loadAdminLocalAiUrl();

    // 동기화 버튼 표시/숨김 업데이트
    updateSyncButtonVisibility();

  } catch (error) {
    console.error('[AI-Model-Admin] 로드 실패:', error);
    listEl.innerHTML = `<div class="ai-model-error">${getAdminI18n('aiModelLoadError', { error: error.message })}</div>`;
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

/**
 * AI 모델 설정 UI 렌더링
 */
function renderAIModelSettings(data) {
  const listEl = document.getElementById('aiModelList');
  if (!listEl) return;

  // 현재 환경 로그 출력 (환경선택은 헤더에서 전역 관리)
  console.log(`[AI-Model-Admin] 렌더링: currentEnvironment=${aiModelState.currentEnvironment}, serverEnvironment=${aiModelState.serverEnvironment}`);

  let html = '';

  // 서비스별 브랜드 아이콘 매핑
  const serviceIconMap = {
    gpt: mmIcon('openai', 18),
    claude: mmIcon('claude', 18),
    gemini: mmIcon('gemini', 18),
    grok: mmIcon('grok', 18),
    local: mmIcon('monitor', 16)
  };

  // 서비스별 렌더링 (Local AI는 항상 마지막에 표시)
  const serviceEntries = Object.entries(data.services).sort((a, b) => {
    if (a[0] === 'local') return 1;
    if (b[0] === 'local') return -1;
    return 0;
  });
  for (const [service, serviceInfo] of serviceEntries) {
    const isServiceEnabled = serviceInfo.enabled;
    const models = data.models[service] || [];

    html += `
      <div class="ai-service-group" data-service="${service}">
        <div class="ai-service-header">
          <div class="ai-service-header-left">
            <input type="checkbox" class="ai-service-checkbox"
                   id="service-${service}"
                   data-service="${service}"
                   ${isServiceEnabled ? 'checked' : ''}>
            <span class="ai-service-icon">${serviceIconMap[service] || mmIcon('info', 16)}</span>
            <span class="ai-service-name">${serviceInfo.name}</span>
          </div>
          <div class="ai-service-header-right">
            <button type="button" class="ai-select-all-btn"
                    data-service="${service}"
                    ${!isServiceEnabled ? 'disabled' : ''}
                    data-i18n="aiModelSelectAll">${getAdminI18n('aiModelSelectAll')}</button>
          </div>
        </div>
    `;

    // Local AI 서비스에만 URL 입력 섹션 추가
    if (service === 'local') {
      html += `
        <div class="ai-local-url-section" id="localAiUrlSection">
          <div class="ai-local-url-row">
            <label class="ai-local-url-label">${mmIcon('globe', 14)} ${getAdminI18n('aiModelLocalAiUrl')}</label>
            <p class="ai-local-url-desc">${getAdminI18n('aiModelLocalAiUrlDesc')}</p>
            <div class="ai-local-url-input-group">
              <input type="url" id="adminLocalAiUrl"
                     class="ai-local-url-input"
                     placeholder="http://127.0.0.1:1234/v1/chat/completions">
              <button type="button" id="adminLocalAiTestBtn" class="ai-local-test-btn">
                ${mmIcon('wifi', 14)}
                <span>${getAdminI18n('aiModelLocalAiTest')}</span>
              </button>
              <button type="button" id="adminLocalAiSaveBtn" class="ai-local-save-btn">
                ${mmIcon('save', 14)}
                <span>${getAdminI18n('save')}</span>
              </button>
            </div>
          </div>
          <div id="adminLocalAiStatus" class="ai-local-status"></div>
        </div>
      `;
    }

    html += `
        <div class="ai-model-grid" id="models-${service}" ${!isServiceEnabled ? 'style="opacity: 0.5;"' : ''}>
    `;

    if (!isServiceEnabled) {
      html += `<div class="ai-service-disabled-message" data-i18n="aiModelServiceDisabled">${getAdminI18n('aiModelServiceDisabled')}</div>`;
    }

    // 활성화된 모델 수 (순서 콤보박스 범위용)
    const enabledCount = models.filter(m => m.enabled).length;

    // 모델 목록
    for (const modelInfo of models) {
      const isModelEnabled = modelInfo.enabled;
      const tokenDisplay = formatTokenCount(modelInfo.maxTokens);
      const description = modelInfo.description || '';
      const sortOrder = modelInfo.sortOrder ?? 0;
      // 2026-01-09 v8.0: 가격 정보 추가 (1M 토큰당 USD)
      // 2026-01-10 v8.1: 이미지당 가격 표시 추가
      // 2026-02-22 v8.2: 캐시 입력 가격 표시 + 가격 편집 기능
      const costInput = modelInfo.costPer1mInput;
      const costOutput = modelInfo.costPer1mOutput;
      const costPerImage = modelInfo.costPerImage;
      const costCachedInput = modelInfo.costPer1mCachedInput;
      // 가격 미설정 판별 (가격 없으면 체크박스 비활성화)
      const hasNoPricing = (costInput === null || costInput === 0) &&
                           (costOutput === null || costOutput === 0);
      // 가격을 읽기 쉬운 형식으로 변환 (불필요한 0 제거, 최소 소수점 1자리 유지)
      const formatPrice = (price) => {
        if (price === null || price === undefined) return null;
        if (price === 0) return '0';
        let formatted;
        if (price >= 0.01) {
          formatted = price.toFixed(3);
        } else if (price >= 0.001) {
          formatted = price.toFixed(4);
        } else {
          formatted = price.toFixed(5);
        }
        // 불필요한 뒤따르는 0 제거 (예: 1.000 → 1, 1.240 → 1.24)
        formatted = formatted.replace(/\.?0+$/, '');
        // 소수점이 없으면 .0 추가 (예: 1 → 1.0)
        if (!formatted.includes('.')) {
          formatted += '.0';
        }
        return formatted;
      };
      // 가격 표시 로직
      let pricingDisplay = '';
      if (costInput === null || costOutput === null) {
        pricingDisplay = `<span class="pricing-missing">${getAdminI18n('aiModelPricingMissing')}</span>`;
      } else if (costInput === 0 && costOutput === 0) {
        pricingDisplay = `<span class="pricing-missing">${getAdminI18n('aiModelPricingMissing')}</span>`;
      } else {
        const cachedStr = costCachedInput ? ` / C$${formatPrice(costCachedInput)}` : '';
        pricingDisplay = `↓$${formatPrice(costInput)} / ↑$${formatPrice(costOutput)}${cachedStr}`;
      }

      const descriptionDisplay = description;

      // 순서 콤보박스 옵션 생성 (0 ~ 활성화된 모델 수)
      // sortOrder가 범위 내(1~enabledCount)인 경우에만 선택됨
      // 큰 숫자부터 작은 숫자 순으로 표시 (선택 편의성)
      let sortOptions = `<option value="0" ${sortOrder === 0 || sortOrder > enabledCount ? 'selected' : ''}>-</option>`;
      for (let i = enabledCount; i >= 1; i--) {
        sortOptions += `<option value="${i}" ${sortOrder === i ? 'selected' : ''}>${i}</option>`;
      }

      // 추천 모델 여부 확인
      const recommended = isAdminModelRecommended(service, modelInfo.model);
      const recommendedClass = recommended ? 'recommended' : '';
      const recommendedBadge = recommended
        ? `<span class="recommendation-badge ${recommended.badge}">${recommended.type}</span>`
        : '';

      html += `
        <div class="ai-model-item ${!isServiceEnabled ? 'disabled' : ''} ${recommendedClass}" data-model="${modelInfo.model}">
          <div class="ai-model-item-header">
            <input type="checkbox" class="ai-model-checkbox"
                   id="model-${service}-${modelInfo.model}"
                   data-service="${service}"
                   data-model="${modelInfo.model}"
                   ${isModelEnabled ? 'checked' : ''}
                   ${!isServiceEnabled ? 'disabled' : ''}
                   ${hasNoPricing ? 'data-no-pricing="true"' : ''}
                   aria-label="${modelInfo.model}${hasNoPricing ? ' - ' + getAdminI18n('aiModelPricingMissing') : ''}"
                   title="${hasNoPricing ? getAdminI18n('aiModelPricingMissing') : ''}">
            <label for="model-${service}-${modelInfo.model}" class="ai-model-name">${modelInfo.model}${recommendedBadge}</label>
            <select class="ai-model-sort-order"
                    data-service="${service}"
                    data-model="${modelInfo.model}"
                    ${!isModelEnabled || !isServiceEnabled ? 'disabled' : ''}
                    aria-label="${modelInfo.model} ${t('adminDisplayOrder', '표시 순서')}">
              ${sortOptions}
            </select>
            <span class="ai-model-tokens">${tokenDisplay}</span>
          </div>
          <div class="ai-model-footer">
            <span class="ai-model-desc">${descriptionDisplay}</span>
            <span class="ai-model-pricing" title="Input/Output/Cached per 1M tokens (클릭하여 편집)"
                  data-service="${service}" data-model="${modelInfo.model}"
                  data-input="${costInput || 0}" data-output="${costOutput || 0}"
                  data-cached="${costCachedInput || 0}"
                  style="cursor:pointer">${pricingDisplay}</span>
          </div>
        </div>
      `;
    }

    html += `
        </div>
        <div class="ai-service-actions">
          <button type="button" class="ai-service-save-btn" data-service="${service}">
            ${serviceInfo.name} ${t('save', '저장')}
          </button>
        </div>
      </div>
    `;
  }

  listEl.innerHTML = html;

  // 이벤트 리스너 등록 (CSP 호환)
  attachAIModelEventListeners(listEl);
}

/**
 * AI 모델 설정 이벤트 리스너 등록 (CSP 호환)
 * 환경 선택은 헤더에서 전역 관리 (envChanged 이벤트로 처리)
 */
function attachAIModelEventListeners(container) {
  // 서비스 체크박스 이벤트
  container.querySelectorAll('.ai-service-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const service = this.dataset.service;
      toggleAIService(service, this.checked);
    });
  });

  // 모델 체크박스 이벤트
  container.querySelectorAll('.ai-model-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const service = this.dataset.service;
      const model = this.dataset.model;
      toggleAIModel(service, model, this.checked);
    });
  });

  // 순서 콤보박스 이벤트
  container.querySelectorAll('.ai-model-sort-order').forEach(select => {
    select.addEventListener('change', function() {
      const service = this.dataset.service;
      const model = this.dataset.model;
      const newOrder = parseInt(this.value);

      // 상태 업데이트
      if (!aiModelState.sortOrders[service]) {
        aiModelState.sortOrders[service] = {};
      }
      aiModelState.sortOrders[service][model] = newOrder;

      // 중복 검사 (0은 제외)
      if (newOrder > 0) {
        const duplicates = checkSortOrderDuplicates(service, model, newOrder);
        if (duplicates.length > 0) {
          showSortOrderDuplicateToast(service, newOrder, model, duplicates);
        }
      }
    });
  });

  // 전체 선택/해제 버튼 이벤트
  container.querySelectorAll('.ai-select-all-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const service = this.dataset.service;
      toggleAllAIModels(service);
    });
  });

  // 서비스별 저장 버튼 이벤트
  container.querySelectorAll('.ai-service-save-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const service = this.dataset.service;
      saveServiceModelSettings(service);
    });
  });

  // 가격 클릭 → 편집 팝업
  container.querySelectorAll('.ai-model-pricing').forEach(span => {
    span.addEventListener('click', function(e) {
      e.stopPropagation();
      openPricingEditor(this);
    });
  });

  // Local AI URL 연결 테스트/저장 버튼 이벤트
  const localTestBtn = container.querySelector('#adminLocalAiTestBtn');
  if (localTestBtn) {
    localTestBtn.addEventListener('click', testAdminLocalAiConnection);
  }
  const localSaveBtn = container.querySelector('#adminLocalAiSaveBtn');
  if (localSaveBtn) {
    localSaveBtn.addEventListener('click', saveAdminLocalAiUrl);
  }
}

// ==============================================
// 모델 가격 편집 기능
// ==============================================

/**
 * 가격 편집 인라인 팝업 열기
 */
function openPricingEditor(el) {
  // 기존 팝업 제거
  document.querySelectorAll('.pricing-editor-popup').forEach(p => p.remove());

  const service = el.dataset.service;
  const model = el.dataset.model;
  const inputVal = el.dataset.input || '0';
  const outputVal = el.dataset.output || '0';
  const cachedVal = el.dataset.cached || '0';

  const popup = document.createElement('div');
  popup.className = 'pricing-editor-popup';
  popup.innerHTML = `
    <div class="pricing-editor-title">${model}</div>
    <div class="pricing-editor-row">
      <label>Input $/1M</label>
      <input type="number" step="any" min="0" class="pricing-input" value="${inputVal}">
    </div>
    <div class="pricing-editor-row">
      <label>Output $/1M</label>
      <input type="number" step="any" min="0" class="pricing-output" value="${outputVal}">
    </div>
    <div class="pricing-editor-row">
      <label>Cached $/1M</label>
      <input type="number" step="any" min="0" class="pricing-cached" value="${cachedVal}">
    </div>
    <div class="pricing-editor-actions">
      <button type="button" class="pricing-save-btn">저장</button>
      <button type="button" class="pricing-cancel-btn">취소</button>
    </div>
  `;

  // 위치 계산
  const rect = el.getBoundingClientRect();
  popup.style.position = 'fixed';
  popup.style.top = (rect.bottom + 4) + 'px';
  popup.style.right = (window.innerWidth - rect.right) + 'px';
  popup.style.zIndex = '10000';

  document.body.appendChild(popup);

  // 저장 버튼
  popup.querySelector('.pricing-save-btn').addEventListener('click', async () => {
    const newInput = parseFloat(popup.querySelector('.pricing-input').value) || 0;
    const newOutput = parseFloat(popup.querySelector('.pricing-output').value) || 0;
    const newCached = parseFloat(popup.querySelector('.pricing-cached').value) || 0;

    try {
      const env = document.querySelector('#adminEnvironmentSelect')?.value || 'local';
      const resp = await fetch('/api/admin/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment: env,
          pricing: {
            [service]: {
              [model]: { input: newInput, output: newOutput, cachedInput: newCached }
            }
          }
        })
      });
      const result = await resp.json();
      if (result.success) {
        // UI 업데이트
        el.dataset.input = newInput;
        el.dataset.output = newOutput;
        el.dataset.cached = newCached;

        const formatPrice = (price) => {
          if (!price || price === 0) return '0';
          let f;
          if (price >= 0.01) f = price.toFixed(3);
          else if (price >= 0.001) f = price.toFixed(4);
          else f = price.toFixed(5);
          f = f.replace(/\.?0+$/, '');
          if (!f.includes('.')) f += '.0';
          return f;
        };

        if (newInput > 0 || newOutput > 0) {
          const cachedStr = newCached ? ` / C$${formatPrice(newCached)}` : '';
          el.textContent = `↓$${formatPrice(newInput)} / ↑$${formatPrice(newOutput)}${cachedStr}`;
        }
        popup.remove();
      } else {
        alert('저장 실패: ' + (result.message || ''));
      }
    } catch (err) {
      alert('저장 오류: ' + err.message);
    }
  });

  // 취소 버튼
  popup.querySelector('.pricing-cancel-btn').addEventListener('click', () => popup.remove());

  // 바깥 클릭 시 닫기
  setTimeout(() => {
    document.addEventListener('click', function closePricing(e) {
      if (!popup.contains(e.target) && e.target !== el) {
        popup.remove();
        document.removeEventListener('click', closePricing);
      }
    });
  }, 100);

  // 첫 번째 input에 포커스
  popup.querySelector('.pricing-input').focus();
}

// ==============================================
// Local AI URL 관리 함수
// ==============================================

/**
 * 관리자 Local AI URL 로드
 */
async function loadAdminLocalAiUrl() {
  try {
    const response = await fetch('/api/admin/local-ai-url');
    const result = await response.json();
    if (result.success) {
      const input = document.getElementById('adminLocalAiUrl');
      if (input) input.value = result.data.url;
    }
  } catch (error) {
    console.error('[AI-Model-Admin] Local AI URL 로드 실패:', error);
  }
}

/**
 * 관리자 Local AI URL 저장
 */
async function saveAdminLocalAiUrl() {
  const input = document.getElementById('adminLocalAiUrl');
  const statusEl = document.getElementById('adminLocalAiStatus');
  if (!input) return;

  const url = input.value.trim();
  if (!url) {
    if (statusEl) {
      statusEl.className = 'ai-local-status error';
      statusEl.innerHTML = `${mmIcon('alert-circle', 14)} ${getAdminI18n('aiModelLocalAiUrlRequired')}`;
    }
    return;
  }

  const saveBtn = document.getElementById('adminLocalAiSaveBtn');
  const originalHtml = saveBtn?.innerHTML;

  try {
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = mmIcon('loader', 14) + ' ...';
    }

    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/admin/local-ai-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include',
      body: JSON.stringify({ url })
    });
    const result = await response.json();

    if (result.success) {
      if (statusEl) {
        statusEl.className = 'ai-local-status success';
        statusEl.innerHTML = `${mmIcon('check-circle', 14)} ${getAdminI18n('aiModelLocalAiUrlSaved')}`;
      }
    } else {
      if (statusEl) {
        statusEl.className = 'ai-local-status error';
        statusEl.innerHTML = `${mmIcon('x-circle', 14)} ${result.message}`;
      }
    }
  } catch (error) {
    if (statusEl) {
      statusEl.className = 'ai-local-status error';
      statusEl.innerHTML = `${mmIcon('x-circle', 14)} ${getAdminI18n('aiModelLocalAiUrlSaveError')}`;
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalHtml;
    }
  }
}

/**
 * 관리자 Local AI 연결 테스트
 */
async function testAdminLocalAiConnection() {
  const input = document.getElementById('adminLocalAiUrl');
  const statusEl = document.getElementById('adminLocalAiStatus');
  const testBtn = document.getElementById('adminLocalAiTestBtn');
  if (!input) return;

  const url = input.value.trim();
  if (!url) {
    if (statusEl) {
      statusEl.className = 'ai-local-status error';
      statusEl.innerHTML = `${mmIcon('alert-circle', 14)} ${getAdminI18n('aiModelLocalAiUrlRequired')}`;
    }
    return;
  }

  // 로딩 상태
  const originalHtml = testBtn?.innerHTML;
  if (testBtn) {
    testBtn.disabled = true;
    testBtn.innerHTML = mmIcon('loader', 14) + ` <span>${getAdminI18n('aiModelLocalAiTesting')}</span>`;
  }
  if (statusEl) {
    statusEl.className = 'ai-local-status';
    statusEl.innerHTML = `${mmIcon('loader', 14)} ${getAdminI18n('aiModelLocalAiTesting')}`;
  }

  try {
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/admin/local-ai-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include',
      body: JSON.stringify({ url })
    });
    const result = await response.json();

    if (result.success && result.data.connected) {
      const modelCount = result.data.models.length;
      const modelList = result.data.models.slice(0, 5).join(', ');
      statusEl.className = 'ai-local-status success';
      statusEl.innerHTML = `${mmIcon('check-circle', 14)} ${getAdminI18n('aiModelLocalAiConnected')}` +
        (modelCount > 0 ? ` (${modelCount} ${getAdminI18n('aiModelLocalAiModelsFound')}: ${modelList}${modelCount > 5 ? '...' : ''})` : '');
    } else {
      statusEl.className = 'ai-local-status error';
      statusEl.innerHTML = `${mmIcon('x-circle', 14)} ${getAdminI18n('aiModelLocalAiDisconnected')}: ${result.data?.message || ''}`;
    }
  } catch (error) {
    statusEl.className = 'ai-local-status error';
    statusEl.innerHTML = `${mmIcon('x-circle', 14)} ${getAdminI18n('aiModelLocalAiTestError')}`;
  } finally {
    if (testBtn) {
      testBtn.disabled = false;
      testBtn.innerHTML = originalHtml;
    }
  }
}

/**
 * 정렬 순서 중복 검사
 * @param {string} service - 서비스명
 * @param {string} currentModel - 현재 모델명
 * @param {number} order - 검사할 순서 값
 * @returns {string[]} - 중복되는 모델명 배열 (활성화된 모델만)
 */
function checkSortOrderDuplicates(service, currentModel, order) {
  const duplicates = [];
  const serviceOrders = aiModelState.sortOrders[service] || {};
  const enabledModels = aiModelState.models[service] || {};

  for (const [model, modelOrder] of Object.entries(serviceOrders)) {
    // 현재 모델 제외, 활성화된 모델만, 같은 순서인 경우
    if (model !== currentModel && enabledModels[model] && modelOrder === order) {
      duplicates.push(model);
    }
  }

  return duplicates;
}

/**
 * 정렬 순서 중복 토스트 메시지 표시
 * @param {string} service - 서비스명
 * @param {number} order - 중복 순서
 * @param {string} currentModel - 현재 모델명
 * @param {string[]} duplicateModels - 중복되는 다른 모델들
 */
function showSortOrderDuplicateToast(service, order, currentModel, duplicateModels) {
  // 기존 토스트 제거
  const existingToast = document.querySelector('.sort-order-toast');
  if (existingToast) {
    existingToast.remove();
  }

  // 중복되는 모델들 (현재 모델 포함)
  const allDuplicates = [currentModel, ...duplicateModels];

  // 토스트 생성
  const toast = document.createElement('div');
  toast.className = 'sort-order-toast';
  toast.innerHTML = `
    <span class="toast-icon">${mmIcon('alert-triangle', 16)}</span>
    <span class="toast-message">
      ${t('adminSortOrder', '순서')} ${order}${t('adminSortDuplicate', '번 중복:')} ${allDuplicates.join(', ')}
    </span>
  `;

  document.body.appendChild(toast);

  // 3초 후 자동 제거
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * 토큰 수 포맷팅 (예: 128000 → 128K)
 */
function formatTokenCount(tokens) {
  if (tokens >= 1000000) {
    return (tokens / 1000000).toFixed(1) + 'M';
  } else if (tokens >= 1000) {
    return Math.round(tokens / 1000) + 'K';
  }
  return tokens.toString();
}

/**
 * 서비스 활성화/비활성화 토글
 */
window.toggleAIService = function(service, enabled) {
  console.log(`[AI-Model-Admin] 서비스 토글: ${service} = ${enabled}`);
  aiModelState.services[service] = enabled;

  // UI 업데이트 - 모델 목록 활성화/비활성화
  const modelsGrid = document.getElementById(`models-${service}`);
  const selectAllBtn = document.querySelector(`.ai-service-group[data-service="${service}"] .ai-select-all-btn`);

  if (modelsGrid) {
    modelsGrid.style.opacity = enabled ? '1' : '0.5';

    // 모든 모델 체크박스 disabled 처리 (서비스 비활성화 시에만)
    modelsGrid.querySelectorAll('.ai-model-checkbox').forEach(cb => {
      cb.disabled = !enabled;
    });

    // 순서 콤보박스 disabled 처리
    modelsGrid.querySelectorAll('.ai-model-sort-order').forEach(select => {
      if (!enabled) {
        select.disabled = true;
      } else {
        // 서비스 활성화 시 모델 체크박스 상태에 따라 결정
        const model = select.dataset.model;
        const isModelEnabled = aiModelState.models[service]?.[model] ?? false;
        select.disabled = !isModelEnabled;
      }
    });

    // 모델 아이템 disabled 클래스 처리
    modelsGrid.querySelectorAll('.ai-model-item').forEach(item => {
      if (enabled) {
        item.classList.remove('disabled');
      } else {
        item.classList.add('disabled');
      }
    });

    // 비활성화 메시지 표시/숨김
    let disabledMsg = modelsGrid.querySelector('.ai-service-disabled-message');
    if (!enabled) {
      if (!disabledMsg) {
        disabledMsg = document.createElement('div');
        disabledMsg.className = 'ai-service-disabled-message';
        disabledMsg.textContent = getAdminI18n('aiModelServiceDisabled');
        modelsGrid.insertBefore(disabledMsg, modelsGrid.firstChild);
      }
    } else {
      if (disabledMsg) disabledMsg.remove();
    }
  }

  if (selectAllBtn) {
    selectAllBtn.disabled = !enabled;
  }
};

/**
 * 모델 활성화/비활성화 토글
 */
window.toggleAIModel = function(service, model, enabled) {
  console.log(`[AI-Model-Admin] 모델 토글: ${service}/${model} = ${enabled}`);
  if (!aiModelState.models[service]) {
    aiModelState.models[service] = {};
  }
  aiModelState.models[service][model] = enabled;

  // 순서 콤보박스 활성화/비활성화
  const sortOrderSelect = document.querySelector(
    `.ai-model-sort-order[data-service="${service}"][data-model="${model}"]`
  );
  if (sortOrderSelect) {
    sortOrderSelect.disabled = !enabled;
    // 비활성화 시 순서 초기화
    if (!enabled) {
      sortOrderSelect.value = '0';
      if (!aiModelState.sortOrders[service]) {
        aiModelState.sortOrders[service] = {};
      }
      aiModelState.sortOrders[service][model] = 0;
    }
  }

  // 순서 콤보박스 범위 업데이트 (활성화된 모델 수 기준)
  updateSortOrderOptions(service);
};

/**
 * 순서 콤보박스 옵션 범위 업데이트
 */
function updateSortOrderOptions(service) {
  // 활성화된 모델 수 계산
  const serviceModels = aiModelState.models[service] || {};
  const enabledCount = Object.values(serviceModels).filter(v => v === true).length;

  // 해당 서비스의 모든 순서 콤보박스 업데이트
  // 큰 숫자부터 작은 숫자 순으로 표시 (선택 편의성)
  document.querySelectorAll(`.ai-model-sort-order[data-service="${service}"]`).forEach(select => {
    const currentValue = parseInt(select.value) || 0;
    let options = '<option value="0">-</option>';
    for (let i = enabledCount; i >= 1; i--) {
      options += `<option value="${i}" ${currentValue === i ? 'selected' : ''}>${i}</option>`;
    }
    select.innerHTML = options;

    // 현재 값이 범위를 벗어나면 초기화
    if (currentValue > enabledCount) {
      select.value = '0';
      const model = select.dataset.model;
      if (!aiModelState.sortOrders[service]) {
        aiModelState.sortOrders[service] = {};
      }
      aiModelState.sortOrders[service][model] = 0;
    }
  });
}

/**
 * 서비스의 모든 모델 선택/해제 토글
 */
window.toggleAllAIModels = function(service) {
  const modelsGrid = document.getElementById(`models-${service}`);
  if (!modelsGrid) return;

  const checkboxes = modelsGrid.querySelectorAll('.ai-model-checkbox:not(:disabled)');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);

  // 모든 체크박스 토글
  checkboxes.forEach(cb => {
    cb.checked = !allChecked;
    const model = cb.id.replace(`model-${service}-`, '');
    toggleAIModel(service, model, !allChecked);
  });
};

/**
 * AI 모델 설정 저장
 */
async function saveAIModelSettings() {
  console.log('[AI-Model-Admin] 설정 저장 시작');

  // 최소 1개 서비스 활성화 확인
  const enabledServices = Object.values(aiModelState.services).filter(v => v === true).length;
  if (enabledServices === 0) {
    alert(getAdminI18n('aiModelMinServiceRequired'));
    return;
  }

  // 최소 1개 모델 활성화 확인
  let enabledModels = 0;
  for (const service of Object.keys(aiModelState.models)) {
    if (aiModelState.services[service]) {
      enabledModels += Object.values(aiModelState.models[service]).filter(v => v === true).length;
    }
  }
  if (enabledModels === 0) {
    alert(getAdminI18n('aiModelMinModelRequired'));
    return;
  }

  // 정렬 순서 중복 검사
  const duplicateErrors = validateAllSortOrders();
  if (duplicateErrors.length > 0) {
    alert(t('adminSortOrderDuplicated', '정렬 순서가 중복되었습니다:') + '\n' + duplicateErrors.join('\n'));
    return;
  }

  try {
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/admin/ai-models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include',
      body: JSON.stringify({
        environment: aiModelState.currentEnvironment,
        services: aiModelState.services,
        models: aiModelState.models,
        sortOrders: aiModelState.sortOrders
      })
    });

    const result = await response.json();

    if (result.success) {
      // 성공 토스트 표시
      showGlobalSaveToast(true);
      // 원본 데이터 업데이트
      aiModelState.originalData = JSON.stringify({
        services: aiModelState.services,
        models: aiModelState.models,
        sortOrders: aiModelState.sortOrders
      });
    } else {
      // 실패 토스트 표시 (alert 대신)
      showGlobalSaveToast(false, result.message);
    }
  } catch (error) {
    console.error('[AI-Model-Admin] 저장 실패:', error);
    // 네트워크 에러 등 실패 시 토스트 표시 (alert 대신)
    showGlobalSaveToast(false, getAdminI18n('aiModelSaveError'));
  }
}

/**
 * 전역 저장 완료 토스트 표시
 * @param {boolean} success - 성공 여부
 * @param {string} [errorMessage] - 실패 시 표시할 에러 메시지 (옵션)
 */
function showGlobalSaveToast(success, errorMessage = null) {
  const existingToast = document.querySelector('.service-save-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = `service-save-toast ${success ? '' : 'error'}`;

  // 성공/실패 메시지 구성
  let message = success ? getAdminI18n('aiModelSaveSuccess') : getAdminI18n('aiModelSaveError');
  if (!success && errorMessage) {
    message += `: ${errorMessage}`;
  }

  toast.innerHTML = `
    <span class="toast-icon">${success ? mmIcon('check-circle', 16) : mmIcon('x-circle', 16)}</span>
    <span class="toast-message">${message}</span>
  `;

  document.body.appendChild(toast);

  // 실패 시 더 오래 표시 (2초 → 5초)
  const duration = success ? 2000 : 5000;
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * 특정 서비스의 AI 모델 설정 저장
 */
async function saveServiceModelSettings(service) {
  console.log(`[AI-Model-Admin] ${service} 설정 저장 시작`);

  // 해당 서비스의 정렬 순서 중복 검사
  const duplicateErrors = validateServiceSortOrders(service);
  if (duplicateErrors.length > 0) {
    alert(`${t('adminSortOrderDuplicated', '정렬 순서가 중복되었습니다:')}\n${duplicateErrors.join('\n')}`);
    return;
  }

  // 해당 서비스의 데이터만 추출 (환경 포함)
  const serviceData = {
    environment: aiModelState.currentEnvironment,
    services: { [service]: {
      enabled: aiModelState.services[service],
      default_model: aiModelState.defaultModels[service] || null
    } },
    models: { [service]: aiModelState.models[service] || {} },
    sortOrders: { [service]: aiModelState.sortOrders[service] || {} }
  };

  try {
    console.log(`[AI-Model-Admin] ${service} API 호출 시작`);
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/admin/ai-models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include',
      body: JSON.stringify(serviceData)
    });

    console.log(`[AI-Model-Admin] ${service} API 응답 수신, status:`, response.status);
    const result = await response.json();
    console.log(`[AI-Model-Admin] ${service} API 결과:`, result);

    if (result.success) {
      // 성공 토스트 표시
      console.log(`[AI-Model-Admin] ${service} 토스트 호출`);
      showServiceSaveToast(service, true);
      console.log(`[AI-Model-Admin] ${service} 토스트 호출 완료`);
    } else {
      // 실패 토스트 표시 (alert 대신)
      showServiceSaveToast(service, false, result.message);
    }
  } catch (error) {
    console.error(`[AI-Model-Admin] ${service} 저장 실패:`, error);
    // 네트워크 에러 등 실패 시 토스트 표시 (alert 대신)
    showServiceSaveToast(service, false, getAdminI18n('aiModelSaveError'));
  }
}

/**
 * 서비스 저장 완료 토스트 표시
 * @param {string} service - 서비스명 (gpt, gemini 등)
 * @param {boolean} success - 성공 여부
 * @param {string} [errorMessage] - 실패 시 표시할 에러 메시지 (옵션)
 */
function showServiceSaveToast(service, success, errorMessage = null) {
  const existingToast = document.querySelector('.service-save-toast');
  if (existingToast) existingToast.remove();

  const toast = document.createElement('div');
  toast.className = `service-save-toast ${success ? '' : 'error'}`;

  // 성공/실패 메시지 구성
  let message = `${service.toUpperCase()} ${success ? t('adminSaveComplete', '저장 완료') : t('adminSaveFailed', '저장 실패')}`;
  if (!success && errorMessage) {
    message += `: ${errorMessage}`;
  }

  toast.innerHTML = `
    <span class="toast-icon">${success ? mmIcon('check-circle', 16) : mmIcon('x-circle', 16)}</span>
    <span class="toast-message">${message}</span>
  `;

  // document.body에 추가 (position: fixed로 화면 상단에 표시)
  document.body.appendChild(toast);

  // 실패 시 더 오래 표시 (5초 → 7초)
  const duration = success ? 5000 : 7000;
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * 특정 서비스의 정렬 순서 중복 검사
 */
function validateServiceSortOrders(service) {
  const errors = [];
  const models = aiModelState.sortOrders[service] || {};
  const enabledModels = aiModelState.models[service] || {};
  const orderMap = {};

  for (const [model, order] of Object.entries(models)) {
    if (!enabledModels[model]) continue;
    if (order === 0) continue;

    if (!orderMap[order]) {
      orderMap[order] = [];
    }
    orderMap[order].push(model);
  }

  for (const [order, modelList] of Object.entries(orderMap)) {
    if (modelList.length > 1) {
      errors.push(`${t('adminSortOrder', '순서')} ${order}${t('adminSortOrderAt', '번에')} ${modelList.join(', ')}`);
    }
  }

  return errors;
}

/**
 * 모든 서비스의 정렬 순서 중복 검사
 * @returns {string[]} - 중복 오류 메시지 배열
 */
function validateAllSortOrders() {
  const errors = [];

  for (const [service, models] of Object.entries(aiModelState.sortOrders)) {
    // 활성화된 모델만 검사
    const enabledModels = aiModelState.models[service] || {};
    const orderMap = {};

    for (const [model, order] of Object.entries(models)) {
      // 비활성화된 모델은 검사 제외
      if (!enabledModels[model]) continue;
      // 순서 0은 검사 제외 (미지정)
      if (order === 0) continue;

      if (!orderMap[order]) {
        orderMap[order] = [];
      }
      orderMap[order].push(model);
    }

    // 중복 찾기
    for (const [order, modelList] of Object.entries(orderMap)) {
      if (modelList.length > 1) {
        errors.push(`${service}: ${t('adminSortOrder', '순서')} ${order}${t('adminSortOrderAt', '번에')} ${modelList.join(', ')}`);
      }
    }
  }

  return errors;
}

/**
 * AI 모델 설정 초기화
 */
async function resetAIModelSettings() {
  if (!confirm(getAdminI18n('aiModelResetConfirm'))) {
    return;
  }

  console.log('[AI-Model-Admin] 설정 초기화');

  try {
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/admin/ai-models', {
      method: 'DELETE',
      headers: { ...csrfHeaders },
      credentials: 'include'
    });

    const result = await response.json();

    if (result.success) {
      alert(getAdminI18n('aiModelResetSuccess'));
      // 데이터 다시 로드
      await loadAIModelSettings();
    } else {
      alert(result.message || getAdminI18n('aiModelResetError'));
    }
  } catch (error) {
    console.error('[AI-Model-Admin] 초기화 실패:', error);
    alert(getAdminI18n('aiModelResetError'));
  }
}

// ============================================
// AI 모델 동기화 로그 기능
// 2026-01-05: 배치 동기화 로그 조회 UI 추가
// ============================================

// 동기화 로그 상태 관리
const modelSyncLogState = {
  currentPage: 1,
  limit: 50,
  total: 0,
  filters: {
    batchType: '',
    service: '',
    status: '',
    from: '',
    to: ''
  },
  logs: [],
  batchTypes: {}  // 배치 종류 한글명 매핑
};

/**
 * 모델 동기화 로그 관리 초기화
 */
window.initModelSyncLogs = async function() {
  console.log('[Model-Sync-Logs] 초기화');

  // 이벤트 리스너 등록
  initModelSyncLogEventListeners();

  // 상세 팝업 이벤트 리스너 등록
  initSyncLogDetailModalListeners();

  // 기본 날짜 설정 (7일 전 ~ 오늘)
  setModelSyncDefaultDateRange(7);

  // 데이터 로드
  await searchModelSyncLogs();
};

/**
 * 모델 동기화 로그 이벤트 리스너 등록
 */
function initModelSyncLogEventListeners() {
  // 검색 버튼
  const searchBtn = document.getElementById('modelSyncSearchBtn');
  if (searchBtn) {
    searchBtn.onclick = function(e) {
      e.preventDefault();
      searchModelSyncLogs();
    };
  }

  // 수동 실행 버튼
  const runBtn = document.getElementById('modelSyncRunBtn');
  if (runBtn) {
    runBtn.onclick = function(e) {
      e.preventDefault();
      runModelSync();
    };
  }

  // 배치 수동 실행 버튼들
  const batchBtns = document.querySelectorAll('.batch-run-btn');
  batchBtns.forEach(btn => {
    btn.onclick = function(e) {
      e.preventDefault();
      const batchType = this.dataset.batch;
      runBatchJob(batchType, this);
    };

    // 툴팁 초기화 (다국어 지원) - data-tooltip 속성 사용 (브라우저 기본 title 툴팁과 충돌 방지)
    const tooltipKey = btn.dataset.i18nTitle;
    if (tooltipKey && window.i18n && window.i18n[tooltipKey]) {
      btn.dataset.tooltip = window.i18n[tooltipKey];
    }
  });

  // 페이지네이션 버튼
  const prevBtn = document.getElementById('modelSyncPrevBtn');
  if (prevBtn) {
    prevBtn.onclick = function() {
      loadModelSyncLogsPrev();
    };
  }

  const nextBtn = document.getElementById('modelSyncNextBtn');
  if (nextBtn) {
    nextBtn.onclick = function() {
      loadModelSyncLogsNext();
    };
  }

  // 환경 변경 이벤트 리스너 (로컬/개발/운영 전환 시 데이터 새로고침)
  document.addEventListener('envChanged', function(e) {
    console.log('[Model-Sync-Logs] 환경 변경 감지:', e.detail);
    // 현재 배치실행로그 메뉴가 활성화된 경우에만 새로고침
    // 실제 섹션 ID: content-model-sync-logs
    const syncLogsSection = document.getElementById('content-model-sync-logs');
    // display가 'none'이 아니면 보이는 상태
    const isVisible = syncLogsSection && syncLogsSection.style.display !== 'none';

    console.log('[Model-Sync-Logs] 섹션 표시 상태:', {
      exists: !!syncLogsSection,
      display: syncLogsSection ? syncLogsSection.style.display : 'N/A',
      isVisible: isVisible
    });

    if (isVisible) {
      console.log('[Model-Sync-Logs] 환경 변경으로 자동 검색 실행');
      // 검색 버튼 클릭으로 확실하게 검색 실행
      const searchBtn = document.getElementById('modelSyncSearchBtn');
      if (searchBtn) {
        searchBtn.click();
      } else {
        searchModelSyncLogs();
      }
    }
  });

  console.log('[Model-Sync-Logs] 이벤트 리스너 등록 완료');
}

/**
 * 기본 날짜 범위 설정
 */
function setModelSyncDefaultDateRange(days) {
  const today = new Date();
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - days + 1);

  const dateFrom = document.getElementById('modelSyncDateFrom');
  const dateTo = document.getElementById('modelSyncDateTo');

  if (dateFrom) dateFrom.value = formatDateForInput(fromDate);
  if (dateTo) dateTo.value = formatDateForInput(today);
}

/**
 * 모델 동기화 로그 검색
 */
window.searchModelSyncLogs = async function() {
  // 필터 값 수집
  modelSyncLogState.filters.batchType = document.getElementById('batchTypeFilter')?.value || '';
  modelSyncLogState.filters.service = document.getElementById('modelSyncService')?.value || '';
  modelSyncLogState.filters.status = document.getElementById('modelSyncStatus')?.value || '';
  modelSyncLogState.filters.from = document.getElementById('modelSyncDateFrom')?.value || '';
  modelSyncLogState.filters.to = document.getElementById('modelSyncDateTo')?.value || '';

  // 페이지 초기화
  modelSyncLogState.currentPage = 1;

  await loadModelSyncLogs();
  await loadModelSyncStats();
};

/**
 * 모델 동기화 로그 데이터 로드
 */
async function loadModelSyncLogs() {
  const tableBody = document.getElementById('modelSyncLogsTableBody');
  if (!tableBody) return;

  // 로딩 표시
  tableBody.innerHTML = `<tr><td colspan="11" class="admin-loading">${t('loading', '로딩 중...')}</td></tr>`;

  try {
    const params = new URLSearchParams();
    // 환경 파라미터 추가 (로컬/개발/운영 DB 분리)
    const env = window.SettingsEnv ? window.SettingsEnv.getBackendEnv() : 'local';
    params.append('env', env);
    if (modelSyncLogState.filters.batchType) params.append('batchType', modelSyncLogState.filters.batchType);
    if (modelSyncLogState.filters.service) params.append('service', modelSyncLogState.filters.service);
    if (modelSyncLogState.filters.status) params.append('status', modelSyncLogState.filters.status);
    if (modelSyncLogState.filters.from) params.append('from', modelSyncLogState.filters.from);
    if (modelSyncLogState.filters.to) params.append('to', modelSyncLogState.filters.to);
    params.append('limit', modelSyncLogState.limit);
    params.append('offset', (modelSyncLogState.currentPage - 1) * modelSyncLogState.limit);

    const response = await fetch(`/api/admin/model-sync/logs?${params.toString()}`, {
      credentials: 'include'
    });

    if (response.status === 401) {
      const data = await response.json();
      if (data.requiresVerification) {
        showAdminPasswordPopup();
        return;
      }
      throw new Error(t('adminAuthRequired', '인증이 필요합니다.'));
    }

    if (!response.ok) {
      throw new Error(t('adminLogLoadFailed', '로그 로드 실패'));
    }

    const data = await response.json();
    modelSyncLogState.logs = data.data.logs || [];
    modelSyncLogState.total = data.data.total || 0;
    modelSyncLogState.batchTypes = data.data.batchTypes || {};

    renderModelSyncLogs();
    updateModelSyncPagination();

  } catch (error) {
    console.error('[Model-Sync-Logs] 로그 로드 오류:', error);
    tableBody.innerHTML = `<tr><td colspan="11" class="admin-empty">
      <div class="admin-empty-icon">!</div>
      <div class="admin-empty-text">${error.message}</div>
    </td></tr>`;
  }
}

/**
 * 모델 동기화 로그 테이블 렌더링
 */
function renderModelSyncLogs() {
  const tableBody = document.getElementById('modelSyncLogsTableBody');
  if (!tableBody) return;

  if (modelSyncLogState.logs.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="11" class="admin-empty">
      <div class="admin-empty-icon">${mmIcon('clipboard', 16)}</div>
      <div class="admin-empty-text">${t('adminBatchLogEmpty', '배치 실행 로그가 없습니다.')}</div>
    </td></tr>`;
    return;
  }

  // 배치 종류별 아이콘 매핑
  const batchTypeIcons = {
    'model_sync': mmIcon('robot', 16),
    'exchange_rate': mmIcon('dollar-sign', 16),
    'subscription': mmIcon('package', 16),
    'credit_rate': mmIcon('dollar-sign', 16),
    'backup': mmIcon('save', 16),
    'error_cleanup': mmIcon('trash', 16),
    'log_backup': mmIcon('package', 16),
    'daily_credit': mmIcon('calendar', 16),
    'qa_auto_reply': mmIcon('message-circle', 16),
    'cloud-scheduler-warmup': mmIcon('cloud', 16)
  };

  tableBody.innerHTML = modelSyncLogState.logs.map((log, index) => {
    const statusClass = log.api_status === 'success' ? 'success' : 'error';
    const statusIcon = log.api_status === 'success' ? mmIcon('check-circle', 14) : mmIcon('x-circle', 14);
    const date = log.sync_date || '-';
    const service = (log.ai_service || '').toUpperCase();
    const errorMsg = log.error_message ? escapeHtml(log.error_message).substring(0, 30) : '-';
    const responseTime = log.response_time_ms ? `${log.response_time_ms}ms` : '-';

    // 배치 종류 표시
    const batchType = log.batch_type || 'model_sync';
    const batchTypeName = log.batch_type_name || modelSyncLogState.batchTypes[batchType] || batchType;
    const batchIcon = batchTypeIcons[batchType] || mmIcon('clipboard', 16);

    return `
      <tr class="sync-log-row clickable" data-index="${index}" onclick="showSyncLogDetail(${index})">
        <td><span class="batch-type-badge" data-batch-type="${batchType}">${batchIcon} ${batchTypeName}</span></td>
        <td>${date}</td>
        <td><span class="service-badge ${log.ai_service}">${service || '-'}</span></td>
        <td><span class="status-badge ${statusClass}">${statusIcon} ${log.api_status}</span></td>
        <td>${log.models_found ?? 0}</td>
        <td>${log.models_added ?? 0}</td>
        <td>${log.models_updated ?? 0}</td>
        <td>${log.models_deprecated ?? 0}</td>
        <td>${responseTime}</td>
        <td title="${escapeHtml(log.error_message || '')}">${errorMsg}</td>
        <td><button class="sync-log-delete-btn" onclick="event.stopPropagation(); deleteSyncLog(${log.id})">${t('delete', '삭제')}</button></td>
      </tr>
    `;
  }).join('');
}

/**
 * 배치 실행 로그 상세 팝업 표시
 * @param {number} index - 로그 인덱스
 */
window.showSyncLogDetail = function(index) {
  const log = modelSyncLogState.logs[index];
  if (!log) {
    console.error('[Batch-Logs] 로그를 찾을 수 없습니다:', index);
    return;
  }

  // 배치 종류별 설정
  const batchType = log.batch_type || 'model_sync';
  const batchTypeConfig = {
    'model_sync': { icon: mmIcon('robot', 16), name: t('adminBatchModelSync', 'AI 모델 동기화'), gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    'exchange_rate': { icon: mmIcon('dollar-sign', 16), name: t('adminBatchExchangeRate', '환율 업데이트'), gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
    'subscription': { icon: mmIcon('package', 16), name: t('adminBatchSubscription', '구독 처리'), gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    'credit_rate': { icon: mmIcon('dollar-sign', 16), name: t('adminBatchCreditRate', '크레딧 레이트'), gradient: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)' },
    'backup': { icon: mmIcon('save', 16), name: t('adminBatchBackup', 'DB백업'), gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    'log_backup': { icon: mmIcon('package', 16), name: t('adminBatchLogBackup', '로그 백업'), gradient: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)' },
    'daily_credit': { icon: mmIcon('calendar', 16), name: t('adminBatchDailyCredit', '일일 크레딧 리셋'), gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
    'qa_auto_reply': { icon: mmIcon('message-circle', 16), name: t('adminBatchQaAutoReply', 'Q&A 자동 답변'), gradient: 'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)' },
    'cloud-scheduler-warmup': { icon: mmIcon('cloud', 16), name: 'Cloud Run Warmup', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }
  };
  const config = batchTypeConfig[batchType] || { icon: mmIcon('clipboard', 16), name: batchType, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' };

  // 팝업 제목 및 헤더 색상 변경
  const titleEl = document.getElementById('syncLogDetailTitle');
  const headerEl = document.getElementById('syncLogDetailHeader');
  if (titleEl) titleEl.innerHTML = `${config.icon} ${config.name} ${t('adminDetail', '상세')}`;
  if (headerEl) headerEl.style.background = config.gradient;

  // 기본 정보 채우기
  document.getElementById('syncDetailId').textContent = log.id || '-';
  document.getElementById('syncDetailDate').textContent = log.sync_date || '-';

  // 배치 종류 배지
  const batchTypeEl = document.getElementById('syncDetailBatchType');
  const batchTypeName = log.batch_type_name || modelSyncLogState.batchTypes[batchType] || config.name;
  batchTypeEl.innerHTML = `<span class="batch-type-badge" data-batch-type="${batchType}">${config.icon} ${batchTypeName}</span>`;

  // 상태 배지
  const statusEl = document.getElementById('syncDetailStatus');
  const statusClass = log.api_status === 'success' ? 'success' : 'error';
  const statusIcon = log.api_status === 'success' ? mmIcon('check-circle', 14) : mmIcon('x-circle', 14);
  statusEl.innerHTML = `<span class="status-badge ${statusClass}">${statusIcon} ${log.api_status}</span>`;

  // 처리 시간
  document.getElementById('syncDetailResponseTime').textContent =
    log.response_time_ms ? `${log.response_time_ms}ms` : '-';

  // AI 서비스 (model_sync 전용)
  const serviceItem = document.getElementById('syncDetailServiceItem');
  const serviceEl = document.getElementById('syncDetailService');
  if (batchType === 'model_sync' && log.ai_service) {
    serviceItem.style.display = '';
    const serviceName = (log.ai_service || '').toUpperCase();
    serviceEl.innerHTML = `<span class="service-badge ${log.ai_service}">${serviceName}</span>`;
  } else {
    serviceItem.style.display = 'none';
  }

  // 모든 통계 섹션 숨기기
  document.getElementById('syncDetailModelStatsSection').style.display = 'none';
  document.getElementById('syncDetailQaStatsSection').style.display = 'none';
  document.getElementById('syncDetailResultSection').style.display = 'none';

  // 배치 종류별 통계 섹션 표시
  if (batchType === 'model_sync') {
    // AI 모델 동기화 통계
    document.getElementById('syncDetailModelStatsSection').style.display = 'block';
    document.getElementById('syncDetailFound').textContent = log.models_found ?? 0;
    document.getElementById('syncDetailAdded').textContent = log.models_added ?? 0;
    document.getElementById('syncDetailUpdated').textContent = log.models_updated ?? 0;
    document.getElementById('syncDetailDeprecated').textContent = log.models_deprecated ?? 0;
  } else if (batchType === 'qa_auto_reply') {
    // Q&A 자동 답변 통계
    document.getElementById('syncDetailQaStatsSection').style.display = 'block';
    // extra 필드에서 통계 정보 추출
    let qaStats = { total: 0, processed: 0, skipped: 0, emailed: 0 };
    if (log.extra) {
      try {
        const extra = typeof log.extra === 'string' ? JSON.parse(log.extra) : log.extra;
        qaStats.total = extra.totalQuestions ?? extra.total ?? 0;
        qaStats.processed = extra.processed ?? 0;
        qaStats.skipped = extra.skipped ?? 0;
        qaStats.emailed = extra.emailed ?? extra.processed ?? 0;
      } catch (e) { /* ignore */ }
    }
    document.getElementById('syncDetailQaTotal').textContent = qaStats.total;
    document.getElementById('syncDetailQaProcessed').textContent = qaStats.processed;
    document.getElementById('syncDetailQaSkipped').textContent = qaStats.skipped;
    document.getElementById('syncDetailQaEmailed').textContent = qaStats.emailed;
  } else {
    // 기타 배치: 일반 결과 메시지 표시
    document.getElementById('syncDetailResultSection').style.display = 'block';
    let resultMessage = t('adminExecutionComplete', '실행 완료');
    if (log.extra) {
      try {
        const extra = typeof log.extra === 'string' ? JSON.parse(log.extra) : log.extra;
        if (extra.message) resultMessage = extra.message;
        else if (extra.result) resultMessage = extra.result;
        else resultMessage = JSON.stringify(extra, null, 2);
      } catch (e) {
        resultMessage = log.extra;
      }
    }
    document.getElementById('syncDetailResult').textContent = resultMessage;
  }

  // 에러 메시지 (실패 시에만 표시)
  const errorSection = document.getElementById('syncDetailErrorSection');
  const errorEl = document.getElementById('syncDetailError');
  if (log.error_message) {
    errorSection.style.display = 'block';
    errorEl.textContent = log.error_message;
  } else {
    errorSection.style.display = 'none';
  }

  // 팝업 표시
  const modal = document.getElementById('syncLogDetailModal');
  if (modal) {
    modal.style.display = 'flex';
  }

  console.log('[Batch-Logs] 상세 팝업 표시:', log);
};

/**
 * 모델 동기화 로그 상세 팝업 닫기
 */
window.closeSyncLogDetailModal = function() {
  const modal = document.getElementById('syncLogDetailModal');
  if (modal) {
    modal.style.display = 'none';
  }
};

// 상세 팝업 이벤트 리스너 초기화
function initSyncLogDetailModalListeners() {
  // X 버튼
  const closeBtn = document.getElementById('closeSyncLogDetailModal');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSyncLogDetailModal);
  }

  // 닫기 버튼
  const closeModalBtn = document.getElementById('closeSyncLogDetailModalBtn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeSyncLogDetailModal);
  }

  // 오버레이 클릭 시 닫기
  const modal = document.getElementById('syncLogDetailModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeSyncLogDetailModal();
      }
    });
  }

  // ESC 키로 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('syncLogDetailModal');
      if (modal && modal.style.display === 'flex') {
        closeSyncLogDetailModal();
      }
    }
  });
}

/**
 * 모델 동기화 통계 로드
 */
async function loadModelSyncStats() {
  try {
    // 환경 파라미터 추가 (로컬/개발/운영 DB 분리)
    const env = window.SettingsEnv ? window.SettingsEnv.getBackendEnv() : 'local';
    const response = await fetch(`/api/admin/model-sync/stats?days=7&env=${env}`, {
      credentials: 'include'
    });

    if (!response.ok) return;

    const data = await response.json();
    const stats = data.data;

    // 통계 업데이트
    document.getElementById('syncStatSuccess').textContent = stats.summary?.success_count || 0;
    document.getElementById('syncStatFailed').textContent = stats.summary?.failed_count || 0;
    document.getElementById('syncStatAdded').textContent = stats.summary?.total_added || 0;
    document.getElementById('syncStatDeprecated').textContent = stats.summary?.total_deprecated || 0;

    // 마지막 동기화 시간
    if (stats.summary?.last_sync_at) {
      const lastSync = new Date(stats.summary.last_sync_at);
      document.getElementById('syncStatLastSync').textContent = (window.MyMind3?.Intl?.formatDate(lastSync, { dateStyle: 'short', timeStyle: 'short' }) || lastSync.toLocaleString());
    }

  } catch (error) {
    console.error('[Model-Sync-Logs] 통계 로드 오류:', error);
  }
}

/**
 * 모델 동기화 페이지네이션 업데이트
 */
function updateModelSyncPagination() {
  const pageInfo = document.getElementById('modelSyncPageInfo');
  const prevBtn = document.getElementById('modelSyncPrevBtn');
  const nextBtn = document.getElementById('modelSyncNextBtn');

  const totalPages = Math.ceil(modelSyncLogState.total / modelSyncLogState.limit) || 1;

  if (pageInfo) {
    pageInfo.textContent = `${t('adminPage', '페이지')} ${modelSyncLogState.currentPage}/${totalPages} (${t('adminTotal', '총')} ${modelSyncLogState.total}${t('adminCount', '건')})`;
  }

  if (prevBtn) {
    prevBtn.disabled = modelSyncLogState.currentPage <= 1;
  }

  if (nextBtn) {
    nextBtn.disabled = modelSyncLogState.currentPage >= totalPages;
  }
}

/**
 * 이전 페이지 로드
 */
window.loadModelSyncLogsPrev = function() {
  if (modelSyncLogState.currentPage > 1) {
    modelSyncLogState.currentPage--;
    loadModelSyncLogs();
  }
};

/**
 * 다음 페이지 로드
 */
window.loadModelSyncLogsNext = function() {
  const totalPages = Math.ceil(modelSyncLogState.total / modelSyncLogState.limit);
  if (modelSyncLogState.currentPage < totalPages) {
    modelSyncLogState.currentPage++;
    loadModelSyncLogs();
  }
};

/**
 * 개별 동기화 로그 삭제
 * @param {number} logId - 삭제할 로그 ID
 */
window.deleteSyncLog = async function(logId) {
  if (!confirm(t('adminDeleteLogConfirm', '이 로그를 삭제하시겠습니까?'))) {
    return;
  }

  try {
    // 환경 파라미터 추가 (로컬/개발/운영 DB 분리)
    const env = window.SettingsEnv ? window.SettingsEnv.getBackendEnv() : 'local';
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch(`/api/admin/model-sync/logs/${logId}?env=${env}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include'
    });

    const result = await response.json();

    if (result.success) {
      console.log('[Model-Sync-Logs] 로그 삭제 완료:', logId);
      // 로그 목록 새로고침
      await searchModelSyncLogs();
    } else {
      throw new Error(result.message || t('adminDeleteFailed', '삭제 실패'));
    }

  } catch (error) {
    console.error('[Model-Sync-Logs] 로그 삭제 오류:', error);
    alert(`${t('adminDeleteFailed', '삭제 실패')}: ${error.message}`);
  }
};

/**
 * 모든 동기화 로그 삭제
 */
window.deleteAllSyncLogs = async function() {
  if (!confirm(t('adminDeleteAllLogsConfirm', '모든 동기화 로그를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.'))) {
    return;
  }

  // 2차 확인
  if (!confirm(t('adminDeleteAllLogsConfirm2', '정말로 모든 로그를 삭제하시겠습니까?'))) {
    return;
  }

  try {
    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/admin/model-sync/logs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include'
    });

    const result = await response.json();

    if (result.success) {
      alert(`${result.deletedCount}${t('adminLogsDeleted', '건의 로그가 삭제되었습니다.')}`);
      console.log('[Model-Sync-Logs] 전체 로그 삭제 완료:', result.deletedCount);
      // 로그 목록 새로고침
      await searchModelSyncLogs();
    } else {
      throw new Error(result.message || t('adminDeleteFailed', '삭제 실패'));
    }

  } catch (error) {
    console.error('[Model-Sync-Logs] 전체 로그 삭제 오류:', error);
    alert(`${t('adminDeleteFailed', '삭제 실패')}: ${error.message}`);
  }
};

/**
 * 배치 작업 수동 실행
 * @param {string} batchType - 배치 타입
 * @param {HTMLElement} btn - 클릭된 버튼
 */
async function runBatchJob(batchType, btn) {
  // 배치 타입별 설정
  const batchConfig = {
    'exchange-rate': {
      name: t('adminBatchExchangeRate', '환율 업데이트'),
      endpoint: '/api/admin/batch/exchange-rate',
      confirm: t('adminBatchExchangeRateConfirm', '환율 정보를 업데이트하시겠습니까?')
    },
    'subscription': {
      name: t('adminBatchSubscription', '구독 처리'),
      endpoint: '/api/admin/batch/subscription',
      confirm: t('adminBatchSubscriptionConfirm', '구독 상태를 처리하시겠습니까?\n\n만료된 구독 처리 및 갱신을 수행합니다.')
    },
    'credit-rate': {
      name: t('adminBatchCreditRateRecalc', '크레딧 레이트 재계산'),
      endpoint: '/api/admin/batch/credit-rate',
      confirm: t('adminBatchCreditRateConfirm', '크레딧 레이트를 재계산하시겠습니까?\n\n모든 AI 모델의 크레딧 비용을 재계산합니다.')
    },
    'backup': {
      name: t('adminBatchBackup', 'DB백업'),
      endpoint: '/api/admin/batch/backup',
      confirm: t('adminBatchBackupConfirm', 'PostgreSQL 데이터베이스를 백업하시겠습니까?\n\n/backup/db/yyyyMMDD/ 경로에 ZIP 압축하여 저장합니다.')
    },
    'daily-credit': {
      name: t('adminBatchDailyCredit', '일일 크레딧 리셋'),
      endpoint: '/api/admin/batch/daily-credit',
      confirm: t('adminBatchDailyCreditConfirm', '일일 크레딧을 리셋하시겠습니까?\n\n모든 사용자의 일일 크레딧 한도를 초기화합니다.')
    },
    'model-sync': {
      name: t('adminBatchModelSync', 'AI 모델 동기화'),
      endpoint: '/api/admin/model-sync/run',
      confirm: t('adminBatchModelSyncConfirm', 'AI 모델 동기화를 수동으로 실행하시겠습니까?\n\n모든 AI 서비스의 모델 목록을 조회하고 DB를 업데이트합니다.')
    },
    'qa-auto-reply': {
      name: t('adminBatchQaAutoReply', 'Q&A 자동 답변'),
      endpoint: '/api/admin/batch/qa-auto-reply',
      confirm: t('adminBatchQaAutoReplyConfirm', 'Q&A 자동 답변을 실행하시겠습니까?\n\n미답변 질문에 AI 자동 답변을 생성합니다.')
    },
    'log-backup': {
      name: t('adminBatchLogBackup', '로그 백업'),
      endpoint: '/api/admin/batch/log-backup',
      confirm: t('adminBatchLogBackupConfirm', '로그 파일을 백업하시겠습니까?\n\n타입별 100MB 초과 로그가 압축 백업됩니다.')
    },
    'cloud-scheduler-warmup': {
      name: 'Cloud Run Warmup',
      endpoint: '/api/admin/batch/cloud-scheduler-warmup',
      confirm: t('adminBatchWarmupConfirm', 'Cloud Run Warmup을 수동으로 실행하시겠습니까?\n\n/api/health 엔드포인트를 호출하여 인스턴스를 warm 상태로 유지합니다.')
    }
  };

  const config = batchConfig[batchType];
  if (!config) {
    alert(`${t('adminUnknownBatchType', '알 수 없는 배치 타입:')} ${batchType}`);
    return;
  }

  const originalText = btn.innerHTML;

  if (!confirm(config.confirm)) {
    return;
  }

  try {
    btn.disabled = true;
    btn.innerHTML = t('adminExecuting', '실행 중...');

    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include',
      body: JSON.stringify({ manual: true })
    });

    const result = await response.json();

    if (result.success) {
      const timeInfo = result.data?.totalTime ? `\n${t('adminElapsedTime', '소요시간:')} ${result.data.totalTime}ms` : '';
      alert(`${config.name} ${t('adminComplete', '완료!')}${timeInfo}`);
      // 로그 새로고침
      await searchModelSyncLogs();
    } else {
      throw new Error(result.message || `${config.name} ${t('adminFailed', '실패')}`);
    }

  } catch (error) {
    console.error(`[Batch] ${config.name} 실행 오류:`, error);
    alert(`${config.name} ${t('adminFailed', '실패')}\n\n${error.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

/**
 * 모델 동기화 수동 실행
 */
async function runModelSync() {
  const runBtn = document.getElementById('modelSyncRunBtn');
  const originalText = runBtn.innerHTML;

  if (!confirm(t('adminBatchModelSyncConfirm', 'AI 모델 동기화를 수동으로 실행하시겠습니까?\n\n모든 AI 서비스의 모델 목록을 조회하고 DB를 업데이트합니다.'))) {
    return;
  }

  try {
    runBtn.disabled = true;
    runBtn.innerHTML = t('adminExecuting', '실행 중...');

    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/admin/model-sync/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include',
      body: JSON.stringify({ dryRun: false })
    });

    const result = await response.json();

    if (result.success) {
      alert(`${t('adminSyncComplete', '동기화 완료!')}\n\n${t('adminTotalElapsedTime', '총 소요시간:')} ${result.data.totalTime}ms`);
      // 로그 새로고침
      await searchModelSyncLogs();
    } else {
      throw new Error(result.message || t('adminSyncFailed', '동기화 실패'));
    }

  } catch (error) {
    console.error('[Model-Sync-Logs] 수동 실행 오류:', error);
    alert(`${t('adminSyncFailed', '동기화 실패')}\n\n${error.message}`);
  } finally {
    runBtn.disabled = false;
    runBtn.innerHTML = originalText;
  }
}

// ============================================
// 로깅 설정 관리
// 2026-01-08: 로그 생성 레벨 제어
// ============================================

/**
 * 로깅 설정 로드
 */
// 서버의 실제 NODE_ENV를 캐시 (로깅 설정 전용)
let _serverNodeEnv = null;

/**
 * 로깅 설정에 사용할 환경 결정
 * 서버의 실제 NODE_ENV를 사용하여 설정 불일치 방지
 */
function getLoggingEnv() {
  if (_serverNodeEnv) return _serverNodeEnv;
  return window.SettingsEnv ? window.SettingsEnv.getBackendEnv() : 'local';
}

async function loadLoggingSettings() {
  try {
    // 서버 환경 감지를 위해 우선 요청
    const env = getLoggingEnv();

    const response = await fetch('/api/admin/logging-settings?env=' + encodeURIComponent(env), {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(t('adminLoggingLoadFailed', '로깅 설정 로드 실패'));
    }

    const result = await response.json();

    if (result.success) {
      // 서버의 실제 NODE_ENV 감지 및 캐시
      if (result.data.serverEnv && !_serverNodeEnv) {
        _serverNodeEnv = result.data.serverEnv;
        // 서버 환경과 요청 환경이 다르면 올바른 환경으로 재로드
        if (_serverNodeEnv !== env) {
          console.log('[Settings-Admin] 서버 환경 감지: ' + _serverNodeEnv + ' (요청: ' + env + '). 재로드합니다.');
          return loadLoggingSettings();
        }
      }

      // 체크박스 상태 설정
      const criticalChk = document.getElementById('logGenCritical');
      const errorChk = document.getElementById('logGenError');
      const warningChk = document.getElementById('logGenWarning');
      const infoChk = document.getElementById('logGenInfo');
      const debugChk = document.getElementById('logGenDebug');

      if (criticalChk) criticalChk.checked = result.data.critical;
      if (errorChk) errorChk.checked = result.data.error;
      if (warningChk) warningChk.checked = result.data.warning;
      if (infoChk) infoChk.checked = result.data.info;
      if (debugChk) debugChk.checked = result.data.debug;

      console.log('[Settings-Admin] 로깅 설정 로드 완료 [' + getLoggingEnv() + ']:', result.data);
    }
  } catch (error) {
    console.warn('[Settings-Admin] 로깅 설정 로드 실패:', error.message);
  }
}

/**
 * 로깅 설정 저장 (자동 저장)
 */
async function saveLoggingSettings() {
  try {
    const critical = document.getElementById('logGenCritical')?.checked ?? true;
    const error = document.getElementById('logGenError')?.checked ?? true;
    const warning = document.getElementById('logGenWarning')?.checked ?? true;
    const info = document.getElementById('logGenInfo')?.checked ?? true;
    const debug = document.getElementById('logGenDebug')?.checked ?? false;

    // 모든 체크박스 해제 허용 (로그 생성 완전 비활성화 가능)
    if (!critical && !error && !warning && !info && !debug) {
      console.log('[Settings-Admin] 모든 로그 레벨 비활성화');
    }

    // 서버의 실제 환경 사용
    const env = getLoggingEnv();

    const csrfHeaders = window.csrfUtils ? await window.csrfUtils.getCsrfHeaders() : {};
    const response = await fetch('/api/admin/logging-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...csrfHeaders },
      credentials: 'include',
      body: JSON.stringify({ critical, error, warning, info, debug, env })
    });

    const result = await response.json();

    if (result.success) {
      console.log('[Settings-Admin] 로깅 설정 저장 완료 [' + env + ']:', result.data);
    } else {
      throw new Error(result.message || t('adminSaveFailed', '저장 실패'));
    }
  } catch (error) {
    console.error('[Settings-Admin] 로깅 설정 저장 실패:', error);
  }
}

/**
 * 로깅 설정 이벤트 리스너 초기화
 */
function initLoggingSettingsEvents() {
  // 체크박스 변경 시 자동 저장
  const checkboxIds = ['logGenCritical', 'logGenError', 'logGenWarning', 'logGenInfo', 'logGenDebug'];
  checkboxIds.forEach(function(id) {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', function() {
        saveLoggingSettings();
      });
    }
  });
  console.log('[Settings-Admin] 로깅 설정 체크박스 자동저장 핸들러 등록');

  // 환경 변경 시 설정 다시 로드
  document.addEventListener('envChanged', function(e) {
    console.log('[Settings-Admin] 환경 변경 감지:', e.detail.backendEnv);
    loadLoggingSettings();
  });

  // 초기 로드
  loadLoggingSettings();
}

// 전역 함수로 노출 (initSettingsAdmin에서 호출용)
window.initLoggingSettingsEvents = initLoggingSettingsEvents;
window.loadLoggingSettings = loadLoggingSettings;

console.log('[Settings-Admin] settings-admin.js 로드 완료');
