/**
 * 원근법 그리드 생성기 - ToolBase 기반
 * Canvas 기반 1점/2점 원근법 그리드 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PerspectiveGrid = class PerspectiveGrid extends ToolBase {
  constructor() {
    super('PerspectiveGrid');
    this.canvas = null;
    this.ctx = null;
  }

  init() {
    this.initElements({
      perspectiveCanvas: 'perspectiveCanvas',
      perspectiveType: 'perspectiveType',
      lineCount: 'lineCount',
      horizonY: 'horizonY',
      gridColor: 'gridColor',
      bgColor: 'bgColor',
      opacity: 'opacity',
      lineCountValue: 'lineCountValue',
      horizonYValue: 'horizonYValue',
      opacityValue: 'opacityValue'
    });

    this.canvas = this.elements.perspectiveCanvas;
    this.ctx = this.canvas.getContext('2d');
    this.render();

    console.log('[PerspectiveGrid] 초기화 완료');
    return this;
  }

  render() {
    const type = this.elements.perspectiveType.value;
    const lineCount = parseInt(this.elements.lineCount.value);
    const horizonY = parseFloat(this.elements.horizonY.value);
    const gridColor = this.elements.gridColor.value;
    const bgColor = this.elements.bgColor.value;
    const opacity = parseFloat(this.elements.opacity.value);

    this.elements.lineCountValue.textContent = lineCount;
    this.elements.horizonYValue.textContent = Math.round(horizonY * 100) + '%';
    this.elements.opacityValue.textContent = opacity;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const horizon = h * horizonY;

    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.strokeStyle = gridColor;
    this.ctx.globalAlpha = opacity;
    this.ctx.lineWidth = 1;

    // Horizon line
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, horizon);
    this.ctx.lineTo(w, horizon);
    this.ctx.stroke();
    this.ctx.lineWidth = 1;

    if (type === '1point') {
      const vpX = w / 2;

      // Vertical lines converging to VP
      for (let i = 0; i <= lineCount; i++) {
        const x = (i / lineCount) * w;
        this.ctx.beginPath();
        this.ctx.moveTo(x, h);
        this.ctx.lineTo(vpX, horizon);
        this.ctx.stroke();
      }

      // Horizontal lines
      for (let i = 0; i <= lineCount; i++) {
        const y = horizon + ((h - horizon) / lineCount) * i;
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(w, y);
        this.ctx.stroke();
      }

      // Vanishing point
      this.ctx.fillStyle = '#ef4444';
      this.ctx.globalAlpha = 1;
      this.ctx.beginPath();
      this.ctx.arc(vpX, horizon, 6, 0, Math.PI * 2);
      this.ctx.fill();

    } else {
      const vp1X = w * 0.1;
      const vp2X = w * 0.9;

      // Lines from left VP
      for (let i = 0; i <= lineCount; i++) {
        const x = w * 0.3 + (w * 0.4 / lineCount) * i;
        this.ctx.beginPath();
        this.ctx.moveTo(vp1X, horizon);
        this.ctx.lineTo(x, h);
        this.ctx.stroke();
      }

      // Lines from right VP
      for (let i = 0; i <= lineCount; i++) {
        const x = w * 0.3 + (w * 0.4 / lineCount) * i;
        this.ctx.beginPath();
        this.ctx.moveTo(vp2X, horizon);
        this.ctx.lineTo(x, h);
        this.ctx.stroke();
      }

      // Vertical lines
      for (let i = 0; i <= 8; i++) {
        const x = w * 0.3 + (w * 0.4 / 8) * i;
        this.ctx.beginPath();
        this.ctx.moveTo(x, horizon);
        this.ctx.lineTo(x, h);
        this.ctx.stroke();
      }

      // Vanishing points
      this.ctx.fillStyle = '#ef4444';
      this.ctx.globalAlpha = 1;
      this.ctx.beginPath();
      this.ctx.arc(vp1X, horizon, 6, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(vp2X, horizon, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;
  }

  exportPNG() {
    const link = document.createElement('a');
    link.href = this.canvas.toDataURL('image/png');
    link.download = 'perspective-grid.png';
    link.click();
    this.showToast('PNG 다운로드 시작!', 'success');
  }

  exportSVG() {
    this.showToast('SVG 내보내기 기능은 준비 중입니다. PNG를 사용해주세요.', 'warning');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const perspectiveGrid = new PerspectiveGrid();
window.PerspectiveGrid = perspectiveGrid;

document.addEventListener('DOMContentLoaded', () => perspectiveGrid.init());
