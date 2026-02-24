/**
 * 개인정보처리방침 생성기 - ToolBase 기반
 * 웹사이트 개인정보처리방침 자동 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class PrivacyPolicyGen extends ToolBase {
  constructor() {
    super('PrivacyPolicyGen');
    this.dataNames = {
      name: '이름', email: '이메일', phone: '전화번호', address: '주소',
      birth: '생년월일', payment: '결제정보', cookies: '쿠키 및 접속로그', device: '기기정보'
    };
    this.purposeNames = {
      service: '서비스 제공 및 운영', account: '회원 가입 및 관리',
      marketing: '마케팅 및 광고', analytics: '통계 분석 및 서비스 개선',
      support: '고객 문의 대응', legal: '법적 의무 이행'
    };
    this.retentionNames = {
      until_withdrawal: '회원 탈퇴 시까지',
      '1year': '1년', '3years': '3년', '5years': '5년',
      legal: '관련 법령에서 정한 기간'
    };
  }

  init() {
    this.initElements({
      companyName: 'companyName',
      websiteUrl: 'websiteUrl',
      contactEmail: 'contactEmail',
      managerName: 'managerName',
      retentionPeriod: 'retentionPeriod',
      thirdParty: 'thirdParty',
      outsourcing: 'outsourcing',
      overseas: 'overseas',
      generateBtn: 'generateBtn',
      resultCard: 'resultCard',
      policyOutput: 'policyOutput',
      copyBtn: 'copyBtn',
      downloadBtn: 'downloadBtn'
    });

    this.setupEventListeners();
    console.log('[PrivacyPolicyGen] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    this.on(this.elements.generateBtn, 'click', () => this.generatePolicy());
    this.on(this.elements.copyBtn, 'click', () => this.copyPolicy());
    this.on(this.elements.downloadBtn, 'click', () => this.downloadPolicy());
  }

  generatePolicy() {
    const companyName = this.elements.companyName.value.trim();
    const websiteUrl = this.elements.websiteUrl.value.trim();
    const contactEmail = this.elements.contactEmail.value.trim();
    const managerName = this.elements.managerName.value.trim() || '미정';

    if (!companyName || !websiteUrl || !contactEmail) {
      this.showToast('필수 항목(*)을 입력해주세요.', 'error');
      return;
    }

    const collectData = Array.from(document.querySelectorAll('input[name="collectData"]:checked'))
      .map(cb => cb.value);
    const purposes = Array.from(document.querySelectorAll('input[name="purpose"]:checked'))
      .map(cb => cb.value);
    const retentionPeriod = this.elements.retentionPeriod.value;
    const thirdParty = this.elements.thirdParty.checked;
    const outsourcing = this.elements.outsourcing.checked;
    const overseas = this.elements.overseas.checked;

    const today = new Date().toISOString().split('T')[0];

    let policy = `<h1>${this.escapeHtml(companyName)} 개인정보처리방침</h1>
<p>${this.escapeHtml(companyName)}(이하 "회사")은 이용자의 개인정보를 중요시하며, 「개인정보 보호법」을 준수하고 있습니다.</p>
<p>본 개인정보처리방침은 ${today}부터 시행됩니다.</p>

<h2>1. 수집하는 개인정보 항목</h2>
<p>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:</p>
<ul>
${collectData.map(d => '<li>' + this.dataNames[d] + '</li>').join('\n')}
</ul>

<h2>2. 개인정보의 수집 및 이용 목적</h2>
<p>수집한 개인정보는 다음의 목적을 위해 이용됩니다:</p>
<ul>
${purposes.map(p => '<li>' + this.purposeNames[p] + '</li>').join('\n')}
</ul>

<h2>3. 개인정보의 보유 및 이용 기간</h2>
<p>회사는 개인정보의 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다:</p>
<ul>
<li>보유 기간: ${this.retentionNames[retentionPeriod]}</li>
<li>관련 법령에 의한 정보 보유 (전자상거래법, 통신비밀보호법 등)</li>
</ul>`;

    if (thirdParty) {
      policy += `
<h2>4. 개인정보의 제3자 제공</h2>
<p>회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다:</p>
<ul>
<li>이용자가 사전에 동의한 경우</li>
<li>법령의 규정에 의한 경우</li>
</ul>`;
    }

    if (outsourcing) {
      policy += `
<h2>5. 개인정보 처리 위탁</h2>
<p>회사는 서비스 이행을 위해 개인정보 처리 업무를 외부 전문업체에 위탁할 수 있습니다. 위탁 시 관련 법령에 따라 위탁계약서 등을 통해 개인정보가 안전하게 관리될 수 있도록 필요한 사항을 규정합니다.</p>`;
    }

    if (overseas) {
      policy += `
<h2>6. 개인정보의 국외 이전</h2>
<p>회사는 서비스 제공을 위해 개인정보를 국외로 이전할 수 있으며, 이 경우 개인정보 보호법에 따른 안전조치를 취합니다.</p>`;
    }

    const nextSection = this.getNextSection(thirdParty, outsourcing, overseas);

    policy += `
<h2>${nextSection}. 이용자의 권리와 행사 방법</h2>
<p>이용자는 언제든지 자신의 개인정보에 대해 다음의 권리를 행사할 수 있습니다:</p>
<ul>
<li>개인정보 열람 요구</li>
<li>오류 등이 있을 경우 정정 요구</li>
<li>삭제 요구</li>
<li>처리정지 요구</li>
</ul>
<p>위 권리 행사는 개인정보관리책임자에게 서면, 전화, 이메일 등으로 연락하시면 됩니다.</p>

<h2>${nextSection + 1}. 개인정보의 파기</h2>
<p>회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.</p>
<ul>
<li>전자적 파일: 복구 및 재생이 불가능하도록 기술적 방법을 이용하여 삭제</li>
<li>서면: 분쇄기로 분쇄하거나 소각</li>
</ul>

<h2>${nextSection + 2}. 개인정보관리책임자</h2>
<p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보관리책임자를 지정하고 있습니다.</p>
<ul>
<li>개인정보관리책임자: ${this.escapeHtml(managerName)}</li>
<li>연락처: ${this.escapeHtml(contactEmail)}</li>
</ul>

<h2>${nextSection + 3}. 개인정보처리방침 변경</h2>
<p>이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</p>

<p style="margin-top: 30px;">시행일자: ${today}</p>`;

    this.elements.policyOutput.innerHTML = policy;
    this.elements.resultCard.classList.remove('hidden');
    this.elements.resultCard.scrollIntoView({ behavior: 'smooth' });
  }

  getNextSection(thirdParty, outsourcing, overseas) {
    let num = 4;
    if (thirdParty) num++;
    if (outsourcing) num++;
    if (overseas) num++;
    return num;
  }

  copyPolicy() {
    const text = this.elements.policyOutput.innerText;
    navigator.clipboard.writeText(text).then(() => {
      this.elements.copyBtn.textContent = '복사됨!';
      setTimeout(() => {
        this.elements.copyBtn.textContent = '복사';
      }, 2000);
    });
  }

  downloadPolicy() {
    const text = this.elements.policyOutput.innerText;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '개인정보처리방침.txt';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const privacyPolicyGen = new PrivacyPolicyGen();
window.PrivacyPolicyGen = privacyPolicyGen;

document.addEventListener('DOMContentLoaded', () => privacyPolicyGen.init());
