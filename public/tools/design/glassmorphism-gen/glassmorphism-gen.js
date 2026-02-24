/**
 * Glassmorphism 생성기 - ToolBase 기반
 * 유리 효과 CSS 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var GlassmorphismGen = class GlassmorphismGen extends ToolBase {
  constructor() {
    super('GlassmorphismGen');
  }

  init() {
    this.initElements({
      opacity: 'opacity',
      blur: 'blur',
      borderOpacity: 'borderOpacity',
      shadowIntensity: 'shadowIntensity',
      borderRadius: 'borderRadius',
      bgColor: 'bgColor',
      glassColor: 'glassColor',
      opacityValue: 'opacityValue',
      blurValue: 'blurValue',
      borderOpacityValue: 'borderOpacityValue',
      shadowIntensityValue: 'shadowIntensityValue',
      borderRadiusValue: 'borderRadiusValue',
      glassCard: 'glassCard',
      previewArea: 'previewArea',
      cssCode: 'cssCode'
    });

    this.update();
    console.log('[GlassmorphismGen] 초기화 완료');
    return this;
  }

  update() {
    const opacity = this.elements.opacity.value;
    const blur = this.elements.blur.value;
    const borderOpacity = this.elements.borderOpacity.value;
    const shadowIntensity = this.elements.shadowIntensity.value;
    const borderRadius = this.elements.borderRadius.value;
    const bgColor = this.elements.bgColor.value;
    const glassColor = this.elements.glassColor.value;

    this.elements.opacityValue.textContent = opacity + '%';
    this.elements.blurValue.textContent = blur + 'px';
    this.elements.borderOpacityValue.textContent = borderOpacity + '%';
    this.elements.shadowIntensityValue.textContent = shadowIntensity;
    this.elements.borderRadiusValue.textContent = borderRadius + 'px';

    const glassRgb = this.hexToRgb(glassColor);

    const card = this.elements.glassCard;
    const previewArea = this.elements.previewArea;

    card.style.background = `rgba(${glassRgb.r}, ${glassRgb.g}, ${glassRgb.b}, ${opacity / 100})`;
    card.style.backdropFilter = `blur(${blur}px)`;
    card.style.webkitBackdropFilter = `blur(${blur}px)`;
    card.style.border = `1px solid rgba(${glassRgb.r}, ${glassRgb.g}, ${glassRgb.b}, ${borderOpacity / 100})`;
    card.style.borderRadius = `${borderRadius}px`;
    card.style.boxShadow = `0 8px 32px 0 rgba(0, 0, 0, ${shadowIntensity / 100})`;

    previewArea.style.background = `linear-gradient(135deg, ${bgColor}, ${this.adjustColor(bgColor, -30)})`;

    this.generateCode(opacity, blur, borderOpacity, shadowIntensity, borderRadius, glassRgb);
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  adjustColor(hex, amount) {
    const rgb = this.hexToRgb(hex);
    const r = Math.max(0, Math.min(255, rgb.r + amount));
    const g = Math.max(0, Math.min(255, rgb.g + amount));
    const b = Math.max(0, Math.min(255, rgb.b + amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  generateCode(opacity, blur, borderOpacity, shadowIntensity, borderRadius, glassRgb) {
    const code = `.glass {
  /* Glassmorphism Effect */
  background: rgba(${glassRgb.r}, ${glassRgb.g}, ${glassRgb.b}, ${(opacity / 100).toFixed(2)});
  backdrop-filter: blur(${blur}px);
  -webkit-backdrop-filter: blur(${blur}px);
  border-radius: ${borderRadius}px;
  border: 1px solid rgba(${glassRgb.r}, ${glassRgb.g}, ${glassRgb.b}, ${(borderOpacity / 100).toFixed(2)});
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, ${(shadowIntensity / 100).toFixed(2)});
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
const glassmorphismGen = new GlassmorphismGen();
window.GlassmorphismGen = glassmorphismGen;

document.addEventListener('DOMContentLoaded', () => glassmorphismGen.init());
