/**
 * 비밀번호 강도 검사기 - ToolBase 기반
 * 비밀번호 보안 강도 분석 및 점수화
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class PasswordStrength extends ToolBase {
  constructor() {
    super('PasswordStrength');
    this.commonPatterns = [
      'password', '123456', 'qwerty', 'abc123', 'letmein', 'welcome',
      'monkey', 'dragon', 'master', 'login', 'admin', 'princess',
      '1234567890', 'password123', '!@#$%^&*', 'iloveyou', 'sunshine'
    ];
  }

  init() {
    this.initElements({
      passwordInput: 'passwordInput',
      scoreValue: 'scoreValue',
      scoreCircle: 'scoreCircle',
      meterFill: 'meterFill',
      strengthLabel: 'strengthLabel',
      crackTime: 'crackTime',
      lengthCriteria: 'lengthCriteria',
      uppercaseCriteria: 'uppercaseCriteria',
      lowercaseCriteria: 'lowercaseCriteria',
      numberCriteria: 'numberCriteria',
      symbolCriteria: 'symbolCriteria',
      noCommonCriteria: 'noCommonCriteria'
    });

    this.setupEventListeners();
    console.log('[PasswordStrength] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    this.on(this.elements.passwordInput, 'input', () => this.check());
  }

  check() {
    const password = this.elements.passwordInput.value;
    const criteria = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*()_+\-=\[\]{}|;':",.<>?/~`]/.test(password),
      noCommon: !this.commonPatterns.some(p => password.toLowerCase().includes(p))
    };

    // 기준 업데이트
    this.updateCriteria('lengthCriteria', criteria.length);
    this.updateCriteria('uppercaseCriteria', criteria.uppercase);
    this.updateCriteria('lowercaseCriteria', criteria.lowercase);
    this.updateCriteria('numberCriteria', criteria.number);
    this.updateCriteria('symbolCriteria', criteria.symbol);
    this.updateCriteria('noCommonCriteria', criteria.noCommon);

    // 점수 계산
    let score = 0;
    if (criteria.length) score += 15;
    if (criteria.uppercase) score += 15;
    if (criteria.lowercase) score += 15;
    if (criteria.number) score += 15;
    if (criteria.symbol) score += 20;
    if (criteria.noCommon) score += 10;

    // 길이 보너스
    if (password.length >= 12) score += 5;
    if (password.length >= 16) score += 5;

    score = Math.min(100, score);

    // UI 업데이트
    this.updateScore(score);
    this.updateStrengthMeter(score);
    this.updateCrackTime(password);
  }

  updateCriteria(id, passed) {
    const element = this.elements[id];
    element.classList.toggle('pass', passed);
    element.querySelector('.icon').textContent = passed ? '' : '';
  }

  updateScore(score) {
    this.elements.scoreValue.textContent = score;

    const circle = this.elements.scoreCircle;
    const offset = 283 - (283 * score / 100);
    circle.style.strokeDashoffset = offset;

    // 색상 변경
    let color;
    if (score < 30) color = '#e74c3c';
    else if (score < 50) color = '#e67e22';
    else if (score < 70) color = '#f1c40f';
    else if (score < 90) color = '#2ecc71';
    else color = '#27ae60';

    circle.style.stroke = color;
  }

  updateStrengthMeter(score) {
    const meter = this.elements.meterFill;
    const label = this.elements.strengthLabel;

    meter.style.width = score + '%';

    let text, color;
    if (score === 0) {
      text = '비밀번호를 입력하세요';
      color = '#888';
    } else if (score < 30) {
      text = '매우 약함';
      color = '#e74c3c';
    } else if (score < 50) {
      text = ' 약함';
      color = '#e67e22';
    } else if (score < 70) {
      text = ' 보통';
      color = '#f1c40f';
    } else if (score < 90) {
      text = ' 강함';
      color = '#2ecc71';
    } else {
      text = '매우 강함';
      color = '#27ae60';
    }

    meter.style.background = color;
    label.textContent = text;
    label.style.color = color;
  }

  updateCrackTime(password) {
    if (!password) {
      this.elements.crackTime.textContent = '-';
      return;
    }

    // 문자 집합 크기 계산
    let charset = 0;
    if (/[a-z]/.test(password)) charset += 26;
    if (/[A-Z]/.test(password)) charset += 26;
    if (/[0-9]/.test(password)) charset += 10;
    if (/[!@#$%^&*()_+\-=\[\]{}|;':",.<>?/~`]/.test(password)) charset += 32;

    if (charset === 0) charset = 26;

    // 조합 수 계산
    const combinations = Math.pow(charset, password.length);

    // 초당 1000회 시도 가정
    const seconds = combinations / 1000 / 2; // 평균적으로 절반

    this.elements.crackTime.textContent = this.formatTime(seconds);
  }

  formatTime(seconds) {
    if (seconds < 1) return '즉시';
    if (seconds < 60) return Math.round(seconds) + '초';
    if (seconds < 3600) return Math.round(seconds / 60) + '분';
    if (seconds < 86400) return Math.round(seconds / 3600) + '시간';
    if (seconds < 31536000) return Math.round(seconds / 86400) + '일';
    if (seconds < 31536000 * 100) return Math.round(seconds / 31536000) + '년';
    if (seconds < 31536000 * 1000000) return Math.round(seconds / 31536000 / 1000) + '천년';
    if (seconds < 31536000 * 1000000000) return Math.round(seconds / 31536000 / 1000000) + '백만년';
    return '거의 불가능';
  }

  togglePassword() {
    const input = this.elements.passwordInput;
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const passwordStrength = new PasswordStrength();
window.PasswordStrength = passwordStrength;

document.addEventListener('DOMContentLoaded', () => passwordStrength.init());
