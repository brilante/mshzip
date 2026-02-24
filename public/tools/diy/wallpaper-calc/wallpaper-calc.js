/**
 * 벽지 계산기 - ToolBase 기반
 * 필요한 벽지 롤 수 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var WallpaperCalc = class WallpaperCalc extends ToolBase {
  constructor() {
    super('WallpaperCalc');
  }

  init() {
    this.initElements({
      roomPerimeter: 'roomPerimeter',
      roomHeight: 'roomHeight',
      helpWidth: 'helpWidth',
      helpDepth: 'helpDepth',
      rollWidth: 'rollWidth',
      rollLength: 'rollLength',
      patternRepeat: 'patternRepeat',
      wastePercent: 'wastePercent',
      wallArea: 'wallArea',
      stripsNeeded: 'stripsNeeded',
      rollsNeeded: 'rollsNeeded'
    });

    this.calculate();
    console.log('[WallpaperCalc] 초기화 완료');
    return this;
  }

  calcPerimeter() {
    const width = parseFloat(this.elements.helpWidth.value) || 0;
    const depth = parseFloat(this.elements.helpDepth.value) || 0;

    if (width > 0 && depth > 0) {
      const perimeter = (width + depth) * 2;
      this.elements.roomPerimeter.value = perimeter.toFixed(1);
      this.calculate();
    }
  }

  setPreset(width, length) {
    this.elements.rollWidth.value = width;
    this.elements.rollLength.value = length;

    document.querySelectorAll('.preset-btn').forEach(btn => {
      const btnWidth = parseInt(btn.dataset.width);
      const btnLength = parseInt(btn.dataset.length);
      btn.classList.toggle('selected', btnWidth === width && btnLength === length);
    });

    this.calculate();
  }

  calculate() {
    const roomPerimeter = parseFloat(this.elements.roomPerimeter.value) || 0;
    const roomHeight = parseFloat(this.elements.roomHeight.value) || 2.4;
    const rollWidth = parseFloat(this.elements.rollWidth.value) || 53;
    const rollLength = parseFloat(this.elements.rollLength.value) || 10;
    const patternRepeat = parseFloat(this.elements.patternRepeat.value) || 0;
    const wastePercent = parseFloat(this.elements.wastePercent.value) || 10;

    // 벽 면적 (㎡)
    const wallArea = roomPerimeter * roomHeight;

    // 롤 폭 (m로 변환)
    const rollWidthM = rollWidth / 100;

    // 필요한 폭 수 (strips)
    const stripsNeeded = Math.ceil(roomPerimeter / rollWidthM);

    // 한 폭당 필요한 길이 (패턴 고려)
    let stripLength = roomHeight;
    if (patternRepeat > 0) {
      const patternRepeatM = patternRepeat / 100;
      stripLength = Math.ceil(roomHeight / patternRepeatM) * patternRepeatM;
    }

    // 한 롤에서 얻을 수 있는 폭 수
    const stripsPerRoll = Math.floor(rollLength / stripLength);

    // 필요한 롤 수
    let rollsNeeded = 0;
    if (stripsPerRoll > 0) {
      rollsNeeded = Math.ceil(stripsNeeded / stripsPerRoll);
    }

    // 여유분 적용
    rollsNeeded = Math.ceil(rollsNeeded * (1 + wastePercent / 100));

    // 결과 표시
    this.elements.wallArea.textContent = wallArea.toFixed(1);
    this.elements.stripsNeeded.textContent = stripsNeeded;
    this.elements.rollsNeeded.textContent = rollsNeeded;
  }

  reset() {
    this.elements.roomPerimeter.value = '';
    this.elements.roomHeight.value = 2.4;
    this.elements.helpWidth.value = '';
    this.elements.helpDepth.value = '';
    this.elements.rollWidth.value = 53;
    this.elements.rollLength.value = 10;
    this.elements.patternRepeat.value = 0;
    this.elements.wastePercent.value = 10;

    this.setPreset(53, 10);
    this.calculate();
    this.showToast('초기화되었습니다', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const wallpaperCalc = new WallpaperCalc();
window.WallpaperCalc = wallpaperCalc;

document.addEventListener('DOMContentLoaded', () => wallpaperCalc.init());
