/**
 * 텍스트 ↔ HEX 변환기 - ToolBase 기반
 * 텍스트를 16진수로, 16진수를 텍스트로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TextToHex = class TextToHex extends ToolBase {
  constructor() {
    super('TextToHex');
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      outputText: 'outputText',
      convertMode: 'convertMode',
      separator: 'separator',
      hexCase: 'hexCase',
      statChars: 'statChars',
      statBytes: 'statBytes',
      statHexChars: 'statHexChars'
    });

    this.updatePlaceholders();

    console.log('[TextToHex] 초기화 완료');
    return this;
  }

  updatePlaceholders() {
    const mode = this.elements.convertMode.value;

    if (mode === 'textToHex') {
      this.elements.inputText.placeholder = '텍스트를 입력하세요...\n예: Hello World';
      this.elements.outputText.placeholder = 'HEX 결과가 여기에 표시됩니다...';
    } else {
      this.elements.inputText.placeholder = 'HEX를 입력하세요...\n예: 48 65 6C 6C 6F 또는 48656C6C6F';
      this.elements.outputText.placeholder = '텍스트 결과가 여기에 표시됩니다...';
    }
  }

  textToHex(text, separator = ' ', hexCase = 'upper') {
    const result = [];

    // UTF-8 인코딩을 위해 TextEncoder 사용
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);

    for (const byte of bytes) {
      let hex = byte.toString(16).padStart(2, '0');
      hex = hexCase === 'upper' ? hex.toUpperCase() : hex.toLowerCase();
      result.push(hex);
    }

    // 0x 접두사 처리
    if (separator === '0x') {
      return result.map(h => '0x' + h).join(' ');
    }

    return result.join(separator);
  }

  hexToText(hex) {
    // 0x 접두사 및 기타 구분자 제거
    const cleaned = hex.replace(/0x/gi, '').replace(/[^0-9A-Fa-f]/g, '');

    if (cleaned.length === 0) {
      return '';
    }

    if (cleaned.length % 2 !== 0) {
      throw new Error('HEX 문자열의 길이가 올바르지 않습니다.');
    }

    const bytes = [];
    for (let i = 0; i < cleaned.length; i += 2) {
      const byte = parseInt(cleaned.slice(i, i + 2), 16);
      if (isNaN(byte)) {
        throw new Error('유효하지 않은 HEX 문자가 포함되어 있습니다.');
      }
      bytes.push(byte);
    }

    // UTF-8 디코딩
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(new Uint8Array(bytes));
  }

  convert() {
    const input = this.elements.inputText.value;
    if (!input.trim()) {
      this.showToast('입력값을 입력하세요.', 'warning');
      return;
    }

    const mode = this.elements.convertMode.value;
    const separator = this.elements.separator.value;
    const hexCase = this.elements.hexCase.value;

    try {
      let output;
      let chars, bytes, hexChars;

      if (mode === 'textToHex') {
        output = this.textToHex(input, separator, hexCase);
        chars = input.length;
        bytes = new Blob([input]).size;
        hexChars = output.replace(/[^0-9A-Fa-f]/g, '').length;
      } else {
        output = this.hexToText(input);
        chars = output.length;
        bytes = new Blob([output]).size;
        hexChars = input.replace(/[^0-9A-Fa-f]/g, '').length;
      }

      this.elements.outputText.value = output;

      // 통계 업데이트
      this.elements.statChars.textContent = chars.toLocaleString();
      this.elements.statBytes.textContent = bytes.toLocaleString();
      this.elements.statHexChars.textContent = hexChars.toLocaleString();

      this.showToast('변환 완료!', 'success');
    } catch (error) {
      console.error('[TextToHex] 변환 오류:', error);
      this.showToast('변환 오류: ' + error.message, 'error');
    }
  }

  swap() {
    // 값 스왑
    const temp = this.elements.inputText.value;
    this.elements.inputText.value = this.elements.outputText.value;
    this.elements.outputText.value = temp;

    // 모드 스왑
    this.elements.convertMode.value =
      this.elements.convertMode.value === 'textToHex' ? 'hexToText' : 'textToHex';
    this.updatePlaceholders();

    // 통계 초기화
    this.elements.statChars.textContent = '0';
    this.elements.statBytes.textContent = '0';
    this.elements.statHexChars.textContent = '0';
  }

  async copyOutput() {
    const output = this.elements.outputText.value;
    if (!output) {
      this.showToast('복사할 내용이 없습니다.', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      this.showToast('클립보드에 복사되었습니다!', 'success');
    } catch (e) {
      this.showToast('복사 실패', 'error');
    }
  }

  download() {
    const output = this.elements.outputText.value;
    if (!output) {
      this.showToast('다운로드할 내용이 없습니다.', 'warning');
      return;
    }

    const mode = this.elements.convertMode.value;
    const filename = mode === 'textToHex' ? 'hex.txt' : 'text.txt';

    this.downloadFile(output, filename, 'text/plain');
    this.showToast('다운로드 시작!', 'success');
  }

  clear() {
    this.elements.inputText.value = '';
    this.elements.outputText.value = '';
    this.elements.statChars.textContent = '0';
    this.elements.statBytes.textContent = '0';
    this.elements.statHexChars.textContent = '0';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const textToHex = new TextToHex();
window.TextToHex = textToHex;

document.addEventListener('DOMContentLoaded', () => textToHex.init());
