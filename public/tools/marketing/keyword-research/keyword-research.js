/**
 * 키워드 연구 도구 - ToolBase 기반
 * SEO 키워드 분석 및 추천
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var KeywordResearch = class KeywordResearch extends ToolBase {
  constructor() {
    super('KeywordResearch');
  }

  init() {
    this.initElements({
      keyword: 'keyword',
      suggestions: 'suggestions',
      results: 'results'
    });

    console.log('[KeywordResearch] 초기화 완료');
    return this;
  }

  async analyze() {
    const keyword = this.elements.keyword.value.trim();

    if (!keyword) {
      this.showToast('키워드를 입력해주세요', 'error');
      return;
    }

    // 로딩 표시
    this.elements.results.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;"></div>
        <div>키워드 분석 중...</div>
      </div>
    `;

    await new Promise(resolve => setTimeout(resolve, 1500));

    // 시뮬레이션 데이터 생성
    const hash = this.simpleHash(keyword);
    const mainKeyword = this.generateKeywordData(keyword, hash);
    const relatedKeywords = this.generateRelatedKeywords(keyword, hash);
    const suggestions = this.generateSuggestions(keyword);

    this.showSuggestions(suggestions);
    this.showResults(mainKeyword, relatedKeywords);
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
    }
    return Math.abs(hash);
  }

  generateKeywordData(keyword, hash) {
    return {
      keyword,
      volume: 1000 + (hash % 50000),
      difficulty: 10 + (hash % 80),
      cpc: (0.5 + (hash % 100) / 10).toFixed(2),
      trend: ['상승', '안정', '하락'][hash % 3]
    };
  }

  generateRelatedKeywords(keyword, hash) {
    const prefixes = ['최고의', '추천', '비교', '후기', '가격', '무료'];
    const suffixes = ['방법', '사이트', '앱', '추천', '비교', '후기'];

    const keywords = [];
    for (let i = 0; i < 8; i++) {
      const newHash = this.simpleHash(keyword + i);
      let newKeyword;
      if (i < 4) {
        newKeyword = prefixes[i % prefixes.length] + ' ' + keyword;
      } else {
        newKeyword = keyword + ' ' + suffixes[i % suffixes.length];
      }
      keywords.push(this.generateKeywordData(newKeyword, newHash));
    }
    return keywords;
  }

  generateSuggestions(keyword) {
    const words = ['분석', '도구', '가이드', '튜토리얼', '예제', '팁', '전략', '최적화'];
    return words.map(w => keyword + ' ' + w);
  }

  showSuggestions(suggestions) {
    this.elements.suggestions.style.display = 'block';
    this.elements.suggestions.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 0.5rem;">관련 검색어</div>
      ${suggestions.map(s => `<span class="suggestion-tag" onclick="keywordResearch.searchSuggestion('${s}')">${s}</span>`).join('')}
    `;
  }

  searchSuggestion(keyword) {
    this.elements.keyword.value = keyword;
    this.analyze();
  }

  getDifficultyClass(difficulty) {
    if (difficulty < 30) return 'easy';
    if (difficulty < 60) return 'medium';
    return 'hard';
  }

  getDifficultyLabel(difficulty) {
    if (difficulty < 30) return '쉬움';
    if (difficulty < 60) return '보통';
    return '어려움';
  }

  showResults(main, related) {
    const allKeywords = [main, ...related];

    this.elements.results.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 1rem;">분석 결과</div>
      ${allKeywords.map((kw, idx) => `
        <div class="keyword-item" style="${idx === 0 ? 'border: 2px solid var(--primary);' : ''}">
          <div>
            <div style="font-weight: ${idx === 0 ? '700' : '500'};">${kw.keyword}</div>
            <span class="difficulty-badge difficulty-${this.getDifficultyClass(kw.difficulty)}">
              난이도: ${this.getDifficultyLabel(kw.difficulty)}
            </span>
          </div>
          <div class="keyword-metrics">
            <div class="metric">
              <span class="metric-value">${kw.volume.toLocaleString()}</span>
              <span class="metric-label">월간 검색량</span>
            </div>
            <div class="metric">
              <span class="metric-value">${kw.difficulty}</span>
              <span class="metric-label">난이도</span>
            </div>
            <div class="metric">
              <span class="metric-value">$${kw.cpc}</span>
              <span class="metric-label">CPC</span>
            </div>
            <div class="metric">
              <span class="metric-value">${kw.trend}</span>
              <span class="metric-label">트렌드</span>
            </div>
          </div>
        </div>
      `).join('')}

      <div style="margin-top: 1rem; background: var(--bg-primary); border-radius: 8px; padding: 1rem; font-size: 0.85rem;">
        <strong>참고:</strong> 이 데이터는 시뮬레이션입니다. 실제 SEO 분석에는 Google Keyword Planner, Ahrefs, SEMrush 등의 도구를 사용하세요.
      </div>
    `;
  }
}

// 전역 인스턴스 생성
const keywordResearch = new KeywordResearch();
window.KeywordResearch = keywordResearch;

// 전역 함수 (HTML onclick 호환)
function analyze() { keywordResearch.analyze(); }

document.addEventListener('DOMContentLoaded', () => keywordResearch.init());
