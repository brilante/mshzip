/**
 * 도서 통계 - ToolBase 기반
 * 텍스트 분석 및 통계
 * @created 2026-01-13
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BookStats = class BookStats extends ToolBase {
  constructor() {
    super('BookStats');
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      charCount: 'charCount',
      wordCount: 'wordCount',
      sentenceCount: 'sentenceCount',
      paragraphCount: 'paragraphCount',
      pageCount: 'pageCount',
      readTime: 'readTime',
      readabilityMarker: 'readabilityMarker',
      readabilityScore: 'readabilityScore',
      readabilityDesc: 'readabilityDesc',
      freqWords: 'freqWords',
      avgSentence: 'avgSentence',
      avgWord: 'avgWord',
      longestSentence: 'longestSentence',
      uniqueWords: 'uniqueWords',
      lexicalDiversity: 'lexicalDiversity',
      koreanRatio: 'koreanRatio',
      englishRatio: 'englishRatio'
    });

    console.log('[BookStats] 초기화 완료');
    return this;
  }

  analyze() {
    const text = this.elements.textInput.value;
    if (!text.trim()) {
      alert('분석할 텍스트를 입력해주세요.');
      return;
    }

    // 기본 통계
    const charCount = text.replace(/\s/g, '').length;
    const charCountWithSpaces = text.length;

    // 단어 추출
    const words = this.extractWords(text);
    const wordCount = words.length;

    // 문장 수
    const sentences = text.split(/[.!?。]+/).filter(s => s.trim().length > 0);
    const sentenceCount = sentences.length;

    // 문단 수
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const paragraphCount = Math.max(paragraphs.length, 1);

    // 페이지 수 & 읽기 시간
    const pageCount = Math.ceil(charCountWithSpaces / 1800);
    const readTime = Math.ceil(charCount / 250);

    // UI 업데이트
    this.elements.charCount.textContent = charCount.toLocaleString();
    this.elements.wordCount.textContent = wordCount.toLocaleString();
    this.elements.sentenceCount.textContent = sentenceCount.toLocaleString();
    this.elements.paragraphCount.textContent = paragraphCount.toLocaleString();
    this.elements.pageCount.textContent = pageCount.toLocaleString();
    this.elements.readTime.textContent = readTime > 60 ? `${Math.floor(readTime / 60)}시간 ${readTime % 60}분` : `${readTime}분`;

    // 가독성 분석
    this.analyzeReadability(text, sentences, words);

    // 빈도 분석
    this.analyzeFrequency(words);

    // 상세 분석
    this.analyzeDetails(text, sentences, words);
  }

  extractWords(text) {
    // 한글 단어와 영문 단어 추출
    const korean = text.match(/[가-힣]+/g) || [];
    const english = text.match(/[a-zA-Z]+/g) || [];
    return [...korean, ...english];
  }

  analyzeReadability(text, sentences, words) {
    const avgSentenceLength = sentences.length > 0
      ? text.replace(/\s/g, '').length / sentences.length
      : 0;

    const avgWordLength = words.length > 0
      ? words.reduce((sum, w) => sum + w.length, 0) / words.length
      : 0;

    // 점수: 0(쉬움) ~ 100(어려움)
    let score = 0;
    score += Math.min(avgSentenceLength / 2, 50);
    score += Math.min(avgWordLength * 5, 50);
    score = Math.min(Math.max(score, 0), 100);

    this.elements.readabilityMarker.style.left = `${score}%`;

    if (score < 33) {
      this.elements.readabilityScore.textContent = '쉬움';
      this.elements.readabilityScore.style.color = '#22c55e';
      this.elements.readabilityDesc.textContent = '초등학생도 읽기 쉬운 수준';
    } else if (score < 66) {
      this.elements.readabilityScore.textContent = '보통';
      this.elements.readabilityScore.style.color = '#f59e0b';
      this.elements.readabilityDesc.textContent = '일반 성인 독자에게 적합';
    } else {
      this.elements.readabilityScore.textContent = '어려움';
      this.elements.readabilityScore.style.color = '#ef4444';
      this.elements.readabilityDesc.textContent = '전문 지식이 필요한 수준';
    }
  }

  analyzeFrequency(words) {
    if (words.length === 0) {
      this.elements.freqWords.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">분석할 단어가 없습니다</div>';
      return;
    }

    // 불용어 제외
    const stopWords = ['의', '가', '이', '은', '는', '을', '를', '에', '에서', '로', '으로', '와', '과', '도', '만', '까지', '부터', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];

    const wordCount = {};
    words.forEach(word => {
      const lower = word.toLowerCase();
      if (lower.length >= 2 && !stopWords.includes(lower)) {
        wordCount[word] = (wordCount[word] || 0) + 1;
      }
    });

    const sorted = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (sorted.length === 0) {
      this.elements.freqWords.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">유의미한 단어가 없습니다</div>';
      return;
    }

    const maxCount = sorted[0][1];
    this.elements.freqWords.innerHTML = sorted.map(([word, count]) => {
      const width = Math.round((count / maxCount) * 200);
      return `
        <div class="freq-bar">
          <span class="freq-word">${word}</span>
          <div class="freq-fill" style="width: ${width}px;">${count}</div>
        </div>
      `;
    }).join('');
  }

  analyzeDetails(text, sentences, words) {
    // 평균 문장 길이
    const avgSentence = sentences.length > 0
      ? Math.round(text.replace(/\s/g, '').length / sentences.length)
      : 0;
    this.elements.avgSentence.textContent = `${avgSentence}자`;

    // 평균 단어 길이
    const avgWord = words.length > 0
      ? (words.reduce((sum, w) => sum + w.length, 0) / words.length).toFixed(1)
      : 0;
    this.elements.avgWord.textContent = `${avgWord}자`;

    // 최장 문장
    const longestSentence = sentences.reduce((max, s) =>
      s.trim().length > max.length ? s.trim() : max, '');
    const longestDisplay = longestSentence.length > 50
      ? longestSentence.substring(0, 50) + '...'
      : longestSentence;
    this.elements.longestSentence.textContent = `${longestDisplay} (${longestSentence.length}자)`;

    // 고유 단어 수
    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
    this.elements.uniqueWords.textContent = `${uniqueWords.toLocaleString()}개`;

    // 어휘 다양성 (Type-Token Ratio)
    const lexicalDiversity = words.length > 0
      ? ((uniqueWords / words.length) * 100).toFixed(1)
      : 0;
    this.elements.lexicalDiversity.textContent = `${lexicalDiversity}%`;

    // 한글/영문 비율
    const koreanChars = (text.match(/[가-힣]/g) || []).length;
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
    const totalChars = koreanChars + englishChars;
    const koreanRatio = totalChars > 0 ? Math.round((koreanChars / totalChars) * 100) : 0;
    const englishRatio = totalChars > 0 ? Math.round((englishChars / totalChars) * 100) : 0;

    this.elements.koreanRatio.textContent = `${koreanRatio}%`;
    this.elements.englishRatio.textContent = `${englishRatio}%`;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const bookStats = new BookStats();
window.BookStats = bookStats;

document.addEventListener('DOMContentLoaded', () => bookStats.init());
