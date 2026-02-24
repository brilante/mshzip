/**
 * 단위 변환기 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var UnitConverter = class UnitConverter extends ToolBase {
  constructor() {
    super('UnitConverter');
    this.currentCategory = 'length';
    this.units = {
      length: {
        name: '길이',
        base: 'm',
        units: {
          'km': { name: '킬로미터 (km)', factor: 1000 },
          'm': { name: '미터 (m)', factor: 1 },
          'cm': { name: '센티미터 (cm)', factor: 0.01 },
          'mm': { name: '밀리미터 (mm)', factor: 0.001 },
          'mi': { name: '마일 (mi)', factor: 1609.344 },
          'yd': { name: '야드 (yd)', factor: 0.9144 },
          'ft': { name: '피트 (ft)', factor: 0.3048 },
          'in': { name: '인치 (in)', factor: 0.0254 }
        }
      },
      weight: {
        name: '무게',
        base: 'kg',
        units: {
          't': { name: '톤 (t)', factor: 1000 },
          'kg': { name: '킬로그램 (kg)', factor: 1 },
          'g': { name: '그램 (g)', factor: 0.001 },
          'mg': { name: '밀리그램 (mg)', factor: 0.000001 },
          'lb': { name: '파운드 (lb)', factor: 0.453592 },
          'oz': { name: '온스 (oz)', factor: 0.0283495 }
        }
      },
      area: {
        name: '면적',
        base: 'm2',
        units: {
          'km2': { name: '제곱킬로미터 (km²)', factor: 1000000 },
          'ha': { name: '헥타르 (ha)', factor: 10000 },
          'm2': { name: '제곱미터 (m²)', factor: 1 },
          'cm2': { name: '제곱센티미터 (cm²)', factor: 0.0001 },
          'ac': { name: '에이커 (ac)', factor: 4046.86 },
          'ft2': { name: '제곱피트 (ft²)', factor: 0.092903 },
          'pyeong': { name: '평', factor: 3.305785 }
        }
      },
      volume: {
        name: '부피',
        base: 'l',
        units: {
          'm3': { name: '세제곱미터 (m³)', factor: 1000 },
          'l': { name: '리터 (L)', factor: 1 },
          'ml': { name: '밀리리터 (mL)', factor: 0.001 },
          'gal': { name: '갤런 (gal)', factor: 3.78541 },
          'qt': { name: '쿼트 (qt)', factor: 0.946353 },
          'pt': { name: '파인트 (pt)', factor: 0.473176 },
          'cup': { name: '컵', factor: 0.236588 }
        }
      },
      temperature: {
        name: '온도',
        base: 'c',
        units: {
          'c': { name: '섭씨 (°C)', factor: 1 },
          'f': { name: '화씨 (°F)', factor: 1 },
          'k': { name: '켈빈 (K)', factor: 1 }
        },
        custom: true
      },
      speed: {
        name: '속도',
        base: 'mps',
        units: {
          'kmph': { name: 'km/h', factor: 0.277778 },
          'mps': { name: 'm/s', factor: 1 },
          'mph': { name: 'mph', factor: 0.44704 },
          'knot': { name: '노트', factor: 0.514444 },
          'mach': { name: '마하', factor: 340.29 }
        }
      },
      data: {
        name: '데이터',
        base: 'byte',
        units: {
          'tb': { name: '테라바이트 (TB)', factor: 1099511627776 },
          'gb': { name: '기가바이트 (GB)', factor: 1073741824 },
          'mb': { name: '메가바이트 (MB)', factor: 1048576 },
          'kb': { name: '킬로바이트 (KB)', factor: 1024 },
          'byte': { name: '바이트 (B)', factor: 1 },
          'bit': { name: '비트 (bit)', factor: 0.125 }
        }
      },
      time: {
        name: '시간',
        base: 's',
        units: {
          'y': { name: '년', factor: 31536000 },
          'mo': { name: '월 (30일)', factor: 2592000 },
          'w': { name: '주', factor: 604800 },
          'd': { name: '일', factor: 86400 },
          'h': { name: '시간', factor: 3600 },
          'min': { name: '분', factor: 60 },
          's': { name: '초', factor: 1 },
          'ms': { name: '밀리초', factor: 0.001 }
        }
      }
    };
  }

  init() {
    this.initElements({
      inputValue: 'inputValue',
      outputValue: 'outputValue',
      fromUnit: 'fromUnit',
      toUnit: 'toUnit',
      referenceTable: 'referenceTable'
    });

    this.setCategory('length');
    console.log('[UnitConverter] 초기화 완료');
    return this;
  }

  setCategory(category) {
    this.currentCategory = category;

    // 탭 활성화
    document.querySelectorAll('.category-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === category);
    });

    // 단위 옵션 업데이트
    this.updateUnitOptions();
    this.convert();
    this.updateReferenceTable();
  }

  updateUnitOptions() {
    const categoryData = this.units[this.currentCategory];
    const units = Object.entries(categoryData.units);

    this.elements.fromUnit.innerHTML = units.map(([key, unit]) =>
      `<option value="${key}">${unit.name}</option>`
    ).join('');

    this.elements.toUnit.innerHTML = units.map(([key, unit]) =>
      `<option value="${key}">${unit.name}</option>`
    ).join('');

    // 기본 선택값 설정
    if (units.length >= 2) {
      this.elements.fromUnit.value = units[0][0];
      this.elements.toUnit.value = units[1][0];
    }
  }

  convert() {
    const value = parseFloat(this.elements.inputValue.value) || 0;
    const fromUnit = this.elements.fromUnit.value;
    const toUnit = this.elements.toUnit.value;

    const result = this.convertValue(value, fromUnit, toUnit);
    this.elements.outputValue.value = this.formatNumber(result);
    this.updateReferenceTable();
  }

  convertValue(value, fromUnit, toUnit) {
    const categoryData = this.units[this.currentCategory];

    // 온도는 특별 처리
    if (this.currentCategory === 'temperature') {
      return this.convertTemperature(value, fromUnit, toUnit);
    }

    // 일반 변환: 값 → 기본 단위 → 대상 단위
    const fromFactor = categoryData.units[fromUnit].factor;
    const toFactor = categoryData.units[toUnit].factor;

    return (value * fromFactor) / toFactor;
  }

  convertTemperature(value, from, to) {
    // 먼저 섭씨로 변환
    let celsius;
    switch (from) {
      case 'c': celsius = value; break;
      case 'f': celsius = (value - 32) * 5 / 9; break;
      case 'k': celsius = value - 273.15; break;
    }

    // 섭씨에서 대상 단위로 변환
    switch (to) {
      case 'c': return celsius;
      case 'f': return celsius * 9 / 5 + 32;
      case 'k': return celsius + 273.15;
    }
  }

  formatNumber(num) {
    if (Math.abs(num) < 0.000001 || Math.abs(num) >= 1000000000) {
      return num.toExponential(6);
    }
    // 소수점 최대 10자리, 불필요한 0 제거
    return parseFloat(num.toPrecision(10)).toString();
  }

  swap() {
    const fromUnit = this.elements.fromUnit.value;
    const toUnit = this.elements.toUnit.value;

    this.elements.fromUnit.value = toUnit;
    this.elements.toUnit.value = fromUnit;

    this.convert();
  }

  updateReferenceTable() {
    const value = parseFloat(this.elements.inputValue.value) || 0;
    const fromUnit = this.elements.fromUnit.value;
    const categoryData = this.units[this.currentCategory];

    const rows = Object.entries(categoryData.units)
      .filter(([key]) => key !== fromUnit)
      .map(([key, unit]) => {
        const converted = this.convertValue(value, fromUnit, key);
        return `
          <div class="reference-row">
            <span class="ref-unit">${unit.name}</span>
            <span class="ref-value">${this.formatNumber(converted)}</span>
          </div>
        `;
      })
      .join('');

    this.elements.referenceTable.innerHTML = rows;
  }

  async copy() {
    const result = this.elements.outputValue.value;
    if (!result) {
      this.showError('복사할 결과가 없습니다.');
      return;
    }

    await this.copyToClipboard(result);
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const unitConverter = new UnitConverter();
window.UnitConverter = unitConverter;

document.addEventListener('DOMContentLoaded', () => unitConverter.init());
