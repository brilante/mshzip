/**
 * 플래시카드 생성기 - ToolBase 기반
 * 학습용 플래시카드 생성 및 암기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class FlashcardGen extends ToolBase {
  constructor() {
    super('FlashcardGen');
    this.cards = [];
    this.currentIndex = 0;
    this.isFlipped = false;
    this.currentMode = 'study';
    this.decks = {};

    this.defaultCards = [
      { front: 'Hello', back: '안녕하세요' },
      { front: 'Thank you', back: '감사합니다' },
      { front: 'Goodbye', back: '안녕히 가세요' },
      { front: 'Sorry', back: '죄송합니다' },
      { front: 'Please', back: '부탁합니다' }
    ];
  }

  init() {
    this.initElements({
      cardFront: 'cardFront',
      cardBack: 'cardBack',
      flashcard: 'flashcard',
      currentCard: 'currentCard',
      totalCards: 'totalCards',
      progressFill: 'progressFill',
      prevBtn: 'prevBtn',
      nextBtn: 'nextBtn',
      studyMode: 'studyMode',
      createMode: 'createMode',
      frontInput: 'frontInput',
      backInput: 'backInput',
      cardsList: 'cardsList',
      deckSelect: 'deckSelect',
      deckName: 'deckName'
    });

    this.loadDecks();
    this.updateDeckSelector();
    this.loadDeck();
    this.render();
    this.setupKeyboard();

    console.log('[FlashcardGen] 초기화 완료');
    return this;
  }

  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          this.flip();
          break;
        case 'ArrowRight':
          this.next();
          break;
        case 'ArrowLeft':
          this.prev();
          break;
      }
    });
  }

  setMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    this.elements.studyMode.style.display = mode === 'study' ? 'block' : 'none';
    this.elements.createMode.style.display = mode === 'create' ? 'block' : 'none';
  }

  loadDeck() {
    const deckName = this.elements.deckSelect.value;
    if (deckName === 'default') {
      this.cards = [...this.defaultCards];
    } else {
      this.cards = this.decks[deckName] ? [...this.decks[deckName]] : [];
    }
    this.currentIndex = 0;
    this.isFlipped = false;
    this.render();
    this.renderCardsList();
  }

  render() {
    if (this.cards.length === 0) {
      this.elements.cardFront.textContent = '카드를 추가해주세요';
      this.elements.cardBack.textContent = '';
      this.elements.currentCard.textContent = '0';
      this.elements.totalCards.textContent = '0';
      this.elements.progressFill.style.width = '0%';
      return;
    }

    const card = this.cards[this.currentIndex];
    this.elements.cardFront.textContent = card.front;
    this.elements.cardBack.textContent = card.back;
    this.elements.currentCard.textContent = this.currentIndex + 1;
    this.elements.totalCards.textContent = this.cards.length;

    const progress = ((this.currentIndex + 1) / this.cards.length) * 100;
    this.elements.progressFill.style.width = progress + '%';

    this.elements.flashcard.classList.toggle('flipped', this.isFlipped);

    this.elements.prevBtn.disabled = this.currentIndex === 0;
    this.elements.nextBtn.disabled = this.currentIndex === this.cards.length - 1;
  }

  flip() {
    this.isFlipped = !this.isFlipped;
    this.elements.flashcard.classList.toggle('flipped', this.isFlipped);
  }

  next() {
    if (this.currentIndex < this.cards.length - 1) {
      this.currentIndex++;
      this.isFlipped = false;
      this.render();
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.isFlipped = false;
      this.render();
    }
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    this.currentIndex = 0;
    this.isFlipped = false;
    this.render();
    this.showToast('카드가 섞였습니다!', 'success');
  }

  reset() {
    this.currentIndex = 0;
    this.isFlipped = false;
    this.render();
  }

  addCard() {
    const front = this.elements.frontInput.value.trim();
    const back = this.elements.backInput.value.trim();

    if (!front || !back) {
      this.showToast('앞면과 뒷면을 모두 입력하세요.', 'error');
      return;
    }

    this.cards.push({ front, back });
    this.elements.frontInput.value = '';
    this.elements.backInput.value = '';
    this.elements.frontInput.focus();

    this.renderCardsList();
    this.showToast('카드가 추가되었습니다!', 'success');
  }

  removeCard(index) {
    this.cards.splice(index, 1);
    if (this.currentIndex >= this.cards.length && this.currentIndex > 0) {
      this.currentIndex = this.cards.length - 1;
    }
    this.render();
    this.renderCardsList();
  }

  renderCardsList() {
    if (this.cards.length === 0) {
      this.elements.cardsList.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.85rem; text-align: center;">아직 카드가 없습니다.</div>';
    } else {
      this.elements.cardsList.innerHTML = this.cards.map((card, i) =>
        `<div class="card-item">
          <span class="card-item-text">${card.front} → ${card.back}</span>
          <button onclick="flashcardGen.removeCard(${i})"></button>
        </div>`
      ).join('');
    }
  }

  saveDeck() {
    const name = this.elements.deckName.value.trim();
    if (!name) {
      this.showToast('덱 이름을 입력하세요.', 'error');
      return;
    }

    if (this.cards.length === 0) {
      this.showToast('저장할 카드가 없습니다.', 'error');
      return;
    }

    this.decks[name] = [...this.cards];
    this.saveDecks();
    this.updateDeckSelector();

    this.elements.deckName.value = '';
    this.showToast(`'${name}' 덱이 저장되었습니다!`, 'success');
  }

  updateDeckSelector() {
    this.elements.deckSelect.innerHTML = '<option value="default">기본 덱</option>';

    Object.keys(this.decks).forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      this.elements.deckSelect.appendChild(option);
    });
  }

  saveDecks() {
    localStorage.setItem('flashcardDecks', JSON.stringify(this.decks));
  }

  loadDecks() {
    try {
      const saved = localStorage.getItem('flashcardDecks');
      if (saved) {
        this.decks = JSON.parse(saved);
      }
    } catch (e) {
      console.error('[FlashcardGen] 덱 로드 실패:', e);
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const flashcardGen = new FlashcardGen();
window.FlashcardGen = flashcardGen;

document.addEventListener('DOMContentLoaded', () => flashcardGen.init());
