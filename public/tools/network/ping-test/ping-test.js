/**
 * Ping 테스트 - ToolBase 기반
 * 호스트 연결 테스트
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PingTest = class PingTest extends ToolBase {
  constructor() {
    super('PingTest');
    this.isRunning = false;
    this.results = [];
    this.intervalId = null;
  }

  init() {
    this.initElements({
      hostInput: 'hostInput',
      pingCount: 'pingCount',
      pingBtn: 'pingBtn',
      stopBtn: 'stopBtn',
      pingOutput: 'pingOutput',
      statSent: 'statSent',
      statReceived: 'statReceived',
      statLoss: 'statLoss',
      statAvg: 'statAvg'
    });

    this.elements.hostInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.start();
    });

    console.log('[PingTest] 초기화 완료');
    return this;
  }

  async start() {
    const host = this.elements.hostInput.value.trim();

    if (!host) {
      this.showToast('호스트를 입력해주세요.', 'warning');
      return;
    }

    if (this.isRunning) return;

    this.isRunning = true;
    this.results = [];
    const count = parseInt(this.elements.pingCount.value);

    this.elements.pingBtn.style.display = 'none';
    this.elements.stopBtn.style.display = 'block';

    this.elements.pingOutput.innerHTML = `<div class="ping-line info">PING ${host} 시뮬레이션 시작...</div>`;

    // IP 시뮬레이션
    const ip = this.generateIp(host);
    this.elements.pingOutput.innerHTML += `<div class="ping-line">PING ${host} (${ip}): 56 data bytes</div>`;

    let sent = 0;
    let received = 0;

    for (let i = 0; i < count && this.isRunning; i++) {
      await this.delay(1000);
      sent++;

      const success = Math.random() > 0.05; // 95% 성공률
      const time = success ? Math.floor(Math.random() * 50) + 10 : null;

      if (success) {
        received++;
        this.results.push(time);
        this.elements.pingOutput.innerHTML += `<div class="ping-line">64 bytes from ${ip}: icmp_seq=${i + 1} ttl=54 time=${time} ms</div>`;
      } else {
        this.elements.pingOutput.innerHTML += `<div class="ping-line error">Request timeout for icmp_seq ${i + 1}</div>`;
      }

      this.elements.pingOutput.scrollTop = this.elements.pingOutput.scrollHeight;
      this.updateStats(sent, received);
    }

    if (this.isRunning) {
      this.showSummary(host, sent, received);
    }

    this.isRunning = false;
    this.elements.pingBtn.style.display = 'block';
    this.elements.stopBtn.style.display = 'none';
  }

  stop() {
    this.isRunning = false;
    this.elements.pingOutput.innerHTML += `<div class="ping-line info">--- Ping 중지됨 ---</div>`;
  }

  generateIp(host) {
    // 도메인인 경우 랜덤 IP 생성
    if (host.includes('.') && !host.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      return `${Math.floor(Math.random() * 200) + 50}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    }
    return host;
  }

  updateStats(sent, received) {
    this.elements.statSent.textContent = sent;
    this.elements.statReceived.textContent = received;

    const loss = sent > 0 ? Math.round((1 - received / sent) * 100) : 0;
    this.elements.statLoss.textContent = loss + '%';

    if (this.results.length > 0) {
      const avg = Math.round(this.results.reduce((a, b) => a + b, 0) / this.results.length);
      this.elements.statAvg.textContent = avg + 'ms';
    }
  }

  showSummary(host, sent, received) {
    const loss = Math.round((1 - received / sent) * 100);

    this.elements.pingOutput.innerHTML += `
<div class="ping-line info">
--- ${host} ping statistics ---
${sent} packets transmitted, ${received} packets received, ${loss}% packet loss</div>`;

    if (this.results.length > 0) {
      const min = Math.min(...this.results);
      const max = Math.max(...this.results);
      const avg = Math.round(this.results.reduce((a, b) => a + b, 0) / this.results.length);
      const stddev = Math.round(Math.sqrt(this.results.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / this.results.length));

      this.elements.pingOutput.innerHTML += `<div class="ping-line info">round-trip min/avg/max/stddev = ${min}/${avg}/${max}/${stddev} ms</div>`;
    }

    this.elements.pingOutput.scrollTop = this.elements.pingOutput.scrollHeight;
    this.showToast('Ping 완료! (시뮬레이션)', 'success');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const pingTest = new PingTest();
window.PingTest = pingTest;

// 전역 함수 (HTML onclick 호환)
function start() { pingTest.start(); }
function stop() { pingTest.stop(); }

document.addEventListener('DOMContentLoaded', () => pingTest.init());
