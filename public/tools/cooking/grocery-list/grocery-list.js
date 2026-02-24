/**
 * 장보기 목록 - ToolBase 기반
 * 쇼핑 목록 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var GroceryList = class GroceryList extends ToolBase {
  constructor() {
    super('GroceryList');
    this.items = [];
    this.nextId = 1;
    this.categories = {
      produce: { name: '채소/과일', icon: '' },
      meat: { name: '육류', icon: '' },
      seafood: { name: '해산물', icon: '' },
      dairy: { name: '유제품', icon: '' },
      grain: { name: '곡류', icon: '' },
      sauce: { name: '양념/소스', icon: '' },
      frozen: { name: '냉동식품', icon: '' },
      other: { name: '기타', icon: '' }
    };
  }

  init() {
    this.initElements({
      itemName: 'itemName',
      itemQty: 'itemQty',
      itemCategory: 'itemCategory',
      groceryList: 'groceryList',
      checkedCount: 'checkedCount',
      totalCount: 'totalCount',
      progressPercent: 'progressPercent',
      progressFill: 'progressFill'
    });

    this.load();
    this.render();

    // Enter 키로 추가
    this.on(this.elements.itemName, 'keypress', (e) => {
      if (e.key === 'Enter') this.addItem();
    });

    console.log('[GroceryList] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('grocery-list-items');
      if (saved) {
        const data = JSON.parse(saved);
        this.items = data.items || [];
        this.nextId = data.nextId || 1;
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('grocery-list-items', JSON.stringify({
      items: this.items,
      nextId: this.nextId
    }));
  }

  addItem() {
    const name = this.elements.itemName.value.trim();
    if (!name) {
      this.showToast('품목 이름을 입력하세요', 'error');
      return;
    }

    this.items.push({
      id: this.nextId++,
      name,
      qty: this.elements.itemQty.value.trim() || '',
      category: this.elements.itemCategory.value,
      checked: false
    });

    this.elements.itemName.value = '';
    this.elements.itemQty.value = '';
    this.elements.itemName.focus();

    this.save();
    this.render();
  }

  toggleItem(id) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.checked = !item.checked;
      this.save();
      this.render();
    }
  }

  deleteItem(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
    this.render();
  }

  clearChecked() {
    const checkedCount = this.items.filter(i => i.checked).length;
    if (checkedCount === 0) return;

    this.items = this.items.filter(i => !i.checked);
    this.save();
    this.render();
    this.showToast('체크된 항목 삭제됨', 'success');
  }

  clearAll() {
    if (this.items.length === 0) return;
    if (!confirm('모든 항목을 삭제하시겠습니까?')) return;

    this.items = [];
    this.save();
    this.render();
    this.showToast('전체 삭제됨', 'success');
  }

  async exportList() {
    if (this.items.length === 0) {
      this.showToast('목록이 비어있습니다', 'error');
      return;
    }

    let text = '장보기 목록\n';
    text += '='.repeat(20) + '\n\n';

    const grouped = {};
    this.items.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    Object.entries(grouped).forEach(([cat, items]) => {
      const catInfo = this.categories[cat];
      text += `[${catInfo.icon} ${catInfo.name}]\n`;
      items.forEach(item => {
        const check = item.checked ? '' : '';
        const qty = item.qty ? ` (${item.qty})` : '';
        text += `${check} ${item.name}${qty}\n`;
      });
      text += '\n';
    });

    try {
      await navigator.clipboard.writeText(text);
      this.showToast('목록이 클립보드에 복사되었습니다.', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  updateProgress() {
    const total = this.items.length;
    const checked = this.items.filter(i => i.checked).length;
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

    this.elements.checkedCount.textContent = checked;
    this.elements.totalCount.textContent = total;
    this.elements.progressPercent.textContent = `${percent}%`;
    this.elements.progressFill.style.width = `${percent}%`;
  }

  render() {
    const container = this.elements.groceryList;

    if (this.items.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 2rem;">장보기 목록이 비어있습니다</div>';
      this.updateProgress();
      return;
    }

    // 카테고리별 그룹핑
    const grouped = {};
    this.items.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    container.innerHTML = Object.entries(grouped).map(([cat, items]) => {
      const catInfo = this.categories[cat];
      const checkedCount = items.filter(i => i.checked).length;

      return `
        <div class="category-section">
          <div class="category-header">
            <div class="category-title">${catInfo.icon} ${catInfo.name}</div>
            <div class="category-count">${checkedCount}/${items.length}</div>
          </div>
          ${items.map(item => `
            <div class="grocery-item ${item.checked ? 'checked' : ''}">
              <input type="checkbox" class="item-checkbox" ${item.checked ? 'checked' : ''} onchange="groceryList.toggleItem(${item.id})">
              <span class="item-name">${item.name}</span>
              ${item.qty ? `<span class="item-qty">${item.qty}</span>` : ''}
              <button class="item-delete" onclick="groceryList.deleteItem(${item.id})"></button>
            </div>
          `).join('')}
        </div>
      `;
    }).join('');

    this.updateProgress();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const groceryList = new GroceryList();
window.GroceryList = groceryList;

document.addEventListener('DOMContentLoaded', () => groceryList.init());
