/**
 * 에코 챌린지 - ToolBase 기반
 * 친환경 습관 만들기 챌린지
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class EcoChallenge extends ToolBase {
  constructor() {
    super('EcoChallenge');
    this.activeChallenges = [];
    this.completedDates = [];
    this.totalPoints = 0;

    this.challenges = [
      { id: 1, title: '텀블러 사용하기', desc: '하루 동안 일회용 컵 대신 텀블러 사용', type: 'daily', goal: 1, points: 10, icon: '' },
      { id: 2, title: '대중교통 출퇴근', desc: '자가용 대신 대중교통이나 자전거 이용', type: 'daily', goal: 1, points: 15, icon: '' },
      { id: 3, title: '채식 한 끼', desc: '하루 한 끼 채식 식사하기', type: 'daily', goal: 1, points: 10, icon: '' },
      { id: 4, title: '5분 샤워', desc: '샤워 시간 5분 이내로 줄이기', type: 'daily', goal: 1, points: 5, icon: '' },
      { id: 5, title: '제로 웨이스트 주간', desc: '일주일간 일회용품 0개 사용', type: 'weekly', goal: 7, points: 100, icon: '' },
      { id: 6, title: '장바구니 챌린지', desc: '일주일간 모든 장보기에 장바구니 사용', type: 'weekly', goal: 5, points: 50, icon: '' },
      { id: 7, title: '걷기 챌린지', desc: '일주일간 매일 30분 이상 걷기', type: 'weekly', goal: 7, points: 70, icon: '' },
      { id: 8, title: '한 달 플로깅', desc: '한 달간 주 1회 플로깅 참여', type: 'monthly', goal: 4, points: 200, icon: '' }
    ];
  }

  init() {
    this.initElements({
      totalCompleted: 'totalCompleted',
      activeCount: 'activeCount',
      totalPoints: 'totalPoints',
      streakDays: 'streakDays',
      calendarGrid: 'calendarGrid',
      activeChallenges: 'activeChallenges',
      availableChallenges: 'availableChallenges'
    });

    this.loadData();
    this.render();
    this.calculateStreak();

    console.log('[EcoChallenge] 초기화 완료');
    return this;
  }

  loadData() {
    try {
      const saved = localStorage.getItem('ecoChallengeData');
      if (saved) {
        const data = JSON.parse(saved);
        this.activeChallenges = data.activeChallenges || [];
        this.completedDates = data.completedDates || [];
        this.totalPoints = data.totalPoints || 0;
      }
    } catch (e) {}
  }

  saveData() {
    localStorage.setItem('ecoChallengeData', JSON.stringify({
      activeChallenges: this.activeChallenges,
      completedDates: this.completedDates,
      totalPoints: this.totalPoints
    }));
  }

  joinChallenge(id) {
    if (this.activeChallenges.find(c => c.id === id)) return;

    const challenge = this.challenges.find(c => c.id === id);
    this.activeChallenges.push({
      id,
      progress: 0,
      startDate: new Date().toISOString()
    });

    this.saveData();
    this.render();

    this.showToast(`${challenge.title} 챌린지 시작!`, 'success');
  }

  leaveChallenge(id) {
    if (!confirm('챌린지를 포기하시겠습니까?')) return;
    this.activeChallenges = this.activeChallenges.filter(c => c.id !== id);
    this.saveData();
    this.render();
  }

  checkProgress(id) {
    const active = this.activeChallenges.find(c => c.id === id);
    const challenge = this.challenges.find(c => c.id === id);
    if (!active || !challenge) return;

    active.progress++;

    if (active.progress >= challenge.goal) {
      this.totalPoints += challenge.points;
      this.activeChallenges = this.activeChallenges.filter(c => c.id !== id);

      const today = new Date().toDateString();
      if (!this.completedDates.includes(today)) {
        this.completedDates.push(today);
      }

      this.showToast(`${challenge.title} 완료! +${challenge.points}포인트`, 'success');
    }

    this.saveData();
    this.render();
    this.calculateStreak();
  }

  calculateStreak() {
    const sortedDates = [...this.completedDates]
      .map(d => new Date(d))
      .sort((a, b) => b - a);

    let streak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (sortedDates.length > 0) {
      const lastDate = sortedDates[0].toDateString();
      if (lastDate === today || lastDate === yesterday) {
        let checkDate = lastDate === today ? new Date() : new Date(Date.now() - 86400000);

        for (const date of sortedDates) {
          if (date.toDateString() === checkDate.toDateString()) {
            streak++;
            checkDate = new Date(checkDate.getTime() - 86400000);
          } else {
            break;
          }
        }
      }
    }

    this.elements.streakDays.textContent = streak;
  }

  renderCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = now.getDate();

    let html = '';

    for (let i = 0; i < firstDay; i++) {
      html += '<div class="calendar-day empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toDateString();
      const isCompleted = this.completedDates.includes(dateStr);
      const isToday = day === today;

      let classes = 'calendar-day';
      if (isCompleted) classes += ' completed';
      else classes += ' inactive';
      if (isToday) classes += ' today';

      html += `<div class="${classes}">${day}</div>`;
    }

    this.elements.calendarGrid.innerHTML = html;
  }

  render() {
    const typeLabels = { daily: '일일', weekly: '주간', monthly: '월간' };

    this.elements.totalCompleted.textContent = this.completedDates.length;
    this.elements.activeCount.textContent = this.activeChallenges.length;
    this.elements.totalPoints.textContent = this.totalPoints;

    this.renderCalendar();

    if (this.activeChallenges.length === 0) {
      this.elements.activeChallenges.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">참여 중인 챌린지가 없습니다</div>';
    } else {
      this.elements.activeChallenges.innerHTML = this.activeChallenges.map(active => {
        const challenge = this.challenges.find(c => c.id === active.id);
        const percent = (active.progress / challenge.goal) * 100;

        return `<div class="challenge-card active">
          <div class="challenge-header">
            <span class="challenge-title">${challenge.icon} ${challenge.title}</span>
            <span class="challenge-badge badge-${challenge.type}">${typeLabels[challenge.type]}</span>
          </div>
          <div class="challenge-desc">${challenge.desc}</div>
          <div class="challenge-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${percent}%;"></div>
            </div>
            <span class="progress-text">${active.progress}/${challenge.goal}</span>
          </div>
          <div class="challenge-actions">
            <button class="btn-action btn-check" onclick="ecoChallenge.checkProgress(${challenge.id})">완료</button>
            <button class="btn-action btn-leave" onclick="ecoChallenge.leaveChallenge(${challenge.id})">포기</button>
          </div>
        </div>`;
      }).join('');
    }

    const available = this.challenges.filter(c => !this.activeChallenges.find(a => a.id === c.id));

    if (available.length === 0) {
      this.elements.availableChallenges.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">모든 챌린지에 참여 중입니다!</div>';
    } else {
      this.elements.availableChallenges.innerHTML = available.map(challenge =>
        `<div class="challenge-card">
          <div class="challenge-header">
            <span class="challenge-title">${challenge.icon} ${challenge.title}</span>
            <span class="challenge-badge badge-${challenge.type}">${typeLabels[challenge.type]} · ${challenge.points}P</span>
          </div>
          <div class="challenge-desc">${challenge.desc}</div>
          <div class="challenge-actions">
            <button class="btn-action btn-join" onclick="ecoChallenge.joinChallenge(${challenge.id})">참여하기</button>
          </div>
        </div>`
      ).join('');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const ecoChallenge = new EcoChallenge();
window.EcoChallenge = ecoChallenge;

document.addEventListener('DOMContentLoaded', () => ecoChallenge.init());
