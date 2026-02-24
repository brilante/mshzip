/**
 * 색상 조합 도우미 - ToolBase 기반
 * 인테리어 색상 조합 추천
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ColorMatcher = class ColorMatcher extends ToolBase {
  constructor() {
    super('ColorMatcher');
    this.currentScheme = 'complementary';
    this.baseColor = '#667eea';
  }

  init() {
    this.initElements({
      baseColor: 'baseColor',
      hexInput: 'hexInput',
      colorPreview: 'colorPreview',
      paletteGrid: 'paletteGrid',
      wallColor: 'wallColor',
      floorColor: 'floorColor',
      accentColor: 'accentColor'
    });

    this.generate();
    console.log('[ColorMatcher] 초기화 완료');
    return this;
  }

  setColor(hex) {
    this.baseColor = hex;
    this.elements.baseColor.value = hex;
    this.elements.hexInput.value = hex;
    this.elements.colorPreview.style.background = hex;
    this.generate();
  }

  updateFromHex() {
    let hex = this.elements.hexInput.value;
    if (!hex.startsWith('#')) hex = '#' + hex;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      this.setColor(hex);
    }
  }

  setScheme(scheme) {
    this.currentScheme = scheme;
    document.querySelectorAll('.scheme-tab').forEach(tab => {
      tab.classList.toggle('active', tab.textContent.includes(this.getSchemeLabel(scheme)));
    });
    this.generate();
  }

  getSchemeLabel(scheme) {
    const labels = {
      complementary: '보색',
      analogous: '유사색',
      triadic: '삼원색',
      splitComplementary: '분리보색',
      monochromatic: '단색조'
    };
    return labels[scheme];
  }

  hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

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

    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  hslToHex(h, s, l) {
    h = h / 360;
    s = s / 100;
    l = l / 100;

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

    const toHex = x => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  generatePalette() {
    const hsl = this.hexToHsl(this.baseColor);
    const colors = [];

    switch (this.currentScheme) {
      case 'complementary':
        colors.push(this.baseColor);
        colors.push(this.hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l));
        colors.push(this.hslToHex(hsl.h, hsl.s * 0.5, hsl.l + 20));
        colors.push(this.hslToHex((hsl.h + 180) % 360, hsl.s * 0.5, hsl.l + 20));
        colors.push(this.hslToHex(hsl.h, hsl.s * 0.3, 95));
        break;

      case 'analogous':
        colors.push(this.hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l));
        colors.push(this.baseColor);
        colors.push(this.hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l));
        colors.push(this.hslToHex(hsl.h, hsl.s * 0.5, hsl.l + 25));
        colors.push(this.hslToHex(hsl.h, hsl.s * 0.2, 90));
        break;

      case 'triadic':
        colors.push(this.baseColor);
        colors.push(this.hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l));
        colors.push(this.hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l));
        colors.push(this.hslToHex(hsl.h, hsl.s * 0.3, 85));
        colors.push(this.hslToHex(hsl.h, hsl.s * 0.1, 95));
        break;

      case 'splitComplementary':
        colors.push(this.baseColor);
        colors.push(this.hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l));
        colors.push(this.hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l));
        colors.push(this.hslToHex(hsl.h, hsl.s * 0.4, hsl.l + 20));
        colors.push(this.hslToHex(hsl.h, hsl.s * 0.2, 92));
        break;

      case 'monochromatic':
        colors.push(this.hslToHex(hsl.h, hsl.s, Math.max(20, hsl.l - 30)));
        colors.push(this.hslToHex(hsl.h, hsl.s, Math.max(30, hsl.l - 15)));
        colors.push(this.baseColor);
        colors.push(this.hslToHex(hsl.h, hsl.s * 0.7, Math.min(80, hsl.l + 15)));
        colors.push(this.hslToHex(hsl.h, hsl.s * 0.4, Math.min(95, hsl.l + 30)));
        break;
    }

    return colors;
  }

  generate() {
    const colors = this.generatePalette();

    this.elements.paletteGrid.innerHTML = colors.map((color, idx) => `
      <div class="palette-color" style="background: ${color};" onclick="colorMatcher.copyColor('${color}')">
        <span>${color}</span>
      </div>
    `).join('');

    // 방 미리보기 업데이트
    const lightest = colors[colors.length - 1];
    const medium = colors[colors.length - 2] || colors[0];
    const accent = colors[0];

    this.elements.wallColor.style.background = lightest;
    this.elements.floorColor.style.background = '#d4a574';
    this.elements.accentColor.style.background = accent;
  }

  async copyColor(hex) {
    try {
      await navigator.clipboard.writeText(hex);
      this.showToast(`${hex} 복사됨`, 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const colorMatcher = new ColorMatcher();
window.ColorMatcher = colorMatcher;

document.addEventListener('DOMContentLoaded', () => colorMatcher.init());
