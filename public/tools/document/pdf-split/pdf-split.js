/**
 * PDF 분할 도구 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PdfSplit = class PdfSplit extends ToolBase {
  constructor() {
    super('PdfSplit');
    this.currentFile = null;
    this.pdfDoc = null;
    this.pageCount = 0;
    this.splitResults = [];
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      fileInfoSection: 'fileInfoSection',
      fileName: 'fileName',
      fileMeta: 'fileMeta',
      settingsSection: 'settingsSection',
      rangeInputSection: 'rangeInputSection',
      countInputSection: 'countInputSection',
      pageRange: 'pageRange',
      pageCountInput: 'pageCount',
      resultSection: 'resultSection',
      resultList: 'resultList',
      resultCount: 'resultCount',
      splitBtn: 'splitBtn'
    });

    this.setupEventListeners();
    console.log('[PdfSplit] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { dropzone, fileInput } = this.elements;

    this.on(dropzone, 'click', () => fileInput.click());
    this.on(fileInput, 'change', (e) => {
      if (e.target.files.length > 0) {
        this.loadFile(e.target.files[0]);
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
      const file = e.dataTransfer.files[0];
      if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
        this.loadFile(file);
      } else {
        this.showToast('PDF 파일만 지원합니다.', 'error');
      }
    });
  }

  async loadFile(file) {
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      this.showToast('PDF 파일만 지원합니다.', 'error');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
      this.pageCount = this.pdfDoc.getPageCount();
      this.currentFile = file;

      this.elements.fileName.textContent = file.name;
      this.elements.fileMeta.textContent = `${this.pageCount}페이지 · ${this.formatFileSize(file.size)}`;

      this.elements.dropzone.parentElement.style.display = 'none';
      this.elements.fileInfoSection.style.display = 'block';
      this.elements.settingsSection.style.display = 'block';
      this.elements.resultSection.style.display = 'none';

      this.updateSplitMode();
      this.showSuccess('PDF 파일이 로드되었습니다.');
    } catch (error) {
      console.error('PDF 로드 오류:', error);
      this.showError('PDF 파일을 읽을 수 없습니다.');
    }
  }

  changeFile() {
    this.elements.fileInput.click();
  }

  updateSplitMode() {
    const mode = document.querySelector('input[name="splitMode"]:checked').value;
    this.elements.rangeInputSection.style.display = mode === 'range' ? 'block' : 'none';
    this.elements.countInputSection.style.display = mode === 'count' ? 'block' : 'none';

    if (mode === 'range') {
      this.elements.pageRange.placeholder = `1-${this.pageCount}`;
    }
    if (mode === 'count') {
      this.elements.pageCountInput.max = this.pageCount;
    }
  }

  async split() {
    if (!this.pdfDoc) {
      this.showToast('PDF 파일을 먼저 선택해주세요.', 'error');
      return;
    }

    const mode = document.querySelector('input[name="splitMode"]:checked').value;
    const btn = this.elements.splitBtn;
    const originalText = btn.innerHTML;
    btn.innerHTML = '분할 중...';
    btn.disabled = true;

    try {
      this.splitResults = [];

      if (mode === 'each') {
        await this.splitEachPage();
      } else if (mode === 'range') {
        await this.splitByRange();
      } else if (mode === 'count') {
        await this.splitByCount();
      }

      this.renderResults();
      this.elements.resultSection.style.display = 'block';
      this.showSuccess(`${this.splitResults.length}개 파일로 분할되었습니다.`);

    } catch (error) {
      console.error('분할 오류:', error);
      this.showError('PDF 분할 중 오류가 발생했습니다.');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  async splitEachPage() {
    const baseName = this.currentFile.name.replace(/\.pdf$/i, '');

    for (let i = 0; i < this.pageCount; i++) {
      const newPdf = await PDFLib.PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(this.pdfDoc, [i]);
      newPdf.addPage(copiedPage);
      const pdfBytes = await newPdf.save();

      this.splitResults.push({
        name: `${baseName}_page${i + 1}.pdf`,
        pages: `${i + 1}`,
        bytes: pdfBytes
      });
    }
  }

  async splitByRange() {
    const rangeStr = this.elements.pageRange.value.trim();
    if (!rangeStr) {
      this.showToast('페이지 범위를 입력해주세요.', 'error');
      throw new Error('Invalid range');
    }

    const baseName = this.currentFile.name.replace(/\.pdf$/i, '');
    const ranges = this.parseRanges(rangeStr);

    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      const newPdf = await PDFLib.PDFDocument.create();
      const pageIndices = [];

      for (let p = range.start; p <= range.end; p++) {
        if (p >= 1 && p <= this.pageCount) {
          pageIndices.push(p - 1);
        }
      }

      if (pageIndices.length === 0) continue;

      const copiedPages = await newPdf.copyPages(this.pdfDoc, pageIndices);
      copiedPages.forEach(page => newPdf.addPage(page));
      const pdfBytes = await newPdf.save();

      const pagesStr = range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`;
      this.splitResults.push({
        name: `${baseName}_pages${pagesStr}.pdf`,
        pages: pagesStr,
        bytes: pdfBytes
      });
    }
  }

  async splitByCount() {
    const count = parseInt(this.elements.pageCountInput.value) || 1;
    const baseName = this.currentFile.name.replace(/\.pdf$/i, '');
    let partNum = 1;

    for (let i = 0; i < this.pageCount; i += count) {
      const newPdf = await PDFLib.PDFDocument.create();
      const endPage = Math.min(i + count, this.pageCount);
      const pageIndices = [];

      for (let p = i; p < endPage; p++) {
        pageIndices.push(p);
      }

      const copiedPages = await newPdf.copyPages(this.pdfDoc, pageIndices);
      copiedPages.forEach(page => newPdf.addPage(page));
      const pdfBytes = await newPdf.save();

      const startPage = i + 1;
      const pagesStr = startPage === endPage ? `${startPage}` : `${startPage}-${endPage}`;

      this.splitResults.push({
        name: `${baseName}_part${partNum}.pdf`,
        pages: pagesStr,
        bytes: pdfBytes
      });
      partNum++;
    }
  }

  parseRanges(str) {
    const ranges = [];
    const parts = str.split(',').map(s => s.trim()).filter(s => s);

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          ranges.push({ start: Math.min(start, end), end: Math.max(start, end) });
        }
      } else {
        const page = parseInt(part);
        if (!isNaN(page)) {
          ranges.push({ start: page, end: page });
        }
      }
    }

    return ranges;
  }

  renderResults() {
    this.elements.resultCount.textContent = this.splitResults.length;
    this.elements.resultList.innerHTML = this.splitResults.map((result, index) => `
      <div class="result-item">
        <div class="result-icon"></div>
        <div class="result-info">
          <div class="result-name">${result.name}</div>
          <div class="result-meta">페이지 ${result.pages} · ${this.formatFileSize(result.bytes.length)}</div>
        </div>
        <button class="tool-btn tool-btn-sm" onclick="pdfSplit.downloadSingle(${index})">다운로드</button>
      </div>
    `).join('');
  }

  downloadSingle(index) {
    const result = this.splitResults[index];
    if (!result) return;

    const blob = new Blob([result.bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  downloadAll() {
    this.splitResults.forEach((_, index) => {
      setTimeout(() => this.downloadSingle(index), index * 300);
    });
    this.showSuccess('모든 파일 다운로드 시작');
  }

  reset() {
    this.currentFile = null;
    this.pdfDoc = null;
    this.pageCount = 0;
    this.splitResults = [];

    this.elements.dropzone.parentElement.style.display = 'block';
    this.elements.fileInfoSection.style.display = 'none';
    this.elements.settingsSection.style.display = 'none';
    this.elements.resultSection.style.display = 'none';
    this.elements.fileInput.value = '';
    this.elements.pageRange.value = '';
    this.elements.pageCountInput.value = '1';

    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const pdfSplit = new PdfSplit();
window.PdfSplit = pdfSplit;

document.addEventListener('DOMContentLoaded', () => pdfSplit.init());
