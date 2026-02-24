/**
 * 중고차 시세 계산기 - ToolBase 기반
 * 차량 감가상각 예측
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class CarValue extends ToolBase {
  constructor() {
    super('CarValue');
    // 상태별 보정 계수
    this.conditionFactors = {
      excellent: 1.05,   // +5%
      good: 1.00,        // 기준
      fair: 0.92,        // -8%
      poor: 0.80         // -20%
    };
  }

  init() {
    this.initElements({
      newPrice: 'newPrice',
      carYear: 'carYear',
      mileage: 'mileage',
      condition: 'condition',
      estimatedValue: 'estimatedValue',
      valueRange: 'valueRange',
      yearDepreciation: 'yearDepreciation',
      mileageDepreciation: 'mileageDepreciation',
      conditionAdjust: 'conditionAdjust',
      totalDepreciation: 'totalDepreciation',
      chartContainer: 'chartContainer'
    });

    this.calculate();

    console.log('[CarValue] 초기화 완료');
    return this;
  }

  calculate() {
    const newPrice = parseFloat(this.elements.newPrice.value) || 0;
    const carYear = parseInt(this.elements.carYear.value) || 2024;
    const mileage = parseFloat(this.elements.mileage.value) || 0;
    const condition = this.elements.condition.value;

    const currentYear = new Date().getFullYear();
    const age = Math.max(0, currentYear - carYear);

    // 연식별 감가율 계산
    const yearDepRate = this.calcYearDepreciation(age);

    // 주행거리 감가율 (연간 15,000km 기준)
    const expectedMileage = age * 15000;
    const mileageDiff = mileage - expectedMileage;
    const mileageDepRate = Math.max(-0.15, Math.min(0.1, mileageDiff / 100000)); // -15% ~ +10%

    // 상태 보정
    const conditionFactor = this.conditionFactors[condition];
    const conditionAdjust = (conditionFactor - 1) * 100;

    // 총 감가율
    const totalDepRate = yearDepRate + mileageDepRate;

    // 최종 가치 계산
    const baseValue = newPrice * (1 - totalDepRate);
    const adjustedValue = baseValue * conditionFactor;

    // 범위 계산 (±10%)
    const lowValue = adjustedValue * 0.9;
    const highValue = adjustedValue * 1.1;

    // 결과 표시
    this.elements.estimatedValue.textContent = this.formatCurrency(adjustedValue) + '원';
    this.elements.valueRange.textContent =
      `${this.formatCurrency(lowValue)}원 ~ ${this.formatCurrency(highValue)}원`;

    this.elements.yearDepreciation.textContent = '-' + (yearDepRate * 100).toFixed(1) + '%';
    this.elements.mileageDepreciation.textContent =
      (mileageDepRate >= 0 ? '+' : '') + (mileageDepRate * 100).toFixed(1) + '%';

    this.elements.conditionAdjust.textContent = (conditionAdjust >= 0 ? '+' : '') + conditionAdjust.toFixed(0) + '%';
    this.elements.conditionAdjust.className = 'factor-value ' + (conditionAdjust >= 0 ? 'positive' : 'negative');

    this.elements.totalDepreciation.textContent = '-' + (totalDepRate * 100).toFixed(1) + '%';

    // 차트 업데이트
    this.updateChart(newPrice, carYear);
  }

  calcYearDepreciation(age) {
    if (age <= 0) return 0;
    if (age === 1) return 0.22;  // 1년차: 22%
    if (age === 2) return 0.35;  // 2년차: 35%
    if (age === 3) return 0.45;  // 3년차: 45%
    if (age === 4) return 0.52;  // 4년차: 52%
    if (age === 5) return 0.58;  // 5년차: 58%
    if (age <= 7) return 0.58 + (age - 5) * 0.05;  // 6~7년차
    return Math.min(0.80, 0.68 + (age - 7) * 0.03);  // 8년차 이후
  }

  updateChart(newPrice, carYear) {
    const currentYear = new Date().getFullYear();
    let html = '';

    for (let year = carYear; year <= Math.min(carYear + 7, currentYear); year++) {
      const age = year - carYear;
      const depRate = this.calcYearDepreciation(age);
      const value = newPrice * (1 - depRate);
      const percent = ((1 - depRate) * 100).toFixed(0);

      html += `
        <div class="chart-bar">
          <div class="chart-fill" style="width: ${percent}%">${percent}%</div>
        </div>
        <div class="chart-label">
          <span>${year}년 (${age}년차)</span>
          <span>${this.formatCurrency(value)}원</span>
        </div>
      `;
    }

    this.elements.chartContainer.innerHTML = html;
  }

  formatCurrency(value) {
    return Math.round(value).toLocaleString();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const carValue = new CarValue();
window.CarValue = carValue;

document.addEventListener('DOMContentLoaded', () => carValue.init());
