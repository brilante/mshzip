/**
 * 칸반 보드 - ToolBase 기반
 * 드래그 앤 드롭 작업 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class KanbanBoard extends ToolBase {
  constructor() {
    super('KanbanBoard');
    this.cards = [];
    this.editingId = null;
    this.currentStatus = 'todo';
    this.priorityLabels = { low: '낮음', medium: '보통', high: '높음' };
  }

  init() {
    this.initElements({
      todoCards: 'todoCards',
      doingCards: 'doingCards',
      doneCards: 'doneCards',
      todoCount: 'todoCount',
      doingCount: 'doingCount',
      doneCount: 'doneCount',
      cardModal: 'cardModal',
      modalTitle: 'modalTitle',
      cardTitle: 'cardTitle',
      cardDesc: 'cardDesc',
      cardPriority: 'cardPriority',
      saveCard: 'saveCard',
      deleteCard: 'deleteCard',
      cancelCard: 'cancelCard'
    });

    this.load();
    this.render();
    this.bindEvents();

    console.log('[KanbanBoard] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('kanbanCards');
      if (saved) {
        this.cards = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('kanbanCards', JSON.stringify(this.cards));
  }

  bindEvents() {
    // 드래그 앤 드롭 이벤트
    document.querySelectorAll('.column').forEach(column => {
      column.addEventListener('dragover', (e) => {
        e.preventDefault();
      });

      column.addEventListener('drop', (e) => {
        e.preventDefault();
        const cardId = e.dataTransfer.getData('text/plain');
        const newStatus = column.dataset.status;
        const card = this.cards.find(c => c.id === cardId);
        if (card) {
          card.status = newStatus;
          this.save();
          this.render();
        }
      });
    });

    // 추가 버튼 이벤트
    document.querySelectorAll('.add-card-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentStatus = btn.dataset.status;
        this.openNewModal();
      });
    });

    // 모달 이벤트
    this.elements.saveCard.addEventListener('click', () => this.saveCardHandler());
    this.elements.deleteCard.addEventListener('click', () => this.deleteCardHandler());
    this.elements.cancelCard.addEventListener('click', () => this.closeModal());
    this.elements.cardModal.addEventListener('click', (e) => {
      if (e.target.id === 'cardModal') {
        this.closeModal();
      }
    });
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  render() {
    const statuses = ['todo', 'doing', 'done'];
    statuses.forEach(status => {
      const container = this.elements[status + 'Cards'];
      const statusCards = this.cards.filter(c => c.status === status);
      this.elements[status + 'Count'].textContent = statusCards.length;

      container.innerHTML = statusCards.map(card => `
        <div class="card" draggable="true" data-id="${card.id}">
          <div class="card-title">${this.escapeHtml(card.title)}</div>
          <div class="card-desc">${this.escapeHtml(card.desc || '')}</div>
          <span class="card-priority ${card.priority}">${this.priorityLabels[card.priority] || '보통'}</span>
        </div>
      `).join('');
    });

    // 드래그 리스너 추가
    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('dragstart', (e) => this.handleDragStart(e));
      card.addEventListener('dragend', (e) => this.handleDragEnd(e));
      card.addEventListener('click', () => this.openEditModal(card.dataset.id));
    });
  }

  handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
  }

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
  }

  openNewModal() {
    this.editingId = null;
    this.elements.modalTitle.textContent = '새 카드';
    this.elements.cardTitle.value = '';
    this.elements.cardDesc.value = '';
    this.elements.cardPriority.value = 'medium';
    this.elements.deleteCard.style.display = 'none';
    this.elements.cardModal.classList.remove('hidden');
  }

  openEditModal(id) {
    const card = this.cards.find(c => c.id === id);
    if (!card) return;

    this.editingId = id;
    this.currentStatus = card.status;
    this.elements.modalTitle.textContent = '카드 수정';
    this.elements.cardTitle.value = card.title;
    this.elements.cardDesc.value = card.desc || '';
    this.elements.cardPriority.value = card.priority;
    this.elements.deleteCard.style.display = 'block';
    this.elements.cardModal.classList.remove('hidden');
  }

  closeModal() {
    this.elements.cardModal.classList.add('hidden');
  }

  saveCardHandler() {
    const title = this.elements.cardTitle.value.trim();
    if (!title) {
      this.showToast('제목을 입력하세요', 'error');
      return;
    }

    const cardData = {
      title,
      desc: this.elements.cardDesc.value.trim(),
      priority: this.elements.cardPriority.value,
      status: this.currentStatus
    };

    if (this.editingId) {
      const idx = this.cards.findIndex(c => c.id === this.editingId);
      if (idx > -1) {
        this.cards[idx] = { ...this.cards[idx], ...cardData };
      }
    } else {
      this.cards.push({ id: Date.now().toString(), ...cardData });
    }

    this.save();
    this.render();
    this.closeModal();
    this.showToast('카드가 저장되었습니다', 'success');
  }

  deleteCardHandler() {
    if (this.editingId && confirm('이 카드를 삭제하시겠습니까?')) {
      this.cards = this.cards.filter(c => c.id !== this.editingId);
      this.save();
      this.render();
      this.closeModal();
      this.showToast('카드가 삭제되었습니다', 'success');
    }
  }
}

// 전역 인스턴스 생성
const kanbanBoard = new KanbanBoard();
window.KanbanBoard = kanbanBoard;

document.addEventListener('DOMContentLoaded', () => kanbanBoard.init());
