/**
 * Cron 파서 도구 - ToolBase 기반
 * Cron 표현식 분석 및 다음 실행 시간 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CronParser = class CronParser extends ToolBase {
  constructor() {
    super('CronParser');
    this.weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    this.months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  }

  init() {
    this.initElements({
      cronInput: 'cronInput',
      partMinute: 'partMinute',
      partHour: 'partHour',
      partDay: 'partDay',
      partMonth: 'partMonth',
      partWeekday: 'partWeekday',
      cronDescription: 'cronDescription',
      nextRunList: 'nextRunList'
    });

    this.parse();

    console.log('[CronParser] 초기화 완료');
    return this;
  }

  parse() {
    const input = this.elements.cronInput.value.trim();
    const parts = input.split(/\s+/);

    if (parts.length !== 5) {
      this.showParseError('Cron 표현식은 5개의 필드가 필요합니다 (분 시 일 월 요일)');
      return;
    }

    try {
      // 각 파트 표시
      this.elements.partMinute.textContent = parts[0];
      this.elements.partHour.textContent = parts[1];
      this.elements.partDay.textContent = parts[2];
      this.elements.partMonth.textContent = parts[3];
      this.elements.partWeekday.textContent = parts[4];

      // 유효성 검사
      this.validatePart(parts[0], 0, 59, '분');
      this.validatePart(parts[1], 0, 23, '시');
      this.validatePart(parts[2], 1, 31, '일');
      this.validatePart(parts[3], 1, 12, '월');
      this.validatePart(parts[4], 0, 6, '요일');

      // 설명 생성
      const description = this.generateDescription(parts);
      this.elements.cronDescription.textContent = description;

      // 다음 실행 시간 계산
      const nextRuns = this.getNextRuns(parts, 5);
      this.displayNextRuns(nextRuns);

      this.elements.cronInput.classList.remove('error');

    } catch (error) {
      this.showParseError(error.message);
    }
  }

  validatePart(value, min, max, name) {
    if (value === '*') return;

    if (value.startsWith('*/')) {
      const step = parseInt(value.slice(2));
      if (isNaN(step) || step < 1) {
        throw new Error(`${name}: 잘못된 간격 값`);
      }
      return;
    }

    const values = value.split(',');
    for (const v of values) {
      if (v.includes('-')) {
        const [start, end] = v.split('-').map(Number);
        if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
          throw new Error(`${name}: 잘못된 범위 (${min}-${max})`);
        }
      } else {
        const num = parseInt(v);
        if (isNaN(num) || num < min || num > max) {
          throw new Error(`${name}: 값이 범위를 벗어남 (${min}-${max})`);
        }
      }
    }
  }

  generateDescription(parts) {
    const [minute, hour, day, month, weekday] = parts;

    if (parts.every(p => p === '*')) {
      return '매 분마다 실행';
    }

    let desc = [];

    if (month !== '*') {
      desc.push(this.describeField(month, this.months, '월'));
    }

    if (day !== '*') {
      desc.push(`${this.describeField(day, null, '일')}일`);
    }

    if (weekday !== '*') {
      desc.push(this.describeField(weekday, this.weekdays, '요일'));
    }

    if (hour !== '*' || minute !== '*') {
      let timeDesc = '';
      if (hour === '*') {
        timeDesc = '매 시간';
      } else {
        timeDesc = `${this.describeField(hour, null, '시')}시`;
      }

      if (minute === '*') {
        timeDesc += ' 매 분';
      } else if (minute === '0') {
        timeDesc += ' 정각';
      } else {
        timeDesc += ` ${this.describeField(minute, null, '분')}분`;
      }

      desc.push(timeDesc);
    }

    return desc.length > 0 ? desc.join(' ') + '에 실행' : '매 분마다 실행';
  }

  describeField(value, labels, unit) {
    if (value === '*') return `매 ${unit}`;

    if (value.startsWith('*/')) {
      const step = value.slice(2);
      return `${step}${unit}마다`;
    }

    if (value.includes(',')) {
      const values = value.split(',').map(v => labels ? labels[parseInt(v)] : v);
      return values.join(', ');
    }

    if (value.includes('-')) {
      const [start, end] = value.split('-');
      if (labels) {
        return `${labels[parseInt(start)]}~${labels[parseInt(end)]}`;
      }
      return `${start}~${end}`;
    }

    if (labels) {
      return labels[parseInt(value)];
    }
    return value;
  }

  getNextRuns(parts, count) {
    const runs = [];
    let current = new Date();
    current.setSeconds(0);
    current.setMilliseconds(0);

    const maxIterations = 100000;
    let iterations = 0;

    while (runs.length < count && iterations < maxIterations) {
      current = new Date(current.getTime() + 60000);
      iterations++;

      if (this.matches(current, parts)) {
        runs.push(new Date(current));
      }
    }

    return runs;
  }

  matches(date, parts) {
    const [minute, hour, day, month, weekday] = parts;

    return this.matchField(date.getMinutes(), minute, 0, 59) &&
           this.matchField(date.getHours(), hour, 0, 23) &&
           this.matchField(date.getDate(), day, 1, 31) &&
           this.matchField(date.getMonth() + 1, month, 1, 12) &&
           this.matchField(date.getDay(), weekday, 0, 6);
  }

  matchField(value, pattern, min, max) {
    if (pattern === '*') return true;

    if (pattern.startsWith('*/')) {
      const step = parseInt(pattern.slice(2));
      return value % step === 0;
    }

    const parts = pattern.split(',');
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (value >= start && value <= end) return true;
      } else {
        if (parseInt(part) === value) return true;
      }
    }

    return false;
  }

  displayNextRuns(runs) {
    const container = this.elements.nextRunList;
    const now = new Date();

    if (runs.length === 0) {
      container.innerHTML = '<div style="text-align: center; color: var(--tools-text-secondary);">다음 실행 시간을 계산할 수 없습니다</div>';
      return;
    }

    container.innerHTML = runs.map((date, i) => {
      const relative = this.getRelativeTime(date, now);
      const dateStr = date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="next-run-item">
          <div class="next-run-index">${i + 1}</div>
          <div class="next-run-date">${dateStr}</div>
          <div class="next-run-relative">${relative}</div>
        </div>
      `;
    }).join('');
  }

  getRelativeTime(date, now) {
    const diff = date.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}일 ${hours % 24}시간 후`;
    if (hours > 0) return `${hours}시간 ${minutes % 60}분 후`;
    return `${minutes}분 후`;
  }

  showParseError(message) {
    this.elements.cronInput.classList.add('error');
    this.elements.cronDescription.textContent = `${message}`;
    this.elements.nextRunList.innerHTML =
      '<div style="text-align: center; color: var(--tools-danger);">유효하지 않은 표현식</div>';
  }

  loadPreset(cron) {
    this.elements.cronInput.value = cron;
    this.parse();
    this.showToast('프리셋이 적용되었습니다.', 'info');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const cronParser = new CronParser();
window.CronParser = cronParser;

document.addEventListener('DOMContentLoaded', () => cronParser.init());
