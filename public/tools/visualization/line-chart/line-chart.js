/**
 * 라인 차트 생성기 - ToolBase 기반
 * Chart.js 기반 라인 차트 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class LineChartTool extends ToolBase {
  constructor() {
    super('LineChartTool');
    this.chart = null;
    this.data = [];
    this.presets = {
      growth: {
        title: '월별 성장률',
        data: [
          { label: '1월', value: 10 }, { label: '2월', value: 15 },
          { label: '3월', value: 25 }, { label: '4월', value: 35 },
          { label: '5월', value: 50 }, { label: '6월', value: 70 }
        ]
      },
      temperature: {
        title: '서울 월평균 기온',
        data: [
          { label: '1월', value: -2 }, { label: '2월', value: 1 },
          { label: '3월', value: 6 }, { label: '4월', value: 13 },
          { label: '5월', value: 18 }, { label: '6월', value: 23 },
          { label: '7월', value: 26 }, { label: '8월', value: 27 },
          { label: '9월', value: 22 }, { label: '10월', value: 15 },
          { label: '11월', value: 7 }, { label: '12월', value: 0 }
        ]
      },
      stock: {
        title: '주가 변동',
        data: [
          { label: '월', value: 52000 }, { label: '화', value: 53500 },
          { label: '수', value: 51000 }, { label: '목', value: 54000 },
          { label: '금', value: 55500 }
        ]
      }
    };
  }

  init() {
    this.initElements({
      dataRows: 'dataRows',
      chartTitle: 'chartTitle',
      lineColor: 'lineColor',
      fill: 'fill',
      tension: 'tension',
      showPoints: 'showPoints',
      lineWidth: 'lineWidth',
      lineChart: 'lineChart',
      fileInput: 'fileInput'
    });

    this.loadDefaultData();
    this.renderDataRows();
    this.createChart();

    console.log('[LineChartTool] 초기화 완료');
    return this;
  }

  loadDefaultData() {
    this.data = [
      { label: '1월', value: 30 },
      { label: '2월', value: 45 },
      { label: '3월', value: 35 },
      { label: '4월', value: 60 },
      { label: '5월', value: 55 },
      { label: '6월', value: 75 }
    ];
  }

  renderDataRows() {
    const container = this.elements.dataRows;
    container.innerHTML = this.data.map((item, index) => `
      <div class="input-row">
        <input type="text" class="row-input" value="${this.escapeHtml(item.label)}"
               onchange="lineChartTool.updateData(${index}, 'label', this.value)">
        <input type="number" class="row-input" value="${item.value}"
               onchange="lineChartTool.updateData(${index}, 'value', this.value)">
        <button class="delete-row-btn" onclick="lineChartTool.removeRow(${index})"></button>
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
    const ctx = this.elements.lineChart.getContext('2d');
    const color = this.elements.lineColor.value;
    const fill = this.elements.fill.value === 'true';
    const tension = parseFloat(this.elements.tension.value);
    const showPoints = this.elements.showPoints.value === 'true';
    const lineWidth = parseInt(this.elements.lineWidth.value);

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.data.map(d => d.label),
        datasets: [{
          label: this.elements.chartTitle.value,
          data: this.data.map(d => d.value),
          borderColor: color,
          backgroundColor: fill ? color + '40' : 'transparent',
          fill: fill,
          tension: tension,
          pointRadius: showPoints ? 5 : 0,
          pointHoverRadius: showPoints ? 7 : 0,
          borderWidth: lineWidth
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

  updateChart() {
    if (this.chart) this.chart.destroy();
    this.createChart();
  }

  exportImage(format) {
    const canvas = this.elements.lineChart;
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
    link.download = `line-chart.${format}`;
    link.click();
  }

  exportData() {
    const obj = {
      title: this.elements.chartTitle.value,
      color: this.elements.lineColor.value,
      fill: this.elements.fill.value,
      tension: this.elements.tension.value,
      data: this.data
    };
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'line-chart-data.json';
    link.click();
  }

  importData() {
    this.elements.fileInput.click();
  }

  handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imp = JSON.parse(e.target.result);
        if (imp.title) this.elements.chartTitle.value = imp.title;
        if (imp.color) this.elements.lineColor.value = imp.color;
        if (imp.fill) this.elements.fill.value = imp.fill;
        if (imp.tension) this.elements.tension.value = imp.tension;
        if (imp.data) { this.data = imp.data; this.renderDataRows(); }
        this.updateChart();
        this.showToast('데이터를 가져왔습니다!');
      } catch (err) {
        this.showToast('파일 형식이 올바르지 않습니다.', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
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
const lineChartTool = new LineChartTool();
window.LineChart = lineChartTool;

document.addEventListener('DOMContentLoaded', () => lineChartTool.init());
