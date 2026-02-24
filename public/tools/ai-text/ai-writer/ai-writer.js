/**
 * AI 글쓰기 - ToolBase 기반
 * AI가 다양한 글을 작성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class AiWriterTool extends ToolBase {
  constructor() {
    super('AiWriterTool');
    this.selectedModel = 'gpt-4o';
    this.selectedType = 'blog';
    this.selectedTone = 'professional';
    this.generatedText = '';

    this.modelNames = {
      'gpt-4o': 'GPT-4o',
      'claude-3-5-sonnet': 'Claude 3.5',
      'gemini-2-flash': 'Gemini 2.0',
      'grok-3': 'Grok 3'
    };

    this.typeTemplates = {
      blog: { prefix: '블로그 글', structure: '서론, 본론(3-4 섹션), 결론' },
      email: { prefix: '이메일', structure: '인사말, 본문, 마무리' },
      sns: { prefix: 'SNS 게시글', structure: '후크, 본문, CTA, 해시태그' },
      ad: { prefix: '광고 문구', structure: '헤드라인, 서브헤드, 본문, CTA' },
      essay: { prefix: '에세이', structure: '도입, 전개, 결론' },
      story: { prefix: '스토리', structure: '시작, 전개, 클라이맥스, 결말' },
      report: { prefix: '보고서', structure: '개요, 분석, 결론, 권장사항' },
      product: { prefix: '제품 설명', structure: '특징, 장점, 사용법, 구매 유도' }
    };

    this.toneStyles = {
      professional: '전문적이고 신뢰감 있는',
      casual: '편안하고 친근한',
      friendly: '따뜻하고 친절한',
      formal: '격식을 갖춘 정중한',
      humorous: '재치있고 유머러스한',
      persuasive: '설득력 있고 강렬한'
    };
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      outputArea: 'outputArea',
      loadingIndicator: 'loadingIndicator',
      selectedModel: 'selectedModel',
      wordCount: 'wordCount',
      charCount: 'charCount',
      readTime: 'readTime'
    });

    this.elements.selectedModel.textContent = this.modelNames[this.selectedModel];
    console.log('[AiWriterTool] 초기화 완료');
    return this;
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });
    this.elements.selectedModel.textContent = this.modelNames[model];
  }

  selectType(type) {
    this.selectedType = type;
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
  }

  selectTone(tone) {
    this.selectedTone = tone;
    document.querySelectorAll('.tone-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.tone === tone);
    });
  }

  async generate() {
    const input = this.elements.inputText.value.trim();

    if (!input) {
      this.showToast('주제나 키워드를 입력하세요.', 'error');
      return;
    }

    const outputArea = this.elements.outputArea;
    const loadingIndicator = this.elements.loadingIndicator;
    outputArea.querySelector('.output-placeholder')?.remove();
    loadingIndicator.classList.add('active');

    await this.delay(2000 + Math.random() * 1500);

    const generatedText = this.generateDemoText(input);
    this.generatedText = generatedText;

    loadingIndicator.classList.remove('active');
    await this.typeText(outputArea, generatedText);

    this.updateStats(generatedText);

    this.showToast(`${this.modelNames[this.selectedModel]}로 글 작성 완료!`);
  }

  generateDemoText(topic) {
    const toneDesc = this.toneStyles[this.selectedTone];

    const templates = {
      blog: `# ${topic}

## 서론

오늘은 "${topic}"에 대해 이야기해보려고 합니다. 이 주제는 최근 많은 관심을 받고 있으며, 우리 일상에 큰 영향을 미치고 있습니다.

## 본론

### 1. 현황과 배경

${topic}은(는) 다양한 측면에서 우리 사회에 영향을 미치고 있습니다. 특히 최근 몇 년간 급격한 변화가 있었으며, 이는 기술 발전과 사회적 인식 변화가 주요 원인입니다.

### 2. 주요 특징

이 분야의 핵심적인 특징들을 살펴보면:
- 첫째, 빠른 성장세를 보이고 있습니다
- 둘째, 다양한 산업에 적용 가능합니다
- 셋째, 미래 발전 가능성이 높습니다

### 3. 실제 사례

실제로 많은 기업과 개인들이 ${topic}을(를) 활용하여 놀라운 성과를 거두고 있습니다.

## 결론

${topic}은(는) 앞으로도 계속해서 발전할 것으로 예상됩니다. 우리 모두 이 변화에 주목하고 적극적으로 대응해 나가야 할 것입니다.

---
*이 글은 ${this.modelNames[this.selectedModel]}에 의해 ${toneDesc} 톤으로 작성되었습니다.*`,

      email: `제목: ${topic}에 관한 문의

안녕하세요,

${topic}에 대해 문의드리고자 연락드렸습니다.

저희 팀에서는 ${topic}과(와) 관련하여 몇 가지 사항을 검토하고 있으며, 귀사의 의견을 듣고 싶습니다.

주요 문의 사항:
1. 현재 진행 상황은 어떠한가요?
2. 향후 계획이 있으신가요?
3. 협업 가능성은 어떻게 보시나요?

시간이 허락하신다면 다음 주 중으로 미팅을 잡아 자세한 논의를 진행하면 좋겠습니다.

감사합니다.
좋은 하루 되세요.

---
*${this.modelNames[this.selectedModel]}로 작성됨*`,

      sns: `${topic} 요즘 가장 핫한 주제! 바로 ${topic}입니다 여러분은 어떻게 생각하시나요?
저는 정말 흥미롭게 지켜보고 있어요 핵심 포인트:
• 트렌드를 선도하는 새로운 변화
• 우리 일상에 미치는 영향
• 앞으로의 발전 방향

여러분의 생각을 댓글로 남겨주세요! #${topic.replace(/\s/g, '')} #트렌드 #일상 #인사이트 #공유

---
${this.modelNames[this.selectedModel]}`,

      ad: `${topic} - 지금 바로 시작하세요!

당신이 찾던 바로 그것!
${topic}으로 새로운 경험을 만나보세요.

검증된 품질
합리적인 가격
빠른 배송
100% 만족 보장

지금 주문하시면 특별 할인!

[지금 바로 확인하기]

*${this.modelNames[this.selectedModel]} 제작*`,

      essay: `${topic}에 대한 소고

${topic}이라는 주제를 마주할 때, 우리는 자연스럽게 그 의미와 가치에 대해 생각하게 됩니다.

현대 사회에서 ${topic}은(는) 단순한 개념을 넘어 우리 삶의 중요한 부분으로 자리 잡았습니다. 이것이 가져다주는 변화와 영향력은 결코 무시할 수 없으며, 앞으로도 그 중요성은 더욱 커질 것으로 예상됩니다.

특히 주목할 만한 점은 ${topic}이(가) 다양한 분야에 걸쳐 영향을 미치고 있다는 것입니다. 경제, 사회, 문화 등 거의 모든 영역에서 그 흔적을 찾아볼 수 있습니다.

결론적으로, ${topic}은(는) 우리가 더 깊이 이해하고 연구해야 할 가치 있는 주제입니다.

---
*${this.modelNames[this.selectedModel]} | ${toneDesc} 스타일*`,

      story: `[${topic}]

어느 평범한 날이었다.

주인공은 늘 그랬듯이 일상을 보내고 있었다. 그러나 오늘은 뭔가 달랐다. ${topic}과(와) 관련된 특별한 일이 일어날 것 같은 예감이 들었다.

그리고 그 예감은 틀리지 않았다.

갑자기 눈앞에 펼쳐진 광경에 주인공은 말을 잃었다. 이것이 바로 ${topic}의 진정한 모습이었던 것이다.

"이런... 정말 놀라워."

주인공의 여정은 이제 막 시작되었다.

[계속...]

---
${this.modelNames[this.selectedModel]} 스토리`,

      report: `# ${topic} 분석 보고서

## 1. 개요

본 보고서는 ${topic}에 대한 종합적인 분석을 목적으로 작성되었습니다.

## 2. 현황 분석

### 2.1 시장 동향
- 전년 대비 15% 성장
- 신규 진입자 증가
- 기술 혁신 가속화

### 2.2 주요 이슈
- 규제 환경 변화
- 소비자 니즈 다변화
- 경쟁 심화

## 3. 결론 및 권장사항

${topic} 분야는 지속적인 성장이 예상되며, 다음 사항을 권장합니다:

1. 기술 투자 확대
2. 인력 양성 강화
3. 파트너십 구축

---
${this.modelNames[this.selectedModel]} 분석`,

      product: `${topic} 당신의 일상을 바꿀 혁신적인 제품!

【 주요 특징 】
최신 기술 적용
프리미엄 품질
세련된 디자인
편리한 사용성

【 이런 분께 추천 】
• 새로운 경험을 원하시는 분
• 품질을 중시하시는 분
• 트렌드를 선도하고 싶으신 분

【 구매 혜택 】
무료 배송
1년 무상 A/S
30일 환불 보장

지금 바로 ${topic}의 특별함을 경험하세요!

---
*${this.modelNames[this.selectedModel]} 제작*`
    };

    return templates[this.selectedType] || templates.blog;
  }

  async typeText(element, text) {
    element.innerHTML = '';
    const pre = document.createElement('div');
    pre.style.whiteSpace = 'pre-wrap';
    element.appendChild(pre);

    const chunks = text.match(/.{1,10}/g) || [];
    for (const chunk of chunks) {
      pre.textContent += chunk;
      await this.delay(20);
    }
  }

  updateStats(text) {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = text.length;
    const readTime = Math.max(1, Math.ceil(words / 200));

    this.elements.wordCount.textContent = words;
    this.elements.charCount.textContent = chars;
    this.elements.readTime.textContent = readTime + '분';
  }

  copy() {
    if (!this.generatedText) {
      this.showToast('복사할 내용이 없습니다.', 'error');
      return;
    }
    this.copyToClipboard(this.generatedText);
  }

  clear() {
    this.elements.inputText.value = '';
    this.elements.outputArea.innerHTML = '<div class="output-placeholder">AI가 작성한 글이 여기에 표시됩니다.</div><div class="loading-indicator" id="loadingIndicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span><span style="margin-left: 0.5rem;">AI가 글을 작성 중입니다...</span></div>';
    this.generatedText = '';
    this.elements.wordCount.textContent = '0';
    this.elements.charCount.textContent = '0';
    this.elements.readTime.textContent = '0분';
    this.showToast('초기화되었습니다.');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const aiWriterTool = new AiWriterTool();
window.AIWriter = aiWriterTool;

document.addEventListener('DOMContentLoaded', () => aiWriterTool.init());
console.log('[AiWriterTool] 모듈 로드 완료');
