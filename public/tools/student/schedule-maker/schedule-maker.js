/**
 * 시간표 생성기 - ToolBase 기반
 * 주간 수업 시간표 관리
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ScheduleMaker = class ScheduleMaker extends ToolBase {
  constructor() {
    super('ScheduleMaker');
    this.classes = [];
    this.selectedColor = '#3b82f6';
    this.colors = [
      '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
      '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#6366f1'
    ];
    this.days = ['월', '화', '수', '목', '금'];
    this.periods = 9;
  }

  init() {
    this.initElements({
      colorOptions: 'colorOptions',
      className: 'className',
      classRoom: 'classRoom',
      classDay: 'classDay',
      classStart: 'classStart',
      classDuration: 'classDuration',
      scheduleGrid: 'scheduleGrid',
      classList: 'classList'
    });

    this.loadData();
    this.renderColorOptions();
    this.renderSchedule();
    this.renderClassList();

    console.log('[ScheduleMaker] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('scheduleMakerData');
      if (saved) {
        this.classes = JSON.parse(saved);
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('scheduleMakerData', JSON.stringify(this.classes));
  }

  renderColorOptions() {
    this.elements.colorOptions.innerHTML = this.colors.map(color =>
      `<div class="color-option ${color === this.selectedColor ? 'selected' : ''}"
            style="background: ${color};"
            onclick="scheduleMaker.selectColor('${color}')"></div>`
    ).join('');
  }

  selectColor(color) {
    this.selectedColor = color;
    this.renderColorOptions();
  }

  addClass() {
    const name = this.elements.className.value.trim();
    const room = this.elements.classRoom.value.trim();
    const day = parseInt(this.elements.classDay.value);
    const start = parseInt(this.elements.classStart.value);
    const duration = parseInt(this.elements.classDuration.value);

    if (!name) {
      this.showToast('과목명을 입력해주세요', 'error');
      return;
    }

    if (this.hasConflict(day, start, duration)) {
      this.showToast('해당 시간에 이미 수업이 있습니다', 'error');
      return;
    }

    this.classes.push({
      id: Date.now(),
      name,
      room,
      day,
      start,
      duration,
      color: this.selectedColor
    });

    this.saveData();
    this.renderSchedule();
    this.renderClassList();

    this.elements.className.value = '';
    this.elements.classRoom.value = '';

    this.showToast('수업이 추가되었습니다', 'success');
  }

  hasConflict(day, start, duration, excludeId = null) {
    return this.classes.some(cls => {
      if (excludeId && cls.id === excludeId) return false;
      if (cls.day !== day) return false;

      const clsEnd = cls.start + cls.duration;
      const newEnd = start + duration;

      return !(newEnd <= cls.start || start >= clsEnd);
    });
  }

  deleteClass(id) {
    if (!confirm('이 수업을 삭제할까요?')) return;
    this.classes = this.classes.filter(c => c.id !== id);
    this.saveData();
    this.renderSchedule();
    this.renderClassList();
  }

  renderSchedule() {
    let html = '<div class="schedule-header">시간</div>';

    this.days.forEach(day => {
      html += `<div class="schedule-header">${day}</div>`;
    });

    for (let period = 1; period <= this.periods; period++) {
      const hour = 8 + period;
      html += `<div class="time-slot">${period}교시<br>${hour}:00</div>`;

      for (let day = 0; day < 5; day++) {
        const cls = this.classes.find(c => c.day === day && c.start === period);
        const isOccupied = this.classes.some(c =>
          c.day === day && period > c.start && period < c.start + c.duration
        );

        if (cls) {
          html += `<div class="schedule-cell has-class" style="grid-row: span ${cls.duration};">
            <div class="class-block" style="background: ${cls.color};">
              <span class="class-name">${cls.name}</span>
              ${cls.room ? `<span class="class-room">${cls.room}</span>` : ''}
            </div>
          </div>`;
        } else if (!isOccupied) {
          html += `<div class="schedule-cell" onclick="scheduleMaker.quickAdd(${day}, ${period})"></div>`;
        }
      }
    }

    this.elements.scheduleGrid.innerHTML = html;
  }

  quickAdd(day, period) {
    this.elements.classDay.value = day;
    this.elements.classStart.value = period;
    this.elements.className.focus();
  }

  renderClassList() {
    if (this.classes.length === 0) {
      this.elements.classList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">등록된 수업이 없습니다</div>';
      return;
    }

    const sorted = [...this.classes].sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return a.start - b.start;
    });

    this.elements.classList.innerHTML = sorted.map(cls => `
      <div class="class-item">
        <div class="class-info">
          <div class="class-color" style="background: ${cls.color};"></div>
          <div>
            <strong>${cls.name}</strong>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">
              ${this.days[cls.day]} ${cls.start}교시~${cls.start + cls.duration - 1}교시
              ${cls.room ? `· ${cls.room}` : ''}
            </div>
          </div>
        </div>
        <button class="btn-delete" onclick="scheduleMaker.deleteClass(${cls.id})">삭제</button>
      </div>
    `).join('');
  }
}

// 전역 인스턴스 생성
const scheduleMaker = new ScheduleMaker();
window.ScheduleMaker = scheduleMaker;

document.addEventListener('DOMContentLoaded', () => scheduleMaker.init());
