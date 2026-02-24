/**
 * 습관 추적기 - ToolBase 기반
 * 주간 습관 체크 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class HabitTracker extends ToolBase {
  constructor() {
    super('HabitTracker');
    this.habits = [];
    this.currentWeekStart = this.getWeekStart(new Date());
    this.freqLabels = { daily: '매일', weekdays: '평일', weekends: '주말' };
  }

  init() {
    this.initElements({
      weekRange: 'weekRange',
      dayHeaders: 'dayHeaders',
      habitList: 'habitList',
      totalHabits: 'totalHabits',
      todayComplete: 'todayComplete',
      bestStreak: 'bestStreak',
      habitInput: 'habitInput',
      habitFreq: 'habitFreq',
      addHabit: 'addHabit',
      prevWeek: 'prevWeek',
      nextWeek: 'nextWeek'
    });

    this.load();
    this.bindEvents();
    this.renderWeek();

    console.log('[HabitTracker] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('habits');
      if (saved) {
        this.habits = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('habits', JSON.stringify(this.habits));
  }

  bindEvents() {
    this.elements.addHabit.addEventListener('click', () => this.addHabitHandler());
    this.elements.prevWeek.addEventListener('click', () => this.prevWeekHandler());
    this.elements.nextWeek.addEventListener('click', () => this.nextWeekHandler());
  }

  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  renderWeek() {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const weekDays = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(this.currentWeekStart);
      d.setDate(d.getDate() + i);
      weekDays.push(d);
    }

    const start = weekDays[0];
    const end = weekDays[6];
    this.elements.weekRange.textContent =
      `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 - ${end.getDate()}일`;

    this.elements.dayHeaders.innerHTML = weekDays.map(d => `
      <div class="day-col">
        <span>${d.getDate()}</span>
        <small>${days[d.getDay()]}</small>
      </div>
    `).join('');

    this.renderHabits(weekDays);
  }

  renderHabits(weekDays) {
    this.elements.totalHabits.textContent = this.habits.length;

    const today = this.formatDate(new Date());
    let todayComplete = 0;
    let bestStreak = 0;

    this.habits.forEach(habit => {
      if (habit.checks && habit.checks[today]) todayComplete++;
      const streak = this.calculateStreak(habit);
      if (streak > bestStreak) bestStreak = streak;
    });

    this.elements.todayComplete.textContent = todayComplete;
    this.elements.bestStreak.textContent = bestStreak;

    this.elements.habitList.innerHTML = this.habits.map(habit => `
      <div class="habit-row" data-id="${habit.id}">
        <div class="habit-info">
          <h4>${this.escapeHtml(habit.name)}</h4>
          <small>${this.freqLabels[habit.freq] || '매일'} | 연속 ${this.calculateStreak(habit)}일</small>
        </div>
        <div class="habit-checks">
          ${weekDays.map(d => {
            const dateStr = this.formatDate(d);
            const checked = habit.checks && habit.checks[dateStr];
            return `<div class="check-box ${checked ? 'checked' : ''}" data-habit="${habit.id}" data-date="${dateStr}"></div>`;
          }).join('')}
        </div>
        <div class="habit-actions">
          <button onclick="habitTracker.deleteHabit('${habit.id}')">삭제</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.check-box').forEach(box => {
      box.addEventListener('click', () => {
        this.toggleCheck(box.dataset.habit, box.dataset.date);
      });
    });
  }

  calculateStreak(habit) {
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = this.formatDate(d);

      if (habit.checks && habit.checks[dateStr]) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  }

  toggleCheck(habitId, dateStr) {
    const habit = this.habits.find(h => h.id === habitId);
    if (!habit) return;

    if (!habit.checks) habit.checks = {};
    habit.checks[dateStr] = !habit.checks[dateStr];

    this.save();
    this.renderWeek();
  }

  deleteHabit(id) {
    if (confirm('이 습관을 삭제하시겠습니까?')) {
      this.habits = this.habits.filter(h => h.id !== id);
      this.save();
      this.renderWeek();
      this.showToast('습관이 삭제되었습니다', 'success');
    }
  }

  addHabitHandler() {
    const name = this.elements.habitInput.value.trim();
    const freq = this.elements.habitFreq.value;

    if (!name) {
      this.showToast('습관 이름을 입력하세요', 'error');
      return;
    }

    this.habits.push({
      id: Date.now().toString(),
      name,
      freq,
      checks: {}
    });

    this.save();
    this.elements.habitInput.value = '';
    this.renderWeek();
    this.showToast('습관이 추가되었습니다', 'success');
  }

  prevWeekHandler() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
    this.renderWeek();
  }

  nextWeekHandler() {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
    this.renderWeek();
  }
}

// 전역 인스턴스 생성
const habitTracker = new HabitTracker();
window.HabitTracker = habitTracker;

document.addEventListener('DOMContentLoaded', () => habitTracker.init());
