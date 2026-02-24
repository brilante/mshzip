/**
 * 파비콘 생성 (고급) - ToolBase 기반
 * 다양한 크기의 파비콘 일괄 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var FaviconAdv = class FaviconAdv extends ToolBase {
  constructor() {
    super('FaviconAdv');
    this.originalImage = null;
    this.selectedSizes = [16, 32, 48, 64, 128, 180, 192, 512];
    this.canvases = {};
  }

  init() {
    this.initElements({
      previewGrid: 'previewGrid',
      htmlCode: 'htmlCode'
    });

    console.log('[FaviconAdv] 초기화 완료');
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
        this.generatePreviews();
        this.generateHtmlCode();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  toggleSize(btn) {
    const size = parseInt(btn.dataset.size);
    btn.classList.toggle('active');

    if (btn.classList.contains('active')) {
      if (!this.selectedSizes.includes(size)) this.selectedSizes.push(size);
    } else {
      this.selectedSizes = this.selectedSizes.filter(s => s !== size);
    }
    this.selectedSizes.sort((a, b) => a - b);

    if (this.originalImage) {
      this.generatePreviews();
      this.generateHtmlCode();
    }
  }

  generatePreviews() {
    const grid = this.elements.previewGrid;
    grid.innerHTML = '';
    this.canvases = {};

    this.selectedSizes.forEach(size => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.originalImage, 0, 0, size, size);

      this.canvases[size] = canvas;

      const item = document.createElement('div');
      item.className = 'preview-item';

      const displaySize = Math.min(size, 64);
      const displayCanvas = document.createElement('canvas');
      displayCanvas.width = displaySize;
      displayCanvas.height = displaySize;
      displayCanvas.style.width = displaySize + 'px';
      displayCanvas.style.height = displaySize + 'px';
      displayCanvas.getContext('2d').drawImage(canvas, 0, 0, displaySize, displaySize);

      const label = document.createElement('div');
      label.className = 'preview-label';
      label.textContent = `${size}×${size}`;

      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'tool-btn tool-btn-secondary tool-btn-sm';
      downloadBtn.style.marginTop = '0.5rem';
      downloadBtn.textContent = '다운로드';
      downloadBtn.onclick = () => this.downloadSingle(size);

      item.appendChild(displayCanvas);
      item.appendChild(label);
      item.appendChild(downloadBtn);
      grid.appendChild(item);
    });
  }

  generateHtmlCode() {
    let html = '<!-- Favicon -->\n';
    html += '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">\n';
    html += '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">\n';

    if (this.selectedSizes.includes(180)) {
      html += '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">\n';
    }

    if (this.selectedSizes.includes(192)) {
      html += '<link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">\n';
    }

    if (this.selectedSizes.includes(512)) {
      html += '<link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">\n';
    }

    this.elements.htmlCode.textContent = html;
  }

  downloadSingle(size) {
    const canvas = this.canvases[size];
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `favicon-${size}x${size}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    this.showSuccess(`${size}x${size} 다운로드!`);
  }

  async downloadAll() {
    if (!this.originalImage || this.selectedSizes.length === 0) {
      this.showToast('이미지를 먼저 업로드하세요.', 'warning');
      return;
    }

    const zip = new JSZip();

    for (const size of this.selectedSizes) {
      const canvas = this.canvases[size];
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];

      let filename;
      if (size === 180) filename = 'apple-touch-icon.png';
      else if (size === 192) filename = 'android-chrome-192x192.png';
      else if (size === 512) filename = 'android-chrome-512x512.png';
      else filename = `favicon-${size}x${size}.png`;

      zip.file(filename, base64, { base64: true });
    }

    const htmlCode = this.elements.htmlCode.textContent;
    zip.file('favicon-html.txt', htmlCode);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'favicons.zip';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);

    this.showSuccess('ZIP 다운로드 시작!');
  }

  async copyHtml() {
    const html = this.elements.htmlCode.textContent;
    try {
      await navigator.clipboard.writeText(html);
      this.showSuccess('HTML 복사됨!');
    } catch {
      this.showError('복사 실패');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const faviconAdv = new FaviconAdv();
window.FaviconAdv = faviconAdv;

document.addEventListener('DOMContentLoaded', () => faviconAdv.init());
