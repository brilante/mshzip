/**
 * AI 재작성 - ToolBase 기반
 * 글을 다른 스타일로 다시 작성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class AiRewriterTool extends ToolBase {
  constructor() {
    super('AiRewriterTool');
    this.selectedModel = 'gpt-4o-mini';
    this.selectedStyle = 'formal';
    this.rewrittenText = '';

    this.modelNames = {
      'gpt-4o-mini': 'GPT-4o Mini',
      'claude-3-haiku': 'Claude 3 Haiku',
      'gemini-2-flash': 'Gemini 2.0 Flash'
    };

    this.styleDescriptions = {
      formal: '격식체 - 공식적이고 정중한 표현',
      casual: '캐주얼 - 편안하고 친근한 표현',
      simple: '간결하게 - 짧고 명확한 표현',
      detailed: '상세하게 - 풍부한 설명과 예시',
      creative: '창의적 - 독창적이고 참신한 표현',
      academic: '학술적 - 논문/보고서 스타일',
      seo: 'SEO 최적화 - 검색엔진 친화적',
      emotional: '감성적 - 감정이 담긴 표현'
    };
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      outputArea: 'outputArea',
      loadingIndicator: 'loadingIndicator'
    });

    console.log('[AiRewriterTool] 초기화 완료');
    return this;
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
  }

  selectStyle(style) {
    this.selectedStyle = style;
    document.querySelectorAll('.style-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.style === style);
    });
  }

  async rewrite() {
    const inputText = this.elements.inputText.value.trim();

    if (!inputText) {
      this.showToast('재작성할 텍스트를 입력하세요.', 'error');
      return;
    }

    // 로딩 표시
    const outputArea = this.elements.outputArea;
    const loadingIndicator = this.elements.loadingIndicator;
    outputArea.querySelector('.output-placeholder')?.remove();
    loadingIndicator.classList.add('active');

    // 시뮬레이션 딜레이
    await this.delay(1500 + Math.random() * 1000);

    // 재작성 생성
    const rewritten = this.generateRewrite(inputText);
    this.rewrittenText = rewritten;

    // 결과 표시
    loadingIndicator.classList.remove('active');
    outputArea.innerHTML = `<div style="white-space: pre-wrap; line-height: 1.8;">${rewritten}</div>`;

    this.showToast(`${this.modelNames[this.selectedModel]}로 재작성 완료!`);
  }

  generateRewrite(text) {
    const styleDesc = this.styleDescriptions[this.selectedStyle];

    const rewrites = {
      formal: this.toFormal(text),
      casual: this.toCasual(text),
      simple: this.toSimple(text),
      detailed: this.toDetailed(text),
      creative: this.toCreative(text),
      academic: this.toAcademic(text),
      seo: this.toSEO(text),
      emotional: this.toEmotional(text)
    };

    return `**${styleDesc}으로 재작성됨**

${rewrites[this.selectedStyle]}

---
*${this.modelNames[this.selectedModel]} | ${this.selectedStyle} 스타일*`;
  }

  toFormal(text) {
    return `귀하께서 말씀하신 내용을 정리하면 다음과 같습니다.

${text}

위 내용에 대해 검토하시고 추가 의견이 있으시면 말씀해 주시기 바랍니다.`;
  }

  toCasual(text) {
    return `안녕하세요! ${text}

어떻게 생각하세요? 궁금한 점 있으시면 편하게 물어봐 주세요~`;
  }

  toSimple(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const shortened = sentences.slice(0, 3).map(s => s.trim()).join('. ');
    return `핵심만 정리:

${shortened}.`;
  }

  toDetailed(text) {
    return `다음은 해당 내용에 대한 상세한 설명입니다.

**개요**
${text}

**부연 설명**
위 내용을 좀 더 자세히 살펴보면, 여러 가지 중요한 포인트가 있습니다. 먼저, 핵심 개념을 이해하는 것이 중요하며, 이를 바탕으로 실제 적용 방안을 모색할 수 있습니다.

**결론**
이상의 내용을 종합하면, 효과적인 결과를 얻을 수 있을 것입니다.`;
  }

  toCreative(text) {
    return `창의적으로 다시 쓴다면...

"${text}"

이 말을 들으면 마치 새벽의 첫 햇살이 어둠을 밀어내듯, 새로운 가능성의 문이 열리는 것 같지 않나요? `;
  }

  toAcademic(text) {
    return `1. 서론

본 연구에서는 다음과 같은 주제를 다루고자 한다.

2. 본론

${text}

상기 내용은 선행 연구(Kim et al., 2024)의 결과와 일맥상통한다.

3. 결론

향후 연구에서는 보다 심층적인 분석이 필요할 것으로 사료된다.

참고문헌은 별도 첨부 참조.`;
  }

  toSEO(text) {
    const keywords = text.split(/\s+/).filter(w => w.length > 3).slice(0, 5);

    return `**[SEO 최적화 버전]**

${text}

**관련 키워드:** ${keywords.join(', ')}

**메타 설명:** ${text.substring(0, 150)}...

**해시태그:** #${keywords.join(' #')}`;
  }

  toEmotional(text) {
    return `마음을 담아 다시 전합니다...

${text}

이 글을 읽으시는 분께 작은 위로와 따뜻함이 전해지길 바랍니다. 오늘도 좋은 하루 되세요! `;
  }

  copy() {
    if (!this.rewrittenText) {
      this.showToast('복사할 내용이 없습니다.', 'error');
      return;
    }
    this.copyToClipboard(this.rewrittenText);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const aiRewriterTool = new AiRewriterTool();
window.AIRewriter = aiRewriterTool;

document.addEventListener('DOMContentLoaded', () => aiRewriterTool.init());
console.log('[AiRewriterTool] 모듈 로드 완료');
