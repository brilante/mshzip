/**
 * 이미지 뒤집기 도구 - ToolBase 기반
 * Canvas API를 사용하여 클라이언트 사이드에서 이미지 뒤집기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ImageFlip = class ImageFlip extends ToolBase {
  constructor() {
    super('ImageFlip');
    this.originalImage = null;
    this.originalFileName = '';
    this.flipH = false;
    this.flipV = false;
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      uploadSection: 'uploadSection',
      controlSection: 'controlSection',
      originalImage: 'originalImage',
      originalInfo: 'originalInfo',
      flippedImage: 'flippedImage',
      flippedInfo: 'flippedInfo',
      flipStatus: 'flipStatus'
    });

    this.setupEventListeners();
    console.log('[ImageFlip] 초기화 완료');
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
        this.flipH = false;
        this.flipV = false;

        this.elements.originalImage.src = e.target.result;
        this.elements.originalInfo.textContent = `${img.width} × ${img.height}px`;
        this.elements.flippedImage.src = e.target.result;
        this.elements.flippedInfo.textContent = `${img.width} × ${img.height}px`;

        this.updateStatus();

        this.elements.uploadSection.style.display = 'none';
        this.elements.controlSection.style.display = 'block';

        this.showSuccess('이미지가 로드되었습니다.');
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }

  flipHorizontal() {
    if (!this.originalImage) return;
    this.flipH = !this.flipH;
    this.applyFlip();
  }

  flipVertical() {
    if (!this.originalImage) return;
    this.flipV = !this.flipV;
    this.applyFlip();
  }

  flipBoth() {
    if (!this.originalImage) return;
    this.flipH = !this.flipH;
    this.flipV = !this.flipV;
    this.applyFlip();
  }

  applyFlip() {
    if (!this.originalImage) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = this.originalImage;

    canvas.width = img.width;
    canvas.height = img.height;

    ctx.translate(
      this.flipH ? canvas.width : 0,
      this.flipV ? canvas.height : 0
    );
    ctx.scale(
      this.flipH ? -1 : 1,
      this.flipV ? -1 : 1
    );

    ctx.drawImage(img, 0, 0);

    const dataUrl = canvas.toDataURL('image/png');
    this.elements.flippedImage.src = dataUrl;
    this.elements.flippedInfo.textContent = `${canvas.width} × ${canvas.height}px`;

    this.updateStatus();
    this.showSuccess('뒤집기 적용!');
  }

  updateStatus() {
    let status = [];
    if (this.flipH) status.push('좌우');
    if (this.flipV) status.push('상하');

    const statusText = status.length > 0
      ? `뒤집기 상태: ${status.join(' + ')} 뒤집기`
      : '뒤집기 상태: 없음';

    this.elements.flipStatus.textContent = statusText;
  }

  reset() {
    if (!this.originalImage) return;

    this.flipH = false;
    this.flipV = false;

    this.elements.flippedImage.src = this.elements.originalImage.src;
    this.updateStatus();
    this.showToast('원본 상태로 초기화되었습니다.', 'info');
  }

  download() {
    const flippedImage = this.elements.flippedImage;
    if (!flippedImage.src || flippedImage.src === '') {
      this.showToast('다운로드할 이미지가 없습니다.', 'warning');
      return;
    }

    const baseName = this.originalFileName.replace(/\.[^/.]+$/, '');
    let suffix = '';
    if (this.flipH) suffix += '_flipH';
    if (this.flipV) suffix += '_flipV';
    if (!suffix) suffix = '_original';

    const fileName = `${baseName}${suffix}.png`;

    const link = document.createElement('a');
    link.href = flippedImage.src;
    link.download = fileName;
    link.click();

    this.showSuccess('다운로드가 시작되었습니다!');
  }

  clear() {
    this.originalImage = null;
    this.originalFileName = '';
    this.flipH = false;
    this.flipV = false;

    this.elements.originalImage.src = '';
    this.elements.flippedImage.src = '';
    this.elements.originalInfo.textContent = '';
    this.elements.flippedInfo.textContent = '';
    this.elements.fileInput.value = '';

    this.updateStatus();

    this.elements.uploadSection.style.display = 'block';
    this.elements.controlSection.style.display = 'none';

    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const imageFlip = new ImageFlip();
window.ImageFlip = imageFlip;

document.addEventListener('DOMContentLoaded', () => imageFlip.init());
