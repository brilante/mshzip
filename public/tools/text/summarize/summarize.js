/**
 * 텍스트 요약 - ToolBase 기반
 * AI 기반 텍스트 요약 (프리미엄)
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var Summarize = class Summarize extends ToolBase {
  constructor() {
    super('Summarize');
    this.keywords = ['중요', '핵심', '결론', '따라서', '결과', '목적', '의미', 'important', 'key', 'conclusion', 'therefore', 'result'];
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      outputText: 'outputText',
      lengthSlider: 'lengthSlider',
      lengthValue: 'lengthValue',
      bulletPoints: 'bulletPoints',
      wordCount: 'wordCount',
      charCount: 'charCount',
      sentenceCount: 'sentenceCount'
    });

    this.updateStats();
    console.log('[Summarize] 초기화 완료');
    return this;
  }

  updateLength() {
    this.elements.lengthValue.textContent = this.elements.lengthSlider.value;
  }

  updateStats() {
    const text = this.elements.inputText.value;
    const words = text.trim().split(/\s+/).filter(w => w);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());

    this.elements.wordCount.textContent = words.length;
    this.elements.charCount.textContent = text.length;
    this.elements.sentenceCount.textContent = sentences.length;
  }

  async run() {
    const text = this.elements.inputText.value.trim();

    if (!text) {
      this.showToast('요약할 텍스트를 입력하세요.', 'warning');
      return;
    }

    if (text.length < 100) {
      this.showToast('최소 100자 이상 입력하세요.', 'warning');
      return;
    }

    this.showToast('요약 중... (데모 모드)', 'info');

    await new Promise(r => setTimeout(r, 1000));

    const length = parseInt(this.elements.lengthSlider.value);
    const bulletPoints = this.elements.bulletPoints.checked;

    const result = this.extractiveSummary(text, length, bulletPoints);
    this.elements.outputText.value = result;
  }

  extractiveSummary(text, lengthPercent, bulletPoints) {
    // 추출적 요약 (문장 중요도 기반)
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);

    if (sentences.length === 0) return text;

    // 문장 점수 계산 (간단한 휴리스틱)
    const scored = sentences.map((sentence, idx) => {
      let score = 0;

      // 첫 문장과 마지막 문장 가중치
      if (idx === 0) score += 3;
      if (idx === sentences.length - 1) score += 2;

      // 키워드 빈도
      const words = sentence.toLowerCase().split(/\s+/);
      this.keywords.forEach(kw => {
        if (sentence.toLowerCase().includes(kw)) score += 2;
      });

      // 길이 점수 (너무 짧거나 긴 문장 페널티)
      if (words.length > 5 && words.length < 30) score += 1;

      return { sentence, score, idx };
    });

    // 점수순 정렬 후 원래 순서로 재배열
    const targetCount = Math.max(1, Math.ceil(sentences.length * lengthPercent / 100));
    const selected = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, targetCount)
      .sort((a, b) => a.idx - b.idx);

    if (bulletPoints) {
      return selected.map(s => `• ${s.sentence}`).join('\n\n');
    }

    return selected.map(s => s.sentence).join('. ') + '.';
  }

  async copy() {
    const text = this.elements.outputText.value;
    if (!text) {
      this.showToast('복사할 결과가 없습니다.', 'warning');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      this.showSuccess('복사됨!');
    } catch (e) {
      this.showError('복사 실패');
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const summarize = new Summarize();
window.Summarize = summarize;

document.addEventListener('DOMContentLoaded', () => summarize.init());
