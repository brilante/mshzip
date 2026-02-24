/**
 * ToolBase - 모든 도구의 공통 기반 클래스
 * @description 초기화, 이벤트, 유틸리티 메서드 통합
 * @created 2026-01-24
 */
class ToolBase {
  constructor(toolName = 'Tool') {
    this.toolName = toolName;
    this.elements = {};
    this.state = {};
    this._eventCleanups = [];
  }

  // ═══════════════════════════════════════════════════
  // 1. DOM 요소 초기화
  // ═══════════════════════════════════════════════════

  /**
   * DOM 요소 자동 바인딩
   * @param {Object} elementMap - { propertyName: 'elementId' }
   * @example
   *   this.initElements({
   *     height: 'height',
   *     weight: 'weight',
   *     resultSection: 'resultSection'
   *   });
   */
  initElements(elementMap) {
    Object.entries(elementMap).forEach(([key, id]) => {
      const element = document.getElementById(id);
      if (element) {
        this.elements[key] = element;
      } else {
        console.warn(`[${this.toolName}] 요소를 찾을 수 없음: #${id}`);
      }
    });
    return this;
  }

  /**
   * 쿼리 셀렉터로 요소 바인딩
   * @param {Object} selectorMap - { propertyName: 'selector' }
   */
  initElementsBySelector(selectorMap) {
    Object.entries(selectorMap).forEach(([key, selector]) => {
      const element = document.querySelector(selector);
      if (element) {
        this.elements[key] = element;
      } else {
        console.warn(`[${this.toolName}] 요소를 찾을 수 없음: ${selector}`);
      }
    });
    return this;
  }

  // ═══════════════════════════════════════════════════
  // 2. 이벤트 리스너 관리
  // ═══════════════════════════════════════════════════

  /**
   * 이벤트 리스너 등록 (자동 정리 지원)
   * @param {HTMLElement|string} target - 요소 또는 요소 키
   * @param {string} event - 이벤트 타입
   * @param {Function} handler - 핸들러 함수
   * @param {Object} options - addEventListener 옵션
   */
  on(target, event, handler, options = {}) {
    const element = typeof target === 'string' ? this.elements[target] : target;
    if (!element) {
      console.warn(`[${this.toolName}] 이벤트 대상을 찾을 수 없음:`, target);
      return this;
    }

    const boundHandler = handler.bind(this);
    element.addEventListener(event, boundHandler, options);

    // 정리 함수 저장
    this._eventCleanups.push(() => {
      element.removeEventListener(event, boundHandler, options);
    });

    return this;
  }

