/**
 * 뽀모도로 타이머 - ToolBase 기반
 * 집중과 휴식의 균형
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var Pomodoro = class Pomodoro extends ToolBase {
  constructor() {
    super('Pomodoro');
    this.mode = 'focus';
    this.isRunning = false;
    this.timeLeft = 25 * 60;
    this.totalTime = 25 * 60;
    this.intervalId = null;
    this.sessionsCompleted = 0;

    this.settings = {
      focusTime: 25,
      breakTime: 5,
      longBreakTime: 15,
      sessionsUntilLong: 4
    };

    this.stats = {
      todayPomodoros: 0,
      todayMinutes: 0,
      totalPomodoros: 0,
      lastDate: null
    };
  }

  init() {
    this.initElements({
      timerDisplay: 'timerDisplay',
      timerMode: 'timerMode',
      timerCard: 'timerCard',
      playBtn: 'playBtn',
      progressBar: 'progressBar',
      sessionDots: 'sessionDots',
      todayPomodoros: 'todayPomodoros',
      todayMinutes: 'todayMinutes',
      totalPomodoros: 'totalPomodoros',
      focusTime: 'focusTime',
      breakTime: 'breakTime',
      longBreakTime: 'longBreakTime',
      sessionsUntilLong: 'sessionsUntilLong'
    });

    this.loadSettings();
    this.loadStats();
    this.checkNewDay();
    this.updateDisplay();
    this.updateStats();
    this.renderSessionDots();

    console.log('[Pomodoro] 초기화 완료');
    return this;
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('pomodoroSettings');
      if (saved) {
        this.settings = JSON.parse(saved);
        this.elements.focusTime.value = this.settings.focusTime;
        this.elements.breakTime.value = this.settings.breakTime;
        this.elements.longBreakTime.value = this.settings.longBreakTime;
        this.elements.sessionsUntilLong.value = this.settings.sessionsUntilLong;
      }
    } catch (e) {}
    this.timeLeft = this.settings.focusTime * 60;
    this.totalTime = this.timeLeft;
  }

  loadStats() {
    try {
      const saved = localStorage.getItem('pomodoroStats');
      if (saved) {
        this.stats = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveSettings() {
    localStorage.setItem('pomodoroSettings', JSON.stringify(this.settings));
  }

  saveStats() {
    localStorage.setItem('pomodoroStats', JSON.stringify(this.stats));
  }

  checkNewDay() {
    const today = new Date().toDateString();
    if (this.stats.lastDate !== today) {
      this.stats.todayPomodoros = 0;
      this.stats.todayMinutes = 0;
      this.stats.lastDate = today;
      this.saveStats();
    }
  }

  updateSettings() {
    this.settings.focusTime = parseInt(this.elements.focusTime.value) || 25;
    this.settings.breakTime = parseInt(this.elements.breakTime.value) || 5;
    this.settings.longBreakTime = parseInt(this.elements.longBreakTime.value) || 15;
    this.settings.sessionsUntilLong = parseInt(this.elements.sessionsUntilLong.value) || 4;
    this.saveSettings();

    if (!this.isRunning) {
      this.setMode(this.mode);
    }
  }

  setMode(mode) {
    this.mode = mode;
    this.isRunning = false;
    clearInterval(this.intervalId);

    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.textContent.includes(
        mode === 'focus' ? '집중' : mode === 'break' ? '' : '긴'
      ));
    });

    const card = this.elements.timerCard;
    card.classList.remove('break', 'long-break');
    if (mode === 'break') card.classList.add('break');
    if (mode === 'longBreak') card.classList.add('long-break');

    const modeText = { focus: '집중 시간', break: '휴식 시간', longBreak: '긴 휴식 시간' };
    this.elements.timerMode.textContent = modeText[mode];

    const times = { focus: this.settings.focusTime, break: this.settings.breakTime, longBreak: this.settings.longBreakTime };
    this.timeLeft = times[mode] * 60;
    this.totalTime = this.timeLeft;

    this.updateDisplay();
    this.elements.playBtn.textContent = '';
  }

  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    this.isRunning = true;
    this.elements.playBtn.textContent = '';

    this.intervalId = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();

      if (this.timeLeft <= 0) {
        this.complete();
      }
    }, 1000);
  }

  pause() {
    this.isRunning = false;
    clearInterval(this.intervalId);
    this.elements.playBtn.textContent = '';
  }

  reset() {
    this.pause();
    this.setMode(this.mode);
  }

  skip() {
    this.pause();
    this.complete();
  }

  complete() {
    clearInterval(this.intervalId);
    this.isRunning = false;

    if (this.mode === 'focus') {
      this.sessionsCompleted++;
      this.stats.todayPomodoros++;
      this.stats.todayMinutes += this.settings.focusTime;
      this.stats.totalPomodoros++;
      this.saveStats();
      this.updateStats();
      this.renderSessionDots();

      this.playSound();

      if (this.sessionsCompleted >= this.settings.sessionsUntilLong) {
        this.sessionsCompleted = 0;
        this.setMode('longBreak');
      } else {
        this.setMode('break');
      }
    } else {
      this.playSound();
      this.setMode('focus');
    }
  }

  playSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }

    this.showToast(this.mode === 'focus' ? '집중 완료! ' : '휴식 끝! 다시 집중하세요 ', 'success');
  }

  updateDisplay() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    this.elements.timerDisplay.textContent =
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const progress = (this.timeLeft / this.totalTime) * 100;
    this.elements.progressBar.style.width = `${progress}%`;
  }

  updateStats() {
    this.elements.todayPomodoros.textContent = this.stats.todayPomodoros;
    this.elements.todayMinutes.textContent = this.stats.todayMinutes;
    this.elements.totalPomodoros.textContent = this.stats.totalPomodoros;
  }

  renderSessionDots() {
    const total = this.settings.sessionsUntilLong;
    this.elements.sessionDots.innerHTML = Array.from({ length: total }, (_, i) =>
      `<div class="session-dot ${i < this.sessionsCompleted ? 'completed' : ''}"></div>`
    ).join('');
  }
}

// 전역 인스턴스 생성
const pomodoro = new Pomodoro();
window.Pomodoro = pomodoro;

document.addEventListener('DOMContentLoaded', () => pomodoro.init());
