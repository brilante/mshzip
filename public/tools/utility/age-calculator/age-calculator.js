/**
 * 나이 계산기 - ToolBase 기반
 * 생년월일로 나이 및 관련 정보 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class AgeCalculator extends ToolBase {
  constructor() {
    super('AgeCalculator');
    this.chineseZodiac = ['원숭이', '닭', '개', '돼지', '쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양'];
    this.westernZodiac = [
      { sign: '염소자리', start: [1, 1], end: [1, 19] },
      { sign: '물병자리', start: [1, 20], end: [2, 18] },
      { sign: '물고기자리', start: [2, 19], end: [3, 20] },
      { sign: '양자리', start: [3, 21], end: [4, 19] },
      { sign: '황소자리', start: [4, 20], end: [5, 20] },
      { sign: '쌍둥이자리', start: [5, 21], end: [6, 20] },
      { sign: '게자리', start: [6, 21], end: [7, 22] },
      { sign: '사자자리', start: [7, 23], end: [8, 22] },
      { sign: '처녀자리', start: [8, 23], end: [9, 22] },
      { sign: '천칭자리', start: [9, 23], end: [10, 22] },
      { sign: '전갈자리', start: [10, 23], end: [11, 21] },
      { sign: '사수자리', start: [11, 22], end: [12, 21] },
      { sign: '염소자리', start: [12, 22], end: [12, 31] }
    ];
    this.dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  }

  init() {
    this.initElements({
      birthDate: 'birthDate',
      calculateBtn: 'calculateBtn',
      results: 'results',
      ageYears: 'ageYears',
      ageDetail: 'ageDetail',
      koreanAge: 'koreanAge',
      daysLived: 'daysLived',
      weeksLived: 'weeksLived',
      hoursLived: 'hoursLived',
      daysUntilBirthday: 'daysUntilBirthday',
      nextBirthday: 'nextBirthday',
      birthDay: 'birthDay',
      zodiacChinese: 'zodiacChinese',
      zodiacWestern: 'zodiacWestern'
    });

    this.elements.calculateBtn.addEventListener('click', () => this.calculate());

    console.log('[AgeCalculator] 초기화 완료');
    return this;
  }

  calculate() {
    const birthDateInput = this.elements.birthDate.value;
    if (!birthDateInput) {
      this.showToast('생년월일을 입력하세요', 'error');
      return;
    }

    const birthDate = new Date(birthDateInput);
    const today = new Date();

    // 나이 계산
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    this.elements.ageYears.textContent = years;
    this.elements.ageDetail.textContent = years + '년 ' + months + '개월 ' + days + '일';

    // 한국 나이
    const koreanAge = today.getFullYear() - birthDate.getFullYear() + 1;
    this.elements.koreanAge.textContent = koreanAge;

    // 살아온 일수, 주수, 시간
    const diffTime = today - birthDate;
    const daysLived = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const weeksLived = Math.floor(daysLived / 7);
    const hoursLived = Math.floor(diffTime / (1000 * 60 * 60));

    this.elements.daysLived.textContent = daysLived.toLocaleString();
    this.elements.weeksLived.textContent = weeksLived.toLocaleString();
    this.elements.hoursLived.textContent = hoursLived.toLocaleString();

    // 다음 생일
    let nextBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (nextBirthday <= today) {
      nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
    }
    const daysUntilBirthday = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
    this.elements.daysUntilBirthday.textContent = daysUntilBirthday;
    this.elements.nextBirthday.textContent = nextBirthday.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    // 태어난 요일
    this.elements.birthDay.textContent = this.dayNames[birthDate.getDay()];

    // 띠
    const zodiacIndex = birthDate.getFullYear() % 12;
    this.elements.zodiacChinese.textContent = this.chineseZodiac[zodiacIndex] + '띠';

    // 별자리
    const month = birthDate.getMonth() + 1;
    const day = birthDate.getDate();
    for (const z of this.westernZodiac) {
      if ((month === z.start[0] && day >= z.start[1]) || (month === z.end[0] && day <= z.end[1])) {
        this.elements.zodiacWestern.textContent = z.sign;
        break;
      }
    }

    this.elements.results.style.display = 'block';
  }
}

// 전역 인스턴스 생성
const ageCalculator = new AgeCalculator();
window.AgeCalculator = ageCalculator;

document.addEventListener('DOMContentLoaded', () => ageCalculator.init());
