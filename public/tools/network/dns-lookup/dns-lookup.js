/**
 * DNS 조회 - ToolBase 기반
 * DNS 레코드 조회
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var DnsLookup = class DnsLookup extends ToolBase {
  constructor() {
    super('DnsLookup');
    this.selectedType = 'A';
  }

  init() {
    this.initElements({
      domainInput: 'domainInput',
      resultArea: 'resultArea'
    });

    this.elements.domainInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.lookup();
    });

    console.log('[DnsLookup] 초기화 완료');
    return this;
  }

  selectType(type) {
    this.selectedType = type;
    document.querySelectorAll('.record-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });
  }

  lookup() {
    let domain = this.elements.domainInput.value.trim().toLowerCase();

    if (!domain) {
      this.showToast('도메인을 입력해주세요.', 'warning');
      return;
    }

    domain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    const records = this.generateDemoRecords(domain, this.selectedType);
    this.showResult(domain, records);
    this.showToast('조회 완료! (데모 모드)', 'success');
  }

  generateDemoRecords(domain, type) {
    const records = [];
    const ttl = Math.floor(Math.random() * 3600) + 300;

    if (type === 'A' || type === 'ALL') {
      records.push({ type: 'A', name: domain, value: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`, ttl });
      records.push({ type: 'A', name: domain, value: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`, ttl });
    }

    if (type === 'AAAA' || type === 'ALL') {
      records.push({ type: 'AAAA', name: domain, value: '2606:4700:3030::' + Math.random().toString(16).substr(2, 4), ttl });
    }

    if (type === 'CNAME' || type === 'ALL') {
      records.push({ type: 'CNAME', name: `www.${domain}`, value: domain, ttl });
    }

    if (type === 'MX' || type === 'ALL') {
      records.push({ type: 'MX', name: domain, value: `10 mail.${domain}`, ttl });
      records.push({ type: 'MX', name: domain, value: `20 mail2.${domain}`, ttl });
    }

    if (type === 'NS' || type === 'ALL') {
      records.push({ type: 'NS', name: domain, value: `ns1.${domain}`, ttl: 86400 });
      records.push({ type: 'NS', name: domain, value: `ns2.${domain}`, ttl: 86400 });
    }

    if (type === 'TXT' || type === 'ALL') {
      records.push({ type: 'TXT', name: domain, value: '"v=spf1 include:_spf.google.com ~all"', ttl });
      records.push({ type: 'TXT', name: `_dmarc.${domain}`, value: '"v=DMARC1; p=reject; rua=mailto:dmarc@' + domain + '"', ttl });
    }

    if (type === 'SOA' || type === 'ALL') {
      records.push({ type: 'SOA', name: domain, value: `ns1.${domain} hostmaster.${domain} 2026011201 3600 1800 604800 86400`, ttl: 86400 });
    }

    return records;
  }

  showResult(domain, records) {
    if (records.length === 0) {
      this.elements.resultArea.innerHTML = `
        <div style="text-align: center; color: var(--text-secondary); padding: 2rem;">
          레코드를 찾을 수 없습니다
        </div>
      `;
      return;
    }

    let html = `
      <p style="margin-bottom: 1rem; color: var(--text-secondary);">
        ${domain} - ${records.length}개 레코드 (데모)
      </p>
      <table class="dns-table">
        <thead>
          <tr>
            <th>타입</th>
            <th>이름</th>
            <th>값</th>
            <th>TTL</th>
          </tr>
        </thead>
        <tbody>
    `;

    records.forEach(record => {
      html += `
        <tr>
          <td><strong>${record.type}</strong></td>
          <td>${record.name}</td>
          <td style="max-width: 300px; word-break: break-all;">${record.value}</td>
          <td>${record.ttl}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    this.elements.resultArea.innerHTML = html;
  }
}

// 전역 인스턴스 생성
const dnsLookup = new DnsLookup();
window.DnsLookup = dnsLookup;

// 전역 함수 (HTML onclick 호환)
function selectType(type) { dnsLookup.selectType(type); }
function lookup() { dnsLookup.lookup(); }

document.addEventListener('DOMContentLoaded', () => dnsLookup.init());
