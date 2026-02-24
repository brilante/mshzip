/**
 * PDF → 이미지 변환 도구 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

// PDF.js 워커 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

var PdfToImage = class PdfToImage extends ToolBase {
  constructor() {
    super('PdfToImage');
    this.currentFile = null;
    this.pdfDoc = null;
    this.pageCount = 0;
    this.convertedImages = [];
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      fileInfoSection: 'fileInfoSection',
      fileName: 'fileName',
      fileMeta: 'fileMeta',
      settingsSection: 'settingsSection',
      progressSection: 'progressSection',
      progressText: 'progressText',
      progressPercent: 'progressPercent',
      progressFill: 'progressFill',
      resultSection: 'resultSection',
      resultGrid: 'resultGrid',
      resultCount: 'resultCount',
      dpi: 'dpi',
      quality: 'quality',
      qualityValue: 'qualityValue',
      qualityGroup: 'qualityGroup',
      pageSelect: 'pageSelect',
      rangeGroup: 'rangeGroup',
      pageRange: 'pageRange',
      convertBtn: 'convertBtn'
    });

    this.setupEventListeners();
    console.log('[PdfToImage] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { dropzone, fileInput, quality, pageSelect } = this.elements;

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

    // 형식 선택
    document.querySelectorAll('input[name="format"]').forEach(radio => {
      this.on(radio, 'change', () => {
        this.elements.qualityGroup.style.display = radio.value === 'jpeg' ? 'block' : 'none';
      });
    });

    // 품질 슬라이더
    this.on(quality, 'input', () => {
      this.elements.qualityValue.textContent = Math.round(quality.value * 100) + '%';
    });

    // 페이지 선택
    this.on(pageSelect, 'change', () => {
      this.elements.rangeGroup.style.display = pageSelect.value === 'range' ? 'block' : 'none';
    });
  }

  async loadFile(file) {
    if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
      this.showToast('PDF 파일만 지원합니다.', 'error');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      this.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      this.pageCount = this.pdfDoc.numPages;
      this.currentFile = file;

      this.elements.fileName.textContent = file.name;
      this.elements.fileMeta.textContent = `${this.pageCount}페이지 · ${this.formatFileSize(file.size)}`;

      this.elements.dropzone.parentElement.style.display = 'none';
      this.elements.fileInfoSection.style.display = 'block';
      this.elements.settingsSection.style.display = 'block';
      this.elements.progressSection.style.display = 'none';
      this.elements.resultSection.style.display = 'none';

      this.elements.pageRange.placeholder = `1-${this.pageCount}`;
      this.showSuccess('PDF 파일이 로드되었습니다.');
    } catch (error) {
      console.error('PDF 로드 오류:', error);
      this.showError('PDF 파일을 읽을 수 없습니다.');
    }
  }

  changeFile() {
    this.elements.fileInput.click();
  }

  async convert() {
    if (!this.pdfDoc) {
      this.showToast('PDF 파일을 먼저 선택해주세요.', 'error');
      return;
    }

    const format = document.querySelector('input[name="format"]:checked').value;
    const dpi = parseInt(this.elements.dpi.value);
    const quality = format === 'jpeg' ? parseFloat(this.elements.quality.value) : 1;
    const pageSelection = this.elements.pageSelect.value;

    // 변환할 페이지 목록
    let pageNumbers = [];
    if (pageSelection === 'all') {
      pageNumbers = Array.from({ length: this.pageCount }, (_, i) => i + 1);
    } else {
      pageNumbers = this.parsePageRange(this.elements.pageRange.value);
    }

    if (pageNumbers.length === 0) {
      this.showToast('유효한 페이지 범위를 입력해주세요.', 'error');
      return;
    }

    // UI 업데이트
    this.elements.settingsSection.style.display = 'none';
    this.elements.progressSection.style.display = 'block';
    this.elements.resultSection.style.display = 'none';
    this.convertedImages = [];

    const baseName = this.currentFile.name.replace(/\.pdf$/i, '');
    const scale = dpi / 72; // 72 DPI가 기본

    try {
      for (let i = 0; i < pageNumbers.length; i++) {
        const pageNum = pageNumbers[i];
        this.updateProgress(i, pageNumbers.length, `페이지 ${pageNum} 변환 중...`);

        const page = await this.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // 흰색 배경 (JPEG용)
        if (format === 'jpeg') {
          context.fillStyle = '#FFFFFF';
          context.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({ canvasContext: context, viewport }).promise;

        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const ext = format === 'jpeg' ? 'jpg' : 'png';

        this.convertedImages.push({
          name: `${baseName}_page${pageNum}.${ext}`,
          pageNum,
          dataUrl,
          width: canvas.width,
          height: canvas.height
        });
      }

      this.updateProgress(pageNumbers.length, pageNumbers.length, '완료!');
      this.renderResults();
      this.elements.progressSection.style.display = 'none';
      this.elements.resultSection.style.display = 'block';
      this.showSuccess(`${this.convertedImages.length}개 이미지로 변환되었습니다.`);

    } catch (error) {
      console.error('변환 오류:', error);
      this.showError('PDF 변환 중 오류가 발생했습니다.');
      this.elements.progressSection.style.display = 'none';
      this.elements.settingsSection.style.display = 'block';
    }
  }

  parsePageRange(str) {
    if (!str.trim()) {
      return Array.from({ length: this.pageCount }, (_, i) => i + 1);
    }

    const pages = new Set();
    const parts = str.split(',').map(s => s.trim()).filter(s => s);

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let p = Math.min(start, end); p <= Math.max(start, end); p++) {
            if (p >= 1 && p <= this.pageCount) pages.add(p);
          }
        }
      } else {
        const page = parseInt(part);
        if (!isNaN(page) && page >= 1 && page <= this.pageCount) {
          pages.add(page);
        }
      }
    }

    return Array.from(pages).sort((a, b) => a - b);
  }

  updateProgress(current, total, text) {
    const percent = Math.round((current / total) * 100);
    this.elements.progressText.textContent = text;
    this.elements.progressPercent.textContent = `${percent}%`;
    this.elements.progressFill.style.width = `${percent}%`;
  }

  renderResults() {
    this.elements.resultCount.textContent = this.convertedImages.length;
    this.elements.resultGrid.innerHTML = this.convertedImages.map((img, index) => `
      <div class="result-item">
        <div class="result-thumb">
          <img src="${img.dataUrl}" alt="Page ${img.pageNum}">
        </div>
        <div class="result-info">
          <div class="result-name">${img.name}</div>
          <div class="result-meta">${img.width} × ${img.height}px</div>
        </div>
        <button class="result-download" onclick="pdfToImage.downloadSingle(${index})" title="다운로드"></button>
      </div>
    `).join('');
  }

  downloadSingle(index) {
    const img = this.convertedImages[index];
    if (!img) return;

    const a = document.createElement('a');
    a.href = img.dataUrl;
    a.download = img.name;
    a.click();
  }

  downloadAll() {
    this.convertedImages.forEach((_, index) => {
      setTimeout(() => this.downloadSingle(index), index * 300);
    });
    this.showSuccess('모든 이미지 다운로드 시작');
  }

  reset() {
    this.currentFile = null;
    this.pdfDoc = null;
    this.pageCount = 0;
    this.convertedImages = [];

    this.elements.dropzone.parentElement.style.display = 'block';
    this.elements.fileInfoSection.style.display = 'none';
    this.elements.settingsSection.style.display = 'none';
    this.elements.progressSection.style.display = 'none';
    this.elements.resultSection.style.display = 'none';
    this.elements.fileInput.value = '';
    this.elements.pageRange.value = '';

    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const pdfToImage = new PdfToImage();
window.PdfToImage = pdfToImage;

document.addEventListener('DOMContentLoaded', () => pdfToImage.init());
