/**
 * 스터디 플래너 - ToolBase 기반
 * 학습 일정 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class StudyPlanner extends ToolBase {
  constructor() {
    super('StudyPlanner');
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.plans = {};
    this.goals = [];
  }

  init() {
    this.initElements({
      currentMonth: 'currentMonth',
      calendarDays: 'calendarDays',
      selectedDate: 'selectedDate',
      dayPlans: 'dayPlans',
      prevMonth: 'prevMonth',
      nextMonth: 'nextMonth',
      planSubject: 'planSubject',
      planTask: 'planTask',
      planTime: 'planTime',
      addPlan: 'addPlan',
      goalText: 'goalText',
      goalDeadline: 'goalDeadline',
      addGoal: 'addGoal',
      goalsList: 'goalsList',
      completedTasks: 'completedTasks',
      streakDays: 'streakDays'
    });

    this.loadData();
    this.setupEvents();
    this.renderCalendar();
    this.renderDayPlans();
    this.renderGoals();
    this.updateStats();

    console.log('[StudyPlanner] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const savedPlans = localStorage.getItem('studyPlans');
      const savedGoals = localStorage.getItem('studyGoals');
      if (savedPlans) this.plans = JSON.parse(savedPlans);
      if (savedGoals) this.goals = JSON.parse(savedGoals);
    } catch (e) {}
  }

  setupEvents() {
    this.elements.prevMonth.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.renderCalendar();
    });

    this.elements.nextMonth.addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.renderCalendar();
    });

    this.elements.addPlan.addEventListener('click', () => this.addPlan());
    this.elements.addGoal.addEventListener('click', () => this.addGoal());
  }

  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  renderCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    this.elements.currentMonth.textContent = year + '년 ' + (month + 1) + '월';

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();

    this.elements.calendarDays.innerHTML = '';

    // Previous month days
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const day = document.createElement('div');
      day.className = 'calendar-day other-month';
      day.textContent = prevLastDay - i;
      this.elements.calendarDays.appendChild(day);
    }

    // Current month days
    const today = new Date();
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const day = document.createElement('div');
      day.className = 'calendar-day';
      day.textContent = i;

      const dateStr = this.formatDate(new Date(year, month, i));

      if (this.plans[dateStr] && this.plans[dateStr].length > 0) {
        day.classList.add('has-plan');
      }

      if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === i) {
        day.classList.add('today');
      }

      if (this.selectedDate.getFullYear() === year && this.selectedDate.getMonth() === month && this.selectedDate.getDate() === i) {
        day.classList.add('selected');
      }

      day.addEventListener('click', () => {
        this.selectedDate = new Date(year, month, i);
        this.renderCalendar();
        this.renderDayPlans();
      });

      this.elements.calendarDays.appendChild(day);
    }

    // Next month days
    const remaining = 42 - this.elements.calendarDays.children.length;
    for (let i = 1; i <= remaining; i++) {
      const day = document.createElement('div');
      day.className = 'calendar-day other-month';
      day.textContent = i;
      this.elements.calendarDays.appendChild(day);
    }
  }

  renderDayPlans() {
    const dateStr = this.formatDate(this.selectedDate);
    this.elements.selectedDate.textContent =
      this.selectedDate.getFullYear() + '년 ' + (this.selectedDate.getMonth() + 1) + '월 ' + this.selectedDate.getDate() + '일';

    const dayPlans = this.plans[dateStr] || [];
    this.elements.dayPlans.innerHTML = dayPlans.map((plan, idx) => `
      <div class="plan-item ${plan.completed ? 'completed' : ''}">
        <input type="checkbox" ${plan.completed ? 'checked' : ''} onchange="studyPlanner.togglePlan('${dateStr}', ${idx})">
        <div class="plan-item-content">
          <div class="plan-item-subject">${this.escapeHtml(plan.subject)}</div>
          <div class="plan-item-task">${this.escapeHtml(plan.task)}</div>
          <div class="plan-item-time">${plan.time || ''}</div>
        </div>
        <button onclick="studyPlanner.deletePlan('${dateStr}', ${idx})">삭제</button>
      </div>
    `).join('');
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  addPlan() {
    const subject = this.elements.planSubject.value.trim();
    const task = this.elements.planTask.value.trim();
    const time = this.elements.planTime.value;

    if (!subject || !task) {
      alert('과목과 학습 내용을 입력하세요');
      return;
    }

    const dateStr = this.formatDate(this.selectedDate);
    if (!this.plans[dateStr]) this.plans[dateStr] = [];
    this.plans[dateStr].push({ subject, task, time, completed: false });

    localStorage.setItem('studyPlans', JSON.stringify(this.plans));

    this.elements.planSubject.value = '';
    this.elements.planTask.value = '';
    this.elements.planTime.value = '';

    this.renderCalendar();
    this.renderDayPlans();
    this.updateStats();

    this.showToast('학습 계획이 추가되었습니다!', 'success');
  }

  togglePlan(dateStr, idx) {
    this.plans[dateStr][idx].completed = !this.plans[dateStr][idx].completed;
    localStorage.setItem('studyPlans', JSON.stringify(this.plans));
    this.renderDayPlans();
    this.updateStats();
  }

  deletePlan(dateStr, idx) {
    this.plans[dateStr].splice(idx, 1);
    if (this.plans[dateStr].length === 0) delete this.plans[dateStr];
    localStorage.setItem('studyPlans', JSON.stringify(this.plans));
    this.renderCalendar();
    this.renderDayPlans();
    this.updateStats();
  }

  renderGoals() {
    this.elements.goalsList.innerHTML = this.goals.map((goal, idx) => `
      <div class="goal-item ${goal.completed ? 'completed' : ''}">
        <input type="checkbox" ${goal.completed ? 'checked' : ''} onchange="studyPlanner.toggleGoal(${idx})">
        <span>${this.escapeHtml(goal.text)}</span>
        <small>${goal.deadline ? goal.deadline : ''}</small>
        <button onclick="studyPlanner.deleteGoal(${idx})">삭제</button>
      </div>
    `).join('');
  }

  addGoal() {
    const text = this.elements.goalText.value.trim();
    const deadline = this.elements.goalDeadline.value;

    if (!text) {
      alert('목표를 입력하세요');
      return;
    }

    this.goals.push({ text, deadline, completed: false });
    localStorage.setItem('studyGoals', JSON.stringify(this.goals));

    this.elements.goalText.value = '';
    this.elements.goalDeadline.value = '';

    this.renderGoals();
    this.showToast('목표가 추가되었습니다!', 'success');
  }

  toggleGoal(idx) {
    this.goals[idx].completed = !this.goals[idx].completed;
    localStorage.setItem('studyGoals', JSON.stringify(this.goals));
    this.renderGoals();
  }

  deleteGoal(idx) {
    this.goals.splice(idx, 1);
    localStorage.setItem('studyGoals', JSON.stringify(this.goals));
    this.renderGoals();
  }

  updateStats() {
    let completedCount = 0;
    let streakDays = 0;

    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = this.formatDate(date);
      if (this.plans[dateStr]) {
        completedCount += this.plans[dateStr].filter(p => p.completed).length;
      }
    }

    // Calculate streak
    let checkDate = new Date(today);
    while (true) {
      const dateStr = this.formatDate(checkDate);
      if (this.plans[dateStr] && this.plans[dateStr].some(p => p.completed)) {
        streakDays++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    this.elements.completedTasks.textContent = completedCount;
    this.elements.streakDays.textContent = streakDays;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const studyPlanner = new StudyPlanner();
window.StudyPlanner = studyPlanner;

document.addEventListener('DOMContentLoaded', () => studyPlanner.init());
