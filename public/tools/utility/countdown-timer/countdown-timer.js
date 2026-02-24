/**
 * 카운트다운 타이머 - ToolBase 기반
 * 목표 날짜까지 남은 시간
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class CountdownTimer extends ToolBase {
  constructor() {
    super('CountdownTimer');
    this.timers = [];
  }

  init() {
    this.initElements({
      timerName: 'timerName',
      timerDate: 'timerDate',
      addTimer: 'addTimer',
      timersList: 'timersList'
    });

    this.load();
    this.render();
    setInterval(() => this.updateCountdowns(), 1000);

    this.elements.addTimer.addEventListener('click', () => this.add());

    console.log('[CountdownTimer] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('countdownTimers');
      if (saved) {
        this.timers = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('countdownTimers', JSON.stringify(this.timers));
  }

  add() {
    const name = this.elements.timerName.value.trim();
    const date = this.elements.timerDate.value;

    if (!name || !date) {
      this.showToast('이름과 날짜를 입력하세요', 'error');
      return;
    }

    this.timers.push({
      id: Date.now().toString(),
      name,
      date
    });

    this.save();
    this.render();

    this.elements.timerName.value = '';
    this.elements.timerDate.value = '';
  }

  deleteTimer(id) {
    this.timers = this.timers.filter(t => t.id !== id);
    this.save();
    this.render();
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  render() {
    this.elements.timersList.innerHTML = this.timers.map(timer => {
      const targetDate = new Date(timer.date);
      const now = new Date();
      const diff = targetDate - now;
      const isPast = diff < 0;

      return `
        <div class="timer-card ${isPast ? 'past' : ''}" data-id="${timer.id}">
          <div class="timer-name">${this.escapeHtml(timer.name)}</div>
          <div class="timer-date">${targetDate.toLocaleString()}</div>
          <div class="countdown" data-target="${timer.date}">
            <div class="countdown-unit">
              <div class="countdown-value days">00</div>
              <div class="countdown-label">일</div>
            </div>
            <div class="countdown-unit">
              <div class="countdown-value hours">00</div>
              <div class="countdown-label">시간</div>
            </div>
            <div class="countdown-unit">
              <div class="countdown-value minutes">00</div>
              <div class="countdown-label">분</div>
            </div>
            <div class="countdown-unit">
              <div class="countdown-value seconds">00</div>
              <div class="countdown-label">초</div>
            </div>
          </div>
          <div class="timer-actions">
            <button class="btn-delete" onclick="countdownTimer.deleteTimer('${timer.id}')">삭제</button>
          </div>
        </div>
      `;
    }).join('');

    this.updateCountdowns();
  }

  updateCountdowns() {
    document.querySelectorAll('.countdown').forEach(countdown => {
      const target = new Date(countdown.dataset.target);
      const now = new Date();
      let diff = target - now;

      if (diff < 0) diff = 0;

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      countdown.querySelector('.days').textContent = days.toString().padStart(2, '0');
      countdown.querySelector('.hours').textContent = hours.toString().padStart(2, '0');
      countdown.querySelector('.minutes').textContent = minutes.toString().padStart(2, '0');
      countdown.querySelector('.seconds').textContent = seconds.toString().padStart(2, '0');
    });
  }
}

// 전역 인스턴스 생성
const countdownTimer = new CountdownTimer();
window.CountdownTimer = countdownTimer;

document.addEventListener('DOMContentLoaded', () => countdownTimer.init());
