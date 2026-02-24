/**
 * 파비콘 생성 도구 - ToolBase 기반
 * Canvas API를 사용하여 클라이언트 사이드에서 파비콘 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var FaviconGenerator = class FaviconGenerator extends ToolBase {
  constructor() {
    super('FaviconGenerator');
    this.originalImage = null;
    this.originalFileName = '';
    this.generatedFavicons = {};
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      uploadSection: 'uploadSection',
      controlSection: 'controlSection',
      originalImage: 'originalImage',
      originalInfo: 'originalInfo',
      previewGrid: 'previewGrid'
    });

    this.setupEventListeners();
    this.setupSizeOptions();
    console.log('[FaviconGenerator] 초기화 완료');
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

  setupSizeOptions() {
    document.querySelectorAll('.size-option').forEach(option => {
      this.on(option, 'click', () => {
        const checkbox = option.querySelector('input');
        checkbox.checked = !checkbox.checked;
        option.classList.toggle('selected', checkbox.checked);
      });
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

        this.elements.originalImage.src = e.target.result;
        this.elements.originalInfo.textContent = `${img.width} × ${img.height}px`;

        this.elements.uploadSection.style.display = 'none';
        this.elements.controlSection.style.display = 'block';

        this.generate();
        this.showSuccess('이미지가 로드되었습니다.');
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }

  getSelectedSizes() {
    const sizes = [];
    document.querySelectorAll('.size-option input:checked').forEach(input => {
      sizes.push(parseInt(input.value));
    });
    return sizes.sort((a, b) => a - b);
  }

  generate() {
    if (!this.originalImage) {
      this.showToast('이미지를 먼저 선택해주세요.', 'warning');
      return;
    }

    const sizes = this.getSelectedSizes();
    if (sizes.length === 0) {
      this.showToast('생성할 크기를 선택해주세요.', 'warning');
      return;
    }

    this.generatedFavicons = {};
    this.elements.previewGrid.innerHTML = '';

    sizes.forEach(size => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = size;
      canvas.height = size;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const img = this.originalImage;
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

      const dataUrl = canvas.toDataURL('image/png');
      this.generatedFavicons[size] = dataUrl;

      const previewItem = document.createElement('div');
      previewItem.className = 'preview-item';
      previewItem.innerHTML = `
        <img src="${dataUrl}" width="${Math.min(size, 64)}" height="${Math.min(size, 64)}" alt="${size}x${size}">
        <div class="size-text">${size}×${size}</div>
        <button class="tool-btn tool-btn-sm tool-btn-secondary" style="margin-top: 8px;"
                onclick="faviconGenerator.downloadSingle(${size})">
          다운로드
        </button>
      `;
      this.elements.previewGrid.appendChild(previewItem);
    });

    this.showSuccess(`${sizes.length}개의 파비콘이 생성되었습니다!`);
  }

  downloadSingle(size) {
    const dataUrl = this.generatedFavicons[size];
    if (!dataUrl) {
      this.showToast('해당 크기의 파비콘을 먼저 생성해주세요.', 'warning');
      return;
    }

    const fileName = `favicon-${size}x${size}.png`;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    link.click();

    this.showSuccess('다운로드가 시작되었습니다!');
  }

  async downloadAll() {
    const sizes = Object.keys(this.generatedFavicons);
    if (sizes.length === 0) {
      this.showToast('다운로드할 파비콘이 없습니다.', 'warning');
      return;
    }

    if (typeof JSZip === 'undefined') {
      this.showToast('ZIP 라이브러리를 로드하는 중입니다...', 'info');
      await this.loadJSZip();
    }

    const zip = new JSZip();
    const baseName = this.originalFileName.replace(/\.[^/.]+$/, '');

    for (const size of sizes) {
      const dataUrl = this.generatedFavicons[size];
      const base64Data = dataUrl.split(',')[1];
      zip.file(`favicon-${size}x${size}.png`, base64Data, { base64: true });
    }

    const htmlSnippet = this.generateHTMLSnippet(sizes);
    zip.file('favicon-html-snippet.html', htmlSnippet);

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}-favicons.zip`;
    link.click();

    URL.revokeObjectURL(url);
    this.showSuccess('ZIP 파일 다운로드가 시작되었습니다!');
  }

  generateHTMLSnippet(sizes) {
    let snippet = '<!-- 파비콘 HTML 코드 -->\n';
    snippet += '<!-- MyMind3 파비콘 생성기로 생성됨 -->\n\n';

    sizes.forEach(size => {
      if (size === 16 || size === 32 || size === 48) {
        snippet += `<link rel="icon" type="image/png" sizes="${size}x${size}" href="/favicon-${size}x${size}.png">\n`;
      }
      if (size === 180) {
        snippet += `<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180x180.png">\n`;
      }
      if (size === 192) {
        snippet += `<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png">\n`;
      }
      if (size === 512) {
        snippet += `<!-- PWA manifest.json에 추가: -->\n`;
        snippet += `<!-- { "src": "/favicon-512x512.png", "sizes": "512x512", "type": "image/png" } -->\n`;
      }
    });

    return snippet;
  }

  loadJSZip() {
    return new Promise((resolve, reject) => {
      if (typeof JSZip !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  clear() {
    this.originalImage = null;
    this.originalFileName = '';
    this.generatedFavicons = {};

    this.elements.originalImage.src = '';
    this.elements.originalInfo.textContent = '';
    this.elements.previewGrid.innerHTML = '';
    this.elements.fileInput.value = '';

    this.elements.uploadSection.style.display = 'block';
    this.elements.controlSection.style.display = 'none';

    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const faviconGenerator = new FaviconGenerator();
window.FaviconGenerator = faviconGenerator;

document.addEventListener('DOMContentLoaded', () => faviconGenerator.init());
