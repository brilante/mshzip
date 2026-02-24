/**
 * Text-to-Speech - ToolBase 기반
 * 텍스트를 자연스러운 음성으로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class TtsTool extends ToolBase {
  constructor() {
    super('TtsTool');
    this.selectedModel = 'elevenlabs';
    this.selectedVoice = 'alloy';
    this.audioUrl = null;

    this.modelNames = {
      'elevenlabs': 'ElevenLabs',
      'openai-tts': 'OpenAI TTS',
      'google-tts': 'Google TTS',
      'azure-tts': 'Azure TTS'
    };

    this.voiceNames = {
      'alloy': 'Alloy',
      'echo': 'Echo',
      'nova': 'Nova',
      'shimmer': 'Shimmer'
    };
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      charCount: 'charCount',
      speedSlider: 'speedSlider',
      pitchSlider: 'pitchSlider',
      audioPlayer: 'audioPlayer',
      downloadBtn: 'downloadBtn'
    });

    console.log('[TtsTool] 초기화 완료');
    return this;
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }

  selectVoice(voice) {
    this.selectedVoice = voice;
    document.querySelectorAll('.voice-card').forEach(card => {
      card.classList.toggle('active', card.dataset.voice === voice);
    });
  }

  updateCharCount() {
    const text = this.elements.textInput.value;
    this.elements.charCount.textContent = text.length;
  }

  async generate() {
    const text = this.elements.textInput.value.trim();

    if (!text) {
      this.showToast('텍스트를 입력하세요.', 'error');
      return;
    }

    if (text.length > 5000) {
      this.showToast('텍스트는 5000자 이하여야 합니다.', 'error');
      return;
    }

    this.showToast('음성 생성 중...');

    // 브라우저 TTS 사용 (데모)
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = parseFloat(this.elements.speedSlider.value);
      utterance.pitch = parseFloat(this.elements.pitchSlider.value);
      utterance.lang = 'ko-KR';

      utterance.onend = () => {
        this.showToast(`${this.modelNames[this.selectedModel]}로 음성 생성 완료!`);
      };

      speechSynthesis.speak(utterance);

      // 오디오 플레이어 표시 (데모용)
      this.elements.audioPlayer.style.display = 'block';
      this.elements.downloadBtn.disabled = false;
    } else {
      this.showToast('이 브라우저는 TTS를 지원하지 않습니다.', 'error');
    }
  }

  download() {
    this.showToast('데모 모드: 실제 서비스에서 MP3 다운로드가 가능합니다.');
  }
}

// 전역 인스턴스 생성
const ttsTool = new TtsTool();
window.TTS = ttsTool;

document.addEventListener('DOMContentLoaded', () => ttsTool.init());
console.log('[TtsTool] 모듈 로드 완료');
