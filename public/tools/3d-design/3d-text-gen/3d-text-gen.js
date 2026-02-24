/**
 * 3D 텍스트 생성기 - ToolBase 기반
 * CSS 3D 텍스트 효과 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var Text3D = class Text3D extends ToolBase {
  constructor() {
    super('Text3D');
    this.presets = {
      neon: { frontColor: '#00ff88', sideColor: '#00aa55', fontSize: 80, depth: 5 },
      gold: { frontColor: '#ffd700', sideColor: '#b8860b', fontSize: 72, depth: 10 },
      ice: { frontColor: '#87ceeb', sideColor: '#4682b4', fontSize: 68, depth: 8 },
      wood: { frontColor: '#deb887', sideColor: '#8b4513', fontSize: 64, depth: 12 }
    };
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      text3d: 'text3d',
      fontSize: 'fontSize',
      depth: 'depth',
      rotateX: 'rotateX',
      rotateY: 'rotateY',
      frontColor: 'frontColor',
      sideColor: 'sideColor',
      fontSizeValue: 'fontSizeValue',
      depthValue: 'depthValue',
      rotateXValue: 'rotateXValue',
      rotateYValue: 'rotateYValue'
    });

    this.update();
    console.log('[Text3D] 초기화 완료');
    return this;
  }

  updateText() {
    const text = this.elements.textInput.value || '3D Text';
    this.elements.text3d.textContent = text;
  }

  update() {
    const fontSize = this.elements.fontSize.value;
    const depth = this.elements.depth.value;
    const rotateX = this.elements.rotateX.value;
    const rotateY = this.elements.rotateY.value;
    const frontColor = this.elements.frontColor.value;
    const sideColor = this.elements.sideColor.value;

    this.elements.fontSizeValue.textContent = fontSize + 'px';
    this.elements.depthValue.textContent = depth;
    this.elements.rotateXValue.textContent = rotateX + '°';
    this.elements.rotateYValue.textContent = rotateY + '°';

    const el = this.elements.text3d;
    el.style.fontSize = fontSize + 'px';
    el.style.color = frontColor;
    el.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    el.style.textShadow = this.generate3DShadow(depth, sideColor);
  }

  generate3DShadow(depth, color) {
    const shadows = [];
    for (let i = 1; i <= depth; i++) {
      const darken = 1 - (i / depth) * 0.3;
      const c = this.adjustBrightness(color, darken);
      shadows.push(`${i}px ${i}px 0 ${c}`);
    }
    shadows.push(`${parseInt(depth) + 2}px ${parseInt(depth) + 2}px 10px rgba(0,0,0,0.3)`);
    return shadows.join(', ');
  }

  adjustBrightness(hex, factor) {
    const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
    const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
    const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }

  loadPreset(type) {
    const preset = this.presets[type];
    if (preset) {
      this.elements.frontColor.value = preset.frontColor;
      this.elements.sideColor.value = preset.sideColor;
      this.elements.fontSize.value = preset.fontSize;
      this.elements.depth.value = preset.depth;
      this.update();
      this.showToast(`${type} 프리셋 적용됨`, 'success');
    }
  }

  async copyCSS() {
    const fontSize = this.elements.fontSize.value;
    const depth = this.elements.depth.value;
    const rotateX = this.elements.rotateX.value;
    const rotateY = this.elements.rotateY.value;
    const frontColor = this.elements.frontColor.value;
    const sideColor = this.elements.sideColor.value;

    const css = `.text-3d {
  font-size: ${fontSize}px;
  font-weight: 900;
  color: ${frontColor};
  transform: rotateX(${rotateX}deg) rotateY(${rotateY}deg);
  text-shadow: ${this.generate3DShadow(depth, sideColor)};
  transform-style: preserve-3d;
}`;

    try {
      await navigator.clipboard.writeText(css);
      this.showToast('CSS가 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  exportSettings() {
    const settings = {
      text: this.elements.textInput.value,
      fontSize: this.elements.fontSize.value,
      depth: this.elements.depth.value,
      rotateX: this.elements.rotateX.value,
      rotateY: this.elements.rotateY.value,
      frontColor: this.elements.frontColor.value,
      sideColor: this.elements.sideColor.value
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '3d-text-settings.json';
    link.click();
    URL.revokeObjectURL(link.href);
    this.showToast('설정 내보내기 완료!', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const text3D = new Text3D();
window.Text3D = text3D;

document.addEventListener('DOMContentLoaded', () => text3D.init());
