/**
 * 웹폰트 생성기 - ToolBase 기반
 * @font-face CSS 코드 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class WebfontGenerator extends ToolBase {
  constructor() {
    super('WebfontGenerator');
    this.uploadedFiles = [];
    this.formats = {
      woff2: "format('woff2')",
      woff: "format('woff')",
      ttf: "format('truetype')",
      otf: "format('opentype')"
    };
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      fontInput: 'fontInput',
      uploadedFonts: 'uploadedFonts',
      fontList: 'fontList',
      fontFamily: 'fontFamily',
      fontWeight: 'fontWeight',
      fontStyle: 'fontStyle',
      fontDisplay: 'fontDisplay',
      cssOutput: 'cssOutput',
      usageOutput: 'usageOutput'
    });

    this.bindEvents();
    this.updateOutput();

    console.log('[WebfontGenerator] 초기화 완료');
    return this;
  }

  bindEvents() {
    const { uploadArea, fontInput } = this.elements;

    uploadArea.addEventListener('click', () => fontInput.click());

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '#667eea';
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.style.borderColor = '#ddd';
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '#ddd';
      this.handleFiles(e.dataTransfer.files);
    });

    fontInput.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
    });

    // Settings event listeners
    ['fontFamily', 'fontWeight', 'fontStyle', 'fontDisplay'].forEach(id => {
      this.elements[id].addEventListener('change', () => this.updateOutput());
      this.elements[id].addEventListener('input', () => this.updateOutput());
    });
  }

  handleFiles(files) {
    Array.from(files).forEach(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) {
        this.uploadedFiles.push({
          name: file.name,
          format: ext,
          file: file
        });
      }
    });
    this.renderUploadedFonts();
    this.updateOutput();
  }

  renderUploadedFonts() {
    if (this.uploadedFiles.length > 0) {
      this.elements.uploadedFonts.style.display = 'block';
      this.elements.fontList.innerHTML = this.uploadedFiles.map((f, i) => `
        <div class="font-item">
          <span>${f.name}</span>
          <button onclick="webfontGenerator.removeFont(${i})">×</button>
        </div>
      `).join('');
    } else {
      this.elements.uploadedFonts.style.display = 'none';
    }
  }

  removeFont(index) {
    this.uploadedFiles.splice(index, 1);
    this.renderUploadedFonts();
    this.updateOutput();
  }

  updateOutput() {
    const fontFamily = this.elements.fontFamily.value || 'CustomFont';
    const fontWeight = this.elements.fontWeight.value;
    const fontStyle = this.elements.fontStyle.value;
    const fontDisplay = this.elements.fontDisplay.value;

    let srcParts = [];
    if (this.uploadedFiles.length > 0) {
      srcParts = this.uploadedFiles.map(f => `url('/fonts/${f.name}') ${this.formats[f.format]}`);
    } else {
      srcParts = [
        `url('/fonts/${fontFamily}.woff2') format('woff2')`,
        `url('/fonts/${fontFamily}.woff') format('woff')`
      ];
    }

    const cssOutput = `@font-face {
  font-family: '${fontFamily}';
  src: ${srcParts.join(',\n       ')};
  font-weight: ${fontWeight};
  font-style: ${fontStyle};
  font-display: ${fontDisplay};
}`;

    const usageOutput = `body {
  font-family: '${fontFamily}', sans-serif;
}`;

    this.elements.cssOutput.textContent = cssOutput;
    this.elements.usageOutput.textContent = usageOutput;
  }

  copyCSS() {
    this.copyToClipboard(this.elements.cssOutput.textContent);
  }

  copyUsage() {
    this.copyToClipboard(this.elements.usageOutput.textContent);
  }
}

// 전역 인스턴스 생성
const webfontGenerator = new WebfontGenerator();
window.WebfontGenerator = webfontGenerator;

document.addEventListener('DOMContentLoaded', () => webfontGenerator.init());
