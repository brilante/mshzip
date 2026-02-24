/**
 * 회의록 - ToolBase 기반
 * 회의 내용 및 액션 아이템 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class MeetingNotes extends ToolBase {
  constructor() {
    super('MeetingNotes');
    this.meetings = [];
    this.editingId = null;
  }

  init() {
    this.initElements({
      formTitle: 'formTitle',
      meetingTitle: 'meetingTitle',
      meetingDate: 'meetingDate',
      attendees: 'attendees',
      agenda: 'agenda',
      notes: 'notes',
      decisions: 'decisions',
      actionItems: 'actionItems',
      addActionItem: 'addActionItem',
      saveMeeting: 'saveMeeting',
      cancelEdit: 'cancelEdit',
      searchMeeting: 'searchMeeting',
      meetingsList: 'meetingsList'
    });

    this.load();
    this.bindEvents();
    this.setDefaultDate();
    this.setActionItems([]);
    this.render();

    console.log('[MeetingNotes] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('meetings');
      if (saved) {
        this.meetings = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('meetings', JSON.stringify(this.meetings));
  }

  bindEvents() {
    this.elements.addActionItem.addEventListener('click', () => this.addActionItemRow());
    this.elements.saveMeeting.addEventListener('click', () => this.saveMeetingHandler());
    this.elements.cancelEdit.addEventListener('click', () => this.cancelEditHandler());
    this.elements.searchMeeting.addEventListener('input', () => this.render());
  }

  setDefaultDate() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    this.elements.meetingDate.value = now.toISOString().slice(0, 16);
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  getActionItems() {
    const rows = document.querySelectorAll('.action-item-row');
    const items = [];
    rows.forEach(row => {
      const inputs = row.querySelectorAll('input');
      if (inputs[0].value.trim()) {
        items.push({
          task: inputs[0].value.trim(),
          assignee: inputs[1].value.trim(),
          dueDate: inputs[2].value
        });
      }
    });
    return items;
  }

  setActionItems(items) {
    this.elements.actionItems.innerHTML = '';
    (items || [{ task: '', assignee: '', dueDate: '' }]).forEach(item => {
      const row = document.createElement('div');
      row.className = 'action-item-row';
      row.innerHTML = `
        <input type="text" placeholder="할 일" value="${this.escapeHtml(item.task || '')}">
        <input type="text" placeholder="담당자" value="${this.escapeHtml(item.assignee || '')}">
        <input type="date" value="${item.dueDate || ''}">
      `;
      this.elements.actionItems.appendChild(row);
    });
  }

  addActionItemRow() {
    const row = document.createElement('div');
    row.className = 'action-item-row';
    row.innerHTML = `
      <input type="text" placeholder="할 일">
      <input type="text" placeholder="담당자">
      <input type="date">
    `;
    this.elements.actionItems.appendChild(row);
  }

  render() {
    const search = this.elements.searchMeeting.value.toLowerCase();
    const filtered = this.meetings.filter(m =>
      m.title.toLowerCase().includes(search) ||
      (m.attendees && m.attendees.toLowerCase().includes(search))
    );

    this.elements.meetingsList.innerHTML = filtered.map(m => {
      const date = new Date(m.date);
      return `
        <div class="meeting-item" data-id="${m.id}">
          <h4>${this.escapeHtml(m.title)}</h4>
          <p>${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
          <p>참석자: ${this.escapeHtml(m.attendees || '-')}</p>
          <div class="meeting-item-actions">
            <button class="btn-edit" onclick="meetingNotes.editMeeting('${m.id}')">수정</button>
            <button class="btn-export" onclick="meetingNotes.exportMeeting('${m.id}')">내보내기</button>
            <button class="btn-delete" onclick="meetingNotes.deleteMeeting('${m.id}')">삭제</button>
          </div>
        </div>
      `;
    }).join('');
  }

  saveMeetingHandler() {
    const title = this.elements.meetingTitle.value.trim();
    const date = this.elements.meetingDate.value;

    if (!title || !date) {
      this.showToast('제목과 날짜를 입력하세요', 'error');
      return;
    }

    const meetingData = {
      title,
      date,
      attendees: this.elements.attendees.value.trim(),
      agenda: this.elements.agenda.value.trim(),
      notes: this.elements.notes.value.trim(),
      decisions: this.elements.decisions.value.trim(),
      actionItems: this.getActionItems()
    };

    if (this.editingId) {
      const idx = this.meetings.findIndex(m => m.id === this.editingId);
      if (idx > -1) {
        this.meetings[idx] = { ...this.meetings[idx], ...meetingData };
      }
      this.editingId = null;
      this.elements.formTitle.textContent = '새 회의록 작성';
      this.elements.cancelEdit.style.display = 'none';
    } else {
      this.meetings.unshift({ id: Date.now().toString(), ...meetingData });
    }

    this.save();
    this.render();
    this.clearForm();
    this.showToast('회의록이 저장되었습니다', 'success');
  }

  clearForm() {
    this.elements.meetingTitle.value = '';
    this.setDefaultDate();
    this.elements.attendees.value = '';
    this.elements.agenda.value = '';
    this.elements.notes.value = '';
    this.elements.decisions.value = '';
    this.setActionItems([]);
  }

  editMeeting(id) {
    const meeting = this.meetings.find(m => m.id === id);
    if (!meeting) return;

    this.editingId = id;
    this.elements.formTitle.textContent = '회의록 수정';
    this.elements.cancelEdit.style.display = 'block';

    this.elements.meetingTitle.value = meeting.title;
    this.elements.meetingDate.value = meeting.date;
    this.elements.attendees.value = meeting.attendees || '';
    this.elements.agenda.value = meeting.agenda || '';
    this.elements.notes.value = meeting.notes || '';
    this.elements.decisions.value = meeting.decisions || '';
    this.setActionItems(meeting.actionItems);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteMeeting(id) {
    if (confirm('이 회의록을 삭제하시겠습니까?')) {
      this.meetings = this.meetings.filter(m => m.id !== id);
      this.save();
      this.render();
      this.showToast('회의록이 삭제되었습니다', 'success');
    }
  }

  exportMeeting(id) {
    const meeting = this.meetings.find(m => m.id === id);
    if (!meeting) return;

    const date = new Date(meeting.date);
    let content = `# ${meeting.title}\n\n`;
    content += `**날짜:** ${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n\n`;
    content += `**참석자:** ${meeting.attendees || '-'}\n\n`;
    content += `## 안건\n${meeting.agenda || '-'}\n\n`;
    content += `## 회의 내용\n${meeting.notes || '-'}\n\n`;
    content += `## 결정 사항\n${meeting.decisions || '-'}\n\n`;
    content += `## 액션 아이템\n`;
    (meeting.actionItems || []).forEach((item, i) => {
      content += `${i + 1}. ${item.task} (담당: ${item.assignee || '-'}, 기한: ${item.dueDate || '-'})\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = meeting.title.replace(/[^a-zA-Z0-9가-힣]/g, '_') + '.md';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('회의록이 내보내기되었습니다', 'success');
  }

  cancelEditHandler() {
    this.editingId = null;
    this.elements.formTitle.textContent = '새 회의록 작성';
    this.elements.cancelEdit.style.display = 'none';
    this.clearForm();
  }
}

// 전역 인스턴스 생성
const meetingNotes = new MeetingNotes();
window.MeetingNotes = meetingNotes;

document.addEventListener('DOMContentLoaded', () => meetingNotes.init());
