/**
 * 산점도 생성기 - ToolBase 기반
 * Chart.js 기반 산점도 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class ScatterPlotTool extends ToolBase {
  constructor() {
    super('ScatterPlotTool');
    this.chart = null;
    this.data = [];
    this.presets = {
      positive: {
        title: '양의 상관관계',
        data: [
          { x: 5, y: 10 }, { x: 10, y: 18 }, { x: 15, y: 25 },
          { x: 20, y: 35 }, { x: 25, y: 42 }, { x: 30, y: 48 },
          { x: 35, y: 58 }, { x: 40, y: 65 }, { x: 45, y: 72 }
        ]
      },
      negative: {
        title: '음의 상관관계',
        data: [
          { x: 5, y: 90 }, { x: 10, y: 82 }, { x: 15, y: 75 },
          { x: 20, y: 65 }, { x: 25, y: 58 }, { x: 30, y: 50 },
          { x: 35, y: 42 }, { x: 40, y: 35 }, { x: 45, y: 28 }
        ]
      },
      random: {
        title: '랜덤 분포',
        data: Array.from({ length: 20 }, () => ({
          x: Math.round(Math.random() * 100),
          y: Math.round(Math.random() * 100)
        }))
      }
    };
  }

  init() {
    this.initElements({
      dataRows: 'dataRows',
      chartTitle: 'chartTitle',
      pointColor: 'pointColor',
      pointSize: 'pointSize',
      showTrendline: 'showTrendline',
      scatterChart: 'scatterChart'
    });

    this.loadDefaultData();
    this.renderDataRows();
    this.createChart();

    console.log('[ScatterPlotTool] 초기화 완료');
    return this;
  }

  loadDefaultData() {
    this.data = [
      { x: 10, y: 20 }, { x: 15, y: 35 }, { x: 20, y: 30 },
      { x: 25, y: 45 }, { x: 30, y: 40 }, { x: 35, y: 55 },
      { x: 40, y: 60 }, { x: 45, y: 70 }, { x: 50, y: 65 }
    ];
  }

  renderDataRows() {
    const container = this.elements.dataRows;
    container.innerHTML = this.data.map((item, index) => `
      <div class="input-row">
        <input type="number" class="row-input" value="${item.x}"
               onchange="scatterPlotTool.updateData(${index}, 'x', this.value)">
        <input type="number" class="row-input" value="${item.y}"
               onchange="scatterPlotTool.updateData(${index}, 'y', this.value)">
        <button class="delete-row-btn" onclick="scatterPlotTool.removeRow(${index})"></button>
      </div>
    `).join('');
  }

  addRow() {
    this.data.push({ x: 0, y: 0 });
    this.renderDataRows();
    this.updateChart();
  }

  removeRow(index) {
    if (this.data.length <= 3) {
      this.showToast('최소 3개의 데이터가 필요합니다.', 'error');
      return;
    }
    this.data.splice(index, 1);
    this.renderDataRows();
    this.updateChart();
  }

  updateData(index, field, value) {
    this.data[index][field] = parseFloat(value) || 0;
    this.updateChart();
  }

  createChart() {
    const ctx = this.elements.scatterChart.getContext('2d');
    const color = this.elements.pointColor.value;
    const size = parseInt(this.elements.pointSize.value);
    const showTrend = this.elements.showTrendline.value === 'true';

    const datasets = [{
      label: this.elements.chartTitle.value,
      data: this.data,
      backgroundColor: color + '80',
      borderColor: color,
      pointRadius: size,
      pointHoverRadius: size + 3
    }];

    if (showTrend && this.data.length >= 2) {
      const trendData = this.calculateTrendline();
      datasets.push({
        label: '추세선',
        data: trendData,
        type: 'line',
        borderColor: '#ef4444',
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      });
    }

    this.chart = new Chart(ctx, {
      type: 'scatter',
      data: { datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          title: {
            display: true,
            text: this.elements.chartTitle.value,
            font: { size: 16, weight: 'bold' }
          }
        },
        scales: {
          x: { title: { display: true, text: 'X축' } },
          y: { title: { display: true, text: 'Y축' } }
        }
      }
    });
  }

  calculateTrendline() {
    const n = this.data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    this.data.forEach(d => {
      sumX += d.x;
      sumY += d.y;
      sumXY += d.x * d.y;
      sumX2 += d.x * d.x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const xMin = Math.min(...this.data.map(d => d.x));
    const xMax = Math.max(...this.data.map(d => d.x));

    return [
      { x: xMin, y: slope * xMin + intercept },
      { x: xMax, y: slope * xMax + intercept }
    ];
  }

  updateChart() {
    if (this.chart) this.chart.destroy();
    this.createChart();
  }

  exportImage(format) {
    const canvas = this.elements.scatterChart;
    const link = document.createElement('a');
    if (format === 'jpg') {
      const temp = document.createElement('canvas');
      temp.width = canvas.width;
      temp.height = canvas.height;
      const ctx = temp.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, temp.width, temp.height);
      ctx.drawImage(canvas, 0, 0);
      link.href = temp.toDataURL('image/jpeg', 0.9);
    } else {
      link.href = canvas.toDataURL('image/png');
    }
    link.download = `scatter-plot.${format}`;
    link.click();
  }

  exportData() {
    const obj = {
      title: this.elements.chartTitle.value,
      data: this.data
    };
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'scatter-plot-data.json';
    link.click();
  }

  loadPreset(type) {
    const preset = this.presets[type];
    if (preset) {
      this.elements.chartTitle.value = preset.title;
      this.data = preset.data;
      this.renderDataRows();
      this.updateChart();
    }
  }
}

// 전역 인스턴스 생성
const scatterPlotTool = new ScatterPlotTool();
window.ScatterPlot = scatterPlotTool;

document.addEventListener('DOMContentLoaded', () => scatterPlotTool.init());
