/**
 * 식단 플래너 - ToolBase 기반
 * 주간 식단 계획 및 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var MealPlanner = class MealPlanner extends ToolBase {
  constructor() {
    super('MealPlanner');
    this.days = ['월', '화', '수', '목', '금', '토', '일'];
    this.meals = ['아침', '점심', '저녁', '간식'];
    this.plan = {};
    this.currentEdit = null;
  }

  init() {
    this.initElements({
      weekGrid: 'weekGrid',
      mealModal: 'mealModal',
      modalTitle: 'modalTitle',
      mealInput: 'mealInput'
    });

    this.load();
    this.render();

    // 모달 외부 클릭 시 닫기
    this.on(this.elements.mealModal, 'click', (e) => {
      if (e.target.id === 'mealModal') {
        this.closeModal();
      }
    });

    // Enter 키로 저장
    this.on(this.elements.mealInput, 'keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveMeal();
      }
    });

    console.log('[MealPlanner] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('meal-planner-data');
      if (saved) {
        this.plan = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('meal-planner-data', JSON.stringify(this.plan));
  }

  getKey(day, meal) {
    return `${day}-${meal}`;
  }

  getTodayIndex() {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  openModal(day, meal) {
    this.currentEdit = { day, meal };
    const key = this.getKey(day, meal);

    this.elements.modalTitle.textContent = `${day}요일 ${meal}`;
    this.elements.mealInput.value = this.plan[key] || '';
    this.elements.mealModal.classList.add('show');
    this.elements.mealInput.focus();
  }

  closeModal() {
    this.elements.mealModal.classList.remove('show');
    this.currentEdit = null;
  }

  saveMeal() {
    if (!this.currentEdit) return;

    const key = this.getKey(this.currentEdit.day, this.currentEdit.meal);
    const value = this.elements.mealInput.value.trim();

    if (value) {
      this.plan[key] = value;
    } else {
      delete this.plan[key];
    }

    this.save();
    this.closeModal();
    this.render();
  }

  removeMeal(day, meal) {
    const key = this.getKey(day, meal);
    delete this.plan[key];
    this.save();
    this.render();
  }

  clearAll() {
    if (Object.keys(this.plan).length === 0) return;
    if (!confirm('모든 식단을 초기화하시겠습니까?')) return;

    this.plan = {};
    this.save();
    this.render();
    this.showToast('초기화되었습니다', 'success');
  }

  async exportPlan() {
    let text = '주간 식단표\n';
    text += '='.repeat(30) + '\n\n';

    this.days.forEach(day => {
      text += `[${day}요일]\n`;

      this.meals.forEach(meal => {
        const key = this.getKey(day, meal);
        const value = this.plan[key];
        text += `  ${meal}: ${value || '-'}\n`;
      });

      text += '\n';
    });

    try {
      await navigator.clipboard.writeText(text);
      this.showToast('식단표가 클립보드에 복사되었습니다.', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  render() {
    const container = this.elements.weekGrid;
    const todayIdx = this.getTodayIndex();

    container.innerHTML = this.days.map((day, idx) => {
      const isToday = idx === todayIdx;

      return `
        <div class="day-column">
          <div class="day-header ${isToday ? 'today' : ''}">${day}</div>

          ${this.meals.map(meal => {
            const key = this.getKey(day, meal);
            const value = this.plan[key];

            return `
              <div class="meal-slot">
                <div class="meal-label">${meal}</div>
                <div class="meal-content">
                  ${value ?
                    `<span class="meal-name">${value}</span>
                     <button onclick="mealPlanner.removeMeal('${day}', '${meal}')" style="background: none; border: none; cursor: pointer; opacity: 0.5; font-size: 0.7rem;"></button>` :
                    `<span class="meal-empty" onclick="mealPlanner.openModal('${day}', '${meal}')" style="cursor: pointer;">+ 추가</span>`
                  }
                </div>
              </div>
            `;
          }).join('')}

          <button class="add-meal-btn" onclick="mealPlanner.openModal('${day}', '간식')">+ 간식 추가</button>
        </div>
      `;
    }).join('');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const mealPlanner = new MealPlanner();
window.MealPlanner = mealPlanner;

document.addEventListener('DOMContentLoaded', () => mealPlanner.init());
