/**
 * 가변 폰트 플레이그라운드 - ToolBase 기반
 * 가변 폰트 속성 조절 및 미리보기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class VariableFontPlayground extends ToolBase {
  constructor() {
    super('VariableFontPlayground');
  }

  init() {
    this.initElements({
      wght: 'wght',
      wdth: 'wdth',
      slnt: 'slnt',
      fontSize: 'fontSize',
      previewText: 'previewText',
      preview: 'preview',
      cssOutput: 'cssOutput',
      wghtValue: 'wghtValue',
      wdthValue: 'wdthValue',
      slntValue: 'slntValue',
      sizeValue: 'sizeValue'
    });

    this.bindEvents();
    this.updatePreview();

    console.log('[VariableFontPlayground] 초기화 완료');
    return this;
  }

  bindEvents() {
    this.elements.wght.addEventListener('input', () => this.updatePreview());
    this.elements.wdth.addEventListener('input', () => this.updatePreview());
    this.elements.slnt.addEventListener('input', () => this.updatePreview());
    this.elements.fontSize.addEventListener('input', () => this.updatePreview());
    this.elements.previewText.addEventListener('input', () => this.updatePreview());
  }

  updatePreview() {
    const wght = this.elements.wght.value;
    const wdth = this.elements.wdth.value;
    const slnt = this.elements.slnt.value;
    const fontSize = this.elements.fontSize.value;

    this.elements.wghtValue.textContent = wght;
    this.elements.wdthValue.textContent = wdth;
    this.elements.slntValue.textContent = slnt;
    this.elements.sizeValue.textContent = fontSize;

    const variationSettings = `'wght' ${wght}, 'wdth' ${wdth}, 'slnt' ${slnt}`;

    this.elements.preview.style.fontVariationSettings = variationSettings;
    this.elements.preview.style.fontSize = fontSize + 'px';
    this.elements.preview.textContent = this.elements.previewText.value || '가변 폰트 테스트';

    this.elements.cssOutput.textContent = `font-variation-settings: ${variationSettings};
font-size: ${fontSize}px;`;
  }

  applyPreset(wght, wdth, slnt) {
    this.elements.wght.value = wght;
    this.elements.wdth.value = wdth;
    this.elements.slnt.value = slnt;
    this.updatePreview();
  }

  copyCSS() {
    this.copyToClipboard(this.elements.cssOutput.textContent);
  }
}

// 전역 인스턴스 생성
const variableFontPlayground = new VariableFontPlayground();
window.VariableFontPlayground = variableFontPlayground;

document.addEventListener('DOMContentLoaded', () => variableFontPlayground.init());
