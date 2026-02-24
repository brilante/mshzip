/**
 * 호흡 운동 - ToolBase 기반
 * 다양한 호흡 기법으로 마음 안정
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

class BreathingExercise extends ToolBase {
  constructor() {
    super('BreathingExercise');
    this.techniques = {
      '478': {
        name: '4-7-8 호흡법',
        description: '스트레스 해소와 수면에 효과적인 호흡법입니다.<br>4초 들숨 → 7초 유지 → 8초 날숨',
        phases: [
          { name: '들숨', duration: 4, action: 'inhale' },
          { name: '유지', duration: 7, action: 'hold' },
          { name: '날숨', duration: 8, action: 'exhale' }
        ],
        cycles: 4
      },
      'box': {
        name: '박스 호흡',
        description: '균형잡힌 호흡으로 집중력을 높이는 기법입니다.<br>4초씩 들숨 → 유지 → 날숨 → 유지',
        phases: [
          { name: '들숨', duration: 4, action: 'inhale' },
          { name: '유지', duration: 4, action: 'hold' },
          { name: '날숨', duration: 4, action: 'exhale' },
          { name: '유지', duration: 4, action: 'hold' }
        ],
        cycles: 4
      },
      'relaxing': {
        name: '이완 호흡',
        description: '간단한 이완 호흡으로 긴장을 풀어줍니다.<br>4초 들숨 → 6초 날숨',
        phases: [
          { name: '들숨', duration: 4, action: 'inhale' },
          { name: '날숨', duration: 6, action: 'exhale' }
        ],
        cycles: 6
      }
    };

    this.currentTechnique = '478';
    this.isRunning = false;
    this.currentPhase = 0;
    this.currentCycle = 0;
    this.timeLeft = 0;
    this.interval = null;
  }

  init() {
    this.initElements({
      instruction: 'instruction',
      cycleInfo: 'cycleInfo',
      startBtn: 'startBtn',
      breathText: 'breathText',
      timerDisplay: 'timerDisplay',
      breathCircle: 'breathCircle'
    });

    this.setupEvents();

    console.log('[BreathingExercise] 초기화 완료');
    return this;
  }

  setupEvents() {
    document.querySelectorAll('.technique-tab').forEach(tab => {
      tab.addEventListener('click', () => this.setTechnique(tab.dataset.tech));
    });
  }

  setTechnique(tech) {
    if (this.isRunning) this.reset();

    this.currentTechnique = tech;
    document.querySelectorAll('.technique-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tech === tech);
    });

    const technique = this.techniques[tech];
    this.elements.instruction.innerHTML = `
      <strong>${technique.name}</strong><br>${technique.description}
    `;
    this.elements.cycleInfo.textContent = `사이클 0/${technique.cycles}`;
  }

  toggleStart() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    this.isRunning = true;
    this.elements.startBtn.textContent = '일시정지';

    if (this.timeLeft === 0) {
      this.currentPhase = 0;
      this.currentCycle = 1;
      this.startPhase();
    }

    this.interval = setInterval(() => this.tick(), 1000);
  }

  pause() {
    this.isRunning = false;
    this.elements.startBtn.textContent = '계속';
    clearInterval(this.interval);
  }

  reset() {
    this.isRunning = false;
    this.currentPhase = 0;
    this.currentCycle = 0;
    this.timeLeft = 0;
    clearInterval(this.interval);

    const technique = this.techniques[this.currentTechnique];

    this.elements.startBtn.textContent = '시작';
    this.elements.breathText.textContent = '시작';
    this.elements.timerDisplay.textContent = '0';
    this.elements.cycleInfo.textContent = `사이클 0/${technique.cycles}`;
    this.elements.breathCircle.className = 'breath-circle';
  }

  startPhase() {
    const technique = this.techniques[this.currentTechnique];
    const phase = technique.phases[this.currentPhase];

    this.timeLeft = phase.duration;
    this.updateDisplay(phase);
  }

  tick() {
    this.timeLeft--;
    this.elements.timerDisplay.textContent = this.timeLeft;

    if (this.timeLeft <= 0) {
      this.nextPhase();
    }
  }

  nextPhase() {
    const technique = this.techniques[this.currentTechnique];

    this.currentPhase++;

    if (this.currentPhase >= technique.phases.length) {
      this.currentPhase = 0;
      this.currentCycle++;

      if (this.currentCycle > technique.cycles) {
        this.complete();
        return;
      }
    }

    this.startPhase();
    this.elements.cycleInfo.textContent = `사이클 ${this.currentCycle}/${technique.cycles}`;
  }

  updateDisplay(phase) {
    const circle = this.elements.breathCircle;
    const text = this.elements.breathText;
    const timer = this.elements.timerDisplay;

    text.textContent = phase.name;
    timer.textContent = phase.duration;

    circle.className = 'breath-circle';
    if (phase.action === 'inhale') {
      circle.classList.add('inhale');
    } else if (phase.action === 'exhale') {
      circle.classList.add('exhale');
    }
  }

  complete() {
    this.reset();
    this.elements.breathText.textContent = '완료!';
    this.showToast('호흡 운동이 완료되었습니다! ', 'success');
  }
}

// 전역 인스턴스 생성
const breathing = new BreathingExercise();
window.BreathingExercise = breathing;

document.addEventListener('DOMContentLoaded', () => breathing.init());
