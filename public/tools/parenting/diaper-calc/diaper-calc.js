/**
 * 기저귀 계산기 - ToolBase 기반
 * 기저귀 사용량 및 비용 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class DiaperCalc extends ToolBase {
  constructor() {
    super('DiaperCalc');
    this.sizeMap = {
      nb: 'Nb',
      s: 'S',
      m: 'M',
      l: 'L',
      xl: 'Xl'
    };
  }

  init() {
    this.initElements({
      ageMonths: 'ageMonths',
      diaperSize: 'diaperSize',
      dailyUsage: 'dailyUsage',
      pricePerUnit: 'pricePerUnit',
      monthlyCost: 'monthlyCost',
      monthlyCount: 'monthlyCount',
      yearlyCount: 'yearlyCount',
      weeklyCost: 'weeklyCost',
      yearlyCost: 'yearlyCost'
    });

    this.calculate();

    console.log('[DiaperCalc] 초기화 완료');
    return this;
  }

  calculate() {
    const ageMonths = parseInt(this.elements.ageMonths.value) || 0;
    const size = this.elements.diaperSize.value;
    const dailyUsage = parseInt(this.elements.dailyUsage.value) || 8;
    const pricePerUnit = parseInt(this.elements.pricePerUnit.value) || 300;

    // 계산
    const monthlyCount = dailyUsage * 30;
    const yearlyCount = dailyUsage * 365;
    const weeklyCost = dailyUsage * 7 * pricePerUnit;
    const monthlyCost = monthlyCount * pricePerUnit;
    const yearlyCost = yearlyCount * pricePerUnit;

    // 결과 표시
    this.elements.monthlyCost.textContent = this.formatCurrency(monthlyCost) + '원';
    this.elements.monthlyCount.textContent = monthlyCount + '개';
    this.elements.yearlyCount.textContent = yearlyCount.toLocaleString() + '개';
    this.elements.weeklyCost.textContent = this.formatCurrency(weeklyCost) + '원';
    this.elements.yearlyCost.textContent = this.formatCurrency(yearlyCost) + '원';

    // 사이즈 가이드 하이라이트
    document.querySelectorAll('.size-item').forEach(item => {
      item.classList.remove('active');
    });
    const sizeId = 'size' + this.sizeMap[size];
    const sizeEl = document.getElementById(sizeId);
    if (sizeEl) sizeEl.classList.add('active');

    // 월령에 따른 추천 사용량
    this.suggestUsage(ageMonths);
  }

  suggestUsage(months) {
    let suggested;
    if (months < 1) suggested = 11;
    else if (months < 3) suggested = 9;
    else if (months < 6) suggested = 7;
    else if (months < 12) suggested = 6;
    else suggested = 5;

    // 추천 사용량과 현재 입력값이 다르면 안내
    const current = parseInt(this.elements.dailyUsage.value) || 0;
    if (Math.abs(current - suggested) > 3) {
      // 큰 차이가 있을 때 시각적 힌트 (선택적)
    }
  }

  formatCurrency(value) {
    return Math.round(value).toLocaleString();
  }
}

// 전역 인스턴스 생성
const diaperCalc = new DiaperCalc();
window.DiaperCalc = diaperCalc;

// 전역 함수 (HTML onclick 호환)
function calculate() { diaperCalc.calculate(); }

document.addEventListener('DOMContentLoaded', () => diaperCalc.init());
