/**
 * Box Shadow 생성기 - ToolBase 기반
 * CSS box-shadow를 시각적으로 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BoxShadowGen = class BoxShadowGen extends ToolBase {
  constructor() {
    super('BoxShadowGen');
    this.layers = [];
    this.presets = [
      { name: '소프트', shadows: [{ x: 0, y: 4, blur: 6, spread: -1, color: '#00000020', inset: false }] },
      { name: '미디엄', shadows: [{ x: 0, y: 10, blur: 15, spread: -3, color: '#00000030', inset: false }] },
      { name: '라지', shadows: [{ x: 0, y: 25, blur: 50, spread: -12, color: '#00000025', inset: false }] },
      { name: '플랫', shadows: [
        { x: 0, y: 1, blur: 3, spread: 0, color: '#0000001a', inset: false },
        { x: 0, y: 1, blur: 2, spread: 0, color: '#0000000f', inset: false }
      ]},
      { name: '딥', shadows: [
        { x: 0, y: 10, blur: 20, spread: 0, color: '#00000030', inset: false },
        { x: 0, y: 6, blur: 6, spread: 0, color: '#00000020', inset: false }
      ]},
      { name: '네온', shadows: [
        { x: 0, y: 0, blur: 20, spread: 5, color: '#3b82f640', inset: false },
        { x: 0, y: 0, blur: 40, spread: 10, color: '#3b82f620', inset: false }
      ]},
      { name: '인셋', shadows: [{ x: 0, y: 2, blur: 4, spread: 0, color: '#00000020', inset: true }] },
      { name: '레이어드', shadows: [
        { x: 0, y: 2, blur: 4, spread: 0, color: '#0000001a', inset: false },
        { x: 0, y: 4, blur: 8, spread: 0, color: '#00000014', inset: false },
        { x: 0, y: 8, blur: 16, spread: 0, color: '#0000000f', inset: false }
      ]}
    ];
  }

  init() {
    this.initElements({
      shadowLayers: 'shadowLayers',
      presetsGrid: 'presetsGrid',
      previewArea: 'previewArea',
      previewBox: 'previewBox',
      bgColor: 'bgColor',
      boxColor: 'boxColor',
      cssCode: 'cssCode'
    });

    this.addLayer();
    this.renderPresets();
    this.updatePreview();

    console.log('[BoxShadowGen] 초기화 완료');
    return this;
  }

  addLayer() {
    const layer = {
      id: Date.now(),
      x: 0,
      y: 4,
      blur: 10,
      spread: 0,
      color: '#000000',
      opacity: 20,
      inset: false
    };
    this.layers.push(layer);
    this.renderLayers();
    this.updatePreview();
  }

  removeLayer(id) {
    if (this.layers.length <= 1) {
      this.showToast('최소 1개의 레이어가 필요합니다.', 'warning');
      return;
    }
    this.layers = this.layers.filter(l => l.id !== id);
    this.renderLayers();
    this.updatePreview();
  }

  renderLayers() {
    this.elements.shadowLayers.innerHTML = this.layers.map((layer, index) => `
      <div class="shadow-layer" data-id="${layer.id}">
        <div class="layer-header">
          <span>레이어 ${index + 1}</span>
          <button class="layer-remove" onclick="boxShadowGen.removeLayer(${layer.id})">×</button>
        </div>
        <div class="layer-controls">
          <div class="control-row">
            <div class="control-item">
              <label>X 오프셋</label>
              <input type="range" min="-50" max="50" value="${layer.x}"
                onchange="boxShadowGen.updateLayer(${layer.id}, 'x', this.value)">
              <span>${layer.x}px</span>
            </div>
            <div class="control-item">
              <label>Y 오프셋</label>
              <input type="range" min="-50" max="50" value="${layer.y}"
                onchange="boxShadowGen.updateLayer(${layer.id}, 'y', this.value)">
              <span>${layer.y}px</span>
            </div>
          </div>
          <div class="control-row">
            <div class="control-item">
              <label>블러</label>
              <input type="range" min="0" max="100" value="${layer.blur}"
                onchange="boxShadowGen.updateLayer(${layer.id}, 'blur', this.value)">
              <span>${layer.blur}px</span>
            </div>
            <div class="control-item">
              <label>스프레드</label>
              <input type="range" min="-50" max="50" value="${layer.spread}"
                onchange="boxShadowGen.updateLayer(${layer.id}, 'spread', this.value)">
              <span>${layer.spread}px</span>
            </div>
          </div>
          <div class="control-row">
            <div class="control-item">
              <label>색상</label>
              <input type="color" value="${layer.color}"
                onchange="boxShadowGen.updateLayer(${layer.id}, 'color', this.value)">
            </div>
            <div class="control-item">
              <label>불투명도</label>
              <input type="range" min="0" max="100" value="${layer.opacity}"
                onchange="boxShadowGen.updateLayer(${layer.id}, 'opacity', this.value)">
              <span>${layer.opacity}%</span>
            </div>
          </div>
          <div class="control-row">
            <label class="checkbox-label">
              <input type="checkbox" ${layer.inset ? 'checked' : ''}
                onchange="boxShadowGen.updateLayer(${layer.id}, 'inset', this.checked)">
              Inset (내부 그림자)
            </label>
          </div>
        </div>
      </div>
    `).join('');
  }

  updateLayer(id, prop, value) {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      if (prop === 'inset') {
        layer[prop] = value;
      } else if (prop === 'color') {
        layer[prop] = value;
      } else {
        layer[prop] = parseInt(value);
      }
      this.renderLayers();
      this.updatePreview();
    }
  }

  renderPresets() {
    this.elements.presetsGrid.innerHTML = this.presets.map((preset, index) => `
      <button class="preset-btn" onclick="boxShadowGen.applyPreset(${index})">
        ${preset.name}
      </button>
    `).join('');
  }

  applyPreset(index) {
    const preset = this.presets[index];
    this.layers = preset.shadows.map((s, i) => ({
      id: Date.now() + i,
      x: s.x,
      y: s.y,
      blur: s.blur,
      spread: s.spread,
      color: s.color.slice(0, 7),
      opacity: parseInt(s.color.slice(7) || 'ff', 16) / 255 * 100,
      inset: s.inset
    }));
    this.renderLayers();
    this.updatePreview();
    this.showToast(`${preset.name} 프리셋 적용됨`, 'success');
  }

  updateBgColor() {
    const color = this.elements.bgColor.value;
    this.elements.previewArea.style.backgroundColor = color;
  }

  updateBoxColor() {
    const color = this.elements.boxColor.value;
    this.elements.previewBox.style.backgroundColor = color;
  }

  updatePreview() {
    const shadowStr = this.generateShadowString();
    this.elements.previewBox.style.boxShadow = shadowStr;
    this.generateCode(shadowStr);
  }

  generateShadowString() {
    return this.layers.map(layer => {
      const hex = layer.color;
      const alpha = Math.round(layer.opacity * 2.55).toString(16).padStart(2, '0');
      const color = hex + alpha;
      const inset = layer.inset ? 'inset ' : '';
      return `${inset}${layer.x}px ${layer.y}px ${layer.blur}px ${layer.spread}px ${color}`;
    }).join(', ');
  }

  generateCode(shadowStr) {
    const code = `.element {
  box-shadow: ${shadowStr};
  -webkit-box-shadow: ${shadowStr};
  -moz-box-shadow: ${shadowStr};
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
const boxShadowGen = new BoxShadowGen();
window.BoxShadowGen = boxShadowGen;

document.addEventListener('DOMContentLoaded', () => boxShadowGen.init());
