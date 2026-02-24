/**
 * 집중 모드 - ToolBase 기반
 * 타이머 기반 집중 세션 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class FocusMode extends ToolBase {
  constructor() {
    super('FocusMode');
    this.focusTime = 25;
    this.timeLeft = 25 * 60;
    this.isRunning = false;
    this.isPaused = false;
    this.interval = null;
    this.audioContext = null;
    this.quotes = [
      '"집중력은 성공의 열쇠다." - 빌 게이츠',
      '"시작이 반이다."',
      '"오늘 할 일을 내일로 미루지 마라."',
      '"꾸준함이 천재를 이긴다."',
      '"작은 진전도 진전이다."',
      '"지금 이 순간에 집중하라."',
      '"불가능은 없다, 다만 시간이 걸릴 뿐."'
    ];
  }

  init() {
    this.initElements({
      focusTask: 'focusTask',
      bgSound: 'bgSound',
      startFocus: 'startFocus',
      setupPanel: 'setupPanel',
      focusPanel: 'focusPanel',
      completePanel: 'completePanel',
      displayTask: 'displayTask',
      quote: 'quote',
      timerDisplay: 'timerDisplay',
      timerProgress: 'timerProgress',
      pauseFocus: 'pauseFocus',
      endFocus: 'endFocus',
      completedTime: 'completedTime',
      newSession: 'newSession',
      totalSessions: 'totalSessions',
      totalMinutes: 'totalMinutes'
    });

    this.bindEvents();
    this.updateStatsDisplay();

    console.log('[FocusMode] 초기화 완료');
    return this;
  }

  bindEvents() {
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.focusTime = parseInt(btn.dataset.time);
      });
    });

    this.elements.startFocus.addEventListener('click', () => this.startFocusHandler());
    this.elements.pauseFocus.addEventListener('click', () => this.pauseFocusHandler());
    this.elements.endFocus.addEventListener('click', () => this.endFocusHandler());
    this.elements.newSession.addEventListener('click', () => this.resetToSetup());
  }

  getStats() {
    const today = new Date().toDateString();
    const stats = JSON.parse(localStorage.getItem('focusStats')) || {};
    return stats[today] || { sessions: 0, minutes: 0 };
  }

  saveStats(minutes) {
    const today = new Date().toDateString();
    const stats = JSON.parse(localStorage.getItem('focusStats')) || {};
    if (!stats[today]) stats[today] = { sessions: 0, minutes: 0 };
    stats[today].sessions++;
    stats[today].minutes += minutes;
    localStorage.setItem('focusStats', JSON.stringify(stats));
    this.updateStatsDisplay();
  }

  updateStatsDisplay() {
    const stats = this.getStats();
    this.elements.totalSessions.textContent = stats.sessions;
    this.elements.totalMinutes.textContent = stats.minutes;
  }

  startFocusHandler() {
    const task = this.elements.focusTask.value.trim() || '집중 세션';
    this.timeLeft = this.focusTime * 60;

    this.elements.displayTask.textContent = task;
    this.elements.quote.textContent = this.quotes[Math.floor(Math.random() * this.quotes.length)];

    this.elements.setupPanel.classList.add('hidden');
    this.elements.focusPanel.classList.remove('hidden');
    document.body.classList.add('fullscreen-focus');

    this.updateTimerDisplay();
    this.startTimer();
    this.startSound();
  }

  startTimer() {
    this.isRunning = true;
    this.isPaused = false;
    this.elements.pauseFocus.textContent = '일시정지';

    this.interval = setInterval(() => {
      if (!this.isPaused) {
        this.timeLeft--;
        this.updateTimerDisplay();

        if (this.timeLeft <= 0) {
          this.completeSession();
        }
      }
    }, 1000);
  }

  updateTimerDisplay() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    this.elements.timerDisplay.textContent =
      mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');

    const totalSeconds = this.focusTime * 60;
    const progress = ((totalSeconds - this.timeLeft) / totalSeconds) * 283;
    this.elements.timerProgress.style.strokeDashoffset = 283 - progress;
  }

  pauseFocusHandler() {
    this.isPaused = !this.isPaused;
    this.elements.pauseFocus.textContent = this.isPaused ? '재개' : '일시정지';
    if (this.isPaused) {
      this.stopSound();
    } else {
      this.startSound();
    }
  }

  endFocusHandler() {
    if (confirm('집중 모드를 종료하시겠습니까?')) {
      this.endSession();
    }
  }

  completeSession() {
    clearInterval(this.interval);
    this.isRunning = false;
    this.stopSound();
    this.playCompleteSound();

    this.saveStats(this.focusTime);

    this.elements.completedTime.textContent = this.focusTime + '분 동안 집중하셨습니다';
    this.elements.focusPanel.classList.add('hidden');
    this.elements.completePanel.classList.remove('hidden');
    this.showToast('집중 세션 완료!', 'success');
  }

  endSession() {
    clearInterval(this.interval);
    this.isRunning = false;
    this.stopSound();

    const elapsedMinutes = this.focusTime - Math.ceil(this.timeLeft / 60);
    if (elapsedMinutes > 0) {
      this.saveStats(elapsedMinutes);
    }

    this.resetToSetup();
  }

  resetToSetup() {
    this.elements.setupPanel.classList.remove('hidden');
    this.elements.focusPanel.classList.add('hidden');
    this.elements.completePanel.classList.add('hidden');
    document.body.classList.remove('fullscreen-focus');

    this.timeLeft = this.focusTime * 60;
    this.elements.timerProgress.style.strokeDashoffset = 0;
  }

  startSound() {
    const sound = this.elements.bgSound.value;
    if (sound === 'none') return;

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const gainNode = this.audioContext.createGain();

      if (sound === 'whitenoise') {
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = this.audioContext.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;
        whiteNoise.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = 0.1;
        whiteNoise.start();
      }
    } catch (e) {
      console.log('Audio not supported');
    }
  }

  stopSound() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  playCompleteSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1);
    } catch (e) {}
  }
}

// 전역 인스턴스 생성
const focusMode = new FocusMode();
window.FocusMode = focusMode;

document.addEventListener('DOMContentLoaded', () => focusMode.init());
