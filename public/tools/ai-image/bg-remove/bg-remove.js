/**
 * AI 배경 제거 - ToolBase 기반
 * AI가 자동으로 이미지 배경 제거
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class AiBgRemoveTool extends ToolBase {
  constructor() {
    super('AiBgRemoveTool');
    this.selectedModel = 'removebg';
    this.selectedBg = 'transparent';
    this.originalFile = null;
    this.originalDataUrl = null;
    this.resultDataUrl = null;

    this.modelNames = {
      'removebg': 'Remove.bg',
      'rembg': 'Rembg (U2Net)',
      'photoroom': 'PhotoRoom AI'
    };
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      fileInput: 'fileInput',
      previewGrid: 'previewGrid',
      originalImage: 'originalImage',
      resultContainer: 'resultContainer',
      resultPlaceholder: 'resultPlaceholder',
      resultImage: 'resultImage',
      loadingOverlay: 'loadingOverlay',
      processBtn: 'processBtn',
      downloadBtn: 'downloadBtn',
      statsRow: 'statsRow',
      originalSize: 'originalSize',
      processingTime: 'processingTime',
      resultSize: 'resultSize'
    });

    this.setupDragDrop();
    console.log('[AiBgRemoveTool] 초기화 완료');
    return this;
  }

  setupDragDrop() {
    const uploadArea = this.elements.uploadArea;

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.loadFile(file);
      }
    });
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }

  selectBg(bg) {
    this.selectedBg = bg;
    document.querySelectorAll('.bg-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.bg === bg);
    });

    // 결과 이미지가 있으면 배경 업데이트
    if (this.resultDataUrl) {
      this.updateResultBackground();
    }
  }

  handleFile(event) {
    const file = event.target.files[0];
    if (file) {
      this.loadFile(file);
    }
  }

  loadFile(file) {
    if (!file.type.startsWith('image/')) {
      this.showToast('이미지 파일만 업로드 가능합니다.', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.showToast('파일 크기는 10MB 이하여야 합니다.', 'error');
      return;
    }

    this.originalFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.originalDataUrl = e.target.result;
      this.elements.originalImage.src = this.originalDataUrl;
      this.elements.previewGrid.style.display = 'grid';
      this.elements.processBtn.disabled = false;
      this.elements.resultPlaceholder.style.display = 'block';
      this.elements.resultImage.style.display = 'none';

      // 원본 크기 표시
      this.elements.originalSize.textContent = this.formatSize(file.size);
    };
    reader.readAsDataURL(file);
  }

  async process() {
    if (!this.originalDataUrl) {
      this.showToast('먼저 이미지를 업로드하세요.', 'error');
      return;
    }

    const loadingOverlay = this.elements.loadingOverlay;
    loadingOverlay.classList.add('active');

    const startTime = Date.now();

    // 시뮬레이션 딜레이
    await this.delay(1500 + Math.random() * 1000);

    // 데모: 원본 이미지를 그대로 사용 (실제로는 AI API 호출)
    this.resultDataUrl = this.originalDataUrl;

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // 결과 표시
    loadingOverlay.classList.remove('active');
    this.elements.resultPlaceholder.style.display = 'none';
    const resultImage = this.elements.resultImage;
    resultImage.src = this.resultDataUrl;
    resultImage.style.display = 'block';

    this.elements.downloadBtn.disabled = false;
    this.elements.statsRow.style.display = 'flex';
    this.elements.processingTime.textContent = processingTime + 'ms';
    this.elements.resultSize.textContent = this.formatSize(this.originalFile.size * 0.8);

    this.updateResultBackground();

    this.showToast(`${this.modelNames[this.selectedModel]}로 배경 제거 완료!`);
  }

  updateResultBackground() {
    const resultContainer = this.elements.resultContainer;

    if (this.selectedBg === 'transparent') {
      resultContainer.className = 'preview-content checkerboard';
      resultContainer.style.background = '';
    } else if (this.selectedBg === 'gradient') {
      resultContainer.className = 'preview-content';
      resultContainer.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
    } else {
      resultContainer.className = 'preview-content';
      resultContainer.style.background = this.selectedBg;
    }
  }

  download() {
    if (!this.resultDataUrl) {
      this.showToast('다운로드할 이미지가 없습니다.', 'error');
      return;
    }

    const link = document.createElement('a');
    link.download = 'background-removed.png';
    link.href = this.resultDataUrl;
    link.click();

    this.showToast('이미지가 다운로드되었습니다!');
  }

  reset() {
    this.originalFile = null;
    this.originalDataUrl = null;
    this.resultDataUrl = null;

    this.elements.previewGrid.style.display = 'none';
    this.elements.statsRow.style.display = 'none';
    this.elements.processBtn.disabled = true;
    this.elements.downloadBtn.disabled = true;
    this.elements.fileInput.value = '';

    this.showToast('초기화되었습니다.');
  }

  formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const aiBgRemoveTool = new AiBgRemoveTool();
window.BGRemove = aiBgRemoveTool;

document.addEventListener('DOMContentLoaded', () => aiBgRemoveTool.init());
console.log('[AiBgRemoveTool] 모듈 로드 완료');
