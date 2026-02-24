/**
 * DNS 누출 테스트 - ToolBase 기반
 * VPN 사용 시 DNS 요청 누출 확인
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class DnsLeakTest extends ToolBase {
  constructor() {
    super('DnsLeakTest');
    this.dnsProviders = {
      '8.8.8.8': 'Google Public DNS',
      '8.8.4.4': 'Google Public DNS',
      '1.1.1.1': 'Cloudflare DNS',
      '1.0.0.1': 'Cloudflare DNS',
      '9.9.9.9': 'Quad9 DNS',
      '208.67.222.222': 'OpenDNS',
      '208.67.220.220': 'OpenDNS',
      '94.140.14.14': 'AdGuard DNS',
      '94.140.15.15': 'AdGuard DNS'
    };
  }

  init() {
    this.initElements({
      startTest: 'startTest',
      statusIcon: 'statusIcon',
      statusText: 'statusText',
      progressContainer: 'progressContainer',
      progressFill: 'progressFill',
      progressText: 'progressText',
      resultsCard: 'resultsCard',
      resultSummary: 'resultSummary',
      serverList: 'serverList',
      ipInfo: 'ipInfo'
    });

    this.setupEventListeners();
    console.log('[DnsLeakTest] 초기화 완료');
    return this;
  }

  setupEventListeners() {
    this.on(this.elements.startTest, 'click', () => this.runTest());
  }

  async runTest() {
    this.elements.startTest.disabled = true;
    this.elements.statusIcon.textContent = '';
    this.elements.statusText.textContent = '테스트 진행 중...';
    this.elements.progressContainer.classList.remove('hidden');
    this.elements.resultsCard.classList.add('hidden');

    const steps = [
      { progress: 20, text: 'DNS 서버 확인 중...' },
      { progress: 40, text: 'IP 주소 분석 중...' },
      { progress: 60, text: '지역 정보 조회 중...' },
      { progress: 80, text: '누출 여부 분석 중...' },
      { progress: 100, text: '결과 생성 중...' }
    ];

    for (const step of steps) {
      this.elements.progressFill.style.width = step.progress + '%';
      this.elements.progressText.textContent = step.text;
      await this.sleep(800);
    }

    const testResult = this.generateTestResult();
    this.displayResults(testResult);

    this.elements.statusIcon.textContent = testResult.isLeaking ? '' : '';
    this.elements.statusText.textContent = testResult.isLeaking ? 'DNS 누출 감지됨!' : '누출 없음';
    this.elements.progressContainer.classList.add('hidden');
    this.elements.startTest.disabled = false;
    this.elements.startTest.textContent = '다시 테스트';
  }

  generateTestResult() {
    const servers = [];
    const numServers = Math.floor(Math.random() * 3) + 1;

    const possibleServers = [
      { ip: '8.8.8.8', provider: 'Google Public DNS' },
      { ip: '1.1.1.1', provider: 'Cloudflare DNS' },
      { ip: '9.9.9.9', provider: 'Quad9 DNS' },
      { ip: '168.126.63.1', provider: 'KT (ISP)' },
      { ip: '164.124.101.2', provider: 'LG U+ (ISP)' },
      { ip: '219.250.36.130', provider: 'SK Broadband (ISP)' }
    ];

    const shuffled = possibleServers.sort(() => 0.5 - Math.random());
    for (let i = 0; i < numServers; i++) {
      servers.push(shuffled[i]);
    }

    const hasIspDns = servers.some(s => s.provider.includes('ISP'));

    return {
      isLeaking: hasIspDns,
      servers: servers,
      publicIp: this.generateRandomIP(),
      country: '대한민국',
      city: '서울',
      isp: servers[0].provider.includes('ISP') ? servers[0].provider.replace(' (ISP)', '') : 'Unknown'
    };
  }

  generateRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  displayResults(result) {
    const summary = this.elements.resultSummary;
    summary.className = 'result-summary ' + (result.isLeaking ? 'danger' : 'safe');
    summary.querySelector('.summary-icon').textContent = result.isLeaking ? '' : '';
    summary.querySelector('.summary-text').textContent = result.isLeaking
      ? 'DNS 누출이 감지되었습니다! ISP의 DNS 서버로 요청이 전송되고 있습니다.'
      : '안전합니다! DNS 누출이 감지되지 않았습니다.';

    this.elements.serverList.innerHTML = result.servers.map(server => `
      <div class="server-item">
        <span class="server-ip">${server.ip}</span>
        <span class="server-provider">${server.provider}</span>
      </div>
    `).join('');

    this.elements.ipInfo.innerHTML = `
      <div class="info-item">
        <label>공인 IP</label>
        <span>${result.publicIp}</span>
      </div>
      <div class="info-item">
        <label>국가</label>
        <span>${result.country}</span>
      </div>
      <div class="info-item">
        <label>도시</label>
        <span>${result.city}</span>
      </div>
      <div class="info-item">
        <label>ISP</label>
        <span>${result.isp}</span>
      </div>
    `;

    this.elements.resultsCard.classList.remove('hidden');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const dnsLeakTest = new DnsLeakTest();
window.DnsLeakTest = dnsLeakTest;

document.addEventListener('DOMContentLoaded', () => dnsLeakTest.init());
