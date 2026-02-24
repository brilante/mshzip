/**
 * 스크린샷 목업 - ToolBase 기반
 * 브라우저 프레임 스크린샷 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class ScreenshotMockup extends ToolBase {
  constructor() {
    super('ScreenshotMockup');
    this.uploadedImage = null;
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      imageInput: 'imageInput',
      browserContent: 'browserContent',
      browserFrame: 'browserFrame',
      previewContainer: 'previewContainer',
      frameStyle: 'frameStyle',
      bgColor: 'bgColor',
      shadowStyle: 'shadowStyle',
      borderRadius: 'borderRadius',
      padding: 'padding'
    });

    this.bindEvents();
    this.updatePreview();

    console.log('[ScreenshotMockup] 초기화 완료');
    return this;
  }

  bindEvents() {
    this.elements.uploadArea.addEventListener('click', () => this.elements.imageInput.click());
    this.elements.uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.elements.uploadArea.style.borderColor = '#667eea';
    });
    this.elements.uploadArea.addEventListener('dragleave', () => {
      this.elements.uploadArea.style.borderColor = '#ddd';
    });
    this.elements.uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      this.elements.uploadArea.style.borderColor = '#ddd';
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) this.handleImage(file);
    });
    this.elements.imageInput.addEventListener('change', (e) => {
      if (e.target.files[0]) this.handleImage(e.target.files[0]);
    });

    ['frameStyle', 'bgColor', 'shadowStyle', 'borderRadius', 'padding'].forEach(id => {
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
      this.elements.browserContent.innerHTML = `<img src="${this.uploadedImage}" alt="Screenshot">`;
      this.updatePreview();
    };
    reader.readAsDataURL(file);
  }

  updatePreview() {
    const frameStyle = this.elements.frameStyle.value;
    const bgColor = this.elements.bgColor.value;
    const shadowStyle = this.elements.shadowStyle.value;
    const borderRadius = this.elements.borderRadius.value;
    const padding = this.elements.padding.value;

    this.elements.previewContainer.style.background = bgColor;
    this.elements.previewContainer.style.padding = padding + 'px';

    this.elements.browserFrame.style.borderRadius = borderRadius + 'px';
    this.elements.browserFrame.className = 'browser-frame';
    if (shadowStyle !== 'none') this.elements.browserFrame.classList.add('shadow-' + shadowStyle);

    const header = this.elements.browserFrame.querySelector('.browser-header');
    if (header) {
      if (frameStyle === 'none') {
        header.style.display = 'none';
      } else {
        header.style.display = 'flex';
        if (frameStyle === 'chrome-dark') {
          header.style.background = '#3c4043';
          header.querySelector('.browser-address').style.background = '#5f6368';
          header.querySelector('.browser-address').style.color = '#e8eaed';
        } else {
          header.style.background = '#f1f3f4';
          header.querySelector('.browser-address').style.background = 'white';
          header.querySelector('.browser-address').style.color = '#5f6368';
        }
      }
    }
  }

  async downloadImage() {
    if (!this.uploadedImage) {
      this.showToast('먼저 이미지를 업로드하세요!', 'error');
      return;
    }

    await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const canvas = await window.html2canvas(this.elements.previewContainer);
    const link = document.createElement('a');
    link.download = 'screenshot-mockup.png';
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
const screenshotMockup = new ScreenshotMockup();
window.ScreenshotMockup = screenshotMockup;

// 전역 함수 (HTML onclick 호환)
function updatePreview() { screenshotMockup.updatePreview(); }
function downloadImage() { screenshotMockup.downloadImage(); }

document.addEventListener('DOMContentLoaded', () => screenshotMockup.init());
