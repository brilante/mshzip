/**
 * 목표 설정기 - ToolBase 기반
 * 마일스톤 기반 목표 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class GoalSetter extends ToolBase {
  constructor() {
    super('GoalSetter');
    this.goals = [];
    this.categoryLabels = {
      health: '건강',
      career: '커리어',
      finance: '재정',
      education: '교육',
      personal: '개인'
    };
  }

  init() {
    this.initElements({
      goalTitle: 'goalTitle',
      goalCategory: 'goalCategory',
      goalDesc: 'goalDesc',
      startDate: 'startDate',
      endDate: 'endDate',
      addGoal: 'addGoal',
      filterCategory: 'filterCategory',
      goalsList: 'goalsList'
    });

    this.load();
    this.bindEvents();
    this.setDefaultDates();
    this.render();

    console.log('[GoalSetter] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('goals');
      if (saved) {
        this.goals = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('goals', JSON.stringify(this.goals));
  }

  bindEvents() {
    this.elements.addGoal.addEventListener('click', () => this.addGoalHandler());
    this.elements.filterCategory.addEventListener('change', () => this.render());
  }

  setDefaultDates() {
    this.elements.startDate.valueAsDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);
    this.elements.endDate.valueAsDate = endDate;
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  calculateProgress(goal) {
    if (!goal.milestones || goal.milestones.length === 0) return 0;
    const completed = goal.milestones.filter(m => m.done).length;
    return Math.round((completed / goal.milestones.length) * 100);
  }

  render() {
    const filter = this.elements.filterCategory.value;
    const filtered = filter ? this.goals.filter(g => g.category === filter) : this.goals;

    this.elements.goalsList.innerHTML = filtered.map(goal => {
      const progress = this.calculateProgress(goal);
      return `
        <div class="goal-card" data-id="${goal.id}">
          <div class="goal-header">
            <span class="goal-title">${this.escapeHtml(goal.title)}</span>
            <span class="goal-category ${goal.category}">${this.categoryLabels[goal.category] || goal.category}</span>
          </div>
          <div class="goal-desc">${this.escapeHtml(goal.desc || '')}</div>
          <div class="goal-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div style="text-align: right; font-size: 12px; color: #666; margin-top: 4px;">${progress}%</div>
          </div>
          <div class="goal-dates">
            <span>시작: ${goal.startDate || '-'}</span>
            <span>목표: ${goal.endDate || '-'}</span>
          </div>
          <div class="goal-milestones">
            <strong style="font-size: 13px; color: #666;">마일스톤</strong>
            ${(goal.milestones || []).map((m, i) => `
              <div class="milestone ${m.done ? 'completed' : ''}">
                <input type="checkbox" ${m.done ? 'checked' : ''} onchange="goalSetter.toggleMilestone('${goal.id}', ${i})">
                <span>${this.escapeHtml(m.text)}</span>
              </div>
            `).join('')}
            <div class="add-milestone">
              <input type="text" id="milestone-${goal.id}" placeholder="새 마일스톤">
              <button onclick="goalSetter.addMilestone('${goal.id}')">추가</button>
            </div>
          </div>
          <div class="goal-actions">
            <button class="btn-delete" onclick="goalSetter.deleteGoal('${goal.id}')">삭제</button>
          </div>
        </div>
      `;
    }).join('');
  }

  addGoalHandler() {
    const title = this.elements.goalTitle.value.trim();
    const category = this.elements.goalCategory.value;
    const desc = this.elements.goalDesc.value.trim();
    const startDate = this.elements.startDate.value;
    const endDate = this.elements.endDate.value;

    if (!title) {
      this.showToast('목표 제목을 입력하세요', 'error');
      return;
    }

    this.goals.push({
      id: Date.now().toString(),
      title,
      category,
      desc,
      startDate,
      endDate,
      milestones: [],
      completed: false
    });

    this.save();
    this.render();

    this.elements.goalTitle.value = '';
    this.elements.goalDesc.value = '';
    this.showToast('목표가 추가되었습니다', 'success');
  }

  addMilestone(goalId) {
    const input = document.getElementById('milestone-' + goalId);
    const text = input.value.trim();
    if (!text) return;

    const goal = this.goals.find(g => g.id === goalId);
    if (goal) {
      if (!goal.milestones) goal.milestones = [];
      goal.milestones.push({ text, done: false });
      this.save();
      this.render();
      this.showToast('마일스톤이 추가되었습니다', 'success');
    }
  }

  toggleMilestone(goalId, idx) {
    const goal = this.goals.find(g => g.id === goalId);
    if (goal && goal.milestones) {
      goal.milestones[idx].done = !goal.milestones[idx].done;
      this.save();
      this.render();
    }
  }

  deleteGoal(id) {
    if (confirm('이 목표를 삭제하시겠습니까?')) {
      this.goals = this.goals.filter(g => g.id !== id);
      this.save();
      this.render();
      this.showToast('목표가 삭제되었습니다', 'success');
    }
  }
}

// 전역 인스턴스 생성
const goalSetter = new GoalSetter();
window.GoalSetter = goalSetter;

document.addEventListener('DOMContentLoaded', () => goalSetter.init());
