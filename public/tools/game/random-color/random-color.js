/**
 * 랜덤 색상 생성기 - ToolBase 기반
 * 다양한 모드의 랜덤 색상 및 팔레트 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class RandomColorGenerator extends ToolBase {
  constructor() {
    super('RandomColorGenerator');
    this.currentColor = { r: 102, g: 126, b: 234 };
    this.mode = 'any';
    this.history = JSON.parse(localStorage.getItem('colorHistory') || '[]');
  }

  init() {
    this.initElements({
      generateBtn: 'generateBtn',
      colorPreview: 'colorPreview',
      hexValue: 'hexValue',
      rgbValue: 'rgbValue',
      hslValue: 'hslValue',
      colorHistory: 'colorHistory',
      paletteDisplay: 'paletteDisplay'
    });

    this.setupEvents();
    this.renderHistory();
    this.updateDisplay();

    console.log('[RandomColorGenerator] 초기화 완료');
    return this;
  }

  setupEvents() {
    this.elements.generateBtn.addEventListener('click', () => this.generate());

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.mode = e.target.dataset.mode;
      });
    });

    document.querySelectorAll('.palette-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.generatePalette(e.target.dataset.type));
    });

    this.elements.hexValue.addEventListener('click', () => this.copyColor('hex'));
    this.elements.rgbValue.addEventListener('click', () => this.copyColor('rgb'));
    this.elements.hslValue.addEventListener('click', () => this.copyColor('hsl'));

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.generate();
      }
    });
  }

  generate() {
    let r, g, b;

    switch (this.mode) {
      case 'pastel':
        r = Math.floor(Math.random() * 128 + 127);
        g = Math.floor(Math.random() * 128 + 127);
        b = Math.floor(Math.random() * 128 + 127);
        break;
      case 'vibrant':
        const hue = Math.random() * 360;
        ({ r, g, b } = this.hslToRgb(hue, 100, 50));
        break;
      case 'dark':
        r = Math.floor(Math.random() * 100);
        g = Math.floor(Math.random() * 100);
        b = Math.floor(Math.random() * 100);
        break;
      case 'light':
        r = Math.floor(Math.random() * 55 + 200);
        g = Math.floor(Math.random() * 55 + 200);
        b = Math.floor(Math.random() * 55 + 200);
        break;
      default:
        r = Math.floor(Math.random() * 256);
        g = Math.floor(Math.random() * 256);
        b = Math.floor(Math.random() * 256);
    }

    this.currentColor = { r, g, b };
    this.addToHistory();
    this.updateDisplay();
    this.updateBackground();
  }

  updateDisplay() {
    const { r, g, b } = this.currentColor;
    const hex = this.rgbToHex(r, g, b);
    const hsl = this.rgbToHsl(r, g, b);

    this.elements.colorPreview.style.backgroundColor = hex;
    this.elements.hexValue.textContent = hex;
    this.elements.rgbValue.textContent = `RGB(${r}, ${g}, ${b})`;
    this.elements.hslValue.textContent = `HSL(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  }

  updateBackground() {
    const { r, g, b } = this.currentColor;
    const hex = this.rgbToHex(r, g, b);
    const darkerHex = this.rgbToHex(
      Math.max(0, r - 50),
      Math.max(0, g - 50),
      Math.max(0, b - 50)
    );
    document.body.style.background = `linear-gradient(135deg, ${hex} 0%, ${darkerHex} 100%)`;
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
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

    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  hslToRgb(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return {
      r: Math.round(255 * f(0)),
      g: Math.round(255 * f(8)),
      b: Math.round(255 * f(4))
    };
  }

  generatePalette(type) {
    const { r, g, b } = this.currentColor;
    const hsl = this.rgbToHsl(r, g, b);
    let colors = [];

    switch (type) {
      case 'complementary':
        colors = [
          this.hslToRgb(hsl.h, hsl.s, hsl.l),
          this.hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l)
        ];
        break;
      case 'analogous':
        colors = [
          this.hslToRgb((hsl.h - 30 + 360) % 360, hsl.s, hsl.l),
          this.hslToRgb(hsl.h, hsl.s, hsl.l),
          this.hslToRgb((hsl.h + 30) % 360, hsl.s, hsl.l)
        ];
        break;
      case 'triadic':
        colors = [
          this.hslToRgb(hsl.h, hsl.s, hsl.l),
          this.hslToRgb((hsl.h + 120) % 360, hsl.s, hsl.l),
          this.hslToRgb((hsl.h + 240) % 360, hsl.s, hsl.l)
        ];
        break;
      case 'random':
        for (let i = 0; i < 5; i++) {
          colors.push({
            r: Math.floor(Math.random() * 256),
            g: Math.floor(Math.random() * 256),
            b: Math.floor(Math.random() * 256)
          });
        }
        break;
    }

    this.renderPalette(colors);
  }

  renderPalette(colors) {
    this.elements.paletteDisplay.innerHTML = colors.map(c => {
      const hex = this.rgbToHex(c.r, c.g, c.b);
      return `<div class="palette-color" style="background:${hex}" data-hex="${hex}" onclick="randomColor.copyHex('${hex}')"></div>`;
    }).join('');
  }

  addToHistory() {
    const hex = this.rgbToHex(this.currentColor.r, this.currentColor.g, this.currentColor.b);
    this.history = this.history.filter(h => h !== hex);
    this.history.unshift(hex);
    if (this.history.length > 20) this.history.pop();
    localStorage.setItem('colorHistory', JSON.stringify(this.history));
    this.renderHistory();
  }

  renderHistory() {
    this.elements.colorHistory.innerHTML = this.history.map(hex =>
      `<div class="history-color" style="background:${hex}" onclick="randomColor.setColor('${hex}')" title="${hex}"></div>`
    ).join('');
  }

  setColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    this.currentColor = { r, g, b };
    this.updateDisplay();
    this.updateBackground();
  }

  copyColor(format) {
    const { r, g, b } = this.currentColor;
    let text;
    switch (format) {
      case 'hex': text = this.rgbToHex(r, g, b); break;
      case 'rgb': text = `rgb(${r}, ${g}, ${b})`; break;
      case 'hsl':
        const hsl = this.rgbToHsl(r, g, b);
        text = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
        break;
    }
    this.copyHex(text);
  }

  copyHex(text) {
    navigator.clipboard.writeText(text).then(() => {
      this.showToast(`복사됨: ${text}`);
    });
  }
}

// 전역 인스턴스 생성
const randomColor = new RandomColorGenerator();
window.RandomColorGenerator = randomColor;

document.addEventListener('DOMContentLoaded', () => randomColor.init());
