/**
 * UTM 빌더 - ToolBase 기반
 * 캠페인 추적 URL 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var UTMBuilder = class UTMBuilder extends ToolBase {
  constructor() {
    super('UTMBuilder');
    this.presets = {
      facebook: { source: 'facebook', medium: 'social', campaign: 'fb_campaign' },
      google: { source: 'google', medium: 'cpc', campaign: 'google_ads' },
      instagram: { source: 'instagram', medium: 'social', campaign: 'ig_campaign' },
      email: { source: 'newsletter', medium: 'email', campaign: 'email_campaign' },
      twitter: { source: 'twitter', medium: 'social', campaign: 'twitter_campaign' }
    };
    this._generatedUrl = '';
  }

  init() {
    this.initElements({
      baseUrl: 'baseUrl',
      utmSource: 'utmSource',
      utmMedium: 'utmMedium',
      utmCampaign: 'utmCampaign',
      utmTerm: 'utmTerm',
      utmContent: 'utmContent',
      result: 'result'
    });

    console.log('[UTMBuilder] 초기화 완료');
    return this;
  }

  applyPreset(type) {
    const preset = this.presets[type];
    if (preset) {
      this.elements.utmSource.value = preset.source;
      this.elements.utmMedium.value = preset.medium;
      this.elements.utmCampaign.value = preset.campaign;
      this.showToast(`${type} 프리셋 적용됨`, 'success');
    }
  }

  generate() {
    const baseUrl = this.elements.baseUrl.value.trim();
    const source = this.elements.utmSource.value.trim();
    const medium = this.elements.utmMedium.value.trim();
    const campaign = this.elements.utmCampaign.value.trim();
    const term = this.elements.utmTerm.value.trim();
    const content = this.elements.utmContent.value.trim();

    if (!baseUrl) {
      this.showToast('웹사이트 URL을 입력해주세요', 'error');
      return;
    }

    if (!source || !medium || !campaign) {
      this.showToast('필수 항목(소스, 매체, 캠페인)을 입력해주세요', 'error');
      return;
    }

    // URL 유효성 검사
    let url;
    try {
      url = new URL(baseUrl);
    } catch {
      this.showToast('올바른 URL 형식을 입력해주세요', 'error');
      return;
    }

    // UTM 파라미터 추가
    const params = [
      { name: 'utm_source', value: source },
      { name: 'utm_medium', value: medium },
      { name: 'utm_campaign', value: campaign }
    ];

    if (term) params.push({ name: 'utm_term', value: term });
    if (content) params.push({ name: 'utm_content', value: content });

    params.forEach(p => {
      url.searchParams.set(p.name, p.value);
    });

    this.showResult(url.toString(), params);
  }

  showResult(finalUrl, params) {
    this.elements.result.innerHTML = `
      <div class="result-box">
        <div style="font-weight: 600; margin-bottom: 0.5rem;">생성된 URL</div>
        <div class="result-url" id="generatedUrl">${finalUrl}</div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="tool-btn tool-btn-primary" onclick="utmBuilder.copy()">복사</button>
          <button class="tool-btn tool-btn-secondary" onclick="utmBuilder.shorten()">단축 URL 생성</button>
        </div>

        <div class="param-list">
          <div style="font-weight: 600; margin-bottom: 0.5rem;">UTM 파라미터</div>
          ${params.map(p => `
            <div class="param-item">
              <span class="param-name">${p.name}</span>
              <span>${p.value}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div style="margin-top: 1rem; background: var(--bg-primary); border-radius: 8px; padding: 1rem; font-size: 0.85rem;">
        <strong>팁:</strong> 이 URL을 광고, 이메일, 소셜 미디어에 사용하면 Google Analytics에서 트래픽 소스를 정확하게 추적할 수 있습니다.
      </div>
    `;

    this._generatedUrl = finalUrl;
    this.showToast('UTM URL이 생성되었습니다', 'success');
  }

  copy() {
    if (this._generatedUrl) {
      this.copyToClipboard(this._generatedUrl);
    }
  }

  shorten() {
    // 시뮬레이션: 실제로는 단축 URL API 호출 필요
    const shortCode = Math.random().toString(36).substring(2, 8);
    const shortUrl = `https://short.link/${shortCode}`;

    this.showToast('단축 URL 생성됨 (시뮬레이션)', 'success');

    document.querySelector('.result-url').innerHTML = `
      <div>${this._generatedUrl}</div>
      <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px dashed var(--border-color);">
        <strong>단축 URL:</strong> ${shortUrl} (시뮬레이션)
      </div>
    `;
  }
}

// 전역 인스턴스 생성
const utmBuilder = new UTMBuilder();
window.UTMBuilder = utmBuilder;

// 전역 함수 (HTML onclick 호환)
function generate() { utmBuilder.generate(); }
function applyPreset(type) { utmBuilder.applyPreset(type); }

document.addEventListener('DOMContentLoaded', () => utmBuilder.init());
