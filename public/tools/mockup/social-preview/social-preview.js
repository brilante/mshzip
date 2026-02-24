/**
 * 소셜 미리보기 - ToolBase 기반
 * SNS 공유 미리보기 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class SocialPreview extends ToolBase {
  constructor() {
    super('SocialPreview');
    this.uploadedImage = null;
  }

  init() {
    this.initElements({
      uploadArea: 'uploadArea',
      imageInput: 'imageInput',
      ogTitle: 'ogTitle',
      ogDescription: 'ogDescription',
      ogUrl: 'ogUrl',
      fbTitle: 'fbTitle',
      fbDesc: 'fbDesc',
      fbDomain: 'fbDomain',
      fbImage: 'fbImage',
      twTitle: 'twTitle',
      twDesc: 'twDesc',
      twDomain: 'twDomain',
      twImage: 'twImage',
      liTitle: 'liTitle',
      liDomain: 'liDomain',
      liImage: 'liImage'
    });

    this.bindEvents();
    this.updatePreviews();

    console.log('[SocialPreview] 초기화 완료');
    return this;
  }

  bindEvents() {
    this.elements.uploadArea.addEventListener('click', () => this.elements.imageInput.click());
    this.elements.imageInput.addEventListener('change', (e) => {
      if (e.target.files[0]) this.handleImage(e.target.files[0]);
    });

    ['ogTitle', 'ogDescription', 'ogUrl'].forEach(id => {
      const el = this.elements[id];
      if (el) {
        el.addEventListener('input', () => this.updatePreviews());
      }
    });
  }

  handleImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.uploadedImage = e.target.result;
      this.updatePreviews();
    };
    reader.readAsDataURL(file);
  }

  updatePreviews() {
    const title = this.elements.ogTitle.value;
    const desc = this.elements.ogDescription.value;
    const url = this.elements.ogUrl.value;

    let domain = 'example.com';
    try {
      domain = new URL(url).hostname;
    } catch (e) {}

    // Facebook
    this.elements.fbTitle.textContent = title || 'No title';
    this.elements.fbDesc.textContent = desc ? desc.substring(0, 100) + '...' : '';
    this.elements.fbDomain.textContent = domain.toUpperCase();
    this.elements.fbImage.innerHTML = this.uploadedImage
      ? `<img src="${this.uploadedImage}" alt="OG Image">`
      : '<div class="placeholder">이미지 없음</div>';

    // Twitter
    this.elements.twTitle.textContent = title || 'No title';
    this.elements.twDesc.textContent = desc ? desc.substring(0, 70) + '...' : '';
    this.elements.twDomain.textContent = '' + domain;
    this.elements.twImage.innerHTML = this.uploadedImage
      ? `<img src="${this.uploadedImage}" alt="OG Image">`
      : '<div class="placeholder">이미지 없음</div>';

    // LinkedIn
    this.elements.liTitle.textContent = title || 'No title';
    this.elements.liDomain.textContent = domain;
    this.elements.liImage.innerHTML = this.uploadedImage
      ? `<img src="${this.uploadedImage}" alt="OG Image">`
      : '<div class="placeholder">이미지 없음</div>';
  }
}

// 전역 인스턴스 생성
const socialPreview = new SocialPreview();
window.SocialPreview = socialPreview;

// 전역 함수 (HTML onclick 호환)
function updatePreviews() { socialPreview.updatePreviews(); }

document.addEventListener('DOMContentLoaded', () => socialPreview.init());
