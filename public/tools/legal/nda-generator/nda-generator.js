/**
 * NDA 생성기 - ToolBase 기반
 * 비밀유지계약서 자동 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var NDAGenerator = class NDAGenerator extends ToolBase {
  constructor() {
    super('NDAGenerator');
    this.currentType = 'mutual';
  }

  init() {
    this.initElements({
      discloserName: 'discloserName',
      discloserRep: 'discloserRep',
      discloserAddress: 'discloserAddress',
      recipientName: 'recipientName',
      recipientRep: 'recipientRep',
      recipientAddress: 'recipientAddress',
      purpose: 'purpose',
      duration: 'duration',
      jurisdiction: 'jurisdiction',
      previewContainer: 'previewContainer'
    });

    console.log('[NDAGenerator] 초기화 완료');
    return this;
  }

  setType(type) {
    this.currentType = type;
    document.querySelectorAll('.type-pill').forEach(pill => {
      pill.classList.toggle('active', pill.dataset.type === type);
    });
  }

  generate() {
    const discloserName = this.elements.discloserName.value || '[공개자]';
    const discloserRep = this.elements.discloserRep.value || '[대표자]';
    const discloserAddress = this.elements.discloserAddress.value || '[주소]';
    const recipientName = this.elements.recipientName.value || '[수령자]';
    const recipientRep = this.elements.recipientRep.value || '[대표자]';
    const recipientAddress = this.elements.recipientAddress.value || '[주소]';
    const purpose = this.elements.purpose.value || '[목적]';
    const duration = this.elements.duration.value;
    const jurisdiction = this.elements.jurisdiction.value || '서울중앙지방법원';

    const durationText = duration === '0' ? '무기한' : `${duration}년`;
    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    const isMutual = this.currentType === 'mutual';
    const title = isMutual ? '상호 비밀유지계약서' : '비밀유지계약서';
    const partyDesc = isMutual
      ? `${discloserName}(이하 "갑"이라 함)와 ${recipientName}(이하 "을"이라 함)는`
      : `${discloserName}(이하 "공개자"라 함)와 ${recipientName}(이하 "수령자"라 함)는`;

    this.elements.previewContainer.innerHTML = `
      <div class="nda-preview" id="ndaPreview">
        <div class="nda-title">${title}</div>

        <div class="nda-section">
          <p>${partyDesc} ${purpose}을(를) 위하여 상호 교환되는 비밀정보의 보호를 위해 다음과 같이 계약을 체결한다.</p>
        </div>

        <div class="nda-section">
          <div class="nda-section-title">제1조 (목적)</div>
          <p>본 계약은 ${purpose}과(와) 관련하여 당사자 간에 교환되는 비밀정보를 보호하고, 그 비밀정보의 사용 및 공개에 관한 조건을 정함을 목적으로 한다.</p>
        </div>

        <div class="nda-section">
          <div class="nda-section-title">제2조 (비밀정보의 정의)</div>
          <p>본 계약에서 "비밀정보"라 함은 일방 당사자가 상대방에게 서면, 구두, 전자적 또는 기타 방법으로 공개하는 모든 기술적, 영업적, 재무적 정보를 포함하며, 다음을 포함하나 이에 국한되지 않는다:</p>
          <p>① 사업계획, 마케팅 전략, 고객 정보<br>
          ② 기술 데이터, 소프트웨어, 알고리즘, 노하우<br>
          ③ 재무 정보, 가격 정책, 계약 조건<br>
          ④ 기타 영업비밀로 표시되거나 합리적으로 비밀로 간주되는 정보</p>
        </div>

        <div class="nda-section">
          <div class="nda-section-title">제3조 (비밀유지 의무)</div>
          <p>${isMutual ? '각 당사자는' : '수령자는'} 다음의 의무를 부담한다:</p>
          <p>① 비밀정보를 본 계약의 목적 이외의 용도로 사용하지 않는다.<br>
          ② 비밀정보를 제3자에게 공개, 누설, 배포하지 않는다.<br>
          ③ 비밀정보에 대해 동일한 수준의 보호 조치를 취한다.<br>
          ④ 비밀정보에 접근할 수 있는 임직원에게 본 계약상의 의무를 고지하고 준수하도록 한다.</p>
        </div>

        <div class="nda-section">
          <div class="nda-section-title">제4조 (예외)</div>
          <p>다음 각 호에 해당하는 정보는 비밀정보에서 제외된다:</p>
          <p>① 공개 시점에 이미 공지의 사실이었던 정보<br>
          ② 수령자의 귀책사유 없이 공지의 사실이 된 정보<br>
          ③ 수령자가 제3자로부터 비밀유지의무 없이 적법하게 취득한 정보<br>
          ④ 수령자가 독자적으로 개발한 정보</p>
        </div>

        <div class="nda-section">
          <div class="nda-section-title">제5조 (유효기간)</div>
          <p>본 계약의 유효기간은 계약 체결일로부터 ${durationText}으로 한다. 단, 비밀유지 의무는 계약 종료 후에도 ${duration === '0' ? '영구히' : '3년간'} 존속한다.</p>
        </div>

        <div class="nda-section">
          <div class="nda-section-title">제6조 (비밀정보의 반환)</div>
          <p>${isMutual ? '각 당사자는' : '수령자는'} 본 계약이 종료되거나 상대방의 요청이 있는 경우, 비밀정보 및 그 복사본을 즉시 반환하거나 파기하여야 한다.</p>
        </div>

        <div class="nda-section">
          <div class="nda-section-title">제7조 (손해배상)</div>
          <p>본 계약을 위반한 당사자는 상대방이 입은 모든 손해를 배상할 책임이 있다.</p>
        </div>

        <div class="nda-section">
          <div class="nda-section-title">제8조 (분쟁해결)</div>
          <p>본 계약과 관련된 분쟁은 ${jurisdiction}을(를) 관할법원으로 한다.</p>
        </div>

        <div class="nda-section">
          <p style="text-align: center; margin-top: 2rem;">
            본 계약의 성립을 증명하기 위하여 본 계약서 2통을 작성하고, 양 당사자가 서명 날인 후 각 1통씩 보관한다.
          </p>
          <p style="text-align: center; margin-top: 1rem;">${today}</p>
        </div>

        <div class="nda-signature">
          <div class="signature-block">
            <p><strong>${isMutual ? '갑' : '공개자'}</strong></p>
            <p>상호: ${discloserName}</p>
            <p>주소: ${discloserAddress}</p>
            <p>대표: ${discloserRep}</p>
            <div class="signature-line">(인)</div>
          </div>
          <div class="signature-block">
            <p><strong>${isMutual ? '을' : '수령자'}</strong></p>
            <p>상호: ${recipientName}</p>
            <p>주소: ${recipientAddress}</p>
            <p>대표: ${recipientRep}</p>
            <div class="signature-line">(인)</div>
          </div>
        </div>
      </div>
    `;

    this.showToast('NDA 문서가 생성되었습니다', 'success');
  }

  copy() {
    const preview = document.getElementById('ndaPreview');
    if (!preview) {
      this.showToast('먼저 문서를 생성해주세요', 'error');
      return;
    }
    this.copyToClipboard(preview.innerText);
  }

  print() {
    const preview = document.getElementById('ndaPreview');
    if (!preview) {
      this.showToast('먼저 문서를 생성해주세요', 'error');
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>비밀유지계약서</title>
          <style>
            body { font-family: 'Malgun Gothic', serif; padding: 40px; line-height: 1.8; }
            .nda-title { text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 30px; }
            .nda-section { margin-bottom: 20px; }
            .nda-section-title { font-weight: bold; margin-bottom: 5px; }
            .nda-signature { display: flex; justify-content: space-between; margin-top: 50px; }
            .signature-block { text-align: center; width: 45%; }
            .signature-line { border-top: 1px solid #333; margin-top: 50px; padding-top: 10px; }
          </style>
        </head>
        <body>${preview.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
}

// 전역 인스턴스 생성
const ndaGenerator = new NDAGenerator();
window.NDAGenerator = ndaGenerator;

// 전역 함수 (HTML onclick 호환)
function setType(type) { ndaGenerator.setType(type); }
function generate() { ndaGenerator.generate(); }
function copy() { ndaGenerator.copy(); }
function print() { ndaGenerator.print(); }

document.addEventListener('DOMContentLoaded', () => ndaGenerator.init());
