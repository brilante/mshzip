/**
 * 칼로리 계산기 (Calorie Calculator) - ToolBase 기반
 * BMR, TDEE 및 목표별 칼로리 계산
 * Mifflin-St Jeor 공식 사용
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CalorieCalc = class CalorieCalc extends ToolBase {
  constructor() {
    super('CalorieCalc');
  }

  init() {
    this.initElements({
      age: 'age',
      height: 'height',
      weight: 'weight',
      activity: 'activity',
      resultSection: 'resultSection',
      bmrValue: 'bmrValue',
      tdeeValue: 'tdeeValue',
      lossExtreme: 'lossExtreme',
      lossModerate: 'lossModerate',
      maintain: 'maintain',
      gainModerate: 'gainModerate',
      gainExtreme: 'gainExtreme',
      proteinGram: 'proteinGram',
      carbGram: 'carbGram',
      fatGram: 'fatGram'
    });

    // Enter 키 지원
    this.onEnter(['age', 'height', 'weight'], () => this.calculate());

    console.log('[CalorieCalc] 초기화 완료');
    return this;
  }

  calculate() {
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const age = parseFloat(this.elements.age.value);
    const height = parseFloat(this.elements.height.value);
    const weight = parseFloat(this.elements.weight.value);
    const activity = parseFloat(this.elements.activity.value);

    // 입력 검증
    if (!this.validateRequired({ age, height, weight }, '나이, 키, 체중을 모두 입력해주세요.')) {
      return;
    }

    if (!this.validateRange(age, 10, 100, '나이는 10~100세 사이로 입력해주세요.')) {
      return;
    }

    // BMR 계산 (Mifflin-St Jeor 공식)
    let bmr;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // TDEE 계산
    const tdee = bmr * activity;

    // 목표별 칼로리
    const lossExtreme = Math.max(tdee - 1000, 1200); // 최소 1200 kcal
    const lossModerate = Math.max(tdee - 500, 1200);
    const maintain = tdee;
    const gainModerate = tdee + 250;
    const gainExtreme = tdee + 500;

    // 영양소 계산 (체중 유지 기준)
    const proteinCal = maintain * 0.30;
    const carbCal = maintain * 0.45;
    const fatCal = maintain * 0.25;

    const proteinGram = proteinCal / 4; // 단백질 1g = 4 kcal
    const carbGram = carbCal / 4;       // 탄수화물 1g = 4 kcal
    const fatGram = fatCal / 9;         // 지방 1g = 9 kcal

    // 결과 표시
    this.elements.bmrValue.textContent = Math.round(bmr).toLocaleString();
    this.elements.tdeeValue.textContent = Math.round(tdee).toLocaleString();

    this.elements.lossExtreme.textContent = Math.round(lossExtreme).toLocaleString();
    this.elements.lossModerate.textContent = Math.round(lossModerate).toLocaleString();
    this.elements.maintain.textContent = Math.round(maintain).toLocaleString();
    this.elements.gainModerate.textContent = Math.round(gainModerate).toLocaleString();
    this.elements.gainExtreme.textContent = Math.round(gainExtreme).toLocaleString();

    this.elements.proteinGram.textContent = `${Math.round(proteinGram)}g`;
    this.elements.carbGram.textContent = `${Math.round(carbGram)}g`;
    this.elements.fatGram.textContent = `${Math.round(fatGram)}g`;

    this.elements.resultSection.style.display = 'block';
    this.elements.resultSection.scrollIntoView({ behavior: 'smooth' });

    this.showSuccess('칼로리가 계산되었습니다.');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const calorieCalc = new CalorieCalc();
window.CalorieCalc = calorieCalc;

document.addEventListener('DOMContentLoaded', () => calorieCalc.init());
