/**
 * 텍스트 → 이모지 변환기 - ToolBase 기반
 * 알파벳/숫자를 이모지로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TextToEmoji = class TextToEmoji extends ToolBase {
  constructor() {
    super('TextToEmoji');
    this.result = '';

    this.letterMap = {
      'a': '🅰', 'b': '🅱', 'c': '©', 'd': '🇩', 'e': '',
      'f': '', 'g': '🇬', 'h': '', 'i': 'ℹ', 'j': '',
      'k': '', 'l': '', 'm': 'Ⓜ', 'n': '', 'o': '',
      'p': '🅿', 'q': '', 'r': '®', 's': '', 't': '',
      'u': '', 'v': '', 'w': '', 'x': '', 'y': '',
      'z': ''
    };

    this.numberMap = {
      '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
      '5': '5', '6': '6', '7': '7', '8': '8', '9': '9'
    };

    this.symbolMap = {
      '!': '', '?': '', '+': '', '-': '', '*': '',
      '/': '', '=': '', '#': '#', '$': '', '%': '',
      '&': '', '@': '', '.': '', ',': '', ':': '',
      ' ': '  '
    };
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      result: 'result'
    });

    this.elements.inputText.addEventListener('input', () => this.convert());
    this.convert();

    console.log('[TextToEmoji] 초기화 완료');
    return this;
  }

  convert() {
    const input = this.elements.inputText.value.toLowerCase();
    let result = '';

    for (const char of input) {
      if (this.letterMap[char]) {
        result += this.letterMap[char];
      } else if (this.numberMap[char]) {
        result += this.numberMap[char];
      } else if (this.symbolMap[char]) {
        result += this.symbolMap[char];
      } else {
        result += char;
      }
    }

    this.result = result;
    this.elements.result.textContent = result;
  }

  copy() {
    if (this.result) {
      this.copyToClipboard(this.result);
      this.showToast('클립보드에 복사되었습니다!', 'success');
    }
  }

  clear() {
    this.elements.inputText.value = '';
    this.elements.result.textContent = '';
    this.result = '';
  }
}

// 전역 인스턴스 생성
const textToEmoji = new TextToEmoji();
window.TextToEmoji = textToEmoji;

document.addEventListener('DOMContentLoaded', () => textToEmoji.init());
