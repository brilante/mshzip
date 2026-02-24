/**
 * 플래시카드 - ToolBase 기반
 * 암기 학습용 카드
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var Flashcard = class Flashcard extends ToolBase {
  constructor() {
    super('Flashcard');
    this.currentDeck = 'default';
    this.decks = {};
    this.currentIndex = 0;
    this.isFlipped = false;
  }

  init() {
    this.initElements({
      deckSelector: 'deckSelector',
      cardQuestion: 'cardQuestion',
      cardAnswer: 'cardAnswer',
      flashcard: 'flashcard',
      cardFront: 'cardFront',
      cardBack: 'cardBack',
      progressText: 'progressText',
      knownCount: 'knownCount',
      unknownCount: 'unknownCount',
      totalCount: 'totalCount'
    });

    this.loadData();
    if (!this.decks['default']) {
      this.decks['default'] = {
        name: '기본',
        cards: []
      };
    }
    this.renderDecks();
    this.showCard();

    console.log('[Flashcard] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('flashcardData');
      if (saved) {
        const data = JSON.parse(saved);
        this.decks = data.decks || {};
        this.currentDeck = data.currentDeck || 'default';
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('flashcardData', JSON.stringify({
      decks: this.decks,
      currentDeck: this.currentDeck
    }));
  }

  renderDecks() {
    this.elements.deckSelector.innerHTML = Object.entries(this.decks).map(([id, deck]) =>
      `<div class="deck-tab ${id === this.currentDeck ? 'active' : ''}" onclick="flashcard.selectDeck('${id}')">${deck.name} (${deck.cards.length})</div>`
    ).join('') + `<div class="deck-tab" onclick="flashcard.createDeck()">+ 새 덱</div>`;
  }

  selectDeck(deckId) {
    this.currentDeck = deckId;
    this.currentIndex = 0;
    this.isFlipped = false;
    this.renderDecks();
    this.showCard();
    this.saveData();
  }

  createDeck() {
    const name = prompt('새 덱 이름을 입력하세요:');
    if (!name) return;

    const id = 'deck_' + Date.now();
    this.decks[id] = { name, cards: [] };
    this.selectDeck(id);
  }

  getCurrentCards() {
    return this.decks[this.currentDeck]?.cards || [];
  }

  addCard() {
    const question = this.elements.cardQuestion.value.trim();
    const answer = this.elements.cardAnswer.value.trim();

    if (!question || !answer) {
      this.showToast('앞면과 뒷면을 모두 입력해주세요', 'error');
      return;
    }

    if (!this.decks[this.currentDeck]) {
      this.decks[this.currentDeck] = { name: '기본', cards: [] };
    }

    this.decks[this.currentDeck].cards.push({
      id: Date.now(),
      question,
      answer,
      known: false
    });

    this.saveData();
    this.renderDecks();
    this.showCard();

    this.elements.cardQuestion.value = '';
    this.elements.cardAnswer.value = '';

    this.showToast('카드가 추가되었습니다', 'success');
  }

  showCard() {
    const cards = this.getCurrentCards();
    const card = cards[this.currentIndex];

    this.elements.flashcard.classList.remove('flipped');
    this.isFlipped = false;

    if (!card) {
      this.elements.cardFront.textContent = '카드를 추가하세요';
      this.elements.cardBack.textContent = '';
      this.elements.progressText.textContent = '0 / 0';
    } else {
      this.elements.cardFront.textContent = card.question;
      this.elements.cardBack.textContent = card.answer;
      this.elements.progressText.textContent = `${this.currentIndex + 1} / ${cards.length}`;
    }

    this.updateStats();
  }

  flip() {
    this.elements.flashcard.classList.toggle('flipped');
    this.isFlipped = !this.isFlipped;
  }

  prev() {
    const cards = this.getCurrentCards();
    if (cards.length === 0) return;

    this.currentIndex = (this.currentIndex - 1 + cards.length) % cards.length;
    this.showCard();
  }

  next() {
    const cards = this.getCurrentCards();
    if (cards.length === 0) return;

    this.currentIndex = (this.currentIndex + 1) % cards.length;
    this.showCard();
  }

  markKnown() {
    const cards = this.getCurrentCards();
    if (cards.length === 0 || !cards[this.currentIndex]) return;

    cards[this.currentIndex].known = true;
    this.saveData();
    this.updateStats();
    this.next();
  }

  markUnknown() {
    const cards = this.getCurrentCards();
    if (cards.length === 0 || !cards[this.currentIndex]) return;

    cards[this.currentIndex].known = false;
    this.saveData();
    this.updateStats();
    this.next();
  }

  updateStats() {
    const cards = this.getCurrentCards();
    const known = cards.filter(c => c.known).length;
    const unknown = cards.length - known;

    this.elements.knownCount.textContent = known;
    this.elements.unknownCount.textContent = unknown;
    this.elements.totalCount.textContent = cards.length;
  }

  shuffle() {
    const cards = this.getCurrentCards();
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    this.currentIndex = 0;
    this.saveData();
    this.showCard();

    this.showToast('카드를 섞었습니다', 'success');
  }

  reset() {
    const cards = this.getCurrentCards();
    cards.forEach(c => c.known = false);
    this.currentIndex = 0;
    this.saveData();
    this.showCard();
  }
}

// 전역 인스턴스 생성
const flashcard = new Flashcard();
window.Flashcard = flashcard;

document.addEventListener('DOMContentLoaded', () => flashcard.init());
