/**
 * 운동 타이머 - ToolBase 기반
 * 인터벌/타바타 타이머
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var WorkoutTimer = class WorkoutTimer extends ToolBase {
  constructor() {
    super('WorkoutTimer');
    this.timer = null;
    this.isRunning = false;
    this.isPaused = false;

    // 현재 상태
    this.currentTime = 0;
    this.currentRound = 0;
    this.currentSet = 0;
    this.phase = 'ready'; // ready, work, rest, setRest, done

    // 설정
    this.workTime = 20;
    this.restTime = 10;
    this.rounds = 8;
    this.sets = 1;
    this.setRestTime = 60;

    this.presets = {
      tabata: { work: 20, rest: 10, rounds: 8, sets: 1 },
      hiit: { work: 30, rest: 30, rounds: 10, sets: 1 },
      emom: { work: 45, rest: 15, rounds: 12, sets: 1 },
      custom: { work: 20, rest: 10, rounds: 8, sets: 1 }
    };
  }

  init() {
    this.initElements({
      workTime: 'workTime',
      restTime: 'restTime',
      rounds: 'rounds',
      sets: 'sets',
      startBtn: 'startBtn',
      timerTime: 'timerTime',
      timerPhase: 'timerPhase',
      timerDisplay: 'timerDisplay',
      progressFill: 'progressFill',
      currentRound: 'currentRound',
      totalRounds: 'totalRounds',
      currentSet: 'currentSet',
      totalSets: 'totalSets'
    });

    this.loadSettings();
    this.updateDisplay();

    console.log('[WorkoutTimer] 초기화 완료');
    return this;
  }

  loadSettings() {
    this.workTime = parseInt(this.elements.workTime.value) || 20;
    this.restTime = parseInt(this.elements.restTime.value) || 10;
    this.rounds = parseInt(this.elements.rounds.value) || 8;
    this.sets = parseInt(this.elements.sets.value) || 1;
  }

  loadPreset(name) {
    const preset = this.presets[name];
    if (!preset) return;

    this.elements.workTime.value = preset.work;
    this.elements.restTime.value = preset.rest;
    this.elements.rounds.value = preset.rounds;
    this.elements.sets.value = preset.sets;

    this.reset();
    this.showToast(`${name.toUpperCase()} 프리셋 적용`, 'success');
  }

  start() {
    if (this.isRunning && !this.isPaused) return;

    if (!this.isRunning) {
      this.loadSettings();
      this.currentRound = 1;
      this.currentSet = 1;
      this.phase = 'work';
      this.currentTime = this.workTime;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.elements.startBtn.textContent = '진행 중...';
    this.elements.startBtn.disabled = true;

    this.timer = setInterval(() => this.tick(), 1000);
    this.updateDisplay();
    this.playSound('start');
  }

  pause() {
    if (!this.isRunning) return;

    if (this.isPaused) {
      this.isPaused = false;
      this.timer = setInterval(() => this.tick(), 1000);
    } else {
      this.isPaused = true;
      clearInterval(this.timer);
    }

    this.elements.startBtn.textContent = this.isPaused ? '계속' : '진행 중...';
    this.elements.startBtn.disabled = this.isPaused ? false : true;
  }

  reset() {
    clearInterval(this.timer);
    this.isRunning = false;
    this.isPaused = false;
    this.currentTime = 0;
    this.currentRound = 0;
    this.currentSet = 0;
    this.phase = 'ready';

    this.elements.startBtn.textContent = '시작';
    this.elements.startBtn.disabled = false;
    this.updateDisplay();
  }

  tick() {
    this.currentTime--;

    if (this.currentTime <= 3 && this.currentTime > 0) {
      this.playSound('tick');
    }

    if (this.currentTime <= 0) {
      this.nextPhase();
    }

    this.updateDisplay();
  }

  nextPhase() {
    if (this.phase === 'work') {
      // 운동 종료
      if (this.currentRound >= this.rounds) {
        // 세트 종료
        if (this.currentSet >= this.sets) {
          this.complete();
          return;
        }
        // 다음 세트
        this.currentSet++;
        this.currentRound = 1;
        this.phase = 'setRest';
        this.currentTime = this.setRestTime;
      } else if (this.restTime > 0) {
        // 휴식으로 전환
        this.phase = 'rest';
        this.currentTime = this.restTime;
      } else {
        // 휴식 없이 다음 라운드
        this.currentRound++;
        this.currentTime = this.workTime;
      }
      this.playSound('rest');
    } else if (this.phase === 'rest' || this.phase === 'setRest') {
      // 휴식 종료, 운동 시작
      if (this.phase === 'rest') {
        this.currentRound++;
      }
      this.phase = 'work';
      this.currentTime = this.workTime;
      this.playSound('work');
    }
  }

  complete() {
    clearInterval(this.timer);
    this.isRunning = false;
    this.phase = 'done';
    this.playSound('complete');

    this.elements.startBtn.textContent = '시작';
    this.elements.startBtn.disabled = false;
    this.updateDisplay();

    this.showToast('운동 완료!', 'success');
  }

  updateDisplay() {
    const minutes = Math.floor(this.currentTime / 60);
    const seconds = this.currentTime % 60;
    this.elements.timerTime.textContent =
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // 페이즈 표시
    const phaseNames = {
      ready: '준비',
      work: '운동',
      rest: '휴식',
      setRest: '세트 휴식',
      done: '완료!'
    };
    this.elements.timerPhase.textContent = phaseNames[this.phase];

    // 색상
    const timerDisplay = this.elements.timerDisplay;
    timerDisplay.style.background = this.phase === 'work' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' :
      this.phase === 'rest' || this.phase === 'setRest' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' :
      this.phase === 'done' ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '';

    if (this.phase !== 'ready') {
      timerDisplay.style.color = 'white';
    } else {
      timerDisplay.style.background = '';
      timerDisplay.style.color = '';
    }

    // 진행률
    let progress = 0;
    if (this.phase === 'work') {
      progress = ((this.workTime - this.currentTime) / this.workTime) * 100;
    } else if (this.phase === 'rest') {
      progress = ((this.restTime - this.currentTime) / this.restTime) * 100;
    }
    const fill = this.elements.progressFill;
    fill.style.width = progress + '%';
    fill.className = 'progress-fill ' + (this.phase === 'work' ? 'work-phase' : 'rest-phase');

    // 라운드/세트
    this.elements.currentRound.textContent = this.currentRound;
    this.elements.totalRounds.textContent = this.rounds;
    this.elements.currentSet.textContent = this.currentSet;
    this.elements.totalSets.textContent = this.sets;
  }

  playSound(type) {
    // 간단한 비프음 (Web Audio API)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const freqs = {
        tick: 880,
        work: 523,
        rest: 392,
        start: 659,
        complete: 1047
      };

      osc.frequency.value = freqs[type] || 440;
      osc.type = 'sine';

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  }
}

// 전역 인스턴스 생성
const workoutTimer = new WorkoutTimer();
window.WorkoutTimer = workoutTimer;

document.addEventListener('DOMContentLoaded', () => workoutTimer.init());
