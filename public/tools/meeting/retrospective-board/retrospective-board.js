/**
 * 회고 보드 - ToolBase 기반
 * 팀 회고 진행 도구
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var RetroBoard = class RetroBoard extends ToolBase {
  constructor() {
    super('RetroBoard');
    this.currentTemplate = 'start-stop-continue';
    this.columns = {};
    this.storageKey = 'retroBoard_data';

    this.templates = {
      'start-stop-continue': {
        name: 'Start-Stop-Continue',
        columns: [
          { id: 'start', title: 'Start', subtitle: '시작할 것', color: 'start' },
          { id: 'stop', title: 'Stop', subtitle: '멈출 것', color: 'stop' },
          { id: 'continue', title: 'Continue', subtitle: '계속할 것', color: 'continue' }
        ]
      },
      'liked-learned-lacked': {
        name: 'Liked-Learned-Lacked',
        columns: [
          { id: 'liked', title: 'Liked', subtitle: '좋았던 점', color: 'liked' },
          { id: 'learned', title: 'Learned', subtitle: '배운 점', color: 'learned' },
          { id: 'lacked', title: 'Lacked', subtitle: '부족했던 점', color: 'lacked' }
        ]
      },
      'mad-sad-glad': {
        name: 'Mad-Sad-Glad',
        columns: [
          { id: 'mad', title: 'Mad', subtitle: '화났던 것', color: 'mad' },
          { id: 'sad', title: 'Sad', subtitle: '슬펐던 것', color: 'sad' },
          { id: 'glad', title: 'Glad', subtitle: '기뻤던 것', color: 'glad' }
        ]
      },
      '4ls': {
        name: '4Ls',
        columns: [
          { id: 'liked', title: 'Liked', subtitle: '좋았던 점', color: 'liked' },
          { id: 'learned', title: 'Learned', subtitle: '배운 점', color: 'learned' },
          { id: 'lacked', title: 'Lacked', subtitle: '부족했던 점', color: 'lacked' },
          { id: 'longed', title: 'Longed For', subtitle: '바랐던 것', color: 'longed' }
        ]
      },
      'went-well': {
        name: 'Went Well / Improve',
        columns: [
          { id: 'well', title: 'Went Well', subtitle: '잘된 점', color: 'well' },
          { id: 'improve', title: 'To Improve', subtitle: '개선할 점', color: 'improve' }
        ]
      }
    };
  }

  init() {
    this.initElements({
      retroBoard: 'retroBoard'
    });

    this.setTemplate('start-stop-continue');

    console.log('[RetroBoard] 초기화 완료');
    return this;
  }

  setTemplate(templateId) {
    // 버튼 활성화 상태 변경
    document.querySelectorAll('.template-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.textContent.includes(this.templates[templateId].name) ||
          btn.onclick.toString().includes(templateId)) {
        btn.classList.add('active');
      }
    });

    this.currentTemplate = templateId;
    const template = this.templates[templateId];

    // 컬럼 데이터 초기화
    this.columns = {};
    template.columns.forEach(col => {
      this.columns[col.id] = [];
    });

    this.renderBoard();
  }

  renderBoard() {
    const template = this.templates[this.currentTemplate];

    this.elements.retroBoard.innerHTML = template.columns.map(col => `
      <div class="retro-column" data-column="${col.id}">
        <div class="column-header ${col.color}">
          <span>${col.title}</span>
          <span class="column-count" id="count-${col.id}">${this.columns[col.id].length}</span>
        </div>
        <div class="column-content">
          <div class="card-input">
            <input type="text" id="input-${col.id}" placeholder="${col.subtitle}..." onkeypress="if(event.key==='Enter')retroBoard.addCard('${col.id}')">
            <button onclick="retroBoard.addCard('${col.id}')">+</button>
          </div>
          <div class="cards-list" id="cards-${col.id}">
            ${this.renderCards(col.id)}
          </div>
        </div>
      </div>
    `).join('');
  }

  renderCards(columnId) {
    const cards = this.columns[columnId];
    if (!cards || cards.length === 0) return '';

    return cards.map((card, index) => `
      <div class="retro-card" data-index="${index}">
        <div class="card-content">${this.escapeHtml(card.text)}</div>
        <div class="card-votes">
          <button class="vote-btn" onclick="retroBoard.vote('${columnId}', ${index})"></button>
          <span class="vote-count">${card.votes}</span>
        </div>
        <button class="card-delete" onclick="retroBoard.deleteCard('${columnId}', ${index})"></button>
      </div>
    `).join('');
  }

  addCard(columnId) {
    const input = document.getElementById(`input-${columnId}`);
    const text = input.value.trim();

    if (!text) return;

    this.columns[columnId].push({
      text,
      votes: 0,
      createdAt: new Date().toISOString()
    });

    input.value = '';
    this.updateColumn(columnId);
  }

  deleteCard(columnId, index) {
    this.columns[columnId].splice(index, 1);
    this.updateColumn(columnId);
  }

  vote(columnId, index) {
    this.columns[columnId][index].votes++;
    this.updateColumn(columnId);
  }

  updateColumn(columnId) {
    // 투표순 정렬
    this.columns[columnId].sort((a, b) => b.votes - a.votes);

    document.getElementById(`cards-${columnId}`).innerHTML = this.renderCards(columnId);
    document.getElementById(`count-${columnId}`).textContent = this.columns[columnId].length;
  }

  exportMarkdown() {
    const template = this.templates[this.currentTemplate];
    const date = new Date().toLocaleDateString('ko-KR');

    let md = `# 팀 회고 - ${template.name}\n\n`;
    md += `**날짜**: ${date}\n\n`;

    template.columns.forEach(col => {
      md += `## ${col.title}\n\n`;
      const cards = this.columns[col.id];
      if (cards.length === 0) {
        md += `- (없음)\n\n`;
      } else {
        cards.forEach(card => {
          md += `- ${card.text}${card.votes > 0 ? ` (${card.votes})` : ''}\n`;
        });
        md += `\n`;
      }
    });

    md += `---\n`;
    md += `*MyMind3 회고 보드로 작성됨*\n`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retrospective_${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  copyBoard() {
    const template = this.templates[this.currentTemplate];
    let text = `팀 회고 - ${template.name}\n\n`;

    template.columns.forEach(col => {
      text += `${col.title}\n`;
      const cards = this.columns[col.id];
      if (cards.length === 0) {
        text += `  - (없음)\n`;
      } else {
        cards.forEach(card => {
          text += `  - ${card.text}${card.votes > 0 ? ` (${card.votes})` : ''}\n`;
        });
      }
      text += `\n`;
    });

    this.copyToClipboard(text);
  }

  saveBoard() {
    const data = {
      template: this.currentTemplate,
      columns: this.columns,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    this.showToast('저장되었습니다!', 'success');
  }

  loadBoard() {
    const saved = localStorage.getItem(this.storageKey);
    if (!saved) {
      this.showToast('저장된 데이터가 없습니다.', 'error');
      return;
    }

    const data = JSON.parse(saved);
    this.currentTemplate = data.template;
    this.columns = data.columns;

    // 템플릿 버튼 업데이트
    document.querySelectorAll('.template-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    this.renderBoard();
    this.showToast('불러왔습니다!', 'success');
  }

  clearBoard() {
    if (!confirm('모든 내용을 삭제하시겠습니까?')) return;

    const template = this.templates[this.currentTemplate];
    template.columns.forEach(col => {
      this.columns[col.id] = [];
    });
    this.renderBoard();
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
const retroBoard = new RetroBoard();
window.RetroBoard = retroBoard;

// 전역 함수 (HTML onclick 호환)
function setTemplate(templateId) { retroBoard.setTemplate(templateId); }
function exportMarkdown() { retroBoard.exportMarkdown(); }
function copyToClipboard() { retroBoard.copyBoard(); }
function saveBoard() { retroBoard.saveBoard(); }
function loadBoard() { retroBoard.loadBoard(); }
function clearBoard() { retroBoard.clearBoard(); }

document.addEventListener('DOMContentLoaded', () => retroBoard.init());
