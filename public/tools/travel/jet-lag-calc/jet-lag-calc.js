/**
 * 시차 적응 계산기 - ToolBase 기반
 * 시차 적응 기간 및 팁 제공
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var JetLagCalc = class JetLagCalc extends ToolBase {
  constructor() {
    super('JetLagCalc');
    this.direction = 'west';

    this.tips = {
      general: [
        { icon: '', title: '수분 섭취', desc: '비행 중과 도착 후 충분한 수분을 섭취하세요' },
        { icon: '', title: '카페인/알코올 자제', desc: '도착 후 첫 며칠은 카페인과 알코올을 피하세요' },
        { icon: '', title: '햇빛 노출', desc: '현지 낮 시간에 햇빛을 쬐어 체내 시계를 조절하세요' },
        { icon: '', title: '가벼운 운동', desc: '가벼운 산책이나 스트레칭으로 몸을 깨우세요' }
      ],
      east: [
        { icon: '', title: '일찍 자기', desc: '출발 며칠 전부터 1시간씩 일찍 자세요' },
        { icon: '', title: '아침 햇빛', desc: '도착 후 아침 햇빛을 많이 쬐세요' },
        { icon: '', title: '낮잠 자제', desc: '도착 당일 낮잠을 피하세요' }
      ],
      west: [
        { icon: '', title: '늦게 자기', desc: '출발 며칠 전부터 1시간씩 늦게 자세요' },
        { icon: '', title: '저녁 햇빛', desc: '도착 후 저녁 햇빛을 쬐세요' },
        { icon: '', title: '현지 밤까지 버티기', desc: '졸려도 현지 취침 시간까지 버티세요' }
      ]
    };
  }

  init() {
    this.initElements({
      fromTimezone: 'fromTimezone',
      toTimezone: 'toTimezone',
      dirEast: 'dirEast',
      dirWest: 'dirWest',
      timeDiff: 'timeDiff',
      severityBadge: 'severityBadge',
      adaptDays: 'adaptDays',
      prepDays: 'prepDays',
      tipsList: 'tipsList',
      scheduleList: 'scheduleList'
    });

    this.calculate();

    console.log('[JetLagCalc] 초기화 완료');
    return this;
  }

  setDirection(dir) {
    this.direction = dir;
    this.elements.dirEast.className = dir === 'east' ? 'tool-btn tool-btn-primary' : 'tool-btn tool-btn-secondary';
    this.elements.dirWest.className = dir === 'west' ? 'tool-btn tool-btn-primary' : 'tool-btn tool-btn-secondary';
    this.calculate();
  }

  swap() {
    const from = this.elements.fromTimezone;
    const to = this.elements.toTimezone;
    const temp = from.value;
    from.value = to.value;
    to.value = temp;
    this.calculate();
  }

  calculate() {
    const fromOffset = parseFloat(this.elements.fromTimezone.value);
    const toOffset = parseFloat(this.elements.toTimezone.value);

    let diff = Math.abs(toOffset - fromOffset);

    if (diff > 12) {
      diff = 24 - diff;
    }

    this.elements.timeDiff.textContent = `${diff}시간`;

    let severity, severityClass, adaptDays, prepDays;

    if (diff <= 3) {
      severity = '경미';
      severityClass = 'severity-low';
      adaptDays = '1-2일';
      prepDays = '불필요';
    } else if (diff <= 6) {
      severity = '보통';
      severityClass = 'severity-medium';
      adaptDays = '3-5일';
      prepDays = '2일 전';
    } else if (diff <= 9) {
      severity = '심함';
      severityClass = 'severity-high';
      adaptDays = '5-7일';
      prepDays = '3일 전';
    } else {
      severity = '매우 심함';
      severityClass = 'severity-high';
      adaptDays = '7-10일';
      prepDays = '4-5일 전';
    }

    const badge = this.elements.severityBadge;
    badge.textContent = severity;
    badge.className = `severity-badge ${severityClass}`;

    this.elements.adaptDays.textContent = adaptDays;
    this.elements.prepDays.textContent = prepDays;

    this.renderTips(diff);
    this.renderSchedule(diff);
  }

  renderTips(diff) {
    const tips = [...this.tips.general];

    if (this.direction === 'east') {
      tips.push(...this.tips.east);
    } else {
      tips.push(...this.tips.west);
    }

    this.elements.tipsList.innerHTML = tips.map(tip => `
      <div class="tip-item">
        <div class="tip-icon">${tip.icon}</div>
        <div class="tip-content">
          <h4>${tip.title}</h4>
          <p>${tip.desc}</p>
        </div>
      </div>
    `).join('');
  }

  renderSchedule(diff) {
    const schedules = [];

    if (diff <= 3) {
      schedules.push({
        day: '도착일',
        items: ['현지 시간에 맞춰 활동', '가벼운 산책 권장', '현지 취침 시간에 잠들기']
      });
    } else if (diff <= 6) {
      schedules.push({
        day: '도착 1일차',
        items: ['현지 시간에 맞춰 기상', '낮잠 30분 이내', '저녁 7시 이후 카페인 금지']
      });
      schedules.push({
        day: '도착 2-3일차',
        items: ['정상적인 수면 패턴 유지', '아침 햇빛 30분 이상 노출', '규칙적인 식사']
      });
    } else {
      schedules.push({
        day: '출발 3일 전',
        items: [
          this.direction === 'east' ? '평소보다 1시간 일찍 취침' : '평소보다 1시간 늦게 취침',
          '가벼운 운동으로 피로도 조절'
        ]
      });
      schedules.push({
        day: '도착 1-2일차',
        items: ['현지 시간 맞추기 시작', '낮잠 20분 이내', '충분한 수분 섭취']
      });
      schedules.push({
        day: '도착 3-5일차',
        items: ['정상 수면 패턴 정착', '활동량 점진적 증가', '햇빛 노출 1시간 이상']
      });

      if (diff > 9) {
        schedules.push({
          day: '도착 6-7일차',
          items: ['완전한 적응 완료', '정상적인 일상 활동', '피로감 해소']
        });
      }
    }

    this.elements.scheduleList.innerHTML = schedules.map(schedule => `
      <div class="schedule-day">
        <div class="schedule-day-header">${schedule.day}</div>
        ${schedule.items.map(item => `
          <div class="schedule-item">
            <span>•</span>
            <span>${item}</span>
          </div>
        `).join('')}
      </div>
    `).join('');
  }
}

// 전역 인스턴스 생성
const jetLagCalc = new JetLagCalc();
window.JetLagCalc = jetLagCalc;

document.addEventListener('DOMContentLoaded', () => jetLagCalc.init());
