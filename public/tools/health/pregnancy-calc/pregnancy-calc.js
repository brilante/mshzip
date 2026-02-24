/**
 * 임신 주수 계산기 - ToolBase 기반
 * 예정일과 현재 임신 주수 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class PregnancyCalculator extends ToolBase {
  constructor() {
    super('PregnancyCalculator');
  }

  init() {
    this.initElements({
      lmpDate: 'lmpDate',
      result: 'result'
    });

    // 기본값으로 10주 전 날짜 설정
    const date = new Date();
    date.setDate(date.getDate() - 70);
    this.elements.lmpDate.value = date.toISOString().split('T')[0];

    console.log('[PregnancyCalculator] 초기화 완료');
    return this;
  }

  calculate() {
    const lmpInput = this.elements.lmpDate.value;

    if (!lmpInput) {
      this.showToast('마지막 월경 시작일을 선택하세요.', 'error');
      return;
    }

    const lmpDate = new Date(lmpInput);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 예정일 계산 (Naegele's rule: LMP + 280일)
    const dueDate = new Date(lmpDate);
    dueDate.setDate(dueDate.getDate() + 280);

    // 임신 일수 계산
    const daysDiff = Math.floor((today - lmpDate) / (1000 * 60 * 60 * 24));

    if (daysDiff < 0) {
      this.showToast('미래 날짜는 선택할 수 없습니다.', 'error');
      return;
    }

    if (daysDiff > 300) {
      this.showToast('이미 예정일이 지났습니다.', 'info');
    }

    const weeks = Math.floor(daysDiff / 7);
    const days = daysDiff % 7;
    const progress = Math.min(100, (daysDiff / 280) * 100);

    // 임신기 판별
    let trimester = 1;
    if (weeks >= 13 && weeks < 27) trimester = 2;
    else if (weeks >= 27) trimester = 3;

    // 남은 일수
    const daysRemaining = Math.max(0, Math.floor((dueDate - today) / (1000 * 60 * 60 * 24)));

    this.renderResult(weeks, days, dueDate, progress, trimester, daysRemaining);
  }

  formatDate(date) {
    return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  renderResult(weeks, days, dueDate, progress, trimester, daysRemaining) {
    this.elements.result.innerHTML = `
      <div class="result-card">
        <div style="font-size: 0.9rem; opacity: 0.9;">현재 임신</div>
        <div class="week-display">${weeks}주 ${days}일</div>
        <div class="due-date">예정일: ${this.formatDate(dueDate)}</div>
        <div style="font-size: 0.85rem; margin-top: 0.25rem; opacity: 0.9;">
          (D-${daysRemaining})
        </div>
      </div>

      <div class="progress-section">
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
          <span>진행률</span>
          <span>${progress.toFixed(1)}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%;"></div>
        </div>
      </div>

      <div class="trimester-info">
        <div class="trimester ${trimester === 1 ? 'active' : ''}">
          <div class="trimester-name">1분기</div>
          <div class="trimester-weeks">1-12주</div>
        </div>
        <div class="trimester ${trimester === 2 ? 'active' : ''}">
          <div class="trimester-name">2분기</div>
          <div class="trimester-weeks">13-26주</div>
        </div>
        <div class="trimester ${trimester === 3 ? 'active' : ''}">
          <div class="trimester-name">3분기</div>
          <div class="trimester-weeks">27-40주</div>
        </div>
      </div>
    `;

    this.showToast(`임신 ${weeks}주 ${days}일입니다.`, 'success');
  }
}

// 전역 인스턴스 생성
const pregnancyCalc = new PregnancyCalculator();
window.PregnancyCalculator = pregnancyCalc;

document.addEventListener('DOMContentLoaded', () => pregnancyCalc.init());
