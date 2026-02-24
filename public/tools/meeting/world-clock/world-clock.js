/**
 * 세계 시계 - ToolBase 기반
 * 전 세계 시간대 표시
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var WorldClock = class WorldClock extends ToolBase {
  constructor() {
    super('WorldClock');
    this.cities = [];
    this.timezones = {};
    this.storageKey = 'worldClock_data';
    this.updateInterval = null;

    this.cityNames = {
      'Asia/Seoul': '🇰🇷 서울',
      'Asia/Tokyo': '🇯🇵 도쿄',
      'Asia/Shanghai': '🇨🇳 상하이',
      'Asia/Hong_Kong': '🇭🇰 홍콩',
      'Asia/Singapore': '🇸🇬 싱가포르',
      'Asia/Bangkok': '🇹🇭 방콕',
      'Asia/Dubai': '🇦🇪 두바이',
      'Asia/Kolkata': '🇮🇳 뭄바이',
      'Asia/Jakarta': '🇮🇩 자카르타',
      'Asia/Manila': '🇵🇭 마닐라',
      'Europe/London': '🇬🇧 런던',
      'Europe/Paris': '🇫🇷 파리',
      'Europe/Berlin': '🇩🇪 베를린',
      'Europe/Rome': '🇮🇹 로마',
      'Europe/Madrid': '🇪🇸 마드리드',
      'Europe/Amsterdam': '🇳🇱 암스테르담',
      'Europe/Zurich': '🇨🇭 취리히',
      'Europe/Stockholm': '🇸🇪 스톡홀름',
      'Europe/Moscow': '🇷🇺 모스크바',
      'America/New_York': '🇺🇸 뉴욕',
      'America/Los_Angeles': '🇺🇸 로스앤젤레스',
      'America/Chicago': '🇺🇸 시카고',
      'America/Toronto': '🇨🇦 토론토',
      'America/Vancouver': '🇨🇦 밴쿠버',
      'America/Mexico_City': '🇲🇽 멕시코시티',
      'America/Sao_Paulo': '🇧🇷 상파울루',
      'America/Buenos_Aires': '🇦🇷 부에노스아이레스',
      'Australia/Sydney': '🇦🇺 시드니',
      'Australia/Melbourne': '🇦🇺 멜버른',
      'Pacific/Auckland': '🇳🇿 오클랜드',
      'Pacific/Honolulu': '🇺🇸 호놀룰루',
      'Africa/Cairo': '🇪🇬 카이로',
      'Africa/Johannesburg': '🇿🇦 요하네스버그',
      'Africa/Lagos': '🇳🇬 라고스',
      'Asia/Tel_Aviv': '🇮🇱 텔아비브'
    };
  }

  init() {
    this.initElements({
      localTime: 'localTime',
      localDate: 'localDate',
      localTimezone: 'localTimezone',
      citySelect: 'citySelect',
      worldClocks: 'worldClocks',
      emptyState: 'emptyState',
      fromTimezone: 'fromTimezone',
      toTimezone: 'toTimezone',
      convertTime: 'convertTime',
      convertResult: 'convertResult'
    });

    this.loadFromStorage();
    this.populateTimezoneSelects();
    this.startClock();
    this.render();

    console.log('[WorldClock] 초기화 완료');
    return this;
  }

  startClock() {
    this.updateLocalTime();
    this.updateInterval = setInterval(() => {
      this.updateLocalTime();
      this.updateWorldClocks();
    }, 1000);
  }

  updateLocalTime() {
    const now = new Date();

    const time = now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const date = now.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    this.elements.localTime.textContent = time;
    this.elements.localDate.textContent = date;
    this.elements.localTimezone.textContent = timezone;
  }

  addCity() {
    const timezone = this.elements.citySelect.value;

    if (this.cities.includes(timezone)) {
      this.showToast('이미 추가된 도시입니다.', 'error');
      return;
    }

    this.cities.push(timezone);
    this.saveToStorage();
    this.render();
  }

  removeCity(timezone) {
    this.cities = this.cities.filter(c => c !== timezone);
    this.saveToStorage();
    this.render();
  }

  quickAdd(timezones) {
    timezones.forEach(tz => {
      if (!this.cities.includes(tz)) {
        this.cities.push(tz);
      }
    });
    this.saveToStorage();
    this.render();
  }

  getTimeInTimezone(timezone) {
    const now = new Date();

    try {
      const time = now.toLocaleTimeString('ko-KR', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const date = now.toLocaleDateString('ko-KR', {
        timeZone: timezone,
        month: 'short',
        day: 'numeric',
        weekday: 'short'
      });

      const hour = parseInt(now.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false
      }));

      const isNight = hour < 6 || hour >= 20;

      return { time, date, isNight, hour };
    } catch (e) {
      return { time: '--:--:--', date: '--', isNight: false, hour: 0 };
    }
  }

  getTimeDiff(timezone) {
    const now = new Date();

    const targetDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const localDate = new Date(now.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }));

    const diff = (targetDate - localDate) / (1000 * 60 * 60);

    if (diff === 0) return '동일';
    if (diff > 0) return `+${diff}시간`;
    return `${diff}시간`;
  }

  render() {
    if (this.cities.length === 0) {
      this.elements.worldClocks.innerHTML = '';
      this.elements.emptyState.classList.add('show');
      return;
    }

    this.elements.emptyState.classList.remove('show');
    this.elements.worldClocks.innerHTML = this.cities.map(timezone => {
      const info = this.getTimeInTimezone(timezone);
      const diff = this.getTimeDiff(timezone);
      const name = this.cityNames[timezone] || timezone;

      return `
        <div class="clock-card ${info.isNight ? 'night' : ''}" data-timezone="${timezone}">
          <button class="clock-delete" onclick="worldClock.removeCity('${timezone}')"></button>
          <div class="clock-icon">${info.isNight ? '' : ''}</div>
          <div class="clock-city">${name}</div>
          <div class="clock-time">${info.time}</div>
          <div class="clock-date">${info.date}</div>
          <div class="clock-diff">${diff}</div>
        </div>
      `;
    }).join('');
  }

  updateWorldClocks() {
    this.cities.forEach(timezone => {
      const card = document.querySelector(`[data-timezone="${timezone}"]`);
      if (card) {
        const info = this.getTimeInTimezone(timezone);
        card.querySelector('.clock-time').textContent = info.time;
        card.querySelector('.clock-date').textContent = info.date;
        card.querySelector('.clock-icon').textContent = info.isNight ? '' : '';

        if (info.isNight) {
          card.classList.add('night');
        } else {
          card.classList.remove('night');
        }
      }
    });
  }

  populateTimezoneSelects() {
    const options = Object.entries(this.cityNames).map(([tz, name]) =>
      `<option value="${tz}">${name}</option>`
    ).join('');

    this.elements.fromTimezone.innerHTML = options;
    this.elements.toTimezone.innerHTML = options;

    // 기본값 설정
    this.elements.fromTimezone.value = 'Asia/Seoul';
    this.elements.toTimezone.value = 'America/New_York';
  }

  convert() {
    const time = this.elements.convertTime.value;
    const fromTz = this.elements.fromTimezone.value;
    const toTz = this.elements.toTimezone.value;

    if (!time) {
      this.showToast('시간을 입력해주세요.', 'error');
      return;
    }

    const [hours, minutes] = time.split(':').map(Number);

    // 오늘 날짜 기준으로 변환
    const now = new Date();
    const sourceDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    // 출발 시간대의 UTC 오프셋 구하기
    const fromOffset = this.getTimezoneOffset(fromTz, sourceDate);
    const toOffset = this.getTimezoneOffset(toTz, sourceDate);

    // 시간 차이 계산
    const diffMinutes = toOffset - fromOffset;
    const targetDate = new Date(sourceDate.getTime() + diffMinutes * 60 * 1000);

    const resultTime = targetDate.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const fromName = this.cityNames[fromTz] || fromTz;
    const toName = this.cityNames[toTz] || toTz;

    this.elements.convertResult.innerHTML = `
      <div class="result-time">${resultTime}</div>
      <div class="result-info">${fromName} ${time} → ${toName}</div>
    `;
    this.elements.convertResult.classList.add('show');
  }

  getTimezoneOffset(timezone, date) {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (tzDate - utcDate) / (1000 * 60);
  }

  saveToStorage() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.cities));
  }

  loadFromStorage() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      this.cities = JSON.parse(saved);
    }
  }
}

// 전역 인스턴스 생성
const worldClock = new WorldClock();
window.WorldClock = worldClock;

// 전역 함수 (HTML onclick 호환)
function addCity() { worldClock.addCity(); }
function quickAdd(timezones) { worldClock.quickAdd(timezones); }
function convert() { worldClock.convert(); }

document.addEventListener('DOMContentLoaded', () => worldClock.init());
