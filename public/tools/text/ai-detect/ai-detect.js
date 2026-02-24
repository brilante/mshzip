/**
 * AI 탐지 - ToolBase 기반
 * AI 생성 텍스트 감지 (프리미엄)
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var AiDetect = class AiDetect extends ToolBase {
  constructor() {
    super('AiDetect');
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      meterPointer: 'meterPointer',
      aiPercent: 'aiPercent',
      complexity: 'complexity',
      vocabulary: 'vocabulary',
      pattern: 'pattern',
      naturalness: 'naturalness'
    });

    console.log('[AiDetect] 초기화 완료');
    return this;
  }

  async analyze() {
    const text = this.elements.textInput.value.trim();

    if (!text) {
      this.showToast('분석할 텍스트를 입력하세요.', 'warning');
      return;
    }

    if (text.length < 100) {
      this.showToast('최소 100자 이상 입력하세요.', 'warning');
      return;
    }

    this.showToast('분석 중... (데모 모드)', 'info');

    await new Promise(r => setTimeout(r, 1500));

    const result = this.simulateAnalysis(text);
    this.displayResults(result);
  }

  simulateAnalysis(text) {
    // 데모용 분석 시뮬레이션
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;

    // 간단한 휴리스틱 (실제 AI 탐지와는 다름)
    let aiScore = 50;

    // 문장 길이가 매우 균일하면 AI 점수 증가
    const sentenceLengths = sentences.map(s => s.split(/\s+/).length);
    const variance = this.calculateVariance(sentenceLengths);
    if (variance < 10) aiScore += 15;

    // 어휘 다양성 낮으면 AI 점수 증가
    const lexicalDiversity = uniqueWords / words.length;
    if (lexicalDiversity < 0.5) aiScore += 10;

    // 랜덤 노이즈 추가
    aiScore += Math.floor(Math.random() * 20) - 10;
    aiScore = Math.max(5, Math.min(95, aiScore));

    return {
      aiPercent: aiScore,
      complexity: variance > 15 ? '높음' : variance > 8 ? '보통' : '낮음',
      vocabulary: lexicalDiversity > 0.6 ? '다양함' : lexicalDiversity > 0.4 ? '보통' : '제한적',
      pattern: aiScore > 60 ? '일관됨' : '다양함',
      naturalness: aiScore < 40 ? '자연스러움' : aiScore < 70 ? '보통' : '기계적'
    };
  }

  calculateVariance(arr) {
    if (arr.length === 0) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  }

  displayResults({ aiPercent, complexity, vocabulary, pattern, naturalness }) {
    this.elements.meterPointer.style.left = aiPercent + '%';

    this.elements.aiPercent.textContent = aiPercent + '%';

    if (aiPercent < 30) {
      this.elements.aiPercent.style.color = '#22c55e';
    } else if (aiPercent < 70) {
      this.elements.aiPercent.style.color = '#f59e0b';
    } else {
      this.elements.aiPercent.style.color = '#ef4444';
    }

    this.elements.complexity.textContent = complexity;
    this.elements.vocabulary.textContent = vocabulary;
    this.elements.pattern.textContent = pattern;
    this.elements.naturalness.textContent = naturalness;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const aiDetect = new AiDetect();
window.AiDetect = aiDetect;

document.addEventListener('DOMContentLoaded', () => aiDetect.init());
