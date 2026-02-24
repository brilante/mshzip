/**
 * 도메인 체커 - ToolBase 기반
 * 도메인 정보 확인 및 가용성 검사
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var DomainChecker = class DomainChecker extends ToolBase {
  constructor() {
    super('DomainChecker');
    this.tlds = ['.com', '.net', '.org', '.io', '.co', '.kr', '.dev', '.app', '.ai', '.xyz'];
  }

  init() {
    this.initElements({
      domainInput: 'domainInput',
      loadingIndicator: 'loadingIndicator',
      resultsSection: 'resultsSection',
      checkedDomain: 'checkedDomain',
      domainLength: 'domainLength',
      domainTld: 'domainTld',
      domainRegistrar: 'domainRegistrar',
      domainCreated: 'domainCreated',
      domainExpires: 'domainExpires',
      lengthScore: 'lengthScore',
      memorabilityScore: 'memorabilityScore',
      seoScore: 'seoScore',
      domainAnalysis: 'domainAnalysis',
      availabilityList: 'availabilityList'
    });

    console.log('[DomainChecker] 초기화 완료');
    return this;
  }

  async check() {
    const domain = this.elements.domainInput.value.trim().toLowerCase();
    if (!domain) {
      this.showToast('도메인을 입력하세요.', 'warning');
      return;
    }

    // 도메인 형식 정리
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    const baseName = cleanDomain.includes('.') ? cleanDomain.split('.')[0] : cleanDomain;

    this.elements.loadingIndicator.style.display = 'flex';
    this.elements.resultsSection.style.display = 'none';

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 도메인 정보 분석 (시뮬레이션)
    const info = this.analyzeDomain(cleanDomain);
    this.displayDomainInfo(cleanDomain, info);

    // 도메인 가용성 체크 (시뮬레이션)
    const availability = this.checkAvailability(baseName);
    this.displayAvailability(baseName, availability);

    this.elements.loadingIndicator.style.display = 'none';
    this.elements.resultsSection.style.display = 'block';
  }

  analyzeDomain(domain) {
    const parts = domain.split('.');
    const tld = parts.length > 1 ? '.' + parts[parts.length - 1] : '';
    const name = parts[0];

    // 길이 점수
    let lengthScore = 100;
    if (name.length > 15) lengthScore = 40;
    else if (name.length > 10) lengthScore = 60;
    else if (name.length > 7) lengthScore = 80;

    // 기억하기 쉬운지
    const hasNumbers = /\d/.test(name);
    const hasHyphens = /-/.test(name);
    let memorabilityScore = 100;
    if (hasNumbers) memorabilityScore -= 20;
    if (hasHyphens) memorabilityScore -= 30;
    if (name.length > 12) memorabilityScore -= 20;

    // SEO 점수
    let seoScore = Math.round((lengthScore + memorabilityScore) / 2);

    return {
      name,
      tld,
      length: name.length,
      hasNumbers,
      hasHyphens,
      lengthScore,
      memorabilityScore,
      seoScore,
      created: this.randomDate(2010, 2020),
      expires: this.randomDate(2025, 2030),
      registrar: ['GoDaddy', 'Namecheap', 'Google Domains', 'Cloudflare'][Math.floor(Math.random() * 4)]
    };
  }

  randomDate(startYear, endYear) {
    const year = Math.floor(Math.random() * (endYear - startYear + 1)) + startYear;
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  checkAvailability(baseName) {
    return this.tlds.map(tld => ({
      domain: baseName + tld,
      available: Math.random() > 0.6,
      price: tld === '.com' ? '$12.99' : tld === '.io' ? '$39.99' : tld === '.kr' ? '₩15,000' : `$${(Math.random() * 30 + 5).toFixed(2)}`
    }));
  }

  displayDomainInfo(domain, info) {
    this.elements.checkedDomain.textContent = domain;
    this.elements.domainLength.textContent = info.length + '자';
    this.elements.domainTld.textContent = info.tld || 'N/A';
    this.elements.domainRegistrar.textContent = info.registrar;
    this.elements.domainCreated.textContent = info.created;
    this.elements.domainExpires.textContent = info.expires;

    // 점수 표시
    this.updateScoreBar('lengthScore', info.lengthScore);
    this.updateScoreBar('memorabilityScore', info.memorabilityScore);
    this.updateScoreBar('seoScore', info.seoScore);

    // 분석 결과
    const analysis = [];
    if (info.length <= 7) analysis.push('짧고 기억하기 좋은 도메인');
    else if (info.length <= 12) analysis.push('적당한 길이의 도메인');
    else analysis.push('너무 긴 도메인');

    if (info.hasNumbers) analysis.push('숫자가 포함되어 있음');
    if (info.hasHyphens) analysis.push('하이픈이 포함되어 있음');
    if (!info.hasNumbers && !info.hasHyphens) analysis.push('깔끔한 도메인 구성');

    this.elements.domainAnalysis.innerHTML = analysis.map(a => `<div>${a}</div>`).join('');
  }

  updateScoreBar(id, score) {
    const bar = this.elements[id];
    bar.style.width = score + '%';
    bar.textContent = score + '%';

    if (score >= 80) bar.style.background = 'var(--success)';
    else if (score >= 50) bar.style.background = 'var(--warning)';
    else bar.style.background = 'var(--error)';
  }

  displayAvailability(baseName, results) {
    const html = results.map(r => `
      <div class="availability-row ${r.available ? 'available' : 'taken'}">
        <div class="domain-name">${r.domain}</div>
        <div class="domain-status">${r.available ? '사용 가능' : '사용 중'}</div>
        <div class="domain-price">${r.available ? r.price : '-'}</div>
      </div>
    `).join('');

    this.elements.availabilityList.innerHTML = html;
  }

  async copyDomain(domain) {
    const success = await this.copyToClipboard(domain);
    this.showToast(success ? '도메인 복사됨!' : '복사 실패', success ? 'success' : 'error');
  }
}

// 전역 인스턴스 생성
const domainChecker = new DomainChecker();
window.DomainChecker = domainChecker;

document.addEventListener('DOMContentLoaded', () => domainChecker.init());
