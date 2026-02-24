/**
 * 부채 상환 계산기 - ToolBase 기반
 * 눈덩이/눈사태 방식 비교
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class DebtPayoffCalculator extends ToolBase {
  constructor() {
    super('DebtPayoffCalculator');
    this.debts = [];
    this.extraPayment = 100000;
    this.currentStrategy = 'avalanche';
  }

  init() {
    this.initElements({
      debtName: 'debtName',
      debtBalance: 'debtBalance',
      debtRate: 'debtRate',
      debtMinPayment: 'debtMinPayment',
      addDebtBtn: 'addDebtBtn',
      debtList: 'debtList',
      extraPayment: 'extraPayment',
      snowballTime: 'snowballTime',
      snowballInterest: 'snowballInterest',
      avalancheTime: 'avalancheTime',
      avalancheInterest: 'avalancheInterest',
      snowballCard: 'snowballCard',
      avalancheCard: 'avalancheCard',
      recommendation: 'recommendation',
      totalDebt: 'totalDebt',
      minMonthly: 'minMonthly',
      totalMonthly: 'totalMonthly',
      savedInterest: 'savedInterest',
      timeline: 'timeline'
    });

    this.setupEvents();
    this.addSampleDebts();

    console.log('[DebtPayoffCalculator] 초기화 완료');
    return this;
  }

  setupEvents() {
    this.elements.addDebtBtn.addEventListener('click', () => this.addDebt());
    this.elements.extraPayment.addEventListener('input', (e) => {
      this.extraPayment = parseFloat(e.target.value) || 0;
      this.calculate();
    });

    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentStrategy = e.target.dataset.strategy;
        this.renderTimeline();
      });
    });
  }

  addSampleDebts() {
    this.debts = [
      { name: '신용카드 A', balance: 5000000, rate: 19.9, minPayment: 150000 },
      { name: '신용카드 B', balance: 3000000, rate: 18.5, minPayment: 90000 },
      { name: '자동차 할부', balance: 12000000, rate: 6.5, minPayment: 350000 }
    ];
    this.renderDebtList();
    this.calculate();
  }

  addDebt() {
    const name = this.elements.debtName.value.trim();
    const balance = parseFloat(this.elements.debtBalance.value) || 0;
    const rate = parseFloat(this.elements.debtRate.value) || 0;
    const minPayment = parseFloat(this.elements.debtMinPayment.value) || 0;

    if (name && balance > 0 && minPayment > 0) {
      this.debts.push({ name, balance, rate, minPayment });
      this.renderDebtList();
      this.calculate();

      // 입력 초기화
      this.elements.debtName.value = '';
      this.elements.debtBalance.value = '';
      this.elements.debtRate.value = '';
      this.elements.debtMinPayment.value = '';
    }
  }

  removeDebt(index) {
    this.debts.splice(index, 1);
    this.renderDebtList();
    this.calculate();
  }

  renderDebtList() {
    this.elements.debtList.innerHTML = this.debts.map((debt, i) => `
      <div class="debt-item">
        <div class="info">
          <span class="name">${this.escapeHtml(debt.name)}</span>
          <span class="detail">잔액: ${this.formatNumber(debt.balance)}원</span>
          <span class="detail">이자: ${debt.rate}%</span>
          <span class="detail">최소: ${this.formatNumber(debt.minPayment)}원</span>
        </div>
        <button onclick="debtCalc.removeDebt(${i})">×</button>
      </div>
    `).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  calculate() {
    if (this.debts.length === 0) return;

    const snowball = this.simulatePayoff('snowball');
    const avalanche = this.simulatePayoff('avalanche');

    // 결과 표시
    this.elements.snowballTime.textContent = `${snowball.months}개월`;
    this.elements.snowballInterest.textContent = this.formatNumber(Math.round(snowball.totalInterest)) + '원';

    this.elements.avalancheTime.textContent = `${avalanche.months}개월`;
    this.elements.avalancheInterest.textContent = this.formatNumber(Math.round(avalanche.totalInterest)) + '원';

    // 추천
    this.elements.snowballCard.classList.remove('recommended');
    this.elements.avalancheCard.classList.remove('recommended');

    const saved = snowball.totalInterest - avalanche.totalInterest;

    if (saved > 0) {
      this.elements.avalancheCard.classList.add('recommended');
      this.elements.recommendation.innerHTML = `
        <strong>눈사태 방식</strong>을 추천합니다!
        약 <strong>${this.formatNumber(Math.round(saved))}원</strong>의 이자를 절약할 수 있습니다.
      `;
    } else {
      this.elements.snowballCard.classList.add('recommended');
      this.elements.recommendation.innerHTML = `
        두 방식의 이자 차이가 거의 없습니다.
        심리적 동기부여를 위해 <strong>눈덩이 방식</strong>을 추천합니다!
      `;
    }

    // 요약
    const totalDebt = this.debts.reduce((sum, d) => sum + d.balance, 0);
    const minMonthly = this.debts.reduce((sum, d) => sum + d.minPayment, 0);

    this.elements.totalDebt.textContent = this.formatNumber(totalDebt) + '원';
    this.elements.minMonthly.textContent = this.formatNumber(minMonthly) + '원';
    this.elements.totalMonthly.textContent = this.formatNumber(minMonthly + this.extraPayment) + '원';
    this.elements.savedInterest.textContent = this.formatNumber(Math.round(Math.abs(saved))) + '원';

    this.renderTimeline();
  }

  simulatePayoff(strategy) {
    const debts = this.debts.map(d => ({
      ...d,
      currentBalance: d.balance
    }));

    // 정렬
    if (strategy === 'snowball') {
      debts.sort((a, b) => a.balance - b.balance);
    } else {
      debts.sort((a, b) => b.rate - a.rate);
    }

    let months = 0;
    let totalInterest = 0;
    const timeline = [];
    const maxMonths = 360; // 30년 제한

    while (debts.some(d => d.currentBalance > 0) && months < maxMonths) {
      months++;
      let availableExtra = this.extraPayment;

      const monthData = {
        month: months,
        payments: [],
        remaining: 0
      };

      // 각 부채에 최소 상환 + 이자 적용
      debts.forEach(debt => {
        if (debt.currentBalance <= 0) return;

        const monthlyInterest = debt.currentBalance * (debt.rate / 100 / 12);
        totalInterest += monthlyInterest;

        debt.currentBalance += monthlyInterest;
        const payment = Math.min(debt.minPayment, debt.currentBalance);
        debt.currentBalance -= payment;

        monthData.payments.push({
          name: debt.name,
          paid: debt.currentBalance <= 0
        });
      });

      // 추가 상환금 배분 (첫 번째 미상환 부채에)
      for (const debt of debts) {
        if (debt.currentBalance > 0 && availableExtra > 0) {
          const extraApplied = Math.min(availableExtra, debt.currentBalance);
          debt.currentBalance -= extraApplied;
          availableExtra -= extraApplied;

          if (debt.currentBalance <= 0) {
            const existing = monthData.payments.find(p => p.name === debt.name);
            if (existing) existing.paid = true;
          }
        }
      }

      monthData.remaining = debts.reduce((sum, d) => sum + Math.max(0, d.currentBalance), 0);
      timeline.push(monthData);
    }

    return { months, totalInterest, timeline };
  }

  renderTimeline() {
    const result = this.simulatePayoff(this.currentStrategy);

    this.elements.timeline.innerHTML = `
      <div class="timeline-item header">
        <span>월</span>
        <span>상환 현황</span>
        <span>상환액</span>
        <span>잔액</span>
      </div>
      ${result.timeline.slice(0, 60).map(item => `
        <div class="timeline-item">
          <span class="month">${item.month}개월</span>
          <div class="debts">
            ${item.payments.map(p => `
              <span class="debt-tag ${p.paid ? 'paid' : ''}">${this.escapeHtml(p.name)}</span>
            `).join('')}
          </div>
          <span class="payment">-</span>
          <span class="remaining">${this.formatNumber(Math.round(item.remaining))}원</span>
        </div>
      `).join('')}
    `;
  }

  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

// 전역 인스턴스 생성
const debtCalc = new DebtPayoffCalculator();
window.DebtPayoffCalculator = debtCalc;

document.addEventListener('DOMContentLoaded', () => debtCalc.init());
