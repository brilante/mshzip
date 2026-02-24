/**
 * 단가 비교 계산기 - ToolBase 기반
 * 상품별 단위당 가격 비교
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var UnitPriceCalc = class UnitPriceCalc extends ToolBase {
  constructor() {
    super('UnitPriceCalc');
    this.items = [];
  }

  init() {
    this.initElements({
      itemName: 'itemName',
      itemPrice: 'itemPrice',
      itemQuantity: 'itemQuantity',
      unitType: 'unitType',
      itemList: 'itemList'
    });

    this.load();
    this.render();

    console.log('[UnitPriceCalc] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('unit-price-calc-data');
      if (saved) {
        this.items = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('unit-price-calc-data', JSON.stringify(this.items));
  }

  add() {
    const name = this.elements.itemName.value.trim();
    const price = parseFloat(this.elements.itemPrice.value);
    const quantity = parseFloat(this.elements.itemQuantity.value);

    if (!name) {
      this.showToast('상품명을 입력하세요', 'error');
      return;
    }
    if (isNaN(price) || price <= 0) {
      this.showToast('올바른 가격을 입력하세요', 'error');
      return;
    }
    if (isNaN(quantity) || quantity <= 0) {
      this.showToast('올바른 수량을 입력하세요', 'error');
      return;
    }

    this.items.push({
      id: Date.now(),
      name: name,
      price: price,
      quantity: quantity
    });

    this.save();
    this.render();

    this.elements.itemName.value = '';
    this.elements.itemPrice.value = '';
    this.elements.itemQuantity.value = '';
    this.showToast('상품이 추가되었습니다', 'success');
  }

  remove(id) {
    this.items = this.items.filter(item => item.id !== id);
    this.save();
    this.render();
  }

  getUnitPrice(item) {
    return item.price / item.quantity;
  }

  formatPrice(price) {
    return new Intl.NumberFormat('ko-KR').format(Math.round(price * 100) / 100);
  }

  render() {
    const list = this.elements.itemList;
    const unit = this.elements.unitType.value;

    if (this.items.length === 0) {
      list.innerHTML = `
        <div class="util-panel" style="text-align: center; color: var(--text-secondary);">
          상품을 추가하여 단가를 비교하세요
        </div>
      `;
      return;
    }

    let minUnitPrice = Infinity;
    this.items.forEach(item => {
      const unitPrice = this.getUnitPrice(item);
      if (unitPrice < minUnitPrice) {
        minUnitPrice = unitPrice;
      }
    });

    list.innerHTML = this.items.map(item => {
      const unitPrice = this.getUnitPrice(item);
      const isBest = this.items.length > 1 && unitPrice === minUnitPrice;

      return `
        <div class="item-card ${isBest ? 'best-deal' : ''}" data-id="${item.id}">
          ${isBest ? '<div class="best-badge">최저가</div>' : ''}
          <span class="item-delete" onclick="unitPriceCalc.remove(${item.id})"></span>
          <div class="item-row">
            <div class="item-name">${this.escapeHtml(item.name)}</div>
            <div style="text-align: right;">${this.formatPrice(item.price)}원</div>
            <div style="text-align: right;">${item.quantity}${unit}</div>
          </div>
          <div class="item-price-info">
            <div class="unit-label">단위당 가격</div>
            <div class="unit-price">${this.formatPrice(unitPrice)}원/${unit}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 인스턴스 생성
const unitPriceCalc = new UnitPriceCalc();
window.UnitPriceCalc = unitPriceCalc;

document.addEventListener('DOMContentLoaded', () => unitPriceCalc.init());
