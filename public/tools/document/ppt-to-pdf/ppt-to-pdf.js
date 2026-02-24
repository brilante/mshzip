/**
 * PPT → PDF 변환기 - ToolBase 기반
 * PowerPoint를 PDF로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PptToPdf = class PptToPdf extends ToolBase {
  constructor() {
    super('PptToPdf');
    this.selectedFile = null;
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
    console.log('[PptToPdf] 초기화 완료');
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

  handleFile(file) {
    if (!file) return;

    const validTypes = ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    const ext = file.name.split('.').pop().toLowerCase();

    if (!validTypes.includes(file.type) && !['ppt', 'pptx'].includes(ext)) {
      this.showToast('PPT/PPTX 파일만 업로드 가능합니다.', 'error');
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
        <button class="tool-btn tool-btn-secondary" onclick="pptToPdf.removeFile()">삭제</button>
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

  async convert() {
    if (!this.selectedFile) {
      this.showToast('파일을 선택해주세요.', 'warning');
      return;
    }

    const { progressSection, progressFill, progressText, resultPreview } = this.elements;

    progressSection.style.display = 'block';
    resultPreview.innerHTML = `
      <div class="result-icon"></div>
      <div class="result-message">변환 중...</div>
      <div class="result-detail">잠시만 기다려주세요</div>
    `;

    const steps = [
      { progress: 15, text: 'PPT 파일 분석 중...' },
      { progress: 35, text: '슬라이드 렌더링 중...' },
      { progress: 60, text: 'PDF 생성 중...' },
      { progress: 85, text: '최적화 중...' },
      { progress: 100, text: '완료!' }
    ];

    for (const step of steps) {
      await this.delay(400);
      progressFill.style.width = step.progress + '%';
      progressText.textContent = step.text;
    }

    await this.delay(300);

    const pdfName = this.selectedFile.name.replace(/\.(ppt|pptx)$/i, '.pdf');
    resultPreview.innerHTML = `
      <div class="result-icon"></div>
      <div class="result-message">변환 완료 (데모)</div>
      <div class="result-detail">${pdfName}</div>
      <button class="tool-btn tool-btn-primary" onclick="pptToPdf.showDemoMessage()">
        다운로드 (데모)
      </button>
    `;

    this.showSuccess('변환 완료! (데모 모드)');
  }

  showDemoMessage() {
    this.showToast('실제 변환은 서버 API가 필요합니다.', 'info');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const pptToPdf = new PptToPdf();
window.PptToPdf = pptToPdf;

document.addEventListener('DOMContentLoaded', () => pptToPdf.init());
