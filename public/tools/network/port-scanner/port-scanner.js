/**
 * 포트 스캐너 - ToolBase 기반
 * 호스트의 열린 포트 검색
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var PortScanner = class PortScanner extends ToolBase {
  constructor() {
    super('PortScanner');
    this.isRunning = false;
    this.commonPorts = [21, 22, 23, 25, 53, 80, 110, 143, 443, 465, 587, 993, 995, 3306, 3389, 5432, 8080, 8443];
    this.portServices = {
      21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS',
      80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS',
      465: 'SMTPS', 587: 'SMTP', 993: 'IMAPS', 995: 'POP3S',
      3306: 'MySQL', 3389: 'RDP', 5432: 'PostgreSQL',
      8080: 'HTTP-Alt', 8443: 'HTTPS-Alt'
    };
    this.scanMode = 'range';
    this.scanned = 0;
    this.open = 0;
    this.closed = 0;
  }

  init() {
    this.initElements({
      hostInput: 'hostInput',
      portStart: 'portStart',
      portEnd: 'portEnd',
      scanBtn: 'scanBtn',
      stopBtn: 'stopBtn',
      portOutput: 'portOutput',
      statScanned: 'statScanned',
      statOpen: 'statOpen',
      statClosed: 'statClosed'
    });

    this.elements.hostInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.start();
    });

    console.log('[PortScanner] 초기화 완료');
    return this;
  }

  setRange(start, end) {
    this.elements.portStart.value = start;
    this.elements.portEnd.value = end;
    this.scanMode = 'range';
  }

  setCommon() {
    this.elements.portStart.value = '';
    this.elements.portEnd.value = '';
    this.scanMode = 'common';
    this.showToast('주요 포트 모드 선택됨', 'info');
  }

  async start() {
    const host = this.elements.hostInput.value.trim();

    if (!host) {
      this.showToast('호스트를 입력해주세요.', 'warning');
      return;
    }

    if (this.isRunning) return;

    this.isRunning = true;
    this.scanned = 0;
    this.open = 0;
    this.closed = 0;

    this.elements.scanBtn.style.display = 'none';
    this.elements.stopBtn.style.display = 'block';

    this.elements.portOutput.innerHTML = `<div class="port-line info">포트 스캔 시작: ${host}</div>`;

    let ports = [];
    if (this.scanMode === 'common') {
      ports = [...this.commonPorts];
    } else {
      const start = parseInt(this.elements.portStart.value) || 1;
      const end = parseInt(this.elements.portEnd.value) || 1024;
      for (let i = start; i <= end && i <= 65535; i++) {
        ports.push(i);
      }
    }

    this.elements.portOutput.innerHTML += `<div class="port-line info">스캔할 포트: ${ports.length}개</div>`;

    for (const port of ports) {
      if (!this.isRunning) break;

      await this.delay(50);
      this.scanned++;

      // 시뮬레이션: 일반 서비스 포트는 열린 것으로 가정
      const isOpen = this.commonPorts.includes(port) && Math.random() > 0.3;

      if (isOpen) {
        this.open++;
        const service = this.portServices[port] || 'Unknown';
        this.elements.portOutput.innerHTML += `<div class="port-line open">PORT ${port}/tcp OPEN - ${service}</div>`;
      } else {
        this.closed++;
      }

      this.elements.portOutput.scrollTop = this.elements.portOutput.scrollHeight;
      this.updateStats();
    }

    if (this.isRunning) {
      this.elements.portOutput.innerHTML += `<div class="port-line info">--- 스캔 완료 ---</div>`;
      this.elements.portOutput.innerHTML += `<div class="port-line info">${this.open}개 열린 포트 발견 (시뮬레이션)</div>`;
      this.showToast('스캔 완료! (시뮬레이션)', 'success');
    }

    this.isRunning = false;
    this.elements.scanBtn.style.display = 'block';
    this.elements.stopBtn.style.display = 'none';
  }

  stop() {
    this.isRunning = false;
    this.elements.portOutput.innerHTML += `<div class="port-line info">--- 스캔 중지됨 ---</div>`;
  }

  updateStats() {
    this.elements.statScanned.textContent = this.scanned;
    this.elements.statOpen.textContent = this.open;
    this.elements.statClosed.textContent = this.closed;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const portScanner = new PortScanner();
window.PortScanner = portScanner;

// 전역 함수 (HTML onclick 호환)
function setRange(start, end) { portScanner.setRange(start, end); }
function setCommon() { portScanner.setCommon(); }
function start() { portScanner.start(); }
function stop() { portScanner.stop(); }

document.addEventListener('DOMContentLoaded', () => portScanner.init());
