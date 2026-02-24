/**
 * 워터마크 추가 도구 - ToolBase 기반
 * Canvas API로 이미지에 텍스트 워터마크 추가
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var Watermark = class Watermark extends ToolBase {
  constructor() {
    super('Watermark');
    this.originalImage = null;
    this.originalFileName = '';
    this.position = 'bottom-right';
    this.canvas = null;
    this.ctx = null;
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      uploadSection: 'uploadSection',
      controlSection: 'controlSection',
      previewCanvas: 'previewCanvas',
      watermarkText: 'watermarkText',
      fontSize: 'fontSize',
      fontColor: 'fontColor',
      opacity: 'opacity',
      rotation: 'rotation'
    });

    this.canvas = this.elements.previewCanvas;
    this.ctx = this.canvas.getContext('2d');

    this.setupEventListeners();
    this.setupControls();
    console.log('[Watermark] 초기화 완료');
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

  setupControls() {
    // 위치 버튼
    document.querySelectorAll('.position-btn').forEach(btn => {
      this.on(btn, 'click', () => {
        document.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.position = btn.dataset.pos;
        this.apply();
      });
    });

    // 실시간 업데이트
    const { watermarkText, fontSize, fontColor, opacity, rotation } = this.elements;
    this.on(watermarkText, 'input', () => this.apply());
    this.on(fontSize, 'input', () => this.apply());
    this.on(fontColor, 'input', () => this.apply());
    this.on(opacity, 'input', () => this.apply());
    this.on(rotation, 'input', () => this.apply());
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
        this.elements.uploadSection.style.display = 'none';
        this.elements.controlSection.style.display = 'block';
        this.apply();
        this.showSuccess('이미지가 로드되었습니다.');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  apply() {
    if (!this.originalImage) return;

    const img = this.originalImage;
    this.canvas.width = img.width;
    this.canvas.height = img.height;

    // 원본 이미지 그리기
    this.ctx.drawImage(img, 0, 0);

    // 워터마크 설정
    const text = this.elements.watermarkText.value || '워터마크';
    const fontSize = parseInt(this.elements.fontSize.value) || 24;
    const fontColor = this.elements.fontColor.value;
    const opacity = parseInt(this.elements.opacity.value) / 100;
    const rotation = parseInt(this.elements.rotation.value) || 0;

    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.font = `${fontSize}px Arial, sans-serif`;
    this.ctx.fillStyle = fontColor;

    // 텍스트 크기 측정
    const metrics = this.ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // 위치 계산
    let x, y;
    const padding = 20;

    switch (this.position) {
      case 'top-left':
        x = padding; y = padding + textHeight;
        break;
      case 'top-center':
        x = (img.width - textWidth) / 2; y = padding + textHeight;
        break;
      case 'top-right':
        x = img.width - textWidth - padding; y = padding + textHeight;
        break;
      case 'middle-left':
        x = padding; y = img.height / 2;
        break;
      case 'middle-center':
        x = (img.width - textWidth) / 2; y = img.height / 2;
        break;
      case 'middle-right':
        x = img.width - textWidth - padding; y = img.height / 2;
        break;
      case 'bottom-left':
        x = padding; y = img.height - padding;
        break;
      case 'bottom-center':
        x = (img.width - textWidth) / 2; y = img.height - padding;
        break;
      case 'bottom-right':
      default:
        x = img.width - textWidth - padding; y = img.height - padding;
    }

    // 회전 적용
    if (rotation !== 0) {
      const centerX = x + textWidth / 2;
      const centerY = y - textHeight / 2;
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(rotation * Math.PI / 180);
      this.ctx.translate(-centerX, -centerY);
    }

    // 그림자 효과
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;

    // 텍스트 그리기
    this.ctx.fillText(text, x, y);
    this.ctx.restore();
  }

  download() {
    if (!this.originalImage) {
      this.showToast('이미지를 먼저 선택해주세요.', 'warning');
      return;
    }

    const baseName = this.originalFileName.replace(/\.[^/.]+$/, '');
    const link = document.createElement('a');
    link.href = this.canvas.toDataURL('image/png');
    link.download = `${baseName}_watermarked.png`;
    link.click();

    this.showSuccess('다운로드 시작!');
  }

  clear() {
    this.originalImage = null;
    this.originalFileName = '';
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.elements.fileInput.value = '';
    this.elements.uploadSection.style.display = 'block';
    this.elements.controlSection.style.display = 'none';
    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const watermark = new Watermark();
window.Watermark = watermark;

document.addEventListener('DOMContentLoaded', () => watermark.init());
