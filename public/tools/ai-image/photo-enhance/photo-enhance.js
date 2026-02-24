/**
 * AI 사진 향상 - ToolBase 기반
 * AI로 사진 품질 자동 향상
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class PhotoEnhanceTool extends ToolBase {
  constructor() {
    super('PhotoEnhanceTool');
    this.selectedModel = 'remini';
    this.selectedEnhance = 'auto';
    this.originalDataUrl = null;
    this.resultDataUrl = null;
    this.sliderPosition = 50;

    this.modelNames = {
      'remini': 'Remini AI',
      'luminar': 'Luminar Neo',
      'pixelmator': 'Pixelmator Pro'
    };

    this.enhanceNames = {
      'auto': '자동 향상',
      'denoise': '노이즈 제거',
      'sharpen': '선명하게',
      'color': '색상 보정',
      'portrait': '인물 보정',
      'hdr': 'HDR 효과',
      'restore': '오래된 사진 복원',
      'deblur': '흐림 제거'
    };
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      fileInput: 'fileInput',
      previewContainer: 'previewContainer',
      beforeImage: 'beforeImage',
      afterImage: 'afterImage',
      compareSlider: 'compareSlider',
      compareDivider: 'compareDivider',
      loadingOverlay: 'loadingOverlay',
      processBtn: 'processBtn',
      downloadBtn: 'downloadBtn'
    });

    this.setupDragDrop();
    this.setupSlider();
    console.log('[PhotoEnhanceTool] 초기화 완료');
    return this;
  }

  setupDragDrop() {
    const uploadArea = this.elements.uploadArea;
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = 'var(--primary)'; });
    uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = ''; });
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '';
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) this.loadFile(file);
    });
  }

  setupSlider() {
    const divider = this.elements.compareDivider;
    const slider = this.elements.compareSlider;
    let isDragging = false;

    divider.addEventListener('mousedown', () => isDragging = true);
    document.addEventListener('mouseup', () => isDragging = false);
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const rect = slider.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const percent = (x / rect.width) * 100;
      this.updateSlider(percent);
    });
  }

  updateSlider(percent) {
    this.sliderPosition = percent;
    this.elements.compareDivider.style.left = percent + '%';
    document.querySelector('.compare-before').style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }

  selectEnhance(enhance) {
    this.selectedEnhance = enhance;
    document.querySelectorAll('.enhance-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.enhance === enhance);
    });
  }

  handleFile(event) {
    const file = event.target.files[0];
    if (file) this.loadFile(file);
  }

  loadFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.originalDataUrl = e.target.result;
      this.elements.beforeImage.src = this.originalDataUrl;
      this.elements.afterImage.src = this.originalDataUrl;
      this.elements.previewContainer.style.display = 'block';
      this.elements.processBtn.disabled = false;
      this.updateSlider(50);
    };
    reader.readAsDataURL(file);
  }

  async process() {
    if (!this.originalDataUrl) {
      this.showToast('먼저 이미지를 업로드하세요.', 'error');
      return;
    }

    const loadingOverlay = this.elements.loadingOverlay;
    loadingOverlay.classList.add('active');

    await this.delay(2000 + Math.random() * 1000);

    // 데모: 원본 이미지 사용 (실제로는 AI 처리)
    this.resultDataUrl = this.originalDataUrl;
    this.elements.afterImage.src = this.resultDataUrl;

    loadingOverlay.classList.remove('active');
    this.elements.downloadBtn.disabled = false;

    this.showToast(`${this.enhanceNames[this.selectedEnhance]} 완료!`);
  }

  download() {
    if (!this.resultDataUrl) return;
    const link = document.createElement('a');
    link.download = `enhanced-${this.selectedEnhance}.png`;
    link.href = this.resultDataUrl;
    link.click();
    this.showToast('이미지가 다운로드되었습니다!');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const photoEnhanceTool = new PhotoEnhanceTool();
window.PhotoEnhance = photoEnhanceTool;

document.addEventListener('DOMContentLoaded', () => photoEnhanceTool.init());
console.log('[PhotoEnhanceTool] 모듈 로드 완료');
