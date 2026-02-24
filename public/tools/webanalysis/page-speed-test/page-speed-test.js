/**
 * 페이지 속도 테스트 - ToolBase 기반
 * 웹사이트 로딩 성능 분석
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class PageSpeedTestTool extends ToolBase {
  constructor() {
    super('PageSpeedTestTool');
    this.suggestions = [
      { title: '이미지 최적화', desc: '차세대 이미지 형식(WebP, AVIF)을 사용하고 적절한 크기로 조절하세요.', priority: 'high' },
      { title: '렌더링 차단 리소스 제거', desc: '중요하지 않은 JS/CSS를 지연 로드하세요.', priority: 'high' },
      { title: '사용하지 않는 JavaScript 제거', desc: '번들 크기를 줄이고 코드 분할을 적용하세요.', priority: 'medium' },
      { title: '텍스트 압축 사용', desc: 'Gzip 또는 Brotli 압축을 활성화하세요.', priority: 'medium' },
      { title: '브라우저 캐싱 활용', desc: '정적 자산에 적절한 캐시 헤더를 설정하세요.', priority: 'low' },
      { title: 'CDN 사용', desc: '콘텐츠를 사용자와 가까운 서버에서 제공하세요.', priority: 'low' }
    ];
    this.priorityColors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981'
    };
  }

  init() {
    this.initElements({
      urlInput: 'urlInput',
      loadingPanel: 'loadingPanel',
      resultPanel: 'resultPanel',
      perfScore: 'perfScore',
      accessScore: 'accessScore',
      bpScore: 'bpScore',
      seoScore: 'seoScore',
      metricsPanel: 'metricsPanel',
      suggestionsPanel: 'suggestionsPanel'
    });

    console.log('[PageSpeedTestTool] 초기화 완료');
    return this;
  }

  analyze() {
    const url = this.elements.urlInput.value.trim();

    if (!url) {
      this.showToast('URL을 입력해주세요.', 'error');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      this.showToast('올바른 URL 형식을 입력해주세요. (https://example.com)', 'error');
      return;
    }

    this.elements.loadingPanel.style.display = 'block';
    this.elements.resultPanel.style.display = 'none';

    // 시뮬레이션 분석 (실제로는 PageSpeed Insights API 사용)
    setTimeout(() => {
      this.showResults(url);
    }, 2000);
  }

  showResults(url) {
    this.elements.loadingPanel.style.display = 'none';
    this.elements.resultPanel.style.display = 'block';

    // 랜덤 점수 생성 (데모용)
    const scores = {
      performance: Math.floor(Math.random() * 40) + 60,
      accessibility: Math.floor(Math.random() * 20) + 80,
      bestPractices: Math.floor(Math.random() * 30) + 70,
      seo: Math.floor(Math.random() * 15) + 85
    };

    this.renderScores(scores);
    this.renderMetrics();
    this.renderSuggestions(scores.performance);
  }

  renderScores(scores) {
    const scoreElements = [
      { id: 'perfScore', value: scores.performance },
      { id: 'accessScore', value: scores.accessibility },
      { id: 'bpScore', value: scores.bestPractices },
      { id: 'seoScore', value: scores.seo }
    ];

    scoreElements.forEach(({ id, value }) => {
      const el = document.getElementById(id);
      el.textContent = value;
      el.className = 'score-circle';

      if (value >= 90) el.classList.add('good');
      else if (value >= 50) el.classList.add('average');
      else el.classList.add('poor');
    });
  }

  renderMetrics() {
    const metrics = [
      { name: 'First Contentful Paint (FCP)', value: (Math.random() * 2 + 0.5).toFixed(1) + 's', threshold: [1.8, 3] },
      { name: 'Largest Contentful Paint (LCP)', value: (Math.random() * 3 + 1).toFixed(1) + 's', threshold: [2.5, 4] },
      { name: 'Total Blocking Time (TBT)', value: Math.floor(Math.random() * 400 + 50) + 'ms', threshold: [200, 600] },
      { name: 'Cumulative Layout Shift (CLS)', value: (Math.random() * 0.3).toFixed(2), threshold: [0.1, 0.25] },
      { name: 'Speed Index', value: (Math.random() * 4 + 1).toFixed(1) + 's', threshold: [3.4, 5.8] },
      { name: 'Time to Interactive (TTI)', value: (Math.random() * 5 + 2).toFixed(1) + 's', threshold: [3.8, 7.3] }
    ];

    const html = metrics.map(metric => {
      const numValue = parseFloat(metric.value);
      let statusClass = 'good';
      if (numValue > metric.threshold[1]) statusClass = 'poor';
      else if (numValue > metric.threshold[0]) statusClass = 'average';

      return `
        <div class="metric-item">
          <span class="metric-name">${metric.name}</span>
          <span class="metric-value ${statusClass}">${metric.value}</span>
        </div>
      `;
    }).join('');

    this.elements.metricsPanel.innerHTML = html;
  }

  renderSuggestions(perfScore) {
    // 점수에 따라 표시할 제안 수 결정
    const count = perfScore >= 90 ? 2 : perfScore >= 70 ? 4 : 6;
    const filtered = this.suggestions.slice(0, count);

    const html = filtered.map(s => `
      <div class="tip-card" style="border-left-color: ${this.priorityColors[s.priority]};">
        <div style="font-weight: 600; margin-bottom: 0.25rem;">${s.title}</div>
        <div style="font-size: 0.9rem; color: var(--text-secondary);">${s.desc}</div>
      </div>
    `).join('');

    this.elements.suggestionsPanel.innerHTML = html;
  }
}

// 전역 인스턴스 생성
const pageSpeedTestTool = new PageSpeedTestTool();
window.PageSpeedTest = pageSpeedTestTool;

document.addEventListener('DOMContentLoaded', () => pageSpeedTestTool.init());
