/**
 * 플래시카드 메이커 - ToolBase 기반
 * 카드 만들기 및 학습
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class FlashcardMaker extends ToolBase {
  constructor() {
    super('FlashcardMaker');
    this.cards = [];
    this.currentIndex = 0;
    this.isFlipped = false;
  }

  init() {
    this.initElements({
      flashcard: 'flashcard',
      frontText: 'frontText',
      backText: 'backText',
      cardCount: 'cardCount',
      studyProgress: 'studyProgress',
      cardListContainer: 'cardListContainer',
      cardFront: 'cardFront',
      cardBack: 'cardBack',
      cardCategory: 'cardCategory',
      addCard: 'addCard',
      flipCard: 'flipCard',
      prevCard: 'prevCard',
      nextCard: 'nextCard',
      clearAll: 'clearAll'
    });

    this.loadData();
    this.setupEvents();
    this.updateDisplay();

    console.log('[FlashcardMaker] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('flashcards');
      if (saved) {
        this.cards = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('flashcards', JSON.stringify(this.cards));
  }

  setupEvents() {
    this.elements.addCard.addEventListener('click', () => this.addCard());

    this.elements.flipCard.addEventListener('click', () => this.flip());
    this.elements.flashcard.addEventListener('click', () => this.flip());

    this.elements.prevCard.addEventListener('click', () => this.prev());
    this.elements.nextCard.addEventListener('click', () => this.next());

    this.elements.clearAll.addEventListener('click', () => this.clearAll());

    document.querySelectorAll('.rating').forEach(btn => {
      btn.addEventListener('click', () => this.rate(btn.dataset.rating));
    });
  }

  updateDisplay() {
    this.elements.cardCount.textContent = this.cards.length + '개의 카드';
    this.elements.studyProgress.textContent = (this.currentIndex + 1) + ' / ' + this.cards.length;

    if (this.cards.length > 0) {
      this.elements.frontText.textContent = this.cards[this.currentIndex].front;
      this.elements.backText.textContent = this.cards[this.currentIndex].back;
    } else {
      this.elements.frontText.textContent = '카드를 추가하세요';
      this.elements.backText.textContent = '';
      this.currentIndex = 0;
    }

    this.renderCardList();
  }

  renderCardList() {
    this.elements.cardListContainer.innerHTML = this.cards.map((card, idx) => `
      <div class="card-item">
        <div class="card-item-content">
          <div class="card-item-front">${this.escapeHtml(card.front)}</div>
          <div class="card-item-category">${this.escapeHtml(card.category || '미분류')}</div>
        </div>
        <button onclick="flashcardMaker.deleteCard(${idx})">삭제</button>
      </div>
    `).join('');
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  addCard() {
    const front = this.elements.cardFront.value.trim();
    const back = this.elements.cardBack.value.trim();
    const category = this.elements.cardCategory.value.trim();

    if (!front || !back) {
      alert('앞면과 뒷면을 모두 입력하세요');
      return;
    }

    this.cards.push({ front, back, category, rating: null });
    this.saveData();
    this.updateDisplay();

    this.elements.cardFront.value = '';
    this.elements.cardBack.value = '';

    this.showToast('카드가 추가되었습니다!', 'success');
  }

  flip() {
    this.elements.flashcard.classList.toggle('flipped');
    this.isFlipped = !this.isFlipped;
  }

  prev() {
    if (this.cards.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.cards.length) % this.cards.length;
    this.elements.flashcard.classList.remove('flipped');
    this.isFlipped = false;
    this.updateDisplay();
  }

  next() {
    if (this.cards.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.cards.length;
    this.elements.flashcard.classList.remove('flipped');
    this.isFlipped = false;
    this.updateDisplay();
  }

  rate(rating) {
    if (this.cards.length === 0) return;
    this.cards[this.currentIndex].rating = rating;
    this.saveData();
    this.currentIndex = (this.currentIndex + 1) % this.cards.length;
    this.elements.flashcard.classList.remove('flipped');
    this.isFlipped = false;
    this.updateDisplay();
  }

  deleteCard(idx) {
    this.cards.splice(idx, 1);
    if (this.currentIndex >= this.cards.length) {
      this.currentIndex = Math.max(0, this.cards.length - 1);
    }
    this.saveData();
    this.updateDisplay();
  }

  clearAll() {
    if (confirm('모든 카드를 삭제하시겠습니까?')) {
      this.cards = [];
      this.currentIndex = 0;
      this.saveData();
      this.updateDisplay();
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const flashcardMaker = new FlashcardMaker();
window.FlashcardMaker = flashcardMaker;

document.addEventListener('DOMContentLoaded', () => flashcardMaker.init());
