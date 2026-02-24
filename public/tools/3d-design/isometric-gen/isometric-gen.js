/**
 * 아이소메트릭 그리드 생성기 - ToolBase 기반
 * Canvas 기반 아이소메트릭 그리드 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var IsometricGrid = class IsometricGrid extends ToolBase {
  constructor() {
    super('IsometricGrid');
    this.canvas = null;
    this.ctx = null;
  }

  init() {
    this.initElements({
      isoCanvas: 'isoCanvas',
      cellSize: 'cellSize',
      gridSize: 'gridSize',
      gridColor: 'gridColor',
      bgColor: 'bgColor',
      lineWidth: 'lineWidth',
      opacity: 'opacity',
      cellSizeValue: 'cellSizeValue',
      gridSizeValue: 'gridSizeValue',
      lineWidthValue: 'lineWidthValue',
      opacityValue: 'opacityValue'
    });

    this.canvas = this.elements.isoCanvas;
    this.ctx = this.canvas.getContext('2d');
    this.render();

    console.log('[IsometricGrid] 초기화 완료');
    return this;
  }

  render() {
    const cellSize = parseInt(this.elements.cellSize.value);
    const gridSize = parseInt(this.elements.gridSize.value);
    const gridColor = this.elements.gridColor.value;
    const bgColor = this.elements.bgColor.value;
    const lineWidth = parseFloat(this.elements.lineWidth.value);
    const opacity = parseFloat(this.elements.opacity.value);

    this.elements.cellSizeValue.textContent = cellSize + 'px';
    this.elements.gridSizeValue.textContent = gridSize;
    this.elements.lineWidthValue.textContent = lineWidth;
    this.elements.opacityValue.textContent = opacity;

    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    const angle = Math.PI / 6;
    const dx = cellSize * Math.cos(angle);
    const dy = cellSize * Math.sin(angle);

    this.ctx.strokeStyle = gridColor;
    this.ctx.globalAlpha = opacity;
    this.ctx.lineWidth = lineWidth;

    for (let i = -gridSize; i <= gridSize; i++) {
      const startX = centerX + i * dx;
      const startY = centerY + i * dy;

      this.ctx.beginPath();
      this.ctx.moveTo(startX - gridSize * dx, startY + gridSize * dy);
      this.ctx.lineTo(startX + gridSize * dx, startY - gridSize * dy);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(startX + gridSize * dx, startY + gridSize * dy);
      this.ctx.lineTo(startX - gridSize * dx, startY - gridSize * dy);
      this.ctx.stroke();
    }

    for (let i = -gridSize; i <= gridSize; i++) {
      const y = centerY + i * cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(centerX - gridSize * dx * 2, y);
      this.ctx.lineTo(centerX + gridSize * dx * 2, y);
      this.ctx.stroke();
    }

    this.ctx.globalAlpha = 1;
  }

  exportPNG() {
    const link = document.createElement('a');
    link.href = this.canvas.toDataURL('image/png');
    link.download = 'isometric-grid.png';
    link.click();
    this.showToast('PNG 다운로드 시작!', 'success');
  }

  exportSVG() {
    const cellSize = parseInt(this.elements.cellSize.value);
    const gridSize = parseInt(this.elements.gridSize.value);
    const gridColor = this.elements.gridColor.value;
    const bgColor = this.elements.bgColor.value;
    const lineWidth = parseFloat(this.elements.lineWidth.value);
    const opacity = parseFloat(this.elements.opacity.value);

    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const angle = Math.PI / 6;
    const dx = cellSize * Math.cos(angle);
    const dy = cellSize * Math.sin(angle);

    let paths = '';
    for (let i = -gridSize; i <= gridSize; i++) {
      const startX = centerX + i * dx;
      const startY = centerY + i * dy;
      paths += `<line x1="${startX - gridSize * dx}" y1="${startY + gridSize * dy}" x2="${startX + gridSize * dx}" y2="${startY - gridSize * dy}"/>`;
      paths += `<line x1="${startX + gridSize * dx}" y1="${startY + gridSize * dy}" x2="${startX - gridSize * dx}" y2="${startY - gridSize * dy}"/>`;
    }
    for (let i = -gridSize; i <= gridSize; i++) {
      const y = centerY + i * cellSize;
      paths += `<line x1="${centerX - gridSize * dx * 2}" y1="${y}" x2="${centerX + gridSize * dx * 2}" y2="${y}"/>`;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <g stroke="${gridColor}" stroke-width="${lineWidth}" opacity="${opacity}">${paths}</g>
</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'isometric-grid.svg';
    link.click();
    URL.revokeObjectURL(link.href);
    this.showToast('SVG 다운로드 시작!', 'success');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const isometricGrid = new IsometricGrid();
window.IsometricGrid = isometricGrid;

document.addEventListener('DOMContentLoaded', () => isometricGrid.init());
