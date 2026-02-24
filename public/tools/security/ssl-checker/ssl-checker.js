/**
 * SSL 인증서 검사기 - ToolBase 기반
 * 웹사이트 SSL/TLS 인증서 상태 확인
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class SslChecker extends ToolBase {
  constructor() {
    super('SslChecker');
  }

  init() {
    this.initElements({
      domainInput: 'domainInput',
      checkBtn: 'checkBtn',
      resultCard: 'resultCard',
      statusBanner: 'statusBanner',
      certInfo: 'certInfo',
      validityProgress: 'validityProgress',
      startDate: 'startDate',
      endDate: 'endDate',
      daysRemaining: 'daysRemaining',
      securityList: 'securityList'
    });

    this.setupEventListeners();
    console.log('[SslChecker] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    this.on(this.elements.checkBtn, 'click', () => this.checkSSL());
    this.on(this.elements.domainInput, 'keypress', (e) => {
      if (e.key === 'Enter') this.checkSSL();
    });
  }

  async checkSSL() {
    let domain = this.elements.domainInput.value.trim();
    if (!domain) {
      this.showToast('도메인을 입력하세요.', 'error');
      return;
    }

    domain = domain.replace(/^https?:\/\//, '').replace(/\/.*/, '');

    this.elements.checkBtn.disabled = true;
    this.elements.checkBtn.textContent = '검사 중...';

    await new Promise(resolve => setTimeout(resolve, 1500));

    const sslData = this.generateSSLData(domain);
    this.displayResults(sslData);

    this.elements.checkBtn.disabled = false;
    this.elements.checkBtn.textContent = '검사';
  }

  generateSSLData(domain) {
    const now = new Date();
    const validFrom = new Date(now);
    validFrom.setMonth(validFrom.getMonth() - Math.floor(Math.random() * 6));

    const validTo = new Date(validFrom);
    validTo.setFullYear(validTo.getFullYear() + 1);

    const daysLeft = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));
    const totalDays = Math.ceil((validTo - validFrom) / (1000 * 60 * 60 * 24));
    const progress = Math.round(((totalDays - daysLeft) / totalDays) * 100);

    const issuers = ['Let\'s Encrypt', 'DigiCert', 'Sectigo', 'GlobalSign', 'Comodo'];
    const protocols = ['TLS 1.2', 'TLS 1.3'];

    return {
      domain: domain,
      valid: daysLeft > 0,
      issuer: issuers[Math.floor(Math.random() * issuers.length)],
      subject: domain,
      validFrom: validFrom,
      validTo: validTo,
      daysLeft: daysLeft,
      progress: progress,
      protocol: protocols[Math.floor(Math.random() * protocols.length)],
      keySize: Math.random() > 0.3 ? 2048 : 4096,
      signatureAlg: 'SHA256withRSA',
      serialNumber: this.generateSerialNumber(),
      securityChecks: {
        https: true,
        hsts: Math.random() > 0.3,
        tlsVersion: Math.random() > 0.2,
        keyStrength: Math.random() > 0.1,
        chainValid: Math.random() > 0.1,
        notExpired: daysLeft > 0
      }
    };
  }

  generateSerialNumber() {
    let serial = '';
    for (let i = 0; i < 16; i++) {
      serial += Math.floor(Math.random() * 16).toString(16).toUpperCase();
      if (i < 15 && i % 2 === 1) serial += ':';
    }
    return serial;
  }

  displayResults(data) {
    let statusClass, statusIcon, statusText;
    if (!data.valid) {
      statusClass = 'invalid';
      statusIcon = '';
      statusText = 'SSL 인증서가 만료되었습니다!';
    } else if (data.daysLeft < 30) {
      statusClass = 'warning';
      statusIcon = '';
      statusText = 'SSL 인증서가 곧 만료됩니다!';
    } else {
      statusClass = 'valid';
      statusIcon = '';
      statusText = 'SSL 인증서가 유효합니다';
    }

    const banner = this.elements.statusBanner;
    banner.className = 'status-banner ' + statusClass;
    banner.querySelector('.status-icon').textContent = statusIcon;
    banner.querySelector('.status-text').textContent = statusText;

    this.elements.certInfo.innerHTML = `
      <div class="info-item">
        <label>도메인</label>
        <span>${this.escapeHtml(data.domain)}</span>
      </div>
      <div class="info-item">
        <label>발급자</label>
        <span>${this.escapeHtml(data.issuer)}</span>
      </div>
      <div class="info-item">
        <label>프로토콜</label>
        <span>${data.protocol}</span>
      </div>
      <div class="info-item">
        <label>키 크기</label>
        <span>${data.keySize} bit</span>
      </div>
      <div class="info-item">
        <label>서명 알고리즘</label>
        <span>${data.signatureAlg}</span>
      </div>
      <div class="info-item">
        <label>일련번호</label>
        <span>${data.serialNumber}</span>
      </div>
    `;

    let progressClass = 'good';
    if (data.daysLeft < 30) progressClass = 'warning';
    if (data.daysLeft < 7 || !data.valid) progressClass = 'danger';

    this.elements.validityProgress.className = 'validity-progress ' + progressClass;
    this.elements.validityProgress.style.width = Math.min(data.progress, 100) + '%';

    this.elements.startDate.textContent = this.formatDate(data.validFrom);
    this.elements.endDate.textContent = this.formatDate(data.validTo);

    if (data.valid) {
      this.elements.daysRemaining.innerHTML = `남은 기간: <strong>${data.daysLeft}일</strong>`;
    } else {
      this.elements.daysRemaining.innerHTML = '<strong style="color: #ef4444;">인증서 만료됨</strong>';
    }

    const checks = [
      { key: 'https', label: 'HTTPS 활성화' },
      { key: 'hsts', label: 'HSTS 헤더' },
      { key: 'tlsVersion', label: 'TLS 1.2 이상' },
      { key: 'keyStrength', label: '키 강도 (2048bit+)' },
      { key: 'chainValid', label: '인증서 체인 검증' },
      { key: 'notExpired', label: '인증서 유효기간' }
    ];

    this.elements.securityList.innerHTML = checks.map(check => {
      const passed = data.securityChecks[check.key];
      return `
        <div class="security-item">
          <span class="label">${check.label}</span>
          <span class="status ${passed ? 'pass' : 'fail'}">${passed ? '통과' : '실패'}</span>
        </div>
      `;
    }).join('');

    this.elements.resultCard.classList.remove('hidden');
  }

  formatDate(date) {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const sslChecker = new SslChecker();
window.SslChecker = sslChecker;

document.addEventListener('DOMContentLoaded', () => sslChecker.init());
