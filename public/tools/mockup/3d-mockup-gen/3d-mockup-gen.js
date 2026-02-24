/**
 * 3D 목업 생성기 - ToolBase 기반
 * 3D 회전 목업 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class Mockup3DGen extends ToolBase {
  constructor() {
    super('Mockup3DGen');
    this.uploadedImage = null;
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      imageInput: 'imageInput',
      mockup3d: 'mockup3d',
      previewPanel: 'previewPanel',
      rotateX: 'rotateX',
      rotateY: 'rotateY',
      rotateZ: 'rotateZ',
      perspective: 'perspective',
      shadowIntensity: 'shadowIntensity',
      bgColor: 'bgColor',
      rotateXValue: 'rotateXValue',
      rotateYValue: 'rotateYValue',
      rotateZValue: 'rotateZValue',
      perspectiveValue: 'perspectiveValue'
    });

    this.bindEvents();
    this.updatePreview();

    console.log('[Mockup3DGen] 초기화 완료');
    return this;
  }

  bindEvents() {
    this.elements.uploadArea.addEventListener('click', () => this.elements.imageInput.click());
    this.elements.imageInput.addEventListener('change', (e) => {
      if (e.target.files[0]) this.handleImage(e.target.files[0]);
    });

    ['rotateX', 'rotateY', 'rotateZ', 'perspective', 'shadowIntensity', 'bgColor'].forEach(id => {
      const el = this.elements[id];
      if (el) {
        el.addEventListener('input', () => this.updatePreview());
      }
    });
  }

  handleImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedImage = e.target.result;
      this.elements.mockup3d.innerHTML = `<img src="${this.uploadedImage}" alt="3D Mockup">`;
      this.updatePreview();
    };
    reader.readAsDataURL(file);
  }

  updatePreview() {
    const rotateX = this.elements.rotateX.value;
    const rotateY = this.elements.rotateY.value;
    const rotateZ = this.elements.rotateZ.value;
    const perspective = this.elements.perspective.value;
    const shadowIntensity = this.elements.shadowIntensity.value;
    const bgColor = this.elements.bgColor.value;

    this.elements.rotateXValue.textContent = rotateX;
    this.elements.rotateYValue.textContent = rotateY;
    this.elements.rotateZValue.textContent = rotateZ;
    this.elements.perspectiveValue.textContent = perspective;

    this.elements.previewPanel.style.perspective = perspective + 'px';
    this.elements.previewPanel.style.background = bgColor;

    this.elements.mockup3d.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;

    const shadowOpacity = shadowIntensity / 100;
    const img = this.elements.mockup3d.querySelector('img');
    if (img) {
      img.style.boxShadow = `0 ${30 + parseInt(rotateX)}px ${60 + Math.abs(parseInt(rotateY))}px rgba(0,0,0,${shadowOpacity})`;
    }
  }

  applyPreset(x, y, z) {
    this.elements.rotateX.value = x;
    this.elements.rotateY.value = y;
    this.elements.rotateZ.value = z;
    this.updatePreview();
  }

  async downloadImage() {
    if (!this.uploadedImage) {
      this.showToast('먼저 이미지를 업로드하세요!', 'error');
      return;
    }

    await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const canvas = await window.html2canvas(this.elements.previewPanel, { scale: 2, backgroundColor: null });
    const link = document.createElement('a');
    link.download = '3d-mockup.png';
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
const mockup3DGen = new Mockup3DGen();
window.Mockup3DGen = mockup3DGen;

// 전역 함수 (HTML onclick 호환)
function updatePreview() { mockup3DGen.updatePreview(); }
function applyPreset(x, y, z) { mockup3DGen.applyPreset(x, y, z); }
function downloadImage() { mockup3DGen.downloadImage(); }

document.addEventListener('DOMContentLoaded', () => mockup3DGen.init());
