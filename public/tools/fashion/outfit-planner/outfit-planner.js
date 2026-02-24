/**
 * 코디 플래너 - ToolBase 기반
 * 일별 옷차림 계획
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var OutfitPlanner = class OutfitPlanner extends ToolBase {
  constructor() {
    super('OutfitPlanner');
    this.currentDate = new Date();
    this.selectedDate = null;
    this.outfits = {};
    this.currentWeather = 'sunny';
  }

  init() {
    this.initElements({
      currentMonth: 'currentMonth',
      calendarDays: 'calendarDays',
      outfitForm: 'outfitForm',
      selectedDateText: 'selectedDateText',
      outfitTop: 'outfitTop',
      outfitBottom: 'outfitBottom',
      outfitOuter: 'outfitOuter',
      outfitShoes: 'outfitShoes',
      outfitAcc: 'outfitAcc',
      outfitNote: 'outfitNote',
      weekOutfits: 'weekOutfits'
    });

    this.loadData();
    this.renderCalendar();
    this.renderWeekOutfits();

    console.log('[OutfitPlanner] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('outfitPlanner');
      if (saved) {
        this.outfits = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('outfitPlanner', JSON.stringify(this.outfits));
  }

  getDateKey(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.renderCalendar();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.renderCalendar();
  }

  renderCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const today = new Date();

    this.elements.currentMonth.textContent = `${year}년 ${month + 1}월`;

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();

    let html = '';

    // 빈 칸
    for (let i = 0; i < firstDay; i++) {
      html += '<div class="calendar-day" style="background: transparent;"></div>';
    }

    // 날짜
    for (let d = 1; d <= lastDate; d++) {
      const date = new Date(year, month, d);
      const dateKey = this.getDateKey(date);
      const isToday = date.toDateString() === today.toDateString();
      const hasOutfit = !!this.outfits[dateKey];
      const isSelected = this.selectedDate === dateKey;

      let classes = 'calendar-day';
      if (isToday) classes += ' today';
      if (hasOutfit) classes += ' has-outfit';
      if (isSelected) classes += ' selected';

      html += `<div class="${classes}" onclick="outfitPlanner.selectDate('${dateKey}')">
        ${d}
        ${hasOutfit ? '<div class="outfit-dot"></div>' : ''}
      </div>`;
    }

    this.elements.calendarDays.innerHTML = html;
  }

  selectDate(dateKey) {
    this.selectedDate = dateKey;
    this.renderCalendar();
    this.showOutfitForm(dateKey);
  }

  setWeather(weather) {
    this.currentWeather = weather;
    document.querySelectorAll('.weather-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.weather === weather);
    });
  }

  showOutfitForm(dateKey) {
    this.elements.outfitForm.style.display = 'block';

    const [year, month, day] = dateKey.split('-');
    this.elements.selectedDateText.textContent = `${month}월 ${day}일`;

    const outfit = this.outfits[dateKey] || {};
    this.elements.outfitTop.value = outfit.top || '';
    this.elements.outfitBottom.value = outfit.bottom || '';
    this.elements.outfitOuter.value = outfit.outer || '';
    this.elements.outfitShoes.value = outfit.shoes || '';
    this.elements.outfitAcc.value = outfit.acc || '';
    this.elements.outfitNote.value = outfit.note || '';

    this.setWeather(outfit.weather || 'sunny');
  }

  saveOutfit() {
    if (!this.selectedDate) return;

    const outfit = {
      top: this.elements.outfitTop.value,
      bottom: this.elements.outfitBottom.value,
      outer: this.elements.outfitOuter.value,
      shoes: this.elements.outfitShoes.value,
      acc: this.elements.outfitAcc.value,
      note: this.elements.outfitNote.value,
      weather: this.currentWeather
    };

    // 모든 필드가 비어있으면 삭제
    if (Object.values(outfit).every(v => !v || v === 'sunny')) {
      delete this.outfits[this.selectedDate];
    } else {
      this.outfits[this.selectedDate] = outfit;
    }

    this.saveData();
    this.renderCalendar();
    this.renderWeekOutfits();

    this.showToast('저장되었습니다', 'success');
  }

  deleteOutfit() {
    if (!this.selectedDate) return;
    if (!confirm('이 날짜의 코디를 삭제할까요?')) return;

    delete this.outfits[this.selectedDate];
    this.saveData();
    this.renderCalendar();
    this.renderWeekOutfits();
    this.showOutfitForm(this.selectedDate);
  }

  renderWeekOutfits() {
    const today = new Date();
    const weekDates = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      weekDates.push(this.getDateKey(d));
    }

    const weekOutfits = weekDates.filter(k => this.outfits[k]).map(k => ({ date: k, ...this.outfits[k] }));

    if (weekOutfits.length === 0) {
      this.elements.weekOutfits.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">이번 주 계획된 코디가 없습니다</div>';
      return;
    }

    const weatherIcons = { sunny: '', cloudy: '', rainy: '', cold: '' };

    this.elements.weekOutfits.innerHTML = weekOutfits.map(o => {
      const [, month, day] = o.date.split('-');
      const items = [o.top, o.bottom, o.outer, o.shoes].filter(Boolean).join(' / ');
      return `<div class="outfit-card">
        <div class="outfit-card-header">
          <span class="outfit-card-date">${weatherIcons[o.weather] || ''} ${month}월 ${day}일</span>
          <span class="outfit-card-delete" onclick="outfitPlanner.selectDate('${o.date}')">수정</span>
        </div>
        <div class="outfit-card-items">${items}</div>
        ${o.note ? `<div style="font-size: 0.8rem; color: var(--primary); margin-top: 0.25rem;">${o.note}</div>` : ''}
      </div>`;
    }).join('');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const outfitPlanner = new OutfitPlanner();
window.OutfitPlanner = outfitPlanner;

document.addEventListener('DOMContentLoaded', () => outfitPlanner.init());
