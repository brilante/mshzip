/**
 * 비밀번호 생성기 - ToolBase 기반
 * 암호학적으로 안전한 무작위 비밀번호 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class PasswordGenerator extends ToolBase {
  constructor() {
    super('PasswordGenerator');
    this.chars = {
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      numbers: '0123456789',
      symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };
    this.similarChars = 'il1Lo0O';
    this.ambiguousChars = '{}[]()/\\'"`~';
    this.history = JSON.parse(localStorage.getItem('passwordHistory') || '[]');
  }

  init() {
    this.initElements({
      lengthRange: 'lengthRange',
      lengthValue: 'lengthValue',
      uppercase: 'uppercase',
      lowercase: 'lowercase',
      numbers: 'numbers',
      symbols: 'symbols',
      excludeSimilar: 'excludeSimilar',
      excludeAmbiguous: 'excludeAmbiguous',
      passwordText: 'passwordText',
      strengthFill: 'strengthFill',
      strengthLabel: 'strengthLabel',
      historyList: 'historyList'
    });

    this.setupEventListeners();
    this.renderHistory();
    this.generate();
    console.log('[PasswordGenerator] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    this.on(this.elements.lengthRange, 'input', () => {
      this.elements.lengthValue.textContent = this.elements.lengthRange.value;
    });
  }

  generate() {
    const length = parseInt(this.elements.lengthRange.value);
    const useUppercase = this.elements.uppercase.checked;
    const useLowercase = this.elements.lowercase.checked;
    const useNumbers = this.elements.numbers.checked;
    const useSymbols = this.elements.symbols.checked;
    const excludeSimilar = this.elements.excludeSimilar.checked;
    const excludeAmbiguous = this.elements.excludeAmbiguous.checked;

    let charset = '';
    if (useUppercase) charset += this.chars.uppercase;
    if (useLowercase) charset += this.chars.lowercase;
    if (useNumbers) charset += this.chars.numbers;
    if (useSymbols) charset += this.chars.symbols;

    if (excludeSimilar) {
      charset = charset.split('').filter(c => !this.similarChars.includes(c)).join('');
    }
    if (excludeAmbiguous) {
      charset = charset.split('').filter(c => !this.ambiguousChars.includes(c)).join('');
    }

    if (charset.length === 0) {
      this.showToast('최소 하나의 문자 유형을 선택하세요', 'error');
      return;
    }

    let password = '';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length];
    }

    this.elements.passwordText.textContent = password;
    this.updateStrength(password);
    this.addToHistory(password);
  }

  updateStrength(password) {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const percent = (score / 7) * 100;
    const fill = this.elements.strengthFill;
    const label = this.elements.strengthLabel;

    fill.style.width = percent + '%';

    let text, color;
    if (score <= 2) {
      text = '약함';
      color = '#e74c3c';
    } else if (score <= 4) {
      text = '보통';
      color = '#f1c40f';
    } else if (score <= 5) {
      text = '강함';
      color = '#2ecc71';
    } else {
      text = '매우 강함';
      color = '#27ae60';
    }

    fill.style.background = color;
    label.textContent = '강도: ' + text;
    label.style.color = color;
  }

  copy() {
    const password = this.elements.passwordText.textContent;
    if (password && password !== '비밀번호 생성') {
      navigator.clipboard.writeText(password);
      this.showToast('복사되었습니다!');
    }
  }

  addToHistory(password) {
    this.history.unshift({
      password: password,
      time: Date.now()
    });
    this.history = this.history.slice(0, 10);
    localStorage.setItem('passwordHistory', JSON.stringify(this.history));
    this.renderHistory();
  }

  renderHistory() {
    const list = this.elements.historyList;
    if (this.history.length === 0) {
      list.innerHTML = '<div style="color:rgba(255,255,255,0.5);text-align:center;padding:20px">기록 없음</div>';
      return;
    }

    list.innerHTML = this.history.map(item =>
      '<div class="history-item">' +
      '<span class="password">' + this.escapeHtml(item.password) + '</span>' +
      '<button onclick="passwordGenerator.copyFromHistory(\'' + this.escapeHtml(item.password) + '\')">복사</button>' +
      '</div>'
    ).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  copyFromHistory(password) {
    navigator.clipboard.writeText(password);
    this.showToast('복사되었습니다!');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const passwordGenerator = new PasswordGenerator();
window.PasswordGenerator = passwordGenerator;

document.addEventListener('DOMContentLoaded', () => passwordGenerator.init());
