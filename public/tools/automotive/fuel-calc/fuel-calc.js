/**
 * 연비 계산기 - ToolBase 기반
 * 자동차 연비 측정
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var FuelCalc = class FuelCalc extends ToolBase {
  constructor() {
    super('FuelCalc');
    this.mode = 'distance';
  }

  init() {
    this.initElements({
      fuelPrice: 'fuelPrice',
      distance: 'distance',
      fuelUsed: 'fuelUsed',
      targetMileage: 'targetMileage',
      fuelAmount: 'fuelAmount',
      distanceMode: 'distanceMode',
      fuelMode: 'fuelMode',
      resultValue: 'resultValue',
      resultUnit: 'resultUnit',
      resultLabel: 'resultLabel',
      costPerKm: 'costPerKm',
      totalCost: 'totalCost',
      distancePer10L: 'distancePer10L',
      fuelPer100km: 'fuelPer100km'
    });

    this.calculate();

    console.log('[FuelCalc] 초기화 완료');
    return this;
  }

  setMode(mode) {
    this.mode = mode;

    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    this.elements.distanceMode.style.display = mode === 'distance' ? 'block' : 'none';
    this.elements.fuelMode.style.display = mode === 'fuel' ? 'block' : 'none';

    this.calculate();
  }

  calculate() {
    const fuelPrice = parseFloat(this.elements.fuelPrice.value) || 1650;

    if (this.mode === 'distance') {
      const distance = parseFloat(this.elements.distance.value) || 0;
      const fuelUsed = parseFloat(this.elements.fuelUsed.value) || 0;

      if (fuelUsed <= 0) {
        this.displayResult(0, 'km/L', '연비');
        this.updateStats(0, 0, fuelPrice);
        return;
      }

      const mileage = distance / fuelUsed;
      this.displayResult(mileage.toFixed(1), 'km/L', '연비');
      this.updateStats(mileage, fuelUsed, fuelPrice);
    } else {
      const targetMileage = parseFloat(this.elements.targetMileage.value) || 12;
      const fuelAmount = parseFloat(this.elements.fuelAmount.value) || 0;

      const distance = targetMileage * fuelAmount;
      this.displayResult(distance.toFixed(0), 'km', '예상 주행거리');
      this.updateStats(targetMileage, fuelAmount, fuelPrice);
    }
  }

  displayResult(value, unit, label) {
    this.elements.resultValue.textContent = value;
    this.elements.resultUnit.textContent = unit;
    this.elements.resultLabel.textContent = label;
  }

  updateStats(mileage, fuel, price) {
    if (mileage <= 0) {
      this.elements.costPerKm.textContent = '0원';
      this.elements.totalCost.textContent = '0원';
      this.elements.distancePer10L.textContent = '0km';
      this.elements.fuelPer100km.textContent = '0L';
      return;
    }

    const costPerKm = price / mileage;
    const totalCost = fuel * price;
    const distancePer10L = mileage * 10;
    const fuelPer100km = 100 / mileage;

    this.elements.costPerKm.textContent = Math.round(costPerKm).toLocaleString() + '원';
    this.elements.totalCost.textContent = Math.round(totalCost).toLocaleString() + '원';
    this.elements.distancePer10L.textContent = distancePer10L.toFixed(0) + 'km';
    this.elements.fuelPer100km.textContent = fuelPer100km.toFixed(1) + 'L';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const fuelCalc = new FuelCalc();
window.FuelCalc = fuelCalc;

document.addEventListener('DOMContentLoaded', () => fuelCalc.init());
