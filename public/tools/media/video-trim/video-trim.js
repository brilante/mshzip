/**
 * 비디오 자르기 - ToolBase 기반
 * 원하는 구간만 추출
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var VideoTrim = class VideoTrim extends ToolBase {
  constructor() {
    super('VideoTrim');
    this.file = null;
    this.duration = 0;
    this.startPercent = 0;
    this.endPercent = 100;
  }

  init() {
    this.initElements({
      uploadZone: 'uploadZone',
      videoPreview: 'videoPreview',
      timelineContainer: 'timelineContainer',
      timelineBar: 'timelineBar',
      selection: 'selection',
      handleStart: 'handleStart',
      handleEnd: 'handleEnd',
      startTime: 'startTime',
      endTime: 'endTime',
      selectedDuration: 'selectedDuration',
      trimBtn: 'trimBtn',
      progressContainer: 'progressContainer',
      progressFill: 'progressFill'
    });

    this.setupDragDrop();
    this.setupTimeline();

    console.log('[VideoTrim] 초기화 완료');
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

  setupTimeline() {
    const bar = this.elements.timelineBar;
    const handleStart = this.elements.handleStart;
    const handleEnd = this.elements.handleEnd;

    let dragging = null;

    const onMouseMove = (e) => {
      if (!dragging) return;

      const rect = bar.getBoundingClientRect();
      let percent = ((e.clientX - rect.left) / rect.width) * 100;
      percent = Math.max(0, Math.min(100, percent));

      if (dragging === 'start') {
        this.startPercent = Math.min(percent, this.endPercent - 5);
      } else if (dragging === 'end') {
        this.endPercent = Math.max(percent, this.startPercent + 5);
      }

      this.updateSelection();
    };

    const onMouseUp = () => {
      dragging = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    handleStart.addEventListener('mousedown', () => {
      dragging = 'start';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    handleEnd.addEventListener('mousedown', () => {
      dragging = 'end';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  handleFile(file) {
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      this.showToast('비디오 파일만 지원합니다.', 'error');
      return;
    }

    this.file = file;
    this.duration = Math.floor(Math.random() * 300) + 60;
    this.startPercent = 0;
    this.endPercent = 100;

    this.elements.uploadZone.style.display = 'none';
    this.elements.videoPreview.style.display = 'flex';
    this.elements.timelineContainer.style.display = 'block';
    this.elements.trimBtn.style.display = 'block';

    this.updateSelection();
    this.showToast('파일 로드 완료!', 'success');
  }

  updateSelection() {
    const selection = this.elements.selection;
    const handleStart = this.elements.handleStart;
    const handleEnd = this.elements.handleEnd;

    selection.style.left = this.startPercent + '%';
    selection.style.width = (this.endPercent - this.startPercent) + '%';
    handleStart.style.left = this.startPercent + '%';
    handleEnd.style.left = `calc(${this.endPercent}% - 10px)`;

    const startTime = (this.duration * this.startPercent / 100);
    const endTime = (this.duration * this.endPercent / 100);
    const selectedDuration = endTime - startTime;

    this.elements.startTime.textContent = this.formatTime(startTime);
    this.elements.endTime.textContent = this.formatTime(endTime);
    this.elements.selectedDuration.textContent = this.formatTime(selectedDuration);
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  async trim() {
    if (!this.file) return;

    this.elements.trimBtn.disabled = true;
    this.elements.progressContainer.style.display = 'block';

    for (let i = 0; i <= 100; i += 2) {
      await this.delay(30);
      this.elements.progressFill.style.width = i + '%';
    }

    this.elements.trimBtn.disabled = false;
    this.showToast('비디오 자르기 완료! (시뮬레이션)', 'success');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const videoTrim = new VideoTrim();
window.VideoTrim = videoTrim;

// 전역 함수 (HTML onclick 호환)
function handleFile(file) { videoTrim.handleFile(file); }
function trim() { videoTrim.trim(); }

document.addEventListener('DOMContentLoaded', () => videoTrim.init());
