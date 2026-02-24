/**
 * 칼로리 트래커 - ToolBase 기반
 * 일일 칼로리 섭취량 기록 및 추적
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class CalorieTracker extends ToolBase {
  constructor() {
    super('CalorieTracker');
    this.today = new Date().toDateString();
    this.foods = JSON.parse(localStorage.getItem('calorieTracker_' + this.today)) || [];
    this.dailyGoal = parseInt(localStorage.getItem('calorieGoal')) || 2000;
    this.mealLabels = { breakfast: '아침', lunch: '점심', dinner: '저녁', snack: '간식' };
  }

  init() {
    this.initElements({
      foodName: 'foodName',
      foodCal: 'foodCal',
      mealType: 'mealType',
      addFood: 'addFood',
      dailyGoal: 'dailyGoal',
      currentCal: 'currentCal',
      goalCal: 'goalCal',
      remainingCal: 'remainingCal',
      progressCircle: 'progressCircle',
      foodsList: 'foodsList'
    });

    this.setupEvents();
    this.updateUI();

    console.log('[CalorieTracker] 초기화 완료');
    return this;
  }

  setupEvents() {
    this.elements.addFood.addEventListener('click', () => this.addFood());
    this.elements.dailyGoal.addEventListener('change', (e) => {
      this.dailyGoal = parseInt(e.target.value) || 2000;
      localStorage.setItem('calorieGoal', this.dailyGoal);
      this.updateUI();
    });
  }

  saveFoods() {
    localStorage.setItem('calorieTracker_' + this.today, JSON.stringify(this.foods));
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  updateUI() {
    const total = this.foods.reduce((sum, f) => sum + f.calories, 0);
    const remaining = Math.max(0, this.dailyGoal - total);
    const progress = Math.min((total / this.dailyGoal) * 100, 100);

    this.elements.currentCal.textContent = total;
    this.elements.goalCal.textContent = this.dailyGoal;
    this.elements.remainingCal.textContent = remaining;
    this.elements.dailyGoal.value = this.dailyGoal;

    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (progress / 100) * circumference;
    this.elements.progressCircle.style.strokeDashoffset = offset;

    this.renderFoods();
  }

  renderFoods() {
    const grouped = { breakfast: [], lunch: [], dinner: [], snack: [] };
    this.foods.forEach(f => grouped[f.meal].push(f));

    let html = '';
    for (const [meal, items] of Object.entries(grouped)) {
      if (items.length > 0) {
        html += '<div class="meal-group"><h4>' + this.mealLabels[meal] + '</h4>';
        items.forEach(item => {
          html += '<div class="food-item">';
          html += '<span class="food-item-name">' + this.escapeHtml(item.name) + '</span>';
          html += '<span class="food-item-cal">' + item.calories + ' kcal</span>';
          html += '<button onclick="calorieTracker.deleteFood(\'' + item.id + '\')">삭제</button>';
          html += '</div>';
        });
        html += '</div>';
      }
    }

    this.elements.foodsList.innerHTML = html || '<p style="color:#999;text-align:center">오늘 기록된 음식이 없습니다</p>';
  }

  addFood() {
    const name = this.elements.foodName.value.trim();
    const calories = parseInt(this.elements.foodCal.value);
    const meal = this.elements.mealType.value;

    if (!name || !calories) {
      this.showToast('음식 이름과 칼로리를 입력하세요', 'error');
      return;
    }

    this.foods.push({
      id: Date.now().toString(),
      name,
      calories,
      meal
    });

    this.saveFoods();
    this.updateUI();

    this.elements.foodName.value = '';
    this.elements.foodCal.value = '';

    this.showToast(`${name} 추가됨`, 'success');
  }

  deleteFood(id) {
    this.foods = this.foods.filter(f => f.id !== id);
    this.saveFoods();
    this.updateUI();
  }
}

// 전역 인스턴스 생성
const calorieTracker = new CalorieTracker();
window.CalorieTracker = calorieTracker;

document.addEventListener('DOMContentLoaded', () => calorieTracker.init());
