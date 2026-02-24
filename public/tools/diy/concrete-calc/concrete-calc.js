/**
 * 콘크리트 계산기 - ToolBase 기반
 * 필요한 콘크리트 양 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ConcreteCalc = class ConcreteCalc extends ToolBase {
  constructor() {
    super('ConcreteCalc');
    this.currentShape = 'slab';
  }

  init() {
    this.initElements({
      slabInputs: 'slabInputs',
      columnInputs: 'columnInputs',
      cylinderInputs: 'cylinderInputs',
      slabWidth: 'slabWidth',
      slabLength: 'slabLength',
      slabThickness: 'slabThickness',
      colWidth: 'colWidth',
      colDepth: 'colDepth',
      colHeight: 'colHeight',
      colCount: 'colCount',
      cylDiameter: 'cylDiameter',
      cylHeight: 'cylHeight',
      cylCount: 'cylCount',
      wastePercent: 'wastePercent',
      pricePerCubic: 'pricePerCubic',
      volume: 'volume',
      volumeWithWaste: 'volumeWithWaste',
      weight: 'weight',
      price: 'price',
      cement: 'cement',
      sand: 'sand',
      gravel: 'gravel',
      water: 'water'
    });

    this.calculate();
    console.log('[ConcreteCalc] 초기화 완료');
    return this;
  }

  setShape(shape) {
    this.currentShape = shape;

    document.querySelectorAll('.shape-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    this.elements.slabInputs.style.display = shape === 'slab' ? 'block' : 'none';
    this.elements.columnInputs.style.display = shape === 'column' ? 'block' : 'none';
    this.elements.cylinderInputs.style.display = shape === 'cylinder' ? 'block' : 'none';

    this.calculate();
  }

  calculate() {
    let volume = 0;

    switch (this.currentShape) {
      case 'slab':
        const slabW = parseFloat(this.elements.slabWidth.value) || 0;
        const slabL = parseFloat(this.elements.slabLength.value) || 0;
        const slabT = (parseFloat(this.elements.slabThickness.value) || 0) / 100;
        volume = slabW * slabL * slabT;
        break;

      case 'column':
        const colW = (parseFloat(this.elements.colWidth.value) || 0) / 100;
        const colD = (parseFloat(this.elements.colDepth.value) || 0) / 100;
        const colH = parseFloat(this.elements.colHeight.value) || 0;
        const colCount = parseInt(this.elements.colCount.value) || 1;
        volume = colW * colD * colH * colCount;
        break;

      case 'cylinder':
        const cylD = (parseFloat(this.elements.cylDiameter.value) || 0) / 100;
        const cylH = parseFloat(this.elements.cylHeight.value) || 0;
        const cylCount = parseInt(this.elements.cylCount.value) || 1;
        const radius = cylD / 2;
        volume = Math.PI * radius * radius * cylH * cylCount;
        break;
    }

    const wastePercent = parseFloat(this.elements.wastePercent.value) || 10;
    const pricePerCubic = parseFloat(this.elements.pricePerCubic.value) || 0;

    const volumeWithWaste = volume * (1 + wastePercent / 100);
    const weight = volumeWithWaste * 2.4; // 콘크리트 밀도 약 2.4톤/㎥
    const price = volumeWithWaste * pricePerCubic;

    this.elements.volume.textContent = volume.toFixed(2);
    this.elements.volumeWithWaste.textContent = volumeWithWaste.toFixed(2);
    this.elements.weight.textContent = weight.toFixed(2);
    this.elements.price.textContent = Math.round(price).toLocaleString();

    // 직접 배합 재료량 (1:2:4 배합 기준)
    if (volumeWithWaste > 0) {
      const cementPerM3 = 320; // kg
      const sandPerM3 = 640; // kg
      const gravelPerM3 = 1280; // kg
      const waterPerM3 = 160; // L

      this.elements.cement.textContent = Math.round(cementPerM3 * volumeWithWaste) + 'kg';
      this.elements.sand.textContent = Math.round(sandPerM3 * volumeWithWaste) + 'kg';
      this.elements.gravel.textContent = Math.round(gravelPerM3 * volumeWithWaste) + 'kg';
      this.elements.water.textContent = Math.round(waterPerM3 * volumeWithWaste) + 'L';
    } else {
      this.elements.cement.textContent = '-';
      this.elements.sand.textContent = '-';
      this.elements.gravel.textContent = '-';
      this.elements.water.textContent = '-';
    }
  }

  reset() {
    this.elements.slabWidth.value = '';
    this.elements.slabLength.value = '';
    this.elements.slabThickness.value = '';
    this.elements.colWidth.value = '';
    this.elements.colDepth.value = '';
    this.elements.colHeight.value = '';
    this.elements.colCount.value = 1;
    this.elements.cylDiameter.value = '';
    this.elements.cylHeight.value = '';
    this.elements.cylCount.value = 1;
    this.elements.wastePercent.value = 10;
    this.elements.pricePerCubic.value = '';

    this.calculate();
    this.showToast('초기화되었습니다', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const concreteCalc = new ConcreteCalc();
window.ConcreteCalc = concreteCalc;

document.addEventListener('DOMContentLoaded', () => concreteCalc.init());
