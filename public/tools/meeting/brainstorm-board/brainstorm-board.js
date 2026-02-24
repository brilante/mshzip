/**
 * 브레인스톰 보드 - ToolBase 기반
 * 아이디어 수집 및 정리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BrainstormBoard = class BrainstormBoard extends ToolBase {
  constructor() {
    super('BrainstormBoard');
    this.ideas = [];
    this.currentFilter = 'all';
    this.timerInterval = null;
    this.timerSeconds = 300;
    this.storageKey = 'brainstormBoard_data';

    this.categories = {
      general: { name: '일반', emoji: '' },
      feature: { name: '기능', emoji: '' },
      improvement: { name: '개선', emoji: '' },
      crazy: { name: '과감한', emoji: '' },
      question: { name: '질문', emoji: '' }
    };
  }

  init() {
    this.initElements({
      ideaInput: 'ideaInput',
      ideaCategory: 'ideaCategory',
      ideasBoard: 'ideasBoard',
      emptyState: 'emptyState',
      ideaCount: 'ideaCount',
      sortOrder: 'sortOrder',
      sessionTopic: 'sessionTopic',
      timerDisplay: 'timerDisplay',
      timerIcon: 'timerIcon',
      groupModal: 'groupModal',
      groupedView: 'groupedView'
    });

    // Enter 키 이벤트
    this.elements.ideaInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addIdea();
    });

    this.render();

    console.log('[BrainstormBoard] 초기화 완료');
    return this;
  }

  addIdea() {
    const text = this.elements.ideaInput.value.trim();
    const category = this.elements.ideaCategory.value;

    if (!text) return;

    const idea = {
      id: Date.now(),
      text,
      category,
      votes: 0,
      voted: false,
      createdAt: new Date().toISOString()
    };

    this.ideas.unshift(idea);
    this.elements.ideaInput.value = '';
    this.render();
  }

  deleteIdea(id) {
    this.ideas = this.ideas.filter(i => i.id !== id);
    this.render();
  }

  vote(id) {
    const idea = this.ideas.find(i => i.id === id);
    if (!idea) return;

    if (idea.voted) {
      idea.votes--;
      idea.voted = false;
    } else {
      idea.votes++;
      idea.voted = true;
    }
    this.render();
  }

  setFilter(filter) {
    this.currentFilter = filter;

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.filter === filter) {
        btn.classList.add('active');
      }
    });

    this.render();
  }

  getFilteredIdeas() {
    let filtered = this.ideas;

    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(i => i.category === this.currentFilter);
    }

    const sortOrder = this.elements.sortOrder.value;
    switch (sortOrder) {
      case 'newest':
        filtered.sort((a, b) => b.id - a.id);
        break;
      case 'votes':
        filtered.sort((a, b) => b.votes - a.votes);
        break;
      case 'category':
        filtered.sort((a, b) => a.category.localeCompare(b.category));
        break;
    }

    return filtered;
  }

  render() {
    const filtered = this.getFilteredIdeas();

    this.elements.ideaCount.textContent = filtered.length;

    if (filtered.length === 0) {
      this.elements.ideasBoard.innerHTML = '';
      this.elements.emptyState.classList.add('show');
      return;
    }

    this.elements.emptyState.classList.remove('show');
    this.elements.ideasBoard.innerHTML = filtered.map(idea => this.renderIdea(idea)).join('');
  }

  renderIdea(idea) {
    const cat = this.categories[idea.category];
    const time = new Date(idea.createdAt).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="idea-card category-${idea.category}">
        <div class="idea-header">
          <span class="idea-category">${cat.emoji} ${cat.name}</span>
          <button class="idea-delete" onclick="brainstormBoard.deleteIdea(${idea.id})"></button>
        </div>
        <div class="idea-text">${this.escapeHtml(idea.text)}</div>
        <div class="idea-footer">
          <span class="idea-time">${time}</span>
          <button class="vote-btn ${idea.voted ? 'voted' : ''}" onclick="brainstormBoard.vote(${idea.id})">
            <span>${idea.votes}</span>
          </button>
        </div>
      </div>
    `;
  }

  toggleTimer() {
    const btn = document.querySelector('.timer-btn');

    if (this.timerInterval) {
      // 타이머 정지
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      this.timerSeconds = 300;
      btn.classList.remove('running');
      this.elements.timerIcon.textContent = '';
      this.updateTimerDisplay();
    } else {
      // 타이머 시작
      btn.classList.add('running');
      this.elements.timerIcon.textContent = '';
      this.timerInterval = setInterval(() => {
        this.timerSeconds--;
        this.updateTimerDisplay();

        if (this.timerSeconds <= 0) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
          btn.classList.remove('running');
          this.elements.timerIcon.textContent = '';
          this.timerSeconds = 300;
          this.playSound();
          this.showToast('브레인스토밍 시간이 종료되었습니다!', 'info');
        }
      }, 1000);
    }
  }

  updateTimerDisplay() {
    const minutes = Math.floor(this.timerSeconds / 60);
    const seconds = this.timerSeconds % 60;
    this.elements.timerDisplay.textContent =
      `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  playSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  }

  shuffle() {
    for (let i = this.ideas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.ideas[i], this.ideas[j]] = [this.ideas[j], this.ideas[i]];
    }
    this.render();
  }

  group() {
    const grouped = {};
    Object.keys(this.categories).forEach(cat => {
      grouped[cat] = this.ideas.filter(i => i.category === cat);
    });

    this.elements.groupedView.innerHTML = Object.entries(grouped).map(([cat, ideas]) => {
      if (ideas.length === 0) return '';
      const catInfo = this.categories[cat];

      return `
        <div class="group-section">
          <div class="group-title">
            ${catInfo.emoji} ${catInfo.name}
            <span class="group-count">${ideas.length}개</span>
          </div>
          <div class="group-ideas">
            ${ideas.map(idea => `
              <div class="group-idea">
                ${this.escapeHtml(idea.text)}
                ${idea.votes > 0 ? `<span style="color:var(--tools-primary);margin-left:8px">${idea.votes}</span>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');

    this.elements.groupModal.classList.add('show');
  }

  closeGroupModal(event) {
    if (event && event.target !== event.currentTarget) return;
    this.elements.groupModal.classList.remove('show');
  }

  exportMarkdown() {
    const topic = this.elements.sessionTopic.value.trim() || '브레인스토밍';
    const date = new Date().toLocaleDateString('ko-KR');

    let md = `# ${topic}\n\n`;
    md += `**날짜**: ${date}\n`;
    md += `**아이디어 수**: ${this.ideas.length}개\n\n`;

    Object.entries(this.categories).forEach(([cat, info]) => {
      const ideas = this.ideas.filter(i => i.category === cat);
      if (ideas.length === 0) return;

      md += `## ${info.emoji} ${info.name}\n\n`;
      ideas.forEach(idea => {
        md += `- ${idea.text}${idea.votes > 0 ? ` (${idea.votes})` : ''}\n`;
      });
      md += `\n`;
    });

    md += `---\n`;
    md += `*MyMind3 브레인스톰 보드로 작성됨*\n`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brainstorm_${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  copyBoard() {
    const topic = this.elements.sessionTopic.value.trim() || '브레인스토밍';
    let text = `${topic}\n\n`;

    Object.entries(this.categories).forEach(([cat, info]) => {
      const ideas = this.ideas.filter(i => i.category === cat);
      if (ideas.length === 0) return;

      text += `${info.emoji} ${info.name}:\n`;
      ideas.forEach(idea => {
        text += `  • ${idea.text}${idea.votes > 0 ? ` (${idea.votes})` : ''}\n`;
      });
      text += `\n`;
    });

    this.copyToClipboard(text);
  }

  saveSession() {
    const data = {
      topic: this.elements.sessionTopic.value,
      ideas: this.ideas,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    this.showToast('저장되었습니다!', 'success');
  }

  loadSession() {
    const saved = localStorage.getItem(this.storageKey);
    if (!saved) {
      this.showToast('저장된 세션이 없습니다.', 'error');
      return;
    }

    const data = JSON.parse(saved);
    this.elements.sessionTopic.value = data.topic || '';
    this.ideas = data.ideas || [];
    this.render();
    this.showToast('불러왔습니다!', 'success');
  }

  clearBoard() {
    if (!confirm('모든 아이디어를 삭제하시겠습니까?')) return;
    this.ideas = [];
    this.render();
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
const brainstormBoard = new BrainstormBoard();
window.BrainstormBoard = brainstormBoard;

// 전역 함수 (HTML onclick 호환)
function addIdea() { brainstormBoard.addIdea(); }
function setFilter(filter) { brainstormBoard.setFilter(filter); }
function sort() { brainstormBoard.render(); }
function toggleTimer() { brainstormBoard.toggleTimer(); }
function shuffle() { brainstormBoard.shuffle(); }
function group() { brainstormBoard.group(); }
function closeGroupModal(event) { brainstormBoard.closeGroupModal(event); }
function exportMarkdown() { brainstormBoard.exportMarkdown(); }
function copyToClipboard() { brainstormBoard.copyBoard(); }
function saveSession() { brainstormBoard.saveSession(); }
function loadSession() { brainstormBoard.loadSession(); }
function clearBoard() { brainstormBoard.clearBoard(); }

document.addEventListener('DOMContentLoaded', () => brainstormBoard.init());
