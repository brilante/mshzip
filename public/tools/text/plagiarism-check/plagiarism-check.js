/**
 * 표절 검사 - ToolBase 기반
 * AI 기반 텍스트 유사도 검사 (프리미엄)
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PlagiarismCheck = class PlagiarismCheck extends ToolBase {
  constructor() {
    super('PlagiarismCheck');
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      scoreCircle: 'scoreCircle',
      scoreValue: 'scoreValue',
      matchList: 'matchList'
    });

    console.log('[PlagiarismCheck] 초기화 완료');
    return this;
  }

  async check() {
    const text = this.elements.textInput.value.trim();

    if (!text) {
      this.showToast('검사할 텍스트를 입력하세요.', 'warning');
      return;
    }

    if (text.length < 50) {
      this.showToast('최소 50자 이상 입력하세요.', 'warning');
      return;
    }

    // 데모용 시뮬레이션
    this.showToast('검사 중... (데모 모드)', 'info');

    await new Promise(r => setTimeout(r, 1500));

    const result = this.simulateCheck(text);
    this.displayResults(result);
  }

  simulateCheck(text) {
    // 데모용 랜덤 결과
    const originality = Math.floor(Math.random() * 30) + 70;
    const matches = [];

    if (originality < 90) {
      const numMatches = Math.floor((100 - originality) / 10);
      for (let i = 0; i < numMatches; i++) {
        matches.push({
          percent: Math.floor(Math.random() * 20) + 5,
          source: `example${i + 1}.com`,
          snippet: text.slice(i * 30, i * 30 + 50) + '...'
        });
      }
    }

    return { originality, matches };
  }

  displayResults({ originality, matches }) {
    this.elements.scoreValue.textContent = originality + '%';

    if (originality >= 90) {
      this.elements.scoreCircle.style.borderColor = '#22c55e';
      this.elements.scoreValue.style.color = '#22c55e';
    } else if (originality >= 70) {
      this.elements.scoreCircle.style.borderColor = '#f59e0b';
      this.elements.scoreValue.style.color = '#f59e0b';
    } else {
      this.elements.scoreCircle.style.borderColor = '#ef4444';
      this.elements.scoreValue.style.color = '#ef4444';
    }

    if (matches.length === 0) {
      this.elements.matchList.innerHTML = `
        <div style="color: var(--text-secondary); text-align: center; padding: 2rem;">
          유사한 콘텐츠가 발견되지 않았습니다!
        </div>
      `;
    } else {
      this.elements.matchList.innerHTML = matches.map(m => `
        <div class="match-item">
          <div class="match-percent">${m.percent}% 일치 - ${m.source}</div>
          <div class="match-text">"${m.snippet}"</div>
        </div>
      `).join('');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const plagiarismCheck = new PlagiarismCheck();
window.PlagiarismCheck = plagiarismCheck;

document.addEventListener('DOMContentLoaded', () => plagiarismCheck.init());
