/**
 * 출산 예정일 계산기 - ToolBase 기반
 * 임신 주수 및 출산일 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var DueDate = class DueDate extends ToolBase {
  constructor() {
    super('DueDate');
    this.mode = 'lmp';

    this.babySizes = {
      4: '양귀비씨', 5: '참깨', 6: '렌틸콩', 7: '블루베리',
      8: '라즈베리', 9: '올리브', 10: '프룬', 11: '라임',
      12: '자두', 13: '복숭아', 14: '레몬', 15: '사과',
      16: '아보카도', 17: '순무', 18: '고구마', 19: '망고',
      20: '바나나', 21: '당근', 22: '파파야', 23: '자몽',
      24: '옥수수', 25: '호박', 26: '가지', 27: '콜리플라워',
      28: '코코넛', 29: '버터넛호박', 30: '양배추', 31: '야자',
      32: '청경채', 33: '파인애플', 34: '멜론', 35: '벌집멜론',
      36: '로메인상추', 37: '근대', 38: '리크', 39: '수박', 40: '호박'
    };
  }

  init() {
    this.initElements({
      lmpDate: 'lmpDate',
      conceptionDate: 'conceptionDate',
      cycleLength: 'cycleLength',
      lmpMode: 'lmpMode',
      conceptionMode: 'conceptionMode',
      dueDate: 'dueDate',
      weeksPregnant: 'weeksPregnant',
      daysLeft: 'daysLeft',
      daysPassed: 'daysPassed',
      conceptionEst: 'conceptionEst',
      babySize: 'babySize',
      progressPercent: 'progressPercent',
      progressFill: 'progressFill',
      tri1: 'tri1',
      tri2: 'tri2',
      tri3: 'tri3'
    });

    // 기본 날짜 설정 (오늘로부터 약 10주 전)
    const today = new Date();
    const defaultLmp = new Date(today.getTime() - 70 * 24 * 60 * 60 * 1000);
    this.elements.lmpDate.value = defaultLmp.toISOString().split('T')[0];
    this.calculate();

    console.log('[DueDate] 초기화 완료');
    return this;
  }

  setMode(mode) {
    this.mode = mode;
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    this.elements.lmpMode.style.display = mode === 'lmp' ? 'block' : 'none';
    this.elements.conceptionMode.style.display = mode === 'conception' ? 'block' : 'none';
    this.calculate();
  }

  calculate() {
    let lmpDate;
    const cycleLength = parseInt(this.elements.cycleLength.value) || 28;

    if (this.mode === 'lmp') {
      const lmpInput = this.elements.lmpDate.value;
      if (!lmpInput) return;
      lmpDate = new Date(lmpInput);
    } else {
      const conceptionInput = this.elements.conceptionDate.value;
      if (!conceptionInput) return;
      const conception = new Date(conceptionInput);
      // 수정일로부터 LMP 역산 (수정은 보통 LMP + 14일)
      lmpDate = new Date(conception.getTime() - 14 * 24 * 60 * 60 * 1000);
    }

    // 주기 보정 (28일 기준)
    const cycleDiff = cycleLength - 28;

    // 출산 예정일: LMP + 280일 + 주기 보정
    const dueDate = new Date(lmpDate.getTime() + (280 + cycleDiff) * 24 * 60 * 60 * 1000);

    // 수정 추정일: LMP + 14일 + 주기 보정
    const conceptionDate = new Date(lmpDate.getTime() + (14 + cycleDiff) * 24 * 60 * 60 * 1000);

    // 현재 임신 주수 계산
    const today = new Date();
    const daysPassed = Math.floor((today - lmpDate) / (24 * 60 * 60 * 1000));
    const weeksPregnant = Math.floor(daysPassed / 7);
    const daysExtra = daysPassed % 7;

    const daysLeft = Math.max(0, Math.ceil((dueDate - today) / (24 * 60 * 60 * 1000)));
    const progress = Math.min(100, (daysPassed / 280) * 100);

    // 결과 표시
    this.elements.dueDate.textContent = this.formatDate(dueDate);
    this.elements.weeksPregnant.textContent = `임신 ${weeksPregnant}주 ${daysExtra}일`;
    this.elements.daysLeft.textContent = daysLeft + '일';
    this.elements.daysPassed.textContent = daysPassed + '일';
    this.elements.conceptionEst.textContent = this.formatDateShort(conceptionDate);

    // 아기 크기
    const babySize = this.babySizes[weeksPregnant] || '-';
    this.elements.babySize.textContent = babySize;

    // 진행률
    this.elements.progressPercent.textContent = progress.toFixed(1) + '%';
    this.elements.progressFill.style.width = progress + '%';

    // 분기 표시
    this.elements.tri1.classList.toggle('active', weeksPregnant >= 1 && weeksPregnant <= 12);
    this.elements.tri2.classList.toggle('active', weeksPregnant >= 13 && weeksPregnant <= 27);
    this.elements.tri3.classList.toggle('active', weeksPregnant >= 28);
  }

  formatDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    return `${year}년 ${month}월 ${day}일 (${weekday})`;
  }

  formatDateShort(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  }
}

// 전역 인스턴스 생성
const dueDate = new DueDate();
window.DueDate = dueDate;

// 전역 함수 (HTML onclick 호환)
function setMode(mode) { dueDate.setMode(mode); }
function calculate() { dueDate.calculate(); }

document.addEventListener('DOMContentLoaded', () => dueDate.init());
