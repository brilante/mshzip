/**
 * 아기 비용 계산기 - ToolBase 기반
 * 출산 및 육아 비용 추정
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class BabyCost extends ToolBase {
  constructor() {
    super('BabyCost');
  }

  init() {
    this.initElements({
      period: 'period',
      birthMedical: 'birthMedical',
      birthGear: 'birthGear',
      birthFurniture: 'birthFurniture',
      monthlyFood: 'monthlyFood',
      monthlyDiaper: 'monthlyDiaper',
      monthlyClothes: 'monthlyClothes',
      monthlyMedical: 'monthlyMedical',
      eduDaycare: 'eduDaycare',
      eduToys: 'eduToys',
      totalCost: 'totalCost',
      monthlyCost: 'monthlyCost',
      dailyCost: 'dailyCost',
      birthTotal: 'birthTotal',
      monthlyTotal: 'monthlyTotal',
      eduTotal: 'eduTotal'
    });

    this.calculate();

    console.log('[BabyCost] 초기화 완료');
    return this;
  }

  calculate() {
    const period = parseInt(this.elements.period.value) || 3;
    const months = period * 12;

    // 출산 준비 (일회성)
    const birthMedical = parseInt(this.elements.birthMedical.value) || 0;
    const birthGear = parseInt(this.elements.birthGear.value) || 0;
    const birthFurniture = parseInt(this.elements.birthFurniture.value) || 0;
    const birthTotal = birthMedical + birthGear + birthFurniture;

    // 월간 고정 지출
    const monthlyFood = parseInt(this.elements.monthlyFood.value) || 0;
    const monthlyDiaper = parseInt(this.elements.monthlyDiaper.value) || 0;
    const monthlyClothes = parseInt(this.elements.monthlyClothes.value) || 0;
    const monthlyMedical = parseInt(this.elements.monthlyMedical.value) || 0;
    const monthlyFixed = monthlyFood + monthlyDiaper + monthlyClothes + monthlyMedical;

    // 교육/돌봄 (12개월 이후 시작으로 가정)
    const eduDaycare = parseInt(this.elements.eduDaycare.value) || 0;
    const eduToys = parseInt(this.elements.eduToys.value) || 0;
    const monthlyEdu = eduDaycare + eduToys;

    // 교육비는 12개월 이후부터 적용
    const eduMonths = Math.max(0, months - 12);

    // 총계 계산
    const monthlyTotalFixed = monthlyFixed * months;
    const eduTotalFixed = monthlyEdu * eduMonths;
    const totalCost = birthTotal + monthlyTotalFixed + eduTotalFixed;
    const monthlyCost = Math.round(totalCost / months);
    const dailyCost = Math.round(monthlyCost / 30);

    // 결과 표시
    this.elements.totalCost.textContent = this.formatCurrency(totalCost) + '원';
    this.elements.monthlyCost.textContent = this.formatCurrency(monthlyCost) + '원';
    this.elements.dailyCost.textContent = this.formatCurrency(dailyCost) + '원';

    // 카테고리별 합계
    this.elements.birthTotal.textContent = this.formatCurrency(birthTotal) + '원';
    this.elements.monthlyTotal.textContent = this.formatCurrency(monthlyTotalFixed) + '원';
    this.elements.eduTotal.textContent = this.formatCurrency(eduTotalFixed) + '원';
  }

  formatCurrency(value) {
    return Math.round(value).toLocaleString();
  }
}

// 전역 인스턴스 생성
const babyCost = new BabyCost();
window.BabyCost = babyCost;

// 전역 함수 (HTML onclick 호환)
function calculate() { babyCost.calculate(); }

document.addEventListener('DOMContentLoaded', () => babyCost.init());
