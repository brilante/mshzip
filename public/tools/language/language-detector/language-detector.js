/**
 * 언어 감지기 - ToolBase 기반
 * 텍스트 입력 시 자동으로 언어 감지
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class LanguageDetector extends ToolBase {
  constructor() {
    super('LanguageDetector');

    this.languages = {
      ko: { name: '한국어', native: '한국어', flag: '🇰🇷', patterns: ['은', '는', '이', '가', '을', '를', '에', '에서', '으로', '니다', '습니다', '하다', '있다', '없다'] },
      en: { name: '영어', native: 'English', flag: '🇺🇸', patterns: ['the', 'is', 'are', 'was', 'were', 'have', 'has', 'been', 'will', 'would', 'could', 'should', 'that', 'this', 'with'] },
      ja: { name: '일본어', native: '日本語', flag: '🇯🇵', patterns: ['です', 'ます', 'した', 'ない', 'ある', 'いる', 'する', 'なる', 'から', 'まで', 'より', 'ため'] },
      zh: { name: '중국어', native: '中文', flag: '🇨🇳', patterns: ['的', '是', '不', '了', '在', '人', '有', '我', '他', '这', '中', '大', '来', '上', '为'] },
      es: { name: '스페인어', native: 'Español', flag: '🇪🇸', patterns: ['el', 'la', 'los', 'las', 'que', 'de', 'en', 'un', 'una', 'por', 'con', 'para', 'como', 'más', 'pero'] },
      fr: { name: '프랑스어', native: 'Français', flag: '🇫🇷', patterns: ['le', 'la', 'les', 'un', 'une', 'de', 'du', 'des', 'est', 'sont', 'qui', 'que', 'dans', 'pour', 'avec'] },
      de: { name: '독일어', native: 'Deutsch', flag: '🇩🇪', patterns: ['der', 'die', 'das', 'und', 'ist', 'von', 'mit', 'nicht', 'sich', 'auch', 'auf', 'für', 'als', 'werden', 'oder'] },
      pt: { name: '포르투갈어', native: 'Português', flag: '🇵🇹', patterns: ['o', 'a', 'os', 'as', 'um', 'uma', 'de', 'que', 'do', 'da', 'em', 'para', 'com', 'não', 'por'] },
      ru: { name: '러시아어', native: 'Русский', flag: '🇷🇺', patterns: ['и', 'в', 'не', 'на', 'я', 'что', 'он', 'с', 'как', 'это', 'но', 'они', 'мы', 'так', 'все'] },
      ar: { name: '아랍어', native: 'العربية', flag: '🇸🇦', patterns: ['و', 'في', 'من', 'على', 'أن', 'إلى', 'هذا', 'الذي', 'هو', 'ما', 'لا', 'كان', 'عن', 'هي'] },
      hi: { name: '힌디어', native: 'हिन्दी', flag: '🇮🇳', patterns: ['है', 'हैं', 'का', 'की', 'के', 'में', 'को', 'से', 'और', 'एक', 'यह', 'हो', 'था', 'पर'] },
      th: { name: '태국어', native: 'ไทย', flag: '🇹🇭', patterns: ['ที่', 'และ', 'ใน', 'ของ', 'เป็น', 'ได้', 'จะ', 'มี', 'ไม่', 'นี้', 'ให้', 'ว่า', 'กับ'] },
      vi: { name: '베트남어', native: 'Tiếng Việt', flag: '🇻🇳', patterns: ['là', 'của', 'và', 'có', 'được', 'trong', 'không', 'này', 'cho', 'với', 'một', 'để', 'các'] },
      it: { name: '이탈리아어', native: 'Italiano', flag: '🇮🇹', patterns: ['il', 'la', 'di', 'che', 'e', 'un', 'una', 'per', 'in', 'con', 'non', 'sono', 'della', 'dei'] }
    };

    this.scripts = {
      'Hangul': /[가-힯ᄀ-ᇿ]/,
      'Hiragana': /[぀-ゟ]/,
      'Katakana': /[゠-ヿ]/,
      'CJK': /[一-鿿]/,
      'Cyrillic': /[Ѐ-ӿ]/,
      'Arabic': /[؀-ۿ]/,
      'Devanagari': /[ऀ-ॿ]/,
      'Thai': /[฀-๿]/,
      'Latin': /[A-Za-z]/
    };
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      charCount: 'charCount',
      sentenceCount: 'sentenceCount',
      wordCount: 'wordCount',
      scriptType: 'scriptType',
      languageFlag: 'languageFlag',
      languageName: 'languageName',
      languageNative: 'languageNative',
      confidenceFill: 'confidenceFill',
      confidenceValue: 'confidenceValue',
      otherLanguages: 'otherLanguages'
    });

    this.elements.inputText.addEventListener('input', () => this.updateUI());
    this.updateUI();

    console.log('[LanguageDetector] 초기화 완료');
    return this;
  }

  detectScript(text) {
    const counts = {};
    for (const [name, regex] of Object.entries(this.scripts)) {
      const matches = text.match(new RegExp(regex, 'g'));
      counts[name] = matches ? matches.length : 0;
    }

    const maxScript = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return maxScript[1] > 0 ? maxScript[0] : 'Unknown';
  }

  detectLanguage(text) {
    if (!text || text.trim().length < 3) {
      return { results: [], script: 'Unknown' };
    }

    const script = this.detectScript(text);
    const lowerText = text.toLowerCase();
    const scores = {};

    let candidates = Object.keys(this.languages);
    if (script === 'Hangul') candidates = ['ko'];
    else if (script === 'Hiragana' || script === 'Katakana') candidates = ['ja'];
    else if (script === 'CJK') candidates = ['zh', 'ja'];
    else if (script === 'Cyrillic') candidates = ['ru'];
    else if (script === 'Arabic') candidates = ['ar'];
    else if (script === 'Devanagari') candidates = ['hi'];
    else if (script === 'Thai') candidates = ['th'];

    for (const langCode of candidates) {
      const lang = this.languages[langCode];
      let score = 0;

      for (const pattern of lang.patterns) {
        const regex = new RegExp(pattern, 'gi');
        const matches = lowerText.match(regex);
        if (matches) {
          score += matches.length * pattern.length;
        }
      }

      scores[langCode] = score / Math.max(1, text.length);
    }

    const sorted = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .filter(([_, score]) => score > 0)
      .slice(0, 5);

    if (sorted.length === 0) {
      if (script === 'Latin') sorted.push(['en', 0.5]);
      else if (script === 'CJK') sorted.push(['zh', 0.5]);
    }

    const total = sorted.reduce((sum, [_, s]) => sum + s, 0) || 1;
    const results = sorted.map(([code, score]) => ({
      code,
      ...this.languages[code],
      confidence: Math.round((score / total) * 100)
    }));

    return { results, script };
  }

  calculateStats(text) {
    const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim()).length;
    const words = text.split(/\s+/).filter(w => w.trim()).length;
    return { sentences, words, chars: text.length };
  }

  updateUI() {
    const text = this.elements.inputText.value;
    const { results, script } = this.detectLanguage(text);
    const stats = this.calculateStats(text);

    this.elements.charCount.textContent = stats.chars;
    this.elements.sentenceCount.textContent = stats.sentences;
    this.elements.wordCount.textContent = stats.words;
    this.elements.scriptType.textContent = script;

    if (results.length > 0) {
      const primary = results[0];
      this.elements.languageFlag.textContent = primary.flag;
      this.elements.languageName.textContent = primary.name;
      this.elements.languageNative.textContent = primary.native;
      this.elements.confidenceFill.style.width = primary.confidence + '%';
      this.elements.confidenceValue.textContent = primary.confidence + '%';

      if (results.length > 1) {
        this.elements.otherLanguages.innerHTML = results.slice(1).map(r =>
          '<div class="language-chip">' + r.flag + ' ' + r.name + ' <span class="percent">' + r.confidence + '%</span></div>'
        ).join('');
      } else {
        this.elements.otherLanguages.innerHTML = '<span style="color:#888">다른 언어 감지 안됨</span>';
      }
    } else {
      this.elements.languageFlag.textContent = '';
      this.elements.languageName.textContent = '언어를 입력해주세요';
      this.elements.languageNative.textContent = '-';
      this.elements.confidenceFill.style.width = '0%';
      this.elements.confidenceValue.textContent = '0%';
      this.elements.otherLanguages.innerHTML = '-';
    }
  }
}

// 전역 인스턴스 생성
const languageDetector = new LanguageDetector();
window.LanguageDetector = languageDetector;

document.addEventListener('DOMContentLoaded', () => languageDetector.init());
