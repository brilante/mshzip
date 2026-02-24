/**
 * BMI 계산기 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BmiCalc = class BmiCalc extends ToolBase {
  constructor() {
    super('BmiCalc');
  }

  init() {
    // DOM 요소 자동 바인딩
    this.initElements({
      height: 'height',
      weight: 'weight',
      resultSection: 'resultSection',
      bmiValue: 'bmiValue',
      bmiStatus: 'bmiStatus',
      gaugeMarker: 'gaugeMarker',
      normalRange: 'normalRange',
      idealWeight: 'idealWeight',
      weightDiff: 'weightDiff'
    });

    // Enter 키로 계산
    this.onEnter(['height', 'weight'], () => this.calculate());

    console.log('[BmiCalc] 초기화 완료');
    return this;
  }

  calculate() {
    const height = parseFloat(this.elements.height.value);
    const weight = parseFloat(this.elements.weight.value);

    // 필수 값 검증
    if (!this.validateRequired({ height, weight }, '키와 체중을 모두 입력해주세요.')) {
      return;
    }

    // 범위 검증
    if (!this.validateRange(height, 50, 250, '키는 50~250cm 범위로 입력해주세요.')) {
      return;
    }

    if (!this.validateRange(weight, 20, 300, '체중은 20~300kg 범위로 입력해주세요.')) {
      return;
    }

    const heightM = height / 100;
    const bmi = weight / (heightM * heightM);
    const status = this.getBmiStatus(bmi);

    // BMI 값 표시
    this.elements.bmiValue.textContent = bmi.toFixed(1);
    this.elements.bmiValue.className = 'bmi-value ' + status.class;

    // 상태 표시
    this.elements.bmiStatus.textContent = status.text;
    this.elements.bmiStatus.className = 'bmi-status ' + status.class;

    // 게이지 마커 위치
    this.updateGaugeMarker(bmi);

    // 상세 정보 계산
    this.calculateDetails(heightM, weight, bmi);

    // 결과 섹션 표시
    this.elements.resultSection.style.display = 'block';
    this.showSuccess('BMI가 계산되었습니다.');
  }

  getBmiStatus(bmi) {
    if (bmi < 18.5) {
      return { text: '저체중', class: 'underweight', desc: '건강한 체중 증가가 필요합니다.' };
    } else if (bmi < 25) {
      return { text: '정상', class: 'normal', desc: '건강한 체중을 유지하고 있습니다.' };
    } else if (bmi < 30) {
      return { text: '과체중', class: 'overweight', desc: '체중 관리가 필요합니다.' };
    } else {
      return { text: '비만', class: 'obese', desc: '건강을 위해 체중 감량이 권장됩니다.' };
    }
  }

  updateGaugeMarker(bmi) {
    // BMI 10~40 범위를 0~100%로 매핑
    let percent = ((bmi - 10) / 30) * 100;
    percent = Math.max(0, Math.min(100, percent));
    this.elements.gaugeMarker.style.left = `${percent}%`;
  }

  calculateDetails(heightM, currentWeight, bmi) {
    // 정상 체중 범위 (BMI 18.5 ~ 24.9)
    const minNormal = 18.5 * heightM * heightM;
    const maxNormal = 24.9 * heightM * heightM;
    this.elements.normalRange.textContent = `${minNormal.toFixed(1)} ~ ${maxNormal.toFixed(1)} kg`;

    // 이상적 체중 (BMI 22 기준)
    const idealWeight = 22 * heightM * heightM;
    this.elements.idealWeight.textContent = `${idealWeight.toFixed(1)} kg`;

    // 체중 조절 필요량
    const diff = currentWeight - idealWeight;
    if (Math.abs(diff) < 0.5) {
      this.elements.weightDiff.textContent = '현재 이상적 체중입니다';
      this.elements.weightDiff.className = 'detail-value normal';
    } else if (diff > 0) {
      this.elements.weightDiff.textContent = `${diff.toFixed(1)} kg 감량 필요`;
      this.elements.weightDiff.className = 'detail-value overweight';
    } else {
      this.elements.weightDiff.textContent = `${Math.abs(diff).toFixed(1)} kg 증량 필요`;
      this.elements.weightDiff.className = 'detail-value underweight';
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const bmiCalc = new BmiCalc();
window.BmiCalc = bmiCalc;

document.addEventListener('DOMContentLoaded', () => bmiCalc.init());
