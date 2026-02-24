/**
 * 주사위 굴리기 - ToolBase 기반
 * 다양한 면의 주사위 굴리기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class DiceRoller extends ToolBase {
  constructor() {
    super('DiceRoller');
    this.sides = 6;
    this.count = 1;
    this.results = [];
    this.history = JSON.parse(localStorage.getItem('diceHistory') || '[]');
  }

  init() {
    this.initElements({
      diceCount: 'diceCount',
      increaseBtn: 'increaseBtn',
      decreaseBtn: 'decreaseBtn',
      rollBtn: 'rollBtn',
      clearBtn: 'clearBtn',
      diceDisplay: 'diceDisplay',
      totalValue: 'totalValue',
      avgValue: 'avgValue',
      minValue: 'minValue',
      maxValue: 'maxValue',
      historyList: 'historyList'
    });

    this.setupEvents();
    this.renderHistory();

    console.log('[DiceRoller] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.dice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.dice-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.sides = parseInt(e.target.dataset.sides);
        this.updateDiceDisplay();
      });
    });

    this.elements.increaseBtn.addEventListener('click', () => {
      if (this.count < 10) {
        this.count++;
        this.elements.diceCount.textContent = this.count;
        this.updateDiceDisplay();
      }
    });

    this.elements.decreaseBtn.addEventListener('click', () => {
      if (this.count > 1) {
        this.count--;
        this.elements.diceCount.textContent = this.count;
        this.updateDiceDisplay();
      }
    });

    this.elements.rollBtn.addEventListener('click', () => this.roll());
    this.elements.clearBtn.addEventListener('click', () => this.clearHistory());

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.roll();
      }
    });
  }

  updateDiceDisplay() {
    this.elements.diceDisplay.innerHTML = Array(this.count).fill(0)
      .map(() => `
        <div class="dice d${this.sides}">
          <span class="dice-value">?</span>
        </div>
      `).join('');
  }

  roll() {
    const diceElements = document.querySelectorAll('.dice');
    this.results = [];

    diceElements.forEach((dice, index) => {
      dice.classList.add('rolling');

      setTimeout(() => {
        const value = Math.floor(Math.random() * this.sides) + 1;
        this.results.push(value);

        dice.classList.remove('rolling');
        dice.querySelector('.dice-value').textContent = value;

        // 최대값이면 critical 표시
        if (value === this.sides) {
          dice.classList.add('critical');
        } else {
          dice.classList.remove('critical');
        }

        if (this.results.length === this.count) {
          this.updateStats();
          this.addToHistory();
        }
      }, 500 + index * 100);
    });
  }

  updateStats() {
    const total = this.results.reduce((a, b) => a + b, 0);
    const avg = (total / this.results.length).toFixed(1);
    const min = Math.min(...this.results);
    const max = Math.max(...this.results);

    this.elements.totalValue.textContent = total;
    this.elements.avgValue.textContent = avg;
    this.elements.minValue.textContent = min;
    this.elements.maxValue.textContent = max;
  }

  addToHistory() {
    const entry = {
      type: `${this.count}D${this.sides}`,
      results: this.results.join(', '),
      total: this.results.reduce((a, b) => a + b, 0),
      time: new Date().toLocaleTimeString()
    };

    this.history.unshift(entry);
    if (this.history.length > 30) this.history.pop();
    localStorage.setItem('diceHistory', JSON.stringify(this.history));
    this.renderHistory();
  }

  renderHistory() {
    this.elements.historyList.innerHTML = this.history.map(h => `
      <div class="history-item">
        <span class="dice-type">${h.type}</span>
        <span class="results">[${h.results}] = ${h.total}</span>
        <span class="time">${h.time}</span>
      </div>
    `).join('');
  }

  clearHistory() {
    if (confirm('기록을 모두 삭제하시겠습니까?')) {
      this.history = [];
      localStorage.removeItem('diceHistory');
      this.renderHistory();
    }
  }
}

// 전역 인스턴스 생성
const diceRoller = new DiceRoller();
window.DiceRoller = diceRoller;

document.addEventListener('DOMContentLoaded', () => diceRoller.init());
