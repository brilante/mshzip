/**
 * 한글 ↔ 로마자 변환 - ToolBase 기반
 * 국립국어원 로마자 표기법 기반
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var Romanization = class Romanization extends ToolBase {
  constructor() {
    super('Romanization');
    this.mode = 'toRoman';

    // 초성
    this.cho = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
    // 중성
    this.jung = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
    // 종성
    this.jong = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];

    // 로마자 → 한글 매핑
    this.romanToKorean = {
      'kk': 'ㄲ', 'tt': 'ㄸ', 'pp': 'ㅃ', 'ss': 'ㅆ', 'jj': 'ㅉ',
      'ch': 'ㅊ', 'ng': 'ㅇ',
      'g': 'ㄱ', 'k': 'ㅋ', 'n': 'ㄴ', 'd': 'ㄷ', 't': 'ㅌ',
      'r': 'ㄹ', 'l': 'ㄹ', 'm': 'ㅁ', 'b': 'ㅂ', 'p': 'ㅍ',
      's': 'ㅅ', 'j': 'ㅈ', 'h': 'ㅎ',
      'a': 'ㅏ', 'ae': 'ㅐ', 'ya': 'ㅑ', 'yae': 'ㅒ',
      'eo': 'ㅓ', 'e': 'ㅔ', 'yeo': 'ㅕ', 'ye': 'ㅖ',
      'o': 'ㅗ', 'wa': 'ㅘ', 'wae': 'ㅙ', 'oe': 'ㅚ', 'yo': 'ㅛ',
      'u': 'ㅜ', 'wo': 'ㅝ', 'we': 'ㅞ', 'wi': 'ㅟ', 'yu': 'ㅠ',
      'eu': 'ㅡ', 'ui': 'ㅢ', 'i': 'ㅣ'
    };
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      inputLabel: 'inputLabel',
      resultBox: 'resultBox'
    });

    this.setupEvents();
    this.convert();

    console.log('[Romanization] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => this.setMode(tab.dataset.mode));
    });

    this.elements.inputText.addEventListener('input', () => this.convert());
  }

  setMode(mode) {
    this.mode = mode;
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    this.elements.inputLabel.textContent = mode === 'toRoman' ? '한글 입력' : '로마자 입력';
    this.elements.inputText.placeholder = mode === 'toRoman' ? '한글을 입력하세요...' : '로마자를 입력하세요...';
    this.convert();
  }

  swap() {
    const newMode = this.mode === 'toRoman' ? 'toKorean' : 'toRoman';
    this.elements.inputText.value = this.elements.resultBox.textContent;
    this.setMode(newMode);
  }

  convert() {
    const input = this.elements.inputText.value;
    let result;

    if (this.mode === 'toRoman') {
      result = this.koreanToRoman(input);
    } else {
      result = this.romanToKoreanConvert(input);
    }

    this.elements.resultBox.textContent = result;
  }

  koreanToRoman(str) {
    let result = '';

    for (let char of str) {
      const code = char.charCodeAt(0);

      // 한글 범위 체크 (가 ~ 힣)
      if (code >= 0xAC00 && code <= 0xD7A3) {
        const syllable = code - 0xAC00;
        const choIndex = Math.floor(syllable / 588);
        const jungIndex = Math.floor((syllable % 588) / 28);
        const jongIndex = syllable % 28;

        result += this.cho[choIndex] + this.jung[jungIndex] + this.jong[jongIndex];
      } else {
        result += char;
      }
    }

    return result;
  }

  romanToKoreanConvert(str) {
    // 간단한 변환 (완벽한 구현은 더 복잡함)
    let result = str.toLowerCase();

    // 긴 패턴부터 치환
    const patterns = Object.entries(this.romanToKorean)
      .sort((a, b) => b[0].length - a[0].length);

    for (const [roman, korean] of patterns) {
      result = result.split(roman).join(korean);
    }

    return result;
  }

  copy() {
    const text = this.elements.resultBox.textContent;
    this.copyToClipboard(text);
    this.showToast('클립보드에 복사되었습니다!', 'success');
  }

  clear() {
    this.elements.inputText.value = '';
    this.elements.resultBox.textContent = '';
  }
}

// 전역 인스턴스 생성
const romanization = new Romanization();
window.Romanization = romanization;

document.addEventListener('DOMContentLoaded', () => romanization.init());
