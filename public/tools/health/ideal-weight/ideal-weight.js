/**
 * 이상 체중 계산기 - ToolBase 기반
 * 다양한 공식으로 이상 체중 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class IdealWeightCalculator extends ToolBase {
  constructor() {
    super('IdealWeightCalculator');
    this.gender = 'male';
  }

  init() {
    this.initElements({
      height: 'height',
      result: 'result'
    });

    this.setupEvents();

    console.log('[IdealWeightCalculator] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.gender-tab').forEach(tab => {
      tab.addEventListener('click', () => this.setGender(tab.dataset.gender));
    });
  }

  setGender(gender) {
    this.gender = gender;
    document.querySelectorAll('.gender-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.gender === gender);
    });
    this.elements.result.innerHTML = '';
  }

  calculate() {
    const height = parseFloat(this.elements.height.value);

    if (!height || height < 100 || height > 250) {
      this.showToast('올바른 키를 입력하세요.', 'error');
      return;
    }

    const heightInches = height / 2.54;
    const heightOver5Feet = heightInches - 60;

    let robinson, miller, devine, hamwi;

    if (this.gender === 'male') {
      robinson = 52 + 1.9 * heightOver5Feet;
      miller = 56.2 + 1.41 * heightOver5Feet;
      devine = 50 + 2.3 * heightOver5Feet;
      hamwi = 48 + 2.7 * heightOver5Feet;
    } else {
      robinson = 49 + 1.7 * heightOver5Feet;
      miller = 53.1 + 1.36 * heightOver5Feet;
      devine = 45.5 + 2.3 * heightOver5Feet;
      hamwi = 45.5 + 2.2 * heightOver5Feet;
    }

    // BMI 기반 (BMI 22)
    const heightM = height / 100;
    const bmi22 = 22 * heightM * heightM;

    const results = [
      { name: 'Robinson (1983)', value: robinson },
      { name: 'Miller (1983)', value: miller },
      { name: 'Devine (1974)', value: devine },
      { name: 'Hamwi (1964)', value: hamwi },
      { name: 'BMI 22 기준', value: bmi22 }
    ];

    const average = results.reduce((sum, r) => sum + r.value, 0) / results.length;
    const min = Math.min(...results.map(r => r.value));
    const max = Math.max(...results.map(r => r.value));

    this.renderResult(results, average, min, max);
  }

  renderResult(results, average, min, max) {
    this.elements.result.innerHTML = `
      <div class="avg-card">
        <div style="font-size: 0.9rem; opacity: 0.9;">평균 이상 체중</div>
        <div class="avg-value">${average.toFixed(1)} kg</div>
        <div style="font-size: 0.85rem; opacity: 0.9;">범위: ${min.toFixed(1)} - ${max.toFixed(1)} kg</div>
      </div>

      ${results.map(r => `
        <div class="formula-card">
          <div class="formula-name">${r.name}</div>
          <div class="formula-value">${r.value.toFixed(1)} kg</div>
        </div>
      `).join('')}
    `;

    this.showToast(`평균 이상 체중: ${average.toFixed(1)}kg`, 'success');
  }
}

// 전역 인스턴스 생성
const idealWeight = new IdealWeightCalculator();
window.IdealWeightCalculator = idealWeight;

document.addEventListener('DOMContentLoaded', () => idealWeight.init());
