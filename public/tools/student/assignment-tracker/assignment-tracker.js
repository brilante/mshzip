/**
 * 과제 관리 - ToolBase 기반
 * 과제 일정 및 진행 관리
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var AssignmentTracker = class AssignmentTracker extends ToolBase {
  constructor() {
    super('AssignmentTracker');
    this.assignments = [];
    this.filter = 'all';
    this.selectedPriority = 'medium';
  }

  init() {
    this.initElements({
      assignmentTitle: 'assignmentTitle',
      assignmentSubject: 'assignmentSubject',
      assignmentDue: 'assignmentDue',
      assignmentList: 'assignmentList',
      pendingCount: 'pendingCount',
      urgentCount: 'urgentCount',
      completedCount: 'completedCount'
    });

    this.loadData();
    this.render();
    this.updateStats();

    console.log('[AssignmentTracker] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('assignmentTrackerData');
      if (saved) {
        this.assignments = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('assignmentTrackerData', JSON.stringify(this.assignments));
  }

  selectPriority(priority) {
    this.selectedPriority = priority;
    document.querySelectorAll('.priority-option').forEach(el => {
      el.classList.toggle('selected', el.textContent.includes(
        priority === 'high' ? '높음' : priority === 'medium' ? '보통' : '낮음'
      ));
    });
  }

  addAssignment() {
    const title = this.elements.assignmentTitle.value.trim();
    const subject = this.elements.assignmentSubject.value.trim();
    const dueStr = this.elements.assignmentDue.value;

    if (!title) {
      this.showToast('과제명을 입력해주세요', 'error');
      return;
    }
    if (!dueStr) {
      this.showToast('마감일을 선택해주세요', 'error');
      return;
    }

    this.assignments.push({
      id: Date.now(),
      title,
      subject: subject || '미지정',
      due: new Date(dueStr).toISOString(),
      priority: this.selectedPriority,
      completed: false,
      createdAt: new Date().toISOString()
    });

    this.assignments.sort((a, b) => new Date(a.due) - new Date(b.due));
    this.saveData();
    this.render();
    this.updateStats();

    this.elements.assignmentTitle.value = '';
    this.elements.assignmentSubject.value = '';
    this.elements.assignmentDue.value = '';

    this.showToast('과제가 추가되었습니다', 'success');
  }

  toggleComplete(id) {
    const assignment = this.assignments.find(a => a.id === id);
    if (assignment) {
      assignment.completed = !assignment.completed;
      this.saveData();
      this.render();
      this.updateStats();
    }
  }

  deleteAssignment(id) {
    if (!confirm('이 과제를 삭제할까요?')) return;
    this.assignments = this.assignments.filter(a => a.id !== id);
    this.saveData();
    this.render();
    this.updateStats();
  }

  setFilter(filter) {
    this.filter = filter;
    document.querySelectorAll('.filter-tab').forEach(el => {
      el.classList.toggle('active', el.textContent.includes(
        filter === 'all' ? '전체' : filter === 'pending' ? '진행' : '완료'
      ));
    });
    this.render();
  }

  getDaysRemaining(dueDate) {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getFilteredAssignments() {
    switch (this.filter) {
      case 'pending':
        return this.assignments.filter(a => !a.completed);
      case 'completed':
        return this.assignments.filter(a => a.completed);
      default:
        return this.assignments;
    }
  }

  updateStats() {
    const pending = this.assignments.filter(a => !a.completed);
    const urgent = pending.filter(a => this.getDaysRemaining(a.due) <= 3);
    const completed = this.assignments.filter(a => a.completed);

    this.elements.pendingCount.textContent = pending.length;
    this.elements.urgentCount.textContent = urgent.length;
    this.elements.completedCount.textContent = completed.length;
  }

  render() {
    const filtered = this.getFilteredAssignments();

    if (filtered.length === 0) {
      this.elements.assignmentList.innerHTML = '<div class="empty-state">과제가 없습니다</div>';
      return;
    }

    this.elements.assignmentList.innerHTML = filtered.map(assignment => {
      const daysLeft = this.getDaysRemaining(assignment.due);
      const due = new Date(assignment.due);
      const dueStr = `${due.getMonth() + 1}월 ${due.getDate()}일 ${due.getHours().toString().padStart(2, '0')}:${due.getMinutes().toString().padStart(2, '0')}`;

      let urgencyClass = '';
      let ddayClass = 'safe';
      let ddayText = `D-${daysLeft}`;

      if (assignment.completed) {
        urgencyClass = 'completed';
        ddayText = '완료';
      } else if (daysLeft < 0) {
        urgencyClass = 'urgent';
        ddayClass = 'urgent';
        ddayText = '마감 지남';
      } else if (daysLeft === 0) {
        urgencyClass = 'urgent';
        ddayClass = 'urgent';
        ddayText = 'D-Day';
      } else if (daysLeft <= 3) {
        urgencyClass = 'soon';
        ddayClass = 'soon';
      }

      return `<div class="assignment-item ${urgencyClass}">
        <div class="assignment-header">
          <span class="assignment-title">${assignment.title}</span>
          <span class="assignment-subject">${assignment.subject}</span>
        </div>
        <div class="assignment-meta">
          ${dueStr} · <span class="assignment-dday ${ddayClass}">${ddayText}</span>
        </div>
        <div class="assignment-actions">
          ${assignment.completed
            ? `<button class="btn-sm btn-undo" onclick="assignmentTracker.toggleComplete(${assignment.id})">↩ 되돌리기</button>`
            : `<button class="btn-sm btn-complete" onclick="assignmentTracker.toggleComplete(${assignment.id})">완료</button>`
          }
          <button class="btn-sm btn-delete" onclick="assignmentTracker.deleteAssignment(${assignment.id})">삭제</button>
        </div>
      </div>`;
    }).join('');
  }
}

// 전역 인스턴스 생성
const assignmentTracker = new AssignmentTracker();
window.AssignmentTracker = assignmentTracker;

document.addEventListener('DOMContentLoaded', () => assignmentTracker.init());
