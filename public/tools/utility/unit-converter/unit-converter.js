/**
 * 단위 변환기 - ToolBase 기반
 * 길이, 무게, 면적, 부피, 온도, 데이터
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class UnitConverter extends ToolBase {
  constructor() {
    super('UnitConverter');
    this.currentCategory = 'length';
    this.units = {
      length: {
        name: '길이',
        units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 },
        labels: { mm: '밀리미터', cm: '센티미터', m: '미터', km: '킬로미터', in: '인치', ft: '피트', yd: '야드', mi: '마일' }
      },
      weight: {
        name: '무게',
        units: { mg: 0.001, g: 1, kg: 1000, t: 1000000, oz: 28.3495, lb: 453.592 },
        labels: { mg: '밀리그램', g: '그램', kg: '킬로그램', t: '톤', oz: '온스', lb: '파운드' }
      },
      area: {
        name: '면적',
        units: { mm2: 0.000001, cm2: 0.0001, m2: 1, km2: 1000000, ha: 10000, ac: 4046.86, pyeong: 3.305785 },
        labels: { mm2: 'mm²', cm2: 'cm²', m2: 'm²', km2: 'km²', ha: '헥타르', ac: '에이커', pyeong: '평' }
      },
      volume: {
        name: '부피',
        units: { ml: 0.001, l: 1, m3: 1000, gal: 3.78541, qt: 0.946353, pt: 0.473176, cup: 0.236588 },
        labels: { ml: '밀리리터', l: '리터', m3: '세제곱미터', gal: '갤런', qt: '쿼트', pt: '파인트', cup: '컵' }
      },
      temperature: {
        name: '온도',
        units: { c: 'celsius', f: 'fahrenheit', k: 'kelvin' },
        labels: { c: '섭씨 (°C)', f: '화씨 (°F)', k: '켈빈 (K)' },
        special: true
      },
      data: {
        name: '데이터',
        units: { b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776 },
        labels: { b: '바이트', kb: '킬로바이트', mb: '메가바이트', gb: '기가바이트', tb: '테라바이트' }
      }
    };
  }

  init() {
    this.initElements({
      fromUnit: 'fromUnit',
      toUnit: 'toUnit',
      inputValue: 'inputValue',
      outputValue: 'outputValue',
      conversionTable: 'conversionTable'
    });

    this.bindEvents();
    this.populateSelects();

    console.log('[UnitConverter] 초기화 완료');
    return this;
  }

  bindEvents() {
    this.elements.inputValue.addEventListener('input', () => this.convert());
    this.elements.fromUnit.addEventListener('change', () => this.convert());
    this.elements.toUnit.addEventListener('change', () => this.convert());

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentCategory = tab.dataset.cat;
        this.populateSelects();
      });
    });
  }

  populateSelects() {
    const cat = this.units[this.currentCategory];
    const fromSelect = this.elements.fromUnit;
    const toSelect = this.elements.toUnit;

    const options = Object.keys(cat.units).map(u =>
      `<option value="${u}">${cat.labels[u]}</option>`
    ).join('');

    fromSelect.innerHTML = options;
    toSelect.innerHTML = options;

    if (Object.keys(cat.units).length > 1) {
      toSelect.selectedIndex = 1;
    }

    this.convert();
  }

  convert() {
    const cat = this.units[this.currentCategory];
    const fromUnit = this.elements.fromUnit.value;
    const toUnit = this.elements.toUnit.value;
    const inputValue = parseFloat(this.elements.inputValue.value) || 0;

    let result;

    if (cat.special) {
      result = this.convertTemperature(inputValue, fromUnit, toUnit);
    } else {
      const baseValue = inputValue * cat.units[fromUnit];
      result = baseValue / cat.units[toUnit];
    }

    this.elements.outputValue.value = result.toFixed(6).replace(/\.?0+$/, '');
    this.updateConversionTable(inputValue, fromUnit);
  }

  convertTemperature(value, from, to) {
    let celsius;
    if (from === 'c') celsius = value;
    else if (from === 'f') celsius = (value - 32) * 5/9;
    else celsius = value - 273.15;

    if (to === 'c') return celsius;
    else if (to === 'f') return celsius * 9/5 + 32;
    else return celsius + 273.15;
  }

  updateConversionTable(value, fromUnit) {
    const cat = this.units[this.currentCategory];
    const table = this.elements.conversionTable;

    let rows = '';
    for (const [unit, factor] of Object.entries(cat.units)) {
      let converted;
      if (cat.special) {
        converted = this.convertTemperature(value, fromUnit, unit);
      } else {
        const baseValue = value * cat.units[fromUnit];
        converted = baseValue / factor;
      }
      rows += `<div class="conv-row"><span class="from">${value} ${cat.labels[fromUnit]}</span><span class="to">${converted.toFixed(4)} ${cat.labels[unit]}</span></div>`;
    }

    table.innerHTML = `<h4>변환표</h4>${rows}`;
  }

  swapUnits() {
    const fromSelect = this.elements.fromUnit;
    const toSelect = this.elements.toUnit;
    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;
    this.convert();
  }
}

// 전역 인스턴스 생성
const unitConverter = new UnitConverter();
window.UnitConverter = unitConverter;

document.addEventListener('DOMContentLoaded', () => unitConverter.init());
