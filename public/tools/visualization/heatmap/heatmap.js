/**
 * 히트맵 생성기 - ToolBase 기반
 * 2차원 데이터 색상 시각화
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class HeatmapTool extends ToolBase {
  constructor() {
    super('HeatmapTool');
    this.data = [];
    this.rowLabels = [];
    this.colLabels = [];
    this.colorThemes = {
      blue: { low: '#e0f2fe', high: '#0369a1' },
      green: { low: '#dcfce7', high: '#15803d' },
      red: { low: '#fee2e2', high: '#b91c1c' },
      purple: { low: '#f3e8ff', high: '#7c3aed' },
      orange: { low: '#ffedd5', high: '#c2410c' }
    };
    this.presets = {
      weekly: {
        title: '주간 업무 활동량',
        rowLabels: ['월', '화', '수', '목', '금'],
        colLabels: ['09시', '10시', '11시', '12시', '14시', '15시', '16시'],
        data: [
          [40, 65, 80, 45, 70, 85, 60],
          [35, 70, 85, 50, 75, 80, 55],
          [45, 60, 75, 40, 65, 70, 50],
          [50, 75, 90, 55, 80, 85, 65],
          [30, 50, 65, 35, 55, 60, 40]
        ]
      },
      correlation: {
        title: '변수 상관관계',
        rowLabels: ['X1', 'X2', 'X3', 'X4', 'X5'],
        colLabels: ['X1', 'X2', 'X3', 'X4', 'X5'],
        data: [
          [100, 75, 45, 30, 60],
          [75, 100, 55, 40, 50],
          [45, 55, 100, 80, 35],
          [30, 40, 80, 100, 25],
          [60, 50, 35, 25, 100]
        ]
      },
      sales: {
        title: '월별 매출 분석',
        rowLabels: ['제품A', '제품B', '제품C', '제품D'],
        colLabels: ['1월', '2월', '3월', '4월', '5월', '6월'],
        data: [
          [65, 70, 80, 75, 85, 90],
          [45, 50, 55, 60, 65, 70],
          [30, 35, 45, 50, 55, 60],
          [80, 75, 70, 85, 90, 95]
        ]
      }
    };
  }

  init() {
    this.initElements({
      chartTitle: 'chartTitle',
      colorTheme: 'colorTheme',
      showValues: 'showValues',
      cellGap: 'cellGap',
      rowCount: 'rowCount',
      colCount: 'colCount',
      matrixInput: 'matrixInput',
      heatmapChart: 'heatmapChart'
    });

    this.loadDefaultData();
    this.renderMatrixInput();
    this.renderChart();

    console.log('[HeatmapTool] 초기화 완료');
    return this;
  }

  loadDefaultData() {
    this.rowLabels = ['월', '화', '수', '목', '금'];
    this.colLabels = ['09시', '10시', '11시', '12시', '13시', '14시', '15시'];
    this.data = [
      [30, 45, 60, 80, 55, 40, 35],
      [25, 55, 70, 85, 60, 45, 30],
      [35, 50, 65, 75, 50, 35, 25],
      [40, 60, 75, 90, 65, 50, 40],
      [20, 35, 50, 70, 45, 30, 20]
    ];
    this.elements.rowCount.value = this.data.length;
    this.elements.colCount.value = this.data[0].length;
  }

  updateMatrix() {
    const rows = parseInt(this.elements.rowCount.value) || 5;
    const cols = parseInt(this.elements.colCount.value) || 7;

    while (this.rowLabels.length < rows) this.rowLabels.push(`행${this.rowLabels.length + 1}`);
    while (this.colLabels.length < cols) this.colLabels.push(`열${this.colLabels.length + 1}`);
    this.rowLabels = this.rowLabels.slice(0, rows);
    this.colLabels = this.colLabels.slice(0, cols);

    while (this.data.length < rows) this.data.push(new Array(cols).fill(50));
    this.data = this.data.slice(0, rows);
    this.data = this.data.map(row => {
      while (row.length < cols) row.push(50);
      return row.slice(0, cols);
    });

    this.renderMatrixInput();
    this.renderChart();
  }

  renderMatrixInput() {
    const container = this.elements.matrixInput;
    let html = '<table class="matrix-table"><tr><td></td>';

    this.colLabels.forEach((label, i) => {
      html += `<td><input type="text" class="col-label" value="${this.escapeHtml(label)}" onchange="heatmapTool.updateColLabel(${i}, this.value)"></td>`;
    });
    html += '</tr>';

    this.data.forEach((row, r) => {
      html += `<tr><td><input type="text" class="row-label" value="${this.escapeHtml(this.rowLabels[r])}" onchange="heatmapTool.updateRowLabel(${r}, this.value)"></td>`;
      row.forEach((val, c) => {
        html += `<td><input type="number" min="0" max="100" value="${val}" onchange="heatmapTool.updateValue(${r}, ${c}, this.value)"></td>`;
      });
      html += '</tr>';
    });

    html += '</table>';
    container.innerHTML = html;
  }

  updateRowLabel(index, value) {
    this.rowLabels[index] = value;
    this.renderChart();
  }

  updateColLabel(index, value) {
    this.colLabels[index] = value;
    this.renderChart();
  }

  updateValue(row, col, value) {
    this.data[row][col] = Math.max(0, Math.min(100, parseInt(value) || 0));
    this.renderChart();
  }

  randomize() {
    this.data = this.data.map(row => row.map(() => Math.floor(Math.random() * 101)));
    this.renderMatrixInput();
    this.renderChart();
  }

  renderChart() {
    const container = this.elements.heatmapChart;
    const title = this.elements.chartTitle.value;
    const theme = this.elements.colorTheme.value;
    const showValues = this.elements.showValues.value === 'true';
    const gap = parseInt(this.elements.cellGap.value) || 2;

    const colors = this.colorThemes[theme] || this.colorThemes.blue;

    let html = `<h3 class="heatmap-title">${this.escapeHtml(title)}</h3>`;
    html += `<div class="heatmap-col-labels" style="gap: ${gap}px;">`;
    this.colLabels.forEach(label => {
      html += `<div class="heatmap-col-label">${this.escapeHtml(label)}</div>`;
    });
    html += '</div>';

    html += `<div class="heatmap-grid" style="gap: ${gap}px;">`;
    this.data.forEach((row, r) => {
      html += `<div class="heatmap-row" style="gap: ${gap}px;">`;
      html += `<div class="heatmap-label">${this.escapeHtml(this.rowLabels[r])}</div>`;
      row.forEach(val => {
        const bgColor = this.interpolateColor(colors.low, colors.high, val / 100);
        const textColor = val > 50 ? '#ffffff' : '#1e293b';
        html += `<div class="heatmap-cell" style="background:${bgColor};color:${textColor};">${showValues ? val : ''}</div>`;
      });
      html += '</div>';
    });
    html += '</div>';

    html += `<div class="heatmap-legend"><span>낮음</span><div class="legend-gradient" style="background:linear-gradient(to right,${colors.low},${colors.high});"></div><span>높음</span></div>`;

    container.innerHTML = html;
  }

  interpolateColor(color1, color2, factor) {
    const hex = c => parseInt(c.slice(1), 16);
    const r1 = (hex(color1) >> 16) & 255, g1 = (hex(color1) >> 8) & 255, b1 = hex(color1) & 255;
    const r2 = (hex(color2) >> 16) & 255, g2 = (hex(color2) >> 8) & 255, b2 = hex(color2) & 255;
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    return `rgb(${r}, ${g}, ${b})`;
  }

  exportImage(format) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const cellW = 50, cellH = 40, gap = 2, labelW = 60;
    canvas.width = labelW + (cellW + gap) * this.colLabels.length + 40;
    canvas.height = 60 + (cellH + gap) * this.data.length + 60;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const title = this.elements.chartTitle.value;
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, 25);

    const theme = this.elements.colorTheme.value;
    const colors = this.colorThemes[theme] || this.colorThemes.blue;

    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    this.colLabels.forEach((label, i) => {
      ctx.fillStyle = '#64748b';
      ctx.fillText(label, labelW + 20 + i * (cellW + gap) + cellW / 2, 50);
    });

    this.data.forEach((row, r) => {
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(this.rowLabels[r], labelW + 10, 70 + r * (cellH + gap) + cellH / 2 + 4);
      row.forEach((val, c) => {
        const bgColor = this.interpolateColor(colors.low, colors.high, val / 100);
        ctx.fillStyle = bgColor;
        ctx.fillRect(labelW + 20 + c * (cellW + gap), 55 + r * (cellH + gap), cellW, cellH);
      });
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', 0.9);
    link.download = `heatmap-chart.${format}`;
    link.click();
  }

  exportData() {
    const obj = {
      title: this.elements.chartTitle.value,
      rowLabels: this.rowLabels,
      colLabels: this.colLabels,
      data: this.data
    };
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'heatmap-data.json';
    link.click();
  }

  loadPreset(type) {
    const preset = this.presets[type];
    if (preset) {
      this.elements.chartTitle.value = preset.title;
      this.rowLabels = preset.rowLabels;
      this.colLabels = preset.colLabels;
      this.data = preset.data;
      this.elements.rowCount.value = this.data.length;
      this.elements.colCount.value = this.colLabels.length;
      this.renderMatrixInput();
      this.renderChart();
    }
  }

  escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

// 전역 인스턴스 생성
const heatmapTool = new HeatmapTool();
window.Heatmap = heatmapTool;

document.addEventListener('DOMContentLoaded', () => heatmapTool.init());
