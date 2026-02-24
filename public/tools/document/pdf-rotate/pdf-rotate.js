/**
 * PDF 회전 도구 - ToolBase 기반
 * pdf-lib를 사용하여 PDF 페이지 회전
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PdfRotate = class PdfRotate extends ToolBase {
  constructor() {
    super('PdfRotate');
    this.pdfFile = null;
    this.pdfDoc = null;
    this.resultBlob = null;
    this.globalRotation = 90;
    this.pageRotations = {};
    this.selectedPages = new Set();
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
      pagesPreview: 'pagesPreview',
      pageTarget: 'pageTarget',
      applyBtn: 'applyBtn'
    });

    this.setupEventListeners();
    console.log('[PdfRotate] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { dropzone, fileInput, pageTarget } = this.elements;

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

    this.on(pageTarget, 'change', (e) => {
      if (e.target.value === 'all') {
        this.selectAllPages();
      }
    });
  }

  async handleFile(file) {
    if (file.size > 50 * 1024 * 1024) {
      this.showToast('파일 크기가 50MB를 초과합니다.', 'error');
      return;
    }

    this.pdfFile = file;
    this.pageRotations = {};
    this.selectedPages.clear();

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
      const pageCount = this.pdfDoc.getPageCount();

      this.elements.fileName.textContent = file.name;
      this.elements.fileMeta.textContent = `${this.formatFileSize(file.size)} · ${pageCount}페이지`;

      // 모든 페이지 선택 (기본값)
      for (let i = 0; i < pageCount; i++) {
        this.selectedPages.add(i);
        this.pageRotations[i] = 0;
      }

      this.elements.dropzone.parentElement.style.display = 'none';
      this.elements.fileInfo.style.display = 'block';
      this.elements.settingsSection.style.display = 'block';

      await this.renderPagePreviews();
    } catch (error) {
      console.error('PDF 로드 실패:', error);
      this.showError('PDF 파일을 읽을 수 없습니다.');
    }
  }

  async renderPagePreviews() {
    const container = this.elements.pagesPreview;
    container.innerHTML = '';

    const pageCount = this.pdfDoc.getPageCount();

    for (let i = 0; i < pageCount; i++) {
      const card = document.createElement('div');
      card.className = 'page-card' + (this.selectedPages.has(i) ? ' selected' : '');
      card.dataset.page = i;
      card.innerHTML = `
        <div class="page-placeholder" style="font-size: 24px; color: var(--tools-text-secondary);"></div>
        <span class="page-number">페이지 ${i + 1}</span>
        <span class="page-rotation" style="display: none;">0°</span>
        <button class="page-rotate-btn" onclick="event.stopPropagation(); pdfRotate.rotatePageIndividual(${i})">↻</button>
      `;

      card.addEventListener('click', () => this.togglePageSelection(i));
      container.appendChild(card);
    }
  }

  togglePageSelection(pageIndex) {
    const pageTarget = this.elements.pageTarget.value;
    if (pageTarget === 'all') return;

    if (this.selectedPages.has(pageIndex)) {
      this.selectedPages.delete(pageIndex);
    } else {
      this.selectedPages.add(pageIndex);
    }

    const card = document.querySelector(`.page-card[data-page="${pageIndex}"]`);
    card.classList.toggle('selected', this.selectedPages.has(pageIndex));
  }

  selectAllPages() {
    const pageCount = this.pdfDoc.getPageCount();
    this.selectedPages.clear();
    for (let i = 0; i < pageCount; i++) {
      this.selectedPages.add(i);
    }
    document.querySelectorAll('.page-card').forEach(card => {
      card.classList.add('selected');
    });
  }

  setRotation(angle) {
    this.globalRotation = angle;
    document.querySelectorAll('.rotation-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.angle) === angle);
    });
  }

  rotatePageIndividual(pageIndex) {
    this.pageRotations[pageIndex] = (this.pageRotations[pageIndex] + 90) % 360;
    const card = document.querySelector(`.page-card[data-page="${pageIndex}"]`);
    const rotationLabel = card.querySelector('.page-rotation');
    rotationLabel.textContent = this.pageRotations[pageIndex] + '°';
    rotationLabel.style.display = this.pageRotations[pageIndex] ? 'block' : 'none';
  }

  removeFile() {
    this.pdfFile = null;
    this.pdfDoc = null;
    this.pageRotations = {};
    this.selectedPages.clear();
    this.elements.fileInput.value = '';
    this.elements.dropzone.parentElement.style.display = 'block';
    this.elements.fileInfo.style.display = 'none';
    this.elements.settingsSection.style.display = 'none';
    this.elements.resultSection.style.display = 'none';
  }

  async apply() {
    if (!this.pdfDoc) {
      this.showToast('PDF 파일을 먼저 선택해주세요.', 'error');
      return;
    }

    const applyBtn = this.elements.applyBtn;
    applyBtn.classList.add('loading');
    applyBtn.disabled = true;

    try {
      const newPdfDoc = await PDFLib.PDFDocument.load(await this.pdfFile.arrayBuffer());
      const pages = newPdfDoc.getPages();
      let rotatedCount = 0;

      pages.forEach((page, index) => {
        let totalRotation = this.pageRotations[index] || 0;

        if (this.selectedPages.has(index)) {
          totalRotation += this.globalRotation;
        }

        if (totalRotation !== 0) {
          const currentRotation = page.getRotation().angle;
          page.setRotation(PDFLib.degrees(currentRotation + totalRotation));
          rotatedCount++;
        }
      });

      const pdfBytes = await newPdfDoc.save();
      this.resultBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      this.elements.resultInfo.innerHTML = `
        <div>${rotatedCount}개 페이지가 회전되었습니다.</div>
        <div style="margin-top: 8px;">파일 크기: ${this.formatFileSize(this.resultBlob.size)}</div>
      `;

      this.elements.settingsSection.style.display = 'none';
      this.elements.resultSection.style.display = 'block';

    } catch (error) {
      console.error('회전 적용 실패:', error);
      this.showError('회전 적용 중 오류가 발생했습니다.');
    } finally {
      applyBtn.classList.remove('loading');
      applyBtn.disabled = false;
    }
  }

  download() {
    if (!this.resultBlob) return;

    const url = URL.createObjectURL(this.resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.pdfFile.name.replace('.pdf', '_rotated.pdf');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  reset() {
    this.pdfFile = null;
    this.pdfDoc = null;
    this.resultBlob = null;
    this.pageRotations = {};
    this.selectedPages.clear();

    this.elements.fileInput.value = '';
    this.elements.dropzone.parentElement.style.display = 'block';
    this.elements.fileInfo.style.display = 'none';
    this.elements.settingsSection.style.display = 'none';
    this.elements.resultSection.style.display = 'none';
    this.elements.pagesPreview.innerHTML = '';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const pdfRotate = new PdfRotate();
window.PdfRotate = pdfRotate;

document.addEventListener('DOMContentLoaded', () => pdfRotate.init());
