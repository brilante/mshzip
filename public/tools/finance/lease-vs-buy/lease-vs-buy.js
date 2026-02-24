/**
 * 리스 vs 구매 비교 - ToolBase 기반
 * 자동차 리스와 구매 비용 비교
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class LeaseVsBuyCalculator extends ToolBase {
  constructor() {
    super('LeaseVsBuyCalculator');
  }

  init() {
    this.initElements({
      carPrice: 'carPrice',
      usePeriod: 'usePeriod',
      annualMileage: 'annualMileage',
      leaseDeposit: 'leaseDeposit',
      monthlyLease: 'monthlyLease',
      residualRate: 'residualRate',
      downPayment: 'downPayment',
      loanRate: 'loanRate',
      loanPeriod: 'loanPeriod',
      depreciationRate: 'depreciationRate',
      leaseTotalCost: 'leaseTotalCost',
      buyTotalCost: 'buyTotalCost',
      leaseDepositResult: 'leaseDepositResult',
      totalLeasePayments: 'totalLeasePayments',
      buyoutCost: 'buyoutCost',
      leaseTotalDetail: 'leaseTotalDetail',
      downPaymentResult: 'downPaymentResult',
      loanPrincipal: 'loanPrincipal',
      totalInterest: 'totalInterest',
      registrationTax: 'registrationTax',
      residualValue: 'residualValue',
      buyTotalDetail: 'buyTotalDetail',
      verdict: 'verdict'
    });

    this.setupEvents();
    this.calculate();

    console.log('[LeaseVsBuyCalculator] 초기화 완료');
    return this;
  }

  setupEvents() {
    const inputs = [
      'carPrice', 'usePeriod', 'annualMileage', 'leaseDeposit',
      'monthlyLease', 'residualRate', 'downPayment', 'loanRate',
      'loanPeriod', 'depreciationRate'
    ];

    inputs.forEach(id => {
      this.elements[id].addEventListener('input', () => this.calculate());
    });
  }

  formatMoney(num) {
    if (Math.abs(num) >= 100000000) {
      return (num / 100000000).toFixed(1) + '억';
    } else if (Math.abs(num) >= 10000) {
      return Math.round(num / 10000).toLocaleString() + '만';
    }
    return num.toLocaleString() + '원';
  }

  calculate() {
    // 차량 정보
    const carPrice = parseFloat(this.elements.carPrice.value) || 0;
    const usePeriod = parseFloat(this.elements.usePeriod.value) || 0;

    // 리스 조건
    const leaseDeposit = parseFloat(this.elements.leaseDeposit.value) || 0;
    const monthlyLease = parseFloat(this.elements.monthlyLease.value) || 0;
    const residualRate = parseFloat(this.elements.residualRate.value) / 100 || 0;

    // 구매 조건
    const downPayment = parseFloat(this.elements.downPayment.value) || 0;
    const loanRate = parseFloat(this.elements.loanRate.value) / 100 || 0;
    const loanPeriod = parseFloat(this.elements.loanPeriod.value) || 0;
    const depreciationRate = parseFloat(this.elements.depreciationRate.value) / 100 || 0;

    // 리스 비용 계산
    const totalLeasePayments = monthlyLease * usePeriod * 12;
    const buyoutCost = carPrice * residualRate; // 인수 시 비용
    const leaseTotalCost = leaseDeposit + totalLeasePayments; // 반납 기준

    // 구매 비용 계산
    const loanPrincipal = carPrice - downPayment;
    const monthlyRate = loanRate / 12;
    let totalInterest = 0;

    if (monthlyRate > 0 && loanPeriod > 0) {
      const monthlyPayment = loanPrincipal * (monthlyRate * Math.pow(1 + monthlyRate, loanPeriod)) /
                            (Math.pow(1 + monthlyRate, loanPeriod) - 1);
      totalInterest = (monthlyPayment * loanPeriod) - loanPrincipal;
    }

    const registrationTax = carPrice * 0.07; // 취등록세 7%

    // 잔존 가치 (감가상각 후)
    const residualValue = carPrice * Math.pow(1 - depreciationRate, usePeriod);

    // 구매 순비용 = 차량가격 + 취등록세 + 이자 - 잔존가치
    const buyTotalCost = carPrice + registrationTax + totalInterest - residualValue;

    // 결과 표시
    this.elements.leaseTotalCost.textContent = this.formatMoney(Math.round(leaseTotalCost));
    this.elements.buyTotalCost.textContent = this.formatMoney(Math.round(buyTotalCost));

    // 리스 상세
    this.elements.leaseDepositResult.textContent = this.formatMoney(leaseDeposit);
    this.elements.totalLeasePayments.textContent = this.formatMoney(totalLeasePayments);
    this.elements.buyoutCost.textContent = this.formatMoney(buyoutCost);
    this.elements.leaseTotalDetail.textContent = this.formatMoney(Math.round(leaseTotalCost));

    // 구매 상세
    this.elements.downPaymentResult.textContent = this.formatMoney(downPayment);
    this.elements.loanPrincipal.textContent = this.formatMoney(loanPrincipal);
    this.elements.totalInterest.textContent = this.formatMoney(Math.round(totalInterest));
    this.elements.registrationTax.textContent = this.formatMoney(Math.round(registrationTax));
    this.elements.residualValue.textContent = '-' + this.formatMoney(Math.round(residualValue));
    this.elements.buyTotalDetail.textContent = this.formatMoney(Math.round(buyTotalCost));

    // 판정
    const diff = Math.abs(leaseTotalCost - buyTotalCost);

    if (leaseTotalCost < buyTotalCost) {
      this.elements.verdict.textContent = '리스가 ' + this.formatMoney(Math.round(diff)) + ' 더 유리합니다!';
      this.elements.verdict.className = 'verdict lease-win';
    } else if (buyTotalCost < leaseTotalCost) {
      this.elements.verdict.textContent = '구매가 ' + this.formatMoney(Math.round(diff)) + ' 더 유리합니다!';
      this.elements.verdict.className = 'verdict buy-win';
    } else {
      this.elements.verdict.textContent = '리스와 구매 비용이 비슷합니다';
      this.elements.verdict.className = 'verdict';
    }
  }
}

// 전역 인스턴스 생성
const leaseVsBuy = new LeaseVsBuyCalculator();
window.LeaseVsBuyCalculator = leaseVsBuy;

document.addEventListener('DOMContentLoaded', () => leaseVsBuy.init());
