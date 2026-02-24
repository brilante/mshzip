/**
 * 막대 차트 생성기 - ToolBase 기반
 * Chart.js 기반 막대 차트 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class BarChartTool extends ToolBase {
  constructor() {
    super('BarChartTool');
    this.chart = null;
    this.data = [];
    this.defaultColors = [
      '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
      '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140'
    ];
    this.presets = {
      sales: {
        title: '분기별 매출',
        data: [
          { label: '1분기', value: 1200, color: '#667eea' },
          { label: '2분기', value: 1900, color: '#764ba2' },
          { label: '3분기', value: 1500, color: '#f093fb' },
          { label: '4분기', value: 2100, color: '#f5576c' }
        ]
      },
      survey: {
        title: '고객 만족도 조사',
        data: [
          { label: '매우 만족', value: 45, color: '#43e97b' },
          { label: '만족', value: 30, color: '#38f9d7' },
          { label: '보통', value: 15, color: '#4facfe' },
          { label: '불만족', value: 7, color: '#fa709a' },
          { label: '매우 불만족', value: 3, color: '#f5576c' }
        ]
      },
      monthly: {
        title: '월별 방문자 수',
        data: [
          { label: '1월', value: 4500, color: '#667eea' },
          { label: '2월', value: 5200, color: '#764ba2' },
          { label: '3월', value: 6100, color: '#f093fb' },
          { label: '4월', value: 5800, color: '#f5576c' },
          { label: '5월', value: 7200, color: '#4facfe' },
          { label: '6월', value: 6500, color: '#00f2fe' }
        ]
      }
    };
  }

  init() {
    this.initElements({
      dataRows: 'dataRows',
      chartTitle: 'chartTitle',
      chartDirection: 'chartDirection',
      showLegend: 'showLegend',
      animation: 'animation',
      barChart: 'barChart',
      fileInput: 'fileInput'
    });

    this.loadDefaultData();
    this.renderDataRows();
    this.createChart();

    console.log('[BarChartTool] 초기화 완료');
    return this;
  }

  loadDefaultData() {
    this.data = [
      { label: '항목 1', value: 65, color: this.defaultColors[0] },
      { label: '항목 2', value: 45, color: this.defaultColors[1] },
      { label: '항목 3', value: 80, color: this.defaultColors[2] },
      { label: '항목 4', value: 30, color: this.defaultColors[3] },
      { label: '항목 5', value: 55, color: this.defaultColors[4] }
    ];
  }

  renderDataRows() {
    const container = this.elements.dataRows;
    container.innerHTML = this.data.map((item, index) => `
      <div class="input-row" data-index="${index}">
        <input type="text" class="row-input label-input" value="${this.escapeHtml(item.label)}"
               onchange="barChartTool.updateData(${index}, 'label', this.value)">
        <input type="number" class="row-input value-input" value="${item.value}"
               onchange="barChartTool.updateData(${index}, 'value', this.value)">
        <input type="color" class="color-input" value="${item.color}"
               onchange="barChartTool.updateData(${index}, 'color', this.value)">
        <button class="delete-row-btn" onclick="barChartTool.removeRow(${index})"></button>
      </div>
    `).join('');
  }

  addRow() {
    const colorIndex = this.data.length % this.defaultColors.length;
    this.data.push({
      label: `항목 ${this.data.length + 1}`,
      value: 50,
      color: this.defaultColors[colorIndex]
    });
    this.renderDataRows();
    this.updateChart();
  }

  removeRow(index) {
    if (this.data.length <= 1) {
      this.showToast('최소 1개의 데이터가 필요합니다.', 'error');
      return;
    }
    this.data.splice(index, 1);
    this.renderDataRows();
    this.updateChart();
  }

  updateData(index, field, value) {
    if (field === 'value') {
      this.data[index][field] = parseFloat(value) || 0;
    } else {
      this.data[index][field] = value;
    }
    this.updateChart();
  }

  createChart() {
    const ctx = this.elements.barChart.getContext('2d');
    const direction = this.elements.chartDirection.value;

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: this.getChartData(),
      options: this.getChartOptions()
    });
  }

  getChartData() {
    return {
      labels: this.data.map(d => d.label),
      datasets: [{
        label: this.elements.chartTitle.value,
        data: this.data.map(d => d.value),
        backgroundColor: this.data.map(d => d.color),
        borderColor: this.data.map(d => d.color),
        borderWidth: 1,
        borderRadius: 4
      }]
    };
  }

  getChartOptions() {
    const direction = this.elements.chartDirection.value;
    const showLegend = this.elements.showLegend.value === 'true';
    const animation = this.elements.animation.value === 'true';

    return {
      indexAxis: direction === 'horizontal' ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: animation ? { duration: 750 } : false,
      plugins: {
        legend: {
          display: showLegend,
          position: 'top'
        },
        title: {
          display: true,
          text: this.elements.chartTitle.value,
          font: { size: 16, weight: 'bold' }
        }
      },
      scales: {
        x: {
          grid: { display: direction === 'vertical' }
        },
        y: {
          beginAtZero: true,
          grid: { display: direction === 'horizontal' }
        }
      }
    };
  }

  updateChart() {
    if (this.chart) {
      this.chart.destroy();
    }
    this.createChart();
  }

  exportImage(format) {
    const canvas = this.elements.barChart;
    const link = document.createElement('a');

    if (format === 'jpg') {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.fillStyle = '#ffffff';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, 0);
      link.href = tempCanvas.toDataURL('image/jpeg', 0.9);
    } else {
      link.href = canvas.toDataURL('image/png');
    }

    link.download = `bar-chart.${format}`;
    link.click();
  }

  exportData() {
    const exportObj = {
      title: this.elements.chartTitle.value,
      direction: this.elements.chartDirection.value,
      showLegend: this.elements.showLegend.value,
      animation: this.elements.animation.value,
      data: this.data
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'bar-chart-data.json';
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
        const imported = JSON.parse(e.target.result);

        if (imported.title) this.elements.chartTitle.value = imported.title;
        if (imported.direction) this.elements.chartDirection.value = imported.direction;
        if (imported.showLegend) this.elements.showLegend.value = imported.showLegend;
        if (imported.animation) this.elements.animation.value = imported.animation;
        if (imported.data && Array.isArray(imported.data)) {
          this.data = imported.data;
          this.renderDataRows();
        }

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
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// 전역 인스턴스 생성
const barChartTool = new BarChartTool();
window.BarChart = barChartTool;

document.addEventListener('DOMContentLoaded', () => barChartTool.init());
