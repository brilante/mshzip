/**
 * 비디오 to GIF - ToolBase 기반
 * 비디오를 GIF로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var VideoToGif = class VideoToGif extends ToolBase {
  constructor() {
    super('VideoToGif');
    this.file = null;
  }

  init() {
    this.initElements({
      uploadZone: 'uploadZone',
      previewArea: 'previewArea',
      optionsGrid: 'optionsGrid',
      fps: 'fps',
      duration: 'duration',
      resolution: 'resolution',
      sizePreview: 'sizePreview',
      frameCount: 'frameCount',
      estimatedSize: 'estimatedSize',
      convertBtn: 'convertBtn',
      progressContainer: 'progressContainer',
      progressFill: 'progressFill',
      progressText: 'progressText',
      gifPreview: 'gifPreview'
    });

    this.setupDragDrop();

    console.log('[VideoToGif] 초기화 완료');
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

    this.elements.uploadZone.style.display = 'none';
    this.elements.previewArea.style.display = 'grid';
    this.elements.optionsGrid.style.display = 'grid';
    this.elements.sizePreview.style.display = 'block';
    this.elements.convertBtn.style.display = 'block';

    this.updatePreview();
    this.showToast('파일 로드 완료!', 'success');
  }

  updatePreview() {
    const fps = parseInt(this.elements.fps.value);
    const duration = parseInt(this.elements.duration.value) || 5;
    const resolution = this.elements.resolution.value;

    const frameCount = fps * duration;

    // 예상 크기 계산 (시뮬레이션)
    let sizeMultiplier = 1;
    if (resolution === '720') sizeMultiplier = 1.5;
    else if (resolution === '480') sizeMultiplier = 1;
    else if (resolution === '360') sizeMultiplier = 0.6;
    else if (resolution === '240') sizeMultiplier = 0.4;
    else sizeMultiplier = 2;

    const estimatedSize = (frameCount * 0.03 * sizeMultiplier).toFixed(1);

    this.elements.frameCount.textContent = frameCount + ' 프레임';
    this.elements.estimatedSize.textContent = `~${estimatedSize} MB`;
  }

  async convert() {
    if (!this.file) return;

    this.elements.convertBtn.disabled = true;
    this.elements.progressContainer.style.display = 'block';

    const fps = parseInt(this.elements.fps.value);
    const duration = parseInt(this.elements.duration.value) || 5;
    const totalFrames = fps * duration;

    for (let i = 0; i <= 100; i += 1) {
      await this.delay(30);
      this.elements.progressFill.style.width = i + '%';

      const currentFrame = Math.floor(totalFrames * i / 100);
      if (i < 30) {
        this.elements.progressText.textContent = '비디오 분석 중...';
      } else if (i < 90) {
        this.elements.progressText.textContent = `프레임 추출 중... (${currentFrame}/${totalFrames})`;
      } else {
        this.elements.progressText.textContent = 'GIF 생성 중...';
      }
    }

    this.elements.progressText.textContent = 'GIF 변환 완료! (시뮬레이션)';
    this.elements.gifPreview.innerHTML = '<div style="color: #22c55e; font-weight: 600;">변환 완료</div>';
    this.elements.convertBtn.disabled = false;
    this.showToast('GIF 변환 완료! (시뮬레이션)', 'success');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const videoToGif = new VideoToGif();
window.VideoToGif = videoToGif;

// 전역 함수 (HTML onclick 호환)
function handleFile(file) { videoToGif.handleFile(file); }
function updatePreview() { videoToGif.updatePreview(); }
function convert() { videoToGif.convert(); }

document.addEventListener('DOMContentLoaded', () => videoToGif.init());
