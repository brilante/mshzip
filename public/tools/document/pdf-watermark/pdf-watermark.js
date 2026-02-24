/**
 * PDF 워터마크 도구 - ToolBase 기반
 * pdf-lib를 사용하여 PDF에 텍스트/이미지 워터마크 추가
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PdfWatermark = class PdfWatermark extends ToolBase {
  constructor() {
    super('PdfWatermark');
    this.pdfFile = null;
    this.pdfDoc = null;
    this.imageData = null;
    this.resultBlob = null;
    this.watermarkType = 'text';
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
      imageDropzone: 'imageDropzone',
      imageInput: 'imageInput',
      imagePreview: 'imagePreview',
      previewImg: 'previewImg',
      textSettings: 'textSettings',
      imageSettings: 'imageSettings',
      pages: 'pages',
      customPagesRow: 'customPagesRow',
      customPages: 'customPages',
      watermarkText: 'watermarkText',
      fontSize: 'fontSize',
      fontSizeValue: 'fontSizeValue',
      textColor: 'textColor',
      imageScale: 'imageScale',
      imageScaleValue: 'imageScaleValue',
      opacity: 'opacity',
      opacityValue: 'opacityValue',
      rotation: 'rotation',
      rotationValue: 'rotationValue',
      position: 'position',
      applyBtn: 'applyBtn'
    });

    this.setupEventListeners();
    this.initSliders();
    console.log('[PdfWatermark] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { dropzone, fileInput, imageDropzone, imageInput, pages } = this.elements;

    // PDF 드래그앤드롭
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

    // 이미지 업로드
    this.on(imageDropzone, 'click', () => imageInput.click());
    this.on(imageInput, 'change', (e) => {
      if (e.target.files[0]) {
        this.handleImage(e.target.files[0]);
      }
    });

    // 페이지 선택
    this.on(pages, 'change', (e) => {
      this.elements.customPagesRow.style.display = e.target.value === 'custom' ? 'flex' : 'none';
    });
  }

  initSliders() {
    const sliders = [
      { id: 'fontSize', suffix: 'px', valueId: 'fontSizeValue' },
      { id: 'imageScale', suffix: '%', valueId: 'imageScaleValue' },
      { id: 'opacity', suffix: '%', valueId: 'opacityValue' },
      { id: 'rotation', suffix: '°', valueId: 'rotationValue' }
    ];

    sliders.forEach(({ id, suffix, valueId }) => {
      const slider = this.elements[id];
      const value = this.elements[valueId];
      if (slider && value) {
        this.on(slider, 'input', () => {
          value.textContent = slider.value + suffix;
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

  handleImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.imageData = e.target.result;
      this.elements.previewImg.src = this.imageData;
      this.elements.imageDropzone.style.display = 'none';
      this.elements.imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
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

  removeImage() {
    this.imageData = null;
    this.elements.imageInput.value = '';
    this.elements.imageDropzone.style.display = 'block';
    this.elements.imagePreview.style.display = 'none';
  }

  setType(type) {
    this.watermarkType = type;
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
    this.elements.textSettings.style.display = type === 'text' ? 'block' : 'none';
    this.elements.imageSettings.style.display = type === 'image' ? 'block' : 'none';
  }

  getTargetPages() {
    const pagesSelect = this.elements.pages.value;
    const pageCount = this.pdfDoc.getPageCount();
    const pages = [];

    switch (pagesSelect) {
      case 'all':
        for (let i = 0; i < pageCount; i++) pages.push(i);
        break;
      case 'first':
        pages.push(0);
        break;
      case 'odd':
        for (let i = 0; i < pageCount; i += 2) pages.push(i);
        break;
      case 'even':
        for (let i = 1; i < pageCount; i += 2) pages.push(i);
        break;
      case 'custom':
        const customInput = this.elements.customPages.value;
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

  async apply() {
    if (!this.pdfDoc) {
      this.showToast('PDF 파일을 먼저 선택해주세요.', 'error');
      return;
    }

    if (this.watermarkType === 'image' && !this.imageData) {
      this.showToast('워터마크 이미지를 선택해주세요.', 'error');
      return;
    }

    const applyBtn = this.elements.applyBtn;
    applyBtn.classList.add('loading');
    applyBtn.disabled = true;

    try {
      const newPdfDoc = await PDFLib.PDFDocument.load(await this.pdfFile.arrayBuffer());
      const pages = newPdfDoc.getPages();
      const targetPages = this.getTargetPages();

      const opacity = parseInt(this.elements.opacity.value) / 100;
      const rotation = parseInt(this.elements.rotation.value);
      const position = this.elements.position.value;

      if (this.watermarkType === 'text') {
        await this.applyTextWatermark(newPdfDoc, pages, targetPages, opacity, rotation, position);
      } else {
        await this.applyImageWatermark(newPdfDoc, pages, targetPages, opacity, rotation, position);
      }

      const pdfBytes = await newPdfDoc.save();
      this.resultBlob = new Blob([pdfBytes], { type: 'application/pdf' });

      this.elements.resultInfo.innerHTML = `
        <div>${targetPages.length}개 페이지에 워터마크가 적용되었습니다.</div>
        <div style="margin-top: 8px;">파일 크기: ${this.formatFileSize(this.resultBlob.size)}</div>
      `;

      this.elements.settingsSection.style.display = 'none';
      this.elements.resultSection.style.display = 'block';

    } catch (error) {
      console.error('워터마크 적용 실패:', error);
      this.showError('워터마크 적용 중 오류가 발생했습니다.');
    } finally {
      applyBtn.classList.remove('loading');
      applyBtn.disabled = false;
    }
  }

  async applyTextWatermark(pdfDoc, pages, targetPages, opacity, rotation, position) {
    const text = this.elements.watermarkText.value || 'WATERMARK';
    const fontSize = parseInt(this.elements.fontSize.value);
    const colorHex = this.elements.textColor.value;

    const rgb = this.hexToRgb(colorHex);
    const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

    for (const pageIndex of targetPages) {
      const page = pages[pageIndex];
      const { width, height } = page.getSize();

      if (position === 'tile') {
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const spacingX = textWidth + 100;
        const spacingY = fontSize + 80;

        for (let y = -height; y < height * 2; y += spacingY) {
          for (let x = -width; x < width * 2; x += spacingX) {
            page.drawText(text, {
              x: x,
              y: y,
              size: fontSize,
              font: font,
              color: PDFLib.rgb(rgb.r / 255, rgb.g / 255, rgb.b / 255),
              opacity: opacity,
              rotate: PDFLib.degrees(rotation),
            });
          }
        }
      } else {
        const coords = this.getPosition(position, width, height, fontSize, font.widthOfTextAtSize(text, fontSize));
        page.drawText(text, {
          x: coords.x,
          y: coords.y,
          size: fontSize,
          font: font,
          color: PDFLib.rgb(rgb.r / 255, rgb.g / 255, rgb.b / 255),
          opacity: opacity,
          rotate: PDFLib.degrees(rotation),
        });
      }
    }
  }

  async applyImageWatermark(pdfDoc, pages, targetPages, opacity, rotation, position) {
    const scale = parseInt(this.elements.imageScale.value) / 100;

    let image;
    if (this.imageData.includes('image/png')) {
      image = await pdfDoc.embedPng(this.imageData);
    } else {
      image = await pdfDoc.embedJpg(this.imageData);
    }

    const imgDims = image.scale(scale);

    for (const pageIndex of targetPages) {
      const page = pages[pageIndex];
      const { width, height } = page.getSize();

      if (position === 'tile') {
        const spacingX = imgDims.width + 50;
        const spacingY = imgDims.height + 50;

        for (let y = 0; y < height; y += spacingY) {
          for (let x = 0; x < width; x += spacingX) {
            page.drawImage(image, {
              x: x,
              y: y,
              width: imgDims.width,
              height: imgDims.height,
              opacity: opacity,
              rotate: PDFLib.degrees(rotation),
            });
          }
        }
      } else {
        const coords = this.getPosition(position, width, height, imgDims.height, imgDims.width);
        page.drawImage(image, {
          x: coords.x,
          y: coords.y,
          width: imgDims.width,
          height: imgDims.height,
          opacity: opacity,
          rotate: PDFLib.degrees(rotation),
        });
      }
    }
  }

  getPosition(position, pageWidth, pageHeight, elementHeight, elementWidth) {
    const margin = 50;
    const positions = {
      'center': {
        x: (pageWidth - elementWidth) / 2,
        y: (pageHeight - elementHeight) / 2
      },
      'top-left': { x: margin, y: pageHeight - elementHeight - margin },
      'top-right': { x: pageWidth - elementWidth - margin, y: pageHeight - elementHeight - margin },
      'bottom-left': { x: margin, y: margin },
      'bottom-right': { x: pageWidth - elementWidth - margin, y: margin },
    };
    return positions[position] || positions['center'];
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 0, b: 0 };
  }

  download() {
    if (!this.resultBlob) return;

    const url = URL.createObjectURL(this.resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.pdfFile.name.replace('.pdf', '_watermarked.pdf');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  reset() {
    this.pdfFile = null;
    this.pdfDoc = null;
    this.imageData = null;
    this.resultBlob = null;

    this.elements.fileInput.value = '';
    this.elements.imageInput.value = '';
    this.elements.dropzone.parentElement.style.display = 'block';
    this.elements.fileInfo.style.display = 'none';
    this.elements.settingsSection.style.display = 'none';
    this.elements.resultSection.style.display = 'none';
    this.elements.imageDropzone.style.display = 'block';
    this.elements.imagePreview.style.display = 'none';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const pdfWatermark = new PdfWatermark();
window.PdfWatermark = pdfWatermark;

document.addEventListener('DOMContentLoaded', () => pdfWatermark.init());
