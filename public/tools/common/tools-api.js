/**
 * 도구 API 클라이언트
 * All-in-One 도구 허브 API 호출 유틸리티
 * @created 2026-01-11
 */

const ToolsAPI = {
  baseUrl: '/api/tools',

  /**
   * API 요청 래퍼
   * @param {string} endpoint - 엔드포인트
   * @param {Object} options - fetch 옵션
   * @returns {Promise<Object>} 응답 데이터
   */
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('[ToolsAPI] Request failed:', error);
      throw error;
    }
  },

  /**
   * 도구 목록 로드
   * @returns {Promise<Object>} 도구 목록
   */
  async loadTools() {
    const data = await this.request('');
    return data.data;
  },

  /**
   * 카테고리 목록 로드
   * @returns {Promise<Array>} 카테고리 목록
   */
  async loadCategories() {
    const data = await this.request('/categories');
    return data.data;
  },

  /**
   * 도구 검색
   * @param {string} query - 검색어
   * @returns {Promise<Array>} 검색 결과
   */
  async search(query) {
    const data = await this.request(`/search?q=${encodeURIComponent(query)}`);
    return data.data || [];
  },

  /**
   * 특정 도구 정보
   * @param {string} toolId - 도구 ID
   * @returns {Promise<Object>} 도구 정보
   */
  async getTool(toolId) {
    const data = await this.request(`/${toolId}`);
    return data.data;
  },

  // ==========================================
  // 이미지 도구 API
  // ==========================================

  /**
   * 이미지 압축
   * @param {File} file - 이미지 파일
   * @param {Object} options - 옵션
   * @returns {Promise<Object>} 압축 결과
   */
  async compressImage(file, options = {}) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('quality', options.quality || 80);
    formData.append('maxWidth', options.maxWidth || 1920);

    return await this.request('/image/compress', {
      method: 'POST',
      body: formData
    });
  },

  /**
   * 이미지 리사이즈
   * @param {File} file - 이미지 파일
   * @param {Object} options - 옵션
   * @returns {Promise<Object>} 리사이즈 결과
   */
  async resizeImage(file, options = {}) {
    const formData = new FormData();
    formData.append('image', file);
    if (options.width) formData.append('width', options.width);
    if (options.height) formData.append('height', options.height);
    formData.append('fit', options.fit || 'cover');

    return await this.request('/image/resize', {
      method: 'POST',
      body: formData
    });
  },

  /**
   * 이미지 포맷 변환
   * @param {File} file - 이미지 파일
   * @param {string} targetFormat - 대상 포맷 (jpeg, png, webp)
   * @param {number} quality - 품질 (0-100)
   * @returns {Promise<Object>} 변환 결과
   */
  async convertImage(file, targetFormat, quality = 80) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('targetFormat', targetFormat);
    formData.append('quality', quality);

    return await this.request('/image/convert', {
      method: 'POST',
      body: formData
    });
  },

  // ==========================================
  // PDF 도구 API
  // ==========================================

  /**
   * PDF 병합
   * @param {File[]} files - PDF 파일 배열
   * @returns {Promise<Blob>} 병합된 PDF
   */
  async mergePdfs(files) {
    const formData = new FormData();
    files.forEach(file => formData.append('pdfs', file));

    const response = await fetch(`${this.baseUrl}/pdf/merge`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'PDF 병합 실패');
    }

    return await response.blob();
  },

  /**
   * PDF 분할
   * @param {File} file - PDF 파일
   * @param {string} ranges - 페이지 범위 (예: "1-3,5,7-10")
   * @returns {Promise<Object>} 분할 결과
   */
  async splitPdf(file, ranges) {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('ranges', ranges);

    return await this.request('/pdf/split', {
      method: 'POST',
      body: formData
    });
  },

  // ==========================================
  // QR 코드 API
  // ==========================================

  /**
   * QR 코드 생성
   * @param {string} data - QR 데이터
   * @param {Object} options - 옵션
   * @returns {Promise<Object>} QR 코드 이미지
   */
  async generateQR(data, options = {}) {
    return await this.request('/qr/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data,
        size: options.size || 256,
        format: options.format || 'png',
        color: options.color || '#000000',
        background: options.background || '#ffffff'
      })
    });
  },

  // ==========================================
  // AI 도구 API (프리미엄)
  // ==========================================

  /**
   * AI 배경 제거
   * @param {File} file - 이미지 파일
   * @returns {Promise<Object>} 처리 결과
   */
  async removeBackground(file) {
    const formData = new FormData();
    formData.append('image', file);

    return await this.request('/ai/bg-remove', {
      method: 'POST',
      body: formData
    });
  },

  /**
   * Text-to-Speech
   * @param {string} text - 변환할 텍스트
   * @param {Object} options - 옵션
   * @returns {Promise<Object>} 오디오 데이터
   */
  async textToSpeech(text, options = {}) {
    return await this.request('/ai/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        voice: options.voice || 'ko-KR-Standard-A',
        speed: options.speed || 1.0,
        pitch: options.pitch || 0
      })
    });
  }
};

// 전역 등록
window.ToolsAPI = ToolsAPI;

console.log('[ToolsAPI] 도구 API 클라이언트 로드 완료');
