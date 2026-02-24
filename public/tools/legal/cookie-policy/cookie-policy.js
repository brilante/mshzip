/**
 * 쿠키 정책 생성기 - ToolBase 기반
 * 웹사이트 쿠키 정책 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CookiePolicy = class CookiePolicy extends ToolBase {
  constructor() {
    super('CookiePolicy');
  }

  init() {
    this.initElements({
      siteName: 'siteName',
      siteUrl: 'siteUrl',
      companyName: 'companyName',
      contactEmail: 'contactEmail',
      gdprApply: 'gdprApply',
      cookieAnalytics: 'cookieAnalytics',
      cookieMarketing: 'cookieMarketing',
      cookieFunctional: 'cookieFunctional',
      cookieThirdParty: 'cookieThirdParty',
      previewContainer: 'previewContainer'
    });

    console.log('[CookiePolicy] 초기화 완료');
    return this;
  }

  generate() {
    const siteName = this.elements.siteName.value || '[웹사이트명]';
    const siteUrl = this.elements.siteUrl.value || '[웹사이트 URL]';
    const companyName = this.elements.companyName.value || '[회사명]';
    const contactEmail = this.elements.contactEmail.value || '[이메일]';
    const gdprApply = this.elements.gdprApply.value === 'yes';

    const useAnalytics = this.elements.cookieAnalytics.checked;
    const useMarketing = this.elements.cookieMarketing.checked;
    const useFunctional = this.elements.cookieFunctional.checked;
    const useThirdParty = this.elements.cookieThirdParty.checked;

    let html = `
      <div class="policy-preview" id="policyPreview">
        <div class="policy-title">${siteName} 쿠키 정책</div>

        <div class="policy-section">
          <h4>1. 쿠키란 무엇인가요?</h4>
          <p>쿠키(Cookie)는 웹사이트를 방문할 때 브라우저에 저장되는 작은 텍스트 파일입니다.
          쿠키는 웹사이트가 귀하의 기기를 인식하고, 사용자 경험을 개선하며,
          웹사이트 기능을 제공하는 데 사용됩니다.</p>
        </div>

        <div class="policy-section">
          <h4>2. 쿠키 사용 목적</h4>
          <p>${siteName}은(는) 다음과 같은 목적으로 쿠키를 사용합니다:</p>
          <ul style="margin-left: 1.5rem; list-style: disc;">
            <li><strong>필수 기능:</strong> 로그인 상태 유지, 보안, 기본 기능 제공</li>
            ${useFunctional ? '<li><strong>사용자 설정:</strong> 언어, 테마 등 개인화 설정 저장</li>' : ''}
            ${useAnalytics ? '<li><strong>분석:</strong> 방문자 통계 수집, 서비스 개선</li>' : ''}
            ${useMarketing ? '<li><strong>마케팅:</strong> 맞춤 광고 제공, 광고 효과 측정</li>' : ''}
            ${useThirdParty ? '<li><strong>외부 서비스:</strong> 소셜 미디어, 비디오 플레이어 등 연동</li>' : ''}
          </ul>
        </div>

        <div class="policy-section">
          <h4>3. 사용하는 쿠키 종류</h4>
          <table class="cookie-table">
            <thead>
              <tr>
                <th>쿠키 유형</th>
                <th>설명</th>
                <th>보존 기간</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>필수 쿠키</td>
                <td>웹사이트 기본 기능 (로그인, 보안)</td>
                <td>세션 종료 시</td>
              </tr>
              ${useFunctional ? `
              <tr>
                <td>기능 쿠키</td>
                <td>사용자 설정 저장 (언어, 테마)</td>
                <td>1년</td>
              </tr>
              ` : ''}
              ${useAnalytics ? `
              <tr>
                <td>분석 쿠키</td>
                <td>방문 통계 (Google Analytics)</td>
                <td>2년</td>
              </tr>
              ` : ''}
              ${useMarketing ? `
              <tr>
                <td>마케팅 쿠키</td>
                <td>광고 추적 (Facebook Pixel 등)</td>
                <td>90일 ~ 2년</td>
              </tr>
              ` : ''}
              ${useThirdParty ? `
              <tr>
                <td>제3자 쿠키</td>
                <td>외부 서비스 (YouTube, Twitter 등)</td>
                <td>서비스 제공자 정책에 따름</td>
              </tr>
              ` : ''}
            </tbody>
          </table>
        </div>
    `;

    if (useAnalytics || useMarketing) {
      html += `
        <div class="policy-section">
          <h4>4. 제3자 서비스</h4>
          <p>${siteName}은(는) 다음 제3자 서비스의 쿠키를 사용할 수 있습니다:</p>
          <ul style="margin-left: 1.5rem; list-style: disc;">
            ${useAnalytics ? `
            <li><strong>Google Analytics:</strong> 웹사이트 트래픽 분석
              <br><small>개인정보처리방침: <a href="https://policies.google.com/privacy" target="_blank">https://policies.google.com/privacy</a></small>
            </li>
            ` : ''}
            ${useMarketing ? `
            <li><strong>Facebook/Meta Pixel:</strong> 광고 타겟팅 및 전환 추적
              <br><small>개인정보처리방침: <a href="https://www.facebook.com/privacy/policy" target="_blank">https://www.facebook.com/privacy/policy</a></small>
            </li>
            <li><strong>Google Ads:</strong> 맞춤 광고 제공
              <br><small>개인정보처리방침: <a href="https://policies.google.com/privacy" target="_blank">https://policies.google.com/privacy</a></small>
            </li>
            ` : ''}
          </ul>
        </div>
      `;
    }

    html += `
        <div class="policy-section">
          <h4>${useAnalytics || useMarketing ? '5' : '4'}. 쿠키 관리 방법</h4>
          <p>귀하는 브라우저 설정을 통해 쿠키를 관리할 수 있습니다:</p>
          <ul style="margin-left: 1.5rem; list-style: disc;">
            <li><strong>Chrome:</strong> 설정 > 개인정보 및 보안 > 쿠키 및 기타 사이트 데이터</li>
            <li><strong>Firefox:</strong> 설정 > 개인 정보 및 보안 > 쿠키 및 사이트 데이터</li>
            <li><strong>Safari:</strong> 환경설정 > 개인 정보 보호 > 쿠키 및 웹 사이트 데이터</li>
            <li><strong>Edge:</strong> 설정 > 쿠키 및 사이트 권한 > 쿠키 및 사이트 데이터</li>
          </ul>
          <p style="margin-top: 0.5rem; color: #dc2626;">※ 필수 쿠키를 차단하면 웹사이트의 일부 기능이 제한될 수 있습니다.</p>
        </div>
    `;

    if (gdprApply) {
      html += `
        <div class="policy-section">
          <h4>${useAnalytics || useMarketing ? '6' : '5'}. GDPR 및 개인정보 보호</h4>
          <p>EU 일반개인정보보호법(GDPR)에 따라 귀하는 다음과 같은 권리를 가집니다:</p>
          <ul style="margin-left: 1.5rem; list-style: disc;">
            <li>개인정보 접근권: 수집된 데이터 확인 요청</li>
            <li>정정권: 부정확한 정보 수정 요청</li>
            <li>삭제권: 개인정보 삭제 요청</li>
            <li>처리 제한권: 특정 목적의 데이터 처리 제한 요청</li>
            <li>동의 철회권: 언제든지 쿠키 동의 철회</li>
          </ul>
          <p style="margin-top: 0.5rem;">권리 행사를 원하시면 ${contactEmail}로 연락해 주세요.</p>
        </div>
      `;
    }

    html += `
        <div class="policy-section">
          <h4>${gdprApply ? (useAnalytics || useMarketing ? '7' : '6') : (useAnalytics || useMarketing ? '6' : '5')}. 정책 변경</h4>
          <p>${companyName}은(는) 필요에 따라 본 쿠키 정책을 변경할 수 있습니다.
          중요한 변경 사항이 있을 경우 웹사이트를 통해 공지합니다.</p>
        </div>

        <div class="policy-section">
          <h4>문의처</h4>
          <p>
            쿠키 정책에 대한 문의사항이 있으시면 아래로 연락해 주세요.<br>
            <strong>이메일:</strong> ${contactEmail}<br>
            <strong>웹사이트:</strong> ${siteUrl}
          </p>
        </div>

        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 0.85rem;">
          <p>최종 업데이트: ${new Date().toLocaleDateString('ko-KR')}</p>
          <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
        </div>
      </div>
    `;

    this.elements.previewContainer.innerHTML = html;
    this.showToast('쿠키 정책이 생성되었습니다', 'success');
  }

  copy() {
    const preview = document.getElementById('policyPreview');
    if (!preview) {
      this.showToast('먼저 정책을 생성해주세요', 'error');
      return;
    }
    this.copyToClipboard(preview.innerText);
  }

  download() {
    const preview = document.getElementById('policyPreview');
    if (!preview) {
      this.showToast('먼저 정책을 생성해주세요', 'error');
      return;
    }

    const siteName = this.elements.siteName.value || 'site';
    const blob = new Blob([preview.innerText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${siteName}_쿠키정책.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('파일이 다운로드되었습니다', 'success');
  }
}

// 전역 인스턴스 생성
const cookiePolicy = new CookiePolicy();
window.CookiePolicy = cookiePolicy;

// 전역 함수 (HTML onclick 호환)
function generate() { cookiePolicy.generate(); }
function copy() { cookiePolicy.copy(); }
function download() { cookiePolicy.download(); }

document.addEventListener('DOMContentLoaded', () => cookiePolicy.init());
