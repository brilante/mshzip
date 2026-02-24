/**
 * 여행 일정 플래너 - ToolBase 기반
 * 여행 일정 계획 및 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ItineraryPlanner = class ItineraryPlanner extends ToolBase {
  constructor() {
    super('ItineraryPlanner');
    this.trip = {
      name: '',
      startDate: '',
      endDate: '',
      days: {}
    };
  }

  init() {
    this.initElements({
      tripName: 'tripName',
      startDate: 'startDate',
      endDate: 'endDate',
      itineraryDays: 'itineraryDays',
      summaryCard: 'summaryCard',
      totalDays: 'totalDays',
      totalActivities: 'totalActivities',
      totalLocations: 'totalLocations',
      avgPerDay: 'avgPerDay'
    });

    this.loadTrip();
    this.setDefaultDates();
    this.render();

    console.log('[ItineraryPlanner] 초기화 완료');
    return this;
  }

  setDefaultDates() {
    if (!this.trip.startDate) {
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      this.elements.startDate.value = this.formatDateInput(nextWeek);

      const endDate = new Date(nextWeek.getTime() + 3 * 24 * 60 * 60 * 1000);
      this.elements.endDate.value = this.formatDateInput(endDate);
    } else {
      this.elements.tripName.value = this.trip.name || '';
      this.elements.startDate.value = this.trip.startDate;
      this.elements.endDate.value = this.trip.endDate;
    }
    this.updateTrip();
  }

  formatDateInput(date) {
    return date.toISOString().split('T')[0];
  }

  formatDateDisplay(dateStr) {
    const date = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getMonth() + 1}/${date.getDate()} (${days[date.getDay()]})`;
  }

  loadTrip() {
    try {
      const saved = localStorage.getItem('itinerary-planner-trip');
      if (saved) {
        this.trip = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveTrip() {
    localStorage.setItem('itinerary-planner-trip', JSON.stringify(this.trip));
  }

  updateTrip() {
    this.trip.name = this.elements.tripName.value;
    this.trip.startDate = this.elements.startDate.value;
    this.trip.endDate = this.elements.endDate.value;
    this.saveTrip();
    this.render();
  }

  getDaysBetween(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const days = [];

    let current = new Date(startDate);
    while (current <= endDate) {
      days.push(this.formatDateInput(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  addActivity(dayKey) {
    const timeInput = document.getElementById(`time-${dayKey}`);
    const nameInput = document.getElementById(`name-${dayKey}`);
    const locationInput = document.getElementById(`location-${dayKey}`);

    const time = timeInput.value || '09:00';
    const name = nameInput.value.trim();
    const location = locationInput.value.trim();

    if (!name) {
      this.showToast('활동명을 입력하세요', 'error');
      return;
    }

    if (!this.trip.days[dayKey]) {
      this.trip.days[dayKey] = [];
    }

    this.trip.days[dayKey].push({ time, name, location });
    this.trip.days[dayKey].sort((a, b) => a.time.localeCompare(b.time));

    nameInput.value = '';
    locationInput.value = '';

    this.saveTrip();
    this.render();
    this.showToast('활동이 추가되었습니다', 'success');
  }

  removeActivity(dayKey, index) {
    if (this.trip.days[dayKey]) {
      this.trip.days[dayKey].splice(index, 1);
      if (this.trip.days[dayKey].length === 0) {
        delete this.trip.days[dayKey];
      }
      this.saveTrip();
      this.render();
    }
  }

  loadSample() {
    const today = new Date();
    const startDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    this.elements.tripName.value = '도쿄 여행';
    this.elements.startDate.value = this.formatDateInput(startDate);

    const endDate = new Date(startDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    this.elements.endDate.value = this.formatDateInput(endDate);

    const day1 = this.formatDateInput(startDate);
    const day2 = this.formatDateInput(new Date(startDate.getTime() + 24 * 60 * 60 * 1000));
    const day3 = this.formatDateInput(new Date(startDate.getTime() + 2 * 24 * 60 * 60 * 1000));
    const day4 = this.formatDateInput(endDate);

    this.trip = {
      name: '도쿄 여행',
      startDate: day1,
      endDate: this.formatDateInput(endDate),
      days: {
        [day1]: [
          { time: '10:00', name: '인천공항 출발', location: '인천국제공항' },
          { time: '12:30', name: '나리타공항 도착', location: '나리타 국제공항' },
          { time: '15:00', name: '호텔 체크인', location: '신주쿠 호텔' },
          { time: '18:00', name: '신주쿠 저녁식사', location: '이자카야' }
        ],
        [day2]: [
          { time: '09:00', name: '아사쿠사 센소지', location: '센소지 절' },
          { time: '12:00', name: '점심식사', location: '아사쿠사 나카미세' },
          { time: '14:00', name: '우에노 공원', location: '우에노 공원' },
          { time: '17:00', name: '아키하바라', location: '아키하바라 전자상가' }
        ],
        [day3]: [
          { time: '10:00', name: '하라주쿠 산책', location: '다케시타 거리' },
          { time: '12:30', name: '오모테산도 카페', location: '오모테산도' },
          { time: '15:00', name: '시부야 쇼핑', location: '시부야 109' },
          { time: '19:00', name: '롯폰기 야경', location: '롯폰기 힐즈' }
        ],
        [day4]: [
          { time: '09:00', name: '호텔 체크아웃', location: '신주쿠 호텔' },
          { time: '11:00', name: '나리타공항 이동', location: '나리타 익스프레스' },
          { time: '14:00', name: '나리타공항 출발', location: '나리타 국제공항' },
          { time: '16:30', name: '인천공항 도착', location: '인천국제공항' }
        ]
      }
    };

    this.saveTrip();
    this.render();
    this.showToast('샘플 일정이 로드되었습니다', 'success');
  }

  clearAll() {
    if (!confirm('모든 일정을 초기화하시겠습니까?')) return;

    this.trip = { name: '', startDate: '', endDate: '', days: {} };
    this.elements.tripName.value = '';
    this.setDefaultDates();
    this.saveTrip();
    this.render();
    this.showToast('초기화되었습니다', 'success');
  }

  exportItinerary() {
    if (!this.trip.startDate || !this.trip.endDate) {
      this.showToast('날짜를 설정하세요', 'error');
      return;
    }

    const days = this.getDaysBetween(this.trip.startDate, this.trip.endDate);
    let text = `${this.trip.name || '여행 일정'}\n`;
    text += `${'='.repeat(40)}\n`;
    text += `${this.trip.startDate} ~ ${this.trip.endDate}\n\n`;

    days.forEach((dayKey, idx) => {
      text += `[Day ${idx + 1}] ${this.formatDateDisplay(dayKey)}\n`;
      text += `${'-'.repeat(30)}\n`;

      const activities = this.trip.days[dayKey] || [];
      if (activities.length === 0) {
        text += '  (일정 없음)\n';
      } else {
        activities.forEach(act => {
          text += `  ${act.time} ${act.name}`;
          if (act.location) text += ` @ ${act.location}`;
          text += '\n';
        });
      }
      text += '\n';
    });

    this.copyToClipboard(text);
  }

  render() {
    const container = this.elements.itineraryDays;
    const startDate = this.elements.startDate.value;
    const endDate = this.elements.endDate.value;

    if (!startDate || !endDate) {
      container.innerHTML = '<div class="empty-day">시작일과 종료일을 선택하세요</div>';
      this.elements.summaryCard.style.display = 'none';
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      container.innerHTML = '<div class="empty-day">종료일이 시작일보다 빠릅니다</div>';
      this.elements.summaryCard.style.display = 'none';
      return;
    }

    const days = this.getDaysBetween(startDate, endDate);

    if (days.length > 30) {
      container.innerHTML = '<div class="empty-day">최대 30일까지만 지원합니다</div>';
      this.elements.summaryCard.style.display = 'none';
      return;
    }

    container.innerHTML = days.map((dayKey, idx) => {
      const activities = this.trip.days[dayKey] || [];

      return `
        <div class="day-card">
          <div class="day-header">
            <div class="day-title">Day ${idx + 1}</div>
            <div class="day-date">${this.formatDateDisplay(dayKey)}</div>
          </div>

          ${activities.length === 0 ?
            '<div class="empty-day" style="padding: 1rem;">아직 일정이 없습니다</div>' :
            activities.map((act, actIdx) => `
              <div class="activity-item">
                <div class="activity-time">${act.time}</div>
                <div class="activity-content">
                  <div class="activity-name">${act.name}</div>
                  ${act.location ? `<div class="activity-location">${act.location}</div>` : ''}
                </div>
                <button onclick="itineraryPlanner.removeActivity('${dayKey}', ${actIdx})" style="background: none; border: none; cursor: pointer; opacity: 0.5;"></button>
              </div>
            `).join('')
          }

          <div class="add-activity">
            <input type="time" id="time-${dayKey}" class="tool-input" value="09:00" style="width: 100px;">
            <input type="text" id="name-${dayKey}" class="tool-input" placeholder="활동명">
            <input type="text" id="location-${dayKey}" class="tool-input" placeholder="장소 (선택)" style="width: 150px;">
            <button class="tool-btn tool-btn-primary" onclick="itineraryPlanner.addActivity('${dayKey}')">추가</button>
          </div>
        </div>
      `;
    }).join('');

    let totalActivities = 0;
    const locations = new Set();

    Object.values(this.trip.days).forEach(dayActivities => {
      totalActivities += dayActivities.length;
      dayActivities.forEach(act => {
        if (act.location) locations.add(act.location);
      });
    });

    this.elements.totalDays.textContent = days.length;
    this.elements.totalActivities.textContent = totalActivities;
    this.elements.totalLocations.textContent = locations.size;
    this.elements.avgPerDay.textContent = days.length > 0 ? (totalActivities / days.length).toFixed(1) : 0;
    this.elements.summaryCard.style.display = 'block';
  }
}

// 전역 인스턴스 생성
const itineraryPlanner = new ItineraryPlanner();
window.ItineraryPlanner = itineraryPlanner;

document.addEventListener('DOMContentLoaded', () => itineraryPlanner.init());
