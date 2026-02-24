/**
 * 경쟁사 분석 도구 - ToolBase 기반
 * 경쟁 웹사이트 비교 분석
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CompetitorAnalyzer = class CompetitorAnalyzer extends ToolBase {
  constructor() {
    super('CompetitorAnalyzer');
  }

  init() {
    this.initElements({
      myUrl: 'myUrl',
      result: 'result'
    });

    console.log('[CompetitorAnalyzer] 초기화 완료');
    return this;
  }

  async analyze() {
    const myUrl = this.elements.myUrl.value.trim();
    const competitorUrls = Array.from(document.querySelectorAll('.competitor-url'))
      .map(input => input.value.trim())
      .filter(url => url);

    if (!myUrl) {
      this.showToast('내 웹사이트 URL을 입력해주세요', 'error');
      return;
    }

    if (competitorUrls.length === 0) {
      this.showToast('경쟁사 URL을 최소 1개 입력해주세요', 'error');
      return;
    }

    // 로딩 표시
    this.elements.result.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;"></div>
        <div>분석 중...</div>
      </div>
    `;

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 시뮬레이션 데이터 생성
    const myData = this.generateSiteData(myUrl, true);
    const competitorData = competitorUrls.map(url => this.generateSiteData(url, false));

    this.showResult(myData, competitorData);
  }

  generateSiteData(url, isMine) {
    const hash = this.simpleHash(url);
    const baseScore = isMine ? 65 : 60;

    return {
      url: this.extractDomain(url),
      seo: baseScore + (hash % 30),
      performance: baseScore + ((hash * 2) % 30),
      mobile: baseScore + ((hash * 3) % 35),
      security: 70 + ((hash * 4) % 30),
      content: baseScore + ((hash * 5) % 30),
      social: 40 + ((hash * 6) % 50),
      backlinks: Math.floor(100 + (hash % 10000)),
      keywords: Math.floor(50 + (hash % 500)),
      isMine
    };
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
    }
    return Math.abs(hash);
  }

  extractDomain(url) {
    try {
      const parsed = new URL(url.startsWith('http') ? url : 'https://' + url);
      return parsed.hostname;
    } catch {
      return url;
    }
  }

  getScoreClass(score) {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  showResult(myData, competitors) {
    const allSites = [myData, ...competitors];
    const metrics = ['seo', 'performance', 'mobile', 'security', 'content', 'social'];
    const metricLabels = {
      seo: 'SEO',
      performance: '성능',
      mobile: '모바일',
      security: '보안',
      content: '콘텐츠',
      social: '소셜'
    };

    // 인사이트 생성
    const insights = this.generateInsights(myData, competitors);

    this.elements.result.innerHTML = `
      <div style="overflow-x: auto;">
        <table class="comparison-table">
          <thead>
            <tr>
              <th>지표</th>
              ${allSites.map(site => `<th>${site.isMine ? '' : ''}${site.url}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${metrics.map(metric => `
              <tr>
                <td><strong>${metricLabels[metric]}</strong></td>
                ${allSites.map(site => {
                  const score = site[metric];
                  const isHighest = score === Math.max(...allSites.map(s => s[metric]));
                  return `<td>
                    <span class="score-badge score-${this.getScoreClass(score)}">${score}점</span>
                    ${isHighest ? ' ' : ''}
                  </td>`;
                }).join('')}
              </tr>
            `).join('')}
            <tr>
              <td><strong>백링크</strong></td>
              ${allSites.map(site => `<td>${site.backlinks.toLocaleString()}개</td>`).join('')}
            </tr>
            <tr>
              <td><strong>키워드</strong></td>
              ${allSites.map(site => `<td>${site.keywords.toLocaleString()}개</td>`).join('')}
            </tr>
            <tr style="background: var(--bg-primary);">
              <td><strong>종합 점수</strong></td>
              ${allSites.map(site => {
                const avg = Math.round(metrics.reduce((sum, m) => sum + site[m], 0) / metrics.length);
                return `<td><strong style="font-size: 1.1rem;">${avg}점</strong></td>`;
              }).join('')}
            </tr>
          </tbody>
        </table>
      </div>

      <div class="insights">
        <div style="font-weight: 600; margin-bottom: 0.75rem;">인사이트</div>
        ${insights.map(insight => `
          <div class="insight-item">
            <span class="insight-icon">${insight.icon}</span>
            <span>${insight.text}</span>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 1rem; background: var(--bg-primary); border-radius: 8px; padding: 1rem; font-size: 0.85rem;">
        <strong>참고:</strong> 이 분석은 시뮬레이션입니다. 실제 경쟁사 분석에는 SEMrush, Ahrefs, SimilarWeb 등의 전문 도구를 사용하세요.
      </div>
    `;
  }

  generateInsights(myData, competitors) {
    const insights = [];
    const allSites = [myData, ...competitors];
    const metrics = ['seo', 'performance', 'mobile', 'security', 'content', 'social'];

    // SEO 비교
    const seoRank = allSites.sort((a, b) => b.seo - a.seo).findIndex(s => s.isMine) + 1;
    if (seoRank === 1) {
      insights.push({ icon: '', text: 'SEO 점수에서 경쟁사를 앞서고 있습니다!' });
    } else {
      insights.push({ icon: '', text: `SEO 점수가 ${seoRank}위입니다. 개선이 필요합니다.` });
    }

    // 가장 약한 부분
    const myScores = metrics.map(m => ({ metric: m, score: myData[m] }));
    myScores.sort((a, b) => a.score - b.score);
    const weakest = myScores[0];
    insights.push({ icon: '', text: `${weakest.metric.toUpperCase()} 점수(${weakest.score}점)가 가장 낮습니다. 우선 개선하세요.` });

    // 가장 강한 부분
    const strongest = myScores[myScores.length - 1];
    insights.push({ icon: '', text: `${strongest.metric.toUpperCase()} 점수(${strongest.score}점)가 가장 높습니다. 이 강점을 활용하세요.` });

    // 백링크 비교
    if (myData.backlinks < Math.max(...competitors.map(c => c.backlinks))) {
      insights.push({ icon: '', text: '경쟁사보다 백링크가 적습니다. 링크 빌딩 전략이 필요합니다.' });
    }

    return insights;
  }
}

// 전역 인스턴스 생성
const competitorAnalyzer = new CompetitorAnalyzer();
window.CompetitorAnalyzer = competitorAnalyzer;

// 전역 함수 (HTML onclick 호환)
function analyze() { competitorAnalyzer.analyze(); }

document.addEventListener('DOMContentLoaded', () => competitorAnalyzer.init());
