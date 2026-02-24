/**
 * 그라디언트 생성기 - ToolBase 기반
 * CSS 그라디언트를 시각적으로 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var GradientGen = class GradientGen extends ToolBase {
  constructor() {
    super('GradientGen');
    this.type = 'linear';
    this.direction = 'to right';
    this.angle = 90;
    this.stops = [
      { color: '#667eea', position: 0 },
      { color: '#764ba2', position: 100 }
    ];
    this.presetColors = [
      '#ff6b6b', '#ee5a24', '#f39c12', '#f1c40f',
      '#2ecc71', '#1abc9c', '#3498db', '#9b59b6',
      '#e91e63', '#673ab7', '#00bcd4', '#4caf50',
      '#ff9800', '#795548', '#607d8b', '#000000'
    ];
    this.presetGradients = [
      { name: '일몰', stops: [{ color: '#ff512f', position: 0 }, { color: '#f09819', position: 100 }] },
      { name: '바다', stops: [{ color: '#2193b0', position: 0 }, { color: '#6dd5ed', position: 100 }] },
      { name: '보라', stops: [{ color: '#834d9b', position: 0 }, { color: '#d04ed6', position: 100 }] },
      { name: '민트', stops: [{ color: '#11998e', position: 0 }, { color: '#38ef7d', position: 100 }] },
      { name: '핑크', stops: [{ color: '#ee9ca7', position: 0 }, { color: '#ffdde1', position: 100 }] },
      { name: '노을', stops: [{ color: '#fc4a1a', position: 0 }, { color: '#f7b733', position: 100 }] },
      { name: '밤하늘', stops: [{ color: '#0f0c29', position: 0 }, { color: '#302b63', position: 50 }, { color: '#24243e', position: 100 }] },
      { name: '무지개', stops: [{ color: '#ff0000', position: 0 }, { color: '#ff7f00', position: 17 }, { color: '#ffff00', position: 33 }, { color: '#00ff00', position: 50 }, { color: '#0000ff', position: 67 }, { color: '#4b0082', position: 83 }, { color: '#9400d3', position: 100 }] }
    ];
  }

  init() {
    this.initElements({
      presetColors: 'presetColors',
      presetGradients: 'presetGradients',
      colorStops: 'colorStops',
      typeLinear: 'typeLinear',
      typeRadial: 'typeRadial',
      typeConic: 'typeConic',
      directionSection: 'directionSection',
      angleSlider: 'angleSlider',
      angleValue: 'angleValue',
      gradientPreview: 'gradientPreview',
      codeOutput: 'codeOutput'
    });

    this.renderPresetColors();
    this.renderPresetGradients();
    this.renderStops();
    this.update();
    console.log('[GradientGen] 초기화 완료');
    return this;
  }

  renderPresetColors() {
    this.elements.presetColors.innerHTML = this.presetColors.map(color =>
      `<div class="preset-color" style="background: ${color};" onclick="gradientGen.addColorFromPreset('${color}')" title="${color}"></div>`
    ).join('');
  }

  renderPresetGradients() {
    this.elements.presetGradients.innerHTML = this.presetGradients.map((preset, index) => {
      const gradient = this.buildGradientString(preset.stops);
      return `
        <div style="height: 60px; border-radius: 8px; cursor: pointer; border: 2px solid var(--tools-border); background: ${gradient};"
             onclick="gradientGen.applyPreset(${index})" title="${preset.name}"></div>
      `;
    }).join('');
  }

  renderStops() {
    this.elements.colorStops.innerHTML = this.stops.map((stop, index) => `
      <div class="color-stop">
        <input type="color" value="${stop.color}" onchange="gradientGen.updateStopColor(${index}, this.value)">
        <input type="range" min="0" max="100" value="${stop.position}" oninput="gradientGen.updateStopPosition(${index}, this.value)">
        <span class="color-stop-value">${stop.position}%</span>
        ${this.stops.length > 2 ? `<button class="color-stop-remove" onclick="gradientGen.removeStop(${index})">×</button>` : ''}
      </div>
    `).join('');
  }

  setType(type) {
    this.type = type;
    this.elements.typeLinear.classList.toggle('active', type === 'linear');
    this.elements.typeRadial.classList.toggle('active', type === 'radial');
    this.elements.typeConic.classList.toggle('active', type === 'conic');
    this.elements.directionSection.style.display = type === 'linear' ? 'block' : 'none';
    this.update();
  }

  setDirection(direction) {
    this.direction = direction;
    document.querySelectorAll('.direction-btn').forEach(btn => {
      btn.classList.toggle('active', btn.title === this.getDirectionTitle(direction));
    });

    const angleMap = {
      'to top': 0, 'to top right': 45, 'to right': 90, 'to bottom right': 135,
      'to bottom': 180, 'to bottom left': 225, 'to left': 270, 'to top left': 315
    };
    if (angleMap[direction] !== undefined) {
      this.angle = angleMap[direction];
      this.elements.angleSlider.value = this.angle;
      this.elements.angleValue.textContent = this.angle + '°';
    }

    this.update();
  }

  getDirectionTitle(direction) {
    const map = {
      'to top': '위로', 'to top right': '우상단', 'to right': '오른쪽', 'to bottom right': '우하단',
      'to bottom': '아래로', 'to bottom left': '좌하단', 'to left': '왼쪽', 'to top left': '좌상단'
    };
    return map[direction] || '';
  }

  setAngle(angle) {
    this.angle = parseInt(angle);
    this.elements.angleValue.textContent = this.angle + '°';
    document.querySelectorAll('.direction-btn').forEach(btn => btn.classList.remove('active'));
    this.update();
  }

  addStop() {
    const lastColor = this.stops[this.stops.length - 1].color;
    const newColor = this.shiftColor(lastColor, 30);
    this.stops.push({ color: newColor, position: 100 });
    this.redistributePositions();
    this.renderStops();
    this.update();
  }

  addColorFromPreset(color) {
    this.stops.push({ color, position: 100 });
    this.redistributePositions();
    this.renderStops();
    this.update();
    this.showToast('색상 추가됨', 'success');
  }

  redistributePositions() {
    const count = this.stops.length;
    this.stops.forEach((stop, index) => {
      stop.position = Math.round((index / (count - 1)) * 100);
    });
  }

  removeStop(index) {
    if (this.stops.length > 2) {
      this.stops.splice(index, 1);
      this.renderStops();
      this.update();
    }
  }

  updateStopColor(index, color) {
    this.stops[index].color = color;
    this.update();
  }

  updateStopPosition(index, position) {
    this.stops[index].position = parseInt(position);
    this.renderStops();
    this.update();
  }

  applyPreset(index) {
    const preset = this.presetGradients[index];
    this.stops = JSON.parse(JSON.stringify(preset.stops));
    this.renderStops();
    this.update();
    this.showToast(`${preset.name} 적용됨`, 'success');
  }

  buildGradientString(stops = this.stops) {
    const sortedStops = [...stops].sort((a, b) => a.position - b.position);
    const colorStops = sortedStops.map(s => `${s.color} ${s.position}%`).join(', ');

    switch (this.type) {
      case 'radial':
        return `radial-gradient(circle, ${colorStops})`;
      case 'conic':
        return `conic-gradient(from 0deg, ${colorStops})`;
      default:
        return `linear-gradient(${this.angle}deg, ${colorStops})`;
    }
  }

  update() {
    const gradient = this.buildGradientString();
    this.elements.gradientPreview.style.background = gradient;
    this.elements.codeOutput.textContent = `background: ${gradient};`;
  }

  randomize() {
    const count = 2 + Math.floor(Math.random() * 3);
    this.stops = [];

    for (let i = 0; i < count; i++) {
      this.stops.push({
        color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
        position: Math.round((i / (count - 1)) * 100)
      });
    }

    this.angle = Math.floor(Math.random() * 360);
    this.elements.angleSlider.value = this.angle;
    this.elements.angleValue.textContent = this.angle + '°';

    this.renderStops();
    this.update();
    this.showToast('랜덤 그라디언트 생성됨', 'success');
  }

  async copyCode() {
    const code = this.elements.codeOutput.textContent;
    try {
      await navigator.clipboard.writeText(code);
      this.showToast('CSS 코드가 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  shiftColor(hex, degrees) {
    const rgb = this.hexToRgb(hex);
    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
    hsl.h = (hsl.h + degrees) % 360;
    const newRgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
    return this.rgbToHex(newRgb.r, newRgb.g, newRgb.b);
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
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
    return { h: h * 360, s, l };
  }

  hslToRgb(h, s, l) {
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
    return { r: r * 255, g: g * 255, b: b * 255 };
  }

  reset() {
    this.type = 'linear';
    this.direction = 'to right';
    this.angle = 90;
    this.stops = [
      { color: '#667eea', position: 0 },
      { color: '#764ba2', position: 100 }
    ];

    this.elements.typeLinear.classList.add('active');
    this.elements.typeRadial.classList.remove('active');
    this.elements.typeConic.classList.remove('active');
    this.elements.directionSection.style.display = 'block';
    this.elements.angleSlider.value = 90;
    this.elements.angleValue.textContent = '90°';

    this.renderStops();
    this.update();
    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const gradientGen = new GradientGen();
window.GradientGen = gradientGen;

document.addEventListener('DOMContentLoaded', () => gradientGen.init());
