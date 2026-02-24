/**
 * 점자 변환기 - ToolBase 기반
 * 텍스트 ↔ 점자 양방향 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var BrailleConverter = class BrailleConverter extends ToolBase {
  constructor() {
    super('BrailleConverter');
    this.mode = 'encode';
    this.result = '';
    this.chartVisible = false;

    // Grade 1 Braille (기본 점자)
    this.brailleMap = {
      'a': '⠁', 'b': '⠃', 'c': '⠉', 'd': '⠙', 'e': '⠑',
      'f': '⠋', 'g': '⠛', 'h': '⠓', 'i': '⠊', 'j': '⠚',
      'k': '⠅', 'l': '⠇', 'm': '⠍', 'n': '⠝', 'o': '⠕',
      'p': '⠏', 'q': '⠟', 'r': '⠗', 's': '⠎', 't': '⠞',
      'u': '⠥', 'v': '⠧', 'w': '⠺', 'x': '⠭', 'y': '⠽', 'z': '⠵',
      '1': '⠼⠁', '2': '⠼⠃', '3': '⠼⠉', '4': '⠼⠙', '5': '⠼⠑',
      '6': '⠼⠋', '7': '⠼⠛', '8': '⠼⠓', '9': '⠼⠊', '0': '⠼⠚',
      ' ': ' ',
      '.': '⠲', ',': '⠂', '?': '⠦', '!': '⠖', ':': '⠒',
      ';': '⠆', '-': '⠤', "'": '⠄', '"': '⠶', '(': '⠐⠣', ')': '⠐⠜'
    };

    this.reverseBrailleMap = null;
    this.numberPrefix = '⠼';
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      result: 'result',
      inputLabel: 'inputLabel',
      outputLabel: 'outputLabel',
      brailleChart: 'brailleChart'
    });

    // 역방향 맵 생성
    this.reverseBrailleMap = {};
    for (const [key, value] of Object.entries(this.brailleMap)) {
      if (/[0-9]/.test(key)) {
        this.reverseBrailleMap[value] = key;
      } else {
        this.reverseBrailleMap[value] = key;
      }
    }

    this.setupEvents();
    this.renderChart();
    this.convert();

    console.log('[BrailleConverter] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });

    this.elements.inputText.addEventListener('input', () => this.convert());
  }

  setMode(mode) {
    this.mode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    if (mode === 'encode') {
      this.elements.inputLabel.textContent = '텍스트 입력 (영문/숫자)';
      this.elements.outputLabel.textContent = '점자 결과';
      this.elements.inputText.placeholder = '변환할 텍스트를 입력하세요...';
    } else {
      this.elements.inputLabel.textContent = '점자 입력';
      this.elements.outputLabel.textContent = '텍스트 결과';
      this.elements.inputText.placeholder = '점자를 입력하세요...';
    }
    this.convert();
  }

  convert() {
    const input = this.elements.inputText.value;

    if (this.mode === 'encode') {
      this.result = this.encode(input);
    } else {
      this.result = this.decode(input);
    }

    this.elements.result.value = this.result;
  }

  encode(text) {
    let result = '';
    const lower = text.toLowerCase();

    for (let i = 0; i < lower.length; i++) {
      const char = lower[i];
      if (this.brailleMap[char]) {
        result += this.brailleMap[char];
      } else {
        result += char;
      }
    }

    return result;
  }

  decode(braille) {
    let result = '';
    let i = 0;

    while (i < braille.length) {
      // 숫자 접두사 체크
      if (braille.substring(i, i + 2) === this.numberPrefix) {
        const numBraille = braille.substring(i, i + 4);
        if (this.reverseBrailleMap[numBraille]) {
          result += this.reverseBrailleMap[numBraille];
          i += 4;
          continue;
        }
      }

      // 2글자 기호 체크 (괄호 등)
      const twoChar = braille.substring(i, i + 2);
      if (this.reverseBrailleMap[twoChar]) {
        result += this.reverseBrailleMap[twoChar];
        i += 2;
        continue;
      }

      // 단일 문자 체크
      const char = braille[i];
      if (this.reverseBrailleMap[char]) {
        result += this.reverseBrailleMap[char];
      } else {
        result += char;
      }
      i++;
    }

    return result;
  }

  swap() {
    this.elements.inputText.value = this.elements.result.value;
    this.setMode(this.mode === 'encode' ? 'decode' : 'encode');
  }

  copy() {
    if (this.result) {
      this.copyToClipboard(this.result);
      this.showToast('클립보드에 복사되었습니다!', 'success');
    }
  }

  toggleChart() {
    this.chartVisible = !this.chartVisible;
    this.elements.brailleChart.style.display = this.chartVisible ? 'grid' : 'none';
  }

  renderChart() {
    const letters = 'abcdefghijklmnopqrstuvwxyz';

    let html = '';
    for (const letter of letters) {
      html += `<div class="braille-char">
        <div class="symbol">${this.brailleMap[letter]}</div>
        <div class="letter">${letter.toUpperCase()}</div>
      </div>`;
    }

    this.elements.brailleChart.innerHTML = html;
  }
}

// 전역 인스턴스 생성
const brailleConverter = new BrailleConverter();
window.BrailleConverter = brailleConverter;

document.addEventListener('DOMContentLoaded', () => brailleConverter.init());
