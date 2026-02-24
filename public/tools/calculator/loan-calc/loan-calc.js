/**
 * 대출 이자 계산기 - ToolBase 기반
 * 원리금균등, 원금균등, 만기일시 상환 방식 지원
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var LoanCalc = class LoanCalc extends ToolBase {
  constructor() {
    super('LoanCalc');
    this.method = 'equal'; // equal, principal, bullet
  }

  init() {
    this.initElements({
      principal: 'principal',
      interestRate: 'interestRate',
      loanTerm: 'loanTerm',
      paymentFrequency: 'paymentFrequency',
      resultSection: 'resultSection',
      monthlyPayment: 'monthlyPayment',
      totalPayment: 'totalPayment',
      totalInterest: 'totalInterest',
      scheduleBody: 'scheduleBody'
    });

    this.calculate();
    console.log('[LoanCalc] 초기화 완료');
    return this;
  }

  setMethod(method) {
    this.method = method;
    document.querySelectorAll('.method-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.method === method);
    });
    this.calculate();
  }

  calculate() {
    const principal = parseFloat(this.elements.principal.value) || 0;
    const annualRate = parseFloat(this.elements.interestRate.value) || 0;
    const years = parseInt(this.elements.loanTerm.value) || 1;
    const frequency = parseInt(this.elements.paymentFrequency.value) || 12;

    if (principal <= 0 || annualRate < 0 || years <= 0) {
      this.elements.resultSection.style.display = 'none';
      return;
    }

    const periodicRate = annualRate / 100 / frequency;
    const totalPeriods = years * frequency;

    let schedule = [];
    let totalPayment = 0;
    let totalInterest = 0;

    switch (this.method) {
      case 'equal':
        schedule = this.calculateEqualPayment(principal, periodicRate, totalPeriods);
        break;
      case 'principal':
        schedule = this.calculateEqualPrincipal(principal, periodicRate, totalPeriods);
        break;
      case 'bullet':
        schedule = this.calculateBulletPayment(principal, periodicRate, totalPeriods);
        break;
    }

    // 합계 계산
    schedule.forEach(item => {
      totalPayment += item.payment;
      totalInterest += item.interest;
    });

    const monthlyPayment = schedule[0]?.payment || 0;

    // 결과 표시
    this.elements.monthlyPayment.textContent = this.formatCurrency(monthlyPayment);
    this.elements.totalPayment.textContent = this.formatCurrency(totalPayment);
    this.elements.totalInterest.textContent = this.formatCurrency(totalInterest);

    // 스케줄 테이블 생성
    this.renderSchedule(schedule);

    this.elements.resultSection.style.display = 'block';
  }

  // 원리금균등 상환
  calculateEqualPayment(principal, rate, periods) {
    const schedule = [];
    let balance = principal;

    // 월 상환액 계산 (PMT 공식)
    let payment;
    if (rate === 0) {
      payment = principal / periods;
    } else {
      payment = principal * (rate * Math.pow(1 + rate, periods)) / (Math.pow(1 + rate, periods) - 1);
    }

    for (let i = 1; i <= periods; i++) {
      const interest = balance * rate;
      const principalPaid = payment - interest;
      balance = Math.max(0, balance - principalPaid);

      schedule.push({
        period: i,
        payment: payment,
        principal: principalPaid,
        interest: interest,
        balance: balance
      });
    }

    return schedule;
  }

  // 원금균등 상환
  calculateEqualPrincipal(principal, rate, periods) {
    const schedule = [];
    let balance = principal;
    const principalPayment = principal / periods;

    for (let i = 1; i <= periods; i++) {
      const interest = balance * rate;
      const payment = principalPayment + interest;
      balance = Math.max(0, balance - principalPayment);

      schedule.push({
        period: i,
        payment: payment,
        principal: principalPayment,
        interest: interest,
        balance: balance
      });
    }

    return schedule;
  }

  // 만기일시 상환
  calculateBulletPayment(principal, rate, periods) {
    const schedule = [];
    const monthlyInterest = principal * rate;

    for (let i = 1; i <= periods; i++) {
      const isLast = i === periods;
      schedule.push({
        period: i,
        payment: isLast ? principal + monthlyInterest : monthlyInterest,
        principal: isLast ? principal : 0,
        interest: monthlyInterest,
        balance: isLast ? 0 : principal
      });
    }

    return schedule;
  }

  renderSchedule(schedule) {
    const tbody = this.elements.scheduleBody;

    // 너무 많은 행은 처음 24개와 마지막 12개만 표시
    let displaySchedule = schedule;

    if (schedule.length > 48) {
      displaySchedule = [
        ...schedule.slice(0, 24),
        { ellipsis: true },
        ...schedule.slice(-12)
      ];
    }

    tbody.innerHTML = displaySchedule.map(item => {
      if (item.ellipsis) {
        return `<tr><td colspan="5" style="text-align: center; color: var(--tools-text-secondary);">... 중략 (총 ${schedule.length}회) ...</td></tr>`;
      }
      return `
        <tr>
          <td>${item.period}회</td>
          <td>${this.formatCurrency(item.payment)}</td>
          <td>${this.formatCurrency(item.principal)}</td>
          <td>${this.formatCurrency(item.interest)}</td>
          <td>${this.formatCurrency(item.balance)}</td>
        </tr>
      `;
    }).join('');
  }

  formatCurrency(value) {
    return Math.round(value).toLocaleString() + '원';
  }

  reset() {
    this.elements.principal.value = 100000000;
    this.elements.interestRate.value = 4.5;
    this.elements.loanTerm.value = 30;
    this.elements.paymentFrequency.value = '12';
    this.setMethod('equal');
    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const loanCalc = new LoanCalc();
window.LoanCalc = loanCalc;

document.addEventListener('DOMContentLoaded', () => loanCalc.init());
