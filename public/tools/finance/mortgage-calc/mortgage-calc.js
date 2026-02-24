/**
 * 모기지 계산기 - ToolBase 기반
 * 주택담보대출 상환액 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class MortgageCalculator extends ToolBase {
  constructor() {
    super('MortgageCalculator');
    this.viewMode = 'yearly';
    this.schedule = [];
  }

  init() {
    this.initElements({
      loanAmount: 'loanAmount',
      interestRate: 'interestRate',
      loanTerm: 'loanTerm',
      paymentType: 'paymentType',
      calculateBtn: 'calculateBtn',
      monthlyPayment: 'monthlyPayment',
      totalPayment: 'totalPayment',
      totalInterest: 'totalInterest',
      chartCanvas: 'chartCanvas',
      scheduleBody: 'scheduleBody'
    });

    this.setupEvents();
    this.calculate();

    console.log('[MortgageCalculator] 초기화 완료');
    return this;
  }

  setupEvents() {
    this.elements.calculateBtn.addEventListener('click', () => this.calculate());

    ['loanAmount', 'interestRate', 'loanTerm', 'paymentType'].forEach(id => {
      this.elements[id].addEventListener('change', () => this.calculate());
    });

    document.querySelectorAll('.schedule-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.schedule-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.viewMode = e.target.dataset.view;
        this.renderSchedule();
      });
    });
  }

  calculate() {
    const principal = parseFloat(this.elements.loanAmount.value) || 0;
    const annualRate = parseFloat(this.elements.interestRate.value) / 100;
    const years = parseInt(this.elements.loanTerm.value) || 1;
    const type = this.elements.paymentType.value;

    const monthlyRate = annualRate / 12;
    const totalMonths = years * 12;

    this.schedule = [];

    let totalPayment = 0;
    let totalInterest = 0;
    let balance = principal;
    let monthlyPayment = 0;

    if (type === 'equal') {
      // 원리금균등상환
      monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
        (Math.pow(1 + monthlyRate, totalMonths) - 1);

      for (let month = 1; month <= totalMonths; month++) {
        const interest = balance * monthlyRate;
        const principalPaid = monthlyPayment - interest;
        balance -= principalPaid;

        this.schedule.push({
          month,
          principal: principalPaid,
          interest,
          payment: monthlyPayment,
          balance: Math.max(0, balance)
        });

        totalPayment += monthlyPayment;
        totalInterest += interest;
      }
    } else {
      // 원금균등상환
      const monthlyPrincipal = principal / totalMonths;

      for (let month = 1; month <= totalMonths; month++) {
        const interest = balance * monthlyRate;
        const payment = monthlyPrincipal + interest;
        balance -= monthlyPrincipal;

        this.schedule.push({
          month,
          principal: monthlyPrincipal,
          interest,
          payment,
          balance: Math.max(0, balance)
        });

        totalPayment += payment;
        totalInterest += interest;
      }

      monthlyPayment = this.schedule[0].payment;
    }

    this.displayResults(monthlyPayment, totalPayment, totalInterest, principal);
    this.drawChart(principal, totalInterest);
    this.renderSchedule();
  }

  displayResults(monthly, total, interest, principal) {
    this.elements.monthlyPayment.textContent = this.formatNumber(Math.round(monthly));
    this.elements.totalPayment.textContent = this.formatNumber(Math.round(total));
    this.elements.totalInterest.textContent = this.formatNumber(Math.round(interest));
  }

  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  drawChart(principal, interest) {
    const canvas = this.elements.chartCanvas;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;

    const total = principal + interest;
    const principalAngle = (principal / total) * 2 * Math.PI;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 원금 부분
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + principalAngle);
    ctx.closePath();
    ctx.fillStyle = '#1e3c72';
    ctx.fill();

    // 이자 부분
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, -Math.PI / 2 + principalAngle, -Math.PI / 2 + 2 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = '#e74c3c';
    ctx.fill();

    // 가운데 원
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();

    // 퍼센트 표시
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Noto Sans KR';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${((principal / total) * 100).toFixed(1)}%`, centerX, centerY);
  }

  renderSchedule() {
    if (this.viewMode === 'yearly') {
      const yearlyData = [];
      for (let i = 0; i < this.schedule.length; i += 12) {
        const yearData = this.schedule.slice(i, i + 12);
        yearlyData.push({
          year: Math.floor(i / 12) + 1,
          principal: yearData.reduce((sum, m) => sum + m.principal, 0),
          interest: yearData.reduce((sum, m) => sum + m.interest, 0),
          payment: yearData.reduce((sum, m) => sum + m.payment, 0),
          balance: yearData[yearData.length - 1].balance
        });
      }

      this.elements.scheduleBody.innerHTML = yearlyData.map(y => `
        <tr>
          <td>${y.year}년차</td>
          <td>${this.formatNumber(Math.round(y.principal))}</td>
          <td>${this.formatNumber(Math.round(y.interest))}</td>
          <td>${this.formatNumber(Math.round(y.payment))}</td>
          <td>${this.formatNumber(Math.round(y.balance))}</td>
        </tr>
      `).join('');
    } else {
      this.elements.scheduleBody.innerHTML = this.schedule.map(m => `
        <tr>
          <td>${m.month}회</td>
          <td>${this.formatNumber(Math.round(m.principal))}</td>
          <td>${this.formatNumber(Math.round(m.interest))}</td>
          <td>${this.formatNumber(Math.round(m.payment))}</td>
          <td>${this.formatNumber(Math.round(m.balance))}</td>
        </tr>
      `).join('');
    }
  }
}

// 전역 인스턴스 생성
const mortgageCalc = new MortgageCalculator();
window.MortgageCalculator = mortgageCalc;

document.addEventListener('DOMContentLoaded', () => mortgageCalc.init());
