/**
 * 이미지 자르기 (고급) - ToolBase 기반
 * 비율 프리셋과 정밀 좌표 설정
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CropAdv = class CropAdv extends ToolBase {
  constructor() {
    super('CropAdv');
    this.originalImage = null;
    this.aspectRatio = null;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.cropX = 0;
    this.cropY = 0;
    this.cropW = 100;
    this.cropH = 100;
    this.scale = 1;
  }

  init() {
    this.initElements({
      sourceCanvas: 'sourceCanvas',
      resultCanvas: 'resultCanvas',
      cropOverlay: 'cropOverlay',
      cropX: 'cropX',
      cropY: 'cropY',
      cropW: 'cropW',
      cropH: 'cropH'
    });

    const canvas = this.elements.sourceCanvas;
    this.on(canvas, 'mousedown', (e) => this.onMouseDown(e));
    this.on(canvas, 'mousemove', (e) => this.onMouseMove(e));
    this.on(canvas, 'mouseup', () => this.onMouseUp());
    this.on(canvas, 'mouseleave', () => this.onMouseUp());

    console.log('[CropAdv] 초기화 완료');
    return this;
  }

  loadImage(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        const canvas = this.elements.sourceCanvas;
        const ctx = canvas.getContext('2d');

        const maxWidth = 600;
        this.scale = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = img.width * this.scale;
        canvas.height = img.height * this.scale;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        this.cropX = 0;
        this.cropY = 0;
        this.cropW = img.width;
        this.cropH = img.height;
        this.updateInputs();
        this.updateOverlay();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  setRatio(ratio) {
    this.aspectRatio = ratio;
    document.querySelectorAll('.ratio-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (ratio && this.originalImage) {
      const imgW = this.originalImage.width;
      const imgH = this.originalImage.height;

      if (ratio > imgW / imgH) {
        this.cropW = imgW;
        this.cropH = Math.round(imgW / ratio);
      } else {
        this.cropH = imgH;
        this.cropW = Math.round(imgH * ratio);
      }
      this.cropX = Math.round((imgW - this.cropW) / 2);
      this.cropY = Math.round((imgH - this.cropH) / 2);
      this.updateInputs();
      this.updateOverlay();
    }
  }

  onMouseDown(e) {
    if (!this.originalImage) return;
    this.isDragging = true;
    const rect = e.target.getBoundingClientRect();
    this.startX = e.clientX - rect.left;
    this.startY = e.clientY - rect.top;
  }

  onMouseMove(e) {
    if (!this.isDragging || !this.originalImage) return;
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let w = x - this.startX;
    let h = y - this.startY;

    if (this.aspectRatio) {
      h = w / this.aspectRatio;
    }

    this.cropX = Math.round(Math.min(this.startX, x) / this.scale);
    this.cropY = Math.round(Math.min(this.startY, y) / this.scale);
    this.cropW = Math.round(Math.abs(w) / this.scale);
    this.cropH = Math.round(Math.abs(h) / this.scale);

    this.updateInputs();
    this.updateOverlay();
  }

  onMouseUp() {
    this.isDragging = false;
  }

  updateInputs() {
    this.elements.cropX.value = this.cropX;
    this.elements.cropY.value = this.cropY;
    this.elements.cropW.value = this.cropW;
    this.elements.cropH.value = this.cropH;
  }

  updateFromInputs() {
    this.cropX = parseInt(this.elements.cropX.value) || 0;
    this.cropY = parseInt(this.elements.cropY.value) || 0;
    this.cropW = parseInt(this.elements.cropW.value) || 100;
    this.cropH = parseInt(this.elements.cropH.value) || 100;
    this.updateOverlay();
  }

  updateOverlay() {
    const overlay = this.elements.cropOverlay;
    overlay.style.display = 'block';
    overlay.style.left = (this.cropX * this.scale) + 'px';
    overlay.style.top = (this.cropY * this.scale) + 'px';
    overlay.style.width = (this.cropW * this.scale) + 'px';
    overlay.style.height = (this.cropH * this.scale) + 'px';
  }

  crop() {
    if (!this.originalImage) {
      this.showToast('이미지를 먼저 업로드하세요.', 'warning');
      return;
    }

    const canvas = this.elements.resultCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = this.cropW;
    canvas.height = this.cropH;

    ctx.drawImage(this.originalImage, this.cropX, this.cropY, this.cropW, this.cropH, 0, 0, this.cropW, this.cropH);

    const sourceCanvas = this.elements.sourceCanvas;
    const sourceCtx = sourceCanvas.getContext('2d');
    sourceCanvas.width = this.cropW * this.scale;
    sourceCanvas.height = this.cropH * this.scale;
    sourceCtx.drawImage(canvas, 0, 0, sourceCanvas.width, sourceCanvas.height);

    this.elements.cropOverlay.style.display = 'none';
    this.showSuccess('자르기 완료!');
  }

  download() {
    const canvas = this.elements.resultCanvas;
    if (!canvas.width) {
      this.showToast('먼저 자르기를 적용하세요.', 'warning');
      return;
    }

    const link = document.createElement('a');
    link.download = `cropped-${this.cropW}x${this.cropH}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    this.showSuccess('다운로드 시작!');
  }

  reset() {
    if (this.originalImage) {
      const canvas = this.elements.sourceCanvas;
      const ctx = canvas.getContext('2d');
      canvas.width = this.originalImage.width * this.scale;
      canvas.height = this.originalImage.height * this.scale;
      ctx.drawImage(this.originalImage, 0, 0, canvas.width, canvas.height);
      this.cropX = 0;
      this.cropY = 0;
      this.cropW = this.originalImage.width;
      this.cropH = this.originalImage.height;
      this.updateInputs();
      this.updateOverlay();
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const cropAdv = new CropAdv();
window.CropAdv = cropAdv;

document.addEventListener('DOMContentLoaded', () => cropAdv.init());
