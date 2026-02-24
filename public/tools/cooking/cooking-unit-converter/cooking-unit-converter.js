/**
 * 요리 단위 변환기 - ToolBase 기반
 * 요리 계량 단위 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class CookingUnit extends ToolBase {
  constructor() {
    super('CookingUnit');
    // ml 기준 부피 변환
    this.volumeToMl = {
      ml: 1,
      l: 1000,
      cup: 240,
      tbsp: 15,
      tsp: 5,
      floz: 29.5735
    };
    // g 기준 무게 변환
    this.weightToG = {
      g: 1,
      kg: 1000,
      oz: 28.3495,
      lb: 453.592
    };
  }

  init() {
    this.initElements({
      fromValue: 'fromValue',
      fromUnit: 'fromUnit',
      toValue: 'toValue',
      toUnit: 'toUnit',
      resultValue: 'resultValue',
      resultUnit: 'resultUnit'
    });

    this.convert();

    console.log('[CookingUnit] 초기화 완료');
    return this;
  }

  getUnitType(unit) {
    if (this.volumeToMl[unit]) return 'volume';
    if (this.weightToG[unit]) return 'weight';
    return null;
  }

  convert() {
    const fromValue = parseFloat(this.elements.fromValue.value) || 0;
    const fromUnit = this.elements.fromUnit.value;
    const toUnit = this.elements.toUnit.value;

    const fromType = this.getUnitType(fromUnit);
    const toType = this.getUnitType(toUnit);

    let result;

    if (fromType !== toType) {
      // 부피 <-> 무게 변환 불가
      this.elements.toValue.value = '변환 불가';
      this.elements.resultValue.textContent = '';
      this.elements.resultUnit.textContent = '부피↔무게 변환 불가';
      return;
    }

    if (fromType === 'volume') {
      const ml = fromValue * this.volumeToMl[fromUnit];
      result = ml / this.volumeToMl[toUnit];
    } else {
      const g = fromValue * this.weightToG[fromUnit];
      result = g / this.weightToG[toUnit];
    }

    const formatted = this.formatResult(result);
    this.elements.toValue.value = formatted;
    this.elements.resultValue.textContent = formatted;
    this.elements.resultUnit.textContent = this.getUnitName(toUnit);
  }

  formatResult(value) {
    if (value === 0) return '0';
    if (value < 0.01) return value.toFixed(4);
    if (value < 0.1) return value.toFixed(3);
    if (value < 1) return value.toFixed(2);
    if (value < 10) return value.toFixed(2);
    if (value < 100) return value.toFixed(1);
    return Math.round(value).toString();
  }

  getUnitName(unit) {
    const names = {
      ml: 'ml (밀리리터)',
      l: 'L (리터)',
      cup: 'cup (컵)',
      tbsp: 'Tbsp (큰술)',
      tsp: 'tsp (작은술)',
      floz: 'fl oz (액량온스)',
      g: 'g (그램)',
      kg: 'kg (킬로그램)',
      oz: 'oz (온스)',
      lb: 'lb (파운드)'
    };
    return names[unit] || unit;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const cookingUnit = new CookingUnit();
window.CookingUnit = cookingUnit;

document.addEventListener('DOMContentLoaded', () => cookingUnit.init());
