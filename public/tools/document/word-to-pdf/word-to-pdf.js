/**
 * Word → PDF 변환기 - ToolBase 기반
 * Word 문서를 PDF로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var WordToPdf = class WordToPdf extends ToolBase {
  constructor() {
    super('WordToPdf');
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
    console.log('[WordToPdf] 초기화 완료');
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

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['doc', 'docx'].includes(ext)) {
      this.showToast('DOC/DOCX 파일만 업로드 가능합니다.', 'error');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      this.showToast('파일 크기는 50MB 이하여야 합니다.', 'error');
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
        <button class="tool-btn tool-btn-secondary" onclick="wordToPdf.removeFile()">삭제</button>
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
      { progress: 15, text: 'Word 문서 분석 중...' },
      { progress: 40, text: '콘텐츠 렌더링 중...' },
      { progress: 70, text: 'PDF 생성 중...' },
      { progress: 90, text: '최적화 중...' },
      { progress: 100, text: '완료!' }
    ];

    for (const step of steps) {
      await this.delay(400);
      progressFill.style.width = step.progress + '%';
      progressText.textContent = step.text;
    }

    await this.delay(300);

    const pdfName = this.selectedFile.name.replace(/\.(doc|docx)$/i, '.pdf');
    resultPreview.innerHTML = `
      <div class="result-icon"></div>
      <div class="result-message">변환 완료 (데모)</div>
      <div class="result-detail">${pdfName}</div>
      <button class="tool-btn tool-btn-primary" onclick="wordToPdf.showDemoMessage()">
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
const wordToPdf = new WordToPdf();
window.WordToPdf = wordToPdf;

document.addEventListener('DOMContentLoaded', () => wordToPdf.init());
