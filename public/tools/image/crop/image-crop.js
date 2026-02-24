/**
 * 이미지 자르기 도구 - ToolBase 기반
 * Canvas API를 사용하여 클라이언트 사이드에서 이미지 자르기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ImageCrop = class ImageCrop extends ToolBase {
  constructor() {
    super('ImageCrop');
    this.originalImage = null;
    this.originalFileName = '';
    this.canvas = null;
    this.ctx = null;
    this.scale = 1;
    this.ratio = 'free';
    this.selection = { x: 0, y: 0, w: 0, h: 0 };
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      uploadSection: 'uploadSection',
      controlSection: 'controlSection',
      cropCanvas: 'cropCanvas',
      previewImage: 'previewImage',
      previewInfo: 'previewInfo',
      cropX: 'cropX',
      cropY: 'cropY',
      cropW: 'cropW',
      cropH: 'cropH'
    });

    this.canvas = this.elements.cropCanvas;
    this.ctx = this.canvas.getContext('2d');

    this.setupEventListeners();
    this.setupCanvas();
    console.log('[ImageCrop] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { dropzone, fileInput } = this.elements;

    this.on(dropzone, 'click', () => fileInput.click());
    this.on(fileInput, 'change', (e) => {
      if (e.target.files.length > 0) this.loadImage(e.target.files[0]);
    });

    this.on(dropzone, 'dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    this.on(dropzone, 'dragleave', () => dropzone.classList.remove('dragover'));
    this.on(dropzone, 'drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) this.loadImage(e.dataTransfer.files[0]);
    });
  }

  setupCanvas() {
    this.on(this.canvas, 'mousedown', (e) => this.onMouseDown(e));
    this.on(this.canvas, 'mousemove', (e) => this.onMouseMove(e));
    this.on(this.canvas, 'mouseup', () => this.onMouseUp());
    this.on(this.canvas, 'mouseleave', () => this.onMouseUp());
  }

  loadImage(file) {
    if (!file.type.startsWith('image/')) {
      this.showToast('이미지 파일만 선택할 수 있습니다.', 'error');
      return;
    }

    this.originalFileName = file.name;
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;

        const maxSize = 800;
        if (img.width > maxSize || img.height > maxSize) {
          this.scale = Math.min(maxSize / img.width, maxSize / img.height);
        } else {
          this.scale = 1;
        }

        this.canvas.width = img.width * this.scale;
        this.canvas.height = img.height * this.scale;

        this.selection = { x: 0, y: 0, w: img.width, h: img.height };

        this.updateInputs();
        this.draw();

        this.elements.uploadSection.style.display = 'none';
        this.elements.controlSection.style.display = 'block';

        this.showSuccess('이미지가 로드되었습니다.');
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }

  setRatio(ratio) {
    this.ratio = ratio;

    document.querySelectorAll('.ratio-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.ratio === ratio) btn.classList.add('active');
    });

    if (ratio !== 'free' && this.originalImage) {
      const [rw, rh] = ratio.split(':').map(Number);
      const aspectRatio = rw / rh;

      let newW = this.selection.w;
      let newH = this.selection.w / aspectRatio;

      if (newH > this.originalImage.height) {
        newH = this.originalImage.height;
        newW = newH * aspectRatio;
      }

      this.selection.w = Math.min(newW, this.originalImage.width);
      this.selection.h = Math.min(newH, this.originalImage.height);
      this.selection.x = (this.originalImage.width - this.selection.w) / 2;
      this.selection.y = (this.originalImage.height - this.selection.h) / 2;

      this.updateInputs();
      this.draw();
      this.updatePreview();
    }
  }

  onMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.isDragging = true;
    this.startX = (e.clientX - rect.left) / this.scale;
    this.startY = (e.clientY - rect.top) / this.scale;
  }

  onMouseMove(e) {
    if (!this.isDragging) return;

    const rect = this.canvas.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / this.scale;
    const currentY = (e.clientY - rect.top) / this.scale;

    let x = Math.min(this.startX, currentX);
    let y = Math.min(this.startY, currentY);
    let w = Math.abs(currentX - this.startX);
    let h = Math.abs(currentY - this.startY);

    if (this.ratio !== 'free') {
      const [rw, rh] = this.ratio.split(':').map(Number);
      const aspectRatio = rw / rh;
      h = w / aspectRatio;
    }

    x = Math.max(0, Math.min(x, this.originalImage.width - w));
    y = Math.max(0, Math.min(y, this.originalImage.height - h));
    w = Math.min(w, this.originalImage.width - x);
    h = Math.min(h, this.originalImage.height - y);

    this.selection = { x, y, w, h };
    this.updateInputs();
    this.draw();
    this.updatePreview();
  }

  onMouseUp() {
    this.isDragging = false;
  }

  updateFromInputs() {
    if (!this.originalImage) return;

    this.selection.x = Math.max(0, parseInt(this.elements.cropX.value) || 0);
    this.selection.y = Math.max(0, parseInt(this.elements.cropY.value) || 0);
    this.selection.w = Math.max(1, parseInt(this.elements.cropW.value) || 1);
    this.selection.h = Math.max(1, parseInt(this.elements.cropH.value) || 1);

    this.selection.x = Math.min(this.selection.x, this.originalImage.width - 1);
    this.selection.y = Math.min(this.selection.y, this.originalImage.height - 1);
    this.selection.w = Math.min(this.selection.w, this.originalImage.width - this.selection.x);
    this.selection.h = Math.min(this.selection.h, this.originalImage.height - this.selection.y);

    this.draw();
    this.updatePreview();
  }

  updateInputs() {
    this.elements.cropX.value = Math.round(this.selection.x);
    this.elements.cropY.value = Math.round(this.selection.y);
    this.elements.cropW.value = Math.round(this.selection.w);
    this.elements.cropH.value = Math.round(this.selection.h);
  }

  draw() {
    if (!this.originalImage) return;

    this.ctx.drawImage(this.originalImage, 0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const sx = this.selection.x * this.scale;
    const sy = this.selection.y * this.scale;
    const sw = this.selection.w * this.scale;
    const sh = this.selection.h * this.scale;

    this.ctx.drawImage(
      this.originalImage,
      this.selection.x, this.selection.y, this.selection.w, this.selection.h,
      sx, sy, sw, sh
    );

    this.ctx.strokeStyle = '#3B82F6';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(sx, sy, sw, sh);
    this.ctx.setLineDash([]);
  }

  updatePreview() {
    if (!this.originalImage || this.selection.w <= 0 || this.selection.h <= 0) return;

    const previewCanvas = document.createElement('canvas');
    const previewCtx = previewCanvas.getContext('2d');

    previewCanvas.width = this.selection.w;
    previewCanvas.height = this.selection.h;

    previewCtx.drawImage(
      this.originalImage,
      this.selection.x, this.selection.y, this.selection.w, this.selection.h,
      0, 0, this.selection.w, this.selection.h
    );

    this.elements.previewImage.src = previewCanvas.toDataURL('image/png');
    this.elements.previewInfo.textContent =
      `${Math.round(this.selection.w)} × ${Math.round(this.selection.h)}px`;
  }

  crop() {
    if (!this.originalImage || this.selection.w <= 0 || this.selection.h <= 0) {
      this.showToast('자를 영역을 선택해주세요.', 'warning');
      return;
    }

    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');

    croppedCanvas.width = this.selection.w;
    croppedCanvas.height = this.selection.h;

    croppedCtx.drawImage(
      this.originalImage,
      this.selection.x, this.selection.y, this.selection.w, this.selection.h,
      0, 0, this.selection.w, this.selection.h
    );

    const img = new Image();
    img.onload = () => {
      this.originalImage = img;

      const maxSize = 800;
      if (img.width > maxSize || img.height > maxSize) {
        this.scale = Math.min(maxSize / img.width, maxSize / img.height);
      } else {
        this.scale = 1;
      }

      this.canvas.width = img.width * this.scale;
      this.canvas.height = img.height * this.scale;

      this.selection = { x: 0, y: 0, w: img.width, h: img.height };
      this.updateInputs();
      this.draw();
      this.updatePreview();

      this.showSuccess('자르기 완료!');
    };
    img.src = croppedCanvas.toDataURL('image/png');
  }

  resetSelection() {
    if (!this.originalImage) return;

    this.selection = {
      x: 0,
      y: 0,
      w: this.originalImage.width,
      h: this.originalImage.height
    };

    this.updateInputs();
    this.draw();
    this.updatePreview();

    this.showToast('선택 영역이 초기화되었습니다.', 'info');
  }

  download() {
    const previewImage = this.elements.previewImage;
    if (!previewImage.src || previewImage.src === '') {
      this.showToast('다운로드할 이미지가 없습니다.', 'warning');
      return;
    }

    const baseName = this.originalFileName.replace(/\.[^/.]+$/, '');
    const fileName = `${baseName}_cropped.png`;

    const link = document.createElement('a');
    link.href = previewImage.src;
    link.download = fileName;
    link.click();

    this.showSuccess('다운로드가 시작되었습니다!');
  }

  clear() {
    this.originalImage = null;
    this.originalFileName = '';
    this.selection = { x: 0, y: 0, w: 0, h: 0 };

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.elements.previewImage.src = '';
    this.elements.previewInfo.textContent = '';
    this.elements.fileInput.value = '';

    this.elements.uploadSection.style.display = 'block';
    this.elements.controlSection.style.display = 'none';

    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const imageCrop = new ImageCrop();
window.ImageCrop = imageCrop;

document.addEventListener('DOMContentLoaded', () => imageCrop.init());
