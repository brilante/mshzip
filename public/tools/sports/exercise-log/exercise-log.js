/**
 * 운동 기록장 - ToolBase 기반
 * 운동 일지 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ExerciseLog = class ExerciseLog extends ToolBase {
  constructor() {
    super('ExerciseLog');
    this.logs = [];
    this.filter = 'all';
  }

  init() {
    this.initElements({
      exerciseType: 'exerciseType',
      duration: 'duration',
      calories: 'calories',
      notes: 'notes',
      filterRow: 'filterRow',
      logList: 'logList',
      weekWorkouts: 'weekWorkouts',
      weekDuration: 'weekDuration',
      weekCalories: 'weekCalories'
    });

    this.load();
    this.render();
    this.updateStats();

    console.log('[ExerciseLog] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('exercise-log-data');
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('exercise-log-data', JSON.stringify(this.logs));
  }

  add() {
    const type = this.elements.exerciseType.value.trim();
    const duration = parseInt(this.elements.duration.value);
    const calories = parseInt(this.elements.calories.value) || 0;
    const notes = this.elements.notes.value.trim();

    if (!type) {
      this.showToast('운동 종류를 입력하세요', 'error');
      return;
    }
    if (!duration || duration <= 0) {
      this.showToast('운동 시간을 입력하세요', 'error');
      return;
    }

    this.logs.unshift({
      id: Date.now(),
      type: type,
      duration: duration,
      calories: calories,
      notes: notes,
      date: new Date().toISOString()
    });

    this.save();
    this.render();
    this.updateStats();

    // 폼 초기화
    this.elements.exerciseType.value = '';
    this.elements.duration.value = '';
    this.elements.calories.value = '';
    this.elements.notes.value = '';

    this.showToast('운동 기록이 추가되었습니다', 'success');
  }

  remove(id) {
    this.logs = this.logs.filter(log => log.id !== id);
    this.save();
    this.render();
    this.updateStats();
  }

  setFilter(filter) {
    this.filter = filter;
    this.render();
  }

  getFilteredLogs() {
    const now = new Date();

    switch (this.filter) {
      case 'today':
        return this.logs.filter(log => {
          const logDate = new Date(log.date);
          return logDate.toDateString() === now.toDateString();
        });
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return this.logs.filter(log => new Date(log.date) >= weekAgo);
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return this.logs.filter(log => new Date(log.date) >= monthAgo);
      default:
        return this.logs;
    }
  }

  getExerciseTypes() {
    const types = new Set(this.logs.map(log => log.type));
    return Array.from(types);
  }

  updateStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekLogs = this.logs.filter(log => new Date(log.date) >= weekAgo);

    const totalWorkouts = weekLogs.length;
    const totalDuration = weekLogs.reduce((sum, log) => sum + log.duration, 0);
    const totalCalories = weekLogs.reduce((sum, log) => sum + (log.calories || 0), 0);

    this.elements.weekWorkouts.textContent = totalWorkouts;
    this.elements.weekDuration.textContent = totalDuration;
    this.elements.weekCalories.textContent = totalCalories;
  }

  render() {
    this.renderFilters();
    this.renderLogs();
  }

  renderFilters() {
    const filters = [
      { key: 'all', name: '전체' },
      { key: 'today', name: '오늘' },
      { key: 'week', name: '이번 주' },
      { key: 'month', name: '이번 달' }
    ];

    this.elements.filterRow.innerHTML = filters.map(f =>
      `<div class="filter-btn ${this.filter === f.key ? 'active' : ''}" onclick="exerciseLog.setFilter('${f.key}')">${f.name}</div>`
    ).join('');
  }

  renderLogs() {
    const list = this.elements.logList;
    const filtered = this.getFilteredLogs();

    if (filtered.length === 0) {
      list.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">운동 기록이 없습니다</div>';
      return;
    }

    list.innerHTML = filtered.map(log => {
      const date = new Date(log.date);
      const dateStr = date.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric',
        weekday: 'short'
      });
      const timeStr = date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="log-item">
          <span class="log-delete" onclick="exerciseLog.remove(${log.id})"></span>
          <div class="log-date">${dateStr} ${timeStr}</div>
          <div class="log-exercise">${this.escapeHtml(log.type)}</div>
          <div class="log-details">
            <span class="log-detail">${log.duration}분</span>
            ${log.calories ? `<span class="log-detail">${log.calories}kcal</span>` : ''}
          </div>
          ${log.notes ? `<div class="log-notes">"${this.escapeHtml(log.notes)}"</div>` : ''}
        </div>
      `;
    }).join('');
  }

  exportData() {
    if (this.logs.length === 0) {
      this.showToast('내보낼 기록이 없습니다', 'error');
      return;
    }

    let text = '운동 기록 내보내기\n';
    text += '=' .repeat(40) + '\n\n';

    this.logs.forEach(log => {
      const date = new Date(log.date);
      text += `날짜: ${date.toLocaleDateString('ko-KR')}\n`;
      text += `운동: ${log.type}\n`;
      text += `시간: ${log.duration}분\n`;
      if (log.calories) text += `칼로리: ${log.calories}kcal\n`;
      if (log.notes) text += `메모: ${log.notes}\n`;
      text += '\n';
    });

    this.copyToClipboard(text);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 인스턴스 생성
const exerciseLog = new ExerciseLog();
window.ExerciseLog = exerciseLog;

document.addEventListener('DOMContentLoaded', () => exerciseLog.init());
