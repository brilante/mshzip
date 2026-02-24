/**
 * 여행 예산 계산기 - ToolBase 기반
 * 여행 경비 계획 및 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TravelBudget = class TravelBudget extends ToolBase {
  constructor() {
    super('TravelBudget');
    this.categories = [
      { id: 'transport', name: '교통', icon: '', color: '#6366f1', items: [] },
      { id: 'accommodation', name: '숙소', icon: '', color: '#8b5cf6', items: [] },
      { id: 'food', name: '식비', icon: '', color: '#ec4899', items: [] },
      { id: 'activities', name: '관광/액티비티', icon: '', color: '#f59e0b', items: [] },
      { id: 'shopping', name: '쇼핑', icon: '', color: '#10b981', items: [] },
      { id: 'etc', name: '기타', icon: '', color: '#6b7280', items: [] }
    ];

    this.templates = {
      economy: {
        destination: '동남아시아',
        transport: [{ name: '항공권 (저가)', amount: 300000 }],
        accommodation: [{ name: '게스트하우스', amount: 30000, perDay: true }],
        food: [{ name: '현지 식당', amount: 30000, perDay: true }],
        activities: [{ name: '무료 관광지', amount: 50000 }],
        shopping: [{ name: '기념품', amount: 50000 }],
        etc: [{ name: '여행자 보험', amount: 20000 }, { name: '통신비', amount: 30000 }]
      },
      standard: {
        destination: '일본',
        transport: [{ name: '항공권', amount: 400000 }, { name: '현지 교통패스', amount: 50000 }],
        accommodation: [{ name: '비즈니스 호텔', amount: 100000, perDay: true }],
        food: [{ name: '식비', amount: 60000, perDay: true }],
        activities: [{ name: '입장료/체험', amount: 100000 }],
        shopping: [{ name: '쇼핑', amount: 200000 }],
        etc: [{ name: '여행자 보험', amount: 30000 }, { name: '로밍/유심', amount: 30000 }]
      },
      luxury: {
        destination: '유럽',
        transport: [{ name: '비즈니스 항공권', amount: 2000000 }, { name: '렌터카', amount: 500000 }],
        accommodation: [{ name: '5성급 호텔', amount: 400000, perDay: true }],
        food: [{ name: '파인다이닝', amount: 200000, perDay: true }],
        activities: [{ name: '프라이빗 투어', amount: 500000 }],
        shopping: [{ name: '명품 쇼핑', amount: 1000000 }],
        etc: [{ name: '프리미엄 보험', amount: 100000 }, { name: '컨시어지', amount: 200000 }]
      }
    };
  }

  init() {
    this.initElements({
      destination: 'destination',
      tripDays: 'tripDays',
      travelers: 'travelers',
      categoriesSection: 'categoriesSection',
      totalBudget: 'totalBudget',
      perDay: 'perDay',
      perPerson: 'perPerson',
      perPersonDay: 'perPersonDay',
      categoryCount: 'categoryCount'
    });

    this.load();
    this.render();

    console.log('[TravelBudget] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('travel-budget-data');
      if (saved) {
        const data = JSON.parse(saved);
        this.categories = data.categories || this.categories;
        this.elements.destination.value = data.destination || '';
        this.elements.tripDays.value = data.tripDays || 4;
        this.elements.travelers.value = data.travelers || 1;
      }
    } catch (e) {}
  }

  save() {
    const data = {
      destination: this.elements.destination.value,
      tripDays: parseInt(this.elements.tripDays.value) || 1,
      travelers: parseInt(this.elements.travelers.value) || 1,
      categories: this.categories
    };
    localStorage.setItem('travel-budget-data', JSON.stringify(data));
    this.updateSummary();
  }

  loadTemplate(type) {
    const template = this.templates[type];
    if (!template) return;

    this.elements.destination.value = template.destination;

    this.categories.forEach(cat => {
      cat.items = (template[cat.id] || []).map(item => ({
        name: item.name,
        amount: item.amount,
        perDay: item.perDay || false
      }));
    });

    this.save();
    this.render();
    this.showToast('템플릿이 로드되었습니다', 'success');
  }

  clearAll() {
    if (!confirm('모든 예산을 초기화하시겠습니까?')) return;

    this.categories.forEach(cat => cat.items = []);
    this.elements.destination.value = '';
    this.elements.tripDays.value = 4;
    this.elements.travelers.value = 1;

    this.save();
    this.render();
    this.showToast('초기화되었습니다', 'success');
  }

  addItem(categoryId) {
    const nameInput = document.getElementById(`name-${categoryId}`);
    const amountInput = document.getElementById(`amount-${categoryId}`);
    const perDayInput = document.getElementById(`perday-${categoryId}`);

    const name = nameInput.value.trim();
    const amount = parseInt(amountInput.value) || 0;
    const perDay = perDayInput.checked;

    if (!name || amount <= 0) {
      this.showToast('항목명과 금액을 입력하세요', 'error');
      return;
    }

    const category = this.categories.find(c => c.id === categoryId);
    if (category) {
      category.items.push({ name, amount, perDay });
      nameInput.value = '';
      amountInput.value = '';
      perDayInput.checked = false;

      this.save();
      this.render();
    }
  }

  removeItem(categoryId, index) {
    const category = this.categories.find(c => c.id === categoryId);
    if (category) {
      category.items.splice(index, 1);
      this.save();
      this.render();
    }
  }

  getCategoryTotal(category) {
    const days = parseInt(this.elements.tripDays.value) || 1;
    return category.items.reduce((sum, item) => {
      return sum + (item.perDay ? item.amount * days : item.amount);
    }, 0);
  }

  getGrandTotal() {
    return this.categories.reduce((sum, cat) => sum + this.getCategoryTotal(cat), 0);
  }

  formatCurrency(amount) {
    return '₩' + amount.toLocaleString();
  }

  updateSummary() {
    const total = this.getGrandTotal();
    const days = parseInt(this.elements.tripDays.value) || 1;
    const travelers = parseInt(this.elements.travelers.value) || 1;

    let itemCount = 0;
    this.categories.forEach(cat => itemCount += cat.items.length);

    this.elements.totalBudget.textContent = this.formatCurrency(total);
    this.elements.perDay.textContent = this.formatCurrency(Math.round(total / days));
    this.elements.perPerson.textContent = this.formatCurrency(Math.round(total / travelers));
    this.elements.perPersonDay.textContent = this.formatCurrency(Math.round(total / days / travelers));
    this.elements.categoryCount.textContent = `${itemCount}개`;
  }

  render() {
    const container = this.elements.categoriesSection;
    const grandTotal = this.getGrandTotal();

    container.innerHTML = this.categories.map(cat => {
      const catTotal = this.getCategoryTotal(cat);
      const percentage = grandTotal > 0 ? (catTotal / grandTotal * 100) : 0;

      return `
        <div class="category-section">
          <div class="category-header">
            <div class="category-title">
              <span>${cat.icon}</span>
              <span>${cat.name}</span>
            </div>
            <div class="category-total">${this.formatCurrency(catTotal)}</div>
          </div>

          <div class="chart-bar">
            <div class="chart-fill" style="width: ${percentage}%; background: ${cat.color};"></div>
          </div>

          <div style="margin-top: 1rem;">
            ${cat.items.length === 0 ?
              '<div style="color: var(--text-secondary); font-size: 0.85rem; text-align: center; padding: 0.5rem;">항목이 없습니다</div>' :
              cat.items.map((item, idx) => `
                <div class="expense-item">
                  <span style="flex: 1;">${item.name}</span>
                  <span style="color: var(--text-secondary); font-size: 0.8rem;">${item.perDay ? '(1일)' : ''}</span>
                  <span style="font-weight: 500;">${this.formatCurrency(item.amount)}</span>
                  <button onclick="travelBudget.removeItem('${cat.id}', ${idx})" style="background: none; border: none; cursor: pointer; opacity: 0.5;"></button>
                </div>
              `).join('')
            }
          </div>

          <div class="add-expense">
            <input type="text" id="name-${cat.id}" class="tool-input" placeholder="항목명">
            <input type="number" id="amount-${cat.id}" class="tool-input" placeholder="금액">
            <label style="display: flex; align-items: center; gap: 0.25rem; font-size: 0.8rem; white-space: nowrap;">
              <input type="checkbox" id="perday-${cat.id}"> 1일
            </label>
            <button class="tool-btn tool-btn-primary" onclick="travelBudget.addItem('${cat.id}')">추가</button>
          </div>
        </div>
      `;
    }).join('');

    this.updateSummary();
  }

  exportBudget() {
    const destination = this.elements.destination.value || '여행';
    const days = this.elements.tripDays.value;
    const travelers = this.elements.travelers.value;
    const total = this.getGrandTotal();

    let text = `${destination} 여행 예산\n`;
    text += `${'='.repeat(40)}\n`;
    text += `${days}일 / ${travelers}명\n\n`;

    this.categories.forEach(cat => {
      const catTotal = this.getCategoryTotal(cat);
      if (cat.items.length > 0 || catTotal > 0) {
        text += `[${cat.icon} ${cat.name}] ${this.formatCurrency(catTotal)}\n`;
        cat.items.forEach(item => {
          text += `  • ${item.name}: ${this.formatCurrency(item.amount)}${item.perDay ? ' (1일)' : ''}\n`;
        });
        text += '\n';
      }
    });

    text += `${'='.repeat(40)}\n`;
    text += `총 예산: ${this.formatCurrency(total)}\n`;
    text += `1일 평균: ${this.formatCurrency(Math.round(total / days))}\n`;
    text += `1인당: ${this.formatCurrency(Math.round(total / travelers))}\n`;

    this.copyToClipboard(text);
  }
}

// 전역 인스턴스 생성
const travelBudget = new TravelBudget();
window.TravelBudget = travelBudget;

document.addEventListener('DOMContentLoaded', () => travelBudget.init());
