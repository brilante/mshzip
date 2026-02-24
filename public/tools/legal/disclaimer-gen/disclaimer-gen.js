/**
 * 면책조항 생성기 - ToolBase 기반
 * 웹사이트/서비스 면책조항 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var DisclaimerGen = class DisclaimerGen extends ToolBase {
  constructor() {
    super('DisclaimerGen');
    this.selectedType = 'general';

    this.typeIntros = {
      general: '본 웹사이트에서 제공하는 정보는 일반적인 정보 제공 목적으로만 사용됩니다.',
      blog: '본 블로그/웹사이트의 콘텐츠는 필자의 개인적인 의견과 경험을 바탕으로 작성되었습니다.',
      ecommerce: '본 온라인 쇼핑몰에서 제공하는 상품 및 서비스 이용에 관한 면책사항입니다.',
      financial: '본 웹사이트에서 제공하는 금융/투자 정보는 교육 및 정보 제공 목적으로만 제공됩니다. 투자 결정은 본인의 판단과 책임 하에 이루어져야 합니다.',
      health: '본 웹사이트에서 제공하는 건강/의료 정보는 일반적인 정보 제공 목적이며, 전문적인 의료 조언을 대체하지 않습니다.',
      affiliate: '본 웹사이트는 제휴 마케팅 프로그램에 참여하고 있으며, 일부 링크를 통한 구매 시 수수료를 받을 수 있습니다.'
    };
  }

  init() {
    this.initElements({
      siteName: 'siteName',
      companyName: 'companyName',
      incAccuracy: 'incAccuracy',
      incExternal: 'incExternal',
      incAvailability: 'incAvailability',
      incDamages: 'incDamages',
      incChanges: 'incChanges',
      previewContainer: 'previewContainer'
    });

    console.log('[DisclaimerGen] 초기화 완료');
    return this;
  }

  selectType(type) {
    this.selectedType = type;
    document.querySelectorAll('.type-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.type === type);
    });
  }

  generate() {
    const siteName = this.elements.siteName.value || '[웹사이트명]';
    const companyName = this.elements.companyName.value || '[운영자]';

    const incAccuracy = this.elements.incAccuracy.checked;
    const incExternal = this.elements.incExternal.checked;
    const incAvailability = this.elements.incAvailability.checked;
    const incDamages = this.elements.incDamages.checked;
    const incChanges = this.elements.incChanges.checked;

    let html = `
      <div class="disclaimer-preview" id="disclaimerPreview">
        <div class="disclaimer-title">면책조항 (Disclaimer)</div>

        <div class="disclaimer-section">
          <p>${this.typeIntros[this.selectedType]}</p>
        </div>
    `;

    if (incAccuracy) {
      html += `
        <div class="disclaimer-section">
          <h4>1. 정보의 정확성</h4>
          <p>${companyName}은(는) ${siteName}에서 제공하는 정보의 정확성, 완전성, 최신성을 보장하지 않습니다.
          본 사이트의 정보는 언제든지 예고 없이 변경될 수 있으며, 이로 인해 발생하는 어떠한 손해에 대해서도
          ${companyName}은(는) 책임을 지지 않습니다.</p>
        </div>
      `;
    }

    if (incExternal) {
      html += `
        <div class="disclaimer-section">
          <h4>${incAccuracy ? '2' : '1'}. 외부 링크</h4>
          <p>${siteName}에는 제3자 웹사이트로 연결되는 링크가 포함될 수 있습니다.
          이러한 외부 사이트의 콘텐츠, 개인정보 처리방침, 보안에 대해 ${companyName}은(는)
          어떠한 통제권이나 책임도 없습니다. 외부 링크의 포함이 해당 사이트에 대한
          보증이나 추천을 의미하지 않습니다.</p>
        </div>
      `;
    }

    if (incAvailability) {
      let num = 1;
      if (incAccuracy) num++;
      if (incExternal) num++;
      html += `
        <div class="disclaimer-section">
          <h4>${num}. 서비스 가용성</h4>
          <p>${companyName}은(는) ${siteName}의 지속적인 가용성을 보장하지 않습니다.
          시스템 유지보수, 업그레이드, 기술적 문제 또는 기타 사유로 인해 서비스가
          일시적으로 중단될 수 있으며, 이로 인한 손해에 대해 책임을 지지 않습니다.</p>
        </div>
      `;
    }

    if (incDamages) {
      let num = 1;
      if (incAccuracy) num++;
      if (incExternal) num++;
      if (incAvailability) num++;
      html += `
        <div class="disclaimer-section">
          <h4>${num}. 손해 책임 제한</h4>
          <p>관련 법률이 허용하는 최대 범위 내에서, ${companyName}은(는) ${siteName}의
          사용 또는 사용 불능으로 인해 발생하는 직접적, 간접적, 우발적, 결과적 또는
          징벌적 손해에 대해 책임을 지지 않습니다. 여기에는 데이터 손실, 이익 손실,
          영업 중단 등이 포함되나 이에 국한되지 않습니다.</p>
        </div>
      `;
    }

    if (incChanges) {
      let num = 1;
      if (incAccuracy) num++;
      if (incExternal) num++;
      if (incAvailability) num++;
      if (incDamages) num++;
      html += `
        <div class="disclaimer-section">
          <h4>${num}. 면책조항 변경</h4>
          <p>${companyName}은(는) 언제든지 사전 통지 없이 본 면책조항을 수정할 권리를
          보유합니다. 변경된 면책조항은 웹사이트에 게시되는 즉시 효력이 발생합니다.
          정기적으로 본 페이지를 확인하여 변경 사항을 숙지하시기 바랍니다.</p>
        </div>
      `;
    }

    // 유형별 추가 문구
    if (this.selectedType === 'financial') {
      html += `
        <div class="disclaimer-section">
          <h4>투자 위험 고지</h4>
          <p>모든 투자에는 원금 손실의 위험이 따릅니다. 과거의 실적이 미래의 수익을
          보장하지 않습니다. 투자 결정을 내리기 전에 반드시 자격을 갖춘 금융 전문가와
          상담하시기 바랍니다. ${companyName}은(는) 투자자문업자가 아니며, 본 사이트의
          정보는 투자 권유가 아닙니다.</p>
        </div>
      `;
    }

    if (this.selectedType === 'health') {
      html += `
        <div class="disclaimer-section">
          <h4>의료 정보 고지</h4>
          <p>본 사이트의 건강/의료 정보는 정보 제공 목적으로만 사용되며, 의사나 기타
          의료 전문가의 조언, 진단 또는 치료를 대체하지 않습니다. 건강 문제가 있는
          경우 반드시 의료 전문가와 상담하시기 바랍니다.</p>
        </div>
      `;
    }

    if (this.selectedType === 'affiliate') {
      html += `
        <div class="disclaimer-section">
          <h4>제휴 링크 고지</h4>
          <p>본 사이트에는 제휴 링크가 포함되어 있습니다. 이 링크를 통해 상품이나
          서비스를 구매하시면 ${companyName}은(는) 일정 수수료를 받을 수 있습니다.
          이러한 수수료는 추가 비용 없이 이용자에게 부과되지 않습니다. 제휴 관계가
          콘텐츠의 객관성에 영향을 미치지 않도록 노력하고 있습니다.</p>
        </div>
      `;
    }

    html += `
        <div class="disclaimer-section" style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; text-align: center; color: #666;">
          <p>최종 업데이트: ${new Date().toLocaleDateString('ko-KR')}</p>
          <p>문의사항이 있으시면 ${companyName}에 연락해 주시기 바랍니다.</p>
        </div>
      </div>
    `;

    this.elements.previewContainer.innerHTML = html;
    this.showToast('면책조항이 생성되었습니다', 'success');
  }

  copy() {
    const preview = document.getElementById('disclaimerPreview');
    if (!preview) {
      this.showToast('먼저 면책조항을 생성해주세요', 'error');
      return;
    }
    this.copyToClipboard(preview.innerText);
  }

  download() {
    const preview = document.getElementById('disclaimerPreview');
    if (!preview) {
      this.showToast('먼저 면책조항을 생성해주세요', 'error');
      return;
    }

    const siteName = this.elements.siteName.value || 'site';
    const blob = new Blob([preview.innerText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${siteName}_면책조항.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('파일이 다운로드되었습니다', 'success');
  }
}

// 전역 인스턴스 생성
const disclaimerGen = new DisclaimerGen();
window.DisclaimerGen = disclaimerGen;

// 전역 함수 (HTML onclick 호환)
function selectType(type) { disclaimerGen.selectType(type); }
function generate() { disclaimerGen.generate(); }
function copy() { disclaimerGen.copy(); }
function download() { disclaimerGen.download(); }

document.addEventListener('DOMContentLoaded', () => disclaimerGen.init());
