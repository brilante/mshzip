/**
 * Text-to-Speech 도구 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 * @description Web Speech API (SpeechSynthesis) 사용
 */

class TtsTool extends ToolBase {
  constructor() {
    super('TtsTool');
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.utterance = null;
    this.isPlaying = false;
    this.isPaused = false;

    this.samples = {
      greeting: '안녕하세요! MyMind3 Text-to-Speech 도구에 오신 것을 환영합니다. 텍스트를 입력하면 음성으로 읽어드립니다.',
      lorem: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      korean: '대한민국 헌법 제1조. 대한민국은 민주공화국이다. 대한민국의 주권은 국민에게 있고, 모든 권력은 국민으로부터 나온다.'
    };
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      charCount: 'charCount',
      voiceSelect: 'voiceSelect',
      langFilter: 'langFilter',
      genderFilter: 'genderFilter',
      rateSlider: 'rateSlider',
      rateValue: 'rateValue',
      pitchSlider: 'pitchSlider',
      pitchValue: 'pitchValue',
      volumeSlider: 'volumeSlider',
      volumeValue: 'volumeValue',
      playBtn: 'playBtn',
      playIcon: 'playIcon',
      playerStatus: 'playerStatus',
      progressFill: 'progressFill',
      waveform: 'waveform',
      voiceCount: 'voiceCount',
      browserSupport: 'browserSupport'
    });

    this.checkSupport();
    this.loadVoices();
    this.setupEventListeners();

    console.log('[TtsTool] 초기화 완료');
    return this;
  }

  checkSupport() {
    if ('speechSynthesis' in window) {
      this.elements.browserSupport.textContent = '지원됨 ';
      this.elements.browserSupport.style.color = '#27ae60';
    } else {
      this.elements.browserSupport.textContent = '미지원 ';
      this.elements.browserSupport.style.color = '#e74c3c';
      this.showToast('이 브라우저에서는 TTS가 지원되지 않습니다.', 'error');
    }
  }

  loadVoices() {
    const loadVoiceList = () => {
      this.voices = this.synth.getVoices();
      this.elements.voiceCount.textContent = `${this.voices.length}개`;
      this.filterVoices();
    };

    // 음성 목록 로드
    loadVoiceList();

    // Chrome 등에서는 비동기로 로드됨
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoiceList;
    }
  }

  filterVoices() {
    const lang = this.elements.langFilter.value;
    const gender = this.elements.genderFilter.value;

    let filtered = this.voices;

    // 언어 필터
    if (lang) {
      filtered = filtered.filter(v => v.lang.toLowerCase().startsWith(lang));
    }

    // 성별 필터 (이름 기반 추측)
    if (gender) {
      const femaleNames = ['female', 'woman', 'girl', 'yuna', 'sora', 'heami', 'sunhi', 'zira', 'susan', 'samantha'];
      const maleNames = ['male', 'man', 'boy', 'david', 'mark', 'james', 'daniel', 'george'];

      filtered = filtered.filter(v => {
        const name = v.name.toLowerCase();
        if (gender === 'female') {
          return femaleNames.some(n => name.includes(n));
        } else {
          return maleNames.some(n => name.includes(n));
        }
      });
    }

    // 옵션 생성
    this.elements.voiceSelect.innerHTML = filtered.length > 0
      ? filtered.map(v => `<option value="${v.name}">${v.name} (${v.lang})</option>`).join('')
      : '<option value="">사용 가능한 음성이 없습니다</option>';

    // 한국어 음성 우선 선택
    const koreanVoice = filtered.find(v => v.lang.startsWith('ko'));
    if (koreanVoice) {
      this.elements.voiceSelect.value = koreanVoice.name;
    }
  }

  setupEventListeners() {
    // 글자수 카운터
    this.elements.textInput.addEventListener('input', () => {
      this.elements.charCount.textContent = this.elements.textInput.value.length;
    });

    // 슬라이더
    this.elements.rateSlider.addEventListener('input', (e) => {
      this.elements.rateValue.textContent = `${e.target.value}x`;
    });

    this.elements.pitchSlider.addEventListener('input', (e) => {
      this.elements.pitchValue.textContent = e.target.value;
    });

    this.elements.volumeSlider.addEventListener('input', (e) => {
      this.elements.volumeValue.textContent = `${Math.round(e.target.value * 100)}%`;
    });
  }

  insertSample(key) {
    this.elements.textInput.value = this.samples[key] || '';
    this.elements.charCount.textContent = this.elements.textInput.value.length;
  }

  toggle() {
    if (this.isPlaying && !this.isPaused) {
      this.pause();
    } else if (this.isPaused) {
      this.resume();
    } else {
      this.play();
    }
  }

  play() {
    const text = this.elements.textInput.value.trim();

    if (!text) {
      this.showToast('읽어줄 텍스트를 입력하세요.', 'error');
      return;
    }

    // 이전 발화 중지
    this.synth.cancel();

    // 새 발화 생성
    this.utterance = new SpeechSynthesisUtterance(text);

    // 음성 설정
    const selectedVoiceName = this.elements.voiceSelect.value;
    const selectedVoice = this.voices.find(v => v.name === selectedVoiceName);
    if (selectedVoice) {
      this.utterance.voice = selectedVoice;
    }

    // 파라미터 설정
    this.utterance.rate = parseFloat(this.elements.rateSlider.value);
    this.utterance.pitch = parseFloat(this.elements.pitchSlider.value);
    this.utterance.volume = parseFloat(this.elements.volumeSlider.value);

    // 이벤트 핸들러
    this.utterance.onstart = () => {
      this.isPlaying = true;
      this.isPaused = false;
      this.updateUI('playing');
    };

    this.utterance.onend = () => {
      this.isPlaying = false;
      this.isPaused = false;
      this.updateUI('stopped');
    };

    this.utterance.onerror = (e) => {
      console.error('TTS Error:', e);
      this.isPlaying = false;
      this.isPaused = false;
      this.updateUI('error');
      this.showToast('음성 재생 중 오류가 발생했습니다.', 'error');
    };

    this.utterance.onpause = () => {
      this.isPaused = true;
      this.updateUI('paused');
    };

    this.utterance.onresume = () => {
      this.isPaused = false;
      this.updateUI('playing');
    };

    // 재생 시작
    this.synth.speak(this.utterance);
  }

  pause() {
    if (this.isPlaying && !this.isPaused) {
      this.synth.pause();
    }
  }

  resume() {
    if (this.isPaused) {
      this.synth.resume();
    }
  }

  stop() {
    this.synth.cancel();
    this.isPlaying = false;
    this.isPaused = false;
    this.updateUI('stopped');
  }

  updateUI(state) {
    const { playIcon, playerStatus, waveform, progressFill } = this.elements;

    switch (state) {
      case 'playing':
        playIcon.textContent = '';
        playerStatus.textContent = '재생 중...';
        waveform.classList.add('active');
        progressFill.style.width = '100%';
        progressFill.style.transition = 'none';
        break;

      case 'paused':
        playIcon.textContent = '';
        playerStatus.textContent = '일시정지';
        waveform.classList.remove('active');
        break;

      case 'stopped':
        playIcon.textContent = '';
        playerStatus.textContent = '재생 준비';
        waveform.classList.remove('active');
        progressFill.style.width = '0%';
        progressFill.style.transition = 'width 0.3s';
        break;

      case 'error':
        playIcon.textContent = '';
        playerStatus.textContent = '오류 발생';
        waveform.classList.remove('active');
        break;
    }
  }
}

// 전역 인스턴스 생성
const ttsTool = new TtsTool();
window.TTS = ttsTool;

document.addEventListener('DOMContentLoaded', () => ttsTool.init());
