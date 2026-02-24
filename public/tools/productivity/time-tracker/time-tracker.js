/**
 * 시간 추적기 - ToolBase 기반
 * 작업 시간 기록 및 통계
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class TimeTracker extends ToolBase {
  constructor() {
    super('TimeTracker');
    this.entries = [];
    this.isRunning = false;
    this.isPaused = false;
    this.startTime = 0;
    this.elapsedTime = 0;
    this.interval = null;
    this.categoryLabels = {
      work: '업무',
      study: '학습',
      project: '프로젝트',
      meeting: '회의',
      other: '기타'
    };
  }

  init() {
    this.initElements({
      hours: 'hours',
      minutes: 'minutes',
      seconds: 'seconds',
      startBtn: 'startBtn',
      pauseBtn: 'pauseBtn',
      stopBtn: 'stopBtn',
      taskName: 'taskName',
      taskCategory: 'taskCategory',
      historyList: 'historyList',
      todayTotal: 'todayTotal',
      weekTotal: 'weekTotal',
      taskCount: 'taskCount'
    });

    this.load();
    this.bindEvents();
    this.renderHistory();
    this.updateStats();

    console.log('[TimeTracker] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('timeEntries');
      if (saved) {
        this.entries = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('timeEntries', JSON.stringify(this.entries));
  }

  bindEvents() {
    this.elements.startBtn.addEventListener('click', () => this.startTimer());
    this.elements.pauseBtn.addEventListener('click', () => this.pauseTimer());
    this.elements.stopBtn.addEventListener('click', () => this.stopTimer());
  }

  formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return { h, m, s };
  }

  formatDuration(ms) {
    const { h, m } = this.formatTime(ms);
    return h + 'h ' + m + 'm';
  }

  updateDisplay() {
    const { h, m, s } = this.formatTime(this.elapsedTime);
    this.elements.hours.textContent = h.toString().padStart(2, '0');
    this.elements.minutes.textContent = m.toString().padStart(2, '0');
    this.elements.seconds.textContent = s.toString().padStart(2, '0');
  }

  startTimer() {
    if (!this.isRunning) {
      this.startTime = Date.now() - this.elapsedTime;
      this.interval = setInterval(() => {
        this.elapsedTime = Date.now() - this.startTime;
        this.updateDisplay();
      }, 1000);
      this.isRunning = true;
      this.isPaused = false;
      this.elements.startBtn.disabled = true;
      this.elements.pauseBtn.disabled = false;
      this.elements.stopBtn.disabled = false;
    }
  }

  pauseTimer() {
    if (this.isRunning && !this.isPaused) {
      clearInterval(this.interval);
      this.isPaused = true;
      this.elements.pauseBtn.textContent = '재개';
    } else if (this.isPaused) {
      this.startTime = Date.now() - this.elapsedTime;
      this.interval = setInterval(() => {
        this.elapsedTime = Date.now() - this.startTime;
        this.updateDisplay();
      }, 1000);
      this.isPaused = false;
      this.elements.pauseBtn.textContent = '일시정지';
    }
  }

  stopTimer() {
    clearInterval(this.interval);

    const taskName = this.elements.taskName.value.trim() || '이름 없는 작업';
    const category = this.elements.taskCategory.value;

    if (this.elapsedTime > 1000) {
      this.entries.unshift({
        id: Date.now().toString(),
        name: taskName,
        category,
        duration: this.elapsedTime,
        date: new Date().toISOString()
      });
      this.save();
      this.showToast('작업이 기록되었습니다', 'success');
    }

    this.isRunning = false;
    this.isPaused = false;
    this.elapsedTime = 0;
    this.updateDisplay();
    this.elements.startBtn.disabled = false;
    this.elements.pauseBtn.disabled = true;
    this.elements.pauseBtn.textContent = '일시정지';
    this.elements.stopBtn.disabled = true;
    this.elements.taskName.value = '';

    this.renderHistory();
    this.updateStats();
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  renderHistory() {
    this.elements.historyList.innerHTML = this.entries.slice(0, 20).map(entry => {
      const date = new Date(entry.date);
      return `
        <div class="history-item">
          <div class="history-info">
            <h4>${this.escapeHtml(entry.name)} <span class="history-category ${entry.category}">${this.categoryLabels[entry.category] || entry.category}</span></h4>
            <small>${date.toLocaleDateString()} ${date.toLocaleTimeString()}</small>
          </div>
          <span class="history-time">${this.formatDuration(entry.duration)}</span>
          <button onclick="timeTracker.deleteEntry('${entry.id}')">삭제</button>
        </div>
      `;
    }).join('');
  }

  updateStats() {
    const today = new Date().toDateString();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    let todayTotal = 0;
    let weekTotal = 0;
    let taskCount = 0;

    this.entries.forEach(entry => {
      const entryDate = new Date(entry.date);
      if (entryDate.toDateString() === today) {
        todayTotal += entry.duration;
      }
      if (entryDate >= weekAgo) {
        weekTotal += entry.duration;
        taskCount++;
      }
    });

    this.elements.todayTotal.textContent = this.formatDuration(todayTotal);
    this.elements.weekTotal.textContent = this.formatDuration(weekTotal);
    this.elements.taskCount.textContent = taskCount;
  }

  deleteEntry(id) {
    this.entries = this.entries.filter(e => e.id !== id);
    this.save();
    this.renderHistory();
    this.updateStats();
    this.showToast('기록이 삭제되었습니다', 'success');
  }
}

// 전역 인스턴스 생성
const timeTracker = new TimeTracker();
window.TimeTracker = timeTracker;

document.addEventListener('DOMContentLoaded', () => timeTracker.init());
