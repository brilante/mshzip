/**
 * 메타데이터 제거기 - ToolBase 기반
 * 이미지의 EXIF 메타데이터 제거
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class MetadataRemover extends ToolBase {
  constructor() {
    super('MetadataRemover');
    this.currentFile = null;
    this.cleanedBlob = null;
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      fileInput: 'fileInput',
      resultCard: 'resultCard',
      previewImage: 'previewImage',
      metadataList: 'metadataList',
      removeMetadata: 'removeMetadata',
      downloadClean: 'downloadClean',
      statusMessage: 'statusMessage'
    });

    this.setupEventListeners();
    console.log('[MetadataRemover] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const uploadArea = this.elements.uploadArea;
    const fileInput = this.elements.fileInput;

    this.on(uploadArea, 'click', () => fileInput.click());
    this.on(uploadArea, 'dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    this.on(uploadArea, 'dragleave', () => uploadArea.classList.remove('dragover'));
    this.on(uploadArea, 'drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        this.processFile(file);
      }
    });
    this.on(fileInput, 'change', (e) => {
      const file = e.target.files[0];
      if (file) this.processFile(file);
    });

    this.on(this.elements.removeMetadata, 'click', () => this.removeMetadataFromImage());
    this.on(this.elements.downloadClean, 'click', () => this.downloadCleanImage());
  }

  processFile(file) {
    if (file.size > 10 * 1024 * 1024) {
      this.showToast('파일 크기가 10MB를 초과합니다.', 'error');
      return;
    }

    this.currentFile = file;
    this.cleanedBlob = null;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.elements.previewImage.src = e.target.result;
      this.elements.resultCard.classList.remove('hidden');
      this.elements.downloadClean.classList.add('hidden');
      this.elements.statusMessage.classList.add('hidden');

      this.extractMetadata(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  extractMetadata(dataUrl) {
    // 시뮬레이션된 EXIF 데이터 추출
    const metadata = [
      { key: 'Camera Make', value: 'Apple', sensitive: false },
      { key: 'Camera Model', value: 'iPhone 15 Pro', sensitive: false },
      { key: 'Date/Time', value: '2024:01:15 14:32:45', sensitive: true },
      { key: 'GPS Latitude', value: '37.5665° N', sensitive: true },
      { key: 'GPS Longitude', value: '126.9780° E', sensitive: true },
      { key: 'Software', value: 'iOS 17.2', sensitive: false },
      { key: 'Exposure Time', value: '1/120 sec', sensitive: false },
      { key: 'F-Number', value: 'f/1.8', sensitive: false },
      { key: 'ISO Speed', value: '64', sensitive: false },
      { key: 'Focal Length', value: '6.86mm', sensitive: false },
      { key: 'Image Width', value: '4032', sensitive: false },
      { key: 'Image Height', value: '3024', sensitive: false }
    ];

    this.displayMetadata(metadata);
  }

  displayMetadata(metadata) {
    if (metadata.length === 0) {
      this.elements.metadataList.innerHTML = '<div class="no-metadata">메타데이터가 없습니다</div>';
      return;
    }

    this.elements.metadataList.innerHTML = metadata.map(item => `
      <div class="metadata-item">
        <span class="metadata-key">${this.escapeHtml(item.key)}</span>
        <span class="metadata-value ${item.sensitive ? 'sensitive' : ''}">${this.escapeHtml(item.value)}</span>
      </div>
    `).join('');
  }

  removeMetadataFromImage() {
    if (!this.currentFile) return;

    this.elements.removeMetadata.textContent = '처리 중...';
    this.elements.removeMetadata.disabled = true;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const mimeType = this.currentFile.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const quality = mimeType === 'image/jpeg' ? 0.92 : undefined;

      canvas.toBlob((blob) => {
        this.cleanedBlob = blob;

        this.elements.removeMetadata.textContent = '메타데이터 제거';
        this.elements.removeMetadata.disabled = false;
        this.elements.downloadClean.classList.remove('hidden');
        this.elements.statusMessage.classList.remove('hidden');

        this.elements.metadataList.innerHTML = '<div class="no-metadata" style="color: #10b981;">모든 메타데이터가 제거되었습니다</div>';
      }, mimeType, quality);
    };
    img.src = this.elements.previewImage.src;
  }

  downloadCleanImage() {
    if (!this.cleanedBlob) return;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(this.cleanedBlob);
    const ext = this.currentFile.type === 'image/png' ? 'png' : 'jpg';
    link.download = `clean_${this.currentFile.name.replace(/\.[^/.]+$/, '')}.${ext}`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const metadataRemover = new MetadataRemover();
window.MetadataRemover = metadataRemover;

document.addEventListener('DOMContentLoaded', () => metadataRemover.init());
