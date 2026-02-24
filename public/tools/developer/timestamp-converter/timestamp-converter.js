/**
 * 타임스탬프 변환 도구 - ToolBase 기반
 * Unix Timestamp와 날짜/시간 상호 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TimestampConverter = class TimestampConverter extends ToolBase {
  constructor() {
    super('TimestampConverter');
    this.currentInterval = null;
  }

  init() {
    this.initElements({
      currentTimestamp: 'currentTimestamp',
      currentDate: 'currentDate',
      timestampInput: 'timestampInput',
      timestampUnit: 'timestampUnit',
      toDateResult: 'toDateResult',
      localTime: 'localTime',
      utcTime: 'utcTime',
      isoTime: 'isoTime',
      relativeTime: 'relativeTime',
      dateInput: 'dateInput',
      timeInput: 'timeInput',
      timezone: 'timezone',
      toTimestampResult: 'toTimestampResult',
      resultSeconds: 'resultSeconds',
      resultMillis: 'resultMillis',
      timezoneInfo: 'timezoneInfo'
    });

    this.startCurrentTime();
    this.setDefaultDate();
    this.updateTimezoneInfo();

    console.log('[TimestampConverter] 초기화 완료');
    return this;
  }

  startCurrentTime() {
    const update = () => {
      const now = Math.floor(Date.now() / 1000);
      this.elements.currentTimestamp.textContent = now;
      this.elements.currentDate.textContent = new Date().toLocaleString('ko-KR');
    };
    update();
    this.currentInterval = setInterval(update, 1000);
  }

  destroy() {
    if (this.currentInterval) {
      clearInterval(this.currentInterval);
      this.currentInterval = null;
    }
    super.destroy();
  }

  setDefaultDate() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 8);
    this.elements.dateInput.value = dateStr;
    this.elements.timeInput.value = timeStr;
  }

  updateTimezoneInfo() {
    const offset = new Date().getTimezoneOffset();
    const hours = Math.abs(Math.floor(offset / 60));
    const mins = Math.abs(offset % 60);
    const sign = offset <= 0 ? '+' : '-';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.elements.timezoneInfo.textContent =
      `현재 타임존: ${tz} (UTC${sign}${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')})`;
  }

  convertToDate() {
    const input = this.elements.timestampInput.value.trim();
    const unit = this.elements.timestampUnit.value;
    const resultBox = this.elements.toDateResult;

    if (!input) {
      resultBox.style.display = 'none';
      return;
    }

    const timestamp = parseInt(input);
    if (isNaN(timestamp)) {
      resultBox.style.display = 'none';
      this.showToast('유효한 숫자를 입력하세요.', 'warning');
      return;
    }

    const ms = unit === 'ms' ? timestamp : timestamp * 1000;
    const date = new Date(ms);

    if (isNaN(date.getTime())) {
      resultBox.style.display = 'none';
      this.showError('유효하지 않은 타임스탬프입니다.');
      return;
    }

    this.elements.localTime.textContent = date.toLocaleString('ko-KR');
    this.elements.utcTime.textContent = date.toUTCString();
    this.elements.isoTime.textContent = date.toISOString();
    this.elements.relativeTime.textContent = this.getRelativeTime(date);

    resultBox.style.display = 'block';
  }

  convertToTimestamp() {
    const dateInput = this.elements.dateInput.value;
    const timeInput = this.elements.timeInput.value || '00:00:00';
    const timezone = this.elements.timezone.value;
    const resultBox = this.elements.toTimestampResult;

    if (!dateInput) {
      resultBox.style.display = 'none';
      return;
    }

    let date;
    if (timezone === 'utc') {
      date = new Date(`${dateInput}T${timeInput}Z`);
    } else {
      date = new Date(`${dateInput}T${timeInput}`);
    }

    if (isNaN(date.getTime())) {
      resultBox.style.display = 'none';
      this.showError('유효하지 않은 날짜입니다.');
      return;
    }

    const seconds = Math.floor(date.getTime() / 1000);
    const millis = date.getTime();

    this.elements.resultSeconds.textContent = seconds;
    this.elements.resultMillis.textContent = millis;

    resultBox.style.display = 'block';
  }

  getRelativeTime(date) {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const absDiff = Math.abs(diff);
    const isPast = diff < 0;

    const seconds = Math.floor(absDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    let result;
    if (years > 0) result = `${years}년`;
    else if (months > 0) result = `${months}개월`;
    else if (days > 0) result = `${days}일`;
    else if (hours > 0) result = `${hours}시간`;
    else if (minutes > 0) result = `${minutes}분`;
    else result = `${seconds}초`;

    return isPast ? `${result} 전` : `${result} 후`;
  }

  copyCurrentTimestamp() {
    const timestamp = this.elements.currentTimestamp.textContent;
    navigator.clipboard.writeText(timestamp).then(() => {
      this.showSuccess('현재 타임스탬프가 복사되었습니다.');
    });
  }

  useCurrentTimestamp() {
    const timestamp = this.elements.currentTimestamp.textContent;
    this.elements.timestampInput.value = timestamp;
    this.elements.timestampUnit.value = 's';
    this.convertToDate();
  }

  copy(element) {
    const text = element.textContent;
    navigator.clipboard.writeText(text).then(() => {
      this.showSuccess('클립보드에 복사되었습니다.');
    });
  }

  quickRef(type) {
    const now = new Date();
    let date;

    switch (type) {
      case 'start-today':
        date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'end-today':
        date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'start-week':
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        date = new Date(now.getFullYear(), now.getMonth(), diff);
        break;
      case 'start-month':
        date = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'start-year':
        date = new Date(now.getFullYear(), 0, 1);
        break;
      case '1hour':
        date = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case '1day':
        date = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case '1week':
        date = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        return;
    }

    const timestamp = Math.floor(date.getTime() / 1000);
    this.elements.timestampInput.value = timestamp;
    this.elements.timestampUnit.value = 's';
    this.convertToDate();

    this.showToast(`${type} 타임스탬프: ${timestamp}`, 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const timestampConverter = new TimestampConverter();
window.TimestampConverter = timestampConverter;

document.addEventListener('DOMContentLoaded', () => timestampConverter.init());
