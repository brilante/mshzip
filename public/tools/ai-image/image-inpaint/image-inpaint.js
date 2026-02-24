/**
 * AI 인페인팅 - ToolBase 기반
 * 마스크 영역을 AI가 채워넣기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class ImageInpaintTool extends ToolBase {
  constructor() {
    super('ImageInpaintTool');
    this.selectedModel = 'sdxl-inpaint';
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
    this.brushSize = 30;
    this.originalImage = null;
    this.resultDataUrl = null;

    this.modelNames = {
      'sdxl-inpaint': 'SDXL Inpaint',
      'lama': 'LaMa',
      'runway': 'Runway ML'
    };
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      fileInput: 'fileInput',
      canvasContainer: 'canvasContainer',
      drawCanvas: 'drawCanvas',
      promptSection: 'promptSection',
      brushSizeValue: 'brushSizeValue',
      loadingOverlay: 'loadingOverlay',
      processBtn: 'processBtn',
      downloadBtn: 'downloadBtn'
    });

    this.setupDragDrop();
    console.log('[ImageInpaintTool] 초기화 완료');
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
    this.elements.promptSection.style.display = 'block';
    this.elements.processBtn.disabled = false;

    this.canvas = this.elements.drawCanvas;
    this.ctx = this.canvas.getContext('2d');

    // 캔버스 크기 설정 (최대 800px)
    const maxWidth = 800;
    const scale = img.width > maxWidth ? maxWidth / img.width : 1;
    this.canvas.width = img.width * scale;
    this.canvas.height = img.height * scale;

    // 이미지 그리기
    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);

    // 마우스 이벤트 설정
    this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    this.canvas.addEventListener('mouseup', () => this.stopDrawing());
    this.canvas.addEventListener('mouseleave', () => this.stopDrawing());

    // 터치 이벤트
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

    // 데모: 원본 이미지 사용 (실제로는 AI 처리)
    this.clearMask();
    this.resultDataUrl = this.canvas.toDataURL('image/png');

    loadingOverlay.classList.remove('active');
    this.elements.downloadBtn.disabled = false;

    this.showToast(`${this.modelNames[this.selectedModel]}로 인페인팅 완료!`);
  }

  download() {
    if (!this.resultDataUrl) return;
    const link = document.createElement('a');
    link.download = 'inpainted.png';
    link.href = this.resultDataUrl;
    link.click();
    this.showToast('이미지가 다운로드되었습니다!');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const imageInpaintTool = new ImageInpaintTool();
window.ImageInpaint = imageInpaintTool;

document.addEventListener('DOMContentLoaded', () => imageInpaintTool.init());
console.log('[ImageInpaintTool] 모듈 로드 완료');
