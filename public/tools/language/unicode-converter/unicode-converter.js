/**
 * 유니코드 변환기 - ToolBase 기반
 * 텍스트와 유니코드 코드포인트 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var UnicodeConverter = class UnicodeConverter extends ToolBase {
  constructor() {
    super('UnicodeConverter');
    this.results = {
      codepoint: '',
      decimal: '',
      html: '',
      js: ''
    };
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      codepoint: 'codepoint',
      decimal: 'decimal',
      html: 'html',
      js: 'js'
    });

    this.elements.inputText.addEventListener('input', () => this.convert());
    this.convert();

    console.log('[UnicodeConverter] 초기화 완료');
    return this;
  }

  convert() {
    const input = this.elements.inputText.value;

    const codepoints = [];
    const decimals = [];
    const htmlEntities = [];
    const jsEscapes = [];

    for (const char of input) {
      const codePoint = char.codePointAt(0);

      codepoints.push('U+' + codePoint.toString(16).toUpperCase().padStart(4, '0'));
      decimals.push(codePoint);
      htmlEntities.push('&#' + codePoint + ';');

      if (codePoint > 0xFFFF) {
        // 서로게이트 페어 필요
        const offset = codePoint - 0x10000;
        const high = 0xD800 + (offset >> 10);
        const low = 0xDC00 + (offset & 0x3FF);
        jsEscapes.push('\\u' + high.toString(16).toUpperCase() + '\\u' + low.toString(16).toUpperCase());
      } else {
        jsEscapes.push('\\u' + codePoint.toString(16).toUpperCase().padStart(4, '0'));
      }
    }

    this.results.codepoint = codepoints.join(' ');
    this.results.decimal = decimals.join(' ');
    this.results.html = htmlEntities.join('');
    this.results.js = jsEscapes.join('');

    this.elements.codepoint.textContent = this.results.codepoint;
    this.elements.decimal.textContent = this.results.decimal;
    this.elements.html.textContent = this.results.html;
    this.elements.js.textContent = this.results.js;
  }

  copy(type) {
    const text = this.results[type];
    if (text) {
      this.copyToClipboard(text);
      this.showToast('클립보드에 복사되었습니다!', 'success');
    }
  }
}

// 전역 인스턴스 생성
const unicodeConverter = new UnicodeConverter();
window.UnicodeConverter = unicodeConverter;

document.addEventListener('DOMContentLoaded', () => unicodeConverter.init());
