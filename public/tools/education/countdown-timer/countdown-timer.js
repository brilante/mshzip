/**
 * 카운트다운 타이머 - ToolBase 기반
 * 역방향 타이머
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var CountdownTimer = class CountdownTimer extends ToolBase {
  constructor() {
    super('CountdownTimer');
    this.totalSeconds = 0;
    this.remainingSeconds = 0;
    this.interval = null;
    this.isRunning = false;
  }

  init() {
    this.initElements({
      hoursInput: 'hoursInput',
      minutesInput: 'minutesInput',
      secondsInput: 'secondsInput',
      timeDisplay: 'timeDisplay',
      startBtn: 'startBtn',
      timeInputs: 'timeInputs'
    });

    this.updateDisplay();
    this.requestNotificationPermission();

    console.log('[CountdownTimer] 초기화 완료');
    return this;
  }

  requestNotificationPermission() {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  setPreset(minutes) {
    this.elements.hoursInput.value = Math.floor(minutes / 60);
    this.elements.minutesInput.value = minutes % 60;
    this.elements.secondsInput.value = 0;
    this.reset();
  }

  start() {
    if (this.isRunning) {
      this.pause();
      return;
    }

    if (this.remainingSeconds === 0) {
      const hours = parseInt(this.elements.hoursInput.value) || 0;
      const minutes = parseInt(this.elements.minutesInput.value) || 0;
      const seconds = parseInt(this.elements.secondsInput.value) || 0;
      this.totalSeconds = hours * 3600 + minutes * 60 + seconds;
      this.remainingSeconds = this.totalSeconds;
    }

    if (this.remainingSeconds <= 0) {
      this.showToast('시간을 설정해주세요.', 'error');
      return;
    }

    this.isRunning = true;
    this.elements.startBtn.textContent = '일시정지';
    this.elements.startBtn.className = 'control-btn pause-btn';
    this.elements.timeInputs.style.opacity = '0.5';
    this.elements.timeInputs.style.pointerEvents = 'none';

    this.interval = setInterval(() => this.tick(), 1000);
  }

  pause() {
    this.isRunning = false;
    clearInterval(this.interval);
    this.elements.startBtn.textContent = '계속';
    this.elements.startBtn.className = 'control-btn start-btn';
  }

  tick() {
    this.remainingSeconds--;
    this.updateDisplay();

    if (this.remainingSeconds <= 0) {
      this.finish();
    }
  }

  updateDisplay() {
    const hours = Math.floor(this.remainingSeconds / 3600);
    const minutes = Math.floor((this.remainingSeconds % 3600) / 60);
    const seconds = this.remainingSeconds % 60;

    this.elements.timeDisplay.textContent = `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;

    // 상태별 스타일
    this.elements.timeDisplay.classList.remove('warning', 'danger', 'finished');
    if (this.remainingSeconds <= 0) {
      this.elements.timeDisplay.classList.add('finished');
    } else if (this.remainingSeconds <= 10) {
      this.elements.timeDisplay.classList.add('danger');
    } else if (this.remainingSeconds <= 60) {
      this.elements.timeDisplay.classList.add('warning');
    }
  }

  finish() {
    this.isRunning = false;
    clearInterval(this.interval);

    this.elements.startBtn.textContent = '시작';
    this.elements.startBtn.className = 'control-btn start-btn';
    this.elements.timeDisplay.textContent = '완료!';
    this.elements.timeDisplay.classList.add('finished');

    // 알림음
    this.playAlarm();
    this.showToast('타이머가 완료되었습니다!', 'success');

    // 브라우저 알림
    if (Notification.permission === 'granted') {
      new Notification('타이머 완료', { body: '설정한 시간이 완료되었습니다!' });
    }
  }

  playAlarm() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 500);
    } catch (e) {
      console.log('[CountdownTimer] 오디오 재생 실패');
    }
  }

  reset() {
    this.isRunning = false;
    clearInterval(this.interval);
    this.remainingSeconds = 0;

    const hours = parseInt(this.elements.hoursInput.value) || 0;
    const minutes = parseInt(this.elements.minutesInput.value) || 0;
    const seconds = parseInt(this.elements.secondsInput.value) || 0;
    this.remainingSeconds = hours * 3600 + minutes * 60 + seconds;

    this.updateDisplay();
    this.elements.startBtn.textContent = '시작';
    this.elements.startBtn.className = 'control-btn start-btn';
    this.elements.timeInputs.style.opacity = '1';
    this.elements.timeInputs.style.pointerEvents = 'auto';
    this.elements.timeDisplay.classList.remove('warning', 'danger', 'finished');
  }

  pad(num) {
    return num.toString().padStart(2, '0');
  }
}

// 전역 인스턴스 생성 (onclick에서 사용)
const countdownTimer = new CountdownTimer();
window.CountdownTimer = countdownTimer;

document.addEventListener('DOMContentLoaded', () => countdownTimer.init());
