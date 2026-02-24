/**
 * 수면 계산기 - ToolBase 기반
 * 수면 주기 기반 최적 기상/취침 시간 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class SleepCalculator extends ToolBase {
  constructor() {
    super('SleepCalculator');
    this.CYCLE_DURATION = 90; // 분
    this.FALL_ASLEEP_TIME = 15; // 분
    this.currentMode = 'wakeup';
  }

  init() {
    this.initElements({
      wakeupTime: 'wakeupTime',
      sleepTime: 'sleepTime',
      wakeupMode: 'wakeupMode',
      sleepMode: 'sleepMode',
      results: 'results'
    });

    this.setupEvents();

    console.log('[SleepCalculator] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => this.setMode(tab.dataset.mode));
    });
  }

  setMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    this.elements.wakeupMode.style.display = mode === 'wakeup' ? 'block' : 'none';
    this.elements.sleepMode.style.display = mode === 'sleep' ? 'block' : 'none';
    this.elements.results.innerHTML = '';
  }

  calculateFromWakeup() {
    const timeInput = this.elements.wakeupTime.value;
    if (!timeInput) {
      this.showToast('기상 시간을 입력하세요.', 'error');
      return;
    }

    const [hours, minutes] = timeInput.split(':').map(Number);
    const wakeupDate = new Date();
    wakeupDate.setHours(hours, minutes, 0, 0);

    const results = [];
    for (let cycles = 6; cycles >= 3; cycles--) {
      const sleepDuration = (cycles * this.CYCLE_DURATION) + this.FALL_ASLEEP_TIME;
      const bedtime = new Date(wakeupDate.getTime() - sleepDuration * 60000);

      results.push({
        time: bedtime,
        cycles: cycles,
        duration: cycles * this.CYCLE_DURATION,
        quality: this.getQuality(cycles)
      });
    }

    this.renderResults(results, '취침 시간', '이 시간에 잠들면 개운하게 일어날 수 있어요!');
  }

  calculateFromSleep() {
    const timeInput = this.elements.sleepTime.value;
    if (!timeInput) {
      this.showToast('취침 시간을 입력하세요.', 'error');
      return;
    }

    const [hours, minutes] = timeInput.split(':').map(Number);
    const sleepDate = new Date();
    sleepDate.setHours(hours, minutes, 0, 0);

    // 잠드는 시간 추가
    const actualSleepTime = new Date(sleepDate.getTime() + this.FALL_ASLEEP_TIME * 60000);

    const results = [];
    for (let cycles = 3; cycles <= 6; cycles++) {
      const sleepDuration = cycles * this.CYCLE_DURATION;
      const wakeupTime = new Date(actualSleepTime.getTime() + sleepDuration * 60000);

      results.push({
        time: wakeupTime,
        cycles: cycles,
        duration: sleepDuration,
        quality: this.getQuality(cycles)
      });
    }

    this.renderResults(results, '기상 시간', '이 시간에 일어나면 개운해요!');
  }

  getQuality(cycles) {
    if (cycles >= 5) return { label: '최적', class: 'badge-optimal' };
    if (cycles >= 4) return { label: '좋음', class: 'badge-good' };
    return { label: '보통', class: 'badge-ok' };
  }

  formatTime(date) {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins > 0 ? mins + '분' : ''}`;
  }

  renderResults(results, title, description) {
    const html = `
      <h3 style="margin-bottom: 0.5rem; font-weight: 600;">${title}</h3>
      <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem;">${description}</p>
      ${results.map((r, i) => `
        <div class="cycle-card ${r.cycles >= 5 ? 'recommended' : ''}">
          <div>
            <div class="cycle-time">${this.formatTime(r.time)}</div>
            ${r.cycles >= 5 ? '<small style="color: #10b981;">권장</small>' : ''}
          </div>
          <div class="cycle-info">
            <div class="cycle-duration">${r.cycles}주기 · ${this.formatDuration(r.duration)}</div>
            <span class="cycle-badge ${r.quality.class}">${r.quality.label}</span>
          </div>
        </div>
      `).join('')}
    `;

    this.elements.results.innerHTML = html;
  }
}

// 전역 인스턴스 생성
const sleepCalc = new SleepCalculator();
window.SleepCalculator = sleepCalc;

document.addEventListener('DOMContentLoaded', () => sleepCalc.init());
