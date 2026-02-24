/**
 * 액션아이템 트래커 - ToolBase 기반
 * 회의 후속 작업 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ActionTracker = class ActionTracker extends ToolBase {
  constructor() {
    super('ActionTracker');
    this.items = [];
    this.storageKey = 'actionTracker_data';
  }

  init() {
    this.initElements({
      itemTitle: 'itemTitle',
      itemAssignee: 'itemAssignee',
      itemDueDate: 'itemDueDate',
      itemPriority: 'itemPriority',
      itemMeeting: 'itemMeeting',
      itemsList: 'itemsList',
      emptyState: 'emptyState',
      filterStatus: 'filterStatus',
      filterPriority: 'filterPriority',
      filterAssignee: 'filterAssignee',
      totalCount: 'totalCount',
      pendingCount: 'pendingCount',
      progressCount: 'progressCount',
      completedCount: 'completedCount'
    });

    // 오늘 날짜를 기본값으로 설정
    const today = new Date();
    today.setDate(today.getDate() + 7); // 1주일 후
    this.elements.itemDueDate.value = today.toISOString().split('T')[0];

    // Enter 키 이벤트
    this.elements.itemTitle.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addItem();
    });

    // 저장된 데이터 자동 로드
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      this.items = JSON.parse(saved);
    }

    this.render();

    console.log('[ActionTracker] 초기화 완료');
    return this;
  }

  addItem() {
    const title = this.elements.itemTitle.value.trim();
    const assignee = this.elements.itemAssignee.value.trim();
    const dueDate = this.elements.itemDueDate.value;
    const priority = this.elements.itemPriority.value;
    const meeting = this.elements.itemMeeting.value.trim();

    if (!title) {
      this.showToast('제목을 입력해주세요.', 'error');
      return;
    }

    const item = {
      id: Date.now(),
      title,
      assignee: assignee || '미지정',
      dueDate,
      priority,
      meeting,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.items.unshift(item);

    // 입력 필드 초기화
    this.elements.itemTitle.value = '';
    this.elements.itemAssignee.value = '';
    this.elements.itemMeeting.value = '';

    this.autoSave();
    this.render();
  }

  toggleStatus(id) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    // 상태 순환: pending → progress → completed → pending
    const statusCycle = ['pending', 'progress', 'completed'];
    const currentIndex = statusCycle.indexOf(item.status);
    item.status = statusCycle[(currentIndex + 1) % statusCycle.length];

    this.autoSave();
    this.render();
  }

  deleteItem(id) {
    if (!confirm('이 액션아이템을 삭제하시겠습니까?')) return;

    this.items = this.items.filter(i => i.id !== id);
    this.autoSave();
    this.render();
  }

  getFilteredItems() {
    const statusFilter = this.elements.filterStatus.value;
    const priorityFilter = this.elements.filterPriority.value;
    const assigneeFilter = this.elements.filterAssignee.value;

    return this.items.filter(item => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
      if (assigneeFilter !== 'all' && item.assignee !== assigneeFilter) return false;
      return true;
    });
  }

  updateAssigneeFilter() {
    const assignees = [...new Set(this.items.map(i => i.assignee))];
    const currentValue = this.elements.filterAssignee.value;

    this.elements.filterAssignee.innerHTML = '<option value="all">전체</option>';
    assignees.forEach(assignee => {
      this.elements.filterAssignee.innerHTML += `<option value="${this.escapeHtml(assignee)}">${this.escapeHtml(assignee)}</option>`;
    });

    this.elements.filterAssignee.value = currentValue;
  }

  render() {
    this.updateAssigneeFilter();
    this.updateStats();

    const filtered = this.getFilteredItems();

    if (filtered.length === 0) {
      this.elements.itemsList.innerHTML = '';
      this.elements.emptyState.classList.add('show');
      return;
    }

    this.elements.emptyState.classList.remove('show');
    this.elements.itemsList.innerHTML = filtered.map(item => this.renderItem(item)).join('');
  }

  renderItem(item) {
    const isOverdue = item.status !== 'completed' &&
                      item.dueDate &&
                      new Date(item.dueDate) < new Date();

    const priorityLabels = {
      high: '높음',
      medium: '보통',
      low: '낮음'
    };

    const statusLabels = {
      pending: '대기',
      progress: '진행중',
      completed: '완료'
    };

    return `
      <div class="action-item status-${item.status}">
        <div class="item-status ${item.status}"
             onclick="actionTracker.toggleStatus(${item.id})"
             title="${statusLabels[item.status]} - 클릭하여 상태 변경">
        </div>
        <div class="item-content">
          <div class="item-header">
            <span class="item-title">${this.escapeHtml(item.title)}</span>
            <span class="item-priority ${item.priority}">${priorityLabels[item.priority]}</span>
          </div>
          <div class="item-meta">
            <span>${this.escapeHtml(item.assignee)}</span>
            ${item.dueDate ? `<span class="${isOverdue ? 'item-overdue' : ''}">${item.dueDate}${isOverdue ? ' (지연)' : ''}</span>` : ''}
            ${item.meeting ? `<span>${this.escapeHtml(item.meeting)}</span>` : ''}
          </div>
        </div>
        <div class="item-actions">
          <button class="item-action-btn delete" onclick="actionTracker.deleteItem(${item.id})">삭제</button>
        </div>
      </div>
    `;
  }

  updateStats() {
    const total = this.items.length;
    const pending = this.items.filter(i => i.status === 'pending').length;
    const progress = this.items.filter(i => i.status === 'progress').length;
    const completed = this.items.filter(i => i.status === 'completed').length;

    this.elements.totalCount.textContent = total;
    this.elements.pendingCount.textContent = pending;
    this.elements.progressCount.textContent = progress;
    this.elements.completedCount.textContent = completed;
  }

  exportMarkdown() {
    const date = new Date().toLocaleDateString('ko-KR');
    let md = `# 액션아이템 목록\n\n`;
    md += `**내보내기 날짜**: ${date}\n\n`;

    const statusGroups = {
      pending: { title: '대기', items: [] },
      progress: { title: '진행중', items: [] },
      completed: { title: '완료', items: [] }
    };

    this.items.forEach(item => {
      statusGroups[item.status].items.push(item);
    });

    Object.values(statusGroups).forEach(group => {
      if (group.items.length > 0) {
        md += `## ${group.title}\n\n`;
        group.items.forEach(item => {
          const priority = item.priority === 'high' ? '' : item.priority === 'medium' ? '' : '';
          md += `- ${priority} **${item.title}**\n`;
          md += `  - 담당자: ${item.assignee}\n`;
          if (item.dueDate) md += `  - 마감일: ${item.dueDate}\n`;
          if (item.meeting) md += `  - 관련 회의: ${item.meeting}\n`;
          md += `\n`;
        });
      }
    });

    md += `---\n`;
    md += `*MyMind3 액션아이템 트래커로 작성됨*\n`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `action-items_${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  copyItems() {
    let text = `액션아이템 목록\n\n`;

    const statusLabels = {
      pending: '대기',
      progress: '진행중',
      completed: '완료'
    };

    this.items.forEach(item => {
      const priority = item.priority === 'high' ? '' : item.priority === 'medium' ? '' : '';
      text += `${priority} [${statusLabels[item.status]}] ${item.title}\n`;
      text += `   담당: ${item.assignee}`;
      if (item.dueDate) text += ` | 마감: ${item.dueDate}`;
      text += `\n`;
    });

    this.copyToClipboard(text);
  }

  autoSave() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.items));
  }

  saveData() {
    this.autoSave();
    this.showToast('저장되었습니다!', 'success');
  }

  loadData() {
    const saved = localStorage.getItem(this.storageKey);
    if (!saved) {
      this.showToast('저장된 데이터가 없습니다.', 'error');
      return;
    }

    this.items = JSON.parse(saved);
    this.render();
    this.showToast('불러왔습니다!', 'success');
  }

  clearCompleted() {
    const completedCount = this.items.filter(i => i.status === 'completed').length;
    if (completedCount === 0) {
      this.showToast('완료된 항목이 없습니다.', 'error');
      return;
    }

    if (!confirm(`완료된 ${completedCount}개의 항목을 삭제하시겠습니까?`)) return;

    this.items = this.items.filter(i => i.status !== 'completed');
    this.autoSave();
    this.render();
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
const actionTracker = new ActionTracker();
window.ActionTracker = actionTracker;

// 전역 함수 (HTML onclick 호환)
function addItem() { actionTracker.addItem(); }
function filter() { actionTracker.render(); }
function exportMarkdown() { actionTracker.exportMarkdown(); }
function copyToClipboard() { actionTracker.copyItems(); }
function saveData() { actionTracker.saveData(); }
function loadData() { actionTracker.loadData(); }
function clearCompleted() { actionTracker.clearCompleted(); }

document.addEventListener('DOMContentLoaded', () => actionTracker.init());
