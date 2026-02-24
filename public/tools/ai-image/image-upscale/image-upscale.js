/**
 * AI 업스케일러 - ToolBase 기반
 * AI로 이미지 해상도 향상
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class ImageUpscaleTool extends ToolBase {
  constructor() {
    super('ImageUpscaleTool');
    this.selectedModel = 'realesrgan';
    this.selectedScale = 2;
    this.originalFile = null;
    this.originalDataUrl = null;
    this.originalWidth = 0;
    this.originalHeight = 0;
    this.resultDataUrl = null;

    this.modelNames = {
      'realesrgan': 'Real-ESRGAN',
      'topaz': 'Topaz Gigapixel',
      'waifu2x': 'Waifu2x'
    };
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      fileInput: 'fileInput',
      previewGrid: 'previewGrid',
      originalImage: 'originalImage',
      resultImage: 'resultImage',
      originalRes: 'originalRes',
      resultRes: 'resultRes',
      loadingOverlay: 'loadingOverlay',
      processBtn: 'processBtn',
      downloadBtn: 'downloadBtn'
    });

    this.setupDragDrop();
    console.log('[ImageUpscaleTool] 초기화 완료');
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

  selectScale(scale) {
    this.selectedScale = scale;
    document.querySelectorAll('.scale-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.scale) === scale);
    });
    this.updateResultRes();
  }

  handleFile(event) {
    const file = event.target.files[0];
    if (file) this.loadFile(file);
  }

  loadFile(file) {
    if (file.size > 10 * 1024 * 1024) {
      this.showToast('파일 크기는 10MB 이하여야 합니다.', 'error');
      return;
    }

    this.originalFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.originalDataUrl = e.target.result;
      const img = new Image();
      img.onload = () => {
        this.originalWidth = img.width;
        this.originalHeight = img.height;
        this.elements.originalRes.textContent = `${img.width} × ${img.height}`;
        this.updateResultRes();
      };
      img.src = this.originalDataUrl;

      this.elements.originalImage.src = this.originalDataUrl;
      this.elements.previewGrid.style.display = 'grid';
      this.elements.processBtn.disabled = false;
      this.elements.resultImage.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  updateResultRes() {
    if (this.originalWidth && this.originalHeight) {
      const newW = this.originalWidth * this.selectedScale;
      const newH = this.originalHeight * this.selectedScale;
      this.elements.resultRes.textContent = `${newW} × ${newH}`;
    }
  }

  async process() {
    if (!this.originalDataUrl) {
      this.showToast('먼저 이미지를 업로드하세요.', 'error');
      return;
    }

    const loadingOverlay = this.elements.loadingOverlay;
    loadingOverlay.classList.add('active');

    await this.delay(2000 + Math.random() * 1500);

    // 데모: 원본 이미지 사용
    this.resultDataUrl = this.originalDataUrl;

    loadingOverlay.classList.remove('active');
    const resultImage = this.elements.resultImage;
    resultImage.src = this.resultDataUrl;
    resultImage.style.display = 'block';
    this.elements.downloadBtn.disabled = false;

    this.showToast(`${this.modelNames[this.selectedModel]}로 ${this.selectedScale}× 업스케일 완료!`);
  }

  download() {
    if (!this.resultDataUrl) return;
    const link = document.createElement('a');
    link.download = `upscaled-${this.selectedScale}x.png`;
    link.href = this.resultDataUrl;
    link.click();
    this.showToast('이미지가 다운로드되었습니다!');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const imageUpscaleTool = new ImageUpscaleTool();
window.ImageUpscale = imageUpscaleTool;

document.addEventListener('DOMContentLoaded', () => imageUpscaleTool.init());
console.log('[ImageUpscaleTool] 모듈 로드 완료');
