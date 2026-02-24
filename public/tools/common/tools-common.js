/**
 * 도구 공통 유틸리티
 * All-in-One 도구 허브 공통 JavaScript
 * @created 2026-01-11
 */

const ToolsUtil = {
  /**
   * 파일 크기 포맷팅
   * @param {number} bytes - 바이트 수
   * @returns {string} 포맷된 크기
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * 파일 다운로드
   * @param {Blob|ArrayBuffer|string} data - 다운로드할 데이터
   * @param {string} filename - 파일명
   * @param {string} mimeType - MIME 타입
   */
  downloadFile(data, filename, mimeType = 'application/octet-stream') {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Base64 데이터 다운로드
   * @param {string} base64Data - Base64 데이터 (data URI 포함)
   * @param {string} filename - 파일명
   */
  downloadBase64(base64Data, filename) {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * 클립보드 복사
   * @param {string} text - 복사할 텍스트
   * @returns {Promise<boolean>} 성공 여부
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // 폴백: 구형 브라우저
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textarea);
      return result;
    }
  },

  /**
   * 드래그 앤 드롭 설정
   * @param {HTMLElement} element - 드롭 영역 요소
   * @param {Function} onDrop - 드롭 콜백 (files)
   * @param {Object} options - 옵션
   */
  setupDropZone(element, onDrop, options = {}) {
    const { accept = '*', multiple = true } = options;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
      element.addEventListener(event, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(event => {
      element.addEventListener(event, () => {
        element.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(event => {
      element.addEventListener(event, () => {
        element.classList.remove('dragover');
      });
    });

    element.addEventListener('drop', (e) => {
      let files = Array.from(e.dataTransfer.files);

      // 파일 타입 필터링
      if (accept !== '*') {
        const acceptTypes = accept.split(',').map(t => t.trim());
        files = files.filter(file => {
          return acceptTypes.some(type => {
            if (type.startsWith('.')) {
              return file.name.toLowerCase().endsWith(type.toLowerCase());
            }
            if (type.endsWith('/*')) {
              return file.type.startsWith(type.slice(0, -1));
            }
            return file.type === type;
          });
        });
      }

      // 다중 선택 제한
      if (!multiple && files.length > 1) {
        files = [files[0]];
      }

      if (files.length > 0) {
        onDrop(files);
      }
    });

    // 클릭으로 파일 선택
    element.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.multiple = multiple;
      input.onchange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
          onDrop(files);
        }
      };
      input.click();
    });
  },

  /**
   * 로딩 표시
   * @param {HTMLElement} element - 로딩 표시할 요소
   * @param {boolean} show - 표시 여부
   */
  showLoading(element, show = true) {
    if (show) {
      const existingSpinner = element.querySelector('.tool-loading');
      if (existingSpinner) return;

      const spinner = document.createElement('div');
      spinner.className = 'tool-loading';
      spinner.innerHTML = '<div class="tool-spinner"></div>';
      element.appendChild(spinner);
    } else {
      const spinner = element.querySelector('.tool-loading');
      if (spinner) spinner.remove();
    }
  },

  /**
   * 토스트 메시지 표시
   * @param {string} message - 메시지
   * @param {string} type - 타입 (success, error, info, warning)
   * @param {number} duration - 표시 시간 (ms)
   */
  showToast(message, type = 'info', duration = 3000) {
    // 기존 시스템 토스트 사용
    if (window.showToast) {
      window.showToast(message, type);
      return;
    }

    // 폴백: 자체 토스트
    const toast = document.createElement('div');
    toast.className = `tool-toast tool-toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      z-index: 10001;
      animation: slideIn 0.3s ease;
    `;

    const colors = {
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      info: '#667eea'
    };
    toast.style.background = colors[type] || colors.info;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * 결과 메시지 표시
   * @param {HTMLElement} container - 컨테이너 요소
   * @param {string} message - 메시지
   * @param {string} type - 타입 (success, error, info)
   */
  showResult(container, message, type = 'info') {
    const existingResult = container.querySelector('.tool-result');
    if (existingResult) existingResult.remove();

    const result = document.createElement('div');
    result.className = `tool-result tool-result-${type}`;
    result.textContent = message;
    container.appendChild(result);
  },

  /**
   * 디바운스
   * @param {Function} func - 실행할 함수
   * @param {number} wait - 대기 시간 (ms)
   * @returns {Function} 디바운스된 함수
   */
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * 파일 읽기 (Promise)
   * @param {File} file - 파일 객체
   * @param {string} readAs - 읽기 방식 (text, dataURL, arrayBuffer)
   * @returns {Promise<string|ArrayBuffer>} 파일 내용
   */
  readFile(file, readAs = 'text') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);

      switch (readAs) {
        case 'dataURL':
          reader.readAsDataURL(file);
          break;
        case 'arrayBuffer':
          reader.readAsArrayBuffer(file);
          break;
        default:
          reader.readAsText(file);
      }
    });
  },

  /**
   * 안전한 HTML 이스케이프
   * @param {string} str - 이스케이프할 문자열
   * @returns {string} 이스케이프된 문자열
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * 복사 버튼 초기화
   * @param {HTMLElement} container - 복사 버튼이 있는 컨테이너
   * @param {Function} getContent - 복사할 내용을 반환하는 함수
   */
  initCopyButton(container, getContent) {
    const copyBtn = container.querySelector('.copy-btn');
    if (!copyBtn) return;

    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const content = typeof getContent === 'function' ? getContent() : getContent;
      const success = await this.copyToClipboard(content);

      if (success) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '복사됨!';
        copyBtn.classList.add('copied');

        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.classList.remove('copied');
        }, 2000);
      }
    });
  },

  /**
   * 에러 처리
   * @param {Error} error - 에러 객체
   * @param {HTMLElement} container - 에러 표시할 컨테이너
   */
  handleError(error, container) {
    console.error('[Tool Error]', error);
    this.showResult(container, error.message || '오류가 발생했습니다.', 'error');
    this.showToast(error.message || '오류가 발생했습니다.', 'error');
  }
};

