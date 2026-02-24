/**
 * IP 조회 - ToolBase 기반
 * IP 주소 정보 조회
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var IpLookup = class IpLookup extends ToolBase {
  constructor() {
    super('IpLookup');
  }

  init() {
    this.initElements({
      ipInput: 'ipInput',
      myIp: 'myIp',
      country: 'country',
      region: 'region',
      city: 'city',
      isp: 'isp',
      timezone: 'timezone',
      coords: 'coords',
      mapArea: 'mapArea'
    });

    this.getMyIp();
    this.elements.ipInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.lookup();
    });

    console.log('[IpLookup] 초기화 완료');
    return this;
  }

  async getMyIp() {
    // 데모 - 실제로는 서버 API 호출 필요
    const demoIp = '203.xxx.xxx.' + Math.floor(Math.random() * 255);
    this.elements.myIp.textContent = demoIp;

    // 내 IP 정보도 표시
    this.showResult({
      ip: demoIp,
      country: '대한민국',
      countryCode: 'KR',
      region: '서울특별시',
      city: '강남구',
      isp: 'Korea Telecom',
      timezone: 'Asia/Seoul',
      lat: 37.5665,
      lon: 126.9780
    });
  }

  lookup() {
    const ip = this.elements.ipInput.value.trim();

    if (!ip) {
      this.showToast('IP 주소를 입력해주세요.', 'warning');
      return;
    }

    if (!this.isValidIp(ip)) {
      this.showToast('올바른 IP 주소 형식이 아닙니다.', 'error');
      return;
    }

    // 데모 데이터 생성
    const demoData = this.generateDemoData(ip);
    this.showResult(demoData);
    this.showToast('조회 완료! (데모 모드)', 'success');
  }

  isValidIp(ip) {
    // IPv4
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 간단 체크
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

    if (ipv4Regex.test(ip)) {
      const parts = ip.split('.').map(Number);
      return parts.every(p => p >= 0 && p <= 255);
    }

    return ipv6Regex.test(ip);
  }

  generateDemoData(ip) {
    const locations = [
      { country: '미국', countryCode: 'US', region: '캘리포니아', city: '마운틴뷰', isp: 'Google LLC', lat: 37.3861, lon: -122.0839 },
      { country: '미국', countryCode: 'US', region: '워싱턴', city: '시애틀', isp: 'Amazon.com Inc.', lat: 47.6062, lon: -122.3321 },
      { country: '일본', countryCode: 'JP', region: '도쿄', city: '치요다구', isp: 'NTT Communications', lat: 35.6762, lon: 139.6503 },
      { country: '독일', countryCode: 'DE', region: '헤센', city: '프랑크푸르트', isp: 'Deutsche Telekom AG', lat: 50.1109, lon: 8.6821 },
      { country: '싱가포르', countryCode: 'SG', region: '싱가포르', city: '싱가포르', isp: 'Singtel', lat: 1.3521, lon: 103.8198 }
    ];

    const loc = locations[Math.floor(Math.random() * locations.length)];

    return {
      ip,
      country: loc.country,
      countryCode: loc.countryCode,
      region: loc.region,
      city: loc.city,
      isp: loc.isp,
      timezone: this.getTimezone(loc.countryCode),
      lat: loc.lat,
      lon: loc.lon
    };
  }

  getTimezone(countryCode) {
    const timezones = {
      'US': 'America/Los_Angeles',
      'JP': 'Asia/Tokyo',
      'DE': 'Europe/Berlin',
      'SG': 'Asia/Singapore',
      'KR': 'Asia/Seoul'
    };
    return timezones[countryCode] || 'UTC';
  }

  showResult(data) {
    this.elements.country.textContent = `${data.country} (${data.countryCode})`;
    this.elements.region.textContent = data.region;
    this.elements.city.textContent = data.city;
    this.elements.isp.textContent = data.isp;
    this.elements.timezone.textContent = data.timezone;
    this.elements.coords.textContent = `${data.lat.toFixed(4)}, ${data.lon.toFixed(4)}`;

    this.elements.mapArea.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;"></div>
        <div>${data.city}, ${data.country}</div>
        <div style="font-size: 0.85rem; color: var(--text-secondary);">${data.lat.toFixed(4)}, ${data.lon.toFixed(4)}</div>
      </div>
    `;
  }
}

// 전역 인스턴스 생성
const ipLookup = new IpLookup();
window.IpLookup = ipLookup;

// 전역 함수 (HTML onclick 호환)
function lookup() { ipLookup.lookup(); }

document.addEventListener('DOMContentLoaded', () => ipLookup.init());
