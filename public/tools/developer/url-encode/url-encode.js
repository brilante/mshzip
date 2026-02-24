/**
 * URL 인코딩/디코딩 도구 - ToolBase 기반
 * encodeURIComponent/decodeURIComponent 사용
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var UrlEncode = class UrlEncode extends ToolBase {
  constructor() {
    super('UrlEncode');
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      outputText: 'outputText',
      encodeAll: 'encodeAll',
      encodeSpaces: 'encodeSpaces',
      componentMode: 'componentMode',
      inputStats: 'inputStats',
      outputStats: 'outputStats'
    });

    console.log('[UrlEncode] 초기화 완료');
    return this;
  }

  encode() {
    const input = this.elements.inputText.value;
    const encodeAll = this.elements.encodeAll.checked;
    const encodeSpaces = this.elements.encodeSpaces.checked;
    const componentMode = this.elements.componentMode.checked;

    if (!input) {
      this.showToast('텍스트를 입력하세요.', 'warning');
      return;
    }

    try {
      let result;

      if (componentMode) {
        result = encodeURIComponent(input);
      } else if (encodeAll) {
        // 모든 문자를 인코딩 (ASCII 알파벳과 숫자 제외)
        result = Array.from(input).map(char => {
          const code = char.charCodeAt(0);
          if ((code >= 48 && code <= 57) ||  // 0-9
              (code >= 65 && code <= 90) ||  // A-Z
              (code >= 97 && code <= 122)) { // a-z
            return char;
          }
          return encodeURIComponent(char);
        }).join('');
      } else {
        result = encodeURI(input);
      }

      if (encodeSpaces) {
        result = result.replace(/%20/g, '+');
      }

      this.elements.outputText.value = result;
      this.updateStats('output');
      this.showSuccess('인코딩 완료!');

    } catch (error) {
      this.showError('인코딩 오류: ' + error.message);
    }
  }

  decode() {
    const input = this.elements.inputText.value;
    const encodeSpaces = this.elements.encodeSpaces.checked;

    if (!input) {
      this.showToast('텍스트를 입력하세요.', 'warning');
      return;
    }

    try {
      let text = input;

      // + 를 공백으로 변환 (옵션에 따라)
      if (encodeSpaces) {
        text = text.replace(/\+/g, ' ');
      }

      const result = decodeURIComponent(text);
      this.elements.outputText.value = result;
      this.updateStats('output');
      this.showSuccess('디코딩 완료!');

    } catch (error) {
      this.showError('디코딩 오류: 잘못된 인코딩 형식');
    }
  }

  copy() {
    const output = this.elements.outputText.value;
    if (!output) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    navigator.clipboard.writeText(output).then(() => {
      this.showSuccess('클립보드에 복사되었습니다.');
    });
  }

  async paste(target) {
    try {
      const text = await navigator.clipboard.readText();
      if (target === 'input') {
        this.elements.inputText.value = text;
      } else {
        this.elements.outputText.value = text;
      }
      this.updateStats(target);
    } catch (e) {
      this.showError('클립보드 접근이 거부되었습니다.');
    }
  }

  clear(target) {
    if (target === 'input') {
      this.elements.inputText.value = '';
    } else {
      this.elements.outputText.value = '';
    }
    this.updateStats(target);
  }

  swap() {
    const temp = this.elements.inputText.value;
    this.elements.inputText.value = this.elements.outputText.value;
    this.elements.outputText.value = temp;
    this.updateStats('input');
    this.updateStats('output');
    this.showToast('입력/출력이 교환되었습니다.', 'info');
  }

  updateStats(target) {
    const text = target === 'input'
      ? this.elements.inputText.value
      : this.elements.outputText.value;
    const statsEl = target === 'input'
      ? this.elements.inputStats
      : this.elements.outputStats;
    statsEl.textContent = `${text.length}자`;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const urlEncode = new UrlEncode();
window.UrlEncode = urlEncode;

document.addEventListener('DOMContentLoaded', () => urlEncode.init());
