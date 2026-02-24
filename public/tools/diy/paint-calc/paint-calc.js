/**
 * 페인트 계산기 - ToolBase 기반
 * 필요한 페인트 양 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PaintCalc = class PaintCalc extends ToolBase {
  constructor() {
    super('PaintCalc');
  }

  init() {
    this.initElements({
      wallList: 'wallList',
      windowCount: 'windowCount',
      windowSize: 'windowSize',
      doorCount: 'doorCount',
      doorSize: 'doorSize',
      coverage: 'coverage',
      coats: 'coats',
      totalArea: 'totalArea',
      paintNeeded: 'paintNeeded',
      paintCans: 'paintCans'
    });

    this.calculate();
    console.log('[PaintCalc] 초기화 완료');
    return this;
  }

  addWall() {
    const wallItem = document.createElement('div');
    wallItem.className = 'wall-item';
    wallItem.innerHTML = `
      <input type="number" class="tool-input wall-width" placeholder="가로 (m)" step="0.1" oninput="paintCalc.calculate()">
      <span>×</span>
      <input type="number" class="tool-input wall-height" placeholder="세로 (m)" step="0.1" oninput="paintCalc.calculate()">
      <button class="tool-btn tool-btn-secondary" onclick="paintCalc.removeWall(this)" style="padding: 0.5rem;"></button>
    `;
    this.elements.wallList.appendChild(wallItem);
  }

  removeWall(btn) {
    if (this.elements.wallList.children.length > 1) {
      btn.parentElement.remove();
      this.calculate();
    } else {
      this.showToast('최소 1개의 벽이 필요합니다', 'error');
    }
  }

  calculate() {
    // 벽 면적 계산
    let wallArea = 0;
    const wallItems = document.querySelectorAll('.wall-item');
    wallItems.forEach(item => {
      const width = parseFloat(item.querySelector('.wall-width').value) || 0;
      const height = parseFloat(item.querySelector('.wall-height').value) || 0;
      wallArea += width * height;
    });

    // 창문/문 면적 제외
    const windowCount = parseInt(this.elements.windowCount.value) || 0;
    const windowSize = parseFloat(this.elements.windowSize.value) || 1.5;
    const doorCount = parseInt(this.elements.doorCount.value) || 0;
    const doorSize = parseFloat(this.elements.doorSize.value) || 1.8;

    const excludeArea = (windowCount * windowSize) + (doorCount * doorSize);
    const paintableArea = Math.max(0, wallArea - excludeArea);

    // 페인트 필요량 계산
    const coverage = parseFloat(this.elements.coverage.value) || 10;
    const coats = parseInt(this.elements.coats.value) || 2;

    const paintNeeded = (paintableArea / coverage) * coats;
    const paintCans = Math.ceil(paintNeeded / 4); // 4L 통 기준

    // 결과 표시
    this.elements.totalArea.textContent = paintableArea.toFixed(1);
    this.elements.paintNeeded.textContent = paintNeeded.toFixed(1);
    this.elements.paintCans.textContent = paintCans;
  }

  reset() {
    this.elements.wallList.innerHTML = `
      <div class="wall-item">
        <input type="number" class="tool-input wall-width" placeholder="가로 (m)" step="0.1" oninput="paintCalc.calculate()">
        <span>×</span>
        <input type="number" class="tool-input wall-height" placeholder="세로 (m)" step="0.1" oninput="paintCalc.calculate()">
        <button class="tool-btn tool-btn-secondary" onclick="paintCalc.removeWall(this)" style="padding: 0.5rem;"></button>
      </div>
    `;

    this.elements.windowCount.value = 0;
    this.elements.doorCount.value = 0;
    this.elements.coats.value = 2;

    this.calculate();
    this.showToast('초기화되었습니다', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const paintCalc = new PaintCalc();
window.PaintCalc = paintCalc;

document.addEventListener('DOMContentLoaded', () => paintCalc.init());
