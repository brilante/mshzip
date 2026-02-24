/**
 * 영역 차트 생성기 - ToolBase 기반
 * Chart.js 기반 영역 차트 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class AreaChartTool extends ToolBase {
  constructor() {
    super('AreaChartTool');
    this.chart = null;
    this.data = [];
    this.presets = {
      traffic: {
        title: '일별 웹 트래픽',
        data: [
          { label: '월', value: 1200 }, { label: '화', value: 1900 },
          { label: '수', value: 2100 }, { label: '목', value: 1800 },
          { label: '금', value: 2500 }, { label: '토', value: 3200 },
          { label: '일', value: 2800 }
        ]
      },
      revenue: {
        title: '월별 수익',
        data: [
          { label: '1월', value: 4500 }, { label: '2월', value: 5200 },
          { label: '3월', value: 4800 }, { label: '4월', value: 6100 },
          { label: '5월', value: 7500 }, { label: '6월', value: 8200 }
        ]
      },
      users: {
        title: '월별 신규 사용자',
        data: [
          { label: '1월', value: 100 }, { label: '2월', value: 180 },
          { label: '3월', value: 320 }, { label: '4월', value: 550 },
          { label: '5월', value: 850 }, { label: '6월', value: 1200 }
        ]
      }
    };
  }

  init() {
    this.initElements({
      dataRows: 'dataRows',
      chartTitle: 'chartTitle',
      areaColor: 'areaColor',
      opacity: 'opacity',
      tension: 'tension',
      areaChart: 'areaChart'
    });

    this.loadDefaultData();
    this.renderDataRows();
    this.createChart();

    console.log('[AreaChartTool] 초기화 완료');
    return this;
  }

  loadDefaultData() {
    this.data = [
      { label: '1월', value: 30 }, { label: '2월', value: 45 },
      { label: '3월', value: 55 }, { label: '4월', value: 40 },
      { label: '5월', value: 65 }, { label: '6월', value: 80 }
    ];
  }

  renderDataRows() {
    const container = this.elements.dataRows;
    container.innerHTML = this.data.map((item, index) => `
      <div class="input-row">
        <input type="text" class="row-input" value="${this.escapeHtml(item.label)}"
               onchange="areaChartTool.updateData(${index}, 'label', this.value)">
        <input type="number" class="row-input" value="${item.value}"
               onchange="areaChartTool.updateData(${index}, 'value', this.value)">
        <button class="delete-row-btn" onclick="areaChartTool.removeRow(${index})"></button>
      </div>
    `).join('');
  }

  addRow() {
    this.data.push({ label: `항목 ${this.data.length + 1}`, value: 50 });
    this.renderDataRows();
    this.updateChart();
  }

  removeRow(index) {
    if (this.data.length <= 2) {
      this.showToast('최소 2개의 데이터가 필요합니다.', 'error');
      return;
    }
    this.data.splice(index, 1);
    this.renderDataRows();
    this.updateChart();
  }

  updateData(index, field, value) {
    this.data[index][field] = field === 'value' ? parseFloat(value) || 0 : value;
    this.updateChart();
  }

  createChart() {
    const ctx = this.elements.areaChart.getContext('2d');
    const color = this.elements.areaColor.value;
    const opacity = parseFloat(this.elements.opacity.value);
    const tension = parseFloat(this.elements.tension.value);

    const rgb = this.hexToRgb(color);
    const bgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.data.map(d => d.label),
        datasets: [{
          label: this.elements.chartTitle.value,
          data: this.data.map(d => d.value),
          fill: true,
          backgroundColor: bgColor,
          borderColor: color,
          borderWidth: 2,
          tension: tension,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
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
          y: { beginAtZero: true }
        }
      }
    });
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 102, g: 126, b: 234 };
  }

  updateChart() {
    if (this.chart) this.chart.destroy();
    this.createChart();
  }

  exportImage(format) {
    const canvas = this.elements.areaChart;
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
    link.download = `area-chart.${format}`;
    link.click();
  }

  exportData() {
    const obj = {
      title: this.elements.chartTitle.value,
      color: this.elements.areaColor.value,
      opacity: this.elements.opacity.value,
      data: this.data
    };
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'area-chart-data.json';
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

  escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

// 전역 인스턴스 생성
const areaChartTool = new AreaChartTool();
window.AreaChart = areaChartTool;

document.addEventListener('DOMContentLoaded', () => areaChartTool.init());
