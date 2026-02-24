/**
 * 카드 뽑기 - ToolBase 기반
 * 트럼프 카드 뽑기 및 포커 족보 판정
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class CardDraw extends ToolBase {
  constructor() {
    super('CardDraw');
    this.suits = ['', '', '', ''];
    this.values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    this.deck = [];
    this.hand = [];
    this.history = [];
  }

  init() {
    this.initElements({
      shuffleBtn: 'shuffleBtn',
      drawBtn: 'drawBtn',
      clearHandBtn: 'clearHandBtn',
      drawCount: 'drawCount',
      remainingCount: 'remainingCount',
      drawnCards: 'drawnCards',
      handCards: 'handCards',
      handResult: 'handResult',
      historyList: 'historyList'
    });

    this.createDeck();
    this.shuffle();
    this.setupEvents();

    console.log('[CardDraw] 초기화 완료');
    return this;
  }

  createDeck() {
    this.deck = [];
    this.suits.forEach(suit => {
      this.values.forEach(value => {
        this.deck.push({
          suit,
          value,
          color: suit === '' || suit === '' ? 'red' : 'black'
        });
      });
    });
    this.updateRemainingCount();
  }

  shuffle() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
    this.showToast('카드를 섞었습니다!');
    this.updateRemainingCount();
  }

  setupEvents() {
    this.elements.shuffleBtn.addEventListener('click', () => {
      this.createDeck();
      this.shuffle();
      this.hand = [];
      this.renderHand();
      this.elements.handResult.textContent = '';
    });

    this.elements.drawBtn.addEventListener('click', () => this.draw());
    this.elements.clearHandBtn.addEventListener('click', () => this.clearHand());
  }

  draw() {
    const count = parseInt(this.elements.drawCount.value);

    if (this.deck.length < count) {
      this.showToast('카드가 부족합니다! 섞어주세요.');
      return;
    }

    const drawnCards = [];
    for (let i = 0; i < count; i++) {
      const card = this.deck.pop();
      drawnCards.push(card);
      this.hand.push(card);
    }

    this.renderDrawnCards(drawnCards);
    this.updateRemainingCount();
    this.addToHistory(drawnCards);
    this.renderHand();
    this.evaluateHand();
  }

  renderDrawnCards(cards) {
    this.elements.drawnCards.innerHTML = cards.map((card, i) => `
      <div class="card ${card.color} animate" style="animation-delay: ${i * 0.1}s">
        <span class="value">${card.value}</span>
        <span class="suit">${card.suit}</span>
        <span class="value-bottom">${card.value}</span>
      </div>
    `).join('');
  }

  renderHand() {
    this.elements.handCards.innerHTML = this.hand.map(card => `
      <div class="mini-card ${card.color}">
        <span>${card.value}</span>
        <span>${card.suit}</span>
      </div>
    `).join('');
  }

  evaluateHand() {
    if (this.hand.length < 5) {
      this.elements.handResult.textContent = '5장 이상 뽑으면 족보를 확인합니다';
      return;
    }

    // 마지막 5장으로 판단
    const last5 = this.hand.slice(-5);
    const result = this.getPokerHand(last5);
    this.elements.handResult.textContent = `족보: ${result}`;
  }

  getPokerHand(cards) {
    const values = cards.map(c => this.getValueNumber(c.value)).sort((a, b) => a - b);
    const suits = cards.map(c => c.suit);

    const isFlush = new Set(suits).size === 1;
    const isStraight = this.checkStraight(values);

    const valueCounts = {};
    values.forEach(v => valueCounts[v] = (valueCounts[v] || 0) + 1);
    const counts = Object.values(valueCounts).sort((a, b) => b - a);

    if (isFlush && isStraight && values[0] === 10) return '로얄 스트레이트 플러시!';
    if (isFlush && isStraight) return '스트레이트 플러시!';
    if (counts[0] === 4) return '포카드!';
    if (counts[0] === 3 && counts[1] === 2) return '풀하우스!';
    if (isFlush) return '플러시!';
    if (isStraight) return '스트레이트!';
    if (counts[0] === 3) return '트리플!';
    if (counts[0] === 2 && counts[1] === 2) return '투페어!';
    if (counts[0] === 2) return '원페어';
    return '하이카드';
  }

  getValueNumber(value) {
    const map = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11 };
    return map[value] || parseInt(value);
  }

  checkStraight(values) {
    // A-2-3-4-5 체크
    if (JSON.stringify(values) === JSON.stringify([2, 3, 4, 5, 14])) return true;

    for (let i = 0; i < values.length - 1; i++) {
      if (values[i + 1] - values[i] !== 1) return false;
    }
    return true;
  }

  clearHand() {
    this.hand = [];
    this.renderHand();
    this.elements.handResult.textContent = '';
    this.elements.drawnCards.innerHTML = '<div class="card placeholder"><span>?</span></div>';
  }

  updateRemainingCount() {
    this.elements.remainingCount.textContent = this.deck.length;

    if (this.deck.length === 0) {
      this.elements.drawBtn.disabled = true;
    } else {
      this.elements.drawBtn.disabled = false;
    }
  }

  addToHistory(cards) {
    this.history.unshift(cards);
    if (this.history.length > 10) this.history.pop();
    this.renderHistory();
  }

  renderHistory() {
    this.elements.historyList.innerHTML = this.history.map(cards => `
      <div class="history-item">
        ${cards.map(c => `<span class="card-symbol ${c.color}">${c.value}${c.suit}</span>`).join('')}
      </div>
    `).join('');
  }
}

// 전역 인스턴스 생성
const cardDraw = new CardDraw();
window.CardDraw = cardDraw;

document.addEventListener('DOMContentLoaded', () => cardDraw.init());
