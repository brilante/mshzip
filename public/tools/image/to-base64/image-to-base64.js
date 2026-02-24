/**
 * 이미지 → Base64 변환기 - ToolBase 기반
 * 이미지 파일을 Base64 문자열로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ImageToBase64 = class ImageToBase64 extends ToolBase {
  constructor() {
    super('ImageToBase64');
    this.currentFile = null;
    this.currentBase64 = null;
    this.currentMimeType = null;
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      previewSection: 'previewSection',
      previewImage: 'previewImage',
      imageInfo: 'imageInfo',
      optionsSection: 'optionsSection',
      outputSection: 'outputSection',
      outputText: 'outputText',
      outputSize: 'outputSize',
      includePrefix: 'includePrefix',
      wrapHtml: 'wrapHtml',
      wrapCss: 'wrapCss'
    });

    this.setupEventListeners();
    console.log('[ImageToBase64] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { dropzone, fileInput, includePrefix, wrapHtml, wrapCss } = this.elements;

    this.on(dropzone, 'click', () => fileInput.click());
    this.on(fileInput, 'change', (e) => {
      if (e.target.files.length > 0) this.handleFile(e.target.files[0]);
    });

    this.on(dropzone, 'dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    this.on(dropzone, 'dragleave', () => dropzone.classList.remove('dragover'));
    this.on(dropzone, 'drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) this.handleFile(e.dataTransfer.files[0]);
    });

    this.on(includePrefix, 'change', () => this.updateOutput());
    this.on(wrapHtml, 'change', () => {
      if (wrapHtml.checked) wrapCss.checked = false;
      this.updateOutput();
    });
    this.on(wrapCss, 'change', () => {
      if (wrapCss.checked) wrapHtml.checked = false;
      this.updateOutput();
    });

    this.on(document, 'paste', (e) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              this.handleFile(file);
              break;
            }
          }
        }
      }
    });
  }

  handleFile(file) {
    if (!file.type.startsWith('image/')) {
      this.showToast('이미지 파일만 지원합니다.', 'error');
      return;
    }

    if (file.size > this.maxFileSize) {
      this.showToast('파일 크기가 10MB를 초과합니다.', 'error');
      return;
    }

    this.currentFile = file;
    this.currentMimeType = file.type;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this.currentBase64 = dataUrl.split(',')[1];
      this.showPreview(dataUrl, file);
      this.updateOutput();
    };
    reader.onerror = () => {
      this.showToast('파일 읽기에 실패했습니다.', 'error');
    };
    reader.readAsDataURL(file);
  }

  showPreview(dataUrl, file) {
    this.elements.previewImage.src = dataUrl;
    this.elements.previewSection.style.display = 'block';
    this.elements.optionsSection.style.display = 'block';
    this.elements.outputSection.style.display = 'block';

    const img = new Image();
    img.onload = () => {
      const info = [
        `<strong>파일명:</strong> ${this.escapeHtml(file.name)}`,
        `<strong>크기:</strong> ${this.formatFileSize(file.size)}`,
        `<strong>타입:</strong> ${file.type}`,
        `<strong>해상도:</strong> ${img.width} × ${img.height}px`
      ];
      this.elements.imageInfo.innerHTML = info.join('<br>');
    };
    img.src = dataUrl;
  }

  updateOutput() {
    if (!this.currentBase64) return;

    let output = this.currentBase64;
    const includePrefix = this.elements.includePrefix.checked;
    const wrapHtml = this.elements.wrapHtml.checked;
    const wrapCss = this.elements.wrapCss.checked;

    const dataUri = `data:${this.currentMimeType};base64,${this.currentBase64}`;

    if (wrapHtml) {
      output = `<img src="${dataUri}" alt="image">`;
    } else if (wrapCss) {
      output = `background-image: url(${dataUri});`;
    } else if (includePrefix) {
      output = dataUri;
    }

    this.elements.outputText.value = output;

    const size = new Blob([output]).size;
    this.elements.outputSize.textContent = `(${this.formatFileSize(size)})`;
  }

  async copyOutput() {
    const output = this.elements.outputText.value;
    if (!output) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      this.showSuccess('Base64가 클립보드에 복사되었습니다.');
    } catch {
      this.elements.outputText.select();
      document.execCommand('copy');
      this.showSuccess('Base64가 클립보드에 복사되었습니다.');
    }
  }

  downloadOutput() {
    const output = this.elements.outputText.value;
    if (!output) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    const filename = this.currentFile
      ? this.currentFile.name.replace(/\.[^.]+$/, '') + '.txt'
      : 'base64.txt';

    this.downloadFile(output, filename, 'text/plain');
    this.showSuccess('파일이 다운로드되었습니다.');
  }

  clear() {
    this.currentFile = null;
    this.currentBase64 = null;
    this.currentMimeType = null;

    this.elements.fileInput.value = '';
    this.elements.previewImage.src = '';
    this.elements.imageInfo.innerHTML = '';
    this.elements.outputText.value = '';
    this.elements.outputSize.textContent = '';

    this.elements.previewSection.style.display = 'none';
    this.elements.optionsSection.style.display = 'none';
    this.elements.outputSection.style.display = 'none';

    this.showSuccess('초기화되었습니다.');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const imageToBase64 = new ImageToBase64();
window.ImageToBase64 = imageToBase64;

document.addEventListener('DOMContentLoaded', () => imageToBase64.init());
