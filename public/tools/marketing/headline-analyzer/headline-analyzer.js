/**
 * 헤드라인 분석기 - ToolBase 기반
 * 제목 효과 분석
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var HeadlineAnalyzer = class HeadlineAnalyzer extends ToolBase {
  constructor() {
    super('HeadlineAnalyzer');
    this.powerWords = ['무료', '비밀', '놀라운', '즉시', '쉬운', '검증된', '강력한', '혁신적', '독점', '특별', '베스트', '최고의', '필수', '완벽한', '간단한'];
    this.emotionWords = ['사랑', '행복', '두려움', '분노', '희망', '걱정', '흥분', '놀람', '감동', '충격', '기쁨', '안심'];
    this.uncommonWords = ['독특한', '희귀한', '특이한', '유일무이', '전무후무', '파격적', '전설적', '획기적'];
  }

  init() {
    this.initElements({
      headline: 'headline',
      result: 'result'
    });

    console.log('[HeadlineAnalyzer] 초기화 완료');
    return this;
  }

  analyze() {
    const headline = this.elements.headline.value.trim();

    if (!headline) {
      this.showToast('헤드라인을 입력해주세요', 'error');
      return;
    }

    const analysis = {
      wordBalance: this.analyzeWordBalance(headline),
      length: this.analyzeLength(headline),
      powerWords: this.analyzePowerWords(headline),
      emotionWords: this.analyzeEmotionWords(headline),
      readability: this.analyzeReadability(headline),
      structure: this.analyzeStructure(headline)
    };

    const overallScore = this.calculateOverallScore(analysis);
    this.showResult(headline, overallScore, analysis);
  }

  analyzeWordBalance(headline) {
    const words = headline.split(/\s+/);
    const commonWords = ['의', '를', '은', '는', '이', '가', '에', '와', '과', '로', '으로', '에서', '까지', '부터', '도', '만', '조차', '마저'];
    const common = words.filter(w => commonWords.includes(w)).length;
    const uncommon = words.filter(w => this.uncommonWords.some(uw => w.includes(uw))).length;

    const ratio = words.length > 0 ? (words.length - common) / words.length : 0;
    return Math.min(100, Math.round(ratio * 100 + uncommon * 10));
  }

  analyzeLength(headline) {
    const len = headline.length;
    // 최적 길이: 40-60자
    if (len >= 40 && len <= 60) return 100;
    if (len >= 30 && len <= 70) return 80;
    if (len >= 20 && len <= 80) return 60;
    return 40;
  }

  analyzePowerWords(headline) {
    const found = this.powerWords.filter(w => headline.includes(w));
    return {
      score: Math.min(100, found.length * 25),
      words: found
    };
  }

  analyzeEmotionWords(headline) {
    const found = this.emotionWords.filter(w => headline.includes(w));
    return {
      score: Math.min(100, found.length * 30),
      words: found
    };
  }

  analyzeReadability(headline) {
    const words = headline.split(/\s+/).length;
    // 최적 단어 수: 6-12개
    if (words >= 6 && words <= 12) return 100;
    if (words >= 4 && words <= 15) return 75;
    return 50;
  }

  analyzeStructure(headline) {
    let score = 50;

    // 숫자 포함
    if (/\d/.test(headline)) score += 15;

    // 질문형
    if (headline.includes('?')) score += 10;

    // 방법/가이드 형식
    if (/방법|가이드|팁|비결|노하우/.test(headline)) score += 10;

    // 리스트 형식 (숫자로 시작)
    if (/^[0-9]+/.test(headline)) score += 15;

    return Math.min(100, score);
  }

  calculateOverallScore(analysis) {
    return Math.round(
      analysis.wordBalance * 0.15 +
      analysis.length * 0.15 +
      analysis.powerWords.score * 0.25 +
      analysis.emotionWords.score * 0.2 +
      analysis.readability * 0.1 +
      analysis.structure * 0.15
    );
  }

  getScoreClass(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'average';
    return 'poor';
  }

  getScoreLabel(score) {
    if (score >= 80) return '우수';
    if (score >= 60) return '좋음';
    if (score >= 40) return '보통';
    return '개선 필요';
  }

  getProgressColor(score) {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }

  showResult(headline, overallScore, analysis) {
    const scoreClass = this.getScoreClass(overallScore);
    const allFoundWords = [
      ...analysis.powerWords.words.map(w => ({ word: w, type: 'power' })),
      ...analysis.emotionWords.words.map(w => ({ word: w, type: 'emotion' }))
    ];

    this.elements.result.innerHTML = `
      <div style="text-align: center; margin-top: 2rem;">
        <div class="score-circle score-${scoreClass}">
          <div class="score-value">${overallScore}</div>
          <div class="score-label">${this.getScoreLabel(overallScore)}</div>
        </div>
      </div>

      <div class="analysis-grid">
        ${this.renderAnalysisCard('단어 구성', analysis.wordBalance)}
        ${this.renderAnalysisCard('길이 최적화', analysis.length)}
        ${this.renderAnalysisCard('파워 워드', analysis.powerWords.score)}
        ${this.renderAnalysisCard('감성 단어', analysis.emotionWords.score)}
        ${this.renderAnalysisCard('가독성', analysis.readability)}
        ${this.renderAnalysisCard('구조', analysis.structure)}
      </div>

      ${allFoundWords.length > 0 ? `
        <div style="margin-top: 1.5rem; background: var(--bg-primary); border-radius: 8px; padding: 1rem;">
          <div style="font-weight: 600; margin-bottom: 0.5rem;">발견된 키워드</div>
          <div class="word-list">
            ${allFoundWords.map(w => `<span class="word-tag word-${w.type}">${w.word}</span>`).join('')}
          </div>
        </div>
      ` : ''}

      <div style="margin-top: 1rem; background: var(--bg-primary); border-radius: 8px; padding: 1rem; font-size: 0.85rem;">
        <strong>개선 팁:</strong>
        <ul style="margin-top: 0.5rem; padding-left: 1.5rem; color: var(--text-secondary);">
          ${this.getTips(analysis)}
        </ul>
      </div>
    `;
  }

  renderAnalysisCard(title, score) {
    return `
      <div class="analysis-card">
        <div class="analysis-header">
          <span class="analysis-title">${title}</span>
          <span class="analysis-score" style="color: ${this.getProgressColor(score)}">${score}점</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${score}%; background: ${this.getProgressColor(score)};"></div>
        </div>
      </div>
    `;
  }

  getTips(analysis) {
    const tips = [];

    if (analysis.length < 80) {
      tips.push('<li>제목 길이를 40-60자 사이로 맞추면 최적입니다</li>');
    }
    if (analysis.powerWords.score < 50) {
      tips.push(`<li>파워 워드를 추가해보세요: "${this.powerWords.slice(0, 3).join('", "')}"</li>`);
    }
    if (analysis.emotionWords.score < 50) {
      tips.push('<li>감성적인 단어를 추가하면 클릭률이 높아집니다</li>');
    }
    if (analysis.structure < 70) {
      tips.push('<li>숫자로 시작하거나 질문형으로 바꿔보세요</li>');
    }

    return tips.length > 0 ? tips.join('') : '<li>헤드라인이 잘 작성되었습니다!</li>';
  }
}

// 전역 인스턴스 생성
const headlineAnalyzer = new HeadlineAnalyzer();
window.HeadlineAnalyzer = headlineAnalyzer;

// 전역 함수 (HTML onclick 호환)
function analyze() { headlineAnalyzer.analyze(); }

document.addEventListener('DOMContentLoaded', () => headlineAnalyzer.init());
