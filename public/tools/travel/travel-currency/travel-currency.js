/**
 * 여행 환율 계산기 - ToolBase 기반
 * 실시간 환율 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TravelCurrency = class TravelCurrency extends ToolBase {
  constructor() {
    super('TravelCurrency');
    this.rates = {
      KRW: 1,
      USD: 0.00075,
      EUR: 0.00069,
      JPY: 0.112,
      CNY: 0.0054,
      GBP: 0.00059,
      THB: 0.026,
      VND: 18.7,
      PHP: 0.042,
      SGD: 0.001,
      AUD: 0.00115,
      CAD: 0.00103,
      CHF: 0.00066
    };

    this.currencyNames = {
      KRW: '대한민국 원',
      USD: '미국 달러',
      EUR: '유로',
      JPY: '일본 엔',
      CNY: '중국 위안',
      GBP: '영국 파운드',
      THB: '태국 바트',
      VND: '베트남 동',
      PHP: '필리핀 페소',
      SGD: '싱가포르 달러',
      AUD: '호주 달러',
      CAD: '캐나다 달러',
      CHF: '스위스 프랑'
    };
  }

  init() {
    this.initElements({
      fromAmount: 'fromAmount',
      fromCurrency: 'fromCurrency',
      toCurrency: 'toCurrency',
      toAmount: 'toAmount',
      resultDisplay: 'resultDisplay'
    });

    this.convert();

    console.log('[TravelCurrency] 초기화 완료');
    return this;
  }

  setAmount(amount) {
    this.elements.fromAmount.value = amount;
    this.convert();
  }

  setPair(from, to) {
    this.elements.fromCurrency.value = from;
    this.elements.toCurrency.value = to;
    this.convert();
  }

  swap() {
    const fromCurrency = this.elements.fromCurrency;
    const toCurrency = this.elements.toCurrency;
    const temp = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = temp;
    this.convert();
  }

  convert() {
    const amount = parseFloat(this.elements.fromAmount.value) || 0;
    const from = this.elements.fromCurrency.value;
    const to = this.elements.toCurrency.value;

    const amountInKRW = amount / this.rates[from];
    const result = amountInKRW * this.rates[to];

    const rate = this.rates[to] / this.rates[from];

    let formattedResult;
    if (to === 'KRW' || to === 'VND' || to === 'JPY') {
      formattedResult = Math.round(result).toLocaleString();
    } else {
      formattedResult = result.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    this.elements.toAmount.value = formattedResult;

    const fromName = this.currencyNames[from];
    const toName = this.currencyNames[to];

    let rateDisplay;
    if (rate < 0.01) {
      rateDisplay = rate.toFixed(6);
    } else if (rate < 1) {
      rateDisplay = rate.toFixed(4);
    } else {
      rateDisplay = rate.toFixed(2);
    }

    this.elements.resultDisplay.innerHTML = `
      <div class="result-amount">${formattedResult} ${to}</div>
      <div class="result-rate">
        1 ${from} = ${rateDisplay} ${to}<br>
        <small>${fromName} → ${toName}</small>
      </div>
    `;
  }
}

// 전역 인스턴스 생성
const travelCurrency = new TravelCurrency();
window.TravelCurrency = travelCurrency;

document.addEventListener('DOMContentLoaded', () => travelCurrency.init());
