/**
 * 프로젝트 비용 계산기 - ToolBase 기반
 * DIY 프로젝트 예산 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ProjectCost = class ProjectCost extends ToolBase {
  constructor() {
    super('ProjectCost');
    this.items = {
      materials: [],
      tools: [],
      labor: [],
      other: []
    };
  }

  init() {
    this.initElements({
      projectName: 'projectName',
      budget: 'budget',
      materialsList: 'materialsList',
      toolsList: 'toolsList',
      laborList: 'laborList',
      otherList: 'otherList',
      materialsTotal: 'materialsTotal',
      toolsTotal: 'toolsTotal',
      laborTotal: 'laborTotal',
      otherTotal: 'otherTotal',
      totalCost: 'totalCost',
      budgetAmount: 'budgetAmount',
      remaining: 'remaining',
      budgetPercent: 'budgetPercent',
      budgetFill: 'budgetFill'
    });

    this.load();
    this.render();

    console.log('[ProjectCost] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('project-cost-data');
      if (saved) {
        const data = JSON.parse(saved);
        this.items = data.items || { materials: [], tools: [], labor: [], other: [] };
        this.elements.projectName.value = data.projectName || '';
        this.elements.budget.value = data.budget || '';
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('project-cost-data', JSON.stringify({
      items: this.items,
      projectName: this.elements.projectName.value,
      budget: this.elements.budget.value
    }));
  }

  addItem(category) {
    this.items[category].push({
      id: Date.now(),
      name: '',
      quantity: 1,
      price: 0
    });
    this.render();
    this.save();
  }

  updateItem(category, id, field, value) {
    const item = this.items[category].find(i => i.id === id);
    if (item) {
      item[field] = field === 'name' ? value : parseFloat(value) || 0;
      this.calculate();
      this.save();
    }
  }

  removeItem(category, id) {
    this.items[category] = this.items[category].filter(i => i.id !== id);
    this.render();
    this.save();
  }

  render() {
    const categories = ['materials', 'tools', 'labor', 'other'];
    const listIds = {
      materials: 'materialsList',
      tools: 'toolsList',
      labor: 'laborList',
      other: 'otherList'
    };

    categories.forEach(category => {
      const list = this.elements[listIds[category]];
      const items = this.items[category];

      if (items.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); font-size: 0.85rem; padding: 0.5rem;">항목이 없습니다</div>';
      } else {
        list.innerHTML = items.map(item => `
          <div class="item-row">
            <input type="text" class="tool-input" placeholder="항목명" value="${item.name}"
              oninput="projectCost.updateItem('${category}', ${item.id}, 'name', this.value)">
            <input type="number" class="tool-input" placeholder="수량" value="${item.quantity || ''}" min="1"
              oninput="projectCost.updateItem('${category}', ${item.id}, 'quantity', this.value)">
            <input type="number" class="tool-input" placeholder="단가" value="${item.price || ''}"
              oninput="projectCost.updateItem('${category}', ${item.id}, 'price', this.value)">
            <button onclick="projectCost.removeItem('${category}', ${item.id})"
              style="background: none; border: none; cursor: pointer; opacity: 0.5; font-size: 1rem;"></button>
          </div>
        `).join('');
      }
    });

    this.calculate();
  }

  calculate() {
    const categories = ['materials', 'tools', 'labor', 'other'];
    let totalCost = 0;

    categories.forEach(category => {
      const categoryTotal = this.items[category].reduce((sum, item) => {
        return sum + (item.quantity * item.price);
      }, 0);

      this.elements[category + 'Total'].textContent = categoryTotal.toLocaleString() + '원';
      totalCost += categoryTotal;
    });

    const budget = parseFloat(this.elements.budget.value) || 0;
    const remaining = budget - totalCost;
    const percent = budget > 0 ? Math.min(100, (totalCost / budget) * 100) : 0;

    this.elements.totalCost.textContent = totalCost.toLocaleString() + '원';
    this.elements.budgetAmount.textContent = budget.toLocaleString() + '원';
    this.elements.remaining.textContent = remaining.toLocaleString() + '원';
    this.elements.remaining.style.color = remaining < 0 ? '#ef4444' : 'white';

    this.elements.budgetPercent.textContent = percent.toFixed(1) + '%';

    this.elements.budgetFill.style.width = percent + '%';
    this.elements.budgetFill.classList.toggle('budget-warning', percent > 100);
  }

  async exportData() {
    const projectName = this.elements.projectName.value || '프로젝트';
    const budget = parseFloat(this.elements.budget.value) || 0;

    let text = `${projectName} 비용 내역\n`;
    text += '='.repeat(30) + '\n\n';

    const categoryNames = {
      materials: '재료비',
      tools: '공구비',
      labor: '인건비',
      other: '기타'
    };

    let totalCost = 0;

    Object.entries(this.items).forEach(([category, items]) => {
      if (items.length === 0) return;

      text += `${categoryNames[category]}\n`;
      items.forEach(item => {
        const subtotal = item.quantity * item.price;
        totalCost += subtotal;
        text += `  - ${item.name || '(미입력)'}: ${item.quantity} × ${item.price.toLocaleString()}원 = ${subtotal.toLocaleString()}원\n`;
      });
      text += '\n';
    });

    text += '='.repeat(30) + '\n';
    text += `총 비용: ${totalCost.toLocaleString()}원\n`;
    text += `예산: ${budget.toLocaleString()}원\n`;
    text += `잔액: ${(budget - totalCost).toLocaleString()}원\n`;

    try {
      await navigator.clipboard.writeText(text);
      this.showToast('클립보드에 복사되었습니다', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  clearAll() {
    if (!confirm('모든 데이터를 초기화하시겠습니까?')) return;

    this.items = {
      materials: [],
      tools: [],
      labor: [],
      other: []
    };

    this.elements.projectName.value = '';
    this.elements.budget.value = '';

    localStorage.removeItem('project-cost-data');
    this.render();
    this.showToast('초기화되었습니다', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const projectCost = new ProjectCost();
window.ProjectCost = projectCost;

document.addEventListener('DOMContentLoaded', () => projectCost.init());
