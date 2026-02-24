/**
 * 백링크 체커 - ToolBase 기반
 * 백링크 분석 도구 (시뮬레이션)
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BacklinkChecker = class BacklinkChecker extends ToolBase {
  constructor() {
    super('BacklinkChecker');
  }

  init() {
    this.initElements({
      urlInput: 'urlInput',
      loadingIndicator: 'loadingIndicator',
      resultsSection: 'resultsSection',
      analyzedDomain: 'analyzedDomain',
      totalBacklinks: 'totalBacklinks',
      referringDomains: 'referringDomains',
      dofollowCount: 'dofollowCount',
      nofollowCount: 'nofollowCount',
      domainAuthority: 'domainAuthority',
      dofollowBar: 'dofollowBar',
      dofollowPercent: 'dofollowPercent',
      anchorsList: 'anchorsList',
      topDomainsList: 'topDomainsList',
      trendChart: 'trendChart'
    });

    console.log('[BacklinkChecker] 초기화 완료');
    return this;
  }

  async analyze() {
    const url = this.elements.urlInput.value.trim();
    if (!url) {
      this.showToast('URL을 입력하세요.', 'warning');
      return;
    }

    this.elements.loadingIndicator.style.display = 'flex';
    this.elements.resultsSection.style.display = 'none';

    await new Promise(resolve => setTimeout(resolve, 1500));

    const domain = this.extractDomain(url);
    const data = this.generateSimulatedData(domain);
    this.displayResults(domain, data);

    this.elements.loadingIndicator.style.display = 'none';
    this.elements.resultsSection.style.display = 'block';
  }

  extractDomain(url) {
    try {
      const u = new URL(url.startsWith('http') ? url : 'https://' + url);
      return u.hostname;
    } catch {
      return url;
    }
  }

  generateSimulatedData(domain) {
    const totalBacklinks = Math.floor(Math.random() * 50000) + 100;
    const referringDomains = Math.floor(totalBacklinks * (Math.random() * 0.3 + 0.1));
    const dofollow = Math.floor(totalBacklinks * (Math.random() * 0.4 + 0.4));
    const nofollow = totalBacklinks - dofollow;

    // 도메인 권한 점수 (1-100)
    const domainAuthority = Math.floor(Math.random() * 60) + 20;

    // 앵커 텍스트 분포
    const anchors = [
      { text: domain, count: Math.floor(totalBacklinks * 0.3), type: 'branded' },
      { text: '여기를 클릭', count: Math.floor(totalBacklinks * 0.1), type: 'generic' },
      { text: '자세히 보기', count: Math.floor(totalBacklinks * 0.08), type: 'generic' },
      { text: domain.split('.')[0] + ' 서비스', count: Math.floor(totalBacklinks * 0.12), type: 'branded' },
      { text: '웹사이트', count: Math.floor(totalBacklinks * 0.05), type: 'generic' }
    ];

    // 상위 참조 도메인
    const topDomains = [
      { domain: 'blog.example.com', backlinks: Math.floor(Math.random() * 500) + 50, authority: Math.floor(Math.random() * 40) + 40 },
      { domain: 'news.site.com', backlinks: Math.floor(Math.random() * 300) + 30, authority: Math.floor(Math.random() * 30) + 50 },
      { domain: 'forum.community.org', backlinks: Math.floor(Math.random() * 200) + 20, authority: Math.floor(Math.random() * 25) + 30 },
      { domain: 'review.portal.net', backlinks: Math.floor(Math.random() * 150) + 15, authority: Math.floor(Math.random() * 20) + 35 },
      { domain: 'directory.list.io', backlinks: Math.floor(Math.random() * 100) + 10, authority: Math.floor(Math.random() * 15) + 25 }
    ];

    // 월별 백링크 추이
    const monthlyTrend = [];
    let base = totalBacklinks * 0.6;
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      monthlyTrend.push({
        month: month.toLocaleDateString('ko-KR', { month: 'short' }),
        count: Math.floor(base + Math.random() * (totalBacklinks * 0.1))
      });
      base += totalBacklinks * 0.06;
    }

    return {
      totalBacklinks,
      referringDomains,
      dofollow,
      nofollow,
      domainAuthority,
      anchors,
      topDomains,
      monthlyTrend
    };
  }

  displayResults(domain, data) {
    this.elements.analyzedDomain.textContent = domain;

    // 통계 카드
    this.elements.totalBacklinks.textContent = data.totalBacklinks.toLocaleString();
    this.elements.referringDomains.textContent = data.referringDomains.toLocaleString();
    this.elements.dofollowCount.textContent = data.dofollow.toLocaleString();
    this.elements.nofollowCount.textContent = data.nofollow.toLocaleString();
    this.elements.domainAuthority.textContent = data.domainAuthority;

    // 비율 바
    const dofollowPercent = (data.dofollow / data.totalBacklinks * 100).toFixed(1);
    this.elements.dofollowBar.style.width = dofollowPercent + '%';
    this.elements.dofollowPercent.textContent = dofollowPercent + '%';

    // 앵커 텍스트
    const anchorsHtml = data.anchors.map(a => `
      <div class="anchor-row">
        <span class="anchor-text">${a.text}</span>
        <span class="anchor-type ${a.type}">${a.type}</span>
        <span class="anchor-count">${a.count.toLocaleString()}</span>
      </div>
    `).join('');
    this.elements.anchorsList.innerHTML = anchorsHtml;

    // 상위 도메인
    const domainsHtml = data.topDomains.map(d => `
      <div class="domain-row">
        <div class="domain-info">
          <span class="domain-name">${d.domain}</span>
          <span class="domain-auth">DA: ${d.authority}</span>
        </div>
        <span class="domain-links">${d.backlinks}개 링크</span>
      </div>
    `).join('');
    this.elements.topDomainsList.innerHTML = domainsHtml;

    // 월별 추이 차트 (간단한 바 차트)
    const maxCount = Math.max(...data.monthlyTrend.map(m => m.count));
    const trendHtml = data.monthlyTrend.map(m => `
      <div class="trend-bar-container">
        <div class="trend-bar" style="height: ${(m.count / maxCount * 100)}%"></div>
        <span class="trend-label">${m.month}</span>
      </div>
    `).join('');
    this.elements.trendChart.innerHTML = trendHtml;
  }

  async exportReport() {
    const domain = this.elements.analyzedDomain.textContent;
    if (!domain) {
      this.showToast('먼저 분석을 실행하세요.', 'warning');
      return;
    }

    let report = `백링크 분석 리포트\n`;
    report += `도메인: ${domain}\n`;
    report += `생성일: ${new Date().toLocaleString('ko-KR')}\n\n`;
    report += `총 백링크: ${this.elements.totalBacklinks.textContent}\n`;
    report += `참조 도메인: ${this.elements.referringDomains.textContent}\n`;
    report += `Dofollow: ${this.elements.dofollowCount.textContent}\n`;
    report += `Nofollow: ${this.elements.nofollowCount.textContent}\n`;
    report += `도메인 권한: ${this.elements.domainAuthority.textContent}\n`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backlink-report-${domain}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('리포트 다운로드 완료!', 'success');
  }
}

// 전역 인스턴스 생성
const backlinkChecker = new BacklinkChecker();
window.BacklinkChecker = backlinkChecker;

document.addEventListener('DOMContentLoaded', () => backlinkChecker.init());
