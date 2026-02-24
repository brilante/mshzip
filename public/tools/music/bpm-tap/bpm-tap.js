/**
 * BPM 탭 측정기 - ToolBase 기반
 * 탭하여 템포 측정
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BpmTap = class BpmTap extends ToolBase {
  constructor() {
    super('BpmTap');
    this.taps = [];
    this.history = [];
    this.timeout = null;
  }

  init() {
    this.initElements({
      bpmValue: 'bpmValue',
      tapCount: 'tapCount',
      avgInterval: 'avgInterval',
      msPerBeat: 'msPerBeat',
      historyList: 'historyList'
    });

    this.loadHistory();
    this.renderHistory();

    // 키보드 이벤트
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        this.tap();
      }
    });

    console.log('[BpmTap] 초기화 완료');
    return this;
  }

  tap() {
    const now = Date.now();

    if (this.taps.length > 0 && now - this.taps[this.taps.length - 1] > 2000) {
      this.taps = [];
    }

    this.taps.push(now);

    clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.saveResult(), 3000);

    this.updateDisplay();
    this.playClick();
  }

  reset() {
    this.taps = [];
    clearTimeout(this.timeout);
    this.elements.bpmValue.textContent = '---';
    this.elements.tapCount.textContent = '0';
    this.elements.avgInterval.textContent = '-';
    this.elements.msPerBeat.textContent = '-';
  }

  updateDisplay() {
    const count = this.taps.length;
    this.elements.tapCount.textContent = count;

    if (count < 2) {
      this.elements.bpmValue.textContent = '---';
      this.elements.avgInterval.textContent = '-';
      this.elements.msPerBeat.textContent = '-';
      return;
    }

    let totalInterval = 0;
    for (let i = 1; i < count; i++) {
      totalInterval += this.taps[i] - this.taps[i - 1];
    }
    const avgInterval = totalInterval / (count - 1);
    const bpm = Math.round(60000 / avgInterval);

    this.elements.bpmValue.textContent = bpm;
    this.elements.avgInterval.textContent = Math.round(avgInterval);
    this.elements.msPerBeat.textContent = Math.round(avgInterval);
  }

  saveResult() {
    if (this.taps.length < 4) return;

    let totalInterval = 0;
    for (let i = 1; i < this.taps.length; i++) {
      totalInterval += this.taps[i] - this.taps[i - 1];
    }
    const avgInterval = totalInterval / (this.taps.length - 1);
    const bpm = Math.round(60000 / avgInterval);

    this.history.unshift({
      bpm: bpm,
      taps: this.taps.length,
      time: new Date().toISOString()
    });

    if (this.history.length > 10) {
      this.history = this.history.slice(0, 10);
    }

    localStorage.setItem('bpm-tap-history', JSON.stringify(this.history));
    this.renderHistory();
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem('bpm-tap-history');
      if (saved) {
        this.history = JSON.parse(saved);
      }
    } catch (e) {}
  }

  clearHistory() {
    this.history = [];
    localStorage.removeItem('bpm-tap-history');
    this.renderHistory();
    this.showToast('기록이 삭제되었습니다', 'success');
  }

  renderHistory() {
    if (this.history.length === 0) {
      this.elements.historyList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">측정 기록이 없습니다</div>';
      return;
    }

    this.elements.historyList.innerHTML = this.history.map(item => {
      const time = new Date(item.time);
      const timeStr = time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="history-item">
          <span style="font-weight: 600; color: var(--primary);">${item.bpm} BPM</span>
          <span>${item.taps}탭 · ${timeStr}</span>
        </div>
      `;
    }).join('');
  }

  playClick() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  }
}

// 전역 인스턴스 생성
const bpmTap = new BpmTap();
window.BpmTap = bpmTap;

// 전역 함수 (HTML onclick 호환)
function tap() { bpmTap.tap(); }
function reset() { bpmTap.reset(); }
function clearHistory() { bpmTap.clearHistory(); }

document.addEventListener('DOMContentLoaded', () => bpmTap.init());
