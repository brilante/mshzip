/**
 * 랜덤 선택기 - ToolBase 기반
 * 무작위 항목/숫자 선택
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var RandomPicker = class RandomPicker extends ToolBase {
  constructor() {
    super('RandomPicker');
    this.mode = 'list';
    this.history = [];
  }

  init() {
    this.initElements({
      pickCount: 'pickCount',
      itemsInput: 'itemsInput',
      minNumber: 'minNumber',
      maxNumber: 'maxNumber',
      listMode: 'listMode',
      numberMode: 'numberMode',
      resultPanel: 'resultPanel',
      resultValue: 'resultValue',
      historyList: 'historyList'
    });

    this.loadHistory();
    this.renderHistory();

    console.log('[RandomPicker] 초기화 완료');
    return this;
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem('random-picker-history');
      if (saved) {
        this.history = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveHistory() {
    localStorage.setItem('random-picker-history', JSON.stringify(this.history));
  }

  setMode(mode) {
    this.mode = mode;
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    this.elements.listMode.style.display = mode === 'list' ? 'block' : 'none';
    this.elements.numberMode.style.display = mode === 'number' ? 'block' : 'none';
  }

  pick() {
    const count = parseInt(this.elements.pickCount.value) || 1;
    let results = [];

    if (this.mode === 'list') {
      results = this.pickFromList(count);
    } else {
      results = this.pickFromRange(count);
    }

    if (results.length === 0) return;

    this.showResult(results);
    this.addToHistory(results);
  }

  pickFromList(count) {
    const text = this.elements.itemsInput.value.trim();
    if (!text) {
      this.showToast('항목을 입력하세요', 'error');
      return [];
    }

    const items = text.split('\n').map(s => s.trim()).filter(s => s);
    if (items.length === 0) {
      this.showToast('항목을 입력하세요', 'error');
      return [];
    }

    if (count > items.length) {
      this.showToast(`항목 수(${items.length})보다 많이 선택할 수 없습니다`, 'error');
      return [];
    }

    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  }

  pickFromRange(count) {
    const min = parseInt(this.elements.minNumber.value);
    const max = parseInt(this.elements.maxNumber.value);

    if (isNaN(min) || isNaN(max)) {
      this.showToast('숫자 범위를 입력하세요', 'error');
      return [];
    }

    if (min > max) {
      this.showToast('최소값이 최대값보다 큽니다', 'error');
      return [];
    }

    const range = max - min + 1;
    if (count > range) {
      this.showToast(`범위(${range}개)보다 많이 선택할 수 없습니다`, 'error');
      return [];
    }

    const results = new Set();
    while (results.size < count) {
      const num = Math.floor(Math.random() * range) + min;
      results.add(num);
    }

    return Array.from(results).sort((a, b) => a - b);
  }

  showResult(results) {
    const panel = this.elements.resultPanel;
    const value = this.elements.resultValue;

    panel.style.display = 'block';
    value.innerHTML = results.map(r => `<div>${this.escapeHtml(String(r))}</div>`).join('');

    value.style.animation = 'none';
    void value.offsetWidth;
    value.style.animation = 'popIn 0.3s ease-out';
  }

  addToHistory(results) {
    this.history.unshift({
      results: results,
      mode: this.mode,
      time: new Date().toISOString()
    });

    if (this.history.length > 20) {
      this.history = this.history.slice(0, 20);
    }

    this.saveHistory();
    this.renderHistory();
  }

  clearHistory() {
    this.history = [];
    this.saveHistory();
    this.renderHistory();
    this.showToast('기록이 삭제되었습니다', 'success');
  }

  renderHistory() {
    const list = this.elements.historyList;

    if (this.history.length === 0) {
      list.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">기록이 없습니다</div>';
      return;
    }

    list.innerHTML = this.history.map(item => {
      const time = new Date(item.time);
      const timeStr = time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      const modeLabel = item.mode === 'list' ? '목록' : '숫자';

      return `
        <div class="history-item">
          <span>${this.escapeHtml(item.results.join(', '))}</span>
          <span class="history-time">${modeLabel} · ${timeStr}</span>
        </div>
      `;
    }).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 인스턴스 생성
const randomPicker = new RandomPicker();
window.RandomPicker = randomPicker;

document.addEventListener('DOMContentLoaded', () => randomPicker.init());
