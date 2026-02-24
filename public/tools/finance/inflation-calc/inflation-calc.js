/**
 * 인플레이션 계산기 - ToolBase 기반
 * 물가 상승에 따른 화폐 가치 변화
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class InflationCalculator extends ToolBase {
  constructor() {
    super('InflationCalculator');
  }

  init() {
    this.initElements({
      futurePanel: 'futurePanel',
      pastPanel: 'pastPanel',
      realPanel: 'realPanel',
      futureAmount: 'futureAmount',
      futureYears: 'futureYears',
      futureInflation: 'futureInflation',
      futureResult: 'futureResult',
      futureLoss: 'futureLoss',
      futureExtra: 'futureExtra',
      futureChart: 'futureChart',
      pastAmount: 'pastAmount',
      pastYears: 'pastYears',
      pastInflation: 'pastInflation',
      pastResult: 'pastResult',
      pastGain: 'pastGain',
      pastRatio: 'pastRatio',
      nominalReturn: 'nominalReturn',
      realInflation: 'realInflation',
      realPrincipal: 'realPrincipal',
      realYears: 'realYears',
      realReturn: 'realReturn',
      nominalFinal: 'nominalFinal',
      realFinal: 'realFinal',
      nominalProfit: 'nominalProfit',
      realProfit: 'realProfit'
    });

    this.setupEvents();
    this.calcFuture();
    this.calcPast();
    this.calcReal();

    console.log('[InflationCalculator] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.tab-btn').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const tabs = ['future', 'past', 'real'];
        this.switchTab(tabs[i]);
      });
    });

    ['futureAmount', 'futureYears', 'futureInflation'].forEach(id => {
      this.elements[id].addEventListener('input', () => this.calcFuture());
    });

    ['pastAmount', 'pastYears', 'pastInflation'].forEach(id => {
      this.elements[id].addEventListener('input', () => this.calcPast());
    });

    ['nominalReturn', 'realInflation', 'realPrincipal', 'realYears'].forEach(id => {
      this.elements[id].addEventListener('input', () => this.calcReal());
    });
  }

  switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach((btn, i) => {
      btn.classList.toggle('active', btn.textContent.includes(
        tab === 'future' ? '미래' : tab === 'past' ? '과거' : '실질'
      ));
    });
    this.elements.futurePanel.classList.toggle('hidden', tab !== 'future');
    this.elements.pastPanel.classList.toggle('hidden', tab !== 'past');
    this.elements.realPanel.classList.toggle('hidden', tab !== 'real');
  }

  formatMoney(num) {
    if (Math.abs(num) >= 100000000) {
      return (num / 100000000).toFixed(2) + '억원';
    } else if (Math.abs(num) >= 10000) {
      return (num / 10000).toFixed(0) + '만원';
    }
    return num.toLocaleString() + '원';
  }

  calcFuture() {
    const amount = parseFloat(this.elements.futureAmount.value) || 0;
    const years = parseFloat(this.elements.futureYears.value) || 0;
    const inflation = parseFloat(this.elements.futureInflation.value) / 100 || 0;

    const futureValue = amount * Math.pow(1 + inflation, years);
    const lossRate = ((futureValue - amount) / futureValue) * 100;
    const extraNeeded = futureValue - amount;

    this.elements.futureResult.textContent = this.formatMoney(Math.round(futureValue));
    this.elements.futureLoss.textContent = lossRate.toFixed(1) + '%';
    this.elements.futureExtra.textContent = '+' + this.formatMoney(Math.round(extraNeeded));

    this.drawFutureChart(amount, years, inflation);
  }

  drawFutureChart(amount, years, inflation) {
    const canvas = this.elements.futureChart;
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 400;
    ctx.scale(2, 2);

    const width = canvas.offsetWidth;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    // 데이터 생성
    const data = [];
    for (let y = 0; y <= years; y++) {
      data.push({
        year: y,
        value: amount * Math.pow(1 + inflation, y),
        original: amount
      });
    }

    const maxValue = data[data.length - 1].value;

    // 그리드
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // 원금 라인 (점선)
    ctx.strokeStyle = '#aaa';
    ctx.setLineDash([5, 5]);
    const originalY = padding.top + chartHeight - (amount / maxValue) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, originalY);
    ctx.lineTo(width - padding.right, originalY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 인플레이션 라인
    ctx.beginPath();
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 3;
    data.forEach((d, i) => {
      const x = padding.left + (d.year / years) * chartWidth;
      const y = padding.top + chartHeight - (d.value / maxValue) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 영역 채우기
    ctx.lineTo(width - padding.right, padding.top + chartHeight);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.closePath();
    ctx.fillStyle = 'rgba(231, 76, 60, 0.1)';
    ctx.fill();

    // Y축 레이블
    ctx.fillStyle = '#666';
    ctx.font = '10px Noto Sans KR';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const value = maxValue * (4 - i) / 4;
      const y = padding.top + (chartHeight / 4) * i;
      ctx.fillText(this.formatMoney(value), padding.left - 5, y + 3);
    }

    // X축 레이블
    ctx.textAlign = 'center';
    const step = Math.ceil(years / 5);
    for (let y = 0; y <= years; y += step) {
      const x = padding.left + (y / years) * chartWidth;
      ctx.fillText(y + '년', x, height - padding.bottom + 15);
    }

    // 범례
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(width - 100, padding.top, 10, 10);
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText('필요금액', width - 85, padding.top + 9);

    ctx.fillStyle = '#aaa';
    ctx.fillRect(width - 100, padding.top + 15, 10, 2);
    ctx.fillStyle = '#333';
    ctx.fillText('현재금액', width - 85, padding.top + 19);
  }

  calcPast() {
    const amount = parseFloat(this.elements.pastAmount.value) || 0;
    const years = parseFloat(this.elements.pastYears.value) || 0;
    const inflation = parseFloat(this.elements.pastInflation.value) / 100 || 0;

    const presentValue = amount * Math.pow(1 + inflation, years);
    const gainRate = ((presentValue - amount) / amount) * 100;
    const ratio = Math.pow(1 + inflation, years);

    this.elements.pastResult.textContent = this.formatMoney(Math.round(presentValue));
    this.elements.pastGain.textContent = '+' + gainRate.toFixed(1) + '%';
    this.elements.pastRatio.textContent = '₩' + ratio.toFixed(2);
  }

  calcReal() {
    const nominalReturn = parseFloat(this.elements.nominalReturn.value) / 100 || 0;
    const inflation = parseFloat(this.elements.realInflation.value) / 100 || 0;
    const principal = parseFloat(this.elements.realPrincipal.value) || 0;
    const years = parseFloat(this.elements.realYears.value) || 0;

    // 실질 수익률 계산 (피셔 방정식)
    const realReturn = ((1 + nominalReturn) / (1 + inflation)) - 1;

    // 명목 최종금액
    const nominalFinal = principal * Math.pow(1 + nominalReturn, years);

    // 실질 최종금액 (현재 가치로 환산)
    const realFinal = principal * Math.pow(1 + realReturn, years);

    // 수익금
    const nominalProfit = nominalFinal - principal;
    const realProfit = realFinal - principal;

    this.elements.realReturn.textContent = (realReturn * 100).toFixed(2) + '%';
    this.elements.nominalFinal.textContent = this.formatMoney(Math.round(nominalFinal));
    this.elements.realFinal.textContent = this.formatMoney(Math.round(realFinal));
    this.elements.nominalProfit.textContent = '+' + this.formatMoney(Math.round(nominalProfit));
    this.elements.realProfit.textContent = '+' + this.formatMoney(Math.round(realProfit));
  }
}

// 전역 인스턴스 생성
const inflationCalc = new InflationCalculator();
window.InflationCalculator = inflationCalc;

document.addEventListener('DOMContentLoaded', () => inflationCalc.init());
