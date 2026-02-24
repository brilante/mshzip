/**
 * CTR 예측기 - ToolBase 기반
 * 클릭률 예측 분석
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CTRPredictor = class CTRPredictor extends ToolBase {
  constructor() {
    super('CTRPredictor');
    this.powerWords = ['무료', '최고', '추천', '비교', '후기', '가이드', '방법', '완벽', '쉬운', '빠른', '새로운', '할인', '특가', '한정', '베스트', '인기'];
    this.actionWords = ['지금', '바로', '확인', '시작', '다운로드', '클릭', '가입', '신청'];
    this.negativeWords = ['광고', '스팸'];
  }

  init() {
    this.initElements({
      title: 'title',
      url: 'url',
      description: 'description',
      titleCount: 'titleCount',
      descCount: 'descCount',
      previewTitle: 'previewTitle',
      previewUrl: 'previewUrl',
      previewDesc: 'previewDesc',
      result: 'result'
    });

    console.log('[CTRPredictor] 초기화 완료');
    return this;
  }

  updatePreview() {
    const title = this.elements.title.value;
    const url = this.elements.url.value;
    const desc = this.elements.description.value;

    this.elements.titleCount.textContent = title.length;
    this.elements.descCount.textContent = desc.length;

    this.elements.previewTitle.textContent = title || '제목이 여기에 표시됩니다';
    this.elements.previewUrl.textContent = url || 'https://example.com';
    this.elements.previewDesc.textContent = desc || '설명이 여기에 표시됩니다...';
  }

  predict() {
    const title = this.elements.title.value.trim();
    const url = this.elements.url.value.trim();
    const desc = this.elements.description.value.trim();

    if (!title) {
      this.showToast('제목을 입력해주세요', 'error');
      return;
    }

    const factors = this.analyzeFactors(title, url, desc);
    const ctr = this.calculateCTR(factors);
    this.showResult(ctr, factors);
  }

  analyzeFactors(title, url, desc) {
    const factors = {
      titleLength: { score: 0, max: 20, label: '제목 길이' },
      powerWords: { score: 0, max: 20, label: '파워 워드' },
      actionWords: { score: 0, max: 15, label: '행동 유도' },
      numbers: { score: 0, max: 15, label: '숫자 포함' },
      descLength: { score: 0, max: 15, label: '설명 길이' },
      urlClean: { score: 0, max: 15, label: 'URL 가독성' }
    };

    // 제목 길이 (25-55자 최적)
    if (title.length >= 25 && title.length <= 55) {
      factors.titleLength.score = 20;
    } else if (title.length >= 15 && title.length <= 60) {
      factors.titleLength.score = 15;
    } else {
      factors.titleLength.score = 5;
    }

    // 파워 워드 체크
    const powerCount = this.powerWords.filter(w => title.includes(w) || desc.includes(w)).length;
    factors.powerWords.score = Math.min(20, powerCount * 7);

    // 행동 유도 단어
    const actionCount = this.actionWords.filter(w => title.includes(w) || desc.includes(w)).length;
    factors.actionWords.score = Math.min(15, actionCount * 8);

    // 숫자 포함
    if (/\d/.test(title)) {
      factors.numbers.score = 15;
    } else if (/\d/.test(desc)) {
      factors.numbers.score = 8;
    }

    // 설명 길이 (120-155자 최적)
    if (desc.length >= 120 && desc.length <= 155) {
      factors.descLength.score = 15;
    } else if (desc.length >= 80 && desc.length <= 160) {
      factors.descLength.score = 10;
    } else if (desc.length > 0) {
      factors.descLength.score = 5;
    }

    // URL 가독성
    if (url) {
      const cleanUrl = !url.includes('?') && url.split('/').filter(p => p).length <= 4;
      factors.urlClean.score = cleanUrl ? 15 : 8;
    }

    return factors;
  }

  calculateCTR(factors) {
    const totalScore = Object.values(factors).reduce((sum, f) => sum + f.score, 0);
    // 점수를 CTR로 변환 (0-100점 → 0.5-8% CTR)
    const baseCTR = 0.5 + (totalScore / 100) * 7.5;
    return Math.min(8, Math.max(0.5, baseCTR));
  }

  showResult(ctr, factors) {
    let resultClass = 'result-low';
    let rating = '개선 필요';

    if (ctr >= 4) {
      resultClass = 'result-high';
      rating = '우수';
    } else if (ctr >= 2) {
      resultClass = 'result-medium';
      rating = '보통';
    }

    const suggestions = this.getSuggestions(factors);

    this.elements.result.innerHTML = `
      <div class="result-card ${resultClass}">
        <div class="ctr-value">${ctr.toFixed(1)}%</div>
        <div class="ctr-label">예상 CTR (${rating})</div>

        <div class="factors-grid">
          ${Object.entries(factors).map(([key, f]) => `
            <div class="factor-card">
              <div class="factor-score">${f.score}/${f.max}</div>
              <div class="factor-label">${f.label}</div>
            </div>
          `).join('')}
        </div>
      </div>

      ${suggestions.length > 0 ? `
        <div class="suggestions">
          <div style="font-weight: 600; margin-bottom: 0.75rem;">개선 제안</div>
          <ul style="padding-left: 1.5rem; font-size: 0.9rem;">
            ${suggestions.map(s => `<li style="margin-bottom: 0.5rem;">${s}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div style="margin-top: 1rem; background: var(--bg-primary); border-radius: 8px; padding: 1rem; font-size: 0.85rem;">
        <strong>참고:</strong> 이 예측은 일반적인 SEO 모범 사례를 기반으로 합니다. 실제 CTR은 검색 위치, 경쟁사, 브랜드 인지도 등 다양한 요인에 따라 달라집니다.
      </div>
    `;
  }

  getSuggestions(factors) {
    const suggestions = [];

    if (factors.titleLength.score < 15) {
      suggestions.push('제목 길이를 25-55자 사이로 조정하세요');
    }
    if (factors.powerWords.score < 10) {
      suggestions.push(`파워 워드를 추가하세요: ${this.powerWords.slice(0, 5).join(', ')}`);
    }
    if (factors.actionWords.score < 8) {
      suggestions.push(`행동 유도 단어를 추가하세요: ${this.actionWords.slice(0, 4).join(', ')}`);
    }
    if (factors.numbers.score < 10) {
      suggestions.push('숫자를 포함하면 클릭률이 높아집니다 (예: "7가지 방법", "2024년 가이드")');
    }
    if (factors.descLength.score < 10) {
      suggestions.push('메타 설명을 120-155자로 최적화하세요');
    }

    return suggestions;
  }
}

// 전역 인스턴스 생성
const ctrPredictor = new CTRPredictor();
window.CTRPredictor = ctrPredictor;

// 전역 함수 (HTML onclick 호환)
function predict() { ctrPredictor.predict(); }
function updatePreview() { ctrPredictor.updatePreview(); }

document.addEventListener('DOMContentLoaded', () => ctrPredictor.init());
