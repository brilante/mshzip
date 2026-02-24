/**
 * PDF 압축기 - ToolBase 기반
 * PDF 파일 크기 줄이기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PdfCompress = class PdfCompress extends ToolBase {
  constructor() {
    super('PdfCompress');
    this.selectedFile = null;
    this.compressionLevel = 'medium';
  }

  init() {
    this.initElements({
      dropZone: 'dropZone',
      fileInput: 'fileInput',
      fileInfo: 'fileInfo',
      convertBtn: 'convertBtn',
      progressSection: 'progressSection',
      progressFill: 'progressFill',
      progressText: 'progressText',
      resultPreview: 'resultPreview'
    });

    this.setupEventListeners();
    console.log('[PdfCompress] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { dropZone } = this.elements;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
      this.on(dropZone, event, (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    });

    ['dragenter', 'dragover'].forEach(event => {
      this.on(dropZone, event, () => dropZone.classList.add('dragover'));
    });

    ['dragleave', 'drop'].forEach(event => {
      this.on(dropZone, event, () => dropZone.classList.remove('dragover'));
    });

    this.on(dropZone, 'drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) this.handleFile(files[0]);
    });
  }

  selectLevel(level) {
    this.compressionLevel = level;
    document.querySelectorAll('.level-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.level === level);
    });
  }

  handleFile(file) {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      this.showToast('PDF 파일만 업로드 가능합니다.', 'error');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      this.showToast('파일 크기는 100MB 이하여야 합니다.', 'error');
      return;
    }

    this.selectedFile = file;
    this.showFileInfo(file);
    this.elements.convertBtn.disabled = false;
  }

  showFileInfo(file) {
    const container = this.elements.fileInfo;
    const size = this.formatFileSize(file.size);

    container.innerHTML = `
      <div class="file-info">
        <div class="file-icon"></div>
        <div class="file-details">
          <div class="file-name">${file.name}</div>
          <div class="file-size">${size}</div>
        </div>
        <button class="tool-btn tool-btn-secondary" onclick="pdfCompress.removeFile()">삭제</button>
      </div>
    `;
    container.style.display = 'block';
  }

  removeFile() {
    this.selectedFile = null;
    this.elements.fileInfo.style.display = 'none';
    this.elements.fileInput.value = '';
    this.elements.convertBtn.disabled = true;
  }

  async compress() {
    if (!this.selectedFile) {
      this.showToast('파일을 선택해주세요.', 'warning');
      return;
    }

    const { progressSection, progressFill, progressText, resultPreview } = this.elements;

    progressSection.style.display = 'block';
    resultPreview.innerHTML = `
      <div class="result-icon"></div>
      <div class="result-message">압축 중...</div>
      <div class="result-detail">잠시만 기다려주세요</div>
    `;

    const steps = [
      { progress: 10, text: 'PDF 분석 중...' },
      { progress: 30, text: '이미지 최적화 중...' },
      { progress: 50, text: '폰트 최적화 중...' },
      { progress: 70, text: '구조 최적화 중...' },
      { progress: 90, text: '최종 압축 중...' },
      { progress: 100, text: '완료!' }
    ];

    for (const step of steps) {
      await this.delay(400);
      progressFill.style.width = step.progress + '%';
      progressText.textContent = step.text;
    }

    await this.delay(300);

    // 압축률 시뮬레이션
    const compressionRates = { low: 0.3, medium: 0.5, high: 0.7 };
    const rate = compressionRates[this.compressionLevel];
    const originalSize = this.selectedFile.size;
    const compressedSize = Math.round(originalSize * (1 - rate));
    const savings = Math.round(rate * 100);

    resultPreview.innerHTML = `
      <div class="result-icon"></div>
      <div class="savings-badge">-${savings}% 감소</div>
      <div class="result-message">압축 완료 (데모)</div>
      <div class="result-detail">
        원본: ${this.formatFileSize(originalSize)}<br>
        압축: ${this.formatFileSize(compressedSize)}
      </div>
      <button class="tool-btn tool-btn-primary" onclick="pdfCompress.showDemoMessage()">
        다운로드 (데모)
      </button>
    `;

    this.showSuccess('압축 완료! (데모 모드)');
  }

  showDemoMessage() {
    this.showToast('실제 압축은 서버 API가 필요합니다.', 'info');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const pdfCompress = new PdfCompress();
window.PdfCompress = pdfCompress;

document.addEventListener('DOMContentLoaded', () => pdfCompress.init());
