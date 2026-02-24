/**
 * 동전 던지기 - ToolBase 기반
 * 앞면/뒷면 랜덤 결과 및 통계
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class CoinFlip extends ToolBase {
  constructor() {
    super('CoinFlip');
    this.stats = JSON.parse(localStorage.getItem('coinStats') || '{"heads":0,"tails":0}');
    this.currentStreak = { type: null, count: 0 };
    this.bestStreak = parseInt(localStorage.getItem('bestStreak') || '0');
    this.lastResult = null;
  }

  init() {
    this.initElements({
      coin: 'coin',
      resultText: 'resultText',
      flipBtn: 'flipBtn',
      multiFlipBtn: 'multiFlipBtn',
      resetBtn: 'resetBtn',
      multiCount: 'multiCount',
      multiResults: 'multiResults',
      headsCount: 'headsCount',
      tailsCount: 'tailsCount',
      totalCount: 'totalCount',
      headsPercent: 'headsPercent',
      tailsPercent: 'tailsPercent',
      currentStreak: 'currentStreak',
      bestStreak: 'bestStreak'
    });

    this.setupEvents();
    this.updateStats();
    this.elements.bestStreak.textContent = this.bestStreak;

    console.log('[CoinFlip] 초기화 완료');
    return this;
  }

  setupEvents() {
    this.elements.flipBtn.addEventListener('click', () => this.flip());
    this.elements.multiFlipBtn.addEventListener('click', () => this.multiFlip());
    this.elements.resetBtn.addEventListener('click', () => this.resetStats());

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.flip();
      }
    });
  }

  flip() {
    const coin = this.elements.coin;
    const resultText = this.elements.resultText;

    coin.classList.remove('heads', 'tails');
    coin.classList.add('flipping');
    resultText.textContent = '...';
    resultText.className = 'result-text';

    const result = Math.random() < 0.5 ? 'heads' : 'tails';

    setTimeout(() => {
      coin.classList.remove('flipping');
      coin.classList.add(result);

      if (result === 'heads') {
        resultText.textContent = '앞면! ';
        resultText.classList.add('heads');
        this.stats.heads++;
      } else {
        resultText.textContent = '뒷면! ';
        resultText.classList.add('tails');
        this.stats.tails++;
      }

      this.updateStreak(result);
      this.saveStats();
      this.updateStats();
    }, 1000);
  }

  multiFlip() {
    const count = parseInt(this.elements.multiCount.value) || 10;
    const resultsContainer = this.elements.multiResults;
    resultsContainer.innerHTML = '';

    let headsCount = 0;
    let tailsCount = 0;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const result = Math.random() < 0.5 ? 'heads' : 'tails';

        if (result === 'heads') {
          headsCount++;
          this.stats.heads++;
        } else {
          tailsCount++;
          this.stats.tails++;
        }

        const miniCoin = document.createElement('div');
        miniCoin.className = `mini-coin ${result}`;
        miniCoin.textContent = result === 'heads' ? '앞' : '뒤';
        miniCoin.style.animationDelay = `${i * 0.02}s`;
        resultsContainer.appendChild(miniCoin);

        if (i === count - 1) {
          this.saveStats();
          this.updateStats();

          // 결과 요약 표시
          const summary = document.createElement('div');
          summary.style.cssText = 'width:100%;text-align:center;padding:10px;margin-top:10px;background:#f0f0f0;border-radius:8px;';
          summary.innerHTML = `<strong>결과:</strong> 앞면 ${headsCount}회 / 뒷면 ${tailsCount}회`;
          resultsContainer.appendChild(summary);
        }
      }, i * 50);
    }
  }

  updateStreak(result) {
    if (this.lastResult === result) {
      this.currentStreak.count++;
    } else {
      this.currentStreak = { type: result, count: 1 };
    }

    this.lastResult = result;

    if (this.currentStreak.count > this.bestStreak) {
      this.bestStreak = this.currentStreak.count;
      localStorage.setItem('bestStreak', this.bestStreak.toString());
    }

    this.elements.currentStreak.textContent = this.currentStreak.count;
    this.elements.bestStreak.textContent = this.bestStreak;
  }

  updateStats() {
    const total = this.stats.heads + this.stats.tails;

    this.elements.headsCount.textContent = this.stats.heads;
    this.elements.tailsCount.textContent = this.stats.tails;
    this.elements.totalCount.textContent = total;

    this.elements.headsPercent.textContent = total ?
      `${((this.stats.heads / total) * 100).toFixed(1)}%` : '0%';
    this.elements.tailsPercent.textContent = total ?
      `${((this.stats.tails / total) * 100).toFixed(1)}%` : '0%';
  }

  saveStats() {
    localStorage.setItem('coinStats', JSON.stringify(this.stats));
  }

  resetStats() {
    if (confirm('통계를 초기화하시겠습니까?')) {
      this.stats = { heads: 0, tails: 0 };
      this.currentStreak = { type: null, count: 0 };
      this.bestStreak = 0;
      this.lastResult = null;

      localStorage.removeItem('coinStats');
      localStorage.removeItem('bestStreak');

      this.updateStats();
      this.elements.currentStreak.textContent = '0';
      this.elements.bestStreak.textContent = '0';
      this.elements.multiResults.innerHTML = '';
    }
  }
}

// 전역 인스턴스 생성
const coinFlip = new CoinFlip();
window.CoinFlip = coinFlip;

document.addEventListener('DOMContentLoaded', () => coinFlip.init());
