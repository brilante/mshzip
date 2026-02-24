/**
 * 속도 변환기 - ToolBase 기반
 * 속도 단위 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SpeedConvert = class SpeedConvert extends ToolBase {
  constructor() {
    super('SpeedConvert');
    // km/h 기준 변환 계수
    this.factors = {
      kmh: 1,
      mph: 1.60934,      // 1 mph = 1.60934 km/h
      ms: 3.6,           // 1 m/s = 3.6 km/h
      knot: 1.852,       // 1 knot = 1.852 km/h
      mach: 1234.8       // 1 Mach ≈ 1234.8 km/h (해수면, 15°C 기준)
    };
  }

  init() {
    this.initElements({
      kmh: 'kmh',
      mph: 'mph',
      ms: 'ms',
      knot: 'knot',
      mach: 'mach'
    });

    this.convert('kmh');

    console.log('[SpeedConvert] 초기화 완료');
    return this;
  }

  convert(fromUnit) {
    const inputValue = parseFloat(this.elements[fromUnit].value) || 0;

    // 입력값을 km/h로 변환
    const kmhValue = inputValue * this.factors[fromUnit];

    // 모든 단위로 변환
    Object.keys(this.factors).forEach(unit => {
      if (unit !== fromUnit) {
        const convertedValue = kmhValue / this.factors[unit];
        this.elements[unit].value = this.formatNumber(convertedValue, unit);
      }
    });
  }

  setKmh(value) {
    this.elements.kmh.value = value;
    this.convert('kmh');
  }

  formatNumber(value, unit) {
    if (unit === 'mach') {
      return value.toFixed(3);
    } else if (value >= 1000) {
      return value.toFixed(0);
    } else if (value >= 100) {
      return value.toFixed(1);
    } else {
      return value.toFixed(2);
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const speedConvert = new SpeedConvert();
window.SpeedConvert = speedConvert;

document.addEventListener('DOMContentLoaded', () => speedConvert.init());
