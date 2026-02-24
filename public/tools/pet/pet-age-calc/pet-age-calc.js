/**
 * 반려동물 나이 계산기 - ToolBase 기반
 * 사람 나이로 환산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PetAgeCalc = class PetAgeCalc extends ToolBase {
  constructor() {
    super('PetAgeCalc');
    this.petType = 'dog';
  }

  init() {
    this.initElements({
      petAge: 'petAge',
      dogSize: 'dogSize',
      sizeSelect: 'sizeSelect',
      humanAge: 'humanAge',
      lifeStage: 'lifeStage',
      infoText: 'infoText'
    });

    this.calculate();

    console.log('[PetAgeCalc] 초기화 완료');
    return this;
  }

  selectType(type) {
    this.petType = type;

    document.querySelectorAll('.pet-type').forEach(el => {
      el.classList.toggle('selected', el.dataset.type === type);
    });

    this.elements.sizeSelect.style.display = type === 'dog' ? 'block' : 'none';

    this.calculate();
  }

  calculate() {
    const petAge = parseFloat(this.elements.petAge.value) || 0;
    let humanAge = 0;
    let stage = '';
    let info = '';

    if (this.petType === 'dog') {
      const size = this.elements.dogSize.value;
      humanAge = this.calculateDogAge(petAge, size);
      stage = this.getDogLifeStage(petAge, size);
      info = this.getDogInfo(petAge, size);
    } else {
      humanAge = this.calculateCatAge(petAge);
      stage = this.getCatLifeStage(petAge);
      info = this.getCatInfo(petAge);
    }

    this.elements.humanAge.textContent = Math.round(humanAge);
    this.elements.lifeStage.textContent = stage;
    this.elements.infoText.textContent = info;
  }

  calculateDogAge(age, size) {
    if (age <= 0) return 0;

    // 새로운 계산법: 첫 해는 15년, 둘째 해는 9년, 이후 크기별로 다름
    let humanAge = 0;

    if (age <= 1) {
      humanAge = age * 15;
    } else if (age <= 2) {
      humanAge = 15 + (age - 1) * 9;
    } else {
      humanAge = 24; // 2살까지 24년
      const remaining = age - 2;

      switch (size) {
        case 'small':
          humanAge += remaining * 4;
          break;
        case 'medium':
          humanAge += remaining * 5;
          break;
        case 'large':
          humanAge += remaining * 6;
          break;
      }
    }

    return humanAge;
  }

  calculateCatAge(age) {
    if (age <= 0) return 0;

    // 첫 해는 15년, 둘째 해는 9년, 이후 매년 4년
    if (age <= 1) {
      return age * 15;
    } else if (age <= 2) {
      return 15 + (age - 1) * 9;
    } else {
      return 24 + (age - 2) * 4;
    }
  }

  getDogLifeStage(age, size) {
    const maxAge = size === 'small' ? 15 : size === 'medium' ? 12 : 10;

    if (age < 0.5) return '신생아기';
    if (age < 1) return '아기';
    if (age < 2) return '청소년기';
    if (age < 7) return '성년기';
    if (age < maxAge * 0.75) return '중년기';
    return '노년기';
  }

  getCatLifeStage(age) {
    if (age < 0.5) return '신생아기';
    if (age < 1) return '아기';
    if (age < 2) return '청소년기';
    if (age < 6) return '성년기';
    if (age < 10) return '중년기';
    if (age < 15) return '노년기';
    return '장수 고양이';
  }

  getDogInfo(age, size) {
    if (age < 1) {
      return '예방접종과 기본 훈련이 중요한 시기입니다. 사회화 훈련을 시작하세요.';
    } else if (age < 2) {
      return '에너지가 넘치는 시기입니다. 충분한 운동과 훈련이 필요합니다.';
    } else if (age < 7) {
      return '건강한 성인기입니다. 정기 건강검진과 균형 잡힌 식단을 유지하세요.';
    } else {
      const senior = size === 'large' ? '대형견은 7세부터' : size === 'medium' ? '중형견은 7-8세부터' : '소형견은 10세부터';
      return `${senior} 노령기에 접어듭니다. 관절 건강과 정기 검진에 더 신경 쓰세요.`;
    }
  }

  getCatInfo(age) {
    if (age < 1) {
      return '예방접종과 중성화 수술을 고려하세요. 실내 환경 적응이 중요합니다.';
    } else if (age < 2) {
      return '활동적인 청소년기입니다. 놀이와 운동으로 에너지를 발산시켜 주세요.';
    } else if (age < 6) {
      return '건강한 성인기입니다. 비만 관리와 치아 건강에 주의하세요.';
    } else if (age < 10) {
      return '중년기에 접어들었습니다. 정기 건강검진 주기를 늘리세요.';
    } else {
      return '노령기입니다. 신장, 갑상선 등의 정기 검사가 중요합니다.';
    }
  }
}

// 전역 인스턴스 생성
const petAgeCalc = new PetAgeCalc();
window.PetAgeCalc = petAgeCalc;

// 전역 함수 (HTML onclick 호환)
function selectType(type) { petAgeCalc.selectType(type); }
function calculate() { petAgeCalc.calculate(); }

document.addEventListener('DOMContentLoaded', () => petAgeCalc.init());
