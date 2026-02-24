/**
 * 보안 노트 - ToolBase 기반
 * 암호화된 비밀 노트 저장 및 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class SecureNote extends ToolBase {
  constructor() {
    super('SecureNote');
    this.notes = JSON.parse(localStorage.getItem('secureNotes') || '[]');
    this.currentNoteId = null;
    this.unlockingNoteId = null;
  }

  init() {
    this.initElements({
      noteList: 'noteList',
      noteListSection: 'noteListSection',
      noteEditorSection: 'noteEditorSection',
      noteTitle: 'noteTitle',
      notePassword: 'notePassword',
      noteContent: 'noteContent',
      unlockModal: 'unlockModal',
      unlockPassword: 'unlockPassword'
    });

    this.setupEventListeners();
    this.renderNoteList();
    console.log('[SecureNote] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    this.on(this.elements.unlockPassword, 'keyup', (e) => {
      if (e.key === 'Enter') this.attemptUnlock();
    });
  }

  renderNoteList() {
    const list = this.elements.noteList;

    if (this.notes.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="icon"></div><p>노트가 없습니다<br>새 노트를 만들어보세요</p></div>';
      return;
    }

    list.innerHTML = this.notes.map(note =>
      '<div class="note-item" onclick="secureNote.openNote(\'' + note.id + '\')">' +
      '<span class="note-icon">' + (note.encrypted ? '' : '') + '</span>' +
      '<div class="note-info">' +
      '<div class="note-item-title">' + this.escapeHtml(note.title || '제목 없음') + '</div>' +
      '<div class="note-item-date">' + this.formatDate(note.updatedAt) + '</div>' +
      '</div>' +
      '</div>'
    ).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }

  showNewNote() {
    this.currentNoteId = null;
    this.elements.noteTitle.value = '';
    this.elements.notePassword.value = '';
    this.elements.noteContent.value = '';

    this.elements.noteListSection.classList.add('hidden');
    this.elements.noteEditorSection.classList.remove('hidden');
  }

  backToList() {
    this.elements.noteEditorSection.classList.add('hidden');
    this.elements.noteListSection.classList.remove('hidden');
    this.renderNoteList();
  }

  openNote(noteId) {
    const note = this.notes.find(n => n.id === noteId);
    if (!note) return;

    if (note.encrypted) {
      this.unlockingNoteId = noteId;
      this.elements.unlockModal.classList.remove('hidden');
      this.elements.unlockPassword.value = '';
      this.elements.unlockPassword.focus();
    } else {
      this.showNoteEditor(note);
    }
  }

  showNoteEditor(note) {
    this.currentNoteId = note.id;
    this.elements.noteTitle.value = note.title;
    this.elements.notePassword.value = '';
    this.elements.noteContent.value = note.content;

    this.elements.noteListSection.classList.add('hidden');
    this.elements.noteEditorSection.classList.remove('hidden');
  }

  cancelUnlock() {
    this.unlockingNoteId = null;
    this.elements.unlockModal.classList.add('hidden');
  }

  attemptUnlock() {
    const password = this.elements.unlockPassword.value;
    const note = this.notes.find(n => n.id === this.unlockingNoteId);

    if (!note) return;

    try {
      const decrypted = this.decrypt(note.content, password);
      if (decrypted !== null) {
        note.content = decrypted;
        note.decryptedPassword = password;
        this.elements.unlockModal.classList.add('hidden');
        this.showNoteEditor(note);
      } else {
        this.showToast('잘못된 암호입니다', 'error');
      }
    } catch (e) {
      this.showToast('잘못된 암호입니다', 'error');
    }
  }

  saveNote() {
    const title = this.elements.noteTitle.value.trim() || '제목 없음';
    const password = this.elements.notePassword.value;
    let content = this.elements.noteContent.value;

    const encrypted = password.length > 0;
    if (encrypted) {
      content = this.encrypt(content, password);
    }

    if (this.currentNoteId) {
      const note = this.notes.find(n => n.id === this.currentNoteId);
      if (note) {
        note.title = title;
        note.content = content;
        note.encrypted = encrypted;
        note.updatedAt = Date.now();
      }
    } else {
      this.notes.unshift({
        id: Date.now().toString(),
        title: title,
        content: content,
        encrypted: encrypted,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    localStorage.setItem('secureNotes', JSON.stringify(this.notes));
    this.showToast('저장되었습니다!');
    this.backToList();
  }

  deleteNote() {
    if (!this.currentNoteId) return;

    if (confirm('이 노트를 삭제하시겠습니까?')) {
      this.notes = this.notes.filter(n => n.id !== this.currentNoteId);
      localStorage.setItem('secureNotes', JSON.stringify(this.notes));
      this.backToList();
    }
  }

  encrypt(text, key) {
    let expandedKey = key;
    while (expandedKey.length < 32) expandedKey += key;
    expandedKey = expandedKey.substring(0, 32);

    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ expandedKey.charCodeAt(i % expandedKey.length));
    }
    return btoa(unescape(encodeURIComponent(result)));
  }

  decrypt(encrypted, key) {
    try {
      const decoded = decodeURIComponent(escape(atob(encrypted)));
      let expandedKey = key;
      while (expandedKey.length < 32) expandedKey += key;
      expandedKey = expandedKey.substring(0, 32);

      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ expandedKey.charCodeAt(i % expandedKey.length));
      }
      return result;
    } catch (e) {
      return null;
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const secureNote = new SecureNote();
window.SecureNote = secureNote;

document.addEventListener('DOMContentLoaded', () => secureNote.init());
