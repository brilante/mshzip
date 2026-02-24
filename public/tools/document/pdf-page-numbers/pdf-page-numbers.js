/**
 * PDF 페이지 번호 도구 - ToolBase 기반
 * pdf-lib를 사용하여 PDF에 페이지 번호 추가
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PdfPageNumbers = class PdfPageNumbers extends ToolBase {
  constructor() {
    super('PdfPageNumbers');
    this.pdfFile = null;
    this.pdfDoc = null;
    this.resultBlob = null;
    this.position = 'bottom-center';
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
      pageRange: 'pageRange',
      customRangeRow: 'customRangeRow',
      customRange: 'customRange',
      numberFormat: 'numberFormat',
      startNumber: 'startNumber',
      fontSize: 'fontSize',
      fontSizeValue: 'fontSizeValue',
      margin: 'margin',
      marginValue: 'marginValue',
      textColor: 'textColor',
      previewNumber: 'previewNumber',
      applyBtn: 'applyBtn'
    });

    this.setupEventListeners();
    this.initSliders();
    this.updatePreview();
    console.log('[PdfPageNumbers] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { dropzone, fileInput, pageRange, numberFormat, textColor } = this.elements;

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

    this.on(pageRange, 'change', (e) => {
      this.elements.customRangeRow.style.display = e.target.value === 'custom' ? 'flex' : 'none';
    });

    this.on(numberFormat, 'change', () => this.updatePreview());
    this.on(textColor, 'change', () => this.updatePreview());
  }

  initSliders() {
    const sliders = [
      { id: 'fontSize', suffix: 'px', valueId: 'fontSizeValue' },
      { id: 'margin', suffix: 'px', valueId: 'marginValue' }
    ];

    sliders.forEach(({ id, suffix, valueId }) => {
      const slider = this.elements[id];
      const value = this.elements[valueId];
      if (slider && value) {
        this.on(slider, 'input', () => {
          value.textContent = slider.value + suffix;
          this.updatePreview();
        });
      }
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
    } catch (error) {
      console.error('PDF 로드 실패:', error);
      this.showError('PDF 파일을 읽을 수 없습니다.');
    }
  }

  setPosition(pos) {
    this.position = pos;
    document.querySelectorAll('.position-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.position === pos);
    });
    this.updatePreview();
  }

  updatePreview() {
    const previewNumber = this.elements.previewNumber;
    const format = this.elements.numberFormat.value;
    const fontSize = this.elements.fontSize.value;
    const color = this.elements.textColor.value;

    previewNumber.className = 'preview-number ' + this.position;
    previewNumber.style.fontSize = fontSize + 'px';
    previewNumber.style.color = color;
    previewNumber.textContent = this.formatPageNumber(1, 10, format);
  }

  formatPageNumber(num, total, format) {
    switch (format) {
      case 'number':
        return String(num);
      case 'number-total':
        return `${num} / ${total}`;
      case 'page-number':
        return `페이지 ${num}`;
      case 'page-of':
        return `Page ${num} of ${total}`;
      case 'dash':
        return `- ${num} -`;
      case 'bracket':
        return `[${num}]`;
      case 'roman':
        return this.toRoman(num);
      default:
        return String(num);
    }
  }

  toRoman(num) {
    const romanNumerals = [
      ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
      ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
      ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
    ];
    let result = '';
    for (const [letter, value] of romanNumerals) {
      while (num >= value) {
        result += letter;
        num -= value;
      }
    }
    return result;
  }

  getTargetPages(pageCount) {
    const range = this.elements.pageRange.value;
    const pages = [];

    switch (range) {
      case 'all':
        for (let i = 0; i < pageCount; i++) pages.push(i);
        break;
      case 'skip-first':
        for (let i = 1; i < pageCount; i++) pages.push(i);
        break;
      case 'odd':
        for (let i = 0; i < pageCount; i += 2) pages.push(i);
        break;
      case 'even':
        for (let i = 1; i < pageCount; i += 2) pages.push(i);
        break;
      case 'custom':
        const customInput = this.elements.customRange.value;
        const parsed = this.parsePageRange(customInput, pageCount);
        pages.push(...parsed);
        break;
    }

    return pages;
  }

  parsePageRange(input, maxPages) {
    const pages = new Set();
    const parts = input.split(',');

    parts.forEach(part => {
      part = part.trim();
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim()));
        for (let i = start; i <= end && i <= maxPages; i++) {
          if (i >= 1) pages.add(i - 1);
        }
      } else {
        const num = parseInt(part);
        if (num >= 1 && num <= maxPages) pages.add(num - 1);
      }
    });

    return Array.from(pages).sort((a, b) => a - b);
  }

  removeFile() {
    this.pdfFile = null;
    this.pdfDoc = null;
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
      const pageCount = pages.length;
      const targetPages = this.getTargetPages(pageCount);

      const format = this.elements.numberFormat.value;
      const startNumber = parseInt(this.elements.startNumber.value) || 1;
      const fontSize = parseInt(this.elements.fontSize.value);
      const colorHex = this.elements.textColor.value;
      const margin = parseInt(this.elements.margin.value);

      const rgb = this.hexToRgb(colorHex);
      const font = await newPdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

      let displayNumber = startNumber;

      for (const pageIndex of targetPages) {
        const page = pages[pageIndex];
        const { width, height } = page.getSize();

        const text = this.formatPageNumber(displayNumber, pageCount, format);
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const coords = this.getCoordinates(this.position, width, height, textWidth, fontSize, margin);

        page.drawText(text, {
          x: coords.x,
          y: coords.y,
          size: fontSize,
          font: font,
          color: PDFLib.rgb(rgb.r / 255, rgb.g / 255, rgb.b / 255),
        });

        displayNumber++;
      }

      const pdfBytes = await newPdfDoc.save();
      this.resultBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      this.elements.resultInfo.innerHTML = `
        <div>${targetPages.length}개 페이지에 번호가 추가되었습니다.</div>
        <div style="margin-top: 8px;">파일 크기: ${this.formatFileSize(this.resultBlob.size)}</div>
      `;

      this.elements.settingsSection.style.display = 'none';
      this.elements.resultSection.style.display = 'block';

    } catch (error) {
      console.error('페이지 번호 추가 실패:', error);
      this.showError('페이지 번호 추가 중 오류가 발생했습니다.');
    } finally {
      applyBtn.classList.remove('loading');
      applyBtn.disabled = false;
    }
  }

  getCoordinates(position, pageWidth, pageHeight, textWidth, fontSize, margin) {
    const positions = {
      'top-left': { x: margin, y: pageHeight - margin },
      'top-center': { x: (pageWidth - textWidth) / 2, y: pageHeight - margin },
      'top-right': { x: pageWidth - textWidth - margin, y: pageHeight - margin },
      'bottom-left': { x: margin, y: margin },
      'bottom-center': { x: (pageWidth - textWidth) / 2, y: margin },
      'bottom-right': { x: pageWidth - textWidth - margin, y: margin },
    };
    return positions[position] || positions['bottom-center'];
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  download() {
    if (!this.resultBlob) return;

    const url = URL.createObjectURL(this.resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.pdfFile.name.replace('.pdf', '_numbered.pdf');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  reset() {
    this.pdfFile = null;
    this.pdfDoc = null;
    this.resultBlob = null;

    this.elements.fileInput.value = '';
    this.elements.dropzone.parentElement.style.display = 'block';
    this.elements.fileInfo.style.display = 'none';
    this.elements.settingsSection.style.display = 'none';
    this.elements.resultSection.style.display = 'none';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const pdfPageNumbers = new PdfPageNumbers();
window.PdfPageNumbers = pdfPageNumbers;

document.addEventListener('DOMContentLoaded', () => pdfPageNumbers.init());
