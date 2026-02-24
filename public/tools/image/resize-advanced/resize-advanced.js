/**
 * 이미지 리사이즈 (고급) - ToolBase 기반
 * 다양한 리사이즈 옵션과 프리셋
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ResizeAdv = class ResizeAdv extends ToolBase {
  constructor() {
    super('ResizeAdv');
    this.originalImage = null;
    this.originalWidth = 0;
    this.originalHeight = 0;
  }

  init() {
    this.initElements({
      targetWidth: 'targetWidth',
      targetHeight: 'targetHeight',
      lockRatio: 'lockRatio',
      scalePercent: 'scalePercent',
      resampleMethod: 'resampleMethod',
      outputFormat: 'outputFormat',
      quality: 'quality',
      qualityGroup: 'qualityGroup',
      originalSize: 'originalSize',
      resultSize: 'resultSize',
      previewCanvas: 'previewCanvas'
    });

    this.on(this.elements.outputFormat, 'change', (e) => {
      this.elements.qualityGroup.style.display =
        e.target.value !== 'image/png' ? 'block' : 'none';
    });

    console.log('[ResizeAdv] 초기화 완료');
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
        this.originalWidth = img.width;
        this.originalHeight = img.height;
        this.elements.targetWidth.value = img.width;
        this.elements.targetHeight.value = img.height;
        this.elements.originalSize.textContent = `${img.width} × ${img.height}`;
        this.drawPreview(img.width, img.height);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  setPreset(width, height) {
    this.elements.targetWidth.value = width;
    this.elements.targetHeight.value = height;
    this.elements.lockRatio.checked = false;
    if (this.originalImage) this.drawPreview(width, height);
  }

  onWidthChange() {
    if (!this.originalImage) return;
    const width = parseInt(this.elements.targetWidth.value) || 0;
    if (this.elements.lockRatio.checked && width) {
      const ratio = this.originalHeight / this.originalWidth;
      this.elements.targetHeight.value = Math.round(width * ratio);
    }
    this.drawPreview(width, parseInt(this.elements.targetHeight.value) || 0);
  }

  onHeightChange() {
    if (!this.originalImage) return;
    const height = parseInt(this.elements.targetHeight.value) || 0;
    if (this.elements.lockRatio.checked && height) {
      const ratio = this.originalWidth / this.originalHeight;
      this.elements.targetWidth.value = Math.round(height * ratio);
    }
    this.drawPreview(parseInt(this.elements.targetWidth.value) || 0, height);
  }

  scaleByPercent() {
    if (!this.originalImage) return;
    const percent = parseInt(this.elements.scalePercent.value);
    if (!percent) return;
    const width = Math.round(this.originalWidth * percent / 100);
    const height = Math.round(this.originalHeight * percent / 100);
    this.elements.targetWidth.value = width;
    this.elements.targetHeight.value = height;
    this.drawPreview(width, height);
  }

  drawPreview(width, height) {
    if (!this.originalImage || !width || !height) return;
    const canvas = this.elements.previewCanvas;
    const ctx = canvas.getContext('2d');
    const method = this.elements.resampleMethod.value;

    canvas.width = width;
    canvas.height = height;

    ctx.imageSmoothingEnabled = method !== 'pixelated';
    ctx.imageSmoothingQuality = method === 'high-quality' ? 'high' : 'medium';

    ctx.drawImage(this.originalImage, 0, 0, width, height);
    this.elements.resultSize.textContent = `${width} × ${height}`;
  }

  resize() {
    if (!this.originalImage) {
      this.showToast('이미지를 먼저 업로드하세요.', 'warning');
      return;
    }
    const width = parseInt(this.elements.targetWidth.value);
    const height = parseInt(this.elements.targetHeight.value);
    if (!width || !height) {
      this.showToast('크기를 입력하세요.', 'warning');
      return;
    }
    this.drawPreview(width, height);
    this.showSuccess('리사이즈 완료!');
  }

  download() {
    const canvas = this.elements.previewCanvas;
    if (!canvas.width || !canvas.height) {
      this.showToast('리사이즈할 이미지가 없습니다.', 'warning');
      return;
    }

    const format = this.elements.outputFormat.value;
    const quality = parseInt(this.elements.quality.value) / 100;
    const ext = format.split('/')[1];

    const link = document.createElement('a');
    link.download = `resized-${canvas.width}x${canvas.height}.${ext}`;
    link.href = canvas.toDataURL(format, quality);
    link.click();
    this.showSuccess('다운로드 시작!');
  }

  clear() {
    this.originalImage = null;
    this.originalWidth = 0;
    this.originalHeight = 0;
    this.elements.targetWidth.value = '';
    this.elements.targetHeight.value = '';
    this.elements.originalSize.textContent = '-';
    this.elements.resultSize.textContent = '-';
    const canvas = this.elements.previewCanvas;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const resizeAdv = new ResizeAdv();
window.ResizeAdv = resizeAdv;

document.addEventListener('DOMContentLoaded', () => resizeAdv.init());