  /**
   * Enter 키 이벤트 바인딩
   * @param {string|string[]} elementKeys - 요소 키 또는 키 배열
   * @param {Function} callback - 실행할 함수
   */
  onEnter(elementKeys, callback) {
    const keys = Array.isArray(elementKeys) ? elementKeys : [elementKeys];
    keys.forEach(key => {
      this.on(key, 'keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          callback.call(this, e);
        }
      });
    });
    return this;
  }

  /**
   * 클릭 이벤트 바인딩
   * @param {string} elementKey - 요소 키
   * @param {Function} callback - 실행할 함수
   */
  onClick(elementKey, callback) {
    return this.on(elementKey, 'click', callback);
  }

  /**
   * 모든 이벤트 리스너 정리
   */
  cleanup() {
    this._eventCleanups.forEach(cleanup => cleanup());
    this._eventCleanups = [];
  }

  // ═══════════════════════════════════════════════════
  // 3. 드롭존 설정
  // ═══════════════════════════════════════════════════

  /**
   * 파일 드롭존 자동 설정
   * @param {Object} config - 설정 객체
   * @param {string} config.dropzoneKey - 드롭존 요소 키
   * @param {string} config.fileInputKey - 파일 입력 요소 키
   * @param {Function} config.onFile - 파일 처리 콜백 (files: File[])
   * @param {string} config.accept - 허용 파일 타입 (예: 'image/*')
   * @param {boolean} config.multiple - 다중 선택 허용
   */
  setupDropZone(config) {
    const {
      dropzoneKey,
      fileInputKey,
      onFile,
      accept = '*',
      multiple = false
    } = config;

    const dropzone = this.elements[dropzoneKey];
    const fileInput = this.elements[fileInputKey];

    if (!dropzone || !fileInput) {
      console.warn(`[${this.toolName}] 드롭존 요소를 찾을 수 없음`);
      return this;
    }

    // ToolsUtil 사용 (이미 구현되어 있음)
    if (window.ToolsUtil?.setupDropZone) {
      ToolsUtil.setupDropZone(dropzone, (files) => {
        onFile.call(this, files);
      }, { accept, multiple });
    } else {
      // 폴백: 직접 구현
      this._setupDropZoneFallback(dropzone, fileInput, onFile, accept, multiple);
    }

    return this;
  }

  /**
   * 드롭존 폴백 구현
   * @private
   */
  _setupDropZoneFallback(dropzone, fileInput, onFile, accept, multiple) {
    // 드래그 이벤트
    ['dragenter', 'dragover'].forEach(event => {
      this.on(dropzone, event, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(event => {
      this.on(dropzone, event, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    // 드롭 처리
    this.on(dropzone, 'drop', (e) => {
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onFile.call(this, multiple ? files : [files[0]]);
      }
    });

    // 클릭으로 파일 선택
    this.on(dropzone, 'click', () => fileInput.click());

    this.on(fileInput, 'change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        onFile.call(this, multiple ? files : [files[0]]);
      }
    });
  }

  // ═══════════════════════════════════════════════════
  // 4. 유틸리티 메서드 (ToolsUtil 래퍼)
  // ═══════════════════════════════════════════════════

  /**
   * 토스트 메시지 표시
   */
  showToast(message, type = 'success') {
    if (window.ToolsUtil?.showToast) {
      ToolsUtil.showToast(message, type);
    } else if (window.showToast) {
      window.showToast(message, type);
    } else {
      console.log(`[${this.toolName}] ${type}: ${message}`);
    }
  }

  /**
   * 성공 메시지
   */
  showSuccess(message) {
    this.showToast(message, 'success');
  }

  /**
   * 에러 메시지
   */
  showError(message) {
    this.showToast(message, 'error');
  }

  /**
   * 경고 메시지
   */
  showWarning(message) {
    this.showToast(message, 'warning');
  }

  /**
   * 파일 크기 포맷팅
   */
  formatFileSize(bytes) {
    if (window.ToolsUtil?.formatFileSize) {
      return ToolsUtil.formatFileSize(bytes);
    }
    // 폴백
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 클립보드 복사
   */
  async copyToClipboard(text) {
    if (window.ToolsUtil?.copyToClipboard) {
      return await ToolsUtil.copyToClipboard(text);
    }
    // 폴백
    try {
      await navigator.clipboard.writeText(text);
      this.showSuccess('클립보드에 복사되었습니다.');
      return true;
    } catch (err) {
      this.showError('복사에 실패했습니다.');
      return false;
    }
  }

  /**
   * 파일 다운로드
   */
  downloadFile(data, filename, mimeType = 'application/octet-stream') {
    if (window.ToolsUtil?.downloadFile) {
      return ToolsUtil.downloadFile(data, filename, mimeType);
    }
    // 폴백
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 파일 읽기 (Promise)
   */
  readFile(file, readAs = 'text') {
    if (window.ToolsUtil?.readFile) {
      return ToolsUtil.readFile(file, readAs);
    }
    // 폴백
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);

      switch (readAs) {
        case 'dataURL': reader.readAsDataURL(file); break;
        case 'arrayBuffer': reader.readAsArrayBuffer(file); break;
        default: reader.readAsText(file);
      }
    });
  }

  /**
   * HTML 이스케이프
   */
  escapeHtml(str) {
    if (window.ToolsUtil?.escapeHtml) {
      return ToolsUtil.escapeHtml(str);
    }
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 디바운스
   */
  debounce(func, wait = 300) {
    if (window.ToolsUtil?.debounce) {
      return ToolsUtil.debounce(func, wait);
    }
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // ═══════════════════════════════════════════════════
  // 5. 상태 관리
  // ═══════════════════════════════════════════════════

  /**
   * 상태 설정
   */
  setState(key, value) {
    this.state[key] = value;
    return this;
  }

  /**
   * 상태 조회
   */
  getState(key) {
    return this.state[key];
  }

  // ═══════════════════════════════════════════════════
  // 6. 로딩 표시
  // ═══════════════════════════════════════════════════

  /**
   * 로딩 표시
   */
  showLoading(elementKey = null) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.add('active');
    }
  }

  /**
   * 로딩 숨김
   */
  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  /**
   * 로딩 래퍼 (비동기 함수 실행)
   */
  async withLoading(asyncFn) {
    try {
      this.showLoading();
      return await asyncFn();
    } finally {
      this.hideLoading();
    }
  }

  // ═══════════════════════════════════════════════════
  // 7. 유효성 검증
  // ═══════════════════════════════════════════════════

  /**
   * 필수 값 검증
   * @param {Object} values - { fieldName: value }
   * @param {string} errorMessage - 에러 메시지
   * @returns {boolean}
   */
  validateRequired(values, errorMessage = '필수 값을 입력해주세요.') {
    for (const [field, value] of Object.entries(values)) {
      if (value === null || value === undefined || value === '') {
        this.showError(errorMessage);
        return false;
      }
    }
    return true;
  }

  /**
   * 숫자 범위 검증
   */
  validateRange(value, min, max, errorMessage) {
    const num = parseFloat(value);
    if (isNaN(num) || num < min || num > max) {
      this.showError(errorMessage || `${min}~${max} 범위로 입력해주세요.`);
      return false;
    }
    return true;
  }

  /**
   * 파일 타입 검증
   */
  validateFileType(file, allowedTypes, errorMessage) {
    const isValid = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type || file.name.toLowerCase().endsWith(type);
    });

    if (!isValid) {
      this.showError(errorMessage || '지원하지 않는 파일 형식입니다.');
      return false;
    }
    return true;
  }

  /**
   * 파일 크기 검증
   */
  validateFileSize(file, maxSizeBytes, errorMessage) {
    if (file.size > maxSizeBytes) {
      this.showError(errorMessage || `파일 크기가 ${this.formatFileSize(maxSizeBytes)}를 초과합니다.`);
      return false;
    }
    return true;
  }
}

// 전역 등록
window.ToolBase = ToolBase;

console.log('[ToolBase] 공통 기반 클래스 로드 완료');
