/**
 * 비디오 변환 - ToolBase 기반
 * 비디오 포맷 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var VideoConvert = class VideoConvert extends ToolBase {
  constructor() {
    super('VideoConvert');
    this.file = null;
    this.selectedFormat = 'mp4';
  }

  init() {
    this.initElements({
      uploadZone: 'uploadZone',
      fileInput: 'fileInput',
      fileInfo: 'fileInfo',
      fileName: 'fileName',
      fileSize: 'fileSize',
      formatSection: 'formatSection',
      convertBtn: 'convertBtn',
      progressContainer: 'progressContainer',
      progressFill: 'progressFill',
      progressText: 'progressText'
    });

    this.setupDragDrop();

    console.log('[VideoConvert] 초기화 완료');
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

    this.file = file;

    this.elements.fileName.textContent = file.name;
    this.elements.fileSize.textContent = this.formatSize(file.size);
    this.elements.fileInfo.style.display = 'block';
    this.elements.formatSection.style.display = 'block';
    this.elements.convertBtn.style.display = 'block';
    this.elements.uploadZone.style.display = 'none';

    this.showToast('파일 로드 완료!', 'success');
  }

  selectFormat(format) {
    this.selectedFormat = format;
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.format === format);
    });
  }

  formatSize(bytes) {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return bytes + ' B';
  }

  async convert() {
    if (!this.file) return;

    this.elements.convertBtn.disabled = true;
    this.elements.progressContainer.style.display = 'block';

    for (let i = 0; i <= 100; i += 1) {
      await this.delay(40);
      this.elements.progressFill.style.width = i + '%';

      if (i < 30) {
        this.elements.progressText.textContent = '비디오 디코딩 중...';
      } else if (i < 80) {
        this.elements.progressText.textContent = `${this.selectedFormat.toUpperCase()}로 인코딩 중... ${i}%`;
      } else {
        this.elements.progressText.textContent = '파일 저장 중...';
      }
    }

    this.elements.progressText.textContent = `${this.selectedFormat.toUpperCase()} 변환 완료! (시뮬레이션)`;
    this.elements.convertBtn.disabled = false;
    this.showToast('비디오 변환 완료! (시뮬레이션)', 'success');
  }

  clear() {
    this.file = null;
    this.elements.fileInput.value = '';
    this.elements.fileInfo.style.display = 'none';
    this.elements.formatSection.style.display = 'none';
    this.elements.progressContainer.style.display = 'none';
    this.elements.convertBtn.style.display = 'none';
    this.elements.uploadZone.style.display = 'block';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const videoConvert = new VideoConvert();
window.VideoConvert = videoConvert;

// 전역 함수 (HTML onclick 호환)
function handleFile(file) { videoConvert.handleFile(file); }
function selectFormat(format) { videoConvert.selectFormat(format); }
function convert() { videoConvert.convert(); }
function clear() { videoConvert.clear(); }

document.addEventListener('DOMContentLoaded', () => videoConvert.init());
