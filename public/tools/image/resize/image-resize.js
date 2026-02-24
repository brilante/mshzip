/**
 * 이미지 리사이즈 도구 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ImageResize = class ImageResize extends ToolBase {
  constructor() {
    super('ImageResize');
    this.currentFile = null;
    this.originalDataUrl = null;
    this.originalWidth = 0;
    this.originalHeight = 0;
    this.resizedBlob = null;
    this.resizedDataUrl = null;
    this.keepRatio = true;
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      settingsSection: 'settingsSection',
      resultSection: 'resultSection',
      originalSize: 'originalSize',
      widthInput: 'widthInput',
      heightInput: 'heightInput',
      sizeLink: 'sizeLink',
      originalImage: 'originalImage',
      resizedImage: 'resizedImage',
      originalInfo: 'originalInfo',
      resizedInfo: 'resizedInfo'
    });

    this.setupEventListeners();
    console.log('[ImageResize] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { dropzone, fileInput, widthInput, heightInput, sizeLink } = this.elements;

    this.on(dropzone, 'click', () => fileInput.click());
    this.on(fileInput, 'change', (e) => {
      if (e.target.files.length > 0) this.handleFile(e.target.files[0]);
    });

    this.on(dropzone, 'dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    this.on(dropzone, 'dragleave', () => dropzone.classList.remove('dragover'));
    this.on(dropzone, 'drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) this.handleFile(e.dataTransfer.files[0]);
    });

    this.on(widthInput, 'input', () => this.onWidthChange());
    this.on(heightInput, 'input', () => this.onHeightChange());
    this.on(sizeLink, 'click', () => this.toggleRatio());

    document.querySelectorAll('.preset-btn').forEach(btn => {
      this.on(btn, 'click', () => this.applyPreset(btn.dataset.size));
    });

    this.on(document, 'paste', (e) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            this.handleFile(item.getAsFile());
            break;
          }
        }
      }
    });
  }

  handleFile(file) {
    if (!file.type.startsWith('image/')) {
      this.showToast('이미지 파일만 지원합니다.', 'error');
      return;
    }
    this.currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.originalDataUrl = e.target.result;
      const img = new Image();
      img.onload = () => {
        this.originalWidth = img.width;
        this.originalHeight = img.height;
        this.showSettings();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  showSettings() {
    this.elements.settingsSection.style.display = 'block';
    this.elements.resultSection.style.display = 'none';
    this.elements.originalSize.textContent = `원본: ${this.originalWidth} × ${this.originalHeight}px`;
    this.elements.widthInput.value = this.originalWidth;
    this.elements.heightInput.value = this.originalHeight;
  }

  onWidthChange() {
    if (this.keepRatio && this.elements.widthInput.value) {
      const ratio = this.originalHeight / this.originalWidth;
      this.elements.heightInput.value = Math.round(this.elements.widthInput.value * ratio);
    }
  }

  onHeightChange() {
    if (this.keepRatio && this.elements.heightInput.value) {
      const ratio = this.originalWidth / this.originalHeight;
      this.elements.widthInput.value = Math.round(this.elements.heightInput.value * ratio);
    }
  }

  toggleRatio() {
    this.keepRatio = !this.keepRatio;
    this.elements.sizeLink.textContent = this.keepRatio ? '' : '';
    this.elements.sizeLink.title = this.keepRatio ? '비율 유지' : '비율 해제';
  }

  applyPreset(size) {
    if (size.endsWith('%')) {
      const percent = parseInt(size) / 100;
      this.elements.widthInput.value = Math.round(this.originalWidth * percent);
      this.elements.heightInput.value = Math.round(this.originalHeight * percent);
    } else {
      const maxSize = parseInt(size);
      if (this.originalWidth > this.originalHeight) {
        this.elements.widthInput.value = maxSize;
        this.elements.heightInput.value = Math.round(this.originalHeight * (maxSize / this.originalWidth));
      } else {
        this.elements.heightInput.value = maxSize;
        this.elements.widthInput.value = Math.round(this.originalWidth * (maxSize / this.originalHeight));
      }
    }
  }

  async resize() {
    const newWidth = parseInt(this.elements.widthInput.value);
    const newHeight = parseInt(this.elements.heightInput.value);

    if (!newWidth || !newHeight || newWidth < 1 || newHeight < 1) {
      this.showToast('올바른 크기를 입력하세요.', 'warning');
      return;
    }

    try {
      const img = await this.loadImage(this.originalDataUrl);
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      const mimeType = this.currentFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, 0.92));

      this.resizedBlob = blob;
      this.resizedDataUrl = URL.createObjectURL(blob);
      this.showResult(newWidth, newHeight);
    } catch (error) {
      console.error('리사이즈 오류:', error);
      this.showToast('리사이즈 중 오류가 발생했습니다.', 'error');
    }
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  showResult(newWidth, newHeight) {
    this.elements.resultSection.style.display = 'block';
    this.elements.originalImage.src = this.originalDataUrl;
    this.elements.originalInfo.innerHTML = `${this.originalWidth} × ${this.originalHeight}px<br>${this.formatFileSize(this.currentFile.size)}`;
    this.elements.resizedImage.src = this.resizedDataUrl;
    this.elements.resizedInfo.innerHTML = `${newWidth} × ${newHeight}px<br>${this.formatFileSize(this.resizedBlob.size)}`;
  }

  download() {
    if (!this.resizedBlob) return;
    const ext = this.resizedBlob.type.split('/')[1];
    const name = this.currentFile.name.replace(/\.[^.]+$/, '') + `_${this.elements.widthInput.value}x${this.elements.heightInput.value}.${ext}`;
    this.downloadFile(this.resizedBlob, name, this.resizedBlob.type);
    this.showSuccess('다운로드되었습니다.');
  }

  clear() {
    this.currentFile = null;
    this.originalDataUrl = null;
    if (this.resizedDataUrl) URL.revokeObjectURL(this.resizedDataUrl);
    this.resizedBlob = null;
    this.resizedDataUrl = null;
    this.elements.fileInput.value = '';
    this.elements.settingsSection.style.display = 'none';
    this.elements.resultSection.style.display = 'none';
    this.showSuccess('초기화되었습니다.');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const imageResize = new ImageResize();
window.ImageResize = imageResize;

document.addEventListener('DOMContentLoaded', () => imageResize.init());
