/**
 * 흑백 변환 도구 - ToolBase 기반
 * Canvas API를 사용하여 클라이언트 사이드에서 이미지 필터 적용
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ImageGrayscale = class ImageGrayscale extends ToolBase {
  constructor() {
    super('ImageGrayscale');
    this.originalImage = null;
    this.originalFileName = '';
    this.currentFilter = 'grayscale';
    this.intensity = 100;
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      uploadSection: 'uploadSection',
      controlSection: 'controlSection',
      originalImage: 'originalImage',
      originalInfo: 'originalInfo',
      filteredImage: 'filteredImage',
      filteredInfo: 'filteredInfo',
      intensitySlider: 'intensitySlider',
      intensityValue: 'intensityValue',
      currentFilter: 'currentFilter'
    });

    this.setupEventListeners();
    console.log('[ImageGrayscale] 초기화 완료');
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
        this.currentFilter = 'grayscale';
        this.intensity = 100;

        this.elements.originalImage.src = e.target.result;
        this.elements.originalInfo.textContent = `${img.width} × ${img.height}px`;
        this.elements.filteredImage.src = e.target.result;
        this.elements.filteredInfo.textContent = `${img.width} × ${img.height}px`;
        this.elements.intensitySlider.value = 100;
        this.elements.intensityValue.textContent = '100%';

        this.elements.uploadSection.style.display = 'none';
        this.elements.controlSection.style.display = 'block';

        this.apply();
        this.showSuccess('이미지가 로드되었습니다.');
      };
      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }

  setFilter(filter) {
    this.currentFilter = filter;

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.filter === filter) btn.classList.add('active');
    });

    const filterNames = {
      grayscale: '흑백',
      sepia: '세피아',
      invert: '반전',
      brightness: '밝기',
      contrast: '대비'
    };
    this.elements.currentFilter.textContent = filterNames[filter];

    this.apply();
  }

  updateIntensity(value) {
    this.intensity = parseInt(value);
    this.elements.intensityValue.textContent = `${value}%`;
  }

  apply() {
    if (!this.originalImage) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = this.originalImage;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const intensity = this.intensity / 100;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      let newR, newG, newB;

      switch (this.currentFilter) {
        case 'grayscale':
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          newR = r + (gray - r) * intensity;
          newG = g + (gray - g) * intensity;
          newB = b + (gray - b) * intensity;
          break;

        case 'sepia':
          const sepiaR = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
          const sepiaG = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
          const sepiaB = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
          newR = r + (sepiaR - r) * intensity;
          newG = g + (sepiaG - g) * intensity;
          newB = b + (sepiaB - b) * intensity;
          break;

        case 'invert':
          newR = r + ((255 - r) - r) * intensity;
          newG = g + ((255 - g) - g) * intensity;
          newB = b + ((255 - b) - b) * intensity;
          break;

        case 'brightness':
          const factor = 1 + (intensity - 0.5) * 2;
          newR = Math.min(255, Math.max(0, r * factor));
          newG = Math.min(255, Math.max(0, g * factor));
          newB = Math.min(255, Math.max(0, b * factor));
          break;

        case 'contrast':
          const contrastFactor = (intensity * 2);
          const intercept = 128 * (1 - contrastFactor);
          newR = Math.min(255, Math.max(0, r * contrastFactor + intercept));
          newG = Math.min(255, Math.max(0, g * contrastFactor + intercept));
          newB = Math.min(255, Math.max(0, b * contrastFactor + intercept));
          break;

        default:
          newR = r;
          newG = g;
          newB = b;
      }

      data[i] = newR;
      data[i + 1] = newG;
      data[i + 2] = newB;
    }

    ctx.putImageData(imageData, 0, 0);

    const dataUrl = canvas.toDataURL('image/png');
    this.elements.filteredImage.src = dataUrl;

    this.showSuccess('필터 적용 완료!');
  }

  reset() {
    if (!this.originalImage) return;

    this.currentFilter = 'grayscale';
    this.intensity = 100;

    this.elements.filteredImage.src = this.elements.originalImage.src;
    this.elements.intensitySlider.value = 100;
    this.elements.intensityValue.textContent = '100%';

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.filter === 'grayscale') btn.classList.add('active');
    });
    this.elements.currentFilter.textContent = '흑백';

    this.showToast('원본 상태로 초기화되었습니다.', 'info');
  }

  download() {
    const filteredImage = this.elements.filteredImage;
    if (!filteredImage.src || filteredImage.src === '') {
      this.showToast('다운로드할 이미지가 없습니다.', 'warning');
      return;
    }

    const baseName = this.originalFileName.replace(/\.[^/.]+$/, '');
    const fileName = `${baseName}_${this.currentFilter}.png`;

    const link = document.createElement('a');
    link.href = filteredImage.src;
    link.download = fileName;
    link.click();

    this.showSuccess('다운로드가 시작되었습니다!');
  }

  clear() {
    this.originalImage = null;
    this.originalFileName = '';
    this.currentFilter = 'grayscale';
    this.intensity = 100;

    this.elements.originalImage.src = '';
    this.elements.filteredImage.src = '';
    this.elements.originalInfo.textContent = '';
    this.elements.filteredInfo.textContent = '';
    this.elements.fileInput.value = '';
    this.elements.intensitySlider.value = 100;
    this.elements.intensityValue.textContent = '100%';

    this.elements.uploadSection.style.display = 'block';
    this.elements.controlSection.style.display = 'none';

    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const imageGrayscale = new ImageGrayscale();
window.ImageGrayscale = imageGrayscale;

document.addEventListener('DOMContentLoaded', () => imageGrayscale.init());
