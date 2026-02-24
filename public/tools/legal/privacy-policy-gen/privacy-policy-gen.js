/**
 * 개인정보처리방침 생성기 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class PrivacyPolicyGen extends ToolBase {
  constructor() {
    super('PrivacyPolicyGen');
  }

  init() {
    this.initElements({
      companyName: 'companyName',
      contactEmail: 'contactEmail',
      retentionPeriod: 'retentionPeriod',
      useCookies: 'useCookies',
      collectName: 'collectName',
      collectEmail: 'collectEmail',
      collectPhone: 'collectPhone',
      collectAddress: 'collectAddress',
      collectBirthdate: 'collectBirthdate',
      collectPayment: 'collectPayment',
      preview: 'preview'
    });

    console.log('[PrivacyPolicyGen] 초기화 완료');
    return this;
  }

  generate() {
    const companyName = this.elements.companyName.value || '[회사명]';
    const contactEmail = this.elements.contactEmail.value || '[이메일]';
    const retentionPeriod = this.elements.retentionPeriod.value;
    const useCookies = this.elements.useCookies.value === 'yes';

    let collectItems = [];
    if (this.elements.collectName.checked) collectItems.push('이름');
    if (this.elements.collectEmail.checked) collectItems.push('이메일 주소');
    if (this.elements.collectPhone.checked) collectItems.push('연락처');
    if (this.elements.collectAddress.checked) collectItems.push('주소');
    if (this.elements.collectBirthdate.checked) collectItems.push('생년월일');
    if (this.elements.collectPayment.checked) collectItems.push('결제정보');

    const collectList = collectItems.length > 0 ? collectItems.join(', ') : '없음';

    const cookieSection = useCookies ? `<h2>제6조 (쿠키의 사용)</h2>
<p>1. 회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 쿠키(cookie)를 사용합니다.</p>
<p>2. 쿠키는 웹사이트를 운영하는데 이용되는 서버가 이용자의 컴퓨터 브라우저에게 보내는 소량의 정보이며 이용자의 컴퓨터 하드디스크에 저장됩니다.</p>
<p>3. 이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 웹 브라우저 옵션 설정을 통해 쿠키 허용, 차단 등의 설정을 할 수 있습니다.</p>` : '';

    const html = `<h1>개인정보처리방침</h1>
<p style="color: #64748b;">시행일: ${new Date().toLocaleDateString('ko-KR')}</p>

<p>${companyName}(이하 "회사")는 개인정보 보호법에 따라 이용자의 개인정보 보호 및 권익을 보호하고 개인정보와 관련한 이용자의 고충을 원활하게 처리할 수 있도록 다음과 같은 처리방침을 두고 있습니다.</p>

<h2>제1조 (개인정보의 수집 항목)</h2>
<p>회사는 서비스 제공을 위해 다음의 개인정보를 수집합니다:</p>
<p>• 필수 수집 항목: ${collectList}</p>

<h2>제2조 (개인정보의 수집 및 이용 목적)</h2>
<p>회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다:</p>
<p>• 회원 가입 및 관리: 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리</p>
<p>• 서비스 제공: 콘텐츠 제공, 서비스 이용에 따른 정보 제공</p>
<p>• 고충 처리: 민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지, 처리결과 통보</p>

<h2>제3조 (개인정보의 처리 및 보유 기간)</h2>
<p>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
<p>• 개인정보 보유 기간: <strong>${retentionPeriod}</strong></p>

<h2>제4조 (개인정보의 제3자 제공)</h2>
<p>회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:</p>
<p>• 이용자가 사전에 동의한 경우</p>
<p>• 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</p>

<h2>제5조 (개인정보의 파기)</h2>
<p>회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.</p>
<p>• 전자적 파일 형태의 정보는 복구 및 재생되지 않도록 안전하게 삭제합니다.</p>
<p>• 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각하여 파기합니다.</p>

${cookieSection}

<h2>제7조 (이용자의 권리와 그 행사방법)</h2>
<p>이용자는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:</p>
<p>• 개인정보 열람 요구</p>
<p>• 오류 등이 있을 경우 정정 요구</p>
<p>• 삭제 요구</p>
<p>• 처리정지 요구</p>

<h2>제8조 (개인정보 보호책임자)</h2>
<p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
<p>• 담당: 개인정보보호팀</p>
<p>• 연락처: ${contactEmail}</p>

<h2>제9조 (개인정보처리방침의 변경)</h2>
<p>이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</p>

<p style="margin-top: 30px; text-align: center; color: #64748b;">본 개인정보처리방침은 ${new Date().toLocaleDateString('ko-KR')}부터 적용됩니다.</p>`;

    this.elements.preview.innerHTML = html;
    this.showToast('개인정보처리방침이 생성되었습니다', 'success');
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
    link.download = '개인정보처리방침.txt';
    link.click();
    URL.revokeObjectURL(link.href);
    this.showToast('파일이 다운로드되었습니다', 'success');
  }
}

// 전역 인스턴스 생성
const privacyPolicyGen = new PrivacyPolicyGen();
window.PrivacyPolicyGen = privacyPolicyGen;

// 전역 함수 (HTML onclick 호환)
function generate() { privacyPolicyGen.generate(); }
function copyText() { privacyPolicyGen.copyText(); }
function downloadTxt() { privacyPolicyGen.downloadTxt(); }

document.addEventListener('DOMContentLoaded', () => privacyPolicyGen.init());
