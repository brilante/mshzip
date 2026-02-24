/**
 * 인게이지먼트 계산기 - ToolBase 기반
 * SNS 인게이지먼트율 계산 및 분석
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var EngagementCalc = class EngagementCalc extends ToolBase {
  constructor() {
    super('EngagementCalc');
    this.platform = 'instagram';

    this.benchmarks = {
      instagram: {
        low: 1,
        average: 3,
        good: 6,
        excellent: 10,
        labels: ['낮음 (<1%)', '평균 (1-3%)', '좋음 (3-6%)', '우수 (6%+)']
      },
      tiktok: {
        low: 3,
        average: 6,
        good: 10,
        excellent: 15,
        labels: ['낮음 (<3%)', '평균 (3-6%)', '좋음 (6-10%)', '우수 (10%+)']
      },
      twitter: {
        low: 0.5,
        average: 1,
        good: 2,
        excellent: 3,
        labels: ['낮음 (<0.5%)', '평균 (0.5-1%)', '좋음 (1-2%)', '우수 (2%+)']
      },
      youtube: {
        low: 2,
        average: 4,
        good: 8,
        excellent: 12,
        labels: ['낮음 (<2%)', '평균 (2-4%)', '좋음 (4-8%)', '우수 (8%+)']
      }
    };
  }

  init() {
    this.initElements({
      followers: 'followers',
      likes: 'likes',
      comments: 'comments',
      shares: 'shares',
      resultCard: 'resultCard',
      resultRate: 'resultRate',
      resultBadge: 'resultBadge',
      metricsGrid: 'metricsGrid',
      likeRate: 'likeRate',
      commentRate: 'commentRate',
      shareRate: 'shareRate',
      totalEngagement: 'totalEngagement',
      benchmarkList: 'benchmarkList'
    });

    this.renderBenchmarks();

    console.log('[EngagementCalc] 초기화 완료');
    return this;
  }

  selectPlatform(platform) {
    this.platform = platform;
    document.querySelectorAll('.platform-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.platform === platform);
    });
    this.renderBenchmarks();
  }

  calculate() {
    const followers = parseInt(this.elements.followers.value) || 0;
    const likes = parseInt(this.elements.likes.value) || 0;
    const comments = parseInt(this.elements.comments.value) || 0;
    const shares = parseInt(this.elements.shares.value) || 0;

    if (followers === 0) {
      this.showToast('팔로워 수를 입력하세요.', 'error');
      return;
    }

    const totalEngagement = likes + comments + shares;
    const engagementRate = (totalEngagement / followers) * 100;

    const likeRate = (likes / followers) * 100;
    const commentRate = (comments / followers) * 100;
    const shareRate = (shares / followers) * 100;

    const bench = this.benchmarks[this.platform];
    let grade, badge, gradientColors;

    if (engagementRate >= bench.excellent) {
      grade = 'excellent';
      badge = '우수';
      gradientColors = 'linear-gradient(135deg, #667eea, #764ba2)';
    } else if (engagementRate >= bench.good) {
      grade = 'good';
      badge = '좋음';
      gradientColors = 'linear-gradient(135deg, #22c55e, #16a34a)';
    } else if (engagementRate >= bench.average) {
      grade = 'avg';
      badge = '평균';
      gradientColors = 'linear-gradient(135deg, #f59e0b, #d97706)';
    } else {
      grade = 'low';
      badge = '개선 필요';
      gradientColors = 'linear-gradient(135deg, #ef4444, #dc2626)';
    }

    this.elements.resultCard.style.display = 'block';
    this.elements.resultCard.style.background = gradientColors;
    this.elements.resultRate.textContent = engagementRate.toFixed(2) + '%';
    this.elements.resultBadge.textContent = badge;

    this.elements.metricsGrid.style.display = 'grid';
    this.elements.likeRate.textContent = likeRate.toFixed(2) + '%';
    this.elements.commentRate.textContent = commentRate.toFixed(2) + '%';
    this.elements.shareRate.textContent = shareRate.toFixed(2) + '%';
    this.elements.totalEngagement.textContent = totalEngagement.toLocaleString();

    this.renderBenchmarks(engagementRate);

    this.showToast('인게이지먼트율이 계산되었습니다!', 'success');
  }

  renderBenchmarks(currentRate = null) {
    const bench = this.benchmarks[this.platform];

    const levels = [
      { label: bench.labels[0], value: bench.low, class: 'low', width: 25 },
      { label: bench.labels[1], value: bench.average, class: 'avg', width: 50 },
      { label: bench.labels[2], value: bench.good, class: 'good', width: 75 },
      { label: bench.labels[3], value: bench.excellent, class: 'excellent', width: 100 }
    ];

    this.elements.benchmarkList.innerHTML = levels.map(level => {
      const isCurrentLevel = currentRate !== null &&
        ((level.class === 'low' && currentRate < bench.average) ||
         (level.class === 'avg' && currentRate >= bench.average && currentRate < bench.good) ||
         (level.class === 'good' && currentRate >= bench.good && currentRate < bench.excellent) ||
         (level.class === 'excellent' && currentRate >= bench.excellent));

      return `
        <div class="benchmark-item" style="${isCurrentLevel ? 'border: 2px solid var(--primary); background: rgba(59, 130, 246, 0.1);' : ''}">
          <span class="benchmark-label">${level.label}</span>
          <div class="benchmark-bar">
            <div class="benchmark-fill ${level.class}" style="width: ${level.width}%;"></div>
          </div>
          <span class="benchmark-value">${level.value}%+</span>
        </div>
      `;
    }).join('');
  }
}

// 전역 인스턴스 생성
const engagementCalc = new EngagementCalc();
window.EngagementCalc = engagementCalc;

document.addEventListener('DOMContentLoaded', () => engagementCalc.init());
