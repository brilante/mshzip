/**
 * 브레인스토밍 - ToolBase 기반
 * 아이디어 보드 및 세션 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class Brainstorm extends ToolBase {
  constructor() {
    super('Brainstorm');
    this.ideas = [];
    this.sessions = [];
    this.currentColor = '#fff9c4';
    this.currentSessionId = null;
  }

  init() {
    this.initElements({
      ideaText: 'ideaText',
      addIdea: 'addIdea',
      ideaBoard: 'ideaBoard',
      sessionTitle: 'sessionTitle',
      newSession: 'newSession',
      saveSession: 'saveSession',
      clearBoard: 'clearBoard',
      sessionsList: 'sessionsList'
    });

    this.load();
    this.bindEvents();
    this.renderBoard();
    this.renderSessions();

    console.log('[Brainstorm] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('brainstormSessions');
      if (saved) {
        this.sessions = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('brainstormSessions', JSON.stringify(this.sessions));
  }

  bindEvents() {
    // 색상 버튼 이벤트
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentColor = btn.dataset.color;
      });
    });

    this.elements.addIdea.addEventListener('click', () => this.addIdeaHandler());
    this.elements.ideaText.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.addIdeaHandler();
      }
    });

    this.elements.newSession.addEventListener('click', () => this.newSessionHandler());
    this.elements.saveSession.addEventListener('click', () => this.saveSessionHandler());
    this.elements.clearBoard.addEventListener('click', () => this.clearBoardHandler());
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  renderBoard() {
    this.elements.ideaBoard.innerHTML = this.ideas.map((idea, idx) => `
      <div class="idea-card" style="background: ${idea.color}" data-idx="${idx}">
        <p>${this.escapeHtml(idea.text)}</p>
        <button class="delete-btn" onclick="brainstorm.deleteIdea(${idx})">×</button>
        <button class="vote-btn" onclick="brainstorm.voteIdea(${idx})">${idea.votes || 0}</button>
      </div>
    `).join('');
  }

  renderSessions() {
    this.elements.sessionsList.innerHTML = this.sessions.map(s => {
      const date = new Date(s.date);
      return `
        <div class="session-item" onclick="brainstorm.loadSession('${s.id}')">
          <div>
            <h4>${this.escapeHtml(s.title || '제목 없음')}</h4>
            <small>${date.toLocaleDateString()} | ${s.ideas.length}개 아이디어</small>
          </div>
          <button onclick="event.stopPropagation(); brainstorm.deleteSession('${s.id}')">삭제</button>
        </div>
      `;
    }).join('');
  }

  addIdeaHandler() {
    const text = this.elements.ideaText.value.trim();
    if (!text) return;

    this.ideas.push({ text, color: this.currentColor, votes: 0 });
    this.elements.ideaText.value = '';
    this.renderBoard();
  }

  deleteIdea(idx) {
    this.ideas.splice(idx, 1);
    this.renderBoard();
  }

  voteIdea(idx) {
    this.ideas[idx].votes = (this.ideas[idx].votes || 0) + 1;
    this.renderBoard();
  }

  newSessionHandler() {
    this.ideas = [];
    this.currentSessionId = null;
    this.elements.sessionTitle.value = '';
    this.renderBoard();
  }

  saveSessionHandler() {
    const title = this.elements.sessionTitle.value.trim() || '제목 없음';

    if (this.ideas.length === 0) {
      this.showToast('저장할 아이디어가 없습니다', 'error');
      return;
    }

    if (this.currentSessionId) {
      const idx = this.sessions.findIndex(s => s.id === this.currentSessionId);
      if (idx > -1) {
        this.sessions[idx].title = title;
        this.sessions[idx].ideas = [...this.ideas];
      }
    } else {
      this.sessions.unshift({
        id: Date.now().toString(),
        title,
        ideas: [...this.ideas],
        date: new Date().toISOString()
      });
    }

    this.save();
    this.renderSessions();
    this.showToast('세션이 저장되었습니다', 'success');
  }

  clearBoardHandler() {
    if (confirm('보드의 모든 아이디어를 지우시겠습니까?')) {
      this.ideas = [];
      this.renderBoard();
    }
  }

  loadSession(id) {
    const session = this.sessions.find(s => s.id === id);
    if (!session) return;

    this.currentSessionId = id;
    this.elements.sessionTitle.value = session.title;
    this.ideas = [...session.ideas];
    this.renderBoard();
    this.showToast('세션을 불러왔습니다', 'success');
  }

  deleteSession(id) {
    if (confirm('이 세션을 삭제하시겠습니까?')) {
      this.sessions = this.sessions.filter(s => s.id !== id);
      this.save();
      this.renderSessions();
      this.showToast('세션이 삭제되었습니다', 'success');
    }
  }
}

// 전역 인스턴스 생성
const brainstorm = new Brainstorm();
window.Brainstorm = brainstorm;

document.addEventListener('DOMContentLoaded', () => brainstorm.init());