// 전역 등록
window.ToolsUtil = ToolsUtil;

/**
 * 전역 goBack() - 각 도구 페이지의 인라인 goBack()을 덮어씀
 * 새 탭으로 열린 도구 페이지에서 뒤로가기 처리
 */
window.goBack = function() {
  // window.opener가 있으면 탭 닫기 (메인 앱에서 window.open으로 열린 경우)
  if (window.opener) {
    window.close();
    return;
  }
  // 히스토리가 있으면 뒤로가기
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  // 그 외 메인 페이지로 이동
  window.location.href = '/';
};

/**
 * 광고 영역 자동 삽입
 * 좌측 20%, 우측 20% 광고 영역 생성
 */
function initToolAdAreas() {
  // 도구 허브 페이지에서는 실행하지 않음
  const pathname = window.location.pathname;
  if (pathname === '/tools/' || pathname === '/tools') return;

  // 이미 광고 영역이 있으면 스킵
  if (document.querySelector('.tool-page-wrapper')) return;

  // DOM 조작으로 기존 요소를 감싸기 (innerHTML 교체 금지 - 이벤트 리스너/스크립트 파괴 방지)
  const wrapper = document.createElement('div');
  wrapper.className = 'tool-page-wrapper';

  // 좌측 광고 영역
  const leftAd = document.createElement('aside');
  leftAd.className = 'tool-ad-left';
  leftAd.innerHTML = `
    <div class="tool-ad-label">Advertisement</div>
    <div class="tool-ad-placeholder">
      <div class="tool-ad-placeholder-icon"></div>
      <div class="tool-ad-placeholder-text">광고 영역</div>
      <div class="tool-ad-placeholder-size">160 x 600</div>
    </div>
  `;

  // 우측 광고 영역
  const rightAd = document.createElement('aside');
  rightAd.className = 'tool-ad-right';
  rightAd.innerHTML = `
    <div class="tool-ad-label">Advertisement</div>
    <div class="tool-ad-placeholder">
      <div class="tool-ad-placeholder-icon"></div>
      <div class="tool-ad-placeholder-text">광고 영역</div>
      <div class="tool-ad-placeholder-size">160 x 600</div>
    </div>
  `;

  // 메인 콘텐츠 영역
  const main = document.createElement('main');
  main.className = 'tool-content-main';

  // 기존 body 자식 요소들을 main으로 이동 (이벤트 리스너 보존)
  while (document.body.firstChild) {
    main.appendChild(document.body.firstChild);
  }

  // wrapper에 조립
  wrapper.appendChild(leftAd);
  wrapper.appendChild(main);
  wrapper.appendChild(rightAd);

  // body에 추가
  document.body.appendChild(wrapper);

  console.log('[ToolsUtil] 광고 영역 삽입 완료');
}

// DOM 로드 완료 시 광고 영역 삽입
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initToolAdAreas);
} else {
  // 이미 로드된 경우 바로 실행
  initToolAdAreas();
}

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

/**
 * 도구 상세 가이드 로드 및 표시
 * 페이지 로드 시 자동으로 도구 가이드를 가져와서 표시
 */
