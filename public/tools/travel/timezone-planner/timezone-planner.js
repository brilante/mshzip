/**
 * 시간대 플래너 - ToolBase 기반
 * 여러 도시 시간 비교 및 회의 시간 계획
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TimezonePlanner = class TimezonePlanner extends ToolBase {
  constructor() {
    super('TimezonePlanner');
    this.cities = [];
    this.timezones = {
      'Asia/Seoul': { name: '서울', flag: '🇰🇷', offset: 9 },
      'Asia/Tokyo': { name: '도쿄', flag: '🇯🇵', offset: 9 },
      'Asia/Shanghai': { name: '상하이', flag: '🇨🇳', offset: 8 },
      'Asia/Hong_Kong': { name: '홍콩', flag: '🇭🇰', offset: 8 },
      'Asia/Singapore': { name: '싱가포르', flag: '🇸🇬', offset: 8 },
      'Asia/Bangkok': { name: '방콕', flag: '🇹🇭', offset: 7 },
      'Asia/Dubai': { name: '두바이', flag: '🇦🇪', offset: 4 },
      'Europe/London': { name: '런던', flag: '🇬🇧', offset: 0 },
      'Europe/Paris': { name: '파리', flag: '🇫🇷', offset: 1 },
      'Europe/Berlin': { name: '베를린', flag: '🇩🇪', offset: 1 },
      'America/New_York': { name: '뉴욕', flag: '🇺🇸', offset: -5 },
      'America/Los_Angeles': { name: '로스앤젤레스', flag: '🇺🇸', offset: -8 },
      'America/Chicago': { name: '시카고', flag: '🇺🇸', offset: -6 },
      'Australia/Sydney': { name: '시드니', flag: '🇦🇺', offset: 10 },
      'Pacific/Auckland': { name: '오클랜드', flag: '🇳🇿', offset: 12 }
    };
    this.intervalId = null;
  }

  init() {
    this.initElements({
      citySelect: 'citySelect',
      timezoneGrid: 'timezoneGrid',
      scheduleResult: 'scheduleResult'
    });

    this.cities = ['Asia/Seoul', 'America/New_York', 'Europe/London'];
    this.render();
    this.startClock();

    console.log('[TimezonePlanner] 초기화 완료');
    return this;
  }

  addCity() {
    const tz = this.elements.citySelect.value;

    if (this.cities.includes(tz)) {
      this.showToast('이미 추가된 도시입니다', 'error');
      return;
    }

    this.cities.push(tz);
    this.render();
    this.showToast(`${this.timezones[tz].name} 추가됨`, 'success');
  }

  removeCity(tz) {
    this.cities = this.cities.filter(c => c !== tz);
    this.render();
  }

  getTimeInTimezone(tz) {
    const now = new Date();
    const offset = this.timezones[tz].offset;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * offset));
  }

  formatTime(date) {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  }

  formatDate(date) {
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
  }

  render() {
    const grid = this.elements.timezoneGrid;

    grid.innerHTML = this.cities.map((tz, idx) => {
      const info = this.timezones[tz];
      const time = this.getTimeInTimezone(tz);
      const offsetStr = info.offset >= 0 ? `UTC+${info.offset}` : `UTC${info.offset}`;

      return `
        <div class="timezone-card ${idx === 0 ? 'highlight' : ''}">
          <div class="tz-city">${info.flag} ${info.name}</div>
          <div class="tz-time" id="time-${tz.replace(/\//g, '-')}">${this.formatTime(time)}</div>
          <div class="tz-date">${this.formatDate(time)}</div>
          <div class="tz-offset">${offsetStr}</div>
          ${this.cities.length > 1 ? `<button onclick="timezonePlanner.removeCity('${tz}')" style="margin-top: 0.5rem; background: none; border: none; cursor: pointer; opacity: 0.5;">제거</button>` : ''}
        </div>
      `;
    }).join('');

    this.calculateBestMeetingTime();
  }

  startClock() {
    if (this.intervalId) clearInterval(this.intervalId);

    this.intervalId = setInterval(() => {
      this.cities.forEach(tz => {
        const el = document.getElementById(`time-${tz.replace(/\//g, '-')}`);
        if (el) {
          el.textContent = this.formatTime(this.getTimeInTimezone(tz));
        }
      });
    }, 1000);
  }

  calculateBestMeetingTime() {
    if (this.cities.length < 2) {
      this.elements.scheduleResult.innerHTML = `
        <p style="color: var(--text-secondary); text-align: center;">2개 이상의 도시를 추가하면 최적 회의 시간을 추천합니다.</p>
      `;
      return;
    }

    const baseOffset = this.timezones[this.cities[0]].offset;
    const results = [];

    for (let hour = 0; hour < 24; hour++) {
      let allGood = true;
      const times = [];

      this.cities.forEach(tz => {
        const offset = this.timezones[tz].offset;
        const localHour = (hour + offset - baseOffset + 24) % 24;
        const isWorkHour = localHour >= 9 && localHour < 18;

        times.push({
          city: this.timezones[tz].name,
          hour: localHour,
          isGood: isWorkHour
        });

        if (!isWorkHour) allGood = false;
      });

      results.push({ baseHour: hour, times, allGood });
    }

    const goodSlots = results.filter(r => r.allGood);

    let html = '';

    if (goodSlots.length > 0) {
      html += `<div style="margin-bottom: 1rem; padding: 1rem; background: rgba(34, 197, 94, 0.1); border-radius: 8px;">
        <strong style="color: #22c55e;">추천 시간 (${this.timezones[this.cities[0]].name} 기준)</strong><br>
        <span style="font-size: 1.25rem; font-weight: 600;">
          ${goodSlots.map(s => `${String(s.baseHour).padStart(2, '0')}:00`).join(', ')}
        </span>
      </div>`;
    } else {
      html += `<div style="margin-bottom: 1rem; padding: 1rem; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">
        <strong style="color: #ef4444;">모든 도시의 업무 시간이 겹치지 않습니다</strong>
      </div>`;
    }

    html += '<div style="max-height: 200px; overflow-y: auto;">';
    results.slice(0, 12).forEach(r => {
      html += `
        <div class="schedule-row">
          <strong>${String(r.baseHour).padStart(2, '0')}:00</strong>
          <div class="schedule-times">
            ${r.times.map(t => `
              <span class="schedule-time ${t.isGood ? 'good' : 'bad'}">
                ${t.city} ${String(t.hour).padStart(2, '0')}:00
              </span>
            `).join('')}
          </div>
        </div>
      `;
    });
    html += '</div>';

    this.elements.scheduleResult.innerHTML = html;
  }
}

// 전역 인스턴스 생성
const timezonePlanner = new TimezonePlanner();
window.TimezonePlanner = timezonePlanner;

document.addEventListener('DOMContentLoaded', () => timezonePlanner.init());
