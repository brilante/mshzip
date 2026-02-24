/**
 * 투자 수익률 계산기 - ToolBase 기반
 * ROI, 복리, CAGR 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class InvestmentROI extends ToolBase {
  constructor() {
    super('InvestmentROI');
  }

  init() {
    this.initElements({
      roiInitial: 'roiInitial',
      roiFinal: 'roiFinal',
      roiValue: 'roiValue',
      roiGain: 'roiGain',
      compPrincipal: 'compPrincipal',
      compRate: 'compRate',
      compYears: 'compYears',
      compFreq: 'compFreq',
      compMonthly: 'compMonthly',
      compFinal: 'compFinal',
      compInvested: 'compInvested',
      compGain: 'compGain',
      compoundChart: 'compoundChart',
      cagrBegin: 'cagrBegin',
      cagrEnd: 'cagrEnd',
      cagrYears: 'cagrYears',
      cagrValue: 'cagrValue',
      cagrPercent: 'cagrPercent',
      simBtn: 'simBtn',
      simPrincipal: 'simPrincipal',
      simYears: 'simYears',
      comparisonResults: 'comparisonResults'
    });

    this.setupEvents();
    this.calculateROI();
    this.calculateCompound();
    this.calculateCAGR();

    console.log('[InvestmentROI] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        document.getElementById(`${e.target.dataset.tab}Tab`).style.display = 'block';
      });
    });

    ['roiInitial', 'roiFinal'].forEach(id => {
      this.elements[id].addEventListener('input', () => this.calculateROI());
    });

    ['compPrincipal', 'compRate', 'compYears', 'compFreq', 'compMonthly'].forEach(id => {
      this.elements[id].addEventListener('input', () => this.calculateCompound());
    });

    ['cagrBegin', 'cagrEnd', 'cagrYears'].forEach(id => {
      this.elements[id].addEventListener('input', () => this.calculateCAGR());
    });

    this.elements.simBtn.addEventListener('click', () => this.runSimulation());
  }

  calculateROI() {
    const initial = parseFloat(this.elements.roiInitial.value) || 0;
    const final = parseFloat(this.elements.roiFinal.value) || 0;

    if (initial > 0) {
      const roi = ((final - initial) / initial) * 100;
      const gain = final - initial;

      this.elements.roiValue.textContent = `${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%`;
      this.elements.roiGain.textContent = `수익금: ${gain >= 0 ? '+' : ''}${this.formatNumber(Math.round(gain))}원`;

      this.elements.roiValue.style.color = gain >= 0 ? '#38ef7d' : '#e74c3c';
    }
  }

  calculateCompound() {
    const principal = parseFloat(this.elements.compPrincipal.value) || 0;
    const rate = parseFloat(this.elements.compRate.value) / 100 || 0;
    const years = parseInt(this.elements.compYears.value) || 1;
    const freq = parseInt(this.elements.compFreq.value) || 12;
    const monthly = parseFloat(this.elements.compMonthly.value) || 0;

    const ratePerPeriod = rate / freq;
    const totalPeriods = years * freq;

    // 원금 복리
    let finalAmount = principal * Math.pow(1 + ratePerPeriod, totalPeriods);

    // 적립금 복리 (적금 공식)
    if (monthly > 0) {
      const monthlyRate = rate / 12;
      const totalMonths = years * 12;

      // FV of annuity
      const annuityFV = monthly * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
      finalAmount = principal * Math.pow(1 + monthlyRate, totalMonths) + annuityFV;
    }

    const totalInvested = principal + (monthly * 12 * years);
    const gain = finalAmount - totalInvested;

    this.elements.compFinal.textContent = this.formatNumber(Math.round(finalAmount)) + '원';
    this.elements.compInvested.textContent = this.formatNumber(Math.round(totalInvested)) + '원';
    this.elements.compGain.textContent = '+' + this.formatNumber(Math.round(gain)) + '원';

    this.drawCompoundChart(principal, rate, years, monthly);
  }

  drawCompoundChart(principal, rate, years, monthly) {
    const canvas = this.elements.compoundChart;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;

    ctx.clearRect(0, 0, width, height);

    const data = [];
    let current = principal;
    const monthlyRate = rate / 12;

    for (let year = 0; year <= years; year++) {
      data.push({
        year,
        invested: principal + (monthly * 12 * year),
        value: current
      });

      for (let m = 0; m < 12; m++) {
        current = current * (1 + monthlyRate) + monthly;
      }
    }

    const maxValue = Math.max(...data.map(d => d.value));
    const xScale = (width - padding * 2) / years;
    const yScale = (height - padding * 2) / maxValue;

    // 그리드
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - padding * 2) * (1 - i / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      ctx.fillStyle = '#999';
      ctx.font = '10px Roboto Mono';
      ctx.textAlign = 'right';
      ctx.fillText(this.formatNumber(Math.round(maxValue * i / 5)), padding - 5, y + 3);
    }

    // 투자금 라인
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = padding + i * xScale;
      const y = height - padding - d.invested * yScale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 복리 성장 라인
    ctx.strokeStyle = '#11998e';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = padding + i * xScale;
      const y = height - padding - d.value * yScale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // X축 레이블
    ctx.fillStyle = '#666';
    ctx.font = '11px Noto Sans KR';
    ctx.textAlign = 'center';
    data.forEach((d, i) => {
      if (i % Math.ceil(years / 10) === 0 || i === years) {
        const x = padding + i * xScale;
        ctx.fillText(`${d.year}년`, x, height - padding + 20);
      }
    });
  }

  calculateCAGR() {
    const begin = parseFloat(this.elements.cagrBegin.value) || 0;
    const end = parseFloat(this.elements.cagrEnd.value) || 0;
    const years = parseInt(this.elements.cagrYears.value) || 1;

    if (begin > 0 && end > 0) {
      const cagr = (Math.pow(end / begin, 1 / years) - 1) * 100;

      this.elements.cagrValue.textContent = `${cagr.toFixed(2)}%`;
      this.elements.cagrPercent.textContent = `${cagr.toFixed(2)}%`;
    }
  }

  runSimulation() {
    const principal = parseFloat(this.elements.simPrincipal.value) || 10000000;
    const years = parseInt(this.elements.simYears.value) || 20;

    const rates = [3, 5, 7, 10, 15];

    this.elements.comparisonResults.innerHTML = rates.map(rate => {
      const final = principal * Math.pow(1 + rate / 100, years);
      return `
        <div class="comparison-item">
          <div class="rate">연 ${rate}%</div>
          <div class="amount">${this.formatNumber(Math.round(final))}원</div>
        </div>
      `;
    }).join('');
  }

  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

// 전역 인스턴스 생성
const investmentROI = new InvestmentROI();
window.InvestmentROI = investmentROI;

document.addEventListener('DOMContentLoaded', () => investmentROI.init());
