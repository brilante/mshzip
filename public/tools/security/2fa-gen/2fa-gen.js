/**
 * 2FA 코드 생성기 - ToolBase 기반
 * TOTP 기반 2단계 인증 코드 생성
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class TwoFactorGen extends ToolBase {
  constructor() {
    super('TwoFactorGen');
    this.BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    this.currentSecret = '';
    this.accounts = JSON.parse(localStorage.getItem('totpAccounts') || '[]');
    this.timerInterval = null;
  }

  init() {
    this.initElements({
      secretKey: 'secretKey',
      totpCode: 'totpCode',
      timerText: 'timerText',
      timerRing: 'timerRing',
      accountsList: 'accountsList',
      addAccountModal: 'addAccountModal',
      accountName: 'accountName',
      accountSecret: 'accountSecret'
    });

    this.renderAccounts();
    this.startTimer();
    console.log('[TwoFactorGen] 초기화 완료');
    return this;
  }

  base32Decode(encoded) {
    encoded = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
    let bits = '';
    for (const char of encoded) {
      const val = this.BASE32_CHARS.indexOf(char);
      bits += val.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substr(i, 8), 2));
    }
    return new Uint8Array(bytes);
  }

  async hmacSha1(key, message) {
    const cryptoKey = await crypto.subtle.importKey(
      'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
    return new Uint8Array(signature);
  }

  async generateTOTP(secret, time = Math.floor(Date.now() / 1000 / 30)) {
    try {
      const key = this.base32Decode(secret);
      const timeBuffer = new ArrayBuffer(8);
      const timeView = new DataView(timeBuffer);
      timeView.setUint32(4, time, false);

      const hmac = await this.hmacSha1(key, new Uint8Array(timeBuffer));
      const offset = hmac[hmac.length - 1] & 0x0f;
      const code = ((hmac[offset] & 0x7f) << 24 |
                   (hmac[offset + 1] & 0xff) << 16 |
                   (hmac[offset + 2] & 0xff) << 8 |
                   (hmac[offset + 3] & 0xff)) % 1000000;

      return code.toString().padStart(6, '0');
    } catch (e) {
      return '------';
    }
  }

  generateSecret() {
    let secret = '';
    for (let i = 0; i < 16; i++) {
      secret += this.BASE32_CHARS[Math.floor(Math.random() * 32)];
    }
    this.elements.secretKey.value = secret;
    this.generateCode();
  }

  async generateCode() {
    const secret = this.elements.secretKey.value.trim();
    if (!secret) return;

    this.currentSecret = secret;
    await this.updateCode();
    this.startTimer();
  }

  async updateCode() {
    if (!this.currentSecret) return;

    const code = await this.generateTOTP(this.currentSecret);
    this.elements.totpCode.textContent = code.substring(0, 3) + ' ' + code.substring(3);
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);

    const tick = () => {
      const seconds = 30 - (Math.floor(Date.now() / 1000) % 30);
      this.elements.timerText.textContent = seconds;

      const offset = 283 - (283 * seconds / 30);
      this.elements.timerRing.style.strokeDashoffset = offset;

      if (seconds === 30) {
        this.updateCode();
        this.updateAccountCodes();
      }
    };

    tick();
    this.timerInterval = setInterval(tick, 1000);
  }

  copyCode() {
    const code = this.elements.totpCode.textContent.replace(' ', '');
    if (code && code !== '------') {
      navigator.clipboard.writeText(code);
      this.showToast('복사되었습니다!');
    }
  }

  showAddAccount() {
    this.elements.addAccountModal.classList.remove('hidden');
    this.elements.accountName.value = '';
    this.elements.accountSecret.value = '';
  }

  hideAddAccount() {
    this.elements.addAccountModal.classList.add('hidden');
  }

  saveAccount() {
    const name = this.elements.accountName.value.trim();
    const secret = this.elements.accountSecret.value.trim();

    if (!name || !secret) {
      this.showToast('모든 필드를 입력하세요', 'error');
      return;
    }

    this.accounts.push({ id: Date.now(), name, secret });
    localStorage.setItem('totpAccounts', JSON.stringify(this.accounts));
    this.hideAddAccount();
    this.renderAccounts();
    this.startTimer();
  }

  deleteAccount(id) {
    if (confirm('이 계정을 삭제하시겠습니까?')) {
      this.accounts = this.accounts.filter(a => a.id !== id);
      localStorage.setItem('totpAccounts', JSON.stringify(this.accounts));
      this.renderAccounts();
    }
  }

  async renderAccounts() {
    const list = this.elements.accountsList;

    if (this.accounts.length === 0) {
      list.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.5);padding:20px">저장된 계정이 없습니다</div>';
      return;
    }

    const items = await Promise.all(this.accounts.map(async account => {
      const code = await this.generateTOTP(account.secret);
      return '<div class="account-item" onclick="twoFactorGen.selectAccount(\'' + account.secret + '\')">' +
        '<div class="account-icon"></div>' +
        '<div class="account-info">' +
        '<div class="account-name">' + this.escapeHtml(account.name) + '</div>' +
        '<div class="account-code">' + code.substring(0, 3) + ' ' + code.substring(3) + '</div>' +
        '</div>' +
        '<button class="account-delete" onclick="event.stopPropagation();twoFactorGen.deleteAccount(' + account.id + ')"></button>' +
        '</div>';
    }));

    list.innerHTML = items.join('');
  }

  async updateAccountCodes() {
    this.renderAccounts();
  }

  selectAccount(secret) {
    this.elements.secretKey.value = secret;
    this.generateCode();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const twoFactorGen = new TwoFactorGen();
window.TwoFactorGen = twoFactorGen;

document.addEventListener('DOMContentLoaded', () => twoFactorGen.init());
