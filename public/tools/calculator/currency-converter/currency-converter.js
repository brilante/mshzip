/**
 * 환율 계산기 (Currency Converter) - ToolBase 기반
 * 실시간 환율 데이터를 사용하여 통화 변환
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CurrencyConverter = class CurrencyConverter extends ToolBase {
  constructor() {
    super('CurrencyConverter');
    this.rates = {};
    this.baseCurrency = 'USD';
    this.currencies = {
      'USD': { name: '미국 달러', flag: '🇺🇸' },
      'KRW': { name: '한국 원', flag: '🇰🇷' },
      'JPY': { name: '일본 엔', flag: '🇯🇵' },
      'EUR': { name: '유로', flag: '🇪🇺' },
      'GBP': { name: '영국 파운드', flag: '🇬🇧' },
      'CNY': { name: '중국 위안', flag: '🇨🇳' },
      'HKD': { name: '홍콩 달러', flag: '🇭🇰' },
      'TWD': { name: '대만 달러', flag: '🇹🇼' },
      'SGD': { name: '싱가포르 달러', flag: '🇸🇬' },
      'AUD': { name: '호주 달러', flag: '🇦🇺' },
      'CAD': { name: '캐나다 달러', flag: '🇨🇦' },
      'CHF': { name: '스위스 프랑', flag: '🇨🇭' },
      'NZD': { name: '뉴질랜드 달러', flag: '🇳🇿' },
      'THB': { name: '태국 바트', flag: '🇹🇭' },
      'VND': { name: '베트남 동', flag: '🇻🇳' },
      'PHP': { name: '필리핀 페소', flag: '🇵🇭' },
      'INR': { name: '인도 루피', flag: '🇮🇳' },
      'MYR': { name: '말레이시아 링깃', flag: '🇲🇾' },
      'IDR': { name: '인도네시아 루피아', flag: '🇮🇩' },
      'RUB': { name: '러시아 루블', flag: '🇷🇺' },
      'BRL': { name: '브라질 헤알', flag: '🇧🇷' },
      'MXN': { name: '멕시코 페소', flag: '🇲🇽' },
      'AED': { name: 'UAE 디르함', flag: '🇦🇪' },
      'SAR': { name: '사우디 리얄', flag: '🇸🇦' }
    };
    this.fallbackRates = {
      'USD': 1, 'KRW': 1350, 'JPY': 149, 'EUR': 0.92, 'GBP': 0.79,
      'CNY': 7.24, 'HKD': 7.82, 'TWD': 31.5, 'SGD': 1.34, 'AUD': 1.53,
      'CAD': 1.36, 'CHF': 0.88, 'NZD': 1.65, 'THB': 35.5, 'VND': 24500,
      'PHP': 56, 'INR': 83, 'MYR': 4.7, 'IDR': 15800, 'RUB': 92,
      'BRL': 4.97, 'MXN': 17.2, 'AED': 3.67, 'SAR': 3.75
    };
  }

  async init() {
    this.initElements({
      fromCurrency: 'fromCurrency',
      toCurrency: 'toCurrency',
      fromAmount: 'fromAmount',
      toAmount: 'toAmount',
      fromFlag: 'fromFlag',
      toFlag: 'toFlag',
      fromCode: 'fromCode',
      toCode: 'toCode',
      rateValue: 'rateValue',
      toCodeInverse: 'toCodeInverse',
      fromCodeInverse: 'fromCodeInverse',
      rateValueInverse: 'rateValueInverse',
      rateDetail: 'rateDetail',
      rateInfo: 'rateInfo'
    });

    this.populateSelects();
    await this.fetchRates();
    this.convert();
    this.updateRatesTable();

    console.log('[CurrencyConverter] 초기화 완료');
    return this;
  }

  populateSelects() {
    Object.entries(this.currencies).forEach(([code, info]) => {
      const option1 = new Option(`${info.flag} ${code} - ${info.name}`, code);
      const option2 = new Option(`${info.flag} ${code} - ${info.name}`, code);
      this.elements.fromCurrency.add(option1);
      this.elements.toCurrency.add(option2);
    });

    this.elements.fromCurrency.value = 'USD';
    this.elements.toCurrency.value = 'KRW';
    this.updateFlags();
  }

  async fetchRates() {
    try {
      const apis = [
        `https://api.exchangerate-api.com/v4/latest/USD`,
        `https://open.er-api.com/v6/latest/USD`
      ];

      let data = null;
      for (const api of apis) {
        try {
          const response = await fetch(api);
          if (response.ok) {
            data = await response.json();
            break;
          }
        } catch (e) {
          console.warn(`API failed: ${api}`);
        }
      }

      if (data && data.rates) {
        this.rates = data.rates;
        const updateTime = data.time_last_updated
          ? new Date(data.time_last_updated * 1000).toLocaleString('ko-KR')
          : new Date().toLocaleString('ko-KR');
        this.elements.rateInfo.innerHTML = `<span class="rate-update">환율 업데이트: ${updateTime}</span>`;
      } else {
        throw new Error('No data');
      }
    } catch (error) {
      console.warn('Using fallback rates:', error);
      this.rates = this.fallbackRates;
      this.elements.rateInfo.innerHTML = `<span class="rate-update">오프라인 환율 사용 중 (참고용)</span>`;
    }
  }

  convert() {
    const fromCurrency = this.elements.fromCurrency.value;
    const toCurrency = this.elements.toCurrency.value;
    const fromAmount = parseFloat(this.elements.fromAmount.value) || 0;

    if (!this.rates[fromCurrency] || !this.rates[toCurrency]) {
      return;
    }

    // USD 기준으로 변환
    const amountInUSD = fromAmount / this.rates[fromCurrency];
    const toAmount = amountInUSD * this.rates[toCurrency];

    this.elements.toAmount.value = this.formatNumber(toAmount);

    // 환율 상세 표시
    const rate = this.rates[toCurrency] / this.rates[fromCurrency];
    const inverseRate = this.rates[fromCurrency] / this.rates[toCurrency];

    this.elements.fromCode.textContent = fromCurrency;
    this.elements.toCode.textContent = toCurrency;
    this.elements.rateValue.textContent = this.formatNumber(rate);

    this.elements.toCodeInverse.textContent = toCurrency;
    this.elements.fromCodeInverse.textContent = fromCurrency;
    this.elements.rateValueInverse.textContent = this.formatNumber(inverseRate);

    this.elements.rateDetail.style.display = 'flex';
    this.updateFlags();
  }

  formatNumber(num) {
    if (num >= 1000) {
      return num.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
    } else if (num >= 1) {
      return num.toFixed(4);
    } else {
      return num.toFixed(6);
    }
  }

  swap() {
    const tempCurrency = this.elements.fromCurrency.value;
    this.elements.fromCurrency.value = this.elements.toCurrency.value;
    this.elements.toCurrency.value = tempCurrency;

    this.elements.fromAmount.value = this.elements.toAmount.value;
    this.convert();
  }

  quickSet(from, to) {
    this.elements.fromCurrency.value = from;
    this.elements.toCurrency.value = to;
    this.elements.fromAmount.value = 1;
    this.convert();
  }

  updateFlags() {
    const fromCurrency = this.elements.fromCurrency.value;
    const toCurrency = this.elements.toCurrency.value;

    this.elements.fromFlag.textContent = this.currencies[fromCurrency]?.flag || '';
    this.elements.toFlag.textContent = this.currencies[toCurrency]?.flag || '';
  }

  updateRatesTable() {
    const tbody = document.querySelector('#ratesTable tbody');
    const majorCurrencies = ['KRW', 'JPY', 'EUR', 'GBP', 'CNY', 'HKD', 'SGD', 'AUD', 'CAD', 'CHF'];

    tbody.innerHTML = majorCurrencies.map(code => {
      const info = this.currencies[code];
      const rate = this.rates[code] || '-';
      return `
        <tr onclick="currencyConverter.quickSet('USD', '${code}')" style="cursor: pointer;">
          <td>${info.flag} ${info.name}</td>
          <td>${code}</td>
          <td>${typeof rate === 'number' ? this.formatNumber(rate) : rate}</td>
        </tr>
      `;
    }).join('');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const currencyConverter = new CurrencyConverter();
window.CurrencyConverter = currencyConverter;

document.addEventListener('DOMContentLoaded', () => currencyConverter.init());
