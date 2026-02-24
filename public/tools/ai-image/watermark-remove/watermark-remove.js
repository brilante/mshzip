/**
 * 워터마크 제거 - ToolBase 기반
 * AI로 이미지에서 워터마크 제거
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class WatermarkRemoveTool extends ToolBase {
  constructor() {
    super('WatermarkRemoveTool');
    this.selectedModel = 'lama';
    this.originalDataUrl = null;
    this.resultDataUrl = null;

    this.modelNames = {
      'lama': 'LaMa',
      'mat': 'MAT',
      'deepfill': 'DeepFill v2'
    };
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      previewGrid: 'previewGrid',
      originalImage: 'originalImage',
      resultImage: 'resultImage',
      loadingOverlay: 'loadingOverlay',
      processBtn: 'processBtn',
      downloadBtn: 'downloadBtn'
    });

    this.setupDragDrop();
    console.log('[WatermarkRemoveTool] 초기화 완료');
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

    await this.delay(2000 + Math.random() * 1500);

    // 데모: 원본 이미지 사용 (실제로는 AI 처리)
    this.resultDataUrl = this.originalDataUrl;

    loadingOverlay.classList.remove('active');
    const resultImage = this.elements.resultImage;
    resultImage.src = this.resultDataUrl;
    resultImage.style.display = 'block';
    this.elements.downloadBtn.disabled = false;

    this.showToast(`${this.modelNames[this.selectedModel]}로 워터마크 제거 완료!`);
  }

  download() {
    if (!this.resultDataUrl) return;
    const link = document.createElement('a');
    link.download = 'watermark-removed.png';
    link.href = this.resultDataUrl;
    link.click();
    this.showToast('이미지가 다운로드되었습니다!');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const watermarkRemoveTool = new WatermarkRemoveTool();
window.WatermarkRemove = watermarkRemoveTool;

document.addEventListener('DOMContentLoaded', () => watermarkRemoveTool.init());
console.log('[WatermarkRemoveTool] 모듈 로드 완료');
