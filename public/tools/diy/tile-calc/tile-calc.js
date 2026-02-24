/**
 * 타일 계산기 - ToolBase 기반
 * 필요한 타일 수량 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TileCalc = class TileCalc extends ToolBase {
  constructor() {
    super('TileCalc');
    this.wastePercent = 10;
  }

  init() {
    this.initElements({
      areaWidth: 'areaWidth',
      areaHeight: 'areaHeight',
      tileWidth: 'tileWidth',
      tileHeight: 'tileHeight',
      groutWidth: 'groutWidth',
      totalArea: 'totalArea',
      tileArea: 'tileArea',
      tilesNeeded: 'tilesNeeded',
      tilesWithWaste: 'tilesWithWaste',
      colCount: 'colCount',
      rowCount: 'rowCount',
      tilePreview: 'tilePreview'
    });

    this.calculate();
    console.log('[TileCalc] 초기화 완료');
    return this;
  }

  setWaste(percent) {
    this.wastePercent = percent;
    document.querySelectorAll('.waste-btn').forEach(btn => {
      btn.classList.toggle('selected', parseInt(btn.dataset.waste) === percent);
    });
    this.calculate();
  }

  calculate() {
    const areaWidth = parseFloat(this.elements.areaWidth.value) || 0;
    const areaHeight = parseFloat(this.elements.areaHeight.value) || 0;
    const tileWidth = parseFloat(this.elements.tileWidth.value) || 30;
    const tileHeight = parseFloat(this.elements.tileHeight.value) || 30;
    const groutWidth = parseFloat(this.elements.groutWidth.value) || 3;

    // 면적 계산 (㎡)
    const totalArea = areaWidth * areaHeight;

    // 타일 면적 (㎠)
    const tileArea = tileWidth * tileHeight;

    // 줄눈 포함 타일 크기 (m)
    const tileWithGroutWidth = (tileWidth + groutWidth / 10) / 100;
    const tileWithGroutHeight = (tileHeight + groutWidth / 10) / 100;

    // 필요 타일 수 계산
    let tilesNeeded = 0;
    let colCount = 0;
    let rowCount = 0;

    if (areaWidth > 0 && areaHeight > 0 && tileWidth > 0 && tileHeight > 0) {
      colCount = Math.ceil(areaWidth / tileWithGroutWidth);
      rowCount = Math.ceil(areaHeight / tileWithGroutHeight);
      tilesNeeded = colCount * rowCount;
    }

    // 여유분 포함
    const tilesWithWaste = Math.ceil(tilesNeeded * (1 + this.wastePercent / 100));

    // 결과 표시
    this.elements.totalArea.textContent = totalArea.toFixed(2);
    this.elements.tileArea.textContent = tileArea.toFixed(0);
    this.elements.tilesNeeded.textContent = tilesNeeded;
    this.elements.tilesWithWaste.textContent = tilesWithWaste;
    this.elements.colCount.textContent = colCount;
    this.elements.rowCount.textContent = rowCount;

    // 미리보기 업데이트
    this.updatePreview(colCount, rowCount);
  }

  updatePreview(cols, rows) {
    const preview = this.elements.tilePreview;

    // 미리보기 최대 크기 제한
    const maxCols = Math.min(cols, 8);
    const maxRows = Math.min(rows, 6);

    if (maxCols <= 0 || maxRows <= 0) {
      preview.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.85rem;">크기를 입력하세요</div>';
      preview.style.gridTemplateColumns = '';
      return;
    }

    const cellSize = Math.min(20, 150 / Math.max(maxCols, maxRows));
    preview.style.gridTemplateColumns = `repeat(${maxCols}, ${cellSize}px)`;

    let html = '';
    for (let i = 0; i < maxRows; i++) {
      for (let j = 0; j < maxCols; j++) {
        html += `<div class="tile-cell" style="width: ${cellSize}px; height: ${cellSize}px;"></div>`;
      }
    }
    preview.innerHTML = html;
  }

  reset() {
    this.elements.areaWidth.value = '';
    this.elements.areaHeight.value = '';
    this.elements.tileWidth.value = 30;
    this.elements.tileHeight.value = 30;
    this.elements.groutWidth.value = 3;
    this.wastePercent = 10;
    document.querySelectorAll('.waste-btn').forEach(btn => {
      btn.classList.toggle('selected', parseInt(btn.dataset.waste) === 10);
    });
    this.calculate();
    this.showToast('초기화되었습니다', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const tileCalc = new TileCalc();
window.TileCalc = tileCalc;

document.addEventListener('DOMContentLoaded', () => tileCalc.init());
