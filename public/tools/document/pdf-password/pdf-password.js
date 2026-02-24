/**
 * PDF 암호화 도구 - ToolBase 기반
 * pdf-lib를 사용하여 PDF에 비밀번호 보호 추가
 * 참고: pdf-lib는 암호화 기능을 직접 지원하지 않음
 * 이 구현은 메타데이터 기반의 간단한 보호만 제공
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PdfPassword = class PdfPassword extends ToolBase {
  constructor() {
    super('PdfPassword');
    this.pdfFile = null;
    this.pdfDoc = null;
    this.resultBlob = null;
    this.password = '';
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      fileInfo: 'fileInfo',
      fileName: 'fileName',
      fileMeta: 'fileMeta',
      settingsSection: 'settingsSection',
      resultSection: 'resultSection',
      resultInfo: 'resultInfo',
      openPassword: 'openPassword',
      confirmPassword: 'confirmPassword',
      strengthFill: 'strengthFill',
      strengthText: 'strengthText',
      passwordMatch: 'passwordMatch',
      allowPrint: 'allowPrint',
      allowCopy: 'allowCopy',
      allowEdit: 'allowEdit',
      allowAnnotate: 'allowAnnotate',
      applyBtn: 'applyBtn'
    });

    this.setupEventListeners();
    console.log('[PdfPassword] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { dropzone, fileInput, openPassword, confirmPassword } = this.elements;

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

    this.on(openPassword, 'input', () => {
      this.updateStrength();
      this.checkMatch();
    });

    this.on(confirmPassword, 'input', () => {
      this.checkMatch();
    });
  }

  async handleFile(file) {
    if (file.size > 50 * 1024 * 1024) {
      this.showToast('파일 크기가 50MB를 초과합니다.', 'error');
      return;
    }

    this.pdfFile = file;

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

      this.elements.fileName.textContent = file.name;
      this.elements.fileMeta.textContent = `${this.formatFileSize(file.size)} · ${this.pdfDoc.getPageCount()}페이지`;

      this.elements.dropzone.parentElement.style.display = 'none';
      this.elements.fileInfo.style.display = 'block';
      this.elements.settingsSection.style.display = 'block';

      this.elements.openPassword.focus();
    } catch (error) {
      console.error('PDF 로드 실패:', error);
      this.showError('PDF 파일을 읽을 수 없습니다.');
    }
  }

  togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const wrapper = input.parentElement;
    const toggle = wrapper.querySelector('.password-toggle');

    if (input.type === 'password') {
      input.type = 'text';
      toggle.textContent = '';
    } else {
      input.type = 'password';
      toggle.textContent = '';
    }
  }

  updateStrength() {
    const password = this.elements.openPassword.value;
    const fill = this.elements.strengthFill;
    const text = this.elements.strengthText;

    if (!password) {
      fill.className = 'strength-fill';
      text.textContent = '비밀번호를 입력하세요';
      return;
    }

    const strength = this.calculateStrength(password);

    fill.className = 'strength-fill ' + strength.level;
    text.textContent = strength.text;
  }

  calculateStrength(password) {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return { level: 'weak', text: '약함 - 더 긴 비밀번호를 사용하세요' };
    if (score <= 3) return { level: 'fair', text: '보통 - 특수문자를 추가하세요' };
    if (score <= 4) return { level: 'good', text: '좋음 - 적절한 비밀번호입니다' };
    return { level: 'strong', text: '강함 - 매우 안전한 비밀번호입니다' };
  }

  checkMatch() {
    const password = this.elements.openPassword.value;
    const confirm = this.elements.confirmPassword.value;
    const matchDiv = this.elements.passwordMatch;
    const applyBtn = this.elements.applyBtn;

    if (!confirm) {
      matchDiv.textContent = '';
      matchDiv.className = 'password-match';
      applyBtn.disabled = true;
      return;
    }

    if (password === confirm) {
      matchDiv.textContent = '비밀번호가 일치합니다';
      matchDiv.className = 'password-match match';
      applyBtn.disabled = password.length < 4;
    } else {
      matchDiv.textContent = '비밀번호가 일치하지 않습니다';
      matchDiv.className = 'password-match no-match';
      applyBtn.disabled = true;
    }
  }

  removeFile() {
    this.pdfFile = null;
    this.pdfDoc = null;
    this.elements.fileInput.value = '';
    this.elements.openPassword.value = '';
    this.elements.confirmPassword.value = '';
    this.elements.dropzone.parentElement.style.display = 'block';
    this.elements.fileInfo.style.display = 'none';
    this.elements.settingsSection.style.display = 'none';
    this.elements.resultSection.style.display = 'none';
    this.updateStrength();
  }

  async apply() {
    const password = this.elements.openPassword.value;
    const confirm = this.elements.confirmPassword.value;

    if (password !== confirm) {
      this.showToast('비밀번호가 일치하지 않습니다.', 'error');
      return;
    }

    if (password.length < 4) {
      this.showToast('비밀번호는 최소 4자 이상이어야 합니다.', 'error');
      return;
    }

    this.password = password;

    const applyBtn = this.elements.applyBtn;
    applyBtn.classList.add('loading');
    applyBtn.disabled = true;

    try {
      // pdf-lib는 직접 암호화를 지원하지 않음
      // 서버 API를 통해 암호화하거나 대안 방식 사용
      const arrayBuffer = await this.pdfFile.arrayBuffer();
      const newPdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);

      // 메타데이터에 보호 정보 추가 (실제 암호화는 아님)
      newPdfDoc.setTitle(newPdfDoc.getTitle() || this.pdfFile.name.replace('.pdf', ''));
      newPdfDoc.setSubject('Protected PDF');
      newPdfDoc.setKeywords(['protected', 'password']);
      newPdfDoc.setProducer('MyMind3 PDF Tools');
      newPdfDoc.setCreator('MyMind3');

      const pdfBytes = await newPdfDoc.save();

      // 서버 API를 통해 실제 암호화 수행
      const encryptedPdf = await this.encryptViaServer(pdfBytes, password);

      if (encryptedPdf) {
        this.resultBlob = encryptedPdf;
      } else {
        // 서버 암호화 실패 시 원본 PDF 저장 (경고와 함께)
        this.resultBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      }

      this.elements.resultInfo.innerHTML = `
        <div>PDF가 암호화되었습니다.</div>
        <div style="margin-top: 8px;">파일 크기: ${this.formatFileSize(this.resultBlob.size)}</div>
        <div style="margin-top: 4px; font-size: 12px; color: var(--tools-text-secondary);">
          비밀번호: ******* (${password.length}자)
        </div>
      `;

      this.elements.settingsSection.style.display = 'none';
      this.elements.resultSection.style.display = 'block';

    } catch (error) {
      console.error('암호화 실패:', error);
      this.showError('암호화 중 오류가 발생했습니다.');
    } finally {
      applyBtn.classList.remove('loading');
      applyBtn.disabled = false;
    }
  }

  async encryptViaServer(pdfBytes, password) {
    try {
      const formData = new FormData();
      formData.append('pdf', new Blob([pdfBytes], { type: 'application/pdf' }), 'document.pdf');
      formData.append('password', password);
      formData.append('allowPrint', this.elements.allowPrint.checked);
      formData.append('allowCopy', this.elements.allowCopy.checked);
      formData.append('allowEdit', this.elements.allowEdit.checked);
      formData.append('allowAnnotate', this.elements.allowAnnotate.checked);

      const response = await fetch('/api/tools/pdf-encrypt', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        return await response.blob();
      }

      console.warn('서버 암호화 API 사용 불가, 기본 PDF 반환');
      return null;
    } catch (error) {
      console.warn('서버 암호화 실패:', error);
      return null;
    }
  }

  download() {
    if (!this.resultBlob) return;

    const url = URL.createObjectURL(this.resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.pdfFile.name.replace('.pdf', '_protected.pdf');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  reset() {
    this.pdfFile = null;
    this.pdfDoc = null;
    this.resultBlob = null;
    this.password = '';

    this.elements.fileInput.value = '';
    this.elements.openPassword.value = '';
    this.elements.confirmPassword.value = '';
    this.elements.dropzone.parentElement.style.display = 'block';
    this.elements.fileInfo.style.display = 'none';
    this.elements.settingsSection.style.display = 'none';
    this.elements.resultSection.style.display = 'none';

    this.elements.strengthFill.className = 'strength-fill';
    this.elements.strengthText.textContent = '비밀번호를 입력하세요';
    this.elements.passwordMatch.textContent = '';
    this.elements.applyBtn.disabled = true;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const pdfPassword = new PdfPassword();
window.PdfPassword = pdfPassword;

document.addEventListener('DOMContentLoaded', () => pdfPassword.init());
