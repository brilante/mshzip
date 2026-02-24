/**
 * 세계 시계 도구
 * 전 세계 주요 도시의 현재 시간을 실시간으로 표시
 */

const WorldClock = {
  cities: [
    { name: '서울', country: '대한민국', flag: '🇰🇷', timezone: 'Asia/Seoul', isLocal: true },
    { name: '도쿄', country: '일본', flag: '🇯🇵', timezone: 'Asia/Tokyo' },
    { name: '베이징', country: '중국', flag: '🇨🇳', timezone: 'Asia/Shanghai' },
    { name: '싱가포르', country: '싱가포르', flag: '🇸🇬', timezone: 'Asia/Singapore' },
    { name: '시드니', country: '호주', flag: '🇦🇺', timezone: 'Australia/Sydney' },
    { name: '두바이', country: 'UAE', flag: '🇦🇪', timezone: 'Asia/Dubai' },
    { name: '모스크바', country: '러시아', flag: '🇷🇺', timezone: 'Europe/Moscow' },
    { name: '런던', country: '영국', flag: '🇬🇧', timezone: 'Europe/London' },
    { name: '파리', country: '프랑스', flag: '🇫🇷', timezone: 'Europe/Paris' },
    { name: '베를린', country: '독일', flag: '🇩🇪', timezone: 'Europe/Berlin' },
    { name: '뉴욕', country: '미국', flag: '🇺🇸', timezone: 'America/New_York' },
    { name: '로스앤젤레스', country: '미국', flag: '🇺🇸', timezone: 'America/Los_Angeles' },
    { name: '시카고', country: '미국', flag: '🇺🇸', timezone: 'America/Chicago' },
    { name: '토론토', country: '캐나다', flag: '🇨🇦', timezone: 'America/Toronto' },
    { name: '상파울루', country: '브라질', flag: '🇧🇷', timezone: 'America/Sao_Paulo' },
    { name: '멕시코시티', country: '멕시코', flag: '🇲🇽', timezone: 'America/Mexico_City' }
  ],

  filteredCities: [],
  intervalId: null,

  init() {
    this.filteredCities = [...this.cities];
    this.render();
    this.startClock();
    console.log('[WorldClock] 초기화 완료');
  },

  startClock() {
    this.updateTimes();
    this.intervalId = setInterval(() => this.updateTimes(), 1000);
  },

  stopClock() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  },

  getTimeForTimezone(timezone) {
    const now = new Date();
    const options = {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    return new Intl.DateTimeFormat('ko-KR', options).format(now);
  },

  getDateForTimezone(timezone) {
    const now = new Date();
    const options = {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    };
    return new Intl.DateTimeFormat('ko-KR', options).format(now);
  },

  getOffset(timezone) {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const diff = (tzDate - utcDate) / (1000 * 60 * 60);
    const sign = diff >= 0 ? '+' : '';
    return `UTC${sign}${diff}`;
  },

  isDaytime(timezone) {
    const now = new Date();
    const options = { timeZone: timezone, hour: 'numeric', hour12: false };
    const hour = parseInt(new Intl.DateTimeFormat('en-US', options).format(now));
    return hour >= 6 && hour < 18;
  },

  render() {
    const grid = document.getElementById('clockGrid');
    if (!grid) return;

    grid.innerHTML = this.filteredCities.map(city => `
      <div class="clock-card" data-timezone="${city.timezone}">
        ${city.isLocal ? '<span class="local-indicator">현지</span>' : ''}
        <span class="day-night">${this.isDaytime(city.timezone) ? '' : ''}</span>
        <div class="city-flag">${city.flag}</div>
        <div class="city-name">${city.name}</div>
        <div class="city-country">${city.country}</div>
        <div class="clock-time" id="time-${city.timezone.replace('/', '-')}">${this.getTimeForTimezone(city.timezone)}</div>
        <div class="clock-date" id="date-${city.timezone.replace('/', '-')}">${this.getDateForTimezone(city.timezone)}</div>
        <span class="clock-offset">${this.getOffset(city.timezone)}</span>
      </div>
    `).join('');
  },

  updateTimes() {
    this.filteredCities.forEach(city => {
      const timeEl = document.getElementById(`time-${city.timezone.replace('/', '-')}`);
      const dateEl = document.getElementById(`date-${city.timezone.replace('/', '-')}`);
      if (timeEl) timeEl.textContent = this.getTimeForTimezone(city.timezone);
      if (dateEl) dateEl.textContent = this.getDateForTimezone(city.timezone);
    });

    // 낮/밤 아이콘 업데이트 (분 단위로)
    const minute = new Date().getMinutes();
    if (minute === 0) {
      this.render();
    }
  },

  filterCities(query) {
    const q = query.toLowerCase().trim();
    if (!q) {
      this.filteredCities = [...this.cities];
    } else {
      this.filteredCities = this.cities.filter(city =>
        city.name.toLowerCase().includes(q) ||
        city.country.toLowerCase().includes(q)
      );
    }
    this.render();
  }
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => WorldClock.init());

// 페이지 벗어날 때 정리
window.addEventListener('beforeunload', () => WorldClock.stopClock());

console.log('[WorldClock] 모듈 로드 완료');
