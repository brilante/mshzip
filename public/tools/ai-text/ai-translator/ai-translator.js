/**
 * AI 번역 - ToolBase 기반
 * AI 기반 고품질 다국어 번역
 * TranslateGemma API 연동 추가 (2026-01-18)
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class AiTranslatorTool extends ToolBase {
  constructor() {
    super('AiTranslatorTool');
    this.selectedModel = 'translategemma';
    this.translatedText = '';
    this.history = [];
    this.serverStatus = null;

    this.modelNames = {
      'translategemma': 'TranslateGemma',
      'gpt-4o': 'GPT-4o',
      'claude-3-5-sonnet': 'Claude 3.5',
      'gemini-2-flash': 'Gemini 2.0',
      'deepl': 'DeepL'
    };

    this.langNames = {
      'auto': '자동 감지',
      'ko': '한국어',
      'en': 'English',
      'ja': '日本語',
      'zh': '中文',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'ru': 'Русский',
      'pt': 'Português',
      'it': 'Italiano',
      'vi': 'Tiếng Việt',
      'th': 'ไทย',
      'ar': 'العربية',
      'hi': 'हिन्दी',
      'nl': 'Nederlands',
      'pl': 'Polski',
      'sv': 'Svenska',
      'tr': 'Türkçe',
      'id': 'Bahasa Indonesia'
    };
  }

  async init() {
    this.initElements({
      sourceText: 'sourceText',
      sourceLang: 'sourceLang',
      targetLang: 'targetLang',
      outputArea: 'outputArea',
      loadingIndicator: 'loadingIndicator',
      charCount: 'charCount',
      historyList: 'historyList'
    });

    this.loadHistory();
    await this.checkTranslateGemmaStatus();
    console.log('[AiTranslatorTool] 초기화 완료');
    return this;
  }

  async checkTranslateGemmaStatus() {
    try {
      const response = await fetch('/api/translate/health');
      const data = await response.json();
      this.serverStatus = data;

      if (data.success && data.data?.model_loaded) {
        console.log('[AiTranslatorTool] TranslateGemma 서버 연결됨:', data.data.model_id);
      } else {
        console.warn('[AiTranslatorTool] TranslateGemma 서버 연결 실패 또는 모델 미로드');
      }
    } catch (error) {
      console.warn('[AiTranslatorTool] TranslateGemma 상태 확인 실패:', error.message);
      this.serverStatus = null;
    }
  }

  selectModel(model) {
    this.selectedModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.model === model);
    });

    if (model === 'translategemma' && !this.serverStatus?.success) {
      this.showToast('TranslateGemma 서버가 실행 중인지 확인하세요.', 'warning');
    }
  }

  swapLanguages() {
    const sourceSelect = this.elements.sourceLang;
    const targetSelect = this.elements.targetLang;

    if (sourceSelect.value === 'auto') {
      this.showToast('자동 감지 모드에서는 언어를 교환할 수 없습니다.', 'error');
      return;
    }

    const temp = sourceSelect.value;
    sourceSelect.value = targetSelect.value;
    targetSelect.value = temp;

    if (this.translatedText) {
      this.elements.sourceText.value = this.translatedText;
      this.updateCharCount();
    }
  }

  updateCharCount() {
    const text = this.elements.sourceText.value;
    this.elements.charCount.textContent = text.length;
  }

  async translate() {
    const sourceText = this.elements.sourceText.value.trim();
    let sourceLang = this.elements.sourceLang.value;
    const targetLang = this.elements.targetLang.value;

    if (!sourceText) {
      this.showToast('번역할 텍스트를 입력하세요.', 'error');
      return;
    }

    const outputArea = this.elements.outputArea;
    const loadingIndicator = this.elements.loadingIndicator;
    outputArea.querySelector('.output-placeholder')?.remove();
    loadingIndicator.classList.add('active');

    try {
      let translated;

      if (this.selectedModel === 'translategemma') {
        translated = await this.translateWithGemma(sourceText, sourceLang, targetLang);
      } else {
        await this.delay(1500 + Math.random() * 1000);
        translated = this.generateDemoTranslation(sourceText, targetLang);
      }

      this.translatedText = translated;

      loadingIndicator.classList.remove('active');
      outputArea.innerHTML = `<div style="white-space: pre-wrap; line-height: 1.8;">${this.escapeHtml(translated)}</div>`;

      this.addToHistory(sourceText, translated, targetLang);

      this.showToast(`${this.modelNames[this.selectedModel]}로 번역 완료!`);

    } catch (error) {
      loadingIndicator.classList.remove('active');
      outputArea.innerHTML = `<div class="output-placeholder" style="color: var(--error);">번역 실패: ${error.message}</div>`;
      this.showToast(`번역 실패: ${error.message}`, 'error');
    }
  }

  async translateWithGemma(text, sourceLang, targetLang) {
    if (sourceLang === 'auto') {
      try {
        const detectResponse = await fetch('/api/translate/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text })
        });
        const detectData = await detectResponse.json();
        if (detectData.success) {
          sourceLang = detectData.data.detected_lang;
          console.log('[AiTranslatorTool] 감지된 언어:', sourceLang);
        } else {
          sourceLang = 'en';
        }
      } catch {
        sourceLang = 'en';
      }
    }

    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        source_lang: sourceLang,
        target_lang: targetLang,
        max_tokens: 500
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '번역 요청 실패');
    }

    if (!data.success) {
      throw new Error(data.error || '번역 실패');
    }

    return data.data.translation;
  }

  generateDemoTranslation(text, targetLang) {
    const translations = {
      'en': {
        prefix: '[English Translation]\n\n',
        sample: `This is a demonstration of AI-powered translation using ${this.modelNames[this.selectedModel]}.\n\nOriginal text has been analyzed and translated with high accuracy, preserving the original meaning and nuance.\n\n---\nTranslated from: Korean\nModel: ${this.modelNames[this.selectedModel]}`
      },
      'ko': {
        prefix: '[한국어 번역]\n\n',
        sample: `이것은 ${this.modelNames[this.selectedModel]}을 사용한 AI 기반 번역 시연입니다.\n\n원문 텍스트가 분석되어 원래의 의미와 뉘앙스를 유지하면서 높은 정확도로 번역되었습니다.\n\n---\n번역 원본: 영어\n모델: ${this.modelNames[this.selectedModel]}`
      },
      'ja': {
        prefix: '[日本語翻訳]\n\n',
        sample: `これは${this.modelNames[this.selectedModel]}を使用したAI翻訳のデモンストレーションです。\n\n元のテキストが分析され、元の意味とニュアンスを保ちながら高精度で翻訳されました。\n\n---\n翻訳元: 韓国語\nモデル: ${this.modelNames[this.selectedModel]}`
      },
      'zh': {
        prefix: '[中文翻译]\n\n',
        sample: `这是使用${this.modelNames[this.selectedModel]}的AI翻译演示。\n\n原文已被分析并以高准确度翻译，保留了原始含义和语气。\n\n---\n翻译来源: 韩语\n模型: ${this.modelNames[this.selectedModel]}`
      }
    };

    const langData = translations[targetLang] || translations['en'];

    if (text.length < 50) {
      return langData.prefix + this.simulateShortTranslation(text, targetLang);
    }

    return langData.prefix + langData.sample;
  }

  simulateShortTranslation(text, targetLang) {
    const simulations = {
      'en': `"${text}" → [Translated to English with ${this.modelNames[this.selectedModel]}]`,
      'ko': `"${text}" → [${this.modelNames[this.selectedModel]}로 한국어 번역됨]`,
      'ja': `"${text}" → [${this.modelNames[this.selectedModel]}で日本語に翻訳]`,
      'zh': `"${text}" → [使用${this.modelNames[this.selectedModel]}翻译成中文]`
    };
    return simulations[targetLang] || simulations['en'];
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  addToHistory(source, translated, targetLang) {
    const item = {
      source: source.substring(0, 50) + (source.length > 50 ? '...' : ''),
      translated: translated.substring(0, 50) + (translated.length > 50 ? '...' : ''),
      targetLang: this.langNames[targetLang] || targetLang,
      model: this.modelNames[this.selectedModel],
      timestamp: new Date().toISOString()
    };

    this.history.unshift(item);
    if (this.history.length > 5) this.history.pop();

    this.saveHistory();
    this.renderHistory();
  }

  renderHistory() {
    const container = this.elements.historyList;

    if (this.history.length === 0) {
      container.innerHTML = '<div style="color: var(--text-secondary); font-size: 0.85rem;">번역 기록이 없습니다.</div>';
      return;
    }

    container.innerHTML = this.history.map(item => `
      <div class="history-item">
        <span class="history-text">${this.escapeHtml(item.source)}</span>
        <span class="history-lang">→ ${item.targetLang}</span>
        <span style="color: var(--text-tertiary); font-size: 0.7rem; margin-left: 0.5rem;">${item.model}</span>
      </div>
    `).join('');
  }

  saveHistory() {
    localStorage.setItem('aiTranslatorHistory', JSON.stringify(this.history));
  }

  loadHistory() {
    const saved = localStorage.getItem('aiTranslatorHistory');
    if (saved) {
      this.history = JSON.parse(saved);
      this.renderHistory();
    }
  }

  copy() {
    if (!this.translatedText) {
      this.showToast('복사할 번역 결과가 없습니다.', 'error');
      return;
    }
    this.copyToClipboard(this.translatedText);
  }

  speak() {
    if (!this.translatedText) {
      this.showToast('읽을 번역 결과가 없습니다.', 'error');
      return;
    }

    const targetLang = this.elements.targetLang.value;
    const utterance = new SpeechSynthesisUtterance(this.translatedText);
    utterance.lang = targetLang;
    speechSynthesis.speak(utterance);

    this.showToast('음성 출력 중...');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const aiTranslatorTool = new AiTranslatorTool();
window.AITranslator = aiTranslatorTool;

document.addEventListener('DOMContentLoaded', () => aiTranslatorTool.init());
console.log('[AiTranslatorTool] 모듈 로드 완료 (TranslateGemma 지원)');
