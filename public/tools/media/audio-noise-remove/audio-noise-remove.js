/**
 * 오디오 노이즈 제거 - ToolBase 기반
 * 배경 소음 제거
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var AudioNoiseRemove = class AudioNoiseRemove extends ToolBase {
  constructor() {
    super('AudioNoiseRemove');
    this.file = null;
  }

  init() {
    this.initElements({
      uploadZone: 'uploadZone',
      fileInput: 'fileInput',
      fileInfo: 'fileInfo',
      fileName: 'fileName',
      fileMeta: 'fileMeta',
      waveform: 'waveform',
      optionsPanel: 'optionsPanel',
      reductionSlider: 'reductionSlider',
      reductionValue: 'reductionValue',
      sensitivitySlider: 'sensitivitySlider',
      sensitivityValue: 'sensitivityValue',
      processBtn: 'processBtn',
      progressContainer: 'progressContainer',
      progressFill: 'progressFill'
    });

    this.setupDragDrop();

    console.log('[AudioNoiseRemove] 초기화 완료');
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

    const duration = Math.floor(Math.random() * 300) + 30;
    this.elements.fileName.textContent = file.name;
    this.elements.fileMeta.textContent = `${this.formatSize(file.size)} • ${this.formatTime(duration)}`;

    this.generateWaveform();

    this.elements.fileInfo.style.display = 'block';
    this.elements.optionsPanel.style.display = 'block';
    this.elements.processBtn.style.display = 'block';
    this.elements.uploadZone.style.display = 'none';

    this.showToast('파일 로드 완료!', 'success');
  }

  generateWaveform() {
    const waveform = this.elements.waveform;
    let html = '';
    for (let i = 0; i < 50; i++) {
      const height = Math.floor(Math.random() * 60) + 20;
      const delay = i * 0.02;
      html += `<div class="waveform-bar" style="height: ${height}%; animation-delay: ${delay}s;"></div>`;
    }
    waveform.innerHTML = html;
  }

  updateSlider(type, value) {
    if (type === 'reduction') {
      this.elements.reductionValue.textContent = value + '%';
    } else if (type === 'sensitivity') {
      this.elements.sensitivityValue.textContent = value + '%';
    }
  }

  applyPreset(preset) {
    const presets = {
      light: { reduction: 30, sensitivity: 20 },
      moderate: { reduction: 50, sensitivity: 40 },
      heavy: { reduction: 80, sensitivity: 60 }
    };

    const settings = presets[preset];
    this.elements.reductionSlider.value = settings.reduction;
    this.elements.sensitivitySlider.value = settings.sensitivity;
    this.updateSlider('reduction', settings.reduction);
    this.updateSlider('sensitivity', settings.sensitivity);

    this.showToast(`${preset === 'light' ? '가벼운' : preset === 'moderate' ? '보통' : '강한'} 노이즈 프리셋 적용`, 'info');
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

  async process() {
    if (!this.file) return;

    this.elements.processBtn.disabled = true;
    this.elements.progressContainer.style.display = 'block';

    for (let i = 0; i <= 100; i += 1) {
      await this.delay(40);
      this.elements.progressFill.style.width = i + '%';
    }

    this.elements.processBtn.disabled = false;
    this.showToast('노이즈 제거 완료! (시뮬레이션)', 'success');
  }

  clear() {
    this.file = null;
    this.elements.fileInput.value = '';
    this.elements.fileInfo.style.display = 'none';
    this.elements.optionsPanel.style.display = 'none';
    this.elements.progressContainer.style.display = 'none';
    this.elements.processBtn.style.display = 'none';
    this.elements.uploadZone.style.display = 'block';
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const audioNoiseRemove = new AudioNoiseRemove();
window.AudioNoiseRemove = audioNoiseRemove;

// 전역 함수 (HTML onclick 호환)
function handleFile(file) { audioNoiseRemove.handleFile(file); }
function updateSlider(type, value) { audioNoiseRemove.updateSlider(type, value); }
function applyPreset(preset) { audioNoiseRemove.applyPreset(preset); }
function process() { audioNoiseRemove.process(); }
function clear() { audioNoiseRemove.clear(); }

document.addEventListener('DOMContentLoaded', () => audioNoiseRemove.init());
