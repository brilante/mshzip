/**
 * 방 면적 계산기 - ToolBase 기반
 * 다양한 형태의 면적 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var RoomCalc = class RoomCalc extends ToolBase {
  constructor() {
    super('RoomCalc');
    this.currentShape = 'rectangle';
  }

  init() {
    this.initElements({
      rectangleInputs: 'rectangleInputs',
      lshapeInputs: 'lshapeInputs',
      circleInputs: 'circleInputs',
      triangleInputs: 'triangleInputs',
      trapezoidInputs: 'trapezoidInputs',
      rectWidth: 'rectWidth',
      rectHeight: 'rectHeight',
      lFullWidth: 'lFullWidth',
      lFullHeight: 'lFullHeight',
      lCutWidth: 'lCutWidth',
      lCutHeight: 'lCutHeight',
      circleDiameter: 'circleDiameter',
      triBase: 'triBase',
      triHeight: 'triHeight',
      trapTop: 'trapTop',
      trapBottom: 'trapBottom',
      trapHeight: 'trapHeight',
      areaSqm: 'areaSqm',
      areaPyeong: 'areaPyeong',
      areaSqft: 'areaSqft',
      areaSqyd: 'areaSqyd',
      areaAre: 'areaAre',
      areaAcre: 'areaAcre'
    });

    this.calculate();
    console.log('[RoomCalc] 초기화 완료');
    return this;
  }

  setShape(shape) {
    this.currentShape = shape;

    document.querySelectorAll('.shape-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    const shapes = ['rectangle', 'lshape', 'circle', 'triangle', 'trapezoid'];
    shapes.forEach(s => {
      this.elements[s + 'Inputs'].style.display = s === shape ? 'block' : 'none';
    });

    this.calculate();
  }

  calculate() {
    let areaSqm = 0;

    switch (this.currentShape) {
      case 'rectangle':
        const rectW = parseFloat(this.elements.rectWidth.value) || 0;
        const rectH = parseFloat(this.elements.rectHeight.value) || 0;
        areaSqm = rectW * rectH;
        break;

      case 'lshape':
        const lFullW = parseFloat(this.elements.lFullWidth.value) || 0;
        const lFullH = parseFloat(this.elements.lFullHeight.value) || 0;
        const lCutW = parseFloat(this.elements.lCutWidth.value) || 0;
        const lCutH = parseFloat(this.elements.lCutHeight.value) || 0;
        areaSqm = (lFullW * lFullH) - (lCutW * lCutH);
        break;

      case 'circle':
        const diameter = parseFloat(this.elements.circleDiameter.value) || 0;
        const radius = diameter / 2;
        areaSqm = Math.PI * radius * radius;
        break;

      case 'triangle':
        const triBase = parseFloat(this.elements.triBase.value) || 0;
        const triHeight = parseFloat(this.elements.triHeight.value) || 0;
        areaSqm = (triBase * triHeight) / 2;
        break;

      case 'trapezoid':
        const trapTop = parseFloat(this.elements.trapTop.value) || 0;
        const trapBottom = parseFloat(this.elements.trapBottom.value) || 0;
        const trapHeight = parseFloat(this.elements.trapHeight.value) || 0;
        areaSqm = ((trapTop + trapBottom) * trapHeight) / 2;
        break;
    }

    // 단위 변환
    const areaPyeong = areaSqm / 3.3058; // 1평 = 3.3058㎡
    const areaSqft = areaSqm * 10.764;
    const areaSqyd = areaSqm * 1.196;
    const areaAre = areaSqm / 100;
    const areaAcre = areaSqm / 4046.86;

    this.elements.areaSqm.textContent = areaSqm.toFixed(2);
    this.elements.areaPyeong.textContent = areaPyeong.toFixed(2);
    this.elements.areaSqft.textContent = areaSqft.toFixed(2);
    this.elements.areaSqyd.textContent = areaSqyd.toFixed(2);
    this.elements.areaAre.textContent = areaAre.toFixed(4);
    this.elements.areaAcre.textContent = areaAcre.toFixed(6);
  }

  reset() {
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => input.value = '');
    this.calculate();
    this.showToast('초기화되었습니다', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const roomCalc = new RoomCalc();
window.RoomCalc = roomCalc;

document.addEventListener('DOMContentLoaded', () => roomCalc.init());
