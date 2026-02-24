/**
 * 일일 플래너 - ToolBase 기반
 * 시간대별 일정 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var DailyPlanner = class DailyPlanner extends ToolBase {
  constructor() {
    super('DailyPlanner');
    this.currentDate = new Date();
    this.tasks = {};
    this.editingTask = null;
    this.storageKey = 'mymind3_daily_planner';
    this.categoryIcons = {
      work: '',
      meeting: '',
      personal: '',
      health: '',
      study: '',
      other: ''
    };
    this.categoryNames = {
      work: '업무',
      meeting: '회의',
      personal: '개인',
      health: '운동/건강',
      study: '학습',
      other: '기타'
    };
  }

  init() {
    this.initElements({
      dateInput: 'dateInput',
      dateText: 'dateText',
      timeline: 'timeline',
      totalCount: 'totalCount',
      doneCount: 'doneCount',
      pendingCount: 'pendingCount',
      progressFill: 'progressFill',
      progressText: 'progressText',
      taskModal: 'taskModal',
      modalTitle: 'modalTitle',
      taskTitle: 'taskTitle',
      taskStartTime: 'taskStartTime',
      taskEndTime: 'taskEndTime',
      taskCategory: 'taskCategory',
      taskNote: 'taskNote',
      deleteTaskBtn: 'deleteTaskBtn'
    });

    this.load();
    this.updateDateDisplay();
    this.render();
    this.bindModalEvents();

    console.log('[DailyPlanner] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.tasks = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.tasks));
  }

  bindModalEvents() {
    this.elements.taskModal.addEventListener('click', (e) => {
      if (e.target.id === 'taskModal') {
        this.closeModal();
      }
    });
  }

  getDateKey(date) {
    return date.toISOString().split('T')[0];
  }

  getTodayTasks() {
    const key = this.getDateKey(this.currentDate);
    return this.tasks[key] || [];
  }

  setTodayTasks(tasks) {
    const key = this.getDateKey(this.currentDate);
    this.tasks[key] = tasks;
    this.save();
  }

  generateId() {
    return 'task_' + Math.random().toString(36).substr(2, 9);
  }

  updateDateDisplay() {
    const key = this.getDateKey(this.currentDate);
    this.elements.dateInput.value = key;

    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = days[this.currentDate.getDay()];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const current = new Date(this.currentDate);
    current.setHours(0, 0, 0, 0);
    const diff = Math.round((current - today) / (1000 * 60 * 60 * 24));

    let relative = '';
    if (diff === 0) relative = '오늘';
    else if (diff === 1) relative = '내일';
    else if (diff === -1) relative = '어제';
    else if (diff > 0) relative = `${diff}일 후`;
    else relative = `${Math.abs(diff)}일 전`;

    this.elements.dateText.textContent = `${dayName}요일 • ${relative}`;
  }

  prevDay() {
    this.currentDate.setDate(this.currentDate.getDate() - 1);
    this.updateDateDisplay();
    this.render();
  }

  nextDay() {
    this.currentDate.setDate(this.currentDate.getDate() + 1);
    this.updateDateDisplay();
    this.render();
  }

  goToday() {
    this.currentDate = new Date();
    this.updateDateDisplay();
    this.render();
  }

  changeDate() {
    this.currentDate = new Date(this.elements.dateInput.value + 'T00:00:00');
    this.updateDateDisplay();
    this.render();
  }

  render() {
    this.renderTimeline();
    this.updateSummary();
  }

  renderTimeline() {
    const tasks = this.getTodayTasks();
    const now = new Date();
    const isToday = this.getDateKey(this.currentDate) === this.getDateKey(now);
    const currentHour = now.getHours();

    let html = '';

    for (let hour = 0; hour < 24; hour++) {
      const hourStr = hour.toString().padStart(2, '0') + ':00';
      const hourTasks = tasks.filter(t => {
        if (!t.startTime) return hour === 9;
        const taskHour = parseInt(t.startTime.split(':')[0]);
        return taskHour === hour;
      });

      const isCurrentHour = isToday && currentHour === hour;

      html += `
        <div class="time-slot">
          <div class="time-label ${isCurrentHour ? 'current-hour' : ''}">${hourStr}</div>
          <div class="time-tasks" onclick="dailyPlanner.openAddTaskAt(${hour})">
            ${hourTasks.map(task => this.renderTaskCard(task)).join('')}
          </div>
        </div>
      `;
    }

    this.elements.timeline.innerHTML = html;
  }

  renderTaskCard(task) {
    const icon = this.categoryIcons[task.category] || '';
    const timeStr = task.startTime
      ? (task.endTime ? `${task.startTime} - ${task.endTime}` : task.startTime)
      : '시간 미지정';

    return `
      <div class="task-card category-${task.category} ${task.done ? 'done' : ''}"
           onclick="event.stopPropagation(); dailyPlanner.openEditTask('${task.id}')">
        <div class="task-checkbox ${task.done ? 'checked' : ''}"
             onclick="event.stopPropagation(); dailyPlanner.toggleTask('${task.id}')">
          ${task.done ? '' : ''}
        </div>
        <div class="task-content">
          <div class="task-title">${this.escapeHtml(task.title)}</div>
          <div class="task-meta">
            <span class="task-time">${timeStr}</span>
            <span>${icon} ${this.categoryNames[task.category] || '기타'}</span>
          </div>
          ${task.note ? `<div class="task-note">${this.escapeHtml(task.note)}</div>` : ''}
        </div>
      </div>
    `;
  }

  updateSummary() {
    const tasks = this.getTodayTasks();
    const total = tasks.length;
    const done = tasks.filter(t => t.done).length;
    const pending = total - done;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    this.elements.totalCount.textContent = total;
    this.elements.doneCount.textContent = done;
    this.elements.pendingCount.textContent = pending;
    this.elements.progressFill.style.width = percent + '%';
    this.elements.progressText.textContent = percent + '%';
  }

  openAddTask() {
    this.editingTask = null;

    this.elements.modalTitle.textContent = '일정 추가';
    this.elements.taskTitle.value = '';
    this.elements.taskStartTime.value = '';
    this.elements.taskEndTime.value = '';
    this.elements.taskCategory.value = 'work';
    this.elements.taskNote.value = '';
    this.elements.deleteTaskBtn.style.display = 'none';

    this.elements.taskModal.style.display = 'flex';
    this.elements.taskTitle.focus();
  }

  openAddTaskAt(hour) {
    this.editingTask = null;

    const startTime = hour.toString().padStart(2, '0') + ':00';
    const endTime = (hour + 1).toString().padStart(2, '0') + ':00';

    this.elements.modalTitle.textContent = '일정 추가';
    this.elements.taskTitle.value = '';
    this.elements.taskStartTime.value = startTime;
    this.elements.taskEndTime.value = endTime;
    this.elements.taskCategory.value = 'work';
    this.elements.taskNote.value = '';
    this.elements.deleteTaskBtn.style.display = 'none';

    this.elements.taskModal.style.display = 'flex';
    this.elements.taskTitle.focus();
  }

  openEditTask(taskId) {
    const tasks = this.getTodayTasks();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    this.editingTask = task;

    this.elements.modalTitle.textContent = '일정 편집';
    this.elements.taskTitle.value = task.title;
    this.elements.taskStartTime.value = task.startTime || '';
    this.elements.taskEndTime.value = task.endTime || '';
    this.elements.taskCategory.value = task.category || 'work';
    this.elements.taskNote.value = task.note || '';
    this.elements.deleteTaskBtn.style.display = 'block';

    this.elements.taskModal.style.display = 'flex';
  }

  closeModal() {
    this.elements.taskModal.style.display = 'none';
    this.editingTask = null;
  }

  saveTask() {
    const title = this.elements.taskTitle.value.trim();
    if (!title) {
      this.showToast('제목을 입력해주세요', 'error');
      return;
    }

    const taskData = {
      title: title,
      startTime: this.elements.taskStartTime.value,
      endTime: this.elements.taskEndTime.value,
      category: this.elements.taskCategory.value,
      note: this.elements.taskNote.value.trim(),
      done: false
    };

    const tasks = this.getTodayTasks();

    if (this.editingTask) {
      const index = tasks.findIndex(t => t.id === this.editingTask.id);
      if (index !== -1) {
        taskData.done = tasks[index].done;
        taskData.id = this.editingTask.id;
        tasks[index] = taskData;
      }
    } else {
      taskData.id = this.generateId();
      tasks.push(taskData);
    }

    tasks.sort((a, b) => {
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return a.startTime.localeCompare(b.startTime);
    });

    this.setTodayTasks(tasks);
    this.closeModal();
    this.render();
    this.showToast('일정이 저장되었습니다', 'success');
  }

  deleteTask() {
    if (!this.editingTask) return;
    if (!confirm('이 일정을 삭제하시겠습니까?')) return;

    const tasks = this.getTodayTasks();
    const filtered = tasks.filter(t => t.id !== this.editingTask.id);
    this.setTodayTasks(filtered);
    this.closeModal();
    this.render();
    this.showToast('일정이 삭제되었습니다', 'success');
  }

  toggleTask(taskId) {
    const tasks = this.getTodayTasks();
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.done = !task.done;
      this.setTodayTasks(tasks);
      this.render();
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// 전역 인스턴스 생성
const dailyPlanner = new DailyPlanner();
window.DailyPlanner = dailyPlanner;

// 전역 함수 (HTML onclick 호환)
function prevDay() { dailyPlanner.prevDay(); }
function nextDay() { dailyPlanner.nextDay(); }
function goToday() { dailyPlanner.goToday(); }
function changeDate() { dailyPlanner.changeDate(); }
function openAddTask() { dailyPlanner.openAddTask(); }
function closeModal() { dailyPlanner.closeModal(); }
function saveTask() { dailyPlanner.saveTask(); }
function deleteTask() { dailyPlanner.deleteTask(); }

document.addEventListener('DOMContentLoaded', () => dailyPlanner.init());
