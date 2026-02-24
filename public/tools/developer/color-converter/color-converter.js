/**
 * 색상 변환기 도구 - ToolBase 기반
 * HEX, RGB, HSL 색상 코드 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ColorConverter = class ColorConverter extends ToolBase {
  constructor() {
    super('ColorConverter');
    this.currentColor = { r: 102, g: 126, b: 234, a: 1 };
    this.paletteColors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
      '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
      '#ec4899', '#f43f5e', '#000000', '#6b7280', '#ffffff'
    ];
  }

  init() {
    this.initElements({
      colorPicker: 'colorPicker',
      hexInput: 'hexInput',
      rgbR: 'rgbR',
      rgbG: 'rgbG',
      rgbB: 'rgbB',
      rgbA: 'rgbA',
      hslH: 'hslH',
      hslS: 'hslS',
      hslL: 'hslL',
      hslA: 'hslA',
      hueSlider: 'hueSlider',
      satSlider: 'satSlider',
      lightSlider: 'lightSlider',
      alphaSlider: 'alphaSlider',
      hueValue: 'hueValue',
      satValue: 'satValue',
      lightValue: 'lightValue',
      alphaValue: 'alphaValue',
      cssHex: 'cssHex',
      cssRgb: 'cssRgb',
      cssHsl: 'cssHsl',
      colorPalette: 'colorPalette'
    });

    this.colorPreview = document.querySelector('.color-preview-inner');

    // 컬러 피커 이벤트
    this.on(this.elements.colorPicker, 'input', (e) => {
      this.fromHexString(e.target.value);
    });

    // 팔레트 생성
    this.createPalette();

    // 초기 색상 설정
    this.updateAll();

    console.log('[ColorConverter] 초기화 완료');
    return this;
  }

  createPalette() {
    const palette = this.elements.colorPalette;
    palette.innerHTML = '';

    this.paletteColors.forEach(color => {
      const swatch = document.createElement('button');
      swatch.className = 'palette-swatch';
      swatch.style.backgroundColor = color;
      swatch.title = color;
      swatch.onclick = () => this.fromHexString(color);
      palette.appendChild(swatch);
    });
  }

  fromHex() {
    let hex = this.elements.hexInput.value.replace(/[^0-9a-fA-F]/g, '');

    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;

      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        this.currentColor = { r, g, b, a };
        this.updateAll('hex');
      }
    }
  }

  fromHexString(hexString) {
    const hex = hexString.replace('#', '');
    this.elements.hexInput.value = hex;
    this.fromHex();
  }

  fromRgb() {
    const r = parseInt(this.elements.rgbR.value) || 0;
    const g = parseInt(this.elements.rgbG.value) || 0;
    const b = parseInt(this.elements.rgbB.value) || 0;
    const a = parseFloat(this.elements.rgbA.value);

    if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
      this.currentColor = {
        r: Math.min(255, Math.max(0, r)),
        g: Math.min(255, Math.max(0, g)),
        b: Math.min(255, Math.max(0, b)),
        a: isNaN(a) ? 1 : Math.min(1, Math.max(0, a))
      };
      this.updateAll('rgb');
    }
  }

  fromHsl() {
    const h = parseInt(this.elements.hslH.value) || 0;
    const s = parseInt(this.elements.hslS.value) || 0;
    const l = parseInt(this.elements.hslL.value) || 0;
    const a = parseFloat(this.elements.hslA.value);

    if (h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100) {
      const rgb = this.hslToRgb(h, s, l);
      this.currentColor = {
        ...rgb,
        a: isNaN(a) ? 1 : Math.min(1, Math.max(0, a))
      };
      this.updateAll('hsl');
    }
  }

  fromSliders() {
    const h = parseInt(this.elements.hueSlider.value);
    const s = parseInt(this.elements.satSlider.value);
    const l = parseInt(this.elements.lightSlider.value);
    const a = parseInt(this.elements.alphaSlider.value) / 100;

    const rgb = this.hslToRgb(h, s, l);
    this.currentColor = { ...rgb, a };
    this.updateAll('slider');
  }

  updateAll(source = '') {
    const { r, g, b, a } = this.currentColor;
    const hsl = this.rgbToHsl(r, g, b);
    const hex = this.rgbToHex(r, g, b);

    // 미리보기 업데이트
    this.colorPreview.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a})`;
    this.elements.colorPicker.value = '#' + hex;

    // HEX 업데이트
    if (source !== 'hex') {
      this.elements.hexInput.value = a < 1 ? hex + Math.round(a * 255).toString(16).padStart(2, '0') : hex;
    }

    // RGB 업데이트
    if (source !== 'rgb') {
      this.elements.rgbR.value = r;
      this.elements.rgbG.value = g;
      this.elements.rgbB.value = b;
      this.elements.rgbA.value = a;
    }

    // HSL 업데이트
    if (source !== 'hsl') {
      this.elements.hslH.value = hsl.h;
      this.elements.hslS.value = hsl.s;
      this.elements.hslL.value = hsl.l;
      this.elements.hslA.value = a;
    }

    // 슬라이더 업데이트
    if (source !== 'slider') {
      this.elements.hueSlider.value = hsl.h;
      this.elements.satSlider.value = hsl.s;
      this.elements.lightSlider.value = hsl.l;
      this.elements.alphaSlider.value = Math.round(a * 100);
    }

    // 슬라이더 값 표시
    this.elements.hueValue.textContent = hsl.h + '°';
    this.elements.satValue.textContent = hsl.s + '%';
    this.elements.lightValue.textContent = hsl.l + '%';
    this.elements.alphaValue.textContent = Math.round(a * 100) + '%';

    // CSS 코드 업데이트
    this.updateCssOutput(hex, r, g, b, hsl, a);
  }

  updateCssOutput(hex, r, g, b, hsl, a) {
    if (a < 1) {
      this.elements.cssHex.textContent = '#' + hex + Math.round(a * 255).toString(16).padStart(2, '0');
      this.elements.cssRgb.textContent = `rgba(${r}, ${g}, ${b}, ${a})`;
      this.elements.cssHsl.textContent = `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${a})`;
    } else {
      this.elements.cssHex.textContent = '#' + hex;
      this.elements.cssRgb.textContent = `rgb(${r}, ${g}, ${b})`;
      this.elements.cssHsl.textContent = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    }
  }

  rgbToHex(r, g, b) {
    return [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  copyValue(format) {
    let value = '';
    const { r, g, b, a } = this.currentColor;
    const hsl = this.rgbToHsl(r, g, b);

    switch (format) {
      case 'hex':
        value = '#' + this.elements.hexInput.value;
        break;
      case 'rgb':
        value = a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
        break;
      case 'hsl':
        value = a < 1 ? `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${a})` : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
        break;
    }

    navigator.clipboard.writeText(value).then(() => {
      this.showSuccess(`${format.toUpperCase()} 값이 복사되었습니다`);
    });
  }

  copyCss(format) {
    let value = '';
    switch (format) {
      case 'hex': value = this.elements.cssHex.textContent; break;
      case 'rgb': value = this.elements.cssRgb.textContent; break;
      case 'hsl': value = this.elements.cssHsl.textContent; break;
    }

    navigator.clipboard.writeText(value).then(() => {
      this.showSuccess('CSS 코드가 복사되었습니다');
    });
  }

  copyAllCss() {
    const css = [
      this.elements.cssHex.textContent,
      this.elements.cssRgb.textContent,
      this.elements.cssHsl.textContent
    ].join('\n');

    navigator.clipboard.writeText(css).then(() => {
      this.showSuccess('모든 CSS 코드가 복사되었습니다');
    });
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const colorConverter = new ColorConverter();
window.ColorConverter = colorConverter;

document.addEventListener('DOMContentLoaded', () => colorConverter.init());
