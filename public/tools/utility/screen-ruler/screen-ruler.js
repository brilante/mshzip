/**
 * 화면 눈금자 - ToolBase 기반
 * 화면 크기 및 픽셀 측정
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ScreenRuler = class ScreenRuler extends ToolBase {
  constructor() {
    super('ScreenRuler');
    this.unit = 'px';
    this.ppi = 96;
  }

  init() {
    this.initElements({
      screenInfo: 'screenInfo',
      rulerHorizontal: 'rulerHorizontal',
      measureArea: 'measureArea',
      measureSize: 'measureSize',
      measureUnit: 'measureUnit'
    });

    this.detectPPI();
    this.renderScreenInfo();
    this.renderRuler();
    this.setupMeasureArea();

    window.addEventListener('resize', () => {
      this.renderScreenInfo();
      this.renderRuler();
    });

    console.log('[ScreenRuler] 초기화 완료');
    return this;
  }

  detectPPI() {
    const testDiv = document.createElement('div');
    testDiv.style.width = '1in';
    testDiv.style.position = 'absolute';
    testDiv.style.left = '-9999px';
    document.body.appendChild(testDiv);
    this.ppi = testDiv.offsetWidth * window.devicePixelRatio;
    document.body.removeChild(testDiv);
  }

  setUnit(unit) {
    this.unit = unit;
    document.querySelectorAll('.unit-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.unit === unit);
    });
    this.renderRuler();
    this.updateMeasureSize();
  }

  convertFromPx(px) {
    switch (this.unit) {
      case 'cm':
        return (px / this.ppi * 2.54).toFixed(2);
      case 'in':
        return (px / this.ppi).toFixed(2);
      default:
        return Math.round(px);
    }
  }

  getUnitLabel() {
    switch (this.unit) {
      case 'cm': return '센티미터 (cm)';
      case 'in': return '인치 (in)';
      default: return '픽셀 (px)';
    }
  }

  renderScreenInfo() {
    const info = this.elements.screenInfo;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const pixelRatio = window.devicePixelRatio;
    const colorDepth = window.screen.colorDepth;

    info.innerHTML = `
      <div class="info-card">
        <div class="info-value">${screenWidth} × ${screenHeight}</div>
        <div class="info-label">화면 해상도</div>
      </div>
      <div class="info-card">
        <div class="info-value">${viewportWidth} × ${viewportHeight}</div>
        <div class="info-label">뷰포트 크기</div>
      </div>
      <div class="info-card">
        <div class="info-value">${pixelRatio}x</div>
        <div class="info-label">픽셀 비율</div>
      </div>
      <div class="info-card">
        <div class="info-value">${colorDepth}bit</div>
        <div class="info-label">색상 심도</div>
      </div>
      <div class="info-card">
        <div class="info-value">~${Math.round(this.ppi)}</div>
        <div class="info-label">PPI (추정)</div>
      </div>
      <div class="info-card">
        <div class="info-value">${window.screen.orientation?.type?.split('-')[0] || 'N/A'}</div>
        <div class="info-label">화면 방향</div>
      </div>
    `;
  }

  renderRuler() {
    const ruler = this.elements.rulerHorizontal;
    const width = ruler.offsetWidth;
    let html = '';

    let step, majorStep;
    switch (this.unit) {
      case 'cm':
        step = this.ppi / 2.54 / 10;
        majorStep = this.ppi / 2.54;
        break;
      case 'in':
        step = this.ppi / 16;
        majorStep = this.ppi;
        break;
      default:
        step = 10;
        majorStep = 100;
    }

    for (let x = 0; x <= width; x += step) {
      const isMajor = Math.abs(x % majorStep) < step / 2;
      const height = isMajor ? 20 : 10;
      const top = 0;

      html += `<div class="ruler-mark" style="left: ${x}px; top: ${top}px; width: 1px; height: ${height}px;"></div>`;

      if (isMajor && x > 0) {
        const label = this.convertFromPx(x);
        html += `<div class="ruler-label" style="left: ${x - 10}px; top: 25px;">${label}</div>`;
      }
    }

    ruler.innerHTML = html;
  }

  setupMeasureArea() {
    const area = this.elements.measureArea;
    const resizeObserver = new ResizeObserver(() => {
      this.updateMeasureSize();
    });
    resizeObserver.observe(area);
    this.updateMeasureSize();
  }

  updateMeasureSize() {
    const area = this.elements.measureArea;
    const width = area.offsetWidth;
    const height = area.offsetHeight;

    const displayWidth = this.convertFromPx(width);
    const displayHeight = this.convertFromPx(height);

    this.elements.measureSize.textContent = `${displayWidth} × ${displayHeight}`;
    this.elements.measureUnit.textContent = this.getUnitLabel();
  }
}

// 전역 인스턴스 생성
const screenRuler = new ScreenRuler();
window.ScreenRuler = screenRuler;

document.addEventListener('DOMContentLoaded', () => screenRuler.init());
