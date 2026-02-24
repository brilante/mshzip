/**
 * OG Tag 생성기 - ToolBase 기반
 * Open Graph 및 Twitter Card 메타 태그 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var OGTagGen = class OGTagGen extends ToolBase {
  constructor() {
    super('OGTagGen');
  }

  init() {
    this.initElements({
      ogTitle: 'ogTitle',
      ogDescription: 'ogDescription',
      ogUrl: 'ogUrl',
      ogImage: 'ogImage',
      ogSiteName: 'ogSiteName',
      ogType: 'ogType',
      ogLocale: 'ogLocale',
      twitterCard: 'twitterCard',
      twitterSite: 'twitterSite',
      outputCode: 'outputCode',
      previewTitle: 'previewTitle',
      previewDesc: 'previewDesc',
      previewUrl: 'previewUrl',
      previewSiteName: 'previewSiteName',
      previewImage: 'previewImage'
    });

    this.generate();

    console.log('[OGTagGen] 초기화 완료');
    return this;
  }

  generate() {
    const title = this.elements.ogTitle.value || '페이지 제목';
    const description = this.elements.ogDescription.value || '페이지 설명';
    const url = this.elements.ogUrl.value || 'https://example.com';
    const image = this.elements.ogImage.value || '';
    const siteName = this.elements.ogSiteName.value || '';
    const type = this.elements.ogType.value;
    const locale = this.elements.ogLocale.value;
    const twitterCard = this.elements.twitterCard.value;
    const twitterSite = this.elements.twitterSite.value || '';

    let tags = `<!-- Open Graph Tags -->\n`;
    tags += `<meta property="og:title" content="${this.escapeHtml(title)}">\n`;
    tags += `<meta property="og:description" content="${this.escapeHtml(description)}">\n`;
    tags += `<meta property="og:url" content="${this.escapeHtml(url)}">\n`;
    tags += `<meta property="og:type" content="${type}">\n`;
    tags += `<meta property="og:locale" content="${locale}">\n`;

    if (image) {
      tags += `<meta property="og:image" content="${this.escapeHtml(image)}">\n`;
      tags += `<meta property="og:image:alt" content="${this.escapeHtml(title)}">\n`;
    }

    if (siteName) {
      tags += `<meta property="og:site_name" content="${this.escapeHtml(siteName)}">\n`;
    }

    tags += `\n<!-- Twitter Card Tags -->\n`;
    tags += `<meta name="twitter:card" content="${twitterCard}">\n`;
    tags += `<meta name="twitter:title" content="${this.escapeHtml(title)}">\n`;
    tags += `<meta name="twitter:description" content="${this.escapeHtml(description)}">\n`;

    if (image) {
      tags += `<meta name="twitter:image" content="${this.escapeHtml(image)}">\n`;
    }

    if (twitterSite) {
      tags += `<meta name="twitter:site" content="${this.escapeHtml(twitterSite)}">\n`;
    }

    this.elements.outputCode.textContent = tags;
    this.updatePreview(title, description, url, image, siteName);
  }

  updatePreview(title, description, url, image, siteName) {
    this.elements.previewTitle.textContent = title;
    this.elements.previewDesc.textContent = description;
    this.elements.previewUrl.textContent = url;
    this.elements.previewSiteName.textContent = siteName || new URL(url).hostname;

    if (image) {
      this.elements.previewImage.src = image;
      this.elements.previewImage.style.display = 'block';
    } else {
      this.elements.previewImage.style.display = 'none';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/"/g, '&quot;');
  }

  async copy() {
    const code = this.elements.outputCode.textContent;
    const success = await this.copyToClipboard(code);
    this.showToast(success ? '복사됨!' : '복사 실패', success ? 'success' : 'error');
  }
}

// 전역 인스턴스 생성
const ogTagGen = new OGTagGen();
window.OGTagGen = ogTagGen;

// 전역 함수 (HTML onclick 호환)
function generate() { ogTagGen.generate(); }
function copy() { ogTagGen.copy(); }

document.addEventListener('DOMContentLoaded', () => ogTagGen.init());
