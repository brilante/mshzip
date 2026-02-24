/**
 * 복리 계산기 - ToolBase 기반
 * 초기 투자금, 월 적립금, 연 수익률로 복리 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CompoundInterest = class CompoundInterest extends ToolBase {
  constructor() {
    super('CompoundInterest');
  }

  init() {
    this.initElements({
      principal: 'principal',
      monthlyDeposit: 'monthlyDeposit',
      interestRate: 'interestRate',
      years: 'years',
      compoundFrequency: 'compoundFrequency',
      taxRate: 'taxRate',
      resultSection: 'resultSection',
      finalAmount: 'finalAmount',
      totalDeposit: 'totalDeposit',
      totalInterest: 'totalInterest',
      totalTax: 'totalTax',
      chartContainer: 'chartContainer',
      yearlyTable: 'yearlyTable'
    });

    this.calculate();
    console.log('[CompoundInterest] 초기화 완료');
    return this;
  }

  calculate() {
    const principal = parseFloat(this.elements.principal.value) || 0;
    const monthlyDeposit = parseFloat(this.elements.monthlyDeposit.value) || 0;
    const annualRate = parseFloat(this.elements.interestRate.value) || 0;
    const years = parseInt(this.elements.years.value) || 1;
    const compoundFrequency = parseInt(this.elements.compoundFrequency.value) || 12;
    const taxRate = parseFloat(this.elements.taxRate.value) || 0;

    if (principal <= 0 && monthlyDeposit <= 0) {
      this.elements.resultSection.style.display = 'none';
      return;
    }

    const periodicRate = annualRate / 100 / compoundFrequency;
    const monthsPerPeriod = 12 / compoundFrequency;

    let yearlyData = [];
    let balance = principal;
    let totalDeposit = principal;

    for (let year = 1; year <= years; year++) {
      const periodsThisYear = compoundFrequency;
      const yearStartBalance = balance;
      const yearStartDeposit = totalDeposit;

      for (let period = 0; period < periodsThisYear; period++) {
        // 이자 적용
        balance *= (1 + periodicRate);

        // 월 적립금 추가 (해당 기간에 해당하는 월 수만큼)
        const depositThisPeriod = monthlyDeposit * monthsPerPeriod;
        balance += depositThisPeriod;
        totalDeposit += depositThisPeriod;
      }

      const totalInterest = balance - totalDeposit;

      yearlyData.push({
        year: year,
        totalDeposit: totalDeposit,
        interest: totalInterest,
        balance: balance
      });
    }

    const finalBalance = balance;
    const totalInterest = finalBalance - totalDeposit;
    const tax = totalInterest * (taxRate / 100);
    const afterTax = finalBalance - tax;

    // 결과 표시
    this.elements.finalAmount.textContent = this.formatCurrency(afterTax);
    this.elements.totalDeposit.textContent = this.formatCurrency(totalDeposit);
    this.elements.totalInterest.textContent = this.formatCurrency(totalInterest);
    this.elements.totalTax.textContent = this.formatCurrency(tax);

    // 차트 렌더링
    this.renderChart(yearlyData);

    // 테이블 렌더링
    this.renderTable(yearlyData);

    this.elements.resultSection.style.display = 'block';
  }

  renderChart(yearlyData) {
    const container = this.elements.chartContainer;
    const maxBalance = Math.max(...yearlyData.map(d => d.balance));

    // 최대 10개 바만 표시
    let displayData = yearlyData;
    if (yearlyData.length > 10) {
      const step = Math.ceil(yearlyData.length / 10);
      displayData = yearlyData.filter((_, i) => i % step === 0 || i === yearlyData.length - 1);
    }

    const barWidth = Math.min(40, (container.offsetWidth - 40) / displayData.length - 8);

    container.innerHTML = displayData.map((data, index) => {
      const totalHeight = 180;
      const principalHeight = (data.totalDeposit / maxBalance) * totalHeight;
      const interestHeight = (data.interest / maxBalance) * totalHeight;
      const left = 20 + index * (barWidth + 8);

      return `
        <div class="chart-bar" style="
          left: ${left}px;
          width: ${barWidth}px;
          height: ${principalHeight}px;
          background: #3b82f6;
        "></div>
        <div class="chart-bar" style="
          left: ${left}px;
          width: ${barWidth}px;
          height: ${interestHeight}px;
          bottom: ${principalHeight}px;
          background: #10b981;
        "></div>
        <div class="chart-label" style="left: ${left + barWidth/2}px;">${data.year}년</div>
        <div class="chart-value" style="left: ${left + barWidth/2}px; top: ${totalHeight - principalHeight - interestHeight - 20}px;">
          ${this.formatShort(data.balance)}
        </div>
      `;
    }).join('');
  }

  renderTable(yearlyData) {
    const tbody = this.elements.yearlyTable;

    // 너무 많은 행은 처음 10개와 마지막 5개만 표시
    let displayData = yearlyData;

    if (yearlyData.length > 20) {
      displayData = [
        ...yearlyData.slice(0, 10),
        { ellipsis: true },
        ...yearlyData.slice(-5)
      ];
    }

    tbody.innerHTML = displayData.map(data => {
      if (data.ellipsis) {
        return `<tr><td colspan="4" style="text-align: center; color: var(--tools-text-secondary);">... 중략 ...</td></tr>`;
      }
      return `
        <tr>
          <td>${data.year}년</td>
          <td>${this.formatCurrency(data.totalDeposit)}</td>
          <td>${this.formatCurrency(data.interest)}</td>
          <td>${this.formatCurrency(data.balance)}</td>
        </tr>
      `;
    }).join('');
  }

  formatCurrency(value) {
    return Math.round(value).toLocaleString() + '원';
  }

  formatShort(value) {
    if (value >= 100000000) {
      return (value / 100000000).toFixed(1) + '억';
    } else if (value >= 10000) {
      return (value / 10000).toFixed(0) + '만';
    }
    return value.toLocaleString();
  }

  reset() {
    this.elements.principal.value = 10000000;
    this.elements.monthlyDeposit.value = 500000;
    this.elements.interestRate.value = 7;
    this.elements.years.value = 20;
    this.elements.compoundFrequency.value = '12';
    this.elements.taxRate.value = 15.4;
    this.calculate();
    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const compoundInterest = new CompoundInterest();
window.CompoundInterest = compoundInterest;

document.addEventListener('DOMContentLoaded', () => compoundInterest.init());
