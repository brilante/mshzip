/**
 * 앱스토어 스크린샷 - ToolBase 기반
 * 앱스토어용 스크린샷 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class AppstoreScreenshot extends ToolBase {
  constructor() {
    super('AppstoreScreenshot');
    this.uploadedImage = null;
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      imageInput: 'imageInput',
      phoneScreen: 'phoneScreen',
      previewContainer: 'previewContainer',
      titleDisplay: 'titleDisplay',
      subtitleDisplay: 'subtitleDisplay',
      deviceWrapper: 'deviceWrapper',
      titleText: 'titleText',
      subtitleText: 'subtitleText',
      gradientStart: 'gradientStart',
      gradientEnd: 'gradientEnd',
      textColor: 'textColor',
      showDevice: 'showDevice'
    });

    this.bindEvents();
    this.updatePreview();

    console.log('[AppstoreScreenshot] 초기화 완료');
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

    ['titleText', 'subtitleText', 'gradientStart', 'gradientEnd', 'textColor', 'showDevice'].forEach(id => {
      const el = this.elements[id];
      if (el) {
        el.addEventListener('change', () => this.updatePreview());
        el.addEventListener('input', () => this.updatePreview());
      }
    });
  }

  handleImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedImage = e.target.result;
      this.elements.phoneScreen.innerHTML = `<img src="${this.uploadedImage}" alt="Screenshot">`;
    };
    reader.readAsDataURL(file);
  }

  updatePreview() {
    const title = this.elements.titleText.value;
    const subtitle = this.elements.subtitleText.value;
    const gradientStart = this.elements.gradientStart.value;
    const gradientEnd = this.elements.gradientEnd.value;
    const textColor = this.elements.textColor.value;
    const showDevice = this.elements.showDevice.checked;

    this.elements.titleDisplay.textContent = title || ' ';
    this.elements.subtitleDisplay.textContent = subtitle || ' ';
    this.elements.titleDisplay.style.color = textColor;
    this.elements.subtitleDisplay.style.color = textColor;

    this.elements.previewContainer.style.background = `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`;
    this.elements.deviceWrapper.style.display = showDevice ? 'flex' : 'none';
  }

  async downloadImage() {
    await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const canvas = await window.html2canvas(this.elements.previewContainer, { scale: 3 });
    const link = document.createElement('a');
    link.download = 'appstore-screenshot.png';
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
const appstoreScreenshot = new AppstoreScreenshot();
window.AppstoreScreenshot = appstoreScreenshot;

// 전역 함수 (HTML onclick 호환)
function updatePreview() { appstoreScreenshot.updatePreview(); }
function downloadImage() { appstoreScreenshot.downloadImage(); }

document.addEventListener('DOMContentLoaded', () => appstoreScreenshot.init());
