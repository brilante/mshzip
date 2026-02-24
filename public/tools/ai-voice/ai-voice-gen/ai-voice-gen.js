/**
 * AI 보이스 생성 - ToolBase 기반
 * 다양한 AI 음성 캐릭터 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class AiVoiceGenTool extends ToolBase {
  constructor() {
    super('AiVoiceGenTool');
    this.selectedModel = 'elevenlabs';
    this.selectedType = 'narrator';

    this.modelNames = {
      'elevenlabs': 'ElevenLabs',
      'playht': 'Play.ht',
      'murf': 'Murf AI'
    };

    this.typeNames = {
      'narrator': '내레이터',
      'character': '캐릭터',
      'commercial': '광고'
    };
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      resultArea: 'resultArea',
      speedSlider: 'speedSlider',
      downloadBtn: 'downloadBtn'
    });

    console.log('[AiVoiceGenTool] 초기화 완료');
    return this;
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }

  selectType(type) {
    this.selectedType = type;
    document.querySelectorAll('.voice-type-card').forEach(card => {
      card.classList.toggle('active', card.dataset.type === type);
    });
  }

  async generate() {
    const text = this.elements.textInput.value.trim();

    if (!text) {
      this.showToast('텍스트를 입력하세요.', 'error');
      return;
    }

    this.showToast('음성 생성 중...');

    await this.delay(2000);

    // 브라우저 TTS 사용 (데모)
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = parseFloat(this.elements.speedSlider.value);
      speechSynthesis.speak(utterance);
    }

    const resultArea = this.elements.resultArea;
    resultArea.innerHTML = `
      <div style="margin-bottom: 1rem;">음성 생성 완료!</div>
      <div style="font-size: 0.85rem; color: var(--text-secondary);">
        ${this.modelNames[this.selectedModel]} | ${this.typeNames[this.selectedType]} 스타일
      </div>
    `;

    this.elements.downloadBtn.disabled = false;
    this.showToast('음성이 생성되었습니다!');
  }

  download() {
    this.showToast('데모 모드: 실제 서비스에서 MP3 다운로드가 가능합니다.');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const aiVoiceGenTool = new AiVoiceGenTool();
window.AIVoiceGen = aiVoiceGenTool;

document.addEventListener('DOMContentLoaded', () => aiVoiceGenTool.init());
console.log('[AiVoiceGenTool] 모듈 로드 완료');
