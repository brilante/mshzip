/**
 * Base64 인코더/디코더 도구 - ToolBase 기반
 * 텍스트, 이미지, 파일의 Base64 인코딩/디코딩
 * @created 2026-01-11
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var Base64Encoder = class Base64Encoder extends ToolBase {
  constructor() {
    super('Base64Encoder');
    this.currentImageFile = null;
    this.currentFile = null;
    this.currentImageBase64 = null;
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      base64Output: 'base64Output',
      imageInput: 'imageInput',
      imageDropZone: 'imageDropZone',
      imagePreview: 'imagePreview',
      previewImg: 'previewImg',
      imageBase64Output: 'imageBase64Output',
      imageBase64Input: 'imageBase64Input',
      decodedImageArea: 'decodedImageArea',
      decodedImg: 'decodedImg',
      includeDataUri: 'includeDataUri',
      fileInput: 'fileInput',
      fileDropZone: 'fileDropZone',
      fileInfo: 'fileInfo',
      fileName: 'fileName',
      fileSize: 'fileSize',
      fileBase64Output: 'fileBase64Output',
      urlSafe: 'urlSafe',
      lineBreak: 'lineBreak',
      stats: 'stats',
      errorPanel: 'errorPanel',
      errorMessage: 'errorMessage'
    });

    this.setupEventListeners();

    console.log('[Base64Encoder] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    // 이미지 드롭존
    this.on(this.elements.imageDropZone, 'click', () => {
      this.elements.imageInput.click();
    });
    this.on(this.elements.imageInput, 'change', (e) => {
      this.handleImageSelect(e.target.files[0]);
    });
    this.on(this.elements.imageDropZone, 'dragover', (e) => {
      e.preventDefault();
      this.elements.imageDropZone.classList.add('dragover');
    });
    this.on(this.elements.imageDropZone, 'dragleave', () => {
      this.elements.imageDropZone.classList.remove('dragover');
    });
    this.on(this.elements.imageDropZone, 'drop', (e) => {
      e.preventDefault();
      this.elements.imageDropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.handleImageSelect(file);
      } else {
        this.showToast('이미지 파일만 업로드 가능합니다.', 'warning');
      }
    });

    // 파일 드롭존
    this.on(this.elements.fileDropZone, 'click', () => {
      this.elements.fileInput.click();
    });
    this.on(this.elements.fileInput, 'change', (e) => {
      this.handleFileSelect(e.target.files[0]);
    });
    this.on(this.elements.fileDropZone, 'dragover', (e) => {
      e.preventDefault();
      this.elements.fileDropZone.classList.add('dragover');
    });
    this.on(this.elements.fileDropZone, 'dragleave', () => {
      this.elements.fileDropZone.classList.remove('dragover');
    });
    this.on(this.elements.fileDropZone, 'drop', (e) => {
      e.preventDefault();
      this.elements.fileDropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) {
        this.handleFileSelect(file);
      }
    });

    // 키보드 단축키
    this.on(document, 'keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.encode();
      }
    });

    // Data URI 체크박스 이벤트
    if (this.elements.includeDataUri) {
      this.on(this.elements.includeDataUri, 'change', () => {
        this.updateImageBase64Output();
      });
    }
  }

  switchTab(tabName) {
    document.querySelectorAll('.tool-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');

    this.elements.stats.style.display = 'none';
    this.hideEncoderError();
  }

  // 텍스트 인코딩/디코딩
  encode() {
    const input = this.elements.textInput.value;
    if (!input) {
      this.showToast('텍스트를 입력하세요.', 'warning');
      return;
    }

    try {
      this.hideEncoderError();
      let encoded = this.textToBase64(input);

      if (this.elements.urlSafe.checked) {
        encoded = this.toUrlSafe(encoded);
      }

      if (this.elements.lineBreak.checked) {
        encoded = this.addLineBreaks(encoded, 76);
      }

      this.elements.base64Output.value = encoded;
      this.updateStats(input.length, encoded.length);
      this.showSuccess('인코딩 완료');
    } catch (error) {
      this.showEncoderError('인코딩 실패: ' + error.message);
    }
  }

  decode() {
    let input = this.elements.base64Output.value.trim();
    if (!input) {
      this.showToast('Base64 문자열을 입력하세요.', 'warning');
      return;
    }

    try {
      this.hideEncoderError();
      input = input.replace(/[\r\n\s]/g, '');

      if (this.elements.urlSafe.checked) {
        input = this.fromUrlSafe(input);
      }

      const decoded = this.base64ToText(input);
      this.elements.textInput.value = decoded;
      this.updateStats(decoded.length, input.length);
      this.showSuccess('디코딩 완료');
    } catch (error) {
      this.showEncoderError('디코딩 실패: 유효하지 않은 Base64 문자열입니다.');
    }
  }

  clearText() {
    this.elements.textInput.value = '';
    this.elements.base64Output.value = '';
    this.elements.stats.style.display = 'none';
    this.hideEncoderError();
    this.elements.textInput.focus();
  }

  async copyOutput() {
    const output = this.elements.base64Output.value;
    if (!output) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    await navigator.clipboard.writeText(output);
    this.showSuccess('클립보드에 복사되었습니다.');
  }

  downloadText() {
    const output = this.elements.base64Output.value;
    if (!output) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    this.downloadFile(output, 'encoded.txt', 'text/plain');
  }

  // 이미지 인코딩/디코딩
  handleImageSelect(file) {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      this.showError('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    this.currentImageFile = file;
    this.hideEncoderError();

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUri = e.target.result;
      this.currentImageBase64 = dataUri;

      this.elements.previewImg.src = dataUri;
      this.elements.imagePreview.style.display = 'block';
      this.elements.imageDropZone.style.display = 'none';

      this.updateImageBase64Output();

      const base64Only = dataUri.split(',')[1] || dataUri;
      this.updateStats(file.size, base64Only.length);
    };
    reader.readAsDataURL(file);
  }

  updateImageBase64Output() {
    if (!this.currentImageBase64) return;

    let output = this.currentImageBase64;

    if (!this.elements.includeDataUri.checked) {
      output = output.split(',')[1] || output;
    }

    if (this.elements.urlSafe.checked) {
      const base64Part = output.includes(',') ? output.split(',')[1] : output;
      const prefix = output.includes(',') ? output.split(',')[0] + ',' : '';
      output = prefix + this.toUrlSafe(base64Part);
    }

    this.elements.imageBase64Output.value = output;
  }

  removeImage() {
    this.currentImageFile = null;
    this.currentImageBase64 = null;
    this.elements.imageInput.value = '';
    this.elements.previewImg.src = '';
    this.elements.imagePreview.style.display = 'none';
    this.elements.imageDropZone.style.display = 'flex';
    this.elements.imageBase64Output.value = '';
    this.elements.stats.style.display = 'none';
  }

  async copyImageOutput() {
    const output = this.elements.imageBase64Output.value;
    if (!output) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    await navigator.clipboard.writeText(output);
    this.showSuccess('클립보드에 복사되었습니다.');
  }

  downloadImageBase64() {
    const output = this.elements.imageBase64Output.value;
    if (!output) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    this.downloadFile(output, 'image-base64.txt', 'text/plain');
  }

  decodeImage() {
    let input = this.elements.imageBase64Input.value.trim();
    if (!input) {
      this.showToast('Base64 문자열을 입력하세요.', 'warning');
      return;
    }

    try {
      this.hideEncoderError();

      if (!input.startsWith('data:')) {
        const mimeType = this.guessMimeType(input);
        input = `data:${mimeType};base64,${input}`;
      }

      this.elements.decodedImg.src = input;
      this.elements.decodedImageArea.style.display = 'block';

      this.elements.decodedImg.onerror = () => {
        this.showEncoderError('유효하지 않은 이미지 Base64 데이터입니다.');
        this.elements.decodedImageArea.style.display = 'none';
      };

      this.showSuccess('이미지 변환 완료');
    } catch (error) {
      this.showEncoderError('이미지 변환 실패: ' + error.message);
    }
  }

  downloadDecodedImage() {
    const dataUri = this.elements.decodedImg.src;
    if (!dataUri || !dataUri.startsWith('data:')) {
      this.showToast('다운로드할 이미지가 없습니다.', 'warning');
      return;
    }

    const blob = this.dataUriToBlob(dataUri);
    const ext = this.getExtensionFromMime(blob.type);
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `decoded-image.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showSuccess('다운로드 시작');
  }

  // 파일 인코딩
  handleFileSelect(file) {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      this.showError('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    this.currentFile = file;
    this.hideEncoderError();

    this.elements.fileName.textContent = file.name;
    this.elements.fileSize.textContent = this.formatFileSize(file.size);
    this.elements.fileInfo.style.display = 'flex';
    this.elements.fileDropZone.style.display = 'none';

    const reader = new FileReader();
    reader.onload = (e) => {
      let base64 = e.target.result.split(',')[1];

      if (this.elements.urlSafe.checked) {
        base64 = this.toUrlSafe(base64);
      }

      if (this.elements.lineBreak.checked) {
        base64 = this.addLineBreaks(base64, 76);
      }

      this.elements.fileBase64Output.value = base64;
      this.updateStats(file.size, base64.length);
    };
    reader.readAsDataURL(file);
  }

  removeFile() {
    this.currentFile = null;
    this.elements.fileInput.value = '';
    this.elements.fileInfo.style.display = 'none';
    this.elements.fileDropZone.style.display = 'flex';
    this.elements.fileBase64Output.value = '';
    this.elements.stats.style.display = 'none';
  }

  async copyFileOutput() {
    const output = this.elements.fileBase64Output.value;
    if (!output) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    await navigator.clipboard.writeText(output);
    this.showSuccess('클립보드에 복사되었습니다.');
  }

  downloadFileBase64() {
    const output = this.elements.fileBase64Output.value;
    if (!output) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    const filename = this.currentFile ? `${this.currentFile.name}.base64.txt` : 'file-base64.txt';
    this.downloadFile(output, filename, 'text/plain');
  }

  // 유틸리티 함수
  textToBase64(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
  }

  base64ToText(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  }

  toUrlSafe(base64) {
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  fromUrlSafe(urlSafe) {
    let base64 = urlSafe
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padding = base64.length % 4;
    if (padding) {
      base64 += '='.repeat(4 - padding);
    }

    return base64;
  }

  addLineBreaks(str, lineLength) {
    const lines = [];
    for (let i = 0; i < str.length; i += lineLength) {
      lines.push(str.substring(i, i + lineLength));
    }
    return lines.join('\n');
  }

  guessMimeType(base64) {
    const signatures = {
      '/9j/': 'image/jpeg',
      'iVBORw': 'image/png',
      'R0lGOD': 'image/gif',
      'UklGR': 'image/webp',
      'PHN2Zw': 'image/svg+xml'
    };

    for (const [sig, mime] of Object.entries(signatures)) {
      if (base64.startsWith(sig)) {
        return mime;
      }
    }

    return 'image/png';
  }

  dataUriToBlob(dataUri) {
    const parts = dataUri.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const base64 = parts[1];
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }

    return new Blob([array], { type: mimeType });
  }

  getExtensionFromMime(mimeType) {
    const mimeMap = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'image/bmp': 'bmp'
    };
    return mimeMap[mimeType] || 'png';
  }

  updateStats(originalSize, encodedSize) {
    this.elements.stats.style.display = 'flex';

    document.getElementById('statOriginalSize').textContent = this.formatFileSize(originalSize);
    document.getElementById('statEncodedSize').textContent = this.formatFileSize(encodedSize);

    const ratio = ((encodedSize / originalSize) * 100).toFixed(1);
    document.getElementById('statRatio').textContent = ratio + '%';

    document.getElementById('statCharCount').textContent = encodedSize.toLocaleString();
  }

  showEncoderError(message) {
    this.elements.errorPanel.style.display = 'block';
    this.elements.errorMessage.textContent = message;
    this.showError(message);
  }

  hideEncoderError() {
    this.elements.errorPanel.style.display = 'none';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const base64Encoder = new Base64Encoder();
window.Base64Encoder = base64Encoder;

document.addEventListener('DOMContentLoaded', () => base64Encoder.init());
