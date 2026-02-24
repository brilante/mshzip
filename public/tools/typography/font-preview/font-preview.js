/**
 * 폰트 미리보기 - ToolBase 기반
 * 다양한 폰트로 텍스트 미리보기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class FontPreview extends ToolBase {
  constructor() {
    super('FontPreview');
    this.fonts = [
      { name: 'Noto Sans KR', family: "'Noto Sans KR', sans-serif", category: 'Sans-serif (한글)' },
      { name: 'Roboto', family: "'Roboto', sans-serif", category: 'Sans-serif' },
      { name: 'Open Sans', family: "'Open Sans', sans-serif", category: 'Sans-serif' },
      { name: 'Lato', family: "'Lato', sans-serif", category: 'Sans-serif' },
      { name: 'Montserrat', family: "'Montserrat', sans-serif", category: 'Sans-serif' },
      { name: 'Playfair Display', family: "'Playfair Display', serif", category: 'Serif' },
      { name: 'Merriweather', family: "'Merriweather', serif", category: 'Serif' },
      { name: 'Source Code Pro', family: "'Source Code Pro', monospace", category: 'Monospace' }
    ];
  }

  init() {
    this.initElements({
      previewText: 'previewText',
      fontSize: 'fontSize',
      fontSizeValue: 'fontSizeValue',
      fontWeight: 'fontWeight',
      textColor: 'textColor',
      fontsGrid: 'fontsGrid'
    });

    this.bindEvents();
    this.render();

    console.log('[FontPreview] 초기화 완료');
    return this;
  }

  bindEvents() {
    this.elements.previewText.addEventListener('input', () => this.updatePreviews());
    this.elements.fontSize.addEventListener('input', () => {
      this.elements.fontSizeValue.textContent = this.elements.fontSize.value + 'px';
      this.updatePreviews();
    });
    this.elements.fontWeight.addEventListener('change', () => this.updatePreviews());
    this.elements.textColor.addEventListener('input', () => this.updatePreviews());
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  render() {
    const { previewText, fontSize, fontWeight, textColor, fontsGrid } = this.elements;

    fontsGrid.innerHTML = this.fonts.map(font => `
      <div class="font-card">
        <div class="font-card-header">
          <span class="font-name">${font.name}</span>
          <span class="font-category">${font.category}</span>
        </div>
        <div class="font-preview" style="font-family: ${font.family}; font-size: ${fontSize.value}px; font-weight: ${fontWeight.value}; color: ${textColor.value};">
          ${this.escapeHtml(previewText.value) || '미리볼 텍스트를 입력하세요'}
        </div>
      </div>
    `).join('');
  }

  updatePreviews() {
    const { previewText, fontSize, fontWeight, textColor } = this.elements;

    document.querySelectorAll('.font-preview').forEach(el => {
      el.style.fontSize = fontSize.value + 'px';
      el.style.fontWeight = fontWeight.value;
      el.style.color = textColor.value;
      el.textContent = previewText.value || '미리볼 텍스트를 입력하세요';
    });
  }
}

// 전역 인스턴스 생성
const fontPreview = new FontPreview();
window.FontPreview = fontPreview;

document.addEventListener('DOMContentLoaded', () => fontPreview.init());
