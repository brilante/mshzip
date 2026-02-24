/**
 * 요리 온도 변환기 - ToolBase 기반
 * 섭씨/화씨/가스마크 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TempConverter = class TempConverter extends ToolBase {
  constructor() {
    super('TempConverter');
  }

  init() {
    this.initElements({
      celsiusInput: 'celsiusInput',
      fahrenheitInput: 'fahrenheitInput',
      resultValue: 'resultValue',
      resultDesc: 'resultDesc',
      gasMark: 'gasMark'
    });

    this.convertFromCelsius();

    console.log('[TempConverter] 초기화 완료');
    return this;
  }

  setTemp(celsius) {
    this.elements.celsiusInput.value = celsius;
    this.convertFromCelsius();
  }

  convertFromCelsius() {
    const celsius = parseFloat(this.elements.celsiusInput.value) || 0;
    const fahrenheit = (celsius * 9/5) + 32;

    this.elements.fahrenheitInput.value = Math.round(fahrenheit);
    this.updateDisplay(celsius, fahrenheit);
  }

  convertFromFahrenheit() {
    const fahrenheit = parseFloat(this.elements.fahrenheitInput.value) || 0;
    const celsius = (fahrenheit - 32) * 5/9;

    this.elements.celsiusInput.value = Math.round(celsius);
    this.updateDisplay(celsius, fahrenheit);
  }

  updateDisplay(celsius, fahrenheit) {
    this.elements.resultValue.textContent = `${Math.round(celsius)}°C = ${Math.round(fahrenheit)}°F`;

    // 온도 설명
    let desc = '';
    if (celsius < 0) desc = '영하 온도';
    else if (celsius < 50) desc = '낮은 온도';
    else if (celsius < 100) desc = '따뜻한 온도';
    else if (celsius === 100) desc = '물 끓는점';
    else if (celsius < 150) desc = '낮은 오븐 온도';
    else if (celsius < 180) desc = '중저온 오븐';
    else if (celsius < 200) desc = '중간 오븐 온도';
    else if (celsius < 230) desc = '높은 오븐 온도';
    else desc = '매우 높은 온도';

    this.elements.resultDesc.textContent = desc;

    // 가스 마크 계산
    const gasMark = this.celsiusToGasMark(celsius);
    this.elements.gasMark.textContent = gasMark;
  }

  celsiusToGasMark(celsius) {
    if (celsius < 110) return '가스마크 해당 없음';
    if (celsius < 130) return 'Gas Mark 1/4';
    if (celsius < 140) return 'Gas Mark 1/2';
    if (celsius < 150) return 'Gas Mark 1';
    if (celsius < 160) return 'Gas Mark 2';
    if (celsius < 180) return 'Gas Mark 3';
    if (celsius < 190) return 'Gas Mark 4';
    if (celsius < 200) return 'Gas Mark 5';
    if (celsius < 220) return 'Gas Mark 6';
    if (celsius < 230) return 'Gas Mark 7';
    if (celsius < 240) return 'Gas Mark 8';
    if (celsius < 260) return 'Gas Mark 9';
    return 'Gas Mark 10';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const tempConverter = new TempConverter();
window.TempConverter = tempConverter;

document.addEventListener('DOMContentLoaded', () => tempConverter.init());
