/**
 * 스티키 노트 - ToolBase 기반
 * 포스트잇 스타일 메모 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var StickyNotes = class StickyNotes extends ToolBase {
  constructor() {
    super('StickyNotes');
    this.notes = [];
    this.defaultColor = 'yellow';
    this.storageKey = 'mymind3_sticky_notes';
  }

  init() {
    this.initElements({
      notesBoard: 'notesBoard',
      emptyState: 'emptyState',
      searchInput: 'searchInput'
    });

    this.load();
    this.render();
    this.bindEvents();

    console.log('[StickyNotes] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.notes = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.notes));
  }

  generateId() {
    return 'note_' + Math.random().toString(36).substr(2, 9);
  }

  bindEvents() {
    this.elements.notesBoard.addEventListener('dblclick', (e) => {
      if (e.target.id === 'notesBoard' || e.target.classList.contains('notes-board')) {
        this.addNote();
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.note-colors') && !e.target.classList.contains('note-action-btn')) {
        document.querySelectorAll('.note-colors.show').forEach(el => {
          el.classList.remove('show');
        });
      }
    });
  }

  setDefaultColor(color) {
    this.defaultColor = color;
    document.querySelectorAll('.color-picker .color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });
  }

  addNote() {
    const note = {
      id: this.generateId(),
      content: '',
      color: this.defaultColor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.notes.unshift(note);
    this.save();
    this.render();

    setTimeout(() => {
      const textarea = document.querySelector(`[data-note-id="${note.id}"] .note-textarea`);
      if (textarea) textarea.focus();
    }, 100);
  }

  updateNote(noteId, content) {
    const note = this.notes.find(n => n.id === noteId);
    if (note) {
      note.content = content;
      note.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  changeColor(noteId, color) {
    const note = this.notes.find(n => n.id === noteId);
    if (note) {
      note.color = color;
      note.updatedAt = new Date().toISOString();
      this.save();
      this.render();
    }
  }

  deleteNote(noteId) {
    if (!confirm('이 노트를 삭제하시겠습니까?')) return;

    this.notes = this.notes.filter(n => n.id !== noteId);
    this.save();
    this.render();
    this.showToast('노트가 삭제되었습니다', 'success');
  }

  duplicateNote(noteId) {
    const note = this.notes.find(n => n.id === noteId);
    if (note) {
      const newNote = {
        id: this.generateId(),
        content: note.content,
        color: note.color,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const index = this.notes.findIndex(n => n.id === noteId);
      this.notes.splice(index + 1, 0, newNote);
      this.save();
      this.render();
      this.showToast('노트가 복제되었습니다', 'success');
    }
  }

  toggleColorPicker(noteId) {
    const picker = document.querySelector(`[data-note-id="${noteId}"] .note-colors`);
    if (picker) {
      document.querySelectorAll('.note-colors.show').forEach(el => {
        if (el !== picker) el.classList.remove('show');
      });
      picker.classList.toggle('show');
    }
  }

  clearAll() {
    if (this.notes.length === 0) {
      this.showToast('삭제할 노트가 없습니다', 'error');
      return;
    }
    if (!confirm(`${this.notes.length}개의 노트를 모두 삭제하시겠습니까?`)) return;

    this.notes = [];
    this.save();
    this.render();
    this.showToast('모든 노트가 삭제되었습니다', 'success');
  }

  search(query) {
    const notes = document.querySelectorAll('.sticky-note');
    const lowerQuery = query.toLowerCase();

    notes.forEach(note => {
      const content = note.querySelector('.note-textarea').value.toLowerCase();
      if (content.includes(lowerQuery) || query === '') {
        note.classList.remove('hidden');
      } else {
        note.classList.add('hidden');
      }
    });

    const visibleNotes = document.querySelectorAll('.sticky-note:not(.hidden)');
    if (visibleNotes.length === 0 && this.notes.length > 0) {
      this.elements.emptyState.style.display = 'block';
      this.elements.emptyState.querySelector('.empty-text').textContent = '검색 결과가 없습니다';
    } else {
      this.elements.emptyState.style.display = this.notes.length === 0 ? 'block' : 'none';
      this.elements.emptyState.querySelector('.empty-text').textContent = '노트가 없습니다';
    }
  }

  render() {
    if (this.notes.length === 0) {
      this.elements.notesBoard.innerHTML = '';
      this.elements.emptyState.style.display = 'block';
      return;
    }

    this.elements.emptyState.style.display = 'none';

    this.elements.notesBoard.innerHTML = this.notes.map(note => `
      <div class="sticky-note color-${note.color}" data-note-id="${note.id}">
        <div class="note-pin"></div>
        <div class="note-header">
          <span class="note-date">${this.formatDate(note.updatedAt)}</span>
          <div class="note-actions">
            <button class="note-action-btn" onclick="stickyNotes.toggleColorPicker('${note.id}')" title="색상 변경"></button>
            <button class="note-action-btn" onclick="stickyNotes.duplicateNote('${note.id}')" title="복제"></button>
            <button class="note-action-btn" onclick="stickyNotes.deleteNote('${note.id}')" title="삭제"></button>
          </div>
        </div>
        <div class="note-colors">
          <button class="note-color-option" style="background: #fef08a;" onclick="stickyNotes.changeColor('${note.id}', 'yellow')"></button>
          <button class="note-color-option" style="background: #fecdd3;" onclick="stickyNotes.changeColor('${note.id}', 'pink')"></button>
          <button class="note-color-option" style="background: #bfdbfe;" onclick="stickyNotes.changeColor('${note.id}', 'blue')"></button>
          <button class="note-color-option" style="background: #bbf7d0;" onclick="stickyNotes.changeColor('${note.id}', 'green')"></button>
          <button class="note-color-option" style="background: #ddd6fe;" onclick="stickyNotes.changeColor('${note.id}', 'purple')"></button>
          <button class="note-color-option" style="background: #fed7aa;" onclick="stickyNotes.changeColor('${note.id}', 'orange')"></button>
        </div>
        <div class="note-content">
          <textarea class="note-textarea"
                    placeholder="메모를 입력하세요..."
                    oninput="stickyNotes.updateNote('${note.id}', this.value)">${this.escapeHtml(note.content)}</textarea>
        </div>
      </div>
    `).join('');
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}일 전`;

    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
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
const stickyNotes = new StickyNotes();
window.StickyNotes = stickyNotes;

// 전역 함수 (HTML onclick 호환)
function setDefaultColor(color) { stickyNotes.setDefaultColor(color); }
function addNote() { stickyNotes.addNote(); }
function clearAll() { stickyNotes.clearAll(); }
function search(query) { stickyNotes.search(query); }

document.addEventListener('DOMContentLoaded', () => stickyNotes.init());
