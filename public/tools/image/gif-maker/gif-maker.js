/**
 * GIF 생성 도구 - ToolBase 기반
 * gif.js 라이브러리를 사용하여 이미지들로 GIF 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var GifMaker = class GifMaker extends ToolBase {
  constructor() {
    super('GifMaker');
    this.images = [];
    this.generatedGif = null;
  }

  init() {
    this.initElements({
      dropzone: 'dropzone',
      fileInput: 'fileInput',
      imageList: 'imageList',
      frameDelay: 'frameDelay',
      loopCount: 'loopCount',
      outputSize: 'outputSize',
      progressBar: 'progressBar',
      progress: 'progress',
      previewContainer: 'previewContainer',
      previewImage: 'previewImage',
      downloadBtn: 'downloadBtn'
    });

    this.setupEventListeners();
    this.setupDragSort();
    console.log('[GifMaker] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { dropzone, fileInput } = this.elements;

    this.on(dropzone, 'click', () => fileInput.click());
    this.on(fileInput, 'change', (e) => this.addImages(e.target.files));

    this.on(dropzone, 'dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    this.on(dropzone, 'dragleave', () => dropzone.classList.remove('dragover'));
    this.on(dropzone, 'drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      this.addImages(e.dataTransfer.files);
    });
  }

  setupDragSort() {
    const list = this.elements.imageList;
    let draggedItem = null;

    this.on(list, 'dragstart', (e) => {
      if (e.target.classList.contains('image-item')) {
        draggedItem = e.target;
        e.target.style.opacity = '0.5';
      }
    });

    this.on(list, 'dragend', (e) => {
      if (e.target.classList.contains('image-item')) {
        e.target.style.opacity = '1';
        draggedItem = null;
        this.updateOrder();
      }
    });

    this.on(list, 'dragover', (e) => {
      e.preventDefault();
      const target = e.target.closest('.image-item');
      if (target && target !== draggedItem) {
        const rect = target.getBoundingClientRect();
        const next = (e.clientX - rect.left) / rect.width > 0.5;
        list.insertBefore(draggedItem, next ? target.nextSibling : target);
      }
    });
  }

  addImages(files) {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

    if (validFiles.length === 0) {
      this.showToast('이미지 파일만 선택할 수 있습니다.', 'error');
      return;
    }

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.images.push({
            src: e.target.result,
            width: img.width,
            height: img.height,
            element: img
          });
          this.renderImageList();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

    this.showSuccess(`${validFiles.length}개 이미지 추가됨`);
  }

  renderImageList() {
    const list = this.elements.imageList;

    if (this.images.length === 0) {
      list.innerHTML = '<div style="width: 100%; text-align: center; color: var(--tools-text-secondary);">이미지를 추가하면 여기에 표시됩니다</div>';
      return;
    }

    list.innerHTML = this.images.map((img, i) => `
      <div class="image-item" draggable="true" data-index="${i}">
        <img src="${img.src}" alt="Frame ${i + 1}">
        <button class="remove-btn" onclick="gifMaker.removeImage(${i})">×</button>
        <span class="order">${i + 1}</span>
      </div>
    `).join('');
  }

  removeImage(index) {
    this.images.splice(index, 1);
    this.renderImageList();
    this.showToast('이미지 제거됨', 'info');
  }

  updateOrder() {
    const list = this.elements.imageList;
    const items = list.querySelectorAll('.image-item');
    const newOrder = [];

    items.forEach((item, i) => {
      const oldIndex = parseInt(item.dataset.index);
      newOrder.push(this.images[oldIndex]);
      item.dataset.index = i;
      item.querySelector('.order').textContent = i + 1;
    });

    this.images = newOrder;
  }

  async generate() {
    if (this.images.length < 2) {
      this.showToast('최소 2개 이상의 이미지가 필요합니다.', 'warning');
      return;
    }

    const frameDelay = parseInt(this.elements.frameDelay.value) || 500;
    const loopCount = parseInt(this.elements.loopCount.value);
    const outputSize = this.elements.outputSize.value;

    let width = this.images[0].width;
    let height = this.images[0].height;

    if (outputSize !== 'original') {
      const maxSize = parseInt(outputSize);
      const ratio = Math.min(maxSize / width, maxSize / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    this.elements.progressBar.style.display = 'block';
    this.elements.progress.style.width = '0%';

    this.showToast('GIF 생성 중...', 'info');

    try {
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: width,
        height: height,
        workerScript: 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js',
        repeat: loopCount
      });

      for (let i = 0; i < this.images.length; i++) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(this.images[i].element, 0, 0, width, height);

        gif.addFrame(canvas, { delay: frameDelay, copy: true });
        this.elements.progress.style.width = `${((i + 1) / this.images.length) * 50}%`;
      }

      gif.on('progress', (p) => {
        this.elements.progress.style.width = `${50 + p * 50}%`;
      });

      gif.on('finished', (blob) => {
        this.generatedGif = URL.createObjectURL(blob);
        this.elements.previewImage.src = this.generatedGif;
        this.elements.previewContainer.style.display = 'block';
        this.elements.downloadBtn.style.display = 'inline-block';
        this.elements.progressBar.style.display = 'none';

        this.showSuccess('GIF 생성 완료!');
      });

      gif.render();
    } catch (error) {
      console.error('[GifMaker] Error:', error);
      this.elements.progressBar.style.display = 'none';
      this.showError('GIF 생성 실패: ' + error.message);
    }
  }

  download() {
    if (!this.generatedGif) {
      this.showToast('먼저 GIF를 생성해주세요.', 'warning');
      return;
    }

    const link = document.createElement('a');
    link.href = this.generatedGif;
    link.download = `animation_${Date.now()}.gif`;
    link.click();

    this.showSuccess('다운로드 시작!');
  }

  clear() {
    this.images = [];
    if (this.generatedGif) {
      URL.revokeObjectURL(this.generatedGif);
      this.generatedGif = null;
    }

    this.renderImageList();
    this.elements.previewContainer.style.display = 'none';
    this.elements.downloadBtn.style.display = 'none';
    this.elements.fileInput.value = '';

    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const gifMaker = new GifMaker();
window.GifMaker = gifMaker;

document.addEventListener('DOMContentLoaded', () => gifMaker.init());
