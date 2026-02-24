/**
 * 회의 안건 작성기 - ToolBase 기반
 * 효율적인 회의 준비 도구
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var AgendaBuilder = class AgendaBuilder extends ToolBase {
  constructor() {
    super('AgendaBuilder');
    this.attendees = [];
    this.agendas = [];
    this.storageKey = 'agendaBuilder_data';
  }

  init() {
    this.initElements({
      meetingTitle: 'meetingTitle',
      meetingDate: 'meetingDate',
      meetingLocation: 'meetingLocation',
      meetingHost: 'meetingHost',
      attendeeInput: 'attendeeInput',
      attendeesList: 'attendeesList',
      agendaTitle: 'agendaTitle',
      agendaTime: 'agendaTime',
      agendaType: 'agendaType',
      agendaList: 'agendaList',
      totalTime: 'totalTime',
      previewContent: 'previewContent',
      ruleCamera: 'ruleCamera',
      ruleMute: 'ruleMute',
      ruleTime: 'ruleTime',
      ruleNotes: 'ruleNotes'
    });

    // 날짜 기본값 설정
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
    this.elements.meetingDate.value = now.toISOString().slice(0, 16);

    // Enter 키 이벤트
    this.elements.attendeeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addAttendee();
    });
    this.elements.agendaTitle.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addAgenda();
    });

    // 실시간 미리보기
    this.setupLivePreview();
    this.updatePreview();

    console.log('[AgendaBuilder] 초기화 완료');
    return this;
  }

  setupLivePreview() {
    const inputs = ['meetingTitle', 'meetingDate', 'meetingLocation', 'meetingHost'];
    inputs.forEach(id => {
      this.elements[id].addEventListener('input', () => this.updatePreview());
    });
  }

  addAttendee() {
    const name = this.elements.attendeeInput.value.trim();

    if (!name) return;
    if (this.attendees.includes(name)) {
      this.showToast('이미 추가된 참석자입니다.', 'error');
      return;
    }

    this.attendees.push(name);
    this.elements.attendeeInput.value = '';
    this.renderAttendees();
    this.updatePreview();
  }

  removeAttendee(index) {
    this.attendees.splice(index, 1);
    this.renderAttendees();
    this.updatePreview();
  }

  renderAttendees() {
    this.elements.attendeesList.innerHTML = this.attendees.map((name, i) => `
      <span class="attendee-tag">
        ${this.escapeHtml(name)}
        <span class="remove" onclick="agendaBuilder.removeAttendee(${i})"></span>
      </span>
    `).join('');
  }

  addAgenda() {
    const title = this.elements.agendaTitle.value.trim();
    const time = parseInt(this.elements.agendaTime.value) || 5;
    const type = this.elements.agendaType.value;

    if (!title) {
      this.showToast('안건 제목을 입력해주세요.', 'error');
      return;
    }

    this.agendas.push({ title, time, type });
    this.elements.agendaTitle.value = '';
    this.elements.agendaTime.value = '5';

    this.renderAgendas();
    this.updatePreview();
  }

  removeAgenda(index) {
    this.agendas.splice(index, 1);
    this.renderAgendas();
    this.updatePreview();
  }

  moveAgenda(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.agendas.length) return;

    const temp = this.agendas[index];
    this.agendas[index] = this.agendas[newIndex];
    this.agendas[newIndex] = temp;

    this.renderAgendas();
    this.updatePreview();
  }

  renderAgendas() {
    if (this.agendas.length === 0) {
      this.elements.agendaList.innerHTML = '<div class="empty-state">안건을 추가해주세요</div>';
      this.elements.totalTime.textContent = '0';
      return;
    }

    const typeLabels = {
      discussion: '토론',
      decision: '의사결정',
      info: '정보공유',
      brainstorm: '브레인스토밍'
    };

    this.elements.agendaList.innerHTML = this.agendas.map((agenda, i) => `
      <div class="agenda-item ${agenda.type}">
        <span class="agenda-number">${i + 1}</span>
        <div class="agenda-info">
          <div class="agenda-title">${this.escapeHtml(agenda.title)}</div>
          <div class="agenda-meta">
            <span>${typeLabels[agenda.type]}</span>
          </div>
        </div>
        <span class="agenda-time">${agenda.time}분</span>
        <div class="agenda-actions">
          <button class="agenda-btn" onclick="agendaBuilder.moveAgenda(${i}, -1)" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button class="agenda-btn" onclick="agendaBuilder.moveAgenda(${i}, 1)" ${i === this.agendas.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="agenda-btn delete" onclick="agendaBuilder.removeAgenda(${i})"></button>
        </div>
      </div>
    `).join('');

    const totalTime = this.agendas.reduce((sum, a) => sum + a.time, 0);
    this.elements.totalTime.textContent = totalTime;
  }

  getSelectedRules() {
    const rules = [];
    if (this.elements.ruleCamera.checked) rules.push('카메라 ON 필수');
    if (this.elements.ruleMute.checked) rules.push('발언 시 외 음소거');
    if (this.elements.ruleTime.checked) rules.push('안건별 시간 엄수');
    if (this.elements.ruleNotes.checked) rules.push('회의록 작성');
    return rules;
  }

  generateMarkdown() {
    const title = this.elements.meetingTitle.value || '회의';
    const date = this.elements.meetingDate.value;
    const location = this.elements.meetingLocation.value;
    const host = this.elements.meetingHost.value;
    const rules = this.getSelectedRules();

    const formattedDate = date ? new Date(date).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }) : '미정';

    const typeLabels = {
      discussion: '토론',
      decision: '의사결정',
      info: '정보공유',
      brainstorm: '브레인스토밍'
    };

    let md = `# ${title}\n\n`;
    md += `## 회의 정보\n\n`;
    md += `- **일시**: ${formattedDate}\n`;
    if (location) md += `- **장소**: ${location}\n`;
    if (host) md += `- **진행자**: ${host}\n`;
    md += `- **예상 소요시간**: ${this.agendas.reduce((sum, a) => sum + a.time, 0)}분\n\n`;

    if (this.attendees.length > 0) {
      md += `## 참석자\n\n`;
      this.attendees.forEach(name => {
        md += `- ${name}\n`;
      });
      md += `\n`;
    }

    if (this.agendas.length > 0) {
      md += `## 안건\n\n`;
      this.agendas.forEach((agenda, i) => {
        md += `### ${i + 1}. ${agenda.title}\n`;
        md += `- **유형**: ${typeLabels[agenda.type]}\n`;
        md += `- **시간**: ${agenda.time}분\n`;
        md += `- **담당자**: \n`;
        md += `- **메모**: \n\n`;
      });
    }

    if (rules.length > 0) {
      md += `## 회의 규칙\n\n`;
      rules.forEach(rule => {
        md += `- ${rule}\n`;
      });
      md += `\n`;
    }

    md += `---\n`;
    md += `*이 안건은 MyMind3 회의 안건 작성기로 생성되었습니다.*\n`;

    return md;
  }

  updatePreview() {
    const md = this.generateMarkdown();
    this.elements.previewContent.textContent = md;
  }

  exportMarkdown() {
    const md = this.generateMarkdown();
    const title = this.elements.meetingTitle.value || '회의안건';
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  copyMarkdown() {
    const md = this.generateMarkdown();
    this.copyToClipboard(md);
  }

  saveAgenda() {
    const data = {
      title: this.elements.meetingTitle.value,
      date: this.elements.meetingDate.value,
      location: this.elements.meetingLocation.value,
      host: this.elements.meetingHost.value,
      attendees: this.attendees,
      agendas: this.agendas,
      rules: {
        camera: this.elements.ruleCamera.checked,
        mute: this.elements.ruleMute.checked,
        time: this.elements.ruleTime.checked,
        notes: this.elements.ruleNotes.checked
      }
    };

    localStorage.setItem(this.storageKey, JSON.stringify(data));
    this.showToast('저장되었습니다!', 'success');
  }

  loadSaved() {
    const saved = localStorage.getItem(this.storageKey);
    if (!saved) {
      this.showToast('저장된 안건이 없습니다.', 'error');
      return;
    }

    const data = JSON.parse(saved);

    this.elements.meetingTitle.value = data.title || '';
    this.elements.meetingDate.value = data.date || '';
    this.elements.meetingLocation.value = data.location || '';
    this.elements.meetingHost.value = data.host || '';

    this.attendees = data.attendees || [];
    this.agendas = data.agendas || [];

    if (data.rules) {
      this.elements.ruleCamera.checked = data.rules.camera;
      this.elements.ruleMute.checked = data.rules.mute;
      this.elements.ruleTime.checked = data.rules.time;
      this.elements.ruleNotes.checked = data.rules.notes;
    }

    this.renderAttendees();
    this.renderAgendas();
    this.updatePreview();

    this.showToast('불러왔습니다!', 'success');
  }

  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// 전역 인스턴스 생성
const agendaBuilder = new AgendaBuilder();
window.AgendaBuilder = agendaBuilder;

// 전역 함수 (HTML onclick 호환)
function addAttendee() { agendaBuilder.addAttendee(); }
function addAgenda() { agendaBuilder.addAgenda(); }
function exportMarkdown() { agendaBuilder.exportMarkdown(); }
function copyToClipboard() { agendaBuilder.copyMarkdown(); }
function saveAgenda() { agendaBuilder.saveAgenda(); }
function loadSaved() { agendaBuilder.loadSaved(); }

document.addEventListener('DOMContentLoaded', () => agendaBuilder.init());
