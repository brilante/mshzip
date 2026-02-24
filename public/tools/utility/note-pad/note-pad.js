/**
 * 간편 메모장 - ToolBase 기반
 * 빠른 메모 작성 및 저장
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var NotePad = class NotePad extends ToolBase {
  constructor() {
    super('NotePad');
    this.notes = [];
    this.activeId = null;
    this.autoSaveTimer = null;
  }

  init() {
    this.initElements({
      noteEditor: 'noteEditor',
      noteTabs: 'noteTabs',
      lastSaved: 'lastSaved',
      charCount: 'charCount'
    });

    this.load();
    if (this.notes.length === 0) {
      this.newNote();
    } else {
      this.activeId = this.notes[0].id;
    }
    this.render();
    this.updateStats();

    console.log('[NotePad] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('note-pad-data');
      if (saved) {
        this.notes = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    const editor = this.elements.noteEditor;
    const note = this.notes.find(n => n.id === this.activeId);
    if (note) {
      note.content = editor.value;
      note.updatedAt = new Date().toISOString();
      note.title = this.getTitle(editor.value);
    }
    localStorage.setItem('note-pad-data', JSON.stringify(this.notes));
    this.elements.lastSaved.textContent = '저장됨: ' + new Date().toLocaleTimeString('ko-KR');
    this.renderTabs();
  }

  autoSave() {
    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => this.save(), 1000);
    this.updateStats();
  }

  getTitle(content) {
    const firstLine = content.split('\n')[0].trim();
    return firstLine.substring(0, 20) || '새 메모';
  }

  newNote() {
    const note = {
      id: Date.now(),
      title: '새 메모',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.notes.unshift(note);
    this.activeId = note.id;
    this.save();
    this.render();
  }

  switchNote(id) {
    this.save();
    this.activeId = id;
    this.render();
  }

  deleteNote(id, e) {
    e.stopPropagation();
    if (this.notes.length === 1) {
      this.showToast('마지막 메모는 삭제할 수 없습니다', 'error');
      return;
    }
    if (!confirm('이 메모를 삭제하시겠습니까?')) return;

    this.notes = this.notes.filter(n => n.id !== id);
    if (this.activeId === id) {
      this.activeId = this.notes[0].id;
    }
    this.save();
    this.render();
  }

  render() {
    this.renderTabs();
    const note = this.notes.find(n => n.id === this.activeId);
    if (note) {
      this.elements.noteEditor.value = note.content;
    }
    this.updateStats();
  }

  renderTabs() {
    this.elements.noteTabs.innerHTML = this.notes.map(note => `
      <div class="note-tab ${note.id === this.activeId ? 'active' : ''}" onclick="notePad.switchNote(${note.id})">
        ${this.escapeHtml(note.title)}
        <span class="close" onclick="notePad.deleteNote(${note.id}, event)">×</span>
      </div>
    `).join('');
  }

  updateStats() {
    const text = this.elements.noteEditor.value;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.split('\n').length;
    this.elements.charCount.textContent = `${chars}자 / ${words}단어 / ${lines}줄`;
  }

  copy() {
    const text = this.elements.noteEditor.value;
    if (!text) {
      this.showToast('복사할 내용이 없습니다', 'error');
      return;
    }
    this.copyToClipboard(text);
  }

  clear() {
    if (!confirm('현재 메모를 지우시겠습니까?')) return;
    this.elements.noteEditor.value = '';
    this.save();
    this.updateStats();
  }

  download() {
    const text = this.elements.noteEditor.value;
    if (!text) {
      this.showToast('다운로드할 내용이 없습니다', 'error');
      return;
    }

    const note = this.notes.find(n => n.id === this.activeId);
    const filename = (note?.title || 'memo') + '.txt';

    ToolsUtil.downloadFile(text, filename, 'text/plain;charset=utf-8');
    this.showToast('다운로드 완료', 'success');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 인스턴스 생성
const notePad = new NotePad();
window.NotePad = notePad;

document.addEventListener('DOMContentLoaded', () => notePad.init());
