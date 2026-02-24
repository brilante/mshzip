/**
 * 노트 정리 - ToolBase 기반
 * 과목별 노트 관리
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var NoteOrganizer = class NoteOrganizer extends ToolBase {
  constructor() {
    super('NoteOrganizer');
    this.subjects = ['전체', '수학', '영어', '과학'];
    this.currentSubject = '전체';
    this.notes = [];
    this.editingId = null;
    this.searchQuery = '';
  }

  init() {
    this.initElements({
      subjectTabs: 'subjectTabs',
      noteTitle: 'noteTitle',
      noteContent: 'noteContent',
      noteTags: 'noteTags',
      deleteBtn: 'deleteBtn',
      noteList: 'noteList',
      searchInput: 'searchInput'
    });

    this.loadData();
    this.renderSubjects();
    this.renderNotes();

    console.log('[NoteOrganizer] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('noteOrganizerData');
      if (saved) {
        const data = JSON.parse(saved);
        this.subjects = data.subjects || this.subjects;
        this.notes = data.notes || [];
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('noteOrganizerData', JSON.stringify({
      subjects: this.subjects,
      notes: this.notes
    }));
  }

  renderSubjects() {
    this.elements.subjectTabs.innerHTML = this.subjects.map(subject =>
      `<div class="subject-tab ${subject === this.currentSubject ? 'active' : ''}"
            onclick="noteOrganizer.selectSubject('${subject}')">${subject}</div>`
    ).join('');
  }

  selectSubject(subject) {
    this.currentSubject = subject;
    this.renderSubjects();
    this.renderNotes();
  }

  addSubject() {
    const name = prompt('새 과목명을 입력하세요:');
    if (!name || this.subjects.includes(name)) return;

    this.subjects.push(name);
    this.saveData();
    this.renderSubjects();

    this.showToast('과목이 추가되었습니다', 'success');
  }

  newNote() {
    this.editingId = null;
    this.elements.noteTitle.value = '';
    this.elements.noteContent.value = '';
    this.elements.noteTags.value = '';
    this.elements.deleteBtn.style.display = 'none';
    this.elements.noteTitle.focus();
  }

  saveNote() {
    const title = this.elements.noteTitle.value.trim();
    const content = this.elements.noteContent.value.trim();
    const tagsStr = this.elements.noteTags.value.trim();

    if (!title) {
      this.showToast('제목을 입력해주세요', 'error');
      return;
    }

    const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];
    const subject = this.currentSubject === '전체' ? '미분류' : this.currentSubject;

    if (this.editingId) {
      const note = this.notes.find(n => n.id === this.editingId);
      if (note) {
        note.title = title;
        note.content = content;
        note.tags = tags;
        note.updatedAt = new Date().toISOString();
      }
    } else {
      this.notes.unshift({
        id: Date.now(),
        title,
        content,
        tags,
        subject,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    this.saveData();
    this.renderNotes();
    this.newNote();

    this.showToast('노트가 저장되었습니다', 'success');
  }

  editNote(id) {
    const note = this.notes.find(n => n.id === id);
    if (!note) return;

    this.editingId = id;
    this.elements.noteTitle.value = note.title;
    this.elements.noteContent.value = note.content;
    this.elements.noteTags.value = note.tags.join(', ');
    this.elements.deleteBtn.style.display = 'block';
  }

  deleteNote() {
    if (!this.editingId) return;
    if (!confirm('이 노트를 삭제할까요?')) return;

    this.notes = this.notes.filter(n => n.id !== this.editingId);
    this.saveData();
    this.renderNotes();
    this.newNote();
  }

  search(query) {
    this.searchQuery = query.toLowerCase();
    this.renderNotes();
  }

  getFilteredNotes() {
    let filtered = this.notes;

    if (this.currentSubject !== '전체') {
      filtered = filtered.filter(n => n.subject === this.currentSubject);
    }

    if (this.searchQuery) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(this.searchQuery) ||
        n.content.toLowerCase().includes(this.searchQuery) ||
        n.tags.some(t => t.toLowerCase().includes(this.searchQuery))
      );
    }

    return filtered;
  }

  renderNotes() {
    const filtered = this.getFilteredNotes();

    if (filtered.length === 0) {
      this.elements.noteList.innerHTML = '<div class="empty-state">노트가 없습니다</div>';
      return;
    }

    this.elements.noteList.innerHTML = filtered.map(note => {
      const date = new Date(note.updatedAt);
      const dateStr = `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`;
      const preview = note.content.substring(0, 100) + (note.content.length > 100 ? '...' : '');

      return `<div class="note-item" onclick="noteOrganizer.editNote(${note.id})">
        <div class="note-item-title">${note.title}</div>
        <div class="note-item-preview">${preview || '내용 없음'}</div>
        ${note.tags.length ? `<div class="note-tags">${note.tags.map(t => `<span class="note-tag">${t}</span>`).join('')}</div>` : ''}
        <div class="note-item-meta">
          <span>${note.subject}</span>
          <span>${dateStr}</span>
        </div>
      </div>`;
    }).join('');
  }
}

// 전역 인스턴스 생성
const noteOrganizer = new NoteOrganizer();
window.NoteOrganizer = noteOrganizer;

document.addEventListener('DOMContentLoaded', () => noteOrganizer.init());