async function loadToolGuide() {
  // 현재 경로에서 도구 ID 추출
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  // /tools/category/tool-id 형식
  if (pathParts.length < 3 || pathParts[0] !== 'tools') return;

  const toolId = pathParts[pathParts.length - 1];
  if (!toolId || toolId === 'index.html') return;

  try {
    // API에서 도구 정보 가져오기
    const response = await fetch(`/api/tools/${toolId}`);
    if (!response.ok) return;

    const result = await response.json();
    if (!result.success) return;

    // polished_guide 우선 사용, 없으면 detailed_guide
    const guide = result.data?.polishedGuide || result.data?.detailedGuide;
    const faqData = result.data?.faq;

    // tool-help 섹션 뒤에 삽입, 없으면 tool-panel 끝에 삽입
    const toolHelp = document.querySelector('.tool-help');
    const toolPanel = document.querySelector('.tool-panel');
    let insertAfter = toolHelp || toolPanel;

    // 가이드 섹션 생성
    if (guide) {
      const guideSection = document.createElement('div');
      guideSection.className = 'tool-detailed-guide';
      guideSection.innerHTML = `
        <div class="guide-header" onclick="this.parentElement.classList.toggle('expanded')">
          <span class="guide-icon"></span>
          <span class="guide-title">상세 사용 가이드</span>
          <span class="guide-toggle">▼</span>
        </div>
        <div class="guide-content">
          <div class="guide-text">${escapeAndFormat(guide)}</div>
        </div>
      `;

      if (toolHelp) {
        toolHelp.after(guideSection);
        insertAfter = guideSection;
      } else if (toolPanel) {
        toolPanel.appendChild(guideSection);
        insertAfter = guideSection;
      }
      console.log('[ToolsUtil] 도구 가이드 로드 완료:', toolId);
    }

    // FAQ 섹션 생성
    if (faqData) {
      try {
        const faqList = typeof faqData === 'string' ? JSON.parse(faqData) : faqData;
        if (Array.isArray(faqList) && faqList.length > 0) {
          const faqSection = document.createElement('div');
          faqSection.className = 'tool-faq-section';

          const faqItems = faqList.map((item, idx) => `
            <div class="faq-item" data-index="${idx}">
              <div class="faq-question" onclick="this.parentElement.classList.toggle('open')">
                <span class="faq-q-icon">Q</span>
                <span class="faq-q-text">${escapeHtml(item.q)}</span>
                <span class="faq-toggle">+</span>
              </div>
              <div class="faq-answer">
                <span class="faq-a-icon">A</span>
                <span class="faq-a-text">${escapeHtml(item.a)}</span>
              </div>
            </div>
          `).join('');

          faqSection.innerHTML = `
            <div class="faq-header" onclick="this.parentElement.classList.toggle('expanded')">
              <span class="faq-icon"></span>
              <span class="faq-title">자주 묻는 질문 (FAQ)</span>
              <span class="faq-count">${faqList.length}개</span>
              <span class="faq-header-toggle">▼</span>
            </div>
            <div class="faq-content">
              <div class="faq-search">
                <input type="text" class="faq-search-input" placeholder="FAQ 검색..." oninput="filterFAQ(this)">
              </div>
              <div class="faq-list">${faqItems}</div>
            </div>
          `;

          if (insertAfter && insertAfter !== toolPanel) {
            insertAfter.after(faqSection);
          } else if (toolPanel) {
            toolPanel.appendChild(faqSection);
          }
          console.log('[ToolsUtil] FAQ 로드 완료:', faqList.length + '개');
        }
      } catch (e) {
        console.warn('[ToolsUtil] FAQ 파싱 실패:', e.message);
      }
    }
  } catch (error) {
    console.warn('[ToolsUtil] 도구 가이드 로드 실패:', error.message);
  }
}

/**
 * HTML 이스케이프
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * FAQ 검색 필터
 */
function filterFAQ(input) {
  const query = input.value.toLowerCase().trim();
  const faqItems = input.closest('.faq-content').querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-q-text').textContent.toLowerCase();
    const answer = item.querySelector('.faq-a-text').textContent.toLowerCase();
    const matches = !query || question.includes(query) || answer.includes(query);
    item.style.display = matches ? '' : 'none';
  });
}

/**
 * 텍스트 이스케이프 및 포맷팅
 */
function escapeAndFormat(text) {
  // HTML 이스케이프
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // 줄바꿈을 <br>로 변환
  // 섹션 제목 강조 (, , , , 등으로 시작하는 줄)
  return escaped
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      // 이모지로 시작하는 섹션 제목
      if (/^[]/.test(trimmed)) {
        return `<div class="guide-section-title">${trimmed}</div>`;
      }
      // 숫자로 시작하는 단계
      if (/^\d+[\.\)]/.test(trimmed)) {
        return `<div class="guide-step">${trimmed}</div>`;
      }
      // 일반 텍스트
      return trimmed ? `<p>${trimmed}</p>` : '';
    })
    .join('');
}

// DOM 로드 완료 시 가이드 로드
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadToolGuide);
} else {
  loadToolGuide();
}

/**
 * FAQ 팝업 기능
 * 도구 헤더에 FAQ 링크 추가 및 팝업 표시
 */
