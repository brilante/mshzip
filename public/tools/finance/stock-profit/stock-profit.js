/**
 * 주식 수익 계산기 - ToolBase 기반
 * 주식 매매 수익/손실 및 세금 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class StockProfitCalculator extends ToolBase {
  constructor() {
    super('StockProfitCalculator');
    this.taxType = 'domestic';
  }

  init() {
    this.initElements({
      buyPrice: 'buyPrice',
      quantity: 'quantity',
      sellPrice: 'sellPrice',
      commission: 'commission',
      calculateBtn: 'calculateBtn',
      profitDisplay: 'profitDisplay',
      netProfit: 'netProfit',
      profitRate: 'profitRate',
      buyTotal: 'buyTotal',
      sellTotal: 'sellTotal',
      totalFee: 'totalFee',
      taxAmount: 'taxAmount',
      detailBuy: 'detailBuy',
      detailBuyFee: 'detailBuyFee',
      detailSell: 'detailSell',
      detailSellFee: 'detailSellFee',
      detailTradeTax: 'detailTradeTax',
      detailCapitalTax: 'detailCapitalTax',
      detailNet: 'detailNet',
      capitalGainRow: 'capitalGainRow',
      targetBtn: 'targetBtn',
      targetRate: 'targetRate',
      targetResult: 'targetResult',
      simulationTable: 'simulationTable'
    });

    this.setupEvents();
    this.calculate();
    this.renderSimulation();

    console.log('[StockProfitCalculator] 초기화 완료');
    return this;
  }

  setupEvents() {
    this.elements.calculateBtn.addEventListener('click', () => this.calculate());

    ['buyPrice', 'quantity', 'sellPrice', 'commission'].forEach(id => {
      this.elements[id].addEventListener('input', () => this.calculate());
    });

    document.querySelectorAll('.tax-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tax-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.taxType = e.target.dataset.tax;
        this.calculate();
      });
    });

    this.elements.targetBtn.addEventListener('click', () => this.calculateTarget());
  }

  calculate() {
    const buyPrice = parseFloat(this.elements.buyPrice.value) || 0;
    const quantity = parseInt(this.elements.quantity.value) || 0;
    const sellPrice = parseFloat(this.elements.sellPrice.value) || 0;
    const commission = parseFloat(this.elements.commission.value) / 100 || 0;

    const buyTotal = buyPrice * quantity;
    const sellTotal = sellPrice * quantity;

    const buyFee = buyTotal * commission;
    const sellFee = sellTotal * commission;
    const totalFee = buyFee + sellFee;

    // 세금 계산
    let tradeTax = 0;
    let capitalTax = 0;

    if (this.taxType === 'domestic') {
      // 국내주식: 증권거래세 0.18% (2024년 기준, 코스피)
      tradeTax = sellTotal * 0.0018;
      this.elements.capitalGainRow.style.display = 'none';
    } else {
      // 해외주식: 양도소득세 22% (250만원 공제 후)
      tradeTax = 0;
      const gain = sellTotal - buyTotal - totalFee;
      if (gain > 2500000) {
        capitalTax = (gain - 2500000) * 0.22;
      }
      this.elements.capitalGainRow.style.display = 'flex';
    }

    const totalTax = tradeTax + capitalTax;
    const netProfit = sellTotal - buyTotal - totalFee - totalTax;
    const profitRate = buyTotal > 0 ? (netProfit / buyTotal) * 100 : 0;

    // 결과 표시
    this.elements.profitDisplay.className = `profit-display ${netProfit < 0 ? 'loss' : ''}`;

    this.elements.netProfit.textContent = `${netProfit >= 0 ? '+' : ''}${this.formatNumber(Math.round(netProfit))}`;
    this.elements.profitRate.textContent = `${profitRate >= 0 ? '+' : ''}${profitRate.toFixed(2)}%`;

    this.elements.buyTotal.textContent = this.formatNumber(Math.round(buyTotal)) + '원';
    this.elements.sellTotal.textContent = this.formatNumber(Math.round(sellTotal)) + '원';
    this.elements.totalFee.textContent = '-' + this.formatNumber(Math.round(totalFee)) + '원';
    this.elements.taxAmount.textContent = '-' + this.formatNumber(Math.round(totalTax)) + '원';

    // 상세 내역
    this.elements.detailBuy.textContent = this.formatNumber(Math.round(buyTotal)) + '원';
    this.elements.detailBuyFee.textContent = '-' + this.formatNumber(Math.round(buyFee)) + '원';
    this.elements.detailSell.textContent = this.formatNumber(Math.round(sellTotal)) + '원';
    this.elements.detailSellFee.textContent = '-' + this.formatNumber(Math.round(sellFee)) + '원';
    this.elements.detailTradeTax.textContent = '-' + this.formatNumber(Math.round(tradeTax)) + '원';
    this.elements.detailCapitalTax.textContent = '-' + this.formatNumber(Math.round(capitalTax)) + '원';
    this.elements.detailNet.textContent = `${netProfit >= 0 ? '+' : ''}${this.formatNumber(Math.round(netProfit))}원`;

    this.renderSimulation();
  }

  calculateTarget() {
    const buyPrice = parseFloat(this.elements.buyPrice.value) || 0;
    const quantity = parseInt(this.elements.quantity.value) || 0;
    const commission = parseFloat(this.elements.commission.value) / 100 || 0;
    const targetRate = parseFloat(this.elements.targetRate.value) / 100 || 0;

    const buyTotal = buyPrice * quantity;
    const buyFee = buyTotal * commission;

    // 목표 순수익
    const targetProfit = buyTotal * targetRate;
    const targetNet = buyTotal + targetProfit;

    // 역산 (수수료, 세금 포함)
    // sellTotal - sellFee - tradeTax = targetNet + buyFee
    // sellTotal * (1 - commission - 0.0018) = targetNet + buyFee
    const factor = 1 - commission - 0.0018;
    const targetSellTotal = (targetNet + buyFee) / factor;
    const targetSellPrice = targetSellTotal / quantity;

    this.elements.targetResult.innerHTML = `
      목표 매도가: <strong>${this.formatNumber(Math.round(targetSellPrice))}원</strong>
      (총 ${this.formatNumber(Math.round(targetSellTotal))}원)
    `;
  }

  renderSimulation() {
    const buyPrice = parseFloat(this.elements.buyPrice.value) || 0;
    const quantity = parseInt(this.elements.quantity.value) || 0;
    const commission = parseFloat(this.elements.commission.value) / 100 || 0;

    if (buyPrice <= 0 || quantity <= 0) return;

    const percentages = [-30, -20, -10, -5, 0, 5, 10, 20, 30, 50];

    this.elements.simulationTable.innerHTML = percentages.map(pct => {
      const sellPrice = buyPrice * (1 + pct / 100);
      const profit = this.quickProfit(buyPrice, sellPrice, quantity, commission);

      return `
        <div class="sim-item">
          <div class="price">${pct >= 0 ? '+' : ''}${pct}%</div>
          <div class="profit ${profit >= 0 ? 'positive' : 'negative'}">
            ${profit >= 0 ? '+' : ''}${this.formatNumber(Math.round(profit))}원
          </div>
        </div>
      `;
    }).join('');
  }

  quickProfit(buyPrice, sellPrice, quantity, commission) {
    const buyTotal = buyPrice * quantity;
    const sellTotal = sellPrice * quantity;
    const fees = (buyTotal + sellTotal) * commission;
    const tax = sellTotal * 0.0018;
    return sellTotal - buyTotal - fees - tax;
  }

  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}

// 전역 인스턴스 생성
const stockProfit = new StockProfitCalculator();
window.StockProfitCalculator = stockProfit;

document.addEventListener('DOMContentLoaded', () => stockProfit.init());
