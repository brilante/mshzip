/**
 * AI 문법 교정 - ToolBase 기반
 * AI가 문법 오류를 찾아 교정
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class AiGrammarTool extends ToolBase {
  constructor() {
    super('AiGrammarTool');
    this.selectedModel = 'gpt-4o-mini';
    this.corrections = [];
    this.correctedText = '';

    this.modelNames = {
      'gpt-4o-mini': 'GPT-4o Mini',
      'claude-3-haiku': 'Claude 3 Haiku',
      'grammarly': 'Grammarly AI'
    };

    // 데모용 문법 오류 패턴
    this.errorPatterns = {
      korean: [
        { pattern: /을를/g, type: 'error', original: '을를', fixed: '를', reason: '조사 중복' },
        { pattern: /학교을/g, type: 'error', original: '학교을', fixed: '학교를', reason: '잘못된 조사 사용' },
        { pattern: /집에서 집/g, type: 'warning', original: '집에서 집', fixed: '집에서', reason: '단어 중복' },
        { pattern: /했슴다/g, type: 'error', original: '했슴다', fixed: '했습니다', reason: '맞춤법 오류' },
        { pattern: /되요/g, type: 'error', original: '되요', fixed: '돼요', reason: '되/돼 구분' }
      ],
      english: [
        { pattern: /I has/gi, type: 'error', original: 'I has', fixed: 'I have', reason: 'Subject-verb agreement' },
        { pattern: /a apple/gi, type: 'error', original: 'a apple', fixed: 'an apple', reason: 'Article usage' },
        { pattern: /he don't/gi, type: 'error', original: "he don't", fixed: "he doesn't", reason: 'Negative form' },
        { pattern: /their going/gi, type: 'error', original: 'their going', fixed: "they're going", reason: 'Their/They\'re confusion' },
        { pattern: /your welcome/gi, type: 'error', original: 'your welcome', fixed: "you're welcome", reason: 'Your/You\'re confusion' }
      ]
    };
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      outputArea: 'outputArea',
      loadingIndicator: 'loadingIndicator',
      errorCount: 'errorCount',
      warningCount: 'warningCount',
      suggestionCount: 'suggestionCount',
      scoreValue: 'scoreValue'
    });

    console.log('[AiGrammarTool] 초기화 완료');
    return this;
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }

  async check() {
    const inputText = this.elements.inputText.value.trim();

    if (!inputText) {
      this.showToast('검사할 텍스트를 입력하세요.', 'error');
      return;
    }

    // 로딩 표시
    const outputArea = this.elements.outputArea;
    const loadingIndicator = this.elements.loadingIndicator;
    outputArea.querySelector('.output-placeholder')?.remove();
    loadingIndicator.classList.add('active');

    // 시뮬레이션 딜레이
    await this.delay(1500 + Math.random() * 1000);

    // 문법 검사 시뮬레이션
    const result = this.analyzeText(inputText);
    this.corrections = result.corrections;
    this.correctedText = result.correctedText;

    // 결과 표시
    loadingIndicator.classList.remove('active');
    this.renderResults(result);

    this.showToast(`${this.modelNames[this.selectedModel]}로 검사 완료!`);
  }

  analyzeText(text) {
    const corrections = [];
    let correctedText = text;

    // 한국어 또는 영어 패턴 감지
    const isKorean = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text);
    const patterns = isKorean ? this.errorPatterns.korean : this.errorPatterns.english;

    // 패턴 매칭
    patterns.forEach(p => {
      if (p.pattern.test(text)) {
        corrections.push({
          type: p.type,
          original: p.original,
          fixed: p.fixed,
          reason: p.reason
        });
        correctedText = correctedText.replace(p.pattern, p.fixed);
      }
    });

    // 일반적인 제안 추가 (데모)
    if (text.length > 200) {
      corrections.push({
        type: 'suggestion',
        original: '긴 문장',
        fixed: '문장 분리 권장',
        reason: '가독성 향상을 위해 문장을 나눠보세요'
      });
    }

    // 점수 계산
    const errorCount = corrections.filter(c => c.type === 'error').length;
    const warningCount = corrections.filter(c => c.type === 'warning').length;
    const suggestionCount = corrections.filter(c => c.type === 'suggestion').length;
    const score = Math.max(0, 100 - (errorCount * 15) - (warningCount * 5) - (suggestionCount * 2));

    return {
      corrections,
      correctedText,
      stats: { errorCount, warningCount, suggestionCount, score }
    };
  }

  renderResults(result) {
    const outputArea = this.elements.outputArea;

    if (result.corrections.length === 0) {
      outputArea.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;"></div>
          <div style="font-size: 1.1rem; font-weight: 600; color: #22c55e;">문법 오류가 발견되지 않았습니다!</div>
          <div style="color: var(--text-secondary); margin-top: 0.5rem;">훌륭한 글입니다.</div>
        </div>
      `;
    } else {
      outputArea.innerHTML = result.corrections.map(c => `
        <div class="correction-item ${c.type}">
          <div class="correction-type ${c.type}">
            ${c.type === 'error' ? '오류' : c.type === 'warning' ? '주의' : '제안'}
          </div>
          <div>
            <span class="correction-original">${c.original}</span>
            →
            <span class="correction-fixed">${c.fixed}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
            ${c.reason}
          </div>
        </div>
      `).join('');
    }

    // 통계 업데이트
    this.elements.errorCount.textContent = result.stats.errorCount;
    this.elements.warningCount.textContent = result.stats.warningCount;
    this.elements.suggestionCount.textContent = result.stats.suggestionCount;
    this.elements.scoreValue.textContent = result.stats.score;
  }

  applyCorrected() {
    if (!this.correctedText) {
      this.showToast('먼저 문법 검사를 실행하세요.', 'error');
      return;
    }
    this.elements.inputText.value = this.correctedText;
    this.showToast('수정 사항이 적용되었습니다!');
  }

  copy() {
    const text = this.correctedText || this.elements.inputText.value;
    if (!text) {
      this.showToast('복사할 텍스트가 없습니다.', 'error');
      return;
    }
    this.copyToClipboard(text);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const aiGrammarTool = new AiGrammarTool();
window.AIGrammar = aiGrammarTool;

document.addEventListener('DOMContentLoaded', () => aiGrammarTool.init());
console.log('[AiGrammarTool] 모듈 로드 완료');
