/**
 * 노트 테이킹 - ToolBase 기반
 * 마크다운 노트 작성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class NoteTaking extends ToolBase {
  constructor() {
    super('NoteTaking');
    this.notes = [];
    this.currentNoteId = null;
    this.saveTimeout = null;
  }

  init() {
    this.initElements({
      noteList: 'noteList',
      noteTitle: 'noteTitle',
      noteContent: 'noteContent',
      preview: 'preview',
      wordCount: 'wordCount',
      charCount: 'charCount',
      lastSaved: 'lastSaved',
      newNote: 'newNote',
      togglePreview: 'togglePreview',
      exportMd: 'exportMd',
      deleteNote: 'deleteNote',
      searchNote: 'searchNote'
    });

    this.loadData();
    this.setupEvents();
    this.renderNoteList();

    if (this.notes.length > 0) {
      this.selectNote(this.notes[0].id);
    } else {
      this.createNote();
    }

    console.log('[NoteTaking] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('notes');
      if (saved) {
        this.notes = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('notes', JSON.stringify(this.notes));
    this.elements.lastSaved.textContent = '저장됨 ' + new Date().toLocaleTimeString();
  }

  setupEvents() {
    this.elements.newNote.addEventListener('click', () => this.createNote());
    this.elements.togglePreview.addEventListener('click', () => this.togglePreview());
    this.elements.exportMd.addEventListener('click', () => this.exportMarkdown());
    this.elements.deleteNote.addEventListener('click', () => this.deleteCurrentNote());
    this.elements.searchNote.addEventListener('input', (e) => this.renderNoteList(e.target.value));

    this.elements.noteTitle.addEventListener('input', () => this.scheduleAutoSave());
    this.elements.noteContent.addEventListener('input', () => {
      this.updatePreview();
      this.updateCounts();
      this.scheduleAutoSave();
    });
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  renderNoteList(filter = '') {
    const filtered = this.notes.filter(n =>
      n.title.toLowerCase().includes(filter.toLowerCase()) ||
      n.content.toLowerCase().includes(filter.toLowerCase())
    );

    this.elements.noteList.innerHTML = filtered.map(note => `
      <div class="note-item ${note.id === this.currentNoteId ? 'active' : ''}" onclick="noteTaking.selectNote('${note.id}')">
        <h4>${this.escapeHtml(note.title) || '제목 없음'}</h4>
        <p>${this.escapeHtml(note.content.substring(0, 50))}</p>
        <small>${new Date(note.updatedAt).toLocaleDateString()}</small>
      </div>
    `).join('');
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  selectNote(id) {
    this.currentNoteId = id;
    const note = this.notes.find(n => n.id === id);
    if (note) {
      this.elements.noteTitle.value = note.title;
      this.elements.noteContent.value = note.content;
      this.updatePreview();
      this.updateCounts();
    }
    this.renderNoteList(this.elements.searchNote.value);
  }

  updatePreview() {
    if (typeof marked !== 'undefined') {
      this.elements.preview.innerHTML = marked.parse(this.elements.noteContent.value);
    } else {
      this.elements.preview.textContent = this.elements.noteContent.value;
    }
  }

  updateCounts() {
    const text = this.elements.noteContent.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    this.elements.wordCount.textContent = words + ' 단어';
    this.elements.charCount.textContent = text.length + ' 자';
  }

  scheduleAutoSave() {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.autoSave(), 500);
  }

  autoSave() {
    if (this.currentNoteId) {
      const note = this.notes.find(n => n.id === this.currentNoteId);
      if (note) {
        note.title = this.elements.noteTitle.value;
        note.content = this.elements.noteContent.value;
        note.updatedAt = Date.now();
        this.saveData();
        this.renderNoteList(this.elements.searchNote.value);
      }
    }
  }

  createNote() {
    const newNote = {
      id: this.generateId(),
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.notes.unshift(newNote);
    this.saveData();
    this.selectNote(newNote.id);
  }

  togglePreview() {
    const isHidden = this.elements.preview.classList.contains('hidden');
    this.elements.preview.classList.toggle('hidden');
    this.elements.noteContent.style.display = isHidden ? 'none' : 'block';
    this.elements.togglePreview.textContent = isHidden ? '편집' : '미리보기';
    if (isHidden) this.updatePreview();
  }

  exportMarkdown() {
    if (!this.currentNoteId) return;
    const note = this.notes.find(n => n.id === this.currentNoteId);
    if (note) {
      const blob = new Blob([note.content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (note.title || 'note') + '.md';
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('내보내기 완료!', 'success');
    }
  }

  deleteCurrentNote() {
    if (!this.currentNoteId) return;
    if (confirm('이 노트를 삭제하시겠습니까?')) {
      this.notes = this.notes.filter(n => n.id !== this.currentNoteId);
      this.saveData();
      this.currentNoteId = null;
      this.elements.noteTitle.value = '';
      this.elements.noteContent.value = '';
      this.elements.preview.innerHTML = '';
      this.renderNoteList();
      if (this.notes.length > 0) {
        this.selectNote(this.notes[0].id);
      }
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const noteTaking = new NoteTaking();
window.NoteTaking = noteTaking;

document.addEventListener('DOMContentLoaded', () => noteTaking.init());
