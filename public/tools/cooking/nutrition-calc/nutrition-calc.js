/**
 * 영양소 계산기 - ToolBase 기반
 * 식품별 영양소 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var NutritionCalc = class NutritionCalc extends ToolBase {
  constructor() {
    super('NutritionCalc');
    // 100g 기준 영양 정보
    this.foods = [
      { name: '흰쌀밥', calories: 130, carbs: 28, protein: 2.7, fat: 0.3 },
      { name: '현미밥', calories: 111, carbs: 23, protein: 2.6, fat: 0.9 },
      { name: '계란 (삶은 것)', calories: 155, carbs: 1.1, protein: 13, fat: 11 },
      { name: '계란 프라이', calories: 196, carbs: 0.6, protein: 14, fat: 15 },
      { name: '닭가슴살', calories: 165, carbs: 0, protein: 31, fat: 3.6 },
      { name: '소고기 (안심)', calories: 250, carbs: 0, protein: 26, fat: 15 },
      { name: '돼지고기 (삼겹살)', calories: 518, carbs: 0, protein: 9, fat: 53 },
      { name: '연어', calories: 208, carbs: 0, protein: 20, fat: 13 },
      { name: '두부', calories: 76, carbs: 1.9, protein: 8, fat: 4.8 },
      { name: '우유', calories: 61, carbs: 4.8, protein: 3.2, fat: 3.3 },
      { name: '요거트', calories: 59, carbs: 3.6, protein: 10, fat: 0.7 },
      { name: '치즈 (체다)', calories: 403, carbs: 1.3, protein: 25, fat: 33 },
      { name: '바나나', calories: 89, carbs: 23, protein: 1.1, fat: 0.3 },
      { name: '사과', calories: 52, carbs: 14, protein: 0.3, fat: 0.2 },
      { name: '오렌지', calories: 47, carbs: 12, protein: 0.9, fat: 0.1 },
      { name: '아보카도', calories: 160, carbs: 9, protein: 2, fat: 15 },
      { name: '브로콜리', calories: 34, carbs: 7, protein: 2.8, fat: 0.4 },
      { name: '시금치', calories: 23, carbs: 3.6, protein: 2.9, fat: 0.4 },
      { name: '고구마', calories: 86, carbs: 20, protein: 1.6, fat: 0.1 },
      { name: '감자', calories: 77, carbs: 17, protein: 2, fat: 0.1 },
      { name: '파스타 (삶은 것)', calories: 131, carbs: 25, protein: 5, fat: 1.1 },
      { name: '빵 (식빵)', calories: 265, carbs: 49, protein: 9, fat: 3.2 },
      { name: '라면', calories: 436, carbs: 62, protein: 10, fat: 16 },
      { name: '아몬드', calories: 579, carbs: 22, protein: 21, fat: 50 },
      { name: '땅콩', calories: 567, carbs: 16, protein: 26, fat: 49 },
      { name: '김치', calories: 15, carbs: 2.4, protein: 1.1, fat: 0.5 }
    ];
    this.selected = [];
  }

  init() {
    this.initElements({
      searchInput: 'searchInput',
      foodList: 'foodList',
      selectedFoods: 'selectedFoods',
      totalCalories: 'totalCalories',
      totalCarbs: 'totalCarbs',
      totalProtein: 'totalProtein',
      totalFat: 'totalFat',
      calBar: 'calBar',
      carbBar: 'carbBar',
      proteinBar: 'proteinBar',
      fatBar: 'fatBar'
    });

    this.search();

    console.log('[NutritionCalc] 초기화 완료');
    return this;
  }

  search() {
    const query = this.elements.searchInput.value.toLowerCase().trim();
    const container = this.elements.foodList;

    if (!query) {
      container.innerHTML = this.foods.slice(0, 10).map(food => this.renderFoodItem(food)).join('');
      return;
    }

    const results = this.foods.filter(f => f.name.toLowerCase().includes(query));

    if (results.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">검색 결과 없음</div>';
      return;
    }

    container.innerHTML = results.map(food => this.renderFoodItem(food)).join('');
  }

  renderFoodItem(food) {
    return `
      <div class="food-item" onclick="nutritionCalc.addFood('${food.name}')">
        <span>${food.name}</span>
        <span style="font-size: 0.8rem; color: var(--text-secondary);">${food.calories} kcal/100g</span>
      </div>
    `;
  }

  addFood(name) {
    const food = this.foods.find(f => f.name === name);
    if (!food) return;

    this.selected.push({
      ...food,
      amount: 100,
      id: Date.now()
    });

    this.render();
    this.showToast(`${name} 추가됨`, 'success');
  }

  updateAmount(id, amount) {
    const item = this.selected.find(s => s.id === id);
    if (item) {
      item.amount = parseInt(amount) || 0;
      this.updateTotals();
    }
  }

  removeFood(id) {
    this.selected = this.selected.filter(s => s.id !== id);
    this.render();
  }

  clearAll() {
    this.selected = [];
    this.render();
    this.showToast('초기화되었습니다', 'success');
  }

  updateTotals() {
    let totalCalories = 0, totalCarbs = 0, totalProtein = 0, totalFat = 0;

    this.selected.forEach(item => {
      const ratio = item.amount / 100;
      totalCalories += item.calories * ratio;
      totalCarbs += item.carbs * ratio;
      totalProtein += item.protein * ratio;
      totalFat += item.fat * ratio;
    });

    this.elements.totalCalories.textContent = Math.round(totalCalories);
    this.elements.totalCarbs.textContent = Math.round(totalCarbs);
    this.elements.totalProtein.textContent = Math.round(totalProtein);
    this.elements.totalFat.textContent = Math.round(totalFat);

    // 진행 바 업데이트 (일일 권장량 기준)
    this.elements.calBar.style.width = `${Math.min(100, (totalCalories / 2000) * 100)}%`;
    this.elements.carbBar.style.width = `${Math.min(100, (totalCarbs / 300) * 100)}%`;
    this.elements.proteinBar.style.width = `${Math.min(100, (totalProtein / 60) * 100)}%`;
    this.elements.fatBar.style.width = `${Math.min(100, (totalFat / 65) * 100)}%`;
  }

  render() {
    const container = this.elements.selectedFoods;

    if (this.selected.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 0.5rem;">음식을 추가하세요</div>';
      this.updateTotals();
      return;
    }

    container.innerHTML = this.selected.map(item => `
      <div class="selected-item">
        <span>${item.name}</span>
        <input type="number" class="tool-input" value="${item.amount}" min="0" style="text-align: right;" onchange="nutritionCalc.updateAmount(${item.id}, this.value)">
        <button onclick="nutritionCalc.removeFood(${item.id})" style="background: none; border: none; cursor: pointer;"></button>
      </div>
    `).join('') + '<div style="font-size: 0.75rem; color: var(--text-secondary); text-align: right; padding-top: 0.5rem;">(단위: g)</div>';

    this.updateTotals();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const nutritionCalc = new NutritionCalc();
window.NutritionCalc = nutritionCalc;

document.addEventListener('DOMContentLoaded', () => nutritionCalc.init());
