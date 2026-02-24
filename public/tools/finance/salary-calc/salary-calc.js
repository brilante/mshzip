/**
 * 연봉 실수령액 계산기 - ToolBase 기반
 * 4대보험 및 세금 공제 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class SalaryCalculator extends ToolBase {
  constructor() {
    super('SalaryCalculator');

    // 2024년 기준 요율
    this.rates = {
      nationalPension: 0.045, // 4.5%
      healthInsurance: 0.03545, // 3.545%
      longTermCare: 0.1281, // 건강보험의 12.81%
      employment: 0.009 // 0.9%
    };

    // 간이세액표 (2024년 기준 근사치)
    this.taxBrackets = [
      { min: 0, max: 10000000, rate: 0.06 },
      { min: 10000000, max: 40000000, rate: 0.15 },
      { min: 40000000, max: 88000000, rate: 0.24 },
      { min: 88000000, max: 150000000, rate: 0.35 },
      { min: 150000000, max: 300000000, rate: 0.38 },
      { min: 300000000, max: 500000000, rate: 0.40 },
      { min: 500000000, max: Infinity, rate: 0.42 }
    ];
  }

  init() {
    this.initElements({
      annualSalary: 'annualSalary',
      dependents: 'dependents',
      children: 'children',
      nonTaxable: 'nonTaxable',
      calculateBtn: 'calculateBtn',
      netMonthly: 'netMonthly',
      netAnnual: 'netAnnual',
      grossMonthly: 'grossMonthly',
      totalDeduction: 'totalDeduction',
      nationalPension: 'nationalPension',
      healthInsurance: 'healthInsurance',
      longTermCare: 'longTermCare',
      employment: 'employment',
      incomeTax: 'incomeTax',
      localTax: 'localTax',
      totalMonthly: 'totalMonthly',
      totalAnnual: 'totalAnnual',
      netBar: 'netBar',
      taxBar: 'taxBar',
      compareTable: 'compareTable'
    });

    this.setupEvents();
    this.calculate();
    this.renderComparison();

    console.log('[SalaryCalculator] 초기화 완료');
    return this;
  }

  setupEvents() {
    this.elements.calculateBtn.addEventListener('click', () => this.calculate());

    ['annualSalary', 'dependents', 'children', 'nonTaxable'].forEach(id => {
      const el = this.elements[id];
      el.addEventListener('change', () => this.calculate());
      if (el.type === 'number') {
        el.addEventListener('input', () => this.calculate());
      }
    });
  }

  calculate() {
    const annualSalary = parseFloat(this.elements.annualSalary.value) || 0;
    const dependents = parseInt(this.elements.dependents.value) || 1;
    const children = parseInt(this.elements.children.value) || 0;
    const nonTaxable = this.elements.nonTaxable.checked;

    const monthlyGross = annualSalary / 12;
    const nonTaxableAmount = nonTaxable ? 100000 : 0;
    const taxableMonthly = monthlyGross - nonTaxableAmount;

    // 4대보험 계산
    const nationalPension = Math.min(taxableMonthly * this.rates.nationalPension, 265500); // 상한액
    const healthInsurance = taxableMonthly * this.rates.healthInsurance;
    const longTermCare = healthInsurance * this.rates.longTermCare;
    const employment = taxableMonthly * this.rates.employment;

    // 소득세 계산 (간이세액 근사)
    const taxableAnnual = taxableMonthly * 12;
    let incomeTax = this.calculateIncomeTax(taxableAnnual, dependents, children) / 12;
    const localTax = incomeTax * 0.1;

    const totalDeduction = nationalPension + healthInsurance + longTermCare + employment + incomeTax + localTax;
    const netMonthly = monthlyGross - totalDeduction;
    const netAnnual = netMonthly * 12;

    // 결과 표시
    this.elements.netMonthly.textContent = this.formatNumber(Math.round(netMonthly));
    this.elements.netAnnual.textContent = this.formatNumber(Math.round(netAnnual)) + '원';
    this.elements.grossMonthly.textContent = this.formatNumber(Math.round(monthlyGross)) + '원';
    this.elements.totalDeduction.textContent = '-' + this.formatNumber(Math.round(totalDeduction)) + '원';

    // 공제 내역
    this.updateBreakdownRow('nationalPension', nationalPension);
    this.updateBreakdownRow('healthInsurance', healthInsurance);
    this.updateBreakdownRow('longTermCare', longTermCare);
    this.updateBreakdownRow('employment', employment);
    this.updateBreakdownRow('incomeTax', incomeTax);
    this.updateBreakdownRow('localTax', localTax);

    this.elements.totalMonthly.textContent = this.formatNumber(Math.round(totalDeduction)) + '원';
    this.elements.totalAnnual.textContent = this.formatNumber(Math.round(totalDeduction * 12)) + '원';

    // 차트 업데이트
    const netPercent = (netMonthly / monthlyGross) * 100;
    const taxPercent = 100 - netPercent;

    this.elements.netBar.style.width = `${netPercent}%`;
    this.elements.netBar.querySelector('span').textContent = `실수령 ${netPercent.toFixed(1)}%`;
    this.elements.taxBar.style.width = `${taxPercent}%`;
    this.elements.taxBar.querySelector('span').textContent = `공제 ${taxPercent.toFixed(1)}%`;
  }

  calculateIncomeTax(taxableAnnual, dependents, children) {
    // 근로소득공제
    let deduction = 0;
    if (taxableAnnual <= 5000000) {
      deduction = taxableAnnual * 0.7;
    } else if (taxableAnnual <= 15000000) {
      deduction = 3500000 + (taxableAnnual - 5000000) * 0.4;
    } else if (taxableAnnual <= 45000000) {
      deduction = 7500000 + (taxableAnnual - 15000000) * 0.15;
    } else if (taxableAnnual <= 100000000) {
      deduction = 12000000 + (taxableAnnual - 45000000) * 0.05;
    } else {
      deduction = 14750000 + (taxableAnnual - 100000000) * 0.02;
    }

    // 인적공제
    const personalDeduction = dependents * 1500000;
    const childDeduction = children * 150000;

    const taxBase = Math.max(0, taxableAnnual - deduction - personalDeduction);

    // 세율 적용
    let tax = 0;
    for (const bracket of this.taxBrackets) {
      if (taxBase > bracket.min) {
        const taxableInBracket = Math.min(taxBase, bracket.max) - bracket.min;
        tax += taxableInBracket * bracket.rate;
      }
    }

    // 세액공제
    tax = Math.max(0, tax - childDeduction);

    return tax;
  }

  updateBreakdownRow(id, amount) {
    const row = this.elements[id];
    const cells = row.querySelectorAll('span');
    cells[2].textContent = this.formatNumber(Math.round(amount)) + '원';
    cells[3].textContent = this.formatNumber(Math.round(amount * 12)) + '원';
  }

  renderComparison() {
    const salaries = [30000000, 40000000, 50000000, 60000000, 70000000, 80000000, 100000000];

    this.elements.compareTable.innerHTML = salaries.map(salary => {
      const monthly = salary / 12;
      const deductions = this.getQuickDeductions(monthly);
      const net = monthly - deductions;

      return `
        <div class="compare-item">
          <div class="salary">${salary / 10000}만원</div>
          <div class="net">${this.formatNumber(Math.round(net))}원</div>
        </div>
      `;
    }).join('');
  }

  getQuickDeductions(monthly) {
    const np = Math.min(monthly * 0.045, 265500);
    const hi = monthly * 0.03545;
    const ltc = hi * 0.1281;
    const emp = monthly * 0.009;
    const tax = monthly * 0.05; // 간이 추정
    const local = tax * 0.1;
    return np + hi + ltc + emp + tax + local;
  }

  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

// 전역 인스턴스 생성
const salaryCalc = new SalaryCalculator();
window.SalaryCalculator = salaryCalc;

document.addEventListener('DOMContentLoaded', () => salaryCalc.init());
