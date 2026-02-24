/**
 * 음성 복제 - ToolBase 기반
 * AI로 음성을 복제하여 새 콘텐츠 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class VoiceCloneTool extends ToolBase {
  constructor() {
    super('VoiceCloneTool');
    this.selectedModel = 'elevenlabs';
    this.voiceFile = null;
    this.resultUrl = null;

    this.modelNames = {
      'elevenlabs': 'ElevenLabs',
      'resemble': 'Resemble AI',
      'coqui': 'Coqui TTS'
    };
  }

  init() {
    this.initElements({
      voiceAudio: 'voiceAudio',
      voicePreview: 'voicePreview',
      textInput: 'textInput',
      generateBtn: 'generateBtn',
      resultSection: 'resultSection',
      downloadBtn: 'downloadBtn'
    });

    console.log('[VoiceCloneTool] 초기화 완료');
    return this;
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }

  handleVoice(event) {
    const file = event.target.files[0];
    if (file) {
      this.voiceFile = file;
      const url = URL.createObjectURL(file);
      this.elements.voiceAudio.src = url;
      this.elements.voicePreview.style.display = 'block';
      this.elements.generateBtn.disabled = false;
      this.showToast('음성 샘플이 로드되었습니다.');
    }
  }

  async generate() {
    const text = this.elements.textInput.value.trim();

    if (!this.voiceFile) {
      this.showToast('음성 샘플을 업로드하세요.', 'error');
      return;
    }

    if (!text) {
      this.showToast('생성할 텍스트를 입력하세요.', 'error');
      return;
    }

    this.showToast('음성 복제 처리 중...');

    // 시뮬레이션
    await this.delay(3000);

    const resultSection = this.elements.resultSection;
    resultSection.innerHTML = `
      <div style="margin-bottom: 1rem;">음성 복제 완료!</div>
      <audio controls style="width: 100%;">
        <source src="${URL.createObjectURL(this.voiceFile)}" type="audio/mpeg">
      </audio>
      <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.5rem;">
        ${this.modelNames[this.selectedModel]}로 생성됨
      </div>
    `;

    this.elements.downloadBtn.disabled = false;
    this.showToast('음성 복제가 완료되었습니다!');
  }

  download() {
    this.showToast('데모 모드: 실제 서비스에서 MP3 다운로드가 가능합니다.');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const voiceCloneTool = new VoiceCloneTool();
window.VoiceClone = voiceCloneTool;

document.addEventListener('DOMContentLoaded', () => voiceCloneTool.init());
console.log('[VoiceCloneTool] 모듈 로드 완료');
