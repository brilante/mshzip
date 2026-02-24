/**
 * 트리맵 생성기 - ToolBase 기반
 * 계층적 데이터 시각화
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class TreemapTool extends ToolBase {
  constructor() {
    super('TreemapTool');
    this.data = [];
    this.defaultColors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#a8edea', '#30cfd0'];
    this.presets = {
      storage: {
        title: '저장 공간 사용량',
        data: [
          { label: '문서', value: 45, color: '#667eea' },
          { label: '사진', value: 30, color: '#764ba2' },
          { label: '동영상', value: 15, color: '#f093fb' },
          { label: '음악', value: 7, color: '#4facfe' },
          { label: '앱', value: 3, color: '#43e97b' }
        ]
      },
      budget: {
        title: '부서별 예산 배분',
        data: [
          { label: '개발팀', value: 40, color: '#667eea' },
          { label: '마케팅', value: 25, color: '#f5576c' },
          { label: '운영팀', value: 20, color: '#4facfe' },
          { label: '인사팀', value: 10, color: '#43e97b' },
          { label: '기타', value: 5, color: '#fee140' }
        ]
      },
      market: {
        title: '시장 점유율',
        data: [
          { label: 'A사', value: 35, color: '#667eea' },
          { label: 'B사', value: 28, color: '#764ba2' },
          { label: 'C사', value: 20, color: '#f093fb' },
          { label: 'D사', value: 12, color: '#4facfe' },
          { label: '기타', value: 5, color: '#43e97b' }
        ]
      }
    };
  }

  init() {
    this.initElements({
      dataRows: 'dataRows',
      chartTitle: 'chartTitle',
      showLabels: 'showLabels',
      borderWidth: 'borderWidth',
      padding: 'padding',
      treemapChart: 'treemapChart'
    });

    this.loadDefaultData();
    this.renderDataRows();
    this.renderChart();

    console.log('[TreemapTool] 초기화 완료');
    return this;
  }

  loadDefaultData() {
    this.data = [
      { label: '문서', value: 45, color: '#667eea' },
      { label: '이미지', value: 30, color: '#764ba2' },
      { label: '동영상', value: 15, color: '#f093fb' },
      { label: '음악', value: 7, color: '#4facfe' },
      { label: '기타', value: 3, color: '#43e97b' }
    ];
  }

  renderDataRows() {
    const container = this.elements.dataRows;
    container.innerHTML = this.data.map((item, idx) =>
      `<div class="input-row">
        <input type="text" class="row-input" value="${this.escapeHtml(item.label)}" onchange="treemapTool.updateData(${idx}, 'label', this.value)">
        <input type="number" class="row-input" min="0" value="${item.value}" onchange="treemapTool.updateData(${idx}, 'value', this.value)">
        <input type="color" class="row-input color" value="${item.color}" onchange="treemapTool.updateData(${idx}, 'color', this.value)">
        <button class="delete-row-btn" onclick="treemapTool.removeRow(${idx})"></button>
      </div>`
    ).join('');
  }

  addRow() {
    const colorIdx = this.data.length % this.defaultColors.length;
    this.data.push({ label: `항목 ${this.data.length + 1}`, value: 10, color: this.defaultColors[colorIdx] });
    this.renderDataRows();
    this.renderChart();
  }

  removeRow(index) {
    if (this.data.length <= 1) {
      this.showToast('최소 1개의 데이터가 필요합니다.', 'error');
      return;
    }
    this.data.splice(index, 1);
    this.renderDataRows();
    this.renderChart();
  }

  updateData(index, field, value) {
    if (field === 'value') value = Math.max(0, parseFloat(value) || 0);
    this.data[index][field] = value;
    this.renderChart();
  }

  renderChart() {
    const container = this.elements.treemapChart;
    const title = this.elements.chartTitle.value;
    const showLabels = this.elements.showLabels.value;
    const borderWidth = parseInt(this.elements.borderWidth.value) || 2;
    const padding = parseInt(this.elements.padding.value) || 4;
    const total = this.data.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
      container.innerHTML = '<div class="treemap-empty">데이터를 입력하면 트리맵이 표시됩니다</div>';
      return;
    }

    const sortedData = [...this.data].sort((a, b) => b.value - a.value);
    const items = this.calculateLayout(sortedData, total, 800, 350, padding);

    let html = `<h3 class="treemap-title">${this.escapeHtml(title)}</h3>`;
    html += '<div class="treemap-grid" style="position: relative; height: 350px;">';

    items.forEach(item => {
      const labelText = this.getLabelText(item, total, showLabels);
      const fontSize = Math.max(10, Math.min(16, item.width / 8));
      const percent = ((item.value / total) * 100).toFixed(1);
      html += `<div class="treemap-item" style="position:absolute;left:${item.x}px;top:${item.y}px;width:${item.width}px;height:${item.height}px;background:${item.color};border-width:${borderWidth}px;" title="${this.escapeHtml(item.label)}: ${item.value} (${percent}%)">${labelText ? `<span class="treemap-label" style="font-size:${fontSize}px;">${labelText}</span>` : ''}</div>`;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  calculateLayout(data, total, cW, cH, padding) {
    const items = [];
    let remainingArea = cW * cH, x = 0, y = 0, currentW = cW, currentH = cH, horizontal = cW >= cH;

    data.forEach((item, i) => {
      const remaining = data.slice(i).reduce((s, d) => s + d.value, 0);
      const area = remainingArea * (item.value / remaining);
      let iW, iH;
      if (horizontal) { iW = area / currentH; iH = currentH; if (iW > currentW) iW = currentW; }
      else { iH = area / currentW; iW = currentW; if (iH > currentH) iH = currentH; }
      items.push({ ...item, x: x + padding/2, y: y + padding/2, width: Math.max(0, iW - padding), height: Math.max(0, iH - padding) });
      if (horizontal) { x += iW; currentW -= iW; if (currentW < currentH) horizontal = false; }
      else { y += iH; currentH -= iH; if (currentH < currentW) horizontal = true; }
      remainingArea -= area;
    });
    return items;
  }

  getLabelText(item, total, showLabels) {
    const percent = ((item.value / total) * 100).toFixed(1);
    switch (showLabels) {
      case 'name': return this.escapeHtml(item.label);
      case 'value': return `${item.value} (${percent}%)`;
      case 'both': return `${this.escapeHtml(item.label)}<br>${item.value} (${percent}%)`;
      default: return '';
    }
  }

  updateChart() { this.renderChart(); }

  exportImage(format) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800; canvas.height = 400;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const title = this.elements.chartTitle.value;
    ctx.fillStyle = '#1a1a2e'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(title, canvas.width / 2, 30);
    const total = this.data.reduce((sum, item) => sum + item.value, 0);
    const sortedData = [...this.data].sort((a, b) => b.value - a.value);
    const items = this.calculateLayout(sortedData, total, 780, 340, 4);
    items.forEach(item => {
      ctx.fillStyle = item.color;
      ctx.fillRect(item.x + 10, item.y + 50, item.width, item.height);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.strokeRect(item.x + 10, item.y + 50, item.width, item.height);
      if (item.width > 40 && item.height > 30) {
        ctx.fillStyle = '#ffffff'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(item.label, item.x + 10 + item.width / 2, item.y + 50 + item.height / 2);
      }
    });
    const link = document.createElement('a');
    link.href = canvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', 0.9);
    link.download = `treemap-chart.${format}`;
    link.click();
  }

  exportData() {
    const obj = { title: this.elements.chartTitle.value, data: this.data };
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'treemap-data.json';
    link.click();
  }

  loadPreset(type) {
    const preset = this.presets[type];
    if (preset) {
      this.elements.chartTitle.value = preset.title;
      this.data = preset.data;
      this.renderDataRows();
      this.renderChart();
    }
  }

  escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

// 전역 인스턴스 생성
const treemapTool = new TreemapTool();
window.Treemap = treemapTool;

document.addEventListener('DOMContentLoaded', () => treemapTool.init());
