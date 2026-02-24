/**
 * 날짜 차이 계산기 - ToolBase 기반
 * 두 날짜 사이의 차이를 다양한 단위로 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var DateDiff = class DateDiff extends ToolBase {
  constructor() {
    super('DateDiff');
  }

  init() {
    this.initElements({
      startDate: 'startDate',
      endDate: 'endDate',
      resultSection: 'resultSection',
      resultDays: 'resultDays',
      resultYears: 'resultYears',
      resultMonths: 'resultMonths',
      resultWeeks: 'resultWeeks',
      resultHours: 'resultHours',
      resultMinutes: 'resultMinutes',
      resultSeconds: 'resultSeconds'
    });

    // 기본값: 오늘
    const today = new Date().toISOString().split('T')[0];
    this.elements.startDate.value = today;
    this.elements.endDate.value = today;

    console.log('[DateDiff] 초기화 완료');
    return this;
  }

  calculate() {
    const startInput = this.elements.startDate.value;
    const endInput = this.elements.endDate.value;

    if (!startInput || !endInput) {
      this.elements.resultSection.style.display = 'none';
      return;
    }

    const start = new Date(startInput);
    const end = new Date(endInput);

    // 밀리초 차이
    let diffMs = Math.abs(end - start);

    // 각 단위로 변환
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);

    // 년/월 계산 (대략적)
    const diffMonths = this.getMonthDiff(start, end);
    const diffYears = Math.floor(diffMonths / 12);

    // 결과 표시
    this.elements.resultDays.textContent = diffDays.toLocaleString();
    this.elements.resultYears.textContent = diffYears.toLocaleString();
    this.elements.resultMonths.textContent = diffMonths.toLocaleString();
    this.elements.resultWeeks.textContent = diffWeeks.toLocaleString();
    this.elements.resultHours.textContent = diffHours.toLocaleString();
    this.elements.resultMinutes.textContent = diffMinutes.toLocaleString();
    this.elements.resultSeconds.textContent = diffSeconds.toLocaleString();

    this.elements.resultSection.style.display = 'block';
  }

  getMonthDiff(start, end) {
    const [earlier, later] = start < end ? [start, end] : [end, start];
    let months = (later.getFullYear() - earlier.getFullYear()) * 12;
    months += later.getMonth() - earlier.getMonth();
    if (later.getDate() < earlier.getDate()) {
      months--;
    }
    return Math.max(0, months);
  }

  setQuick(type) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    switch (type) {
      case 'today':
        this.elements.startDate.value = todayStr;
        this.elements.endDate.value = todayStr;
        break;

      case 'birthday':
        // 올해 또는 내년 생일 (임시로 다음 달 같은 날)
        const birthday = new Date(today);
        birthday.setMonth(birthday.getMonth() + 1);
        this.elements.startDate.value = todayStr;
        this.elements.endDate.value = birthday.toISOString().split('T')[0];
        this.showToast('종료 날짜를 생일로 변경하세요.', 'info');
        break;

      case 'newyear':
        const nextYear = new Date(today.getFullYear() + 1, 0, 1);
        this.elements.startDate.value = todayStr;
        this.elements.endDate.value = nextYear.toISOString().split('T')[0];
        break;

      case 'christmas':
        let christmas = new Date(today.getFullYear(), 11, 25);
        if (christmas < today) {
          christmas = new Date(today.getFullYear() + 1, 11, 25);
        }
        this.elements.startDate.value = todayStr;
        this.elements.endDate.value = christmas.toISOString().split('T')[0];
        break;
    }

    this.calculate();
  }

  swap() {
    const temp = this.elements.startDate.value;
    this.elements.startDate.value = this.elements.endDate.value;
    this.elements.endDate.value = temp;
    this.calculate();
    this.showToast('날짜가 교환되었습니다.', 'info');
  }

  reset() {
    const today = new Date().toISOString().split('T')[0];
    this.elements.startDate.value = today;
    this.elements.endDate.value = today;
    this.elements.resultSection.style.display = 'none';
    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const dateDiff = new DateDiff();
window.DateDiff = dateDiff;

document.addEventListener('DOMContentLoaded', () => dateDiff.init());
