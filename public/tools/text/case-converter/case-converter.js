/**
 * 대소문자 변환 도구 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CaseConverter = class CaseConverter extends ToolBase {
  constructor() {
    super('CaseConverter');
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      outputText: 'outputText',
      resultSection: 'resultSection'
    });

    console.log('[CaseConverter] 초기화 완료');
    return this;
  }

  convert(type) {
    const text = this.elements.inputText.value;
    if (!text.trim()) {
      this.showError('텍스트를 입력해주세요.');
      return;
    }

    let result;
    switch (type) {
      case 'upper':
        result = text.toUpperCase();
        break;
      case 'lower':
        result = text.toLowerCase();
        break;
      case 'title':
        result = this.toTitleCase(text);
        break;
      case 'sentence':
        result = this.toSentenceCase(text);
        break;
      case 'camel':
        result = this.toCamelCase(text);
        break;
      case 'pascal':
        result = this.toPascalCase(text);
        break;
      case 'snake':
        result = this.toSnakeCase(text);
        break;
      case 'kebab':
        result = this.toKebabCase(text);
        break;
      case 'toggle':
        result = this.toToggleCase(text);
        break;
      default:
        result = text;
    }

    this.elements.outputText.value = result;
    this.elements.resultSection.style.display = 'block';
  }

  toTitleCase(text) {
    return text.toLowerCase().replace(/(?:^|\s)\S/g, char => char.toUpperCase());
  }

  toSentenceCase(text) {
    return text.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, char => char.toUpperCase());
  }

  toCamelCase(text) {
    return text
      .toLowerCase()
      .replace(/[^a-zA-Z0-9가-힣]+(.)/g, (_, char) => char.toUpperCase())
      .replace(/^[A-Z]/, char => char.toLowerCase());
  }

  toPascalCase(text) {
    return text
      .toLowerCase()
      .replace(/(^|[^a-zA-Z0-9가-힣]+)(.)/g, (_, __, char) => char.toUpperCase());
  }

  toSnakeCase(text) {
    return text
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s\-]+/g, '_')
      .toLowerCase();
  }

  toKebabCase(text) {
    return text
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  toToggleCase(text) {
    return text.split('').map(char => {
      if (char === char.toUpperCase()) {
        return char.toLowerCase();
      }
      return char.toUpperCase();
    }).join('');
  }

  async copy() {
    const text = this.elements.outputText.value;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      this.showSuccess('클립보드에 복사되었습니다.');
    } catch (err) {
      this.showError('복사에 실패했습니다.');
    }
  }

  clear() {
    this.elements.inputText.value = '';
    this.elements.outputText.value = '';
    this.elements.resultSection.style.display = 'none';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const caseConverter = new CaseConverter();
window.CaseConverter = caseConverter;

document.addEventListener('DOMContentLoaded', () => caseConverter.init());
