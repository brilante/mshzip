/**
 * 시간대 변환기 - ToolBase 기반
 * 세계 각 도시의 시간을 변환하고 표시
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class TimeZoneConverter extends ToolBase {
  constructor() {
    super('TimeZoneConverter');
    this.timezones = [
      { id: 'Asia/Seoul', name: '서울', country: '한국', flag: '🇰🇷' },
      { id: 'Asia/Tokyo', name: '도쿄', country: '일본', flag: '🇯🇵' },
      { id: 'Asia/Shanghai', name: '상하이', country: '중국', flag: '🇨🇳' },
      { id: 'Asia/Singapore', name: '싱가포르', country: '싱가포르', flag: '🇸🇬' },
      { id: 'Asia/Dubai', name: '두바이', country: 'UAE', flag: '🇦🇪' },
      { id: 'Asia/Kolkata', name: '뭄바이', country: '인도', flag: '🇮🇳' },
      { id: 'Europe/London', name: '런던', country: '영국', flag: '🇬🇧' },
      { id: 'Europe/Paris', name: '파리', country: '프랑스', flag: '🇫🇷' },
      { id: 'Europe/Berlin', name: '베를린', country: '독일', flag: '🇩🇪' },
      { id: 'Europe/Moscow', name: '모스크바', country: '러시아', flag: '🇷🇺' },
      { id: 'America/New_York', name: '뉴욕', country: '미국', flag: '🇺🇸' },
      { id: 'America/Los_Angeles', name: 'LA', country: '미국', flag: '🇺🇸' },
      { id: 'America/Chicago', name: '시카고', country: '미국', flag: '🇺🇸' },
      { id: 'America/Sao_Paulo', name: '상파울루', country: '브라질', flag: '🇧🇷' },
      { id: 'Australia/Sydney', name: '시드니', country: '호주', flag: '🇦🇺' },
      { id: 'Pacific/Auckland', name: '오클랜드', country: '뉴질랜드', flag: '🇳🇿' },
    ];
    this.clockInterval = null;
  }

  init() {
    this.initElements({
      baseDateTime: 'baseDateTime',
      baseTimezone: 'baseTimezone',
      timezoneGrid: 'timezoneGrid',
      localTime: 'localTime'
    });

    this.setNow();
    this.renderTimezoneGrid();
    this.startClock();

    console.log('[TimeZoneConverter] 초기화 완료');
    return this;
  }

  setNow() {
    const now = new Date();
    const localISOString = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    this.elements.baseDateTime.value = localISOString;
    this.convert();
  }

  addHours(hours) {
    const input = this.elements.baseDateTime;
    const date = new Date(input.value);
    date.setHours(date.getHours() + hours);
    const localISOString = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    input.value = localISOString;
    this.convert();
    this.showToast(`${hours > 0 ? '+' : ''}${hours}시간 조정됨`, 'info');
  }

  renderTimezoneGrid() {
    const grid = this.elements.timezoneGrid;
    grid.innerHTML = this.timezones.map(tz => `
      <div class="timezone-card" id="tz-${tz.id.replace('/', '-')}">
        <div class="tz-header">
          <span class="tz-name">${tz.flag} ${tz.name}</span>
          <span class="tz-offset" id="offset-${tz.id.replace('/', '-')}">--</span>
        </div>
        <div class="tz-time" id="time-${tz.id.replace('/', '-')}">--:--</div>
        <div class="tz-date" id="date-${tz.id.replace('/', '-')}">--</div>
      </div>
    `).join('');
  }

  convert() {
    const baseDateTime = this.elements.baseDateTime.value;
    const baseTimezone = this.elements.baseTimezone.value;

    if (!baseDateTime) return;

    // 기준 시간대로 Date 객체 생성
    const baseDate = new Date(baseDateTime);

    // 각 시간대별로 변환
    this.timezones.forEach(tz => {
      try {
        const options = {
          timeZone: tz.id,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        };
        const dateOptions = {
          timeZone: tz.id,
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          weekday: 'short'
        };

        // 기준 시간대에서 대상 시간대로 변환
        const targetTime = this.convertBetweenTimezones(baseDate, baseTimezone, tz.id);

        const timeStr = targetTime.toLocaleTimeString('ko-KR', options);
        const dateStr = targetTime.toLocaleDateString('ko-KR', dateOptions);
        const offset = this.getTimezoneOffset(tz.id, targetTime);

        const safeId = tz.id.replace('/', '-');
        const timeEl = document.getElementById(`time-${safeId}`);
        const dateEl = document.getElementById(`date-${safeId}`);
        const offsetEl = document.getElementById(`offset-${safeId}`);
        if (timeEl) timeEl.textContent = timeStr;
        if (dateEl) dateEl.textContent = dateStr;
        if (offsetEl) offsetEl.textContent = offset;
      } catch (e) {
        console.error(`[TimeZoneConverter] ${tz.id} 변환 오류:`, e);
      }
    });
  }

  convertBetweenTimezones(date, fromTz, toTz) {
    // 입력된 로컬 시간을 기준 시간대의 UTC로 변환
    const fromOffset = this.getOffsetMinutes(fromTz, date);
    const toOffset = this.getOffsetMinutes(toTz, date);

    // UTC 기준으로 변환 후 대상 시간대로 조정
    const utcTime = date.getTime() - fromOffset * 60000;
    const targetTime = new Date(utcTime + toOffset * 60000);

    return targetTime;
  }

  getOffsetMinutes(timezone, date) {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (tzDate - utcDate) / 60000;
  }

  getTimezoneOffset(timezone, date) {
    const offsetMinutes = this.getOffsetMinutes(timezone, date);
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const minutes = Math.abs(offsetMinutes) % 60;
    const sign = offsetMinutes >= 0 ? '+' : '-';
    return `UTC${sign}${hours}${minutes > 0 ? ':' + String(minutes).padStart(2, '0') : ''}`;
  }

  startClock() {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      if (this.elements.localTime) {
        this.elements.localTime.textContent = timeStr;
      }
    };

    updateClock();
    this.clockInterval = setInterval(updateClock, 1000);
  }

  reset() {
    this.setNow();
    this.elements.baseTimezone.value = 'Asia/Seoul';
    this.showToast('초기화되었습니다.', 'info');
  }

  destroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
    super.destroy();
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const timeZone = new TimeZoneConverter();
window.TimeZone = timeZone;

document.addEventListener('DOMContentLoaded', () => timeZone.init());
