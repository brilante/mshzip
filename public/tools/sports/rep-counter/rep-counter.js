/**
 * 세트/횟수 카운터 - ToolBase 기반
 * 운동 횟수 기록
 * @created 2026-01-12
 * @updated 2026-01-24 ToolBase 마이그레이션
 */

var RepCounter = class RepCounter extends ToolBase {
  constructor() {
    super('RepCounter');
    this.exercises = [];
    this.activeIndex = -1;
    this.currentReps = 0;
    this.currentSet = 1;
    this.targetReps = 10;
  }

  init() {
    this.initElements({
      targetInput: 'targetInput',
      exerciseName: 'exerciseName',
      exerciseList: 'exerciseList',
      todaySummary: 'todaySummary',
      repCount: 'repCount',
      currentSet: 'currentSet',
      targetReps: 'targetReps'
    });

    this.load();
    this.render();

    console.log('[RepCounter] 초기화 완료');
    return this;
  }

  load() {
    try {
      const saved = localStorage.getItem('rep-counter-data');
      if (saved) {
        const data = JSON.parse(saved);
        this.exercises = data.exercises || [];

        // 오늘 날짜가 아니면 리셋
        const today = new Date().toDateString();
        if (data.date !== today) {
          this.exercises.forEach(e => {
            e.sets = [];
            e.totalReps = 0;
          });
        }
      }
    } catch (e) {}

    this.targetReps = parseInt(this.elements.targetInput.value) || 10;
  }

  save() {
    const data = {
      exercises: this.exercises,
      date: new Date().toDateString()
    };
    localStorage.setItem('rep-counter-data', JSON.stringify(data));
  }

  setTarget() {
    this.targetReps = parseInt(this.elements.targetInput.value) || 10;
    this.updateDisplay();
  }

  increment() {
    this.currentReps++;
    this.updateDisplay();
    this.playSound();

    // 목표 달성 시
    if (this.currentReps >= this.targetReps) {
      this.recordSet();
    }
  }

  decrement() {
    if (this.currentReps > 0) {
      this.currentReps--;
      this.updateDisplay();
    }
  }

  nextSet() {
    if (this.currentReps > 0) {
      this.recordSet();
    }
    this.currentSet++;
    this.currentReps = 0;
    this.updateDisplay();
  }

  resetSet() {
    this.currentReps = 0;
    this.updateDisplay();
  }

  recordSet() {
    if (this.activeIndex >= 0 && this.activeIndex < this.exercises.length) {
      const exercise = this.exercises[this.activeIndex];
      exercise.sets.push(this.currentReps);
      exercise.totalReps += this.currentReps;
      this.save();
      this.render();
    }
    this.currentReps = 0;
    this.updateDisplay();
  }

  addExercise(name) {
    const exerciseName = name || this.elements.exerciseName.value.trim();
    if (!exerciseName) {
      this.showToast('운동 이름을 입력하세요', 'error');
      return;
    }

    // 중복 체크
    if (this.exercises.find(e => e.name === exerciseName)) {
      this.showToast('이미 추가된 운동입니다', 'error');
      return;
    }

    this.exercises.push({
      name: exerciseName,
      sets: [],
      totalReps: 0
    });

    this.activeIndex = this.exercises.length - 1;
    this.currentReps = 0;
    this.currentSet = 1;

    this.save();
    this.render();

    this.elements.exerciseName.value = '';
    this.showToast(`${exerciseName} 추가됨`, 'success');
  }

  selectExercise(index) {
    // 현재 기록 저장
    if (this.currentReps > 0 && this.activeIndex >= 0) {
      this.recordSet();
    }

    this.activeIndex = index;
    this.currentReps = 0;
    this.currentSet = this.exercises[index].sets.length + 1;
    this.render();
    this.updateDisplay();
  }

  removeExercise(index) {
    this.exercises.splice(index, 1);
    if (this.activeIndex >= this.exercises.length) {
      this.activeIndex = this.exercises.length - 1;
    }
    this.save();
    this.render();
  }

  updateDisplay() {
    this.elements.repCount.textContent = this.currentReps;
    this.elements.currentSet.textContent = this.currentSet;
    this.elements.targetReps.textContent = this.targetReps;
  }

  render() {
    this.renderExerciseList();
    this.renderSummary();
    this.updateDisplay();
  }

  renderExerciseList() {
    const list = this.elements.exerciseList;

    if (this.exercises.length === 0) {
      list.innerHTML = '<div style="text-align: center; padding: 1rem; color: var(--text-secondary);">운동을 추가하세요</div>';
      return;
    }

    list.innerHTML = this.exercises.map((exercise, index) => {
      const setsInfo = exercise.sets.length > 0 ?
        exercise.sets.map((r, i) => `${i + 1}세트: ${r}회`).join(' | ') :
        '기록 없음';

      return `
        <div class="exercise-item ${index === this.activeIndex ? 'active' : ''}" onclick="repCounter.selectExercise(${index})">
          <div>
            <div class="exercise-name">${this.escapeHtml(exercise.name)}</div>
            <div class="exercise-progress">${setsInfo}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-weight: 600; color: var(--primary);">${exercise.totalReps}회</span>
            <span style="opacity: 0.5; cursor: pointer;" onclick="event.stopPropagation(); repCounter.removeExercise(${index})"></span>
          </div>
        </div>
      `;
    }).join('');
  }

  renderSummary() {
    const summary = this.elements.todaySummary;
    const totalReps = this.exercises.reduce((sum, e) => sum + e.totalReps, 0);
    const totalSets = this.exercises.reduce((sum, e) => sum + e.sets.length, 0);

    if (totalReps === 0) {
      summary.innerHTML = '기록이 없습니다';
      return;
    }

    summary.innerHTML = `
      <div style="display: flex; justify-content: center; gap: 2rem;">
        <div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${this.exercises.length}</div>
          <div>운동 종류</div>
        </div>
        <div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${totalSets}</div>
          <div>총 세트</div>
        </div>
        <div>
          <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary);">${totalReps}</div>
          <div>총 횟수</div>
        </div>
      </div>
    `;
  }

  playSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 전역 인스턴스 생성
const repCounter = new RepCounter();
window.RepCounter = repCounter;

document.addEventListener('DOMContentLoaded', () => repCounter.init());
