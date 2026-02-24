/**
 * 목재 계산기 - ToolBase 기반
 * 필요한 목재량 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var WoodCalc = class WoodCalc extends ToolBase {
  constructor() {
    super('WoodCalc');
  }

  init() {
    this.initElements({
      woodList: 'woodList',
      wastePercent: 'wastePercent',
      pricePerCubic: 'pricePerCubic',
      density: 'density',
      totalVolume: 'totalVolume',
      totalWithWaste: 'totalWithWaste',
      totalWeight: 'totalWeight',
      totalPrice: 'totalPrice'
    });

    this.calculate();
    console.log('[WoodCalc] 초기화 완료');
    return this;
  }

  addItem() {
    const item = document.createElement('div');
    item.className = 'wood-item';
    item.innerHTML = `
      <input type="number" class="tool-input wood-width" placeholder="폭 (mm)" oninput="woodCalc.calculate()">
      <span>×</span>
      <input type="number" class="tool-input wood-height" placeholder="높이 (mm)" oninput="woodCalc.calculate()">
      <span>×</span>
      <input type="number" class="tool-input wood-length" placeholder="길이 (mm)" oninput="woodCalc.calculate()">
      <span>×</span>
      <input type="number" class="tool-input wood-qty" placeholder="수량" value="1" min="1" oninput="woodCalc.calculate()">
      <button class="tool-btn tool-btn-secondary" onclick="woodCalc.removeItem(this)" style="padding: 0.5rem;"></button>
    `;
    this.elements.woodList.appendChild(item);
  }

  removeItem(btn) {
    if (this.elements.woodList.children.length > 1) {
      btn.parentElement.remove();
      this.calculate();
    } else {
      this.showToast('최소 1개의 항목이 필요합니다', 'error');
    }
  }

  calculate() {
    let totalVolume = 0;

    const items = document.querySelectorAll('.wood-item');
    items.forEach(item => {
      const width = parseFloat(item.querySelector('.wood-width').value) || 0;
      const height = parseFloat(item.querySelector('.wood-height').value) || 0;
      const length = parseFloat(item.querySelector('.wood-length').value) || 0;
      const qty = parseInt(item.querySelector('.wood-qty').value) || 1;

      // mm → m 변환 후 체적 계산
      const volume = (width / 1000) * (height / 1000) * (length / 1000) * qty;
      totalVolume += volume;
    });

    const wastePercent = parseFloat(this.elements.wastePercent.value) || 10;
    const pricePerCubic = parseFloat(this.elements.pricePerCubic.value) || 0;
    const density = parseFloat(this.elements.density.value) || 600;

    const totalWithWaste = totalVolume * (1 + wastePercent / 100);
    const totalWeight = totalWithWaste * density;
    const totalPrice = totalWithWaste * pricePerCubic;

    this.elements.totalVolume.textContent = totalVolume.toFixed(4);
    this.elements.totalWithWaste.textContent = totalWithWaste.toFixed(4);
    this.elements.totalWeight.textContent = totalWeight.toFixed(1);
    this.elements.totalPrice.textContent = Math.round(totalPrice).toLocaleString();
  }

  reset() {
    this.elements.woodList.innerHTML = `
      <div class="wood-item">
        <input type="number" class="tool-input wood-width" placeholder="폭 (mm)" oninput="woodCalc.calculate()">
        <span>×</span>
        <input type="number" class="tool-input wood-height" placeholder="높이 (mm)" oninput="woodCalc.calculate()">
        <span>×</span>
        <input type="number" class="tool-input wood-length" placeholder="길이 (mm)" oninput="woodCalc.calculate()">
        <span>×</span>
        <input type="number" class="tool-input wood-qty" placeholder="수량" value="1" min="1" oninput="woodCalc.calculate()">
        <button class="tool-btn tool-btn-secondary" onclick="woodCalc.removeItem(this)" style="padding: 0.5rem;"></button>
      </div>
    `;
    this.elements.wastePercent.value = 10;
    this.elements.pricePerCubic.value = '';
    this.elements.density.value = 600;
    this.calculate();
    this.showToast('초기화되었습니다', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const woodCalc = new WoodCalc();
window.WoodCalc = woodCalc;

document.addEventListener('DOMContentLoaded', () => woodCalc.init());
