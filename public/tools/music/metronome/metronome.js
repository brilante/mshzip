/**
 * 메트로놈 - ToolBase 기반
 * 정확한 박자 연습
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var Metronome = class Metronome extends ToolBase {
  constructor() {
    super('Metronome');
    this.bpm = 120;
    this.beats = 4;
    this.currentBeat = 0;
    this.isPlaying = false;
    this.intervalId = null;
    this.audioContext = null;
    this.tapTimes = [];

    this.tempos = [
      { max: 40, name: 'Grave' },
      { max: 60, name: 'Largo' },
      { max: 66, name: 'Larghetto' },
      { max: 76, name: 'Adagio' },
      { max: 108, name: 'Andante' },
      { max: 120, name: 'Moderato' },
      { max: 156, name: 'Allegro' },
      { max: 176, name: 'Vivace' },
      { max: 200, name: 'Presto' },
      { max: 999, name: 'Prestissimo' }
    ];
  }

  init() {
    this.initElements({
      startBtn: 'startBtn',
      pendulum: 'pendulum',
      beatIndicator: 'beatIndicator',
      bpmSlider: 'bpmSlider',
      bpmDisplay: 'bpmDisplay',
      tempoName: 'tempoName'
    });

    this.updateDisplay();
    this.renderBeatIndicator();

    // 키보드 이벤트
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        this.tapTempo();
      }
    });

    console.log('[Metronome] 초기화 완료');
    return this;
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }

  start() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.isPlaying = true;
    this.currentBeat = 0;

    this.elements.startBtn.innerHTML = '정지';

    const interval = 60000 / this.bpm;
    this.tick();
    this.intervalId = setInterval(() => this.tick(), interval);
  }

  stop() {
    this.isPlaying = false;
    clearInterval(this.intervalId);

    this.elements.startBtn.innerHTML = '시작';
    this.elements.pendulum.style.transform = 'rotate(0deg)';

    document.querySelectorAll('.beat-dot').forEach(dot => {
      dot.classList.remove('active', 'accent');
    });
  }

  tick() {
    this.currentBeat = (this.currentBeat % this.beats) + 1;

    const isAccent = this.currentBeat === 1;
    this.playClick(isAccent);

    this.updateBeatIndicator();
    this.animatePendulum();
  }

  playClick(isAccent) {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.frequency.value = isAccent ? 1000 : 800;
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.5, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

    osc.start(this.audioContext.currentTime);
    osc.stop(this.audioContext.currentTime + 0.05);
  }

  animatePendulum() {
    const angle = this.currentBeat % 2 === 1 ? 25 : -25;
    this.elements.pendulum.style.transform = `rotate(${angle}deg)`;
  }

  updateBeatIndicator() {
    const dots = document.querySelectorAll('.beat-dot');
    dots.forEach((dot, i) => {
      dot.classList.remove('active', 'accent');
      if (i === this.currentBeat - 1) {
        dot.classList.add(this.currentBeat === 1 ? 'accent' : 'active');
      }
    });
  }

  renderBeatIndicator() {
    this.elements.beatIndicator.innerHTML = Array(this.beats).fill(0).map(() =>
      '<div class="beat-dot"></div>'
    ).join('');
  }

  setBpm(value) {
    this.bpm = Math.max(20, Math.min(280, parseInt(value)));
    this.elements.bpmSlider.value = this.bpm;
    this.updateDisplay();

    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }

  adjustBpm(delta) {
    this.setBpm(this.bpm + delta);
  }

  setBeats(beats) {
    this.beats = beats;
    this.currentBeat = 0;
    this.renderBeatIndicator();

    document.querySelectorAll('.sig-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.beats) === beats);
    });
  }

  updateDisplay() {
    this.elements.bpmDisplay.textContent = this.bpm;

    const tempo = this.tempos.find(t => this.bpm <= t.max);
    this.elements.tempoName.textContent = tempo ? tempo.name : '';
  }

  tapTempo() {
    const now = Date.now();
    this.tapTimes.push(now);

    if (this.tapTimes.length > 4) {
      this.tapTimes.shift();
    }

    if (this.tapTimes.length >= 2) {
      const lastInterval = now - this.tapTimes[this.tapTimes.length - 2];
      if (lastInterval > 2000) {
        this.tapTimes = [now];
        return;
      }
    }

    if (this.tapTimes.length >= 2) {
      let totalInterval = 0;
      for (let i = 1; i < this.tapTimes.length; i++) {
        totalInterval += this.tapTimes[i] - this.tapTimes[i - 1];
      }
      const avgInterval = totalInterval / (this.tapTimes.length - 1);
      const calculatedBpm = Math.round(60000 / avgInterval);
      this.setBpm(calculatedBpm);
    }
  }
}

// 전역 인스턴스 생성
const metronome = new Metronome();
window.Metronome = metronome;

// 전역 함수 (HTML onclick 호환)
function toggle() { metronome.toggle(); }
function setBpm(value) { metronome.setBpm(value); }
function adjustBpm(delta) { metronome.adjustBpm(delta); }
function setBeats(beats) { metronome.setBeats(beats); }
function tapTempo() { metronome.tapTempo(); }

document.addEventListener('DOMContentLoaded', () => metronome.init());
