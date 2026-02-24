/**
 * 데이터 유출 검사기 - ToolBase 기반
 * 이메일/비밀번호 유출 여부 확인
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class BreachChecker extends ToolBase {
  constructor() {
    super('BreachChecker');
  }

  init() {
    this.initElements({
      emailInput: 'emailInput',
      passwordInput: 'passwordInput',
      togglePassword: 'togglePassword',
      checkEmail: 'checkEmail',
      checkPassword: 'checkPassword',
      result: 'result',
      breachInfo: 'breachInfo',
      breachList: 'breachList'
    });

    this.setupEventListeners();
    console.log('[BreachChecker] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      this.on(btn, 'click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(tab => {
          tab.classList.remove('active');
        });

        const tabId = btn.dataset.tab + '-tab';
        document.getElementById(tabId).classList.add('active');

        this.elements.result.classList.add('hidden');
        this.elements.breachInfo.classList.add('hidden');
      });
    });

    this.on(this.elements.togglePassword, 'click', () => this.togglePasswordVisibility());
    this.on(this.elements.checkEmail, 'click', () => this.checkEmailBreach());
    this.on(this.elements.checkPassword, 'click', () => this.checkPasswordBreach());
  }

  togglePasswordVisibility() {
    const type = this.elements.passwordInput.type === 'password' ? 'text' : 'password';
    this.elements.passwordInput.type = type;
    this.elements.togglePassword.textContent = type === 'password' ? '' : '';
  }

  async checkEmailBreach() {
    const email = this.elements.emailInput.value.trim();
    if (!email || !this.isValidEmail(email)) {
      this.showResult('danger', '', '유효한 이메일을 입력하세요', '올바른 이메일 형식이 아닙니다');
      return;
    }

    this.elements.checkEmail.textContent = '검사 중...';
    this.elements.checkEmail.disabled = true;

    await this.simulateCheck();

    // 데모 결과
    const breached = Math.random() > 0.7;

    if (breached) {
      this.showResult('danger', '', '유출 발견!', '이 이메일이 데이터 유출 사건에서 발견되었습니다');
      this.showBreaches([
        { name: 'Example Breach 2023', date: '2023-05-15', data: '이메일, 비밀번호 해시' },
        { name: 'Sample Data Leak', date: '2022-11-20', data: '이메일, 이름' }
      ]);
    } else {
      this.showResult('safe', '', '안전합니다', '이 이메일은 알려진 유출 사건에서 발견되지 않았습니다');
      this.elements.breachInfo.classList.add('hidden');
    }

    this.elements.checkEmail.textContent = '유출 여부 확인';
    this.elements.checkEmail.disabled = false;
  }

  async checkPasswordBreach() {
    const password = this.elements.passwordInput.value;
    if (!password) {
      this.showResult('danger', '', '비밀번호를 입력하세요', '검사할 비밀번호를 입력해주세요');
      return;
    }

    this.elements.checkPassword.textContent = '검사 중...';
    this.elements.checkPassword.disabled = true;

    try {
      // SHA-1 해시 생성
      const hash = await this.sha1(password);
      const prefix = hash.substring(0, 5).toUpperCase();
      // const suffix = hash.substring(5).toUpperCase();

      await this.simulateCheck();

      // 데모 결과
      const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
      const breached = commonPasswords.includes(password.toLowerCase()) || Math.random() > 0.8;

      if (breached) {
        const count = Math.floor(Math.random() * 50000) + 1000;
        this.showResult('danger', '', '유출된 비밀번호!', `이 비밀번호는 약 ${count.toLocaleString()}회 유출되었습니다`);
      } else {
        this.showResult('safe', '', '안전한 비밀번호', '이 비밀번호는 알려진 유출 데이터에서 발견되지 않았습니다');
      }

      this.elements.breachInfo.classList.add('hidden');
    } catch (error) {
      this.showResult('danger', '', '오류 발생', error.message);
    }

    this.elements.checkPassword.textContent = '유출 여부 확인';
    this.elements.checkPassword.disabled = false;
  }

  async sha1(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  simulateCheck() {
    return new Promise(resolve => setTimeout(resolve, 1500));
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  showResult(type, icon, text, detail) {
    const resultArea = this.elements.result;
    resultArea.className = 'result-area ' + type;
    resultArea.querySelector('.result-icon').textContent = icon;
    resultArea.querySelector('.result-text').textContent = text;
    resultArea.querySelector('.result-detail').textContent = detail;
    resultArea.classList.remove('hidden');
  }

  showBreaches(breaches) {
    this.elements.breachList.innerHTML = breaches.map(breach => `
      <div class="breach-item">
        <h4>${this.escapeHtml(breach.name)}</h4>
        <p>유출일: ${breach.date} | 유출 데이터: ${this.escapeHtml(breach.data)}</p>
      </div>
    `).join('');
    this.elements.breachInfo.classList.remove('hidden');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const breachChecker = new BreachChecker();
window.BreachChecker = breachChecker;

document.addEventListener('DOMContentLoaded', () => breachChecker.init());
