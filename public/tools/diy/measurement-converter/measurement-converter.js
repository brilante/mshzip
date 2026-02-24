/**
 * 단위 변환기 - ToolBase 기반
 * DIY/건축 단위 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class MeasurementConverter extends ToolBase {
  constructor() {
    super('MeasurementConverter');
    this.currentCategory = 'length';
    this.units = {
      length: {
        mm: { name: '밀리미터 (mm)', factor: 0.001 },
        cm: { name: '센티미터 (cm)', factor: 0.01 },
        m: { name: '미터 (m)', factor: 1 },
        km: { name: '킬로미터 (km)', factor: 1000 },
        inch: { name: '인치 (in)', factor: 0.0254 },
        ft: { name: '피트 (ft)', factor: 0.3048 },
        yd: { name: '야드 (yd)', factor: 0.9144 },
        ja: { name: '자 (尺)', factor: 0.303 },
        chi: { name: '치 (寸)', factor: 0.0303 }
      },
      area: {
        'mm²': { name: '제곱밀리미터 (mm²)', factor: 0.000001 },
        'cm²': { name: '제곱센티미터 (cm²)', factor: 0.0001 },
        'm²': { name: '제곱미터 (m²)', factor: 1 },
        'a': { name: '아르 (a)', factor: 100 },
        'ha': { name: '헥타르 (ha)', factor: 10000 },
        'ft²': { name: '제곱피트 (ft²)', factor: 0.0929 },
        'yd²': { name: '제곱야드 (yd²)', factor: 0.8361 },
        'pyeong': { name: '평', factor: 3.3058 }
      },
      volume: {
        'ml': { name: '밀리리터 (ml)', factor: 0.000001 },
        'L': { name: '리터 (L)', factor: 0.001 },
        'm³': { name: '세제곱미터 (m³)', factor: 1 },
        'cm³': { name: '세제곱센티미터 (cm³)', factor: 0.000001 },
        'gal': { name: '갤런 (US)', factor: 0.003785 },
        'ft³': { name: '세제곱피트 (ft³)', factor: 0.0283 },
        'mal': { name: '말', factor: 0.018 },
        'doe': { name: '되', factor: 0.0018 }
      },
      weight: {
        'mg': { name: '밀리그램 (mg)', factor: 0.000001 },
        'g': { name: '그램 (g)', factor: 0.001 },
        'kg': { name: '킬로그램 (kg)', factor: 1 },
        't': { name: '톤 (t)', factor: 1000 },
        'oz': { name: '온스 (oz)', factor: 0.0283 },
        'lb': { name: '파운드 (lb)', factor: 0.4536 },
        'geun': { name: '근', factor: 0.6 },
        'don': { name: '돈', factor: 0.00375 }
      }
    };
    this.commonConversions = {
      length: [
        { from: 'm', to: 'ft', label: '미터 → 피트' },
        { from: 'cm', to: 'inch', label: 'cm → 인치' },
        { from: 'ja', to: 'cm', label: '자 → cm' },
        { from: 'km', to: 'm', label: 'km → m' }
      ],
      area: [
        { from: 'm²', to: 'pyeong', label: '㎡ → 평' },
        { from: 'pyeong', to: 'm²', label: '평 → ㎡' },
        { from: 'm²', to: 'ft²', label: '㎡ → ft²' },
        { from: 'ha', to: 'pyeong', label: '헥타르 → 평' }
      ],
      volume: [
        { from: 'L', to: 'ml', label: '리터 → ml' },
        { from: 'm³', to: 'L', label: '㎥ → 리터' },
        { from: 'gal', to: 'L', label: '갤런 → 리터' },
        { from: 'mal', to: 'L', label: '말 → 리터' }
      ],
      weight: [
        { from: 'kg', to: 'lb', label: 'kg → 파운드' },
        { from: 'geun', to: 'kg', label: '근 → kg' },
        { from: 't', to: 'kg', label: '톤 → kg' },
        { from: 'g', to: 'oz', label: 'g → 온스' }
      ]
    };
  }

  init() {
    this.initElements({
      inputValue: 'inputValue',
      outputValue: 'outputValue',
      fromUnit: 'fromUnit',
      toUnit: 'toUnit',
      commonGrid: 'commonGrid',
      resultList: 'resultList'
    });

    this.setCategory('length');
    console.log('[MeasurementConverter] 초기화 완료');
    return this;
  }

  setCategory(category) {
    this.currentCategory = category;

    document.querySelectorAll('.category-tab').forEach(tab => {
      const labels = { length: '길이', area: '면적', volume: '부피', weight: '무게' };
      tab.classList.toggle('active', tab.textContent.includes(labels[category]));
    });

    this.renderUnits();
    this.renderCommon();
    this.convert();
  }

  renderUnits() {
    const units = this.units[this.currentCategory];
    const fromSelect = this.elements.fromUnit;
    const toSelect = this.elements.toUnit;

    const keys = Object.keys(units);

    fromSelect.innerHTML = keys.map(key =>
      `<option value="${key}">${units[key].name}</option>`
    ).join('');

    toSelect.innerHTML = keys.map(key =>
      `<option value="${key}">${units[key].name}</option>`
    ).join('');

    // 기본 선택
    if (keys.length >= 2) {
      toSelect.value = keys[1];
    }
  }

  renderCommon() {
    const common = this.commonConversions[this.currentCategory];
    this.elements.commonGrid.innerHTML = common.map(c => `
      <div class="common-item" onclick="measurementConverter.applyCommon('${c.from}', '${c.to}')">
        ${c.label}
      </div>
    `).join('');
  }

  applyCommon(from, to) {
    this.elements.fromUnit.value = from;
    this.elements.toUnit.value = to;
    this.convert();
  }

  convert() {
    const value = parseFloat(this.elements.inputValue.value) || 0;
    const fromUnit = this.elements.fromUnit.value;
    const toUnit = this.elements.toUnit.value;

    const units = this.units[this.currentCategory];

    // 기본 단위로 변환 후 목표 단위로 변환
    const baseValue = value * units[fromUnit].factor;
    const result = baseValue / units[toUnit].factor;

    this.elements.outputValue.value = result.toPrecision(8).replace(/\.?0+$/, '');

    // 모든 단위로 변환 결과 표시
    this.renderAllResults(baseValue);
  }

  renderAllResults(baseValue) {
    const units = this.units[this.currentCategory];

    if (baseValue === 0) {
      this.elements.resultList.innerHTML = '';
      return;
    }

    this.elements.resultList.innerHTML = Object.entries(units).map(([key, unit]) => {
      const value = baseValue / unit.factor;
      const formatted = value < 0.01 || value > 1000000
        ? value.toExponential(4)
        : value.toPrecision(6).replace(/\.?0+$/, '');

      return `
        <div class="result-item" onclick="measurementConverter.copyResult('${formatted} ${key}')">
          <span class="result-value">${formatted}</span>
          <span class="result-unit">${unit.name}</span>
        </div>
      `;
    }).join('');
  }

  swap() {
    const fromSelect = this.elements.fromUnit;
    const toSelect = this.elements.toUnit;
    const inputValue = this.elements.inputValue;
    const outputValue = this.elements.outputValue;

    const tempUnit = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = tempUnit;

    inputValue.value = outputValue.value;

    this.convert();
  }

  async copyResult(text) {
    try {
      await navigator.clipboard.writeText(text);
      this.showToast(`${text} 복사됨`, 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const measurementConverter = new MeasurementConverter();
window.MeasurementConverter = measurementConverter;

document.addEventListener('DOMContentLoaded', () => measurementConverter.init());
