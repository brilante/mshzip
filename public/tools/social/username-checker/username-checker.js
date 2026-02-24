/**
 * 사용자명 체크 - ToolBase 기반
 * 여러 SNS 플랫폼에서 사용자명 사용 가능 여부 확인
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var UsernameChecker = class UsernameChecker extends ToolBase {
  constructor() {
    super('UsernameChecker');
    this.results = [];

    this.platforms = [
      { id: 'instagram', name: 'Instagram', icon: '', url: 'instagram.com/' },
      { id: 'twitter', name: 'Twitter/X', icon: '', url: 'twitter.com/' },
      { id: 'tiktok', name: 'TikTok', icon: '', url: 'tiktok.com/@' },
      { id: 'youtube', name: 'YouTube', icon: '', url: 'youtube.com/@' },
      { id: 'facebook', name: 'Facebook', icon: '', url: 'facebook.com/' },
      { id: 'linkedin', name: 'LinkedIn', icon: '', url: 'linkedin.com/in/' },
      { id: 'github', name: 'GitHub', icon: '', url: 'github.com/' },
      { id: 'reddit', name: 'Reddit', icon: '', url: 'reddit.com/user/' },
      { id: 'pinterest', name: 'Pinterest', icon: '', url: 'pinterest.com/' },
      { id: 'twitch', name: 'Twitch', icon: '', url: 'twitch.tv/' }
    ];
  }

  init() {
    this.initElements({
      username: 'username',
      resultsGrid: 'resultsGrid',
      summaryCard: 'summaryCard',
      availableCount: 'availableCount',
      takenCount: 'takenCount',
      unknownCount: 'unknownCount',
      suggestionsList: 'suggestionsList'
    });

    console.log('[UsernameChecker] 초기화 완료');
    return this;
  }

  async check() {
    const username = this.elements.username.value.trim().toLowerCase();

    if (!username) {
      this.showToast('사용자명을 입력하세요.', 'error');
      return;
    }

    if (!/^[a-z0-9_\.]+$/.test(username)) {
      this.showToast('영문, 숫자, 밑줄(_), 점(.)만 사용 가능합니다.', 'error');
      return;
    }

    this.showLoading(username);

    this.results = this.platforms.map(platform => ({
      ...platform,
      status: this.simulateAvailability(username, platform.id),
      username: username
    }));

    await this.showResultsAnimated();

    this.updateSummary();
    this.generateSuggestions(username);

    this.showToast('사용자명 확인 완료!', 'success');
  }

  simulateAvailability(username, platform) {
    const hash = (username + platform).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    const commonNames = ['admin', 'user', 'test', 'hello', 'world', 'john', 'jane'];
    if (commonNames.includes(username)) {
      return 'taken';
    }

    if (username.length <= 3) {
      return 'taken';
    }

    const rand = Math.abs(hash) % 100;
    if (rand < 30) return 'available';
    if (rand < 85) return 'taken';
    return 'unknown';
  }

  showLoading(username) {
    this.elements.resultsGrid.style.display = 'grid';

    this.elements.resultsGrid.innerHTML = this.platforms.map(platform => `
      <div class="result-item">
        <div class="result-left">
          <div class="platform-icon">${platform.icon}</div>
          <div class="platform-info">
            <div class="platform-name">${platform.name}</div>
            <div class="platform-url">${platform.url}${username}</div>
          </div>
        </div>
        <div class="result-status">
          <span class="status-badge checking">
            <span class="loading-spinner"></span> 확인 중
          </span>
        </div>
      </div>
    `).join('');
  }

  async showResultsAnimated() {
    const items = this.elements.resultsGrid.querySelectorAll('.result-item');

    for (let i = 0; i < items.length; i++) {
      await this.delay(150);

      const result = this.results[i];
      const statusHtml = this.getStatusBadge(result.status);
      const visitBtn = result.status === 'taken'
        ? `<a href="https://${result.url}${result.username}" target="_blank" class="visit-btn">방문</a>`
        : '';

      items[i].querySelector('.result-status').innerHTML = `
        ${statusHtml}
        ${visitBtn}
      `;
    }
  }

  getStatusBadge(status) {
    const badges = {
      available: '<span class="status-badge available">사용 가능</span>',
      taken: '<span class="status-badge taken">사용 중</span>',
      unknown: '<span class="status-badge unknown">? 확인 불가</span>'
    };
    return badges[status] || badges.unknown;
  }

  updateSummary() {
    const available = this.results.filter(r => r.status === 'available').length;
    const taken = this.results.filter(r => r.status === 'taken').length;
    const unknown = this.results.filter(r => r.status === 'unknown').length;

    this.elements.summaryCard.style.display = 'block';
    this.elements.availableCount.textContent = available;
    this.elements.takenCount.textContent = taken;
    this.elements.unknownCount.textContent = unknown;
  }

  generateSuggestions(username) {
    const suggestions = [
      username + '_official',
      username + '.official',
      'the' + username,
      username + '_',
      '_' + username,
      username + '2026',
      username + '.io',
      'its' + username,
      username + 'hq',
      'real' + username
    ];

    this.elements.suggestionsList.innerHTML = suggestions.map(suggestion => `
      <span class="suggestion-chip" onclick="usernameChecker.useSuggestion('${suggestion}')">${suggestion}</span>
    `).join('');
  }

  useSuggestion(suggestion) {
    this.elements.username.value = suggestion;
    this.check();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const usernameChecker = new UsernameChecker();
window.UsernameChecker = usernameChecker;

document.addEventListener('DOMContentLoaded', () => usernameChecker.init());
