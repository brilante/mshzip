/**
 * 학습 통계 - ToolBase 기반
 * 학습 데이터 분석 및 목표 관리
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var StudyStats = class StudyStats extends ToolBase {
  constructor() {
    super('StudyStats');
    this.records = [];
    this.dailyGoal = 0;
    this.streak = 0;
  }

  init() {
    this.initElements({
      recordSubject: 'recordSubject',
      recordMinutes: 'recordMinutes',
      dailyGoal: 'dailyGoal',
      todayTime: 'todayTime',
      weekTime: 'weekTime',
      avgTime: 'avgTime',
      totalSessions: 'totalSessions',
      streakBadge: 'streakBadge',
      weeklyChart: 'weeklyChart',
      subjectList: 'subjectList',
      goalPercent: 'goalPercent',
      goalBar: 'goalBar',
      goalStatus: 'goalStatus'
    });

    this.loadData();
    this.calculateStreak();
    this.render();

    console.log('[StudyStats] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('studyStatsData');
      if (saved) {
        const data = JSON.parse(saved);
        this.records = data.records || [];
        this.dailyGoal = data.dailyGoal || 0;
      }

      const timerHistory = localStorage.getItem('studyTimerHistory');
      if (timerHistory) {
        const history = JSON.parse(timerHistory);
        history.forEach(item => {
          const exists = this.records.some(r =>
            r.date === item.date && r.subject === item.subject && r.duration === item.duration
          );
          if (!exists) {
            this.records.push({
              date: item.date,
              subject: item.subject,
              duration: item.duration
            });
          }
        });
      }

      const pomodoroStats = localStorage.getItem('pomodoroStats');
      if (pomodoroStats) {
        const stats = JSON.parse(pomodoroStats);
        if (stats.todayMinutes > 0 && stats.lastDate) {
          const exists = this.records.some(r =>
            new Date(r.date).toDateString() === stats.lastDate && r.subject === '뽀모도로'
          );
          if (!exists) {
            this.records.push({
              date: new Date(stats.lastDate).toISOString(),
              subject: '뽀모도로',
              duration: stats.todayMinutes
            });
          }
        }
      }
    } catch (e) {}

    if (this.dailyGoal) {
      this.elements.dailyGoal.value = this.dailyGoal;
    }
  }

  saveData() {
    localStorage.setItem('studyStatsData', JSON.stringify({
      records: this.records,
      dailyGoal: this.dailyGoal
    }));
  }

  addRecord() {
    const subject = this.elements.recordSubject.value.trim();
    const minutes = parseInt(this.elements.recordMinutes.value);

    if (!subject) {
      this.showToast('과목을 입력해주세요', 'error');
      return;
    }
    if (!minutes || minutes <= 0) {
      this.showToast('학습 시간을 입력해주세요', 'error');
      return;
    }

    this.records.push({
      date: new Date().toISOString(),
      subject,
      duration: minutes
    });

    this.saveData();
    this.calculateStreak();
    this.render();

    this.elements.recordSubject.value = '';
    this.elements.recordMinutes.value = '';

    this.showToast('학습 기록이 추가되었습니다', 'success');
  }

  setGoal() {
    const goal = parseInt(this.elements.dailyGoal.value);
    if (!goal || goal <= 0) {
      this.showToast('유효한 목표 시간을 입력해주세요', 'error');
      return;
    }

    this.dailyGoal = goal;
    this.saveData();
    this.render();

    this.showToast(`일일 목표: ${goal}분 설정됨`, 'success');
  }

  calculateStreak() {
    const dates = [...new Set(this.records.map(r => new Date(r.date).toDateString()))].sort((a, b) => new Date(b) - new Date(a));

    this.streak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (dates.includes(today) || dates.includes(yesterday)) {
      let checkDate = dates.includes(today) ? new Date() : new Date(Date.now() - 86400000);

      for (let i = 0; i < dates.length; i++) {
        if (new Date(checkDate).toDateString() === dates[i]) {
          this.streak++;
          checkDate = new Date(checkDate.getTime() - 86400000);
        } else {
          break;
        }
      }
    }
  }

  getWeeklyData() {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const data = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();

      const dayRecords = this.records.filter(r => new Date(r.date).toDateString() === dateStr);
      const total = dayRecords.reduce((sum, r) => sum + r.duration, 0);

      data.push({
        day: days[date.getDay()],
        minutes: total
      });
    }

    return data;
  }

  getSubjectData() {
    const subjects = {};

    this.records.forEach(r => {
      if (!subjects[r.subject]) {
        subjects[r.subject] = 0;
      }
      subjects[r.subject] += r.duration;
    });

    return Object.entries(subjects)
      .map(([name, minutes]) => ({ name, minutes }))
      .sort((a, b) => b.minutes - a.minutes);
  }

  render() {
    const today = new Date().toDateString();
    const weekAgo = new Date(Date.now() - 7 * 86400000);

    const todayMinutes = this.records
      .filter(r => new Date(r.date).toDateString() === today)
      .reduce((sum, r) => sum + r.duration, 0);

    const weekMinutes = this.records
      .filter(r => new Date(r.date) >= weekAgo)
      .reduce((sum, r) => sum + r.duration, 0);

    const daysWithRecords = [...new Set(this.records.map(r => new Date(r.date).toDateString()))].length;
    const avgMinutes = daysWithRecords > 0 ? Math.round(this.records.reduce((sum, r) => sum + r.duration, 0) / daysWithRecords) : 0;

    this.elements.todayTime.textContent = todayMinutes;
    this.elements.weekTime.textContent = (weekMinutes / 60).toFixed(1);
    this.elements.avgTime.textContent = avgMinutes;
    this.elements.totalSessions.textContent = this.records.length;
    this.elements.streakBadge.textContent = `연속 ${this.streak}일`;

    this.renderWeeklyChart();
    this.renderSubjectList();
    this.renderGoalProgress(todayMinutes);
  }

  renderWeeklyChart() {
    const data = this.getWeeklyData();
    const maxMinutes = Math.max(...data.map(d => d.minutes), 1);

    this.elements.weeklyChart.innerHTML = data.map(d => {
      const height = (d.minutes / maxMinutes) * 160;
      return `<div class="chart-bar" style="height: ${Math.max(height, 4)}px;">
        <span class="chart-bar-value">${d.minutes}</span>
        <span class="chart-bar-label">${d.day}</span>
      </div>`;
    }).join('');
  }

  renderSubjectList() {
    const data = this.getSubjectData();
    const maxMinutes = Math.max(...data.map(d => d.minutes), 1);

    if (data.length === 0) {
      this.elements.subjectList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">학습 기록이 없습니다</div>';
      return;
    }

    this.elements.subjectList.innerHTML = data.slice(0, 5).map(d => {
      const percent = (d.minutes / maxMinutes) * 100;
      const hours = Math.floor(d.minutes / 60);
      const mins = d.minutes % 60;
      const timeStr = hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;

      return `<div class="subject-item">
        <span class="subject-name">${d.name}</span>
        <div class="subject-progress">
          <div class="subject-progress-bar" style="width: ${percent}%;"></div>
        </div>
        <span class="subject-time">${timeStr}</span>
      </div>`;
    }).join('');
  }

  renderGoalProgress(todayMinutes) {
    if (!this.dailyGoal) {
      this.elements.goalPercent.textContent = '-';
      this.elements.goalBar.style.width = '0%';
      this.elements.goalStatus.textContent = '목표를 설정해주세요';
      return;
    }

    const percent = Math.min((todayMinutes / this.dailyGoal) * 100, 100);
    const remaining = Math.max(this.dailyGoal - todayMinutes, 0);

    this.elements.goalPercent.textContent = `${percent.toFixed(0)}%`;
    this.elements.goalBar.style.width = `${percent}%`;

    if (percent >= 100) {
      this.elements.goalStatus.textContent = '오늘 목표 달성!';
    } else {
      this.elements.goalStatus.textContent = `목표까지 ${remaining}분 남음`;
    }
  }
}

// 전역 인스턴스 생성
const studyStats = new StudyStats();
window.StudyStats = studyStats;

document.addEventListener('DOMContentLoaded', () => studyStats.init());
