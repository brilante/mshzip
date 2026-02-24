/**
 * AI 스타일 변환 - ToolBase 기반
 * 사진을 예술 작품 스타일로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class StyleTransferTool extends ToolBase {
  constructor() {
    super('StyleTransferTool');
    this.selectedModel = 'neural-style';
    this.selectedStyle = 'vangogh';
    this.originalDataUrl = null;
    this.resultDataUrl = null;

    this.modelNames = {
      'neural-style': 'Neural Style',
      'arbitrary-style': 'Arbitrary Style',
      'clip-styler': 'CLIP Styler'
    };

    this.styleNames = {
      'vangogh': '반 고흐',
      'picasso': '피카소',
      'monet': '모네',
      'ukiyoe': '우키요에',
      'anime': '애니메',
      'sketch': '스케치',
      'watercolor': '수채화',
      'cyberpunk': '사이버펑크'
    };
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      fileInput: 'fileInput',
      previewGrid: 'previewGrid',
      originalImage: 'originalImage',
      resultImage: 'resultImage',
      loadingOverlay: 'loadingOverlay',
      processBtn: 'processBtn',
      downloadBtn: 'downloadBtn'
    });

    this.setupDragDrop();
    console.log('[StyleTransferTool] 초기화 완료');
    return this;
  }

  setupDragDrop() {
    const uploadArea = this.elements.uploadArea;
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = 'var(--primary)'; });
    uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = ''; });
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) this.loadFile(file);
    });
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }

  selectStyle(style) {
    this.selectedStyle = style;
    document.querySelectorAll('.style-card').forEach(card => {
      card.classList.toggle('active', card.dataset.style === style);
    });
  }

  handleFile(event) {
    const file = event.target.files[0];
    if (file) this.loadFile(file);
  }

  loadFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.originalDataUrl = e.target.result;
      this.elements.originalImage.src = this.originalDataUrl;
      this.elements.previewGrid.style.display = 'grid';
      this.elements.processBtn.disabled = false;
      this.elements.resultImage.style.display = 'none';
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

    await this.delay(2500 + Math.random() * 1500);

    // 데모: 원본 이미지 사용 (실제로는 AI 처리)
    this.resultDataUrl = this.originalDataUrl;

    loadingOverlay.classList.remove('active');
    const resultImage = this.elements.resultImage;
    resultImage.src = this.resultDataUrl;
    resultImage.style.display = 'block';
    this.elements.downloadBtn.disabled = false;

    this.showToast(`${this.styleNames[this.selectedStyle]} 스타일 변환 완료!`);
  }

  download() {
    if (!this.resultDataUrl) return;
    const link = document.createElement('a');
    link.download = `style-${this.selectedStyle}.png`;
    link.href = this.resultDataUrl;
    link.click();
    this.showToast('이미지가 다운로드되었습니다!');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const styleTransferTool = new StyleTransferTool();
window.StyleTransfer = styleTransferTool;

document.addEventListener('DOMContentLoaded', () => styleTransferTool.init());
console.log('[StyleTransferTool] 모듈 로드 완료');
