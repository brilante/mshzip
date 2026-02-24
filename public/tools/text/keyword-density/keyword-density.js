/**
 * 키워드 밀도 분석 - ToolBase 기반
 * 텍스트 내 키워드 빈도 분석
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class KeywordDensity extends ToolBase {
  constructor() {
    super('KeywordDensity');
    this.stopwords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these', 'those', 'it', 'its', 'as', 'if', 'not', 'no', 'so', 'than', 'too', 'very', 'just', 'also', 'only', 'even', 'more', 'most', 'other', 'some', 'any', 'all', 'both', 'each', 'few', 'many', 'such', 'who', 'which', 'what', 'when', 'where', 'why', 'how', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', '이', '그', '저', '것', '수', '등', '및', '또', '더', '중', '후', '전', '내', '외', '상', '하'];
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      minLength: 'minLength',
      minCount: 'minCount',
      excludeStopwords: 'excludeStopwords',
      totalWords: 'totalWords',
      uniqueWords: 'uniqueWords',
      totalChars: 'totalChars',
      avgWordLen: 'avgWordLen',
      keywordList: 'keywordList'
    });

    console.log('[KeywordDensity] 초기화 완료');
    return this;
  }

  analyze() {
    const text = this.elements.textInput.value;
    const minLength = parseInt(this.elements.minLength.value) || 2;
    const minCount = parseInt(this.elements.minCount.value) || 2;
    const excludeStopwords = this.elements.excludeStopwords.checked;

    // 단어 추출
    const words = text.toLowerCase()
      .replace(/[^\w\s가-힣]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= minLength);

    const totalWords = words.length;
    const totalChars = text.replace(/\s/g, '').length;

    // 빈도 계산
    const freq = {};
    words.forEach(word => {
      if (excludeStopwords && this.stopwords.includes(word)) return;
      freq[word] = (freq[word] || 0) + 1;
    });

    // 정렬
    const sorted = Object.entries(freq)
      .filter(([_, count]) => count >= minCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50);

    const uniqueWords = Object.keys(freq).length;
    const avgWordLen = totalWords > 0 ? (words.reduce((sum, w) => sum + w.length, 0) / totalWords).toFixed(1) : 0;

    // 통계 표시
    this.elements.totalWords.textContent = totalWords;
    this.elements.uniqueWords.textContent = uniqueWords;
    this.elements.totalChars.textContent = totalChars;
    this.elements.avgWordLen.textContent = avgWordLen;

    // 키워드 목록
    const maxCount = sorted.length > 0 ? sorted[0][1] : 1;
    this.elements.keywordList.innerHTML = sorted.map(([word, count]) => {
      const density = ((count / totalWords) * 100).toFixed(2);
      const barWidth = (count / maxCount) * 100;
      return `
        <div class="keyword-item">
          <div>
            <div class="keyword-word">${this.escapeHtml(word)}</div>
            <div class="keyword-bar" style="width: ${barWidth}%"></div>
          </div>
          <div class="keyword-stats">
            <span>${count}회</span>
            <span>${density}%</span>
          </div>
        </div>
      `;
    }).join('') || '<div style="color: var(--text-secondary); text-align: center; padding: 2rem;">키워드가 없습니다</div>';
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const keywordDensity = new KeywordDensity();
window.KeywordDensity = keywordDensity;

document.addEventListener('DOMContentLoaded', () => keywordDensity.init());
