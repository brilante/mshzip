/**
 * 암호화/복호화 도구 - ToolBase 기반
 * 텍스트 암호화 및 복호화 (XOR 기반 시뮬레이션)
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class EncryptDecrypt extends ToolBase {
  constructor() {
    super('EncryptDecrypt');
    this.currentMode = 'encrypt';
  }

  init() {
    this.initElements({
      inputText: 'inputText',
      outputText: 'outputText',
      secretKey: 'secretKey',
      inputLabel: 'inputLabel',
      outputLabel: 'outputLabel',
      actionBtn: 'actionBtn',
      keyStrength: 'keyStrength'
    });

    this.setupEventListeners();
    console.log('[EncryptDecrypt] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    this.on(this.elements.secretKey, 'input', () => this.checkKeyStrength());
  }

  setMode(mode) {
    this.currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.includes(mode === 'encrypt' ? '암호화' : '복호화'));
    });

    this.elements.inputLabel.textContent = mode === 'encrypt' ? '암호화할 텍스트' : '복호화할 텍스트';
    this.elements.outputLabel.textContent = mode === 'encrypt' ? '암호화된 텍스트' : '복호화된 텍스트';
    this.elements.actionBtn.innerHTML = mode === 'encrypt' ? '암호화' : '복호화';
    this.elements.inputText.placeholder = mode === 'encrypt' ? '텍스트를 입력하세요...' : '암호화된 텍스트를 입력하세요...';
  }

  toggleKey() {
    const input = this.elements.secretKey;
    input.type = input.type === 'password' ? 'text' : 'password';
  }

  // 간단한 AES 암호화 (XOR 기반 시뮬레이션)
  // 실제 프로덕션에서는 Web Crypto API 사용 권장
  simpleEncrypt(text, key) {
    if (!text || !key) return '';

    // 키를 32바이트로 확장
    let expandedKey = key;
    while (expandedKey.length < 32) {
      expandedKey += key;
    }
    expandedKey = expandedKey.substring(0, 32);

    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ expandedKey.charCodeAt(i % expandedKey.length);
      result += String.fromCharCode(charCode);
    }

    // Base64 인코딩
    return btoa(unescape(encodeURIComponent(result)));
  }

  simpleDecrypt(encrypted, key) {
    if (!encrypted || !key) return '';

    try {
      // Base64 디코딩
      const decoded = decodeURIComponent(escape(atob(encrypted)));

      // 키를 32바이트로 확장
      let expandedKey = key;
      while (expandedKey.length < 32) {
        expandedKey += key;
      }
      expandedKey = expandedKey.substring(0, 32);

      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ expandedKey.charCodeAt(i % expandedKey.length);
        result += String.fromCharCode(charCode);
      }

      return result;
    } catch (e) {
      return 'ERROR: 복호화 실패 - 올바른 암호화 키인지 확인하세요';
    }
  }

  process() {
    const input = this.elements.inputText.value;
    const key = this.elements.secretKey.value;

    if (!input) {
      this.showToast('텍스트를 입력하세요', 'error');
      return;
    }

    if (!key) {
      this.showToast('암호화 키를 입력하세요', 'error');
      return;
    }

    let output;
    if (this.currentMode === 'encrypt') {
      output = this.simpleEncrypt(input, key);
    } else {
      output = this.simpleDecrypt(input, key);
    }

    this.elements.outputText.value = output;
  }

  copyOutput() {
    const output = this.elements.outputText.value;
    if (output) {
      navigator.clipboard.writeText(output);
      this.showToast('복사되었습니다!');
    }
  }

  checkKeyStrength() {
    const key = this.elements.secretKey.value;
    const strength = this.elements.keyStrength;

    if (!key) {
      strength.innerHTML = '';
      return;
    }

    let score = 0;
    if (key.length >= 8) score++;
    if (key.length >= 12) score++;
    if (/[A-Z]/.test(key)) score++;
    if (/[a-z]/.test(key)) score++;
    if (/[0-9]/.test(key)) score++;
    if (/[^A-Za-z0-9]/.test(key)) score++;

    let text, color;
    if (score <= 2) {
      text = '약한 키';
      color = '#e74c3c';
    } else if (score <= 4) {
      text = '보통 키';
      color = '#f1c40f';
    } else {
      text = '강한 키';
      color = '#2ecc71';
    }

    strength.innerHTML = '<span style="color:' + color + '">● ' + text + '</span> (' + key.length + '자)';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const encryptDecrypt = new EncryptDecrypt();
window.EncryptDecrypt = encryptDecrypt;

document.addEventListener('DOMContentLoaded', () => encryptDecrypt.init());
