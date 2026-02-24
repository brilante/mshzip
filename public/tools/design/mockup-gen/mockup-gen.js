/**
 * 목업 생성기 - ToolBase 기반
 * 디바이스 목업에 스크린샷 삽입
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var MockupGen = class MockupGen extends ToolBase {
  constructor() {
    super('MockupGen');
    this.currentDevice = 'iphone';
    this.uploadedImage = null;
    this.devices = {
      iphone: { width: 375, height: 812, radius: 40, bezel: 10, name: 'iPhone' },
      android: { width: 360, height: 780, radius: 20, bezel: 8, name: 'Android' },
      macbook: { width: 1440, height: 900, radius: 10, bezel: 20, name: 'MacBook' },
      ipad: { width: 820, height: 1180, radius: 18, bezel: 30, name: 'iPad' },
      browser: { width: 1280, height: 800, radius: 8, bezel: 0, name: 'Browser' },
      monitor: { width: 1920, height: 1080, radius: 0, bezel: 15, name: 'Monitor' }
    };
  }

  init() {
    this.initElements({
      uploadZone: 'uploadZone',
      imageInput: 'imageInput',
      deviceFrame: 'deviceFrame',
      deviceScreen: 'deviceScreen',
      mockupPreview: 'mockupPreview',
      bgColor: 'bgColor',
      showShadow: 'showShadow'
    });

    this.setupUpload();
    this.updateDevice();
    console.log('[MockupGen] 초기화 완료');
    return this;
  }

  setupUpload() {
    this.on(this.elements.uploadZone, 'click', () => this.elements.imageInput.click());

    this.on(this.elements.uploadZone, 'dragover', (e) => {
      e.preventDefault();
      this.elements.uploadZone.classList.add('drag-over');
    });

    this.on(this.elements.uploadZone, 'dragleave', () => {
      this.elements.uploadZone.classList.remove('drag-over');
    });

    this.on(this.elements.uploadZone, 'drop', (e) => {
      e.preventDefault();
      this.elements.uploadZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadImage(file);
    });

    this.on(this.elements.imageInput, 'change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadImage(file);
    });
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedImage = e.target.result;
      this.updateScreen();
      this.showToast('이미지 로드 완료!', 'success');
    };
    reader.readAsDataURL(file);
  }

  setDevice(device) {
    this.currentDevice = device;
    document.querySelectorAll('.device-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-device="${device}"]`).classList.add('active');
    this.updateDevice();
  }

  updateDevice() {
    const device = this.devices[this.currentDevice];
    const frame = this.elements.deviceFrame;
    const screen = this.elements.deviceScreen;

    // 스케일 계산
    const maxWidth = 400;
    const maxHeight = 500;
    const scale = Math.min(maxWidth / device.width, maxHeight / device.height, 1);

    const scaledWidth = device.width * scale;
    const scaledHeight = device.height * scale;

    frame.style.width = scaledWidth + 'px';
    frame.style.height = scaledHeight + 'px';
    frame.style.borderRadius = device.radius * scale + 'px';
    frame.style.padding = device.bezel * scale + 'px';

    screen.style.borderRadius = (device.radius - device.bezel) * scale + 'px';

    // 브라우저 상단바 추가
    if (this.currentDevice === 'browser') {
      frame.classList.add('browser-frame');
    } else {
      frame.classList.remove('browser-frame');
    }

    this.updateScreen();
  }

  updateScreen() {
    const screen = this.elements.deviceScreen;

    if (this.uploadedImage) {
      screen.innerHTML = `<img src="${this.uploadedImage}" alt="Screenshot">`;
    } else {
      screen.innerHTML = '<div class="screen-placeholder">이미지를 업로드하세요</div>';
    }
  }

  updateBackground() {
    const color = this.elements.bgColor.value;
    this.elements.mockupPreview.style.backgroundColor = color;
  }

  updateShadow() {
    const show = this.elements.showShadow.checked;
    const frame = this.elements.deviceFrame;
    frame.style.boxShadow = show ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : 'none';
  }

  async download() {
    if (!this.uploadedImage) {
      this.showToast('먼저 이미지를 업로드하세요.', 'warning');
      return;
    }

    try {
      const device = this.devices[this.currentDevice];
      const bgColor = this.elements.bgColor.value;

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${device.width + 100}" height="${device.height + 100}">
        <rect width="100%" height="100%" fill="${bgColor}"/>
        <foreignObject x="50" y="50" width="${device.width}" height="${device.height}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width: 100%; height: 100%; border-radius: ${device.radius}px; overflow: hidden; background: #000;">
            <img src="${this.uploadedImage}" style="width: 100%; height: 100%; object-fit: cover;"/>
          </div>
        </foreignObject>
      </svg>`;

      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `mockup-${this.currentDevice}.svg`;
      link.click();
      URL.revokeObjectURL(link.href);
      this.showToast('목업 다운로드 시작!', 'success');
    } catch (error) {
      console.error('Download error:', error);
      this.showToast('다운로드 실패', 'error');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const mockupGen = new MockupGen();
window.MockupGen = mockupGen;

document.addEventListener('DOMContentLoaded', () => mockupGen.init());
