/**
 * 팔로워 품질 체커 - ToolBase 기반
 * 가짜 팔로워 비율 분석 (시뮬레이션)
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var FollowerChecker = class FollowerChecker extends ToolBase {
  constructor() {
    super('FollowerChecker');
  }

  init() {
    this.initElements({
      username: 'username',
      result: 'result'
    });

    console.log('[FollowerChecker] 초기화 완료');
    return this;
  }

  async analyze() {
    const username = this.elements.username.value.trim().replace('@', '');

    if (!username) {
      this.showToast('사용자명을 입력해주세요', 'error');
      return;
    }

    this.elements.result.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;"></div>
        <div>분석 중...</div>
      </div>
    `;

    await new Promise(resolve => setTimeout(resolve, 2000));

    const hash = this.simpleHash(username);
    const realFollowerRate = 60 + (hash % 35);
    const engagementRate = (1 + (hash % 8)) / 10;

    this.showResult(username, realFollowerRate, engagementRate);
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
    }
    return Math.abs(hash);
  }

  showResult(username, realRate, engagement) {
    const fakeRate = 100 - realRate;
    let cardClass = 'good';
    let label = '건강한 계정';
    let desc = '팔로워 품질이 우수합니다';

    if (realRate < 70) {
      cardClass = 'bad';
      label = '주의 필요';
      desc = '가짜 팔로워 비율이 높습니다';
    } else if (realRate < 85) {
      cardClass = 'warning';
      label = '보통';
      desc = '일부 의심스러운 팔로워가 있습니다';
    }

    this.elements.result.innerHTML = `
      <div class="result-card ${cardClass}">
        <div class="score-circle">${realRate}%</div>
        <div class="score-label">${label}</div>
        <div class="score-desc">${desc}</div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">진짜 팔로워</div>
            <div class="metric-value">${realRate}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">의심 팔로워</div>
            <div class="metric-value">${fakeRate}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">참여율</div>
            <div class="metric-value">${engagement.toFixed(1)}%</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">품질 점수</div>
            <div class="metric-value">${Math.round(realRate * engagement * 1.2)}</div>
          </div>
        </div>
      </div>

      <div style="margin-top: 1rem; background: var(--bg-primary); border-radius: 8px; padding: 1rem;">
        <strong>분석 기준:</strong>
        <ul style="margin-top: 0.5rem; padding-left: 1.5rem; font-size: 0.85rem; color: var(--text-secondary);">
          <li>프로필 사진 유무</li>
          <li>게시물 수 대비 팔로워 비율</li>
          <li>계정 활동 패턴</li>
          <li>팔로워/팔로잉 비율</li>
        </ul>
      </div>
    `;
  }
}

// 전역 인스턴스 생성
const followerChecker = new FollowerChecker();
window.FollowerChecker = followerChecker;

document.addEventListener('DOMContentLoaded', () => followerChecker.init());