const ToolFAQ = {
  toolId: null,
  toolName: null,
  faqData: null,

  /**
   * 초기화 - 도구 헤더에 FAQ 링크 추가
   */
  async init() {
    // 현재 경로에서 도구 ID 추출
    // URL 형식: /tools/{category}/{tool-name}/ 또는 /tools/{category}/{tool-name}/index.html
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length < 3 || pathParts[0] !== 'tools') return;

    // category와 tool-name 추출
    const category = pathParts[1];
    let toolName = pathParts[2];

    // index.html이 포함된 경우 처리
    if (toolName === 'index.html' || toolName.endsWith('.html')) {
      return; // 잘못된 경로
    }

    // DB의 도구 ID 형식: {tool-name} (카테고리 없이)
    this.toolId = toolName;
    if (!this.toolId) return;

    // 도구 헤더 찾기
    const toolHeader = document.querySelector('.tool-header');
    if (!toolHeader) return;

    // 도구 제목 가져오기
    const titleEl = toolHeader.querySelector('.tool-title, h1');
    this.toolName = titleEl ? titleEl.textContent.trim() : this.toolId;

    // FAQ 링크 추가
    this.addFAQLink(toolHeader);

    // FAQ 팝업 HTML 추가
    this.createPopupHTML();

    console.log('[ToolFAQ] FAQ 링크 초기화 완료:', this.toolId);
  },

  /**
   * 도구 헤더에 FAQ 링크 추가
   */
  addFAQLink(toolHeader) {
    // 헤더를 flex 컨테이너로 변환
    const headerContent = toolHeader.innerHTML;
    toolHeader.innerHTML = `
      <div class="tool-header-main">
        ${headerContent}
      </div>
      <div class="tool-header-actions">
        <a href="javascript:void(0)" class="tool-faq-link" onclick="ToolFAQ.showPopup()">
          <span class="faq-link-icon"></span>
          <span class="faq-link-text">FAQ</span>
        </a>
        <a href="javascript:void(0)" class="tool-qa-link" onclick="ToolQA.showPopup()">
          <span class="qa-link-icon"></span>
          <span class="qa-link-text">Q&A</span>
        </a>
      </div>
    `;

    // 스타일 추가
    if (!document.querySelector('#tool-faq-header-style')) {
      const style = document.createElement('style');
      style.id = 'tool-faq-header-style';
      style.textContent = `
        .tool-header {
          display: flex !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .tool-header-main {
          flex: 1;
          min-width: 200px;
        }
        .tool-header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .tool-faq-link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white !important;
          border-radius: 8px;
          text-decoration: none !important;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }
        .tool-faq-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .faq-link-icon {
          font-size: 1rem;
        }
        .tool-qa-link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 1rem;
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
          color: white !important;
          border-radius: 8px;
          text-decoration: none !important;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(17, 153, 142, 0.3);
        }
        .tool-qa-link:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(17, 153, 142, 0.4);
        }
        .qa-link-icon {
          font-size: 1rem;
        }
      `;
      document.head.appendChild(style);
    }
  },

  /**
   * FAQ 팝업 HTML 생성
   */
  createPopupHTML() {
    if (document.querySelector('#tool-faq-popup')) return;

    const popup = document.createElement('div');
    popup.id = 'tool-faq-popup';
    popup.className = 'tool-faq-popup-overlay hidden';
    popup.innerHTML = `
      <div class="tool-faq-popup-container">
        <div class="tool-faq-popup-header">
          <div class="tool-faq-popup-title">
            <span class="faq-popup-icon"></span>
            <h2 id="tool-faq-popup-name">${this.escapeHtml(this.toolName)} FAQ</h2>
          </div>
          <div class="tool-faq-popup-actions">
            <input type="text" id="tool-faq-search" class="tool-faq-search-input" placeholder="FAQ 검색..." oninput="ToolFAQ.filterList(this.value)">
            <button class="tool-faq-popup-close" onclick="ToolFAQ.hidePopup()">×</button>
          </div>
        </div>
        <div class="tool-faq-popup-body">
          <div class="tool-faq-popup-list" id="tool-faq-list">
            <div class="tool-faq-loading">FAQ를 불러오는 중...</div>
          </div>
        </div>
        <div class="tool-faq-popup-footer">
          <span>총 <strong id="tool-faq-count">0</strong>개 FAQ</span>
        </div>
      </div>
    `;
    document.body.appendChild(popup);

    // 팝업 스타일 추가
    this.addPopupStyles();

    // 오버레이 클릭 시 닫기
    popup.addEventListener('click', (e) => {
      if (e.target === popup) this.hidePopup();
    });
  },

  /**
   * 팝업 스타일 추가
   */
  addPopupStyles() {
    if (document.querySelector('#tool-faq-popup-style')) return;

    const style = document.createElement('style');
    style.id = 'tool-faq-popup-style';
    style.textContent = `
      .tool-faq-popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
      }
      .tool-faq-popup-overlay.hidden {
        display: none;
      }
      .tool-faq-popup-container {
        background: white;
        border-radius: 16px;
        width: 90%;
        max-width: 700px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: faqPopupSlideIn 0.3s ease;
      }
      @keyframes faqPopupSlideIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .tool-faq-popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.25rem 1.5rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px 16px 0 0;
        gap: 1rem;
        flex-wrap: wrap;
      }
      .tool-faq-popup-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: white;
      }
      .faq-popup-icon {
        font-size: 1.5rem;
      }
      .tool-faq-popup-title h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
      }
      .tool-faq-popup-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .tool-faq-search-input {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 8px;
        font-size: 0.9rem;
        width: 180px;
        background: rgba(255, 255, 255, 0.9);
      }
      .tool-faq-search-input:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
      }
      .tool-faq-popup-close {
        width: 36px;
        height: 36px;
        border: none;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 50%;
        font-size: 1.5rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }
      .tool-faq-popup-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      .tool-faq-popup-body {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
      }
      .tool-faq-popup-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .tool-faq-loading, .tool-faq-empty {
        text-align: center;
        padding: 2rem;
        color: #666;
      }
      .tool-faq-board-item {
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        overflow: hidden;
        transition: all 0.2s;
      }
      .tool-faq-board-item:hover {
        border-color: #667eea;
      }
      .tool-faq-board-item.open {
        border-color: #667eea;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
      }
      .tool-faq-board-question {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        cursor: pointer;
        background: #fafafa;
        transition: background 0.2s;
      }
      .tool-faq-board-question:hover {
        background: #f3f4f6;
      }
      .tool-faq-q-badge {
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.85rem;
        flex-shrink: 0;
      }
      .tool-faq-q-text {
        flex: 1;
        font-size: 0.95rem;
        color: #1f2937;
        line-height: 1.4;
      }
      .tool-faq-toggle-icon {
        color: #9ca3af;
        font-size: 0.8rem;
        transition: transform 0.2s;
      }
      .tool-faq-board-item.open .tool-faq-toggle-icon {
        transform: rotate(180deg);
      }
      .tool-faq-board-answer {
        display: none;
        padding: 1rem;
        padding-top: 0;
        gap: 0.75rem;
        background: white;
      }
      .tool-faq-board-item.open .tool-faq-board-answer {
        display: flex;
      }
      .tool-faq-a-badge {
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.85rem;
        flex-shrink: 0;
        margin-top: 0.25rem;
      }
      .tool-faq-a-text {
        flex: 1;
        font-size: 0.9rem;
        color: #4b5563;
        line-height: 1.6;
      }
      .tool-faq-popup-footer {
        padding: 1rem 1.5rem;
        border-top: 1px solid #e5e7eb;
        text-align: center;
        font-size: 0.9rem;
        color: #666;
      }
      .tool-faq-popup-footer strong {
        color: #667eea;
      }

      /* 다크 모드 지원 */
      @media (prefers-color-scheme: dark) {
        .tool-faq-popup-container {
          background: #1f2937;
        }
        .tool-faq-board-question {
          background: #374151;
        }
        .tool-faq-board-question:hover {
          background: #4b5563;
        }
        .tool-faq-q-text {
          color: #f3f4f6;
        }
        .tool-faq-board-answer {
          background: #1f2937;
        }
        .tool-faq-a-text {
          color: #d1d5db;
        }
        .tool-faq-popup-footer {
          border-color: #374151;
          color: #9ca3af;
        }
        .tool-faq-board-item {
          border-color: #374151;
        }
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * 팝업 표시
   */
  async showPopup() {
    const popup = document.querySelector('#tool-faq-popup');
    if (!popup) return;

    popup.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // FAQ 데이터 로드
    if (!this.faqData) {
      await this.loadFAQData();
    }

    this.renderList(this.faqData);
  },

  /**
   * 팝업 숨기기
   */
  hidePopup() {
    const popup = document.querySelector('#tool-faq-popup');
    if (popup) {
      popup.classList.add('hidden');
      document.body.style.overflow = '';
    }
  },

  /**
   * FAQ 데이터 로드
   */
  async loadFAQData() {
    try {
      const response = await fetch(`/api/tools/${this.toolId}`);
      if (!response.ok) throw new Error('API 오류');

      const result = await response.json();
      if (!result.success) throw new Error('데이터 없음');

      const faqRaw = result.data?.faq;
      if (faqRaw) {
        this.faqData = typeof faqRaw === 'string' ? JSON.parse(faqRaw) : faqRaw;
      } else {
        this.faqData = [];
      }
    } catch (error) {
      console.warn('[ToolFAQ] FAQ 로드 실패:', error.message);
      this.faqData = [];
    }
  },

  /**
   * FAQ 목록 렌더링
   */
  renderList(faqList) {
    const listEl = document.querySelector('#tool-faq-list');
    const countEl = document.querySelector('#tool-faq-count');
    if (!listEl) return;

    if (!faqList || faqList.length === 0) {
      listEl.innerHTML = '<div class="tool-faq-empty">등록된 FAQ가 없습니다.</div>';
      if (countEl) countEl.textContent = '0';
      return;
    }

    const html = faqList.map((item, idx) => `
      <div class="tool-faq-board-item" data-index="${idx}">
        <div class="tool-faq-board-question" onclick="ToolFAQ.toggleItem(this)">
          <span class="tool-faq-q-badge">Q</span>
          <span class="tool-faq-q-text">${this.escapeHtml(item.q)}</span>
          <span class="tool-faq-toggle-icon">▼</span>
        </div>
        <div class="tool-faq-board-answer">
          <span class="tool-faq-a-badge">A</span>
          <span class="tool-faq-a-text">${this.escapeHtml(item.a)}</span>
        </div>
      </div>
    `).join('');

    listEl.innerHTML = html;
    if (countEl) countEl.textContent = faqList.length;
  },

  /**
   * FAQ 항목 토글
   */
  toggleItem(questionEl) {
    const item = questionEl.closest('.tool-faq-board-item');
    if (item) {
      item.classList.toggle('open');
    }
  },

  /**
   * FAQ 검색 필터
   */
  filterList(query) {
    const items = document.querySelectorAll('.tool-faq-board-item');
    const lowerQuery = query.toLowerCase().trim();
    let visibleCount = 0;

    items.forEach(item => {
      const question = item.querySelector('.tool-faq-q-text')?.textContent.toLowerCase() || '';
      const answer = item.querySelector('.tool-faq-a-text')?.textContent.toLowerCase() || '';
      const matches = !lowerQuery || question.includes(lowerQuery) || answer.includes(lowerQuery);
      item.style.display = matches ? '' : 'none';
      if (matches) visibleCount++;
    });

    const countEl = document.querySelector('#tool-faq-count');
    if (countEl) countEl.textContent = visibleCount;
  },

  /**
   * HTML 이스케이프
   */
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};

// DOM 로드 완료 시 FAQ 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ToolFAQ.init());
} else {
  ToolFAQ.init();
}

// 전역 등록
window.ToolFAQ = ToolFAQ;

/**
 * ToolQA - 도구별 Q&A 기능
 * 사용자 질문 등록 및 Q&A 목록 조회
 */
const ToolQA = {
  toolId: null,
  toolName: null,
  qaData: null,

  /**
   * 팝업 표시
   */
  async showPopup() {
    // ToolFAQ에서 toolId 가져오기
    this.toolId = ToolFAQ.toolId;
    this.toolName = ToolFAQ.toolName;

    if (!this.toolId) {
      console.warn('[ToolQA] toolId가 없습니다.');
      return;
    }

    // 팝업 생성
    this.createPopupHTML();

    // 팝업 표시
    const popup = document.querySelector('#tool-qa-popup');
    if (popup) {
      popup.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    // Q&A 데이터 로드
    await this.loadQA();
  },

  /**
   * 팝업 숨기기
   */
  hidePopup() {
    const popup = document.querySelector('#tool-qa-popup');
    if (popup) {
      popup.classList.add('hidden');
      document.body.style.overflow = '';
    }
    // 질문 폼도 숨기기
    const formSection = document.querySelector('#tool-qa-form-section');
    if (formSection) {
      formSection.classList.add('hidden');
    }
  },

  /**
   * 질문 작성 폼 토글
   */
  toggleQuestionForm() {
    const formSection = document.querySelector('#tool-qa-form-section');
    const askBtn = document.querySelector('#tool-qa-ask-btn');

    if (!formSection) return;

    const isHidden = formSection.classList.contains('hidden');

    if (isHidden) {
      // 폼 표시
      formSection.classList.remove('hidden');
      if (askBtn) askBtn.innerHTML = '<span></span> 목록 보기';
      // 텍스트영역에 포커스
      const textarea = document.querySelector('#tool-qa-question');
      if (textarea) {
        textarea.focus();
        // 폼으로 스크롤
        formSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else {
      // 폼 숨기기
      formSection.classList.add('hidden');
      if (askBtn) askBtn.innerHTML = '<span></span> 질문하기';
    }
  },

  /**
   * Q&A 팝업 HTML 생성
   */
  createPopupHTML() {
    if (document.querySelector('#tool-qa-popup')) {
      // 이미 존재하면 제목만 업데이트
      const titleEl = document.querySelector('#tool-qa-popup-name');
      if (titleEl) titleEl.textContent = `${this.escapeHtml(this.toolName)} Q&A`;
      return;
    }

    const popup = document.createElement('div');
    popup.id = 'tool-qa-popup';
    popup.className = 'tool-qa-popup-overlay hidden';
    popup.innerHTML = `
      <div class="tool-qa-popup-container">
        <div class="tool-qa-popup-header">
          <div class="tool-qa-popup-title">
            <span class="qa-popup-icon"></span>
            <h2 id="tool-qa-popup-name">${this.escapeHtml(this.toolName)} Q&A</h2>
          </div>
          <div class="tool-qa-popup-actions">
            <button class="tool-qa-ask-btn" id="tool-qa-ask-btn" onclick="ToolQA.toggleQuestionForm()">
              <span></span> 질문하기
            </button>
            <button class="tool-qa-popup-close" onclick="ToolQA.hidePopup()">×</button>
          </div>
        </div>
        <div class="tool-qa-popup-body">
          <!-- Q&A 리스트 먼저 표시 -->
          <div class="tool-qa-list-section">
            <div class="tool-qa-list" id="tool-qa-list">
              <div class="tool-qa-loading">Q&A를 불러오는 중...</div>
            </div>
          </div>
          <!-- 질문 작성 폼 (기본 숨김) -->
          <div class="tool-qa-form hidden" id="tool-qa-form-section">
            <div class="tool-qa-form-header">
              <h3>새 질문 작성</h3>
              <button class="tool-qa-form-close" onclick="ToolQA.toggleQuestionForm()">×</button>
            </div>
            <textarea id="tool-qa-question" class="tool-qa-textarea" placeholder="이 도구에 대해 궁금한 점을 질문해주세요..." maxlength="1000"></textarea>
            <div class="tool-qa-email-row">
              <input type="email" id="tool-qa-email" class="tool-qa-email-input" placeholder="답변 받을 이메일 (필수)" required>
              <span class="tool-qa-email-hint">답변이 등록되면 이메일로 알려드립니다 (필수)</span>
            </div>
            <div class="tool-qa-form-actions">
              <span class="tool-qa-char-count"><span id="tool-qa-char-current">0</span>/1000</span>
              <button class="tool-qa-submit-btn" onclick="ToolQA.submitQuestion()">질문 등록</button>
            </div>
          </div>
        </div>
        <div class="tool-qa-popup-footer">
          <span>총 <strong id="tool-qa-count">0</strong>개 Q&A</span>
        </div>
      </div>
    `;
    document.body.appendChild(popup);

    // 스타일 추가
    this.addPopupStyles();

    // 오버레이 클릭 시 닫기
    popup.addEventListener('click', (e) => {
      if (e.target === popup) this.hidePopup();
    });

    // 글자수 카운트
    const textarea = document.querySelector('#tool-qa-question');
    textarea?.addEventListener('input', () => {
      const count = textarea.value.length;
      const countEl = document.querySelector('#tool-qa-char-current');
      if (countEl) countEl.textContent = count;
    });
  },

  /**
   * 팝업 스타일 추가
   */
  addPopupStyles() {
    if (document.querySelector('#tool-qa-popup-style')) return;

    const style = document.createElement('style');
    style.id = 'tool-qa-popup-style';
    style.textContent = `
      .tool-qa-popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
        backdrop-filter: blur(4px);
      }
      .tool-qa-popup-overlay.hidden {
        display: none;
      }
      .tool-qa-popup-container {
        background: white;
        border-radius: 16px;
        width: 90%;
        max-width: 600px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: qaPopupSlideIn 0.3s ease;
      }
      @keyframes qaPopupSlideIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .tool-qa-popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.25rem 1.5rem;
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        border-radius: 16px 16px 0 0;
      }
      .tool-qa-popup-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .tool-qa-popup-title h2 {
        color: white;
        font-size: 1.25rem;
        margin: 0;
        font-weight: 600;
      }
      .qa-popup-icon {
        font-size: 1.5rem;
      }
      .tool-qa-popup-close {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        font-size: 1.5rem;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .tool-qa-popup-close:hover {
        background: rgba(255,255,255,0.3);
        transform: rotate(90deg);
      }
      .tool-qa-popup-body {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
      }
      .tool-qa-form h3 {
        margin: 0 0 1rem 0;
        font-size: 1rem;
        color: #333;
      }
      .tool-qa-textarea {
        width: 100%;
        min-height: 100px;
        padding: 1rem;
        border: 2px solid #e0e0e0;
        border-radius: 12px;
        font-size: 0.95rem;
        resize: vertical;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .tool-qa-textarea:focus {
        outline: none;
        border-color: #11998e;
      }
      .tool-qa-email-row {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 0.75rem;
      }
      .tool-qa-email-input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        font-size: 0.95rem;
        transition: border-color 0.2s;
        box-sizing: border-box;
      }
      .tool-qa-email-input:focus {
        outline: none;
        border-color: #11998e;
      }
      .tool-qa-email-hint {
        font-size: 0.8rem;
        color: #888;
      }
      .tool-qa-form-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.75rem;
      }
      .tool-qa-char-count {
        font-size: 0.85rem;
        color: #888;
      }
      .tool-qa-submit-btn {
        padding: 0.75rem 1.5rem;
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      .tool-qa-submit-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(17, 153, 142, 0.4);
      }
      .tool-qa-submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
      .tool-qa-divider {
        height: 1px;
        background: #eee;
        margin: 1.5rem 0;
      }
      .tool-qa-list-section h3 {
        margin: 0 0 1rem 0;
        font-size: 1rem;
        color: #333;
      }
      .tool-qa-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .tool-qa-loading {
        text-align: center;
        padding: 2rem;
        color: #888;
      }
      .tool-qa-empty {
        text-align: center;
        padding: 2rem;
        color: #888;
        background: #f9f9f9;
        border-radius: 12px;
      }
      .tool-qa-item {
        background: #f9f9f9;
        border-radius: 12px;
        padding: 1rem;
        border-left: 4px solid #11998e;
      }
      .tool-qa-item-question {
        font-weight: 500;
        color: #333;
        margin-bottom: 0.75rem;
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
      }
      .tool-qa-item-question .qa-badge {
        background: #11998e;
        color: white;
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        flex-shrink: 0;
      }
      .tool-qa-item-answer {
        color: #555;
        padding-left: 0.5rem;
        border-left: 2px solid #ddd;
        margin-left: 0.25rem;
      }
      .tool-qa-item-answer .qa-badge {
        background: #667eea;
        color: white;
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        margin-right: 0.5rem;
      }
      .tool-qa-item-pending {
        color: #888;
        font-style: italic;
        font-size: 0.9rem;
      }
      .tool-qa-item-meta {
        margin-top: 0.5rem;
        font-size: 0.8rem;
        color: #999;
      }
      .tool-qa-popup-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .tool-qa-popup-footer {
        padding: 1rem 1.5rem;
        background: #f5f5f5;
        border-radius: 0 0 16px 16px;
        border-top: 1px solid #eee;
        font-size: 0.9rem;
        color: #666;
        text-align: center;
      }
      .tool-qa-popup-footer strong {
        color: #11998e;
      }
      .tool-qa-ask-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1.25rem;
        background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .tool-qa-ask-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(17, 153, 142, 0.3);
      }
      .tool-qa-form.hidden {
        display: none;
      }
      .tool-qa-form-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
      }
      .tool-qa-form-header h3 {
        margin: 0;
        color: #333;
        font-size: 1rem;
      }
      .tool-qa-form-close {
        width: 28px;
        height: 28px;
        border: none;
        background: #f0f0f0;
        color: #666;
        border-radius: 50%;
        font-size: 1.25rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      .tool-qa-form-close:hover {
        background: #e0e0e0;
        color: #333;
      }
      .tool-qa-list-section {
        flex: 1;
        overflow-y: auto;
      }

      /* 다크모드 지원 */
      @media (prefers-color-scheme: dark) {
        .tool-qa-popup-container {
          background: #1e1e1e;
        }
        .tool-qa-form h3,
        .tool-qa-list-section h3 {
          color: #e0e0e0;
        }
        .tool-qa-textarea {
          background: #2d2d2d;
          border-color: #444;
          color: #e0e0e0;
        }
        .tool-qa-textarea:focus {
          border-color: #38ef7d;
        }
        .tool-qa-email-input {
          background: #2d2d2d;
          border-color: #444;
          color: #e0e0e0;
        }
        .tool-qa-email-input:focus {
          border-color: #38ef7d;
        }
        .tool-qa-email-hint {
          color: #888;
        }
        .tool-qa-divider {
          background: #444;
        }
        .tool-qa-item {
          background: #2d2d2d;
        }
        .tool-qa-item-question {
          color: #e0e0e0;
        }
        .tool-qa-item-answer {
          color: #ccc;
          border-left-color: #555;
        }
        .tool-qa-popup-footer {
          background: #252525;
          border-top-color: #333;
          color: #aaa;
        }
        .tool-qa-popup-footer strong {
          color: #38ef7d;
        }
        .tool-qa-form-header h3 {
          color: #e0e0e0;
        }
        .tool-qa-form-close {
          background: #3d3d3d;
          color: #aaa;
        }
        .tool-qa-form-close:hover {
          background: #4d4d4d;
          color: #e0e0e0;
        }
      }
    `;
    document.head.appendChild(style);
  },

  /**
   * Q&A 데이터 로드
   */
  async loadQA() {
    const listEl = document.querySelector('#tool-qa-list');
    const countEl = document.querySelector('#tool-qa-count');

    try {
      const response = await fetch(`/api/tools/${this.toolId}/qa`);
      const result = await response.json();

      if (result.success && result.data) {
        this.qaData = result.data;

        if (countEl) countEl.textContent = this.qaData.length;

        if (this.qaData.length === 0) {
          listEl.innerHTML = `
            <div class="tool-qa-empty">
              아직 등록된 Q&A가 없습니다.<br>
              첫 번째 질문을 남겨주세요!
            </div>
          `;
        } else {
          this.renderList();
        }
      } else {
        throw new Error(result.error || 'Q&A 로드 실패');
      }
    } catch (error) {
      console.warn('[ToolQA] Q&A 로드 실패:', error.message);
      listEl.innerHTML = `
        <div class="tool-qa-empty">
          Q&A를 불러올 수 없습니다.<br>
          첫 번째 질문을 남겨주세요!
        </div>
      `;
      if (countEl) countEl.textContent = '0';
    }
  },

  /**
   * Q&A 목록 렌더링
   */
  renderList() {
    const listEl = document.querySelector('#tool-qa-list');
    if (!listEl || !this.qaData) return;

    listEl.innerHTML = this.qaData.map(qa => `
      <div class="tool-qa-item">
        <div class="tool-qa-item-question">
          <span class="qa-badge">Q</span>
          <span>${this.escapeHtml(qa.question)}</span>
        </div>
        ${qa.answer ? `
          <div class="tool-qa-item-answer">
            <span class="qa-badge">A</span>
            ${this.escapeHtml(qa.answer)}
          </div>
        ` : `
          <div class="tool-qa-item-pending">답변 대기 중...</div>
        `}
      </div>
    `).join('');
  },

  /**
   * 질문 등록
   */
  async submitQuestion() {
    const textarea = document.querySelector('#tool-qa-question');
    const emailInput = document.querySelector('#tool-qa-email');
    const submitBtn = document.querySelector('.tool-qa-submit-btn');
    const question = textarea?.value?.trim();
    const email = emailInput?.value?.trim();

    if (!question || question.length < 5) {
      alert('질문은 최소 5자 이상 입력해주세요.');
      return;
    }

    // 이메일 필수 검증
    if (!email) {
      alert('이메일은 필수 입력 항목입니다.');
      emailInput?.focus();
      return;
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('올바른 이메일 형식을 입력해주세요.');
      emailInput?.focus();
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = '등록 중...';

      // CSRF 토큰 가져오기
      let csrfToken = '';
      try {
        const csrfResponse = await fetch('/api/csrf-token');
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrfToken || '';
      } catch (e) {
        console.warn('[ToolQA] CSRF 토큰 가져오기 실패:', e);
      }

      const response = await fetch(`/api/tools/${this.toolId}/qa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ question, email: email || null })
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message || '질문이 등록되었습니다.');
        textarea.value = '';
        emailInput.value = '';
        document.querySelector('#tool-qa-char-current').textContent = '0';

        // 질문 폼 숨기고 버튼 텍스트 복원
        const formSection = document.querySelector('#tool-qa-form-section');
        const askBtn = document.querySelector('#tool-qa-ask-btn');
        if (formSection) formSection.classList.add('hidden');
        if (askBtn) askBtn.innerHTML = '<span></span> 질문하기';

        // Q&A 목록 새로고침
        await this.loadQA();
      } else {
        alert(result.error || '질문 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('[ToolQA] 질문 등록 실패:', error);
      alert('질문 등록 중 오류가 발생했습니다.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '질문 등록';
    }
  },

  /**
   * 날짜 포맷
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}일 전`;

    return date.toLocaleDateString('ko-KR');
  },

  /**
   * HTML 이스케이프
   */
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};

// 전역 등록
window.ToolQA = ToolQA;

console.log('[ToolsUtil] 도구 공통 유틸리티 로드 완료');
