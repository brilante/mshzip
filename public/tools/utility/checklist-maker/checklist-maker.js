/**
 * 체크리스트 생성기 - ToolBase 기반
 * 할 일 목록 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class ChecklistMaker extends ToolBase {
  constructor() {
    super('ChecklistMaker');
    this.items = [];
  }

  init() {
    this.initElements({
      newItem: 'newItem',
      checklist: 'checklist',
      progressFill: 'progressFill',
      progressText: 'progressText'
    });

    this.load();
    this.render();

    console.log('[ChecklistMaker] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('checklist-maker-data');
      if (saved) {
        this.items = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('checklist-maker-data', JSON.stringify(this.items));
  }

  add() {
    const input = this.elements.newItem;
    const text = input.value.trim();
    if (!text) return;

    this.items.push({
      id: Date.now(),
      text: text,
      completed: false,
      createdAt: new Date().toISOString()
    });

    this.save();
    this.render();
    input.value = '';
    input.focus();
  }

  toggle(id) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.completed = !item.completed;
      this.save();
      this.render();
    }
  }

  updateText(id, text) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.text = text;
      this.save();
    }
  }

  remove(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
    this.render();
  }

  clearCompleted() {
    const completed = this.items.filter(i => i.completed).length;
    if (completed === 0) {
      this.showToast('완료된 항목이 없습니다', 'error');
      return;
    }
    if (!confirm(`${completed}개의 완료 항목을 삭제하시겠습니까?`)) return;

    this.items = this.items.filter(i => !i.completed);
    this.save();
    this.render();
    this.showToast('완료 항목이 삭제되었습니다', 'success');
  }

  exportList() {
    if (this.items.length === 0) {
      this.showToast('내보낼 항목이 없습니다', 'error');
      return;
    }

    const text = this.items.map(item =>
      `${item.completed ? '' : ''} ${item.text}`
    ).join('\n');

    this.copyToClipboard(text);
  }

  render() {
    const list = this.elements.checklist;
    const total = this.items.length;
    const completed = this.items.filter(i => i.completed).length;
    const percent = total > 0 ? (completed / total) * 100 : 0;

    this.elements.progressFill.style.width = percent + '%';
    this.elements.progressText.textContent = `${completed} / ${total} 완료`;

    if (total === 0) {
      list.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">항목을 추가하세요</div>';
      return;
    }

    list.innerHTML = this.items.map(item => `
      <div class="check-item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
        <input type="checkbox" class="check-checkbox" ${item.completed ? 'checked' : ''} onchange="checklistMaker.toggle(${item.id})">
        <input type="text" class="check-text" value="${this.escapeAttr(item.text)}" onchange="checklistMaker.updateText(${item.id}, this.value)">
        <span class="check-delete" onclick="checklistMaker.remove(${item.id})"></span>
      </div>
    `).join('');

    this.initDragSort();
  }

  initDragSort() {
    const list = this.elements.checklist;
    let draggedItem = null;

    list.querySelectorAll('.check-item').forEach(item => {
      item.draggable = true;

      item.addEventListener('dragstart', () => {
        draggedItem = item;
        item.style.opacity = '0.5';
      });

      item.addEventListener('dragend', () => {
        item.style.opacity = '1';
        draggedItem = null;
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedItem && draggedItem !== item) {
          const fromId = parseInt(draggedItem.dataset.id);
          const toId = parseInt(item.dataset.id);
          this.reorder(fromId, toId);
        }
      });
    });
  }

  reorder(fromId, toId) {
    const fromIndex = this.items.findIndex(i => i.id === fromId);
    const toIndex = this.items.findIndex(i => i.id === toId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const [removed] = this.items.splice(fromIndex, 1);
      this.items.splice(toIndex, 0, removed);
      this.save();
      this.render();
    }
  }

  escapeAttr(text) {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}

// 전역 인스턴스 생성
const checklistMaker = new ChecklistMaker();
window.ChecklistMaker = checklistMaker;

document.addEventListener('DOMContentLoaded', () => checklistMaker.init());
