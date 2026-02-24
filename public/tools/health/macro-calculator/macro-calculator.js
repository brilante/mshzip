/**
 * 매크로 계산기 - ToolBase 기반
 * 일일 칼로리 및 영양소 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class MacroCalculator extends ToolBase {
  constructor() {
    super('MacroCalculator');
    this.gender = 'male';
  }

  init() {
    this.initElements({
      age: 'age',
      height: 'height',
      weight: 'weight',
      activity: 'activity',
      goal: 'goal',
      result: 'result'
    });

    this.setupEvents();

    console.log('[MacroCalculator] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.gender-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setGender(btn.dataset.gender));
    });
  }

  setGender(gender) {
    this.gender = gender;
    document.querySelectorAll('.gender-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.gender === gender);
    });
  }

  calculate() {
    const age = parseInt(this.elements.age.value);
    const height = parseFloat(this.elements.height.value);
    const weight = parseFloat(this.elements.weight.value);
    const activity = parseFloat(this.elements.activity.value);
    const goal = parseInt(this.elements.goal.value);

    if (!age || !height || !weight) {
      this.showToast('모든 값을 입력하세요.', 'error');
      return;
    }

    // BMR 계산 (Mifflin-St Jeor 공식)
    let bmr;
    if (this.gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // TDEE (총 일일 에너지 소비량)
    const tdee = Math.round(bmr * activity);

    // 목표 칼로리
    const targetCalories = tdee + goal;

    // 매크로 비율 (단백질 30%, 탄수화물 40%, 지방 30%)
    const proteinRatio = 0.30;
    const carbsRatio = 0.40;
    const fatRatio = 0.30;

    const protein = Math.round((targetCalories * proteinRatio) / 4); // 4 kcal/g
    const carbs = Math.round((targetCalories * carbsRatio) / 4); // 4 kcal/g
    const fat = Math.round((targetCalories * fatRatio) / 9); // 9 kcal/g

    this.renderResult(targetCalories, protein, carbs, fat, bmr, tdee);
  }

  renderResult(calories, protein, carbs, fat, bmr, tdee) {
    this.elements.result.innerHTML = `
      <div class="calorie-card">
        <div style="font-size: 0.9rem; opacity: 0.9;">일일 목표 칼로리</div>
        <div class="calorie-value">${calories.toLocaleString()}</div>
        <div style="font-size: 0.85rem; opacity: 0.9;">kcal</div>
      </div>

      <div class="macro-grid">
        <div class="macro-card">
          <div class="macro-value protein">${protein}g</div>
          <div class="macro-label">단백질</div>
          <div class="macro-percent">30% · ${protein * 4} kcal</div>
        </div>
        <div class="macro-card">
          <div class="macro-value carbs">${carbs}g</div>
          <div class="macro-label">탄수화물</div>
          <div class="macro-percent">40% · ${carbs * 4} kcal</div>
        </div>
        <div class="macro-card">
          <div class="macro-value fat">${fat}g</div>
          <div class="macro-label">지방</div>
          <div class="macro-percent">30% · ${fat * 9} kcal</div>
        </div>
      </div>

      <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-primary); border-radius: 8px; font-size: 0.85rem; color: var(--text-secondary);">
        <div>기초대사량 (BMR): ${Math.round(bmr).toLocaleString()} kcal</div>
        <div>총에너지소비량 (TDEE): ${tdee.toLocaleString()} kcal</div>
      </div>
    `;

    this.showToast(`일일 ${calories.toLocaleString()} kcal 권장`, 'success');
  }
}

// 전역 인스턴스 생성
const macroCalc = new MacroCalculator();
window.MacroCalculator = macroCalc;

document.addEventListener('DOMContentLoaded', () => macroCalc.init());
