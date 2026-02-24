/**
 * PDF 잠금 해제 도구 - ToolBase 기반
 * pdf-lib를 사용하여 암호화된 PDF 잠금 해제
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PdfUnlock = class PdfUnlock extends ToolBase {
  constructor() {
    super('PdfUnlock');
    this.pdfFile = null;
    this.pdfArrayBuffer = null;
    this.resultBlob = null;
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      unlockSection: 'unlockSection',
      fileName: 'fileName',
      fileMeta: 'fileMeta',
      password: 'password',
      errorSection: 'errorSection',
      errorMessage: 'errorMessage',
      resultSection: 'resultSection',
      resultInfo: 'resultInfo',
      unlockBtn: 'unlockBtn'
    });

    this.setupEventListeners();
    console.log('[PdfUnlock] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { dropzone, fileInput, password } = this.elements;

    this.on(dropzone, 'click', () => fileInput.click());
    this.on(dropzone, 'dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    this.on(dropzone, 'dragleave', () => dropzone.classList.remove('dragover'));
    this.on(dropzone, 'drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type === 'application/pdf') {
        this.handleFile(file);
      }
    });
    this.on(fileInput, 'change', (e) => {
      if (e.target.files[0]) {
        this.handleFile(e.target.files[0]);
      }
    });

    this.on(password, 'keypress', (e) => {
      if (e.key === 'Enter') {
        this.unlock();
      }
    });
  }

  async handleFile(file) {
    if (file.size > 50 * 1024 * 1024) {
      this.showToast('파일 크기가 50MB를 초과합니다.', 'error');
      return;
    }

    this.pdfFile = file;
    this.pdfArrayBuffer = await file.arrayBuffer();

    this.elements.fileName.textContent = file.name;
    this.elements.fileMeta.textContent = this.formatFileSize(file.size);

    this.elements.dropzone.parentElement.style.display = 'none';
    this.elements.unlockSection.style.display = 'block';
    this.elements.errorSection.style.display = 'none';
    this.elements.resultSection.style.display = 'none';

    // 비밀번호 입력 필드에 포커스
    this.elements.password.focus();
  }

  togglePassword() {
    const input = this.elements.password;
    const toggle = document.querySelector('.password-toggle');
    if (input.type === 'password') {
      input.type = 'text';
      toggle.textContent = '';
    } else {
      input.type = 'password';
      toggle.textContent = '';
    }
  }

  removeFile() {
    this.pdfFile = null;
    this.pdfArrayBuffer = null;
    this.elements.fileInput.value = '';
    this.elements.password.value = '';
    this.elements.dropzone.parentElement.style.display = 'block';
    this.elements.unlockSection.style.display = 'none';
    this.elements.errorSection.style.display = 'none';
    this.elements.resultSection.style.display = 'none';
  }

  async unlock() {
    const password = this.elements.password.value;

    if (!this.pdfArrayBuffer) {
      this.showToast('PDF 파일을 먼저 선택해주세요.', 'error');
      return;
    }

    const unlockBtn = this.elements.unlockBtn;
    unlockBtn.classList.add('loading');
    unlockBtn.disabled = true;

    try {
      // 비밀번호로 PDF 로드 시도
      const pdfDoc = await PDFLib.PDFDocument.load(this.pdfArrayBuffer, {
        password: password,
        ignoreEncryption: false
      });

      // 잠금 해제된 PDF 저장 (암호화 없이)
      const pdfBytes = await pdfDoc.save();
      this.resultBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      const pageCount = pdfDoc.getPageCount();

      this.elements.resultInfo.innerHTML = `
        <div>PDF 잠금이 해제되었습니다!</div>
        <div style="margin-top: 8px;">페이지 수: ${pageCount}페이지</div>
        <div style="margin-top: 4px;">파일 크기: ${this.formatFileSize(this.resultBlob.size)}</div>
      `;

      this.elements.unlockSection.style.display = 'none';
      this.elements.errorSection.style.display = 'none';
      this.elements.resultSection.style.display = 'block';

    } catch (error) {
      console.error('잠금 해제 실패:', error);

      let errorMessage = '잠금 해제에 실패했습니다.';

      if (error.message.includes('password') || error.message.includes('decrypt')) {
        errorMessage = '비밀번호가 올바르지 않습니다. 다시 확인해주세요.';
      } else if (error.message.includes('encrypted')) {
        errorMessage = 'PDF가 암호화되어 있습니다. 올바른 비밀번호를 입력해주세요.';
      } else if (error.message.includes('Invalid')) {
        errorMessage = '유효하지 않은 PDF 파일입니다.';
      }

      this.elements.errorMessage.textContent = errorMessage;
      this.elements.unlockSection.style.display = 'none';
      this.elements.errorSection.style.display = 'block';

    } finally {
      unlockBtn.classList.remove('loading');
      unlockBtn.disabled = false;
    }
  }

  retry() {
    this.elements.errorSection.style.display = 'none';
    this.elements.unlockSection.style.display = 'block';
    this.elements.password.value = '';
    this.elements.password.focus();
  }

  download() {
    if (!this.resultBlob) return;

    const url = URL.createObjectURL(this.resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.pdfFile.name.replace('.pdf', '_unlocked.pdf');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  reset() {
    this.pdfFile = null;
    this.pdfArrayBuffer = null;
    this.resultBlob = null;

    this.elements.fileInput.value = '';
    this.elements.password.value = '';
    this.elements.dropzone.parentElement.style.display = 'block';
    this.elements.unlockSection.style.display = 'none';
    this.elements.errorSection.style.display = 'none';
    this.elements.resultSection.style.display = 'none';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const pdfUnlock = new PdfUnlock();
window.PdfUnlock = pdfUnlock;

document.addEventListener('DOMContentLoaded', () => pdfUnlock.init());
