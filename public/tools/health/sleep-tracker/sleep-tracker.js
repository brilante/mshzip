/**
 * 수면 트래커 - ToolBase 기반
 * 수면 기록 및 통계 분석
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class SleepTracker extends ToolBase {
  constructor() {
    super('SleepTracker');
    this.sleepLogs = JSON.parse(localStorage.getItem('sleepLogs')) || [];
    this.selectedRating = 5;
    this.ratingEmojis = ['', '', '', '', ''];
  }

  init() {
    this.initElements({
      bedtime: 'bedtime',
      waketime: 'waketime',
      logSleep: 'logSleep',
      avgDuration: 'avgDuration',
      avgQuality: 'avgQuality',
      avgBedtime: 'avgBedtime',
      historyList: 'historyList'
    });

    this.setupEvents();
    this.updateUI();

    console.log('[SleepTracker] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.rating-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedRating = parseInt(btn.dataset.rating);
      });
    });

    this.elements.logSleep.addEventListener('click', () => this.logSleep());
  }

  calculateDuration(bedtime, waketime) {
    const [bedH, bedM] = bedtime.split(':').map(Number);
    const [wakeH, wakeM] = waketime.split(':').map(Number);

    let bedMinutes = bedH * 60 + bedM;
    let wakeMinutes = wakeH * 60 + wakeM;

    if (wakeMinutes < bedMinutes) {
      wakeMinutes += 24 * 60;
    }

    const duration = wakeMinutes - bedMinutes;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;

    return { duration, formatted: hours + 'h ' + minutes + 'm' };
  }

  logSleep() {
    const bedtime = this.elements.bedtime.value;
    const waketime = this.elements.waketime.value;

    if (!bedtime || !waketime) {
      this.showToast('취침 시간과 기상 시간을 입력하세요', 'error');
      return;
    }

    const { duration, formatted } = this.calculateDuration(bedtime, waketime);

    this.sleepLogs.unshift({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      bedtime,
      waketime,
      duration,
      quality: this.selectedRating
    });

    localStorage.setItem('sleepLogs', JSON.stringify(this.sleepLogs));
    this.updateUI();
    this.showToast('수면 기록이 저장되었습니다!', 'success');
  }

  updateUI() {
    // 주간 평균 계산
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentLogs = this.sleepLogs.filter(log => new Date(log.date) >= weekAgo);

    if (recentLogs.length > 0) {
      const avgDuration = recentLogs.reduce((sum, log) => sum + log.duration, 0) / recentLogs.length;
      const avgQuality = recentLogs.reduce((sum, log) => sum + log.quality, 0) / recentLogs.length;

      const avgH = Math.floor(avgDuration / 60);
      const avgM = Math.round(avgDuration % 60);
      this.elements.avgDuration.textContent = avgH + 'h ' + avgM + 'm';
      this.elements.avgQuality.textContent = this.ratingEmojis[Math.round(avgQuality) - 1];

      // 평균 취침 시간
      const bedtimes = recentLogs.map(log => {
        const [h, m] = log.bedtime.split(':').map(Number);
        return h * 60 + m;
      });
      const avgBedMinutes = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
      const avgBedH = Math.floor(avgBedMinutes / 60) % 24;
      const avgBedM = Math.round(avgBedMinutes % 60);
      this.elements.avgBedtime.textContent =
        avgBedH.toString().padStart(2, '0') + ':' + avgBedM.toString().padStart(2, '0');
    }

    this.renderHistory();
  }

  renderHistory() {
    this.elements.historyList.innerHTML = this.sleepLogs.slice(0, 7).map(log => {
      const date = new Date(log.date);
      const { formatted } = this.calculateDuration(log.bedtime, log.waketime);

      return '<div class="sleep-record">' +
        '<div class="sleep-record-header">' +
        '<span class="sleep-record-date">' + date.toLocaleDateString() + '</span>' +
        '<span class="sleep-record-quality">' + this.ratingEmojis[log.quality - 1] + '</span>' +
        '</div>' +
        '<div class="sleep-record-times">' + log.bedtime + ' ~ ' + log.waketime + '</div>' +
        '<div class="sleep-record-duration">수면 시간: ' + formatted + '</div>' +
        '</div>';
    }).join('') || '<p style="color:#999;text-align:center">기록이 없습니다</p>';
  }
}

// 전역 인스턴스 생성
const sleepTracker = new SleepTracker();
window.SleepTracker = sleepTracker;

document.addEventListener('DOMContentLoaded', () => sleepTracker.init());
