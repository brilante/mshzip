/**
 * 나이 계산기 - ToolBase 기반
 * 생년월일로 정확한 나이 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var AgeCalc = class AgeCalc extends ToolBase {
  constructor() {
    super('AgeCalc');
  }

  init() {
    // DOM 요소 자동 바인딩
    this.initElements({
      birthDate: 'birthDate',
      targetDate: 'targetDate',
      resultSection: 'resultSection',
      ageMain: 'ageMain',
      koreanAge: 'koreanAge',
      totalYears: 'totalYears',
      totalMonths: 'totalMonths',
      totalDays: 'totalDays',
      totalWeeks: 'totalWeeks',
      totalHours: 'totalHours',
      nextBirthday: 'nextBirthday',
      zodiacAnimal: 'zodiacAnimal',
      zodiacSign: 'zodiacSign',
      milestoneList: 'milestoneList'
    });

    // 기준일 기본값: 오늘
    this.setToday();

    console.log('[AgeCalc] 초기화 완료');
    return this;
  }

  /**
   * 오늘 날짜로 설정
   */
  setToday() {
    const today = new Date().toISOString().split('T')[0];
    this.elements.targetDate.value = today;
    if (this.elements.birthDate.value) {
      this.calculate();
    }
  }

  /**
   * 나이 계산
   */
  calculate() {
    const birthDateStr = this.elements.birthDate.value;
    const targetDateStr = this.elements.targetDate.value || new Date().toISOString().split('T')[0];

    if (!birthDateStr) {
      this.showWarning('생년월일을 입력하세요.');
      return;
    }

    const birthDate = new Date(birthDateStr);
    const targetDate = new Date(targetDateStr);

    if (birthDate > targetDate) {
      this.showError('생년월일이 기준일보다 미래입니다.');
      return;
    }

    // 결과 섹션 표시
    this.elements.resultSection.style.display = 'block';

    // 만 나이 계산
    const age = this.calculateAge(birthDate, targetDate);
    this.elements.ageMain.textContent = age.years + '세';

    // 한국 나이 (연 나이)
    const koreanAge = targetDate.getFullYear() - birthDate.getFullYear() + 1;
    this.elements.koreanAge.textContent = `한국 나이: ${koreanAge}세`;

    // 상세 정보
    this.elements.totalYears.textContent = age.years;
    this.elements.totalMonths.textContent = age.totalMonths.toLocaleString();
    this.elements.totalDays.textContent = age.totalDays.toLocaleString();
    this.elements.totalWeeks.textContent = Math.floor(age.totalDays / 7).toLocaleString();
    this.elements.totalHours.textContent = (age.totalDays * 24).toLocaleString();

    // 다음 생일까지
    const nextBirthday = this.getNextBirthday(birthDate, targetDate);
    this.elements.nextBirthday.textContent = nextBirthday.days + '일';

    // 띠 & 별자리
    this.elements.zodiacAnimal.textContent = this.getZodiacAnimal(birthDate.getFullYear());
    this.elements.zodiacSign.textContent = this.getZodiacSign(birthDate.getMonth() + 1, birthDate.getDate());

    // 인생 이정표
    this.renderMilestones(birthDate, targetDate);

    this.showSuccess('계산 완료!');
  }

  /**
   * 만 나이 계산
   */
  calculateAge(birthDate, targetDate) {
    let years = targetDate.getFullYear() - birthDate.getFullYear();
    let months = targetDate.getMonth() - birthDate.getMonth();
    let days = targetDate.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0);
      days += prevMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    // 총 계산
    const diffTime = Math.abs(targetDate - birthDate);
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalMonths = years * 12 + months;

    return {
      years,
      months,
      days,
      totalDays,
      totalMonths
    };
  }

  /**
   * 다음 생일까지 남은 일수
   */
  getNextBirthday(birthDate, targetDate) {
    const thisYearBirthday = new Date(targetDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());

    let nextBirthday;
    if (thisYearBirthday <= targetDate) {
      nextBirthday = new Date(targetDate.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
    } else {
      nextBirthday = thisYearBirthday;
    }

    const diffTime = nextBirthday - targetDate;
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return { days, date: nextBirthday };
  }

  /**
   * 띠 계산 (12간지)
   */
  getZodiacAnimal(year) {
    const animals = ['쥐', '소', '호랑이', '토끼', '용', '뱀',
                     '말', '양', '원숭이', '닭', '개', '돼지'];
    return animals[(year - 4) % 12];
  }

  /**
   * 별자리 계산
   */
  getZodiacSign(month, day) {
    const signs = [
      { name: '염소자리', end: [1, 19] },
      { name: '물병자리', end: [2, 18] },
      { name: '물고기자리', end: [3, 20] },
      { name: '양자리', end: [4, 19] },
      { name: '황소자리', end: [5, 20] },
      { name: '쌍둥이자리', end: [6, 21] },
      { name: '게자리', end: [7, 22] },
      { name: '사자자리', end: [8, 22] },
      { name: '처녀자리', end: [9, 22] },
      { name: '천칭자리', end: [10, 23] },
      { name: '전갈자리', end: [11, 22] },
      { name: '사수자리', end: [12, 21] },
      { name: '염소자리', end: [12, 31] }
    ];

    for (const sign of signs) {
      if (month < sign.end[0] || (month === sign.end[0] && day <= sign.end[1])) {
        return sign.name;
      }
    }
    return '염소자리';
  }

  /**
   * 인생 이정표 렌더링
   */
  renderMilestones(birthDate, targetDate) {
    const milestones = [
      { age: 1, icon: '', title: '돌잔치' },
      { age: 7, icon: '', title: '초등학교 입학' },
      { age: 13, icon: '', title: '중학교 입학' },
      { age: 16, icon: '', title: '고등학교 입학' },
      { age: 19, icon: '', title: '대학교 입학 / 성인' },
      { age: 20, icon: '', title: '투표권 획득' },
      { age: 30, icon: '', title: '서른 (이립)' },
      { age: 40, icon: '', title: '마흔 (불혹)' },
      { age: 50, icon: '', title: '쉰 (지천명)' },
      { age: 60, icon: '', title: '환갑' },
      { age: 65, icon: '', title: '정년퇴직 (법정)' },
      { age: 70, icon: '', title: '칠순 (고희)' },
      { age: 80, icon: '', title: '팔순 (산수)' },
      { age: 90, icon: '', title: '구순 (졸수)' },
      { age: 100, icon: '', title: '백수' }
    ];

    this.elements.milestoneList.innerHTML = '';

    milestones.forEach(m => {
      const milestoneDate = new Date(birthDate.getFullYear() + m.age, birthDate.getMonth(), birthDate.getDate());
      const isPassed = milestoneDate <= targetDate;

      const dateStr = `${milestoneDate.getFullYear()}년 ${milestoneDate.getMonth() + 1}월 ${milestoneDate.getDate()}일`;

      this.elements.milestoneList.innerHTML += `
        <div class="milestone-item">
          <div class="milestone-icon">${m.icon}</div>
          <div class="milestone-info">
            <div class="milestone-title">${m.age}세 - ${m.title}</div>
            <div class="milestone-date">${dateStr}</div>
          </div>
          <span class="milestone-status ${isPassed ? 'milestone-passed' : 'milestone-upcoming'}">
            ${isPassed ? '완료' : '예정'}
          </span>
        </div>
      `;
    });
  }

  /**
   * 초기화
   */
  clear() {
    this.elements.birthDate.value = '';
    this.setToday();
    this.elements.resultSection.style.display = 'none';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const ageCalc = new AgeCalc();
window.AgeCalc = ageCalc;

document.addEventListener('DOMContentLoaded', () => ageCalc.init());

console.log('[AgeCalc] 모듈 로드 완료');
