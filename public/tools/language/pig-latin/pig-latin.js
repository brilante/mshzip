/**
 * 피그 라틴 변환기 - ToolBase 기반
 * 영어 텍스트를 피그 라틴으로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PigLatin = class PigLatin extends ToolBase {
  constructor() {
    super('PigLatin');
    this.result = '';
    this.vowels = ['a', 'e', 'i', 'o', 'u'];
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      result: 'result'
    });

    this.elements.inputText.addEventListener('input', () => this.convert());
    this.convert();

    console.log('[PigLatin] 초기화 완료');
    return this;
  }

  convert() {
    const input = this.elements.inputText.value;
    const words = input.split(/(\s+)/);

    const converted = words.map(word => {
      // 공백은 그대로 유지
      if (/^\s+$/.test(word)) return word;

      // 단어만 변환
      return this.convertWord(word);
    }).join('');

    this.result = converted;
    this.elements.result.value = converted;
  }

  convertWord(word) {
    // 비알파벳 문자 분리
    const match = word.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/);
    if (!match) return word;

    const [, prefix, letters, suffix] = match;
    const converted = this.toPigLatin(letters);

    return prefix + converted + suffix;
  }

  toPigLatin(word) {
    if (!word) return word;

    const firstLetter = word[0].toLowerCase();
    const isUpperCase = word[0] === word[0].toUpperCase();
    const isAllCaps = word === word.toUpperCase() && word.length > 1;

    let result;

    // 모음으로 시작하는 경우
    if (this.vowels.includes(firstLetter)) {
      result = word + 'way';
    } else {
      // 자음으로 시작하는 경우 - 첫 모음까지의 자음을 뒤로 이동
      let consonantCluster = '';
      let restOfWord = word;

      for (let i = 0; i < word.length; i++) {
        if (this.vowels.includes(word[i].toLowerCase())) {
          consonantCluster = word.substring(0, i);
          restOfWord = word.substring(i);
          break;
        }
        // 모음이 없는 경우
        if (i === word.length - 1) {
          consonantCluster = word;
          restOfWord = '';
        }
      }

      result = restOfWord + consonantCluster.toLowerCase() + 'ay';
    }

    // 대문자 처리
    if (isAllCaps) {
      return result.toUpperCase();
    } else if (isUpperCase) {
      return result.charAt(0).toUpperCase() + result.slice(1).toLowerCase();
    }

    return result;
  }

  copy() {
    if (this.result) {
      this.copyToClipboard(this.result);
      this.showToast('클립보드에 복사되었습니다!', 'success');
    }
  }

  clear() {
    this.elements.inputText.value = '';
    this.elements.result.value = '';
    this.result = '';
  }
}

// 전역 인스턴스 생성
const pigLatin = new PigLatin();
window.PigLatin = pigLatin;

document.addEventListener('DOMContentLoaded', () => pigLatin.init());
