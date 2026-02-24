/**
 * 레시피 원가 계산기 - ToolBase 기반
 * 레시피 재료비 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var RecipeCost = class RecipeCost extends ToolBase {
  constructor() {
    super('RecipeCost');
    this.ingredients = [];
    this.nextId = 1;
  }

  init() {
    this.initElements({
      recipeName: 'recipeName',
      servings: 'servings',
      addName: 'addName',
      addUsed: 'addUsed',
      addTotal: 'addTotal',
      addPrice: 'addPrice',
      ingredientsList: 'ingredientsList',
      totalCost: 'totalCost',
      costPerServing: 'costPerServing',
      ingredientCount: 'ingredientCount',
      avgCost: 'avgCost'
    });

    this.load();
    this.render();

    console.log('[RecipeCost] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('recipe-cost-data');
      if (saved) {
        const data = JSON.parse(saved);
        this.ingredients = data.ingredients || [];
        this.nextId = data.nextId || 1;
        this.elements.recipeName.value = data.recipeName || '';
        this.elements.servings.value = data.servings || 2;
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('recipe-cost-data', JSON.stringify({
      ingredients: this.ingredients,
      nextId: this.nextId,
      recipeName: this.elements.recipeName.value,
      servings: this.elements.servings.value
    }));
  }

  parseAmount(str) {
    // "100g", "200ml" 등에서 숫자만 추출
    const match = str.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }

  addIngredient() {
    const name = this.elements.addName.value.trim();
    const used = this.elements.addUsed.value.trim();
    const total = this.elements.addTotal.value.trim();
    const price = parseInt(this.elements.addPrice.value) || 0;

    if (!name || !used || !total || price <= 0) {
      this.showToast('모든 항목을 입력하세요', 'error');
      return;
    }

    const usedAmount = this.parseAmount(used);
    const totalAmount = this.parseAmount(total);

    if (usedAmount <= 0 || totalAmount <= 0) {
      this.showToast('올바른 수량을 입력하세요', 'error');
      return;
    }

    const cost = Math.round((usedAmount / totalAmount) * price);

    this.ingredients.push({
      id: this.nextId++,
      name,
      used,
      total,
      price,
      cost
    });

    // 입력 초기화
    this.elements.addName.value = '';
    this.elements.addUsed.value = '';
    this.elements.addTotal.value = '';
    this.elements.addPrice.value = '';

    this.save();
    this.render();
  }

  removeIngredient(id) {
    this.ingredients = this.ingredients.filter(i => i.id !== id);
    this.save();
    this.render();
  }

  loadSample() {
    this.elements.recipeName.value = '크림 파스타';
    this.elements.servings.value = 2;

    this.ingredients = [
      { id: 1, name: '파스타 면', used: '200g', total: '500g', price: 3500, cost: 1400 },
      { id: 2, name: '베이컨', used: '100g', total: '200g', price: 6000, cost: 3000 },
      { id: 3, name: '생크림', used: '200ml', total: '500ml', price: 4500, cost: 1800 },
      { id: 4, name: '파마산 치즈', used: '30g', total: '100g', price: 8000, cost: 2400 },
      { id: 5, name: '마늘', used: '2쪽', total: '10쪽', price: 2000, cost: 400 },
      { id: 6, name: '올리브오일', used: '30ml', total: '500ml', price: 12000, cost: 720 }
    ];
    this.nextId = 7;

    this.save();
    this.render();
    this.showToast('샘플 로드됨', 'success');
  }

  clearAll() {
    if (this.ingredients.length === 0) return;
    if (!confirm('모든 재료를 초기화하시겠습니까?')) return;

    this.ingredients = [];
    this.elements.recipeName.value = '';
    this.elements.servings.value = 2;

    this.save();
    this.render();
    this.showToast('초기화됨', 'success');
  }

  calculate() {
    const totalCost = this.ingredients.reduce((sum, i) => sum + i.cost, 0);
    const servings = parseInt(this.elements.servings.value) || 1;
    const count = this.ingredients.length;

    this.elements.totalCost.textContent = `₩${totalCost.toLocaleString()}`;
    this.elements.costPerServing.textContent = `₩${Math.round(totalCost / servings).toLocaleString()}`;
    this.elements.ingredientCount.textContent = count;
    this.elements.avgCost.textContent = count > 0 ? `₩${Math.round(totalCost / count).toLocaleString()}` : '₩0';
  }

  async exportCost() {
    const recipeName = this.elements.recipeName.value || '레시피';
    const servings = this.elements.servings.value;
    const totalCost = this.ingredients.reduce((sum, i) => sum + i.cost, 0);

    let text = `${recipeName} 원가 계산\n`;
    text += '='.repeat(30) + '\n';
    text += `${servings}인분 기준\n\n`;

    text += '[재료별 원가]\n';
    this.ingredients.forEach(i => {
      text += `• ${i.name}: ₩${i.cost.toLocaleString()} (${i.used}/${i.total})\n`;
    });

    text += `\n총 재료비: ₩${totalCost.toLocaleString()}\n`;
    text += `1인분 원가: ₩${Math.round(totalCost / servings).toLocaleString()}\n`;

    try {
      await navigator.clipboard.writeText(text);
      this.showToast('원가 정보가 클립보드에 복사되었습니다.', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  render() {
    const container = this.elements.ingredientsList;

    if (this.ingredients.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">재료를 추가하세요</div>';
      this.calculate();
      return;
    }

    container.innerHTML = this.ingredients.map(i => `
      <div class="ingredient-item">
        <span>${i.name}</span>
        <span style="font-size: 0.85rem;">${i.used}</span>
        <span style="font-size: 0.85rem; color: var(--text-secondary);">${i.total}</span>
        <span style="font-weight: 600; color: var(--primary);">₩${i.cost.toLocaleString()}</span>
        <button onclick="recipeCost.removeIngredient(${i.id})" style="background: none; border: none; cursor: pointer; opacity: 0.5;"></button>
      </div>
    `).join('');

    this.calculate();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const recipeCost = new RecipeCost();
window.RecipeCost = recipeCost;

document.addEventListener('DOMContentLoaded', () => recipeCost.init());
