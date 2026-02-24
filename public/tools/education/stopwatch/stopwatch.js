/**
 * 스톱워치 - ToolBase 기반
 * 정밀 시간 측정
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var Stopwatch = class Stopwatch extends ToolBase {
  constructor() {
    super('Stopwatch');
    this.startTime = 0;
    this.elapsedTime = 0;
    this.interval = null;
    this.isRunning = false;
    this.laps = [];
    this.lastLapTime = 0;
  }

  init() {
    this.initElements({
      mainTime: 'mainTime',
      msTime: 'msTime',
      startBtn: 'startBtn',
      lapBtn: 'lapBtn',
      timeDisplay: 'timeDisplay',
      lapsList: 'lapsList'
    });

    this.setupKeyboard();

    console.log('[Stopwatch] 초기화 완료');
    return this;
  }

  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        this.start();
      } else if (e.code === 'KeyL') {
        this.lap();
      } else if (e.code === 'KeyR') {
        this.reset();
      }
    });
  }

  start() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.isRunning = true;
      this.startTime = Date.now() - this.elapsedTime;
      this.interval = setInterval(() => this.update(), 10);

      this.elements.startBtn.textContent = '';
      this.elements.startBtn.className = 'control-btn pause-btn';
      this.elements.lapBtn.disabled = false;
      this.elements.timeDisplay.classList.add('running');
    }
  }

  pause() {
    this.isRunning = false;
    clearInterval(this.interval);

    this.elements.startBtn.textContent = '';
    this.elements.startBtn.className = 'control-btn start-btn';
  }

  reset() {
    this.isRunning = false;
    clearInterval(this.interval);
    this.elapsedTime = 0;
    this.laps = [];
    this.lastLapTime = 0;

    this.elements.mainTime.textContent = '00:00:00';
    this.elements.msTime.textContent = '.00';
    this.elements.startBtn.textContent = '';
    this.elements.startBtn.className = 'control-btn start-btn';
    this.elements.lapBtn.disabled = true;
    this.elements.timeDisplay.classList.remove('running');
    this.renderLaps();
  }

  update() {
    this.elapsedTime = Date.now() - this.startTime;
    this.display(this.elapsedTime);
  }

  display(time) {
    const ms = Math.floor((time % 1000) / 10);
    const seconds = Math.floor((time / 1000) % 60);
    const minutes = Math.floor((time / (1000 * 60)) % 60);
    const hours = Math.floor(time / (1000 * 60 * 60));

    this.elements.mainTime.textContent =
      `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
    this.elements.msTime.textContent = `.${this.pad(ms)}`;
  }

  lap() {
    if (!this.isRunning) return;

    const lapTime = this.elapsedTime;
    const diff = lapTime - this.lastLapTime;
    this.lastLapTime = lapTime;

    this.laps.push({
      number: this.laps.length + 1,
      total: lapTime,
      diff: diff
    });

    this.renderLaps();
  }

  renderLaps() {
    if (this.laps.length === 0) {
      this.elements.lapsList.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.85rem;">아직 기록된 랩이 없습니다.</div>';
    } else {
      this.elements.lapsList.innerHTML = [...this.laps].reverse().map(lap =>
        `<div class="lap-item">
          <span class="lap-number">랩 ${lap.number}</span>
          <span class="lap-time">${this.formatTime(lap.total)}</span>
          <span class="lap-diff">+${this.formatTime(lap.diff)}</span>
        </div>`
      ).join('');
    }
  }

  formatTime(time) {
    const ms = Math.floor((time % 1000) / 10);
    const seconds = Math.floor((time / 1000) % 60);
    const minutes = Math.floor((time / (1000 * 60)) % 60);
    const hours = Math.floor(time / (1000 * 60 * 60));

    if (hours > 0) {
      return `${hours}:${this.pad(minutes)}:${this.pad(seconds)}.${this.pad(ms)}`;
    }
    return `${this.pad(minutes)}:${this.pad(seconds)}.${this.pad(ms)}`;
  }

  pad(num) {
    return num.toString().padStart(2, '0');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const stopwatch = new Stopwatch();
window.Stopwatch = stopwatch;

document.addEventListener('DOMContentLoaded', () => stopwatch.init());
