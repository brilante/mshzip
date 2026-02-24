/**
 * PDF OCR - ToolBase 기반
 * 스캔된 PDF에서 텍스트 추출
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PdfOcr = class PdfOcr extends ToolBase {
  constructor() {
    super('PdfOcr');
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
    console.log('[PdfOcr] 초기화 완료');
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
        <button class="tool-btn tool-btn-secondary" onclick="pdfOcr.removeFile()">삭제</button>
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

  async process() {
    if (!this.selectedFile) {
      this.showToast('파일을 선택해주세요.', 'warning');
      return;
    }

    const { progressSection, progressFill, progressText, resultPreview, outputFormat } = this.elements;

    progressSection.style.display = 'block';
    resultPreview.innerHTML = `
      <div class="result-icon"></div>
      <div class="result-message">OCR 처리 중...</div>
      <div class="result-detail">텍스트를 인식하고 있습니다</div>
    `;

    const steps = [
      { progress: 10, text: 'PDF 페이지 분석 중...' },
      { progress: 25, text: '이미지 전처리 중...' },
      { progress: 45, text: '텍스트 인식 중 (1/3)...' },
      { progress: 65, text: '텍스트 인식 중 (2/3)...' },
      { progress: 85, text: '텍스트 인식 중 (3/3)...' },
      { progress: 95, text: '결과 정리 중...' },
      { progress: 100, text: '완료!' }
    ];

    for (const step of steps) {
      await this.delay(500);
      progressFill.style.width = step.progress + '%';
      progressText.textContent = step.text;
    }

    await this.delay(300);

    // 데모 결과 텍스트
    const demoText = `[OCR 인식 결과 - 데모]

문서 제목: ${this.selectedFile.name}

이것은 OCR 기능의 데모 결과입니다.
실제 서버 API가 연동되면 스캔된 PDF에서
텍스트를 정확하게 추출할 수 있습니다.

주요 기능:
- 한국어, 영어, 일본어, 중국어 지원
- 기울기 자동 보정
- 노이즈 제거
- 검색 가능한 PDF 생성

인식률: 약 98.5% (시뮬레이션)
처리 페이지: 3페이지`;

    const format = outputFormat.value;
    const formatNames = {
      'searchable-pdf': '검색 가능한 PDF',
      'txt': '텍스트 파일',
      'docx': 'Word 문서'
    };

    resultPreview.innerHTML = `
      <div class="result-icon"></div>
      <div class="result-message">OCR 완료 (데모)</div>
      <div class="result-detail">출력 형식: ${formatNames[format]}</div>
      <div class="ocr-text-preview">${demoText.replace(/\n/g, '<br>')}</div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="tool-btn tool-btn-secondary" onclick="pdfOcr.copyText()">텍스트 복사</button>
        <button class="tool-btn tool-btn-primary" onclick="pdfOcr.showDemoMessage()">다운로드 (데모)</button>
      </div>
    `;

    this.showSuccess('OCR 완료! (데모 모드)');
  }

  copyText() {
    const demoText = `[OCR 인식 결과 - 데모]\n\n문서 제목: ${this.selectedFile.name}\n\n이것은 OCR 기능의 데모 결과입니다.`;
    navigator.clipboard.writeText(demoText);
    this.showSuccess('텍스트가 복사되었습니다!');
  }

  showDemoMessage() {
    this.showToast('실제 OCR은 서버 API가 필요합니다.', 'info');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const pdfOcr = new PdfOcr();
window.PdfOcr = pdfOcr;

document.addEventListener('DOMContentLoaded', () => pdfOcr.init());
