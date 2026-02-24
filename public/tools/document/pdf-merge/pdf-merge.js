/**
 * PDF 병합 도구 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PdfMerge = class PdfMerge extends ToolBase {
  constructor() {
    super('PdfMerge');
    this.files = [];
    this.draggedItem = null;
    this.mergedPdfBytes = null;
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      filesSection: 'filesSection',
      filesList: 'filesList',
      fileCount: 'fileCount',
      settingsSection: 'settingsSection',
      resultSection: 'resultSection',
      resultInfo: 'resultInfo',
      outputName: 'outputName',
      mergeBtn: 'mergeBtn'
    });

    this.setupEventListeners();
    console.log('[PdfMerge] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { dropzone, fileInput } = this.elements;

    this.on(dropzone, 'click', () => fileInput.click());
    this.on(fileInput, 'change', (e) => {
      if (e.target.files.length > 0) {
        this.addFiles(Array.from(e.target.files));
      }
    });

    this.on(dropzone, 'dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    this.on(dropzone, 'dragleave', () => dropzone.classList.remove('dragover'));
    this.on(dropzone, 'drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      if (files.length > 0) {
        this.addFiles(files);
      } else {
        this.showToast('PDF 파일만 지원합니다.', 'error');
      }
    });
  }

  async addFiles(files) {
    const pdfFiles = files.filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      this.showToast('PDF 파일만 지원합니다.', 'error');
      return;
    }

    for (const file of pdfFiles) {
      const arrayBuffer = await file.arrayBuffer();
      let pageCount = 0;

      try {
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        pageCount = pdfDoc.getPageCount();
      } catch (error) {
        console.error('PDF 로드 오류:', error);
        this.showToast(`${file.name} 파일을 읽을 수 없습니다.`, 'error');
        continue;
      }

      this.files.push({
        id: Date.now() + Math.random(),
        file,
        arrayBuffer,
        name: file.name,
        size: file.size,
        pageCount
      });
    }

    this.renderFilesList();
    this.elements.filesSection.style.display = 'block';
    this.elements.settingsSection.style.display = 'block';
    this.elements.resultSection.style.display = 'none';
    this.elements.fileInput.value = '';
    this.showSuccess(`${pdfFiles.length}개 PDF 추가됨`);
  }

  renderFilesList() {
    const { filesList, fileCount } = this.elements;
    fileCount.textContent = this.files.length;

    filesList.innerHTML = this.files.map((pdf, index) => `
      <div class="file-card" data-id="${pdf.id}" draggable="true">
        <div class="file-order">${index + 1}</div>
        <div class="file-icon"></div>
        <div class="file-info">
          <div class="file-name">${this.truncateName(pdf.name, 30)}</div>
          <div class="file-meta">${pdf.pageCount}페이지 · ${this.formatFileSize(pdf.size)}</div>
        </div>
        <button class="file-remove" onclick="pdfMerge.removeFile('${pdf.id}')" title="삭제">×</button>
      </div>
    `).join('');

    this.setupDragSort();
  }

  setupDragSort() {
    const cards = document.querySelectorAll('.file-card');
    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        this.draggedItem = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        this.draggedItem = null;
      });

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (this.draggedItem && this.draggedItem !== card) {
          const rect = card.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            card.parentNode.insertBefore(this.draggedItem, card);
          } else {
            card.parentNode.insertBefore(this.draggedItem, card.nextSibling);
          }
          this.updateFilesOrder();
        }
      });
    });
  }

  updateFilesOrder() {
    const cards = document.querySelectorAll('.file-card');
    const newOrder = [];
    cards.forEach((card, index) => {
      const id = card.dataset.id;
      const pdf = this.files.find(f => String(f.id) === id);
      if (pdf) {
        newOrder.push(pdf);
        card.querySelector('.file-order').textContent = index + 1;
      }
    });
    this.files = newOrder;
  }

  removeFile(id) {
    this.files = this.files.filter(f => String(f.id) !== String(id));
    this.renderFilesList();

    if (this.files.length === 0) {
      this.elements.filesSection.style.display = 'none';
      this.elements.settingsSection.style.display = 'none';
    }
  }

  addMore() {
    this.elements.fileInput.click();
  }

  clearAll() {
    this.files = [];
    this.renderFilesList();
    this.elements.filesSection.style.display = 'none';
    this.elements.settingsSection.style.display = 'none';
    this.elements.resultSection.style.display = 'none';
    this.showToast('모든 파일이 삭제되었습니다.', 'info');
  }

  async merge() {
    if (this.files.length < 2) {
      this.showToast('2개 이상의 PDF 파일이 필요합니다.', 'error');
      return;
    }

    const btn = this.elements.mergeBtn;
    const originalText = btn.innerHTML;
    btn.innerHTML = '병합 중...';
    btn.disabled = true;

    try {
      const mergedPdf = await PDFLib.PDFDocument.create();

      for (const pdf of this.files) {
        const srcDoc = await PDFLib.PDFDocument.load(pdf.arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
      }

      this.mergedPdfBytes = await mergedPdf.save();

      const totalPages = this.files.reduce((sum, f) => sum + f.pageCount, 0);
      this.elements.resultInfo.innerHTML = `
        <div class="result-stats">
          <div class="stat-item">
            <span class="stat-label">원본 파일</span>
            <span class="stat-value">${this.files.length}개</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">총 페이지</span>
            <span class="stat-value">${totalPages}페이지</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">결과 파일 크기</span>
            <span class="stat-value">${this.formatFileSize(this.mergedPdfBytes.length)}</span>
          </div>
        </div>
      `;

      this.elements.resultSection.style.display = 'block';
      this.showSuccess('PDF 병합이 완료되었습니다!');

    } catch (error) {
      console.error('병합 오류:', error);
      this.showError('PDF 병합 중 오류가 발생했습니다.');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  download() {
    if (!this.mergedPdfBytes) return;

    const fileName = (this.elements.outputName.value || 'merged') + '.pdf';
    const blob = new Blob([this.mergedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    this.showSuccess('다운로드가 시작되었습니다.');
  }

  reset() {
    this.files = [];
    this.mergedPdfBytes = null;
    this.elements.filesSection.style.display = 'none';
    this.elements.settingsSection.style.display = 'none';
    this.elements.resultSection.style.display = 'none';
    this.elements.outputName.value = 'merged';
    this.showToast('초기화되었습니다.', 'info');
  }

  truncateName(name, maxLen) {
    if (name.length <= maxLen) return name;
    const ext = name.split('.').pop();
    const base = name.slice(0, maxLen - ext.length - 4);
    return `${base}...${ext}`;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const pdfMerge = new PdfMerge();
window.PdfMerge = pdfMerge;

document.addEventListener('DOMContentLoaded', () => pdfMerge.init());
