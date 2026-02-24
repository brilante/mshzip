/**
 * 테두리 둥글기 생성기 - ToolBase 기반
 * CSS border-radius 값을 시각적으로 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BorderRadius = class BorderRadius extends ToolBase {
  constructor() {
    super('BorderRadius');
    this.unit = 'px';
    this.linked = true;
    this.presets = [
      { name: '사각형', values: [0, 0, 0, 0] },
      { name: '둥근 모서리', values: [8, 8, 8, 8] },
      { name: '더 둥근', values: [16, 16, 16, 16] },
      { name: '많이 둥근', values: [24, 24, 24, 24] },
      { name: '원형', values: [50, 50, 50, 50] },
      { name: '알약 (가로)', values: [100, 100, 100, 100] },
      { name: '좌상단만', values: [30, 0, 0, 0] },
      { name: '우상단만', values: [0, 30, 0, 0] },
      { name: '좌하단만', values: [0, 0, 0, 30] },
      { name: '우하단만', values: [0, 0, 30, 0] },
      { name: '상단만', values: [30, 30, 0, 0] },
      { name: '하단만', values: [0, 0, 30, 30] },
      { name: '좌측만', values: [30, 0, 0, 30] },
      { name: '우측만', values: [0, 30, 30, 0] },
      { name: '대각선 1', values: [30, 0, 30, 0] },
      { name: '대각선 2', values: [0, 30, 0, 30] }
    ];
  }

  init() {
    this.initElements({
      previewBox: 'previewBox',
      presetGrid: 'presetGrid',
      topLeft: 'topLeft',
      topRight: 'topRight',
      bottomRight: 'bottomRight',
      bottomLeft: 'bottomLeft',
      allCorners: 'allCorners',
      linkCorners: 'linkCorners',
      unitPx: 'unitPx',
      unitPercent: 'unitPercent',
      allCornersSlider: 'allCornersSlider',
      individualControls: 'individualControls',
      topLeftValue: 'topLeftValue',
      topRightValue: 'topRightValue',
      bottomLeftValue: 'bottomLeftValue',
      bottomRightValue: 'bottomRightValue',
      allCornersValue: 'allCornersValue',
      codeValue: 'codeValue'
    });

    this.renderPresets();
    this.update();
    console.log('[BorderRadius] 초기화 완료');
    return this;
  }

  renderPresets() {
    this.elements.presetGrid.innerHTML = this.presets.map((preset, index) => {
      const radius = preset.values.map(v => v + '%').join(' ');
      return `
        <div class="preset-item" onclick="borderRadius.applyPreset(${index})" title="${preset.name}">
          <div class="preset-inner" style="border-radius: ${radius};"></div>
        </div>
      `;
    }).join('');
  }

  applyPreset(index) {
    const preset = this.presets[index];
    const [tl, tr, br, bl] = preset.values;

    this.elements.topLeft.value = tl;
    this.elements.topRight.value = tr;
    this.elements.bottomRight.value = br;
    this.elements.bottomLeft.value = bl;
    this.elements.allCorners.value = tl;

    if (tl !== tr || tr !== br || br !== bl) {
      this.elements.linkCorners.checked = false;
      this.toggleLink();
    }

    this.update();
    this.showToast(`${preset.name} 적용됨`, 'success');
  }

  setUnit(unit) {
    this.unit = unit;
    this.elements.unitPx.classList.toggle('active', unit === 'px');
    this.elements.unitPercent.classList.toggle('active', unit === '%');
    this.update();
  }

  toggleLink() {
    this.linked = this.elements.linkCorners.checked;
    this.elements.allCornersSlider.style.display = this.linked ? 'flex' : 'none';
    this.elements.individualControls.style.display = this.linked ? 'none' : 'grid';
    this.update();
  }

  updateAll(value) {
    this.elements.topLeft.value = value;
    this.elements.topRight.value = value;
    this.elements.bottomLeft.value = value;
    this.elements.bottomRight.value = value;
    this.update();
  }

  update() {
    const tl = parseInt(this.elements.topLeft.value);
    const tr = parseInt(this.elements.topRight.value);
    const bl = parseInt(this.elements.bottomLeft.value);
    const br = parseInt(this.elements.bottomRight.value);
    const unit = this.unit;

    this.elements.topLeftValue.textContent = tl + unit;
    this.elements.topRightValue.textContent = tr + unit;
    this.elements.bottomLeftValue.textContent = bl + unit;
    this.elements.bottomRightValue.textContent = br + unit;
    this.elements.allCornersValue.textContent = tl + unit;

    const borderRadius = `${tl}${unit} ${tr}${unit} ${br}${unit} ${bl}${unit}`;
    this.elements.previewBox.style.borderRadius = borderRadius;

    this.updateCode(tl, tr, br, bl, unit);
  }

  updateCode(tl, tr, br, bl, unit) {
    const codeEl = this.elements.codeValue;

    if (tl === tr && tr === br && br === bl) {
      codeEl.textContent = `${tl}${unit}`;
    } else if (tl === br && tr === bl) {
      codeEl.textContent = `${tl}${unit} ${tr}${unit}`;
    } else if (tr === bl) {
      codeEl.textContent = `${tl}${unit} ${tr}${unit} ${br}${unit}`;
    } else {
      codeEl.textContent = `${tl}${unit} ${tr}${unit} ${br}${unit} ${bl}${unit}`;
    }
  }

  async copyCode() {
    const code = `border-radius: ${this.elements.codeValue.textContent};`;
    try {
      await navigator.clipboard.writeText(code);
      this.showToast('CSS 코드가 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  reset() {
    this.elements.topLeft.value = 20;
    this.elements.topRight.value = 20;
    this.elements.bottomLeft.value = 20;
    this.elements.bottomRight.value = 20;
    this.elements.allCorners.value = 20;
    this.elements.linkCorners.checked = true;
    this.linked = true;
    this.unit = 'px';
    this.elements.unitPx.classList.add('active');
    this.elements.unitPercent.classList.remove('active');
    this.toggleLink();
    this.update();
    this.showToast('초기화되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const borderRadius = new BorderRadius();
window.BorderRadius = borderRadius;

document.addEventListener('DOMContentLoaded', () => borderRadius.init());
