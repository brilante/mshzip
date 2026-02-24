/**
 * 이미지 → PDF 변환 도구 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ImageToPdf = class ImageToPdf extends ToolBase {
  constructor() {
    super('ImageToPdf');
    this.images = [];
    this.draggedItem = null;
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      imagesSection: 'imagesSection',
      imagesList: 'imagesList',
      imageCount: 'imageCount',
      settingsSection: 'settingsSection',
      pageSize: 'pageSize',
      imageFit: 'imageFit',
      margin: 'margin',
      quality: 'quality',
      qualityValue: 'qualityValue',
      fileName: 'fileName',
      convertBtn: 'convertBtn'
    });

    this.setupEventListeners();
    console.log('[ImageToPdf] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { dropzone, fileInput, quality } = this.elements;

    this.on(dropzone, 'click', () => fileInput.click());
    this.on(fileInput, 'change', (e) => {
      if (e.target.files.length > 0) {
        this.addImages(Array.from(e.target.files));
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
      if (e.dataTransfer.files.length > 0) {
        this.addImages(Array.from(e.dataTransfer.files));
      }
    });

    this.on(quality, 'input', () => {
      this.elements.qualityValue.textContent = Math.round(quality.value * 100) + '%';
    });

    this.on(document, 'paste', (e) => {
      const items = e.clipboardData?.items;
      if (items) {
        const imageFiles = [];
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            imageFiles.push(item.getAsFile());
          }
        }
        if (imageFiles.length > 0) {
          this.addImages(imageFiles);
        }
      }
    });
  }

  async addImages(files) {
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      this.showToast('이미지 파일만 지원합니다.', 'error');
      return;
    }

    for (const file of validFiles) {
      const dataUrl = await this.readFileAsDataUrl(file);
      const dimensions = await this.getImageDimensions(dataUrl);
      this.images.push({
        id: Date.now() + Math.random(),
        file,
        dataUrl,
        width: dimensions.width,
        height: dimensions.height,
        name: file.name
      });
    }

    this.renderImagesList();
    this.elements.imagesSection.style.display = 'block';
    this.elements.settingsSection.style.display = 'block';
    this.elements.fileInput.value = '';
    this.showSuccess(`${validFiles.length}개 이미지 추가됨`);
  }

  readFileAsDataUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  getImageDimensions(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.src = dataUrl;
    });
  }

  renderImagesList() {
    const { imagesList, imageCount } = this.elements;
    imageCount.textContent = this.images.length;

    imagesList.innerHTML = this.images.map((img, index) => `
      <div class="image-card" data-id="${img.id}" draggable="true">
        <div class="image-order">${index + 1}</div>
        <div class="image-thumb">
          <img src="${img.dataUrl}" alt="${img.name}">
        </div>
        <div class="image-info">
          <div class="image-name">${this.truncateName(img.name, 20)}</div>
          <div class="image-size">${img.width} × ${img.height}px</div>
        </div>
        <button class="image-remove" onclick="imageToPdf.removeImage('${img.id}')" title="삭제">×</button>
      </div>
    `).join('');

    this.setupDragSort();
  }

  setupDragSort() {
    const cards = document.querySelectorAll('.image-card');
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
          this.updateImagesOrder();
        }
      });
    });
  }

  updateImagesOrder() {
    const cards = document.querySelectorAll('.image-card');
    const newOrder = [];
    cards.forEach((card, index) => {
      const id = card.dataset.id;
      const img = this.images.find(i => String(i.id) === id);
      if (img) {
        newOrder.push(img);
        card.querySelector('.image-order').textContent = index + 1;
      }
    });
    this.images = newOrder;
  }

  removeImage(id) {
    this.images = this.images.filter(img => String(img.id) !== String(id));
    this.renderImagesList();

    if (this.images.length === 0) {
      this.elements.imagesSection.style.display = 'none';
      this.elements.settingsSection.style.display = 'none';
    }
  }

  addMore() {
    this.elements.fileInput.click();
  }

  clearAll() {
    this.images = [];
    this.renderImagesList();
    this.elements.imagesSection.style.display = 'none';
    this.elements.settingsSection.style.display = 'none';
    this.showToast('모든 이미지가 삭제되었습니다.', 'info');
  }

  async convert() {
    if (this.images.length === 0) {
      this.showToast('이미지를 먼저 추가해주세요.', 'error');
      return;
    }

    const btn = this.elements.convertBtn;
    const originalText = btn.innerHTML;
    btn.innerHTML = '변환 중...';
    btn.disabled = true;

    try {
      const { jsPDF } = window.jspdf;
      const pageSize = this.elements.pageSize.value;
      const orientation = document.querySelector('input[name="orientation"]:checked').value;
      const imageFit = this.elements.imageFit.value;
      const margin = parseFloat(this.elements.margin.value) || 0;
      const fileName = this.elements.fileName.value || 'images';

      const pageSizes = {
        a4: [210, 297],
        a3: [297, 420],
        a5: [148, 210],
        letter: [215.9, 279.4],
        legal: [215.9, 355.6]
      };

      let pdf;

      for (let i = 0; i < this.images.length; i++) {
        const img = this.images[i];

        let pageWidth, pageHeight;
        if (pageSize === 'fit') {
          pageWidth = img.width * 0.264583;
          pageHeight = img.height * 0.264583;
        } else {
          const [w, h] = pageSizes[pageSize];
          pageWidth = orientation === 'landscape' ? h : w;
          pageHeight = orientation === 'landscape' ? w : h;
        }

        if (i === 0) {
          pdf = new jsPDF({
            orientation: pageSize === 'fit' ? (img.width > img.height ? 'landscape' : 'portrait') : orientation,
            unit: 'mm',
            format: pageSize === 'fit' ? [pageWidth, pageHeight] : pageSize
          });
        } else {
          if (pageSize === 'fit') {
            pdf.addPage([pageWidth, pageHeight], img.width > img.height ? 'landscape' : 'portrait');
          } else {
            pdf.addPage(pageSize, orientation);
          }
        }

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const availableWidth = pdfWidth - (margin * 2);
        const availableHeight = pdfHeight - (margin * 2);

        let imgWidth, imgHeight, x, y;
        const imgRatio = img.width / img.height;
        const pageRatio = availableWidth / availableHeight;

        if (imageFit === 'contain') {
          if (imgRatio > pageRatio) {
            imgWidth = availableWidth;
            imgHeight = imgWidth / imgRatio;
          } else {
            imgHeight = availableHeight;
            imgWidth = imgHeight * imgRatio;
          }
          x = margin + (availableWidth - imgWidth) / 2;
          y = margin + (availableHeight - imgHeight) / 2;
        } else if (imageFit === 'fill') {
          if (imgRatio > pageRatio) {
            imgHeight = availableHeight;
            imgWidth = imgHeight * imgRatio;
          } else {
            imgWidth = availableWidth;
            imgHeight = imgWidth / imgRatio;
          }
          x = margin + (availableWidth - imgWidth) / 2;
          y = margin + (availableHeight - imgHeight) / 2;
        } else {
          imgWidth = img.width * 0.264583;
          imgHeight = img.height * 0.264583;
          x = (pdfWidth - imgWidth) / 2;
          y = (pdfHeight - imgHeight) / 2;
        }

        const imgFormat = this.getImageFormat(img.file.type);
        pdf.addImage(img.dataUrl, imgFormat, x, y, imgWidth, imgHeight, undefined, 'MEDIUM');
      }

      pdf.save(`${fileName}.pdf`);
      this.showSuccess(`PDF 생성 완료! (${this.images.length}페이지)`);

    } catch (error) {
      console.error('PDF 변환 오류:', error);
      this.showError('PDF 변환 중 오류가 발생했습니다.');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  getImageFormat(mimeType) {
    const formats = {
      'image/jpeg': 'JPEG',
      'image/jpg': 'JPEG',
      'image/png': 'PNG',
      'image/webp': 'WEBP',
      'image/gif': 'GIF'
    };
    return formats[mimeType] || 'JPEG';
  }

  truncateName(name, maxLen) {
    if (name.length <= maxLen) return name;
    const ext = name.split('.').pop();
    const base = name.slice(0, maxLen - ext.length - 4);
    return `${base}...${ext}`;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const imageToPdf = new ImageToPdf();
window.ImageToPdf = imageToPdf;

document.addEventListener('DOMContentLoaded', () => imageToPdf.init());
