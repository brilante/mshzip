/**
 * 팁 계산기 - ToolBase 기반
 * 식당/서비스 팁과 인당 금액 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TipCalc = class TipCalc extends ToolBase {
  constructor() {
    super('TipCalc');
    this.tipPercent = 15;
    this.people = 2;
    this.currency = 'KRW';
    this.currencies = {
      KRW: { symbol: '₩', decimals: 0, name: '원' },
      USD: { symbol: '$', decimals: 2, name: '달러' },
      EUR: { symbol: '€', decimals: 2, name: '유로' },
      JPY: { symbol: '¥', decimals: 0, name: '엔' }
    };
  }

  init() {
    this.initElements({
      billAmount: 'billAmount',
      customTip: 'customTip',
      peopleCount: 'peopleCount',
      tipAmount: 'tipAmount',
      totalAmount: 'totalAmount',
      perPerson: 'perPerson'
    });

    this.calculate();
    console.log('[TipCalc] 초기화 완료');
    return this;
  }

  setCurrency(currency) {
    this.currency = currency;
    document.querySelectorAll('.currency-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.currency === currency);
    });
    this.calculate();
  }

  setTip(percent) {
    this.tipPercent = percent;
    document.querySelectorAll('.tip-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.tip) === percent);
    });
    this.elements.customTip.value = percent;
    this.calculate();
  }

  setCustomTip() {
    const customValue = parseFloat(this.elements.customTip.value);
    if (!isNaN(customValue) && customValue >= 0 && customValue <= 100) {
      this.tipPercent = customValue;
      document.querySelectorAll('.tip-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.tip) === customValue);
      });
      this.calculate();
    }
  }

  adjustPeople(delta) {
    this.people = Math.max(1, this.people + delta);
    this.elements.peopleCount.textContent = this.people;
    this.calculate();
  }

  calculate() {
    const billAmount = parseFloat(this.elements.billAmount.value) || 0;
    const tipAmount = billAmount * (this.tipPercent / 100);
    const totalAmount = billAmount + tipAmount;
    const perPerson = totalAmount / this.people;

    // 결과 표시
    this.elements.tipAmount.textContent = this.formatCurrency(tipAmount);
    this.elements.totalAmount.textContent = this.formatCurrency(totalAmount);
    this.elements.perPerson.textContent = this.formatCurrency(perPerson);
  }

  formatCurrency(value) {
    const curr = this.currencies[this.currency];
    const formatted = value.toLocaleString('ko-KR', {
      minimumFractionDigits: curr.decimals,
      maximumFractionDigits: curr.decimals
    });

    return curr.symbol + formatted;
  }

  reset() {
    this.elements.billAmount.value = '';
    this.elements.customTip.value = '15';
    this.tipPercent = 15;
    this.people = 2;
    this.currency = 'KRW';

    this.elements.peopleCount.textContent = '2';

    document.querySelectorAll('.tip-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tip === '15');
    });

    document.querySelectorAll('.currency-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.currency === 'KRW');
    });

    this.calculate();
    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const tipCalc = new TipCalc();
window.TipCalc = tipCalc;

document.addEventListener('DOMContentLoaded', () => tipCalc.init());
console.log('[TipCalc] 모듈 로드 완료');
