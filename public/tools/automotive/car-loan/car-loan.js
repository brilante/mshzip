/**
 * 자동차 할부 계산기 - ToolBase 기반
 * 월 납입금 및 이자 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CarLoan = class CarLoan extends ToolBase {
  constructor() {
    super('CarLoan');
    this.term = 36;
  }

  init() {
    this.initElements({
      carPrice: 'carPrice',
      downPayment: 'downPayment',
      interestRate: 'interestRate',
      monthlyPayment: 'monthlyPayment',
      loanAmount: 'loanAmount',
      totalInterest: 'totalInterest',
      totalPayment: 'totalPayment',
      interestRatio: 'interestRatio',
      scheduleList: 'scheduleList'
    });

    this.calculate();

    console.log('[CarLoan] 초기화 완료');
    return this;
  }

  setTerm(months) {
    this.term = months;

    document.querySelectorAll('.term-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent === months + '개월');
    });

    this.calculate();
  }

  calculate() {
    const carPrice = parseFloat(this.elements.carPrice.value) || 0;
    const downPayment = parseFloat(this.elements.downPayment.value) || 0;
    const annualRate = parseFloat(this.elements.interestRate.value) || 0;

    const principal = carPrice - downPayment;
    const monthlyRate = annualRate / 100 / 12;
    const months = this.term;

    if (principal <= 0 || months <= 0) {
      this.displayResults(0, 0, 0, 0);
      this.clearSchedule();
      return;
    }

    // 원리금균등상환 공식
    let monthlyPayment;
    if (monthlyRate === 0) {
      monthlyPayment = principal / months;
    } else {
      monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
                       (Math.pow(1 + monthlyRate, months) - 1);
    }

    const totalPayment = monthlyPayment * months;
    const totalInterest = totalPayment - principal;
    const interestRatio = (totalInterest / principal) * 100;

    this.displayResults(monthlyPayment, principal, totalInterest, totalPayment, interestRatio);
    this.generateSchedule(principal, monthlyRate, monthlyPayment, months);
  }

  displayResults(monthly, principal, interest, total, ratio = 0) {
    this.elements.monthlyPayment.textContent = this.formatCurrency(monthly) + '원';
    this.elements.loanAmount.textContent = this.formatCurrency(principal) + '원';
    this.elements.totalInterest.textContent = this.formatCurrency(interest) + '원';
    this.elements.totalPayment.textContent = this.formatCurrency(total) + '원';
    this.elements.interestRatio.textContent = ratio.toFixed(1) + '%';
  }

  generateSchedule(principal, monthlyRate, monthlyPayment, months) {
    let balance = principal;
    let html = '';

    for (let i = 1; i <= months; i++) {
      const interest = balance * monthlyRate;
      const principalPaid = monthlyPayment - interest;
      balance -= principalPaid;

      if (balance < 0) balance = 0;

      html += `<div class="schedule-row">
        <span>${i}</span>
        <span>${this.formatCurrency(principalPaid)}</span>
        <span>${this.formatCurrency(interest)}</span>
        <span>${this.formatCurrency(monthlyPayment)}</span>
        <span>${this.formatCurrency(balance)}</span>
      </div>`;
    }

    this.elements.scheduleList.innerHTML = html;
  }

  clearSchedule() {
    this.elements.scheduleList.innerHTML =
      '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">데이터를 입력하세요</div>';
  }

  formatCurrency(value) {
    return Math.round(value).toLocaleString();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const carLoan = new CarLoan();
window.CarLoan = carLoan;

document.addEventListener('DOMContentLoaded', () => carLoan.init());
