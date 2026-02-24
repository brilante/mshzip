/**
 * 목표 추적기 - ToolBase 기반
 * 목표 설정 및 진행률 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var GoalTracker = class GoalTracker extends ToolBase {
  constructor() {
    super('GoalTracker');
    this.goals = [];
    this.categories = {
      career: { name: '커리어', icon: '', color: '#3b82f6' },
      health: { name: '건강', icon: '', color: '#ef4444' },
      finance: { name: '재정', icon: '', color: '#22c55e' },
      education: { name: '학습', icon: '', color: '#f59e0b' },
      personal: { name: '개인', icon: '', color: '#8b5cf6' }
    };
  }

  init() {
    this.initElements({
      goalTitle: 'goalTitle',
      goalCategory: 'goalCategory',
      goalDeadline: 'goalDeadline',
      goalMilestones: 'goalMilestones',
      goalsList: 'goalsList'
    });

    this.load();
    if (this.goals.length === 0) {
      this.goals = [
        {
          id: 1,
          title: '영어 회화 마스터',
          category: 'education',
          deadline: '2026-06-30',
          milestones: [
            { text: '기초 문법 복습', completed: true },
            { text: '매일 30분 듣기', completed: true },
            { text: '원어민 대화 10회', completed: false },
            { text: '영어 프레젠테이션', completed: false }
          ]
        },
        {
          id: 2,
          title: '체중 5kg 감량',
          category: 'health',
          deadline: '2026-03-31',
          milestones: [
            { text: '운동 습관 만들기', completed: true },
            { text: '식단 조절 시작', completed: true },
            { text: '2kg 감량', completed: false },
            { text: '5kg 감량', completed: false }
          ]
        }
      ];
    }
    this.render();

    console.log('[GoalTracker] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('goal-tracker-goals');
      if (saved) {
        this.goals = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('goal-tracker-goals', JSON.stringify(this.goals));
  }

  addGoal() {
    const title = this.elements.goalTitle.value.trim();
    const category = this.elements.goalCategory.value;
    const deadline = this.elements.goalDeadline.value;
    const milestonesStr = this.elements.goalMilestones.value.trim();

    if (!title) {
      this.showToast('목표 제목을 입력해주세요', 'error');
      return;
    }

    const milestones = milestonesStr
      ? milestonesStr.split(',').map(m => ({ text: m.trim(), completed: false }))
      : [];

    this.goals.push({
      id: Date.now(),
      title,
      category,
      deadline,
      milestones
    });

    this.elements.goalTitle.value = '';
    this.elements.goalMilestones.value = '';

    this.save();
    this.render();
    this.showToast('목표가 추가되었습니다', 'success');
  }

  removeGoal(id) {
    if (!confirm('이 목표를 삭제하시겠습니까?')) return;
    this.goals = this.goals.filter(g => g.id !== id);
    this.save();
    this.render();
  }

  toggleMilestone(goalId, milestoneIdx) {
    const goal = this.goals.find(g => g.id === goalId);
    if (goal) {
      goal.milestones[milestoneIdx].completed = !goal.milestones[milestoneIdx].completed;
      this.save();
      this.render();
    }
  }

  calculateProgress(goal) {
    if (goal.milestones.length === 0) return 0;
    const completed = goal.milestones.filter(m => m.completed).length;
    return Math.round((completed / goal.milestones.length) * 100);
  }

  getDaysRemaining(deadline) {
    if (!deadline) return null;
    const today = new Date();
    const target = new Date(deadline);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    return diff;
  }

  render() {
    if (this.goals.length === 0) {
      this.elements.goalsList.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          <div style="font-size: 3rem; margin-bottom: 1rem;"></div>
          <div>아직 목표가 없습니다. 새 목표를 추가해보세요!</div>
        </div>
      `;
      return;
    }

    this.elements.goalsList.innerHTML = this.goals.map(goal => {
      const cat = this.categories[goal.category];
      const progress = this.calculateProgress(goal);
      const daysRemaining = this.getDaysRemaining(goal.deadline);

      return `
        <div class="goal-card">
          <div class="goal-header">
            <div>
              <div class="goal-title">${goal.title}</div>
              <span class="goal-category" style="color: ${cat.color};">${cat.icon} ${cat.name}</span>
            </div>
            <button onclick="goalTracker.removeGoal(${goal.id})" style="background: none; border: none; cursor: pointer; opacity: 0.5;"></button>
          </div>

          <div class="goal-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%; background: ${cat.color};"></div>
            </div>
            <div class="progress-text">
              <span>${progress}% 완료</span>
              <span>${daysRemaining !== null ? (daysRemaining > 0 ? `D-${daysRemaining}` : (daysRemaining === 0 ? '오늘 마감!' : '기한 지남')) : ''}</span>
            </div>
          </div>

          ${goal.milestones.length > 0 ? `
            <div class="milestone-list">
              ${goal.milestones.map((m, idx) => `
                <div class="milestone-item ${m.completed ? 'completed' : ''}" onclick="goalTracker.toggleMilestone(${goal.id}, ${idx})" style="cursor: pointer;">
                  <input type="checkbox" ${m.completed ? 'checked' : ''} onclick="event.stopPropagation(); goalTracker.toggleMilestone(${goal.id}, ${idx})">
                  <span>${m.text}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }
}

// 전역 인스턴스 생성
const goalTracker = new GoalTracker();
window.GoalTracker = goalTracker;

// 전역 함수 (HTML onclick 호환)
function addGoal() { goalTracker.addGoal(); }

document.addEventListener('DOMContentLoaded', () => goalTracker.init());
