/**
 * 이용약관 생성기 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TermsGen = class TermsGen extends ToolBase {
  constructor() {
    super('TermsGen');
  }

  init() {
    this.initElements({
      serviceName: 'serviceName',
      companyName: 'companyName',
      serviceUrl: 'serviceUrl',
      contactEmail: 'contactEmail',
      serviceDesc: 'serviceDesc',
      preview: 'preview'
    });

    console.log('[TermsGen] 초기화 완료');
    return this;
  }

  generate() {
    const serviceName = this.elements.serviceName.value || '[서비스명]';
    const companyName = this.elements.companyName.value || '[회사명]';
    const serviceUrl = this.elements.serviceUrl.value || '[URL]';
    const contactEmail = this.elements.contactEmail.value || '[이메일]';
    const serviceDesc = this.elements.serviceDesc.value || '[서비스 설명]';

    const html = `<h1>${serviceName} 이용약관</h1>
<p style="color: #64748b;">시행일: ${new Date().toLocaleDateString('ko-KR')}</p>

<h2>제1조 (목적)</h2>
<p>본 약관은 ${companyName}(이하 "회사")이 제공하는 ${serviceName} 서비스(이하 "서비스")의 이용조건 및 절차, 회사와 회원 간의 권리, 의무 및 책임사항 등을 규정함을 목적으로 합니다.</p>

<h2>제2조 (정의)</h2>
<p>1. "서비스"란 회사가 ${serviceUrl}를 통해 제공하는 ${serviceDesc}</p>
<p>2. "회원"이란 본 약관에 동의하고 서비스를 이용하는 자를 말합니다.</p>
<p>3. "아이디(ID)"란 회원의 식별과 서비스 이용을 위하여 회원이 설정하고 회사가 승인한 문자 및 숫자의 조합을 말합니다.</p>

<h2>제3조 (약관의 효력 및 변경)</h2>
<p>1. 본 약관은 서비스를 이용하고자 하는 모든 회원에게 그 효력이 발생합니다.</p>
<p>2. 회사는 합리적인 사유가 발생할 경우 본 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항을 통해 공지합니다.</p>

<h2>제4조 (서비스의 제공)</h2>
<p>1. 회사는 회원에게 다음과 같은 서비스를 제공합니다:</p>
<p>   - ${serviceDesc}</p>
<p>2. 서비스는 연중무휴, 1일 24시간 제공함을 원칙으로 합니다.</p>

<h2>제5조 (회원의 의무)</h2>
<p>1. 회원은 서비스 이용 시 관계 법령, 본 약관의 규정, 이용안내 등을 준수하여야 합니다.</p>
<p>2. 회원은 타인의 정보를 도용하거나 허위 정보를 등록해서는 안 됩니다.</p>
<p>3. 회원은 서비스를 통해 얻은 정보를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 등의 방법으로 사용해서는 안 됩니다.</p>

<h2>제6조 (서비스 이용의 제한)</h2>
<p>회사는 회원이 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 서비스 이용을 제한할 수 있습니다.</p>

<h2>제7조 (면책조항)</h2>
<p>1. 회사는 천재지변, 전쟁 등 불가항력으로 인해 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</p>
<p>2. 회사는 회원의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</p>

<h2>제8조 (준거법 및 관할법원)</h2>
<p>본 약관은 대한민국 법률에 따라 규율되고 해석됩니다. 서비스 이용으로 발생한 분쟁에 대해 소송이 제기되는 경우 회사 본점 소재지를 관할하는 법원을 전속관할법원으로 합니다.</p>

<h2>제9조 (문의)</h2>
<p>서비스 이용에 관한 문의사항은 아래 연락처로 문의해 주시기 바랍니다.</p>
<p>이메일: ${contactEmail}</p>

<p style="margin-top: 30px; text-align: center; color: #64748b;">본 약관은 ${new Date().toLocaleDateString('ko-KR')}부터 시행됩니다.</p>`;

    this.elements.preview.innerHTML = html;
    this.showToast('이용약관이 생성되었습니다', 'success');
  }

  copyText() {
    const text = this.elements.preview.innerText;
    this.copyToClipboard(text);
  }

  downloadTxt() {
    const text = this.elements.preview.innerText;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '이용약관.txt';
    link.click();
    URL.revokeObjectURL(link.href);
    this.showToast('파일이 다운로드되었습니다', 'success');
  }
}

// 전역 인스턴스 생성
const termsGen = new TermsGen();
window.TermsGen = termsGen;

// 전역 함수 (HTML onclick 호환)
function generate() { termsGen.generate(); }
function copyText() { termsGen.copyText(); }
function downloadTxt() { termsGen.downloadTxt(); }

document.addEventListener('DOMContentLoaded', () => termsGen.init());
