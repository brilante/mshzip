/**
 * URL 확장기 - ToolBase 기반
 * 단축 URL의 원래 주소 확인
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var UrlExpander = class UrlExpander extends ToolBase {
  constructor() {
    super('UrlExpander');
    this.expandedUrl = '';

    this.shortenerServices = {
      'bit.ly': 'Bitly',
      't.co': 'Twitter',
      'goo.gl': 'Google',
      'tinyurl.com': 'TinyURL',
      'ow.ly': 'Hootsuite',
      'is.gd': 'is.gd',
      'buff.ly': 'Buffer',
      'short.mm3': 'MyMind3'
    };

    this.sampleTargets = [
      'https://www.example.com/products/amazing-product-2026-edition',
      'https://www.github.com/user/repository/issues/123',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://www.amazon.com/dp/B08N5WRWNW',
      'https://docs.google.com/document/d/1234567890abcdef/edit',
      'https://www.notion.so/workspace/page-12345',
      'https://medium.com/@user/amazing-article-about-something'
    ];
  }

  init() {
    this.initElements({
      urlInput: 'urlInput',
      expandedUrl: 'expandedUrl',
      serviceInfo: 'serviceInfo',
      redirectCount: 'redirectCount',
      targetDomain: 'targetDomain',
      safetyStatus: 'safetyStatus',
      resultBox: 'resultBox'
    });

    this.elements.urlInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.expand();
    });

    console.log('[UrlExpander] 초기화 완료');
    return this;
  }

  expand() {
    const url = this.elements.urlInput.value.trim();

    if (!url) {
      this.showToast('URL을 입력해주세요.', 'warning');
      return;
    }

    if (!this.isValidUrl(url)) {
      this.showToast('올바른 URL 형식이 아닙니다.', 'error');
      return;
    }

    // 시뮬레이션: 원본 URL 생성
    const result = this.simulateExpand(url);
    this.showResult(result);
    this.showToast('URL 확장 완료! (시뮬레이션)', 'success');
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  simulateExpand(shortUrl) {
    let hostname;
    try {
      hostname = new URL(shortUrl).hostname;
    } catch {
      hostname = 'unknown';
    }

    const service = this.shortenerServices[hostname] || '알 수 없는 서비스';
    const expandedUrl = this.sampleTargets[Math.floor(Math.random() * this.sampleTargets.length)];
    const targetDomain = new URL(expandedUrl).hostname;
    const redirectCount = Math.floor(Math.random() * 3) + 1;
    const isSafe = Math.random() > 0.1;

    return {
      shortUrl,
      expandedUrl,
      service,
      targetDomain,
      redirectCount,
      isSafe
    };
  }

  showResult(result) {
    this.expandedUrl = result.expandedUrl;

    this.elements.expandedUrl.textContent = result.expandedUrl;
    this.elements.serviceInfo.textContent = result.service;
    this.elements.redirectCount.textContent = result.redirectCount + '회';
    this.elements.targetDomain.textContent = result.targetDomain;

    if (result.isSafe) {
      this.elements.safetyStatus.innerHTML = '<span class="safety-badge safety-safe">안전</span>';
    } else {
      this.elements.safetyStatus.innerHTML = '<span class="safety-badge safety-warning">주의 필요</span>';
    }

    this.elements.resultBox.style.display = 'block';
  }

  copy() {
    if (!this.expandedUrl) return;
    this.copyToClipboard(this.expandedUrl);
  }
}

// 전역 인스턴스 생성
const urlExpander = new UrlExpander();
window.UrlExpander = urlExpander;

// 전역 함수 (HTML onclick 호환)
function expand() { urlExpander.expand(); }
function copy() { urlExpander.copy(); }

document.addEventListener('DOMContentLoaded', () => urlExpander.init());
