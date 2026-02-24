/**
 * 브라우저 프레임 생성기 - ToolBase 기반
 * 브라우저 탭 프레임 목업 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class BrowserFrameGen extends ToolBase {
  constructor() {
    super('BrowserFrameGen');
    this.uploadedImage = null;
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      imageInput: 'imageInput',
      browserContent: 'browserContent',
      browserChrome: 'browserChrome',
      browserMockup: 'browserMockup',
      urlDisplay: 'urlDisplay',
      tabs: 'tabs',
      browserStyle: 'browserStyle',
      urlText: 'urlText',
      tabCount: 'tabCount',
      frameWidth: 'frameWidth'
    });

    this.bindEvents();
    this.updatePreview();

    console.log('[BrowserFrameGen] 초기화 완료');
    return this;
  }

  bindEvents() {
    this.elements.uploadArea.addEventListener('click', () => this.elements.imageInput.click());
    this.elements.imageInput.addEventListener('change', (e) => {
      if (e.target.files[0]) this.handleImage(e.target.files[0]);
    });

    ['browserStyle', 'urlText', 'tabCount', 'frameWidth'].forEach(id => {
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
    };
    reader.readAsDataURL(file);
  }

  updatePreview() {
    const style = this.elements.browserStyle.value;
    const url = this.elements.urlText.value;
    const tabCount = parseInt(this.elements.tabCount.value);
    const width = this.elements.frameWidth.value;

    this.elements.browserChrome.className = 'browser-chrome ' + style;
    this.elements.urlDisplay.textContent = url;
    this.elements.browserMockup.style.width = width + 'px';

    // Update tabs
    let tabsHTML = '';
    for (let i = 0; i < tabCount; i++) {
      tabsHTML += `
        <div class="tab ${i === 0 ? 'active' : ''}">
          <span class="tab-icon"></span>
          <span class="tab-title">${i === 0 ? 'Current Tab' : 'Tab ' + (i + 1)}</span>
          <span class="tab-close">×</span>
        </div>
      `;
    }
    this.elements.tabs.innerHTML = tabsHTML;
  }

  async downloadImage() {
    await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const canvas = await window.html2canvas(this.elements.browserMockup, { scale: 2 });
    const link = document.createElement('a');
    link.download = 'browser-frame.png';
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
const browserFrameGen = new BrowserFrameGen();
window.BrowserFrameGen = browserFrameGen;

// 전역 함수 (HTML onclick 호환)
function updatePreview() { browserFrameGen.updatePreview(); }
function downloadImage() { browserFrameGen.downloadImage(); }

document.addEventListener('DOMContentLoaded', () => browserFrameGen.init());
