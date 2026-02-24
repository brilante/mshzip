/**
 * 비디오 압축 - ToolBase 기반
 * 비디오 파일 크기 줄이기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var VideoCompress = class VideoCompress extends ToolBase {
  constructor() {
    super('VideoCompress');
    this.file = null;
    this.originalSize = 0;
  }

  init() {
    this.initElements({
      uploadZone: 'uploadZone',
      fileInput: 'fileInput',
      fileInfo: 'fileInfo',
      fileName: 'fileName',
      fileSize: 'fileSize',
      optionsGrid: 'optionsGrid',
      compressionLevel: 'compressionLevel',
      resolution: 'resolution',
      compressionPreview: 'compressionPreview',
      originalSize: 'originalSize',
      estimatedSize: 'estimatedSize',
      savings: 'savings',
      compressBtn: 'compressBtn',
      progressContainer: 'progressContainer',
      progressFill: 'progressFill',
      progressText: 'progressText'
    });

    this.setupDragDrop();

    console.log('[VideoCompress] 초기화 완료');
    return this;
  }

  setupDragDrop() {
    const zone = this.elements.uploadZone;

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this.handleFile(file);
    });
  }

  handleFile(file) {
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      this.showToast('비디오 파일만 지원합니다.', 'error');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      this.showToast('500MB 이하 파일만 가능합니다.', 'error');
      return;
    }

    this.file = file;
    this.originalSize = file.size;

    this.elements.fileName.textContent = file.name;
    this.elements.fileSize.textContent = this.formatSize(file.size);
    this.elements.fileInfo.style.display = 'block';
    this.elements.optionsGrid.style.display = 'grid';
    this.elements.compressBtn.style.display = 'block';
    this.elements.uploadZone.style.display = 'none';

    this.updatePreview();
    this.showToast('파일 로드 완료!', 'success');
  }

  updatePreview() {
    if (!this.file) return;

    const level = this.elements.compressionLevel.value;
    const resolution = this.elements.resolution.value;

    let ratio = 1;
    if (level === 'low') ratio = 0.7;
    else if (level === 'medium') ratio = 0.5;
    else if (level === 'high') ratio = 0.3;

    if (resolution === '720') ratio *= 0.7;
    else if (resolution === '480') ratio *= 0.5;

    const estimatedSize = Math.floor(this.originalSize * ratio);
    const savings = Math.round((1 - ratio) * 100);

    this.elements.originalSize.textContent = this.formatSize(this.originalSize);
    this.elements.estimatedSize.textContent = this.formatSize(estimatedSize);
    this.elements.savings.textContent = `-${savings}%`;
    this.elements.compressionPreview.style.display = 'block';
  }

  formatSize(bytes) {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return bytes + ' B';
  }

  async compress() {
    if (!this.file) return;

    this.elements.compressBtn.disabled = true;
    this.elements.progressContainer.style.display = 'block';

    for (let i = 0; i <= 100; i += 1) {
      await this.delay(50);
      this.elements.progressFill.style.width = i + '%';

      if (i < 20) {
        this.elements.progressText.textContent = '비디오 분석 중...';
      } else if (i < 80) {
        this.elements.progressText.textContent = `압축 중... ${i}%`;
      } else {
        this.elements.progressText.textContent = '파일 저장 중...';
      }
    }

    this.elements.progressText.textContent = '압축 완료! (시뮬레이션)';
    this.elements.compressBtn.disabled = false;
    this.showToast('비디오 압축 완료! (시뮬레이션)', 'success');
  }

  clear() {
    this.file = null;
    this.originalSize = 0;
    this.elements.fileInput.value = '';
    this.elements.fileInfo.style.display = 'none';
    this.elements.optionsGrid.style.display = 'none';
    this.elements.compressionPreview.style.display = 'none';
    this.elements.progressContainer.style.display = 'none';
    this.elements.compressBtn.style.display = 'none';
    this.elements.uploadZone.style.display = 'block';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const videoCompress = new VideoCompress();
window.VideoCompress = videoCompress;

// 전역 함수 (HTML onclick 호환)
function handleFile(file) { videoCompress.handleFile(file); }
function updatePreview() { videoCompress.updatePreview(); }
function compress() { videoCompress.compress(); }
function clear() { videoCompress.clear(); }

document.addEventListener('DOMContentLoaded', () => videoCompress.init());
