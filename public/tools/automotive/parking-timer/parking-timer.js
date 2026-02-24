/**
 * 주차 타이머 - ToolBase 기반
 * 주차 시간 및 요금 계산
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var ParkingTimer = class ParkingTimer extends ToolBase {
  constructor() {
    super('ParkingTimer');
    this.isRunning = false;
    this.startTime = null;
    this.elapsed = 0;
    this.interval = null;
    this.alertMinutes = 0;
    this.alertTriggered = false;
  }

  init() {
    this.initElements({
      startBtn: 'startBtn',
      timerTime: 'timerTime',
      timerCost: 'timerCost',
      timerDisplay: 'timerDisplay',
      startTime: 'startTime',
      alertTime: 'alertTime',
      baseFee: 'baseFee',
      baseTime: 'baseTime',
      addFee: 'addFee',
      addTime: 'addTime'
    });

    this.loadState();

    console.log('[ParkingTimer] 초기화 완료');
    return this;
  }

  loadState() {
    const saved = localStorage.getItem('parkingTimer');
    if (saved) {
      const state = JSON.parse(saved);
      if (state.isRunning && state.startTime) {
        this.startTime = state.startTime;
        this.alertMinutes = state.alertMinutes || 0;
        this.isRunning = true;
        this.interval = setInterval(() => this.tick(), 1000);
        this.elements.startBtn.textContent = '일시정지';
        this.elements.startTime.textContent = this.formatStartTime(state.startTime);

        if (this.alertMinutes > 0) {
          this.elements.alertTime.textContent = this.alertMinutes + '분';
        }
      }
    }
  }

  saveState() {
    localStorage.setItem('parkingTimer', JSON.stringify({
      isRunning: this.isRunning,
      startTime: this.startTime,
      alertMinutes: this.alertMinutes
    }));
  }

  toggle() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    if (!this.startTime) {
      this.startTime = Date.now();
    }
    this.isRunning = true;
    this.interval = setInterval(() => this.tick(), 1000);
    this.elements.startBtn.textContent = '일시정지';
    this.elements.startTime.textContent = this.formatStartTime(this.startTime);
    this.saveState();
  }

  pause() {
    this.isRunning = false;
    clearInterval(this.interval);
    this.elapsed = Date.now() - this.startTime;
    this.elements.startBtn.textContent = '계속';
    this.saveState();
  }

  reset() {
    this.isRunning = false;
    clearInterval(this.interval);
    this.startTime = null;
    this.elapsed = 0;
    this.alertMinutes = 0;
    this.alertTriggered = false;

    this.elements.startBtn.textContent = '시작';
    this.elements.timerTime.textContent = '00:00:00';
    this.elements.timerCost.textContent = '예상 요금: 0원';
    this.elements.startTime.textContent = '-';
    this.elements.alertTime.textContent = '없음';
    this.elements.timerDisplay.className = 'timer-display';

    localStorage.removeItem('parkingTimer');
  }

  tick() {
    this.elapsed = Date.now() - this.startTime;
    this.updateDisplay();
    this.checkAlert();
  }

  updateDisplay() {
    const totalSeconds = Math.floor(this.elapsed / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    this.elements.timerTime.textContent =
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // 요금 계산
    const cost = this.calculateCost(totalSeconds);
    this.elements.timerCost.textContent = `예상 요금: ${cost.toLocaleString()}원`;

    // 상태 색상
    const elapsedMinutes = totalSeconds / 60;

    if (this.alertMinutes > 0 && elapsedMinutes >= this.alertMinutes) {
      this.elements.timerDisplay.className = 'timer-display danger';
    } else if (this.alertMinutes > 0 && elapsedMinutes >= this.alertMinutes - 10) {
      this.elements.timerDisplay.className = 'timer-display warning';
    } else {
      this.elements.timerDisplay.className = 'timer-display';
    }
  }

  calculateCost(totalSeconds) {
    const totalMinutes = Math.ceil(totalSeconds / 60);
    const baseFee = parseInt(this.elements.baseFee.value) || 1000;
    const baseTime = parseInt(this.elements.baseTime.value) || 30;
    const addFee = parseInt(this.elements.addFee.value) || 500;
    const addTime = parseInt(this.elements.addTime.value) || 10;

    if (totalMinutes <= 0) return 0;
    if (totalMinutes <= baseTime) return baseFee;

    const extraMinutes = totalMinutes - baseTime;
    const extraUnits = Math.ceil(extraMinutes / addTime);

    return baseFee + (extraUnits * addFee);
  }

  setAlert(minutes) {
    this.alertMinutes = minutes;
    this.alertTriggered = false;
    this.elements.alertTime.textContent = minutes + '분';
    this.saveState();
    this.showToast(`${minutes}분 알림이 설정되었습니다`, 'success');
  }

  checkAlert() {
    if (this.alertMinutes <= 0 || this.alertTriggered) return;

    const elapsedMinutes = this.elapsed / 60000;

    if (elapsedMinutes >= this.alertMinutes) {
      this.alertTriggered = true;
      this.playAlarm();
      this.showToast(`주차 시간 ${this.alertMinutes}분 경과!`, 'warning');
    }
  }

  playAlarm() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();

          osc.connect(gain);
          gain.connect(audioContext.destination);

          osc.frequency.value = 880;
          osc.type = 'sine';

          gain.gain.setValueAtTime(0.3, audioContext.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

          osc.start(audioContext.currentTime);
          osc.stop(audioContext.currentTime + 0.3);
        }, i * 400);
      }
    } catch (e) {
      console.warn('알림음 재생 실패:', e);
    }
  }

  formatStartTime(timestamp) {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const parkingTimer = new ParkingTimer();
window.ParkingTimer = parkingTimer;

document.addEventListener('DOMContentLoaded', () => parkingTimer.init());
