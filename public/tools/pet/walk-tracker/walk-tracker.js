/**
 * 산책 추적기 - ToolBase 기반
 * 반려동물 산책 기록
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var WalkTracker = class WalkTracker extends ToolBase {
  constructor() {
    super('WalkTracker');
    this.records = [];
  }

  init() {
    this.initElements({
      petName: 'petName',
      dailyGoal: 'dailyGoal',
      walkDate: 'walkDate',
      walkDuration: 'walkDuration',
      walkNote: 'walkNote',
      todayTotal: 'todayTotal',
      todayGoalText: 'todayGoalText',
      goalPercent: 'goalPercent',
      goalCircle: 'goalCircle',
      weekTotal: 'weekTotal',
      weekAvg: 'weekAvg',
      streak: 'streak',
      weekChart: 'weekChart',
      historyList: 'historyList'
    });

    this.load();
    this.elements.walkDate.value = new Date().toISOString().split('T')[0];
    this.render();

    console.log('[WalkTracker] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('walk-tracker-data');
      if (saved) {
        const data = JSON.parse(saved);
        this.records = data.records || [];
        this.elements.petName.value = data.petName || '';
        this.elements.dailyGoal.value = data.dailyGoal || 30;
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('walk-tracker-data', JSON.stringify({
      records: this.records,
      petName: this.elements.petName.value,
      dailyGoal: this.elements.dailyGoal.value
    }));
  }

  addRecord() {
    const date = this.elements.walkDate.value;
    const duration = parseInt(this.elements.walkDuration.value);
    const note = this.elements.walkNote.value.trim();

    if (!date || !duration || duration <= 0) {
      this.showToast('날짜와 시간을 입력하세요', 'error');
      return;
    }

    this.records.push({
      id: Date.now(),
      date,
      duration,
      note
    });

    // 날짜순 정렬
    this.records.sort((a, b) => new Date(b.date) - new Date(a.date));

    this.elements.walkDuration.value = '';
    this.elements.walkNote.value = '';

    this.save();
    this.render();
    this.showToast('산책 기록이 추가되었습니다', 'success');
  }

  removeRecord(id) {
    this.records = this.records.filter(r => r.id !== id);
    this.save();
    this.render();
  }

  render() {
    this.updateGoal();
    this.updateStats();
    this.renderWeekChart();
    this.renderHistory();
  }

  updateGoal() {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = this.records.filter(r => r.date === today);
    const todayTotal = todayRecords.reduce((sum, r) => sum + r.duration, 0);
    const goal = parseInt(this.elements.dailyGoal.value) || 30;

    const percent = Math.min(100, Math.round((todayTotal / goal) * 100));
    const circumference = 2 * Math.PI * 40; // 251.2
    const offset = circumference - (percent / 100) * circumference;

    this.elements.todayTotal.textContent = `${todayTotal}분`;
    this.elements.todayGoalText.textContent = `목표: ${goal}분`;
    this.elements.goalPercent.textContent = `${percent}%`;
    this.elements.goalCircle.style.strokeDashoffset = offset;
  }

  updateStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 이번 주 기록
    const weekRecords = this.records.filter(r => new Date(r.date) >= weekAgo);
    const weekTotal = weekRecords.reduce((sum, r) => sum + r.duration, 0);

    // 일 평균
    const uniqueDays = [...new Set(weekRecords.map(r => r.date))].length;
    const weekAvg = uniqueDays > 0 ? Math.round(weekTotal / uniqueDays) : 0;

    // 연속 산책일 계산
    let streak = 0;
    const sortedDates = [...new Set(this.records.map(r => r.date))].sort().reverse();

    if (sortedDates.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // 오늘 또는 어제부터 시작
      if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        let checkDate = new Date(sortedDates[0]);
        for (const dateStr of sortedDates) {
          const date = new Date(dateStr);
          const diff = Math.round((checkDate - date) / 86400000);
          if (diff <= 1) {
            streak++;
            checkDate = date;
          } else {
            break;
          }
        }
      }
    }

    this.elements.weekTotal.textContent = weekTotal;
    this.elements.weekAvg.textContent = weekAvg;
    this.elements.streak.textContent = streak;
  }

  renderWeekChart() {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const today = new Date();
    const chartData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayRecords = this.records.filter(r => r.date === dateStr);
      const total = dayRecords.reduce((sum, r) => sum + r.duration, 0);
      chartData.push({
        day: days[date.getDay()],
        total,
        isToday: i === 0
      });
    }

    const maxTotal = Math.max(...chartData.map(d => d.total), 30);

    this.elements.weekChart.innerHTML = chartData.map(d => {
      const height = d.total > 0 ? Math.max(10, (d.total / maxTotal) * 80) : 4;
      const bgColor = d.isToday ? 'background: linear-gradient(to top, #667eea, #764ba2);' : '';
      return `
        <div class="week-bar">
          <div class="bar-value">${d.total > 0 ? d.total : ''}</div>
          <div class="bar-fill" style="height: ${height}px; ${bgColor} ${d.total === 0 ? 'background: var(--bg-secondary);' : ''}"></div>
          <div class="bar-label" style="${d.isToday ? 'font-weight: 600; color: var(--primary);' : ''}">${d.day}</div>
        </div>
      `;
    }).join('');
  }

  renderHistory() {
    if (this.records.length === 0) {
      this.elements.historyList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">기록이 없습니다</div>';
      return;
    }

    this.elements.historyList.innerHTML = this.records.slice(0, 20).map(record => `
      <div class="history-item">
        <div>
          <div class="history-date">${record.date}</div>
          ${record.note ? `<div style="font-size: 0.8rem; color: var(--text-secondary);">${record.note}</div>` : ''}
        </div>
        <div class="history-info">
          <span>${record.duration}분</span>
          <button onclick="walkTracker.removeRecord(${record.id})" style="background: none; border: none; cursor: pointer; opacity: 0.5;"></button>
        </div>
      </div>
    `).join('');
  }

  exportData() {
    const petName = this.elements.petName.value || '반려동물';

    let text = `${petName} 산책 기록\n`;
    text += '='.repeat(25) + '\n\n';

    const weekTotal = this.elements.weekTotal.textContent;
    const weekAvg = this.elements.weekAvg.textContent;
    const streak = this.elements.streak.textContent;

    text += `이번 주 총 산책: ${weekTotal}분\n`;
    text += `일 평균: ${weekAvg}분\n`;
    text += `연속 산책일: ${streak}일\n\n`;

    text += '[최근 기록]\n';
    this.records.slice(0, 10).forEach(record => {
      text += `${record.date}: ${record.duration}분${record.note ? ` (${record.note})` : ''}\n`;
    });

    this.copyToClipboard(text);
  }

  clearAll() {
    if (this.records.length === 0) return;
    if (!confirm('모든 기록을 삭제하시겠습니까?')) return;

    this.records = [];
    this.save();
    this.render();
    this.showToast('초기화되었습니다', 'success');
  }
}

// 전역 인스턴스 생성
const walkTracker = new WalkTracker();
window.WalkTracker = walkTracker;

// 전역 함수 (HTML onclick 호환)
function addRecord() { walkTracker.addRecord(); }
function exportData() { walkTracker.exportData(); }
function clearAll() { walkTracker.clearAll(); }

document.addEventListener('DOMContentLoaded', () => walkTracker.init());
