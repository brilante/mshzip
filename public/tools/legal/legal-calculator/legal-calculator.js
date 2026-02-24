/**
 * 법률 계산기 - ToolBase 기반
 * 지연이자, 인지대 등 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var LegalCalculator = class LegalCalculator extends ToolBase {
  constructor() {
    super('LegalCalculator');
  }

  init() {
    this.initElements({
      delayStart: 'delayStart',
      delayEnd: 'delayEnd',
      delayPrincipal: 'delayPrincipal',
      delayRate: 'delayRate',
      delayResult: 'delayResult',
      stampAmount: 'stampAmount',
      stampType: 'stampType',
      stampResult: 'stampResult',
      sevStart: 'sevStart',
      sevEnd: 'sevEnd',
      sevSalary: 'sevSalary',
      severanceResult: 'severanceResult'
    });

    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    this.elements.delayStart.valueAsDate = oneYearAgo;
    this.elements.delayEnd.valueAsDate = today;
    this.elements.sevStart.valueAsDate = oneYearAgo;
    this.elements.sevEnd.valueAsDate = today;

    console.log('[LegalCalculator] 초기화 완료');
    return this;
  }

  showTab(tab) {
    document.querySelectorAll('.calc-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.calc-tab').forEach(t => t.classList.remove('active'));

    document.getElementById(`${tab}Section`).classList.add('active');
    event.target.classList.add('active');
  }

  formatNumber(num) {
    return num.toLocaleString('ko-KR');
  }

  // 지연이자 계산
  calcDelay() {
    const principal = parseFloat(this.elements.delayPrincipal.value);
    const rate = parseFloat(this.elements.delayRate.value);
    const startDate = new Date(this.elements.delayStart.value);
    const endDate = new Date(this.elements.delayEnd.value);

    if (!principal || !rate || !startDate || !endDate) {
      this.showToast('모든 필드를 입력해주세요', 'error');
      return;
    }

    if (endDate <= startDate) {
      this.showToast('종료일은 시작일 이후여야 합니다', 'error');
      return;
    }

    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const interest = Math.round(principal * (rate / 100) * (days / 365));
    const total = principal + interest;

    this.elements.delayResult.innerHTML = `
      <div class="result-box">
        <div class="result-title">총 청구금액</div>
        <div class="result-value">₩${this.formatNumber(total)}</div>
        <div class="result-details">
          <div class="detail-row">
            <span>원금</span>
            <span>₩${this.formatNumber(principal)}</span>
          </div>
          <div class="detail-row">
            <span>지연이자 (${days}일)</span>
            <span>₩${this.formatNumber(interest)}</span>
          </div>
          <div class="detail-row">
            <span>적용 이율</span>
            <span>연 ${rate}%</span>
          </div>
        </div>
      </div>
    `;
  }

  // 인지대 계산
  calcStamp() {
    const amount = parseFloat(this.elements.stampAmount.value);
    const type = this.elements.stampType.value;

    if (!amount) {
      this.showToast('소가를 입력해주세요', 'error');
      return;
    }

    let stamp = 0;
    let multiplier = 1;

    if (type === 'appeal') multiplier = 1.5;
    if (type === 'supreme') multiplier = 2;

    // 인지대 계산 (2023년 기준 민사소송 등 인지법)
    if (amount <= 10000000) {
      stamp = amount * 0.005;
    } else if (amount <= 100000000) {
      stamp = 50000 + (amount - 10000000) * 0.0045;
    } else if (amount <= 1000000000) {
      stamp = 455000 + (amount - 100000000) * 0.004;
    } else {
      stamp = 4055000 + (amount - 1000000000) * 0.0035;
    }

    stamp = Math.round(stamp * multiplier);
    stamp = Math.max(stamp, 1000); // 최소 인지대

    const typeNames = { civil: '1심', appeal: '항소심', supreme: '상고심' };

    this.elements.stampResult.innerHTML = `
      <div class="result-box">
        <div class="result-title">${typeNames[type]} 인지대</div>
        <div class="result-value">₩${this.formatNumber(stamp)}</div>
        <div class="result-details">
          <div class="detail-row">
            <span>소가</span>
            <span>₩${this.formatNumber(amount)}</span>
          </div>
          <div class="detail-row">
            <span>소송 종류</span>
            <span>${typeNames[type]}</span>
          </div>
          ${type !== 'civil' ? `
          <div class="detail-row">
            <span>가산율</span>
            <span>${multiplier}배</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // 퇴직금 계산
  calcSeverance() {
    const startDate = new Date(this.elements.sevStart.value);
    const endDate = new Date(this.elements.sevEnd.value);
    const salary3m = parseFloat(this.elements.sevSalary.value);

    if (!startDate || !endDate || !salary3m) {
      this.showToast('모든 필드를 입력해주세요', 'error');
      return;
    }

    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    if (days < 365) {
      this.showToast('퇴직금은 1년 이상 근무 시 지급됩니다', 'error');
      return;
    }

    // 1일 평균임금 = 3개월 급여 / 90일
    const dailyWage = salary3m / 90;

    // 퇴직금 = (1일 평균임금 × 30일) × (재직일수 / 365)
    const severance = Math.round((dailyWage * 30) * (days / 365));

    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);

    this.elements.severanceResult.innerHTML = `
      <div class="result-box">
        <div class="result-title">예상 퇴직금</div>
        <div class="result-value">₩${this.formatNumber(severance)}</div>
        <div class="result-details">
          <div class="detail-row">
            <span>재직 기간</span>
            <span>${years}년 ${months}개월 (${days}일)</span>
          </div>
          <div class="detail-row">
            <span>3개월 총 급여</span>
            <span>₩${this.formatNumber(salary3m)}</span>
          </div>
          <div class="detail-row">
            <span>1일 평균임금</span>
            <span>₩${this.formatNumber(Math.round(dailyWage))}</span>
          </div>
        </div>
      </div>
    `;
  }
}

// 전역 인스턴스 생성
const legalCalculator = new LegalCalculator();
window.LegalCalculator = legalCalculator;

// 전역 함수 (HTML onclick 호환)
function showTab(tab) { legalCalculator.showTab(tab); }
function calcDelay() { legalCalculator.calcDelay(); }
function calcStamp() { legalCalculator.calcStamp(); }
function calcSeverance() { legalCalculator.calcSeverance(); }

document.addEventListener('DOMContentLoaded', () => legalCalculator.init());
