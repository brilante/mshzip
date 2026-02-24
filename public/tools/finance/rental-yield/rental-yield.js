/**
 * 임대 수익률 계산기 - ToolBase 기반
 * 부동산 임대 수익 분석
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class RentalYieldCalculator extends ToolBase {
  constructor() {
    super('RentalYieldCalculator');
  }

  init() {
    this.initElements({
      purchasePrice: 'purchasePrice',
      acquisitionTax: 'acquisitionTax',
      brokerFee: 'brokerFee',
      otherCosts: 'otherCosts',
      deposit: 'deposit',
      monthlyRent: 'monthlyRent',
      propertyTax: 'propertyTax',
      maintenanceFee: 'maintenanceFee',
      insurance: 'insurance',
      vacancyRate: 'vacancyRate',
      loanAmount: 'loanAmount',
      loanRate: 'loanRate',
      totalInvestment: 'totalInvestment',
      equityInvestment: 'equityInvestment',
      grossIncome: 'grossIncome',
      operatingCosts: 'operatingCosts',
      annualInterest: 'annualInterest',
      noi: 'noi',
      grossYield: 'grossYield',
      capRate: 'capRate',
      roe: 'roe',
      coc: 'coc',
      monthlyIncome: 'monthlyIncome',
      monthlyOpex: 'monthlyOpex',
      monthlyInterest: 'monthlyInterest',
      monthlyCashflow: 'monthlyCashflow'
    });

    this.setupEvents();
    this.calculate();

    console.log('[RentalYieldCalculator] 초기화 완료');
    return this;
  }

  setupEvents() {
    const inputs = [
      'purchasePrice', 'acquisitionTax', 'brokerFee', 'otherCosts',
      'deposit', 'monthlyRent', 'propertyTax', 'maintenanceFee',
      'insurance', 'vacancyRate', 'loanAmount', 'loanRate'
    ];

    inputs.forEach(id => {
      this.elements[id].addEventListener('input', () => this.calculate());
    });

    // 매입가 변경 시 취득세 자동 계산
    this.elements.purchasePrice.addEventListener('input', () => {
      const price = parseFloat(this.elements.purchasePrice.value) || 0;
      this.elements.acquisitionTax.value = Math.round(price * 0.046);
      this.elements.brokerFee.value = Math.round(Math.min(price * 0.009, 10000000));
    });
  }

  formatMoney(num) {
    if (Math.abs(num) >= 100000000) {
      return (num / 100000000).toFixed(2) + '억';
    } else if (Math.abs(num) >= 10000) {
      return (num / 10000).toFixed(0) + '만';
    }
    return num.toLocaleString() + '원';
  }

  calculate() {
    // 매입 비용
    const purchasePrice = parseFloat(this.elements.purchasePrice.value) || 0;
    const acquisitionTax = parseFloat(this.elements.acquisitionTax.value) || 0;
    const brokerFee = parseFloat(this.elements.brokerFee.value) || 0;
    const otherCosts = parseFloat(this.elements.otherCosts.value) || 0;

    // 임대 수입
    const deposit = parseFloat(this.elements.deposit.value) || 0;
    const monthlyRent = parseFloat(this.elements.monthlyRent.value) || 0;

    // 연간 비용
    const propertyTax = parseFloat(this.elements.propertyTax.value) || 0;
    const maintenanceFee = parseFloat(this.elements.maintenanceFee.value) || 0;
    const insurance = parseFloat(this.elements.insurance.value) || 0;
    const vacancyRate = parseFloat(this.elements.vacancyRate.value) / 100 || 0;

    // 대출 정보
    const loanAmount = parseFloat(this.elements.loanAmount.value) || 0;
    const loanRate = parseFloat(this.elements.loanRate.value) / 100 || 0;

    // 계산
    const totalInvestment = purchasePrice + acquisitionTax + brokerFee + otherCosts;
    const effectiveEquity = totalInvestment - loanAmount; // 순수 자기자본

    const annualRent = monthlyRent * 12;
    const effectiveRent = annualRent * (1 - vacancyRate); // 공실 반영
    const depositInterest = deposit * 0.02; // 보증금 운용수익 (2% 가정)
    const grossIncome = effectiveRent + depositInterest;

    const operatingCosts = propertyTax + maintenanceFee + insurance;
    const annualInterest = loanAmount * loanRate;

    const noi = grossIncome - operatingCosts; // 순영업이익
    const cashFlow = noi - annualInterest; // 세전 현금흐름

    // 수익률 계산
    const grossYield = (annualRent / purchasePrice) * 100;
    const capRate = (noi / totalInvestment) * 100;
    const roe = effectiveEquity > 0 ? (cashFlow / effectiveEquity) * 100 : 0;
    const coc = effectiveEquity > 0 ? (cashFlow / effectiveEquity) * 100 : 0;

    // 월간 현금흐름
    const monthlyIncomeVal = monthlyRent * (1 - vacancyRate);
    const monthlyOpex = operatingCosts / 12;
    const monthlyInterestVal = annualInterest / 12;
    const monthlyCashflowVal = monthlyIncomeVal - monthlyOpex - monthlyInterestVal;

    // 결과 표시
    this.elements.totalInvestment.textContent = this.formatMoney(totalInvestment);
    this.elements.equityInvestment.textContent = this.formatMoney(effectiveEquity);
    this.elements.grossIncome.textContent = this.formatMoney(grossIncome);
    this.elements.operatingCosts.textContent = this.formatMoney(operatingCosts);
    this.elements.annualInterest.textContent = this.formatMoney(annualInterest);
    this.elements.noi.textContent = this.formatMoney(noi);

    this.elements.grossYield.textContent = grossYield.toFixed(2) + '%';
    this.elements.capRate.textContent = capRate.toFixed(2) + '%';
    this.elements.roe.textContent = roe.toFixed(2) + '%';
    this.elements.coc.textContent = coc.toFixed(2) + '%';

    this.elements.monthlyIncome.textContent = '+' + this.formatMoney(monthlyIncomeVal);
    this.elements.monthlyOpex.textContent = '-' + this.formatMoney(monthlyOpex);
    this.elements.monthlyInterest.textContent = '-' + this.formatMoney(monthlyInterestVal);
    this.elements.monthlyCashflow.textContent = (monthlyCashflowVal >= 0 ? '+' : '') + this.formatMoney(monthlyCashflowVal);
  }
}

// 전역 인스턴스 생성
const rentalYield = new RentalYieldCalculator();
window.RentalYieldCalculator = rentalYield;

document.addEventListener('DOMContentLoaded', () => rentalYield.init());
