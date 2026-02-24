/**
 * 운동 타이머 - ToolBase 기반
 * 인터벌 운동 타이머 (HIIT, Tabata 등)
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class WorkoutTimer extends ToolBase {
  constructor() {
    super('WorkoutTimer');
    this.workTime = 30;
    this.restTime = 10;
    this.rounds = 8;
    this.prepTime = 5;
    this.currentPhase = 'idle';
    this.currentRound = 0;
    this.timeLeft = 0;
    this.totalPhaseTime = 0;
    this.interval = null;
    this.isPaused = false;
  }

  init() {
    this.initElements({
      workTime: 'workTime',
      restTime: 'restTime',
      rounds: 'rounds',
      prepTime: 'prepTime',
      timerDisplay: 'timerDisplay',
      phaseIndicator: 'phaseIndicator',
      progressFill: 'progressFill',
      startBtn: 'startBtn',
      pauseBtn: 'pauseBtn',
      resetBtn: 'resetBtn',
      currentRound: 'currentRound',
      totalRounds: 'totalRounds'
    });

    this.setupEvents();
    this.getSettings();
    this.updateDisplay();

    console.log('[WorkoutTimer] 초기화 완료');
    return this;
  }

  setupEvents() {
    this.elements.startBtn.addEventListener('click', () => this.start());
    this.elements.pauseBtn.addEventListener('click', () => this.togglePause());
    this.elements.resetBtn.addEventListener('click', () => this.reset());
  }

  getSettings() {
    this.workTime = parseInt(this.elements.workTime.value);
    this.restTime = parseInt(this.elements.restTime.value);
    this.rounds = parseInt(this.elements.rounds.value);
    this.prepTime = parseInt(this.elements.prepTime.value);
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
  }

  updateDisplay() {
    this.elements.timerDisplay.textContent = this.formatTime(this.timeLeft);
    const progress = this.totalPhaseTime > 0 ? ((this.totalPhaseTime - this.timeLeft) / this.totalPhaseTime) * 100 : 0;
    this.elements.progressFill.style.width = progress + '%';
    this.elements.currentRound.textContent = this.currentRound;
    this.elements.totalRounds.textContent = this.rounds;
  }

  setPhase(phase) {
    this.currentPhase = phase;
    this.elements.phaseIndicator.className = 'phase-indicator ' + phase;

    if (phase === 'prep') {
      this.elements.phaseIndicator.textContent = '준비';
      this.timeLeft = this.prepTime;
      this.elements.progressFill.style.background = '#fdcb6e';
    } else if (phase === 'work') {
      this.elements.phaseIndicator.textContent = '운동!';
      this.timeLeft = this.workTime;
      this.elements.progressFill.style.background = '#d63031';
    } else if (phase === 'rest') {
      this.elements.phaseIndicator.textContent = '휴식';
      this.timeLeft = this.restTime;
      this.elements.progressFill.style.background = '#00b894';
    } else if (phase === 'done') {
      this.elements.phaseIndicator.textContent = '완료!';
      this.elements.progressFill.style.width = '100%';
      this.elements.progressFill.style.background = '#00b894';
    }

    this.totalPhaseTime = this.timeLeft;
    this.updateDisplay();
  }

  playBeep(type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = type === 'work' ? 880 : type === 'rest' ? 440 : 660;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch(e) {}
  }

  tick() {
    if (this.isPaused) return;

    this.timeLeft--;
    this.updateDisplay();

    if (this.timeLeft <= 3 && this.timeLeft > 0) {
      this.playBeep('countdown');
    }

    if (this.timeLeft <= 0) {
      if (this.currentPhase === 'prep') {
        this.currentRound = 1;
        this.setPhase('work');
        this.playBeep('work');
      } else if (this.currentPhase === 'work') {
        if (this.currentRound >= this.rounds) {
          this.setPhase('done');
          clearInterval(this.interval);
          this.playBeep('done');
          this.elements.startBtn.disabled = false;
          this.elements.pauseBtn.disabled = true;
          this.showToast('운동 완료! ', 'success');
          return;
        }
        this.setPhase('rest');
        this.playBeep('rest');
      } else if (this.currentPhase === 'rest') {
        this.currentRound++;
        this.setPhase('work');
        this.playBeep('work');
      }
    }
  }

  start() {
    this.getSettings();
    this.currentRound = 0;
    this.setPhase('prep');
    this.interval = setInterval(() => this.tick(), 1000);
    this.elements.startBtn.disabled = true;
    this.elements.pauseBtn.disabled = false;
    this.isPaused = false;
    this.elements.pauseBtn.textContent = '일시정지';
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.elements.pauseBtn.textContent = this.isPaused ? '재개' : '일시정지';
  }

  reset() {
    clearInterval(this.interval);
    this.currentPhase = 'idle';
    this.currentRound = 0;
    this.timeLeft = 0;
    this.isPaused = false;
    this.elements.phaseIndicator.textContent = '준비';
    this.elements.timerDisplay.textContent = '00:00';
    this.elements.progressFill.style.width = '0%';
    this.elements.startBtn.disabled = false;
    this.elements.pauseBtn.disabled = true;
    this.elements.pauseBtn.textContent = '일시정지';
    this.updateDisplay();
  }

  loadPreset(work, rest, round) {
    this.elements.workTime.value = work;
    this.elements.restTime.value = rest;
    this.elements.rounds.value = round;
    this.getSettings();
  }
}

// 전역 인스턴스 생성
const workoutTimer = new WorkoutTimer();
window.WorkoutTimer = workoutTimer;

document.addEventListener('DOMContentLoaded', () => workoutTimer.init());
