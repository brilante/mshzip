/**
 * 공부 타이머 - ToolBase 기반
 * 학습 시간 측정 및 기록
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var StudyTimer = class StudyTimer extends ToolBase {
  constructor() {
    super('StudyTimer');
    this.isRunning = false;
    this.isPaused = false;
    this.startTime = null;
    this.pausedTime = 0;
    this.elapsedTime = 0;
    this.intervalId = null;
    this.history = [];
  }

  init() {
    this.initElements({
      subjectName: 'subjectName',
      currentSubject: 'currentSubject',
      timerDisplay: 'timerDisplay',
      timerStatus: 'timerStatus',
      startBtn: 'startBtn',
      pauseBtn: 'pauseBtn',
      stopBtn: 'stopBtn',
      todayTotal: 'todayTotal',
      weekTotal: 'weekTotal',
      historyList: 'historyList'
    });

    this.loadData();
    this.updateStats();
    this.renderHistory();

    console.log('[StudyTimer] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('studyTimerHistory');
      if (saved) {
        this.history = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('studyTimerHistory', JSON.stringify(this.history));
  }

  start() {
    const subject = this.elements.subjectName.value.trim() || '미지정';
    this.elements.currentSubject.textContent = subject;

    if (this.isPaused) {
      this.startTime = Date.now() - this.pausedTime;
      this.isPaused = false;
    } else {
      this.startTime = Date.now();
      this.pausedTime = 0;
    }

    this.isRunning = true;
    this.updateButtons();
    this.elements.timerStatus.textContent = '공부 중...';

    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  pause() {
    if (!this.isRunning) return;

    clearInterval(this.intervalId);
    this.pausedTime = Date.now() - this.startTime;
    this.isPaused = true;
    this.isRunning = false;
    this.updateButtons();
    this.elements.timerStatus.textContent = '일시정지';
  }

  stop() {
    if (!this.isRunning && !this.isPaused) return;

    clearInterval(this.intervalId);

    const totalMs = this.isPaused ? this.pausedTime : Date.now() - this.startTime;
    const totalMinutes = Math.floor(totalMs / 60000);

    if (totalMinutes >= 1) {
      const subject = this.elements.currentSubject.textContent;
      this.history.unshift({
        subject,
        duration: totalMinutes,
        date: new Date().toISOString()
      });
      this.saveData();
    }

    this.reset();
    this.updateStats();
    this.renderHistory();

    if (totalMinutes >= 1) {
      this.showToast(`${totalMinutes}분 기록됨`);
    }
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.startTime = null;
    this.pausedTime = 0;
    this.elapsedTime = 0;
    this.elements.timerDisplay.textContent = '00:00:00';
    this.elements.timerStatus.textContent = '대기 중';
    this.elements.currentSubject.textContent = '과목을 선택하세요';
    this.updateButtons();
  }

  tick() {
    const elapsed = Date.now() - this.startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    this.elements.timerDisplay.textContent =
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  updateButtons() {
    const startBtn = this.elements.startBtn;
    const pauseBtn = this.elements.pauseBtn;
    const stopBtn = this.elements.stopBtn;

    if (this.isRunning) {
      startBtn.disabled = true;
      startBtn.classList.add('btn-disabled');
      pauseBtn.disabled = false;
      pauseBtn.classList.remove('btn-disabled');
      stopBtn.disabled = false;
      stopBtn.classList.remove('btn-disabled');
    } else if (this.isPaused) {
      startBtn.disabled = false;
      startBtn.classList.remove('btn-disabled');
      startBtn.textContent = '계속';
      pauseBtn.disabled = true;
      pauseBtn.classList.add('btn-disabled');
      stopBtn.disabled = false;
      stopBtn.classList.remove('btn-disabled');
    } else {
      startBtn.disabled = false;
      startBtn.classList.remove('btn-disabled');
      startBtn.textContent = '시작';
      pauseBtn.disabled = true;
      pauseBtn.classList.add('btn-disabled');
      stopBtn.disabled = true;
      stopBtn.classList.add('btn-disabled');
    }
  }

  updateStats() {
    const today = new Date().toDateString();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    let todayTotal = 0;
    let weekTotal = 0;

    this.history.forEach(item => {
      const itemDate = new Date(item.date);
      if (itemDate.toDateString() === today) {
        todayTotal += item.duration;
      }
      if (itemDate >= weekAgo) {
        weekTotal += item.duration;
      }
    });

    this.elements.todayTotal.textContent = `${todayTotal}분`;
    this.elements.weekTotal.textContent = weekTotal >= 60
      ? `${Math.floor(weekTotal / 60)}시간 ${weekTotal % 60}분`
      : `${weekTotal}분`;
  }

  renderHistory() {
    const today = new Date().toDateString();
    const todayItems = this.history.filter(item =>
      new Date(item.date).toDateString() === today
    );

    if (todayItems.length === 0) {
      this.elements.historyList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">아직 기록이 없습니다</div>';
      return;
    }

    this.elements.historyList.innerHTML = todayItems.map(item => {
      const time = new Date(item.date);
      const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
      return `<div class="history-item">
        <span>${item.subject}</span>
        <span>${item.duration}분 (${timeStr})</span>
      </div>`;
    }).join('');
  }

  clearToday() {
    if (!confirm('오늘의 기록을 모두 삭제할까요?')) return;

    const today = new Date().toDateString();
    this.history = this.history.filter(item =>
      new Date(item.date).toDateString() !== today
    );
    this.saveData();
    this.updateStats();
    this.renderHistory();
  }
}

// 전역 인스턴스 생성
const studyTimer = new StudyTimer();
window.StudyTimer = studyTimer;

document.addEventListener('DOMContentLoaded', () => studyTimer.init());
