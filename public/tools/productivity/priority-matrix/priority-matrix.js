/**
 * 우선순위 매트릭스 - ToolBase 기반
 * 아이젠하워 매트릭스 기반 할 일 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PriorityMatrix = class PriorityMatrix extends ToolBase {
  constructor() {
    super('PriorityMatrix');
    this.tasks = {
      do: ['긴급 버그 수정', '고객 미팅 준비'],
      schedule: ['분기 계획 수립', '새 기능 설계'],
      delegate: ['일상 보고서 작성', '회의실 예약'],
      eliminate: ['불필요한 이메일 정리']
    };
  }

  init() {
    this.initElements({
      newTask: 'newTask',
      taskQuadrant: 'taskQuadrant'
    });

    this.load();
    this.renderAll();
    this.bindKeyEvents();

    console.log('[PriorityMatrix] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('priority-matrix-tasks');
      if (saved) {
        this.tasks = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('priority-matrix-tasks', JSON.stringify(this.tasks));
  }

  bindKeyEvents() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && document.activeElement.id === 'newTask') {
        this.addTask();
      }
    });
  }

  renderAll() {
    Object.keys(this.tasks).forEach(quadrant => {
      this.renderQuadrant(quadrant);
    });
  }

  renderQuadrant(quadrant) {
    const container = document.querySelector(`#quadrant-${quadrant} .task-list`);
    container.innerHTML = this.tasks[quadrant].map((task, idx) => `
      <div class="task-item" draggable="true" ondragstart="priorityMatrix.drag(event, '${quadrant}', ${idx})">
        <span>${task}</span>
        <button onclick="priorityMatrix.removeTask('${quadrant}', ${idx})" style="background: none; border: none; cursor: pointer; opacity: 0.5;"></button>
      </div>
    `).join('');
  }

  addTask() {
    const task = this.elements.newTask.value.trim();
    const quadrant = this.elements.taskQuadrant.value;

    if (!task) {
      this.showToast('할 일을 입력해주세요', 'error');
      return;
    }

    this.tasks[quadrant].push(task);
    this.elements.newTask.value = '';
    this.renderQuadrant(quadrant);
    this.save();
    this.showToast('할 일이 추가되었습니다', 'success');
  }

  removeTask(quadrant, index) {
    this.tasks[quadrant].splice(index, 1);
    this.renderQuadrant(quadrant);
    this.save();
  }

  drag(event, fromQuadrant, index) {
    event.dataTransfer.setData('fromQuadrant', fromQuadrant);
    event.dataTransfer.setData('index', index);
  }

  allowDrop(event) {
    event.preventDefault();
  }

  drop(event, toQuadrant) {
    event.preventDefault();
    const fromQuadrant = event.dataTransfer.getData('fromQuadrant');
    const index = parseInt(event.dataTransfer.getData('index'));

    if (fromQuadrant === toQuadrant) return;

    const task = this.tasks[fromQuadrant][index];
    this.tasks[fromQuadrant].splice(index, 1);
    this.tasks[toQuadrant].push(task);

    this.renderQuadrant(fromQuadrant);
    this.renderQuadrant(toQuadrant);
    this.save();

    const quadrantNames = {
      do: '지금 하기',
      schedule: '일정 잡기',
      delegate: '위임하기',
      eliminate: '제거하기'
    };
    this.showToast(`"${task}"을(를) "${quadrantNames[toQuadrant]}"로 이동했습니다`, 'success');
  }

  exportTasks() {
    const quadrantNames = {
      do: '지금 하기 (긴급+중요)',
      schedule: '일정 잡기 (중요)',
      delegate: '위임하기 (긴급)',
      eliminate: '제거하기'
    };

    let text = '# 우선순위 매트릭스\n\n';

    Object.entries(this.tasks).forEach(([quadrant, tasks]) => {
      text += `## ${quadrantNames[quadrant]}\n`;
      if (tasks.length === 0) {
        text += '- (없음)\n';
      } else {
        tasks.forEach(task => {
          text += `- [ ] ${task}\n`;
        });
      }
      text += '\n';
    });

    this.copyToClipboard(text);
  }

  clearAll() {
    if (!confirm('모든 할 일을 삭제하시겠습니까?')) return;

    this.tasks = { do: [], schedule: [], delegate: [], eliminate: [] };
    this.renderAll();
    this.save();
    this.showToast('모든 할 일이 삭제되었습니다', 'success');
  }
}

// 전역 인스턴스 생성
const priorityMatrix = new PriorityMatrix();
window.PriorityMatrix = priorityMatrix;

// 전역 함수 (HTML onclick 호환)
function addTask() { priorityMatrix.addTask(); }
function exportTasks() { priorityMatrix.exportTasks(); }
function clearAll() { priorityMatrix.clearAll(); }
function allowDrop(event) { priorityMatrix.allowDrop(event); }
function drop(event, quadrant) { priorityMatrix.drop(event, quadrant); }

document.addEventListener('DOMContentLoaded', () => priorityMatrix.init());
