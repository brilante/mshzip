/**
 * Google Fonts 브라우저 - ToolBase 기반
 * Google Fonts 검색 및 미리보기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class GoogleFontsBrowser extends ToolBase {
  constructor() {
    super('GoogleFontsBrowser');
    this.googleFonts = [
      { family: 'Roboto', category: 'sans-serif', variants: ['100','300','400','500','700','900'] },
      { family: 'Open Sans', category: 'sans-serif', variants: ['300','400','600','700','800'] },
      { family: 'Lato', category: 'sans-serif', variants: ['100','300','400','700','900'] },
      { family: 'Montserrat', category: 'sans-serif', variants: ['100','300','400','500','600','700','800','900'] },
      { family: 'Poppins', category: 'sans-serif', variants: ['100','300','400','500','600','700','800','900'] },
      { family: 'Noto Sans KR', category: 'sans-serif', variants: ['100','300','400','500','700','900'] },
      { family: 'Playfair Display', category: 'serif', variants: ['400','500','600','700','800','900'] },
      { family: 'Merriweather', category: 'serif', variants: ['300','400','700','900'] },
      { family: 'Noto Serif KR', category: 'serif', variants: ['200','300','400','500','600','700','900'] },
      { family: 'Georgia', category: 'serif', variants: ['400','700'] },
      { family: 'Pacifico', category: 'handwriting', variants: ['400'] },
      { family: 'Dancing Script', category: 'handwriting', variants: ['400','500','600','700'] },
      { family: 'Caveat', category: 'handwriting', variants: ['400','500','600','700'] },
      { family: 'Lobster', category: 'display', variants: ['400'] },
      { family: 'Bebas Neue', category: 'display', variants: ['400'] },
      { family: 'Oswald', category: 'display', variants: ['200','300','400','500','600','700'] },
      { family: 'Source Code Pro', category: 'monospace', variants: ['200','300','400','500','600','700','900'] },
      { family: 'Fira Code', category: 'monospace', variants: ['300','400','500','600','700'] },
      { family: 'JetBrains Mono', category: 'monospace', variants: ['100','300','400','500','600','700','800'] }
    ];
    this.loadedFonts = new Set();
  }

  init() {
    this.initElements({
      searchInput: 'searchInput',
      categoryFilter: 'categoryFilter',
      previewTextInput: 'previewTextInput',
      fontsList: 'fontsList'
    });

    this.bindEvents();
    this.render();

    console.log('[GoogleFontsBrowser] 초기화 완료');
    return this;
  }

  bindEvents() {
    this.elements.searchInput.addEventListener('input', () => this.render());
    this.elements.categoryFilter.addEventListener('change', () => this.render());
    this.elements.previewTextInput.addEventListener('input', () => this.render());
  }

  loadGoogleFont(fontFamily) {
    if (this.loadedFonts.has(fontFamily)) return;
    this.loadedFonts.add(fontFamily);
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@400;700&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  render() {
    const search = this.elements.searchInput.value.toLowerCase();
    const category = this.elements.categoryFilter.value;
    const previewText = this.elements.previewTextInput.value || 'The quick brown fox jumps';

    const filtered = this.googleFonts.filter(font => {
      const matchesSearch = font.family.toLowerCase().includes(search);
      const matchesCategory = category === 'all' || font.category === category;
      return matchesSearch && matchesCategory;
    });

    filtered.forEach(font => this.loadGoogleFont(font.family));

    const html = filtered.map(font => `
      <div class="font-item">
        <div class="font-item-header">
          <span class="font-item-name">${font.family}</span>
          <span class="font-item-category">${font.category}</span>
        </div>
        <div class="font-item-preview" style="font-family: '${font.family}', ${font.category};">
          ${this.escapeHtml(previewText)}
        </div>
        <div class="font-item-actions">
          <button onclick="googleFontsBrowser.copyCSS('${font.family}')">CSS 복사</button>
          <button onclick="googleFontsBrowser.copyLink('${font.family}')">Link 복사</button>
        </div>
      </div>
    `).join('');

    this.elements.fontsList.innerHTML = html || '<div class="loading">검색 결과가 없습니다.</div>';
  }

  copyCSS(fontFamily) {
    this.copyToClipboard(`font-family: '${fontFamily}', sans-serif;`);
  }

  copyLink(fontFamily) {
    const link = `<link href="https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}&display=swap" rel="stylesheet">`;
    this.copyToClipboard(link);
  }
}

// 전역 인스턴스 생성
const googleFontsBrowser = new GoogleFontsBrowser();
window.GoogleFontsBrowser = googleFontsBrowser;

document.addEventListener('DOMContentLoaded', () => googleFontsBrowser.init());
