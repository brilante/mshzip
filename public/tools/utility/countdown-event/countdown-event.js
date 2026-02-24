/**
 * 이벤트 카운트다운 - ToolBase 기반
 * D-Day 및 기념일 카운트다운
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CountdownEvent = class CountdownEvent extends ToolBase {
  constructor() {
    super('CountdownEvent');
    this.events = [];
    this.timer = null;
  }

  init() {
    this.initElements({
      eventTitle: 'eventTitle',
      eventDate: 'eventDate',
      eventTime: 'eventTime',
      eventList: 'eventList'
    });

    this.load();
    this.render();
    this.startTimer();

    // 기본 날짜를 내일로 설정
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.elements.eventDate.value = tomorrow.toISOString().split('T')[0];

    console.log('[CountdownEvent] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('countdown-event-data');
      if (saved) {
        this.events = JSON.parse(saved);
      }
    } catch (e) {}
  }

  save() {
    localStorage.setItem('countdown-event-data', JSON.stringify(this.events));
  }

  add() {
    const title = this.elements.eventTitle.value.trim();
    const date = this.elements.eventDate.value;
    const time = this.elements.eventTime.value || '00:00';

    if (!title) {
      this.showToast('이벤트 이름을 입력하세요', 'error');
      return;
    }
    if (!date) {
      this.showToast('날짜를 선택하세요', 'error');
      return;
    }

    this.events.push({
      id: Date.now(),
      title: title,
      datetime: `${date}T${time}:00`,
      createdAt: new Date().toISOString()
    });

    this.events.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    this.save();
    this.render();

    this.elements.eventTitle.value = '';
    this.showToast('이벤트가 추가되었습니다', 'success');
  }

  remove(id) {
    this.events = this.events.filter(e => e.id !== id);
    this.save();
    this.render();
    this.showToast('이벤트가 삭제되었습니다', 'success');
  }

  startTimer() {
    this.timer = setInterval(() => this.updateCountdowns(), 1000);
  }

  getCountdown(datetime) {
    const target = new Date(datetime);
    const now = new Date();
    const diff = target - now;

    const isPast = diff < 0;
    const absDiff = Math.abs(diff);

    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isPast };
  }

  formatDate(datetime) {
    const date = new Date(datetime);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }

  updateCountdowns() {
    this.events.forEach(event => {
      const countdown = this.getCountdown(event.datetime);
      const card = document.querySelector(`[data-id="${event.id}"]`);
      if (card) {
        card.querySelector('.days').textContent = countdown.days;
        card.querySelector('.hours').textContent = countdown.hours;
        card.querySelector('.minutes').textContent = countdown.minutes;
        card.querySelector('.seconds').textContent = countdown.seconds;

        if (countdown.isPast) {
          card.classList.add('event-past');
          card.querySelector('.event-status').textContent = '지난 이벤트';
        } else {
          card.classList.remove('event-past');
          card.querySelector('.event-status').textContent = '';
        }
      }
    });
  }

  render() {
    const list = this.elements.eventList;

    if (this.events.length === 0) {
      list.innerHTML = `
        <div class="util-panel" style="text-align: center; color: var(--text-secondary);">
          등록된 이벤트가 없습니다
        </div>
      `;
      return;
    }

    list.innerHTML = this.events.map(event => {
      const countdown = this.getCountdown(event.datetime);

      return `
        <div class="event-card ${countdown.isPast ? 'event-past' : ''}" data-id="${event.id}">
          <span class="event-delete" onclick="countdownEvent.remove(${event.id})"></span>
          <div class="event-title">${this.escapeHtml(event.title)}</div>
          <div class="event-date">${this.formatDate(event.datetime)} <span class="event-status">${countdown.isPast ? '지난 이벤트' : ''}</span></div>
          <div class="countdown-display">
            <div class="countdown-unit">
              <div class="countdown-value days">${countdown.days}</div>
              <div class="countdown-label">일</div>
            </div>
            <div class="countdown-unit">
              <div class="countdown-value hours">${countdown.hours}</div>
              <div class="countdown-label">시간</div>
            </div>
            <div class="countdown-unit">
              <div class="countdown-value minutes">${countdown.minutes}</div>
              <div class="countdown-label">분</div>
            </div>
            <div class="countdown-unit">
              <div class="countdown-value seconds">${countdown.seconds}</div>
              <div class="countdown-label">초</div>
            </div>
          </div>
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
const countdownEvent = new CountdownEvent();
window.CountdownEvent = countdownEvent;

document.addEventListener('DOMContentLoaded', () => countdownEvent.init());
