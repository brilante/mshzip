/**
 * 1인분 계산기 - ToolBase 기반
 * 인원수에 맞는 재료 양 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PortionCalc = class PortionCalc extends ToolBase {
  constructor() {
    super('PortionCalc');
    this.portions = 4;
    // 1인분 기준 양
    this.foods = {
      '주식': [
        { name: '쌀 (밥)', base: 80, unit: 'g' },
        { name: '파스타 (건면)', base: 100, unit: 'g' },
        { name: '국수 (건면)', base: 80, unit: 'g' },
        { name: '라면', base: 1, unit: '개' }
      ],
      '육류': [
        { name: '소고기', base: 150, unit: 'g' },
        { name: '돼지고기', base: 150, unit: 'g' },
        { name: '닭고기', base: 200, unit: 'g' },
        { name: '삼겹살', base: 180, unit: 'g' }
      ],
      '해산물': [
        { name: '생선 (필레)', base: 150, unit: 'g' },
        { name: '새우', base: 100, unit: 'g' },
        { name: '조개류', base: 150, unit: 'g' },
        { name: '오징어', base: 100, unit: 'g' }
      ],
      '채소': [
        { name: '샐러드 채소', base: 80, unit: 'g' },
        { name: '볶음용 채소', base: 150, unit: 'g' },
        { name: '감자', base: 150, unit: 'g' },
        { name: '양배추', base: 100, unit: 'g' }
      ],
      '국/찌개': [
        { name: '된장찌개 국물', base: 300, unit: 'ml' },
        { name: '미역국', base: 350, unit: 'ml' },
        { name: '김치찌개', base: 300, unit: 'ml' },
        { name: '라면 국물', base: 500, unit: 'ml' }
      ]
    };
  }

  init() {
    this.initElements({
      portionValue: 'portionValue',
      categoriesList: 'categoriesList',
      customAmount: 'customAmount',
      customUnit: 'customUnit',
      customResult: 'customResult'
    });

    this.render();
    this.updateCustom();

    this.on(this.elements.customAmount, 'input', () => this.updateCustom());

    console.log('[PortionCalc] 초기화 완료');
    return this;
  }

  adjust(delta) {
    const newValue = this.portions + delta;
    if (newValue >= 1 && newValue <= 50) {
      this.portions = newValue;
      this.elements.portionValue.textContent = this.portions;
      this.render();
      this.updateCustom();
    }
  }

  updateCustom() {
    const amount = parseFloat(this.elements.customAmount.value) || 0;
    const unit = this.elements.customUnit.value || '';
    const total = amount * this.portions;

    this.elements.customResult.textContent = `${total} ${unit}`;
  }

  render() {
    const container = this.elements.categoriesList;

    container.innerHTML = Object.entries(this.foods).map(([category, items]) => `
      <div class="food-category">
        <div class="category-title">${category}</div>
        <div class="food-grid">
          ${items.map(item => `
            <div class="food-item">
              <div class="food-name">${item.name}</div>
              <div class="food-portion">${item.base * this.portions}</div>
              <div class="food-unit">${item.unit}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const portionCalc = new PortionCalc();
window.PortionCalc = portionCalc;

document.addEventListener('DOMContentLoaded', () => portionCalc.init());
