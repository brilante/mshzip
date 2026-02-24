/**
 * 페이지 속도 분석기 - ToolBase 기반
 * 웹 페이지 성능 분석 (시뮬레이션)
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PageSpeed = class PageSpeed extends ToolBase {
  constructor() {
    super('PageSpeed');
  }

  init() {
    this.initElements({
      urlInput: 'urlInput',
      loadingIndicator: 'loadingIndicator',
      resultsSection: 'resultsSection',
      analyzedUrl: 'analyzedUrl',
      performanceScore: 'performanceScore',
      lcpValue: 'lcpValue',
      fidValue: 'fidValue',
      clsValue: 'clsValue',
      fcpValue: 'fcpValue',
      siValue: 'siValue',
      ttiValue: 'ttiValue',
      tbtValue: 'tbtValue',
      diagnosticsList: 'diagnosticsList',
      passedAudits: 'passedAudits'
    });

    console.log('[PageSpeed] 초기화 완료');
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

    await new Promise(resolve => setTimeout(resolve, 2000));

    const data = this.generatePerformanceData();
    this.displayResults(url, data);

    this.elements.loadingIndicator.style.display = 'none';
    this.elements.resultsSection.style.display = 'block';
  }

  generatePerformanceData() {
    // Core Web Vitals
    const lcp = (Math.random() * 3 + 1).toFixed(2); // 1-4초
    const fid = Math.floor(Math.random() * 200 + 50); // 50-250ms
    const cls = (Math.random() * 0.2).toFixed(3); // 0-0.2

    // 전체 점수
    const performanceScore = Math.floor(Math.random() * 40 + 50);

    // 상세 메트릭
    const metrics = {
      fcp: (Math.random() * 2 + 0.5).toFixed(2),
      si: (Math.random() * 3 + 1).toFixed(2),
      tti: (Math.random() * 4 + 2).toFixed(2),
      tbt: Math.floor(Math.random() * 500 + 100)
    };

    // 진단 항목
    const diagnostics = [
      { title: '렌더 차단 리소스 제거', impact: 'high', savings: (Math.random() * 2).toFixed(1) + '초' },
      { title: '이미지 최적화', impact: 'high', savings: Math.floor(Math.random() * 500 + 100) + 'KB' },
      { title: '사용하지 않는 CSS 제거', impact: 'medium', savings: Math.floor(Math.random() * 200 + 50) + 'KB' },
      { title: '사용하지 않는 JavaScript 제거', impact: 'medium', savings: Math.floor(Math.random() * 300 + 100) + 'KB' },
      { title: '텍스트 압축 활성화', impact: 'low', savings: Math.floor(Math.random() * 100 + 20) + 'KB' },
      { title: '효율적인 캐시 정책 사용', impact: 'medium', savings: '캐시 개선 필요' }
    ];

    // 통과한 감사
    const passedAudits = [
      '텍스트가 압축되어 있음',
      'HTTPS 사용 중',
      '문서에 유효한 lang 속성 있음',
      '뷰포트 메타 태그 설정됨'
    ];

    return {
      lcp, fid, cls,
      performanceScore,
      metrics,
      diagnostics,
      passedAudits
    };
  }

  displayResults(url, data) {
    this.elements.analyzedUrl.textContent = url;

    // 전체 점수
    this.elements.performanceScore.textContent = data.performanceScore;
    this.elements.performanceScore.className = 'score-value ' + this.getScoreClass(data.performanceScore);

    // Core Web Vitals
    this.updateMetric('lcp', data.lcp, 2.5, 4);
    this.updateMetric('fid', data.fid, 100, 300);
    this.updateMetric('cls', data.cls, 0.1, 0.25);

    // 상세 메트릭
    this.elements.fcpValue.textContent = data.metrics.fcp + '초';
    this.elements.siValue.textContent = data.metrics.si + '초';
    this.elements.ttiValue.textContent = data.metrics.tti + '초';
    this.elements.tbtValue.textContent = data.metrics.tbt + 'ms';

    // 진단 항목
    const diagnosticsHtml = data.diagnostics.map(d => `
      <div class="diagnostic-item impact-${d.impact}">
        <div class="diagnostic-icon">${d.impact === 'high' ? '' : d.impact === 'medium' ? '' : ''}</div>
        <div class="diagnostic-content">
          <div class="diagnostic-title">${d.title}</div>
          <div class="diagnostic-savings">절약: ${d.savings}</div>
        </div>
      </div>
    `).join('');
    this.elements.diagnosticsList.innerHTML = diagnosticsHtml;

    // 통과 감사
    const passedHtml = data.passedAudits.map(a => `
      <div class="passed-item">${a}</div>
    `).join('');
    this.elements.passedAudits.innerHTML = passedHtml;
  }

  updateMetric(id, value, good, poor) {
    const el = this.elements[id + 'Value'];
    const numValue = parseFloat(value);
    el.textContent = id === 'fid' ? value + 'ms' : id === 'cls' ? value : value + '초';

    if (numValue <= good) {
      el.className = 'metric-value good';
    } else if (numValue <= poor) {
      el.className = 'metric-value needs-improvement';
    } else {
      el.className = 'metric-value poor';
    }
  }

  getScoreClass(score) {
    if (score >= 90) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  }
}

// 전역 인스턴스 생성
const pageSpeed = new PageSpeed();
window.PageSpeed = pageSpeed;

document.addEventListener('DOMContentLoaded', () => pageSpeed.init());
