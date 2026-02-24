/**
 * BMI 계산기 - ToolBase 기반
 * 체질량지수 계산 및 건강 상태 분석
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class BMICalculator extends ToolBase {
  constructor() {
    super('BMICalculator');
  }

  init() {
    this.initElements({
      height: 'height',
      weight: 'weight',
      calculateBtn: 'calculateBtn',
      bmiValue: 'bmiValue',
      bmiCategory: 'bmiCategory',
      barMarker: 'barMarker',
      infoBox: 'infoBox',
      result: 'result'
    });

    this.setupEvents();

    console.log('[BMICalculator] 초기화 완료');
    return this;
  }

  setupEvents() {
    this.elements.calculateBtn.addEventListener('click', () => this.calculate());
  }

  calculate() {
    const height = parseFloat(this.elements.height.value);
    const weight = parseFloat(this.elements.weight.value);

    if (!height || !weight) {
      this.showToast('키와 체중을 입력하세요', 'error');
      return;
    }

    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    const bmiRounded = Math.round(bmi * 10) / 10;

    this.elements.bmiValue.textContent = bmiRounded;

    let category, color, position, advice;

    if (bmi < 18.5) {
      category = '저체중';
      color = '#74b9ff';
      position = (bmi / 18.5) * 25;
      advice = '건강한 체중 증가를 위해 영양가 있는 식사를 권장합니다.';
    } else if (bmi < 23) {
      category = '정상';
      color = '#00b894';
      position = 25 + ((bmi - 18.5) / 4.5) * 25;
      advice = '현재 체중을 유지하며 규칙적인 운동을 권장합니다.';
    } else if (bmi < 25) {
      category = '과체중';
      color = '#fdcb6e';
      position = 50 + ((bmi - 23) / 2) * 25;
      advice = '식이요법과 운동으로 체중 관리를 시작하세요.';
    } else {
      category = '비만';
      color = '#e17055';
      position = Math.min(75 + ((bmi - 25) / 10) * 25, 100);
      advice = '건강을 위해 전문가 상담과 체중 감량을 권장합니다.';
    }

    this.elements.bmiCategory.textContent = category;
    this.elements.bmiCategory.style.color = color;
    this.elements.barMarker.style.left = position + '%';

    const idealWeightMin = (18.5 * heightM * heightM).toFixed(1);
    const idealWeightMax = (22.9 * heightM * heightM).toFixed(1);

    this.elements.infoBox.innerHTML = `
      <p><strong>분류:</strong> ${category}</p>
      <p><strong>권장 체중:</strong> ${idealWeightMin}kg ~ ${idealWeightMax}kg</p>
      <p><strong>조언:</strong> ${advice}</p>
    `;

    this.elements.result.style.display = 'block';
    this.showToast(`BMI: ${bmiRounded} (${category})`, 'success');
  }
}

// 전역 인스턴스 생성
const bmiCalc = new BMICalculator();
window.BMICalculator = bmiCalc;

document.addEventListener('DOMContentLoaded', () => bmiCalc.init());
