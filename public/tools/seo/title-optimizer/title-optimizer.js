/**
 * 제목 최적화 도구 - ToolBase 기반
 * SEO 제목 분석 및 최적화 제안
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TitleOptimizer = class TitleOptimizer extends ToolBase {
  constructor() {
    super('TitleOptimizer');
  }

  init() {
    this.initElements({
      titleInput: 'titleInput',
      keywordInput: 'keywordInput',
      urlInput: 'urlInput',
      descInput: 'descInput',
      charCount: 'charCount',
      wordCount: 'wordCount',
      lengthBar: 'lengthBar',
      scoreValue: 'scoreValue',
      checksList: 'checksList',
      feedbackList: 'feedbackList',
      previewTitle: 'previewTitle',
      previewUrl: 'previewUrl',
      previewDesc: 'previewDesc',
      suggestionsPanel: 'suggestionsPanel',
      suggestionsList: 'suggestionsList'
    });

    this.analyze();

    console.log('[TitleOptimizer] 초기화 완료');
    return this;
  }

  analyze() {
    const title = this.elements.titleInput.value;
    const keyword = this.elements.keywordInput.value.trim().toLowerCase();

    // 기본 분석
    const length = title.length;
    const wordCount = title.trim() ? title.trim().split(/\s+/).length : 0;
    const hasKeyword = keyword ? title.toLowerCase().includes(keyword) : false;
    const keywordAtStart = keyword ? title.toLowerCase().startsWith(keyword) : false;

    // 점수 계산
    let score = 0;
    const issues = [];
    const suggestions = [];

    // 길이 점수 (최대 30점)
    if (length >= 50 && length <= 60) {
      score += 30;
    } else if (length >= 40 && length <= 70) {
      score += 20;
      issues.push(length < 50 ? '제목이 약간 짧습니다.' : '제목이 약간 깁니다.');
    } else if (length > 0) {
      score += 5;
      issues.push(length < 40 ? '제목이 너무 짧습니다 (40자 이상 권장).' : '제목이 너무 깁니다 (60자 이하 권장).');
    }

    // 키워드 점수 (최대 40점)
    if (keyword) {
      if (keywordAtStart) {
        score += 40;
        suggestions.push('키워드가 제목 앞부분에 있어 좋습니다.');
      } else if (hasKeyword) {
        score += 25;
        suggestions.push('키워드를 제목 앞부분으로 이동하면 더 좋습니다.');
      } else {
        issues.push('제목에 주요 키워드가 포함되어 있지 않습니다.');
      }
    }

    // 특수문자/숫자 점수 (최대 15점)
    const hasNumbers = /\d/.test(title);
    const hasSpecialChars = /[|:\-–—]/.test(title);
    if (hasNumbers) {
      score += 10;
      suggestions.push('숫자가 포함되어 클릭률이 높아질 수 있습니다.');
    }
    if (hasSpecialChars) {
      score += 5;
    }

    // 파워 워드 점수 (최대 15점)
    const powerWords = ['무료', '최신', '베스트', '추천', '가이드', '방법', '비교', '리뷰', 'top', 'best', 'free', 'guide', 'how to', 'ultimate', 'complete'];
    const foundPowerWords = powerWords.filter(w => title.toLowerCase().includes(w));
    if (foundPowerWords.length > 0) {
      score += Math.min(15, foundPowerWords.length * 5);
      suggestions.push(`파워 워드 사용: ${foundPowerWords.join(', ')}`);
    }

    // 결과 표시
    this.displayResults({
      length,
      wordCount,
      score: Math.min(100, score),
      hasKeyword,
      keywordAtStart,
      hasNumbers,
      issues,
      suggestions
    });
  }

  displayResults(data) {
    // 길이 표시
    this.elements.charCount.textContent = data.length;
    this.elements.wordCount.textContent = data.wordCount;

    // 길이 바
    const percentage = Math.min(100, (data.length / 60) * 100);
    this.elements.lengthBar.style.width = percentage + '%';

    if (data.length <= 60) {
      this.elements.lengthBar.style.background = '#22c55e';
    } else if (data.length <= 70) {
      this.elements.lengthBar.style.background = '#f59e0b';
    } else {
      this.elements.lengthBar.style.background = '#ef4444';
    }

    // 점수 표시
    this.elements.scoreValue.textContent = data.score;
    this.elements.scoreValue.style.color = data.score >= 70 ? '#22c55e' : data.score >= 50 ? '#f59e0b' : '#ef4444';

    // 검사 항목
    const checks = [
      { name: '적절한 길이 (50-60자)', pass: data.length >= 50 && data.length <= 60 },
      { name: '키워드 포함', pass: data.hasKeyword },
      { name: '키워드 앞부분 배치', pass: data.keywordAtStart },
      { name: '숫자 포함', pass: data.hasNumbers }
    ];

    const checksHtml = checks.map(c => `
      <div class="check-item ${c.pass ? 'pass' : 'fail'}">
        ${c.pass ? '' : ''} ${c.name}
      </div>
    `).join('');
    this.elements.checksList.innerHTML = checksHtml;

    // 문제점 & 제안
    const feedbackHtml = [
      ...data.issues.map(i => `<div class="feedback-item issue">${i}</div>`),
      ...data.suggestions.map(s => `<div class="feedback-item suggestion">${s}</div>`)
    ].join('');
    this.elements.feedbackList.innerHTML = feedbackHtml || '<div class="feedback-item">분석할 제목을 입력하세요.</div>';

    // Google 미리보기
    this.updatePreview();
  }

  updatePreview() {
    const title = this.elements.titleInput.value || '페이지 제목을 입력하세요';
    const url = this.elements.urlInput.value || 'https://example.com/page';
    const desc = this.elements.descInput.value || '페이지 설명이 여기에 표시됩니다. 메타 설명은 검색 결과에서 사용자에게 페이지 내용을 알려주는 중요한 요소입니다.';

    this.elements.previewTitle.textContent = title.length > 60 ? title.substring(0, 57) + '...' : title;
    this.elements.previewUrl.textContent = url;
    this.elements.previewDesc.textContent = desc.length > 155 ? desc.substring(0, 152) + '...' : desc;
  }

  generateSuggestions() {
    const keyword = this.elements.keywordInput.value.trim();
    if (!keyword) {
      this.showToast('키워드를 입력하세요.', 'warning');
      return;
    }

    const templates = [
      `${keyword} - 완벽 가이드 [2026년 최신]`,
      `${keyword}: 알아야 할 모든 것`,
      `${keyword} 비교 및 추천 TOP 10`,
      `${keyword} 방법 - 초보자를 위한 단계별 가이드`,
      `최고의 ${keyword} | 전문가 추천`,
      `${keyword} 후기 및 리뷰 - 실제 사용 경험`,
      `${keyword}란? 쉽게 이해하는 완벽 설명`,
      `[무료] ${keyword} 시작하기`
    ];

    const suggestionsHtml = templates.map(t => `
      <div class="suggestion-item" onclick="titleOptimizer.useTitle('${t.replace(/'/g, "\\'")}')">
        <span>${t}</span>
        <span class="char-count">${t.length}자</span>
      </div>
    `).join('');

    this.elements.suggestionsList.innerHTML = suggestionsHtml;
    this.elements.suggestionsPanel.style.display = 'block';
  }

  useTitle(title) {
    this.elements.titleInput.value = title;
    this.analyze();
    this.showToast('제목이 적용되었습니다!', 'success');
  }
}

// 전역 인스턴스 생성
const titleOptimizer = new TitleOptimizer();
window.TitleOptimizer = titleOptimizer;

document.addEventListener('DOMContentLoaded', () => titleOptimizer.init());
