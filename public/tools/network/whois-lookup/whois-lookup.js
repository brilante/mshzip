/**
 * WHOIS 조회 - ToolBase 기반
 * 도메인 등록 정보 조회
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var WhoisLookup = class WhoisLookup extends ToolBase {
  constructor() {
    super('WhoisLookup');
  }

  init() {
    this.initElements({
      domainInput: 'domainInput',
      resultArea: 'resultArea'
    });

    this.elements.domainInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.lookup();
    });

    console.log('[WhoisLookup] 초기화 완료');
    return this;
  }

  lookup() {
    let domain = this.elements.domainInput.value.trim().toLowerCase();

    if (!domain) {
      this.showToast('도메인을 입력해주세요.', 'warning');
      return;
    }

    // 프로토콜 제거
    domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    if (!this.isValidDomain(domain)) {
      this.showToast('올바른 도메인 형식이 아닙니다.', 'error');
      return;
    }

    const data = this.generateDemoData(domain);
    this.showResult(data);
    this.showToast('조회 완료! (데모 모드)', 'success');
  }

  isValidDomain(domain) {
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/;
    return domainRegex.test(domain);
  }

  generateDemoData(domain) {
    const tld = domain.split('.').pop();
    const createdDate = new Date(Date.now() - Math.random() * 10 * 365 * 24 * 60 * 60 * 1000);
    const expiryDate = new Date(createdDate.getTime() + (Math.floor(Math.random() * 5) + 1) * 365 * 24 * 60 * 60 * 1000);
    const updatedDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);

    const registrars = [
      'GoDaddy.com, LLC',
      'Namecheap Inc.',
      'Google Domains',
      'Cloudflare, Inc.',
      'Amazon Registrar, Inc.'
    ];

    return {
      domain,
      registrar: registrars[Math.floor(Math.random() * registrars.length)],
      createdDate: this.formatDate(createdDate),
      expiryDate: this.formatDate(expiryDate),
      updatedDate: this.formatDate(updatedDate),
      status: 'clientTransferProhibited',
      nameServers: [
        `ns1.${domain}`,
        `ns2.${domain}`
      ],
      dnssec: 'unsigned'
    };
  }

  formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  showResult(data) {
    const html = `
      <div class="info-row"><span class="info-label">도메인:</span><span class="info-value">${data.domain}</span></div>
      <div class="info-row"><span class="info-label">등록기관:</span><span class="info-value">${data.registrar}</span></div>
      <div class="info-row"><span class="info-label">등록일:</span><span class="info-value">${data.createdDate}</span></div>
      <div class="info-row"><span class="info-label">만료일:</span><span class="info-value">${data.expiryDate}</span></div>
      <div class="info-row"><span class="info-label">갱신일:</span><span class="info-value">${data.updatedDate}</span></div>
      <div class="info-row"><span class="info-label">상태:</span><span class="info-value">${data.status}</span></div>
      <div class="info-row"><span class="info-label">네임서버:</span><span class="info-value">${data.nameServers.join(', ')}</span></div>
      <div class="info-row"><span class="info-label">DNSSEC:</span><span class="info-value">${data.dnssec}</span></div>

      <div class="whois-result" style="margin-top: 1rem;">
Domain Name: ${data.domain.toUpperCase()}
Registry Domain ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}_DOMAIN

Registrar: ${data.registrar}
Registrar IANA ID: ${Math.floor(Math.random() * 9000) + 1000}

Creation Date: ${data.createdDate}T00:00:00Z
Expiry Date: ${data.expiryDate}T00:00:00Z
Updated Date: ${data.updatedDate}T00:00:00Z

Domain Status: ${data.status}

Name Server: ${data.nameServers[0]}
Name Server: ${data.nameServers[1]}

DNSSEC: ${data.dnssec}

>>> Last update of WHOIS database: ${new Date().toISOString()} <<<

[데모 데이터 - 실제 WHOIS 정보가 아닙니다]
      </div>
    `;

    this.elements.resultArea.innerHTML = html;
  }
}

// 전역 인스턴스 생성
const whoisLookup = new WhoisLookup();
window.WhoisLookup = whoisLookup;

// 전역 함수 (HTML onclick 호환)
function lookup() { whoisLookup.lookup(); }

document.addEventListener('DOMContentLoaded', () => whoisLookup.init());
