/**
 * 퍼센트 계산기 - ToolBase 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PercentageCalc = class PercentageCalc extends ToolBase {
  constructor() {
    super('PercentageCalc');
  }

  init() {
    // DOM 요소 자동 바인딩
    this.initElements({
      // 유형 1
      calc1_value: 'calc1_value',
      calc1_percent: 'calc1_percent',
      calc1_result: 'calc1_result',
      // 유형 2
      calc2_part: 'calc2_part',
      calc2_total: 'calc2_total',
      calc2_result: 'calc2_result',
      // 유형 3
      calc3_percent: 'calc3_percent',
      calc3_value: 'calc3_value',
      calc3_result: 'calc3_result',
      // 유형 4
      calc4_from: 'calc4_from',
      calc4_to: 'calc4_to',
      calc4_result: 'calc4_result',
      // 유형 5
      calc5_original: 'calc5_original',
      calc5_type: 'calc5_type',
      calc5_rate: 'calc5_rate',
      calc5_result: 'calc5_result'
    });

    // 결과 필드 클릭 시 복사
    document.querySelectorAll('.calc-result').forEach(el => {
      this.on(el, 'click', () => this.copyResult(el));
    });

    // Enter 키로 계산
    document.querySelectorAll('.calc-input').forEach(input => {
      this.on(input, 'keypress', (e) => {
        if (e.key === 'Enter') {
          const card = input.closest('.calc-card');
          card.querySelector('.calc-btn').click();
        }
      });
    });

    console.log('[PercentageCalc] 초기화 완료');
    return this;
  }

  // 유형 1: X의 Y%는?
  calculate1() {
    const value = parseFloat(this.elements.calc1_value.value);
    const percent = parseFloat(this.elements.calc1_percent.value);

    if (isNaN(value) || isNaN(percent)) {
      this.showError('값을 입력해주세요.');
      return;
    }

    const result = (value * percent) / 100;
    this.elements.calc1_result.value = this.formatNumber(result);
    this.showSuccess('계산 완료!');
  }

  // 유형 2: X는 Y의 몇 %?
  calculate2() {
    const part = parseFloat(this.elements.calc2_part.value);
    const total = parseFloat(this.elements.calc2_total.value);

    if (isNaN(part) || isNaN(total)) {
      this.showError('값을 입력해주세요.');
      return;
    }

    if (total === 0) {
      this.showError('전체 값은 0이 될 수 없습니다.');
      return;
    }

    const result = (part / total) * 100;
    this.elements.calc2_result.value = this.formatNumber(result);
    this.showSuccess('계산 완료!');
  }

  // 유형 3: X%가 Y이면 전체는?
  calculate3() {
    const percent = parseFloat(this.elements.calc3_percent.value);
    const value = parseFloat(this.elements.calc3_value.value);

    if (isNaN(percent) || isNaN(value)) {
      this.showError('값을 입력해주세요.');
      return;
    }

    if (percent === 0) {
      this.showError('퍼센트는 0이 될 수 없습니다.');
      return;
    }

    const result = (value * 100) / percent;
    this.elements.calc3_result.value = this.formatNumber(result);
    this.showSuccess('계산 완료!');
  }

  // 유형 4: 증감율 계산
  calculate4() {
    const from = parseFloat(this.elements.calc4_from.value);
    const to = parseFloat(this.elements.calc4_to.value);

    if (isNaN(from) || isNaN(to)) {
      this.showError('값을 입력해주세요.');
      return;
    }

    if (from === 0) {
      this.showError('시작 값은 0이 될 수 없습니다.');
      return;
    }

    const result = ((to - from) / from) * 100;
    const resultEl = this.elements.calc4_result;
    resultEl.value = (result >= 0 ? '+' : '') + this.formatNumber(result);
    resultEl.classList.toggle('positive', result > 0);
    resultEl.classList.toggle('negative', result < 0);
    this.showSuccess('계산 완료!');
  }

  // 유형 5: 할인/할증 계산
  calculate5() {
    const original = parseFloat(this.elements.calc5_original.value);
    const type = this.elements.calc5_type.value;
    const rate = parseFloat(this.elements.calc5_rate.value);

    if (isNaN(original) || isNaN(rate)) {
      this.showError('값을 입력해주세요.');
      return;
    }

    let result;
    if (type === 'discount') {
      result = original * (1 - rate / 100);
    } else {
      result = original * (1 + rate / 100);
    }

    this.elements.calc5_result.value = this.formatNumber(result);
    this.showSuccess('계산 완료!');
  }

  formatNumber(num) {
    // 정수면 정수로, 아니면 소수점 2자리
    if (Number.isInteger(num)) {
      return num.toLocaleString();
    }
    return parseFloat(num.toFixed(2)).toLocaleString();
  }

  async copyResult(element) {
    const value = element.value;
    if (!value) return;

    // 숫자만 추출 (콤마 제거)
    const numericValue = value.replace(/[^0-9.-]/g, '');
    await this.copyToClipboard(numericValue);
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const percentageCalc = new PercentageCalc();
window.PercentageCalc = percentageCalc;

document.addEventListener('DOMContentLoaded', () => percentageCalc.init());
