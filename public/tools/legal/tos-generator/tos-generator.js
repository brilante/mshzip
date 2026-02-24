/**
 * 이용약관 생성기 - ToolBase 기반
 * 웹사이트/앱 이용약관 자동 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TOSGenerator = class TOSGenerator extends ToolBase {
  constructor() {
    super('TOSGenerator');
  }

  init() {
    this.initElements({
      companyName: 'companyName',
      serviceName: 'serviceName',
      websiteUrl: 'websiteUrl',
      supportEmail: 'supportEmail',
      jurisdiction: 'jurisdiction',
      effectiveDate: 'effectiveDate',
      hasAccount: 'hasAccount',
      hasPaid: 'hasPaid',
      hasUserContent: 'hasUserContent',
      hasApi: 'hasApi',
      previewContainer: 'previewContainer'
    });

    this.elements.effectiveDate.valueAsDate = new Date();

    console.log('[TOSGenerator] 초기화 완료');
    return this;
  }

  generate() {
    const companyName = this.elements.companyName.value || '[회사명]';
    const serviceName = this.elements.serviceName.value || '[서비스명]';
    const websiteUrl = this.elements.websiteUrl.value || '[웹사이트]';
    const supportEmail = this.elements.supportEmail.value || '[이메일]';
    const jurisdiction = this.elements.jurisdiction.value || '서울중앙지방법원';
    const effectiveDate = this.elements.effectiveDate.value;

    const hasAccount = this.elements.hasAccount.checked;
    const hasPaid = this.elements.hasPaid.checked;
    const hasUserContent = this.elements.hasUserContent.checked;
    const hasApi = this.elements.hasApi.checked;

    const formattedDate = effectiveDate
      ? new Date(effectiveDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    let html = `
      <div class="tos-preview" id="tosPreview">
        <div class="tos-title">${serviceName} 이용약관</div>

        <div class="tos-section">
          <div class="tos-section-title">제1조 (목적)</div>
          <p>본 약관은 ${companyName}(이하 "회사")이 제공하는 ${serviceName} 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
        </div>

        <div class="tos-section">
          <div class="tos-section-title">제2조 (정의)</div>
          <p>① "서비스"란 회사가 ${websiteUrl}을(를) 통해 제공하는 모든 서비스를 의미합니다.<br>
          ② "이용자"란 본 약관에 따라 서비스를 이용하는 자를 말합니다.<br>
          ${hasAccount ? '③ "회원"이란 서비스에 가입하여 아이디(ID)와 비밀번호를 부여받은 이용자를 말합니다.' : ''}</p>
        </div>

        <div class="tos-section">
          <div class="tos-section-title">제3조 (약관의 효력 및 변경)</div>
          <p>① 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.<br>
          ② 회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경된 약관은 제1항과 같은 방법으로 공지합니다.<br>
          ③ 이용자는 변경된 약관에 동의하지 않을 권리가 있으며, 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</p>
        </div>
    `;

    if (hasAccount) {
      html += `
        <div class="tos-section">
          <div class="tos-section-title">제4조 (회원가입)</div>
          <p>① 이용자는 회사가 정한 절차에 따라 회원가입을 신청하고, 회사가 이를 승인함으로써 회원가입이 완료됩니다.<br>
          ② 회사는 다음 각 호에 해당하는 신청에 대해서는 승인을 하지 않거나 사후에 취소할 수 있습니다.<br>
          - 타인의 정보를 이용한 경우<br>
          - 허위 정보를 기재한 경우<br>
          - 기타 회원으로 등록하는 것이 부적절하다고 판단되는 경우</p>
        </div>

        <div class="tos-section">
          <div class="tos-section-title">제5조 (회원 탈퇴 및 자격 상실)</div>
          <p>① 회원은 언제든지 서비스 내 탈퇴 기능을 통해 탈퇴를 요청할 수 있으며, 회사는 즉시 회원 탈퇴를 처리합니다.<br>
          ② 회원이 다음 각 호에 해당하는 경우, 회사는 회원 자격을 제한 또는 정지시킬 수 있습니다.<br>
          - 가입 신청 시 허위 내용을 등록한 경우<br>
          - 다른 이용자의 서비스 이용을 방해하거나 정보를 도용한 경우<br>
          - 서비스를 이용하여 법령 또는 본 약관이 금지하는 행위를 한 경우</p>
        </div>
      `;
    }

    if (hasPaid) {
      html += `
        <div class="tos-section">
          <div class="tos-section-title">제${hasAccount ? '6' : '4'}조 (유료 서비스)</div>
          <p>① 회사는 일부 서비스를 유료로 제공할 수 있으며, 유료 서비스의 이용요금 및 결제방법은 서비스 내에 표시됩니다.<br>
          ② 이용자는 유료 서비스 이용 시 회사가 정한 결제수단으로 이용요금을 결제합니다.<br>
          ③ 유료 서비스의 환불은 관련 법령 및 회사의 환불 정책에 따릅니다.</p>
        </div>
      `;
    }

    if (hasUserContent) {
      html += `
        <div class="tos-section">
          <div class="tos-section-title">제${hasAccount ? (hasPaid ? '7' : '6') : (hasPaid ? '5' : '4')}조 (이용자 콘텐츠)</div>
          <p>① 이용자가 서비스에 업로드하는 콘텐츠의 저작권은 해당 이용자에게 귀속됩니다.<br>
          ② 이용자는 자신이 업로드하는 콘텐츠에 대해 서비스 운영에 필요한 범위 내에서 회사에 이용권을 부여합니다.<br>
          ③ 회사는 다음 각 호에 해당하는 콘텐츠를 사전 통지 없이 삭제할 수 있습니다.<br>
          - 타인의 권리를 침해하는 콘텐츠<br>
          - 불법적인 내용을 포함하는 콘텐츠<br>
          - 서비스 운영에 지장을 주는 콘텐츠</p>
        </div>
      `;
    }

    if (hasApi) {
      html += `
        <div class="tos-section">
          <div class="tos-section-title">제${hasAccount ? (hasPaid ? (hasUserContent ? '8' : '7') : (hasUserContent ? '7' : '6')) : (hasPaid ? (hasUserContent ? '6' : '5') : (hasUserContent ? '5' : '4'))}조 (API 이용)</div>
          <p>① 회사는 서비스의 API를 제공할 수 있으며, API 이용 조건은 별도로 정합니다.<br>
          ② 이용자는 API를 이용함에 있어 회사가 정한 이용 한도 및 정책을 준수해야 합니다.<br>
          ③ API를 통해 취득한 데이터는 승인된 목적 외로 사용할 수 없습니다.</p>
        </div>
      `;
    }

    html += `
        <div class="tos-section">
          <div class="tos-section-title">제${hasAccount ? (hasPaid ? (hasUserContent ? (hasApi ? '9' : '8') : (hasApi ? '8' : '7')) : (hasUserContent ? (hasApi ? '8' : '7') : (hasApi ? '7' : '6'))) : (hasPaid ? (hasUserContent ? (hasApi ? '7' : '6') : (hasApi ? '6' : '5')) : (hasUserContent ? (hasApi ? '6' : '5') : (hasApi ? '5' : '4')))}조 (회사의 의무)</div>
          <p>① 회사는 관련 법령과 본 약관이 정하는 바에 따라 지속적이고 안정적으로 서비스를 제공하기 위해 노력합니다.<br>
          ② 회사는 이용자의 개인정보를 보호하기 위해 개인정보처리방침을 수립하고 이를 준수합니다.<br>
          ③ 회사는 이용자로부터 제기되는 의견이나 불만이 정당하다고 인정할 경우 적절한 절차를 통해 처리합니다.</p>
        </div>

        <div class="tos-section">
          <div class="tos-section-title">면책조항</div>
          <p>① 회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인해 서비스를 제공할 수 없는 경우 책임이 면제됩니다.<br>
          ② 회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.<br>
          ③ 회사는 이용자가 서비스를 이용하여 기대하는 수익을 얻지 못한 것에 대해 책임을 지지 않습니다.</p>
        </div>

        <div class="tos-section">
          <div class="tos-section-title">분쟁해결</div>
          <p>① 본 약관과 관련된 분쟁에 대해서는 대한민국 법령을 적용합니다.<br>
          ② 서비스 이용과 관련하여 발생한 분쟁에 대해 소송이 제기될 경우 ${jurisdiction}을(를) 관할 법원으로 합니다.</p>
        </div>

        <div class="tos-section">
          <p style="text-align: center; margin-top: 2rem; color: #666;">
            <strong>부칙</strong><br>
            본 약관은 ${formattedDate}부터 시행됩니다.
          </p>
          <p style="text-align: center; margin-top: 1rem; color: #666;">
            문의: ${supportEmail}
          </p>
        </div>
      </div>
    `;

    this.elements.previewContainer.innerHTML = html;
    this.showToast('이용약관이 생성되었습니다', 'success');
  }

  copy() {
    const preview = document.getElementById('tosPreview');
    if (!preview) {
      this.showToast('먼저 약관을 생성해주세요', 'error');
      return;
    }
    this.copyToClipboard(preview.innerText);
  }

  download() {
    const preview = document.getElementById('tosPreview');
    if (!preview) {
      this.showToast('먼저 약관을 생성해주세요', 'error');
      return;
    }

    const serviceName = this.elements.serviceName.value || 'service';
    const blob = new Blob([preview.innerText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${serviceName}_이용약관.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('파일이 다운로드되었습니다', 'success');
  }
}

// 전역 인스턴스 생성
const tosGenerator = new TOSGenerator();
window.TOSGenerator = tosGenerator;

// 전역 함수 (HTML onclick 호환)
function generate() { tosGenerator.generate(); }
function copy() { tosGenerator.copy(); }
function download() { tosGenerator.download(); }

document.addEventListener('DOMContentLoaded', () => tosGenerator.init());
