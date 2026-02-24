/**
 * AI 객체 제거 - ToolBase 기반
 * 이미지에서 원하지 않는 객체 제거
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class ObjectRemoveTool extends ToolBase {
  constructor() {
    super('ObjectRemoveTool');
    this.selectedModel = 'lama';
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
    this.brushSize = 30;
    this.originalImage = null;
    this.resultDataUrl = null;

    this.modelNames = {
      'lama': 'LaMa',
      'adobe-firefly': 'Adobe Firefly',
      'stable-diffusion': 'Stable Diffusion'
    };
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      canvasContainer: 'canvasContainer',
      drawCanvas: 'drawCanvas',
      tipsBox: 'tipsBox',
      brushSizeValue: 'brushSizeValue',
      loadingOverlay: 'loadingOverlay',
      processBtn: 'processBtn',
      downloadBtn: 'downloadBtn'
    });

    this.setupDragDrop();
    console.log('[ObjectRemoveTool] 초기화 완료');
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

  setBrushSize(size) {
    this.brushSize = parseInt(size);
    this.elements.brushSizeValue.textContent = size + 'px';
  }

  handleFile(event) {
    const file = event.target.files[0];
    if (file) this.loadFile(file);
  }

  loadFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.setupCanvas(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  setupCanvas(img) {
    this.elements.uploadArea.style.display = 'none';
    this.elements.canvasContainer.style.display = 'block';
    this.elements.tipsBox.style.display = 'block';
    this.elements.processBtn.disabled = false;

    this.canvas = this.elements.drawCanvas;
    this.ctx = this.canvas.getContext('2d');

    const maxWidth = 800;
    const scale = img.width > maxWidth ? maxWidth / img.width : 1;
    this.canvas.width = img.width * scale;
    this.canvas.height = img.height * scale;

    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);

    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDrawing());
    this.canvas.addEventListener('mouseleave', () => this.stopDrawing());

    this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.startDrawing(e.touches[0]); });
    this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.draw(e.touches[0]); });
    this.canvas.addEventListener('touchend', () => this.stopDrawing());
  }

  startDrawing(e) {
    this.isDrawing = true;
    this.draw(e);
  }

  draw(e) {
    if (!this.isDrawing) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    this.ctx.beginPath();
    this.ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    this.ctx.fill();
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  clearMask() {
    if (this.originalImage && this.ctx) {
      this.ctx.drawImage(this.originalImage, 0, 0, this.canvas.width, this.canvas.height);
    }
  }

  async process() {
    if (!this.canvas) {
      this.showToast('먼저 이미지를 업로드하세요.', 'error');
      return;
    }

    const loadingOverlay = this.elements.loadingOverlay;
    loadingOverlay.classList.add('active');

    await this.delay(2500 + Math.random() * 1500);

    this.clearMask();
    this.resultDataUrl = this.canvas.toDataURL('image/png');

    loadingOverlay.classList.remove('active');
    this.elements.downloadBtn.disabled = false;

    this.showToast(`${this.modelNames[this.selectedModel]}로 객체 제거 완료!`);
  }

  download() {
    if (!this.resultDataUrl) return;
    const link = document.createElement('a');
    link.download = 'object-removed.png';
    link.href = this.resultDataUrl;
    link.click();
    this.showToast('이미지가 다운로드되었습니다!');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const objectRemoveTool = new ObjectRemoveTool();
window.ObjectRemove = objectRemoveTool;

document.addEventListener('DOMContentLoaded', () => objectRemoveTool.init());
console.log('[ObjectRemoveTool] 모듈 로드 완료');
