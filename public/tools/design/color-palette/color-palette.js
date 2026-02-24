/**
 * 컬러 팔레트 생성기 - ToolBase 기반
 * 조화로운 색상 팔레트 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ColorPalette = class ColorPalette extends ToolBase {
  constructor() {
    super('ColorPalette');
    this.baseColor = '#667eea';
    this.harmony = 'analogous';
    this.palette = [];
    this.savedPalettes = [];
    this.harmonies = [
      { id: 'analogous', name: '유사색', angles: [0, 30, 60] },
      { id: 'complementary', name: '보색', angles: [0, 180] },
      { id: 'split-complementary', name: '분할보색', angles: [0, 150, 210] },
      { id: 'triadic', name: '삼원색', angles: [0, 120, 240] },
      { id: 'tetradic', name: '사원색', angles: [0, 90, 180, 270] },
      { id: 'monochromatic', name: '단색', angles: [0, 0, 0, 0, 0] }
    ];
  }

  init() {
    this.initElements({
      harmonyGrid: 'harmonyGrid',
      baseColor: 'baseColor',
      baseColorHex: 'baseColorHex',
      palettePreview: 'palettePreview',
      exportCode: 'exportCode',
      savedPalettes: 'savedPalettes'
    });

    this.loadSavedPalettes();
    this.renderHarmonies();
    this.generatePalette();
    console.log('[ColorPalette] 초기화 완료');
    return this;
  }

  renderHarmonies() {
    this.elements.harmonyGrid.innerHTML = this.harmonies.map(h => {
      const previewColors = this.getHarmonyPreview(h.id);
      return `
        <div class="harmony-btn ${h.id === this.harmony ? 'active' : ''}"
             onclick="colorPalette.setHarmony('${h.id}')">
          <div class="harmony-name">${h.name}</div>
          <div class="harmony-preview">
            ${previewColors.map(c => `<div class="harmony-preview-dot" style="background: ${c};"></div>`).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  getHarmonyPreview(harmonyId) {
    const harmony = this.harmonies.find(h => h.id === harmonyId);
    const hsl = this.hexToHsl(this.baseColor);

    if (harmonyId === 'monochromatic') {
      return [0.9, 0.7, 0.5, 0.3, 0.1].map(l =>
        this.hslToHex(hsl.h, hsl.s, l)
      );
    }

    return harmony.angles.map(angle =>
      this.hslToHex((hsl.h + angle) % 360, hsl.s, hsl.l)
    );
  }

  setBaseColor(color) {
    this.baseColor = color;
    this.elements.baseColorHex.value = color;
    this.renderHarmonies();
    this.generatePalette();
  }

  setBaseColorFromHex(hex) {
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      this.baseColor = hex;
      this.elements.baseColor.value = hex;
      this.renderHarmonies();
      this.generatePalette();
    }
  }

  pickRandom() {
    const hex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    this.setBaseColor(hex);
    this.showToast('랜덤 색상 선택됨', 'success');
  }

  setHarmony(harmony) {
    this.harmony = harmony;
    document.querySelectorAll('.harmony-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.includes(
        this.harmonies.find(h => h.id === harmony).name
      ));
    });
    this.generatePalette();
  }

  generatePalette() {
    const hsl = this.hexToHsl(this.baseColor);
    const harmony = this.harmonies.find(h => h.id === this.harmony);

    if (this.harmony === 'monochromatic') {
      this.palette = [0.9, 0.75, 0.5, 0.35, 0.2].map(l => ({
        hex: this.hslToHex(hsl.h, hsl.s, l),
        hsl: { h: hsl.h, s: hsl.s, l }
      }));
    } else {
      this.palette = harmony.angles.map(angle => {
        const h = (hsl.h + angle) % 360;
        return {
          hex: this.hslToHex(h, hsl.s, hsl.l),
          hsl: { h, s: hsl.s, l: hsl.l }
        };
      });

      while (this.palette.length < 5) {
        const lastColor = this.palette[this.palette.length - 1];
        const newH = (lastColor.hsl.h + 15) % 360;
        this.palette.push({
          hex: this.hslToHex(newH, hsl.s, hsl.l * 0.8),
          hsl: { h: newH, s: hsl.s, l: hsl.l * 0.8 }
        });
      }
    }

    this.renderPalette();
    this.renderExport();
  }

  renderPalette() {
    this.elements.palettePreview.innerHTML = this.palette.map((color) => `
      <div class="palette-color" style="background: ${color.hex};"
           onclick="colorPalette.copyColor('${color.hex}')">
        <div class="palette-color-info">
          <div style="font-weight: 600;">${color.hex}</div>
          <div>클릭하여 복사</div>
        </div>
      </div>
    `).join('');
  }

  renderExport() {
    const cssVars = this.palette.map((color, index) =>
      `  --color-${index + 1}: ${color.hex};`
    ).join('\n');

    this.elements.exportCode.textContent = `:root {\n${cssVars}\n}`;
  }

  async copyColor(hex) {
    try {
      await navigator.clipboard.writeText(hex);
      this.showToast(`${hex} 복사됨`, 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  async copyCode() {
    const code = this.elements.exportCode.textContent;
    try {
      await navigator.clipboard.writeText(code);
      this.showToast('CSS 코드 복사됨', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  randomize() {
    this.pickRandom();
    const randomHarmony = this.harmonies[Math.floor(Math.random() * this.harmonies.length)];
    this.setHarmony(randomHarmony.id);
    this.renderHarmonies();
    this.showToast('랜덤 팔레트 생성됨', 'success');
  }

  savePalette() {
    const colors = this.palette.map(c => c.hex);
    this.savedPalettes.unshift(colors);
    if (this.savedPalettes.length > 10) {
      this.savedPalettes.pop();
    }
    localStorage.setItem('colorPalettes', JSON.stringify(this.savedPalettes));
    this.renderSavedPalettes();
    this.showToast('팔레트 저장됨', 'success');
  }

  loadSavedPalettes() {
    const saved = localStorage.getItem('colorPalettes');
    if (saved) {
      this.savedPalettes = JSON.parse(saved);
    }
    this.renderSavedPalettes();
  }

  renderSavedPalettes() {
    if (this.savedPalettes.length === 0) {
      this.elements.savedPalettes.innerHTML = `
        <div style="text-align: center; color: var(--tools-text-secondary); padding: 20px;">
          저장된 팔레트가 없습니다.
        </div>
      `;
      return;
    }

    this.elements.savedPalettes.innerHTML = this.savedPalettes.map((colors, index) => `
      <div class="saved-palette" onclick="colorPalette.loadPalette(${index})">
        ${colors.map(c => `<div class="saved-palette-color" style="background: ${c};"></div>`).join('')}
      </div>
    `).join('');
  }

  loadPalette(index) {
    const colors = this.savedPalettes[index];
    this.palette = colors.map(hex => ({
      hex,
      hsl: this.hexToHsl(hex)
    }));
    this.baseColor = colors[0];
    this.elements.baseColor.value = this.baseColor;
    this.elements.baseColorHex.value = this.baseColor;
    this.renderPalette();
    this.renderExport();
    this.showToast('팔레트 불러옴', 'success');
  }

  clearSaved() {
    this.savedPalettes = [];
    localStorage.removeItem('colorPalettes');
    this.renderSavedPalettes();
    this.showToast('저장 목록 삭제됨', 'info');
  }

  hexToHsl(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
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

    return { h: h * 360, s, l };
  }

  hslToHex(h, s, l) {
    h /= 360;
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

    return '#' + [r, g, b].map(x =>
      Math.round(x * 255).toString(16).padStart(2, '0')
    ).join('');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const colorPalette = new ColorPalette();
window.ColorPalette = colorPalette;

document.addEventListener('DOMContentLoaded', () => colorPalette.init());
