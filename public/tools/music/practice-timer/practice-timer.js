/**
 * 연습 타이머 - ToolBase 기반
 * 악기 연습 시간 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PracticeTimer = class PracticeTimer extends ToolBase {
  constructor() {
    super('PracticeTimer');
    this.isRunning = false;
    this.startTime = null;
    this.elapsed = 0;
    this.interval = null;
    this.goalMinutes = 30;
    this.goalReached = false;
    this.history = [];
  }

  init() {
    this.initElements({
      startBtn: 'startBtn',
      timerLabel: 'timerLabel',
      timerDisplay: 'timerDisplay',
      timerTime: 'timerTime',
      sessionInfo: 'sessionInfo',
      goalMinutes: 'goalMinutes',
      goalPercent: 'goalPercent',
      progressFill: 'progressFill',
      todayTotal: 'todayTotal',
      weekTotal: 'weekTotal',
      totalSessions: 'totalSessions',
      historyList: 'historyList'
    });

    this.loadData();
    this.updateDisplay();
    this.updateStats();
    this.renderHistory();

    console.log('[PracticeTimer] 초기화 완료');
    return this;
  }

  loadData() {
    const saved = localStorage.getItem('practiceTimer');
    if (saved) {
      const data = JSON.parse(saved);
      this.history = data.history || [];
      this.goalMinutes = data.goalMinutes || 30;
      this.elements.goalMinutes.value = this.goalMinutes;
    }
  }

  saveData() {
    localStorage.setItem('practiceTimer', JSON.stringify({
      history: this.history,
      goalMinutes: this.goalMinutes
    }));
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
    this.startTime = Date.now() - this.elapsed;
    this.elements.startBtn.textContent = '일시정지';
    this.elements.timerLabel.textContent = '연습 중...';
    this.elements.timerDisplay.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';

    this.interval = setInterval(() => this.tick(), 100);
  }

  pause() {
    this.isRunning = false;
    clearInterval(this.interval);
    this.elements.startBtn.textContent = '계속';
    this.elements.timerLabel.textContent = '일시정지됨';
    this.elements.timerDisplay.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
  }

  reset() {
    if (this.elapsed > 60000) {
      this.saveSession();
    }

    this.isRunning = false;
    clearInterval(this.interval);
    this.elapsed = 0;
    this.startTime = null;
    this.goalReached = false;

    this.elements.startBtn.textContent = '시작';
    this.elements.timerLabel.textContent = '연습을 시작하세요';
    this.elements.timerDisplay.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';

    this.updateDisplay();
  }

  tick() {
    this.elapsed = Date.now() - this.startTime;
    this.updateDisplay();

    const elapsedMin = this.elapsed / 60000;
    if (elapsedMin >= this.goalMinutes && !this.goalReached) {
      this.goalReached = true;
      this.playSound();
      this.showToast(`목표 ${this.goalMinutes}분 달성!`, 'success');
    }
  }

  updateDisplay() {
    const totalSeconds = Math.floor(this.elapsed / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    this.elements.timerTime.textContent =
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const todayTotal = this.getTodayTotal() + Math.floor(this.elapsed / 60000);
    this.elements.sessionInfo.textContent = `오늘 ${todayTotal}분 연습`;

    const percent = Math.min(100, (this.elapsed / 60000 / this.goalMinutes) * 100);
    this.elements.goalPercent.textContent = Math.round(percent) + '%';
    this.elements.progressFill.style.width = percent + '%';
  }

  setGoal() {
    this.goalMinutes = parseInt(this.elements.goalMinutes.value) || 30;
    this.goalReached = false;
    this.saveData();
    this.updateDisplay();
    this.showToast(`목표 시간: ${this.goalMinutes}분`, 'success');
  }

  setPreset(minutes) {
    this.elements.goalMinutes.value = minutes;
    this.setGoal();

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.textContent) === minutes ||
        (minutes === 60 && btn.textContent === '1시간') ||
        (minutes === 90 && btn.textContent === '1시간 30분') ||
        (minutes === 120 && btn.textContent === '2시간'));
    });
  }

  saveSession() {
    const minutes = Math.floor(this.elapsed / 60000);
    if (minutes < 1) return;

    this.history.unshift({
      date: new Date().toISOString(),
      minutes: minutes
    });

    if (this.history.length > 100) {
      this.history = this.history.slice(0, 100);
    }

    this.saveData();
    this.updateStats();
    this.renderHistory();
  }

  getTodayTotal() {
    const today = new Date().toDateString();
    return this.history
      .filter(h => new Date(h.date).toDateString() === today)
      .reduce((sum, h) => sum + h.minutes, 0);
  }

  getWeekTotal() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return this.history
      .filter(h => new Date(h.date) >= weekAgo)
      .reduce((sum, h) => sum + h.minutes, 0);
  }

  updateStats() {
    this.elements.todayTotal.textContent = this.getTodayTotal() + '분';
    this.elements.weekTotal.textContent = this.getWeekTotal() + '분';
    this.elements.totalSessions.textContent = this.history.length + '회';
  }

  renderHistory() {
    if (this.history.length === 0) {
      this.elements.historyList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">기록이 없습니다</div>';
      return;
    }

    this.elements.historyList.innerHTML = this.history.slice(0, 20).map(h => {
      const date = new Date(h.date);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      return `<div class="history-item">
        <span>${dateStr}</span>
        <span>${h.minutes}분</span>
      </div>`;
    }).join('');
  }

  clearHistory() {
    if (confirm('모든 연습 기록을 삭제하시겠습니까?')) {
      this.history = [];
      this.saveData();
      this.updateStats();
      this.renderHistory();
      this.showToast('기록이 초기화되었습니다', 'success');
    }
  }

  playSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.frequency.value = 880;
      osc.type = 'sine';

      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.warn('알림음 재생 실패:', e);
    }
  }
}

// 전역 인스턴스 생성
const practiceTimer = new PracticeTimer();
window.PracticeTimer = practiceTimer;

// 전역 함수 (HTML onclick 호환)
function toggle() { practiceTimer.toggle(); }
function reset() { practiceTimer.reset(); }
function setGoal() { practiceTimer.setGoal(); }
function setPreset(minutes) { practiceTimer.setPreset(minutes); }
function clearHistory() { practiceTimer.clearHistory(); }

document.addEventListener('DOMContentLoaded', () => practiceTimer.init());
