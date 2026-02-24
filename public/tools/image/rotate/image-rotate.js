/**
 * 이미지 회전 도구 - ToolBase 기반
 * Canvas API를 사용하여 클라이언트 사이드에서 이미지 회전
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ImageRotate = class ImageRotate extends ToolBase {
  constructor() {
    super('ImageRotate');
    this.originalImage = null;
    this.originalFileName = '';
    this.currentAngle = 0;
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      uploadSection: 'uploadSection',
      controlSection: 'controlSection',
      originalImage: 'originalImage',
      originalInfo: 'originalInfo',
      rotatedImage: 'rotatedImage',
      rotatedInfo: 'rotatedInfo',
      currentAngle: 'currentAngle',
      customAngle: 'customAngle'
    });

    this.setupEventListeners();
    console.log('[ImageRotate] 초기화 완료');
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
        this.currentAngle = 0;

        this.elements.originalImage.src = e.target.result;
        this.elements.originalInfo.textContent = `${img.width} × ${img.height}px`;
        this.elements.rotatedImage.src = e.target.result;
        this.elements.rotatedInfo.textContent = `${img.width} × ${img.height}px`;
        this.elements.currentAngle.textContent = '0';

        this.elements.uploadSection.style.display = 'none';
        this.elements.controlSection.style.display = 'block';

        this.showSuccess('이미지가 로드되었습니다.');
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }

  rotate(angle) {
    if (!this.originalImage) return;

    this.currentAngle = (this.currentAngle + angle) % 360;
    if (this.currentAngle < 0) this.currentAngle += 360;

    this.applyRotation();
  }

  applyCustomAngle() {
    const angle = parseInt(this.elements.customAngle.value) || 0;
    this.currentAngle = ((angle % 360) + 360) % 360;
    this.applyRotation();
    this.elements.customAngle.value = 0;
  }

  applyRotation() {
    if (!this.originalImage) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = this.originalImage;
    const radians = (this.currentAngle * Math.PI) / 180;

    const is90Degree = this.currentAngle % 90 === 0;

    if (is90Degree && (this.currentAngle === 90 || this.currentAngle === 270)) {
      canvas.width = img.height;
      canvas.height = img.width;
    } else if (is90Degree) {
      canvas.width = img.width;
      canvas.height = img.height;
    } else {
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      canvas.width = Math.ceil(img.width * cos + img.height * sin);
      canvas.height = Math.ceil(img.width * sin + img.height * cos);
    }

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(radians);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    const dataUrl = canvas.toDataURL('image/png');
    this.elements.rotatedImage.src = dataUrl;
    this.elements.rotatedInfo.textContent = `${canvas.width} × ${canvas.height}px`;
    this.elements.currentAngle.textContent = this.currentAngle;

    this.showSuccess(`${this.currentAngle}° 회전 적용!`);
  }

  reset() {
    if (!this.originalImage) return;

    this.currentAngle = 0;
    const img = this.originalImage;

    this.elements.rotatedImage.src = this.elements.originalImage.src;
    this.elements.rotatedInfo.textContent = `${img.width} × ${img.height}px`;
    this.elements.currentAngle.textContent = '0';

    this.showToast('원본 상태로 초기화되었습니다.', 'info');
  }

  download() {
    const rotatedImage = this.elements.rotatedImage;
    if (!rotatedImage.src || rotatedImage.src === '') {
      this.showToast('다운로드할 이미지가 없습니다.', 'warning');
      return;
    }

    const baseName = this.originalFileName.replace(/\.[^/.]+$/, '');
    const fileName = `${baseName}_rotated_${this.currentAngle}deg.png`;

    const link = document.createElement('a');
    link.href = rotatedImage.src;
    link.download = fileName;
    link.click();

    this.showSuccess('다운로드가 시작되었습니다!');
  }

  clear() {
    this.originalImage = null;
    this.originalFileName = '';
    this.currentAngle = 0;

    this.elements.originalImage.src = '';
    this.elements.rotatedImage.src = '';
    this.elements.originalInfo.textContent = '';
    this.elements.rotatedInfo.textContent = '';
    this.elements.currentAngle.textContent = '0';
    this.elements.fileInput.value = '';

    this.elements.uploadSection.style.display = 'block';
    this.elements.controlSection.style.display = 'none';

    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const imageRotate = new ImageRotate();
window.ImageRotate = imageRotate;

document.addEventListener('DOMContentLoaded', () => imageRotate.init());
