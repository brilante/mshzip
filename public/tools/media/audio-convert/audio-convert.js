/**
 * 오디오 변환 - ToolBase 기반
 * 오디오 포맷 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var AudioConvert = class AudioConvert extends ToolBase {
  constructor() {
    super('AudioConvert');
    this.file = null;
    this.selectedFormat = 'mp3';
    this.selectedQuality = '256';
    this.losslessFormats = ['wav', 'flac', 'aiff'];
  }

  init() {
    this.initElements({
      uploadZone: 'uploadZone',
      fileInput: 'fileInput',
      fileInfo: 'fileInfo',
      fileName: 'fileName',
      fileMeta: 'fileMeta',
      formatSection: 'formatSection',
      qualitySection: 'qualitySection',
      convertBtn: 'convertBtn',
      progressContainer: 'progressContainer',
      progressFill: 'progressFill'
    });

    this.setupDragDrop();

    console.log('[AudioConvert] 초기화 완료');
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

    if (!file.type.startsWith('audio/')) {
      this.showToast('오디오 파일만 지원합니다.', 'error');
      return;
    }

    this.file = file;

    const duration = Math.floor(Math.random() * 300) + 60;
    this.elements.fileName.textContent = file.name;
    this.elements.fileMeta.textContent = `${this.formatSize(file.size)} • ${this.formatTime(duration)}`;

    this.elements.fileInfo.style.display = 'block';
    this.elements.formatSection.style.display = 'block';
    this.elements.qualitySection.style.display = 'block';
    this.elements.convertBtn.style.display = 'block';
    this.elements.uploadZone.style.display = 'none';

    this.showToast('파일 로드 완료!', 'success');
  }

  selectFormat(format) {
    this.selectedFormat = format;
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.format === format);
    });

    // 무손실 포맷은 비트레이트 선택 숨김
    if (this.losslessFormats.includes(format)) {
      this.elements.qualitySection.style.display = 'none';
    } else {
      this.elements.qualitySection.style.display = 'block';
    }
  }

  selectQuality(quality) {
    this.selectedQuality = quality;
    document.querySelectorAll('.quality-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.quality === quality);
    });
  }

  formatSize(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return bytes + ' B';
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  async convert() {
    if (!this.file) return;

    this.elements.convertBtn.disabled = true;
    this.elements.progressContainer.style.display = 'block';

    for (let i = 0; i <= 100; i += 2) {
      await this.delay(30);
      this.elements.progressFill.style.width = i + '%';
    }

    this.elements.convertBtn.disabled = false;
    this.showToast(`${this.selectedFormat.toUpperCase()} 변환 완료! (시뮬레이션)`, 'success');
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
const audioConvert = new AudioConvert();
window.AudioConvert = audioConvert;

// 전역 함수 (HTML onclick 호환)
function handleFile(file) { audioConvert.handleFile(file); }
function selectFormat(format) { audioConvert.selectFormat(format); }
function selectQuality(quality) { audioConvert.selectQuality(quality); }
function convert() { audioConvert.convert(); }
function clear() { audioConvert.clear(); }

document.addEventListener('DOMContentLoaded', () => audioConvert.init());
