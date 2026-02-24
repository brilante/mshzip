/**
 * 이미지 포맷 변환 도구 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ImageConvert = class ImageConvert extends ToolBase {
  constructor() {
    super('ImageConvert');
    this.currentFile = null;
    this.originalDataUrl = null;
    this.selectedFormat = null;
    this.convertedBlob = null;
    this.convertedDataUrl = null;
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      settingsSection: 'settingsSection',
      resultSection: 'resultSection',
      originalInfo: 'originalInfo',
      qualitySetting: 'qualitySetting',
      qualitySlider: 'qualitySlider',
      qualityValue: 'qualityValue',
      convertBtn: 'convertBtn',
      originalImage: 'originalImage',
      convertedImage: 'convertedImage',
      originalCompareInfo: 'originalCompareInfo',
      convertedInfo: 'convertedInfo',
      sizeComparison: 'sizeComparison'
    });

    this.setupEventListeners();
    console.log('[ImageConvert] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { dropzone, fileInput, qualitySlider } = this.elements;

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

    document.querySelectorAll('.format-btn').forEach(btn => {
      this.on(btn, 'click', () => this.selectFormat(btn.dataset.format));
    });

    this.on(qualitySlider, 'input', () => {
      this.elements.qualityValue.textContent = qualitySlider.value;
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
        this.showSettings(img.width, img.height);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  showSettings(width, height) {
    this.elements.settingsSection.style.display = 'block';
    this.elements.resultSection.style.display = 'none';

    const ext = this.currentFile.name.split('.').pop().toUpperCase();
    this.elements.originalInfo.innerHTML = `
      <strong>${this.currentFile.name}</strong><br>
      ${width} × ${height}px · ${this.formatFileSize(this.currentFile.size)} · ${ext}
    `;

    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.classList.remove('active', 'disabled');
      const format = btn.dataset.format;
      const currentType = this.currentFile.type;

      if ((format === 'png' && currentType === 'image/png') ||
          (format === 'jpeg' && (currentType === 'image/jpeg' || currentType === 'image/jpg')) ||
          (format === 'webp' && currentType === 'image/webp')) {
        btn.classList.add('disabled');
      }
    });

    this.selectedFormat = null;
    this.elements.convertBtn.disabled = true;
    this.elements.qualitySetting.style.display = 'none';
  }

  selectFormat(format) {
    const btn = document.querySelector(`.format-btn[data-format="${format}"]`);
    if (btn.classList.contains('disabled')) {
      this.showToast('현재 이미 같은 포맷입니다.', 'warning');
      return;
    }

    document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.selectedFormat = format;
    this.elements.convertBtn.disabled = false;

    if (format === 'jpeg' || format === 'webp') {
      this.elements.qualitySetting.style.display = 'block';
    } else {
      this.elements.qualitySetting.style.display = 'none';
    }
  }

  async convert() {
    if (!this.selectedFormat || !this.currentFile) return;

    try {
      const img = await this.loadImage(this.originalDataUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (this.selectedFormat !== 'png') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      const mimeType = `image/${this.selectedFormat}`;
      const quality = this.selectedFormat === 'png' ? 1 : parseInt(this.elements.qualitySlider.value) / 100;

      const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, quality));

      this.convertedBlob = blob;
      this.convertedDataUrl = URL.createObjectURL(blob);
      this.showResult(img.width, img.height);
    } catch (error) {
      console.error('변환 오류:', error);
      this.showToast('변환 중 오류가 발생했습니다.', 'error');
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

  showResult(width, height) {
    this.elements.resultSection.style.display = 'block';
    this.elements.originalImage.src = this.originalDataUrl;
    this.elements.convertedImage.src = this.convertedDataUrl;

    const originalExt = this.currentFile.name.split('.').pop().toUpperCase();
    const newExt = this.selectedFormat.toUpperCase();

    this.elements.originalCompareInfo.innerHTML = `${width} × ${height}px<br>${this.formatFileSize(this.currentFile.size)} · ${originalExt}`;
    this.elements.convertedInfo.innerHTML = `${width} × ${height}px<br>${this.formatFileSize(this.convertedBlob.size)} · ${newExt}`;

    const diff = this.convertedBlob.size - this.currentFile.size;
    const percent = ((diff / this.currentFile.size) * 100).toFixed(1);
    let comparisonText = '';

    if (diff < 0) {
      comparisonText = `<span class="size-decrease">${Math.abs(percent)}% 감소 (${this.formatFileSize(Math.abs(diff))} 절약)</span>`;
    } else if (diff > 0) {
      comparisonText = `<span class="size-increase">${percent}% 증가 (+${this.formatFileSize(diff)})</span>`;
    } else {
      comparisonText = '<span class="size-same">동일한 크기</span>';
    }

    this.elements.sizeComparison.innerHTML = comparisonText;
  }

  download() {
    if (!this.convertedBlob) return;
    const ext = this.selectedFormat === 'jpeg' ? 'jpg' : this.selectedFormat;
    const name = this.currentFile.name.replace(/\.[^.]+$/, '') + `.${ext}`;
    this.downloadFile(this.convertedBlob, name, this.convertedBlob.type);
    this.showSuccess('다운로드되었습니다.');
  }

  clear() {
    this.currentFile = null;
    this.originalDataUrl = null;
    this.selectedFormat = null;
    if (this.convertedDataUrl) URL.revokeObjectURL(this.convertedDataUrl);
    this.convertedBlob = null;
    this.convertedDataUrl = null;
    this.elements.fileInput.value = '';
    this.elements.settingsSection.style.display = 'none';
    this.elements.resultSection.style.display = 'none';
    document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active', 'disabled'));
    this.showSuccess('초기화되었습니다.');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const imageConvert = new ImageConvert();
window.ImageConvert = imageConvert;

document.addEventListener('DOMContentLoaded', () => imageConvert.init());
