/**
 * 계약서 템플릿 생성기 - ToolBase 기반
 * 기본 계약서 템플릿 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ContractTemplate = class ContractTemplate extends ToolBase {
  constructor() {
    super('ContractTemplate');
    this.templates = {
      service: {
        name: '용역 계약서',
        sections: ['당사자', '계약목적', '용역내용', '대가지급', '계약기간', '비밀유지', '손해배상', '해지', '분쟁해결', '기타']
      },
      employment: {
        name: '근로계약서',
        sections: ['당사자', '업무내용', '근무장소', '근무시간', '임금', '휴가', '계약기간', '해지', '기타']
      },
      nda: {
        name: '비밀유지계약서 (NDA)',
        sections: ['당사자', '정의', '비밀유지의무', '사용제한', '기간', '반환의무', '손해배상', '준거법', '기타']
      },
      lease: {
        name: '임대차계약서',
        sections: ['당사자', '목적물', '임대기간', '임대료', '보증금', '관리비', '수선의무', '해지', '특약사항']
      }
    };
    this.currentType = 'service';
  }

  init() {
    this.initElements({
      partyA: 'partyA',
      partyB: 'partyB',
      contractSubject: 'contractSubject',
      startDate: 'startDate',
      endDate: 'endDate',
      contractAmount: 'contractAmount',
      contractLocation: 'contractLocation',
      contractOutput: 'contractOutput'
    });

    this.setTemplate('service');

    console.log('[ContractTemplate] 초기화 완료');
    return this;
  }

  setTemplate(type) {
    document.querySelectorAll('.template-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
    this.currentType = type;
    this.generate();
  }

  generate() {
    const template = this.templates[this.currentType];
    const partyA = this.elements.partyA.value || '갑 (상호/성명)';
    const partyB = this.elements.partyB.value || '을 (상호/성명)';
    const subject = this.elements.contractSubject.value || '계약 목적';
    const startDate = this.elements.startDate.value || new Date().toISOString().split('T')[0];
    const endDate = this.elements.endDate.value || '';
    const amount = this.elements.contractAmount.value || '0';
    const location = this.elements.contractLocation.value || '서울특별시';

    let content = this.generateContent(this.currentType, {
      template, partyA, partyB, subject, startDate, endDate, amount, location
    });

    this.elements.contractOutput.innerHTML = content;
  }

  generateContent(type, data) {
    const today = new Date().toLocaleDateString('ko-KR');
    const formatAmount = parseInt(data.amount || 0).toLocaleString();

    let html = `<div class="contract-document">`;
    html += `<h1 class="contract-title">${data.template.name}</h1>`;

    switch (type) {
      case 'service':
        html += `
          <p class="contract-preamble">
            ${data.partyA}(이하 "갑"이라 한다)과 ${data.partyB}(이하 "을"이라 한다)은 다음과 같이 용역계약을 체결한다.
          </p>

          <h2>제1조 (계약의 목적)</h2>
          <p>본 계약은 갑이 을에게 ${data.subject}에 관한 용역을 의뢰하고, 을은 이를 성실히 수행함을 목적으로 한다.</p>

          <h2>제2조 (용역의 내용)</h2>
          <p>을이 수행할 용역의 구체적인 내용은 다음과 같다.</p>
          <p>[용역 내용 상세 기술]</p>

          <h2>제3조 (계약금액 및 지급방법)</h2>
          <p>1. 본 계약에 따른 용역대금은 금 ${formatAmount}원(부가세 별도/포함)으로 한다.</p>
          <p>2. 지급방법: [계약금/중도금/잔금 구분 또는 일시불]</p>

          <h2>제4조 (계약기간)</h2>
          <p>본 계약의 유효기간은 ${data.startDate}부터 ${data.endDate || '완료시까지'}로 한다.</p>

          <h2>제5조 (비밀유지)</h2>
          <p>갑과 을은 본 계약의 수행과정에서 알게 된 상대방의 영업비밀 및 기밀정보를 제3자에게 누설하거나 본 계약의 목적 외에 사용하여서는 아니 된다.</p>

          <h2>제6조 (손해배상)</h2>
          <p>갑 또는 을이 본 계약을 위반하여 상대방에게 손해를 입힌 경우, 그 손해를 배상하여야 한다.</p>

          <h2>제7조 (계약의 해지)</h2>
          <p>갑 또는 을은 상대방이 본 계약을 위반하고 시정요구를 받은 날로부터 14일 이내에 이를 시정하지 않는 경우 본 계약을 해지할 수 있다.</p>

          <h2>제8조 (분쟁해결)</h2>
          <p>본 계약과 관련하여 분쟁이 발생한 경우 ${data.location} 관할 법원을 전속 관할법원으로 한다.</p>

          <h2>제9조 (기타)</h2>
          <p>본 계약에 정하지 아니한 사항은 갑과 을이 상호 협의하여 결정한다.</p>`;
        break;

      case 'employment':
        html += `
          <p class="contract-preamble">
            ${data.partyA}(이하 "사업주"라 한다)과 ${data.partyB}(이하 "근로자"라 한다)는 다음과 같이 근로계약을 체결한다.
          </p>

          <h2>제1조 (업무내용)</h2>
          <p>근로자가 수행할 업무의 내용은 ${data.subject}로 한다.</p>

          <h2>제2조 (근무장소)</h2>
          <p>${data.location}</p>

          <h2>제3조 (근무시간)</h2>
          <p>1. 근무시간: 09:00 ~ 18:00 (휴게시간 12:00 ~ 13:00)</p>
          <p>2. 근무일: 주 5일 (월요일 ~ 금요일)</p>

          <h2>제4조 (임금)</h2>
          <p>1. 월급: 금 ${formatAmount}원</p>
          <p>2. 지급일: 매월 [  ]일 (휴일인 경우 전일 지급)</p>

          <h2>제5조 (연차휴가)</h2>
          <p>근로기준법에서 정하는 바에 따른다.</p>

          <h2>제6조 (계약기간)</h2>
          <p>${data.startDate}부터 ${data.endDate || '정년까지'}</p>

          <h2>제7조 (기타)</h2>
          <p>본 계약에 정하지 아니한 사항은 근로기준법에 따른다.</p>`;
        break;

      case 'nda':
        html += `
          <p class="contract-preamble">
            ${data.partyA}(이하 "제공자"라 한다)과 ${data.partyB}(이하 "수령자"라 한다)는 비밀정보의 보호를 위하여 다음과 같이 계약을 체결한다.
          </p>

          <h2>제1조 (정의)</h2>
          <p>"비밀정보"란 제공자가 수령자에게 서면, 구두, 전자적 또는 기타 형태로 제공하는 모든 기술적, 영업적 정보를 말한다.</p>

          <h2>제2조 (비밀유지의무)</h2>
          <p>수령자는 비밀정보를 비밀로 유지하고, 사전 서면 동의 없이 제3자에게 공개하거나 누설하지 아니한다.</p>

          <h2>제3조 (사용제한)</h2>
          <p>수령자는 비밀정보를 ${data.subject} 목적으로만 사용하며, 그 외의 목적으로 사용하지 아니한다.</p>

          <h2>제4조 (유효기간)</h2>
          <p>본 계약의 유효기간은 ${data.startDate}부터 ${data.endDate || '3년간'}으로 한다. 단, 비밀유지의무는 계약 종료 후에도 3년간 유효하다.</p>

          <h2>제5조 (비밀정보의 반환)</h2>
          <p>수령자는 제공자의 요청 시 또는 계약 종료 시 비밀정보 및 그 복제물을 즉시 반환하거나 파기한다.</p>

          <h2>제6조 (손해배상)</h2>
          <p>수령자가 본 계약을 위반하여 제공자에게 손해를 입힌 경우, 그 손해를 배상하여야 한다.</p>

          <h2>제7조 (준거법 및 관할)</h2>
          <p>본 계약은 대한민국 법률에 따라 해석되며, 분쟁 발생 시 ${data.location} 관할 법원을 전속 관할로 한다.</p>`;
        break;

      case 'lease':
        html += `
          <p class="contract-preamble">
            ${data.partyA}(이하 "임대인"이라 한다)과 ${data.partyB}(이하 "임차인"이라 한다)는 아래 부동산에 대하여 다음과 같이 임대차계약을 체결한다.
          </p>

          <h2>제1조 (목적물의 표시)</h2>
          <p>소재지: ${data.location}</p>
          <p>용도: ${data.subject}</p>

          <h2>제2조 (임대차 기간)</h2>
          <p>${data.startDate}부터 ${data.endDate || '24개월간'}</p>

          <h2>제3조 (보증금 및 차임)</h2>
          <p>1. 보증금: 금 [    ]원</p>
          <p>2. 월 차임: 금 ${formatAmount}원 (매월 [  ]일까지 지급)</p>

          <h2>제4조 (관리비)</h2>
          <p>관리비는 별도로 하며, 매월 차임과 함께 지급한다.</p>

          <h2>제5조 (임대인의 의무)</h2>
          <p>임대인은 목적물을 계약 용도에 적합한 상태로 유지하여야 한다.</p>

          <h2>제6조 (임차인의 의무)</h2>
          <p>임차인은 선량한 관리자의 주의로 목적물을 사용하여야 하며, 임대인의 동의 없이 구조변경이나 전대를 할 수 없다.</p>

          <h2>제7조 (계약의 해지)</h2>
          <p>각 당사자는 상대방이 계약을 위반한 경우 시정요구 후 계약을 해지할 수 있다.</p>

          <h2>특약사항</h2>
          <p>[    ]</p>`;
        break;
    }

    html += `
      <div class="contract-signature">
        <p>위 계약의 성립을 증명하기 위하여 본 계약서 2부를 작성하고 각 당사자가 기명날인 후 각 1부씩 보관한다.</p>
        <p class="contract-date">${today}</p>
        <div class="signature-block">
          <div class="party">
            <p><strong>갑 (${this.currentType === 'lease' ? '임대인' : this.currentType === 'employment' ? '사업주' : this.currentType === 'nda' ? '제공자' : '갑'})</strong></p>
            <p>상호/성명: ${data.partyA}</p>
            <p>주소:</p>
            <p>서명/날인: ________________</p>
          </div>
          <div class="party">
            <p><strong>을 (${this.currentType === 'lease' ? '임차인' : this.currentType === 'employment' ? '근로자' : this.currentType === 'nda' ? '수령자' : '을'})</strong></p>
            <p>상호/성명: ${data.partyB}</p>
            <p>주소:</p>
            <p>서명/날인: ________________</p>
          </div>
        </div>
      </div>
    </div>`;

    return html;
  }

  async copyContract() {
    const content = this.elements.contractOutput.innerText;
    try {
      await navigator.clipboard.writeText(content);
      this.showToast('계약서 텍스트가 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  printContract() {
    const content = this.elements.contractOutput.innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>계약서</title>
        <style>
          body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.8; }
          .contract-title { text-align: center; font-size: 24px; margin-bottom: 30px; }
          .contract-preamble { margin: 20px 0; }
          h2 { font-size: 16px; margin-top: 20px; }
          .contract-signature { margin-top: 50px; }
          .contract-date { text-align: center; margin: 30px 0; }
          .signature-block { display: flex; justify-content: space-around; margin-top: 50px; }
          .party { width: 40%; line-height: 2; }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const contractTemplate = new ContractTemplate();
window.ContractTemplate = contractTemplate;

document.addEventListener('DOMContentLoaded', () => contractTemplate.init());
