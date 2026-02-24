/**
 * 게시물 스케줄러 - ToolBase 기반
 * SNS 게시물 예약 및 관리
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PostScheduler = class PostScheduler extends ToolBase {
  constructor() {
    super('PostScheduler');
    this.platform = 'instagram';
    this.scheduledPosts = [];
    this.currentDate = new Date();
  }

  init() {
    this.initElements({
      postContent: 'postContent',
      postDate: 'postDate',
      postTime: 'postTime',
      scheduledList: 'scheduledList',
      calendarGrid: 'calendarGrid',
      calendarTitle: 'calendarTitle',
      scheduledCount: 'scheduledCount',
      todayCount: 'todayCount',
      weekCount: 'weekCount'
    });

    this.loadFromStorage();
    this.setDefaultDate();
    this.renderCalendar();
    this.renderScheduledList();
    this.updateStats();

    console.log('[PostScheduler] 초기화 완료');
    return this;
  }

  setDefaultDate() {
    const today = new Date();
    this.elements.postDate.value = today.toISOString().split('T')[0];
    this.elements.postDate.min = today.toISOString().split('T')[0];
  }

  selectPlatform(platform) {
    this.platform = platform;
    document.querySelectorAll('.platform-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.platform === platform);
    });
  }

  schedule() {
    const content = this.elements.postContent.value.trim();
    const date = this.elements.postDate.value;
    const time = this.elements.postTime.value;

    if (!content) {
      this.showToast('게시물 내용을 입력하세요.', 'error');
      return;
    }

    if (!date) {
      this.showToast('날짜를 선택하세요.', 'error');
      return;
    }

    const post = {
      id: Date.now(),
      platform: this.platform,
      content: content,
      scheduledAt: `${date}T${time}`,
      createdAt: new Date().toISOString()
    };

    this.scheduledPosts.push(post);
    this.saveToStorage();
    this.renderScheduledList();
    this.renderCalendar();
    this.updateStats();

    this.elements.postContent.value = '';

    this.showToast('게시물이 예약되었습니다!', 'success');
  }

  deletePost(id) {
    this.scheduledPosts = this.scheduledPosts.filter(p => p.id !== id);
    this.saveToStorage();
    this.renderScheduledList();
    this.renderCalendar();
    this.updateStats();
    this.showToast('게시물이 삭제되었습니다.', 'success');
  }

  editPost(id) {
    const post = this.scheduledPosts.find(p => p.id === id);
    if (!post) return;

    this.elements.postContent.value = post.content;
    this.elements.postDate.value = post.scheduledAt.split('T')[0];
    this.elements.postTime.value = post.scheduledAt.split('T')[1];
    this.selectPlatform(post.platform);

    this.deletePost(id);
    this.showToast('게시물을 수정 모드로 불러왔습니다.', 'info');
  }

  renderScheduledList() {
    const sortedPosts = [...this.scheduledPosts].sort((a, b) =>
      new Date(a.scheduledAt) - new Date(b.scheduledAt)
    );

    if (sortedPosts.length === 0) {
      this.elements.scheduledList.innerHTML = `
        <div style="text-align: center; color: var(--text-secondary); padding: 2rem;">
          예약된 게시물이 없습니다.
        </div>
      `;
      return;
    }

    const platformIcons = {
      instagram: '',
      twitter: '',
      facebook: ''
    };

    this.elements.scheduledList.innerHTML = sortedPosts.map(post => {
      const date = new Date(post.scheduledAt);
      const formattedDate = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

      return `
        <div class="scheduled-item">
          <div class="scheduled-header">
            <span class="scheduled-platform">${platformIcons[post.platform]} ${post.platform}</span>
            <span class="scheduled-time">${formattedDate}</span>
          </div>
          <div class="scheduled-content">${post.content}</div>
          <div class="scheduled-actions">
            <span class="action-btn edit" onclick="postScheduler.editPost(${post.id})">수정</span>
            <span class="action-btn delete" onclick="postScheduler.deletePost(${post.id})">삭제</span>
          </div>
        </div>
      `;
    }).join('');
  }

  renderCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    this.elements.calendarTitle.textContent = `${year}년 ${month + 1}월`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const postsPerDay = {};
    this.scheduledPosts.forEach(post => {
      const dateStr = post.scheduledAt.split('T')[0];
      postsPerDay[dateStr] = (postsPerDay[dateStr] || 0) + 1;
    });

    let html = `
      <div class="calendar-day-header">일</div>
      <div class="calendar-day-header">월</div>
      <div class="calendar-day-header">화</div>
      <div class="calendar-day-header">수</div>
      <div class="calendar-day-header">목</div>
      <div class="calendar-day-header">금</div>
      <div class="calendar-day-header">토</div>
    `;

    for (let i = 0; i < startDay; i++) {
      const prevDate = new Date(year, month, -startDay + i + 1);
      html += `<div class="calendar-day other-month">${prevDate.getDate()}</div>`;
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const hasPosts = postsPerDay[dateStr] > 0;

      let classes = 'calendar-day';
      if (isToday) classes += ' today';
      if (hasPosts) classes += ' has-posts';

      html += `<div class="${classes}" title="${hasPosts ? postsPerDay[dateStr] + '개 예약' : ''}">${day}</div>`;
    }

    const remainingDays = 42 - (startDay + totalDays);
    for (let i = 1; i <= remainingDays; i++) {
      html += `<div class="calendar-day other-month">${i}</div>`;
    }

    this.elements.calendarGrid.innerHTML = html;
  }

  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.renderCalendar();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.renderCalendar();
  }

  updateStats() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const todayPosts = this.scheduledPosts.filter(p =>
      p.scheduledAt.split('T')[0] === todayStr
    ).length;

    const weekPosts = this.scheduledPosts.filter(p => {
      const postDate = new Date(p.scheduledAt);
      return postDate >= weekStart && postDate <= weekEnd;
    }).length;

    this.elements.scheduledCount.textContent = this.scheduledPosts.length;
    this.elements.todayCount.textContent = todayPosts;
    this.elements.weekCount.textContent = weekPosts;
  }

  saveToStorage() {
    localStorage.setItem('postScheduler', JSON.stringify(this.scheduledPosts));
  }

  loadFromStorage() {
    const saved = localStorage.getItem('postScheduler');
    if (saved) {
      this.scheduledPosts = JSON.parse(saved);
    }
  }
}

// 전역 인스턴스 생성
const postScheduler = new PostScheduler();
window.PostScheduler = postScheduler;

document.addEventListener('DOMContentLoaded', () => postScheduler.init());
