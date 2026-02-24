/**
 * AI 얼굴 교체 - ToolBase 기반
 * AI로 이미지 속 얼굴 교체
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class FaceSwapTool extends ToolBase {
  constructor() {
    super('FaceSwapTool');
    this.selectedModel = 'insightface';
    this.sourceDataUrl = null;
    this.targetDataUrl = null;
    this.resultDataUrl = null;

    this.modelNames = {
      'insightface': 'InsightFace',
      'simswap': 'SimSwap',
      'facefusion': 'FaceFusion'
    };
  }

  init() {
    this.initElements({
      sourceArea: 'sourceArea',
      targetArea: 'targetArea',
      resultPanel: 'resultPanel',
      resultImage: 'resultImage',
      loadingOverlay: 'loadingOverlay',
      processBtn: 'processBtn',
      downloadBtn: 'downloadBtn'
    });

    console.log('[FaceSwapTool] 초기화 완료');
    return this;
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }

  handleSource(event) {
    const file = event.target.files[0];
    if (file) this.loadImage(file, 'source');
  }

  handleTarget(event) {
    const file = event.target.files[0];
    if (file) this.loadImage(file, 'target');
  }

  loadImage(file, type) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const area = document.getElementById(type === 'source' ? 'sourceArea' : 'targetArea');

      if (type === 'source') {
        this.sourceDataUrl = dataUrl;
      } else {
        this.targetDataUrl = dataUrl;
      }

      area.innerHTML = `<img src="${dataUrl}" alt="${type}">`;
      area.classList.add('has-image');

      this.checkReady();
    };
    reader.readAsDataURL(file);
  }

  checkReady() {
    const ready = this.sourceDataUrl && this.targetDataUrl;
    this.elements.processBtn.disabled = !ready;
    if (ready) {
      this.elements.resultPanel.style.display = 'block';
    }
  }

  async process() {
    if (!this.sourceDataUrl || !this.targetDataUrl) {
      this.showToast('두 이미지를 모두 업로드하세요.', 'error');
      return;
    }

    const loadingOverlay = this.elements.loadingOverlay;
    loadingOverlay.classList.add('active');

    await this.delay(2500 + Math.random() * 1500);

    // 데모: 원본 이미지 사용 (실제로는 AI 처리)
    this.resultDataUrl = this.sourceDataUrl;

    loadingOverlay.classList.remove('active');
    const resultImage = this.elements.resultImage;
    resultImage.src = this.resultDataUrl;
    resultImage.style.display = 'block';
    this.elements.downloadBtn.disabled = false;

    this.showToast(`${this.modelNames[this.selectedModel]}로 얼굴 교체 완료!`);
  }

  download() {
    if (!this.resultDataUrl) return;
    const link = document.createElement('a');
    link.download = 'face-swapped.png';
    link.href = this.resultDataUrl;
    link.click();
    this.showToast('이미지가 다운로드되었습니다!');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const faceSwapTool = new FaceSwapTool();
window.FaceSwap = faceSwapTool;

document.addEventListener('DOMContentLoaded', () => faceSwapTool.init());
console.log('[FaceSwapTool] 모듈 로드 완료');
