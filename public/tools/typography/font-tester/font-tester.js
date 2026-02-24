/**
 * 폰트 테스터 - ToolBase 기반
 * 폰트 크기/굵기 조합 테스트
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class FontTester extends ToolBase {
  constructor() {
    super('FontTester');
    this.sizes = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 72];
    this.weights = [100, 300, 400, 500, 700, 900];
    this.currentFont = 'Noto Sans KR';
  }

  init() {
    this.initElements({
      fontName: 'fontName',
      testText: 'testText',
      showItalic: 'showItalic',
      showUppercase: 'showUppercase',
      testResults: 'testResults'
    });

    this.bindEvents();
    this.loadFont();

    console.log('[FontTester] 초기화 완료');
    return this;
  }

  bindEvents() {
    this.elements.testText.addEventListener('input', () => this.renderTests());
    this.elements.showItalic.addEventListener('change', () => this.renderTests());
    this.elements.showUppercase.addEventListener('change', () => this.renderTests());
  }

  async loadFont() {
    const fontName = this.elements.fontName.value.trim();
    if (!fontName) return;

    this.currentFont = fontName;
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@100;300;400;500;700;900&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    setTimeout(() => this.renderTests(), 500);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  renderTests() {
    const testText = this.elements.testText.value || '테스트 텍스트';
    const showItalic = this.elements.showItalic.checked;
    const showUppercase = this.elements.showUppercase.checked;

    const resultsHTML = this.sizes.map(size => `
      <div class="size-group">
        <div class="size-header">
          <span class="size-label">${size}px</span>
          <span>font-size: ${size}px</span>
        </div>
        ${this.weights.map(weight => `
          <div class="test-text ${showItalic ? 'italic' : ''} ${showUppercase ? 'uppercase' : ''}"
               style="font-family: '${this.currentFont}', sans-serif; font-size: ${size}px; font-weight: ${weight}; margin-bottom: 10px;">
            <small style="font-size: 12px; color: #999; font-weight: 400;">${weight}:</small> ${this.escapeHtml(testText)}
          </div>
        `).join('')}
      </div>
    `).join('');

    this.elements.testResults.innerHTML = resultsHTML;
  }
}

// 전역 인스턴스 생성
const fontTester = new FontTester();
window.FontTester = fontTester;

document.addEventListener('DOMContentLoaded', () => fontTester.init());
