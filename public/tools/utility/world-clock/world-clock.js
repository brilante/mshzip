/**
 * 세계 시계 - ToolBase 기반
 * 다양한 시간대의 현재 시간 표시
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class WorldClock extends ToolBase {
  constructor() {
    super('WorldClock');
    this.cities = [
      { name: '서울', timezone: 'Asia/Seoul', country: '대한민국' },
      { name: '도쿄', timezone: 'Asia/Tokyo', country: '일본' },
      { name: '베이징', timezone: 'Asia/Shanghai', country: '중국' },
      { name: '싱가포르', timezone: 'Asia/Singapore', country: '싱가포르' },
      { name: '시드니', timezone: 'Australia/Sydney', country: '호주' },
      { name: '두바이', timezone: 'Asia/Dubai', country: 'UAE' },
      { name: '모스크바', timezone: 'Europe/Moscow', country: '러시아' },
      { name: '런던', timezone: 'Europe/London', country: '영국' },
      { name: '파리', timezone: 'Europe/Paris', country: '프랑스' },
      { name: '베를린', timezone: 'Europe/Berlin', country: '독일' },
      { name: '뉴욕', timezone: 'America/New_York', country: '미국' },
      { name: 'LA', timezone: 'America/Los_Angeles', country: '미국' },
      { name: '시카고', timezone: 'America/Chicago', country: '미국' },
      { name: '상파울루', timezone: 'America/Sao_Paulo', country: '브라질' },
      { name: '멕시코시티', timezone: 'America/Mexico_City', country: '멕시코' }
    ];
    this.selectedCities = [];
  }

  init() {
    this.initElements({
      citySelect: 'citySelect',
      addCity: 'addCity',
      clocksList: 'clocksList',
      localTime: 'localTime',
      localDate: 'localDate'
    });

    this.load();
    this.populateCitySelect();
    this.renderClocks();
    setInterval(() => this.updateTimes(), 1000);

    this.elements.addCity.addEventListener('click', () => this.addCity());

    console.log('[WorldClock] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('worldClockCities');
      if (saved) {
        this.selectedCities = JSON.parse(saved);
      } else {
        this.selectedCities = ['Asia/Tokyo', 'America/New_York', 'Europe/London'];
      }
    } catch (e) {
      this.selectedCities = ['Asia/Tokyo', 'America/New_York', 'Europe/London'];
    }
  }

  save() {
    localStorage.setItem('worldClockCities', JSON.stringify(this.selectedCities));
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  populateCitySelect() {
    const select = this.elements.citySelect;
    select.innerHTML = '<option value="">도시 선택</option>' +
      this.cities.filter(c => !this.selectedCities.includes(c.timezone))
        .map(c => `<option value="${c.timezone}">${this.escapeHtml(c.name)} (${this.escapeHtml(c.country)})</option>`)
        .join('');
  }

  renderClocks() {
    const container = this.elements.clocksList;
    container.innerHTML = this.selectedCities.map(tz => {
      const city = this.cities.find(c => c.timezone === tz);
      if (!city) return '';

      return `
        <div class="clock-card" data-timezone="${tz}">
          <button class="delete-btn" onclick="worldClock.removeCity('${tz}')">×</button>
          <div class="city">${this.escapeHtml(city.name)}</div>
          <div class="timezone">${this.escapeHtml(city.country)}</div>
          <div class="time">--:--:--</div>
          <div class="diff"></div>
        </div>
      `;
    }).join('');

    this.updateTimes();
  }

  updateTimes() {
    const now = new Date();

    this.elements.localTime.textContent = now.toLocaleTimeString('ko-KR');
    this.elements.localDate.textContent = now.toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
    });

    document.querySelectorAll('.clock-card').forEach(card => {
      const tz = card.dataset.timezone;
      const timeEl = card.querySelector('.time');
      const diffEl = card.querySelector('.diff');

      const options = { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
      timeEl.textContent = now.toLocaleTimeString('ko-KR', options);

      const localOffset = now.getTimezoneOffset();
      const targetTime = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      const targetOffset = (targetTime - now) / 60000 + localOffset;
      const diffHours = targetOffset / 60;

      if (diffHours === 0) {
        diffEl.textContent = '같은 시간대';
      } else {
        diffEl.textContent = (diffHours > 0 ? '+' : '') + diffHours + '시간';
      }
    });
  }

  addCity() {
    const select = this.elements.citySelect;
    const tz = select.value;
    if (!tz) return;

    this.selectedCities.push(tz);
    this.save();
    this.populateCitySelect();
    this.renderClocks();
  }

  removeCity(tz) {
    this.selectedCities = this.selectedCities.filter(c => c !== tz);
    this.save();
    this.populateCitySelect();
    this.renderClocks();
  }
}

// 전역 인스턴스 생성
const worldClock = new WorldClock();
window.WorldClock = worldClock;

document.addEventListener('DOMContentLoaded', () => worldClock.init());
