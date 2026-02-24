/**
 * 텍스트 음성 변환기 - ToolBase 기반
 * Web Speech API 기반 TTS
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class TextToSpeech extends ToolBase {
  constructor() {
    super('TextToSpeech');
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.utterance = null;
    this.isPaused = false;

    this.presets = {
      slow: { rate: 0.7, pitch: 1.0 },
      normal: { rate: 1.0, pitch: 1.0 },
      fast: { rate: 1.5, pitch: 1.0 },
      robot: { rate: 0.8, pitch: 0.5 },
      child: { rate: 1.2, pitch: 1.8 }
    };

    this.samples = {
      greeting: '안녕하세요! 오늘 하루도 즐겁고 행복한 하루 되세요. 좋은 일만 가득하길 바랍니다!',
      news: '오늘 날씨는 전국적으로 맑은 가운데, 낮 기온이 영상 15도까지 오르며 포근한 날씨가 예상됩니다. 다만 일교차가 크므로 건강 관리에 유의하시기 바랍니다.',
      story: '옛날 옛적에, 깊은 산속에 착한 토끼 한 마리가 살고 있었습니다. 어느 날 토끼는 숲속에서 길을 잃은 작은 새를 발견했습니다.',
      numbers: '일, 이, 삼, 사, 오, 육, 칠, 팔, 구, 십. 하나, 둘, 셋, 넷, 다섯, 여섯, 일곱, 여덟, 아홉, 열.'
    };
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      voiceSelect: 'voiceSelect',
      rateRange: 'rateRange',
      pitchRange: 'pitchRange',
      volumeRange: 'volumeRange',
      rateValue: 'rateValue',
      pitchValue: 'pitchValue',
      volumeValue: 'volumeValue',
      playBtn: 'playBtn',
      pauseBtn: 'pauseBtn',
      status: 'status',
      progressFill: 'progressFill',
      charCount: 'charCount'
    });

    this.loadVoices();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this.loadVoices();
    }

    this.setupEvents();

    console.log('[TextToSpeech] 초기화 완료');
    return this;
  }

  setupEvents() {
    this.elements.rateRange.addEventListener('input', () => {
      this.elements.rateValue.textContent = this.elements.rateRange.value;
    });

    this.elements.pitchRange.addEventListener('input', () => {
      this.elements.pitchValue.textContent = this.elements.pitchRange.value;
    });

    this.elements.volumeRange.addEventListener('input', () => {
      this.elements.volumeValue.textContent = Math.round(this.elements.volumeRange.value * 100);
    });

    this.elements.inputText.addEventListener('input', () => {
      this.elements.charCount.textContent = this.elements.inputText.value.length;
    });
  }

  loadVoices() {
    this.voices = this.synth.getVoices();
    const select = this.elements.voiceSelect;

    const koreanVoices = this.voices.filter(v => v.lang.includes('ko'));
    const otherVoices = this.voices.filter(v => !v.lang.includes('ko'));

    select.innerHTML = '';

    if (koreanVoices.length > 0) {
      const koGroup = document.createElement('optgroup');
      koGroup.label = '한국어';
      koreanVoices.forEach((voice) => {
        const option = document.createElement('option');
        option.value = this.voices.indexOf(voice);
        option.textContent = voice.name + ' (' + voice.lang + ')';
        koGroup.appendChild(option);
      });
      select.appendChild(koGroup);
    }

    const otherGroup = document.createElement('optgroup');
    otherGroup.label = '기타 언어';
    otherVoices.slice(0, 20).forEach((voice) => {
      const option = document.createElement('option');
      option.value = this.voices.indexOf(voice);
      option.textContent = voice.name + ' (' + voice.lang + ')';
      otherGroup.appendChild(option);
    });
    select.appendChild(otherGroup);
  }

  speak() {
    const text = this.elements.inputText.value;
    if (!text) {
      this.showToast('텍스트를 입력하세요', 'warning');
      return;
    }

    if (this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
      this.updateStatus('재생 중...');
      return;
    }

    this.synth.cancel();

    this.utterance = new SpeechSynthesisUtterance(text);

    const voiceIndex = this.elements.voiceSelect.value;
    if (this.voices[voiceIndex]) {
      this.utterance.voice = this.voices[voiceIndex];
    }

    this.utterance.rate = parseFloat(this.elements.rateRange.value);
    this.utterance.pitch = parseFloat(this.elements.pitchRange.value);
    this.utterance.volume = parseFloat(this.elements.volumeRange.value);

    this.utterance.onstart = () => {
      this.updateStatus('재생 중...');
      this.elements.playBtn.disabled = true;
      this.elements.pauseBtn.disabled = false;
    };

    this.utterance.onend = () => {
      this.updateStatus('완료');
      this.elements.playBtn.disabled = false;
      this.elements.pauseBtn.disabled = true;
      this.elements.progressFill.style.width = '100%';
    };

    this.utterance.onerror = (e) => {
      this.updateStatus('오류: ' + e.error);
      this.elements.playBtn.disabled = false;
    };

    this.utterance.onboundary = (e) => {
      const progress = (e.charIndex / text.length) * 100;
      this.elements.progressFill.style.width = progress + '%';
    };

    this.synth.speak(this.utterance);
  }

  pauseSpeak() {
    if (this.synth.speaking && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
      this.updateStatus('일시정지');
      this.elements.playBtn.disabled = false;
    }
  }

  stopSpeak() {
    this.synth.cancel();
    this.isPaused = false;
    this.updateStatus('정지됨');
    this.elements.playBtn.disabled = false;
    this.elements.pauseBtn.disabled = true;
    this.elements.progressFill.style.width = '0%';
  }

  updateStatus(text) {
    this.elements.status.textContent = text;
  }

  applyPreset(preset) {
    const p = this.presets[preset];
    if (p) {
      this.elements.rateRange.value = p.rate;
      this.elements.pitchRange.value = p.pitch;
      this.elements.rateValue.textContent = p.rate;
      this.elements.pitchValue.textContent = p.pitch;
    }
  }

  setSample(type) {
    const sample = this.samples[type];
    if (sample) {
      this.elements.inputText.value = sample;
      this.elements.charCount.textContent = sample.length;
    }
  }
}

// 전역 인스턴스 생성
const textToSpeech = new TextToSpeech();
window.TextToSpeech = textToSpeech;

// 전역 함수 (HTML onclick 호환)
function speak() { textToSpeech.speak(); }
function pauseSpeak() { textToSpeech.pauseSpeak(); }
function stopSpeak() { textToSpeech.stopSpeak(); }
function applyPreset(preset) { textToSpeech.applyPreset(preset); }
function setSample(type) { textToSpeech.setSample(type); }

document.addEventListener('DOMContentLoaded', () => textToSpeech.init());
