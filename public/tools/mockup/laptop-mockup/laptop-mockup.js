/**
 * 노트북 목업 - ToolBase 기반
 * 노트북 기기 목업 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class LaptopMockup extends ToolBase {
  constructor() {
    super('LaptopMockup');
    this.uploadedImage = null;
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      imageInput: 'imageInput',
      laptopScreen: 'laptopScreen',
      laptopFrame: 'laptopFrame',
      previewContainer: 'previewContainer',
      laptopModel: 'laptopModel',
      laptopColor: 'laptopColor',
      bgColor: 'bgColor',
      perspective: 'perspective'
    });

    this.bindEvents();
    this.updatePreview();

    console.log('[LaptopMockup] 초기화 완료');
    return this;
  }

  bindEvents() {
    this.elements.uploadArea.addEventListener('click', () => this.elements.imageInput.click());
    this.elements.uploadArea.addEventListener('dragover', (e) => e.preventDefault());
    this.elements.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) this.handleImage(file);
    });
    this.elements.imageInput.addEventListener('change', (e) => {
      if (e.target.files[0]) this.handleImage(e.target.files[0]);
    });

    ['laptopModel', 'laptopColor', 'bgColor', 'perspective'].forEach(id => {
      const el = this.elements[id];
      if (el) {
        el.addEventListener('change', () => this.updatePreview());
      }
    });
  }

  handleImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedImage = e.target.result;
      this.elements.laptopScreen.innerHTML = `<img src="${this.uploadedImage}" alt="Screenshot">`;
    };
    reader.readAsDataURL(file);
  }

  updatePreview() {
    const model = this.elements.laptopModel.value;
    const color = this.elements.laptopColor.value;
    const bgColor = this.elements.bgColor.value;
    const perspective = this.elements.perspective.value;

    this.elements.laptopFrame.className = `laptop-frame ${model} ${color}`;
    if (perspective === 'tilted') this.elements.laptopFrame.classList.add('tilted');
    this.elements.previewContainer.style.background = bgColor;
  }

  async downloadImage() {
    if (!this.uploadedImage) {
      this.showToast('먼저 이미지를 업로드하세요!', 'error');
      return;
    }

    await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const canvas = await window.html2canvas(this.elements.previewContainer);
    const link = document.createElement('a');
    link.download = 'laptop-mockup.png';
    link.href = canvas.toDataURL();
    link.click();

    this.showToast('이미지가 다운로드되었습니다!', 'success');
  }

  loadScript(src) {
    return new Promise((resolve) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }
}

// 전역 인스턴스 생성
const laptopMockup = new LaptopMockup();
window.LaptopMockup = laptopMockup;

// 전역 함수 (HTML onclick 호환)
function updatePreview() { laptopMockup.updatePreview(); }
function downloadImage() { laptopMockup.downloadImage(); }

document.addEventListener('DOMContentLoaded', () => laptopMockup.init());
