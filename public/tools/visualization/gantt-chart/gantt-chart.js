/**
 * 간트 차트 생성기 - ToolBase 기반
 * 프로젝트 일정 관리용 간트 차트
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class GanttChartTool extends ToolBase {
  constructor() {
    super('GanttChartTool');
    this.tasks = [];
    this.storageKey = 'ganttChart_data';
  }

  init() {
    this.initElements({
      taskName: 'taskName',
      taskStatus: 'taskStatus',
      taskStart: 'taskStart',
      taskEnd: 'taskEnd',
      chartTitle: 'chartTitle',
      viewMode: 'viewMode',
      ganttChart: 'ganttChart',
      tasksList: 'tasksList',
      projectTitle: 'projectTitle',
      fileInput: 'fileInput'
    });

    this.loadFromStorage();
    this.setDefaultDates();
    this.render();

    console.log('[GanttChartTool] 초기화 완료');
    return this;
  }

  setDefaultDates() {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    this.elements.taskStart.value = this.formatDate(today);
    this.elements.taskEnd.value = this.formatDate(nextWeek);
  }

  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  addTask() {
    const name = this.elements.taskName.value.trim();
    const status = this.elements.taskStatus.value;
    const start = this.elements.taskStart.value;
    const end = this.elements.taskEnd.value;

    if (!name) {
      this.showToast('작업명을 입력해주세요.', 'error');
      return;
    }

    if (!start || !end) {
      this.showToast('시작일과 종료일을 입력해주세요.', 'error');
      return;
    }

    if (new Date(start) > new Date(end)) {
      this.showToast('종료일은 시작일 이후여야 합니다.', 'error');
      return;
    }

    this.tasks.push({
      id: Date.now(),
      name,
      status,
      start,
      end
    });

    this.elements.taskName.value = '';
    this.saveToStorage();
    this.render();
  }

  removeTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.saveToStorage();
    this.render();
  }

  updateTaskStatus(id, status) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.status = status;
      this.saveToStorage();
      this.render();
    }
  }

  render() {
    this.renderChart();
    this.renderTasksList();
    this.elements.projectTitle.textContent = this.elements.chartTitle.value;
  }

  updateChart() {
    this.render();
  }

  renderChart() {
    const container = this.elements.ganttChart;

    if (this.tasks.length === 0) {
      container.innerHTML = '<div class="empty-gantt">작업을 추가하면 간트 차트가 표시됩니다</div>';
      return;
    }

    const { dates, minDate } = this.calculateDateRange();
    const viewMode = this.elements.viewMode.value;

    let html = `
      <div class="gantt-header">
        <div class="gantt-task-col">작업</div>
        <div class="gantt-timeline">
          ${dates.map(d => {
            const date = new Date(d);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const label = this.getDateLabel(date, viewMode);
            return `<div class="gantt-date${isWeekend ? ' weekend' : ''}">${label}</div>`;
          }).join('')}
        </div>
      </div>
      <div class="gantt-body">
        ${this.tasks.map(task => this.renderTaskRow(task, dates, minDate)).join('')}
      </div>
    `;

    container.innerHTML = html;
  }

  calculateDateRange() {
    let minDate = new Date(Math.min(...this.tasks.map(t => new Date(t.start))));
    let maxDate = new Date(Math.max(...this.tasks.map(t => new Date(t.end))));

    minDate.setDate(minDate.getDate() - 2);
    maxDate.setDate(maxDate.getDate() + 2);

    const dates = [];
    const current = new Date(minDate);
    while (current <= maxDate) {
      dates.push(this.formatDate(current));
      current.setDate(current.getDate() + 1);
    }

    return { dates, minDate, maxDate };
  }

  getDateLabel(date, viewMode) {
    const day = date.getDate();
    const month = date.getMonth() + 1;

    if (viewMode === 'day') {
      return `${month}/${day}`;
    } else if (viewMode === 'week') {
      return day === 1 || date.getDay() === 1 ? `${month}/${day}` : day;
    } else {
      return day === 1 ? `${month}월` : '';
    }
  }

  renderTaskRow(task, dates, minDate) {
    const startIdx = dates.indexOf(task.start);
    const endIdx = dates.indexOf(task.end);
    const barStart = Math.max(0, startIdx);
    const barWidth = Math.max(1, endIdx - startIdx + 1);
    const cellWidth = 40;

    return `
      <div class="gantt-row">
        <div class="gantt-task-name">
          <span class="status-dot ${task.status}"></span>
          ${this.escapeHtml(task.name)}
        </div>
        <div class="gantt-bars">
          ${dates.map((d, i) => {
            const date = new Date(d);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            return `<div class="gantt-cell${isWeekend ? ' weekend' : ''}"></div>`;
          }).join('')}
          <div class="gantt-bar ${task.status}" style="left: ${barStart * cellWidth}px; width: ${barWidth * cellWidth - 4}px;">
            ${task.name}
          </div>
        </div>
      </div>
    `;
  }

  renderTasksList() {
    const container = this.elements.tasksList;

    if (this.tasks.length === 0) {
      container.innerHTML = '<div class="empty-gantt">등록된 작업이 없습니다</div>';
      return;
    }

    container.innerHTML = this.tasks.map(task => `
      <div class="task-item">
        <div class="task-info">
          <span class="status-dot ${task.status}"></span>
          <div>
            <div class="task-name">${this.escapeHtml(task.name)}</div>
            <div class="task-dates">${task.start} ~ ${task.end}</div>
          </div>
        </div>
        <div class="task-actions">
          <select class="task-btn" onchange="ganttChartTool.updateTaskStatus(${task.id}, this.value)">
            <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>대기</option>
            <option value="progress" ${task.status === 'progress' ? 'selected' : ''}>진행중</option>
            <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>완료</option>
          </select>
          <button class="task-btn delete" onclick="ganttChartTool.removeTask(${task.id})">삭제</button>
        </div>
      </div>
    `).join('');
  }

  exportImage() {
    this.showToast('현재 브라우저에서 화면 캡처(Ctrl/Cmd + Shift + S)를 사용해주세요.', 'info');
  }

  exportData() {
    const obj = {
      title: this.elements.chartTitle.value,
      tasks: this.tasks
    };
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'gantt-chart-data.json';
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
        if (imp.tasks && Array.isArray(imp.tasks)) {
          this.tasks = imp.tasks;
        }
        this.saveToStorage();
        this.render();
        this.showToast('데이터를 가져왔습니다!');
      } catch (err) {
        this.showToast('파일 형식이 올바르지 않습니다.', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  saveToStorage() {
    localStorage.setItem(this.storageKey, JSON.stringify({
      title: this.elements.chartTitle.value,
      tasks: this.tasks
    }));
  }

  loadFromStorage() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      const data = JSON.parse(saved);
      if (data.title) this.elements.chartTitle.value = data.title;
      if (data.tasks) this.tasks = data.tasks;
    }
  }

  escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

// 전역 인스턴스 생성
const ganttChartTool = new GanttChartTool();
window.GanttChart = ganttChartTool;

document.addEventListener('DOMContentLoaded', () => ganttChartTool.init());
