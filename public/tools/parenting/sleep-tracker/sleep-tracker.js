/**
 * 수면 추적기 - ToolBase 기반
 * 아기 수면 패턴 기록
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SleepTracker = class SleepTracker extends ToolBase {
  constructor() {
    super('SleepTracker');
    this.isSleeping = false;
    this.startTime = null;
    this.records = [];
    this.interval = null;
  }

  init() {
    this.initElements({
      sleepStatus: 'sleepStatus',
      statusIcon: 'statusIcon',
      statusText: 'statusText',
      statusTime: 'statusTime',
      toggleBtn: 'toggleBtn',
      todaySleep: 'todaySleep',
      napCount: 'napCount',
      avgDuration: 'avgDuration',
      sleepBar: 'sleepBar',
      logList: 'logList'
    });

    this.loadData();
    this.restoreState();
    this.updateStats();
    this.render();
    this.renderSleepBar();

    this.interval = setInterval(() => this.updateTimer(), 1000);

    console.log('[SleepTracker] 초기화 완료');
    return this;
  }

  loadData() {
    const saved = localStorage.getItem('sleepTracker');
    if (saved) {
      const data = JSON.parse(saved);
      this.records = data.records || [];
    }
  }

  saveData() {
    localStorage.setItem('sleepTracker', JSON.stringify({
      records: this.records,
      isSleeping: this.isSleeping,
      startTime: this.startTime
    }));
  }

  restoreState() {
    const saved = localStorage.getItem('sleepTracker');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.isSleeping && data.startTime) {
        this.isSleeping = true;
        this.startTime = data.startTime;
        this.updateUI();
      }
    }
  }

  toggle() {
    if (this.isSleeping) {
      this.wakeUp();
    } else {
      this.sleep();
    }
  }

  sleep() {
    this.isSleeping = true;
    this.startTime = Date.now();
    this.updateUI();
    this.saveData();
  }

  wakeUp() {
    if (!this.startTime) return;

    const duration = Date.now() - this.startTime;
    const durationMin = Math.round(duration / 60000);

    if (durationMin >= 1) {
      this.records.unshift({
        id: Date.now(),
        start: this.startTime,
        end: Date.now(),
        duration: durationMin
      });

      if (this.records.length > 100) {
        this.records = this.records.slice(0, 100);
      }
    }

    this.isSleeping = false;
    this.startTime = null;
    this.updateUI();
    this.updateStats();
    this.render();
    this.renderSleepBar();
    this.saveData();
  }

  updateUI() {
    if (this.isSleeping) {
      this.elements.sleepStatus.className = 'sleep-status sleeping';
      this.elements.statusIcon.textContent = '';
      this.elements.statusText.textContent = '자는 중';
      this.elements.toggleBtn.textContent = '깨우기';
      this.elements.toggleBtn.style.color = '#f59e0b';
    } else {
      this.elements.sleepStatus.className = 'sleep-status awake';
      this.elements.statusIcon.textContent = '';
      this.elements.statusText.textContent = '깨어있음';
      this.elements.toggleBtn.textContent = '재우기';
      this.elements.toggleBtn.style.color = '#6366f1';
    }
  }

  updateTimer() {
    if (!this.startTime) {
      this.elements.statusTime.textContent = '00:00:00';
      return;
    }

    const elapsed = Date.now() - this.startTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    this.elements.statusTime.textContent =
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  updateStats() {
    const today = new Date().toDateString();
    const todayRecords = this.records.filter(r =>
      new Date(r.start).toDateString() === today
    );

    const totalMin = todayRecords.reduce((sum, r) => sum + r.duration, 0);
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;

    this.elements.todaySleep.textContent =
      hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
    this.elements.napCount.textContent = todayRecords.length + '회';

    if (todayRecords.length > 0) {
      const avg = Math.round(totalMin / todayRecords.length);
      this.elements.avgDuration.textContent = avg + '분';
    } else {
      this.elements.avgDuration.textContent = '-';
    }
  }

  renderSleepBar() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRecords = this.records.filter(r => {
      const start = new Date(r.start);
      return start >= today;
    });

    if (todayRecords.length === 0) {
      this.elements.sleepBar.innerHTML = '<div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-secondary); font-size: 0.85rem;">기록이 없습니다</div>';
      return;
    }

    // 24시간 분할
    const totalMinutes = 24 * 60;
    let html = '';

    todayRecords.reverse().forEach(r => {
      const start = new Date(r.start);
      const startMin = start.getHours() * 60 + start.getMinutes();
      const widthPercent = (r.duration / totalMinutes) * 100;
      const leftPercent = (startMin / totalMinutes) * 100;

      html += `<div class="sleep-segment sleep" style="position: absolute; left: ${leftPercent}%; width: ${widthPercent}%; min-width: 2px;">${r.duration}분</div>`;
    });

    this.elements.sleepBar.innerHTML = `<div style="position: relative; width: 100%; height: 100%;">${html}</div>`;
  }

  render() {
    if (this.records.length === 0) {
      this.elements.logList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">기록이 없습니다</div>';
      return;
    }

    this.elements.logList.innerHTML = this.records.slice(0, 20).map(r => {
      const start = new Date(r.start);
      const end = new Date(r.end);
      const dateStr = `${start.getMonth() + 1}/${start.getDate()}`;
      const timeStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;

      return `<div class="log-item">
        <div>
          <div style="font-weight: 600;">${r.duration}분</div>
          <div style="font-size: 0.85rem; color: var(--text-secondary);">${dateStr} ${timeStr}</div>
        </div>
        <span style="color: #ef4444; cursor: pointer; font-size: 0.8rem;" onclick="sleepTracker.deleteRecord(${r.id})">삭제</span>
      </div>`;
    }).join('');
  }

  deleteRecord(id) {
    this.records = this.records.filter(r => r.id !== id);
    this.saveData();
    this.updateStats();
    this.render();
    this.renderSleepBar();
  }

  clearAll() {
    if (confirm('모든 기록을 삭제하시겠습니까?')) {
      this.records = [];
      this.isSleeping = false;
      this.startTime = null;
      this.saveData();
      this.updateUI();
      this.updateStats();
      this.render();
      this.renderSleepBar();
      this.showToast('기록이 초기화되었습니다', 'success');
    }
  }
}

// 전역 인스턴스 생성
const sleepTracker = new SleepTracker();
window.SleepTracker = sleepTracker;

// 전역 함수 (HTML onclick 호환)
function toggle() { sleepTracker.toggle(); }
function clearAll() { sleepTracker.clearAll(); }

document.addEventListener('DOMContentLoaded', () => sleepTracker.init());
