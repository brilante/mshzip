/**
 * AI 요약 - ToolBase 기반
 * 긴 글을 핵심만 간결하게 요약
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class AiSummarizerTool extends ToolBase {
  constructor() {
    super('AiSummarizerTool');
    this.selectedModel = 'gpt-4o-mini';
    this.selectedLength = 'medium';
    this.selectedFormat = 'paragraph';
    this.summaryText = '';

    this.modelNames = {
      'gpt-4o-mini': 'GPT-4o Mini',
      'claude-3-haiku': 'Claude 3 Haiku',
      'gemini-2-flash': 'Gemini 2.0 Flash'
    };
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      outputArea: 'outputArea',
      loadingIndicator: 'loadingIndicator',
      originalWords: 'originalWords',
      summaryWords: 'summaryWords',
      compressionRate: 'compressionRate',
      timeSaved: 'timeSaved'
    });

    console.log('[AiSummarizerTool] 초기화 완료');
    return this;
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }

  selectLength(length) {
    this.selectedLength = length;
    document.querySelectorAll('.length-chip[data-length]').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.length === length);
    });
  }

  selectFormat(format) {
    this.selectedFormat = format;
    document.querySelectorAll('.length-chip[data-format]').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.format === format);
    });
  }

  async summarize() {
    const inputText = this.elements.inputText.value.trim();

    if (!inputText) {
      this.showToast('요약할 텍스트를 입력하세요.', 'error');
      return;
    }

    if (inputText.length < 100) {
      this.showToast('텍스트가 너무 짧습니다. 최소 100자 이상 입력하세요.', 'error');
      return;
    }

    // 로딩 표시
    const outputArea = this.elements.outputArea;
    const loadingIndicator = this.elements.loadingIndicator;
    outputArea.querySelector('.output-placeholder')?.remove();
    loadingIndicator.classList.add('active');

    // 시뮬레이션 딜레이
    await this.delay(1500 + Math.random() * 1000);

    // 요약 생성
    const summary = this.generateSummary(inputText);
    this.summaryText = summary;

    // 결과 표시
    loadingIndicator.classList.remove('active');
    outputArea.innerHTML = `<div style="white-space: pre-wrap; line-height: 1.8;">${summary}</div>`;

    // 통계 업데이트
    this.updateStats(inputText, summary);

    this.showToast(`${this.modelNames[this.selectedModel]}로 요약 완료!`);
  }

  generateSummary(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // 길이별 요약 비율
    const ratios = { short: 0.1, medium: 0.25, long: 0.4 };
    const ratio = ratios[this.selectedLength];

    // 형식별 요약 생성
    if (this.selectedFormat === 'bullets') {
      return this.generateBulletSummary(sentences, ratio);
    } else if (this.selectedFormat === 'keypoints') {
      return this.generateKeyPointsSummary(sentences);
    } else {
      return this.generateParagraphSummary(sentences, ratio);
    }
  }

  generateParagraphSummary(sentences, ratio) {
    const numSentences = Math.max(2, Math.floor(sentences.length * ratio));
    const selectedSentences = sentences.slice(0, numSentences);

    return `**요약 (${this.modelNames[this.selectedModel]})**

${selectedSentences.join('. ').trim()}.

---
*${this.selectedLength === 'short' ? '간략' : this.selectedLength === 'long' ? '상세' : '보통'} 요약 | ${this.modelNames[this.selectedModel]}*`;
  }

  generateBulletSummary(sentences, ratio) {
    const numPoints = Math.max(3, Math.floor(sentences.length * ratio));
    const selectedSentences = sentences.slice(0, numPoints);

    const bullets = selectedSentences.map(s => `• ${s.trim()}`).join('\n');

    return `**글머리 요약 (${this.modelNames[this.selectedModel]})**

${bullets}

---
*${numPoints}개 핵심 포인트 | ${this.modelNames[this.selectedModel]}*`;
  }

  generateKeyPointsSummary(sentences) {
    const keyPoints = sentences.slice(0, 5).map((s, i) => `${i + 1}. ${s.trim()}`).join('\n\n');

    return `**핵심 포인트 (${this.modelNames[this.selectedModel]})**

${keyPoints}

---
*핵심 ${Math.min(5, sentences.length)}개 추출 | ${this.modelNames[this.selectedModel]}*`;
  }

  updateStats(original, summary) {
    const originalWords = original.split(/\s+/).filter(w => w.length > 0).length;
    const summaryWords = summary.split(/\s+/).filter(w => w.length > 0).length;
    const compressionRate = Math.round((1 - summaryWords / originalWords) * 100);
    const timeSaved = Math.max(1, Math.round((originalWords - summaryWords) / 200));

    this.elements.originalWords.textContent = originalWords;
    this.elements.summaryWords.textContent = summaryWords;
    this.elements.compressionRate.textContent = compressionRate + '%';
    this.elements.timeSaved.textContent = timeSaved + '분';
  }

  copy() {
    if (!this.summaryText) {
      this.showToast('복사할 요약이 없습니다.', 'error');
      return;
    }
    this.copyToClipboard(this.summaryText);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const aiSummarizerTool = new AiSummarizerTool();
window.AISummarizer = aiSummarizerTool;

document.addEventListener('DOMContentLoaded', () => aiSummarizerTool.init());
console.log('[AiSummarizerTool] 모듈 로드 완료');
