/**
 * 환불 정책 생성기 - ToolBase 기반
 * 전자상거래 환불 정책 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var RefundPolicy = class RefundPolicy extends ToolBase {
  constructor() {
    super('RefundPolicy');
    this.selectedType = 'physical';
  }

  init() {
    this.initElements({
      companyName: 'companyName',
      contactInfo: 'contactInfo',
      emailAddress: 'emailAddress',
      refundPeriod: 'refundPeriod',
      exchangePeriod: 'exchangePeriod',
      incPartialRefund: 'incPartialRefund',
      incShipping: 'incShipping',
      incExceptions: 'incExceptions',
      incProcess: 'incProcess',
      previewContainer: 'previewContainer'
    });

    console.log('[RefundPolicy] 초기화 완료');
    return this;
  }

  selectType(type) {
    this.selectedType = type;
    document.querySelectorAll('.business-type').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.type === type);
    });
  }

  generate() {
    const companyName = this.elements.companyName.value || '[회사명]';
    const contactInfo = this.elements.contactInfo.value || '[연락처]';
    const emailAddress = this.elements.emailAddress.value || '[이메일]';
    const refundPeriod = this.elements.refundPeriod.value || '7';
    const exchangePeriod = this.elements.exchangePeriod.value || '14';

    const incPartialRefund = this.elements.incPartialRefund.checked;
    const incShipping = this.elements.incShipping.checked;
    const incExceptions = this.elements.incExceptions.checked;
    const incProcess = this.elements.incProcess.checked;

    const typeNames = {
      physical: '실물 상품',
      digital: '디지털 상품',
      service: '서비스',
      subscription: '구독 서비스',
      course: '온라인 강의',
      saas: 'SaaS 서비스'
    };

    let html = `
      <div class="policy-preview" id="policyPreview">
        <div class="policy-title">${companyName} 환불 및 반품 정책</div>

        <div class="policy-section">
          <h4>1. 개요</h4>
          <p>${companyName}은(는) 고객 만족을 최우선으로 생각합니다. 본 정책은 ${typeNames[this.selectedType]}에 대한 환불 및 반품 조건을 안내합니다.</p>
        </div>

        <div class="policy-section">
          <h4>2. 환불 가능 조건</h4>
    `;

    // 사업 유형별 환불 조건
    if (this.selectedType === 'physical') {
      html += `
          <p>다음 조건을 충족하는 경우 환불이 가능합니다:</p>
          <ul style="margin-left: 1.5rem; list-style: disc;">
            <li>상품 수령 후 ${refundPeriod}일 이내에 환불 요청</li>
            <li>상품이 미개봉 상태이며 원래 포장 상태 유지</li>
            <li>상품 및 부속품이 훼손되지 않은 상태</li>
            <li>구매 영수증 또는 주문 확인서 보유</li>
          </ul>
      `;
    } else if (this.selectedType === 'digital') {
      html += `
          <p>디지털 상품의 특성상 다음 조건에서만 환불이 가능합니다:</p>
          <ul style="margin-left: 1.5rem; list-style: disc;">
            <li>구매 후 다운로드/열람 전 ${refundPeriod}일 이내</li>
            <li>기술적 결함으로 사용이 불가능한 경우</li>
            <li>구매한 상품과 실제 제공된 상품이 다른 경우</li>
          </ul>
          <p style="color: #dc2626; margin-top: 0.5rem;">※ 다운로드/열람 후에는 환불이 불가합니다.</p>
      `;
    } else if (this.selectedType === 'service') {
      html += `
          <p>서비스에 대한 환불 조건:</p>
          <ul style="margin-left: 1.5rem; list-style: disc;">
            <li>서비스 시작 전: 전액 환불</li>
            <li>서비스 시작 후 ${refundPeriod}일 이내: 이용한 부분을 제외한 금액 환불</li>
            <li>서비스 품질이 계약 내용과 현저히 다른 경우</li>
          </ul>
      `;
    } else if (this.selectedType === 'subscription') {
      html += `
          <p>구독 서비스 환불 조건:</p>
          <ul style="margin-left: 1.5rem; list-style: disc;">
            <li>구독 시작 후 ${refundPeriod}일 이내: 전액 환불</li>
            <li>구독 기간 중 해지: 남은 기간에 대한 일할 계산 환불</li>
            <li>연간 구독 해지: 사용 기간을 월 단위로 정산 후 차액 환불</li>
          </ul>
          <p style="margin-top: 0.5rem;">※ 무료 체험 기간 내 해지 시 결제가 발생하지 않습니다.</p>
      `;
    } else if (this.selectedType === 'course') {
      html += `
          <p>온라인 강의 환불 조건 (학원법 적용):</p>
          <ul style="margin-left: 1.5rem; list-style: disc;">
            <li>수강 시작 전: 전액 환불</li>
            <li>총 수강 기간의 1/3 경과 전: 수강료의 2/3 환불</li>
            <li>총 수강 기간의 1/2 경과 전: 수강료의 1/2 환불</li>
            <li>총 수강 기간의 1/2 경과 후: 환불 불가</li>
          </ul>
      `;
    } else if (this.selectedType === 'saas') {
      html += `
          <p>SaaS 서비스 환불 조건:</p>
          <ul style="margin-left: 1.5rem; list-style: disc;">
            <li>무료 체험 기간: 자동 결제 전 해지 시 무료</li>
            <li>월간 구독: 결제일로부터 ${refundPeriod}일 이내 전액 환불</li>
            <li>연간 구독: 결제일로부터 30일 이내 전액 환불</li>
            <li>서비스 장애로 인한 손해: 별도 협의</li>
          </ul>
      `;
    }

    html += '</div>';

    if (incExceptions) {
      html += `
        <div class="policy-section">
          <h4>3. 환불 불가 사유</h4>
          <p>다음의 경우 환불이 불가합니다:</p>
          <ul style="margin-left: 1.5rem; list-style: disc;">
      `;

      if (this.selectedType === 'physical') {
        html += `
            <li>고객의 사용 또는 일부 소비로 상품 가치가 현저히 감소한 경우</li>
            <li>고객의 책임 있는 사유로 상품이 멸실/훼손된 경우</li>
            <li>시간 경과로 재판매가 곤란할 정도로 가치가 감소한 경우</li>
            <li>복제 가능한 상품의 포장이 훼손된 경우</li>
            <li>주문 제작 상품</li>
        `;
      } else {
        html += `
            <li>이용약관에 명시된 환불 불가 상품/서비스</li>
            <li>고객의 단순 변심 (디지털/서비스 상품)</li>
            <li>이미 제공/소비된 서비스</li>
            <li>프로모션/할인 상품 (별도 명시된 경우)</li>
        `;
      }

      html += `
          </ul>
        </div>
      `;
    }

    if (this.selectedType === 'physical' && incShipping) {
      html += `
        <div class="policy-section">
          <h4>${incExceptions ? '4' : '3'}. 배송비 안내</h4>
          <ul style="margin-left: 1.5rem; list-style: disc;">
            <li><strong>상품 하자/오배송:</strong> 판매자 부담</li>
            <li><strong>고객 단순 변심:</strong> 고객 부담 (왕복 배송비)</li>
            <li><strong>교환 시:</strong> 고객 변심의 경우 왕복 배송비 고객 부담</li>
          </ul>
        </div>
      `;
    }

    if (incPartialRefund) {
      let num = 3;
      if (incExceptions) num++;
      if (this.selectedType === 'physical' && incShipping) num++;

      html += `
        <div class="policy-section">
          <h4>${num}. 부분 환불</h4>
          <p>다음의 경우 부분 환불이 적용됩니다:</p>
          <ul style="margin-left: 1.5rem; list-style: disc;">
            <li>세트/번들 상품 중 일부만 반품하는 경우</li>
            <li>사용/소비된 부분이 있는 경우</li>
            <li>할인/쿠폰 적용 상품의 일부 환불 시 정상가 기준 계산</li>
          </ul>
        </div>
      `;
    }

    if (incProcess) {
      let num = 3;
      if (incExceptions) num++;
      if (this.selectedType === 'physical' && incShipping) num++;
      if (incPartialRefund) num++;

      html += `
        <div class="policy-section">
          <h4>${num}. 환불 절차</h4>
          <ol style="margin-left: 1.5rem;">
            <li><strong>환불 신청:</strong> 고객센터(${contactInfo}) 또는 이메일(${emailAddress})로 환불 요청</li>
            <li><strong>접수 확인:</strong> 1-2 영업일 내 접수 확인 연락</li>
      `;

      if (this.selectedType === 'physical') {
        html += `
            <li><strong>상품 반송:</strong> 안내된 주소로 상품 발송</li>
            <li><strong>상품 검수:</strong> 반품 도착 후 1-3 영업일 내 검수</li>
        `;
      }

      html += `
            <li><strong>환불 처리:</strong> 검수 완료 후 3-5 영업일 내 환불 처리</li>
            <li><strong>환불 완료:</strong> 결제 수단에 따라 3-7 영업일 소요</li>
          </ol>
        </div>
      `;
    }

    html += `
        <div class="policy-section">
          <h4>문의처</h4>
          <p>
            <strong>고객센터:</strong> ${contactInfo}<br>
            <strong>이메일:</strong> ${emailAddress}<br>
            <strong>운영시간:</strong> 평일 09:00 - 18:00 (주말/공휴일 휴무)
          </p>
        </div>

        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 0.85rem;">
          <p>본 정책은 ${new Date().toLocaleDateString('ko-KR')}부터 시행됩니다.</p>
          <p>전자상거래 등에서의 소비자보호에 관한 법률에 따릅니다.</p>
        </div>
      </div>
    `;

    this.elements.previewContainer.innerHTML = html;
    this.showToast('환불 정책이 생성되었습니다', 'success');
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

    const companyName = this.elements.companyName.value || 'company';
    const blob = new Blob([preview.innerText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName}_환불정책.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('파일이 다운로드되었습니다', 'success');
  }
}

// 전역 인스턴스 생성
const refundPolicy = new RefundPolicy();
window.RefundPolicy = refundPolicy;

// 전역 함수 (HTML onclick 호환)
function selectType(type) { refundPolicy.selectType(type); }
function generate() { refundPolicy.generate(); }
function copy() { refundPolicy.copy(); }
function download() { refundPolicy.download(); }

document.addEventListener('DOMContentLoaded', () => refundPolicy.init());
