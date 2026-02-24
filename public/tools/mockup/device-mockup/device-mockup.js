/**
 * 디바이스 목업 - ToolBase 기반
 * 모바일 기기 목업 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class DeviceMockup extends ToolBase {
  constructor() {
    super('DeviceMockup');
    this.uploadedImage = null;
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      imageInput: 'imageInput',
      deviceScreen: 'deviceScreen',
      deviceFrame: 'deviceFrame',
      previewContainer: 'previewContainer',
      deviceType: 'deviceType',
      deviceColor: 'deviceColor',
      bgColor: 'bgColor',
      showShadow: 'showShadow',
      rotation: 'rotation'
    });

    this.bindEvents();
    this.updatePreview();

    console.log('[DeviceMockup] 초기화 완료');
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

    ['deviceType', 'deviceColor', 'bgColor', 'showShadow', 'rotation'].forEach(id => {
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
      this.elements.deviceScreen.innerHTML = `<img src="${this.uploadedImage}" alt="Screenshot">`;
    };
    reader.readAsDataURL(file);
  }

  updatePreview() {
    const deviceType = this.elements.deviceType.value;
    const deviceColor = this.elements.deviceColor.value;
    const bgColor = this.elements.bgColor.value;
    const showShadow = this.elements.showShadow.checked;
    const rotation = this.elements.rotation.value;

    this.elements.deviceFrame.className = `device-frame ${deviceType} ${deviceColor}`;
    if (!showShadow) this.elements.deviceFrame.classList.add('no-shadow');

    this.elements.previewContainer.style.background = bgColor;
    this.elements.deviceFrame.style.transform = `rotate(${rotation}deg)`;
  }

  async downloadImage() {
    if (!this.uploadedImage) {
      this.showToast('먼저 이미지를 업로드하세요!', 'error');
      return;
    }

    await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const canvas = await window.html2canvas(this.elements.previewContainer);
    const link = document.createElement('a');
    link.download = 'device-mockup.png';
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
const deviceMockup = new DeviceMockup();
window.DeviceMockup = deviceMockup;

// 전역 함수 (HTML onclick 호환)
function updatePreview() { deviceMockup.updatePreview(); }
function downloadImage() { deviceMockup.downloadImage(); }

document.addEventListener('DOMContentLoaded', () => deviceMockup.init());
