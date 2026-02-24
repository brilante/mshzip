/**
 * 랜덤 숫자 생성기 - ToolBase 기반
 * 지정 범위 내 랜덤 숫자 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class RandomNumberGenerator extends ToolBase {
  constructor() {
    super('RandomNumberGenerator');
    this.history = JSON.parse(localStorage.getItem('randomNumberHistory') || '[]');
    this.lastResults = [];
  }

  init() {
    this.initElements({
      minValue: 'minValue',
      maxValue: 'maxValue',
      count: 'count',
      allowDuplicates: 'allowDuplicates',
      generateBtn: 'generateBtn',
      copyBtn: 'copyBtn',
      historyBtn: 'historyBtn',
      clearHistoryBtn: 'clearHistoryBtn',
      resultNumber: 'resultNumber',
      resultList: 'resultList',
      historySection: 'historySection',
      historyList: 'historyList'
    });

    this.setupEvents();
    this.renderHistory();

    console.log('[RandomNumberGenerator] 초기화 완료');
    return this;
  }

  setupEvents() {
    this.elements.generateBtn.addEventListener('click', () => this.generate());
    this.elements.copyBtn.addEventListener('click', () => this.copyResults());
    this.elements.historyBtn.addEventListener('click', () => this.toggleHistory());
    this.elements.clearHistoryBtn.addEventListener('click', () => this.clearHistory());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.generate();
    });
  }

  generate() {
    const min = parseInt(this.elements.minValue.value) || 0;
    const max = parseInt(this.elements.maxValue.value) || 100;
    const count = Math.min(parseInt(this.elements.count.value) || 1, 100);
    const allowDuplicates = this.elements.allowDuplicates.checked;

    if (min > max) {
      alert('최소값이 최대값보다 클 수 없습니다.');
      return;
    }

    const range = max - min + 1;
    if (!allowDuplicates && count > range) {
      alert(`중복 없이 생성 시 최대 ${range}개까지 가능합니다.`);
      return;
    }

    this.lastResults = this.generateNumbers(min, max, count, allowDuplicates);
    this.displayResults();
    this.addToHistory(this.lastResults, min, max);
    this.elements.copyBtn.disabled = false;
  }

  generateNumbers(min, max, count, allowDuplicates) {
    const results = [];
    const used = new Set();

    while (results.length < count) {
      const num = Math.floor(Math.random() * (max - min + 1)) + min;
      if (allowDuplicates || !used.has(num)) {
        results.push(num);
        used.add(num);
      }
    }

    return results;
  }

  displayResults() {
    if (this.lastResults.length === 1) {
      this.elements.resultNumber.textContent = this.lastResults[0];
      this.elements.resultNumber.style.display = 'block';
      this.elements.resultList.innerHTML = '';
    } else {
      this.elements.resultNumber.style.display = 'none';
      this.elements.resultList.innerHTML = this.lastResults
        .map((num, i) => `<span class="number-item" style="animation-delay: ${i * 0.05}s">${num}</span>`)
        .join('');
    }
  }

  addToHistory(numbers, min, max) {
    const entry = {
      numbers: numbers.join(', '),
      range: `${min}~${max}`,
      time: new Date().toLocaleTimeString()
    };

    this.history.unshift(entry);
    if (this.history.length > 50) this.history.pop();
    localStorage.setItem('randomNumberHistory', JSON.stringify(this.history));
    this.renderHistory();
  }

  renderHistory() {
    this.elements.historyList.innerHTML = this.history
      .map(h => `
        <div class="history-item">
          <span>[${h.range}] ${h.numbers}</span>
          <span class="time">${h.time}</span>
        </div>
      `).join('');
  }

  toggleHistory() {
    const section = this.elements.historySection;
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
  }

  clearHistory() {
    if (confirm('기록을 모두 삭제하시겠습니까?')) {
      this.history = [];
      localStorage.removeItem('randomNumberHistory');
      this.renderHistory();
    }
  }

  copyResults() {
    const text = this.lastResults.join(', ');
    navigator.clipboard.writeText(text).then(() => {
      this.elements.copyBtn.textContent = '복사됨!';
      setTimeout(() => this.elements.copyBtn.textContent = '복사', 1500);
    });
  }
}

// 전역 인스턴스 생성
const randomNumber = new RandomNumberGenerator();
window.RandomNumberGenerator = randomNumber;

document.addEventListener('DOMContentLoaded', () => randomNumber.init());
