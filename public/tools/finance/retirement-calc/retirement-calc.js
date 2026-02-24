/**
 * 은퇴 자금 계산기 - ToolBase 기반
 * 은퇴 준비 자금 및 저축 계획
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class RetirementCalculator extends ToolBase {
  constructor() {
    super('RetirementCalculator');
  }

  init() {
    this.initElements({
      currentAge: 'currentAge',
      retireAge: 'retireAge',
      lifeExpectancy: 'lifeExpectancy',
      currentSavings: 'currentSavings',
      monthlySavings: 'monthlySavings',
      monthlyExpense: 'monthlyExpense',
      preRetireReturn: 'preRetireReturn',
      postRetireReturn: 'postRetireReturn',
      inflationRate: 'inflationRate',
      yearsToRetire: 'yearsToRetire',
      retirementYears: 'retirementYears',
      requiredFund: 'requiredFund',
      expectedFund: 'expectedFund',
      gapCard: 'gapCard',
      fundGap: 'fundGap',
      additionalSavings: 'additionalSavings',
      fundChart: 'fundChart'
    });

    this.setupEvents();
    this.calculate();

    console.log('[RetirementCalculator] 초기화 완료');
    return this;
  }

  setupEvents() {
    const inputs = [
      'currentAge', 'retireAge', 'lifeExpectancy', 'currentSavings',
      'monthlySavings', 'monthlyExpense', 'preRetireReturn',
      'postRetireReturn', 'inflationRate'
    ];

    inputs.forEach(id => {
      this.elements[id].addEventListener('input', () => this.calculate());
    });
  }

  formatMoney(num) {
    if (num >= 100000000) {
      return (num / 100000000).toFixed(1) + '억원';
    } else if (num >= 10000) {
      return (num / 10000).toFixed(0) + '만원';
    }
    return num.toLocaleString() + '원';
  }

  calculate() {
    const currentAge = parseInt(this.elements.currentAge.value);
    const retireAge = parseInt(this.elements.retireAge.value);
    const lifeExpectancy = parseInt(this.elements.lifeExpectancy.value);
    const currentSavings = parseFloat(this.elements.currentSavings.value);
    const monthlySavings = parseFloat(this.elements.monthlySavings.value);
    const monthlyExpense = parseFloat(this.elements.monthlyExpense.value);
    const preRetireReturn = parseFloat(this.elements.preRetireReturn.value) / 100;
    const postRetireReturn = parseFloat(this.elements.postRetireReturn.value) / 100;
    const inflationRate = parseFloat(this.elements.inflationRate.value) / 100;

    const yearsToRetire = retireAge - currentAge;
    const retirementYears = lifeExpectancy - retireAge;

    // 물가 상승을 고려한 은퇴 시점의 월 생활비
    const futureMonthlyExpense = monthlyExpense * Math.pow(1 + inflationRate, yearsToRetire);

    // 은퇴 후 필요 자금 (실질 수익률 고려)
    const realPostRetireReturn = (1 + postRetireReturn) / (1 + inflationRate) - 1;
    let requiredFund;
    if (realPostRetireReturn <= 0) {
      requiredFund = futureMonthlyExpense * 12 * retirementYears;
    } else {
      requiredFund = futureMonthlyExpense * 12 * (1 - Math.pow(1 + realPostRetireReturn, -retirementYears)) / realPostRetireReturn;
    }

    // 은퇴 시점 예상 자산 계산
    let expectedFund = currentSavings;
    const monthlyReturn = Math.pow(1 + preRetireReturn, 1/12) - 1;
    const months = yearsToRetire * 12;

    for (let i = 0; i < months; i++) {
      expectedFund = expectedFund * (1 + monthlyReturn) + monthlySavings;
    }

    const fundGap = expectedFund - requiredFund;

    // 추가 필요 월 저축액 계산
    let additionalMonthlySavings = 0;
    if (fundGap < 0) {
      // PMT 공식 사용
      if (monthlyReturn === 0) {
        additionalMonthlySavings = -fundGap / months;
      } else {
        const fvFactor = (Math.pow(1 + monthlyReturn, months) - 1) / monthlyReturn;
        additionalMonthlySavings = -fundGap / fvFactor;
      }
    }

    // 결과 표시
    this.elements.yearsToRetire.textContent = yearsToRetire + '년';
    this.elements.retirementYears.textContent = retirementYears + '년';
    this.elements.requiredFund.textContent = this.formatMoney(Math.round(requiredFund));
    this.elements.expectedFund.textContent = this.formatMoney(Math.round(expectedFund));

    this.elements.fundGap.textContent = (fundGap >= 0 ? '+' : '') + this.formatMoney(Math.round(fundGap));
    this.elements.gapCard.className = 'result-card ' + (fundGap >= 0 ? 'surplus' : 'shortage');

    this.elements.additionalSavings.textContent =
      additionalMonthlySavings > 0 ? this.formatMoney(Math.round(additionalMonthlySavings)) + '/월' : '불필요';

    this.drawChart(yearsToRetire, currentSavings, monthlySavings, preRetireReturn, retirementYears, postRetireReturn, inflationRate, futureMonthlyExpense);
  }

  drawChart(yearsToRetire, currentSavings, monthlySavings, preRetireReturn, retirementYears, postRetireReturn, inflationRate, monthlyExpense) {
    const canvas = this.elements.fundChart;
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 600;
    ctx.scale(2, 2);

    const width = canvas.offsetWidth;
    const height = 300;
    const padding = { top: 40, right: 30, bottom: 60, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    // 자산 변화 데이터 계산
    const data = [];
    let fund = currentSavings;
    const monthlyReturn = Math.pow(1 + preRetireReturn, 1/12) - 1;

    // 은퇴 전
    for (let year = 0; year <= yearsToRetire; year++) {
      data.push({ year: year, fund: fund, phase: 'accumulation' });
      for (let m = 0; m < 12 && year < yearsToRetire; m++) {
        fund = fund * (1 + monthlyReturn) + monthlySavings;
      }
    }

    // 은퇴 후
    const postMonthlyReturn = Math.pow(1 + postRetireReturn, 1/12) - 1;
    let expense = monthlyExpense;
    for (let year = 1; year <= retirementYears && fund > 0; year++) {
      for (let m = 0; m < 12; m++) {
        fund = fund * (1 + postMonthlyReturn) - expense;
        expense *= Math.pow(1 + inflationRate, 1/12);
      }
      data.push({ year: yearsToRetire + year, fund: Math.max(0, fund), phase: 'withdrawal' });
    }

    const maxFund = Math.max(...data.map(d => d.fund));
    const totalYears = yearsToRetire + retirementYears;

    // 그리드
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // 은퇴 시점 표시
    const retireX = padding.left + (yearsToRetire / totalYears) * chartWidth;
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(retireX, padding.top);
    ctx.lineTo(retireX, height - padding.bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#ff6b6b';
    ctx.font = '12px Noto Sans KR';
    ctx.textAlign = 'center';
    ctx.fillText('은퇴 시점', retireX, padding.top - 10);

    // 라인 차트
    ctx.beginPath();
    ctx.strokeStyle = '#1e3c72';
    ctx.lineWidth = 3;
    data.forEach((d, i) => {
      const x = padding.left + (d.year / totalYears) * chartWidth;
      const y = padding.top + chartHeight - (d.fund / maxFund) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 영역 채우기
    ctx.lineTo(padding.left + chartWidth, height - padding.bottom);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(30, 60, 114, 0.3)');
    gradient.addColorStop(1, 'rgba(30, 60, 114, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Y축 레이블
    ctx.fillStyle = '#666';
    ctx.font = '11px Noto Sans KR';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = maxFund * (5 - i) / 5;
      const y = padding.top + (chartHeight / 5) * i;
      ctx.fillText(this.formatMoney(value), padding.left - 10, y + 4);
    }

    // X축 레이블
    ctx.textAlign = 'center';
    const step = Math.ceil(totalYears / 10);
    for (let year = 0; year <= totalYears; year += step) {
      const x = padding.left + (year / totalYears) * chartWidth;
      ctx.fillText(year + '년', x, height - padding.bottom + 20);
    }

    // 범례
    ctx.fillStyle = '#1e3c72';
    ctx.fillRect(width - 150, padding.top, 15, 15);
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText('예상 자산', width - 130, padding.top + 12);
  }
}

// 전역 인스턴스 생성
const retirementCalc = new RetirementCalculator();
window.RetirementCalculator = retirementCalc;

document.addEventListener('DOMContentLoaded', () => retirementCalc.init());
