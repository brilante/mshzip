/**
 * 이미지 뒤집기 (고급) - ToolBase 기반
 * 수평/수직 뒤집기 및 조합
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var FlipAdv = class FlipAdv extends ToolBase {
  constructor() {
    super('FlipAdv');
    this.originalImage = null;
    this.flipH = false;
    this.flipV = false;
    this.rotation = 0;
  }

  init() {
    this.initElements({
      hStatus: 'hStatus',
      vStatus: 'vStatus',
      rotStatus: 'rotStatus',
      hFlipBtn: 'hFlipBtn',
      vFlipBtn: 'vFlipBtn',
      previewCanvas: 'previewCanvas'
    });

    console.log('[FlipAdv] 초기화 완료');
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
        this.flipH = false;
        this.flipV = false;
        this.rotation = 0;
        this.updateStatus();
        this.render();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  toggleFlip(dir) {
    if (dir === 'h') this.flipH = !this.flipH;
    else this.flipV = !this.flipV;
    this.updateStatus();
    this.render();
  }

  setCombo(h, v) {
    this.flipH = h;
    this.flipV = v;
    this.updateStatus();
    this.render();
  }

  addRotation(deg) {
    this.rotation = (this.rotation + deg) % 360;
    this.updateStatus();
    this.render();
  }

  updateStatus() {
    this.elements.hStatus.textContent = this.flipH ? 'ON' : 'OFF';
    this.elements.vStatus.textContent = this.flipV ? 'ON' : 'OFF';
    this.elements.rotStatus.textContent = this.rotation + '°';

    this.elements.hFlipBtn.classList.toggle('active', this.flipH);
    this.elements.vFlipBtn.classList.toggle('active', this.flipV);
  }

  render() {
    if (!this.originalImage) return;

    const canvas = this.elements.previewCanvas;
    const ctx = canvas.getContext('2d');

    const needsSwap = Math.abs(this.rotation) === 90 || Math.abs(this.rotation) === 270;
    canvas.width = needsSwap ? this.originalImage.height : this.originalImage.width;
    canvas.height = needsSwap ? this.originalImage.width : this.originalImage.height;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(this.rotation * Math.PI / 180);
    ctx.scale(this.flipH ? -1 : 1, this.flipV ? -1 : 1);
    ctx.drawImage(this.originalImage, -this.originalImage.width / 2, -this.originalImage.height / 2);
    ctx.restore();
  }

  download() {
    const canvas = this.elements.previewCanvas;
    if (!canvas.width) {
      this.showToast('이미지를 먼저 업로드하세요.', 'warning');
      return;
    }

    const suffix = [];
    if (this.flipH) suffix.push('h');
    if (this.flipV) suffix.push('v');
    if (this.rotation) suffix.push(this.rotation + 'deg');

    const link = document.createElement('a');
    link.download = `flipped${suffix.length ? '-' + suffix.join('-') : ''}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    this.showSuccess('다운로드 시작!');
  }

  reset() {
    this.flipH = false;
    this.flipV = false;
    this.rotation = 0;
    this.updateStatus();
    if (this.originalImage) this.render();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const flipAdv = new FlipAdv();
window.FlipAdv = flipAdv;

document.addEventListener('DOMContentLoaded', () => flipAdv.init());
