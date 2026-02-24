/**
 * 수분 섭취 계산기 - ToolBase 기반
 * 하루 권장 수분 섭취량 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class WaterIntakeCalculator extends ToolBase {
  constructor() {
    super('WaterIntakeCalculator');
  }

  init() {
    this.initElements({
      weight: 'weight',
      activity: 'activity',
      climate: 'climate',
      caffeine: 'caffeine',
      result: 'result'
    });

    this.calculate();

    console.log('[WaterIntakeCalculator] 초기화 완료');
    return this;
  }

  calculate() {
    const weight = parseFloat(this.elements.weight.value);
    const activity = parseFloat(this.elements.activity.value);
    const climate = parseFloat(this.elements.climate.value);
    const caffeine = parseInt(this.elements.caffeine.value);

    if (!weight || weight < 30 || weight > 200) {
      this.showToast('올바른 체중을 입력하세요.', 'error');
      return;
    }

    // 기본 수분 필요량: 체중 * 30ml
    let baseAmount = weight * 30;

    // 활동량 조정
    baseAmount *= activity;

    // 기후 조정
    baseAmount *= climate;

    // 카페인 섭취에 따른 추가 (카페인은 이뇨 작용)
    baseAmount += caffeine * 150;

    const liters = (baseAmount / 1000).toFixed(1);
    const glasses = Math.ceil(baseAmount / 250);

    this.renderResult(liters, glasses, baseAmount);
  }

  renderResult(liters, glasses, ml) {
    const filledGlasses = Math.min(glasses, 12);
    const glassesHtml = Array(filledGlasses).fill(0).map((_, i) =>
      `<div class="glass filled"></div>`
    ).join('');

    this.elements.result.innerHTML = `
      <div class="result-card">
        <div class="result-amount">${liters}L</div>
        <div class="result-label">하루 권장 수분 섭취량</div>
        <div style="margin-top: 0.5rem; font-size: 0.9rem;">(약 ${glasses}잔, 250ml 기준)</div>
        <div class="water-glass">${glassesHtml}</div>
      </div>
      <div style="text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
        <p>정확한 양: ${Math.round(ml)}ml</p>
        <p style="margin-top: 0.25rem;">매 시간 ${Math.round(ml / 16)}ml씩 마시면 됩니다</p>
      </div>
    `;

    this.showToast(`하루 ${liters}L 섭취를 권장합니다!`, 'success');
  }
}

// 전역 인스턴스 생성
const waterCalc = new WaterIntakeCalculator();
window.WaterIntakeCalculator = waterCalc;

document.addEventListener('DOMContentLoaded', () => waterCalc.init());
