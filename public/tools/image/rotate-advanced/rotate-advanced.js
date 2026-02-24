/**
 * 이미지 회전 (고급) - ToolBase 기반
 * 자유 각도 회전 및 프리셋
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var RotateAdv = class RotateAdv extends ToolBase {
  constructor() {
    super('RotateAdv');
    this.originalImage = null;
    this.currentAngle = 0;
  }

  init() {
    this.initElements({
      angleSlider: 'angleSlider',
      angleInput: 'angleInput',
      angleValue: 'angleValue',
      expandCanvas: 'expandCanvas',
      bgColor: 'bgColor',
      previewCanvas: 'previewCanvas'
    });

    console.log('[RotateAdv] 초기화 완료');
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
        this.currentAngle = 0;
        this.updateInputs();
        this.rotate();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  setAngle(angle) {
    this.currentAngle = angle;
    this.updateInputs();
    this.rotate();
  }

  onSliderChange() {
    this.currentAngle = parseInt(this.elements.angleSlider.value);
    this.elements.angleInput.value = this.currentAngle;
    this.elements.angleValue.textContent = this.currentAngle;
    this.rotate();
  }

  onInputChange() {
    this.currentAngle = parseInt(this.elements.angleInput.value) || 0;
    this.elements.angleSlider.value = Math.max(-180, Math.min(180, this.currentAngle));
    this.elements.angleValue.textContent = this.currentAngle;
    this.rotate();
  }

  updateInputs() {
    this.elements.angleSlider.value = Math.max(-180, Math.min(180, this.currentAngle));
    this.elements.angleInput.value = this.currentAngle;
    this.elements.angleValue.textContent = this.currentAngle;
  }

  rotate() {
    if (!this.originalImage) return;

    const canvas = this.elements.previewCanvas;
    const ctx = canvas.getContext('2d');
    const expand = this.elements.expandCanvas.checked;
    const bgColor = this.elements.bgColor.value;
    const radians = this.currentAngle * Math.PI / 180;

    let w = this.originalImage.width;
    let h = this.originalImage.height;

    if (expand) {
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      w = Math.ceil(this.originalImage.width * cos + this.originalImage.height * sin);
      h = Math.ceil(this.originalImage.width * sin + this.originalImage.height * cos);
    }

    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    ctx.translate(w / 2, h / 2);
    ctx.rotate(radians);
    ctx.drawImage(this.originalImage, -this.originalImage.width / 2, -this.originalImage.height / 2);
  }

  download() {
    const canvas = this.elements.previewCanvas;
    if (!canvas.width) {
      this.showToast('이미지를 먼저 업로드하세요.', 'warning');
      return;
    }

    const link = document.createElement('a');
    link.download = `rotated-${this.currentAngle}deg.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    this.showSuccess('다운로드 시작!');
  }

  reset() {
    this.currentAngle = 0;
    this.updateInputs();
    if (this.originalImage) this.rotate();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const rotateAdv = new RotateAdv();
window.RotateAdv = rotateAdv;

document.addEventListener('DOMContentLoaded', () => rotateAdv.init());
