/**
 * 레이더 차트 생성기 - ToolBase 기반
 * Chart.js 기반 레이더 차트 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class RadarChartTool extends ToolBase {
  constructor() {
    super('RadarChartTool');
    this.chart = null;
    this.data = [];
    this.presets = {
      skills: {
        title: '개발자 역량 평가',
        data: [
          { label: '프론트엔드', value: 85 }, { label: '백엔드', value: 75 },
          { label: '데이터베이스', value: 70 }, { label: 'DevOps', value: 60 },
          { label: '보안', value: 55 }, { label: '문서화', value: 80 }
        ]
      },
      product: {
        title: '제품 비교 분석',
        data: [
          { label: '성능', value: 90 }, { label: '가격', value: 70 },
          { label: '디자인', value: 85 }, { label: '내구성', value: 80 },
          { label: 'A/S', value: 75 }, { label: '편의성', value: 88 }
        ]
      },
      health: {
        title: '건강 지표',
        data: [
          { label: '체력', value: 75 }, { label: '유연성', value: 60 },
          { label: '근력', value: 70 }, { label: '지구력', value: 65 },
          { label: '균형감', value: 80 }, { label: '심폐능력', value: 72 }
        ]
      }
    };
  }

  init() {
    this.initElements({
      dataRows: 'dataRows',
      chartTitle: 'chartTitle',
      areaColor: 'areaColor',
      fillOpacity: 'fillOpacity',
      showPoints: 'showPoints',
      radarChart: 'radarChart'
    });

    this.loadDefaultData();
    this.renderDataRows();
    this.createChart();

    console.log('[RadarChartTool] 초기화 완료');
    return this;
  }

  loadDefaultData() {
    this.data = [
      { label: '커뮤니케이션', value: 85 },
      { label: '기술력', value: 90 },
      { label: '리더십', value: 70 },
      { label: '창의성', value: 75 },
      { label: '문제해결', value: 80 },
      { label: '협업능력', value: 85 }
    ];
  }

  renderDataRows() {
    const container = this.elements.dataRows;
    container.innerHTML = this.data.map((item, index) => `
      <div class="input-row">
        <input type="text" class="row-input" value="${this.escapeHtml(item.label)}"
               onchange="radarChartTool.updateData(${index}, 'label', this.value)">
        <input type="number" class="row-input" min="0" max="100" value="${item.value}"
               onchange="radarChartTool.updateData(${index}, 'value', this.value)">
        <button class="delete-row-btn" onclick="radarChartTool.removeRow(${index})"></button>
      </div>
    `).join('');
  }

  addRow() {
    this.data.push({ label: `항목 ${this.data.length + 1}`, value: 50 });
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
    if (field === 'value') {
      value = Math.max(0, Math.min(100, parseFloat(value) || 0));
    }
    this.data[index][field] = value;
    this.updateChart();
  }

  createChart() {
    const ctx = this.elements.radarChart.getContext('2d');
    const color = this.elements.areaColor.value;
    const opacity = parseFloat(this.elements.fillOpacity.value);
    const showPoints = this.elements.showPoints.value === 'true';

    const rgb = this.hexToRgb(color);
    const bgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;

    this.chart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: this.data.map(d => d.label),
        datasets: [{
          label: this.elements.chartTitle.value,
          data: this.data.map(d => d.value),
          fill: true,
          backgroundColor: bgColor,
          borderColor: color,
          borderWidth: 2,
          pointRadius: showPoints ? 4 : 0,
          pointHoverRadius: showPoints ? 6 : 0
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
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { stepSize: 20 }
          }
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
    const canvas = this.elements.radarChart;
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
    link.download = `radar-chart.${format}`;
    link.click();
  }

  exportData() {
    const obj = {
      title: this.elements.chartTitle.value,
      color: this.elements.areaColor.value,
      data: this.data
    };
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'radar-chart-data.json';
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
const radarChartTool = new RadarChartTool();
window.RadarChart = radarChartTool;

document.addEventListener('DOMContentLoaded', () => radarChartTool.init());
