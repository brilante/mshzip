/**
 * 레시피 양 조절기 - ToolBase 기반
 * 레시피 재료 양 자동 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var RecipeScaler = class RecipeScaler extends ToolBase {
  constructor() {
    super('RecipeScaler');
    this.ingredients = [];
    this.targetServings = 4;
    this.presets = {
      pancake: {
        name: '팬케이크',
        servings: 4,
        ingredients: [
          { amount: 200, unit: 'g', name: '밀가루' },
          { amount: 2, unit: '개', name: '달걀' },
          { amount: 250, unit: 'ml', name: '우유' },
          { amount: 30, unit: 'g', name: '설탕' },
          { amount: 5, unit: 'g', name: '베이킹파우더' },
          { amount: 30, unit: 'g', name: '버터 (녹인 것)' },
          { amount: 1, unit: '꼬집', name: '소금' }
        ]
      },
      pasta: {
        name: '크림 파스타',
        servings: 2,
        ingredients: [
          { amount: 200, unit: 'g', name: '파스타 면' },
          { amount: 100, unit: 'g', name: '베이컨' },
          { amount: 200, unit: 'ml', name: '생크림' },
          { amount: 50, unit: 'g', name: '파마산 치즈' },
          { amount: 2, unit: '쪽', name: '마늘' },
          { amount: 1, unit: '큰술', name: '올리브오일' },
          { amount: 0, unit: '약간', name: '소금, 후추' }
        ]
      },
      rice: {
        name: '김치볶음밥',
        servings: 2,
        ingredients: [
          { amount: 2, unit: '공기', name: '밥' },
          { amount: 150, unit: 'g', name: '김치' },
          { amount: 100, unit: 'g', name: '돼지고기' },
          { amount: 2, unit: '개', name: '달걀' },
          { amount: 1, unit: '큰술', name: '참기름' },
          { amount: 1, unit: '큰술', name: '고추장' },
          { amount: 2, unit: '줄기', name: '파' }
        ]
      },
      cookie: {
        name: '초코칩 쿠키',
        servings: 24,
        ingredients: [
          { amount: 280, unit: 'g', name: '밀가루' },
          { amount: 200, unit: 'g', name: '버터' },
          { amount: 150, unit: 'g', name: '설탕' },
          { amount: 100, unit: 'g', name: '황설탕' },
          { amount: 2, unit: '개', name: '달걀' },
          { amount: 200, unit: 'g', name: '초코칩' },
          { amount: 5, unit: 'g', name: '베이킹소다' },
          { amount: 5, unit: 'ml', name: '바닐라 에센스' }
        ]
      }
    };
  }

  init() {
    this.initElements({
      recipeName: 'recipeName',
      originalServings: 'originalServings',
      targetServings: 'targetServings',
      scaleRatio: 'scaleRatio',
      ingredientsList: 'ingredientsList',
      newAmount: 'newAmount',
      newUnit: 'newUnit',
      newName: 'newName'
    });

    this.loadPreset('pancake');

    console.log('[RecipeScaler] 초기화 완료');
    return this;
  }

  loadPreset(type) {
    const preset = this.presets[type];
    if (!preset) return;

    this.elements.recipeName.value = preset.name;
    this.elements.originalServings.value = preset.servings;
    this.targetServings = preset.servings;
    this.ingredients = preset.ingredients.map(i => ({ ...i, originalAmount: i.amount }));

    this.calculate();
    this.showToast(`${preset.name} 레시피 로드됨`, 'success');
  }

  adjustServings(delta) {
    const newValue = this.targetServings + delta;
    if (newValue >= 1 && newValue <= 100) {
      this.targetServings = newValue;
      this.calculate();
    }
  }

  calculate() {
    const original = parseInt(this.elements.originalServings.value) || 1;
    const ratio = this.targetServings / original;

    this.elements.targetServings.textContent = this.targetServings;
    this.elements.scaleRatio.textContent = `×${ratio.toFixed(1)}`;

    this.render(ratio);
  }

  addIngredient() {
    const amount = parseFloat(this.elements.newAmount.value) || 0;
    const unit = this.elements.newUnit.value.trim() || 'g';
    const name = this.elements.newName.value.trim();

    if (!name) {
      this.showToast('재료명을 입력하세요', 'error');
      return;
    }

    this.ingredients.push({ amount, originalAmount: amount, unit, name });

    this.elements.newAmount.value = '';
    this.elements.newUnit.value = '';
    this.elements.newName.value = '';

    this.calculate();
  }

  removeIngredient(index) {
    this.ingredients.splice(index, 1);
    this.calculate();
  }

  formatAmount(amount) {
    if (amount === 0) return '-';
    if (amount < 0.1) return amount.toFixed(2);
    if (amount < 1) return amount.toFixed(1);
    if (Number.isInteger(amount)) return amount.toString();
    return amount.toFixed(1);
  }

  render(ratio) {
    const container = this.elements.ingredientsList;

    if (this.ingredients.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">재료를 추가하세요</div>';
      return;
    }

    container.innerHTML = this.ingredients.map((ing, idx) => {
      const scaledAmount = ing.originalAmount * ratio;

      return `
        <div class="ingredient-item">
          <div class="ingredient-amount">${this.formatAmount(scaledAmount)} ${ing.unit}</div>
          <div class="ingredient-name">${ing.name}</div>
          <button onclick="recipeScaler.removeIngredient(${idx})" style="background: none; border: none; cursor: pointer; opacity: 0.5;"></button>
        </div>
      `;
    }).join('');
  }

  clearAll() {
    this.ingredients = [];
    this.targetServings = 4;
    this.elements.recipeName.value = '';
    this.elements.originalServings.value = 4;
    this.calculate();
    this.showToast('초기화되었습니다', 'success');
  }

  async exportRecipe() {
    const name = this.elements.recipeName.value || '레시피';
    const original = this.elements.originalServings.value;
    const ratio = this.targetServings / parseInt(original);

    let text = `${name}\n`;
    text += `${'='.repeat(30)}\n`;
    text += `${this.targetServings}인분 (원본 ${original}인분 기준 ×${ratio.toFixed(1)})\n\n`;
    text += `[재료]\n`;

    this.ingredients.forEach(ing => {
      const scaled = ing.originalAmount * ratio;
      text += `• ${this.formatAmount(scaled)} ${ing.unit} ${ing.name}\n`;
    });

    try {
      await navigator.clipboard.writeText(text);
      this.showToast('레시피가 클립보드에 복사되었습니다.', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const recipeScaler = new RecipeScaler();
window.RecipeScaler = recipeScaler;

document.addEventListener('DOMContentLoaded', () => recipeScaler.init());
