/**
 * 색상 추출기 (Color Picker) - ToolBase 기반
 * 이미지에서 색상 추출 및 팔레트 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ColorPicker = class ColorPicker extends ToolBase {
  constructor() {
    super('ColorPicker');
    this.currentColor = { r: 59, g: 130, b: 246 };
    this.palette = [];
    this.canvas = null;
    this.ctx = null;
  }

  init() {
    this.initElements({
      colorPicker: 'colorPicker',
      colorPreview: 'colorPreview',
      redSlider: 'redSlider',
      greenSlider: 'greenSlider',
      blueSlider: 'blueSlider',
      redValue: 'redValue',
      greenValue: 'greenValue',
      blueValue: 'blueValue',
      hexValue: 'hexValue',
      rgbValue: 'rgbValue',
      hslValue: 'hslValue',
      rgbaValue: 'rgbaValue',
      dropZone: 'dropZone',
      imageInput: 'imageInput',
      imageContainer: 'imageContainer',
      imageCanvas: 'imageCanvas',
      paletteGrid: 'paletteGrid',
      paletteActions: 'paletteActions',
      harmonyColors: 'harmonyColors'
    });

    this.canvas = this.elements.imageCanvas;
    this.ctx = this.canvas.getContext('2d');

    this.setupColorPicker();
    this.setupSliders();
    this.setupDropZone();
    this.setupHarmony();
    this.updateDisplay();
    this.updateHarmony('complementary');

    console.log('[ColorPicker] 초기화 완료');
    return this;
  }

  setupColorPicker() {
    this.on(this.elements.colorPicker, 'input', (e) => {
      this.setColorFromHex(e.target.value);
    });
  }

  setupSliders() {
    ['red', 'green', 'blue'].forEach(color => {
      const slider = this.elements[`${color}Slider`];
      this.on(slider, 'input', () => {
        this.currentColor = {
          r: parseInt(this.elements.redSlider.value),
          g: parseInt(this.elements.greenSlider.value),
          b: parseInt(this.elements.blueSlider.value)
        };
        this.updateDisplay();
      });
    });
  }

  setupDropZone() {
    this.on(this.elements.dropZone, 'click', () => this.elements.imageInput.click());
    this.on(this.elements.dropZone, 'dragover', (e) => {
      e.preventDefault();
      this.elements.dropZone.classList.add('drag-over');
    });
    this.on(this.elements.dropZone, 'dragleave', () => {
      this.elements.dropZone.classList.remove('drag-over');
    });
    this.on(this.elements.dropZone, 'drop', (e) => {
      e.preventDefault();
      this.elements.dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) this.loadImage(file);
    });
    this.on(this.elements.imageInput, 'change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadImage(file);
    });
    this.on(this.canvas, 'click', (e) => this.extractColorFromCanvas(e));
  }

  setupHarmony() {
    document.querySelectorAll('.harmony-btn').forEach(btn => {
      this.on(btn, 'click', () => {
        document.querySelectorAll('.harmony-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updateHarmony(btn.dataset.type);
      });
    });
  }

  setColorFromHex(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    this.currentColor = { r, g, b };
    this.updateDisplay();
  }

  updateDisplay() {
    const { r, g, b } = this.currentColor;

    this.elements.colorPreview.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    this.elements.colorPicker.value = this.rgbToHex(r, g, b);

    this.elements.redSlider.value = r;
    this.elements.greenSlider.value = g;
    this.elements.blueSlider.value = b;
    this.elements.redValue.textContent = r;
    this.elements.greenValue.textContent = g;
    this.elements.blueValue.textContent = b;

    const hex = this.rgbToHex(r, g, b);
    const hsl = this.rgbToHsl(r, g, b);

    this.elements.hexValue.value = hex;
    this.elements.rgbValue.value = `rgb(${r}, ${g}, ${b})`;
    this.elements.hslValue.value = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    this.elements.rgbaValue.value = `rgba(${r}, ${g}, ${b}, 1)`;

    const activeType = document.querySelector('.harmony-btn.active')?.dataset.type || 'complementary';
    this.updateHarmony(activeType);
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
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
    h /= 360; s /= 100; l /= 100;
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

    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 500;
        const scale = Math.min(1, maxWidth / img.width);
        this.canvas.width = img.width * scale;
        this.canvas.height = img.height * scale;
        this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        this.elements.dropZone.style.display = 'none';
        this.elements.imageContainer.style.display = 'block';
        this.showToast('이미지 로드 완료!', 'success');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  removeImage() {
    this.elements.dropZone.style.display = 'flex';
    this.elements.imageContainer.style.display = 'none';
    this.elements.imageInput.value = '';
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  extractColorFromCanvas(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pixel = this.ctx.getImageData(x, y, 1, 1).data;

    this.currentColor = { r: pixel[0], g: pixel[1], b: pixel[2] };
    this.updateDisplay();
    this.addToPalette(pixel[0], pixel[1], pixel[2]);
  }

  addToPalette(r, g, b) {
    const hex = this.rgbToHex(r, g, b);
    if (this.palette.includes(hex)) {
      this.showToast('이미 팔레트에 있는 색상입니다.', 'warning');
      return;
    }
    this.palette.push(hex);
    this.renderPalette();
    this.showToast('색상이 팔레트에 추가되었습니다!', 'success');
  }

  renderPalette() {
    if (this.palette.length === 0) {
      this.elements.paletteGrid.innerHTML = '<div class="palette-empty">이미지에서 색상을 클릭하여 추출하세요</div>';
      this.elements.paletteActions.style.display = 'none';
      return;
    }

    this.elements.paletteGrid.innerHTML = this.palette.map((color, index) => `
      <div class="palette-color" style="background-color: ${color};" onclick="colorPicker.selectPaletteColor('${color}')">
        <span class="palette-hex">${color}</span>
        <button class="palette-remove" onclick="event.stopPropagation(); colorPicker.removeFromPalette(${index})">×</button>
      </div>
    `).join('');

    this.elements.paletteActions.style.display = 'flex';
  }

  selectPaletteColor(hex) {
    this.setColorFromHex(hex);
    this.showToast('색상 선택됨: ' + hex, 'success');
  }

  removeFromPalette(index) {
    this.palette.splice(index, 1);
    this.renderPalette();
  }

  clearPalette() {
    this.palette = [];
    this.renderPalette();
  }

  exportPalette() {
    if (this.palette.length === 0) {
      this.showToast('내보낼 색상이 없습니다.', 'warning');
      return;
    }

    const data = {
      name: 'MyMind3 Color Palette',
      colors: this.palette,
      exported: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'palette.json';
    link.click();
    URL.revokeObjectURL(link.href);
    this.showToast('팔레트 내보내기 완료!', 'success');
  }

  updateHarmony(type) {
    const { r, g, b } = this.currentColor;
    const hsl = this.rgbToHsl(r, g, b);
    let colors = [];

    switch (type) {
      case 'complementary':
        colors = [hsl, { h: (hsl.h + 180) % 360, s: hsl.s, l: hsl.l }];
        break;
      case 'analogous':
        colors = [
          { h: (hsl.h - 30 + 360) % 360, s: hsl.s, l: hsl.l },
          hsl,
          { h: (hsl.h + 30) % 360, s: hsl.s, l: hsl.l }
        ];
        break;
      case 'triadic':
        colors = [
          hsl,
          { h: (hsl.h + 120) % 360, s: hsl.s, l: hsl.l },
          { h: (hsl.h + 240) % 360, s: hsl.s, l: hsl.l }
        ];
        break;
      case 'split':
        colors = [
          hsl,
          { h: (hsl.h + 150) % 360, s: hsl.s, l: hsl.l },
          { h: (hsl.h + 210) % 360, s: hsl.s, l: hsl.l }
        ];
        break;
    }

    this.elements.harmonyColors.innerHTML = colors.map(c => {
      const rgb = this.hslToRgb(c.h, c.s, c.l);
      const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
      return `
        <div class="harmony-color" style="background-color: ${hex};" onclick="colorPicker.setColorFromHex('${hex}')">
          <span>${hex}</span>
        </div>
      `;
    }).join('');
  }

  async copyValue(type) {
    const input = this.elements[`${type}Value`];
    try {
      await navigator.clipboard.writeText(input.value);
      this.showToast('복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const colorPicker = new ColorPicker();
window.ColorPicker = colorPicker;

document.addEventListener('DOMContentLoaded', () => colorPicker.init());
