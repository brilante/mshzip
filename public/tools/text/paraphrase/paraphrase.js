/**
 * 패러프레이즈 - ToolBase 기반
 * AI 기반 문장 재작성 (프리미엄)
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var Paraphrase = class Paraphrase extends ToolBase {
  constructor() {
    super('Paraphrase');
    this.mode = 'standard';
    this.modes = {
      standard: '원문의 의미를 유지하면서 다르게 표현합니다.',
      fluent: '더 자연스럽고 읽기 쉬운 문장으로 변환합니다.',
      formal: '격식체와 전문적인 어투로 변환합니다.',
      simple: '간결하고 명확한 문장으로 요약합니다.'
    };
    this.replacements = {
      standard: [
        ['하다', '수행하다'],
        ['좋다', '훌륭하다'],
        ['나쁘다', '부정적이다'],
        ['많다', '다수의'],
        ['작다', '소규모의']
      ],
      fluent: [
        ['그러나', '하지만'],
        ['따라서', '그래서'],
        ['또한', '게다가'],
        ['즉', '다시 말해']
      ],
      formal: [
        ['해요', '합니다'],
        ['했어요', '했습니다'],
        ['거예요', '것입니다'],
        ['인데요', '입니다']
      ],
      simple: [
        ['매우 중요한', '핵심적인'],
        ['다양한 종류의', '여러'],
        ['~하는 것이 가능하다', '~할 수 있다']
      ]
    };
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      outputText: 'outputText',
      modeDesc: 'modeDesc'
    });

    console.log('[Paraphrase] 초기화 완료');
    return this;
  }

  setMode(btn) {
    document.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this.mode = btn.dataset.mode;
    this.elements.modeDesc.textContent = this.modes[this.mode];
  }

  async run() {
    const text = this.elements.inputText.value.trim();

    if (!text) {
      this.showToast('변환할 텍스트를 입력하세요.', 'warning');
      return;
    }

    this.showToast('변환 중... (데모 모드)', 'info');

    await new Promise(r => setTimeout(r, 1000));

    const result = this.simpleParaphrase(text);
    this.elements.outputText.value = result;
  }

  simpleParaphrase(text) {
    // 데모용 간단한 변환
    let result = text;
    const modeReplacements = this.replacements[this.mode] || [];

    modeReplacements.forEach(([from, to]) => {
      result = result.replace(new RegExp(from, 'g'), to);
    });

    // 문장 순서 약간 변경 (데모용)
    const sentences = result.split(/([.!?])\s*/).filter(s => s.trim());
    if (sentences.length > 3) {
      // 인접한 문장 교환
      const grouped = [];
      for (let i = 0; i < sentences.length; i += 2) {
        grouped.push(sentences[i] + (sentences[i + 1] || ''));
      }
      if (grouped.length > 2) {
        [grouped[1], grouped[2]] = [grouped[2], grouped[1]];
      }
      result = grouped.join(' ');
    }

    return result || text + ' (변환됨)';
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
const paraphrase = new Paraphrase();
window.Paraphrase = paraphrase;

document.addEventListener('DOMContentLoaded', () => paraphrase.init());
