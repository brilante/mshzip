/**
 * 텍스트 ↔ 바이너리 변환기 - ToolBase 기반
 * 텍스트를 이진수로, 이진수를 텍스트로 변환
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var TextToBinary = class TextToBinary extends ToolBase {
  constructor() {
    super('TextToBinary');
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      outputText: 'outputText',
      convertMode: 'convertMode',
      separator: 'separator',
      bitLength: 'bitLength',
      statChars: 'statChars',
      statBytes: 'statBytes',
      statBits: 'statBits'
    });

    this.updatePlaceholders();

    console.log('[TextToBinary] 초기화 완료');
    return this;
  }

  updatePlaceholders() {
    const mode = this.elements.convertMode.value;

    if (mode === 'textToBinary') {
      this.elements.inputText.placeholder = '텍스트를 입력하세요...\n예: Hello World';
      this.elements.outputText.placeholder = '바이너리 결과가 여기에 표시됩니다...';
    } else {
      this.elements.inputText.placeholder = '바이너리를 입력하세요...\n예: 01001000 01100101 01101100 01101100 01101111';
      this.elements.outputText.placeholder = '텍스트 결과가 여기에 표시됩니다...';
    }
  }

  textToBinary(text, bitLength = 8, separator = ' ') {
    const result = [];

    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);

      if (bitLength === 16 || charCode > 255) {
        // 16비트 Unicode
        result.push(charCode.toString(2).padStart(16, '0'));
      } else {
        // 8비트 또는 7비트
        result.push(charCode.toString(2).padStart(bitLength, '0'));
      }
    }

    return result.join(separator);
  }

  binaryToText(binary, bitLength = 8) {
    // 구분자 제거 및 정리
    const cleaned = binary.replace(/[^01]/g, '');

    if (cleaned.length === 0) {
      return '';
    }

    const result = [];
    const chunkSize = bitLength;

    for (let i = 0; i < cleaned.length; i += chunkSize) {
      const chunk = cleaned.slice(i, i + chunkSize);
      if (chunk.length === chunkSize) {
        const charCode = parseInt(chunk, 2);
        if (charCode > 0) {
          result.push(String.fromCharCode(charCode));
        }
      }
    }

    return result.join('');
  }

  convert() {
    const input = this.elements.inputText.value;
    if (!input.trim()) {
      this.showToast('입력값을 입력하세요.', 'warning');
      return;
    }

    const mode = this.elements.convertMode.value;
    const separator = this.elements.separator.value.replace('\\n', '\n');
    const bitLength = parseInt(this.elements.bitLength.value, 10);

    try {
      let output;
      let chars, bytes, bits;

      if (mode === 'textToBinary') {
        output = this.textToBinary(input, bitLength, separator);
        chars = input.length;
        bytes = new Blob([input]).size;
        bits = output.replace(/[^01]/g, '').length;
      } else {
        output = this.binaryToText(input, bitLength);
        chars = output.length;
        bytes = new Blob([output]).size;
        bits = input.replace(/[^01]/g, '').length;
      }

      this.elements.outputText.value = output;

      // 통계 업데이트
      this.elements.statChars.textContent = chars.toLocaleString();
      this.elements.statBytes.textContent = bytes.toLocaleString();
      this.elements.statBits.textContent = bits.toLocaleString();

      this.showToast('변환 완료!', 'success');
    } catch (error) {
      console.error('[TextToBinary] 변환 오류:', error);
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
      this.elements.convertMode.value === 'textToBinary' ? 'binaryToText' : 'textToBinary';
    this.updatePlaceholders();

    // 통계 초기화
    this.elements.statChars.textContent = '0';
    this.elements.statBytes.textContent = '0';
    this.elements.statBits.textContent = '0';
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
    const filename = mode === 'textToBinary' ? 'binary.txt' : 'text.txt';

    this.downloadFile(output, filename, 'text/plain');
    this.showToast('다운로드 시작!', 'success');
  }

  clear() {
    this.elements.inputText.value = '';
    this.elements.outputText.value = '';
    this.elements.statChars.textContent = '0';
    this.elements.statBytes.textContent = '0';
    this.elements.statBits.textContent = '0';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const textToBinary = new TextToBinary();
window.TextToBinary = textToBinary;

document.addEventListener('DOMContentLoaded', () => textToBinary.init());
