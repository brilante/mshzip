/**
 * 최적 포스팅 시간 - ToolBase 기반
 * 플랫폼별 최적의 게시 시간 분석
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class BestTimePost extends ToolBase {
  constructor() {
    super('BestTimePost');
    this.currentPlatform = 'instagram';

    this.platforms = {
      instagram: {
        name: 'Instagram', icon: '',
        bestTimes: [
          { day: '월', times: ['12:00', '19:00'] },
          { day: '화', times: ['9:00', '18:00'] },
          { day: '수', times: ['11:00', '15:00'] },
          { day: '목', times: ['12:00', '19:00'] },
          { day: '금', times: ['10:00', '14:00'] },
          { day: '토', times: ['9:00', '11:00'] },
          { day: '일', times: ['10:00', '14:00'] }
        ]
      },
      facebook: {
        name: 'Facebook', icon: '',
        bestTimes: [
          { day: '월', times: ['9:00', '13:00'] },
          { day: '화', times: ['9:00', '14:00'] },
          { day: '수', times: ['9:00', '13:00'] },
          { day: '목', times: ['9:00', '12:00'] },
          { day: '금', times: ['9:00', '11:00'] },
          { day: '토', times: ['12:00', '13:00'] },
          { day: '일', times: ['12:00', '13:00'] }
        ]
      },
      twitter: {
        name: 'Twitter', icon: '',
        bestTimes: [
          { day: '월', times: ['8:00', '16:00'] },
          { day: '화', times: ['9:00', '17:00'] },
          { day: '수', times: ['9:00', '16:00'] },
          { day: '목', times: ['9:00', '17:00'] },
          { day: '금', times: ['9:00', '12:00'] },
          { day: '토', times: ['8:00', '10:00'] },
          { day: '일', times: ['9:00', '12:00'] }
        ]
      },
      linkedin: {
        name: 'LinkedIn', icon: '',
        bestTimes: [
          { day: '월', times: ['7:00', '10:00'] },
          { day: '화', times: ['7:00', '10:00'] },
          { day: '수', times: ['7:00', '12:00'] },
          { day: '목', times: ['7:00', '10:00'] },
          { day: '금', times: ['7:00', '9:00'] },
          { day: '토', times: ['10:00', '12:00'] },
          { day: '일', times: ['피함', ''] }
        ]
      },
      youtube: {
        name: 'YouTube', icon: '',
        bestTimes: [
          { day: '월', times: ['14:00', '16:00'] },
          { day: '화', times: ['14:00', '16:00'] },
          { day: '수', times: ['14:00', '16:00'] },
          { day: '목', times: ['12:00', '15:00'] },
          { day: '금', times: ['12:00', '15:00'] },
          { day: '토', times: ['9:00', '11:00'] },
          { day: '일', times: ['9:00', '11:00'] }
        ]
      }
    };
  }

  init() {
    this.initElements({
      platformTabs: 'platformTabs',
      timeGrid: 'timeGrid',
      bestTimes: 'bestTimes'
    });

    this.renderTabs();
    this.selectPlatform('instagram');

    console.log('[BestTimePost] 초기화 완료');
    return this;
  }

  generateHeatmap(platform) {
    const heatmap = {};
    const days = ['월', '화', '수', '목', '금', '토', '일'];

    for (const day of days) {
      heatmap[day] = {};
      for (let hour = 6; hour <= 23; hour++) {
        let value = Math.random() * 30;
        if (hour >= 11 && hour <= 13) value += 40;
        if (hour >= 18 && hour <= 21) value += 50;
        if (day === '토' || day === '일') value *= 0.8;
        heatmap[day][hour] = Math.min(100, value);
      }
    }
    return heatmap;
  }

  renderTabs() {
    this.elements.platformTabs.innerHTML = Object.entries(this.platforms).map(([id, p]) =>
      `<button class="platform-tab" data-id="${id}" onclick="bestTimePost.selectPlatform('${id}')">${p.icon} ${p.name}</button>`
    ).join('');
  }

  selectPlatform(id) {
    this.currentPlatform = id;

    document.querySelectorAll('.platform-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.id === id);
    });

    this.renderHeatmap();
    this.renderBestTimes();
  }

  renderHeatmap() {
    const days = ['', '월', '화', '수', '목', '금', '토', '일'];
    const heatmap = this.generateHeatmap(this.currentPlatform);

    let html = days.map(d => `<div class="time-header">${d}</div>`).join('');

    for (let hour = 6; hour <= 23; hour++) {
      html += `<div class="time-cell hour-label">${hour}:00</div>`;

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const day = ['월', '화', '수', '목', '금', '토', '일'][dayIdx];
        const value = heatmap[day][hour];
        let level = 'low';
        if (value > 40) level = 'medium';
        if (value > 60) level = 'high';
        if (value > 80) level = 'best';

        html += `<div class="time-cell ${level}">${Math.round(value)}</div>`;
      }
    }

    this.elements.timeGrid.innerHTML = html;
  }

  renderBestTimes() {
    const platform = this.platforms[this.currentPlatform];

    this.elements.bestTimes.innerHTML = `
      <h3>${platform.name} 추천 포스팅 시간</h3>
      ${platform.bestTimes.map(bt => `
        <div class="best-time-item">
          <span>${bt.day}요일</span>
          <span style="font-weight: 600;">${bt.times.filter(t => t).join(', ') || '-'}</span>
        </div>
      `).join('')}
    `;
  }
}

// 전역 인스턴스 생성
const bestTimePost = new BestTimePost();
window.BestTimePost = bestTimePost;

document.addEventListener('DOMContentLoaded', () => bestTimePost.init());
