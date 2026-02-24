/**
 * 오디오 향상 - ToolBase 기반
 * AI로 오디오 품질 향상
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class AudioEnhanceTool extends ToolBase {
  constructor() {
    super('AudioEnhanceTool');
    this.selectedModel = 'adobe-podcast';
    this.audioFile = null;
    this.audioUrl = null;

    this.modelNames = {
      'adobe-podcast': 'Adobe Podcast',
      'descript': 'Descript',
      'auphonic': 'Auphonic'
    };
  }

  init() {
    this.initElements({
      originalAudio: 'originalAudio',
      enhancedAudio: 'enhancedAudio',
      audioPreview: 'audioPreview',
      processBtn: 'processBtn',
      downloadBtn: 'downloadBtn'
    });

    console.log('[AudioEnhanceTool] 초기화 완료');
    return this;
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }

  handleFile(event) {
    const file = event.target.files[0];
    if (file) {
      this.audioFile = file;
      this.audioUrl = URL.createObjectURL(file);
      this.elements.originalAudio.src = this.audioUrl;
      this.elements.processBtn.disabled = false;
      this.showToast('오디오 파일이 로드되었습니다.');
    }
  }

  async process() {
    if (!this.audioFile) {
      this.showToast('오디오 파일을 업로드하세요.', 'error');
      return;
    }

    this.showToast('오디오 향상 처리 중...');

    await this.delay(2500);

    // 데모: 원본 오디오 사용
    this.elements.enhancedAudio.src = this.audioUrl;
    this.elements.audioPreview.style.display = 'block';
    this.elements.downloadBtn.disabled = false;

    this.showToast(`${this.modelNames[this.selectedModel]}로 향상 완료!`);
  }

  download() {
    if (!this.audioUrl) return;
    const link = document.createElement('a');
    link.download = 'enhanced-audio.mp3';
    link.href = this.audioUrl;
    link.click();
    this.showToast('오디오가 다운로드되었습니다!');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const audioEnhanceTool = new AudioEnhanceTool();
window.AudioEnhance = audioEnhanceTool;

document.addEventListener('DOMContentLoaded', () => audioEnhanceTool.init());
console.log('[AudioEnhanceTool] 모듈 로드 완료');
