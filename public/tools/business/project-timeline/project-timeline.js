/**
 * 프로젝트 타임라인 - ToolBase 기반
 * 프로젝트 일정 및 마일스톤 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ProjectTimeline = class ProjectTimeline extends ToolBase {
  constructor() {
    super('ProjectTimeline');
    this.milestones = [];
    this.nextId = 1;
  }

  init() {
    this.initElements({
      milestoneName: 'milestoneName',
      milestoneStart: 'milestoneStart',
      milestoneEnd: 'milestoneEnd',
      milestoneStatus: 'milestoneStatus',
      milestoneDesc: 'milestoneDesc',
      milestoneColor: 'milestoneColor',
      timelineView: 'timelineView',
      milestoneList: 'milestoneList',
      totalMilestones: 'totalMilestones',
      completedCount: 'completedCount',
      inProgressCount: 'inProgressCount',
      pendingCount: 'pendingCount',
      progressBar: 'progressBar',
      progressText: 'progressText'
    });

    this.loadFromStorage();
    this.render();

    console.log('[ProjectTimeline] 초기화 완료');
    return this;
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem('mymind3_timeline');
      if (saved) {
        this.milestones = JSON.parse(saved);
        this.nextId = Math.max(...this.milestones.map(m => m.id), 0) + 1;
      }
    } catch (e) {
      console.error('Failed to load timeline:', e);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('mymind3_timeline', JSON.stringify(this.milestones));
    } catch (e) {
      console.error('Failed to save timeline:', e);
    }
  }

  addMilestone() {
    const name = this.elements.milestoneName.value.trim();
    const startDate = this.elements.milestoneStart.value;
    const endDate = this.elements.milestoneEnd.value;
    const status = this.elements.milestoneStatus.value;
    const description = this.elements.milestoneDesc.value.trim();
    const color = this.elements.milestoneColor.value;

    if (!name || !startDate || !endDate) {
      this.showToast('이름, 시작일, 종료일은 필수입니다.', 'warning');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      this.showToast('종료일은 시작일 이후여야 합니다.', 'warning');
      return;
    }

    const milestone = {
      id: this.nextId++,
      name,
      startDate,
      endDate,
      status,
      description,
      color,
      created: new Date().toISOString()
    };

    this.milestones.push(milestone);
    this.milestones.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    this.saveToStorage();
    this.render();
    this.clearForm();
    this.showToast('마일스톤이 추가되었습니다!', 'success');
  }

  deleteMilestone(id) {
    this.milestones = this.milestones.filter(m => m.id !== id);
    this.saveToStorage();
    this.render();
  }

  updateStatus(id, status) {
    const milestone = this.milestones.find(m => m.id === id);
    if (milestone) {
      milestone.status = status;
      this.saveToStorage();
      this.render();
    }
  }

  clearForm() {
    this.elements.milestoneName.value = '';
    this.elements.milestoneStart.value = '';
    this.elements.milestoneEnd.value = '';
    this.elements.milestoneDesc.value = '';
  }

  render() {
    this.renderTimeline();
    this.renderList();
    this.updateStats();
  }

  renderTimeline() {
    const container = this.elements.timelineView;

    if (this.milestones.length === 0) {
      container.innerHTML = '<div class="empty-timeline">마일스톤을 추가하여 타임라인을 만드세요.</div>';
      return;
    }

    // 전체 기간 계산
    const allDates = this.milestones.flatMap(m => [new Date(m.startDate), new Date(m.endDate)]);
    const minDate = new Date(Math.min(...allDates));
    const maxDate = new Date(Math.max(...allDates));
    const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24) + 1;

    // 월 헤더 생성
    const months = [];
    let current = new Date(minDate);
    while (current <= maxDate) {
      const monthStr = current.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short' });
      if (!months.length || months[months.length - 1].label !== monthStr) {
        months.push({ label: monthStr, start: new Date(current) });
      }
      current.setDate(current.getDate() + 1);
    }

    let html = '<div class="timeline-months">';
    months.forEach(m => {
      const monthStart = Math.max(0, (m.start - minDate) / (1000 * 60 * 60 * 24));
      const width = 100 / months.length;
      html += `<div class="month-label" style="left: ${(monthStart / totalDays) * 100}%">${m.label}</div>`;
    });
    html += '</div>';

    // 타임라인 바
    html += '<div class="timeline-bars">';
    this.milestones.forEach(milestone => {
      const start = (new Date(milestone.startDate) - minDate) / (1000 * 60 * 60 * 24);
      const duration = (new Date(milestone.endDate) - new Date(milestone.startDate)) / (1000 * 60 * 60 * 24) + 1;
      const left = (start / totalDays) * 100;
      const width = (duration / totalDays) * 100;

      const statusClass = milestone.status === 'completed' ? 'completed' : milestone.status === 'in-progress' ? 'in-progress' : 'pending';

      html += `
        <div class="timeline-row">
          <div class="timeline-bar ${statusClass}" style="left: ${left}%; width: ${width}%; background-color: ${milestone.color};">
            <span class="bar-label">${milestone.name}</span>
          </div>
        </div>
      `;
    });
    html += '</div>';

    // 오늘 표시
    const today = new Date();
    if (today >= minDate && today <= maxDate) {
      const todayPos = ((today - minDate) / (1000 * 60 * 60 * 24) / totalDays) * 100;
      html += `<div class="today-line" style="left: ${todayPos}%"><span>오늘</span></div>`;
    }

    container.innerHTML = html;
  }

  renderList() {
    const container = this.elements.milestoneList;

    if (this.milestones.length === 0) {
      container.innerHTML = '';
      return;
    }

    const statusLabels = {
      pending: '대기',
      'in-progress': '진행중',
      completed: '완료'
    };

    const html = this.milestones.map(m => {
      const startDate = new Date(m.startDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      const endDate = new Date(m.endDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });

      return `
        <div class="milestone-item">
          <div class="milestone-color" style="background-color: ${m.color}"></div>
          <div class="milestone-info">
            <div class="milestone-name">${m.name}</div>
            <div class="milestone-dates">${startDate} - ${endDate}</div>
            ${m.description ? `<div class="milestone-description">${m.description}</div>` : ''}
          </div>
          <select class="status-select" onchange="projectTimeline.updateStatus(${m.id}, this.value)">
            <option value="pending" ${m.status === 'pending' ? 'selected' : ''}>대기</option>
            <option value="in-progress" ${m.status === 'in-progress' ? 'selected' : ''}>진행중</option>
            <option value="completed" ${m.status === 'completed' ? 'selected' : ''}>완료</option>
          </select>
          <button class="delete-btn" onclick="projectTimeline.deleteMilestone(${m.id})">×</button>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  updateStats() {
    const total = this.milestones.length;
    const completed = this.milestones.filter(m => m.status === 'completed').length;
    const inProgress = this.milestones.filter(m => m.status === 'in-progress').length;
    const pending = this.milestones.filter(m => m.status === 'pending').length;

    this.elements.totalMilestones.textContent = total;
    this.elements.completedCount.textContent = completed;
    this.elements.inProgressCount.textContent = inProgress;
    this.elements.pendingCount.textContent = pending;

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    this.elements.progressBar.style.width = progress + '%';
    this.elements.progressText.textContent = progress + '%';
  }

  clearAll() {
    if (confirm('모든 마일스톤을 삭제하시겠습니까?')) {
      this.milestones = [];
      this.saveToStorage();
      this.render();
      this.showToast('모든 마일스톤이 삭제되었습니다.', 'success');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const projectTimeline = new ProjectTimeline();
window.ProjectTimeline = projectTimeline;

document.addEventListener('DOMContentLoaded', () => projectTimeline.init());
