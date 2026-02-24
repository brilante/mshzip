/**
 * 미팅 스케줄러 - ToolBase 기반
 * 미팅 일정 관리 및 공유
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var MeetingScheduler = class MeetingScheduler extends ToolBase {
  constructor() {
    super('MeetingScheduler');
    this.meetings = [];
    this.nextId = 1;
  }

  init() {
    this.initElements({
      meetingTitle: 'meetingTitle',
      meetingDate: 'meetingDate',
      meetingTime: 'meetingTime',
      meetingDuration: 'meetingDuration',
      meetingLocation: 'meetingLocation',
      meetingDesc: 'meetingDesc',
      meetingAttendees: 'meetingAttendees',
      meetingsList: 'meetingsList'
    });

    this.loadFromStorage();
    this.renderMeetings();

    console.log('[MeetingScheduler] 초기화 완료');
    return this;
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem('mymind3_meetings');
      if (saved) {
        this.meetings = JSON.parse(saved);
        this.nextId = Math.max(...this.meetings.map(m => m.id), 0) + 1;
      }
    } catch (e) {
      console.error('Failed to load meetings:', e);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem('mymind3_meetings', JSON.stringify(this.meetings));
    } catch (e) {
      console.error('Failed to save meetings:', e);
    }
  }

  addMeeting() {
    const title = this.elements.meetingTitle.value.trim();
    const date = this.elements.meetingDate.value;
    const time = this.elements.meetingTime.value;
    const duration = this.elements.meetingDuration.value;
    const location = this.elements.meetingLocation.value.trim();
    const description = this.elements.meetingDesc.value.trim();
    const attendees = this.elements.meetingAttendees.value.trim();

    if (!title || !date || !time) {
      this.showToast('제목, 날짜, 시간은 필수입니다.', 'warning');
      return;
    }

    const meeting = {
      id: this.nextId++,
      title,
      date,
      time,
      duration: parseInt(duration),
      location,
      description,
      attendees: attendees ? attendees.split(',').map(a => a.trim()) : [],
      created: new Date().toISOString()
    };

    this.meetings.push(meeting);
    this.meetings.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));
    this.saveToStorage();
    this.renderMeetings();
    this.clearForm();
    this.showToast('미팅이 추가되었습니다!', 'success');
  }

  deleteMeeting(id) {
    this.meetings = this.meetings.filter(m => m.id !== id);
    this.saveToStorage();
    this.renderMeetings();
    this.showToast('미팅이 삭제되었습니다.', 'success');
  }

  clearForm() {
    this.elements.meetingTitle.value = '';
    this.elements.meetingDate.value = '';
    this.elements.meetingTime.value = '';
    this.elements.meetingLocation.value = '';
    this.elements.meetingDesc.value = '';
    this.elements.meetingAttendees.value = '';
  }

  renderMeetings() {
    const container = this.elements.meetingsList;
    const now = new Date();

    if (this.meetings.length === 0) {
      container.innerHTML = '<div class="empty-state">예정된 미팅이 없습니다.</div>';
      return;
    }

    // 그룹화: 오늘, 이번 주, 이후
    const today = now.toISOString().split('T')[0];
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const groups = {
      today: this.meetings.filter(m => m.date === today),
      thisWeek: this.meetings.filter(m => m.date > today && m.date <= weekEndStr),
      later: this.meetings.filter(m => m.date > weekEndStr),
      past: this.meetings.filter(m => m.date < today)
    };

    let html = '';

    if (groups.today.length > 0) {
      html += '<div class="meeting-group"><h3>오늘</h3>';
      html += groups.today.map(m => this.renderMeetingCard(m, 'today')).join('');
      html += '</div>';
    }

    if (groups.thisWeek.length > 0) {
      html += '<div class="meeting-group"><h3>이번 주</h3>';
      html += groups.thisWeek.map(m => this.renderMeetingCard(m)).join('');
      html += '</div>';
    }

    if (groups.later.length > 0) {
      html += '<div class="meeting-group"><h3>예정</h3>';
      html += groups.later.map(m => this.renderMeetingCard(m)).join('');
      html += '</div>';
    }

    if (groups.past.length > 0) {
      html += '<div class="meeting-group past"><h3>지난 미팅</h3>';
      html += groups.past.map(m => this.renderMeetingCard(m, 'past')).join('');
      html += '</div>';
    }

    container.innerHTML = html;
  }

  renderMeetingCard(meeting, type = '') {
    const dateObj = new Date(meeting.date + 'T' + meeting.time);
    const dateStr = dateObj.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' });
    const timeStr = dateObj.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="meeting-card ${type}">
        <div class="meeting-time-block">
          <div class="meeting-date-display">${dateStr}</div>
          <div class="meeting-time-display">${timeStr}</div>
          <div class="meeting-duration">${meeting.duration}분</div>
        </div>
        <div class="meeting-content">
          <div class="meeting-title-display">${meeting.title}</div>
          ${meeting.location ? `<div class="meeting-location">${meeting.location}</div>` : ''}
          ${meeting.attendees.length > 0 ? `<div class="meeting-attendees">${meeting.attendees.join(', ')}</div>` : ''}
          ${meeting.description ? `<div class="meeting-description">${meeting.description}</div>` : ''}
        </div>
        <div class="meeting-actions">
          <button class="action-btn" onclick="meetingScheduler.exportToCalendar(${meeting.id})" title="캘린더에 추가"></button>
          <button class="action-btn delete" onclick="meetingScheduler.deleteMeeting(${meeting.id})" title="삭제"></button>
        </div>
      </div>
    `;
  }

  exportToCalendar(id) {
    const meeting = this.meetings.find(m => m.id === id);
    if (!meeting) return;

    const startDate = new Date(meeting.date + 'T' + meeting.time);
    const endDate = new Date(startDate.getTime() + meeting.duration * 60000);

    const formatDate = (d) => d.toISOString().replace(/-|:|\.\d{3}/g, '');

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MyMind3//Meeting Scheduler//KO
BEGIN:VEVENT
UID:${meeting.id}@mymind3.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${meeting.title}
LOCATION:${meeting.location || ''}
DESCRIPTION:${meeting.description || ''}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-${meeting.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('캘린더 파일이 다운로드되었습니다!', 'success');
  }

  clearAll() {
    if (confirm('모든 미팅을 삭제하시겠습니까?')) {
      this.meetings = [];
      this.saveToStorage();
      this.renderMeetings();
      this.showToast('모든 미팅이 삭제되었습니다.', 'success');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const meetingScheduler = new MeetingScheduler();
window.MeetingScheduler = meetingScheduler;

document.addEventListener('DOMContentLoaded', () => meetingScheduler.init());
