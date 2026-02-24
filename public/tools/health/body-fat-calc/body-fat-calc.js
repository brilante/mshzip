/**
 * 체지방률 계산기 - ToolBase 기반
 * US Navy 공식으로 체지방률 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class BodyFatCalculator extends ToolBase {
  constructor() {
    super('BodyFatCalculator');
    this.gender = 'male';
  }

  init() {
    this.initElements({
      height: 'height',
      waist: 'waist',
      neck: 'neck',
      hip: 'hip',
      calculateBtn: 'calculateBtn',
      bfValue: 'bfValue',
      bfCategory: 'bfCategory',
      barFill: 'barFill',
      infoBox: 'infoBox',
      result: 'result'
    });

    this.setupEvents();

    console.log('[BodyFatCalculator] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.gender-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.gender = btn.dataset.gender;
        document.querySelector('.female-only').style.display = this.gender === 'female' ? 'block' : 'none';
      });
    });

    this.elements.calculateBtn.addEventListener('click', () => this.calculate());
  }

  calculate() {
    const height = parseFloat(this.elements.height.value);
    const waist = parseFloat(this.elements.waist.value);
    const neck = parseFloat(this.elements.neck.value);
    const hip = parseFloat(this.elements.hip.value);

    if (!height || !waist || !neck) {
      this.showToast('모든 측정값을 입력하세요', 'error');
      return;
    }

    if (this.gender === 'female' && !hip) {
      this.showToast('엉덩이 둘레를 입력하세요', 'error');
      return;
    }

    let bodyFat;

    if (this.gender === 'male') {
      // US Navy formula for men
      bodyFat = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    } else {
      // US Navy formula for women
      bodyFat = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450;
    }

    bodyFat = Math.max(0, Math.min(60, bodyFat));
    const bfRounded = Math.round(bodyFat * 10) / 10;

    this.elements.bfValue.textContent = bfRounded;

    let category, position;

    if (this.gender === 'male') {
      if (bodyFat < 6) { category = '필수 지방'; position = 10; }
      else if (bodyFat < 14) { category = '운동선수'; position = 25; }
      else if (bodyFat < 18) { category = '건강'; position = 45; }
      else if (bodyFat < 25) { category = '표준'; position = 65; }
      else { category = '비만'; position = 85; }
    } else {
      if (bodyFat < 14) { category = '필수 지방'; position = 10; }
      else if (bodyFat < 21) { category = '운동선수'; position = 25; }
      else if (bodyFat < 25) { category = '건강'; position = 45; }
      else if (bodyFat < 32) { category = '표준'; position = 65; }
      else { category = '비만'; position = 85; }
    }

    this.elements.bfCategory.textContent = category;
    this.elements.barFill.style.left = position + '%';

    this.elements.infoBox.innerHTML = '<p><strong>분류:</strong> ' + category + '</p>' +
      '<p><strong>측정 방법:</strong> US Navy 공식</p>' +
      '<p><strong>참고:</strong> 정확한 측정을 위해서는 전문 장비를 사용하세요.</p>';

    this.elements.result.style.display = 'block';
    this.showToast(`체지방률: ${bfRounded}% (${category})`, 'success');
  }
}

// 전역 인스턴스 생성
const bodyFatCalc = new BodyFatCalculator();
window.BodyFatCalculator = bodyFatCalc;

document.addEventListener('DOMContentLoaded', () => bodyFatCalc.init());
