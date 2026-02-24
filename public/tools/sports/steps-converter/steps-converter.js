/**
 * 걸음 수 변환기 - ToolBase 기반
 * 걸음 → 거리/칼로리 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var StepsConverter = class StepsConverter extends ToolBase {
  constructor() {
    super('StepsConverter');
  }

  init() {
    this.initElements({
      steps: 'steps',
      height: 'height',
      weight: 'weight',
      goalSteps: 'goalSteps',
      distanceKm: 'distanceKm',
      distanceMi: 'distanceMi',
      calories: 'calories',
      walkTime: 'walkTime',
      goalProgress: 'goalProgress',
      currentSteps: 'currentSteps'
    });

    this.loadSettings();
    this.calculate();

    console.log('[StepsConverter] 초기화 완료');
    return this;
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('steps-converter-settings');
      if (saved) {
        const data = JSON.parse(saved);
        this.elements.height.value = data.height || 170;
        this.elements.weight.value = data.weight || 70;
        this.elements.goalSteps.value = data.goal || 10000;
      }
    } catch (e) {}
  }

  saveSettings() {
    const data = {
      height: this.elements.height.value,
      weight: this.elements.weight.value,
      goal: this.elements.goalSteps.value
    };
    localStorage.setItem('steps-converter-settings', JSON.stringify(data));
  }

  setSteps(steps) {
    this.elements.steps.value = steps;
    this.calculate();
  }

  calculate() {
    const steps = parseInt(this.elements.steps.value) || 0;
    const height = parseInt(this.elements.height.value) || 170;
    const weight = parseInt(this.elements.weight.value) || 70;
    const goalSteps = parseInt(this.elements.goalSteps.value) || 10000;

    this.saveSettings();

    // 보폭 계산 (키의 약 40%)
    const strideLength = height * 0.4 / 100; // 미터 단위

    // 거리 계산
    const distanceKm = (steps * strideLength) / 1000;
    const distanceMi = distanceKm / 1.60934;

    // 칼로리 계산 (MET 기반 추정)
    // 걷기: 약 3.5 MET, 칼로리 = MET × 체중(kg) × 시간(h)
    // 또는 단순화: 약 0.04 kcal per step per kg
    const calories = steps * 0.04 * (weight / 70);

    // 시간 계산 (분당 100보 기준)
    const walkTime = steps / 100;

    // 결과 표시
    this.elements.distanceKm.textContent = distanceKm.toFixed(2);
    this.elements.distanceMi.textContent = distanceMi.toFixed(2);
    this.elements.calories.textContent = Math.round(calories);
    this.elements.walkTime.textContent = Math.round(walkTime);

    // 목표 달성률
    const progress = Math.min((steps / goalSteps) * 100, 100);
    this.elements.goalProgress.style.width = progress + '%';
    this.elements.currentSteps.textContent =
      new Intl.NumberFormat('ko-KR').format(steps) + ' 걸음';

    // 색상 변경 (목표 달성 시)
    const progressFill = this.elements.goalProgress;
    if (progress >= 100) {
      progressFill.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
    } else {
      progressFill.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)';
    }
  }
}

// 전역 인스턴스 생성
const stepsConverter = new StepsConverter();
window.StepsConverter = stepsConverter;

document.addEventListener('DOMContentLoaded', () => stepsConverter.init());
