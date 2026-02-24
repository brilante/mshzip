/**
 * 멀티 타이머 - ToolBase 기반
 * 여러 요리 타이머 동시 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var MultiTimer = class MultiTimer extends ToolBase {
  constructor() {
    super('MultiTimer');
    this.timers = [];
    this.nextId = 1;
  }

  init() {
    this.initElements({
      timerGrid: 'timerGrid',
      timerName: 'timerName',
      timerMin: 'timerMin',
      timerSec: 'timerSec'
    });

    this.render();

    console.log('[MultiTimer] 초기화 완료');
    return this;
  }

  destroy() {
    // 모든 타이머 정리
    this.timers.forEach(timer => {
      if (timer.intervalId) {
        clearInterval(timer.intervalId);
      }
    });
    super.destroy();
  }

  addPreset(name, minutes) {
    this.createTimer(name, minutes * 60);
  }

  addTimer() {
    const name = this.elements.timerName.value.trim() || `타이머 ${this.nextId}`;
    const min = parseInt(this.elements.timerMin.value) || 0;
    const sec = parseInt(this.elements.timerSec.value) || 0;

    const totalSeconds = min * 60 + sec;
    if (totalSeconds <= 0) {
      this.showToast('시간을 입력하세요', 'error');
      return;
    }

    this.createTimer(name, totalSeconds);

    this.elements.timerName.value = '';
    this.elements.timerMin.value = '5';
    this.elements.timerSec.value = '0';
  }

  createTimer(name, totalSeconds) {
    const timer = {
      id: this.nextId++,
      name,
      totalSeconds,
      remainingSeconds: totalSeconds,
      running: false,
      finished: false,
      intervalId: null
    };

    this.timers.push(timer);
    this.render();
    this.showToast(`${name} 타이머 추가됨`, 'success');
  }

  startTimer(id) {
    const timer = this.timers.find(t => t.id === id);
    if (!timer || timer.running || timer.finished) return;

    timer.running = true;
    timer.intervalId = setInterval(() => {
      timer.remainingSeconds--;

      if (timer.remainingSeconds <= 0) {
        timer.remainingSeconds = 0;
        timer.running = false;
        timer.finished = true;
        clearInterval(timer.intervalId);
        this.notifyFinished(timer);
      }

      this.render();
    }, 1000);

    this.render();
  }

  pauseTimer(id) {
    const timer = this.timers.find(t => t.id === id);
    if (!timer || !timer.running) return;

    timer.running = false;
    clearInterval(timer.intervalId);
    this.render();
  }

  resetTimer(id) {
    const timer = this.timers.find(t => t.id === id);
    if (!timer) return;

    if (timer.intervalId) {
      clearInterval(timer.intervalId);
    }

    timer.remainingSeconds = timer.totalSeconds;
    timer.running = false;
    timer.finished = false;
    this.render();
  }

  deleteTimer(id) {
    const timer = this.timers.find(t => t.id === id);
    if (timer && timer.intervalId) {
      clearInterval(timer.intervalId);
    }

    this.timers = this.timers.filter(t => t.id !== id);
    this.render();
  }

  stopAll() {
    this.timers.forEach(timer => {
      if (timer.intervalId) {
        clearInterval(timer.intervalId);
      }
      timer.running = false;
    });
    this.render();
  }

  clearAll() {
    if (this.timers.length === 0) return;
    if (!confirm('모든 타이머를 삭제하시겠습니까?')) return;

    this.timers.forEach(timer => {
      if (timer.intervalId) {
        clearInterval(timer.intervalId);
      }
    });

    this.timers = [];
    this.render();
    this.showToast('모든 타이머 삭제됨', 'success');
  }

  notifyFinished(timer) {
    // 알림음 (Web Audio API)
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      setTimeout(() => oscillator.stop(), 500);
    } catch (e) {}

    this.showToast(`${timer.name} 완료!`, 'success');
  }

  formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  render() {
    const container = this.elements.timerGrid;

    if (this.timers.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">타이머를 추가하세요</div>';
      return;
    }

    container.innerHTML = this.timers.map(timer => {
      let cardClass = 'timer-card';
      if (timer.running) cardClass += ' running';
      if (timer.finished) cardClass += ' finished';

      return `
        <div class="${cardClass}">
          <div class="timer-name">${timer.name}</div>
          <div class="timer-display">${this.formatTime(timer.remainingSeconds)}</div>
          <div class="timer-controls">
            ${timer.finished ?
              `<button class="timer-btn timer-btn-reset" onclick="multiTimer.resetTimer(${timer.id})"></button>` :
              timer.running ?
                `<button class="timer-btn timer-btn-pause" onclick="multiTimer.pauseTimer(${timer.id})"></button>` :
                `<button class="timer-btn timer-btn-start" onclick="multiTimer.startTimer(${timer.id})"></button>`
            }
            <button class="timer-btn timer-btn-reset" onclick="multiTimer.resetTimer(${timer.id})">↺</button>
            <button class="timer-btn timer-btn-delete" onclick="multiTimer.deleteTimer(${timer.id})"></button>
          </div>
        </div>
      `;
    }).join('');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const multiTimer = new MultiTimer();
window.MultiTimer = multiTimer;

document.addEventListener('DOMContentLoaded', () => multiTimer.init());
