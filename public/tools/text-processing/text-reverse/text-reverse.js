/**
 * 텍스트 역순 도구 - ToolBase 기반
 * 텍스트를 다양한 방식으로 뒤집기
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TextReverse = class TextReverse extends ToolBase {
  constructor() {
    super('TextReverse');
  }

  init() {
    this.initElements({
      textInput: 'textInput',
      textOutput: 'textOutput',
      reverseMode: 'reverseMode',
      trimLines: 'trimLines',
      removeEmpty: 'removeEmpty',
      statLines: 'statLines',
      statWords: 'statWords',
      statChars: 'statChars'
    });

    this.setupEventListeners();

    console.log('[TextReverse] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    ['reverseMode', 'trimLines', 'removeEmpty'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          if (this.elements.textInput.value.trim()) {
            this.process();
          }
        });
      }
    });
  }

  loadFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.elements.textInput.value = e.target.result;
      this.process();
    };
    reader.readAsText(file);
  }

  liveProcess() {
    if (this._liveProcessTimer) clearTimeout(this._liveProcessTimer);
    this._liveProcessTimer = setTimeout(() => this.process(), 300);
  }

  process() {
    let input = this.elements.textInput.value;
    if (!input) {
      this.elements.textOutput.value = '';
      this.updateStats('');
      return;
    }

    const mode = this.elements.reverseMode.value;
    const trimLines = this.elements.trimLines.checked;
    const removeEmpty = this.elements.removeEmpty.checked;

    if (trimLines || removeEmpty) {
      let lines = input.split('\n');
      if (trimLines) {
        lines = lines.map(l => l.trim());
      }
      if (removeEmpty) {
        lines = lines.filter(l => l.length > 0);
      }
      input = lines.join('\n');
    }

    let result;
    switch (mode) {
      case 'lines':
        result = this.reverseLines(input);
        break;
      case 'chars':
        result = this.reverseChars(input);
        break;
      case 'words':
        result = this.reverseWords(input);
        break;
      case 'lineChars':
        result = this.reverseLineChars(input);
        break;
      case 'lineWords':
        result = this.reverseLineWords(input);
        break;
      default:
        result = input;
    }

    this.elements.textOutput.value = result;
    this.updateStats(result);
    this.showToast('뒤집기 완료!', 'success');
  }

  reverseLines(input) {
    return input.split('\n').reverse().join('\n');
  }

  reverseChars(input) {
    return [...input].reverse().join('');
  }

  reverseWords(input) {
    const words = input.split(/(\s+)/);
    const nonSpaceWords = words.filter(w => !/^\s+$/.test(w));
    const reversedWords = nonSpaceWords.reverse();

    let wordIndex = 0;
    return words.map(w => {
      if (/^\s+$/.test(w)) {
        return w;
      }
      return reversedWords[wordIndex++];
    }).join('');
  }

  reverseLineChars(input) {
    return input.split('\n').map(line => [...line].reverse().join('')).join('\n');
  }

  reverseLineWords(input) {
    return input.split('\n').map(line => {
      const words = line.split(/(\s+)/);
      const nonSpaceWords = words.filter(w => !/^\s+$/.test(w));
      const reversedWords = nonSpaceWords.reverse();

      let wordIndex = 0;
      return words.map(w => {
        if (/^\s+$/.test(w)) {
          return w;
        }
        return reversedWords[wordIndex++];
      }).join('');
    }).join('\n');
  }

  doubleReverse() {
    const output = this.elements.textOutput.value;
    if (!output) {
      this.showToast('뒤집을 내용이 없습니다.', 'warning');
      return;
    }

    this.elements.textInput.value = output;
    this.process();
  }

  updateStats(text) {
    const lines = text ? text.split('\n').length : 0;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;

    this.elements.statLines.textContent = lines;
    this.elements.statWords.textContent = words;
    this.elements.statChars.textContent = chars;
  }

  async copyOutput() {
    const output = this.elements.textOutput.value;
    if (!output) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    const success = await this.copyToClipboard(output);
    if (success) {
      this.showToast('클립보드에 복사되었습니다!', 'success');
    } else {
      this.showToast('복사 실패', 'error');
    }
  }

  download() {
    const output = this.elements.textOutput.value;
    if (!output) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    ToolsUtil.downloadFile(output, 'reversed.txt', 'text/plain');
    this.showToast('다운로드 시작!', 'success');
  }

  clear() {
    this.elements.textInput.value = '';
    this.elements.textOutput.value = '';
    this.updateStats('');
  }
}

// 전역 인스턴스 생성
const textReverse = new TextReverse();
window.TextReverse = textReverse;

document.addEventListener('DOMContentLoaded', () => textReverse.init());
