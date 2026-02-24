/**
 * 배기량 계산기 - ToolBase 기반
 * 엔진 배기량 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var EngineCC = class EngineCC extends ToolBase {
  constructor() {
    super('EngineCC');
    this.mode = 'calc';
  }

  init() {
    this.initElements({
      cylinders: 'cylinders',
      bore: 'bore',
      stroke: 'stroke',
      ccInput: 'ccInput',
      calcMode: 'calcMode',
      convertMode: 'convertMode',
      resultCC: 'resultCC',
      resultLiter: 'resultLiter',
      perCylinder: 'perCylinder',
      cubicInch: 'cubicInch'
    });

    this.calculate();

    console.log('[EngineCC] 초기화 완료');
    return this;
  }

  setMode(mode) {
    this.mode = mode;

    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    this.elements.calcMode.style.display = mode === 'calc' ? 'block' : 'none';
    this.elements.convertMode.style.display = mode === 'convert' ? 'block' : 'none';

    if (mode === 'calc') {
      this.calculate();
    } else {
      this.convertUnits();
    }
  }

  calculate() {
    const cylinders = parseInt(this.elements.cylinders.value) || 4;
    const bore = parseFloat(this.elements.bore.value) || 0;
    const stroke = parseFloat(this.elements.stroke.value) || 0;

    if (bore <= 0 || stroke <= 0) {
      this.displayResult(0, 0, 0);
      return;
    }

    // 배기량 공식: V = π × (bore/2)² × stroke × cylinders
    const radius = bore / 2;
    const singleCylinder = Math.PI * Math.pow(radius, 2) * stroke / 1000; // cc
    const totalCC = singleCylinder * cylinders;

    this.displayResult(totalCC, singleCylinder, cylinders);
  }

  convertUnits() {
    const cc = parseFloat(this.elements.ccInput.value) || 0;
    const cylinders = 4; // 기본값

    this.displayResult(cc, cc / cylinders, cylinders);
  }

  displayResult(totalCC, perCylinder, cylinders) {
    const liters = totalCC / 1000;
    const cubicInch = totalCC * 0.0610237;

    this.elements.resultCC.textContent = Math.round(totalCC).toLocaleString();
    this.elements.resultLiter.textContent = `≈ ${liters.toFixed(1)}L`;
    this.elements.perCylinder.textContent = Math.round(perCylinder) + 'cc';
    this.elements.cubicInch.textContent = cubicInch.toFixed(0) + 'ci';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const engineCC = new EngineCC();
window.EngineCC = engineCC;

document.addEventListener('DOMContentLoaded', () => engineCC.init());
