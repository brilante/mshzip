/**
 * 메타 태그 미리보기 - ToolBase 기반
 * 검색 결과 및 소셜 미디어 미리보기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class MetaPreview extends ToolBase {
  constructor() {
    super('MetaPreview');
  }

  init() {
    this.initElements({
      pageTitle: 'pageTitle',
      pageDescription: 'pageDescription',
      pageUrl: 'pageUrl',
      pageImage: 'pageImage',
      fetchUrl: 'fetchUrl',
      // Google preview
      googleTitle: 'googleTitle',
      googleUrl: 'googleUrl',
      googleDesc: 'googleDesc',
      // Facebook preview
      fbTitle: 'fbTitle',
      fbDesc: 'fbDesc',
      fbDomain: 'fbDomain',
      fbImage: 'fbImage',
      // Twitter preview
      twTitle: 'twTitle',
      twDesc: 'twDesc',
      twDomain: 'twDomain',
      twImage: 'twImage',
      // LinkedIn preview
      liTitle: 'liTitle',
      liDomain: 'liDomain',
      liImage: 'liImage',
      // Kakao preview
      kakaoTitle: 'kakaoTitle',
      kakaoDesc: 'kakaoDesc',
      kakaoDomain: 'kakaoDomain',
      kakaoImage: 'kakaoImage',
      // Analysis
      titleAnalysis: 'titleAnalysis',
      descAnalysis: 'descAnalysis'
    });

    this.updatePreviews();

    console.log('[MetaPreview] 초기화 완료');
    return this;
  }

  updatePreviews() {
    const title = this.elements.pageTitle.value || '페이지 제목';
    const description = this.elements.pageDescription.value || '페이지에 대한 설명이 여기에 표시됩니다. 메타 설명은 검색 결과에서 사용자에게 페이지 내용을 알려주는 중요한 요소입니다.';
    const url = this.elements.pageUrl.value || 'https://example.com/page';
    const image = this.elements.pageImage.value || '';

    // Google 미리보기
    this.updateGooglePreview(title, description, url);

    // Facebook 미리보기
    this.updateFacebookPreview(title, description, url, image);

    // Twitter 미리보기
    this.updateTwitterPreview(title, description, url, image);

    // LinkedIn 미리보기
    this.updateLinkedInPreview(title, description, url, image);

    // 카카오톡 미리보기
    this.updateKakaoPreview(title, description, url, image);

    // 분석 업데이트
    this.updateAnalysis(title, description);
  }

  updateGooglePreview(title, description, url) {
    const displayTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
    const displayDesc = description.length > 155 ? description.substring(0, 152) + '...' : description;
    const displayUrl = this.formatUrl(url);

    this.elements.googleTitle.textContent = displayTitle;
    this.elements.googleUrl.textContent = displayUrl;
    this.elements.googleDesc.textContent = displayDesc;
  }

  updateFacebookPreview(title, description, url, image) {
    const displayTitle = title.length > 88 ? title.substring(0, 85) + '...' : title;
    const displayDesc = description.length > 300 ? description.substring(0, 297) + '...' : description;

    this.elements.fbTitle.textContent = displayTitle;
    this.elements.fbDesc.textContent = displayDesc;
    this.elements.fbDomain.textContent = this.extractDomain(url);

    if (image) {
      this.elements.fbImage.src = image;
      this.elements.fbImage.style.display = 'block';
    } else {
      this.elements.fbImage.style.display = 'none';
    }
  }

  updateTwitterPreview(title, description, url, image) {
    const displayTitle = title.length > 70 ? title.substring(0, 67) + '...' : title;
    const displayDesc = description.length > 200 ? description.substring(0, 197) + '...' : description;

    this.elements.twTitle.textContent = displayTitle;
    this.elements.twDesc.textContent = displayDesc;
    this.elements.twDomain.textContent = this.extractDomain(url);

    if (image) {
      this.elements.twImage.src = image;
      this.elements.twImage.style.display = 'block';
    } else {
      this.elements.twImage.style.display = 'none';
    }
  }

  updateLinkedInPreview(title, description, url, image) {
    const displayTitle = title.length > 120 ? title.substring(0, 117) + '...' : title;

    this.elements.liTitle.textContent = displayTitle;
    this.elements.liDomain.textContent = this.extractDomain(url);

    if (image) {
      this.elements.liImage.src = image;
      this.elements.liImage.style.display = 'block';
    } else {
      this.elements.liImage.style.display = 'none';
    }
  }

  updateKakaoPreview(title, description, url, image) {
    const displayTitle = title.length > 40 ? title.substring(0, 37) + '...' : title;
    const displayDesc = description.length > 80 ? description.substring(0, 77) + '...' : description;

    this.elements.kakaoTitle.textContent = displayTitle;
    this.elements.kakaoDesc.textContent = displayDesc;
    this.elements.kakaoDomain.textContent = this.extractDomain(url);

    if (image) {
      this.elements.kakaoImage.src = image;
      this.elements.kakaoImage.style.display = 'block';
    } else {
      this.elements.kakaoImage.style.display = 'none';
    }
  }

  updateAnalysis(title, description) {
    const titleLength = title.length;
    const descLength = description.length;

    // 제목 분석
    let titleStatus = 'good';
    let titleMsg = '적절한 길이입니다 (50-60자 권장)';
    if (titleLength < 30) {
      titleStatus = 'warning';
      titleMsg = '너무 짧습니다. 30자 이상을 권장합니다.';
    } else if (titleLength > 60) {
      titleStatus = 'warning';
      titleMsg = '너무 깁니다. 검색 결과에서 잘릴 수 있습니다.';
    }

    this.elements.titleAnalysis.innerHTML = `
      <span class="status-dot ${titleStatus}"></span>
      <span>제목: ${titleLength}자 - ${titleMsg}</span>
    `;

    // 설명 분석
    let descStatus = 'good';
    let descMsg = '적절한 길이입니다 (120-155자 권장)';
    if (descLength < 70) {
      descStatus = 'warning';
      descMsg = '너무 짧습니다. 70자 이상을 권장합니다.';
    } else if (descLength > 155) {
      descStatus = 'warning';
      descMsg = '너무 깁니다. 검색 결과에서 잘릴 수 있습니다.';
    }

    this.elements.descAnalysis.innerHTML = `
      <span class="status-dot ${descStatus}"></span>
      <span>설명: ${descLength}자 - ${descMsg}</span>
    `;
  }

  formatUrl(url) {
    try {
      const u = new URL(url.startsWith('http') ? url : 'https://' + url);
      return u.hostname + u.pathname;
    } catch {
      return url;
    }
  }

  extractDomain(url) {
    try {
      const u = new URL(url.startsWith('http') ? url : 'https://' + url);
      return u.hostname;
    } catch {
      return url;
    }
  }

  async fetchFromUrl() {
    const url = this.elements.fetchUrl.value.trim();
    if (!url) {
      this.showToast('URL을 입력하세요.', 'warning');
      return;
    }

    this.showToast('이 기능은 서버 사이드 구현이 필요합니다.', 'info');
  }
}

// 전역 인스턴스 생성
const metaPreview = new MetaPreview();
window.MetaPreview = metaPreview;

document.addEventListener('DOMContentLoaded', () => metaPreview.init());
