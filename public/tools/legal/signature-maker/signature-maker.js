/**
 * 전자서명 생성기 - ToolBase 기반
 * 손글씨/텍스트 서명 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SignatureMaker = class SignatureMaker extends ToolBase {
  constructor() {
    super('SignatureMaker');
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
    this.currentMode = 'draw';
    this.currentColor = '#000000';
    this.textColor = '#000000';
    this.paths = [];
    this.currentPath = [];
  }

  init() {
    this.initElements({
      signatureCanvas: 'signatureCanvas',
      drawMode: 'drawMode',
      textMode: 'textMode',
      signatureName: 'signatureName',
      fontStyle: 'fontStyle',
      textSignaturePreview: 'textSignaturePreview'
    });

    this.canvas = this.elements.signatureCanvas;
    this.ctx = this.canvas.getContext('2d');

    // 캔버스 이벤트
    this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
    this.canvas.addEventListener('mousemove', this.draw.bind(this));
    this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
    this.canvas.addEventListener('mouseleave', this.stopDrawing.bind(this));

    // 터치 이벤트
    this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
    this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));

    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    console.log('[SignatureMaker] 초기화 완료');
    return this;
  }

  handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (e.type === 'touchstart') {
      this.startDrawing({ offsetX: x, offsetY: y });
    } else if (e.type === 'touchmove') {
      this.draw({ offsetX: x, offsetY: y });
    }
  }

  startDrawing(e) {
    this.isDrawing = true;
    this.currentPath = [{ x: e.offsetX, y: e.offsetY }];
    this.ctx.beginPath();
    this.ctx.moveTo(e.offsetX, e.offsetY);
  }

  draw(e) {
    if (!this.isDrawing) return;

    this.currentPath.push({ x: e.offsetX, y: e.offsetY });
    this.ctx.lineTo(e.offsetX, e.offsetY);
    this.ctx.stroke();
  }

  stopDrawing() {
    if (this.isDrawing && this.currentPath.length > 0) {
      this.paths.push({
        points: this.currentPath,
        color: this.currentColor
      });
    }
    this.isDrawing = false;
  }

  setMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    this.elements.drawMode.style.display = mode === 'draw' ? 'block' : 'none';
    this.elements.textMode.style.display = mode === 'text' ? 'block' : 'none';
  }

  setColor(color) {
    this.currentColor = color;
    this.ctx.strokeStyle = color;
    document.querySelectorAll('#drawMode .color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });
  }

  setTextColor(color) {
    this.textColor = color;
    document.querySelectorAll('#textMode .color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });
    this.updateTextSignature();
  }

  updateTextSignature() {
    const name = this.elements.signatureName.value || '서명을 입력하세요';
    const font = this.elements.fontStyle.value;
    const preview = this.elements.textSignaturePreview;
    preview.style.fontFamily = font;
    preview.style.color = this.textColor;
    preview.textContent = name;
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.paths = [];
    this.showToast('서명이 지워졌습니다', 'info');
  }

  download(format) {
    if (this.currentMode === 'draw') {
      this.downloadDrawn(format);
    } else {
      this.downloadText(format);
    }
  }

  downloadDrawn(format) {
    if (this.paths.length === 0) {
      this.showToast('서명을 먼저 그려주세요', 'error');
      return;
    }

    if (format === 'png') {
      const link = document.createElement('a');
      link.download = 'signature.png';
      link.href = this.canvas.toDataURL('image/png');
      link.click();
    } else {
      // SVG 생성
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${this.canvas.width}" height="${this.canvas.height}">`;
      this.paths.forEach(path => {
        if (path.points.length > 1) {
          let d = `M ${path.points[0].x} ${path.points[0].y}`;
          for (let i = 1; i < path.points.length; i++) {
            d += ` L ${path.points[i].x} ${path.points[i].y}`;
          }
          svg += `<path d="${d}" stroke="${path.color}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
        }
      });
      svg += '</svg>';

      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const link = document.createElement('a');
      link.download = 'signature.svg';
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    }

    this.showToast('서명이 다운로드되었습니다', 'success');
  }

  downloadText(format) {
    const name = this.elements.signatureName.value;
    if (!name) {
      this.showToast('서명 이름을 입력해주세요', 'error');
      return;
    }

    const font = this.elements.fontStyle.value;

    // 임시 캔버스 생성
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 600;
    tempCanvas.height = 200;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    tempCtx.font = `60px ${font}`;
    tempCtx.fillStyle = this.textColor;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillText(name, tempCanvas.width / 2, tempCanvas.height / 2);

    if (format === 'png') {
      const link = document.createElement('a');
      link.download = 'signature.png';
      link.href = tempCanvas.toDataURL('image/png');
      link.click();
    } else {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200">
        <rect width="100%" height="100%" fill="white"/>
        <text x="50%" y="50%" font-family="${font}" font-size="60" fill="${this.textColor}" text-anchor="middle" dominant-baseline="middle">${name}</text>
      </svg>`;

      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const link = document.createElement('a');
      link.download = 'signature.svg';
      link.href = URL.createObjectURL(blob);
      link.click();
      URL.revokeObjectURL(link.href);
    }

    this.showToast('서명이 다운로드되었습니다', 'success');
  }
}

// 전역 인스턴스 생성
const signatureMaker = new SignatureMaker();
window.SignatureMaker = signatureMaker;

// 전역 함수 (HTML onclick 호환)
function setMode(mode) { signatureMaker.setMode(mode); }
function setColor(color) { signatureMaker.setColor(color); }
function setTextColor(color) { signatureMaker.setTextColor(color); }
function updateTextSignature() { signatureMaker.updateTextSignature(); }
function clear() { signatureMaker.clear(); }
function download(format) { signatureMaker.download(format); }

document.addEventListener('DOMContentLoaded', () => signatureMaker.init());
