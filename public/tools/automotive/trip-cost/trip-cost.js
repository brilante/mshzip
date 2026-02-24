/**
 * 여행 비용 계산기 - ToolBase 기반
 * 자동차 여행 경비 산출
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class TripCost extends ToolBase {
  constructor() {
    super('TripCost');
  }

  init() {
    this.initElements({
      distance: 'distance',
      mileage: 'mileage',
      fuelPrice: 'fuelPrice',
      tollFee: 'tollFee',
      parkingFee: 'parkingFee',
      passengers: 'passengers',
      totalCost: 'totalCost',
      perPerson: 'perPerson',
      fuelCost: 'fuelCost',
      tollCost: 'tollCost',
      parkingCost: 'parkingCost',
      fuelNeeded: 'fuelNeeded',
      costPerKm: 'costPerKm'
    });

    this.calculate();

    console.log('[TripCost] 초기화 완료');
    return this;
  }

  calculate() {
    const distance = parseFloat(this.elements.distance.value) || 0;
    const mileage = parseFloat(this.elements.mileage.value) || 12;
    const fuelPrice = parseFloat(this.elements.fuelPrice.value) || 1650;
    const tollFee = parseFloat(this.elements.tollFee.value) || 0;
    const parkingFee = parseFloat(this.elements.parkingFee.value) || 0;
    const passengers = parseInt(this.elements.passengers.value) || 1;

    // 연료 계산
    const fuelNeeded = distance / mileage;
    const fuelCost = fuelNeeded * fuelPrice;

    // 총 비용
    const totalCost = fuelCost + tollFee + parkingFee;
    const perPerson = totalCost / passengers;
    const costPerKm = distance > 0 ? totalCost / distance : 0;

    // 결과 표시
    this.elements.totalCost.textContent = this.formatCurrency(totalCost) + '원';
    this.elements.perPerson.textContent = `1인당 ${this.formatCurrency(perPerson)}원`;

    this.elements.fuelCost.textContent = this.formatCurrency(fuelCost) + '원';
    this.elements.tollCost.textContent = this.formatCurrency(tollFee) + '원';
    this.elements.parkingCost.textContent = this.formatCurrency(parkingFee) + '원';

    this.elements.fuelNeeded.textContent = fuelNeeded.toFixed(1) + 'L';
    this.elements.costPerKm.textContent = this.formatCurrency(costPerKm) + '원';
  }

  formatCurrency(value) {
    return Math.round(value).toLocaleString();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const tripCost = new TripCost();
window.TripCost = tripCost;

document.addEventListener('DOMContentLoaded', () => tripCost.init());
