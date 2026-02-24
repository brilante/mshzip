/**
 * 휴식 타이머 - ToolBase 기반
 * 세트 간 휴식 시간 측정
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var RestTimer = class RestTimer extends ToolBase {
  constructor() {
    super('RestTimer');
    this.timer = null;
    this.totalSeconds = 60;
    this.currentSeconds = 60;
    this.isRunning = false;
    this.activePreset = 60;

    this.presets = [
      { seconds: 30, label: '짧은 휴식' },
      { seconds: 60, label: '일반' },
      { seconds: 90, label: '중간' },
      { seconds: 120, label: '긴 휴식' },
      { seconds: 180, label: '고중량' },
      { seconds: 300, label: '최대근력' }
    ];

    // 원 둘레 계산용
    this.circumference = 2 * Math.PI * 110;
  }

  init() {
    this.initElements({
      presetGrid: 'presetGrid',
      customSeconds: 'customSeconds',
      startBtn: 'startBtn',
      timerTime: 'timerTime',
      timerLabel: 'timerLabel',
      timerRing: 'timerRing',
      timerDisplay: 'timerDisplay'
    });

    this.loadSettings();
    this.renderPresets();
    this.updateDisplay();

    console.log('[RestTimer] 초기화 완료');
    return this;
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('rest-timer-preset');
      if (saved) {
        this.activePreset = parseInt(saved);
        this.totalSeconds = this.activePreset;
        this.currentSeconds = this.activePreset;
      }
    } catch (e) {}
  }

  saveSettings() {
    localStorage.setItem('rest-timer-preset', this.activePreset.toString());
  }

  renderPresets() {
    this.elements.presetGrid.innerHTML = this.presets.map(preset => {
      const minutes = Math.floor(preset.seconds / 60);
      const seconds = preset.seconds % 60;
      const timeStr = minutes > 0 ?
        (seconds > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${minutes}분`) :
        `${seconds}초`;

      return `
        <div class="preset-btn ${this.activePreset === preset.seconds ? 'active' : ''}" onclick="restTimer.setPreset(${preset.seconds})">
          <div class="preset-time">${timeStr}</div>
          <div class="preset-label">${preset.label}</div>
        </div>
      `;
    }).join('');
  }

  setPreset(seconds) {
    this.activePreset = seconds;
    this.totalSeconds = seconds;
    this.currentSeconds = seconds;
    this.isRunning = false;
    clearInterval(this.timer);

    this.saveSettings();
    this.renderPresets();
    this.updateDisplay();

    this.elements.startBtn.textContent = '시작';
  }

  setCustom() {
    const seconds = parseInt(this.elements.customSeconds.value);
    if (!seconds || seconds < 1 || seconds > 600) {
      this.showToast('1~600초 사이로 입력하세요', 'error');
      return;
    }

    this.activePreset = seconds;
    this.totalSeconds = seconds;
    this.currentSeconds = seconds;
    this.isRunning = false;
    clearInterval(this.timer);

    this.saveSettings();
    this.renderPresets();
    this.updateDisplay();

    this.elements.customSeconds.value = '';
    this.elements.startBtn.textContent = '시작';
  }

  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    if (this.currentSeconds <= 0) {
      this.currentSeconds = this.totalSeconds;
    }

    this.isRunning = true;
    this.elements.startBtn.textContent = '일시정지';

    this.timer = setInterval(() => this.tick(), 1000);
  }

  pause() {
    this.isRunning = false;
    clearInterval(this.timer);
    this.elements.startBtn.textContent = '계속';
  }

  reset() {
    this.isRunning = false;
    clearInterval(this.timer);
    this.currentSeconds = this.totalSeconds;
    this.updateDisplay();
    this.elements.startBtn.textContent = '시작';
  }

  tick() {
    this.currentSeconds--;

    if (this.currentSeconds <= 3 && this.currentSeconds > 0) {
      this.playSound(880);
    }

    if (this.currentSeconds <= 0) {
      this.complete();
    }

    this.updateDisplay();
  }

  complete() {
    this.isRunning = false;
    clearInterval(this.timer);
    this.playSound(523, 0.5);
    this.elements.startBtn.textContent = '시작';
    this.elements.timerLabel.textContent = '휴식 완료!';

    // 진동 (모바일)
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  }

  updateDisplay() {
    const minutes = Math.floor(this.currentSeconds / 60);
    const seconds = this.currentSeconds % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    this.elements.timerTime.textContent = timeStr;

    if (this.currentSeconds > 0) {
      this.elements.timerLabel.textContent = '휴식';
    }

    // 원형 프로그레스
    const progress = this.currentSeconds / this.totalSeconds;
    const offset = this.circumference * (1 - progress);
    this.elements.timerRing.style.strokeDashoffset = offset;

    // 색상 변경 (10초 이하)
    const ring = this.elements.timerRing;
    const display = this.elements.timerDisplay;

    if (this.currentSeconds <= 10 && this.currentSeconds > 0) {
      ring.style.stroke = '#ef4444';
      display.style.background = 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(220,38,38,0.1) 100%)';
    } else if (this.currentSeconds <= 0) {
      ring.style.stroke = '#22c55e';
      display.style.background = 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(22,163,74,0.1) 100%)';
    } else {
      ring.style.stroke = '#3b82f6';
      display.style.background = '';
    }
  }

  playSound(freq, duration = 0.15) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }
}

// 전역 인스턴스 생성
const restTimer = new RestTimer();
window.RestTimer = restTimer;

document.addEventListener('DOMContentLoaded', () => restTimer.init());
