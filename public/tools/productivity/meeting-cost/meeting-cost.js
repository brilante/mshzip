/**
 * 회의 비용 계산기 - ToolBase 기반
 * 회의에 드는 실제 비용 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var MeetingCost = class MeetingCost extends ToolBase {
  constructor() {
    super('MeetingCost');
    this.attendees = [
      { id: 1, role: '참석자 1', hourlyWage: 30000 },
      { id: 2, role: '참석자 2', hourlyWage: 30000 }
    ];
    this.nextId = 3;
    this.counterInterval = null;
    this.counterStartTime = null;
    this.counterElapsed = 0;
    this.counterRunning = false;
  }

  init() {
    this.initElements({
      attendeesList: 'attendeesList',
      meetingHours: 'meetingHours',
      meetingMinutes: 'meetingMinutes',
      roomCost: 'roomCost',
      refreshmentCost: 'refreshmentCost',
      otherCost: 'otherCost',
      totalCost: 'totalCost',
      costPerMinute: 'costPerMinute',
      laborCost: 'laborCost',
      roomCostResult: 'roomCostResult',
      refreshmentCostResult: 'refreshmentCostResult',
      otherCostResult: 'otherCostResult',
      insightItem: 'insightItem',
      liveCounter: 'liveCounter',
      counterToggleText: 'counterToggleText',
      startBtn: 'startBtn',
      stopBtn: 'stopBtn',
      liveValue: 'liveValue',
      elapsedTime: 'elapsedTime'
    });

    this.renderAttendees();
    this.calculate();

    console.log('[MeetingCost] 초기화 완료');
    return this;
  }

  renderAttendees() {
    this.elements.attendeesList.innerHTML = this.attendees.map(a => `
      <div class="attendee-row" data-id="${a.id}">
        <div class="attendee-role">
          <input type="text" value="${this.escapeHtml(a.role)}" placeholder="직책/이름"
                 onchange="meetingCost.updateAttendee(${a.id}, 'role', this.value)">
        </div>
        <div class="attendee-wage">
          <input type="number" value="${a.hourlyWage}" placeholder="시급"
                 onchange="meetingCost.updateAttendee(${a.id}, 'hourlyWage', this.value)">
          <div class="attendee-wage-label">시급 (원)</div>
        </div>
        <button class="attendee-remove" onclick="meetingCost.removeAttendee(${a.id})" title="삭제"></button>
      </div>
    `).join('');
  }

  addAttendee() {
    this.attendees.push({
      id: this.nextId++,
      role: `참석자 ${this.attendees.length + 1}`,
      hourlyWage: 30000
    });
    this.renderAttendees();
    this.calculate();
  }

  removeAttendee(id) {
    if (this.attendees.length <= 1) {
      this.showToast('최소 1명의 참석자가 필요합니다', 'error');
      return;
    }
    this.attendees = this.attendees.filter(a => a.id !== id);
    this.renderAttendees();
    this.calculate();
  }

  updateAttendee(id, field, value) {
    const attendee = this.attendees.find(a => a.id === id);
    if (attendee) {
      attendee[field] = field === 'hourlyWage' ? parseFloat(value) || 0 : value;
      this.calculate();
    }
  }

  setTime(hours, btn) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);

    this.elements.meetingHours.value = h;
    this.elements.meetingMinutes.value = m;

    document.querySelectorAll('.quick-time-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    this.calculate();
  }

  calculate() {
    const hours = parseFloat(this.elements.meetingHours.value) || 0;
    const minutes = parseFloat(this.elements.meetingMinutes.value) || 0;
    const totalHours = hours + (minutes / 60);

    const laborCost = this.attendees.reduce((sum, a) => {
      return sum + (a.hourlyWage * totalHours);
    }, 0);

    const roomCostPerHour = parseFloat(this.elements.roomCost.value) || 0;
    const roomCost = roomCostPerHour * totalHours;
    const refreshmentCost = parseFloat(this.elements.refreshmentCost.value) || 0;
    const otherCost = parseFloat(this.elements.otherCost.value) || 0;

    const totalCost = laborCost + roomCost + refreshmentCost + otherCost;

    const totalMinutes = totalHours * 60;
    const costPerMinute = totalMinutes > 0 ? totalCost / totalMinutes : 0;

    this.elements.totalCost.textContent = this.formatCurrency(totalCost);
    this.elements.costPerMinute.textContent = `분당 ${this.formatCurrency(costPerMinute)}`;

    this.elements.laborCost.textContent = this.formatCurrency(laborCost);
    this.elements.roomCostResult.textContent = this.formatCurrency(roomCost);
    this.elements.refreshmentCostResult.textContent = this.formatCurrency(refreshmentCost);
    this.elements.otherCostResult.textContent = this.formatCurrency(otherCost);

    this.generateInsight(totalCost, laborCost, totalHours);
  }

  generateInsight(totalCost, laborCost, totalHours) {
    const attendeeCount = this.attendees.length;

    const insights = [];

    if (attendeeCount > 5) {
      insights.push(`<strong>${attendeeCount}명</strong>이 참석하는 대규모 회의입니다. 필수 참석자만 초대하면 비용을 절감할 수 있습니다.`);
    }

    if (totalHours > 1.5) {
      const savingsIfShorter = (totalCost / totalHours) * 0.5;
      insights.push(`회의 시간이 <strong>${totalHours}시간</strong>입니다. 30분 단축 시 약 <strong>${this.formatCurrency(savingsIfShorter)}</strong>를 절약할 수 있습니다.`);
    }

    const laborPercent = Math.round((laborCost / totalCost) * 100) || 0;
    if (laborPercent > 80) {
      insights.push(`인건비가 총 비용의 <strong>${laborPercent}%</strong>를 차지합니다. 참석자 수를 줄이는 것이 가장 효과적입니다.`);
    }

    const costPerPerson = totalCost / attendeeCount;
    insights.push(`1인당 회의 비용은 <strong>${this.formatCurrency(costPerPerson)}</strong>입니다.`);

    const yearlyCost = totalCost * 52;
    insights.push(`주 1회 진행 시 연간 <strong>${this.formatCurrency(yearlyCost)}</strong>의 비용이 발생합니다.`);

    this.elements.insightItem.innerHTML = insights.map(i => `<p>${i}</p>`).join('');
  }

  toggleCounter() {
    if (this.elements.liveCounter.style.display === 'none') {
      this.elements.liveCounter.style.display = 'block';
      this.elements.counterToggleText.textContent = '닫기';
    } else {
      this.elements.liveCounter.style.display = 'none';
      this.elements.counterToggleText.textContent = '열기';
      this.stopCounter();
    }
  }

  startCounter() {
    if (this.counterRunning) return;

    this.counterRunning = true;
    this.counterStartTime = Date.now() - this.counterElapsed;

    this.elements.startBtn.style.display = 'none';
    this.elements.stopBtn.style.display = 'inline-block';

    this.counterInterval = setInterval(() => this.updateCounter(), 100);
  }

  stopCounter() {
    if (!this.counterRunning) return;

    this.counterRunning = false;
    this.counterElapsed = Date.now() - this.counterStartTime;

    this.elements.startBtn.style.display = 'inline-block';
    this.elements.stopBtn.style.display = 'none';

    if (this.counterInterval) {
      clearInterval(this.counterInterval);
      this.counterInterval = null;
    }
  }

  resetCounter() {
    this.stopCounter();
    this.counterElapsed = 0;
    this.counterStartTime = null;

    this.elements.liveValue.textContent = '₩0';
    this.elements.elapsedTime.textContent = '00:00';
  }

  updateCounter() {
    const elapsed = Date.now() - this.counterStartTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const displayMin = minutes % 60;
    const displaySec = seconds % 60;

    let timeStr;
    if (hours > 0) {
      timeStr = `${hours}:${displayMin.toString().padStart(2, '0')}:${displaySec.toString().padStart(2, '0')}`;
    } else {
      timeStr = `${displayMin.toString().padStart(2, '0')}:${displaySec.toString().padStart(2, '0')}`;
    }
    this.elements.elapsedTime.textContent = timeStr;

    const elapsedHours = elapsed / (1000 * 60 * 60);

    const laborCost = this.attendees.reduce((sum, a) => {
      return sum + (a.hourlyWage * elapsedHours);
    }, 0);

    const roomCostPerHour = parseFloat(this.elements.roomCost.value) || 0;
    const roomCost = roomCostPerHour * elapsedHours;

    const liveCost = laborCost + roomCost;

    this.elements.liveValue.textContent = this.formatCurrency(Math.round(liveCost));
  }

  formatCurrency(value) {
    return '₩' + Math.round(value).toLocaleString('ko-KR');
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// 전역 인스턴스 생성
const meetingCost = new MeetingCost();
window.MeetingCost = meetingCost;

// 전역 함수 (HTML onclick 호환)
function addAttendee() { meetingCost.addAttendee(); }
function setTime(hours) { meetingCost.setTime(hours, event.target); }
function calculate() { meetingCost.calculate(); }
function toggleCounter() { meetingCost.toggleCounter(); }
function startCounter() { meetingCost.startCounter(); }
function stopCounter() { meetingCost.stopCounter(); }
function resetCounter() { meetingCost.resetCounter(); }

document.addEventListener('DOMContentLoaded', () => meetingCost.init());
