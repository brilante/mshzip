/**
 * 반려동물 사료량 계산기 - ToolBase 기반
 * 1일 적정 사료량 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PetFoodCalc = class PetFoodCalc extends ToolBase {
  constructor() {
    super('PetFoodCalc');
    this.activity = 'normal';
  }

  init() {
    this.initElements({
      petType: 'petType',
      weight: 'weight',
      ageGroup: 'ageGroup',
      condition: 'condition',
      dailyAmount: 'dailyAmount',
      kcalNeed: 'kcalNeed',
      mealAmount: 'mealAmount',
      mealsPerDay: 'mealsPerDay',
      tipText: 'tipText'
    });

    this.calculate();

    console.log('[PetFoodCalc] 초기화 완료');
    return this;
  }

  setActivity(level) {
    this.activity = level;

    document.querySelectorAll('.activity-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.level === level);
    });

    this.calculate();
  }

  calculate() {
    const petType = this.elements.petType.value;
    const weight = parseFloat(this.elements.weight.value) || 0;
    const ageGroup = this.elements.ageGroup.value;
    const condition = this.elements.condition.value;

    if (weight <= 0) {
      this.elements.dailyAmount.textContent = '-';
      return;
    }

    // 기초 대사량 계산 (RER: Resting Energy Requirement)
    // RER = 70 × (체중kg)^0.75
    const rer = 70 * Math.pow(weight, 0.75);

    // 일일 에너지 요구량 (DER) 계수
    let derMultiplier = 1.0;

    // 나이별 계수
    if (ageGroup === 'puppy') {
      derMultiplier = petType === 'dog' ? 2.5 : 2.5;
    } else if (ageGroup === 'adult') {
      derMultiplier = petType === 'dog' ? 1.6 : 1.4;
    } else {
      derMultiplier = petType === 'dog' ? 1.4 : 1.2;
    }

    // 상태별 조정
    switch (condition) {
      case 'neutered':
        derMultiplier *= 0.8;
        break;
      case 'overweight':
        derMultiplier *= 0.7;
        break;
      case 'pregnant':
        derMultiplier *= 1.5;
        break;
    }

    // 활동량별 조정
    switch (this.activity) {
      case 'low':
        derMultiplier *= 0.85;
        break;
      case 'high':
        derMultiplier *= 1.2;
        break;
    }

    const dailyKcal = Math.round(rer * derMultiplier);

    // 사료량 계산 (평균 사료 칼로리: 350kcal/100g 기준)
    const kcalPer100g = 350;
    const dailyGrams = Math.round((dailyKcal / kcalPer100g) * 100);

    // 급여 횟수
    let mealsPerDay = 2;
    if (ageGroup === 'puppy') mealsPerDay = 3;
    if (petType === 'cat' && ageGroup === 'adult') mealsPerDay = 2;

    const mealAmount = Math.round(dailyGrams / mealsPerDay);

    this.elements.dailyAmount.textContent = dailyGrams;
    this.elements.kcalNeed.textContent = dailyKcal;
    this.elements.mealAmount.textContent = mealAmount;
    this.elements.mealsPerDay.textContent = mealsPerDay;

    this.updateTip(petType, ageGroup, condition);
  }

  updateTip(petType, ageGroup, condition) {
    let tip = '';

    if (ageGroup === 'puppy') {
      tip = '성장기에는 양질의 단백질이 풍부한 퍼피용 사료를 급여하세요. 하루 3-4회 나눠서 급여하는 것이 좋습니다.';
    } else if (ageGroup === 'senior') {
      tip = '노령기에는 소화가 잘 되는 시니어용 사료를 선택하세요. 관절 건강을 위한 글루코사민이 포함된 제품을 권장합니다.';
    } else if (condition === 'overweight') {
      tip = '체중 감량이 필요합니다. 저칼로리 사료로 변경하고, 간식을 줄이세요. 운동량을 점진적으로 늘려주세요.';
    } else if (condition === 'pregnant') {
      tip = '임신/수유 중에는 고칼로리, 고단백 사료가 필요합니다. 수유 후기에는 평소의 2배까지 급여량이 필요할 수 있습니다.';
    } else if (condition === 'neutered') {
      tip = '중성화 후에는 대사량이 감소합니다. 비만 예방을 위해 급여량을 20% 정도 줄이거나 중성화용 사료를 선택하세요.';
    } else {
      tip = petType === 'dog'
        ? '항상 신선한 물을 함께 제공하세요. 사료 변경 시 7-10일에 걸쳐 서서히 변경하세요.'
        : '고양이는 여러 번 나눠 먹는 습성이 있어요. 자율 급식보다는 정량 급여를 권장합니다.';
    }

    this.elements.tipText.textContent = tip;
  }
}

// 전역 인스턴스 생성
const petFoodCalc = new PetFoodCalc();
window.PetFoodCalc = petFoodCalc;

// 전역 함수 (HTML onclick 호환)
function setActivity(level) { petFoodCalc.setActivity(level); }
function calculate() { petFoodCalc.calculate(); }

document.addEventListener('DOMContentLoaded', () => petFoodCalc.init());
