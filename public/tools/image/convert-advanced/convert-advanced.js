/**
 * 이미지 포맷 변환 (고급) - ToolBase 기반
 * 다양한 포맷으로 변환 및 품질 설정
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ConvertAdv = class ConvertAdv extends ToolBase {
  constructor() {
    super('ConvertAdv');
    this.originalImage = null;
    this.originalFileSize = 0;
    this.selectedFormat = 'image/png';
  }

  init() {
    this.initElements({
      fileInfo: 'fileInfo',
      previewImage: 'previewImage',
      originalFileSize: 'originalFileSize',
      convertedFileSize: 'convertedFileSize',
      sizeChange: 'sizeChange',
      compareRow: 'compareRow',
      qualityGroup: 'qualityGroup',
      quality: 'quality',
      preserveTransparency: 'preserveTransparency',
      convertCanvas: 'convertCanvas'
    });

    console.log('[ConvertAdv] 초기화 완료');
    return this;
  }

  loadImage(input) {
    const file = input.files[0];
    if (!file) return;

    this.originalFileSize = file.size;
    this.elements.fileInfo.textContent =
      `${file.name} (${this.formatFileSize(file.size)}, ${file.type})`;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.originalImage = img;
        this.elements.previewImage.src = e.target.result;
        this.elements.previewImage.style.display = 'block';
        this.elements.originalFileSize.textContent = this.formatFileSize(file.size);
        this.updatePreview();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  setFormat(btn) {
    document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.selectedFormat = btn.dataset.format;

    this.elements.qualityGroup.style.display =
      ['image/png', 'image/gif', 'image/bmp', 'image/ico'].includes(this.selectedFormat) ? 'none' : 'block';

    this.updatePreview();
  }

  updatePreview() {
    if (!this.originalImage) return;

    const canvas = this.elements.convertCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = this.originalImage.width;
    canvas.height = this.originalImage.height;

    const preserveTransparency = this.elements.preserveTransparency.checked;
    if (!preserveTransparency && this.selectedFormat === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(this.originalImage, 0, 0);

    const quality = parseInt(this.elements.quality.value) / 100;
    const dataUrl = canvas.toDataURL(this.selectedFormat, quality);
    const convertedSize = Math.round((dataUrl.length - 22) * 3 / 4);

    this.elements.convertedFileSize.textContent = this.formatFileSize(convertedSize);

    const change = ((convertedSize - this.originalFileSize) / this.originalFileSize * 100).toFixed(1);
    this.elements.sizeChange.textContent = (change >= 0 ? '+' : '') + change + '%';
    this.elements.sizeChange.style.color = change < 0 ? 'var(--tools-success)' : (change > 0 ? 'var(--tools-error)' : '');

    this.elements.compareRow.style.display = 'flex';
  }

  convert() {
    if (!this.originalImage) {
      this.showToast('이미지를 먼저 업로드하세요.', 'warning');
      return;
    }

    const canvas = this.elements.convertCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = this.originalImage.width;
    canvas.height = this.originalImage.height;

    const preserveTransparency = this.elements.preserveTransparency.checked;
    if (!preserveTransparency && this.selectedFormat === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(this.originalImage, 0, 0);

    const quality = parseInt(this.elements.quality.value) / 100;
    const ext = this.getExtension(this.selectedFormat);

    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `converted.${ext}`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      this.showSuccess('변환 완료!');
    }, this.selectedFormat, quality);
  }

  getExtension(mimeType) {
    const map = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/bmp': 'bmp',
      'image/ico': 'ico',
      'image/avif': 'avif',
      'image/tiff': 'tiff'
    };
    return map[mimeType] || 'png';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const convertAdv = new ConvertAdv();
window.ConvertAdv = convertAdv;

document.addEventListener('DOMContentLoaded', () => convertAdv.init());
