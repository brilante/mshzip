/**
 * 키워드 리서치 도구 - ToolBase 기반
 * 키워드 분석 및 제안
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var KeywordResearch = class KeywordResearch extends ToolBase {
  constructor() {
    super('KeywordResearch');
  }

  init() {
    this.initElements({
      mainKeyword: 'mainKeyword',
      loadingIndicator: 'loadingIndicator',
      resultsSection: 'resultsSection',
      mainKeywordResult: 'mainKeywordResult',
      relatedKeywords: 'relatedKeywords',
      longTailKeywords: 'longTailKeywords',
      questionKeywords: 'questionKeywords',
      totalKeywords: 'totalKeywords',
      avgVolume: 'avgVolume',
      avgDifficulty: 'avgDifficulty'
    });

    console.log('[KeywordResearch] 초기화 완료');
    return this;
  }

  async analyze() {
    const keyword = this.elements.mainKeyword.value.trim();
    if (!keyword) {
      this.showToast('키워드를 입력하세요.', 'warning');
      return;
    }

    this.elements.loadingIndicator.style.display = 'flex';
    this.elements.resultsSection.style.display = 'none';

    // 시뮬레이션된 키워드 분석 (실제로는 API 필요)
    await new Promise(resolve => setTimeout(resolve, 1500));

    const results = this.generateKeywordSuggestions(keyword);
    this.displayResults(keyword, results);

    this.elements.loadingIndicator.style.display = 'none';
    this.elements.resultsSection.style.display = 'block';
  }

  generateKeywordSuggestions(keyword) {
    const prefixes = ['best', 'top', 'how to', 'what is', 'why', '무료', '추천', '비교', '후기', '가격'];
    const suffixes = ['tool', 'app', 'service', 'guide', 'tutorial', '방법', '사용법', '추천', '비교', '후기'];
    const questions = ['what', 'how', 'why', 'when', 'where', 'which', 'who'];

    const related = [];
    const longTail = [];
    const questionKeywords = [];

    // 관련 키워드
    suffixes.slice(0, 6).forEach(suffix => {
      related.push({
        keyword: `${keyword} ${suffix}`,
        volume: Math.floor(Math.random() * 10000) + 100,
        difficulty: Math.floor(Math.random() * 100),
        cpc: (Math.random() * 5).toFixed(2)
      });
    });

    // 롱테일 키워드
    prefixes.slice(0, 5).forEach(prefix => {
      longTail.push({
        keyword: `${prefix} ${keyword}`,
        volume: Math.floor(Math.random() * 5000) + 50,
        difficulty: Math.floor(Math.random() * 60) + 10,
        cpc: (Math.random() * 3).toFixed(2)
      });
    });

    // 질문 키워드
    questions.slice(0, 5).forEach(q => {
      questionKeywords.push({
        keyword: `${q} ${keyword}`,
        volume: Math.floor(Math.random() * 3000) + 100,
        difficulty: Math.floor(Math.random() * 50) + 20,
        cpc: (Math.random() * 2).toFixed(2)
      });
    });

    return { related, longTail, questionKeywords };
  }

  displayResults(mainKeyword, results) {
    this.elements.mainKeywordResult.textContent = mainKeyword;

    // 관련 키워드
    const relatedHtml = results.related.map(r => this.createKeywordRow(r)).join('');
    this.elements.relatedKeywords.innerHTML = relatedHtml;

    // 롱테일 키워드
    const longTailHtml = results.longTail.map(r => this.createKeywordRow(r)).join('');
    this.elements.longTailKeywords.innerHTML = longTailHtml;

    // 질문 키워드
    const questionHtml = results.questionKeywords.map(r => this.createKeywordRow(r)).join('');
    this.elements.questionKeywords.innerHTML = questionHtml;

    // 통계
    const allKeywords = [...results.related, ...results.longTail, ...results.questionKeywords];
    const avgVolume = Math.round(allKeywords.reduce((a, b) => a + b.volume, 0) / allKeywords.length);
    const avgDifficulty = Math.round(allKeywords.reduce((a, b) => a + b.difficulty, 0) / allKeywords.length);

    this.elements.totalKeywords.textContent = allKeywords.length;
    this.elements.avgVolume.textContent = avgVolume.toLocaleString();
    this.elements.avgDifficulty.textContent = avgDifficulty + '%';
  }

  createKeywordRow(data) {
    const diffColor = data.difficulty < 30 ? 'var(--success)' : data.difficulty < 60 ? 'var(--warning)' : 'var(--error)';
    return `
      <div class="keyword-row">
        <div class="keyword-text">${data.keyword}</div>
        <div class="keyword-stats">
          <span class="stat-item" title="월간 검색량">${data.volume.toLocaleString()}</span>
          <span class="stat-item" title="경쟁 난이도" style="color: ${diffColor}">${data.difficulty}%</span>
          <span class="stat-item" title="예상 CPC">$${data.cpc}</span>
        </div>
        <button class="copy-keyword" onclick="keywordResearch.copyKeyword('${data.keyword}')"></button>
      </div>
    `;
  }

  async copyKeyword(keyword) {
    const success = await this.copyToClipboard(keyword);
    this.showToast(success ? '키워드 복사됨!' : '복사 실패', success ? 'success' : 'error');
  }

  async exportCSV() {
    const rows = document.querySelectorAll('.keyword-row');
    if (rows.length === 0) {
      this.showToast('내보낼 데이터가 없습니다.', 'warning');
      return;
    }

    let csv = 'Keyword,Search Volume,Difficulty,CPC\n';
    rows.forEach(row => {
      const keyword = row.querySelector('.keyword-text').textContent;
      const stats = row.querySelectorAll('.stat-item');
      const volume = stats[0].textContent.replace('', '').replace(/,/g, '');
      const difficulty = stats[1].textContent.replace('', '');
      const cpc = stats[2].textContent.replace('', '');
      csv += `"${keyword}",${volume},${difficulty},${cpc}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keywords.csv';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('CSV 내보내기 완료!', 'success');
  }
}

// 전역 인스턴스 생성
const keywordResearch = new KeywordResearch();
window.KeywordResearch = keywordResearch;

document.addEventListener('DOMContentLoaded', () => keywordResearch.init());
