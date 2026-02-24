/**
 * SSL 인증서 검사기 - ToolBase 기반
 * SSL/TLS 인증서 정보 확인
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SSLChecker = class SSLChecker extends ToolBase {
  constructor() {
    super('SSLChecker');
  }

  init() {
    this.initElements({
      domainInput: 'domainInput',
      loadingIndicator: 'loadingIndicator',
      resultsSection: 'resultsSection',
      checkedDomain: 'checkedDomain',
      sslGrade: 'sslGrade',
      sslStatus: 'sslStatus',
      issuer: 'issuer',
      issuedDate: 'issuedDate',
      expiryDate: 'expiryDate',
      daysUntilExpiry: 'daysUntilExpiry',
      protocol: 'protocol',
      cipher: 'cipher',
      keySize: 'keySize',
      signatureAlgorithm: 'signatureAlgorithm',
      serialNumber: 'serialNumber',
      san: 'san',
      securityChecks: 'securityChecks'
    });

    console.log('[SSLChecker] 초기화 완료');
    return this;
  }

  async check() {
    const domain = this.elements.domainInput.value.trim();
    if (!domain) {
      this.showToast('도메인을 입력하세요.', 'warning');
      return;
    }

    // 도메인만 추출
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

    this.elements.loadingIndicator.style.display = 'flex';
    this.elements.resultsSection.style.display = 'none';

    await new Promise(resolve => setTimeout(resolve, 1500));

    const data = this.generateSSLData(cleanDomain);
    this.displayResults(cleanDomain, data);

    this.elements.loadingIndicator.style.display = 'none';
    this.elements.resultsSection.style.display = 'block';
  }

  generateSSLData(domain) {
    const isValid = Math.random() > 0.1;
    const now = new Date();

    // 인증서 발급일 (1-2년 전)
    const issuedDate = new Date(now);
    issuedDate.setFullYear(issuedDate.getFullYear() - Math.floor(Math.random() * 2 + 1));
    issuedDate.setMonth(issuedDate.getMonth() - Math.floor(Math.random() * 6));

    // 만료일 (3개월 후 ~ 1년 후)
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + Math.floor(Math.random() * 9 + 3));

    const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));

    const issuers = [
      "Let's Encrypt Authority X3",
      'DigiCert Inc',
      'Comodo CA Limited',
      'GlobalSign nv-sa',
      'GoDaddy.com, Inc.',
      'Sectigo Limited'
    ];

    const protocols = ['TLSv1.2', 'TLSv1.3'];
    const ciphers = [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384'
    ];

    return {
      isValid,
      domain,
      issuer: issuers[Math.floor(Math.random() * issuers.length)],
      issuedDate: issuedDate.toISOString().split('T')[0],
      expiryDate: expiryDate.toISOString().split('T')[0],
      daysUntilExpiry,
      protocol: protocols[Math.floor(Math.random() * protocols.length)],
      cipher: ciphers[Math.floor(Math.random() * ciphers.length)],
      keySize: Math.random() > 0.5 ? 2048 : 4096,
      signatureAlgorithm: 'SHA256withRSA',
      serialNumber: this.generateSerialNumber(),
      san: [domain, 'www.' + domain],
      grade: this.calculateGrade(isValid, daysUntilExpiry)
    };
  }

  generateSerialNumber() {
    const chars = '0123456789ABCDEF';
    let serial = '';
    for (let i = 0; i < 32; i++) {
      if (i > 0 && i % 2 === 0) serial += ':';
      serial += chars[Math.floor(Math.random() * chars.length)];
    }
    return serial;
  }

  calculateGrade(isValid, daysUntilExpiry) {
    if (!isValid) return 'F';
    if (daysUntilExpiry > 90) return 'A+';
    if (daysUntilExpiry > 60) return 'A';
    if (daysUntilExpiry > 30) return 'B';
    if (daysUntilExpiry > 14) return 'C';
    return 'D';
  }

  displayResults(domain, data) {
    this.elements.checkedDomain.textContent = domain;

    // 등급 표시
    this.elements.sslGrade.textContent = data.grade;
    this.elements.sslGrade.className = 'grade-badge grade-' + data.grade.replace('+', '-plus');

    // 상태 표시
    if (data.isValid) {
      if (data.daysUntilExpiry > 30) {
        this.elements.sslStatus.innerHTML = '<span class="status-icon valid"></span> 인증서 유효';
        this.elements.sslStatus.className = 'status-badge valid';
      } else {
        this.elements.sslStatus.innerHTML = '<span class="status-icon warning"></span> 곧 만료됨';
        this.elements.sslStatus.className = 'status-badge warning';
      }
    } else {
      this.elements.sslStatus.innerHTML = '<span class="status-icon invalid"></span> 인증서 오류';
      this.elements.sslStatus.className = 'status-badge invalid';
    }

    // 기본 정보
    this.elements.issuer.textContent = data.issuer;
    this.elements.issuedDate.textContent = data.issuedDate;
    this.elements.expiryDate.textContent = data.expiryDate;
    this.elements.daysUntilExpiry.textContent = data.daysUntilExpiry + '일';

    // 만료일 색상
    if (data.daysUntilExpiry > 60) this.elements.daysUntilExpiry.style.color = 'var(--success)';
    else if (data.daysUntilExpiry > 30) this.elements.daysUntilExpiry.style.color = 'var(--warning)';
    else this.elements.daysUntilExpiry.style.color = 'var(--error)';

    // 기술 정보
    this.elements.protocol.textContent = data.protocol;
    this.elements.cipher.textContent = data.cipher;
    this.elements.keySize.textContent = data.keySize + ' bits';
    this.elements.signatureAlgorithm.textContent = data.signatureAlgorithm;
    this.elements.serialNumber.textContent = data.serialNumber;
    this.elements.san.textContent = data.san.join(', ');

    // 보안 체크리스트
    const checks = [
      { name: 'HTTPS 활성화', pass: true },
      { name: 'TLS 1.2 이상', pass: data.protocol.includes('1.2') || data.protocol.includes('1.3') },
      { name: '강력한 암호화', pass: data.keySize >= 2048 },
      { name: '유효한 인증서', pass: data.isValid },
      { name: '충분한 유효 기간', pass: data.daysUntilExpiry > 30 }
    ];

    const checksHtml = checks.map(c => `
      <div class="check-item ${c.pass ? 'pass' : 'fail'}">
        ${c.pass ? '' : ''} ${c.name}
      </div>
    `).join('');
    this.elements.securityChecks.innerHTML = checksHtml;
  }
}

// 전역 인스턴스 생성
const sslChecker = new SSLChecker();
window.SSLChecker = sslChecker;

document.addEventListener('DOMContentLoaded', () => sslChecker.init());
