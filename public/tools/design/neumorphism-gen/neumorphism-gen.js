/**
 * Neumorphism 생성기 - ToolBase 기반
 * 소프트 UI/뉴모피즘 효과 CSS 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var NeumorphismGen = class NeumorphismGen extends ToolBase {
  constructor() {
    super('NeumorphismGen');
    this.shape = 'flat';
  }

  init() {
    this.initElements({
      bgColor: 'bgColor',
      size: 'size',
      borderRadius: 'borderRadius',
      distance: 'distance',
      intensity: 'intensity',
      blur: 'blur',
      sizeValue: 'sizeValue',
      borderRadiusValue: 'borderRadiusValue',
      distanceValue: 'distanceValue',
      intensityValue: 'intensityValue',
      blurValue: 'blurValue',
      neumorphBox: 'neumorphBox',
      previewArea: 'previewArea',
      cssCode: 'cssCode'
    });

    this.update();
    console.log('[NeumorphismGen] 초기화 완료');
    return this;
  }

  setShape(shape) {
    this.shape = shape;
    document.querySelectorAll('.shape-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-shape="${shape}"]`).classList.add('active');
    this.update();
  }

  update() {
    const bgColor = this.elements.bgColor.value;
    const size = this.elements.size.value;
    const borderRadius = this.elements.borderRadius.value;
    const distance = this.elements.distance.value;
    const intensity = this.elements.intensity.value;
    const blur = this.elements.blur.value;

    this.elements.sizeValue.textContent = size + 'px';
    this.elements.borderRadiusValue.textContent = borderRadius + 'px';
    this.elements.distanceValue.textContent = distance + 'px';
    this.elements.intensityValue.textContent = intensity + '%';
    this.elements.blurValue.textContent = blur + 'px';

    const lightColor = this.adjustBrightness(bgColor, intensity);
    const darkColor = this.adjustBrightness(bgColor, -intensity);

    const box = this.elements.neumorphBox;
    const previewArea = this.elements.previewArea;

    previewArea.style.backgroundColor = bgColor;
    box.style.width = size + 'px';
    box.style.height = size + 'px';
    box.style.borderRadius = borderRadius + 'px';
    box.style.backgroundColor = bgColor;

    let boxShadow, background;

    switch (this.shape) {
      case 'flat':
        boxShadow = `${distance}px ${distance}px ${blur}px ${darkColor}, -${distance}px -${distance}px ${blur}px ${lightColor}`;
        background = bgColor;
        break;
      case 'concave':
        boxShadow = `${distance}px ${distance}px ${blur}px ${darkColor}, -${distance}px -${distance}px ${blur}px ${lightColor}`;
        background = `linear-gradient(145deg, ${darkColor}, ${lightColor})`;
        break;
      case 'convex':
        boxShadow = `${distance}px ${distance}px ${blur}px ${darkColor}, -${distance}px -${distance}px ${blur}px ${lightColor}`;
        background = `linear-gradient(145deg, ${lightColor}, ${darkColor})`;
        break;
      case 'pressed':
        boxShadow = `inset ${distance}px ${distance}px ${blur}px ${darkColor}, inset -${distance}px -${distance}px ${blur}px ${lightColor}`;
        background = bgColor;
        break;
    }

    box.style.boxShadow = boxShadow;
    box.style.background = background;

    this.generateCode(bgColor, borderRadius, boxShadow, background);
  }

  adjustBrightness(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  generateCode(bgColor, borderRadius, boxShadow, background) {
    const code = `.neumorphism {
  /* Neumorphism Effect */
  background: ${background};
  border-radius: ${borderRadius}px;
  box-shadow: ${boxShadow};
}

/* 배경 요소에 적용 */
.container {
  background-color: ${bgColor};
}`;
    this.elements.cssCode.textContent = code;
  }

  async copyCode() {
    const code = this.elements.cssCode.textContent;
    try {
      await navigator.clipboard.writeText(code);
      this.showToast('CSS 코드가 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const neumorphismGen = new NeumorphismGen();
window.NeumorphismGen = neumorphismGen;

document.addEventListener('DOMContentLoaded', () => neumorphismGen.init());
