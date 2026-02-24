/**
 * SHA-256 해시 생성기 - ToolBase 기반
 * 텍스트의 SHA-256 해시값 생성 및 비교
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class Sha256Hash extends ToolBase {
  constructor() {
    super('Sha256Hash');
    this.currentHash = '';
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      charCount: 'charCount',
      hashResult: 'hashResult',
      uppercase: 'uppercase',
      addSpaces: 'addSpaces',
      compareHash: 'compareHash',
      compareResult: 'compareResult'
    });

    this.setupEventListeners();
    this.generateHash();
    console.log('[Sha256Hash] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    this.on(this.elements.inputText, 'input', () => this.generateHash());
    this.on(this.elements.compareHash, 'input', () => this.compareHashes());
  }

  async sha256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async generateHash() {
    const text = this.elements.inputText.value;
    this.elements.charCount.textContent = text.length;

    if (!text) {
      this.currentHash = '';
      this.elements.hashResult.textContent = '해시값이 여기에 표시됩니다';
      return;
    }

    this.currentHash = await this.sha256(text);
    this.updateDisplay();
    this.compareHashes();
  }

  updateDisplay() {
    if (!this.currentHash) return;

    let display = this.currentHash;

    if (this.elements.uppercase.checked) {
      display = display.toUpperCase();
    }

    if (this.elements.addSpaces.checked) {
      display = display.match(/.{1,4}/g).join(' ');
    }

    this.elements.hashResult.textContent = display;
  }

  copyHash() {
    if (this.currentHash) {
      let copyText = this.currentHash;
      if (this.elements.uppercase.checked) {
        copyText = copyText.toUpperCase();
      }
      navigator.clipboard.writeText(copyText);
      this.showToast('복사되었습니다!');
    }
  }

  compareHashes() {
    const compareInput = this.elements.compareHash.value.trim().toLowerCase().replace(/\s/g, '');
    const result = this.elements.compareResult;

    if (!compareInput || !this.currentHash) {
      result.className = 'compare-result';
      result.textContent = '';
      return;
    }

    if (compareInput === this.currentHash) {
      result.textContent = '해시가 일치합니다';
      result.className = 'compare-result match';
    } else {
      result.textContent = '해시가 일치하지 않습니다';
      result.className = 'compare-result no-match';
    }
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const sha256Hash = new Sha256Hash();
window.Sha256Hash = sha256Hash;

document.addEventListener('DOMContentLoaded', () => sha256Hash.init());
