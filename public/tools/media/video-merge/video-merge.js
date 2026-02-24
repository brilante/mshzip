/**
 * 비디오 병합 - ToolBase 기반
 * 여러 비디오를 하나로 합치기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var VideoMerge = class VideoMerge extends ToolBase {
  constructor() {
    super('VideoMerge');
    this.videos = [];
  }

  init() {
    this.initElements({
      uploadZone: 'uploadZone',
      videoList: 'videoList',
      totalDuration: 'totalDuration',
      totalValue: 'totalValue',
      mergeBtn: 'mergeBtn',
      progressContainer: 'progressContainer',
      progressFill: 'progressFill'
    });

    this.setupDragDrop();

    console.log('[VideoMerge] 초기화 완료');
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
      this.handleFiles(e.dataTransfer.files);
    });
  }

  handleFiles(files) {
    if (!files || files.length === 0) return;

    for (const file of files) {
      if (!file.type.startsWith('video/')) continue;

      this.videos.push({
        name: file.name,
        size: file.size,
        duration: Math.floor(Math.random() * 180) + 30
      });
    }

    this.renderList();
    this.showToast(`${files.length}개 파일 추가됨`, 'success');
  }

  renderList() {
    const container = this.elements.videoList;

    if (this.videos.length === 0) {
      container.innerHTML = '';
      this.elements.totalDuration.style.display = 'none';
      this.elements.mergeBtn.style.display = 'none';
      return;
    }

    let html = '';
    this.videos.forEach((video, index) => {
      html += `
        <div class="video-item" draggable="true" data-index="${index}"
             ondragstart="videoMerge.dragStart(event)"
             ondragover="videoMerge.dragOver(event)"
             ondrop="videoMerge.drop(event)">
          <div class="video-order">${index + 1}</div>
          <div class="video-info">
            <div class="video-name">${video.name}</div>
            <div class="video-meta">${this.formatSize(video.size)} • ${this.formatTime(video.duration)}</div>
          </div>
          <button class="tool-btn tool-btn-secondary" style="padding: 0.4rem 0.8rem;" onclick="videoMerge.remove(${index})"></button>
        </div>
      `;
    });

    container.innerHTML = html;

    const totalDuration = this.videos.reduce((sum, v) => sum + v.duration, 0);
    this.elements.totalValue.textContent = this.formatTime(totalDuration);
    this.elements.totalDuration.style.display = 'block';
    this.elements.mergeBtn.style.display = 'block';
  }

  dragStart(e) {
    e.dataTransfer.setData('text/plain', e.target.dataset.index);
    e.target.classList.add('dragging');
  }

  dragOver(e) {
    e.preventDefault();
  }

  drop(e) {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const toIndex = parseInt(e.target.closest('.video-item').dataset.index);

    if (fromIndex !== toIndex) {
      const item = this.videos.splice(fromIndex, 1)[0];
      this.videos.splice(toIndex, 0, item);
      this.renderList();
    }

    document.querySelectorAll('.video-item').forEach(el => el.classList.remove('dragging'));
  }

  remove(index) {
    this.videos.splice(index, 1);
    this.renderList();
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

  async merge() {
    if (this.videos.length < 2) {
      this.showToast('2개 이상의 비디오가 필요합니다.', 'warning');
      return;
    }

    this.elements.mergeBtn.disabled = true;
    this.elements.progressContainer.style.display = 'block';

    for (let i = 0; i <= 100; i += 1) {
      await this.delay(40);
      this.elements.progressFill.style.width = i + '%';
    }

    this.elements.mergeBtn.disabled = false;
    this.showToast('비디오 병합 완료! (시뮬레이션)', 'success');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const videoMerge = new VideoMerge();
window.VideoMerge = videoMerge;

// 전역 함수 (HTML onclick 호환)
function handleFiles(files) { videoMerge.handleFiles(files); }
function merge() { videoMerge.merge(); }

document.addEventListener('DOMContentLoaded', () => videoMerge.init());
