/**
 * 플라스틱 추적기 - ToolBase 기반
 * 일회용 플라스틱 사용량 추적
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PlasticTracker = class PlasticTracker extends ToolBase {
  constructor() {
    super('PlasticTracker');
    this.logs = [];
    this.dailyGoal = 0;

    this.icons = {
      cup: '',
      bottle: '',
      bag: '',
      straw: '',
      utensil: '',
      container: '',
      wrap: '',
      other: ''
    };
  }

  init() {
    this.initElements({
      dailyGoal: 'dailyGoal',
      todayCount: 'todayCount',
      weekCount: 'weekCount',
      monthCount: 'monthCount',
      avgCount: 'avgCount',
      goalStatus: 'goalStatus',
      goalProgress: 'goalProgress',
      weeklyChart: 'weeklyChart',
      logList: 'logList'
    });

    this.loadData();
    this.render();

    console.log('[PlasticTracker] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('plasticTrackerData');
      if (saved) {
        const data = JSON.parse(saved);
        this.logs = data.logs || [];
        this.dailyGoal = data.dailyGoal || 0;
      }
      if (this.dailyGoal) {
        this.elements.dailyGoal.value = this.dailyGoal;
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('plasticTrackerData', JSON.stringify({
      logs: this.logs,
      dailyGoal: this.dailyGoal
    }));
  }

  quickAdd(type, name) {
    this.logs.push({
      id: Date.now(),
      type,
      name,
      timestamp: new Date().toISOString()
    });

    this.saveData();
    this.render();

    this.showToast(`${name} 기록됨`, 'success');
  }

  removeLog(id) {
    this.logs = this.logs.filter(log => log.id !== id);
    this.saveData();
    this.render();
  }

  setGoal() {
    const goal = parseInt(this.elements.dailyGoal.value);
    if (goal && goal > 0) {
      this.dailyGoal = goal;
      this.saveData();
      this.render();

      this.showToast(`일일 목표: ${goal}개 이하로 설정`, 'success');
    }
  }

  getTodayLogs() {
    const today = new Date().toDateString();
    return this.logs.filter(log => new Date(log.timestamp).toDateString() === today);
  }

  getWeekLogs() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return this.logs.filter(log => new Date(log.timestamp) >= weekAgo);
  }

  getMonthLogs() {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    return this.logs.filter(log => new Date(log.timestamp) >= monthAgo);
  }

  render() {
    const todayLogs = this.getTodayLogs();
    const weekLogs = this.getWeekLogs();
    const monthLogs = this.getMonthLogs();

    const daysWithLogs = [...new Set(this.logs.map(l => new Date(l.timestamp).toDateString()))].length;
    const avgCount = daysWithLogs > 0 ? (this.logs.length / daysWithLogs).toFixed(1) : 0;

    this.elements.todayCount.textContent = todayLogs.length;
    this.elements.weekCount.textContent = weekLogs.length;
    this.elements.monthCount.textContent = monthLogs.length;
    this.elements.avgCount.textContent = avgCount;

    this.renderGoalProgress(todayLogs.length);
    this.renderWeeklyChart();
    this.renderLogList(todayLogs);
  }

  renderGoalProgress(todayCount) {
    if (!this.dailyGoal) {
      this.elements.goalStatus.textContent = '설정 안됨';
      this.elements.goalProgress.style.width = '0%';
      return;
    }

    const percent = Math.min((todayCount / this.dailyGoal) * 100, 100);
    const remaining = this.dailyGoal - todayCount;

    if (remaining > 0) {
      this.elements.goalStatus.textContent = `${remaining}개 남음`;
      this.elements.goalProgress.style.background = '#22c55e';
    } else {
      this.elements.goalStatus.textContent = '목표 초과!';
      this.elements.goalProgress.style.background = '#ef4444';
    }

    this.elements.goalProgress.style.width = `${percent}%`;
  }

  renderWeeklyChart() {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const data = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      const count = this.logs.filter(l => new Date(l.timestamp).toDateString() === dateStr).length;
      data.push({ day: days[date.getDay()], count });
    }

    const maxCount = Math.max(...data.map(d => d.count), 1);

    this.elements.weeklyChart.innerHTML = data.map(d => {
      const height = (d.count / maxCount) * 120;
      return `<div class="chart-bar" style="height: ${Math.max(height, 4)}px;">
        <span class="chart-bar-label">${d.day}</span>
      </div>`;
    }).join('');
  }

  renderLogList(todayLogs) {
    if (todayLogs.length === 0) {
      this.elements.logList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">오늘 기록이 없습니다 </div>';
      return;
    }

    this.elements.logList.innerHTML = todayLogs.reverse().map(log => {
      const time = new Date(log.timestamp);
      const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

      return `<div class="log-item">
        <div class="log-info">
          <span class="log-icon">${this.icons[log.type]}</span>
          <div>
            <div class="log-name">${log.name}</div>
            <div class="log-time">${timeStr}</div>
          </div>
        </div>
        <button class="btn-undo" onclick="plasticTracker.removeLog(${log.id})">삭제</button>
      </div>`;
    }).join('');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const plasticTracker = new PlasticTracker();
window.PlasticTracker = plasticTracker;

document.addEventListener('DOMContentLoaded', () => plasticTracker.init());
