/**
 * 메타 태그 생성기 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var MetaGenerator = class MetaGenerator extends ToolBase {
  constructor() {
    super('MetaGenerator');
  }

  init() {
    this.initElements({
      pageTitle: 'pageTitle',
      pageDescription: 'pageDescription',
      pageKeywords: 'pageKeywords',
      pageUrl: 'pageUrl',
      ogType: 'ogType',
      ogSiteName: 'ogSiteName',
      ogImage: 'ogImage',
      twitterCard: 'twitterCard',
      twitterSite: 'twitterSite',
      metaOutput: 'metaOutput',
      titleCount: 'titleCount',
      descCount: 'descCount',
      previewTitle: 'previewTitle',
      previewUrl: 'previewUrl',
      previewDesc: 'previewDesc'
    });

    this.setupEventListeners();
    console.log('[MetaGenerator] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    const { pageTitle, pageDescription, titleCount, descCount } = this.elements;

    // 글자수 카운터 업데이트
    this.on(pageTitle, 'input', () => {
      titleCount.textContent = pageTitle.value.length;
    });

    this.on(pageDescription, 'input', () => {
      descCount.textContent = pageDescription.value.length;
    });
  }

  generate() {
    const title = this.elements.pageTitle.value.trim();
    const description = this.elements.pageDescription.value.trim();
    const keywords = this.elements.pageKeywords.value.trim();
    const url = this.elements.pageUrl.value.trim();
    const ogType = this.elements.ogType.value;
    const ogSiteName = this.elements.ogSiteName.value.trim();
    const ogImage = this.elements.ogImage.value.trim();
    const twitterCard = this.elements.twitterCard.value;
    const twitterSite = this.elements.twitterSite.value.trim();

    const optRobots = document.getElementById('optRobots').checked;
    const optViewport = document.getElementById('optViewport').checked;
    const optCharset = document.getElementById('optCharset').checked;
    const optCanonical = document.getElementById('optCanonical').checked;

    // 미리보기 업데이트
    this.elements.previewTitle.textContent = title || '페이지 제목';
    this.elements.previewUrl.textContent = url || 'https://example.com/page';
    this.elements.previewDesc.textContent = description || '페이지 설명이 여기에 표시됩니다.';

    // 메타 태그 생성
    let meta = [];

    // 기본 태그
    if (optCharset) {
      meta.push('<meta charset="UTF-8">');
    }
    if (optViewport) {
      meta.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
    }

    // 기본 SEO 태그
    if (title) {
      meta.push(`<title>${this.escapeHtml(title)}</title>`);
      meta.push(`<meta name="title" content="${this.escapeHtml(title)}">`);
    }
    if (description) {
      meta.push(`<meta name="description" content="${this.escapeHtml(description)}">`);
    }
    if (keywords) {
      meta.push(`<meta name="keywords" content="${this.escapeHtml(keywords)}">`);
    }

    // Robots
    if (optRobots) {
      meta.push('<meta name="robots" content="index, follow">');
    } else {
      meta.push('<meta name="robots" content="noindex, nofollow">');
    }

    // Canonical URL
    if (optCanonical && url) {
      meta.push(`<link rel="canonical" href="${this.escapeHtml(url)}">`);
    }

    // Open Graph
    meta.push('');
    meta.push('<!-- Open Graph / Facebook -->');
    meta.push(`<meta property="og:type" content="${ogType}">`);
    if (url) {
      meta.push(`<meta property="og:url" content="${this.escapeHtml(url)}">`);
    }
    if (title) {
      meta.push(`<meta property="og:title" content="${this.escapeHtml(title)}">`);
    }
    if (description) {
      meta.push(`<meta property="og:description" content="${this.escapeHtml(description)}">`);
    }
    if (ogImage) {
      meta.push(`<meta property="og:image" content="${this.escapeHtml(ogImage)}">`);
    }
    if (ogSiteName) {
      meta.push(`<meta property="og:site_name" content="${this.escapeHtml(ogSiteName)}">`);
    }

    // Twitter Card
    meta.push('');
    meta.push('<!-- Twitter -->');
    meta.push(`<meta name="twitter:card" content="${twitterCard}">`);
    if (url) {
      meta.push(`<meta name="twitter:url" content="${this.escapeHtml(url)}">`);
    }
    if (title) {
      meta.push(`<meta name="twitter:title" content="${this.escapeHtml(title)}">`);
    }
    if (description) {
      meta.push(`<meta name="twitter:description" content="${this.escapeHtml(description)}">`);
    }
    if (ogImage) {
      meta.push(`<meta name="twitter:image" content="${this.escapeHtml(ogImage)}">`);
    }
    if (twitterSite) {
      meta.push(`<meta name="twitter:site" content="${this.escapeHtml(twitterSite)}">`);
    }

    this.elements.metaOutput.innerHTML = `<code>${this.escapeHtml(meta.join('\n'))}</code>`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async copy() {
    const code = this.elements.metaOutput.textContent;
    if (!code || code.includes('메타 태그가 여기에 생성됩니다')) {
      this.showToast('복사할 메타 태그가 없습니다.', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      this.showToast('메타 태그가 복사되었습니다.');
    } catch (err) {
      this.showToast('복사에 실패했습니다.', 'error');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const metaGenerator = new MetaGenerator();
window.MetaGenerator = metaGenerator;

document.addEventListener('DOMContentLoaded', () => metaGenerator.init());
