/**
 * CSS 그림자 생성기 - ToolBase 기반
 * box-shadow와 text-shadow 시각적 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ShadowGen = class ShadowGen extends ToolBase {
  constructor() {
    super('ShadowGen');
    this.type = 'box';
    this.layers = [
      { offsetX: 5, offsetY: 5, blur: 15, spread: 0, color: '#000000', opacity: 25, inset: false }
    ];
    this.presets = [
      { name: '기본', layers: [{ offsetX: 2, offsetY: 2, blur: 5, spread: 0, color: '#000000', opacity: 20, inset: false }] },
      { name: '부드러운', layers: [{ offsetX: 0, offsetY: 4, blur: 20, spread: 0, color: '#000000', opacity: 15, inset: false }] },
      { name: '떠있는', layers: [{ offsetX: 0, offsetY: 10, blur: 30, spread: -5, color: '#000000', opacity: 25, inset: false }] },
      { name: '깊은', layers: [{ offsetX: 0, offsetY: 20, blur: 50, spread: -10, color: '#000000', opacity: 30, inset: false }] },
      { name: '내부', layers: [{ offsetX: 0, offsetY: 0, blur: 10, spread: 0, color: '#000000', opacity: 30, inset: true }] },
      { name: '네온', layers: [{ offsetX: 0, offsetY: 0, blur: 20, spread: 5, color: '#00ff00', opacity: 80, inset: false }] },
      { name: '레이어드', layers: [
        { offsetX: 0, offsetY: 2, blur: 4, spread: 0, color: '#000000', opacity: 10, inset: false },
        { offsetX: 0, offsetY: 8, blur: 16, spread: 0, color: '#000000', opacity: 10, inset: false },
        { offsetX: 0, offsetY: 16, blur: 32, spread: 0, color: '#000000', opacity: 10, inset: false }
      ]},
      { name: '날카로운', layers: [{ offsetX: 8, offsetY: 8, blur: 0, spread: 0, color: '#000000', opacity: 100, inset: false }] }
    ];
  }

  init() {
    this.initElements({
      typeBox: 'typeBox',
      typeText: 'typeText',
      previewBox: 'previewBox',
      previewText: 'previewText',
      shadowLayers: 'shadowLayers',
      presetGrid: 'presetGrid',
      codeOutput: 'codeOutput'
    });

    this.renderLayers();
    this.renderPresets();
    this.update();
    console.log('[ShadowGen] 초기화 완료');
    return this;
  }

  setType(type) {
    this.type = type;
    this.elements.typeBox.classList.toggle('active', type === 'box');
    this.elements.typeText.classList.toggle('active', type === 'text');

    if (type === 'text') {
      this.elements.previewBox.style.background = 'transparent';
      this.elements.previewBox.style.boxShadow = 'none';
      this.elements.previewText.style.display = 'block';
    } else {
      this.elements.previewBox.style.background = 'white';
      this.elements.previewText.style.display = 'none';
    }

    this.renderLayers();
    this.update();
  }

  renderLayers() {
    this.elements.shadowLayers.innerHTML = this.layers.map((layer, index) => `
      <div class="shadow-layer">
        <div class="shadow-layer-header">
          <span class="shadow-layer-title">레이어 ${index + 1}</span>
          ${this.layers.length > 1 ? `<button class="shadow-layer-remove" onclick="shadowGen.removeLayer(${index})">×</button>` : ''}
        </div>

        <div class="shadow-control">
          <div class="shadow-control-label">
            <span class="shadow-control-name">수평 오프셋 (X)</span>
            <span class="shadow-control-value" id="offsetX-${index}">${layer.offsetX}px</span>
          </div>
          <input type="range" min="-50" max="50" value="${layer.offsetX}"
                 oninput="shadowGen.updateLayer(${index}, 'offsetX', this.value)" style="width: 100%;">
        </div>

        <div class="shadow-control">
          <div class="shadow-control-label">
            <span class="shadow-control-name">수직 오프셋 (Y)</span>
            <span class="shadow-control-value" id="offsetY-${index}">${layer.offsetY}px</span>
          </div>
          <input type="range" min="-50" max="50" value="${layer.offsetY}"
                 oninput="shadowGen.updateLayer(${index}, 'offsetY', this.value)" style="width: 100%;">
        </div>

        <div class="shadow-control">
          <div class="shadow-control-label">
            <span class="shadow-control-name">흐림 (Blur)</span>
            <span class="shadow-control-value" id="blur-${index}">${layer.blur}px</span>
          </div>
          <input type="range" min="0" max="100" value="${layer.blur}"
                 oninput="shadowGen.updateLayer(${index}, 'blur', this.value)" style="width: 100%;">
        </div>

        ${this.type === 'box' ? `
        <div class="shadow-control">
          <div class="shadow-control-label">
            <span class="shadow-control-name">확산 (Spread)</span>
            <span class="shadow-control-value" id="spread-${index}">${layer.spread}px</span>
          </div>
          <input type="range" min="-30" max="30" value="${layer.spread}"
                 oninput="shadowGen.updateLayer(${index}, 'spread', this.value)" style="width: 100%;">
        </div>
        ` : ''}

        <div class="shadow-control">
          <div class="shadow-control-label">
            <span class="shadow-control-name">색상 & 불투명도</span>
            <span class="shadow-control-value" id="opacity-${index}">${layer.opacity}%</span>
          </div>
          <div class="color-input-wrapper">
            <input type="color" value="${layer.color}"
                   onchange="shadowGen.updateLayer(${index}, 'color', this.value)">
            <input type="range" min="0" max="100" value="${layer.opacity}" style="flex: 1;"
                   oninput="shadowGen.updateLayer(${index}, 'opacity', this.value)">
          </div>
        </div>

        ${this.type === 'box' ? `
        <div style="margin-top: 12px;">
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" ${layer.inset ? 'checked' : ''}
                   onchange="shadowGen.updateLayer(${index}, 'inset', this.checked)">
            <span>내부 그림자 (inset)</span>
          </label>
        </div>
        ` : ''}
      </div>
    `).join('');
  }

  renderPresets() {
    this.elements.presetGrid.innerHTML = this.presets.map((preset, index) => {
      const shadow = this.buildShadowString(preset.layers, 'box');
      return `
        <div class="preset-item" onclick="shadowGen.applyPreset(${index})" title="${preset.name}">
          <div class="preset-inner" style="box-shadow: ${shadow};"></div>
        </div>
      `;
    }).join('');
  }

  addLayer() {
    this.layers.push({
      offsetX: 0,
      offsetY: 5,
      blur: 10,
      spread: 0,
      color: '#000000',
      opacity: 20,
      inset: false
    });
    this.renderLayers();
    this.update();
  }

  removeLayer(index) {
    if (this.layers.length > 1) {
      this.layers.splice(index, 1);
      this.renderLayers();
      this.update();
    }
  }

  updateLayer(index, prop, value) {
    if (prop === 'inset') {
      this.layers[index][prop] = value;
    } else if (prop === 'color') {
      this.layers[index][prop] = value;
    } else {
      this.layers[index][prop] = parseInt(value);
    }

    const valueEl = document.getElementById(`${prop}-${index}`);
    if (valueEl) {
      if (prop === 'opacity') {
        valueEl.textContent = value + '%';
      } else if (prop !== 'color' && prop !== 'inset') {
        valueEl.textContent = value + 'px';
      }
    }

    this.update();
  }

  applyPreset(index) {
    const preset = this.presets[index];
    this.layers = JSON.parse(JSON.stringify(preset.layers));
    this.renderLayers();
    this.update();
    this.showToast(`${preset.name} 적용됨`, 'success');
  }

  buildShadowString(layers = this.layers, type = this.type) {
    return layers.map(layer => {
      const rgba = this.hexToRgba(layer.color, layer.opacity / 100);

      if (type === 'text') {
        return `${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${rgba}`;
      } else {
        const inset = layer.inset ? 'inset ' : '';
        return `${inset}${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${layer.spread}px ${rgba}`;
      }
    }).join(', ');
  }

  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  update() {
    const shadow = this.buildShadowString();

    if (this.type === 'text') {
      this.elements.previewText.style.textShadow = shadow;
      this.elements.codeOutput.textContent = `text-shadow: ${shadow};`;
    } else {
      this.elements.previewBox.style.boxShadow = shadow;
      this.elements.codeOutput.textContent = `box-shadow: ${shadow};`;
    }
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

  reset() {
    this.type = 'box';
    this.layers = [
      { offsetX: 5, offsetY: 5, blur: 15, spread: 0, color: '#000000', opacity: 25, inset: false }
    ];

    this.elements.typeBox.classList.add('active');
    this.elements.typeText.classList.remove('active');
    this.elements.previewBox.style.background = 'white';
    this.elements.previewText.style.display = 'none';

    this.renderLayers();
    this.update();
    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const shadowGen = new ShadowGen();
window.ShadowGen = shadowGen;

document.addEventListener('DOMContentLoaded', () => shadowGen.init());
