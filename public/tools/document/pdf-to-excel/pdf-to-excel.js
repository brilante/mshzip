/**
 * PDF → Excel 변환기 - ToolBase 기반
 * PDF 표 데이터를 Excel로 추출
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PdfToExcel = class PdfToExcel extends ToolBase {
  constructor() {
    super('PdfToExcel');
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
      resultPreview: 'resultPreview',
      outputFormat: 'outputFormat'
    });

    this.setupEventListeners();
    console.log('[PdfToExcel] 초기화 완료');
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

    if (file.type !== 'application/pdf') {
      this.showToast('PDF 파일만 업로드 가능합니다.', 'error');
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
        <button class="tool-btn tool-btn-secondary" onclick="pdfToExcel.removeFile()">삭제</button>
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

    const { progressSection, progressFill, progressText, resultPreview, outputFormat } = this.elements;
    const format = outputFormat.value;

    progressSection.style.display = 'block';
    resultPreview.innerHTML = `
      <div class="result-icon"></div>
      <div class="result-message">변환 중...</div>
      <div class="result-detail">표 데이터를 추출하고 있습니다</div>
    `;

    const steps = [
      { progress: 10, text: 'PDF 분석 중...' },
      { progress: 30, text: '표 영역 감지 중...' },
      { progress: 50, text: '셀 데이터 추출 중...' },
      { progress: 70, text: 'Excel 시트 생성 중...' },
      { progress: 90, text: '최종 처리 중...' },
      { progress: 100, text: '완료!' }
    ];

    for (const step of steps) {
      await this.delay(450);
      progressFill.style.width = step.progress + '%';
      progressText.textContent = step.text;
    }

    await this.delay(300);

    const excelName = this.selectedFile.name.replace('.pdf', '.' + format);
    resultPreview.innerHTML = `
      <div class="result-icon"></div>
      <div class="result-message">변환 완료 (데모)</div>
      <div class="result-detail">${excelName}<br>3개 표, 총 150개 셀 추출</div>
      <button class="tool-btn tool-btn-primary" onclick="pdfToExcel.showDemoMessage()">
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
const pdfToExcel = new PdfToExcel();
window.PdfToExcel = pdfToExcel;

document.addEventListener('DOMContentLoaded', () => pdfToExcel.init());
