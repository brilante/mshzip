/**
 * 종합소득세 계산기 - ToolBase 기반
 * 연말정산 및 종합소득세 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class TaxCalculator extends ToolBase {
  constructor() {
    super('TaxCalculator');
  }

  init() {
    this.initElements({
      salaryIncome: 'salaryIncome',
      businessIncome: 'businessIncome',
      businessExpense: 'businessExpense',
      otherIncome: 'otherIncome',
      financialIncome: 'financialIncome',
      spouseDeduction: 'spouseDeduction',
      dependents: 'dependents',
      pensionDeduction: 'pensionDeduction',
      healthInsurance: 'healthInsurance',
      medicalExpense: 'medicalExpense',
      educationExpense: 'educationExpense',
      donation: 'donation',
      creditCard: 'creditCard',
      pensionSavings: 'pensionSavings',
      prepaidTax: 'prepaidTax',
      totalIncome: 'totalIncome',
      incomeDeduction: 'incomeDeduction',
      grossIncome: 'grossIncome',
      totalDeductions: 'totalDeductions',
      taxableIncome: 'taxableIncome',
      calculatedTax: 'calculatedTax',
      taxCredits: 'taxCredits',
      finalTax: 'finalTax',
      prepaidTaxResult: 'prepaidTaxResult',
      finalStep: 'finalStep',
      finalLabel: 'finalLabel',
      finalAmount: 'finalAmount'
    });

    this.setupEvents();
    this.calculate();

    console.log('[TaxCalculator] 초기화 완료');
    return this;
  }

  setupEvents() {
    const inputs = [
      'salaryIncome', 'businessIncome', 'businessExpense', 'otherIncome',
      'financialIncome', 'spouseDeduction', 'dependents', 'pensionDeduction',
      'healthInsurance', 'medicalExpense', 'educationExpense', 'donation',
      'creditCard', 'pensionSavings', 'prepaidTax'
    ];

    inputs.forEach(id => {
      const el = this.elements[id];
      if (el.type === 'checkbox') {
        el.addEventListener('change', () => this.calculate());
      } else {
        el.addEventListener('input', () => this.calculate());
      }
    });
  }

  formatMoney(num) {
    if (Math.abs(num) >= 100000000) {
      return (num / 100000000).toFixed(2) + '억원';
    } else if (Math.abs(num) >= 10000) {
      return Math.round(num / 10000).toLocaleString() + '만원';
    }
    return num.toLocaleString() + '원';
  }

  // 근로소득공제 계산
  calcSalaryDeduction(salary) {
    if (salary <= 5000000) return salary;
    if (salary <= 15000000) return 5000000 + (salary - 5000000) * 0.3;
    if (salary <= 45000000) return 8000000 + (salary - 15000000) * 0.15;
    if (salary <= 100000000) return 12500000 + (salary - 45000000) * 0.05;
    return 15250000 + (salary - 100000000) * 0.02;
  }

  // 산출세액 계산 (2025 세율)
  calcTax(taxableIncome) {
    if (taxableIncome <= 0) return 0;
    if (taxableIncome <= 14000000) return taxableIncome * 0.06;
    if (taxableIncome <= 50000000) return taxableIncome * 0.15 - 1260000;
    if (taxableIncome <= 88000000) return taxableIncome * 0.24 - 5760000;
    if (taxableIncome <= 150000000) return taxableIncome * 0.35 - 15440000;
    if (taxableIncome <= 300000000) return taxableIncome * 0.38 - 19940000;
    if (taxableIncome <= 500000000) return taxableIncome * 0.40 - 25940000;
    if (taxableIncome <= 1000000000) return taxableIncome * 0.42 - 35940000;
    return taxableIncome * 0.45 - 65940000;
  }

  calculate() {
    // 소득
    const salaryIncome = parseFloat(this.elements.salaryIncome.value) || 0;
    const businessIncome = parseFloat(this.elements.businessIncome.value) || 0;
    const businessExpense = parseFloat(this.elements.businessExpense.value) || 0;
    const otherIncome = parseFloat(this.elements.otherIncome.value) || 0;
    const financialIncome = parseFloat(this.elements.financialIncome.value) || 0;

    // 인적공제
    const spouseDeduction = this.elements.spouseDeduction.checked ? 1500000 : 0;
    const dependents = parseFloat(this.elements.dependents.value) || 0;
    const personalDeduction = 1500000 + spouseDeduction + (dependents * 1500000);

    // 특별공제
    const pensionDeduction = parseFloat(this.elements.pensionDeduction.value) || 0;
    const healthInsurance = parseFloat(this.elements.healthInsurance.value) || 0;
    const medicalExpense = parseFloat(this.elements.medicalExpense.value) || 0;
    const educationExpense = parseFloat(this.elements.educationExpense.value) || 0;
    const donation = parseFloat(this.elements.donation.value) || 0;

    // 세액공제
    const creditCard = parseFloat(this.elements.creditCard.value) || 0;
    const pensionSavings = parseFloat(this.elements.pensionSavings.value) || 0;
    const prepaidTax = parseFloat(this.elements.prepaidTax.value) || 0;

    // 계산
    const totalIncome = salaryIncome + businessIncome + otherIncome + financialIncome;

    // 근로소득공제
    const salaryDeduction = this.calcSalaryDeduction(salaryIncome);

    // 사업소득금액
    const netBusinessIncome = Math.max(0, businessIncome - businessExpense);

    // 종합소득금액
    const grossIncome = (salaryIncome - salaryDeduction) + netBusinessIncome + otherIncome * 0.6 + Math.max(0, financialIncome - 20000000);

    // 소득공제 합계
    const specialDeductions = pensionDeduction + healthInsurance + medicalExpense * 0.15 + educationExpense * 0.15;

    // 신용카드 소득공제 (총급여 25% 초과분의 15~40%)
    const cardThreshold = salaryIncome * 0.25;
    const cardDeduction = Math.min(3000000, Math.max(0, creditCard - cardThreshold) * 0.15);

    const totalDeductions = personalDeduction + specialDeductions + cardDeduction;

    // 과세표준
    const taxableIncome = Math.max(0, grossIncome - totalDeductions);

    // 산출세액
    const calculatedTax = this.calcTax(taxableIncome);

    // 세액공제
    const pensionCredit = Math.min(pensionSavings * 0.12, 660000); // 연금저축 세액공제 (12%, 한도 66만원)
    const standardCredit = 130000; // 표준세액공제
    const taxCredits = pensionCredit + standardCredit + donation * 0.15;

    // 결정세액
    const finalTax = Math.max(0, calculatedTax - taxCredits);

    // 납부/환급
    const finalAmount = finalTax - prepaidTax;

    // 결과 표시
    this.elements.totalIncome.textContent = this.formatMoney(totalIncome);
    this.elements.incomeDeduction.textContent = this.formatMoney(salaryDeduction);
    this.elements.grossIncome.textContent = this.formatMoney(Math.round(grossIncome));
    this.elements.totalDeductions.textContent = this.formatMoney(Math.round(totalDeductions));
    this.elements.taxableIncome.textContent = this.formatMoney(Math.round(taxableIncome));
    this.elements.calculatedTax.textContent = this.formatMoney(Math.round(calculatedTax));
    this.elements.taxCredits.textContent = this.formatMoney(Math.round(taxCredits));
    this.elements.finalTax.textContent = this.formatMoney(Math.round(finalTax));
    this.elements.prepaidTaxResult.textContent = this.formatMoney(prepaidTax);

    if (finalAmount < 0) {
      this.elements.finalLabel.textContent = '환급액';
      this.elements.finalAmount.textContent = this.formatMoney(Math.abs(Math.round(finalAmount)));
      this.elements.finalStep.className = 'flow-step final refund';
    } else {
      this.elements.finalLabel.textContent = '추가 납부액';
      this.elements.finalAmount.textContent = this.formatMoney(Math.round(finalAmount));
      this.elements.finalStep.className = 'flow-step final payment';
    }
  }
}

// 전역 인스턴스 생성
const taxCalc = new TaxCalculator();
window.TaxCalculator = taxCalc;

document.addEventListener('DOMContentLoaded', () => taxCalc.init());
