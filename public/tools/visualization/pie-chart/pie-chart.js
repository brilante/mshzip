/**
 * 파이 차트 생성기 - ToolBase 기반
 * Chart.js 기반 파이/도넛 차트 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class PieChartTool extends ToolBase {
  constructor() {
    super('PieChartTool');
    this.chart = null;
    this.data = [];
    this.colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
    this.presets = {
      market: {
        title: '브라우저 시장 점유율',
        data: [
          { label: 'Chrome', value: 65, color: '#4285f4' },
          { label: 'Safari', value: 18, color: '#5ac8fa' },
          { label: 'Firefox', value: 8, color: '#ff9500' },
          { label: 'Edge', value: 5, color: '#0078d4' },
          { label: '기타', value: 4, color: '#8e8e93' }
        ]
      },
      budget: {
        title: '월별 예산 분배',
        data: [
          { label: '주거비', value: 35, color: '#667eea' },
          { label: '식비', value: 20, color: '#764ba2' },
          { label: '교통비', value: 15, color: '#f093fb' },
          { label: '저축', value: 15, color: '#43e97b' },
          { label: '여가', value: 10, color: '#4facfe' },
          { label: '기타', value: 5, color: '#f5576c' }
        ]
      },
      traffic: {
        title: '웹사이트 트래픽 소스',
        data: [
          { label: '검색 엔진', value: 45, color: '#667eea' },
          { label: 'SNS', value: 25, color: '#764ba2' },
          { label: '직접 접속', value: 20, color: '#f093fb' },
          { label: '추천', value: 10, color: '#43e97b' }
        ]
      }
    };
  }

  init() {
    this.initElements({
      dataRows: 'dataRows',
      chartTitle: 'chartTitle',
      chartType: 'chartType',
      legendPosition: 'legendPosition',
      showPercent: 'showPercent',
      pieChart: 'pieChart',
      fileInput: 'fileInput'
    });

    this.loadDefaultData();
    this.renderDataRows();
    this.createChart();

    console.log('[PieChartTool] 초기화 완료');
    return this;
  }

  loadDefaultData() {
    this.data = [
      { label: '항목 A', value: 30, color: this.colors[0] },
      { label: '항목 B', value: 25, color: this.colors[1] },
      { label: '항목 C', value: 20, color: this.colors[2] },
      { label: '항목 D', value: 15, color: this.colors[3] },
      { label: '항목 E', value: 10, color: this.colors[4] }
    ];
  }

  renderDataRows() {
    const container = this.elements.dataRows;
    container.innerHTML = this.data.map((item, index) => `
      <div class="input-row">
        <input type="text" class="row-input" value="${this.escapeHtml(item.label)}"
               onchange="pieChartTool.updateData(${index}, 'label', this.value)">
        <input type="number" class="row-input" value="${item.value}"
               onchange="pieChartTool.updateData(${index}, 'value', this.value)">
        <input type="color" class="color-input" value="${item.color}"
               onchange="pieChartTool.updateData(${index}, 'color', this.value)">
        <button class="delete-row-btn" onclick="pieChartTool.removeRow(${index})"></button>
      </div>
    `).join('');
  }

  addRow() {
    const colorIndex = this.data.length % this.colors.length;
    this.data.push({ label: `항목 ${this.data.length + 1}`, value: 10, color: this.colors[colorIndex] });
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
    const ctx = this.elements.pieChart.getContext('2d');
    const type = this.elements.chartType.value;
    const legendPos = this.elements.legendPosition.value;
    const showPercent = this.elements.showPercent.value === 'true';
    const total = this.data.reduce((sum, d) => sum + d.value, 0);

    this.chart = new Chart(ctx, {
      type: type,
      data: {
        labels: this.data.map(d => d.label),
        datasets: [{
          data: this.data.map(d => d.value),
          backgroundColor: this.data.map(d => d.color),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: legendPos },
          title: {
            display: true,
            text: this.elements.chartTitle.value,
            font: { size: 16, weight: 'bold' }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw;
                const percent = ((value / total) * 100).toFixed(1);
                return showPercent ? `${context.label}: ${value} (${percent}%)` : `${context.label}: ${value}`;
              }
            }
          }
        }
      }
    });
  }

  updateChart() {
    if (this.chart) this.chart.destroy();
    this.createChart();
  }

  exportImage(format) {
    const canvas = this.elements.pieChart;
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
    link.download = `pie-chart.${format}`;
    link.click();
  }

  exportData() {
    const obj = {
      title: this.elements.chartTitle.value,
      type: this.elements.chartType.value,
      legendPosition: this.elements.legendPosition.value,
      data: this.data
    };
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'pie-chart-data.json';
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
        if (imp.type) this.elements.chartType.value = imp.type;
        if (imp.legendPosition) this.elements.legendPosition.value = imp.legendPosition;
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
const pieChartTool = new PieChartTool();
window.PieChart = pieChartTool;

document.addEventListener('DOMContentLoaded', () => pieChartTool.init());
