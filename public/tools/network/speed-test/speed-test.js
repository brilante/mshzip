/**
 * 속도 테스트 - ToolBase 기반
 * 인터넷 속도 측정
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var SpeedTest = class SpeedTest extends ToolBase {
  constructor() {
    super('SpeedTest');
    this.isRunning = false;
    this.downloadSpeed = 0;
    this.uploadSpeed = 0;
    this.ping = 0;
  }

  init() {
    this.initElements({
      startBtn: 'startBtn',
      statusText: 'statusText',
      speedValue: 'speedValue',
      speedLabel: 'speedLabel',
      gaugeFill: 'gaugeFill',
      resultsGrid: 'resultsGrid',
      downloadResult: 'downloadResult',
      uploadResult: 'uploadResult',
      pingResult: 'pingResult'
    });

    console.log('[SpeedTest] 초기화 완료');
    return this;
  }

  async start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.elements.startBtn.disabled = true;
    this.elements.startBtn.textContent = '테스트 중...';
    this.elements.resultsGrid.style.display = 'none';

    // Ping 테스트
    await this.testPing();

    // 다운로드 테스트
    await this.testDownload();

    // 업로드 테스트
    await this.testUpload();

    // 결과 표시
    this.showResults();

    this.isRunning = false;
    this.elements.startBtn.disabled = false;
    this.elements.startBtn.textContent = '다시 테스트';
  }

  async testPing() {
    this.elements.statusText.textContent = '핑 테스트 중...';
    this.elements.speedLabel.textContent = '핑 측정';

    this.elements.gaugeFill.style.strokeDashoffset = 502;

    for (let i = 0; i <= 100; i += 10) {
      await this.delay(50);
      const offset = 502 - (502 * i / 100);
      this.elements.gaugeFill.style.strokeDashoffset = offset;
    }

    // 시뮬레이션: 10-50ms 핑
    this.ping = Math.floor(Math.random() * 40) + 10;
    this.elements.speedValue.textContent = this.ping;
    this.elements.speedLabel.textContent = 'ms';

    await this.delay(500);
  }

  async testDownload() {
    this.elements.statusText.textContent = '다운로드 속도 측정 중...';
    this.elements.speedLabel.textContent = '다운로드 속도';
    this.elements.speedValue.textContent = '0';

    this.elements.gaugeFill.style.strokeDashoffset = 502;

    // 시뮬레이션: 50-500 Mbps
    const targetSpeed = Math.floor(Math.random() * 450) + 50;

    for (let i = 0; i <= 100; i += 2) {
      await this.delay(50);
      const currentSpeed = Math.floor(targetSpeed * i / 100 * (0.8 + Math.random() * 0.4));
      this.elements.speedValue.textContent = currentSpeed;

      const offset = 502 - (502 * Math.min(currentSpeed / 500, 1));
      this.elements.gaugeFill.style.strokeDashoffset = offset;
    }

    this.downloadSpeed = targetSpeed;
    this.elements.speedValue.textContent = targetSpeed;

    await this.delay(500);
  }

  async testUpload() {
    this.elements.statusText.textContent = '업로드 속도 측정 중...';
    this.elements.speedLabel.textContent = '업로드 속도';
    this.elements.speedValue.textContent = '0';

    this.elements.gaugeFill.style.strokeDashoffset = 502;

    // 시뮬레이션: 다운로드의 30-70%
    const targetSpeed = Math.floor(this.downloadSpeed * (0.3 + Math.random() * 0.4));

    for (let i = 0; i <= 100; i += 2) {
      await this.delay(50);
      const currentSpeed = Math.floor(targetSpeed * i / 100 * (0.8 + Math.random() * 0.4));
      this.elements.speedValue.textContent = currentSpeed;

      const offset = 502 - (502 * Math.min(currentSpeed / 500, 1));
      this.elements.gaugeFill.style.strokeDashoffset = offset;
    }

    this.uploadSpeed = targetSpeed;
    this.elements.speedValue.textContent = targetSpeed;

    await this.delay(500);
  }

  showResults() {
    this.elements.statusText.textContent = '테스트 완료! (시뮬레이션)';
    this.elements.speedLabel.textContent = '다운로드 속도';
    this.elements.speedValue.textContent = this.downloadSpeed;

    this.elements.downloadResult.textContent = this.downloadSpeed + ' Mbps';
    this.elements.uploadResult.textContent = this.uploadSpeed + ' Mbps';
    this.elements.pingResult.textContent = this.ping + ' ms';

    this.elements.resultsGrid.style.display = 'grid';
    this.showToast('속도 테스트 완료! (시뮬레이션)', 'success');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 전역 인스턴스 생성
const speedTest = new SpeedTest();
window.SpeedTest = speedTest;

// 전역 함수 (HTML onclick 호환)
function start() { speedTest.start(); }

document.addEventListener('DOMContentLoaded', () => speedTest.init());
