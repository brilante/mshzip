/**
 * 로마 숫자 변환기 - ToolBase 기반
 * 아라비아 숫자 ↔ 로마 숫자 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class RomanNumerals extends ToolBase {
  constructor() {
    super('RomanNumerals');

    this.romanNumerals = [
      { value: 1000, numeral: 'M' },
      { value: 900, numeral: 'CM' },
      { value: 500, numeral: 'D' },
      { value: 400, numeral: 'CD' },
      { value: 100, numeral: 'C' },
      { value: 90, numeral: 'XC' },
      { value: 50, numeral: 'L' },
      { value: 40, numeral: 'XL' },
      { value: 10, numeral: 'X' },
      { value: 9, numeral: 'IX' },
      { value: 5, numeral: 'V' },
      { value: 4, numeral: 'IV' },
      { value: 1, numeral: 'I' }
    ];

    this.romanValues = {
      'I': 1, 'V': 5, 'X': 10, 'L': 50,
      'C': 100, 'D': 500, 'M': 1000
    };
  }

  init() {
    this.initElements({
      arabicInput: 'arabicInput',
      romanInput: 'romanInput',
      romanResult: 'romanResult',
      arabicResult: 'arabicResult',
      quickGrid: 'quickGrid'
    });

    this.elements.arabicInput.addEventListener('input', () => this.arabicToRoman());
    this.elements.romanInput.addEventListener('input', () => this.romanToArabic());

    this.renderQuickGrid();

    console.log('[RomanNumerals] 초기화 완료');
    return this;
  }

  toRoman(num) {
    if (num < 1 || num > 3999) return null;

    let result = '';
    for (const { value, numeral } of this.romanNumerals) {
      while (num >= value) {
        result += numeral;
        num -= value;
      }
    }
    return result;
  }

  toArabic(roman) {
    roman = roman.toUpperCase().trim();

    if (!/^[IVXLCDM]+$/.test(roman)) return null;

    let result = 0;
    let prev = 0;

    for (let i = roman.length - 1; i >= 0; i--) {
      const curr = this.romanValues[roman[i]];
      if (curr < prev) {
        result -= curr;
      } else {
        result += curr;
      }
      prev = curr;
    }

    if (this.toRoman(result) !== roman) return null;

    return result;
  }

  arabicToRoman() {
    const input = this.elements.arabicInput.value;
    const resultBox = this.elements.romanResult;

    const num = parseInt(input);

    if (isNaN(num) || num < 1 || num > 3999) {
      resultBox.textContent = '1~3999 사이의 숫자를 입력하세요';
      resultBox.className = 'result-box error';
      return;
    }

    const roman = this.toRoman(num);
    resultBox.textContent = roman;
    resultBox.className = 'result-box';
  }

  romanToArabic() {
    const input = this.elements.romanInput.value;
    const resultBox = this.elements.arabicResult;

    if (!input.trim()) {
      resultBox.textContent = '로마숫자를 입력하세요';
      resultBox.className = 'result-box error';
      return;
    }

    const num = this.toArabic(input);

    if (num === null) {
      resultBox.textContent = '유효하지 않은 로마숫자입니다';
      resultBox.className = 'result-box error';
      return;
    }

    resultBox.textContent = num.toLocaleString();
    resultBox.className = 'result-box';
  }

  renderQuickGrid() {
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 50, 100, 500, 1000, 2024, 2025];

    this.elements.quickGrid.innerHTML = numbers.map(n =>
      '<div class="quick-item" data-num="' + n + '">' +
      '<div class="quick-arabic">' + n + '</div>' +
      '<div class="quick-roman">' + this.toRoman(n) + '</div>' +
      '</div>'
    ).join('');

    this.elements.quickGrid.querySelectorAll('.quick-item').forEach(item => {
      item.addEventListener('click', () => this.showQuick(parseInt(item.dataset.num)));
    });
  }

  showQuick(num) {
    this.elements.arabicInput.value = num;
    this.arabicToRoman();
  }
}

// 전역 인스턴스 생성
const romanNumerals = new RomanNumerals();
window.RomanNumerals = romanNumerals;

// 전역 함수 (HTML onclick 호환)
function arabicToRoman() { romanNumerals.arabicToRoman(); }
function romanToArabic() { romanNumerals.romanToArabic(); }
function showQuick(num) { romanNumerals.showQuick(num); }

document.addEventListener('DOMContentLoaded', () => romanNumerals.init());
