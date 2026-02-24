/**
 * 이미지 압축 도구 - ToolBase 기반
 * Canvas API를 사용한 클라이언트 측 이미지 압축
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ImageCompress = class ImageCompress extends ToolBase {
  constructor() {
    super('ImageCompress');
    this.currentFile = null;
    this.originalDataUrl = null;
    this.compressedBlob = null;
    this.compressedDataUrl = null;
    this.maxFileSize = 20 * 1024 * 1024; // 20MB
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      settingsSection: 'settingsSection',
      resultSection: 'resultSection',
      qualitySlider: 'qualitySlider',
      qualityValue: 'qualityValue',
      outputFormat: 'outputFormat',
      maxSize: 'maxSize',
      originalImage: 'originalImage',
      compressedImage: 'compressedImage',
      originalInfo: 'originalInfo',
      compressedInfo: 'compressedInfo',
      savingsInfo: 'savingsInfo'
    });

    this.setupEventListeners();
    console.log('[ImageCompress] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { dropzone, fileInput, qualitySlider } = this.elements;

    this.on(dropzone, 'click', () => fileInput.click());
    this.on(fileInput, 'change', (e) => {
      if (e.target.files.length > 0) this.handleFile(e.target.files[0]);
    });

    this.on(dropzone, 'dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    this.on(dropzone, 'dragleave', () => dropzone.classList.remove('dragover'));
    this.on(dropzone, 'drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) this.handleFile(e.dataTransfer.files[0]);
    });

    this.on(qualitySlider, 'input', (e) => {
      this.elements.qualityValue.textContent = e.target.value + '%';
    });

    this.on(document, 'paste', (e) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              this.handleFile(file);
              break;
            }
          }
        }
      }
    });
  }

  handleFile(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      this.showToast('PNG, JPG, WebP 이미지만 지원합니다.', 'error');
      return;
    }

    if (file.size > this.maxFileSize) {
      this.showToast('파일 크기가 20MB를 초과합니다.', 'error');
      return;
    }

    this.currentFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.originalDataUrl = e.target.result;
      this.showSettings();
    };
    reader.readAsDataURL(file);
  }

  showSettings() {
    this.elements.settingsSection.style.display = 'block';
    this.elements.resultSection.style.display = 'none';

    if (this.currentFile.type === 'image/png') {
      this.elements.outputFormat.value = 'png';
    } else if (this.currentFile.type === 'image/webp') {
      this.elements.outputFormat.value = 'webp';
    } else {
      this.elements.outputFormat.value = 'jpeg';
    }
  }

  async compress() {
    if (!this.originalDataUrl) {
      this.showToast('이미지를 먼저 선택해주세요.', 'warning');
      return;
    }

    const quality = parseInt(this.elements.qualitySlider.value) / 100;
    const outputFormat = this.elements.outputFormat.value;
    const maxSize = parseInt(this.elements.maxSize.value);

    try {
      const img = await this.loadImage(this.originalDataUrl);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let width = img.width;
      let height = img.height;

      if (maxSize > 0 && (width > maxSize || height > maxSize)) {
        if (width > height) {
          height = Math.round(height * (maxSize / width));
          width = maxSize;
        } else {
          width = Math.round(width * (maxSize / height));
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      let mimeType;
      if (outputFormat === 'auto') {
        mimeType = this.currentFile.type;
      } else {
        mimeType = `image/${outputFormat}`;
      }

      const qualityParam = mimeType === 'image/png' ? undefined : quality;

      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, mimeType, qualityParam);
      });

      this.compressedBlob = blob;
      this.compressedDataUrl = URL.createObjectURL(blob);
      this.showResult(img.width, img.height, width, height, mimeType);

    } catch (error) {
      console.error('압축 오류:', error);
      this.showToast('이미지 압축 중 오류가 발생했습니다.', 'error');
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

  showResult(origW, origH, newW, newH, mimeType) {
    this.elements.resultSection.style.display = 'block';

    this.elements.originalImage.src = this.originalDataUrl;
    this.elements.originalInfo.innerHTML = `
      <div>${origW} × ${origH}px</div>
      <div>${this.formatFileSize(this.currentFile.size)}</div>
      <div>${this.currentFile.type}</div>
    `;

    this.elements.compressedImage.src = this.compressedDataUrl;
    this.elements.compressedInfo.innerHTML = `
      <div>${newW} × ${newH}px</div>
      <div>${this.formatFileSize(this.compressedBlob.size)}</div>
      <div>${mimeType}</div>
    `;

    const savings = this.currentFile.size - this.compressedBlob.size;
    const percent = Math.round((savings / this.currentFile.size) * 100);

    if (savings > 0) {
      this.elements.savingsInfo.innerHTML = `
        <span class="savings-positive">${this.formatFileSize(savings)} 절약 (${percent}% 감소)</span>
      `;
    } else {
      this.elements.savingsInfo.innerHTML = `
        <span class="savings-negative">크기가 증가했습니다. 품질을 낮추거나 다른 포맷을 시도하세요.</span>
      `;
    }
  }

  download() {
    if (!this.compressedBlob) {
      this.showToast('압축된 이미지가 없습니다.', 'warning');
      return;
    }

    const format = this.compressedBlob.type.split('/')[1];
    const originalName = this.currentFile.name.replace(/\.[^.]+$/, '');
    const filename = `${originalName}_compressed.${format}`;

    this.downloadFile(this.compressedBlob, filename, this.compressedBlob.type);
    this.showSuccess('이미지가 다운로드되었습니다.');
  }

  clear() {
    this.currentFile = null;
    this.originalDataUrl = null;
    if (this.compressedDataUrl) {
      URL.revokeObjectURL(this.compressedDataUrl);
    }
    this.compressedBlob = null;
    this.compressedDataUrl = null;

    this.elements.fileInput.value = '';
    this.elements.settingsSection.style.display = 'none';
    this.elements.resultSection.style.display = 'none';
    this.elements.qualitySlider.value = 80;
    this.elements.qualityValue.textContent = '80%';

    this.showSuccess('초기화되었습니다.');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const imageCompress = new ImageCompress();
window.ImageCompress = imageCompress;

document.addEventListener('DOMContentLoaded', () => imageCompress.init());
