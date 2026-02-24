/**
 * 비밀유지계약서 생성기 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class NdaGen extends ToolBase {
  constructor() {
    super('NdaGen');
  }

  init() {
    this.initElements({
      partyA: 'partyA',
      partyB: 'partyB',
      contractDate: 'contractDate',
      duration: 'duration',
      scopeInfo: 'scopeInfo',
      preview: 'preview'
    });

    this.elements.contractDate.value = new Date().toISOString().split('T')[0];

    console.log('[NdaGen] 초기화 완료');
    return this;
  }

  generate() {
    const partyA = this.elements.partyA.value || '[공개자]';
    const partyB = this.elements.partyB.value || '[수령자]';
    const contractDate = this.elements.contractDate.value;
    const duration = this.elements.duration.value || 2;
    const scopeInfo = this.elements.scopeInfo.value;

    const dateStr = contractDate ? new Date(contractDate).toLocaleDateString('ko-KR') : '[날짜]';

    const html = `<h1>비밀유지계약서 (NDA)</h1>

<p><strong>${partyA}</strong> (이하 "갑"이라 한다)와 <strong>${partyB}</strong> (이하 "을"이라 한다)는 상호 비밀정보의 보호를 위하여 다음과 같이 비밀유지계약을 체결한다.</p>

<h2>제1조 (목적)</h2>
<p>본 계약은 갑과 을 간의 업무 협력 과정에서 상호 제공되는 비밀정보의 보호에 관한 사항을 정함을 목적으로 한다.</p>

<h2>제2조 (비밀정보의 정의)</h2>
<p>본 계약에서 "비밀정보"라 함은 다음을 포함하나 이에 한정되지 않는다:</p>
<p>${scopeInfo}</p>

<h2>제3조 (비밀유지 의무)</h2>
<p>1. 을은 갑으로부터 제공받은 비밀정보를 선량한 관리자의 주의의무로 관리하여야 한다.</p>
<p>2. 을은 비밀정보를 본 계약의 목적 이외의 용도로 사용하거나 제3자에게 공개, 누설하여서는 아니 된다.</p>
<p>3. 을은 비밀정보에 접근할 수 있는 임직원을 최소한으로 제한하고, 해당 임직원에게 본 계약과 동등한 비밀유지의무를 부과하여야 한다.</p>

<h2>제4조 (비밀유지 예외)</h2>
<p>다음 각 호의 경우에는 비밀유지의무가 적용되지 아니한다:</p>
<p>1. 공개 당시 이미 공지의 사실이었거나, 공개 후 을의 귀책사유 없이 공지된 정보</p>
<p>2. 을이 제3자로부터 비밀유지의무 없이 적법하게 취득한 정보</p>
<p>3. 법령에 의하여 공개가 요구되는 정보</p>

<h2>제5조 (계약기간)</h2>
<p>본 계약의 유효기간은 계약체결일로부터 <strong>${duration}년</strong>으로 한다. 다만, 비밀정보에 대한 비밀유지의무는 본 계약 종료 후에도 ${duration}년간 존속한다.</p>

<h2>제6조 (손해배상)</h2>
<p>을이 본 계약을 위반하여 갑에게 손해를 끼친 경우, 을은 갑이 입은 모든 손해를 배상하여야 한다.</p>

<h2>제7조 (분쟁해결)</h2>
<p>본 계약에 관한 분쟁은 갑의 본사 소재지 관할 법원에서 해결한다.</p>

<p style="margin-top: 30px;">본 계약의 성립을 증명하기 위하여 계약서 2통을 작성하고, 갑과 을이 서명 날인한 후 각 1통씩 보관한다.</p>

<p style="text-align: center; margin-top: 20px;"><strong>${dateStr}</strong></p>

<div class="signature-area">
  <div class="signature-box">
    <p><strong>갑 (공개자)</strong></p>
    <p>${partyA}</p>
    <div class="signature-line">(서명)</div>
  </div>
  <div class="signature-box">
    <p><strong>을 (수령자)</strong></p>
    <p>${partyB}</p>
    <div class="signature-line">(서명)</div>
  </div>
</div>`;

    this.elements.preview.innerHTML = html;
    this.showToast('NDA가 생성되었습니다', 'success');
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
    link.download = 'NDA_비밀유지계약서.txt';
    link.click();
    URL.revokeObjectURL(link.href);
    this.showToast('파일이 다운로드되었습니다', 'success');
  }

  print() {
    window.print();
  }
}

// 전역 인스턴스 생성
const ndaGen = new NdaGen();
window.NdaGen = ndaGen;

// 전역 함수 (HTML onclick 호환)
function generate() { ndaGen.generate(); }
function copyText() { ndaGen.copyText(); }
function downloadTxt() { ndaGen.downloadTxt(); }
function print() { ndaGen.print(); }

document.addEventListener('DOMContentLoaded', () => ndaGen.init());
